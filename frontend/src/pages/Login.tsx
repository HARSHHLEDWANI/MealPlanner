import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Loader } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Login: React.FC = () => {
  const [authType, setAuthType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { signIn, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // In a real app, you would handle phone authentication differently
      // For this demo, we'll just simulate it by using email auth
      const { success, error } = await signIn(authType === 'email' ? email : phone);
      
      if (success) {
        setSuccess(true);
        setMessage('Check your inbox for a login link.');
      } else if (error) {
        setMessage(error);
      }
    } catch (err) {
      setMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-card rounded-lg p-6 md:p-8">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Welcome to Pantry Chef</h2>
      
      {success ? (
        <div className="bg-secondary-50 border border-secondary-200 rounded-md p-4 text-secondary-800">
          <p className="font-medium mb-2">Check your inbox</p>
          <p className="text-sm">We've sent a magic link to {authType === 'email' ? email : phone}.</p>
          <button 
            className="mt-4 btn-outline w-full"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      ) : (
        <>
          <div className="flex border border-gray-200 rounded-md mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthType('email');
                setMessage('');
              }}
              className={`flex-1 py-2 flex justify-center items-center ${
                authType === 'email'
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Mail size={16} className="mr-2" />
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthType('phone');
                setMessage('');
              }}
              className={`flex-1 py-2 flex justify-center items-center ${
                authType === 'phone'
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Phone size={16} className="mr-2" />
              Phone
            </button>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {authType === 'email' ? (
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex justify-center items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>Send Magic Link</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </>
      )}
    </div>
  );
};

export default Login;