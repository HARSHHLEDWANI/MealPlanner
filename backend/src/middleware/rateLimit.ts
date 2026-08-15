import rateLimit, { ipKeyGenerator, Options } from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate limiters.
 *
 * Two tiers, because the threats differ. General routes are cheap and only need
 * protection from hammering. The /api/ai/* routes each spend real money on a
 * metered Gemini call, so they get a much tighter budget keyed to the
 * authenticated user rather than the IP — otherwise one account behind a shared
 * NAT can burn the quota for everyone on that address, and one user with a
 * changing IP can bypass the limit entirely.
 *
 * This is abuse prevention. Per-user cost control (daily quotas, caching) is a
 * separate concern handled by the usage layer.
 */

const shared: Partial<Options> = {
  standardHeaders: 'draft-7', // RateLimit-* headers so clients can back off
  legacyHeaders: false,
};

function jsonLimitResponse(code: string, message: string) {
  return (_req: Request, res: any) =>
    res.status(429).json({ error: { code, message } });
}

/** Broad ceiling on the whole API. Generous enough that normal use never sees it. */
export const globalLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  handler: jsonLimitResponse('RATE_LIMITED', 'Too many requests. Please slow down.'),
});

/**
 * Per-user budget for LLM calls. Falls back to the IP for unauthenticated
 * requests, which should not reach these routes anyway.
 */
export const aiLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  // ipKeyGenerator normalizes IPv6 to its /64 prefix. Keying on a raw IPv6
  // address would let a client hop addresses within its own allocation to
  // reset the limit at will.
  keyGenerator: (req: Request) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
  handler: jsonLimitResponse(
    'AI_RATE_LIMITED',
    'You are generating too quickly. Please wait a few minutes and try again.'
  ),
});

/**
 * Second, IP-keyed limit stacked on top of aiLimiter. Stops a single host from
 * cycling through many accounts to multiply its LLM budget.
 */
export const aiIpLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  handler: jsonLimitResponse(
    'AI_RATE_LIMITED',
    'Too many AI requests from this network. Please try again later.'
  ),
});
