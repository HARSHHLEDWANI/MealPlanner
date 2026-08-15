import { Router } from 'express';
import { ImageController } from '../controllers/imageController';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { aiIpLimiter, aiLimiter } from '../middleware/rateLimit';
import { enforceQuota } from '../middleware/quota';
import { aiAnalyzeImageBody } from '../schemas';

const router = Router();
const controller = new ImageController();

// Vision calls are metered like any other model call, so they carry the same
// limiters as /api/ai/*.
router.post(
  '/analyze',
  aiIpLimiter,
  aiLimiter,
  validate({ body: aiAnalyzeImageBody }),
  enforceQuota('image_analyze'),
  asyncHandler(controller.analyzeImage)
);

export { router as imageRoutes };
