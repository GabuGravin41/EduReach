import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { useAuth } from '../src/contexts/useAuth';

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export const LoginScreen: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const passwordStrength = password.length === 0 ? null : password.length < 8 ? 'weak' : password.length < 12 ? 'good' : 'strong';

  const resetForm = () => {
    setUsername(''); setEmail(''); setFirstName(''); setLastName('');
    setLearningGoal(''); setLearnerType(''); setInterests([]);
    setSignupStep(1); setPassword(''); setShowPassword(false); setError('');
  };

  const openLogin = () => { resetForm(); setIsLogin(true); setShowAuth(true); };
  const openSignup = () => { resetForm(); setIsLogin(false); setShowAuth(true); };
  const closeAuth = () => { if (!isLoading) { setShowAuth(false); resetForm(); } };

  const canGoToStep2 = username.trim() && firstName.trim() && lastName.trim() && email.trim();

  const handleNextStep = () => {
    if (!username.trim()) { setError('Please enter a username.'); return; }
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return; }
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setSignupStep(2);
  };

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
      if (!trimmedEmail) { setError('Email is required.'); return; }
      if (!trimmedFirstName || !trimmedLastName) { setError('Please enter your first and last name.'); return; }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        setSignupStep(1);
        return;
      }
      if (!learningGoal) {
        setError('Please tell us what brings you to EduReach.');
        setSignupStep(2);
        return;
      }
      if (!learnerType) {
        setError('Please choose the option that best describes you.');
        setSignupStep(2);
        return;
      }
    }
    if (isLogin && !password) {
      setError('Please enter your password.');
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
      setShowAuth(false);
      resetForm();
    } catch (err: any) {
      const data = err?.response?.data;
      if (!navigator.onLine) {
        setError('No internet connection. Please check your network and try again.');
        return;
      }
      let message = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0];
      if (!message && data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const value = (data as Record<string, unknown>)[firstKey];
        if (Array.isArray(value) && value.length > 0) message = String(value[0]);
        else if (typeof value === 'string') message = value;
      }
      if (!message) {
        message = (data && typeof data === 'string' && data) || err?.message || 'Authentication failed. Please try again.';
      }
      if (process.env.NODE_ENV !== 'production' && data && typeof data === 'object') {
        message = `${message} — ${JSON.stringify(data)}`;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all text-sm";

  const goalOptions = [
    { value: 'school', icon: '🎓', label: 'School & university', desc: 'Stay on top of coursework' },
    { value: 'career', icon: '💼', label: 'Career growth', desc: 'Build professional skills' },
    { value: 'exams', icon: '📝', label: 'Exam preparation', desc: 'Ace certifications & tests' },
    { value: 'curious', icon: '🔭', label: 'Personal curiosity', desc: 'Explore topics I love' },
  ] as const;

  const typeOptions = [
    { value: 'high_school', icon: '🏫', label: 'High school student' },
    { value: 'university', icon: '🎓', label: 'University student' },
    { value: 'teacher', icon: '👨‍🏫', label: 'Teacher or coach' },
    { value: 'professional', icon: '💼', label: 'Working professional' },
  ] as const;

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      {/* Landing */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
        {/* Logo mark */}
        <img src="/logo-no-name.jpeg" className="h-24 sm:h-28 object-contain mb-4 drop-shadow-lg" alt="EduReach" />

        <h1 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          Edu<span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Reach</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-2 font-medium">
          Learn smarter. Study together. Excel further.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-10">
          AI-powered courses &middot; Assessments &middot; Study Groups
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {['AI Tutor', 'Video Lessons', 'Live Quizzes', 'Study Groups', 'Leaderboards'].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-sm">
              {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3 max-w-sm">
          <button
            onClick={openSignup}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started free
          </button>
          <button
            onClick={openLogin}
            className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold py-3.5 px-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Sign in
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={closeAuth}
            aria-hidden
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden my-auto animate-auth-in">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-600" />

            <div className="p-8">
              {/* Close */}
              <button
                onClick={closeAuth}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center mb-3">
                  <img src="/logo.jpeg" className="h-12 object-contain" alt="EduReach" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isLogin ? 'Welcome back' : signupStep === 1 ? 'Create your account' : 'Tell us about yourself'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {isLogin
                    ? 'Sign in to continue your learning journey'
                    : signupStep === 1
                    ? 'Step 1 of 2 — Account details'
                    : 'Step 2 of 2 — Personalise your experience'}
                </p>
              </div>

              {/* Step indicator (signup only) */}
              {!isLogin && (
                <div className="flex items-center gap-2 mb-6">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${signupStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {signupStep > 1 ? <CheckIcon className="w-3.5 h-3.5" /> : '1'}
                  </div>
                  <div className={`flex-1 h-0.5 rounded-full transition-all ${signupStep > 1 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${signupStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    2
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-5 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* LOGIN FORM */}
                {isLogin && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputClass}
                      disabled={isLoading}
                      placeholder="Username"
                      autoComplete="username"
                      autoFocus
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-11`}
                        disabled={isLoading}
                        placeholder="Password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGNUP STEP 1 */}
                {!isLogin && signupStep === 1 && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputClass}
                      disabled={isLoading}
                      placeholder="Username"
                      autoComplete="username"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputClass}
                        disabled={isLoading}
                        placeholder="First name"
                        autoComplete="given-name"
                      />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                        disabled={isLoading}
                        placeholder="Last name"
                        autoComplete="family-name"
                      />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      disabled={isLoading}
                      placeholder="Email address"
                      autoComplete="email"
                    />
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClass} pr-11`}
                          disabled={isLoading}
                          placeholder="Password"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Password hint */}
                      <div className="flex items-center gap-2 px-1">
                        {password.length > 0 && (
                          <>
                            <div className="flex gap-1 flex-1">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-all ${
                                    passwordStrength === 'weak' && i === 1 ? 'bg-red-400' :
                                    passwordStrength === 'good' && i <= 2 ? 'bg-amber-400' :
                                    passwordStrength === 'strong' ? 'bg-emerald-500' :
                                    'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs font-medium ${
                              passwordStrength === 'weak' ? 'text-red-500' :
                              passwordStrength === 'good' ? 'text-amber-500' :
                              'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {passwordStrength === 'weak' ? `${8 - password.length} more needed` :
                               passwordStrength === 'good' ? 'Good' : 'Strong'}
                            </span>
                          </>
                        )}
                        {password.length === 0 && (
                          <span className="text-xs text-slate-400">Minimum 8 characters</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SIGNUP STEP 2 */}
                {!isLogin && signupStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">What brings you here?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {goalOptions.map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => setLearningGoal(g.value)}
                            disabled={isLoading}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${
                              learningGoal === g.value
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                            }`}
                          >
                            <div className="text-xl mb-1">{g.icon}</div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{g.label}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{g.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Which best describes you?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {typeOptions.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setLearnerType(t.value)}
                            disabled={isLoading}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                              learnerType === t.value
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                            }`}
                          >
                            <span className="text-lg">{t.icon}</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div className="mt-6 space-y-3">
                  {!isLogin && signupStep === 1 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isLoading || !canGoToStep2}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-500/20 transition-all"
                    >
                      Continue
                    </button>
                  ) : !isLogin && signupStep === 2 ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSignupStep(1); setError(''); }}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        {isLoading && (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {isLoading ? 'Creating account...' : 'Create account'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading && (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  )}

                  <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => { setIsLogin(!isLogin); setError(''); setSignupStep(1); }}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      disabled={isLoading}
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes auth-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .animate-auth-in { animation: auth-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};
