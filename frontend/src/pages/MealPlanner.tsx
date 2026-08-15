import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Sparkles, ShoppingCart, Trash2, X } from 'lucide-react';
import { useMealPlanStore, mealAt, currentWeekStart } from '@/store/mealPlanStore';
import { useGroceryListStore } from '@/store/groceryListStore';
import { useRecipeStore } from '@/store/recipeStore';
import api, { errorMessage } from '@/lib/api';
import type { DayOfWeek, MealPlan, MealType, Recipe } from '@/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { QuotaExhausted, UsageMeter } from '@/components/ai/UsageMeter';
import { handleQuotaError, useUsageStore } from '@/store/usageStore';

const DAYS: Array<{ index: DayOfWeek; label: string; short: string }> = [
  { index: 0, label: 'Sunday', short: 'Sun' },
  { index: 1, label: 'Monday', short: 'Mon' },
  { index: 2, label: 'Tuesday', short: 'Tue' },
  { index: 3, label: 'Wednesday', short: 'Wed' },
  { index: 4, label: 'Thursday', short: 'Thu' },
  { index: 5, label: 'Friday', short: 'Fri' },
  { index: 6, label: 'Saturday', short: 'Sat' },
];

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

const MealPlanner = () => {
  const navigate = useNavigate();

  const {
    currentMealPlan,
    loading,
    saving,
    error,
    isEmpty,
    fetchCurrentMealPlan,
    removeMeal,
    setMeal,
    deleteMealPlan,
    clearError,
  } = useMealPlanStore();

  const { generateFromMealPlan, saving: listSaving } = useGroceryListStore();
  const { recipes, fetchRecipes } = useRecipeStore();

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ day: DayOfWeek; meal: MealType } | null>(null);
  const exhausted = useUsageStore((state) => state.exhausted);
  const refreshUsage = useUsageStore((state) => state.refresh);

  useEffect(() => {
    fetchCurrentMealPlan();
  }, [fetchCurrentMealPlan]);

  /** Generates a full week with AI. The heaviest call in the app. */
  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await api.post<MealPlan>('/api/ai/meal-plan/generate', {
        week_start_date: currentWeekStart(),
      });
      await fetchCurrentMealPlan();
      refreshUsage();
    } catch (err) {
      // Quota exhaustion has its own UI; do not also show a red error.
      if (!handleQuotaError(err)) setGenerateError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleBuildList = async () => {
    if (!currentMealPlan) return;
    const list = await generateFromMealPlan(currentMealPlan.id);
    if (list) navigate('/grocery-list');
  };

  const openPicker = async (day: DayOfWeek, meal: MealType) => {
    setPicking({ day, meal });
    if (recipes.length === 0) await fetchRecipes();
  };

  const choose = async (recipe: Recipe) => {
    if (!picking) return;
    await setMeal(recipe, picking.day, picking.meal);
    setPicking(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner className="w-8 h-8" />
        <p className="text-neutral-600">Loading your meal plan…</p>
      </div>
    );
  }

  if (error && !currentMealPlan) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          clearError();
          fetchCurrentMealPlan();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meal Planner"
        description={
          currentMealPlan
            ? `Week of ${new Date(currentMealPlan.week_start_date).toLocaleDateString()}`
            : 'Plan a week of meals around your dietary needs.'
        }
        action={
          currentMealPlan && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleBuildList} loading={listSaving}>
                {!listSaving && <ShoppingCart size={16} aria-hidden />}
                Build grocery list
              </Button>
              <Button variant="ghost" onClick={deleteMealPlan} disabled={saving}>
                <Trash2 size={16} aria-hidden />
                Clear
              </Button>
            </div>
          )
        }
      />

      {(error || generateError) && (
        <ErrorBanner
          message={error ?? generateError ?? ''}
          onDismiss={() => {
            clearError();
            setGenerateError(null);
          }}
        />
      )}

      {isEmpty && !currentMealPlan ? (
        <Card>
          <EmptyState
            icon={<Calendar className="w-7 h-7" />}
            title="No meal plan for this week"
            description="Generate a full week of meals with AI, honoring your allergies and dietary restrictions, or build one meal at a time."
            action={
              <div className="flex flex-col items-center gap-3">
                {exhausted ? (
                  <QuotaExhausted />
                ) : (
                  <Button onClick={handleGenerate} loading={generating} size="lg">
                    {!generating && <Sparkles size={16} aria-hidden />}
                    Generate my week
                  </Button>
                )}
                <UsageMeter />
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {/* Horizontal scroll rather than reflow: a week grid compressed into
              a phone width becomes unreadable, and the day columns need to
              stay aligned to be scannable. */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[820px] grid grid-cols-8 gap-3">
              <div aria-hidden />
              {DAYS.map((day) => (
                <div key={day.index} className="text-center pb-2">
                  <p className="font-display font-semibold text-neutral-900">{day.short}</p>
                </div>
              ))}

              {MEALS.map((mealType) => (
                <div key={mealType} className="contents">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-neutral-600 capitalize">
                      {mealType}
                    </span>
                  </div>

                  {DAYS.map((day) => {
                    const item = mealAt(currentMealPlan, day.index, mealType);
                    const recipe = item?.recipe;

                    return (
                      <div key={`${mealType}-${day.index}`} className="min-h-[104px]">
                        {recipe ? (
                          <div className="group relative h-full p-2.5 rounded-lg border border-neutral-200 bg-white hover:border-primary-300 transition-colors">
                            <button
                              onClick={() => navigate(`/recipe/${recipe.id}`)}
                              className="text-left w-full"
                            >
                              <p className="text-xs font-medium text-neutral-900 line-clamp-3 mb-1">
                                {recipe.title}
                              </p>
                              <p className="text-[11px] text-neutral-500">
                                {(recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)} min
                              </p>
                            </button>
                            <button
                              onClick={() => removeMeal(day.index, mealType)}
                              aria-label={`Remove ${recipe.title} from ${day.label} ${mealType}`}
                              className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-neutral-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-600 transition-opacity"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openPicker(day.index, mealType)}
                            aria-label={`Add a ${mealType} for ${day.label}`}
                            className="h-full w-full flex items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
                          >
                            <Plus size={16} aria-hidden />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-neutral-900">Start over with AI</p>
              <p className="text-sm text-neutral-600">
                Replaces this week with a freshly generated plan.
              </p>
              <UsageMeter className="mt-2" />
            </div>
            <Button
              variant="outline"
              onClick={handleGenerate}
              loading={generating}
              disabled={exhausted}
            >
              {!generating && <Sparkles size={16} aria-hidden />}
              Regenerate week
            </Button>
          </Card>
        </>
      )}

      {/* Recipe picker */}
      {picking && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose a recipe"
          onClick={() => setPicking(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[80vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h2 className="font-display font-semibold">
                Choose a {picking.meal} for {DAYS[picking.day].label}
              </h2>
              <button onClick={() => setPicking(null)} aria-label="Close" className="p-1 text-neutral-400 hover:text-neutral-700">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {recipes.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-500">
                  <Spinner className="mx-auto mb-2" />
                  Loading recipes…
                </div>
              ) : (
                recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => choose(recipe)}
                    disabled={saving}
                    className="w-full text-left p-3 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                  >
                    <p className="font-medium text-neutral-900">{recipe.title}</p>
                    <p className="text-sm text-neutral-500">
                      {(recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)} min · {recipe.difficulty}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;
