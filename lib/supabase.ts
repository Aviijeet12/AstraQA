import { createClient } from "@supabase/supabase-js";

import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export const supabase = (() => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY env")
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY)
})()
