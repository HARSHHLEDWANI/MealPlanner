import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';
import { actingUserId } from './auth';
import { AIOperation, usageService } from '../services/usageService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by enforceQuota so a controller can refund on failure. */
      aiOperation?: AIOperation;
    }
  }
}

/**
 * Reserves daily quota before an AI route runs.
 *
 * Exceeding the quota returns 429 with the distinct code QUOTA_EXCEEDED rather
 * than the rate limiter's RATE_LIMITED, because the two mean different things
 * to the user: one clears in minutes, the other not until tomorrow. The
 * frontend branches on that code to say so.
 */
export function enforceQuota(operation: AIOperation) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = actingUserId(req);
      const result = await usageService.consume(userId, operation);

      if (!result.allowed) {
        return next(
          new AppError(
            429,
            `You have used all ${result.quota} of today's AI generations. Your quota resets tomorrow.`,
            'QUOTA_EXCEEDED',
            { used: result.used, quota: result.quota, remaining: 0 }
          )
        );
      }

      // Recorded so the controller can hand the reservation back if the model
      // call fails outright.
      req.aiOperation = operation;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Returns reserved quota when a request fails before producing anything the
 * user can use. Safe to call on a request that has no reservation.
 */
export async function refundQuota(req: Request): Promise<void> {
  if (!req.aiOperation || !req.auth?.userId) return;
  await usageService.refundOperation(req.auth.userId, req.aiOperation);
}
