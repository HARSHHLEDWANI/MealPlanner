import { Router } from 'express';
import { ShoppingListController } from '../controllers/shoppingListController';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import {
  createShoppingListBody,
  idParam,
  listItemParams,
  mealPlanIdParam,
  toggleItemBody,
  updateShoppingListBody,
} from '../schemas';

const router = Router();
const controller = new ShoppingListController();

router.get('/', asyncHandler(controller.getShoppingLists));
router.post('/', validate({ body: createShoppingListBody }), asyncHandler(controller.createShoppingList));

// Two-segment literal path, declared before `/:id` for clarity.
router.post(
  '/generate/:meal_plan_id',
  validate({ params: mealPlanIdParam }),
  asyncHandler(controller.generateFromMealPlan)
);

router.put(
  '/:list_id/items/:item_id',
  validate({ params: listItemParams, body: toggleItemBody }),
  asyncHandler(controller.toggleItemCheck)
);

router.put(
  '/:id',
  validate({ params: idParam, body: updateShoppingListBody }),
  asyncHandler(controller.updateShoppingList)
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.deleteShoppingList));

export { router as shoppingListRoutes };
