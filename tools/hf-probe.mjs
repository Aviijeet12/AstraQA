import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnvFile = (filePath) => {
  try {
    const txt = readFileSync(filePath, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const name = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[name]) process.env[name] = value;
    }
  } catch {
    // ignore
  }
};

loadEnvFile(resolve(process.cwd(), ".env.local"));

const model = process.argv[2] || "Qwen/Qwen2.5-1.5B-Instruct";
const key = process.env.HF_API_KEY;
if (!key) {
  console.error("Missing HF_API_KEY in environment");
  process.exit(2);
}

const prompt =
  "Return ONLY a valid JSON array with exactly one item having keys: feature, scenario, steps (array of 4 strings), expectedResult, type. Start with [ and end with ].";

const legacyBody = {
  inputs: prompt,
  parameters: {
    temperature: 0.1,
    max_new_tokens: 300,
  },
  options: {
    wait_for_model: true,
    use_cache: true,
  },
};

const chatBody = {
  model,
  messages: [{ role: "user", content: prompt }],
  temperature: 0.1,
  max_tokens: 300,
};

const candidates = [
  { url: `https://router.huggingface.co/hf-inference/v1/chat/completions`, body: chatBody },
  { url: `https://router.huggingface.co/v1/chat/completions`, body: chatBody },
  // Legacy-style endpoints (kept for exploration)
  { url: `https://router.huggingface.co/models/${model}`, body: legacyBody },
  { url: `https://router.huggingface.co/hf-inference/models/${model}`, body: legacyBody },
  { url: `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`, body: legacyBody },
  { url: `https://router.huggingface.co/hf-inference/${model}`, body: legacyBody },
];

console.log("model", model);

for (const c of candidates) {
  const res = await fetch(c.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(c.body),
  });

  const text = await res.text();
  console.log("url", c.url);
  console.log("status", res.status);
  console.log(text.slice(0, 300));
  console.log("---");
}
