import React, { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useRecipeStore } from '../store/recipeStore';
import RecipeGrid from '../components/recipes/RecipeGrid';

const IngredientSearch: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
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

  const handleSearch = () => {
    if (ingredients.length > 0) {
      searchByIngredients(ingredients);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Ingredient Search</h1>
        <p className="text-gray-600 mt-2">Find recipes based on ingredients you already have</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Enter Your Ingredients</h2>
        
        <div className="mb-6">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="input flex-grow"
              placeholder="Add an ingredient (e.g., chicken, tomatoes, pasta)..."
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
            <h3 className="font-medium text-gray-700 mb-2">Your Ingredients:</h3>
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
          className="btn-primary w-full"
          onClick={handleSearch}
          disabled={loading || ingredients.length === 0}
        >
          {loading ? (
            <span>Searching...</span>
          ) : (
            <>
              <Search size={18} className="mr-2" />
              Find Recipes
            </>
          )}
        </button>
      </div>
      
      {/* Recipe Results */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Recipe Matches</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-primary-500">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="mt-4 text-gray-600">Finding the perfect recipes...</p>
          </div>
        ) : (
          <RecipeGrid 
            recipes={searchResults} 
            emptyMessage={
              ingredients.length === 0 
                ? "Add some ingredients to find matching recipes" 
                : "No recipes found with these ingredients. Try adding different ones!"
            } 
          />
        )}
      </div>
    </div>
  );
};

export default IngredientSearch;