import { describe, expect, it, vi } from "vitest";

describe("POST /api/knowledge-base/retrieve", () => {
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

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })),
    }));

    const mod = await import("@/app/api/knowledge-base/retrieve/route");
    const res = await mod.POST(
      new Request("http://localhost/api/knowledge-base/retrieve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "x" }),
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when query missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks: vi.fn(async () => ({ mode: "fts", chunks: [] })),
    }));

    const mod = await import("@/app/api/knowledge-base/retrieve/route");
    const res = await mod.POST(
      new Request("http://localhost/api/knowledge-base/retrieve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing 'query'" });
  });

  it("returns retrieved chunks when query provided", async () => {
    vi.resetModules();
    const retrieveChunks = vi.fn(async () => ({
      mode: "fts",
      chunks: [
        { chunkId: "c1", fileId: "f1", score: 0.9, text: "Hello" },
        { chunkId: "c2", fileId: "f2", score: 0.8, text: "World" },
      ],
    }));

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/rag", () => ({
      retrieveChunks,
    }));

    const mod = await import("@/app/api/knowledge-base/retrieve/route");
    const res = await mod.POST(
      new Request("http://localhost/api/knowledge-base/retrieve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "hello", topK: 2 }),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe("fts");
    expect(data.chunks).toEqual([
      { id: "c1", fileId: "f1", score: 0.9, text: "Hello" },
      { id: "c2", fileId: "f2", score: 0.8, text: "World" },
    ]);
    expect(retrieveChunks).toHaveBeenCalledWith({ userId: "u1", query: "hello", topK: 2 });
  });
});
