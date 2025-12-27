import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { retrieveChunks } from "@/lib/rag";
import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, GEMINI_API_KEY, HF_API_KEY } from "@/lib/env";
import { callGemini } from "@/lib/gemini";
import { callAnthropic } from "@/lib/anthropic";
import { callHuggingFace } from "@/lib/hf";

export const runtime = "nodejs";

type OutTestCase = {
  id: string;
  feature: string;
  scenario: string;
  steps: string[];
  expectedResult: string;
  type: "positive" | "negative";
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

const extractJson = (text: string) => {
  // Some chat models include reasoning blocks; strip them to improve JSON extraction.
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = withoutThink.indexOf("[");
  const end = withoutThink.lastIndexOf("]");
  if (start >= 0 && end > start) return withoutThink.slice(start, end + 1);
  return withoutThink;
};

const isNonEmptyString = (v: unknown) => typeof v === "string" && v.trim().length > 0;

const validateAndNormalize = (
  parsed: unknown,
  opts: { count: number; base: number; suffix: string; minValid: number },
): { ok: true; testCases: OutTestCase[] } | { ok: false; error: string } => {
  if (!Array.isArray(parsed)) return { ok: false, error: "Model output was not a JSON array" };

  const normalized: OutTestCase[] = parsed
    .map((t: any, idx: number): OutTestCase | null => {
      const feature = isNonEmptyString(t?.feature) ? String(t.feature) : "Feature";
      const scenario = isNonEmptyString(t?.scenario) ? String(t.scenario) : `Scenario ${idx + 1}`;
      const steps = Array.isArray(t?.steps)
        ? t.steps.map((s: any) => String(s)).map((s: string) => s.trim()).filter(Boolean)
        : [];
      const expectedResult = isNonEmptyString(t?.expectedResult) ? String(t.expectedResult) : "";
      const type: "positive" | "negative" = t?.type === "negative" ? "negative" : "positive";

      if (!isNonEmptyString(feature) || !isNonEmptyString(scenario)) return null;
      if (steps.length < 3) return null;
      if (!isNonEmptyString(expectedResult)) return null;

      return {
        id: `TC-${opts.base}-${opts.suffix}-${idx + 1}`,
        feature,
        scenario,
        steps,
        expectedResult,
        type,
      };
    })
    .filter(Boolean)
    .slice(0, opts.count) as OutTestCase[];

  if (normalized.length < Math.min(opts.minValid, opts.count)) {
    return {
      ok: false,
      error: `Model produced ${normalized.length} valid test cases (expected at least ${Math.min(opts.minValid, opts.count)}).`,
    };
  }

  return { ok: true, testCases: normalized };
};

export async function POST(req: Request) {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { llmProvider: true },
  })

  const { prompt, count, apiKey } = (await req.json().catch(() => ({ prompt: "" }))) as {
    prompt?: unknown;
    count?: unknown;
    apiKey?: unknown;
  };

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'prompt'" }, { status: 400 });
  }

  const base = Date.now();
  const suffix = Math.random().toString(36).slice(2, 7);

  const desiredCount = clampInt(count, 6, 12, 8);

  const ragTopK = Math.max(8, Math.min(20, desiredCount * 2));
  const rag = await retrieveChunks({ userId, query: prompt, topK: ragTopK });
  const context = rag.chunks
    .map((c, i) =>
      [
        `[KB_CHUNK_${i + 1} id=${c.chunkId} score=${c.score.toFixed(3)}]`,
        c.text,
      ].join("\n"),
    )
    .join("\n\n---\n\n");

  const requestApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
  const effectiveGeminiKey = GEMINI_API_KEY || requestApiKey;
  const effectiveAnthropicKey = ANTHROPIC_API_KEY || requestApiKey;

  // Default behavior:
  // - Respect saved provider when possible.
  // - Otherwise: if Gemini is configured (env or per-request key), use Gemini.
  // - Otherwise, fall back to Hugging Face (HF_API_KEY from env).
  const preferred = userSettings?.llmProvider
  const canAnthropic = Boolean(effectiveAnthropicKey)
  const canGemini = Boolean(effectiveGeminiKey)
  const canHuggingFace = Boolean(HF_API_KEY)

  const llmMode: "anthropic" | "gemini" | "huggingface" | "none" =
    preferred === "anthropic" && canAnthropic
      ? "anthropic"
      : preferred === "gemini" && canGemini
        ? "gemini"
        : preferred === "openai"
          ? "none"
          : canGemini
            ? "gemini"
            : canAnthropic
              ? "anthropic"
              : canHuggingFace
                ? "huggingface"
                : "none";

  // Gemini tends to be reliable with JSON; keep it strict.
  // HF may occasionally under-produce; accept partial-but-valid results.
  const minValid = llmMode === "huggingface" ? 1 : 6

  if (llmMode === "none") {
    return NextResponse.json(
      {
        error: "LLM not configured",
        message:
          "No LLM key configured. Set HF_API_KEY for the default Hugging Face generator, or set GEMINI_API_KEY / provide an apiKey from Settings to use Gemini.",
      },
      { status: 400 },
    );
  }

  const instruction =
    "You are a QA automation assistant. Generate test cases grounded strictly in the provided Knowledge Base Context.\n" +
    `Generate ${desiredCount} test cases. Mix positive and negative (roughly 60/40).\n` +
    "Each test case MUST have: feature, scenario, steps (array of 4-10 strings), expectedResult, type ('positive'|'negative').\n" +
    "Rules: (1) Do not invent requirements not present in KB; if something is missing, write the scenario as a clarification-needed test.\n" +
    "(2) Make steps concrete and sequential, but do not use CSS/XPath locators.\n" +
    "(3) Prefer KB terminology (field names, error messages, roles) when present.\n" +
    "Return ONLY valid JSON: an array. No markdown, no commentary.";

  const runLLM = async (userText: string) => {
    if (llmMode === "anthropic") {
      const model = ANTHROPIC_MODEL || "claude-3-5-haiku-latest"
      const resp = await callAnthropic(
        model,
        {
          max_tokens: 2400,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content:
                instruction +
                `\n\nUser prompt:\n${userText}` +
                `\n\nKnowledge Base Context (top matches):\n${context || "(no matches found)"}`,
            },
          ],
        },
        effectiveAnthropicKey,
      )

      const blocks = (resp as any)?.content
      if (Array.isArray(blocks)) {
        return blocks
          .map((b: any) => (typeof b?.text === "string" ? b.text : ""))
          .filter(Boolean)
          .join("\n")
      }

      const text = (resp as any)?.content?.[0]?.text
      return typeof text === "string" ? text : JSON.stringify(resp)
    }

    if (llmMode === "gemini") {
      const resp = await callGemini(
        "gemini-1.5-pro",
        {
          contents: [
            {
              role: "user",
              parts: [
                { text: instruction },
                { text: `User prompt:\n${userText}` },
                { text: `Knowledge Base Context (top matches):\n${context || "(no matches found)"}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 3200,
          },
        },
        effectiveGeminiKey,
      );

      return (
        (resp as any)?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text)
          .filter(Boolean)
          .join("\n") ||
        ""
      );
    }

    // Hugging Face Inference API (text generation)
    // Use small instruct text-generation models that are more likely to follow a JSON-only instruction.
    // Try multiple models to reduce intermittent failures / non-JSON generations.
    // These are the models exposed via HF Router for the currently configured HF token.
    // (We intentionally keep this list small and reliable.)
    const hfModels = ["HuggingFaceTB/SmolLM3-3B", "katanemo/Arch-Router-1.5B"]

    const makePrompt = (text: string) =>
      `${instruction}\n\n` +
      `User prompt:\n${text}\n\n` +
      `Knowledge Base Context (top matches):\n${context || "(no matches found)"}\n\n` +
      "Output MUST start with '[' and end with ']'. Return ONLY the JSON array.";

    const extractText = (resp: unknown) => {
      // HF Router is OpenAI-compatible: { choices: [ { message: { content } } ] }
      const content = (resp as any)?.choices?.[0]?.message?.content
      if (typeof content === "string") return content
      const text = (resp as any)?.choices?.[0]?.text
      if (typeof text === "string") return text
      if (typeof resp === "string") return resp
      return JSON.stringify(resp)
    }

    const tryModel = async (modelId: string, text: string) => {
      const resp = await callHuggingFace(modelId, {
        messages: [{ role: "user", content: makePrompt(text) }],
        temperature: 0.2,
        max_tokens: 2400,
      })
      return extractText(resp)
    }

    // Attempt generation+parse quickly per model to avoid returning obviously non-JSON text.
    for (const modelId of hfModels) {
      const raw = await tryModel(modelId, userText)
      try {
        const parsed = JSON.parse(extractJson(raw))
        const v = validateAndNormalize(parsed, { count: desiredCount, base, suffix, minValid })
        if (v.ok) return raw
      } catch {
        // ignore parse errors; try repair below
      }

      // One repair attempt for this model.
      const repaired = await tryModel(
        modelId,
        `${userText}\n\nYour output must be ONLY a valid JSON array. No prose. Start with '[' and end with ']'.`,
      )
      try {
        const parsed2 = JSON.parse(extractJson(repaired))
        const v2 = validateAndNormalize(parsed2, { count: desiredCount, base, suffix, minValid })
        if (v2.ok) return repaired
      } catch {
        // ignore
      }
    }

    // Give the caller the last attempt (it will error with a helpful validation message).
    return await tryModel(hfModels[0]!, userText)
  };

  let rawText = "";
  try {
    rawText = await runLLM(prompt);
    const parsed1 = JSON.parse(extractJson(rawText));
    const v1 = validateAndNormalize(parsed1, { count: desiredCount, base, suffix, minValid });
    if (v1.ok) {
      await prisma.testCase.createMany({
        data: v1.testCases.map((t) => ({
          userId,
          testId: t.id,
          feature: t.feature,
          scenario: t.scenario,
          steps: t.steps,
          expected: t.expectedResult,
          type: t.type,
        })),
      });

      return NextResponse.json({
        testCases: v1.testCases,
        rag: { mode: rag.mode, chunks: rag.chunks.map((c) => ({ id: c.chunkId, score: c.score })) },
      });
    }

    // One repair attempt: tell the model what failed and ask for corrected JSON only.
    const repairPrompt =
      `Your previous output was invalid: ${v1.error}.\n` +
      `Return ONLY valid JSON for exactly ${desiredCount} test cases.\n` +
      "Do not include any extra keys. Ensure each has 4-10 steps and a non-empty expectedResult.";

    const repairedRaw = await runLLM(`${prompt}\n\n${repairPrompt}`);
    const parsed2 = JSON.parse(extractJson(repairedRaw));
    const v2 = validateAndNormalize(parsed2, { count: desiredCount, base, suffix, minValid });
    if (!v2.ok) {
      return NextResponse.json(
        {
          error: "LLM returned invalid output",
          message: v2.error,
        },
        { status: 502 },
      );
    }

    await prisma.testCase.createMany({
      data: v2.testCases.map((t) => ({
        userId,
        testId: t.id,
        feature: t.feature,
        scenario: t.scenario,
        steps: t.steps,
        expected: t.expectedResult,
        type: t.type,
      })),
    });

    return NextResponse.json({
      testCases: v2.testCases,
      rag: { mode: rag.mode, chunks: rag.chunks.map((c) => ({ id: c.chunkId, score: c.score })) },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "LLM generation failed",
        message: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
