import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Bookmark, BookmarkCheck } from 'lucide-react';
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
      className="recipe-card overflow-hidden"
      onClick={handleCardClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={recipe.image_url || 'https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'} 
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        {showSaveButton && (
          <button 
            onClick={handleSaveClick}
            className="absolute top-2 right-2 p-1.5 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
          >
            {recipe.saved ? (
              <BookmarkCheck size={18} className="text-primary-600" />
            ) : (
              <Bookmark size={18} className="text-gray-600" />
            )}
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center text-sm text-gray-500">
          <Clock size={16} className="mr-1" />
          <span className="mr-4">{recipe.prep_time + recipe.cook_time} min</span>
          <Users size={16} className="mr-1" />
          <span>{recipe.serving_size} servings</span>
        </div>
        <div className="mt-3 flex flex-wrap">
          {recipe.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index} 
              className="ingredient-tag"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;