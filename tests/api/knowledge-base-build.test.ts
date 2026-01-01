import { describe, expect, it, vi } from "vitest";

const mockSupabaseWithDownload = (buf: Buffer) => {
  vi.doMock("@/lib/supabase", () => ({
    SUPABASE_STORAGE_BUCKET: "astraA",
    supabase: {
      storage: {
        from: vi.fn(() => ({
          download: vi.fn(async () => ({
            data: new Blob([buf]),
            error: null,
          })),
        })),
      },
    },
  }))
}

describe("POST /api/knowledge-base/build", () => {
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
      prisma: {},
    }));

    mockSupabaseWithDownload(Buffer.from(""))

    vi.doMock("@/lib/rag", () => ({
      indexChunksInQdrant: vi.fn(async () => undefined),
    }));

    const mod = await import("@/app/api/knowledge-base/build/route");
    const res = await mod.POST();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 + sets status empty when no files uploaded", async () => {
    const upsert = vi.fn(async () => undefined);
    vi.resetModules();

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        file: {
          findMany: vi.fn(async () => []),
        },
        knowledgeBaseStatus: {
          upsert,
        },
      },
    }));

    mockSupabaseWithDownload(Buffer.from(""))

    vi.doMock("@/lib/rag", () => ({
      indexChunksInQdrant: vi.fn(async () => undefined),
    }));

    const mod = await import("@/app/api/knowledge-base/build/route");
    const res = await mod.POST();

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.status).toBe("empty");
    expect(upsert).toHaveBeenCalled();
  });

  it("processes files, writes chunks, and sets status ready", async () => {
    vi.resetModules();
    const upsert = vi.fn(async () => undefined);
    const buildCreate = vi.fn(async () => ({ id: "b1" }));
    const buildUpdate = vi.fn(async () => undefined);
    const jobCreate = vi.fn(async () => ({ id: "job1" }));
    const jobUpdate = vi.fn(async () => undefined);
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    const createMany = vi.fn(async () => ({ count: 2 }));
    const transaction = vi.fn(async (ops: any[]) => Promise.all(ops));
    const indexChunksInQdrant = vi.fn(async () => undefined);

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        file: {
          findMany: vi.fn(async () => [
            { id: "f1", path: "uploads/u1/doc.md", mime: "text/markdown" },
          ]),
        },
        knowledgeBaseStatus: { upsert },
        knowledgeBaseBuild: {
          create: buildCreate,
          update: buildUpdate,
        },
        knowledgeBaseJob: {
          create: jobCreate,
          update: jobUpdate,
        },
        chunk: {
          deleteMany,
          createMany,
        },
        $transaction: transaction,
      },
    }));

    mockSupabaseWithDownload(Buffer.from("Hello world. This is a test document."))

    vi.doMock("@/lib/rag", () => ({
      indexChunksInQdrant,
    }));

    const mod = await import("@/app/api/knowledge-base/build/route");
    const res = await mod.POST();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ready");
    expect(data.processed).toBe(1);

    expect(jobCreate).toHaveBeenCalled();
    expect(jobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buildId: "b1" }),
      }),
    );
    expect(transaction).toHaveBeenCalled();
    expect(indexChunksInQdrant).toHaveBeenCalled();

    expect(buildCreate).toHaveBeenCalled();
    expect(buildUpdate).toHaveBeenCalled();

    // We set status building at start and ready at end.
    expect(upsert).toHaveBeenCalled();
  });
});
