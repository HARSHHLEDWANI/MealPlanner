import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';
import { badRequest } from '../lib/errors';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

function fieldErrors(err: ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validates and replaces `req.body` / `req.params` / `req.query` with parsed,
 * typed values before a controller runs.
 *
 * Rejecting here means controllers can assume their inputs are well-formed, and
 * a malformed request produces a descriptive 400 rather than a 500 from
 * somewhere deep in a Supabase call.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        // Express 5 makes req.query a getter-only property, so assign in place.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          configurable: true,
        });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(badRequest('Request validation failed', fieldErrors(err)));
      }
      return next(err);
    }
  };
}
