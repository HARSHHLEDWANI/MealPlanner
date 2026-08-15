import type { ReactNode } from 'react';
import RecipeCard from './RecipeCard';
import type { Recipe } from '@/types';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/ui';

interface RecipeGridProps {
  recipes: Recipe[];
  showSaveButton?: boolean;
  /** Renders skeletons instead of the grid. */
  loading?: boolean;
  /** Renders a retryable error instead of the grid. */
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

/**
 * Renders a recipe collection, or the right stand-in when there is nothing to
 * show. Centralizing loading, error, and empty here is what keeps every list
 * view in the app from having to remember all three.
 */
const RecipeGrid = ({
  recipes,
  showSaveButton = true,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No recipes found',
  emptyDescription,
  emptyAction,
}: RecipeGridProps) => {
  if (loading) return <SkeletonGrid />;

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (recipes.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} showSaveButton={showSaveButton} />
      ))}
    </div>
  );
};

export default RecipeGrid;
