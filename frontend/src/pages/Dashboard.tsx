import React, { useEffect, useState } from 'react';
import { Search, ChefHat, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';
import RecipeGrid from '../components/recipes/RecipeGrid';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { savedRecipes, fetchSavedRecipes, searchRecipes, searchResults, loading } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchRecipes(searchQuery);
    }
  };

  const features = [
    {
      title: 'Ingredient Search',
      description: 'Find recipes using ingredients you already have',
      icon: <Search size={24} className="text-primary-500" />,
      path: '/ingredient-search'
    },
    {
      title: 'Snap & Cook',
      description: 'Take a photo of your ingredients to generate recipe ideas',
      icon: <ChefHat size={24} className="text-primary-500" />,
      path: '/image-recognition'
    },
    {
      title: 'Leftover Magic',
      description: 'Turn your random leftovers into delicious meals',
      icon: <ArrowRight size={24} className="text-primary-500" />,
      path: '/leftover-magic'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Welcome to Pantry Chef</h1>
        <p className="text-gray-600 mt-2">Find recipes based on what you already have in your kitchen</p>
      </div>
      
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            className="input flex-grow"
            placeholder="Search recipes by name, ingredient, or cuisine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            <Search size={18} className="mr-2" />
            Search
          </button>
        </form>
      </div>
      
      {/* Quick Access Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="bg-white rounded-lg shadow-card p-6 hover:shadow-card-hover transition-shadow cursor-pointer"
            onClick={() => navigate(feature.path)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-primary-50 rounded-full p-3">
                {feature.icon}
              </div>
              <ArrowRight size={18} className="text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
      
      {/* Search Results (if any) */}
      {searchResults.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Search Results</h2>
          <RecipeGrid recipes={searchResults} emptyMessage="No recipes found for your search" />
        </div>
      )}
      
      {/* Saved Recipes */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Saved Recipes</h2>
        <RecipeGrid 
          recipes={savedRecipes} 
          emptyMessage="You haven't saved any recipes yet. Start searching to discover delicious meals!" 
        />
      </div>
    </div>
  );
};

export default Dashboard;