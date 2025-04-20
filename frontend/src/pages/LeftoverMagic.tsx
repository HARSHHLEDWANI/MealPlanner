import React, { useState } from 'react';
import { Plus, X, Sparkles, Loader } from 'lucide-react';
import { useRecipeStore } from '../store/recipeStore';
import RecipeGrid from '../components/recipes/RecipeGrid';

const LeftoverMagic: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const { searchByIngredients, searchResults, loading } = useRecipeStore();

  const handleAddIngredient = () => {
    if (inputValue.trim() && !ingredients.includes(inputValue.trim())) {
      setIngredients([...ingredients, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(ing => ing !== ingredient));
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) return;
    
    setGenerating(true);
    try {
      // In a real application, you would use an AI service
      // to generate creative recipes based on leftovers
      await searchByIngredients(ingredients);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Leftover Magic</h1>
        <p className="text-gray-600 mt-2">Turn random ingredients into delicious meals</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center mb-4">
          <Sparkles size={24} className="text-primary-500 mr-2" />
          <h2 className="text-xl font-semibold">Enter Your Leftovers</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Add any random ingredients you have left in your fridge or pantry. Our AI will suggest creative ways to use them!
        </p>
        
        <div className="mb-6">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="input flex-grow"
              placeholder="Add any leftover ingredient..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIngredient();
                }
              }}
            />
            <button 
              className="btn-primary"
              onClick={handleAddIngredient}
            >
              <Plus size={18} className="mr-2" />
              Add
            </button>
          </div>
          
          <div className="text-sm text-gray-500 mt-1">
            Press Enter to add each ingredient
          </div>
        </div>
        
        {ingredients.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Your Leftovers:</h3>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => (
                <div 
                  key={index}
                  className="bg-primary-50 rounded-full px-3 py-1 flex items-center text-primary-800"
                >
                  <span>{ingredient}</span>
                  <button 
                    className="ml-2 text-primary-600 hover:text-primary-800"
                    onClick={() => handleRemoveIngredient(ingredient)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <button 
          className="btn-primary w-full flex items-center justify-center"
          onClick={handleGenerateRecipes}
          disabled={ingredients.length === 0 || generating}
        >
          {generating ? (
            <>
              <Loader size={18} className="animate-spin mr-2" />
              Working Magic...
            </>
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              Create Recipes from Leftovers
            </>
          )}
        </button>
      </div>
      
      {/* Creative Recipe Suggestions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Creative Recipe Ideas</h2>
        {loading || generating ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-primary-500">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="mt-4 text-gray-600">Crafting magical recipes from your leftovers...</p>
          </div>
        ) : (
          <RecipeGrid 
            recipes={searchResults} 
            emptyMessage={
              ingredients.length === 0 
                ? "Add some leftovers to get creative recipe ideas!" 
                : "No recipe ideas found. Try adding different ingredients!"
            } 
          />
        )}
      </div>
    </div>
  );
};

export default LeftoverMagic;