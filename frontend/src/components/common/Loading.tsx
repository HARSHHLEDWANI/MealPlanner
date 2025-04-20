import React from 'react';
import { Utensils } from 'lucide-react';

const Loading: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
      <div className="animate-pulse">
        <Utensils className="h-16 w-16 text-primary-500 mb-4" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Loading...</h2>
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full animate-loading"></div>
      </div>
    </div>
  );
};

export default Loading;