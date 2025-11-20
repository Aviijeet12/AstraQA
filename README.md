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
  - Calls `/api/knowledge-base/build` when you click **Build Knowledge Base** and updates `kbStatus`.

- `app/dashboard/test-generator/page.tsx`
  - Calls `/api/tests/generate` with the scenario prompt and fills the generated test cases list.

- `app/dashboard/script-generator/page.tsx`
  - Calls `/api/scripts/generate` with the selected test case and displays the returned Python script.

- `app/dashboard/settings/page.tsx`
  - Calls `/api/config/save` when you hit **Save Changes** to persist configuration (placeholder only).

## Running the App Locally

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000` in your browser.

## Next Steps (Things You Need to Do)

These are intentionally left for you because they depend on your infra and secrets:

1. **Authentication & User Management**
   - Implement `app/api/auth/*` route handlers (login, signup, logout, me).
   - Wire the existing `/login` and `/signup` pages to those APIs.

2. **Real Knowledge Base Storage**
   - Replace the in-memory placeholders in `app/api/knowledge-base/*/route.ts` with:
     - File storage (local disk, S3, etc.).
     - Chunking + embeddings (OpenAI, Azure OpenAI, local model, etc.).
     - A real vector store (FAISS, Qdrant, Pinecone, Chroma, etc.).
   - Add a small persistence layer (Prisma + Postgres, or another DB) if you want per-user docs.

3. **LLM-backed Test Generation**
   - In `app/api/tests/generate/route.ts`, call your chosen LLM with:
     - The user prompt.
     - Retrieved KB context from the vector DB.
   - Parse the LLM response into the `TestCase` structure used by the UI.

4. **Smarter Script Generation**
   - In `app/api/scripts/generate/route.ts`, call an LLM or custom engine to:
     - Map steps to real page objects / locators.
     - Use settings from `/api/config` (browser, headless, timeouts).

5. **Persist Settings Per User**
   - Implement `GET /api/config` and back both `GET` and `POST` with a database table keyed by user.

6. **Dashboard Metrics & Recent Activity**
   - Replace mocked numbers in `app/dashboard/page.tsx` with data from new routes, e.g.:
     - `GET /api/dashboard/summary`
     - `GET /api/tests/recent`
     - `GET /api/scripts/recent`

Once these pieces are in place, the UI should function as a full QA assistant front-end backed by your own infra and models.
