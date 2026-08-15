import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Users,
  ChefHat,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Package,
  UtensilsCrossed,
} from 'lucide-react';
import { useRecipeStore } from '@/store/recipeStore';
import type { Recipe } from '@/types';
import { Badge, Button, Card, ErrorBanner, ErrorState, Spinner } from '@/components/ui';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

const RecipeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { getRecipeDetails, saveRecipe, unsaveRecipe, enhanceRecipe, generating } =
    useRecipeStore();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Fetches this one recipe by ID.
   *
   * The previous version loaded the entire recipe library plus all saved
   * recipes and searched the arrays client-side, then silently redirected to
   * the dashboard if it came up empty — so a slow load or a real 404 both just
   * bounced the user with no explanation.
   *
   * `signal` lets the effect abandon a request the user navigated away from,
   * rather than setting state on a component that is gone.
   */
  const load = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!id) return;

      // Every state change happens after the await, so the effect below sets
      // nothing synchronously and cannot cascade a render on mount.
      const found = await getRecipeDetails(id);
      if (signal?.cancelled) return;

      if (found) {
        setRecipe(found);
        setError(null);
      } else {
        setError('We could not find that recipe. It may have been removed.');
      }
      setLoading(false);
    },
    [id, getRecipeDetails]
  );

  useEffect(() => {
    const signal = { cancelled: false };
    // `loading` already starts true and every setState in `load` happens after
    // its first await, so nothing is set synchronously here. The rule cannot
    // see across the function boundary to confirm that, so it is suppressed
    // narrowly rather than the effect being restructured around a false report.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const retry = () => {
    setLoading(true);
    load();
  };

  const handleSaveToggle = async () => {
    if (!recipe) return;
    const nextSaved = !recipe.saved;
    setRecipe({ ...recipe, saved: nextSaved });

    try {
      if (nextSaved) {
        await saveRecipe(recipe.id);
      } else {
        await unsaveRecipe(recipe.id);
      }
    } catch {
      setRecipe({ ...recipe, saved: !nextSaved });
      setActionError('Could not update your saved recipes. Please try again.');
    }
  };

  const handleEnhance = async () => {
    if (!recipe) return;
    setActionError(null);
    const enhanced = await enhanceRecipe(recipe.id);
    if (enhanced) {
      setRecipe(enhanced);
    } else {
      setActionError('The enhancement did not complete. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner className="w-8 h-8" />
        <p className="text-neutral-600">Loading recipe…</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <ErrorState
        title="Recipe not found"
        message={error ?? 'We could not load that recipe.'}
        onRetry={retry}
      />
    );
  }

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft size={18} aria-hidden />
        Back
      </button>

      <div className="relative h-56 sm:h-72 md:h-80 rounded-xl overflow-hidden bg-neutral-100">
        <img
          src={recipe.image_url || FALLBACK_IMAGE}
          alt=""
          className="w-full h-full object-cover"
          onError={(event) => {
            const img = event.currentTarget as HTMLImageElement;
            // Swap once; see RecipeCard for why the guard matters.
            if (img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = 'true';
            img.src = FALLBACK_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex items-end">
          <div className="p-5 sm:p-6">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
              {recipe.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              {recipe.cuisine_type && (
                <span className="bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs">
                  {recipe.cuisine_type}
                </span>
              )}
              {(recipe.dietary_tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSaveToggle} variant={recipe.saved ? 'outline' : 'primary'}>
          {recipe.saved ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />}
          {recipe.saved ? 'Saved' : 'Save recipe'}
        </Button>
        <Button variant="secondary" onClick={handleEnhance} loading={generating}>
          {!generating && <Sparkles size={16} aria-hidden />}
          Enhance with AI
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-primary-500 shrink-0" aria-hidden />
            <div>
              <p className="text-sm text-neutral-500">Total time</p>
              <p className="font-medium">{totalTime} mins</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ChefHat size={20} className="text-primary-500 shrink-0" aria-hidden />
            <div>
              <p className="text-sm text-neutral-500">Difficulty</p>
              <p className="font-medium">{recipe.difficulty}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users size={20} className="text-primary-500 shrink-0" aria-hidden />
            <div>
              <p className="text-sm text-neutral-500">Servings</p>
              <p className="font-medium">{recipe.servings}</p>
            </div>
          </div>
        </div>

        {recipe.description && <p className="text-neutral-700 mb-6">{recipe.description}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <h2 className="font-display text-lg font-semibold mb-4">Ingredients</h2>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-neutral-500">No ingredients listed.</p>
            ) : (
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient}-${index}`} className="flex items-start gap-3">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-2 shrink-0"
                      aria-hidden
                    />
                    <span className="text-neutral-700">{ingredient}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-2">
            <h2 className="font-display text-lg font-semibold mb-4">Instructions</h2>
            {recipe.instructions.length === 0 ? (
              <p className="text-sm text-neutral-500">No instructions listed.</p>
            ) : (
              <ol className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-xs shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-neutral-700">{instruction}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Card>

      {/* Only rendered once an enhancement pass has actually produced content. */}
      {(recipe.cooking_tips?.length ||
        recipe.serving_suggestions?.length ||
        recipe.storage_instructions) && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={18} className="text-secondary-600" aria-hidden />
            <h2 className="font-display text-lg font-semibold">Chef&apos;s notes</h2>
            <Badge tone="secondary">AI enhanced</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recipe.cooking_tips?.length ? (
              <div>
                <h3 className="flex items-center gap-2 font-medium text-neutral-800 mb-2">
                  <Lightbulb size={16} className="text-secondary-600" aria-hidden />
                  Tips
                </h3>
                <ul className="space-y-1.5 text-sm text-neutral-700 list-disc list-inside">
                  {recipe.cooking_tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {recipe.serving_suggestions?.length ? (
              <div>
                <h3 className="flex items-center gap-2 font-medium text-neutral-800 mb-2">
                  <UtensilsCrossed size={16} className="text-secondary-600" aria-hidden />
                  Serving
                </h3>
                <ul className="space-y-1.5 text-sm text-neutral-700 list-disc list-inside">
                  {recipe.serving_suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {recipe.storage_instructions ? (
              <div>
                <h3 className="flex items-center gap-2 font-medium text-neutral-800 mb-2">
                  <Package size={16} className="text-secondary-600" aria-hidden />
                  Storage
                </h3>
                <p className="text-sm text-neutral-700">{recipe.storage_instructions}</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RecipeDetails;
