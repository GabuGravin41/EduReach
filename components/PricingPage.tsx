import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserTier } from '../App';

interface PricingPageProps {
  currentTier: UserTier;
  onSelectTier: (tier: 'learner' | 'pro' | 'pro_plus') => void;
}

// FIX: Define a type for tier objects to make `isPopular` an optional property, resolving TypeScript errors.
interface TierInfo {
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const tiers: Record<'free' | 'learner' | 'pro' | 'pro_plus', TierInfo> = {
  free: {
    name: 'Free',
    price: '0 KES',
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
    price: '250 KES',
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
    price: '600 KES',
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
    price: '900 KES',
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

const FeatureListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <CheckCircleIcon className="w-5 h-5 text-teal-500 flex-shrink-0 mt-1" />
    <span className="text-slate-600 dark:text-slate-300">{children}</span>
  </li>
);

export const PricingPage: React.FC<PricingPageProps> = ({ currentTier, onSelectTier }) => {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Find the perfect plan</h1>
        <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto px-4">
          Start for free or upgrade to unlock powerful AI features and unlimited content creation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
        {(Object.keys(tiers) as (keyof typeof tiers)[]).map(tierId => {
          const tier = tiers[tierId];
          const isCurrent = currentTier === tierId;
          
          return (
            <div key={tier.name} className={`bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 flex flex-col ${tier.isPopular ? 'border-2 border-indigo-500 relative' : 'border border-slate-200 dark:border-slate-700'}`}>
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl sm:text-2xl font-bold">{tier.name}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{tier.description}</p>
              <div className="mt-4">
                <span className="text-3xl sm:text-4xl font-extrabold">{tier.price}</span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{tier.priceSuffix}</span>
              </div>
              <ul className="mt-5 space-y-2 flex-grow">
                {tier.features.slice(0, 5).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircleIcon className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
                {tier.features.length > 5 && (
                  <li className="text-xs text-slate-500 dark:text-slate-400 italic">
                    +{tier.features.length - 5} more features
                  </li>
                )}
              </ul>
              <div className="mt-6">
                 {tierId === 'free' ? (
                   <button disabled className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-default">
                        {currentTier === 'free' ? 'Current Plan' : 'Free Plan'}
                    </button>
                 ) : isCurrent ? (
                  <button disabled className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-teal-500 text-white cursor-default">
                    ✓ Current Plan
                  </button>
                 ) : currentTier === 'admin' ? (
                  <button disabled className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-default">
                    Admin Access
                  </button>
                 ): (
                  <button 
                    onClick={() => onSelectTier(tierId as 'learner' | 'pro' | 'pro_plus')}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all hover:scale-105 ${
                        tier.isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' 
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
    </div>
  );
};