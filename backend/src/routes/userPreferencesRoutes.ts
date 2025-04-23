import { Router } from 'express';
import { UserPreferencesController } from '../controllers/userPreferencesController';

const router = Router();
const userPreferencesController = new UserPreferencesController();

router.get('/:user_id', userPreferencesController.getUserPreferences);
router.put('/:user_id', userPreferencesController.updateUserPreferences);

export { router as userPreferencesRoutes }; 