import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const runtime = "nodejs";

async function fetchDashboardData(userId: string) {
  const [filesCount, scriptsCount, testCasesWeek, latestBuild, recentTests, recentScripts] = await Promise.all([
      prisma.file.count({ where: { userId } }),
      prisma.script.count({ where: { userId } }),
      prisma.testCase.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.knowledgeBaseBuild.findFirst({
        where: { userId },
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, startedAt: true, completedAt: true, processed: true, failed: true, error: true },
      }),
      prisma.testCase.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, feature: true, createdAt: true } }),
      prisma.script.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, language: true, createdAt: true } }),
    ]);

    const lastBuild = latestBuild
      ? {
          id: String(latestBuild.id),
          status: String(latestBuild.status),
          startedAt: latestBuild.startedAt ? (latestBuild.startedAt as Date).toISOString() : null,
          completedAt: latestBuild.completedAt ? (latestBuild.completedAt as Date).toISOString() : null,
          processed: Number(latestBuild.processed ?? 0),
          failed: Number(latestBuild.failed ?? 0),
          error: latestBuild.error ? String(latestBuild.error) : null,
        }
      : null;

    const lastBuildTotal = lastBuild ? lastBuild.processed + lastBuild.failed : 0;
    const lastBuildSuccessRate = lastBuild && lastBuildTotal > 0 ? Math.round((lastBuild.processed / lastBuildTotal) * 100) : null;

    return {
      filesCount,
      scriptsCount,
      testCasesWeek,
      lastBuild,
      lastBuildSuccessRate,
      recentTests: recentTests.map((t) => ({ id: t.id, feature: t.feature, createdAt: t.createdAt.toISOString() })),
      recentScripts: recentScripts.map((s) => ({ id: s.id, language: s.language, createdAt: s.createdAt.toISOString() })),
    };
}

export async function GET() {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await fetchDashboardData(userId);
      return NextResponse.json(data);
    } catch (err: any) {
      // Retry on transient DB connection errors (Neon cold-start)
      if (attempt < MAX_RETRIES && err?.code === "P1001") {
        console.warn(`[DASHBOARD] DB unreachable, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error('[DASHBOARD] state error', err);
      return NextResponse.json({ error: 'Failed to load dashboard state' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Failed to load dashboard state' }, { status: 500 });
}
