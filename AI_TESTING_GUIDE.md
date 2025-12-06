# AI Features Testing Guide

## 🚀 Quick Start

### 1. **Environment Setup**

First, make sure you have your environment variables set up:

**Backend** (`MealPlanner/backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash  # Optional: use gemini-1.5-pro for better quality
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=5001
```

**Frontend** (`MealPlanner/frontend/.env`):
```env
VITE_API_URL=http://localhost:5001
```

### 2. **Start the Servers**

**Terminal 1 - Backend:**
```bash
cd MealPlanner/backend
npm install  # if needed
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd MealPlanner/frontend
npm install  # if needed
npm run dev
```

---

## 📍 Where to Test AI Features

### **Option 1: Frontend UI (Recommended)**

1. **Navigate to the AI Page:**
   - Open your browser to `http://localhost:5173` (or your frontend port)
   - Login if needed
   - Go to: **`/ai`** route
   - You'll see tabs for:
     - **Recipe Generator** - Generate new recipes
     - **Meal Plan Generator** - Create 7-day meal plans
     - **Recipe Enhancer** - Enhance existing recipes
     - **Ingredient Substitutions** - Get substitution suggestions

2. **Test Meal Plan Generation:**
   - Click on "Meal Plan Generator" tab
   - Select a start date (must be today or future)
   - Click "Generate Meal Plan"
   - The system will:
     - Fetch your user preferences
     - Generate 21 meals (7 days × 3 meals)
     - Save all recipes to database
     - Create meal plan with proper relationships

3. **Test Recipe Generation:**
   - Click on "Recipe Generator" tab
   - Enter a recipe query (e.g., "Chicken Tikka Masala")
   - Optionally select a cuisine
   - Click generate
   - Recipe will respect your dietary preferences

### **Option 2: Backend API Endpoints (Direct Testing)**

You can test the endpoints directly using:
- **Postman**
- **Thunder Client** (VS Code extension)
- **curl** commands
- **Browser** (for GET requests)

#### **Available AI Endpoints:**

1. **Generate Meal Plan:**
   ```
   POST http://localhost:5001/api/ai/meal-plan/generate/{user_id}
   Body: {
     "week_start_date": "2024-01-15"
   }
   ```

2. **Generate Recipe:**
   ```
   POST http://localhost:5001/api/ai/recipe/generate/{user_id}
   Body: {
     "query": "Pasta Carbonara",
     "cuisine": "Italian"  // optional
   }
   ```

3. **Enhance Recipe:**
   ```
   POST http://localhost:5001/api/ai/recipe/enhance/{recipe_id}
   ```

4. **Get Ingredient Substitutions:**
   ```
   POST http://localhost:5001/api/ai/ingredients/substitute/{user_id}
   Body: {
     "ingredient": "butter",
     "reason": "dairy-free diet"  // optional
   }
   ```

### **Option 3: Check Backend Logs**

When you run `npm run dev` in the backend, you'll see:
- Console logs for AI generation
- Error messages if something fails
- Success confirmations

---

## ✅ What to Verify

### **1. User Preferences Integration**
- Set up user preferences first: `POST /api/preferences/{user_id}`
- Generate a meal plan
- Verify it respects:
  - Dietary restrictions
  - Allergies
  - Preferred cuisines
  - Cooking skill level
  - Serving size

### **2. Database Integration**
- Check `recipes` table - should have new AI-generated recipes
- Check `meal_plans` table - should have new meal plan
- Check `meal_plan_items` table - should have 21 items linked to recipes

### **3. Response Quality**
- Recipes should have:
  - Proper ingredient measurements
  - Step-by-step instructions
  - Cooking times
  - Difficulty levels
- Meal plans should have:
  - Variety across the week
  - Proper meal types (breakfast, lunch, dinner)
  - Correct day_of_week values (0-6)

---

## 🧪 Example Test Scenarios

### **Scenario 1: Generate Meal Plan for Vegetarian**
1. Set user preferences:
   ```json
   POST /api/preferences/{user_id}
   {
     "dietary_restrictions": ["Vegetarian"],
     "allergies": [],
     "preferred_cuisines": ["Italian", "Mediterranean"],
     "cooking_skill_level": "Intermediate",
     "serving_size": 2
   }
   ```

2. Generate meal plan:
   ```json
   POST /api/ai/meal-plan/generate/{user_id}
   {
     "week_start_date": "2024-01-15"
   }
   ```

3. Verify: All recipes should be vegetarian, prefer Italian/Mediterranean

### **Scenario 2: Generate Recipe with Allergies**
1. Set preferences with allergies:
   ```json
   {
     "allergies": ["Peanuts", "Shellfish"]
   }
   ```

2. Generate recipe:
   ```json
   POST /api/ai/recipe/generate/{user_id}
   {
     "query": "Thai curry"
   }
   ```

3. Verify: Recipe should NOT contain peanuts or shellfish

---

## 🐛 Troubleshooting

### **Issue: "GEMINI_API_KEY is required"**
- **Solution:** Add `GEMINI_API_KEY` to `backend/.env`

### **Issue: "Failed to generate meal plan"**
- Check backend logs for detailed error
- Verify Supabase connection
- Check if user preferences exist

### **Issue: JSON parsing errors**
- The AI service now handles markdown code blocks
- If still failing, check the raw response in logs

### **Issue: Recipes not saving**
- Verify Supabase connection
- Check database schema matches types
- Look for foreign key constraints

---

## 📊 Files to Check

### **Backend Files:**
- `backend/src/services/aiService.ts` - Core AI logic
- `backend/src/controllers/aiController.ts` - API handlers
- `backend/src/lib/gemini.ts` - Gemini configuration
- `backend/src/routes/aiRoutes.ts` - Route definitions

### **Frontend Files:**
- `frontend/src/pages/ai/index.tsx` - AI page component
- `frontend/src/components/ai/MealPlanGenerator.tsx` - Meal plan UI
- `frontend/src/components/ai/RecipeGenerator.tsx` - Recipe UI

---

## 🎯 Next Steps

1. **Test all AI features** using the frontend UI
2. **Set up user preferences** to see personalized results
3. **Check the database** to verify data is being saved correctly
4. **Review generated content** for quality and accuracy
5. **Adjust prompts** in `aiService.ts` if needed for better results

---

## 💡 Tips

- Start with simple queries to test basic functionality
- Set up user preferences before generating meal plans for best results
- Check browser console and backend logs for debugging
- Use Postman/Thunder Client for quick API testing
- The AI uses `gemini-1.5-flash` by default (fast, cost-effective)
- Switch to `gemini-1.5-pro` in `.env` for higher quality (slower)

