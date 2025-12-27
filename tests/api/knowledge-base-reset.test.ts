import { describe, expect, it, vi } from "vitest";

describe("POST /api/knowledge-base/reset", () => {
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

    vi.doMock("@/lib/prisma", () => ({ prisma: {} }));
    vi.doMock("@/lib/qdrant", () => ({
      isQdrantConfigured: () => false,
      deletePointsByFilter: vi.fn(async () => ({})),
    }));

    vi.doMock("fs", () => ({
      promises: {
        rm: vi.fn(async () => undefined),
      },
    }));

    const mod = await import("@/app/api/knowledge-base/reset/route");
    const res = await mod.POST();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("deletes user KB data and returns ok", async () => {
    vi.resetModules();

    const tx = vi.fn(async (ops: any[]) => Promise.all(ops));

    const kbStatusDeleteMany = vi.fn(async () => ({ count: 1 }));
    const chunkDeleteMany = vi.fn(async () => ({ count: 2 }));
    const jobDeleteMany = vi.fn(async () => ({ count: 3 }));
    const buildDeleteMany = vi.fn(async () => ({ count: 4 }));
    const testCaseDeleteMany = vi.fn(async () => ({ count: 5 }));
    const scriptDeleteMany = vi.fn(async () => ({ count: 6 }));
    const fileDeleteMany = vi.fn(async () => ({ count: 2 }));

    const fileFindMany = vi.fn(async () => [{ id: "f1" }, { id: "f2" }]);

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        file: { findMany: fileFindMany, deleteMany: fileDeleteMany },
        knowledgeBaseStatus: { deleteMany: kbStatusDeleteMany },
        chunk: { deleteMany: chunkDeleteMany },
        knowledgeBaseJob: { deleteMany: jobDeleteMany },
        // Used via (prisma as any).knowledgeBaseBuild
        knowledgeBaseBuild: { deleteMany: buildDeleteMany },
        testCase: { deleteMany: testCaseDeleteMany },
        script: { deleteMany: scriptDeleteMany },
        $transaction: tx,
      },
    }));

    const rm = vi.fn(async () => undefined);
    vi.doMock("fs", () => ({ promises: { rm } }));

    const deletePointsByFilter = vi.fn(async () => ({}));
    vi.doMock("@/lib/qdrant", () => ({
      isQdrantConfigured: () => false,
      deletePointsByFilter,
    }));

    const mod = await import("@/app/api/knowledge-base/reset/route");
    const res = await mod.POST();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });

    expect(fileFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        select: { id: true },
      }),
    );

    expect(tx).toHaveBeenCalledTimes(1);
    expect(kbStatusDeleteMany).toHaveBeenCalled();
    expect(chunkDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fileId: { in: ["f1", "f2"] } },
      }),
    );
    expect(jobDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fileId: { in: ["f1", "f2"] } },
      }),
    );
    expect(buildDeleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(testCaseDeleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(scriptDeleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(fileDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["f1", "f2"] } },
      }),
    );

    expect(rm).toHaveBeenCalledTimes(1);
  });
});
