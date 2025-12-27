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
export const SUPABASE_URL = optional(process.env.SUPABASE_URL)
export const SUPABASE_KEY = optional(process.env.SUPABASE_KEY)

// Optional vector DB / embeddings
export const QDRANT_URL = optional(process.env.QDRANT_URL)
export const QDRANT_API_KEY = optional(process.env.QDRANT_API_KEY)
export const VECTOR_COLLECTION_NAME = optional(process.env.VECTOR_COLLECTION_NAME)

export const OLLAMA_BASE_URL = optional(process.env.OLLAMA_BASE_URL)
export const OLLAMA_EMBED_MODEL = optional(process.env.OLLAMA_EMBED_MODEL)
export const HF_EMBEDDINGS_MODEL = optional(process.env.HF_EMBEDDINGS_MODEL)
