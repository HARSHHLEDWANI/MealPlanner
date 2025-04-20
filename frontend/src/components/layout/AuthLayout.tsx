import React from 'react';
import { Outlet } from 'react-router-dom';
import { Utensils } from 'lucide-react';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex flex-col lg:flex-row">
      {/* Left side - Image and branding */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 text-center lg:text-left bg-primary-500 bg-opacity-10">
        <div className="max-w-md mx-auto lg:mx-0">
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <Utensils className="h-10 w-10 text-primary-500 mr-2" />
            <h1 className="text-4xl font-bold text-primary-600">Pantry Chef</h1>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-800">
            Turn your ingredients into delicious meals
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Find recipes based on what you already have. No more wasted food or complicated shopping lists.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-card">
              <div className="font-semibold text-primary-600 mb-2">Snap Photo</div>
              <p className="text-sm text-gray-600">Take a picture of your ingredients and let AI find recipes</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-card">
              <div className="font-semibold text-primary-600 mb-2">Leftover Magic</div>
              <p className="text-sm text-gray-600">Transform random ingredients into amazing meals</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-card">
              <div className="font-semibold text-primary-600 mb-2">Meal Planning</div>
              <p className="text-sm text-gray-600">Plan your weekly meals with easy drag-and-drop</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-card">
              <div className="font-semibold text-primary-600 mb-2">Smart Lists</div>
              <p className="text-sm text-gray-600">Generate grocery lists directly from your planned meals</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Authentication form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;