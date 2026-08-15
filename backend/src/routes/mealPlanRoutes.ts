import { Router } from 'express';
import { MealPlanController } from '../controllers/mealPlanController';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { createMealPlanBody, idParam, updateMealPlanBody } from '../schemas';

const router = Router();
const controller = new MealPlanController();

// The plan belongs to whoever holds the token; no user ID in the path.
router.get('/current', asyncHandler(controller.getCurrentMealPlan));
router.post('/', validate({ body: createMealPlanBody }), asyncHandler(controller.createMealPlan));

// These address a plan by its own ID, so the controller verifies ownership.
router.put(
  '/:id',
  validate({ params: idParam, body: updateMealPlanBody }),
  asyncHandler(controller.updateMealPlan)
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.deleteMealPlan));

export { router as mealPlanRoutes };
