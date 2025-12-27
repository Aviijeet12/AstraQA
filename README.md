# AstraQA Engine UI

This is a Next.js (App Router) frontend for the AstraQA Engine: a QA automation companion that builds a knowledge base from your docs, generates test cases, and produces Selenium Python scripts.

## High-level Features

- Landing page and marketing content
- Auth (login/signup) with protected dashboard routes
- Dashboard with real stats and recent activity (Prisma-backed)
- Knowledge Base builder (file upload + "build" flow)
- Test Case generator (RAG + LLM; requires `GEMINI_API_KEY`)
- Selenium Script generator
- Settings for LLM/vector DB and Selenium defaults

## Implemented Backend APIs (Next.js Route Handlers)

All routes live under `app/api`.

- `POST /api/knowledge-base/upload`
  - Expects `multipart/form-data` with one or more `files` fields.
  - Returns basic metadata for each file (id, name, size, type, uploadedAt).

- `POST /api/knowledge-base/build`
  - Builds the knowledge base by parsing uploaded files and chunking content.
  - Persists chunks to Postgres (`Chunk` table) and tracks jobs/status.
  - If a vector DB + embeddings provider are configured, also indexes vectors for semantic retrieval.
  - Returns `{ status, message, completedAt, processed }`.

- `POST /api/knowledge-base/retrieve`
  - Body: `{ "query": string, "topK"?: number }`.
  - Returns `{ mode: "fts" | "qdrant", chunks: [{ id, fileId, score, text }] }`.
  - Uses Postgres full-text search by default, and Qdrant vector similarity when configured.

- `POST /api/tests/generate`
  - Body: `{ "prompt": string }`.
  - Returns `{ testCases: TestCase[] }` matching the shape used in `components/app-provider.tsx`.
  - Uses Knowledge Base retrieval (FTS/Qdrant) + Gemini to generate KB-grounded test cases.
  - If `GEMINI_API_KEY` is not set, returns a clear 400 error (placeholders are intentionally disabled).

- `POST /api/scripts/generate`
  - Body: `{ testCase: TestCase }`.
  - Returns `{ script: string }`, a Selenium Python test function derived from the test case.

- `POST /api/config/save`
  - Body: `{ llmProvider?, vectorDb?, defaultBrowser?, implicitWaitSeconds?, headless? }`.
  - Persists per-user settings in Postgres.

- `POST /api/knowledge-base/reset`
  - Deletes all uploaded files, chunks, build runs, generated test cases, and scripts for the current user.

## How the Frontend Uses These APIs

- `app/dashboard/knowledge-base/page.tsx`
  - Calls `/api/knowledge-base/upload` when you drop or select files.
  # AstraQA

  AstraQA is a full-stack QA automation assistant built with **Next.js App Router**, **Prisma + Postgres**, and a modern dashboard UI. It lets you:

  - Upload product documentation into a **Knowledge Base**
  - Build an internal KB that can later power RAG-style flows
  - Generate **test cases** automatically from natural language prompts
  - Generate **Selenium-style scripts** from selected test cases
  - Manage basic **settings** (browser, timeouts, providers) for your QA runs

  This repo contains the **UI + backend API routes** and a Prisma schema ready to connect to a Neon/Postgres database.

  ---

  ## Tech Stack

  - **Framework:** Next.js 16 (App Router, Turbopack)
  - **Language:** TypeScript / React 19
  - **Styling:** Tailwind CSS 4, Radix UI, shadcn-inspired components
  - **Auth:** NextAuth (Credentials provider)
  - **Database:** PostgreSQL via Prisma ORM
  - **Storage (planned):** Supabase Storage for KB files
  - **LLM / Embeddings (planned):** Google Gemini, HuggingFace, Chroma/local vector DB

  ---

  ## Project Structure

  Key folders and files:

  - `app/`
    - `page.tsx` – Landing page
    - `layout.tsx` – Root layout, theme & analytics wiring
    - `dashboard/`
      - `page.tsx` – Main dashboard (stats + recent activity + quick actions)
      - `knowledge-base/page.tsx` – KB builder (upload + build)
      - `test-generator/page.tsx` – Test case generator UI
      - `script-generator/page.tsx` – Script generator UI
      - `settings/page.tsx` – Settings page
    - `api/`
      - `auth/[...nextauth]/route.ts` – NextAuth credentials provider
      - `auth/signup/route.ts` – Signup endpoint
      - `auth/me/route.ts` – Returns current user
        - `auth/logout/route.ts` – Returns 410 (use NextAuth `signOut` client flow)
        - `knowledge-base/upload/route.ts` – Uploads KB documents
        - `knowledge-base/build/route.ts` – Builds KB chunks + tracks runs/jobs
        - `knowledge-base/retrieve/route.ts` – Retrieves relevant KB chunks (FTS/Qdrant)
        - `knowledge-base/reset/route.ts` – Deletes all KB data for the user
        - `tests/generate/route.ts` – RAG + Gemini test-case generation
        - `scripts/generate/route.ts` – RAG-aware Selenium script generator
        - `config/save/route.ts` – Saves per-user settings
        - `config/save/route.ts` – Saves per-user settings

  - `components/`
    - `app-provider.tsx` – Global app state (files, KB status, tests, scripts)
    - `dashboard-header.tsx`, `dashboard-sidebar.tsx`, `mode-toggle.tsx`, `theme-provider.tsx`
    - `ui/*` – Reusable UI primitives (button, card, input, tabs, etc.)

  - `lib/`
    - `prisma.ts` – Prisma client singleton
    - `supabase.ts` – Supabase client helper
    - `utils.ts` – Utility helpers

  - `prisma/`
    - `schema.prisma` – Prisma schema (User, File, Chunk, TestCase, Script, Settings, KnowledgeBaseStatus)

  - `.env.local` – Local environment config (not committed)

  ---

  ## Environment Setup

  Create `.env.local` at the project root by copying `.env.example`.

  Minimum required variables:

  ```env
  DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
  NEXTAUTH_SECRET=a_generated_hex
  NODE_ENV=development
  ```

  Optional variables enable extra features:

  - Qdrant vector search: `QDRANT_URL`, optional `QDRANT_API_KEY`, optional `VECTOR_COLLECTION_NAME`
  - Embeddings: `OLLAMA_BASE_URL` (recommended) or `HF_API_KEY`
  - LLM generation: `GEMINI_API_KEY`
  - Supabase (planned): `SUPABASE_URL`, `SUPABASE_KEY`

  > **Note:** Never commit real secrets. `.env.local` is git-ignored.

  ---

  ## Installation & Scripts

  From the project root:

  ```bash
  pnpm install
  ```

  The `package.json` scripts:

  ```json
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build",
    "dev": "next dev",
    "lint": "eslint .",
    "start": "next start",
    "kb-worker": "ts-node --esm scripts/kb-worker.ts"
  }
  ```

  ### Generate Prisma Client

  ```bash
  pnpm prisma generate
  ```

  (Also runs automatically on install and before `build`.)

  ### Run DB migrations (once you have a real DB)

  ```bash
  pnpm prisma migrate dev --name init
  ```

  ### Development Server

  ```bash
  pnpm dev
  ```

  Then open `http://localhost:3000`.

  > If you see a `dev lock` error, ensure no other Next dev instance is running and delete `.next/dev/lock`.

  ### Production Build

  ```bash
  pnpm build
  pnpm start
  ```

  ### Lint

  ```bash
  pnpm lint
  ```

  ---

  ## Data Model (Prisma)

  `prisma/schema.prisma` defines the following:

  - `User` – Auth users (email, password hash, name)
  - `File` – Uploaded KB files (name, MIME type, size, Supabase key)
  - `Chunk` – Content chunks from files, with optional embedding bytes
  - `TestCase` – Generated test cases (feature, scenario, steps, expected result, type)
  - `Script` – Generated scripts linked to test cases
  - `Settings` – Per-user configuration (browser, timeout, theme, providers)
  - `KnowledgeBaseStatus` – Per-user KB build status and counters

  These are ready for use in real KB + test generation pipelines.

  ---

  ## Feature Walkthrough

  ### 1. Knowledge Base

  **UI:** `app/dashboard/knowledge-base/page.tsx`

  - Drag-and-drop or browse to upload `.md`, `.txt`, `.json`, `.pdf`, `.html` files.
  - Under the hood:
    - Uses `FormData` to POST to `/api/knowledge-base/upload`.
    - The API validates `multipart/form-data` and returns metadata for each file.
    - Files are stored in global state via `AppProvider`.
  - You can see:
    - A list of all uploaded files in the left column.
    - Click a file to **select** it; the preview panel on the right shows its metadata (name, size, type, upload time).
  - The **Build Knowledge Base** button:
    - Calls `POST /api/knowledge-base/build`.
    - Parses and chunks all uploaded documents, stores chunks in Postgres.
    - Optionally indexes vectors into Qdrant for semantic RAG retrieval.
    - Updates a visual progress bar + status indicator.

  - RAG retrieval:
    - `POST /api/knowledge-base/retrieve` returns top matching chunks.
    - Test generation uses this retrieved context when available.

  ### RAG / Vector DB (Optional)

  You can run Qdrant locally using Docker Compose:

  - `docker compose up -d`

  Then set these env vars:

  - `QDRANT_URL=http://127.0.0.1:6333`
  - `VECTOR_COLLECTION_NAME=astraqa_kb` (optional)

  You also need an embeddings provider:

  - **Ollama (recommended local):**
    - `OLLAMA_BASE_URL=http://127.0.0.1:11434`
    - `OLLAMA_EMBED_MODEL=nomic-embed-text` (optional)
  - **HuggingFace (hosted):**
    - `HF_API_KEY=...`
    - `HF_EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2` (optional)
  > **Planned:** Real KB ingestion (Supabase upload, parsing, chunking, embeddings, Chroma, worker-based builds).

  ### 2. Test Generator

  **UI:** `app/dashboard/test-generator/page.tsx`

  - You enter a natural language description of a flow or feature.
  - The page calls `POST /api/tests/generate` with `{ prompt }`.
  - The API returns KB-grounded `TestCase[]` objects (positive & negative cases) using RAG + Gemini.
  - These are stored in `AppProvider` and displayed in a list.
  ### 3. Script Generator

  **UI:** `app/dashboard/script-generator/page.tsx`

  - You select a test case from the list.
  - The page calls `POST /api/scripts/generate` with the selected test case.
  - The API returns a Selenium script string derived from the selected test case (and can include KB context).
  - The script is shown in a code block and stored in global state for reuse.

  > **Planned:** Support multiple languages/frameworks and persist scripts in the DB.

  ### 4. Settings

  **UI:** `app/dashboard/settings/page.tsx`

  - Lets you configure:
    - Preferred browser (e.g., Chrome/Firefox)
    - Default timeout
    - LLM provider and vector DB provider (UI selection; current generator routes use server env vars like `GEMINI_API_KEY`)
  - Posts to `POST /api/config/save`.
  - Persists user settings via Prisma (`UserSettings`).

  ---

  ## Authentication

  - Credentials-based auth using NextAuth (`app/api/auth/[...nextauth]/route.ts`).
  - `signup` (`app/api/auth/signup/route.ts`) creates a new user with a hashed password via Prisma.
  - `me` (`app/api/auth/me/route.ts`) returns the current user when a valid session exists.

  > **Note:** Dashboard routes are protected; login/signup UI uses NextAuth client flows.

  ---

  ## Knowledge Base Worker (planned)

  There is a script entry for:

  ```bash
  pnpm kb-worker
  ```

  This is designed to run `scripts/kb-worker.ts` (not fully implemented yet), which would:

  - Poll for `KnowledgeBaseJob`-style tasks.
  - Fetch files from Supabase Storage.
  - Parse, chunk, embed, and store results in the DB + vector store.

  ---

  ## Development Notes

  - This repo runs with **React 19 + Next 16** using Turbopack. Some third-party UI libraries may report peer dependency warnings for React 18; they still function but the warnings are normal given the newer React version.
  - If you see Turbopack font-related warnings for Geist during build, they are non-fatal; the app still builds and runs.
  - Prisma is pinned to `5.19.1` to avoid Prisma 7’s new datasource URL configuration complexity.

  ---

  ## Roadmap / TODOs

  - [ ] Implement real KB ingestion (Supabase upload, parsing, chunking, embeddings)
  - [ ] Integrate LLMs (Gemini / HF) for context-aware test & script generation
  - [ ] Persist tests, scripts, and settings via Prisma
  - [ ] Protect dashboard with auth and add full login/signup flows
  - [ ] Enhance dashboard stats + recent activity using actual DB data
  - [ ] Implement real file content preview in KB (for text/markdown/PDF via server or client parsing)

  ---

  ## Getting Help

  If you run into issues:

  1. Verify environment variables in `.env.local` (especially `DATABASE_URL`).
  2. Ensure Prisma client is generated: `pnpm prisma generate`.
  3. Run `pnpm build` and `pnpm lint` to catch compile/lint issues.
  4. Check the dev server logs from `pnpm dev` for runtime errors.

  You can open issues or PRs on the GitHub repo if you’re extending AstraQA further.
