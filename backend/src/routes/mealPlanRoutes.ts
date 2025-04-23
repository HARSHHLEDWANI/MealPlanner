import { Router } from 'express';
import { MealPlanController } from '../controllers/mealPlanController';

const router = Router();
const mealPlanController = new MealPlanController();

router.get('/current/:user_id', mealPlanController.getCurrentMealPlan);
router.post('/:user_id', mealPlanController.createMealPlan);
router.put('/:id', mealPlanController.updateMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

export { router as mealPlanRoutes }; 