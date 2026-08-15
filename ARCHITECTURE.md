# Architecture

Technical reference for Pantry Chef. Companion to [README.md](README.md), which covers the product and local setup.

---

## Contents

- [System shape](#system-shape)
- [Authentication](#authentication)
- [API reference](#api-reference)
- [Database schema](#database-schema)
- [Gemini integration](#gemini-integration)
- [AI cost controls](#ai-cost-controls)
- [Frontend architecture](#frontend-architecture)
- [Testing](#testing)
- [Third-party dependencies](#third-party-dependencies)
- [Environment variables](#environment-variables)

---

## System shape

```
Browser (React SPA)
   │
   ├── Supabase Auth ────────────► Supabase (hosted)
   │   OTP sign-in only                │
   │   session in localStorage         │
   │                                   │
   └── axios, Bearer token ──► Express API
             │                         │
             │      service-role key   │
             │      (bypasses RLS)     ▼
             │                  Supabase Postgres
             │                         ▲
             └──────────────► Google Gemini
                              (server-side only)
```

The browser uses Supabase directly for **authentication only**. Every data read and write goes through the Express API, and Gemini is only ever called server-side, so the model API key never reaches a browser.

### Where authorization lives

The API connects with the Supabase **service-role key**, which is exempt from row-level security. That makes the API the single enforcement point for authorization — RLS cannot save it. Two rules follow, and the test suite asserts both:

1. **The acting user comes from the verified token, never from the request.** No route accepts a `user_id` in a path or body as an identity claim.
2. **Routes addressed by resource ID verify ownership before touching the row**, via the helpers in [`lib/ownership.ts`](backend/src/lib/ownership.ts). A resource owned by someone else reports **404, not 403** — confirming that an ID exists is itself a disclosure.

The RLS policies in the migration are still per-owner and still enabled. They fully govern any direct client access with the anon key, and stand as defence in depth behind the API.

---

## Authentication

Supabase email OTP, implemented in [`authStore.ts`](frontend/src/store/authStore.ts), [`ProtectedRoute.tsx`](frontend/src/components/auth/ProtectedRoute.tsx) and [`middleware/auth.ts`](backend/src/middleware/auth.ts).

1. The user enters an email. The frontend calls `supabase.auth.signInWithOtp`, and Supabase emails a link pointing at `/auth/callback`.
2. `AuthCallback` waits for the client to exchange the link for a session, refreshes the auth store, then routes to `/dashboard`. An expired or reused link is reported as such rather than silently bouncing to `/login`.
3. `ProtectedRoute` renders a loading state while `authState` is `LOADING`, redirects when `UNAUTHENTICATED`, and renders the app otherwise. Handling `LOADING` explicitly matters: falling through would mount pages that fetch before a session exists, so every initial request would go out unauthenticated.
4. The axios request interceptor in [`lib/api.ts`](frontend/src/lib/api.ts) attaches the access token to every API call, via `getSession()` so an expired token refreshes transparently.
5. `requireAuth` verifies the token with `supabase.auth.getUser(token)` and attaches `{ userId, email }` to `req.auth`.

**Why `getUser()` rather than local JWT verification.** It costs a round trip per request, but it honours revoked sessions and signed-out users immediately — a locally verified JWT stays "valid" until it expires. It also avoids holding another secret.

`requireAuth` is mounted on the `/api` prefix rather than per route, so a new route file cannot ship unauthenticated by omission: it has to be added *above* that line to be public, which is a visible change in review.

A 401 response causes the frontend to clear its session, so an expired token returns the user to sign-in instead of looping on requests that will keep failing.

---

## API reference

Base URL `http://localhost:5001`. All responses are JSON.

**Every `/api` route requires `Authorization: Bearer <supabase access token>`.** Only `GET /health` and `GET /` are public.

Errors use one envelope:

```json
{ "error": { "code": "BAD_REQUEST", "message": "Request validation failed",
             "details": [{ "path": "query", "message": "cannot be empty" }] } }
```

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, malformed, or invalid token |
| `FORBIDDEN` | 403 | Authenticated, but acting for another user |
| `NOT_FOUND` | 404 | No such resource, or not the caller's |
| `BAD_REQUEST` | 400 | Validation failed; `details` lists the fields |
| `MALFORMED_JSON` | 400 | Body is not parseable JSON |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 10MB |
| `RATE_LIMITED` | 429 | Too many requests; clears in minutes |
| `AI_RATE_LIMITED` | 429 | Too many AI requests; clears in minutes |
| `QUOTA_EXCEEDED` | 429 | Daily AI allowance spent; resets tomorrow |
| `UPSTREAM_FAILURE` | 502 | The model returned something unusable |
| `INTERNAL_ERROR` | 500 | Anything else; details are logged, never returned |

The distinction between `RATE_LIMITED` and `QUOTA_EXCEEDED` is deliberate: same status, different remedy, and the interface tells the user which.

### Recipes — `/api/recipes`

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/` | `?limit=50&offset=0&search=` | `Recipe[]`, paginated |
| GET | `/saved` | — | `Recipe[]` the caller has saved |
| GET | `/:id` | — | `Recipe`, or 404 |
| POST | `/search` | `{ query }` | `Recipe[]` — case-insensitive title match |
| POST | `/save/:id` | — | `{ message }` — idempotent |
| DELETE | `/save/:id` | — | `{ message }` |

Recipes are a shared library: any signed-in user can read any recipe. `/saved` is declared before `/:id` so the literal path wins.

### User preferences — `/api/preferences`

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/` | — | The caller's preferences, or defaults if unset |
| PUT | `/` | `Partial<UserPreferences>` | The upserted row |

No `:user_id` segment — preferences always belong to the token holder. `GET` returns defaults rather than 404, so a new user's first AI request is not an error path.

Preferences drive every AI prompt; allergies and dietary restrictions become hard constraints.

### Meal plans — `/api/meal-plans`

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/current` | — | Current or next upcoming plan, with meals and their recipes |
| POST | `/` | `{ week_start_date, meals[] }` | Created plan (201) |
| PUT | `/:id` | `{ meals[] }` | Updated plan — replaces all items |
| DELETE | `/:id` | — | `{ message }` |

`PUT` and `DELETE` verify ownership first. Creation rolls back the plan by hand if its items fail to insert, leaving no empty plan behind.

### Shopping lists — `/api/shopping-lists`

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/` | — | The caller's lists with items |
| POST | `/` | `{ name, meal_plan_id?, items[] }` | Created list (201) |
| PUT | `/:id` | `{ name?, items[] }` | Updated list |
| DELETE | `/:id` | — | `{ message }` |
| PUT | `/:list_id/items/:item_id` | `{ is_checked }` | The updated item |
| POST | `/generate/:meal_plan_id` | — | List built from the plan (201) |

`POST /generate/:meal_plan_id` parses each ingredient line into quantity, unit and name, then sums per name-and-unit pair, so `"2 cups flour"` and `"1 cup flour"` merge into 3 cups while `"1 clove garlic"` and `"1 tsp garlic"` stay separate. Items are bucketed into supermarket aisles by keyword. Unparseable lines degrade to quantity 1 with the text intact.

Passing a `meal_plan_id` you do not own is rejected.

### AI — `/api/ai`

Every route except `/usage` spends a metered Gemini call and consumes quota.

| Method | Path | Body | Cost | Returns |
|---|---|---|---|---|
| GET | `/usage` | — | 0 | `{ used, quota, remaining, allowed }` |
| POST | `/recipe/generate` | `{ query, cuisine? }` | 1 | The generated `Recipe`, saved (201) |
| POST | `/meal-plan/generate` | `{ week_start_date }` | 5 | Full plan with meals and recipes (201) |
| POST | `/recipe/enhance/:recipe_id` | — | 1 | The enhanced `Recipe` |
| POST | `/ingredients/substitute` | `{ ingredient, reason? }` | 1 | `{ substitutions: [...] }` |

Enhancing a recipe you own overwrites it. Enhancing a library recipe, or someone else's, saves an enhanced **copy** owned by you rather than mutating shared content.

`/meal-plan/generate` is the heaviest operation: one model call producing 21 meals, then a single batched insert of the unique recipes, then the plan and its items. Failures roll back what was written.

### Images — `/api/images`

| Method | Path | Body | Cost | Returns |
|---|---|---|---|---|
| POST | `/analyze` | `{ image }` — base64 data URL | 2 | `{ ingredients: DetectedIngredient[] }` |

Accepts JPEG, PNG, WebP and HEIC up to roughly 6MB. Results are normalized and capped at 30 items; entries the model returns malformed are dropped rather than trusted.

### Health

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | `{ status: 'ok' }` — Render's probe target |
| GET | `/` | Content-negotiated: an HTML landing page, or a JSON endpoint index |

---

## Database schema

One migration history at [`supabase/migrations/`](supabase/migrations/). It replaced two conflicting sets that had never been reconciled — one written for the API, one for code that queried Supabase directly from the browser. See [the resolution notes](#schema-history) below.

### Tables

**`users`** — mirrors `auth.users` so application tables can carry real foreign keys. Populated by an `on_auth_user_created` trigger.

**`recipes`** — the shared library.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `title`, `description` | TEXT | |
| `ingredients`, `instructions` | TEXT[] | Free-text lines, e.g. `"2 tbsp olive oil"` |
| `prep_time`, `cook_time` | INTEGER | Minutes |
| `servings` | INTEGER | |
| `difficulty` | TEXT | `Easy` / `Medium` / `Hard` |
| `cuisine_type` | TEXT | |
| `dietary_tags` | TEXT[] | |
| `image_url`, `calories_per_serving` | | Optional |
| `user_generated` | BOOLEAN | `false` marks read-only library recipes |
| `created_by` | UUID | Enforced non-null when `user_generated` |
| `cooking_tips`, `serving_suggestions`, `storage_instructions`, `enhanced_at` | | From an AI enhancement pass |

A trigram index on `title` supports the `ILIKE '%term%'` search, which a btree index cannot serve.

**`saved_recipes`** — `(user_id, recipe_id)` unique, named so the API's upsert makes saving idempotent.

**`user_preferences`** — one row per user (`user_id` unique). Dietary restrictions, allergies, preferred cuisines, skill level, serving size.

**`meal_plans`** — `(user_id, week_start_date)` unique, so regenerating a week replaces rather than duplicates.

**`meal_plan_items`** — `meal_plan_id`, `recipe_id`, `day_of_week` (0 = Sunday), `meal_type`, `servings`. The recipe foreign key is `ON DELETE RESTRICT`: deleting a recipe must not silently punch a hole in a saved plan.

**`shopping_lists` / `shopping_list_items`** — normalized, with `quantity`, `unit`, `category` and `is_checked` per item.

**`ai_usage` / `ai_response_cache`** — see [AI cost controls](#ai-cost-controls).

Row-level security is enabled on every table with per-owner policies. Recipes are readable by any authenticated user but writable only by their creator.

### Schema history

Three conflicts were resolved when the two migration sets were merged:

1. **`meal_plans` was defined twice.** One version stored a week as a `days` JSONB blob keyed by `week_start`; the other normalized into `week_start_date` plus child rows. The normalized shape won — the AI generator already wrote it, and it lets each meal carry a real foreign key to its recipe.
2. **The shopping list existed twice**, as `grocery_lists` (JSONB items) and `shopping_lists` + `shopping_list_items`. The normalized pair won; `grocery_lists` is gone.
3. **`recipes` matched neither consumer.** It had `serving_size` and `tags` where the code read `servings`, `difficulty`, `cuisine_type` and `dietary_tags`; and its `ingredients` column held JSONB *objects* for seeded rows while generated rows wrote plain strings. It is now `TEXT[]` throughout, and the seed data was converted.

> Postgres block comments **nest**, unlike C. A literal `/*` inside a comment in a migration opens a nested comment and breaks the file — this has happened once already. CI parses every migration to catch it.

---

## Gemini integration

All model access is server-side: [`lib/gemini.ts`](backend/src/lib/gemini.ts), [`services/aiService.ts`](backend/src/services/aiService.ts), [`services/visionService.ts`](backend/src/services/visionService.ts).

### Configuration

```ts
model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
generationConfig: {
  temperature: 0.7,     // varied recipes, stable enough for JSON
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192 // a 21-meal plan is large
}
```

`gemini-1.5-flash` is chosen for latency and cost; the model is overridable by env var without a code change.

### Prompt design

Five prompts share a deliberate structure:

1. **Role assignment** — "You are a professional chef" / "a meal planning assistant" / "a food identification assistant".
2. **Constraints as hard requirements.** Allergies are rendered in caps as absolute prohibitions (`ABSOLUTELY NO ingredients containing: peanuts`), not preferences. Restrictions, skill level, serving size and preferred cuisines are injected from `user_preferences`.
3. **An exact JSON skeleton to fill**, with `Return ONLY valid JSON (no markdown, no explanations)` and interpolated defaults so the model copies correct values rather than inventing them.
4. **Explicit output counts** where they matter — the planner closes with "Generate 21 meals total" and defines the `day_of_week` encoding.
5. **For vision, an instruction not to guess.** The model is told to report only what it can see, to skip cookware and packaging, to return an empty array rather than pad, and to mark its confidence. A hallucinated ingredient reaching a shopping list is worse than a short list.

### JSON extraction

Models drift on output formatting regardless of instructions, so extraction tries three strategies in order:

```ts
1. /```(?:json)?\s*(\{[\s\S]*\})\s*```/   // fenced code block
2. /\{[\s\S]*\}/                           // first bare {...} in prose
3. JSON.parse(text)                        // clean response
```

Every field is then read with a fallback, so a partial response degrades instead of writing `undefined` columns. Generated recipes get a temporary ID that is mapped to the real database UUID after insert.

Two older endpoints that called `JSON.parse()` on raw model output — and so failed whenever Gemini wrapped its answer in a code fence — were removed; `/api/ai/*` covers both properly.

---

## AI cost controls

Two independent mechanisms, solving different problems.

### Rate limiting — abuse

[`middleware/rateLimit.ts`](backend/src/middleware/rateLimit.ts). A global ceiling of 300 requests per 15 minutes, plus stacked per-user and per-IP limits on model routes. The per-user key falls back through `ipKeyGenerator`, which normalizes IPv6 to its /64 prefix — keying on a raw IPv6 address would let a client hop within its own allocation to reset the limit.

### Quota — spend

[`services/usageService.ts`](backend/src/services/usageService.ts) and [`middleware/quota.ts`](backend/src/middleware/quota.ts).

- **Atomic.** `consume_ai_quota()` checks the limit and increments inside one locked statement. Reading the count in the API and then incrementing would let concurrent requests all observe the same under-limit value and proceed together, overshooting a cap that costs money.
- **Weighted.** A meal plan costs 5, image analysis 2, everything else 1 — a plan is one request but 21 recipes at up to 8k tokens.
- **Reserved before the call**, because Gemini bills for attempts. Failures that never reach the model refund the reservation, including partially reserved weighted operations.
- **Ordered after validation**, so a malformed request cannot burn someone's allowance.

### Caching

`ai_response_cache` holds responses for 15 minutes, keyed by a SHA-256 hash of the operation, the user, the normalized inputs, **and their dietary preferences**.

Preferences are in the key for a safety reason, not an efficiency one: the prompts embed allergies, so a cache shared across users — or one that ignored a preference change — could serve someone a recipe containing an allergen they had since declared. A cache hit refunds the quota reservation, since no model call occurred.

Applied to recipe generation and substitutions. Meal plans are deliberately **not** cached: regenerating is meant to produce something different.

---

## Frontend architecture

### Routing

[`App.tsx`](frontend/src/App.tsx) — `AuthLayout` wraps `/login` and `/auth/callback`; `ProtectedRoute` → `MainLayout` wraps everything else.

### State — Zustand

- `authStore` — session and `authState`.
- `recipeStore` — library, search, generation, save/unsave. Search and generation are separate operations; search never spends a model call.
- `mealPlanStore`, `groceryListStore` — both talk to the API. They previously wrote to Supabase directly from the browser, which bypassed authentication, validation and rate limiting entirely.
- `usageStore` — daily AI allowance, shared by every screen with a generate button.

Optimistic updates (saving a recipe, ticking a checkbox) roll back on failure, so the interface never claims a change the server rejected.

### Types

One canonical module, [`src/types/index.ts`](frontend/src/types/index.ts), in **snake_case** matching the API responses and Postgres columns — so there is no mapping layer to keep in sync.

There were previously two competing `Recipe` definitions, `src/types.ts` and `src/types/index.ts`. Node resolves `../types` to the file over the directory, so the former silently won every import while much of the code was written against the latter. That single collision caused roughly half the frontend's build errors.

### HTTP

One axios instance, [`lib/api.ts`](frontend/src/lib/api.ts): base URL from `VITE_API_URL`, a request interceptor attaching the Supabase token, and a response interceptor normalizing failures into a typed `ApiError` carrying `status`, `code` and `message`. Callers branch on `code` rather than matching strings.

### Design system

[`src/components/ui/`](frontend/src/components/ui/) — `Button`, `Card`, `Input`, `Badge`, `Spinner`, `SkeletonGrid`, `EmptyState`, `ErrorState`, `ErrorBanner`, `PageHeader`. Dependency-free: no clsx, cva or Radix for a surface this small.

Every data view distinguishes **loading**, **empty** and **error**; previously a failed fetch and an empty result both rendered as a blank screen.

Tailwind theme tokens live in [`tailwind.config.js`](frontend/tailwind.config.js). `index.css` holds document-level styling only — the `.btn`/`.card`/`.input` classes it used to define were a second, competing design system drifting against the components.

Verified at 390px and 1280px across all routes: no page-level horizontal overflow. The meal-plan grid scrolls inside its own container rather than reflowing, because a week compressed to a phone width is unreadable and the day columns need to stay aligned.

---

## Testing

87 tests. `npm test` in either app; CI runs both plus lint, typecheck and build.

**Backend (60)** — supertest against the real middleware stack, with Supabase and Gemini mocked. `createApp()` is separated from `index.ts` so importing the app does not start a server.

`auth.test.ts` asserts 401 on **every one of the 24 protected routes**, not a sample — a lapse here is a data breach, not a bug. It also covers malformed headers, forged tokens, that identity comes from the token and not the body, and that a Supabase outage does not leak connection details.

`controllers.test.ts` covers happy paths, ownership boundaries, validation, quota exhaustion, and that raw database and model errors never reach the client.

**Frontend (27)** — store behaviour and the AI flow as a user encounters it: generating is separate from searching, a spent quota explains itself rather than erroring, optimistic updates roll back.

Both suites were checked against deliberate regressions rather than assumed meaningful. Removing the auth gate fails 34 backend tests; routing search back through the AI endpoint fails 2 frontend tests.

**CI** also parses every migration with `pglast`. Migrations are applied by hand against a live project, so nothing else would catch a syntax error before a deploy.

---

## Third-party dependencies

### Backend

| Package | Why |
|---|---|
| `express` | HTTP server and routing |
| `@supabase/supabase-js` | Postgres client and token verification |
| `@google/generative-ai` | Gemini SDK |
| `helmet` | Security headers |
| `cors` | Origin allowlist |
| `express-rate-limit` | Abuse limiting |
| `zod` | Request validation |
| `dotenv` | `.env` loading |
| `vitest`, `supertest` | Tests |
| `eslint`, `typescript-eslint` | Lint |
| `typescript`, `ts-node`, `nodemon` | Build and dev loop |

### Frontend

| Package | Why |
|---|---|
| `react`, `react-dom` | UI runtime |
| `react-router-dom` | Client routing |
| `zustand` | Global state — less boilerplate than Redux |
| `@supabase/supabase-js` | Auth |
| `axios` | HTTP client with interceptors |
| `framer-motion` | Entrance animations |
| `lucide-react` | Icons |
| `uuid` | Client-side IDs |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling |
| `vite`, `@vitejs/plugin-react` | Build and dev server |
| `vitest`, `jsdom`, `@testing-library/*` | Tests |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks` | Lint |

Removed along the way: `openai` (unused, backend), `router` (never imported), `react-dropzone` (never used — upload is a plain file input), `@types/axios` (a deprecated stub; axios ships its own types), `web-vitals` and the Create React App leftovers from before the Vite migration. A stray root `package.json` and its committed `node_modules` — 1,669 of the repository's 1,755 tracked files — were removed from the working tree and from git history.

---

## Environment variables

### Backend (`backend/.env`) — all secret

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Bypasses row-level security.** Server-only |
| `GEMINI_API_KEY` | yes | Google AI Studio key. Metered and billable |
| `CORS_ALLOWED_ORIGINS` | yes in production | Comma-separated allowlist. Defaults to `http://localhost:3001` with a warning |
| `GEMINI_MODEL` | no | Defaults to `gemini-1.5-flash` |
| `PORT` | no | Defaults to `5001` |
| `AI_DAILY_QUOTA` | no | Per-user daily allowance. Defaults to 50 |
| `AI_CACHE_TTL_MINUTES` | no | Cache lifetime. Defaults to 15 |
| `TRUST_PROXY` | behind a proxy | Set `true` on Render/Railway/nginx, so rate limits key on the real client IP rather than the proxy's |

Both the Supabase and Gemini clients throw at startup when their variables are missing, so misconfiguration fails loudly rather than at first request.

### Frontend (`frontend/.env`) — public

Every `VITE_`-prefixed variable is **inlined into the JavaScript bundle** and readable by anyone who loads the site. Only publishable values belong here.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Anon key — safe to ship only because RLS constrains it |
| `VITE_API_URL` | yes | Express API base URL |

`VITE_API_URL` and the backend's `CORS_ALLOWED_ORIGINS` must agree across environments. A mismatch is the usual cause of requests that work locally and fail in production.

### Secret handling

`.env` is git-ignored at both the repo root and in `frontend/`, and `.env.example` files carry placeholders only.

> A previous revision committed `frontend/.env` containing a live Gemini key. The file has been removed from the working tree and purged from git history, and the key must be treated as compromised and regenerated — history rewriting does not un-publish a key that was pushed to a public repository.
