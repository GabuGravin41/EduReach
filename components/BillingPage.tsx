import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService, PaymentMethod, Payment, Subscription, InitiatePaymentResponse } from '../src/services/paymentService';
import { PriceTagIcon } from './icons/PriceTagIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { Button } from './ui/Button';

interface BillingPageProps {
  requestedTier?: 'learner' | 'pro' | 'pro_plus' | null;
  onSubscriptionActivated?: () => void;
}

const PLAN_DETAILS: Record<'learner' | 'pro' | 'pro_plus', { label: string; description: string; price: number; currency: string }> = {
  learner: {
    label: 'Learner',
    description: 'Break past the basic limits with expanded creation tools.',
    price: 250,
    currency: 'KES',
  },
  pro: {
    label: 'Pro',
    description: 'Unlimited courses, assessments, and premium AI tutor.',
    price: 600,
    currency: 'KES',
  },
  pro_plus: {
    label: 'Pro Plus',
    description: 'Everything in Pro plus AI lesson plans and early access.',
    price: 900,
    currency: 'KES',
  },
};

export const BillingPage: React.FC<BillingPageProps> = ({ requestedTier = null, onSubscriptionActivated }) => {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<'learner' | 'pro' | 'pro_plus'>(requestedTier ?? 'learner');
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
      onSubscriptionActivated?.();
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: paymentService.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const currentPlanLabel = useMemo(() => {
    if (!subscriptionQuery.data) return 'Free';
    return subscriptionQuery.data.tier.replace('_', ' ');
  }, [subscriptionQuery.data]);

  const selectedMethod = useMemo(
    () => methodsQuery.data?.find((method) => method.id === selectedMethodId) ?? null,
    [methodsQuery.data, selectedMethodId]
  );

  const handleStartPayment = () => {
    if (!selectedMethodId) {
      setPaymentMessage('Select a payment method first.');
      return;
    }

    const plan = PLAN_DETAILS[selectedTier];
    const payload: any = {
      payment_method_id: selectedMethodId,
      amount: plan.price,
      currency: plan.currency,
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
    if (requestedTier) {
      setSelectedTier(requestedTier);
    }
  }, [requestedTier]);

  useEffect(() => {
    if (!selectedMethodId && methodsQuery.data && methodsQuery.data.length > 0) {
      setSelectedMethodId(methodsQuery.data[0].id);
    }
  }, [methodsQuery.data, selectedMethodId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
            <PriceTagIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-sm text-slate-500">Manage your plan, payments, and history.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Plan</h2>
            {subscriptionQuery.isLoading ? (
              <p>Loading...</p>
            ) : subscriptionQuery.isError ? (
              <div>
                <p className="text-lg font-bold">Free Plan</p>
                <p className="text-sm text-slate-500">Upgrade to unlock more features.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-bold capitalize">{currentPlanLabel}</p>
                <p className="text-sm text-slate-600">
                  Renews on{' '}
                  {new Date(subscriptionQuery.data!.expires_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <CheckCircleIcon className="w-4 h-4" />
                  Auto-renew {subscriptionQuery.data?.auto_renew ? 'enabled' : 'disabled'}
                </div>
                {subscriptionQuery.data && (
                  <Button
                    variant="ghost"
                    className="mt-2 text-red-500 hover:text-red-600"
                    onClick={handleCancelSubscription}
                    isLoading={cancelSubscriptionMutation.isPending}
                  >
                    Cancel auto-renew
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Choose a plan</h2>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(PLAN_DETAILS) as Array<'learner' | 'pro' | 'pro_plus'>).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex-1 min-w-[140px] p-4 rounded-xl border transition-all text-left ${
                    selectedTier === tier
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <p className="text-sm font-semibold">{PLAN_DETAILS[tier].label}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{PLAN_DETAILS[tier].description}</p>
                  <p className="text-lg font-bold mt-2">
                    {PLAN_DETAILS[tier].currency} {PLAN_DETAILS[tier].price}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-base font-semibold">Payment Method</h3>
            {methodsQuery.isLoading ? (
              <p>Loading methods...</p>
            ) : (
              <select
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

            {selectedMethod?.name === 'mpesa' && (
              <div>
                <label className="text-sm font-medium text-slate-600">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  className="mt-1 w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {selectedMethod?.name === 'card' && (
              <div>
                <label className="text-sm font-medium text-slate-600">Card Token</label>
                <input
                  type="text"
                  value={cardToken}
                  onChange={(e) => setCardToken(e.target.value)}
                  placeholder="tok_visa_demo"
                  className="mt-1 w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Demo only. Replace with real card entry via Stripe/Paystack SDK.
                </p>
              </div>
            )}

            {selectedMethod?.name === 'bank_transfer' && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-sm text-slate-600 dark:text-slate-300">
                You will receive a bank reference code after starting the payment. Use it when sending funds.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleStartPayment} isLoading={initiatePaymentMutation.isPending}>
                Start Payment
              </Button>
              <Button
                variant="secondary"
                onClick={handleActivateSubscription}
                disabled={!latestPayment}
                isLoading={upgradeMutation.isPending}
              >
                Activate Subscription
              </Button>
            </div>

            {paymentMessage && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                <span>{paymentMessage}</span>
                <button onClick={() => setPaymentMessage('')} className="ml-auto text-amber-700 hover:text-amber-900">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm max-h-[320px] overflow-y-auto">
            <h3 className="text-base font-semibold mb-3">Payment History</h3>
            {historyQuery.isLoading ? (
              <p>Loading history...</p>
            ) : historyQuery.data && historyQuery.data.length > 0 ? (
              <div className="space-y-3">
                {historyQuery.data.map((payment) => (
                  <div key={payment.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {payment.currency} {payment.amount}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Method: {payment.method?.display_name}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : payment.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payments yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;

