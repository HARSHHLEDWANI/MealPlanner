import { NextFunction, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { forbidden, unauthorized } from '../lib/errors';

/**
 * The authenticated caller, derived from a verified token. Never from the URL.
 */
export interface AuthContext {
  userId: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;

  return token.trim() || null;
}

/**
 * Verifies the Supabase access token on the Authorization header and attaches
 * the caller to `req.auth`.
 *
 * Verification goes through `supabase.auth.getUser(token)` rather than local
 * JWT signature checking. That costs a round trip per request, but it honours
 * revoked sessions and signed-out users immediately — a locally verified JWT
 * stays "valid" until it expires, even after the user signs out. It also means
 * no additional secret to hold.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    return next(unauthorized('Missing bearer token'));
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return next(unauthorized('Invalid or expired token'));
    }

    req.auth = { userId: data.user.id, email: data.user.email ?? undefined };
    return next();
  } catch (err) {
    // A network failure reaching Supabase is our problem, not a bad credential.
    return next(err);
  }
}

/**
 * Reads the authenticated user's ID. Throws rather than returning undefined so
 * a controller can never silently operate on an anonymous request — that is the
 * exact bug this middleware exists to prevent.
 */
export function actingUserId(req: Request): string {
  if (!req.auth?.userId) {
    throw unauthorized();
  }
  return req.auth.userId;
}

/**
 * Guards routes that still carry a `:user_id` path segment, rejecting any
 * request whose token does not match the ID being addressed.
 *
 * Controllers derive the user from `req.auth` regardless, so this is defence in
 * depth: it turns a mismatched URL into an explicit 403 instead of quietly
 * serving the caller their own data under someone else's ID.
 */
export function enforceSelf(paramName = 'user_id') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const requested = req.params[paramName];
    if (requested && requested !== req.auth?.userId) {
      return next(forbidden('You cannot act on behalf of another user'));
    }
    return next();
  };
}
