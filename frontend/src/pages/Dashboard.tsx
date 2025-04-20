import React, { useEffect, useState, useRef } from 'react';
import { Search, ChefHat, ArrowRight, Clock, Bookmark, Loader2, Heart, BookOpen, Camera, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';
import { motion, AnimatePresence } from 'framer-motion';
import RecipeCard from '../components/recipes/RecipeCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const featureVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { savedRecipes, fetchSavedRecipes, searchRecipes, searchResults, loading } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const features = [
    {
      title: 'Ingredient Search',
      description: 'Find recipes using ingredients you already have',
      icon: <Search size={24} className="text-primary-600" />,
      path: '/ingredient-search',
      bgColor: 'bg-primary-50',
      hoverBgColor: 'group-hover:bg-primary-100',
      gradient: 'from-primary-500/10 to-primary-500/5'
    },
    {
      title: 'Snap & Cook',
      description: 'Take a photo of your ingredients to generate recipe ideas',
      icon: <ChefHat size={24} className="text-secondary-600" />,
      path: '/image-recognition',
      bgColor: 'bg-secondary-50',
      hoverBgColor: 'group-hover:bg-secondary-100',
      gradient: 'from-secondary-500/10 to-secondary-500/5'
    },
    {
      title: 'Leftover Magic',
      description: 'Turn your random leftovers into delicious meals',
      icon: <ArrowRight size={24} className="text-primary-600" />,
      path: '/leftover-magic',
      bgColor: 'bg-primary-50',
      hoverBgColor: 'group-hover:bg-primary-100',
      gradient: 'from-primary-500/10 to-primary-500/5'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-8">Welcome to MealPlanner</h1>
        
        <form onSubmit={handleSearch} className="relative mb-12">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for recipes..."
              className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" size={20} />
            )}
          </div>
        </form>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/recipes')}
          >
            <ChefHat className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Browse Recipes</h3>
            <p className="text-gray-600 text-sm">Explore our collection of delicious recipes</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/meal-planner')}
          >
            <Clock className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Meal Planning</h3>
            <p className="text-gray-600 text-sm">Plan your meals for the week ahead</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/saved')}
          >
            <Heart className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Saved Recipes</h3>
            <p className="text-gray-600 text-sm">Access your favorite recipes quickly</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative group"
            onClick={() => document.getElementById('imageInput')?.click()}
          >
            <input
              type="file"
              id="imageInput"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Handle the selected file
                  navigate('/image-recognition', { state: { imageFile: file } });
                }
              }}
            />
            <div className="flex items-center justify-between mb-4">
              <ChefHat className="w-8 h-8 text-secondary-600" />
              <div className="absolute right-4 top-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-gray-500" />
                <Upload className="w-5 h-5 text-gray-500" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Snap & Cook</h3>
            <p className="text-gray-600 text-sm">Take a photo or upload an image of your ingredients to generate recipe ideas</p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6">Your Saved Recipes</h2>
          <AnimatePresence>
            {savedRecipes.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {savedRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <RecipeCard recipe={recipe} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.p 
                className="text-gray-500 text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                No saved recipes yet. Start exploring to save your favorites!
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;