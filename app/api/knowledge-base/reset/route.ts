import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import path from "path";
import { promises as fs } from "fs";
import { isQdrantConfigured, deletePointsByFilter } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function POST() {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const files = await prisma.file.findMany({
    where: { userId },
    select: { id: true },
  });

  const fileIds = files.map((f) => f.id);

  // Delete DB rows in FK-safe order.
  await prisma.$transaction([
    prisma.knowledgeBaseStatus.deleteMany({ where: { userId } }),
    prisma.chunk.deleteMany({ where: { fileId: { in: fileIds } } }),
    prisma.knowledgeBaseJob.deleteMany({ where: { fileId: { in: fileIds } } }),
    (prisma as any).knowledgeBaseBuild.deleteMany({ where: { userId } }),
    prisma.testCase.deleteMany({ where: { userId } }),
    prisma.script.deleteMany({ where: { userId } }),
    prisma.file.deleteMany({ where: { id: { in: fileIds } } }),
  ]);

  // Best-effort: delete Qdrant points scoped to this user.
  if (isQdrantConfigured()) {
    try {
      await deletePointsByFilter({ must: [{ key: "userId", match: { value: userId } }] });
    } catch {
      // ignore vector cleanup failures (DB is already reset)
    }
  }

  // Best-effort: delete local uploads directory for the user.
  try {
    const uploadsDir = path.join(process.cwd(), "uploads", userId);
    await fs.rm(uploadsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  return NextResponse.json({ status: "ok" });
}
