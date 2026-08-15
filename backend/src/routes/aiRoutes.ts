import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { aiIpLimiter, aiLimiter } from '../middleware/rateLimit';
import { enforceQuota } from '../middleware/quota';
import {
  aiGenerateRecipeBody,
  aiMealPlanBody,
  aiSubstituteBody,
  recipeIdParam,
} from '../schemas';

const router = Router();
const controller = new AIController();

// Every route here spends a metered Gemini call, so all of them carry the
// abuse limiters: a per-user budget and an IP ceiling that stops one host from
// cycling accounts to multiply it.
router.use(aiIpLimiter, aiLimiter);

// Reports remaining quota. Deliberately above the quota middleware — checking
// how much you have left must not itself consume any.
router.get('/usage', asyncHandler(controller.getUsage));

router.post(
  '/recipe/generate',
  validate({ body: aiGenerateRecipeBody }),
  enforceQuota('recipe_generate'),
  asyncHandler(controller.generateRecipe)
);

router.post(
  '/meal-plan/generate',
  validate({ body: aiMealPlanBody }),
  enforceQuota('meal_plan_generate'),
  asyncHandler(controller.generateMealPlan)
);

router.post(
  '/recipe/enhance/:recipe_id',
  validate({ params: recipeIdParam }),
  enforceQuota('recipe_enhance'),
  asyncHandler(controller.enhanceRecipe)
);

router.post(
  '/ingredients/substitute',
  validate({ body: aiSubstituteBody }),
  enforceQuota('ingredient_substitute'),
  asyncHandler(controller.suggestSubstitutions)
);

export { router as aiRoutes };
