import { describe, expect, it, vi } from "vitest";

describe("POST /api/knowledge-base/upload", () => {
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
        user: {
          findUnique: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "u1" })),
        },
        file: {
          findMany: vi.fn(async () => []),
          create: vi.fn(),
        },
      },
    }));

    vi.doMock("@/lib/supabase", () => ({
      SUPABASE_STORAGE_BUCKET: "astraA",
      supabase: {
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn(async () => ({ data: { path: "x" }, error: null })),
            download: vi.fn(async () => ({ data: new Blob(["x"]), error: null })),
          })),
        },
      },
    }));

    const mod = await import("@/app/api/knowledge-base/upload/route");
    const res = await mod.POST(
      new Request("http://localhost/api/knowledge-base/upload", { method: "POST" }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects non-multipart requests", async () => {
    vi.resetModules();
    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({ id: "u1" })),
          create: vi.fn(async () => ({ id: "u1" })),
        },
        file: {
          findMany: vi.fn(async () => []),
          create: vi.fn(),
        },
      },
    }));

    vi.doMock("@/lib/supabase", () => ({
      SUPABASE_STORAGE_BUCKET: "astraA",
      supabase: {
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn(async () => ({ data: { path: "x" }, error: null })),
            download: vi.fn(async () => ({ data: new Blob(["x"]), error: null })),
          })),
        },
      },
    }));

    const mod = await import("@/app/api/knowledge-base/upload/route");
    const res = await mod.POST(
      new Request("http://localhost/api/knowledge-base/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Expected multipart/form-data" });
  });

  it("accepts multipart upload and creates DB rows", async () => {
    vi.resetModules();
    const prismaFileCreate = vi.fn(async () => ({
      id: "file1",
      filename: "doc.md",
      size: 5,
      mime: "text/markdown",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    }));

    const prismaUserFindUnique = vi.fn(async () => ({ id: "u1" }));
    const prismaUserCreate = vi.fn(async () => ({ id: "u1" }));
    const prismaFileFindMany = vi.fn(async () => []);
    const supabaseUpload = vi.fn(async () => ({ data: { path: "knowledge-base/u1/doc.md" }, error: null }));

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: prismaUserFindUnique,
          create: prismaUserCreate,
        },
        file: {
          findMany: prismaFileFindMany,
          create: prismaFileCreate,
        },
      },
    }));

    vi.doMock("@/lib/supabase", () => ({
      SUPABASE_STORAGE_BUCKET: "astraA",
      supabase: {
        storage: {
          from: vi.fn(() => ({
            upload: supabaseUpload,
            download: vi.fn(async () => ({ data: new Blob(["x"]), error: null })),
          })),
        },
      },
    }));

    const mod = await import("@/app/api/knowledge-base/upload/route");

    const form = new FormData();
    form.append(
      "files",
      new File(["hello"], "doc.md", { type: "text/markdown" }),
    );

    const req = new Request("http://localhost/api/knowledge-base/upload", {
      method: "POST",
      body: form,
    });

    const res = await mod.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0]).toMatchObject({
      id: "file1",
      name: "doc.md",
      type: "text/markdown",
      size: 5,
      uploadedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(prismaUserFindUnique).toHaveBeenCalledTimes(1);
    expect(prismaFileFindMany).toHaveBeenCalledTimes(1);
    expect(supabaseUpload).toHaveBeenCalledTimes(1);
    expect(prismaFileCreate).toHaveBeenCalledTimes(1);
  });
});
