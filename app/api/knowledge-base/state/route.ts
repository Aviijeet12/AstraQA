import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const runtime = "nodejs";

export async function GET() {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const [files, kb, latestBuild] = await Promise.all([
    prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        size: true,
        mime: true,
        createdAt: true,
      },
    }),
    prisma.knowledgeBaseStatus.findUnique({
      where: { userId },
      select: { status: true, updatedAt: true },
    }),
    (prisma as any).knowledgeBaseBuild?.findFirst?.({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        processed: true,
        failed: true,
        error: true,
      },
    }) ?? Promise.resolve(null),
  ]);

  const lastBuild = latestBuild
    ? {
        id: String(latestBuild.id),
        status: String(latestBuild.status),
        startedAt: (latestBuild.startedAt as Date).toISOString(),
        completedAt: latestBuild.completedAt ? (latestBuild.completedAt as Date).toISOString() : null,
        processed: Number(latestBuild.processed ?? 0),
        failed: Number(latestBuild.failed ?? 0),
        error: latestBuild.error ? String(latestBuild.error) : null,
      }
    : null;

  const lastBuildTotal = lastBuild ? lastBuild.processed + lastBuild.failed : 0;
  const lastBuildSuccessRate =
    lastBuild && lastBuildTotal > 0 ? Math.round((lastBuild.processed / lastBuildTotal) * 100) : null;

  return NextResponse.json({
    kbStatus: (kb?.status as string | undefined) ?? "empty",
    kbUpdatedAt: kb?.updatedAt?.toISOString() ?? null,
    lastBuild,
    lastBuildSuccessRate,
    files: files.map((f) => ({
      id: f.id,
      name: f.filename,
      size: `${(f.size / 1024).toFixed(2)} KB`,
      type: (f.mime || "").split("/").pop() || "unknown",
      uploadedAt: f.createdAt.toISOString(),
    })),
  });
}
