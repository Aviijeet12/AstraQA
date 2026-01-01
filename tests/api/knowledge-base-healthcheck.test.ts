import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/require-user", () => {
  return {
    requireUserId: vi.fn(async () => ({
      userId: null,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    })),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      file: {
        findMany: vi.fn(async () => []),
      },
    },
  };
});

vi.mock("@/lib/supabase", () => {
  return {
    SUPABASE_STORAGE_BUCKET: "astraA",
    supabase: {
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(async () => ({ data: [], error: null })),
        })),
      },
    },
  };
});

describe("GET /api/knowledge-base/healthcheck", () => {
  it("returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/knowledge-base/healthcheck/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns ok status when there are no files", async () => {
    const requireUser = await import("@/lib/require-user");
    (requireUser.requireUserId as any).mockResolvedValueOnce({
      userId: "user_1",
      response: new Response("", { status: 200 }),
    });

    const { GET } = await import("@/app/api/knowledge-base/healthcheck/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.summary.total).toBe(0);
  });
});
