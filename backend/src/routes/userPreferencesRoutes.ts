import { Router } from 'express';
import { UserPreferencesController } from '../controllers/userPreferencesController';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { updatePreferencesBody } from '../schemas';

const router = Router();
const controller = new UserPreferencesController();

// No :user_id segment — preferences always belong to the authenticated caller.
router.get('/', asyncHandler(controller.getUserPreferences));
router.put('/', validate({ body: updatePreferencesBody }), asyncHandler(controller.updateUserPreferences));

export { router as userPreferencesRoutes };
