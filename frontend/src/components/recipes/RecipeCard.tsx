import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react';
import { Recipe } from '../../types';
import { useRecipeStore } from '../../store/recipeStore';

interface RecipeCardProps {
  recipe: Recipe;
  showSaveButton?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, showSaveButton = true }) => {
  const navigate = useNavigate();
  const { saveRecipe, unsaveRecipe } = useRecipeStore();

  const handleCardClick = () => {
    navigate(`/recipe/${recipe.id}`);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recipe.saved) {
      unsaveRecipe(recipe.id);
    } else {
      saveRecipe(recipe.id);
    }
  };

  return (
    <div 
      className="recipe-card group bg-white"
      onClick={handleCardClick}
    >
      <div className="relative h-48 overflow-hidden rounded-t-xl">
        <img 
          src={recipe.image_url || 'https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'} 
          alt={recipe.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {showSaveButton && (
          <button 
            onClick={handleSaveClick}
            className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm hover:shadow-md"
          >
            {recipe.saved ? (
              <BookmarkCheck size={20} className="text-primary-600" />
            ) : (
              <Bookmark size={20} className="text-neutral-600 group-hover:text-primary-600 transition-colors" />
            )}
          </button>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold text-xl text-neutral-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {recipe.title}
        </h3>
        <p className="text-neutral-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center text-sm text-neutral-500 mb-4">
          <div className="flex items-center mr-4">
            <Clock size={16} className="mr-1.5 text-primary-500" />
            <span>{recipe.prepTime + recipe.cookTime} min</span>
          </div>
          <div className="flex items-center">
            <Users size={16} className="mr-1.5 text-primary-500" />
            <span>{recipe.serving_size} servings</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary-50 text-secondary-700 border border-secondary-100"
              >
                {tag}
              </span>
            ))}
          </div>
          <ChevronRight size={18} className="text-primary-400 group-hover:text-primary-600 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;