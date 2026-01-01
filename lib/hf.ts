const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

export async function callHuggingFace(
  modelId: string,
  payload: unknown,
  apiKey?: string,
  opts?: { signal?: AbortSignal; maxAttempts?: number },
) {
  const { HF_API_KEY } = await import("./env")
  const key = (typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey.trim() : null) ?? HF_API_KEY
  if (!key) {
    throw new Error("Missing HF_API_KEY (required for HuggingFace calls)")
  }

  // HF deprecated api-inference.huggingface.co; router is the supported replacement.
  const url = "https://router.huggingface.co/v1/chat/completions"

  const maxAttempts = Math.max(1, Math.min(5, opts?.maxAttempts ?? 3))
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: modelId, ...(payload as any) }),
      signal: opts?.signal,
    })

    if (res.ok) {
      return res.json()
    }

    const text = await res.text().catch(() => "")

    // Retry transient errors.
    if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
      let waitMs = 1500

      // Honor Retry-After when present.
      const ra = res.headers.get("retry-after")
      if (ra) {
        const seconds = Number(ra)
        if (Number.isFinite(seconds) && seconds > 0) waitMs = Math.min(30_000, Math.max(1000, Math.round(seconds * 1000)))
      }

      await sleep(waitMs)
      continue
    }

    throw new Error(`HF Router error: ${res.status} ${res.statusText}: ${truncate(text || "(no body)", 800)}`)
  }

  throw new Error("HF Router error: exhausted retries")
}
