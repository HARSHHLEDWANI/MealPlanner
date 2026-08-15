# Testing the AI features by hand

How to exercise the AI endpoints against a running local stack. For the full endpoint reference see [ARCHITECTURE.md](ARCHITECTURE.md#api-reference); for setup see [README.md](README.md).

> Every endpoint below changed shape when authentication was added. The `{user_id}` path segments this guide used to describe are gone — the API derives the acting user from the bearer token, and a request without one is rejected.

---

## 1. Environment

**`backend/.env`**

```env
PORT=5001
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
GEMINI_API_KEY=<your Gemini key>
GEMINI_MODEL=gemini-1.5-flash
CORS_ALLOWED_ORIGINS=http://localhost:3001
AI_DAILY_QUOTA=50
```

**`frontend/.env`**

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_URL=http://localhost:5001
```

Apply all three migrations in `supabase/migrations/` before starting.

---

## 2. Start both apps

```bash
cd backend  && npm run dev    # http://localhost:5001
cd frontend && npm run dev    # http://localhost:3001
```

Confirm the API is up:

```bash
curl http://localhost:5001/health
# {"status":"ok"}
```

---

## 3. Get a token

Every `/api` route needs one. The quickest way is to sign in through the app at `http://localhost:3001/login`, then read the session from the browser console:

```js
// DevTools console, on the running app
const { data } = await window.supabase?.auth.getSession?.() ?? {};
// If that is not exposed, read it out of storage instead:
const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
JSON.parse(localStorage.getItem(key)).access_token;
```

Then:

```bash
export TOKEN='<paste the access token>'
export API=http://localhost:5001
```

Sanity check — this should return your saved recipes rather than a 401:

```bash
curl -s $API/api/recipes/saved -H "Authorization: Bearer $TOKEN"
```

Tokens are short-lived. A sudden run of 401s usually means it expired, not that something broke.

---

## 4. Check your quota first

AI calls are metered and capped per user per day. This endpoint is free:

```bash
curl -s $API/api/ai/usage -H "Authorization: Bearer $TOKEN"
# {"allowed":true,"used":0,"quota":50,"remaining":50}
```

Costs per call: recipe generation 1, enhancement 1, substitutions 1, image analysis 2, **meal plan 5**.

---

## 5. Set preferences

These become hard constraints in every prompt, so set them before testing generation — it is the most useful thing to verify.

```bash
curl -s -X PUT $API/api/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dietary_restrictions": ["vegetarian"],
    "allergies": ["peanuts", "shellfish"],
    "preferred_cuisines": ["Italian", "Thai"],
    "cooking_skill_level": "Intermediate",
    "serving_size": 2
  }'
```

---

## 6. Generate a recipe

```bash
curl -s -X POST $API/api/ai/recipe/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "a warming weeknight curry", "cuisine": "Thai"}'
```

**What to check**

- It honours the preferences above — vegetarian, no peanuts. Peanuts in a Thai curry is a good adversarial test.
- `ingredients` and `instructions` are arrays of strings.
- `created_by` is your user ID and `user_generated` is `true`.
- Repeating the identical request within 15 minutes returns the cached result and does **not** increase `used` — check `/api/ai/usage` before and after.

---

## 7. Generate a meal plan

The heaviest call — 21 meals in one request, and 5 against your quota. It can take 30 seconds or more.

```bash
curl -s -X POST $API/api/ai/meal-plan/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"week_start_date": "2026-08-16"}'
```

**What to check**

- 21 items across `day_of_week` 0–6 and three meal types.
- No repeated dishes, and every one respects the allergy list.
- Each item has a joined `recipe` object.
- Not cached, by design — regenerating should give you something different.

---

## 8. Enhance a recipe

```bash
curl -s -X POST $API/api/ai/recipe/enhance/<recipe-id> \
  -H "Authorization: Bearer $TOKEN"
```

Enhancing a recipe **you generated** overwrites it. Enhancing a seeded library recipe returns a **new copy** owned by you — the shared original is left alone. Worth testing both.

---

## 9. Ingredient substitutions

```bash
curl -s -X POST $API/api/ai/ingredients/substitute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ingredient": "butter", "reason": "making it dairy-free"}'
```

Cached for 15 minutes, so a repeat is free.

---

## 10. Image analysis

Easiest through the UI at `/image-recognition`. By curl:

```bash
IMG=$(base64 -w0 fridge.jpg)
curl -s -X POST $API/api/images/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"data:image/jpeg;base64,$IMG\"}"
```

**What to check**

- Only things actually in the photo. The prompt tells the model not to guess, so a photo of an empty counter should return an empty array rather than inventing produce.
- No cookware, packaging or surfaces.
- Items it is unsure about come back with `confidence` below `high`.

---

## Troubleshooting

**`401 UNAUTHORIZED`** — missing, malformed or expired token. Sign in again and re-copy it.

**`429 QUOTA_EXCEEDED`** — daily allowance spent; resets tomorrow. Raise `AI_DAILY_QUOTA` for testing.

**`429 RATE_LIMITED` / `AI_RATE_LIMITED`** — too fast, not too many. Wait a few minutes.

**`400 BAD_REQUEST`** — the `details` array names the offending field. Free-text prompts are capped at 500 characters.

**`502 UPSTREAM_FAILURE`** — the model returned something unparseable. Retry; the quota reservation is refunded automatically.

**`GEMINI_API_KEY is required` at startup** — the backend fails fast on missing configuration by design. Check `backend/.env`.

**CORS errors in the browser** — `CORS_ALLOWED_ORIGINS` must name the frontend's exact origin, including port and scheme.

---

## Automated tests

Manual checks complement the suite; they do not replace it.

```bash
cd backend  && npm test    # 60 tests: auth on all 24 routes, controllers, quota
cd frontend && npm test    # 27 tests: stores and the AI flow
```

Both run in CI on every push, alongside lint, typecheck, build, and a parse check of the migrations.
