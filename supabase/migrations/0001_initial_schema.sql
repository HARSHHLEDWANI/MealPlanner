/*
  MealPlanner — consolidated initial schema.

  This replaces two conflicting migration sets that were never reconciled:
  frontend/supabase/migrations/ and backend/src/db/migrations/. They defined
  meal_plans two incompatible ways and defined the shopping list twice under
  two names. See ARCHITECTURE.md for the full history.

  Resolutions taken here:

  1. meal_plans is NORMALIZED — week_start_date plus child meal_plan_items
     rows, not a `days` JSONB blob keyed by `week_start`. The AI meal-plan
     generator already writes this shape, and it lets each meal carry a real
     foreign key to the recipe it uses.

  2. The shopping list is shopping_lists + shopping_list_items. The parallel
     `grocery_lists` table (JSONB items) is gone; it was a second attempt at
     the same feature reached by a different code path.

  3. recipes carries the columns the application actually reads — servings,
     difficulty, cuisine_type, dietary_tags, calories_per_serving — rather
     than the old serving_size/tags pair that matched neither consumer.
     `ingredients` and `instructions` are text[] of free-text lines; the old
     table stored ingredient OBJECTS in JSONB for seeded rows while generated
     rows wrote plain strings, so the same column held two shapes.

  Row-level security is enabled on every table with per-owner policies. The
  API connects with the service-role key and is exempt from these, so they are
  defence in depth behind the backend's own authorization — not the only
  control. They do fully govern any direct client access with the anon key.
*/

-- gen_random_uuid() lives here on older Postgres versions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Trigram index support, required by the recipe title search index below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- users

-- Mirrors auth.users so application tables can carry real foreign keys.
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT UNIQUE,
  phone       TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- recipes

CREATE TABLE IF NOT EXISTS recipes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  ingredients           TEXT[] NOT NULL DEFAULT '{}',
  instructions          TEXT[] NOT NULL DEFAULT '{}',
  prep_time             INTEGER NOT NULL DEFAULT 0 CHECK (prep_time >= 0),
  cook_time             INTEGER NOT NULL DEFAULT 0 CHECK (cook_time >= 0),
  servings              INTEGER NOT NULL DEFAULT 2 CHECK (servings > 0),
  difficulty            TEXT NOT NULL DEFAULT 'Medium'
                          CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  cuisine_type          TEXT NOT NULL DEFAULT 'General',
  dietary_tags          TEXT[] NOT NULL DEFAULT '{}',
  image_url             TEXT,
  calories_per_serving  INTEGER CHECK (calories_per_serving IS NULL OR calories_per_serving >= 0),

  -- Distinguishes seeded library recipes (read-only for everyone) from
  -- user-generated ones, which their creator may overwrite.
  user_generated        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Populated by an AI enhancement pass.
  cooking_tips          TEXT[] NOT NULL DEFAULT '{}',
  serving_suggestions   TEXT[] NOT NULL DEFAULT '{}',
  storage_instructions  TEXT,
  enhanced_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A user-generated recipe must record who made it, so ownership checks on
  -- enhancement cannot silently fall through to "no owner".
  CONSTRAINT recipes_generated_have_author
    CHECK (NOT user_generated OR created_by IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_recipes_created_by  ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at  ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine     ON recipes(cuisine_type);
-- Supports the ILIKE '%term%' title search, which a btree index cannot serve.
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm  ON recipes USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------- saved_recipes

CREATE TABLE IF NOT EXISTS saved_recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Named so the API's upsert can target it and make saving idempotent.
  CONSTRAINT saved_recipes_user_recipe_key UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);

-- ---------------------------------------------------------------- user_preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One row per user; the API upserts on this column.
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dietary_restrictions  TEXT[] NOT NULL DEFAULT '{}',
  allergies             TEXT[] NOT NULL DEFAULT '{}',
  preferred_cuisines    TEXT[] NOT NULL DEFAULT '{}',
  cooking_skill_level   TEXT NOT NULL DEFAULT 'Intermediate'
                          CHECK (cooking_skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
  serving_size          INTEGER NOT NULL DEFAULT 2 CHECK (serving_size > 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- meal_plans

CREATE TABLE IF NOT EXISTS meal_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date  DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One plan per user per week; regenerating replaces rather than duplicates.
  CONSTRAINT meal_plans_user_week_key UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_week ON meal_plans(user_id, week_start_date);

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id  UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  -- RESTRICT, not CASCADE: deleting a recipe must not silently punch a hole in
  -- a saved plan.
  recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings      INTEGER NOT NULL DEFAULT 1 CHECK (servings > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);

-- ---------------------------------------------------------------- shopping_lists

CREATE TABLE IF NOT EXISTS shopping_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id  UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id  UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient        TEXT NOT NULL,
  quantity          NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit              TEXT NOT NULL DEFAULT 'unit',
  category          TEXT NOT NULL DEFAULT 'Other'
                      CHECK (category IN ('Produce', 'Meat', 'Dairy', 'Pantry', 'Frozen', 'Other')),
  is_checked        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);

-- ---------------------------------------------------------------- triggers

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS recipes_set_updated_at ON recipes;
CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS meal_plans_set_updated_at ON meal_plans;
CREATE TRIGGER meal_plans_set_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS shopping_lists_set_updated_at ON shopping_lists;
CREATE TRIGGER shopping_lists_set_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Mirror new auth.users rows into the application users table.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, phone)
  VALUES (NEW.id, NEW.email, NEW.phone)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------- row-level security

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- users: own row only
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- recipes: a shared library. Readable by any signed-in user; a user may only
-- create rows attributed to themselves and modify their own.
DROP POLICY IF EXISTS recipes_select_all ON recipes;
CREATE POLICY recipes_select_all ON recipes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS recipes_insert_own ON recipes;
CREATE POLICY recipes_insert_own ON recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS recipes_update_own ON recipes;
CREATE POLICY recipes_update_own ON recipes
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS recipes_delete_own ON recipes;
CREATE POLICY recipes_delete_own ON recipes
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- saved_recipes
DROP POLICY IF EXISTS saved_recipes_own ON saved_recipes;
CREATE POLICY saved_recipes_own ON saved_recipes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_preferences
DROP POLICY IF EXISTS user_preferences_own ON user_preferences;
CREATE POLICY user_preferences_own ON user_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- meal_plans
DROP POLICY IF EXISTS meal_plans_own ON meal_plans;
CREATE POLICY meal_plans_own ON meal_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- meal_plan_items: ownership is transitive through the parent plan.
DROP POLICY IF EXISTS meal_plan_items_own ON meal_plan_items;
CREATE POLICY meal_plan_items_own ON meal_plan_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_plan_items.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_plan_items.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ));

-- shopping_lists
DROP POLICY IF EXISTS shopping_lists_own ON shopping_lists;
CREATE POLICY shopping_lists_own ON shopping_lists
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shopping_list_items: transitive through the parent list.
DROP POLICY IF EXISTS shopping_list_items_own ON shopping_list_items;
CREATE POLICY shopping_list_items_own ON shopping_list_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
  ));
