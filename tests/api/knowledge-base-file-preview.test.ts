import { describe, expect, it, vi } from "vitest";

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/knowledge-base/files/[id]", () => {
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
    vi.doMock("fs", () => ({ promises: { readFile: vi.fn(async () => Buffer.from("")) } }));

    const mod = await import("@/app/api/knowledge-base/files/[id]/route");
    const res = await mod.GET(new Request("http://localhost"), makeCtx("f1") as any);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns preview:null for non-previewable file types", async () => {
    vi.resetModules();

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        file: {
          findFirst: vi.fn(async () => ({
            id: "f1",
            filename: "manual.pdf",
            path: "uploads/u1/manual.pdf",
            mime: "application/pdf",
            size: 123,
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
          })),
        },
      },
    }));

    const readFile = vi.fn(async () => Buffer.from("should not read"));
    vi.doMock("fs", () => ({ promises: { readFile } }));

    const mod = await import("@/app/api/knowledge-base/files/[id]/route");
    const res = await mod.GET(new Request("http://localhost"), makeCtx("f1") as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.preview).toBeNull();
    expect(String(data.message)).toContain("Preview");
    expect(readFile).not.toHaveBeenCalled();
  });

  it("returns truncated preview for previewable file types", async () => {
    vi.resetModules();

    vi.doMock("@/lib/require-user", () => ({
      requireUserId: vi.fn(async () => ({ userId: "u1" })),
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        file: {
          findFirst: vi.fn(async () => ({
            id: "f1",
            filename: "spec.md",
            path: "uploads/u1/spec.md",
            mime: "text/markdown",
            size: 456,
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
          })),
        },
      },
    }));

    const bigText = "a".repeat(13050);
    const readFile = vi.fn(async () => Buffer.from(bigText, "utf8"));
    vi.doMock("fs", () => ({ promises: { readFile } }));

    const mod = await import("@/app/api/knowledge-base/files/[id]/route");
    const res = await mod.GET(new Request("http://localhost"), makeCtx("f1") as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.preview).toBe("string");
    expect(data.preview.length).toBeLessThanOrEqual(12000 + 20);
    expect(String(data.preview)).toContain("truncated");
    expect(readFile).toHaveBeenCalledTimes(1);
  });
});
