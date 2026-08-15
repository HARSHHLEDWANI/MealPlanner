import { useEffect, useState } from 'react';
import { Search, Camera, Sparkles, BookOpen, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRecipeStore } from '@/store/recipeStore';
import { useAuthStore } from '@/store/authStore';
import RecipeGrid from '@/components/recipes/RecipeGrid';
import { Button, Card, Input, PageHeader } from '@/components/ui';

const FEATURES = [
  {
    title: 'Recipe Finder',
    description: 'Search the library, or have a new recipe written for you.',
    icon: Search,
    path: '/recipe-finder',
    tone: 'text-primary-600 bg-primary-50',
  },
  {
    title: 'Snap & Cook',
    description: 'Photograph your ingredients and we will identify them.',
    icon: Camera,
    path: '/image-recognition',
    tone: 'text-secondary-700 bg-secondary-50',
  },
  {
    title: 'Leftover Magic',
    description: 'Turn whatever is left in the fridge into a meal.',
    icon: Sparkles,
    path: '/leftover-magic',
    tone: 'text-primary-600 bg-primary-50',
  },
  {
    title: 'Meal Planner',
    description: 'Build a week of meals around your dietary needs.',
    icon: Calendar,
    path: '/meal-planner',
    tone: 'text-secondary-700 bg-secondary-50',
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { savedRecipes, fetchSavedRecipes, loading, error, clearError } = useRecipeStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    // Hands off to the finder rather than the old /search route, which no
    // router entry ever matched.
    navigate(`/recipe-finder?q=${encodeURIComponent(query.trim())}`);
  };

  const greetingName = user?.email?.split('@')[0];

  return (
    <div className="w-full">
      <PageHeader
        title={greetingName ? `Welcome back, ${greetingName}` : 'Welcome to Pantry Chef'}
        description="Find something to cook, plan your week, or turn leftovers into dinner."
      />

      <form onSubmit={handleSearch} className="mb-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              size={18}
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for a dish…"
              aria-label="Search for a dish"
              className="pl-11"
            />
          </div>
          <Button type="submit" size="lg" disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </form>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
      >
        {FEATURES.map(({ title, description, icon: Icon, path, tone }) => (
          <motion.div
            key={title}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card
              interactive
              className="p-5 h-full"
              onClick={() => navigate(path)}
              role="link"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(path);
                }
              }}
            >
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4 ${tone}`}>
                <Icon size={22} aria-hidden />
              </div>
              <h3 className="font-display font-semibold text-neutral-900 mb-1">{title}</h3>
              <p className="text-sm text-neutral-600">{description}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <section>
        <h2 className="font-display text-xl font-semibold text-neutral-900 mb-5">
          Your saved recipes
        </h2>
        <RecipeGrid
          recipes={savedRecipes}
          loading={loading}
          error={error}
          onRetry={() => {
            clearError();
            fetchSavedRecipes();
          }}
          emptyTitle="No saved recipes yet"
          emptyDescription="Bookmark a recipe and it will show up here for quick access."
          emptyAction={
            <Button onClick={() => navigate('/recipe-finder')}>
              <BookOpen size={16} aria-hidden />
              Browse recipes
            </Button>
          }
        />
      </section>
    </div>
  );
};

export default Dashboard;
