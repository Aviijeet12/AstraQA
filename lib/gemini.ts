const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

export async function callGemini(model: string, body: unknown, apiKey?: string) {
  const { GEMINI_API_KEY } = await import("./env")
  const key = (typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey.trim() : null) ?? GEMINI_API_KEY

  if (!key) {
    throw new Error("Missing Gemini API key (set GEMINI_API_KEY or provide apiKey)")
  }

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(key)}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
