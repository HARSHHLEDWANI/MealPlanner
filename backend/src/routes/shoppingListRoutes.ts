import { Router } from 'express';
import { ShoppingListController } from '../controllers/shoppingListController';

const router = Router();
const shoppingListController = new ShoppingListController();

router.get('/:user_id', shoppingListController.getShoppingLists);
router.post('/:user_id', shoppingListController.createShoppingList);
router.put('/:id', shoppingListController.updateShoppingList);
router.delete('/:id', shoppingListController.deleteShoppingList);
router.put('/:list_id/items/:item_id', shoppingListController.toggleItemCheck);
router.post('/generate/:meal_plan_id', shoppingListController.generateFromMealPlan);

export { router as shoppingListRoutes }; 