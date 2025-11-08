import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
//import { useAuth } from '../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
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
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        if (!email) {
          setError('Email is required for registration');
          setIsLoading(false);
          return;
        }
        await register(username, email, password);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.non_field_errors?.[0] ||
                          err.response?.data?.username?.[0] ||
                          err.response?.data?.email?.[0] ||
                          'Authentication failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex justify-center items-center mb-6">
          <SparklesIcon className="w-12 h-12 text-indigo-500" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-800 dark:text-slate-100">
          EduReach
        </h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
          Your AI-powered study partner
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              required
              disabled={isLoading}
              placeholder="Enter your username"
            />
          </div>

          {!isLogin && (
            <div className="mb-4">
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                required={!isLogin}
                disabled={isLoading}
                placeholder="Enter your email"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              required
              disabled={isLoading}
              placeholder="Enter your password"
              minLength={8}
            />
            {!isLogin && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            disabled={isLoading}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};


// I want the login screen to be a two part page...the first part showing the landing page in loginScreenBackup and then when user clicks get started a pop up that looks almost like glass with the back ground which is still that page persisting but blurred a bit..the glossy pop up has functionality for login form, entering credentials and all with the option of sign up if one has no account and things like sign in with google, or github...this UI is key to capture...so the first page code you can check it and use it without changing it...and then you can work on that pop up and see how to link things 
// i thought of this

// </div>

//       {/* Glassmorphism Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
//           {/* Backdrop */}
//           <div 
//             className="absolute inset-0 bg-black/30 backdrop-blur-sm"
//             onClick={() => setShowModal(false)}
//           />
          
//           {/* Modal */}
//           <div className="relative bg-white/20 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/30 shadow-2xl animate-scale-in">
//             {/* Close Button */}
//             <button
//               onClick={() => setShowModal(false)}
//               className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
//             >
//               ×
//             </button>

//             {/* Logo */}
//             <div className="flex justify-center mb-6">
//               <SparklesIcon className="w-16 h-16 text-white" />
//             </div>

//             {/* Title */}
//             <h2 className="text-3xl font-bold text-center text-white mb-2">
//               {isLogin ? 'Welcome Back' : 'Join EduReach'}
//             </h2>
//             <p className="text-center text-white/80 mb-6">
//               {isLogin ? 'Sign in to continue your learning journey' : 'Start your learning adventure today'}
//             </p>

//             {/* Social Login Buttons */}
//             <div className="space-y-3 mb-6">
//               <button
//                 onClick={() => handleSocialLogin('google')}
//                 className="w-full flex items-center justify-center space-x-3 bg-white/90 hover:bg-white text-gray-700 px-4 py-3 rounded-xl font-medium transition-all"
//               >
//                 <svg className="w-5 h-5" viewBox="0 0 24 24">
//                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
//                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
//                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
//                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
//                 </svg>
//                 <span>Continue with Google</span>
//               </button>

//               <button
//                 onClick={() => handleSocialLogin('github')}
//                 className="w-full flex items-center justify-center space-x-3 bg-gray-900 hover:bg-gray-800 text-white px-4 py-3 rounded-xl font-medium transition-all"
//               >
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
//                 </svg>
//                 <span>Continue with GitHub</span>
//               </button>
//             </div>

//             {/* Divider */}
//             <div className="flex items-center mb-6">
//               <div className="flex-1 border-t border-white/30"></div>
//               <span className="px-4 text-white/70 text-sm">or</span>
//               <div className="flex-1 border-t border-white/30"></div>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div className="mb-4 p-3 bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-white rounded-xl text-sm">
//                 {error}
//               </div>
//             )}

//             {/* Login Form */}
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div>
//                 <input
//                   type="text"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
//                   required
//                   disabled={isLoading}
//                   placeholder="Username"
//                 />
//               </div>

//               {!isLogin && (
//                 <div>
//                   <input
//                     type="email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
//                     required={!isLogin}
//                     disabled={isLoading}
//                     placeholder="Email"
//                   />
//                 </div>
//               )}

//               <div>
//                 <input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
//                   required
//                   disabled={isLoading}
//                   placeholder="Password"
//                   minLength={8}
//                 />
//               </div>

//               <button
//                 type="submit"
//                 disabled={isLoading}
//                 className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
//               </button>
//             </form>

//             {/* Toggle Login/Signup */}
//             <p className="mt-6 text-center text-white/80 text-sm">
//               {isLogin ? "Don't have an account? " : "Already have an account? "}
//               <button
//                 onClick={() => {
//                   setIsLogin(!isLogin);
//                   setError('');
//                 }}
//                 className="text-white font-semibold hover:underline"
//                 disabled={isLoading}
//               >
//                 {isLogin ? 'Sign Up' : 'Sign In'}
//               </button>
//             </p>
//           </div>
//         </div>
//       )}

//       <style>{`
//         @keyframes scale-in {
//           from {
//             opacity: 0;
//             transform: scale(0.9);
//           }
//           to {
//             opacity: 1;
//             transform: scale(1);
//           }
//         }
//         .animate-scale-in {
//           animation: scale-in 0.3s ease-out;
//         }
//       `}</style>
//     </div>

