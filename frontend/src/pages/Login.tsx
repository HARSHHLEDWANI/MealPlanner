import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Loader, Utensils } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-primary-50 via-white to-secondary-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 mb-6 shadow-xl">
            <Utensils className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-800 mb-3">Pantry Chef</h1>
          <p className="text-lg text-neutral-600">Turn ingredients into delicious meals</p>
        </div>

        {/* Login Card */}
        <div className="bg-white shadow-2xl rounded-3xl p-8 border border-primary-100">
          <h2 className="text-2xl font-display font-semibold mb-6 text-primary-800">Welcome Back</h2>
          
          {success ? (
            <div className="bg-secondary-50/70 border-2 border-secondary-200 rounded-2xl p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary-100 mb-4">
                  <Mail className="h-6 w-6 text-secondary-600" />
                </div>
                <h3 className="text-xl font-display font-semibold text-secondary-800 mb-2">Check your inbox</h3>
                <p className="text-secondary-600">We've sent a magic link to {authType === 'email' ? email : phone}</p>
                <button 
                  className="mt-6 w-full px-4 py-3 rounded-xl border-2 border-secondary-200 text-secondary-700 hover:bg-secondary-100 transition-colors font-medium"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex border-2 border-primary-100 rounded-2xl mb-8 p-1 bg-primary-50/30">
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('email');
                    setMessage('');
                  }}
                  className={`flex-1 py-3 flex justify-center items-center rounded-xl transition-all ${
                    authType === 'email'
                      ? 'bg-white text-primary-600 shadow-md'
                      : 'text-primary-600 hover:bg-white/70'
                  }`}
                >
                  <Mail size={20} className="mr-2" />
                  <span className="font-medium">Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('phone');
                    setMessage('');
                  }}
                  className={`flex-1 py-3 flex justify-center items-center rounded-xl transition-all ${
                    authType === 'phone'
                      ? 'bg-white text-primary-600 shadow-md'
                      : 'text-primary-600 hover:bg-white/70'
                  }`}
                >
                  <Phone size={20} className="mr-2" />
                  <span className="font-medium">Phone</span>
                </button>
              </div>

              {message && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-100 text-red-600 text-sm font-medium">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {authType === 'email' ? (
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="input text-base"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-neutral-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className="input text-base"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-4 focus:ring-primary-500/20 transition-all font-semibold flex justify-center items-center disabled:opacity-70 shadow-xl shadow-primary-500/10"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>Send Magic Link</>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-neutral-500">
                By continuing, you agree to our{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;