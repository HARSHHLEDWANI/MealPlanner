import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';

/** Catches requests that matched no route, so they reach the handler below as a 404. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `No route matches ${req.method} ${req.path}`, 'NOT_FOUND'));
}

/**
 * Terminal error handler. Must be registered last.
 *
 * Deliberate one-way valve: known AppErrors carry their message to the client,
 * everything else is logged in full server-side and reported as a bare 500. A
 * raw Postgres error or stack trace tells an attacker about the schema and file
 * layout, so it never crosses the boundary.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Express delegates to the default handler if headers are already sent.
  if (res.headersSent) {
    return next(err);
  }

  // body-parser rejects unparseable or oversized payloads with a tagged error
  // carrying its own status. These are client mistakes, not server faults, so
  // translate them rather than letting them fall through as a 500.
  const parseError = err as { type?: string; status?: number; statusCode?: number };
  if (parseError?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' },
    });
  }
  if (parseError?.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
    });
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      console.error(`[${err.code}] ${req.method} ${req.path}`, err);
    }
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  console.error(`[UNHANDLED] ${req.method} ${req.path}`, err);

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

/**
 * Wraps an async handler so a rejected promise reaches the error handler.
 *
 * Express 4 does not await route handlers, so without this a thrown error in an
 * async controller becomes an unhandled rejection and the request hangs until
 * it times out.
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}
