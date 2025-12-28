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
  console.log('[UPLOAD] userId:', userId);
  if (!userId) {
    console.log('[UPLOAD] No userId, returning response:', response);
    return response;
  }

  // Ensure the user exists in the database, or create a test user for development
  let user = await prisma.user.findUnique({ where: { id: userId } });
  console.log('[UPLOAD] Found user:', user);
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@test.dev`,
        name: "Test User"
      }
    });
    console.log('[UPLOAD] Created user:', user);
  }

  const contentType = req.headers.get("content-type") || "";
  console.log('[UPLOAD] Content-Type:', contentType);
  if (!contentType.includes("multipart/form-data")) {
    console.log('[UPLOAD] Bad content-type:', contentType);
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const uploads = formData.getAll("files").filter((f): f is File => f instanceof File);
  console.log('[UPLOAD] uploads:', uploads.map(f => f.name));
  if (!uploads.length) {
    console.log('[UPLOAD] No files provided');
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const rejected = uploads
    .map((f) => f.name)
    .filter((name) => {
      const ext = path.extname(name || "").toLowerCase();
      return !allowedExt.has(ext);
    });
  if (rejected.length > 0) {
    console.log('[UPLOAD] Rejected file types:', rejected);
    return NextResponse.json(
      {
        error: "Unsupported file type",
        allowed: Array.from(allowedExt.values()),
        rejected,
      },
      { status: 400 },
    );
  }

  // Always use /tmp for uploads in production/serverless (Vercel), process.cwd() in dev
  const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless
    ? path.join("/tmp", "uploads", userId)
    : path.join(process.cwd(), "uploads", userId);
  console.log('[UPLOAD] baseDir:', baseDir);
  await fs.mkdir(baseDir, { recursive: true });

  const created = [] as Array<{ id: string; name: string; size: number; type: string; uploadedAt: string }>;

  for (const upload of uploads) {
    const filename = sanitizeFilename(upload.name || "upload");
    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    const diskName = `${stem}-${randomUUID()}${ext}`;
    const absPath = path.join(baseDir, diskName);
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, "/");
    console.log('[UPLOAD] Writing file:', { filename, absPath, relPath });
    try {
      const buf = Buffer.from(await upload.arrayBuffer());
      await fs.writeFile(absPath, buf);
      console.log('[UPLOAD] File written:', absPath);
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
      console.log('[UPLOAD] DB row created:', row);
      created.push({
        id: row.id,
        name: row.filename,
        size: row.size,
        type: row.mime,
        uploadedAt: row.createdAt.toISOString(),
      });
    } catch (err) {
      console.log('[UPLOAD] Error writing file:', err);
    }
  }

  console.log('[UPLOAD] Returning created files:', created);
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
