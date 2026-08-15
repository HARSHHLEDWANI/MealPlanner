/**
 * Errors that are safe to show a client.
 *
 * Anything thrown that is not an AppError is treated as an internal fault by
 * the error handler: logged in full, reported to the client as a generic 500.
 * That keeps stack traces and raw Postgres errors out of responses.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Stable machine-readable code so clients can branch without string matching. */
    public readonly code: string,
    /** Optional structured detail, e.g. per-field validation failures. */
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, message, 'UNAUTHORIZED');

export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(403, message, 'FORBIDDEN');

export const notFound = (resource = 'Resource') =>
  new AppError(404, `${resource} not found`, 'NOT_FOUND');

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, 'BAD_REQUEST', details);

export const upstreamFailure = (message = 'An upstream service failed') =>
  new AppError(502, message, 'UPSTREAM_FAILURE');
