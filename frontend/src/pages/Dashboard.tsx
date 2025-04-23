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

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { savedRecipes, fetchSavedRecipes, searchRecipes, searchResults, loading: storeLoading } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size should be less than 5MB');
      }

      // Navigate to image recognition page with the file
      navigate('/image-recognition', { state: { imageFile: file } });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
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
              disabled={isSearching}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" size={20} />
            )}
          </div>
        </form>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={featureVariants}
              whileHover={{ scale: 1.02 }}
              className={`bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                feature.title === 'Snap & Cook' ? 'relative' : ''
              }`}
              onClick={() => {
                if (feature.title === 'Snap & Cook') {
                  document.getElementById('imageInput')?.click();
                } else {
                  navigate(feature.path);
                }
              }}
            >
              {feature.title === 'Snap & Cook' && (
                <input
                  type="file"
                  id="imageInput"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              )}
              <div className="flex items-center justify-between mb-4">
                {feature.icon}
                {feature.title === 'Snap & Cook' && (
                  <div className="absolute right-4 top-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-gray-500" />
                    <Upload className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
              {feature.title === 'Snap & Cook' && uploadError && (
                <p className="text-red-500 text-xs mt-2">{uploadError}</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6">Your Saved Recipes</h2>
          <AnimatePresence mode="wait">
            {storeLoading ? (
              <LoadingSpinner />
            ) : savedRecipes.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {savedRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    variants={itemVariants}
                    layout
                  >
                    <RecipeCard recipe={recipe} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 bg-gray-50 rounded-lg"
              >
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No saved recipes yet. Start exploring to save your favorites!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;