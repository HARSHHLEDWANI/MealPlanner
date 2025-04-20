import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Components
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Loading from './components/common/Loading';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IngredientSearch from './pages/IngredientSearch';
import ImageRecognition from './pages/ImageRecognition';
import MealPlanner from './pages/MealPlanner';
import GroceryList from './pages/GroceryList';
import LeftoverMagic from './pages/LeftoverMagic';
import RecipeDetails from './pages/RecipeDetails';
import AuthCallback from './pages/AuthCallback';

function App() {
  const { authState, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authState === 'LOADING') {
    return <Loading />;
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ingredient-search" element={<IngredientSearch />} />
          <Route path="/image-recognition" element={<ImageRecognition />} />
          <Route path="/meal-planner" element={<MealPlanner />} />
          <Route path="/grocery-list" element={<GroceryList />} />
          <Route path="/leftover-magic" element={<LeftoverMagic />} />
          <Route path="/recipe/:id" element={<RecipeDetails />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to={authState === 'AUTHENTICATED' ? '/dashboard' : '/login'} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;