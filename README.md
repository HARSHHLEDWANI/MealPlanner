# Pantry Chef

A web app for figuring out what to cook. Describe what you're in the mood for — or photograph what's in your fridge — and Google Gemini generates recipes, builds a week's meal plan around your dietary needs, and turns that plan into a shopping list.

Two applications sharing one Supabase Postgres database: a React single-page app (`frontend/`) and an Express REST API (`backend/`). Authentication is passwordless — Supabase emails you a sign-in link.

> The repository is named `MealPlanner`; the product is branded **Pantry Chef** throughout the interface.

---

## Features

| Feature | Route | Notes |
|---|---|---|
| **Email sign-in** | `/login` | Passwordless one-time link via Supabase |
| **Dashboard** | `/dashboard` | Saved recipes and quick access to everything else |
| **Recipe Finder** | `/recipe-finder` | Search the library, or generate a new recipe with AI — two separate, explicit actions |
| **Recipe Details** | `/recipe/:id` | Full recipe, plus an AI "enhance" pass adding technique, tips and storage notes |
| **Snap & Cook** | `/image-recognition` | Photograph ingredients; Gemini vision identifies them |
| **Meal Planner** | `/meal-planner` | Generate a 7-day, 21-meal plan honoring allergies and dietary restrictions |
| **Grocery List** | `/grocery-list` | Aggregates a meal plan's ingredients, parsed and summed, grouped by aisle |
| **Leftover Magic** | `/leftover-magic` | Find recipes from ingredients you already have |

Every AI feature counts against a configurable daily per-user quota, shown in the interface before you hit it. Searching the recipe library is free and never spends a generation.

### Limitations worth knowing

- **Sign-in is email only.** There is no phone/SMS option.
- **Ingredient parsing is deliberately simple.** The grocery list understands `"2 tbsp olive oil"` and `"1/2 cup flour"`, but degrades to a quantity of 1 for phrasings like `"a pinch of salt"`. The text is preserved, so the list stays usable.
- **Image recognition reports uncertainty.** The model is instructed to list only what it can actually see rather than guessing; items it is unsure about are marked, so check them before building a list.
- **Meal plans are not transactional.** Generation writes recipes, then the plan, then its items. A failure partway through rolls back by hand rather than in a database transaction, since Supabase's REST client has no transaction support.

---

## Tech stack

**Frontend** — Vite 5, React 18, TypeScript, Tailwind CSS, Zustand, React Router 6, Framer Motion, lucide-react, axios, `@supabase/supabase-js`.

**Backend** — Node 20, Express 4, TypeScript, `@supabase/supabase-js`, `@google/generative-ai` (Gemini `gemini-1.5-flash`), helmet, express-rate-limit, zod.

**Data & auth** — Supabase: Postgres for storage, Supabase Auth for email OTP.

**Testing** — Vitest on both sides, supertest for API integration, Testing Library for components. ESLint on both. GitHub Actions for CI.

Per-dependency rationale is in [ARCHITECTURE.md](ARCHITECTURE.md#third-party-dependencies).

---

## Running it locally

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key

### 1. Database

Apply the migrations in order, via the Supabase SQL editor or the Supabase CLI:

```
supabase/migrations/0001_initial_schema.sql        tables, indexes, triggers, RLS
supabase/migrations/0002_seed_library_recipes.sql  eight sample recipes
supabase/migrations/0003_ai_usage_and_cache.sql    usage quotas and response cache
```

All three are idempotent — re-running them is safe.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in real values
npm run dev               # http://localhost:5001
```

```env
PORT=5001
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
GEMINI_API_KEY=<your Gemini key>
CORS_ALLOWED_ORIGINS=http://localhost:3001
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. Never expose it to a browser or commit it.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # fill in real values
npm run dev               # http://localhost:3001
```

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon/public key>
VITE_API_URL=http://localhost:5001
```

Anything prefixed `VITE_` is compiled into the public bundle. Only publishable values belong there.

Sign in at `http://localhost:3001/login`. Supabase emails a link; opening it returns you to the app signed in.

### Commands

Both apps:

| Command | Does |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Typecheck and build |
| `npm test` | Run the test suite |
| `npm run lint` | ESLint |

Backend also has `npm run typecheck` (source and tests) and `npm start` (run the built output).

---

## Architecture in one paragraph

The browser talks to Supabase **only** for authentication. All data access goes through the Express API, which verifies the Supabase access token on every `/api` route and derives the acting user from that token — never from the URL or request body. The API holds the service-role key, so it is the sole enforcement point for authorization; row-level security is defence in depth behind it. Gemini is called exclusively server-side, so the API key never reaches a browser.

Full detail — every endpoint, the schema, the prompt design — is in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Deployment

Frontend to Vercel, API to Render. Configuration is committed: [`frontend/vercel.json`](frontend/vercel.json) and [`render.yaml`](render.yaml).

**Vercel** — import the repo, set **Root Directory** to `frontend`. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` (pointing at the deployed Render URL).

**Render** — the blueprint builds from `backend/`. Set the secrets it marks `sync: false` in the dashboard: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `CORS_ALLOWED_ORIGINS` (your Vercel URL).

The two must agree: `VITE_API_URL` points at Render, and `CORS_ALLOWED_ORIGINS` names the Vercel origin. A mismatch is the usual cause of requests that work locally and fail in production.

See [ARCHITECTURE.md](ARCHITECTURE.md#environment-variables) for the full variable reference.

---

## Repository layout

```
backend/
  src/
    routes/         URL shapes; each route composes validation, quota, handler
    controllers/    request handling and Supabase queries
    services/       aiService (prompts), visionService, usageService
    middleware/     auth, validate, quota, rateLimit, errorHandler
    lib/            configured clients, errors, CORS, ownership checks
    schemas/        zod schemas for every route
    __tests__/
  app.ts            builds the Express app (no listen — see index.ts)
frontend/
  src/
    pages/          one component per route
    components/     ui/ (design system), recipes/, layout/, auth/, ai/
    store/          Zustand stores
    lib/            api.ts (axios), supabase.ts
    __tests__/
supabase/migrations/   the single source of truth for the schema
.github/workflows/     CI
```

---

## Status

Both apps build clean, 86 tests pass, CI runs lint, typecheck, test and build on every push, and the migrations are validated as parseable Postgres.

What has not been exercised end to end: the app has not yet been run against a live Supabase project with these migrations applied, so the quota-consumption path and the meal-plan write sequence are covered by tests with mocked database responses rather than by a real round trip.
