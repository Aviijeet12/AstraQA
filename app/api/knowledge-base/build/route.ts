import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import path from "path";
import { promises as fs } from "fs";
import { indexChunksInQdrant } from "@/lib/rag";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { createRequire } from 'module';

// Hint to bundlers/packagers: attempt to resolve known pdfjs entry so the dependency
// is included in serverless deployments even when referenced dynamically inside
// an evaluated child script. This is safe because resolution failures are caught.
try {
  const _req = createRequire(import.meta.url);
  _req.resolve('pdfjs-dist/legacy/build/pdf.mjs');
} catch (_) {
  // ignore; this only helps the packager include pdfjs-dist when possible
}

export const runtime = "nodejs";

async function extractPdfTextViaSubprocess(absPath: string) {
  const outPath = path.join(os.tmpdir(), `kb-pdf-${randomUUID()}.txt`);

  const script = String.raw`
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const args = process.argv.slice(-2);
const inPath = args[0];
const outPath = args[1];
if (!inPath || !outPath) throw new Error('Missing args');

const buf = await fs.readFile(inPath);
const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

let pdfjs;
// Try several candidate entry points for pdfjs-dist — different installs/package layouts
const candidates = [
  'pdfjs-dist/legacy/build/pdf.mjs',
  'pdfjs-dist/legacy/build/pdf.js',
  'pdfjs-dist/build/pdf.mjs',
  'pdfjs-dist/build/pdf.js',
  'pdfjs-dist'
];
let entry;
for (const c of candidates) {
  try {
    entry = require.resolve(c);
    break;
  } catch (_) {
    // try next
  }
}
if (!entry) {
  // Fallback to dynamic import of package name — may work in some environments
  try {
    pdfjs = await import('pdfjs-dist');
  } catch (err) {
    throw new Error('Could not resolve or import pdfjs-dist: ' + String(err));
  }
} else {
  pdfjs = await import(pathToFileURL(entry).href);
}

const standardFontsPath = entry
  ? path.resolve(path.dirname(entry), '../../standard_fonts/')
  : undefined;
const standardFontDataUrl = standardFontsPath
  ? pathToFileURL(standardFontsPath + path.sep).href
  : undefined;

const loadingTask = pdfjs.getDocument({ data, disableWorker: true, standardFontDataUrl });
const doc = await loadingTask.promise;
try {
  let out = '';
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = (textContent && textContent.items) ? textContent.items : [];
    const pageText = Array.isArray(items)
      ? items.map((it) => (typeof it?.str === 'string' ? it.str : '')).filter(Boolean).join(' ')
      : '';
    out += pageText + '\n';
    import { promises as fs } from 'node:fs';
    import path from 'node:path';
    import { pathToFileURL } from 'node:url';
    import { createRequire } from 'node:module';
}
`;

  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", script, absPath, outPath],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (d) => {
    stderr += d;
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  try {
    if (exitCode !== 0) {
      throw new Error(stderr.trim() || `PDF subprocess failed (exit ${exitCode})`);
    }
    return await fs.readFile(outPath, "utf8");
  } finally {
    try {
      await fs.unlink(outPath);
    } catch {
      // ignore
    }
  }
}

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

async function readTextFromFile(absPath: string, mime: string) {
  const buf = await fs.readFile(absPath);

  if (mime.includes("officedocument") || absPath.toLowerCase().endsWith(".docx")) {
    const mod = await import("mammoth");
    const extractRawText = (mod as any).extractRawText ?? (mod as any).default?.extractRawText;
    if (typeof extractRawText === "function") {
      const result = await extractRawText({ buffer: buf });
      return (result?.value as string | undefined) ?? "";
    }
  }

  if (mime.includes("pdf") || absPath.toLowerCase().endsWith(".pdf")) {
    return await extractPdfTextViaSubprocess(absPath);
  }

  const text = buf.toString("utf-8");
  if (mime.includes("json") || absPath.toLowerCase().endsWith(".json")) {
    try {
      const obj = JSON.parse(text);
      return typeof obj === "object" ? JSON.stringify(obj, null, 2) : String(obj);
    } catch {
      return text;
    }
  }

  return text;
}

export async function POST() {
  const { userId, response } = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await prisma.file.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, path: true, mime: true },
  });

  if (files.length === 0) {
    await prisma.knowledgeBaseStatus.upsert({
      where: { userId },
      update: { status: "empty", lastBuildId: null } as any,
      create: { userId, status: "empty" },
    });
    return NextResponse.json({ status: "empty", message: "No files uploaded" }, { status: 400 });
  }
    async function extractPdfTextViaPdfParse(absPath: string) {
      const buf = await fs.readFile(absPath);
      try {
        const mod = await import('pdf-parse');
        const parser = (mod && (mod as any).default) ? (mod as any).default : mod;
        const data = await parser(buf);
        return (data && data.text) ? String(data.text) : '';
      } catch (err) {
        console.error('pdf-parse failed:', err);
        throw err;
      }
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

        return await extractPdfTextViaPdfParse(absPath);
      const relOrAbsPath = (file.path || "").replace(/\\/g, path.sep);
      const absPath = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.join(process.cwd(), relOrAbsPath);
      let text = "";
      try {
        text = await readTextFromFile(absPath, file.mime || "");
      } catch (err) {
        console.error(`Error reading file for KB build:`, {
          fileId: file.id,
          absPath,
          mime: file.mime,
          error: err instanceof Error ? err.message : err
        });
        throw err;
      }
      const chunks = splitTextIntoChunks(text).filter((c) => c.trim().length > 0);

      const chunkRows = chunks.map((t, idx) => {
        const id = `${file.id}-${idx}`;
        return { id, fileId: file.id, index: idx, text: t, qdrantId: id };
      });

      await prisma.$transaction([
        prisma.chunk.deleteMany({ where: { fileId: file.id } }),
        prisma.chunk.createMany({
          data: chunkRows,
        }),
        prisma.knowledgeBaseJob.update({
          where: { id: job.id },
          data: { status: "done", error: null },
        }),
      ]);

      // Optional vector indexing for RAG (Qdrant + embeddings provider).
      // If not configured, this will be a no-op.
      try {
        await indexChunksInQdrant({
          userId,
          chunks: chunkRows.map((c) => ({ id: c.id, fileId: c.fileId, text: c.text })),
        });
      } catch (err) {
        console.error(`Error indexing chunks in Qdrant:`, err);
        // Ignore vector indexing failures; DB chunks are still usable via FTS retrieval.
      }

      processed += 1;
    } catch (e) {
      console.error(`KB build failed for file`, file.id, e);
      failed += 1;
      await prisma.knowledgeBaseJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: e instanceof Error ? e.message : "Unknown error",
        },
      });
    }
  }

  const finalStatus = processed > 0 ? "ready" : "empty";
  const buildStatus = processed > 0 ? "ready" : "failed";
  const completedAt = new Date();

  await (prisma as any).knowledgeBaseBuild.update({
    where: { id: build.id },
    data: {
      status: buildStatus,
      completedAt,
      processed,
      failed,
      error:
        processed > 0
          ? null
          : "No files could be processed. Check KnowledgeBaseJob errors for details.",
    },
  });

  await prisma.knowledgeBaseStatus.upsert({
    where: { userId },
    update: { status: finalStatus, lastBuildId: build.id } as any,
    create: { userId, status: finalStatus, lastBuildId: build.id } as any,
  });

  if (processed === 0) {
    // Surface a hard failure so the UI can show a toast and the user understands why
    // KB stays empty and the dashboard success rate remains 0.
    return NextResponse.json(
      {
        error: "Knowledge base build failed",
        message: "No files could be processed. Check the latest build errors in the dashboard.",
        buildId: build.id,
        processed,
        failed,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: finalStatus,
    message: "Knowledge base built successfully",
    buildId: build.id,
    completedAt: completedAt.toISOString(),
    processed,
    failed,
  });
}