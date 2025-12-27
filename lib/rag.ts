import { prisma } from "@/lib/prisma"
import { embedTexts, getEmbeddingProvider } from "@/lib/embeddings"
import { ensureCollection, isQdrantConfigured, searchPoints, upsertPoints } from "@/lib/qdrant"

export type RetrievedChunk = {
  chunkId: string
  fileId: string
  text: string
  score: number
}

export async function retrieveChunks(opts: {
  userId: string
  query: string
  topK?: number
}): Promise<{ mode: "qdrant" | "fts"; chunks: RetrievedChunk[] }> {
  const topK = Math.max(1, Math.min(20, opts.topK ?? 6))
  const query = (opts.query || "").trim()
  if (!query) return { mode: "fts", chunks: [] }

  const canVector = isQdrantConfigured() && getEmbeddingProvider() !== "none"

  if (canVector) {
    try {
      const [qVec] = await embedTexts([query])
      await ensureCollection(qVec.length)

      const results = await searchPoints({
        vector: qVec,
        limit: topK,
        filter: {
          must: [{ key: "userId", match: { value: opts.userId } }],
        },
      })

      const chunkIds = results.result
        .map((r) => String(r.payload?.chunkId ?? r.id))
        .filter(Boolean)
        .slice(0, topK)

      if (chunkIds.length === 0) {
        return await retrieveChunksViaFts(opts)
      }

      const rows = await prisma.chunk.findMany({
        where: { id: { in: chunkIds } },
        select: { id: true, fileId: true, text: true },
      })

      const scoreById = new Map<string, number>()
      for (const r of results.result) {
        const id = String(r.payload?.chunkId ?? r.id)
        scoreById.set(id, r.score)
      }

      const chunks: RetrievedChunk[] = rows
        .map((r) => ({
          chunkId: r.id,
          fileId: r.fileId,
          text: r.text,
          score: scoreById.get(r.id) ?? 0,
        }))
        .sort((a, b) => b.score - a.score)

      return { mode: "qdrant", chunks }
    } catch {
      // fall back to FTS if vector retrieval fails (network/model/etc.)
      return await retrieveChunksViaFts(opts)
    }
  }

  return await retrieveChunksViaFts(opts)
}

export async function retrieveChunksViaFts(opts: {
  userId: string
  query: string
  topK?: number
}): Promise<{ mode: "fts"; chunks: RetrievedChunk[] }> {
  const topK = Math.max(1, Math.min(20, opts.topK ?? 6))
  const q = (opts.query || "").trim()
  if (!q) return { mode: "fts", chunks: [] }

  // Postgres full-text search over Chunk.text, scoped to the user's files.
  // Using a raw query because Prisma does not have first-class FTS APIs.
  const rows = (await prisma.$queryRaw`
    SELECT
      c.id as "chunkId",
      c."fileId" as "fileId",
      c.text as "text",
      ts_rank_cd(to_tsvector('english', c.text), plainto_tsquery('english', ${q})) as score
    FROM "Chunk" c
    JOIN "File" f ON f.id = c."fileId"
    WHERE f."userId" = ${opts.userId}
    ORDER BY score DESC
    LIMIT ${topK}
  `) as Array<{ chunkId: string; fileId: string; text: string; score: number }>

  return {
    mode: "fts",
    chunks: rows.map((r) => ({
      chunkId: r.chunkId,
      fileId: r.fileId,
      text: r.text,
      score: Number(r.score) || 0,
    })),
  }
}

export async function indexChunksInQdrant(opts: {
  userId: string
  chunks: Array<{ id: string; fileId: string; text: string }>
}) {
  if (!isQdrantConfigured()) return { indexed: 0, mode: "disabled" as const }
  if (getEmbeddingProvider() === "none") return { indexed: 0, mode: "no-embeddings" as const }
  if (opts.chunks.length === 0) return { indexed: 0, mode: "empty" as const }

  const embeddings = await embedTexts(opts.chunks.map((c) => c.text))
  const dim = embeddings[0]?.length || 0
  await ensureCollection(dim)

  const points = opts.chunks.map((c, idx) => ({
    id: c.id,
    vector: embeddings[idx] || [],
    payload: {
      chunkId: c.id,
      fileId: c.fileId,
      userId: opts.userId,
    },
  }))

  await upsertPoints(points)

  return { indexed: opts.chunks.length, mode: "qdrant" as const }
}
