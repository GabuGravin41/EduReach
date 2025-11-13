import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAuth } from '../src/contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !email) {
      setError('Email is required for registration');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }

      setShowModal(false);
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Authentication failed:', err);
      const data = err?.response?.data;
      let message =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0];

      if (!message && data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const value = (data as Record<string, unknown>)[firstKey];
        if (Array.isArray(value) && value.length > 0) {
          message = String(value[0]);
        } else if (typeof value === 'string') {
          message = value;
        }
      }

      if (!message) {
        message = err?.message || 'Authentication failed. Please try again.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSocialLogin = (provider: 'google' | 'github') => {
    console.log(`Attempting social login with ${provider}`);
    setError(`Social login via ${provider} is not implemented in this demo.`);
    // For a demo, you could also just log the user in:
    // setIsLoading(true);
    // setTimeout(() => onLogin(), 1000);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
      {/* Landing Page Content */}
      <div className="text-center p-8 max-w-md w-full">
        <div className="flex justify-center items-center mb-6">
          <SparklesIcon className="w-16 h-16 text-indigo-500" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          EduReach
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Your AI-powered study partner for YouTube videos.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300"
        >
          Get Started
        </button>
      </div>
      {/* Glassmorphism Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white/20 backdrop-blur-xl rounded-3xl p-5 sm:p-7 w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto border border-white/30 shadow-2xl animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              ×
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <SparklesIcon className="w-14 h-14 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-center text-white mb-1">
              {isLogin ? 'Welcome Back' : 'Join EduReach'}
            </h2>
            <p className="text-center text-white/80 mb-4">
              {isLogin ? 'Sign in to continue your learning journey' : 'Start your learning adventure today'}
            </p>

            {/* Social Login Buttons */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center space-x-3 bg-white/90 hover:bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                onClick={() => handleSocialLogin('github')}
                className="w-full flex items-center justify-center space-x-3 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-white/30"></div>
              <span className="px-4 text-white/70 text-sm">or</span>
              <div className="flex-1 border-t border-white/30"></div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-white rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-black placeholder-white/60 transition-colors"
                  required
                  disabled={isLoading}
                  placeholder="Username"
                  aria-label="Username"
                />
              </div>

              {!isLogin && (
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-black placeholder-white/60 transition-colors"
                    required={!isLogin}
                    disabled={isLoading}
                    placeholder="Email"
                    aria-label="Email"
                  />
                </div>
              )}

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-black placeholder-white/60 transition-colors"
                  required
                  disabled={isLoading}
                  placeholder="Password"
                  minLength={8}
                  aria-label="Password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-indigo-600 py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Toggle Login/Signup */}
            <p className="mt-4 text-center text-white/80 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-white font-semibold hover:underline"
                disabled={isLoading}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};