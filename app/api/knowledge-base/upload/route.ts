import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import path from "path";
import { supabase, SUPABASE_STORAGE_BUCKET } from "@/lib/supabase";

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

  const created = [] as Array<{ id: string; name: string; size: number; type: string; uploadedAt: string }>;
  const duplicates = [] as Array<{ name: string; reason: string }>;
  const repaired = [] as Array<{ id: string; name: string; size: number; type: string; uploadedAt: string }>;

  const normalizeKey = (p: string) => (p || "").replace(/^\/*/, "").replace(/\\/g, "/")
  const isSafeStorageKey = (p: string) => {
    if (!p) return false
    if (p.includes("\\")) return false
    if (p.startsWith("/")) return false
    if (p.includes("..")) return false
    return true
  }

  const isNotFound = (err: unknown) => {
    const e: any = err
    const status = e?.status || e?.originalError?.status
    if (status === 404) return true
    const msg = typeof e?.message === "string" ? e.message : ""
    return msg.includes("404") || msg.toLowerCase().includes("not found")
  }

  // Prevent overwrites / duplicate uploads: treat an existing filename for this user as a duplicate,
  // except when the existing record is a legacy/broken path (repair flow).
  const existing = await prisma.file.findMany({
    where: { userId },
    select: { id: true, filename: true, path: true, mime: true, size: true, createdAt: true },
  });
  const existingByName = new Map(existing.map((r) => [r.filename, r] as const));

  for (const upload of uploads) {
    const filename = sanitizeFilename(upload.name || "upload");

    const existingRow = existingByName.get(filename);
    const storagePath = `knowledge-base/${userId}/${filename}`;

    if (existingRow) {
      const existingPath = normalizeKey(existingRow.path || "");
      const canonicalKey = normalizeKey(storagePath);

      const looksLegacy = !isSafeStorageKey(existingPath) || existingPath.includes("tmp/uploads/") || !existingPath.startsWith(`knowledge-base/${userId}/`);

      if (!looksLegacy) {
        // Canonical DB record already exists. Only allow re-upload if the object is missing (404).
        // This avoids overwriting and keeps storage secure, while allowing users to repair orphaned DB rows.
        let exists = true
        try {
          const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).download(canonicalKey)
          if (error) {
            if (isNotFound(error)) exists = false
          }
        } catch (err) {
          if (isNotFound(err)) exists = false
        }

        if (exists) {
          duplicates.push({
            name: filename,
            reason: "A file with the same name already exists in your Knowledge Base. Delete it first to replace.",
          });
          continue;
        }

        console.log('[UPLOAD] Restoring missing storage object for existing record:', { userId, filename, key: canonicalKey });
        try {
          const buf = Buffer.from(await upload.arrayBuffer());
          const { error: uploadErr } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(canonicalKey, buf, { upsert: false, contentType: upload.type || "application/octet-stream" });

          if (uploadErr) {
            console.log('[UPLOAD] Supabase upload error during restore:', uploadErr);
            duplicates.push({ name: filename, reason: uploadErr.message || "Restore upload rejected" });
            continue;
          }

          const updated = await prisma.file.update({
            where: { id: existingRow.id },
            data: {
              size: buf.byteLength,
              path: canonicalKey,
              mime: upload.type || "application/octet-stream",
            },
            select: { id: true, filename: true, size: true, mime: true, createdAt: true },
          });

          repaired.push({
            id: updated.id,
            name: updated.filename,
            size: updated.size,
            type: updated.mime,
            uploadedAt: updated.createdAt.toISOString(),
          });

          existingByName.set(filename, { ...existingRow, path: canonicalKey, size: buf.byteLength, mime: upload.type || "application/octet-stream" });
          continue;
        } catch (err) {
          console.log('[UPLOAD] Error restoring missing object:', err);
          duplicates.push({ name: filename, reason: "Failed to restore missing storage object" });
          continue;
        }
      }

      // Repair flow: re-upload to canonical storage key and update the existing DB row.
      console.log('[UPLOAD] Repairing legacy file record:', { userId, filename, from: existingPath, to: canonicalKey });
      try {
        const buf = Buffer.from(await upload.arrayBuffer());
        const { error: uploadErr } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .upload(canonicalKey, buf, { upsert: false, contentType: upload.type || "application/octet-stream" });

        if (uploadErr) {
          // If the object already exists, we can still repair the DB pointer.
          console.log('[UPLOAD] Supabase upload error during repair:', uploadErr);
        }

        const updated = await prisma.file.update({
          where: { id: existingRow.id },
          data: {
            size: buf.byteLength,
            path: canonicalKey,
            mime: upload.type || "application/octet-stream",
          },
          select: { id: true, filename: true, size: true, mime: true, createdAt: true },
        });

        repaired.push({
          id: updated.id,
          name: updated.filename,
          size: updated.size,
          type: updated.mime,
          uploadedAt: updated.createdAt.toISOString(),
        });

        existingByName.set(filename, { ...existingRow, path: canonicalKey, size: buf.byteLength, mime: upload.type || "application/octet-stream" });
        continue;
      } catch (err) {
        console.log('[UPLOAD] Error repairing legacy upload:', err);
        duplicates.push({ name: filename, reason: "Failed to repair legacy file record" });
        continue;
      }
    }

    console.log('[UPLOAD] Uploading to Supabase:', { userId, storagePath, filename, mime: upload.type });
    try {
      const buf = Buffer.from(await upload.arrayBuffer());
      const { data, error: uploadErr } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(storagePath, buf, { upsert: false, contentType: upload.type || "application/octet-stream" });
      if (uploadErr) {
        console.log('[UPLOAD] Supabase upload error:', uploadErr);
        // Common case: object already exists if bucket path collides.
        duplicates.push({ name: filename, reason: uploadErr.message || "Upload rejected" });
        continue;
      }

      const row = await prisma.file.create({
        data: {
          userId,
          filename,
          size: buf.byteLength,
          path: storagePath, // store storage path only (no absolute paths)
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

      existingByName.set(filename, { id: row.id, filename: row.filename, path: storagePath, mime: row.mime, size: row.size, createdAt: row.createdAt });
    } catch (err) {
      console.log('[UPLOAD] Error uploading to Supabase:', err);
    }
  }

  return NextResponse.json({ files: created, repaired, duplicates });
}
