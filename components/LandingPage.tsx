import React, { useEffect, useRef, useState } from 'react';

// ─── Inline SVG Icons (self-contained, no app dependency) ────────────────────

const Logo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
    <path d="M10 28L20 12L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 22H26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
  </svg>
);

const Icon: React.FC<{ path: string; className?: string }> = ({ path, className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRight: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ─── Animated counter hook ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ─── Intersection observer hook ───────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Feature card data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    title: 'AI-Powered Learning',
    desc: 'Get instant explanations, generate quizzes from any topic, and receive personalised feedback powered by Gemini AI.',
    accent: 'from-indigo-500 to-violet-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    iconColor: 'text-indigo-600',
  },
  {
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    title: 'Assessments & Quizzes',
    desc: 'Take timed exams, quick quizzes, or advanced practice sets on any subject — from everyday coursework to high-level competition prep.',
    accent: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-600',
  },
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    title: 'Study Groups',
    desc: 'Create or join groups, run group challenges, share resources, and compete on live leaderboards with your classmates.',
    accent: 'from-teal-500 to-emerald-600',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    iconColor: 'text-teal-600',
  },
  {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    title: 'Deep Analytics',
    desc: 'Track XP, streaks, score trends, time spent, and per-topic mastery — everything you need to measure real growth.',
    accent: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    iconColor: 'text-rose-600',
  },
  {
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    title: 'Rich Course Builder',
    desc: 'Build courses from YouTube videos, add AI-generated quizzes per lesson, track student progress, and publish to your community.',
    accent: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-600',
  },
  {
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    title: 'Community & Discussions',
    desc: 'Ask questions, share notes, upvote helpful answers, and learn together in a vibrant academic community.',
    accent: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Create your free account',
    desc: 'Sign up in under a minute. No credit card needed. Start with a 14-day Pro trial so you can explore everything.',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    num: '02',
    title: 'Pick a course or assessment',
    desc: 'Browse courses built by educators, take assessments on any subject, or let our AI generate a custom quiz from any topic.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    num: '03',
    title: 'Learn, compete and grow',
    desc: 'Complete lessons, earn XP, climb leaderboards in study groups, and watch your analytics track every step forward.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
];

const PRICING = [
  {
    tier: 'Free',
    price: 0,
    priceLabel: 'KES 0',
    period: 'forever',
    desc: 'Perfect for curious learners just getting started.',
    cta: 'Get Started',
    highlight: false,
    features: [
      '15 AI tutor queries / month',
      'Up to 2 courses',
      'Up to 3 assessments',
      'Community access',
      '14-day Pro trial included',
    ],
    missing: ['Study groups', 'Analytics dashboard', 'Priority support'],
  },
  {
    tier: 'Starter',
    price: 399,
    priceLabel: 'KES 399',
    period: 'per month',
    usd: '$2.99',
    desc: 'For serious students who want more AI power and content.',
    cta: 'Start Free Trial',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '100 AI tutor queries / month',
      'Up to 5 courses',
      'Up to 15 assessments',
      'Community access',
      '14-day Pro trial included',
    ],
    missing: ['Study groups', 'Analytics dashboard'],
  },
  {
    tier: 'Pro',
    price: 999,
    priceLabel: 'KES 999',
    period: 'per month',
    usd: '$7.99',
    desc: 'For educators and competitive students who want it all.',
    cta: 'Start Free Trial',
    highlight: false,
    features: [
      '500 AI tutor queries / month',
      'Unlimited courses & assessments',
      'Study groups & group challenges',
      'Full analytics dashboard',
      'Premium AI (Gemini 2.5 Pro)',
      'Priority support',
    ],
    missing: [],
  },
];

// ─── Stat card with counter ───────────────────────────────────────────────────

const StatCounter: React.FC<{ value: number; suffix: string; label: string; start: boolean }> = ({ value, suffix, label, start }) => {
  const count = useCountUp(value, 1600, start);
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold text-white">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 text-sm text-white/60 font-medium">{label}</div>
    </div>
  );
};

// ─── Mock dashboard preview ───────────────────────────────────────────────────

const DashboardMockup: React.FC = () => (
  <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none" aria-hidden>
    {/* Outer glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent rounded-3xl blur-3xl scale-110" />

    {/* Browser chrome */}
    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/60 border border-white/10 bg-slate-900">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-rose-500/70" />
        <div className="w-3 h-3 rounded-full bg-amber-400/70" />
        <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
        <div className="flex-1 mx-4 h-5 bg-slate-700/60 rounded-md flex items-center px-3">
          <span className="text-slate-400 text-[10px]">app.edureach.site/dashboard</span>
        </div>
      </div>

      {/* App content */}
      <div className="p-5 bg-slate-900 space-y-4">
        {/* Hero welcome bar */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-5">
          <div className="h-3 w-32 bg-white/30 rounded-full mb-2" />
          <div className="h-5 w-48 bg-white/80 rounded-full mb-4" />
          <div className="flex gap-3 mt-5">
            <div className="h-9 w-24 bg-white rounded-lg" />
            <div className="h-9 w-28 bg-white/20 rounded-lg border border-white/30" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {['Day Streak', 'Total XP', 'Lessons Done'].map((l) => (
              <div key={l} className="bg-white/15 rounded-lg p-2">
                <div className="h-4 w-8 bg-white/80 rounded mb-1" />
                <div className="h-2.5 w-12 bg-white/40 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {['Courses', 'Assessments', 'Avg Score', 'Level'].map((s, i) => (
            <div key={s} className="bg-slate-800 rounded-xl p-3 border border-white/5">
              <div className={`h-2 w-${i === 2 ? '10' : '8'} rounded bg-indigo-500/60 mb-2`} />
              <div className="h-4 w-6 bg-white/80 rounded" />
              <div className="h-2 w-10 bg-slate-600 rounded mt-1" />
            </div>
          ))}
        </div>

        {/* Course cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Biology', pct: 72, color: 'from-indigo-500 to-violet-500' },
            { title: 'Business Studies', pct: 45, color: 'from-amber-500 to-orange-500' },
          ].map((c) => (
            <div key={c.title} className="bg-slate-800 rounded-xl overflow-hidden border border-white/5">
              <div className={`h-20 bg-gradient-to-br ${c.color} relative flex items-center justify-center`}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded bg-white/60" />
                </div>
              </div>
              <div className="p-3">
                <div className="h-2.5 w-24 bg-white/70 rounded mb-2" />
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${c.color} rounded-full`} style={{ width: `${c.pct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <div className="h-1.5 w-8 bg-slate-600 rounded" />
                  <div className="h-1.5 w-6 bg-indigo-400/60 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Main landing page ────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const statsRef = useInView(0.3);
  const featuresRef = useInView(0.1);
  const stepsRef = useInView(0.1);
  const pricingRef = useInView(0.1);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToApp = () => { window.location.href = '/dashboard'; };

  return (
    <div className="bg-white text-slate-900 antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-8px) rotate(-1.5deg); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70%  { box-shadow: 0 0 0 16px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .animate-fade-up   { animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) both; }
        .animate-fade-in   { animation: fadeIn 0.6s ease both; }
        .animate-float-a   { animation: floatA 6s ease-in-out infinite; }
        .animate-float-b   { animation: floatB 8s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2.5s ease-out infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <Logo className="w-8 h-8" />
              <span className="text-white font-bold text-lg tracking-tight">EduReach</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Pricing', href: '#pricing' },
              ].map(({ label, href }) => (
                <a key={label} href={href}
                  className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">
                  {label}
                </a>
              ))}
            </nav>

            {/* CTA buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button onClick={goToApp}
                className="px-4 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/8 transition-all font-medium">
                Sign in
              </button>
              <button onClick={goToApp}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30">
                Get Started Free
              </button>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/8 transition-all">
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/8 px-4 py-4 space-y-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Pricing', href: '#pricing' },
            ].map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/8 transition-all">
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/8 space-y-2">
              <button onClick={goToApp} className="w-full px-4 py-3 rounded-lg text-white/80 hover:bg-white/8 text-left transition-all text-sm">
                Sign in
              </button>
              <button onClick={goToApp} className="w-full px-4 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all">
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-ring" />
                AI-powered education platform
              </div>

              {/* Headline */}
              <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-white">
                Learn Smarter.<br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  Compete Better.
                </span><br />
                Achieve More.
              </h1>

              {/* Sub-headline */}
              <p className="animate-fade-up delay-200 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-lg">
                EduReach combines AI tutoring, smart assessments, study groups, and deep analytics — everything a serious student needs in one platform.
              </p>

              {/* CTAs */}
              <div className="animate-fade-up delay-300 flex flex-wrap gap-4">
                <button onClick={goToApp}
                  className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-all shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/50 hover:-translate-y-0.5">
                  Start for Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#how-it-works"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 font-semibold text-base transition-all">
                  See how it works
                </a>
              </div>

              {/* Trust signals */}
              <div className="animate-fade-up delay-400 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  14-day Pro trial
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  Free plan available
                </span>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="animate-fade-up delay-300 animate-float-a hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 py-16">
        <div ref={statsRef.ref} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-4">
            {[
              { value: 2500, suffix: '+', label: 'Questions in Bank' },
              { value: 50,   suffix: '+', label: 'Courses Available' },
              { value: 800,  suffix: '+', label: 'Assessments Taken' },
              { value: 98,   suffix: '%', label: 'Student Satisfaction' },
            ].map((stat) => (
              <StatCounter key={stat.label} start={statsRef.inView} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section id="features" className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featuresRef.ref} className={`text-center mb-16 transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-5">
              <Icon path="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" className="w-4 h-4" />
              Everything you need to excel
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
              One platform. Every tool<br className="hidden sm:block" /> a serious student needs.
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              From AI-generated quizzes to rich courses built by real educators — EduReach gives you the depth and breadth that generic study apps simply can&apos;t match.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`group p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${f.bg} transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: featuresRef.inView ? `${i * 60}ms` : '0ms' }}>
                <div className={`inline-flex p-3 rounded-xl bg-white shadow-sm mb-4 ${f.iconColor}`}>
                  <Icon path={f.icon} className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ASSESSMENTS HIGHLIGHT ─────────────────────────────────────── */}
      <section className="py-24 bg-slate-950 overflow-hidden relative">
        <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — visual */}
            <div className="order-2 lg:order-1 animate-float-b">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
                <div className="px-5 py-4 border-b border-white/5 bg-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-slate-300 text-sm font-semibold">Biology — Cell Division Quiz</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">Question 3 of 10</span>
                </div>
                <div className="p-6 space-y-5">
                  <p className="text-white/90 text-sm font-medium leading-relaxed">
                    Which phase of mitosis is characterised by chromosomes aligning at the cell's equatorial plate?
                  </p>

                  <div className="space-y-2">
                    {['Prophase', 'Metaphase', 'Anaphase', 'Telophase'].map((opt, i) => (
                      <div key={opt} className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${
                        i === 1
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/8 bg-white/3 text-slate-400'
                      }`}>
                        <div className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-bold flex-shrink-0 ${
                          i === 1 ? 'border-emerald-400 text-emerald-400' : 'border-white/20 text-white/30'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        {opt}
                        {i === 1 && <CheckIcon className="w-4 h-4 text-emerald-400 ml-auto" />}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-300 leading-relaxed">
                    <p className="font-semibold text-indigo-200 mb-1">AI Explanation</p>
                    Metaphase is when replicated chromosomes, each consisting of two sister chromatids, are pulled by spindle fibres to align along the metaphase plate — making it the easiest phase to count and study chromosomes under a microscope.
                  </div>
                </div>
              </div>
            </div>

            {/* Right — copy */}
            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-semibold">
                <Icon path="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" className="w-4 h-4" />
                Practice that actually works
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                Test yourself on<br />
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  any subject, any level.
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                From quick 5-minute quizzes to timed exams and advanced problem sets — EduReach has assessments for every subject, every level, and every goal.
              </p>
              <ul className="space-y-3">
                {[
                  'AI-generated quizzes from any topic in seconds',
                  'Timed exams with auto-grading and instant feedback',
                  'Difficulty graded from beginner to advanced',
                  'Advanced practice sets for competition students',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-300 text-sm">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-3 h-3 text-indigo-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={goToApp}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/30">
                Explore Assessments
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={stepsRef.ref} className={`text-center mb-16 transition-all duration-700 ${stepsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
              Up and running in minutes.
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              No complicated setup. No onboarding calls. Just sign up and start learning.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-16 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-0.5 bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {STEPS.map((step, i) => (
                <div key={step.num}
                  className={`relative text-center transition-all duration-700 ${stepsRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: stepsRef.inView ? `${i * 120}ms` : '0ms' }}>
                  <div className="relative inline-flex mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-xl shadow-indigo-600/30">
                      <Icon path={step.icon} className="w-7 h-7 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 text-xs font-extrabold flex items-center justify-center shadow-sm">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STUDY GROUPS STRIP ────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 text-white text-sm font-semibold">
                <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" className="w-4 h-4" />
                Better together
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                Study groups that<br />actually motivate.
              </h2>
              <p className="text-teal-100 text-lg leading-relaxed">
                Create a study group for your class, run timed group challenges, share resources, and track everyone's XP on a live leaderboard. Competition makes everyone better.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Group challenges', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                  { label: 'Live leaderboards', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  { label: 'Invite via link', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
                  { label: 'Discussion threads', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
                ].map(({ label, icon }) => (
                  <div key={label} className="flex items-center gap-2.5 bg-white/10 rounded-xl p-3 border border-white/15">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Icon path={icon} className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Study group mockup */}
            <div className="animate-float-b">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm">M</div>
                    <div>
                      <div className="text-white font-semibold text-sm">Form 4 Science Group</div>
                      <div className="text-teal-200 text-xs">12 members · Active challenge</div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">Pro</span>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { rank: 1, name: 'Amara K.', xp: 2840, pct: 100, badge: '🥇' },
                    { rank: 2, name: 'Brian M.',  xp: 2610, pct: 92,  badge: '🥈' },
                    { rank: 3, name: 'Chloe W.', xp: 2305, pct: 81,  badge: '🥉' },
                    { rank: 4, name: 'David O.', xp: 1890, pct: 67,  badge: null },
                    { rank: 5, name: 'Eva N.',   xp: 1550, pct: 55,  badge: null },
                  ].map((m) => (
                    <div key={m.rank} className={`flex items-center gap-3 p-3 rounded-xl ${m.rank === 1 ? 'bg-white/20 border border-white/25' : 'bg-white/8'}`}>
                      <div className="w-6 text-center text-sm font-bold text-white/60">{m.badge || `#${m.rank}`}</div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium truncate">{m.name}</span>
                          <span className="text-teal-200 text-xs font-semibold">{m.xp.toLocaleString()} XP</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white/60 rounded-full" style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={pricingRef.ref} className={`text-center mb-14 transition-all duration-700 ${pricingRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
              Simple, transparent pricing.
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Start free. Upgrade when you need more. All plans include a <strong className="text-slate-700">14-day Pro trial</strong> so you can explore everything with no risk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PRICING.map((plan, i) => (
              <div key={plan.tier}
                className={`relative rounded-2xl border-2 p-8 flex flex-col gap-6 transition-all duration-700 ${
                  plan.highlight
                    ? 'border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.03] bg-white'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                } ${pricingRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: pricingRef.inView ? `${i * 100}ms` : '0ms' }}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30">
                      ⭐ {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold mb-4 ${
                    plan.tier === 'Free' ? 'bg-slate-100 text-slate-600' :
                    plan.tier === 'Starter' ? 'bg-indigo-50 text-indigo-600' :
                    'bg-violet-50 text-violet-600'
                  }`}>{plan.tier}</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-extrabold text-slate-900">{plan.priceLabel}</span>
                    {plan.tier !== 'Free' && <span className="text-slate-500 text-sm">/ mo</span>}
                  </div>
                  {plan.usd && (
                    <div className="text-xs text-slate-400 mb-3">≈ {plan.usd} USD</div>
                  )}
                  {plan.tier === 'Free' && <div className="h-5 mb-3" />}
                  <p className="text-sm text-slate-500 leading-relaxed">{plan.desc}</p>
                </div>

                <button onClick={goToApp}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-slate-900 hover:bg-slate-700 text-white'
                  }`}>
                  {plan.cta}
                </button>

                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckIcon className="w-2.5 h-2.5 text-emerald-600" />
                      </div>
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-400">
                      <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            Prices shown in KES. USD equivalent shown for reference. Payments via M-Pesa.{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Terms apply.</a>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Your learning journey<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              starts today.
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join students, educators, and competition teams who use EduReach to learn deeper, score higher, and achieve more.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={goToApp}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/50 hover:-translate-y-0.5">
              Create Your Free Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <p className="text-slate-600 text-sm">No credit card. No commitment. Cancel anytime.</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <Logo className="w-7 h-7" />
                <span className="text-white font-bold text-base">EduReach</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">
                AI-powered education for serious learners and competitive students.
              </p>
              <div className="flex gap-3">
                {/* X/Twitter */}
                <a href="mailto:edu.reach.co@gmail.com"
                  className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/15 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold text-sm">Product</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'Assessments', onClick: goToApp },
                  { label: 'Study Groups', onClick: goToApp },
                ].map(({ label, href, onClick }) => (
                  <li key={label}>
                    {href ? (
                      <a href={href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{label}</a>
                    ) : (
                      <button onClick={onClick} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{label}</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold text-sm">Company</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'About', onClick: goToApp },
                  { label: 'Contact', href: 'mailto:edu.reach.co@gmail.com' },
                ].map(({ label, href, onClick }: any) => (
                  <li key={label}>
                    {href ? (
                      <a href={href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{label}</a>
                    ) : (
                      <button onClick={onClick} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{label}</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold text-sm">Legal</h4>
              <ul className="space-y-2.5">
                <li><a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm">
              © {new Date().getFullYear()} EduReach. Built for Africa's brightest students.
            </p>
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
