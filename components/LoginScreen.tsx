import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAuth } from '../src/contexts/useAuth';

export const LoginScreen: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [learningGoal, setLearningGoal] = useState<'school' | 'career' | 'exams' | 'curious' | ''>('');
  const [learnerType, setLearnerType] = useState<'high_school' | 'university' | 'teacher' | 'professional' | ''>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedUsername) {
      setError(isLogin ? 'Please enter your username.' : 'Username is required.');
      return;
    }
    if (!isLogin) {
      if (!trimmedEmail) {
        setError('Email is required for registration.');
        return;
      }
      if (!trimmedFirstName || !trimmedLastName) {
        setError('Please provide your first and last name so we can personalise your experience.');
        return;
      }
      if (!learningGoal) {
        setError('Tell us what brings you to EduReach so we can tailor your journey.');
        setSignupStep(2);
        return;
      }
      if (!learnerType) {
        setError('Please choose the option that best describes you.');
        setSignupStep(2);
        return;
      }
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(trimmedUsername, password);
      } else {
        await register({
          username: trimmedUsername,
          email: trimmedEmail,
          password,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          learningGoal,
          learnerType,
          interests,
        });
      }

      setShowModal(false);
      setUsername('');
      setEmail('');
      setFirstName('');
      setLastName('');
      setLearningGoal('');
      setLearnerType('');
      setInterests([]);
      setSignupStep(1);
      setPassword('');
    } catch (err: any) {
      console.error('Authentication failed:', err);
      const data = err?.response?.data;
      if (!navigator.onLine) {
        setError('No backend connection. Reconnect to sign in, or continue with your last cached session if available.');
        return;
      }
      // Helpful debug logging in dev
      if (data) console.debug('Auth error response data:', data);
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
        // Prefer a server-provided message if present
        message = (data && typeof data === 'string' && data) || err?.message || 'Authentication failed. Please try again.';
      }
      // In development, append raw server JSON to help debugging (not shown to end users in production)
      if (process.env.NODE_ENV !== 'production' && data && typeof data === 'object') {
        message = `${message} — ${JSON.stringify(data)}`;
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
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-blue-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 dark:bg-orange-900/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-200/20 dark:bg-emerald-900/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Landing Page Content */}
      <div className="relative text-center p-8 max-w-md w-full z-10">
        <div className="flex justify-center items-center mb-6">
          <div className="relative">
            <SparklesIcon className="w-20 h-20 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl"></div>
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent mb-3">
          EduReach
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
          Your AI-powered study partner for YouTube videos
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold py-4 px-6 rounded-md hover:from-blue-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          Get Started
        </button>
      </div>
      {/* Beautiful Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => !isLoading && setShowModal(false)}
            aria-hidden
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-800 rounded-md p-6 sm:p-8 w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-2xl animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <SparklesIcon className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg"></div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              {isLogin ? 'Welcome Back' : 'Join EduReach'}
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
              {isLogin ? 'Sign in to continue your learning journey' : 'Start your learning adventure today'}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Login / Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  required
                  disabled={isLoading}
                  placeholder="Username"
                  aria-label="Username"
                />
              </div>

              {!isLogin ? (
                <div className="relative overflow-hidden">
                  <div className="flex transition-transform duration-300 ease-out" style={{ transform: signupStep === 1 ? 'translateX(0%)' : 'translateX(-100%)' }}>
                    <div className="w-full flex-shrink-0 space-y-3 pr-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400" disabled={isLoading} placeholder="First name" aria-label="First name" />
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400" disabled={isLoading} placeholder="Last name" aria-label="Last name" />
                      </div>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400" required disabled={isLoading} placeholder="Email" aria-label="Email" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400" required disabled={isLoading} placeholder="Password" minLength={8} aria-label="Password" />
                    </div>
                    <div className="w-full flex-shrink-0 space-y-3 pl-2">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">What brings you to EduReach?</p>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {(['school', 'career', 'exams', 'curious'] as const).map((g) => (
                          <button key={g} type="button" onClick={() => setLearningGoal(g)} disabled={isLoading}
                            className={`w-full text-left px-3 py-2 rounded-md border ${learningGoal === g ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40'}`}>
                            {g === 'school' && 'Stay on top of school / university courses'}
                            {g === 'career' && 'Grow my skills for career / projects'}
                            {g === 'exams' && 'Prepare for important exams or certifications'}
                            {g === 'curious' && 'Learn new topics and challenge myself for fun'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 mt-3">Which describes you best?</p>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {(['high_school', 'university', 'teacher', 'professional'] as const).map((t) => (
                          <button key={t} type="button" onClick={() => setLearnerType(t)} disabled={isLoading}
                            className={`w-full text-left px-3 py-2 rounded-md border ${learnerType === t ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40'}`}>
                            {t === 'high_school' && 'High school student'}
                            {t === 'university' && 'University student'}
                            {t === 'teacher' && 'Teacher / coach'}
                            {t === 'professional' && 'Professional / other'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 mt-3">What are you interested in? (optional)</p>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {[
                          { key: 'math', label: 'Mathematics & problem solving' },
                          { key: 'programming', label: 'Programming & computer science' },
                          { key: 'data_ai', label: 'Data, AI & analytics' },
                          { key: 'science', label: 'Science & engineering' },
                          { key: 'languages', label: 'Languages & communication' },
                          { key: 'exams_prep', label: 'Exam preparation' },
                          { key: 'career_skills', label: 'Career & professional skills' },
                          { key: 'creative', label: 'Creative skills (writing, art, music)' },
                        ].map(({ key, label }) => {
                          const active = interests.includes(key);
                          return (
                            <button key={key} type="button" onClick={() => setInterests((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key])} disabled={isLoading}
                              className={`w-full text-left px-3 py-2 rounded-md border ${active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40'}`}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <button type="button" disabled={signupStep === 1 || isLoading} onClick={() => setSignupStep(1)} className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 disabled:opacity-40">← Back</button>
                    <span>Step {signupStep} of 2</span>
                    <button type="button" disabled={signupStep === 2 || isLoading || !firstName.trim() || !lastName.trim() || !email.trim()} onClick={() => setSignupStep(2)} className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 disabled:opacity-40">Next →</button>
                  </div>
                </div>
              ) : (
                <div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400" required disabled={isLoading} placeholder="Password" minLength={8} aria-label="Password" />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-3 rounded-md font-bold hover:from-blue-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                {isLoading && (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isLoading ? (isLogin ? 'Signing in…' : 'Creating account…') : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Toggle Login/Signup */}
            <p className="mt-6 text-center text-slate-600 dark:text-slate-400 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSignupStep(1);
                }}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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