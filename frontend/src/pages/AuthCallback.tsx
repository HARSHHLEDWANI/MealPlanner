import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error during auth callback:', error);
        navigate('/login');
        return;
      }

      // Successfully authenticated
      navigate('/');
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-neutral-700">Completing login...</h2>
        <p className="text-neutral-500 mt-2">Please wait while we verify your credentials.</p>
      </div>
    </div>
  );
};

export default AuthCallback; 