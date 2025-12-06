import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRecipeStore } from '../store/recipeStore';
import RecipeGrid from '../components/recipes/RecipeGrid';

const RecipeFinder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cuisine, setCuisine] = useState('');
  const { searchRecipes, searchResults, loading } = useRecipeStore();

  const cuisines = [
    'Any',
    'Italian',
    'Mexican',
    'Chinese',
    'Indian',
    'Japanese',
    'French',
    'American',
    'Korean',
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchRecipes({
        query: searchQuery.trim(),
        cuisine: cuisine === 'Any' ? '' : cuisine
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Recipe Finder</h1>
        <p className="text-gray-600 mt-2">Discover delicious recipes from around the world</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Search for Recipes</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              What would you like to cook?
            </label>
            <input
              id="search"
              type="text"
              className="input w-full"
              placeholder="Enter a dish name (e.g., Pad Thai, Lasagna, Butter Chicken)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
          </div>

          <div>
            <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-1">
              Cuisine Type (Optional)
            </label>
            <select
              id="cuisine"
              className="input w-full"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
            >
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          className="btn-primary w-full mt-6"
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
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
        <h2 className="text-2xl font-semibold mb-4">Recipe Results</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-primary-500">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="mt-4 text-gray-600">Finding delicious recipes...</p>
          </div>
        ) : (
          <RecipeGrid 
            recipes={searchResults} 
            emptyMessage={
              !searchQuery.trim()
                ? "Enter a dish name to find recipes" 
                : "No recipes found. Try a different search term!"
            } 
          />
        )}
      </div>
    </div>
  );
};

export default RecipeFinder; 