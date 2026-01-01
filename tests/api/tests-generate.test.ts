import { describe, expect, it, vi } from "vitest";

const makeReq = (body: unknown) =>
  new Request("http://localhost/api/tests/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/tests/generate", () => {
  it("returns 401 when not authenticated", async () => {
    vi.resetModules();

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({
        userId: null,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
      },
    }));
    vi.doMock("@/lib/rag", () => ({ retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })) }));
    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "x",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini: vi.fn(async () => ({})) }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({ prompt: "Generate test cases" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when prompt is missing", async () => {
    vi.resetModules();

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
      },
    }));
    vi.doMock("@/lib/rag", () => ({ retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })) }));
    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "x",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini: vi.fn(async () => ({})) }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing or invalid 'prompt'" });
  });

  it("returns 400 when GEMINI_API_KEY is not configured", async () => {
    vi.resetModules();

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
      },
    }));
    vi.doMock("@/lib/rag", () => ({ retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })) }));
    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini: vi.fn(async () => ({})) }));
    vi.doMock("@/lib/hf", () => ({ callHuggingFace: vi.fn(async () => ([])) }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({ prompt: "Login flow" }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("LLM not configured");
    expect(String(data.message)).toContain("HF_API_KEY");
  });

  it("falls back to Hugging Face when Gemini is not configured", async () => {
    vi.resetModules();

    const createMany = vi.fn(async () => ({ count: 6 }));
    const callHuggingFace = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify(
              Array.from({ length: 6 }).map((_, i) => ({
                feature: "ATS",
                scenario: `ATS score scenario ${i + 1}`,
                steps: ["Open app", "Navigate to ATS", "Upload resume", "View score"],
                expectedResult: "Score is shown",
                type: i % 2 === 0 ? "positive" : "negative",
              })),
            ),
          },
        },
      ],
    }));

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
        testCase: {
          createMany,
        },
      },
    }));

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })),
    }));

    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "hf",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini: vi.fn(async () => ({})) }));
    vi.doMock("@/lib/hf", () => ({ callHuggingFace }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({ prompt: "ats score", count: 6 }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.testCases)).toBe(true);
    expect(data.testCases).toHaveLength(6);
    expect(callHuggingFace).toHaveBeenCalledTimes(1);
  });

  it("uses request apiKey when GEMINI_API_KEY is missing", async () => {
    vi.resetModules();

    const createMany = vi.fn(async () => ({ count: 6 }));
    const callGemini = vi.fn(async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(
                  Array.from({ length: 6 }).map((_, i) => ({
                    feature: "Auth",
                    scenario: `Login flow ${i + 1}`,
                    steps: ["Open login", "Enter email", "Enter password", "Click login"],
                    expectedResult: "User sees expected outcome",
                    type: i % 2 === 0 ? "positive" : "negative",
                  })),
                ),
              },
            ],
          },
        },
      ],
    }));

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
        testCase: {
          createMany,
        },
      },
    }));

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })),
    }));

    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "hf",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini }));
    vi.doMock("@/lib/hf", () => ({ callHuggingFace: vi.fn(async () => ({ choices: [{ message: { content: "[]" } }] })) }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({ prompt: "Login", apiKey: "client-key" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.testCases)).toBe(true);
    expect(data.testCases).toHaveLength(6);
    expect(createMany).toHaveBeenCalledTimes(1);

    // Ensure we actually attempted the LLM call.
    expect(callGemini).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when model output is consistently invalid", async () => {
    vi.resetModules();

    const callGemini = vi.fn(async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                // Valid JSON array but invalid testcases (too few steps / missing expectedResult)
                text: JSON.stringify([
                  {
                    feature: "Auth",
                    scenario: "Login",
                    steps: ["Open app", "Enter credentials"],
                    expectedResult: "",
                    type: "positive",
                  },
                ]),
              },
            ],
          },
        },
      ],
    }));

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
        testCase: {
          createMany: vi.fn(async () => ({ count: 0 })),
        },
      },
    }));

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks: vi.fn(async () => ({
        mode: "fts",
        chunks: [{ chunkId: "c1", score: 0.9, text: "Login requires email and password" }],
      })),
    }));

    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "x",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({ prompt: "Login test cases", count: 8 }));

    expect(callGemini).toHaveBeenCalledTimes(2); // original + repair attempt
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("LLM returned invalid output");
    expect(String(data.message)).toContain("valid test cases");
  });

  it("returns testCases and writes to DB when model output is valid", async () => {
    vi.resetModules();

    const createMany = vi.fn(async () => ({ count: 6 }));
    const callGemini = vi.fn(async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(
                  Array.from({ length: 10 }).map((_, i) => ({
                    feature: "Auth",
                    scenario: `Login valid/invalid credentials ${i + 1}`,
                    steps: [
                      "Open the login page",
                      "Enter an email",
                      "Enter a password",
                      "Click Login",
                    ],
                    expectedResult: "User is either logged in or sees an error message",
                    type: i % 3 === 0 ? "negative" : "positive",
                  })),
                ),
              },
            ],
          },
        },
      ],
    }));

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        userSettings: {
          findUnique: vi.fn(async () => null),
        },
        testCase: {
          createMany,
        },
      },
    }));

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks: vi.fn(async () => ({
        mode: "fts",
        chunks: [
          { chunkId: "c1", score: 0.9, text: "Login requires email + password" },
          { chunkId: "c2", score: 0.8, text: "Error message shown on invalid credentials" },
        ],
      })),
    }));

    vi.doMock("@/lib/env", () => ({
      GEMINI_API_KEY: "x",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      HF_API_KEY: "",
    }));
    vi.doMock("@/lib/gemini", () => ({ callGemini }));

    const mod = await import("@/app/api/tests/generate/route");
    const res = await mod.POST(makeReq({ prompt: "Login test cases", count: 6 }));

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data.testCases)).toBe(true);
    expect(data.testCases).toHaveLength(6);
    expect(String(data.testCases[0].id)).toMatch(/^TC-/);

    expect(data.rag.mode).toBe("fts");
    expect(Array.isArray(data.rag.chunks)).toBe(true);
    expect(data.rag.chunks.length).toBeGreaterThan(0);

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
      }),
    );
    expect((createMany.mock.calls[0]?.[0] as any).data).toHaveLength(6);
  });
});
