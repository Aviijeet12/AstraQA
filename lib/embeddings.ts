import { HF_API_KEY, HF_EMBEDDINGS_MODEL, OLLAMA_BASE_URL, OLLAMA_EMBED_MODEL } from "./env"

export type EmbeddingProvider = "ollama" | "huggingface" | "none"

export function getEmbeddingProvider(): EmbeddingProvider {
  if (OLLAMA_BASE_URL) return "ollama"
  if (HF_API_KEY) return "huggingface"
  return "none"
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider()
  if (provider === "none") {
    throw new Error(
      "No embedding provider configured. Set OLLAMA_BASE_URL (recommended) or HF_API_KEY to enable vector embeddings."
    )
  }

  if (provider === "ollama") {
    const base = (OLLAMA_BASE_URL || "").replace(/\/$/, "")
    const model = OLLAMA_EMBED_MODEL || "nomic-embed-text"

    const results: number[][] = []
    for (const t of texts) {
      const res = await fetch(`${base}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: t }),
      })

      if (!res.ok) {
        throw new Error(`Ollama embeddings failed: ${res.status} ${await res.text()}`)
      }

      const data = (await res.json()) as { embedding?: number[] }
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("Ollama embeddings response missing 'embedding'")
      }
      results.push(data.embedding)
    }

    return results
  }

  // HuggingFace Inference API (feature-extraction)
  const modelId = HF_EMBEDDINGS_MODEL || "sentence-transformers/all-MiniLM-L6-v2"
  const token = HF_API_KEY
  if (!token) {
    throw new Error("Missing HF_API_KEY")
  }

  const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: texts }),
  })

  if (!res.ok) {
    throw new Error(`HF embeddings error: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as unknown

  // HF may return:
  // - number[] (single input)
  // - number[][] (batch)
  // - number[][][] (token embeddings). If token-level, mean-pool to sentence vector.
  if (Array.isArray(data) && data.length > 0 && Array.isArray((data as any)[0]) && typeof (data as any)[0][0] === "number") {
    return data as number[][]
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    Array.isArray((data as any)[0]) &&
    Array.isArray((data as any)[0][0])
  ) {
    // token embeddings: [batch][tokens][dim]
    const batch = data as number[][][]
    return batch.map((tokenVectors) => {
      const dim = tokenVectors[0]?.length || 0
      const sums = new Array(dim).fill(0)
      for (const v of tokenVectors) {
        for (let i = 0; i < dim; i++) sums[i] += v[i] || 0
      }
      const denom = Math.max(1, tokenVectors.length)
      return sums.map((x) => x / denom)
    })
  }

  if (Array.isArray(data) && data.length > 0 && typeof (data as any)[0] === "number") {
    return [data as number[]]
  }

  throw new Error("Unrecognized embeddings response shape from provider")
}
