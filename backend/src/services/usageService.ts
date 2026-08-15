import { createHash } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { UserPreferences } from '../types';

/**
 * Per-user AI cost controls: a daily quota, and a short-lived response cache.
 *
 * Distinct from the rate limiters in middleware/rateLimit.ts. Those stop abuse
 * (too many requests, too fast). This bounds spend (too many requests, per day)
 * and avoids paying twice for the same question.
 */

export type AIOperation =
  | 'recipe_generate'
  | 'meal_plan_generate'
  | 'recipe_enhance'
  | 'ingredient_substitute'
  | 'image_analyze';

/**
 * Operation weights.
 *
 * A meal plan is one HTTP request but 21 recipes at up to 8k output tokens —
 * charging it the same as a single substitution lookup would let a user run up
 * an order of magnitude more cost within the same nominal quota.
 */
const OPERATION_COST: Record<AIOperation, number> = {
  recipe_generate: 1,
  meal_plan_generate: 5,
  recipe_enhance: 1,
  ingredient_substitute: 1,
  image_analyze: 2,
};

export const DAILY_QUOTA = Number(process.env.AI_DAILY_QUOTA ?? 50);

/** How long a cached response stays valid. */
const CACHE_TTL_MINUTES = Number(process.env.AI_CACHE_TTL_MINUTES ?? 15);

export interface QuotaResult {
  allowed: boolean;
  used: number;
  quota: number;
  remaining: number;
}

class UsageService {
  /**
   * Reserves quota for one operation, atomically.
   *
   * Returns allowed:false rather than throwing so the caller can turn it into
   * a specific, user-facing error instead of a generic failure.
   */
  async consume(userId: string, operation: AIOperation): Promise<QuotaResult> {
    const cost = OPERATION_COST[operation] ?? 1;

    // The SQL function consumes one unit per call, so a weighted operation
    // calls it repeatedly. Slightly chatty, but it keeps the atomicity
    // guarantee in one place rather than duplicating the locking logic.
    let last: QuotaResult | null = null;

    for (let i = 0; i < cost; i += 1) {
      const { data, error } = await supabase.rpc('consume_ai_quota', {
        p_user_id: userId,
        p_operation: operation,
        p_limit: DAILY_QUOTA,
      });

      if (error) {
        console.error('Quota check failed', error);
        // Fail open: a usage-tracking outage should not take down the feature.
        // The IP and per-user rate limiters still bound the damage.
        return { allowed: true, used: 0, quota: DAILY_QUOTA, remaining: DAILY_QUOTA };
      }

      const row = Array.isArray(data) ? data[0] : data;
      last = {
        allowed: Boolean(row?.allowed),
        used: Number(row?.used ?? 0),
        quota: Number(row?.quota ?? DAILY_QUOTA),
        remaining: Math.max(0, Number(row?.quota ?? DAILY_QUOTA) - Number(row?.used ?? 0)),
      };

      if (!last.allowed) {
        // Give back whatever units this operation already took, so a partially
        // reserved meal plan does not silently eat quota it never used.
        for (let refunded = 0; refunded < i; refunded += 1) {
          await this.refund(userId, operation);
        }
        return last;
      }
    }

    return last ?? { allowed: true, used: 0, quota: DAILY_QUOTA, remaining: DAILY_QUOTA };
  }

  /** Returns a reserved unit after a failure that never reached the model. */
  async refund(userId: string, operation: AIOperation): Promise<void> {
    const { error } = await supabase.rpc('refund_ai_quota', {
      p_user_id: userId,
      p_operation: operation,
    });
    if (error) console.error('Quota refund failed', error);
  }

  /** Refunds a full weighted operation. */
  async refundOperation(userId: string, operation: AIOperation): Promise<void> {
    const cost = OPERATION_COST[operation] ?? 1;
    for (let i = 0; i < cost; i += 1) {
      await this.refund(userId, operation);
    }
  }

  /** Today's usage for a user, for display in the UI. */
  async current(userId: string): Promise<QuotaResult> {
    const { data, error } = await supabase
      .from('ai_usage')
      .select('calls')
      .eq('user_id', userId)
      .eq('usage_date', new Date().toISOString().slice(0, 10));

    if (error) {
      console.error('Could not read usage', error);
      return { allowed: true, used: 0, quota: DAILY_QUOTA, remaining: DAILY_QUOTA };
    }

    const used = (data ?? []).reduce((total, row) => total + Number(row.calls ?? 0), 0);

    return {
      allowed: used < DAILY_QUOTA,
      used,
      quota: DAILY_QUOTA,
      remaining: Math.max(0, DAILY_QUOTA - used),
    };
  }

  /**
   * Builds a cache key from everything that changes the model's answer.
   *
   * Preferences are part of the key, not just the explicit inputs: the prompts
   * embed dietary restrictions and allergies, so the same query from the same
   * user after they add an allergy must not reuse the earlier response.
   */
  cacheKey(
    operation: AIOperation,
    userId: string,
    input: Record<string, unknown>,
    preferences?: UserPreferences
  ): string {
    const normalized = JSON.stringify({
      operation,
      userId,
      input: this.normalize(input),
      preferences: preferences
        ? {
            dietary_restrictions: [...(preferences.dietary_restrictions ?? [])].sort(),
            allergies: [...(preferences.allergies ?? [])].sort(),
            preferred_cuisines: [...(preferences.preferred_cuisines ?? [])].sort(),
            cooking_skill_level: preferences.cooking_skill_level,
            serving_size: preferences.serving_size,
          }
        : null,
    });

    return createHash('sha256').update(normalized).digest('hex');
  }

  /** Lowercases and trims strings so trivial variations share a cache entry. */
  private normalize(input: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(input)
        .filter(([, value]) => value !== undefined && value !== null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : value,
        ])
    );
  }

  async readCache<T>(cacheKey: string): Promise<T | null> {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return data.response as T;
  }

  async writeCache(
    cacheKey: string,
    userId: string,
    operation: AIOperation,
    response: unknown
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60_000).toISOString();

    const { error } = await supabase.from('ai_response_cache').upsert(
      {
        cache_key: cacheKey,
        user_id: userId,
        operation,
        response: response as object,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'cache_key' }
    );

    if (error) {
      // A cache write failing is not worth failing the request over — the user
      // already has their answer.
      console.error('Cache write failed', error);
      return;
    }

    // Opportunistic cleanup, roughly one write in ten, so the table does not
    // grow without a scheduled job.
    if (Math.random() < 0.1) {
      const { error: purgeError } = await supabase.rpc('purge_expired_ai_cache');
      if (purgeError) console.error('Cache purge failed', purgeError);
    }
  }
}

export const usageService = new UsageService();
export { OPERATION_COST };
