import React from 'react';
import RecipeCard from './RecipeCard';
import { Recipe } from '../../types';

interface RecipeGridProps {
  recipes: Recipe[];
  emptyMessage?: string;
  showSaveButton?: boolean;
}

const RecipeGrid: React.FC<RecipeGridProps> = ({ 
  recipes, 
  emptyMessage = "No recipes found", 
  showSaveButton = true 
}) => {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard 
          key={recipe.id} 
          recipe={recipe} 
          showSaveButton={showSaveButton} 
        />
      ))}
    </div>
  );
};

export default RecipeGrid;