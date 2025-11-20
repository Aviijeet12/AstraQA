import { GEMINI_API_KEY } from "./env"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

export async function callGemini(model: string, body: unknown) {
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`

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
