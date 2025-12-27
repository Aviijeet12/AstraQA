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
      prisma: { file: { create: vi.fn() } },
    }));

    vi.doMock("fs", () => ({
      promises: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
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
      prisma: { file: { create: vi.fn() } },
    }));

    vi.doMock("fs", () => ({
      promises: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
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

    const mkdir = vi.fn(async () => undefined);
    const writeFile = vi.fn(async () => undefined);

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: { file: { create: prismaFileCreate } },
    }));

    vi.doMock("fs", () => ({
      promises: {
        mkdir,
        writeFile,
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

    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
    expect(prismaFileCreate).toHaveBeenCalledTimes(1);
  });
});
