const required = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const optional = (value: string | undefined) => (value && value.trim().length > 0 ? value : undefined)

// Required for core app
export const DATABASE_URL = required("DATABASE_URL", process.env.DATABASE_URL)
export const NEXTAUTH_SECRET = required("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET)

// Optional integrations (enable when configured)
export const GEMINI_API_KEY = optional(process.env.GEMINI_API_KEY)
export const ANTHROPIC_API_KEY = optional(process.env.ANTHROPIC_API_KEY)
export const ANTHROPIC_MODEL = optional(process.env.ANTHROPIC_MODEL)
export const HF_API_KEY = optional(process.env.HF_API_KEY)
export const HF_BASE_URL = optional(process.env.HF_BASE_URL) || "https://router.huggingface.co/v1"
export const HF_MODEL_NAME = optional(process.env.HF_MODEL_NAME) || "meta-llama/Llama-3.1-8B-Instruct"
export const HF_FALLBACK_MODEL_NAME = optional(process.env.HF_FALLBACK_MODEL_NAME) || "Qwen/Qwen2.5-7B-Instruct"
export const HF_MAX_TOKENS = Number(process.env.HF_MAX_TOKENS) || 1024
export const SUPABASE_URL = optional(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
export const SUPABASE_KEY = optional(
  process.env.SUPABASE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)
export const SUPABASE_SERVICE_KEY = optional(
  process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE,
)
export const SUPABASE_BUCKET = optional(process.env.SUPABASE_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_BUCKET)

// Optional vector DB / embeddings
export const QDRANT_URL = optional(process.env.QDRANT_URL)
export const QDRANT_API_KEY = optional(process.env.QDRANT_API_KEY)
export const VECTOR_COLLECTION_NAME = optional(process.env.VECTOR_COLLECTION_NAME)

export const OLLAMA_BASE_URL = optional(process.env.OLLAMA_BASE_URL)
export const OLLAMA_EMBED_MODEL = optional(process.env.OLLAMA_EMBED_MODEL)
export const HF_EMBEDDINGS_MODEL = optional(process.env.HF_EMBEDDINGS_MODEL)
