// Vitest global setup
// Keep required env vars present so importing server modules doesn't throw.

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/db?schema=public";
process.env.NEXTAUTH_SECRET ||= "test-secret";

// Supabase client is created at module import time in lib/supabase.ts.
process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_KEY ||= "test-anon-key";
process.env.SUPABASE_BUCKET ||= "astraA";
