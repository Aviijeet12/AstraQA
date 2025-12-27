import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

const previewableExt = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".csv",
  ".xml",
  ".html",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cs",
  ".rb",
  ".go",
  ".php",
  ".sql",
]);

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const { id } = await ctx.params;

  const file = await prisma.file.findFirst({
    where: { id, userId },
    select: { id: true, filename: true, path: true, mime: true, size: true, createdAt: true },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(file.filename || "").toLowerCase();
  const canPreview =
    (file.mime || "").startsWith("text/") ||
    previewableExt.has(ext) ||
    file.mime === "application/json" ||
    file.mime === "application/xml";

  if (!canPreview) {
    return NextResponse.json(
      {
        file: {
          id: file.id,
          filename: file.filename,
          mime: file.mime,
          size: file.size,
          createdAt: file.createdAt,
        },
        preview: null,
        message: "Preview is not available for this file type.",
      },
      { status: 200 },
    );
  }

  const absPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
  try {
    const buf = await fs.readFile(absPath);
    const text = buf.toString("utf8");
    const preview = text.length > 12000 ? text.slice(0, 12000) + "\n\n…(truncated)" : text;

    return NextResponse.json({
      file: {
        id: file.id,
        filename: file.filename,
        mime: file.mime,
        size: file.size,
        createdAt: file.createdAt,
      },
      preview,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to read file",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const { id } = await ctx.params;

  const file = await prisma.file.findFirst({
    where: { id, userId },
    select: { id: true, path: true },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.chunk.deleteMany({ where: { fileId: id } }),
    prisma.knowledgeBaseJob.deleteMany({ where: { fileId: id } }),
    prisma.file.delete({ where: { id } }),
  ]);

  if (file.path) {
    const absPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
    try {
      await fs.unlink(absPath);
    } catch {
      // ignore missing file
    }
  }

  return NextResponse.json({ status: "ok" });
}
