import { NextResponse } from "next/server"
import { requireUserId } from "@/lib/require-user"
import { retrieveChunks } from "@/lib/rag"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const { userId, response } = await requireUserId()
  if (!userId) return response

  const body = (await req.json().catch(() => ({}))) as { query?: unknown; topK?: unknown }
  const query = typeof body.query === "string" ? body.query : ""
  const topK = typeof body.topK === "number" ? body.topK : undefined

  if (!query.trim()) {
    return NextResponse.json({ error: "Missing 'query'" }, { status: 400 })
  }

  const { mode, chunks } = await retrieveChunks({ userId, query, topK })

  return NextResponse.json({
    mode,
    chunks: chunks.map((c) => ({
      id: c.chunkId,
      fileId: c.fileId,
      score: c.score,
      text: c.text,
    })),
  })
}
