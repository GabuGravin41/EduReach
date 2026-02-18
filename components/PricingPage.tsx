import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserTier } from '../App';

interface PricingPageProps {
  currentTier: UserTier;
  onSelectTier: (tier: 'learner' | 'pro' | 'pro_plus') => void;
}

type CurrencyCode = 'USD' | 'KES';

// FIX: Define a type for tier objects to make `isPopular` an optional property, resolving TypeScript errors.
interface TierInfo {
  name: string;
  monthlyPrice: Record<CurrencyCode, number>;
  priceSuffix: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const tiers: Record<'free' | 'learner' | 'pro' | 'pro_plus', TierInfo> = {
  free: {
    name: 'Free',
    monthlyPrice: { USD: 0, KES: 0 },
    priceSuffix: '/ month',
    description: "For new users to explore the platform's core features.",
    features: [
      'Create up to 1 course',
      'Up to 5 lessons per course',
      'Access 1 public course (first 5 lessons)',
      'Create up to 2 exams',
      'Take 2 exams per month',
      '3 community challenges per month',
      'Standard AI quiz generation',
    ],
  },
  learner: {
    name: 'Learner',
    monthlyPrice: { USD: 4, KES: 350 },
    priceSuffix: '/ month',
    description: 'For dedicated students who want to break past the limits.',
    features: [
      'Create up to 5 courses',
      'Up to 25 lessons per course',
      'Access 10 public courses (all lessons)',
      'Create up to 10 exams',
      'Take 10 exams per month',
      '15 community challenges per month',
      'Advanced AI quiz generation',
      'Unlimited AI Tutor messages',
      'AI-powered video summarization',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: { USD: 11, KES: 950 },
    priceSuffix: '/ month',
    description: 'For power users and content creators who want the best.',
    features: [
      'Create unlimited courses',
      'Unlimited lessons per course',
      'Unlimited public course access',
      'Create up to 50 exams',
      'Take 50 exams per month',
      'Unlimited community challenges',
      'Premium AI Tutor (gemini-2.5-pro)',
      'Private courses & exams',
      '"Pro" badge on profile',
    ],
  },
  pro_plus: {
    name: 'Pro Plus',
    monthlyPrice: { USD: 19, KES: 1700 },
    priceSuffix: '/ month',
    description: 'The ultimate toolkit for educators and lifelong learners.',
    features: [
        'All features from Pro, plus:',
        'Create unlimited exams',
        'Take unlimited exams',
        'AI lesson plan generation',
        'Early access to new features',
        'Priority Support',
    ],
    isPopular: true,
  },
};

const CURRENCY_STORAGE_KEY = 'edureach:billing-currency:v1';

const detectKenyaUser = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.toLowerCase().includes('nairobi')) return true;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    if (locale.toUpperCase().includes('-KE')) return true;
    const langs = navigator.languages || [navigator.language];
    return langs.some((lang) => String(lang).toUpperCase().includes('-KE'));
  } catch {
    return false;
  }
};

const formatAmount = (currency: CurrencyCode, amount: number): string =>
  currency === 'KES'
    ? `${amount.toLocaleString()} KES`
    : `$${amount.toLocaleString()}`;

const FeatureListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <CheckCircleIcon className="w-5 h-5 text-teal-500 flex-shrink-0 mt-1" />
    <span className="text-slate-600 dark:text-slate-300">{children}</span>
  </li>
);

export const PricingPage: React.FC<PricingPageProps> = ({ currentTier, onSelectTier }) => {
  const [currency, setCurrency] = React.useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'USD';
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved === 'USD' || saved === 'KES') return saved;
    return detectKenyaUser() ? 'KES' : 'USD';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    }
  }, [currency]);

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight">Find the perfect plan</h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Start for free to explore the essentials, or upgrade to unlock powerful AI features and unlimited content creation.
        </p>
        <div className="mt-6 inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-1 bg-white dark:bg-slate-800">
          {(['USD', 'KES'] as CurrencyCode[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setCurrency(code)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                currency === code
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl mx-auto items-start">
        {(Object.keys(tiers) as (keyof typeof tiers)[]).map(tierId => {
          const tier = tiers[tierId];
          const isCurrent = currentTier === tierId;
          
          return (
            <div key={tier.name} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 flex flex-col h-full ${tier.isPopular ? 'border-2 border-indigo-500 relative' : 'border border-slate-200 dark:border-slate-700'}`}>
              {tier.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold">{tier.name}</h3>
              <p className="mt-4 text-slate-500 dark:text-slate-400 min-h-[3rem]">{tier.description}</p>
              <div className="mt-6">
                <span className="text-5xl font-extrabold">{formatAmount(currency, tier.monthlyPrice[currency])}</span>
                <span className="text-lg font-medium text-slate-500 dark:text-slate-400">{tier.priceSuffix}</span>
              </div>
              <ul className="mt-8 space-y-4 flex-grow">
                {tier.features.map((feature, index) => (
                  <FeatureListItem key={index}>{feature}</FeatureListItem>
                ))}
              </ul>
              <div className="mt-10">
                 {tierId === 'free' ? (
                   <button disabled className="w-full py-3 px-6 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-default">
                        {currentTier === 'free' ? 'Your Current Plan' : 'Select Plan'}
                    </button>
                 ) : isCurrent ? (
                  <button disabled className="w-full py-3 px-6 rounded-lg font-semibold bg-teal-500 text-white cursor-default">
                    Current Plan
                  </button>
                 ) : currentTier === 'admin' ? (
                  <button disabled className="w-full py-3 px-6 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-default">
                    Included with Admin
                  </button>
                 ): (
                  <button 
                    onClick={() => onSelectTier(tierId as 'learner' | 'pro' | 'pro_plus')}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                        tier.isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900'
                    }`}
                >
                    {currentTier === 'free' ? 'Upgrade' : 'Switch Plan'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 max-w-7xl mx-auto rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/20 dark:to-cyan-900/10 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Enterprise / Institutions</p>
            <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100">Need EduReach for a full school, campus, or coaching program?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Get bulk student onboarding, instructor workspaces, classroom analytics, and dedicated support for large deployments.
            </p>
          </div>
          <a
            href="mailto:hello@edureach.app?subject=Enterprise%20Plan%20Inquiry"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );
};