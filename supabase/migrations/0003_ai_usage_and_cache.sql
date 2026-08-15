/*
  AI usage accounting and response caching.

  Phase 2 added rate limiting, which stops someone hammering the API. This is a
  different problem: every AI request spends real money on a metered Gemini
  call, so each user needs a bounded daily budget, and identical requests
  should not be paid for twice.

  (Note for future edits: Postgres block comments nest, so a literal slash-star
  sequence inside one opens a nested comment and breaks the file.)
*/

-- ---------------------------------------------------------------- ai_usage

-- Aggregated per user, per day, per operation rather than one row per call:
-- the quota only needs counts, and this keeps the table small enough that it
-- never needs pruning.
CREATE TABLE IF NOT EXISTS ai_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  operation   TEXT NOT NULL,
  calls       INTEGER NOT NULL DEFAULT 0 CHECK (calls >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_user_date_operation_key UNIQUE (user_id, usage_date, operation)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, usage_date);

/*
  Atomically checks a user's remaining quota and consumes one unit.

  Check and increment happen in a single statement deliberately. Reading the
  count in the API and then incrementing it would let several concurrent
  requests all observe the same under-limit value and proceed together,
  overshooting the cap — exactly the case a paid endpoint cannot afford.

  Quota is consumed before the model call rather than after, because Gemini
  bills for attempts. A request that reserves a unit and then fails has still
  cost money.
*/
CREATE OR REPLACE FUNCTION consume_ai_quota(
  p_user_id   UUID,
  p_operation TEXT,
  p_limit     INTEGER
)
RETURNS TABLE (allowed BOOLEAN, used INTEGER, quota INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_used INTEGER;
BEGIN
  -- Lock this user's rows for today so concurrent calls serialize here.
  SELECT COALESCE(SUM(u.calls), 0) INTO v_used
  FROM ai_usage u
  WHERE u.user_id = p_user_id AND u.usage_date = CURRENT_DATE
  FOR UPDATE;

  IF v_used >= p_limit THEN
    RETURN QUERY SELECT FALSE, v_used, p_limit;
    RETURN;
  END IF;

  INSERT INTO ai_usage (user_id, usage_date, operation, calls)
  VALUES (p_user_id, CURRENT_DATE, p_operation, 1)
  ON CONFLICT (user_id, usage_date, operation)
  DO UPDATE SET calls = ai_usage.calls + 1, updated_at = now();

  RETURN QUERY SELECT TRUE, v_used + 1, p_limit;
END;
$$;

/** Releases a reserved unit when a call fails before reaching the model. */
CREATE OR REPLACE FUNCTION refund_ai_quota(p_user_id UUID, p_operation TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ai_usage
  SET calls = GREATEST(calls - 1, 0), updated_at = now()
  WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE
    AND operation = p_operation;
END;
$$;

-- ---------------------------------------------------------------- ai_response_cache

/*
  Short-lived cache of model responses.

  Keyed per user because the prompts embed that user's dietary restrictions and
  allergies — sharing a cache entry across users could serve someone a recipe
  containing an allergen they declared. The key is a hash of the operation plus
  the normalized inputs plus those preferences.
*/
CREATE TABLE IF NOT EXISTS ai_response_cache (
  cache_key   TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation   TEXT NOT NULL,
  response    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_user    ON ai_response_cache(user_id);

/** Removes expired entries. Called opportunistically on cache writes. */
CREATE OR REPLACE FUNCTION purge_expired_ai_cache()
RETURNS VOID
LANGUAGE SQL
AS $$
  DELETE FROM ai_response_cache WHERE expires_at < now();
$$;

-- ---------------------------------------------------------------- row-level security

ALTER TABLE ai_usage          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Users may read their own usage so the UI can show remaining quota, but
-- never write it — that is the API's job with the service-role key. A client
-- able to edit this table could reset its own bill.
DROP POLICY IF EXISTS ai_usage_select_own ON ai_usage;
CREATE POLICY ai_usage_select_own ON ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- The cache is never client-readable: no policy grants access, so RLS denies
-- everything for the anon and authenticated roles by default.
