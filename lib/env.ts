const required = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const GEMINI_API_KEY = required("GEMINI_API_KEY", process.env.GEMINI_API_KEY)
export const SUPABASE_URL = required("SUPABASE_URL", process.env.SUPABASE_URL)
export const SUPABASE_KEY = required("SUPABASE_KEY", process.env.SUPABASE_KEY)
export const HF_API_KEY = required("HF_API_KEY", process.env.HF_API_KEY)
export const DATABASE_URL = required("DATABASE_URL", process.env.DATABASE_URL)
export const NEXTAUTH_SECRET = required("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET)
