import React, { useEffect, useState } from 'react';
import { Calendar, ArrowRight, ArrowLeft, Plus, X, ShoppingCart } from 'lucide-react';
import { useMealPlanStore } from '../store/mealPlanStore';
import { useRecipeStore } from '../store/recipeStore';
import { useGroceryListStore } from '../store/groceryListStore';
import { Recipe } from '../types';

const MealPlanner: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [addingMealType, setAddingMealType] = useState<string | null>(null);
  
  const { 
    currentMealPlan, 
    getCurrentMealPlan, 
    addRecipeToMealPlan, 
    removeRecipeFromMealPlan 
  } = useMealPlanStore();
  
  const { recipes, fetchRecipes, loading } = useRecipeStore();
  const { generateFromRecipes } = useGroceryListStore();

  useEffect(() => {
    fetchRecipes();
    getCurrentMealPlan();
  }, [fetchRecipes, getCurrentMealPlan]);

  useEffect(() => {
    if (currentMealPlan) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [currentMealPlan]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim()) {
      const filtered = recipes.filter(recipe => 
        recipe.title.toLowerCase().includes(query) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddRecipe = (recipe: Recipe) => {
    if (selectedDate && addingMealType) {
      addRecipeToMealPlan(recipe, selectedDate, addingMealType);
      setAddingMealType(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveRecipe = (date: string, mealType: string) => {
    removeRecipeFromMealPlan(date, mealType);
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getPlannedMeals = () => {
    if (!currentMealPlan || !selectedDate) return null;
    
    const day = currentMealPlan.days.find(d => d.date === selectedDate);
    if (!day) return null;
    
    return day.meals;
  };

  const generateGroceryList = () => {
    if (!currentMealPlan) return;
    
    // Collect all recipes in the meal plan
    const allPlannedRecipes: Recipe[] = [];
    
    currentMealPlan.days.forEach(day => {
      if (day.meals.breakfast) allPlannedRecipes.push(day.meals.breakfast);
      if (day.meals.lunch) allPlannedRecipes.push(day.meals.lunch);
      if (day.meals.dinner) allPlannedRecipes.push(day.meals.dinner);
      if (day.meals.snacks) allPlannedRecipes.push(...day.meals.snacks);
    });
    
    generateFromRecipes(allPlannedRecipes);
  };

  const meals = getPlannedMeals();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Meal Planner</h1>
        <p className="text-gray-600 mt-2">Plan your meals for the week and generate shopping lists</p>
      </div>
      
      {/* Calendar Navigation */}
      {currentMealPlan && (
        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="flex justify-between items-center mb-6">
            <button 
              className="btn-outline p-2"
              onClick={() => navigateDate('prev')}
            >
              <ArrowLeft size={18} />
            </button>
            
            <div className="flex items-center">
              <Calendar size={20} className="text-gray-600 mr-2" />
              <span className="text-lg font-medium">
                {selectedDate ? formatDateDisplay(selectedDate) : 'Select a date'}
              </span>
            </div>
            
            <button 
              className="btn-outline p-2"
              onClick={() => navigateDate('next')}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="grid gap-4">
            {/* Breakfast */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Breakfast</h3>
                {meals?.breakfast ? (
                  <button 
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => selectedDate && handleRemoveRecipe(selectedDate, 'breakfast')}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <button 
                    className="text-primary-600 hover:text-primary-800 flex items-center text-sm"
                    onClick={() => setAddingMealType('breakfast')}
                  >
                    <Plus size={16} className="mr-1" />
                    Add
                  </button>
                )}
              </div>
              
              {meals?.breakfast ? (
                <div className="bg-gray-50 rounded p-2">
                  <p className="font-medium">{meals.breakfast.title}</p>
                  <p className="text-sm text-gray-500">{meals.breakfast.prep_time + meals.breakfast.cook_time} min • {meals.breakfast.serving_size} servings</p>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">No breakfast planned</div>
              )}
            </div>
            
            {/* Lunch */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Lunch</h3>
                {meals?.lunch ? (
                  <button 
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => selectedDate && handleRemoveRecipe(selectedDate, 'lunch')}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <button 
                    className="text-primary-600 hover:text-primary-800 flex items-center text-sm"
                    onClick={() => setAddingMealType('lunch')}
                  >
                    <Plus size={16} className="mr-1" />
                    Add
                  </button>
                )}
              </div>
              
              {meals?.lunch ? (
                <div className="bg-gray-50 rounded p-2">
                  <p className="font-medium">{meals.lunch.title}</p>
                  <p className="text-sm text-gray-500">{meals.lunch.prep_time + meals.lunch.cook_time} min • {meals.lunch.serving_size} servings</p>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">No lunch planned</div>
              )}
            </div>
            
            {/* Dinner */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Dinner</h3>
                {meals?.dinner ? (
                  <button 
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => selectedDate && handleRemoveRecipe(selectedDate, 'dinner')}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <button 
                    className="text-primary-600 hover:text-primary-800 flex items-center text-sm"
                    onClick={() => setAddingMealType('dinner')}
                  >
                    <Plus size={16} className="mr-1" />
                    Add
                  </button>
                )}
              </div>
              
              {meals?.dinner ? (
                <div className="bg-gray-50 rounded p-2">
                  <p className="font-medium">{meals.dinner.title}</p>
                  <p className="text-sm text-gray-500">{meals.dinner.prep_time + meals.dinner.cook_time} min • {meals.dinner.serving_size} servings</p>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">No dinner planned</div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              className="btn-secondary w-full flex items-center justify-center"
              onClick={generateGroceryList}
            >
              <ShoppingCart size={18} className="mr-2" />
              Generate Grocery List
            </button>
          </div>
        </div>
      )}
      
      {/* Add Recipe Modal */}
      {addingMealType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Add Recipe to {addingMealType.charAt(0).toUpperCase() + addingMealType.slice(1)}
                </h3>
                <button 
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setAddingMealType(null);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 border-b">
              <input
                type="text"
                className="input"
                placeholder="Search for recipes..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            <div className="flex-grow overflow-y-auto p-4">
              {loading ? (
                <div className="py-4 text-center text-gray-500">Loading recipes...</div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map(recipe => (
                    <div 
                      key={recipe.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddRecipe(recipe)}
                    >
                      <p className="font-medium">{recipe.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{recipe.description}</p>
                      <div className="flex text-xs text-gray-400 mt-1">
                        <span className="mr-2">{recipe.prep_time + recipe.cook_time} min</span>
                        <span>{recipe.serving_size} servings</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-gray-500">
                  {searchQuery ? 'No recipes found' : 'Type to search for recipes'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;