import { Router } from 'express';
import { AIController } from '../controllers/aiController';

const router = Router();
const aiController = new AIController();

router.post('/recipe/generate/:user_id', aiController.generateRecipe);
router.post('/meal-plan/generate/:user_id', aiController.generateMealPlan);
router.post('/recipe/enhance/:recipe_id', aiController.enhanceRecipe);
router.post('/ingredients/substitute/:user_id', aiController.suggestSubstitutions);

export { router as aiRoutes }; 