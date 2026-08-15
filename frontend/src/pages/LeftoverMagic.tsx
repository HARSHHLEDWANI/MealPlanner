import { useEffect, useState } from 'react';
import { Plus, X, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useRecipeStore } from '@/store/recipeStore';
import RecipeGrid from '@/components/recipes/RecipeGrid';
import { Badge, Button, Card, ErrorBanner, Input, PageHeader } from '@/components/ui';
import { QuotaExhausted, UsageMeter } from '@/components/ai/UsageMeter';
import { useUsageStore } from '@/store/usageStore';

/**
 * Find recipes from ingredients on hand.
 *
 * Accepts ingredients via router state, which is how Snap & Cook hands off
 * what it recognized in a photo.
 */
const LeftoverMagic = () => {
  const location = useLocation();
  const incoming = (location.state as { ingredients?: string[] } | null)?.ingredients;

  const [ingredients, setIngredients] = useState<string[]>(incoming ?? []);
  const [inputValue, setInputValue] = useState('');

  const {
    searchByIngredients,
    generateRecipe,
    searchResults,
    loading,
    generating,
    error,
    hasSearched,
    clearError,
  } = useRecipeStore();

  const exhausted = useUsageStore((state) => state.exhausted);

  // Search straight away when arriving from the photo flow — the user already
  // expressed intent by taking the picture.
  useEffect(() => {
    if (incoming?.length) searchByIngredients(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addIngredient = () => {
    const value = inputValue.trim().toLowerCase();
    if (!value || ingredients.includes(value)) {
      setInputValue('');
      return;
    }
    setIngredients([...ingredients, value]);
    setInputValue('');
  };

  const removeIngredient = (target: string) => {
    setIngredients(ingredients.filter((item) => item !== target));
  };

  const busy = loading || generating;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leftover Magic"
        description="Tell us what is in the fridge and we will find something to make."
      />

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-primary-500" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Your ingredients</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addIngredient();
              }
            }}
            placeholder="Add an ingredient…"
            aria-label="Add an ingredient"
            disabled={busy}
          />
          <Button type="button" onClick={addIngredient} disabled={!inputValue.trim() || busy}>
            <Plus size={16} aria-hidden />
            Add
          </Button>
        </div>
        <p className="text-xs text-neutral-500 mb-6">Press Enter to add each one.</p>

        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {ingredients.map((ingredient) => (
              <Badge key={ingredient} tone="primary" className="pr-1.5">
                {ingredient}
                <button
                  onClick={() => removeIngredient(ingredient)}
                  aria-label={`Remove ${ingredient}`}
                  className="ml-1.5 text-primary-600 hover:text-primary-900 rounded-full"
                >
                  <X size={13} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {exhausted && <QuotaExhausted className="mb-4" />}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => searchByIngredients(ingredients)}
            loading={loading}
            disabled={ingredients.length === 0 || busy}
            fullWidth
          >
            Find matching recipes
          </Button>
          <Button
            variant="outline"
            onClick={() => generateRecipe(`a dish using ${ingredients.join(', ')}`)}
            loading={generating}
            disabled={ingredients.length === 0 || busy || exhausted}
            fullWidth
          >
            {!generating && <Sparkles size={16} aria-hidden />}
            Invent something new
          </Button>
        </div>

        <UsageMeter className="mt-4" />
      </Card>

      <section>
        <h2 className="font-display text-xl font-semibold text-neutral-900 mb-5">Ideas</h2>

        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        <RecipeGrid
          recipes={searchResults}
          loading={busy}
          emptyTitle={
            hasSearched ? 'Nothing in the library uses those' : 'Add what you have on hand'
          }
          emptyDescription={
            hasSearched
              ? 'Try different ingredients, or let AI invent a recipe around them.'
              : 'Add a few ingredients above and we will find recipes that use them.'
          }
        />
      </section>
    </div>
  );
};

export default LeftoverMagic;
