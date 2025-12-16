import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService, PaymentMethod, Payment, Subscription, InitiatePaymentResponse } from '../services/paymentService';
import { PriceTagIcon } from './icons/PriceTagIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { Button } from './ui/Button';
import { UserTier } from '../App';

interface BillingPageProps {
  currentTier?: UserTier;
  onSubscriptionActivated?: (tier: 'learner' | 'pro' | 'pro_plus') => void;
}

interface TierInfo {
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const tiers: Record<'learner' | 'pro' | 'pro_plus', TierInfo> = {
  learner: {
    name: 'Learner',
    price: '250 KES',
    priceSuffix: '/ month',
    description: 'Break past the basic limits with expanded creation tools.',
    features: [
      'Create up to 5 courses',
      'Up to 25 lessons per course',
      'Access 10 public courses',
      'Create up to 10 exams',
      'Advanced AI quiz generation',
      'Unlimited AI Tutor messages',
      '15 community challenges',
    ],
  },
  pro: {
    name: 'Pro',
    price: '600 KES',
    priceSuffix: '/ month',
    description: 'For power users and content creators who want the best.',
    features: [
      'Unlimited courses & lessons',
      'Unlimited public course access',
      'Create up to 50 exams',
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
      'Everything in Pro',
      'Unlimited exams',
      'AI lesson plan generation',
      'Early access to new features',
      'Priority Support',
    ],
    isPopular: true,
  },
};

const FeatureListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
    <CheckCircleIcon className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

export const BillingPage: React.FC<BillingPageProps> = ({ currentTier = 'free', onSubscriptionActivated }) => {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<'learner' | 'pro' | 'pro_plus'>('learner');
  
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardToken, setCardToken] = useState('');

  const subscriptionQuery = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: paymentService.getSubscription,
    retry: false,
  });

  const methodsQuery = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: paymentService.getPaymentMethods,
  });

  const historyQuery = useQuery<Payment[]>({
    queryKey: ['payment-history'],
    queryFn: paymentService.getPaymentHistory,
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: paymentService.initiatePayment,
    onSuccess: (response: InitiatePaymentResponse) => {
      setLatestPayment(response.payment);
      setPaymentMessage(
        response.message ||
          (response.payment.status === 'pending'
            ? 'Payment initiated. Complete the payment on your device, then click Activate Subscription.'
            : 'Payment completed! Activate your subscription below.')
      );
      historyQuery.refetch();
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: paymentService.upgradeSubscription,
    onSuccess: () => {
      setPaymentMessage('Subscription activated successfully!');
      setLatestPayment(null);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      historyQuery.refetch();
      if (onSubscriptionActivated) {
          onSubscriptionActivated(selectedTier);
      }
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: paymentService.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const currentPlanLabel = useMemo(() => {
    if (currentTier && currentTier !== 'free') return currentTier.replace('_', ' ');
    if (!subscriptionQuery.data) return 'Free';
    return subscriptionQuery.data.tier.replace('_', ' ');
  }, [subscriptionQuery.data, currentTier]);

  const selectedMethod = useMemo(
    () => methodsQuery.data?.find((method) => method.id === selectedMethodId) ?? null,
    [methodsQuery.data, selectedMethodId]
  );

  const handleStartPayment = () => {
    if (!selectedMethodId) {
      setPaymentMessage('Select a payment method first.');
      return;
    }

    const plan = tiers[selectedTier];
    const amount = parseInt(plan.price.split(' ')[0]); 
    
    const payload: any = {
      payment_method_id: selectedMethodId,
      amount: amount,
      currency: 'KES',
      metadata: { tier: selectedTier },
    };

    if (selectedMethod?.name === 'mpesa') {
      if (!mpesaPhone) {
        setPaymentMessage('Enter the phone number linked to your M-Pesa account.');
        return;
      }
      payload.phone_number = mpesaPhone;
    }

    if (selectedMethod?.name === 'card') {
      if (!cardToken) {
        setPaymentMessage('Enter a valid card token (demo only).');
        return;
      }
      payload.card_token = cardToken;
    }

    initiatePaymentMutation.mutate({
      ...payload,
    });
  };

  const handleActivateSubscription = () => {
    if (!latestPayment) {
      setPaymentMessage('No payment found. Start a payment first.');
      return;
    }
    upgradeMutation.mutate({
      tier: selectedTier,
      payment_id: latestPayment.id,
    });
  };

  const handleCancelSubscription = () => {
    cancelSubscriptionMutation.mutate();
  };

  useEffect(() => {
    if (!selectedMethodId && methodsQuery.data && methodsQuery.data.length > 0) {
      setSelectedMethodId(methodsQuery.data[0].id);
    }
  }, [methodsQuery.data, selectedMethodId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
          <PriceTagIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Plans & Billing</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your subscription and payment methods.</p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Current Subscription</h2>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <p className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-100">{currentPlanLabel} Plan</p>
                {subscriptionQuery.data && (
                    <div className="flex items-center gap-2 mt-2 text-emerald-600 text-sm font-medium">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Active • Renews on {new Date(subscriptionQuery.data.expires_at).toLocaleDateString()}</span>
                    </div>
                )}
                {!subscriptionQuery.data && currentTier === 'free' && (
                    <p className="text-slate-500 text-sm mt-1">Upgrade to unlock more features.</p>
                )}
            </div>
            {subscriptionQuery.data && (
                <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
                    onClick={handleCancelSubscription}
                    isLoading={cancelSubscriptionMutation.isPending}
                >
                    Cancel Subscription
                </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plans Selection */}
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Select a Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Object.keys(tiers) as Array<'learner' | 'pro' | 'pro_plus'>).map((tierKey) => {
                    const tier = tiers[tierKey];
                    const isSelected = selectedTier === tierKey;
                    const isCurrent = currentTier === tierKey;

                    return (
                        <div 
                            key={tierKey}
                            onClick={() => !isCurrent && setSelectedTier(tierKey)}
                            className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col h-full ${
                                isSelected 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500 ring-1 ring-indigo-600 shadow-md transform scale-[1.02]' 
                                    : isCurrent
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 cursor-default opacity-80'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                        >
                            {tier.isPopular && !isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-sm">
                                    POPULAR
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-sm">
                                    CURRENT
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tier.name}</h3>
                                <div className="flex items-baseline mt-1">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tier.price}</span>
                                    <span className="text-sm text-slate-500 ml-1">{tier.priceSuffix}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 min-h-[2.5rem]">{tier.description}</p>
                            </div>

                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700 pt-4 mb-4">
                                <ul className="space-y-3">
                                    {tier.features.map((feature, idx) => (
                                        <FeatureListItem key={idx}>{feature}</FeatureListItem>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-auto">
                                <div className={`w-full py-2.5 rounded-lg text-center text-sm font-bold transition-colors ${
                                    isSelected && !isCurrent
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : isCurrent
                                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {isCurrent ? 'Current Plan' : isSelected ? 'Selected' : 'Select Plan'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Payment Processing */}
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment Details</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 sticky top-6">
                
                {/* Summary */}
                <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 mb-1">Selected Plan</p>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{tiers[selectedTier].name}</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{tiers[selectedTier].price}</span>
                    </div>
                </div>

                {/* Method Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Payment Method</label>
                    {methodsQuery.isLoading ? (
                        <div className="animate-pulse h-10 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
                    ) : (
                        <select
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                            value={selectedMethodId ?? ''}
                            onChange={(e) => setSelectedMethodId(Number(e.target.value))}
                        >
                            <option value="">Select a payment method</option>
                            {methodsQuery.data?.map((method) => (
                            <option key={method.id} value={method.id}>
                                {method.display_name}
                            </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Dynamic Inputs */}
                {selectedMethod?.name === 'mpesa' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">M-Pesa Number</label>
                        <input
                            type="tel"
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(e.target.value)}
                            placeholder="2547XXXXXXXX"
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                )}

                {selectedMethod?.name === 'card' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Card Token (Demo)</label>
                        <input
                            type="text"
                            value={cardToken}
                            onChange={(e) => setCardToken(e.target.value)}
                            placeholder="tok_visa_demo"
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="pt-2 space-y-3">
                    <Button 
                        onClick={handleStartPayment} 
                        isLoading={initiatePaymentMutation.isPending}
                        className="w-full justify-center"
                        disabled={currentTier === selectedTier}
                    >
                        {currentTier === selectedTier ? 'Current Plan Active' : `Pay ${tiers[selectedTier].price}`}
                    </Button>
                    
                    <Button
                        variant="secondary"
                        onClick={handleActivateSubscription}
                        disabled={!latestPayment}
                        isLoading={upgradeMutation.isPending}
                        className="w-full justify-center"
                    >
                        Activate Subscription
                    </Button>
                </div>

                {/* Messages */}
                {paymentMessage && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm flex items-start gap-2">
                        <ClockIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{paymentMessage}</span>
                        <button onClick={() => setPaymentMessage('')} className="text-blue-500 hover:text-blue-700">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* History */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm max-h-[300px] overflow-y-auto">
                <h3 className="text-base font-semibold mb-4 text-slate-900 dark:text-slate-100">Payment History</h3>
                {historyQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading history...</p>
                ) : historyQuery.data && historyQuery.data.length > 0 ? (
                    <div className="space-y-3">
                        {historyQuery.data.map((payment) => (
                        <div key={payment.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                    {payment.currency} {payment.amount}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(payment.created_at).toLocaleDateString()}</p>
                            </div>
                            <span
                            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                payment.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : payment.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}
                            >
                            {payment.status}
                            </span>
                        </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No past payments found.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;