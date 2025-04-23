import { Router } from 'express';
import { RecipeController } from '../controllers/recipeController';

const router = Router();
const recipeController = new RecipeController();

// Recipe routes
router.get('/', recipeController.getAllRecipes);
router.get('/:id', recipeController.getRecipeById);
router.post('/search', recipeController.searchRecipes);
router.post('/generate', recipeController.generateRecipes);
router.post('/enhance/:id', recipeController.enhanceRecipe);
router.post('/save/:id', recipeController.saveRecipe);
router.delete('/save/:id', recipeController.unsaveRecipe);

export { router as recipeRoutes }; 