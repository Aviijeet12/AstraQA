import { createClient } from "@supabase/supabase-js";

import { SUPABASE_BUCKET, SUPABASE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL } from "./env";

const decodeSupabaseKeyRole = (key: string | undefined): "service_role" | "anon" | "unknown" => {
  if (!key) return "unknown"

  // Supabase keys are typically JWTs. We can safely decode the payload (no verification)
  // to infer whether the server is using an anon key vs service_role key.
  const parts = key.split(".")
  if (parts.length < 2) return "unknown"

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=")
    const json = Buffer.from(payload, "base64").toString("utf8")
    const parsed = JSON.parse(json) as { role?: unknown }
    const role = typeof parsed?.role === "string" ? parsed.role : undefined
    if (role === "service_role" || role === "anon") return role
    return "unknown"
  } catch {
    return "unknown"
  }
}

export const supabase = (() => {
  if (!SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL env")
  }

  // Server routes should use the service role key when available so Storage
  // downloads work even when the bucket is private / protected by policies.
  const key = SUPABASE_SERVICE_KEY || SUPABASE_KEY
  if (!key) {
    throw new Error("Missing SUPABASE_KEY or SUPABASE_SERVICE_KEY env")
  }

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
})()

export const SUPABASE_KEY_ROLE = decodeSupabaseKeyRole(SUPABASE_SERVICE_KEY || SUPABASE_KEY)
export const SUPABASE_USING_SERVICE_ROLE = SUPABASE_KEY_ROLE === "service_role"

export const SUPABASE_STORAGE_BUCKET = SUPABASE_BUCKET || "astraA"
