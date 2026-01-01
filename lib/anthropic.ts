const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

export async function callAnthropic(
  model: string,
  body: unknown,
  apiKey?: string,
  opts?: { signal?: AbortSignal },
) {
  const { ANTHROPIC_API_KEY } = await import("./env")
  const key =
    (typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey.trim() : null) ?? ANTHROPIC_API_KEY

  if (!key) {
    throw new Error("Missing Anthropic API key (set ANTHROPIC_API_KEY or provide apiKey)")
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, ...(body || {}) }),
    signal: opts?.signal,
  })

  if (!res.ok) {
    let detail = ""
    try {
      detail = await res.text()
    } catch {
      detail = ""
    }
    throw new Error(`Anthropic API error: ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`)
  }

  return res.json()
}
