import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { recipeRoutes } from './routes/recipeRoutes';
import { userPreferencesRoutes } from './routes/userPreferencesRoutes';
import { mealPlanRoutes } from './routes/mealPlanRoutes';
import { shoppingListRoutes } from './routes/shoppingListRoutes';
import { aiRoutes } from './routes/aiRoutes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/recipes', recipeRoutes);
app.use('/api/preferences', userPreferencesRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  // Check if the request accepts HTML
  const acceptsHtml = req.accepts(['html', 'json']) === 'html';

  if (acceptsHtml) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meal Planner API</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2563eb;
            margin-top: 0;
          }
          .endpoints {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .endpoint {
            margin: 10px 0;
            padding: 10px;
            background-color: white;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
          }
          .endpoint code {
            color: #2563eb;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to the Meal Planner API</h1>
          <p>This is the backend server for the Meal Planner application. The following endpoints are available:</p>
          
          <div class="endpoints">
            <div class="endpoint">
              <strong>Recipes:</strong> <code>/api/recipes</code>
            </div>
            <div class="endpoint">
              <strong>User Preferences:</strong> <code>/api/preferences</code>
            </div>
            <div class="endpoint">
              <strong>Meal Plans:</strong> <code>/api/meal-plans</code>
            </div>
            <div class="endpoint">
              <strong>Shopping Lists:</strong> <code>/api/shopping-lists</code>
            </div>
            <div class="endpoint">
              <strong>AI Features:</strong> <code>/api/ai</code>
            </div>
            <div class="endpoint">
              <strong>Health Check:</strong> <code>/health</code>
            </div>
          </div>

          <p style="margin-top: 20px; color: #64748b;">
            Note: This is an API server. For the full application, please use the frontend client.
          </p>
        </div>
      </body>
      </html>
    `);
  } else {
    // Return JSON for API requests
    res.json({
      message: 'Welcome to the Meal Planner API',
      endpoints: {
        recipes: '/api/recipes',
        preferences: '/api/preferences',
        mealPlans: '/api/meal-plans',
        shoppingLists: '/api/shopping-lists',
        ai: '/api/ai',
        health: '/health'
      }
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 