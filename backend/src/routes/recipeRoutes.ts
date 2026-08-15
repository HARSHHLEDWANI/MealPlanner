import { Router } from 'express';
import { RecipeController } from '../controllers/recipeController';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { idParam, listRecipesQuery, searchRecipesBody } from '../schemas';

const router = Router();
const controller = new RecipeController();

// Ordered before `/:id` so the literal path wins; otherwise a request for
// /saved is read as a recipe whose ID is the string "saved" — which is what
// the frontend was hitting.
router.get('/saved', asyncHandler(controller.getSavedRecipes));

router.get('/', validate({ query: listRecipesQuery }), asyncHandler(controller.getAllRecipes));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.getRecipeById));

router.post('/search', validate({ body: searchRecipesBody }), asyncHandler(controller.searchRecipes));

router.post('/save/:id', validate({ params: idParam }), asyncHandler(controller.saveRecipe));
router.delete('/save/:id', validate({ params: idParam }), asyncHandler(controller.unsaveRecipe));

// Generation and enhancement live under /api/ai only. This file previously
// carried duplicates of both that called JSON.parse() on raw model output with
// no code-fence handling, and wrote LLM keys straight into an update() against
// columns that do not exist. Nothing called them; /api/ai/* does it correctly
// and is where the rate limiting and usage quotas are enforced.

export { router as recipeRoutes };
