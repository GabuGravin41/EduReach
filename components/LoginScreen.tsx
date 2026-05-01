import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/useAuth';
import { authService } from '../src/services/authService';

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

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const INTEREST_TAGS = [
  'Programming', 'Mathematics', 'Science', 'History', 'English', 'Business',
  'Medicine', 'Law', 'Engineering', 'Economics', 'Arts', 'Philosophy',
  'Chemistry', 'Biology', 'Physics', 'Geography',
];

const UNIVERSITY_FIELDS = [
  'Computer Science', 'Engineering', 'Medicine', 'Law', 'Business & Finance',
  'Arts & Humanities', 'Natural Sciences', 'Social Sciences', 'Education', 'Other',
];

const HIGH_SCHOOL_SUBJECTS = [
  'Mathematics', 'English', 'Sciences', 'History & Geography', 'Business Studies',
  'Computer Studies', 'Art & Design', 'Languages', 'Physical Education',
];

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: (callback?: (n: any) => void) => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

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
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password state
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSent, setFpSent] = useState(false);
  const [fpError, setFpError] = useState('');

  // Google Sign-In state
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const { login, register } = useAuth();

  const passwordStrength = password.length === 0 ? null : password.length < 8 ? 'weak' : password.length < 12 ? 'good' : 'strong';

  // Load Google GSI script when the modal is open
  useEffect(() => {
    if (!googleClientId || !showAuth) return;
    if (document.getElementById('gsi-script')) return;

    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };
    document.head.appendChild(script);
  }, [googleClientId, showAuth]);

  const handleGoogleCredential = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError('');
    try {
      await authService.googleLogin(response.credential);
      setShowAuth(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Google sign-in failed. Please try again or use email.';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleButtonClick = () => {
    if (!googleClientId) {
      setError('Google Sign-In is not yet configured on this server. Please use email and password.');
      return;
    }
    if (!window.google?.accounts?.id) {
      setError('Google Sign-In is still loading. Please wait a moment and try again.');
      return;
    }
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        setError('Google Sign-In could not open. Please disable any popup blockers and try again, or use email and password.');
      }
    });
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setFpError('Please enter your email address.'); return; }
    setFpLoading(true);
    setFpError('');
    try {
      await authService.passwordReset(fpEmail.trim());
      setFpSent(true);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.email?.[0] || data?.detail || data?.non_field_errors?.[0] || 'Failed to send reset email. Please try again.';
      setFpError(msg);
    } finally {
      setFpLoading(false);
    }
  };

  const resetForm = () => {
    setUsername(''); setEmail(''); setFirstName(''); setLastName('');
    setLearningGoal(''); setLearnerType(''); setFieldOfStudy(''); setInterests([]);
    setSignupStep(1); setPassword(''); setShowPassword(false); setError('');
    setShowForgotPwd(false); setFpEmail(''); setFpSent(false); setFpError('');
  };

  const openLogin = () => { resetForm(); setIsLogin(true); setShowAuth(true); };
  const openSignup = () => { resetForm(); setIsLogin(false); setShowAuth(true); };
  const closeAuth = () => { if (!isLoading && !fpLoading) { setShowAuth(false); resetForm(); } };

  const canGoToStep2 = username.trim() && firstName.trim() && lastName.trim() && email.trim();

  const handleNextStep = () => {
    if (!username.trim()) { setError('Please enter a username.'); return; }
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return; }
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setSignupStep(2);
  };

  const toggleInterest = (tag: string) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]);
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
        // Combine field of study with interests for richer context
        const allInterests = fieldOfStudy
          ? [fieldOfStudy, ...interests].filter(Boolean)
          : interests;
        await register({
          username: trimmedUsername,
          email: trimmedEmail,
          password,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          learningGoal,
          learnerType,
          interests: allInterests,
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

  const fieldOptions = learnerType === 'university' ? UNIVERSITY_FIELDS
    : learnerType === 'high_school' ? HIGH_SCHOOL_SUBJECTS
    : null;

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

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {['AI Tutor', 'Video Lessons', 'Live Quizzes', 'Study Groups', 'Leaderboards'].map((f) => (
            <span key={f} className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-sm">
              {f}
            </span>
          ))}
        </div>

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
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-600" />

            <div className="p-8">
              <button
                onClick={closeAuth}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* ── FORGOT PASSWORD VIEW ── */}
              {showForgotPwd ? (
                <div>
                  <div className="mb-7">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>

                  {fpSent ? (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Check your inbox</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        If <strong>{fpEmail}</strong> is registered, you'll receive a password reset link shortly.
                      </p>
                      <button
                        onClick={() => { setShowForgotPwd(false); setFpSent(false); setFpEmail(''); }}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-sm"
                      >
                        Back to sign in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordReset} noValidate>
                      {fpError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-xl text-sm">
                          {fpError}
                        </div>
                      )}
                      <input
                        type="email"
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        className={inputClass}
                        placeholder="Email address"
                        autoComplete="email"
                        autoFocus
                        disabled={fpLoading}
                      />
                      <div className="mt-4 space-y-2">
                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                          {fpLoading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                          {fpLoading ? 'Sending…' : 'Send reset link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowForgotPwd(false); setFpError(''); setFpEmail(''); }}
                          className="w-full py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                        >
                          Back to sign in
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* ── MAIN AUTH VIEW ── */
                <>
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
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => { setShowForgotPwd(true); setError(''); }}
                            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                          >
                            Forgot password?
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
                              placeholder="Password (min. 8 characters)"
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
                                  {passwordStrength === 'weak' ? `${8 - password.length} more chars needed` :
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

                    {/* SIGNUP STEP 2 — Personalisation */}
                    {!isLogin && signupStep === 2 && (
                      <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
                        {/* What brings you here */}
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

                        {/* Which best describes you */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Which best describes you?</p>
                          <div className="grid grid-cols-2 gap-2">
                            {typeOptions.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => { setLearnerType(t.value); setFieldOfStudy(''); }}
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

                        {/* Field of study — shown only for university / high school */}
                        {fieldOptions && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                              {learnerType === 'university' ? 'Field of study' : 'Main subjects'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {fieldOptions.map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => setFieldOfStudy(prev => prev === f ? '' : f)}
                                  disabled={isLoading}
                                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                                    fieldOfStudy === f
                                      ? 'border-indigo-500 bg-indigo-500 text-white'
                                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                                  }`}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interests — shown for everyone */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Topics you're interested in <span className="font-normal normal-case text-slate-400">(optional — pick any)</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {INTEREST_TAGS.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleInterest(tag)}
                                disabled={isLoading}
                                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                                  interests.includes(tag)
                                    ? 'border-purple-500 bg-purple-500 text-white'
                                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-purple-400'
                                }`}
                              >
                                {tag}
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
                            {isLoading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                            {isLoading ? 'Creating account…' : 'Create account'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                          {isLoading ? 'Signing in…' : 'Sign in'}
                        </button>
                      )}

                      {/* Google Sign-In — shown on login and step 1 of signup */}
                      {(isLogin || signupStep === 1) && (
                        <>
                          <div className="relative flex items-center py-1">
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
                            <span className="flex-shrink-0 mx-4 text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
                          </div>

                          <button
                            type="button"
                            onClick={handleGoogleButtonClick}
                            disabled={isLoading || googleLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-60"
                          >
                            {googleLoading
                              ? <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              : <GoogleIcon className="w-5 h-5" />
                            }
                            {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
                          </button>
                        </>
                      )}

                      <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-2">
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
                  <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</a>.
                  </div>
                </>
              )}
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
