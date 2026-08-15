import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { corsOptions } from './lib/cors';
import { requireAuth } from './middleware/auth';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { recipeRoutes } from './routes/recipeRoutes';
import { userPreferencesRoutes } from './routes/userPreferencesRoutes';
import { mealPlanRoutes } from './routes/mealPlanRoutes';
import { shoppingListRoutes } from './routes/shoppingListRoutes';
import { aiRoutes } from './routes/aiRoutes';
import { imageRoutes } from './routes/imageRoutes';

interface AppOptions {
  /** Disables the global rate limiter, which otherwise leaks counts between tests. */
  rateLimiting?: boolean;
}

/**
 * Builds the Express app without starting a server.
 *
 * Separated from index.ts so tests can mount the real middleware stack —
 * auth, validation, error handling — with supertest, instead of asserting
 * against handlers called in isolation. Importing index.ts would call
 * app.listen() and bind a port as a side effect of the import.
 */
export function createApp({ rateLimiting = true }: AppOptions = {}): Express {
  const app = express();

  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));

  if (rateLimiting) {
    app.use(globalLimiter);
  }

  // --- Public ---------------------------------------------------------------

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/', (req, res) => {
    const acceptsHtml = req.accepts(['html', 'json']) === 'html';

    if (!acceptsHtml) {
      return res.json({
        message: 'Welcome to the Meal Planner API',
        note: 'All /api routes require a Supabase bearer token.',
        endpoints: {
          recipes: '/api/recipes',
          preferences: '/api/preferences',
          mealPlans: '/api/meal-plans',
          shoppingLists: '/api/shopping-lists',
          ai: '/api/ai',
          images: '/api/images',
          health: '/health',
        },
      });
    }

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meal Planner API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;
           background: #f5f5f5; color: #171717; }
    .container { background: #fff; padding: 30px; border-radius: 8px;
                 box-shadow: 0 2px 4px rgb(0 0 0 / 0.1); }
    h1 { color: #ea580c; margin-top: 0; }
    .endpoint { margin: 10px 0; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; }
    code { color: #ea580c; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
    .note { margin-top: 20px; padding: 12px; background: #fff7ed;
            border-left: 3px solid #f97316; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Meal Planner API</h1>
    <p>Backend server for the Meal Planner application.</p>
    <div class="endpoint"><strong>Recipes:</strong> <code>/api/recipes</code></div>
    <div class="endpoint"><strong>User Preferences:</strong> <code>/api/preferences</code></div>
    <div class="endpoint"><strong>Meal Plans:</strong> <code>/api/meal-plans</code></div>
    <div class="endpoint"><strong>Shopping Lists:</strong> <code>/api/shopping-lists</code></div>
    <div class="endpoint"><strong>AI Features:</strong> <code>/api/ai</code></div>
    <div class="endpoint"><strong>Image Analysis:</strong> <code>/api/images</code></div>
    <div class="endpoint"><strong>Health Check:</strong> <code>/health</code></div>
    <p class="note">
      Every <code>/api</code> route requires an <code>Authorization: Bearer &lt;token&gt;</code>
      header carrying a Supabase access token. Use the frontend client.
    </p>
  </div>
</body>
</html>`);
  });

  // --- Authenticated --------------------------------------------------------
  // Mounted on the prefix, so a new route file cannot ship unauthenticated by
  // omission: it has to be added above this line to be public.

  app.use('/api', requireAuth);

  app.use('/api/recipes', recipeRoutes);
  app.use('/api/preferences', userPreferencesRoutes);
  app.use('/api/meal-plans', mealPlanRoutes);
  app.use('/api/shopping-lists', shoppingListRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/images', imageRoutes);

  // --- Errors (must be last) ------------------------------------------------

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
