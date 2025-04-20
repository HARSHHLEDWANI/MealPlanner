import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, ImageIcon, Loader, X } from 'lucide-react';
import { useRecipeStore } from '../store/recipeStore';
import RecipeGrid from '../components/recipes/RecipeGrid';

const ImageRecognition: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [identifiedIngredients, setIdentifiedIngredients] = useState<string[]>([]);
  
  const { searchByIngredients, searchResults, loading } = useRecipeStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImage(file);
      
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      
      // Reset previous results
      setIdentifiedIngredients([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  const handleClearImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setImage(null);
    setPreview(null);
    setIdentifiedIngredients([]);
  };

  const handleAnalyzeImage = async () => {
    if (!image) return;
    
    setAnalyzing(true);
    
    try {
      // Simulate AI image analysis
      // In a real app, you would send the image to an AI service
      // and get back identified ingredients
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock ingredients for demo
      const mockIngredients = [
        'tomatoes',
        'onions',
        'bell peppers',
        'garlic',
        'olive oil'
      ];
      
      setIdentifiedIngredients(mockIngredients);
      searchByIngredients(mockIngredients);
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCapturePhoto = () => {
    // In a real app, you would access the device camera here
    alert('In a real app, this would open your camera to take a photo.');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Snap & Cook</h1>
        <p className="text-gray-600 mt-2">Take a photo of your ingredients and let AI find recipes</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Food Image</h2>
        
        {preview ? (
          <div className="mb-6">
            <div className="relative">
              <img 
                src={preview} 
                alt="Food" 
                className="w-full max-h-96 object-contain rounded-lg"
              />
              <button 
                className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-100"
                onClick={handleClearImage}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer mb-6 transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <ImageIcon size={48} className="text-gray-400 mb-4" />
            <p className="text-center text-gray-600 mb-2">
              Drag & drop a food image here, or click to select
            </p>
            <p className="text-center text-gray-500 text-sm mb-4">
              Supports JPG, PNG images
            </p>
            <button 
              type="button" 
              className="btn-outline mb-2"
              onClick={(e) => {
                e.stopPropagation();
                handleCapturePhoto();
              }}
            >
              <Camera size={18} className="mr-2" />
              Take Photo
            </button>
          </div>
        )}
        
        <button 
          className="btn-primary w-full"
          onClick={handleAnalyzeImage}
          disabled={!image || analyzing}
        >
          {analyzing ? (
            <>
              <Loader size={18} className="animate-spin mr-2" />
              Analyzing Image...
            </>
          ) : (
            <>
              <Search size={18} className="mr-2" />
              Analyze & Find Recipes
            </>
          )}
        </button>
      </div>
      
      {/* Identified Ingredients */}
      {identifiedIngredients.length > 0 && (
        <div className="bg-white rounded-lg shadow-card p-6">
          <h2 className="text-xl font-semibold mb-4">Identified Ingredients</h2>
          <div className="flex flex-wrap gap-2">
            {identifiedIngredients.map((ingredient, index) => (
              <div 
                key={index}
                className="bg-primary-50 rounded-full px-3 py-1 flex items-center text-primary-800"
              >
                <span>{ingredient}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recipe Results */}
      {identifiedIngredients.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recipe Matches</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-primary-500">
                <div className="flex justify-center">
                  <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="mt-4 text-gray-600">Finding the perfect recipes...</p>
            </div>
          ) : (
            <RecipeGrid 
              recipes={searchResults} 
              emptyMessage="No recipes found with these ingredients. Try a different image!" 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ImageRecognition;