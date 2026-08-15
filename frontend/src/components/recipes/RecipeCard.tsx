import { useNavigate } from 'react-router-dom';
import { Clock, Users, Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react';
import type { Recipe } from '@/types';
import { useRecipeStore } from '@/store/recipeStore';
import { Badge, Card } from '@/components/ui';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

interface RecipeCardProps {
  recipe: Recipe;
  showSaveButton?: boolean;
}

const RecipeCard = ({ recipe, showSaveButton = true }: RecipeCardProps) => {
  const navigate = useNavigate();
  const { saveRecipe, unsaveRecipe } = useRecipeStore();

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  const handleSaveClick = (event: React.MouseEvent) => {
    // The whole card is a link target; without this the bookmark would also
    // navigate away from the list the user is browsing.
    event.stopPropagation();
    if (recipe.saved) {
      unsaveRecipe(recipe.id);
    } else {
      saveRecipe(recipe.id);
    }
  };

  return (
    <Card
      interactive
      className="group overflow-hidden flex flex-col"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/recipe/${recipe.id}`);
        }
      }}
    >
      <div className="relative h-48 overflow-hidden bg-neutral-100">
        <img
          src={recipe.image_url || FALLBACK_IMAGE}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            const img = event.currentTarget as HTMLImageElement;
            // Swap once. Without this guard a failing fallback retriggers
            // onError against itself and loops forever — which floods the
            // console and hammers the network offline or behind a blocker.
            if (img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = 'true';
            img.src = FALLBACK_IMAGE;
          }}
        />
        {showSaveButton && (
          <button
            onClick={handleSaveClick}
            aria-label={recipe.saved ? `Unsave ${recipe.title}` : `Save ${recipe.title}`}
            aria-pressed={Boolean(recipe.saved)}
            className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {recipe.saved ? (
              <BookmarkCheck size={18} className="text-primary-600" />
            ) : (
              <Bookmark size={18} className="text-neutral-600" />
            )}
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-lg text-neutral-900 mb-2 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-neutral-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
          {totalTime > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock size={15} className="text-primary-500" aria-hidden />
              {totalTime} min
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={15} className="text-primary-500" aria-hidden />
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2 mt-auto">
          <div className="flex flex-wrap gap-1.5">
            {recipe.difficulty && <Badge tone="neutral">{recipe.difficulty}</Badge>}
            {(recipe.dietary_tags ?? []).slice(0, 2).map((tag) => (
              <Badge key={tag} tone="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <ChevronRight
            size={18}
            className="text-primary-400 group-hover:text-primary-600 transition-colors shrink-0"
            aria-hidden
          />
        </div>
      </div>
    </Card>
  );
};

export default RecipeCard;
