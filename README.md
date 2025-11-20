# AstraQA Engine UI

This is a Next.js (App Router) frontend for the AstraQA Engine: a QA automation companion that builds a knowledge base from your docs, generates test cases, and produces Selenium Python scripts.

## High-level Features

- Landing page and marketing content
- Auth UI (login/signup) – backend not yet implemented
- Dashboard with stats and recent activity (currently mocked)
- Knowledge Base builder (file upload + "build" flow)
- Test Case generator (LLM-backed API placeholder)
- Selenium Script generator
- Settings for LLM/vector DB and Selenium defaults

## Implemented Backend APIs (Next.js Route Handlers)

All routes live under `app/api` and are currently stateless placeholders you can extend:

- `POST /api/knowledge-base/upload`
  - Expects `multipart/form-data` with one or more `files` fields.
  - Returns basic metadata for each file (id, name, size, type, uploadedAt).

- `POST /api/knowledge-base/build`
  - Simulates building the knowledge base (chunking, embeddings, vector store persistence).
  - Returns `{ status: "ready", message, completedAt }`.

- `POST /api/tests/generate`
  - Body: `{ "prompt": string }`.
  - Returns `{ testCases: TestCase[] }` matching the shape used in `components/app-provider.tsx`.
  - Currently returns deterministic sample cases; plug in your LLM + vector DB here.

- `POST /api/scripts/generate`
  - Body: `{ testCase: TestCase }`.
  - Returns `{ script: string }`, a Selenium Python test function derived from the test case.

- `POST /api/config/save`
  - Body: `{ llmProvider?, vectorDb?, defaultBrowser?, implicitWaitSeconds?, headless? }`.
  - Currently just echoes the payload back with `{ status: "ok" }`.

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
      - `auth/logout/route.ts` – Placeholder logout endpoint
      - `knowledge-base/upload/route.ts` – Uploads KB documents
      - `knowledge-base/build/route.ts` – Triggers KB build (stubbed success)
      - `tests/generate/route.ts` – Generates sample test cases
      - `scripts/generate/route.ts` – Generates a sample Selenium-like script
      - `config/save/route.ts` – Saves settings payload (echoes back)

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

  Create `.env.local` at the project root (already present in this repo locally) with at least:

  ```env
  DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_KEY=eyJ...service_role...
  SUPABASE_BUCKET=kb-files
  HF_API_KEY=hf_xxx...
  GCP_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
  GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  GCP_PROJECT_ID=myproject-123
  NEXTAUTH_SECRET=a_generated_hex
  AUTH_SECRET=a_generated_hex2
  VECTOR_DB_PATH=./vector-db
  NODE_ENV=development
  ```

  For local development you mainly need a valid `DATABASE_URL`. The other keys are future-facing for full KB/LLM integration.

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
    - Currently implemented as a **stub** that returns `status: "ready"` and a message.
    - Updates a visual progress bar + status indicator.

  > **Planned:** Real KB ingestion (Supabase upload, parsing, chunking, embeddings, Chroma, worker-based builds).

  ### 2. Test Generator

  **UI:** `app/dashboard/test-generator/page.tsx`

  - You enter a natural language description of a flow or feature.
  - The page calls `POST /api/tests/generate` with `{ prompt }`.
  - The API returns sample `TestCase[]` objects (positive & negative cases).
  - These are stored in `AppProvider` and displayed in a list.

  > **Planned:** Use KB context + LLM to generate realistic, system-aware test cases.

  ### 3. Script Generator

  **UI:** `app/dashboard/script-generator/page.tsx`

  - You select a test case from the list.
  - The page calls `POST /api/scripts/generate` with the selected test case.
  - The API returns a sample Python Selenium script string.
  - The script is shown in a code block and stored in global state for reuse.

  > **Planned:** Support multiple languages/frameworks and persist scripts in the DB.

  ### 4. Settings

  **UI:** `app/dashboard/settings/page.tsx`

  - Lets you configure:
    - Preferred browser (e.g., Chrome/Firefox)
    - Default timeout
    - LLM provider and vector DB provider (placeholders)
  - Posts to `POST /api/config/save`.
  - Currently echoes the config back; DB persistence via the `Settings` model can be added easily.

  ---

  ## Authentication

  - Credentials-based auth using NextAuth (`app/api/auth/[...nextauth]/route.ts`).
  - `signup` (`app/api/auth/signup/route.ts`) creates a new user with a hashed password via Prisma.
  - `me` (`app/api/auth/me/route.ts`) returns the current user when a valid session exists.

  > **Next steps:**
  > - Wire the login/signup UI to these endpoints.
  > - Protect dashboard routes to require authentication.

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
