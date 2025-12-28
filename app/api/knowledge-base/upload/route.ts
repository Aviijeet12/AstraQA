import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const sanitizeFilename = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180);
const allowedExt = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".pdf",
  ".html",
  ".csv",
  ".yml",
  ".yaml",
  ".xml",
  ".docx",
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

export async function POST(req: Request) {

  const { userId, response } = await requireUserId();
  if (!userId) return response;

  // Ensure the user exists in the database, or create a test user for development
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@test.dev`,
        name: "Test User"
      }
    });
  }

  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const uploads = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (!uploads.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const rejected = uploads
    .map((f) => f.name)
    .filter((name) => {
      const ext = path.extname(name || "").toLowerCase();
      return !allowedExt.has(ext);
    });

  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: "Unsupported file type",
        allowed: Array.from(allowedExt.values()),
        rejected,
      },
      { status: 400 },
    );
  }

  // Use /tmp for uploads in production/serverless (Vercel), process.cwd() in dev
  const baseDir =
    process.env.NODE_ENV === "production"
      ? path.join("/tmp", "uploads", userId)
      : path.join(process.cwd(), "uploads", userId);
  await fs.mkdir(baseDir, { recursive: true });

  const created = [] as Array<{ id: string; name: string; size: number; type: string; uploadedAt: string }>;

  for (const upload of uploads) {
    const filename = sanitizeFilename(upload.name || "upload");
    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    const diskName = `${stem}-${randomUUID()}${ext}`;
    const absPath = path.join(baseDir, diskName);
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, "/");

    const buf = Buffer.from(await upload.arrayBuffer());
    await fs.writeFile(absPath, buf);

    const row = await prisma.file.create({
      data: {
        userId,
        filename,
        size: buf.byteLength,
        path: relPath,
        mime: upload.type || "application/octet-stream",
      },
      select: { id: true, filename: true, size: true, mime: true, createdAt: true },
    });

    created.push({
      id: row.id,
      name: row.filename,
      size: row.size,
      type: row.mime,
      uploadedAt: row.createdAt.toISOString(),
    });
  }

  return NextResponse.json({
    files: created.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      uploadedAt: f.uploadedAt,
    })),
  });
}
