import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { indexChunksInQdrant } from "@/lib/rag";
import { supabase, SUPABASE_STORAGE_BUCKET } from "@/lib/supabase";
import path from "path";
import { promises as fs } from "fs";
// Use `pdf-parse` for PDFs to avoid deep static imports of `pdfjs-dist`.
// `pdf-parse` is already a dependency and is serverless-friendly.

export const runtime = "nodejs";

const splitTextIntoChunks = (text: string, maxChars = 1500, overlap = 200) => {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const slice = text.slice(start, end);
    chunks.push(slice);
    if (end >= text.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
};

async function readTextFromBuffer(buf: Buffer, mime: string) {
  // DOCX
  if (mime.includes("officedocument") || mime.includes("word") || mime.includes("docx")) {
    const mod = await import("mammoth");
    const extractRawText = (mod as any).extractRawText ?? (mod as any).default?.extractRawText;
    if (typeof extractRawText === "function") {
      const result = await extractRawText({ buffer: buf });
      return (result?.value as string | undefined) ?? "";
    }
  }

  // PDF - use `pdf-parse` to avoid bundler issues with pdfjs deep imports
  if (mime.includes("pdf")) {
    try {
      const mod = await import("pdf-parse");
      const PDFParse = (mod as any).PDFParse;
      if (typeof PDFParse !== "function") {
        throw new Error(`pdf-parse: missing PDFParse export (keys=${Object.keys(mod as any).join(",")})`);
      }

      const parser = new PDFParse();
      if (typeof (parser as any).load !== "function" || typeof (parser as any).getText !== "function") {
        throw new Error("pdf-parse: PDFParse instance missing load/getText methods");
      }

      await (parser as any).load(buf as Buffer);
      const text = await (parser as any).getText();
      if (typeof text === "string") return text;
      if (text && typeof (text as any).text === "string") return String((text as any).text);
      return "";
    } catch (err) {
      console.error('[KB BUILD] pdf-parse failed:', err);
      throw err;
    }
  }

  // JSON
  const text = buf.toString("utf-8");
  if (mime.includes("json")) {
    try {
      const obj = JSON.parse(text);
      return typeof obj === "object" ? JSON.stringify(obj, null, 2) : String(obj);
    } catch {
      return text;
    }
  }

  return text;
}

const isSafeStorageKey = (p: string) => {
  if (!p) return false;
  // Keys must be object paths, not URLs.
  if (p.startsWith("http://") || p.startsWith("https://") || p.includes("://")) return false;
  if (p.includes("\\")) return false;
  if (p.startsWith("/")) return false;
  if (p.includes("..")) return false;
  return true;
};

const getBucketsToTry = () => {
  // Prefer the configured bucket. We only add a hard-coded fallback when it differs,
  // to avoid spamming errors like "Bucket not found" in environments that don't have it.
  const buckets = new Set<string>();
  buckets.add(SUPABASE_STORAGE_BUCKET);
  if (SUPABASE_STORAGE_BUCKET !== "astraA") buckets.add("astraA");
  return Array.from(buckets.values());
};

const normalizeKey = (p: string) => (p || "").replace(/^\/*/, "").replace(/\\/g, "/");

const toUploadsRelative = (p: string) => {
  const s = normalizeKey(p);
  const idx = s.indexOf("tmp/uploads/");
  if (idx >= 0) return `uploads/${s.slice(idx + "tmp/uploads/".length)}`;
  const idx2 = s.indexOf("uploads/");
  if (idx2 >= 0) return s.slice(idx2);
  return s;
};

async function tryReadLegacyFileBuffer(filePath: string) {
  const raw = (filePath || "").trim();
  if (!raw) return null;

  const candidates: string[] = [];

  // Try absolute/local relative paths first.
  try {
    const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    candidates.push(abs);
  } catch {
    // ignore
  }

  // Try mapping tmp/uploads paths to repo-local uploads/.
  try {
    const rel = toUploadsRelative(raw);
    const abs2 = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
    if (!candidates.includes(abs2)) candidates.push(abs2);
  } catch {
    // ignore
  }

  for (const abs of candidates) {
    try {
      const buf = await fs.readFile(abs);
      return buf;
    } catch {
      // ignore
    }
  }

  return null;
}

export async function POST() {
  console.log('[KB BUILD] Route hit - starting KB build');
  const { userId, response } = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await prisma.file.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, filename: true, path: true, mime: true },
  });

  if (files.length === 0) {
    await prisma.knowledgeBaseStatus.upsert({
      where: { userId },
      update: { status: "empty", lastBuildId: null } as any,
      create: { userId, status: "empty" },
    });
    return NextResponse.json({ status: "empty", message: "No files uploaded" }, { status: 400 });
  }

  const build = await (prisma as any).knowledgeBaseBuild.create({
    data: {
      userId,
      status: "building",
    },
    select: { id: true },
  });

  await prisma.knowledgeBaseStatus.upsert({
    where: { userId },
    update: { status: "building", lastBuildId: build.id } as any,
    create: { userId, status: "building", lastBuildId: build.id } as any,
  });

  let processed = 0;
  let failed = 0;

  for (const file of files) {
    const job = await prisma.knowledgeBaseJob.create({
      data: {
        userId,
        buildId: build.id,
        fileId: file.id,
        status: "processing",
      } as any,
      select: { id: true },
    });

    try {
      const storagePath = (file.path || '').replace(/\\/g, '/');
      console.log('[KB BUILD] userId:', userId, 'fileId:', file.id, 'storagePath:', storagePath);
      try {
        if (!storagePath || typeof storagePath !== 'string') {
          console.warn('[KB BUILD] Skipping file (missing storagePath):', { fileId: file.id });
          await prisma.knowledgeBaseJob.update({ where: { id: job.id }, data: { status: 'failed', error: 'Missing storagePath' } as any });
          failed += 1;
          continue;
        }
      } catch (err) {
        console.error('[KB BUILD] Error updating job for missing storagePath:', err);
      }

      if (!storagePath || typeof storagePath !== 'string') {
        console.warn('[KB BUILD] Skipping file (missing storagePath):', { fileId: file.id });
        await prisma.knowledgeBaseJob.update({ where: { id: job.id }, data: { status: 'failed', error: 'Missing storagePath' } as any });
        failed += 1;
        continue;
      }

      // Try the canonical key (used by our upload endpoint) first, then fall back.
      const filename = String((file as any).filename || '').replace(/\\/g, '/').split('/').pop() || '';
      const basename = storagePath.split('/').pop() || '';

      const candidatePaths = new Set<string>();
      if (filename) candidatePaths.add(`knowledge-base/${userId}/${filename}`);
      if (storagePath && isSafeStorageKey(storagePath)) candidatePaths.add(storagePath);
      if (basename) candidatePaths.add(`knowledge-base/${userId}/${basename}`);
      if (basename) candidatePaths.add(`uploads/${userId}/${basename}`);
      // Legacy pattern: objects stored without a folder prefix.
      if (filename) candidatePaths.add(`${userId}/${filename}`);
      if (basename) candidatePaths.add(`${userId}/${basename}`);
      // Bucket screenshot indicates some objects may be nested under <userId>/knowledge-base/<userId>/...
      if (filename) candidatePaths.add(`${userId}/knowledge-base/${userId}/${filename}`);
      if (basename) candidatePaths.add(`${userId}/knowledge-base/${userId}/${basename}`);
      // Also try <userId>/knowledge-base/<filename> (less common, but safe).
      if (filename) candidatePaths.add(`${userId}/knowledge-base/${filename}`);
      if (basename) candidatePaths.add(`${userId}/knowledge-base/${basename}`);

      let downloaded = false;
      let buf: Buffer | null = null;

      const downloadErrors: string[] = [];
      const bucketsToTry = getBucketsToTry();
      for (const candidate of candidatePaths) {
        const key = normalizeKey(candidate);
        if (!isSafeStorageKey(key)) {
          downloadErrors.push(`candidate=${candidate} error=unsafe_path`);
          continue;
        }

        for (const bucket of bucketsToTry) {
          try {
            console.log('[KB BUILD] attempting download candidate:', { bucket, key, fileId: file.id });
            const { data, error } = await supabase.storage.from(bucket).download(key);
            if (error || !data) {
              let detail = (error as any)?.message ?? "";
              try {
                const original = (error as any)?.originalError;
                if (original && typeof original.status === "number") {
                  const status = original.status;
                  let bodyText = "";
                  try {
                    if (typeof original.text === "function") bodyText = await original.text();
                  } catch {
                    bodyText = "";
                  }
                  detail = `${detail || "storage_error"} status=${status}${bodyText ? ` body=${bodyText}` : ""}`;
                }
              } catch {
                // ignore
              }

              downloadErrors.push(`candidate=${bucket}:${key} error=${detail || JSON.stringify(error ?? {})}`);
              console.error('[KB BUILD] Supabase download failed for candidate:', { bucket, key, fileId: file.id, error });
              continue;
            }

            try {
              if (typeof (data as any).arrayBuffer === 'function') {
                const arrayBuffer = await (data as any).arrayBuffer();
                buf = Buffer.from(arrayBuffer);
              } else if (typeof (data as any).stream === 'function') {
                const stream = (data as any).stream();
                const chunks: Buffer[] = [];
                for await (const chunk of stream) {
                  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                buf = Buffer.concat(chunks);
              } else if (data instanceof Uint8Array) {
                buf = Buffer.from(data);
              } else {
                const arr = await (new Response(data as any)).arrayBuffer();
                buf = Buffer.from(arr);
              }
              if (buf) {
                downloaded = true;
                console.log('[KB BUILD] Downloaded file candidate:', { fileId: file.id, bucket, candidate: key, size: buf.byteLength });

                // Prefer healing into our configured canonical location.
                const canonicalKey = normalizeKey(`knowledge-base/${userId}/${filename || (basename || '')}`);
                if (isSafeStorageKey(canonicalKey) && (bucket !== SUPABASE_STORAGE_BUCKET || key !== canonicalKey)) {
                  try {
                    const { error: upErr } = await supabase.storage
                      .from(SUPABASE_STORAGE_BUCKET)
                      .upload(canonicalKey, buf, { upsert: false, contentType: file.mime || 'application/octet-stream' });
                    if (!upErr) {
                      console.log('[KB BUILD] Healed object into canonical key:', { fileId: file.id, canonicalKey });
                    }
                  } catch {
                    // ignore healing failures
                  }
                }

                // If DB path was wrong, update it to the canonical key (preferred) or the successful key.
                const preferredPath = isSafeStorageKey(canonicalKey) ? canonicalKey : key;
                if (preferredPath !== storagePath) {
                  try {
                    if (typeof (prisma as any)?.file?.update === 'function') {
                      await (prisma as any).file.update({ where: { id: file.id }, data: { path: preferredPath } });
                      console.log('[KB BUILD] Updated DB storage path for file', file.id, '->', preferredPath);
                    }
                  } catch (uErr) {
                    console.error('[KB BUILD] Failed to update DB path for', file.id, uErr);
                  }
                }
                break;
              }
            } catch (innerErr) {
              console.error('[KB BUILD] Could not convert downloaded data to buffer for candidate:', { bucket, key, fileId: file.id, err: innerErr });
              continue;
            }
          } catch (err) {
            console.warn('[KB BUILD] Error downloading candidate from Supabase:', { fileId: file.id, bucket, key, err });
            continue;
          }
        }

        if (downloaded) break;
      }

      if (!downloaded || !buf) {
        // Legacy fallback: attempt to read from local filesystem (dev / legacy uploads) and re-upload.
        const legacyBuf = await tryReadLegacyFileBuffer(storagePath);
        if (legacyBuf && !buf) {
          const filename = String((file as any).filename || '').replace(/\\/g, '/').split('/').pop() || '';
          const canonicalKey = normalizeKey(`knowledge-base/${userId}/${filename || (storagePath.split('/').pop() || '')}`);

          if (filename && isSafeStorageKey(canonicalKey)) {
            try {
              const { error: upErr } = await supabase.storage
                .from(SUPABASE_STORAGE_BUCKET)
                .upload(canonicalKey, legacyBuf, {
                  upsert: true,
                  contentType: file.mime || "application/octet-stream",
                });

              if (!upErr) {
                buf = legacyBuf;
                downloaded = true;
                try {
                  if (typeof (prisma as any)?.file?.update === 'function') {
                    await (prisma as any).file.update({ where: { id: file.id }, data: { path: canonicalKey } });
                  }
                } catch {
                  // ignore
                }
                console.log('[KB BUILD] Re-uploaded legacy file to Supabase:', { fileId: file.id, canonicalKey, size: buf.byteLength });
              } else {
                downloadErrors.push(`legacy_reupload_failed error=${upErr.message || JSON.stringify(upErr)}`);
              }
            } catch (e) {
              downloadErrors.push(`legacy_reupload_failed error=${e instanceof Error ? e.message : String(e)}`);
            }
          } else {
            downloadErrors.push('legacy_read_ok_but_no_canonical_key');
          }
        }

        if (downloaded && buf) {
          // continue
        } else {
        // mark job failed but continue
        try {
          await prisma.knowledgeBaseJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              error:
                downloadErrors.length > 0
                  ? `Failed to download file. ${downloadErrors.slice(0, 4).join(' | ')}`
                  : 'Failed to download file',
            } as any,
          });
        } catch (err) {
          console.error('[KB BUILD] Error updating job for failed download:', err);
        }
        failed += 1;
        continue;
        }
      }

      // Parse in-memory
      let text = '';
      let pdfParsed = false;
      try {
        text = await readTextFromBuffer(buf, file.mime || '');
        if ((file.mime || '').includes('pdf')) pdfParsed = true;
        console.log('[KB BUILD] Parsed file:', { fileId: file.id, pdfParsed });
      } catch (err) {
        console.error('[KB BUILD] Error parsing file:', { fileId: file.id, storagePath, error: err });
        try {
          await prisma.knowledgeBaseJob.update({ where: { id: job.id }, data: { status: 'failed', error: String(err) } as any });
        } catch (dbErr) {
          console.error('[KB BUILD] Error updating job for failed parse:', dbErr);
        }
        failed += 1;
        continue;
      }

      const chunks = splitTextIntoChunks(text).filter((c) => c.trim().length > 0);

      const chunkRows = chunks.map((t, idx) => {
        const id = `${file.id}-${idx}`;
        return { id, fileId: file.id, index: idx, text: t, qdrantId: id };
      });

      await prisma.$transaction([
        prisma.chunk.deleteMany({ where: { fileId: file.id } }),
        prisma.chunk.createMany({ data: chunkRows }),
        prisma.knowledgeBaseJob.update({ where: { id: job.id }, data: { status: 'done', error: null } }),
      ]);

      try {
        await indexChunksInQdrant({
          userId,
          chunks: chunkRows.map((c) => ({ id: c.id, fileId: c.fileId, text: c.text })),
        });
      } catch (err) {
        console.error('[KB BUILD] Error indexing chunks in Qdrant:', err);
      }

      processed += 1;
    } catch (e) {
      console.error('[KB BUILD] KB build failed for file', file.id, e);
      failed += 1;
      await prisma.knowledgeBaseJob.update({ where: { id: job.id }, data: { status: 'failed', error: e instanceof Error ? e.message : String(e) } as any });
    }
  }

  const finalStatus = processed > 0 ? 'ready' : 'empty';
  const buildStatus = processed > 0 ? 'ready' : 'failed';
  const completedAt = new Date();

  await (prisma as any).knowledgeBaseBuild.update({ where: { id: build.id }, data: { status: buildStatus, completedAt, processed, failed, error: processed > 0 ? null : 'No files could be processed. Check KnowledgeBaseJob errors for details.' } });

  await prisma.knowledgeBaseStatus.upsert({ where: { userId }, update: { status: finalStatus, lastBuildId: build.id } as any, create: { userId, status: finalStatus, lastBuildId: build.id } as any });

  if (processed === 0) {
    let failedJobErrors: Array<{ fileId: string; error: string | null }> = []
    try {
      const rows = await prisma.knowledgeBaseJob.findMany({
        where: { buildId: build.id, status: 'failed' },
        orderBy: { createdAt: 'asc' },
        select: { fileId: true, error: true },
        take: 10,
      })
      failedJobErrors = rows.map((r) => ({ fileId: r.fileId, error: r.error ? String(r.error) : null }))
    } catch (e) {
      // ignore
    }

    const message =
      failedJobErrors[0]?.error ||
      'No files could be processed. Check KnowledgeBaseJob errors for details.'

    return NextResponse.json(
      {
        error: 'Knowledge base build failed',
        message,
        buildId: build.id,
        processed,
        failed,
        failedJobErrors,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: finalStatus, message: 'Knowledge base built successfully', buildId: build.id, completedAt: completedAt.toISOString(), processed, failed });
}