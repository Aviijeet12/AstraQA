import { HF_API_KEY } from "./env"

export async function callHuggingFace(modelId: string, payload: unknown) {
  const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`HF API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
