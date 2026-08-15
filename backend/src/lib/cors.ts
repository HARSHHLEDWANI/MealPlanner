import { CorsOptions } from 'cors';

/**
 * Origin allowlist, driven by CORS_ALLOWED_ORIGINS (comma-separated).
 *
 * Replaces a bare `cors()`, which sent `Access-Control-Allow-Origin: *` and let
 * any site on the internet call this API from a user's browser.
 */
const configured = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowlist = configured.length > 0 ? configured : ['http://localhost:3001'];

if (configured.length === 0) {
  console.warn(
    '[cors] CORS_ALLOWED_ORIGINS is unset; defaulting to http://localhost:3001. ' +
      'Set it explicitly before deploying.'
  );
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requests with no Origin header are not browser cross-origin requests
    // (curl, server-to-server, health checks) and CORS does not apply to them.
    if (!origin) return callback(null, true);

    if (allowlist.includes(origin)) return callback(null, true);

    // Reject by withholding the header rather than by throwing. The browser
    // blocks the response either way, but throwing turns every preflight from
    // an unlisted origin into a logged 500 — noise that looks like a server
    // fault and buries real errors.
    console.warn(`[cors] rejected origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

export const allowedOrigins = allowlist;
