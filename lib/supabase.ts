import { createClient } from "@supabase/supabase-js";

import { SUPABASE_BUCKET, SUPABASE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL } from "./env";

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

export const SUPABASE_STORAGE_BUCKET = SUPABASE_BUCKET || "astraA"
