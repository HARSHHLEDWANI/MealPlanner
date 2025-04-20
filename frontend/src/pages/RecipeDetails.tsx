import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Users, 
  ChefHat, 
  Bookmark, 
  BookmarkCheck,
  ArrowLeft,
  ShoppingCart
} from 'lucide-react';
import { useRecipeStore } from '../store/recipeStore';
import { Recipe } from '../types';
import { useGroceryListStore } from '../store/groceryListStore';

const RecipeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, savedRecipes, fetchRecipes, fetchSavedRecipes, saveRecipe, unsaveRecipe } = useRecipeStore();
  const { generateFromRecipes } = useGroceryListStore();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchRecipes(), fetchSavedRecipes()]);
      setLoading(false);
    };
    
    fetchData();
  }, [fetchRecipes, fetchSavedRecipes]);

  useEffect(() => {
    if (!loading && id) {
      // First check in saved recipes
      let foundRecipe = savedRecipes.find(r => r.id === id);
      
      // If not found, check in all recipes
      if (!foundRecipe) {
        foundRecipe = recipes.find(r => r.id === id);
      }
      
      if (foundRecipe) {
        setRecipe(foundRecipe);
      } else {
        // Handle recipe not found
        navigate('/dashboard');
      }
    }
  }, [id, recipes, savedRecipes, loading, navigate]);

  const handleSaveToggle = () => {
    if (!recipe) return;
    
    if (recipe.saved) {
      unsaveRecipe(recipe.id);
      setRecipe({ ...recipe, saved: false });
    } else {
      saveRecipe(recipe.id);
      setRecipe({ ...recipe, saved: true });
    }
  };

  const handleAddToGroceryList = () => {
    if (!recipe) return;
    generateFromRecipes([recipe]);
  };

  if (loading || !recipe) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        className="flex items-center text-gray-600 hover:text-gray-800"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} className="mr-1" />
        Back
      </button>
      
      {/* Recipe Header */}
      <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
        <img 
          src={recipe.image_url || 'https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'} 
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-2">{recipe.title}</h1>
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recipe Actions */}
      <div className="flex flex-wrap gap-4">
        <button 
          className="btn-primary flex items-center"
          onClick={handleSaveToggle}
        >
          {recipe.saved ? (
            <>
              <BookmarkCheck size={18} className="mr-2" />
              Saved
            </>
          ) : (
            <>
              <Bookmark size={18} className="mr-2" />
              Save Recipe
            </>
          )}
        </button>
        
        <button 
          className="btn-secondary flex items-center"
          onClick={handleAddToGroceryList}
        >
          <ShoppingCart size={18} className="mr-2" />
          Add to Grocery List
        </button>
      </div>
      
      {/* Recipe Info */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center">
            <Clock size={20} className="text-primary-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Total Time</p>
              <p className="font-medium">{recipe.prep_time + recipe.cook_time} mins</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <ChefHat size={20} className="text-primary-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Prep Time</p>
              <p className="font-medium">{recipe.prep_time} mins</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <Users size={20} className="text-primary-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Servings</p>
              <p className="font-medium">{recipe.serving_size}</p>
            </div>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6">{recipe.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs mr-3 mt-0.5">•</span>
                  <span>
                    <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Instructions */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex">
                  <span className="h-6 w-6 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="flex-1">{instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetails;