import { useEffect, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useRecipeStore } from '@/store/recipeStore';
import RecipeGrid from '@/components/recipes/RecipeGrid';
import { Button, Card, ErrorBanner, Input, PageHeader } from '@/components/ui';
import { QuotaExhausted, UsageMeter } from '@/components/ai/UsageMeter';
import { useUsageStore } from '@/store/usageStore';

const CUISINES = [
  'Any',
  'Italian',
  'Mexican',
  'Chinese',
  'Indian',
  'Japanese',
  'Thai',
  'French',
  'American',
  'Mediterranean',
  'Korean',
];

/**
 * Search the recipe library, or generate a new recipe when nothing fits.
 *
 * These are deliberately two separate actions. Search previously routed
 * straight to the AI generation endpoint, so every query silently spent a
 * billable model call and wrote a new recipe to the database — the user had no
 * way to just look something up.
 */
const RecipeFinder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [cuisine, setCuisine] = useState('Any');

  const {
    searchResults,
    searchRecipes,
    generateRecipe,
    loading,
    generating,
    error,
    hasSearched,
    clearError,
  } = useRecipeStore();

  const exhausted = useUsageStore((state) => state.exhausted);

  // Run the search when arriving with ?q= from the dashboard.
  useEffect(() => {
    const initial = searchParams.get('q');
    if (initial) searchRecipes(initial);
    // Intentionally only on mount; later edits go through the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchParams({ q: trimmed });
    searchRecipes(trimmed);
  };

  const handleGenerate = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    generateRecipe(trimmed, cuisine === 'Any' ? undefined : cuisine);
  };

  const busy = loading || generating;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recipe Finder"
        description="Search what we already have, or have a new recipe written for you."
      />

      <Card className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <Input
            label="What would you like to cook?"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Pad Thai, lasagna, butter chicken"
            disabled={busy}
          />

          <div>
            <label htmlFor="cuisine" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Cuisine <span className="text-neutral-400">(applies when generating)</span>
            </label>
            <select
              id="cuisine"
              value={cuisine}
              onChange={(event) => setCuisine(event.target.value)}
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500"
            >
              {CUISINES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {exhausted && <QuotaExhausted />}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button type="submit" loading={loading} disabled={!query.trim() || busy} fullWidth>
              {!loading && <Search size={16} aria-hidden />}
              Search recipes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              loading={generating}
              // Searching still works with no quota left, so only the generate
              // action is disabled.
              disabled={!query.trim() || busy || exhausted}
              fullWidth
            >
              {!generating && <Sparkles size={16} aria-hidden />}
              Generate with AI
            </Button>
          </div>

          <UsageMeter />
        </form>
      </Card>

      <section>
        <h2 className="font-display text-xl font-semibold text-neutral-900 mb-5">Results</h2>

        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        <RecipeGrid
          recipes={searchResults}
          loading={busy}
          emptyTitle={hasSearched ? 'No recipes matched that search' : 'Search to get started'}
          emptyDescription={
            hasSearched
              ? 'Try a different term, or generate a new recipe with AI.'
              : 'Enter a dish above to search the recipe library.'
          }
        />
      </section>
    </div>
  );
};

export default RecipeFinder;
