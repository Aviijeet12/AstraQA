import { QDRANT_API_KEY, QDRANT_URL, VECTOR_COLLECTION_NAME } from "./env"

type QdrantPoint = {
  id: string | number
  vector: number[]
  payload?: Record<string, unknown>
}

const collectionName = () => VECTOR_COLLECTION_NAME || "astraqa_kb"

const authHeaders = () => {
  const headers: Record<string, string> = {}
  if (QDRANT_API_KEY) headers["api-key"] = QDRANT_API_KEY
  return headers
}

function requireQdrantUrl() {
  if (!QDRANT_URL) {
    throw new Error("Qdrant is not configured. Set QDRANT_URL (and optionally QDRANT_API_KEY).")
  }
  return QDRANT_URL
}

export function isQdrantConfigured() {
  return Boolean(QDRANT_URL)
}

export async function ensureCollection(dim: number) {
  const base = requireQdrantUrl()
  const name = collectionName()
  const url = `${base.replace(/\/$/, "")}/collections/${encodeURIComponent(name)}`

  const info = await fetch(url, { headers: authHeaders() })
  if (info.ok) return

  const createRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      vectors: { size: dim, distance: "Cosine" },
    }),
  })

  if (!createRes.ok) {
    throw new Error("Failed to create Qdrant collection: " + (await createRes.text()))
  }
}

export async function upsertPoints(points: QdrantPoint[]) {
  const base = requireQdrantUrl()
  const name = collectionName()
  const url = `${base.replace(/\/$/, "")}/collections/${encodeURIComponent(name)}/points?wait=true`

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ points }),
  })

  if (!res.ok) {
    throw new Error(`Qdrant upsert failed: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<unknown>
}

export async function searchPoints(opts: { vector: number[]; limit: number; filter?: unknown }) {
  const base = requireQdrantUrl()
  const name = collectionName()
  const url = `${base.replace(/\/$/, "")}/collections/${encodeURIComponent(name)}/points/search`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      vector: opts.vector,
      limit: opts.limit,
      with_payload: true,
      filter: opts.filter,
    }),
  })

  if (!res.ok) {
    throw new Error(`Qdrant search failed: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<{
    result: Array<{ id: string | number; score: number; payload?: Record<string, unknown> }>
  }>
}

export async function deletePointsByFilter(filter: unknown) {
  const base = requireQdrantUrl()
  const name = collectionName()
  const url = `${base.replace(/\/$/, "")}/collections/${encodeURIComponent(name)}/points/delete?wait=true`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ filter }),
  })

  if (!res.ok) {
    throw new Error(`Qdrant delete failed: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<unknown>
}
