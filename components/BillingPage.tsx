import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService, PaymentMethod, Payment, Subscription, InitiatePaymentResponse } from '../src/services/paymentService';
import apiClient from '../src/services/apiClient';
import { PriceTagIcon } from './icons/PriceTagIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { Button } from './ui/Button';
import { UserTier } from '../App';
import { useAuth } from '../src/contexts/useAuth';

interface BillingPageProps {
  currentTier?: UserTier;
  onSubscriptionActivated?: (tier: 'learner' | 'pro') => void;
  learnerType?: string;
}

type CurrencyCode = 'USD' | 'KES';

interface TierInfo {
  name: string;
  monthlyPrice: Record<CurrencyCode, number>;
  biweeklyPrice?: Record<CurrencyCode, number>;
  priceSuffix: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  color: string; // tailwind accent color token
}

const tiers: Record<'learner' | 'pro', TierInfo> = {
  learner: {
    name: 'Starter',
    monthlyPrice: { USD: 1.99, KES: 299 },
    biweeklyPrice: { USD: 0.99, KES: 150 },
    priceSuffix: '/ month',
    description: 'Perfect for students who want to go beyond the basics.',
    color: 'indigo',
    features: [
      '100 AI Tutor queries / month',
      'Create up to 15 assessments',
      'Create up to 5 courses',
      'Access all public courses',
      'AI quiz generation',
      'Community access',
      '14-day free Pro trial on signup',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: { USD: 4.99, KES: 799 },
    priceSuffix: '/ month',
    description: 'For serious learners who want the full EduReach experience.',
    color: 'violet',
    isPopular: true,
    features: [
      '500 AI Tutor queries / month',
      'Unlimited courses & assessments',
      'Premium AI model (Gemini 2.5 Pro)',
      'Analytics dashboard & progress insights',
      'Study groups',
      'Private courses & exams',
      'Priority support',
      '"Pro" badge on profile',
    ],
  },
};

// ── Feature comparison table ───────────────────────────────────────────────
type FeatureRow = { feature: string; free: string | boolean; learner: string | boolean; pro: string | boolean };

const featureRows: FeatureRow[] = [
  { feature: 'AI Tutor queries / month', free: '15', learner: '100', pro: '500' },
  { feature: 'Create courses',           free: '2',  learner: '5',   pro: 'Unlimited' },
  { feature: 'Create assessments',       free: '3',  learner: '15',  pro: 'Unlimited' },
  { feature: 'Community access',         free: true, learner: true,  pro: true },
  { feature: 'Study groups',             free: false, learner: false, pro: true },
  { feature: 'Analytics dashboard',      free: false, learner: false, pro: true },
  { feature: 'Premium AI model',         free: false, learner: false, pro: true },
  { feature: '14-day Pro trial',         free: true,  learner: true,  pro: true },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const FeatureListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
    <CheckCircleIcon className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

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
    ? `KES ${amount.toLocaleString()}`
    : `$${amount.toLocaleString()} USD`;

/** Show dual-currency price e.g. "$4 USD / KES 350" */
const formatDualPrice = (tierKey: 'learner' | 'pro', t: typeof tiers = tiers): string => {
  const tier = t[tierKey];
  return `$${tier.monthlyPrice.USD} USD / KES ${tier.monthlyPrice.KES.toLocaleString()}`;
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const daysUntil = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
};

// Copy-to-clipboard helper
const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
};

// ── CopyField ────────────────────────────────────────────────────────────────
const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5">
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-lg tracking-widest select-all">{value}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${copied
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 hover:text-indigo-700'
            }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

// ── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '✓' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '⏳' },
    failed: { label: 'Failed', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: '✗' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600', icon: '·' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};

// ── Feature comparison cell ──────────────────────────────────────────────────
const FeatureCell: React.FC<{ value: string | boolean; isActive: boolean }> = ({ value, isActive }) => {
  const base = isActive ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400';
  if (typeof value === 'boolean') {
    return (
      <td className="px-4 py-3 text-center">
        {value
          ? <CheckCircleIcon className={`w-4 h-4 mx-auto ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-teal-500'}`} />
          : <XCircleIcon className="w-4 h-4 mx-auto text-slate-300 dark:text-slate-600" />}
      </td>
    );
  }
  return <td className={`px-4 py-3 text-center text-sm ${base}`}>{value}</td>;
};

// ── Main Component ─────────────────────────────────────────────────────────
export const BillingPage: React.FC<BillingPageProps> = ({ currentTier = 'free', onSubscriptionActivated, learnerType }) => {
  const { user } = useAuth();
  const isAdmin = (user as any)?.tier === 'admin' || (user as any)?.is_staff || (user as any)?.is_superuser;
  const isEducator = learnerType === 'teacher' || learnerType === 'professional';

  // Educators pay more — KES 399/mo starter, KES 999/mo pro
  const effectiveTiers: typeof tiers = isEducator ? {
    learner: {
      ...tiers.learner,
      monthlyPrice: { USD: 2.99, KES: 399 },
      biweeklyPrice: { USD: 1.49, KES: 199 },
    },
    pro: {
      ...tiers.pro,
      monthlyPrice: { USD: 6.99, KES: 999 },
    },
  } : tiers;
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<'learner' | 'pro'>('learner');
  // KES/M-Pesa only for now — USD payment will be enabled when card payments are added
  const [currency] = useState<CurrencyCode>('KES');

  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardToken, setCardToken] = useState('');
  const [paybillPending, setPaybillPending] = useState<{
    paymentId: number;
    paybillNumber: string;
    account: string;
    amount: string;
    currency: string;
  } | null>(null);
  const [paybillTransactionCode, setPaybillTransactionCode] = useState('');
  const [paystackPending, setPaystackPending] = useState<{
    url: string;
    reference: string;
    paymentId: number;
  } | null>(null);
  const [paystackReference, setPaystackReference] = useState('');
  // Payment modal tab
  const [payMethodTab, setPayMethodTab] = useState<'mpesa' | 'paystack'>('mpesa');
  // Paystack state inside modal
  const [modalPaystackPending, setModalPaystackPending] = useState<{
    url: string;
    reference: string;
    paymentId: number;
  } | null>(null);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState('');
  const [enterpriseEmail, setEnterpriseEmail] = useState('');
  const [enterpriseMessage, setEnterpriseMessage] = useState('');
  const [enterpriseFormMessage, setEnterpriseFormMessage] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [showMoreMethods, setShowMoreMethods] = useState(false);

  // ── Payment modal state ─────────────────────────────────────────────────
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'biweekly'>('monthly');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalTier, setPaymentModalTier] = useState<'learner' | 'pro' | null>(null);
  const [stkPushPending, setStkPushPending] = useState(false);
  const [stkSuccess, setStkSuccess] = useState(false);
  const [stkPushPaymentId, setStkPushPaymentId] = useState<number | null>(null);
  const [modalPaymentMessage, setModalPaymentMessage] = useState('');
  const [modalMpesaPhone, setModalMpesaPhone] = useState('');
  const [activatedTier, setActivatedTier] = useState<'learner' | 'pro' | null>(null);

  const activeBillingCycle = selectedTier === 'learner' ? billingCycle : 'monthly';
  const selectedPrice = activeBillingCycle === 'biweekly' && effectiveTiers[selectedTier].biweeklyPrice
    ? effectiveTiers[selectedTier].biweeklyPrice![currency]
    : effectiveTiers[selectedTier].monthlyPrice[currency];

  const methodsQuery = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: paymentService.getPaymentMethods,
    retry: 2,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const historyQuery = useQuery<Payment[]>({
    queryKey: ['payment-history'],
    queryFn: paymentService.getPaymentHistory,
    retry: false,
    select: (data) => Array.isArray(data) ? data : [],
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: paymentService.initiatePayment,
    onSuccess: (response: InitiatePaymentResponse) => {
      setLatestPayment(response.payment);
      if (response.paybill_number && response.account) {
        setPaybillPending({
          paymentId: response.payment.id,
          paybillNumber: response.paybill_number,
          account: response.account,
          amount: response.amount ?? String(response.payment.amount),
          currency: response.currency ?? response.payment.currency,
        });
        setPaystackPending(null);
        setPaymentMessage('');
      } else if (response.paystack_url) {
        setPaystackPending({ url: response.paystack_url, reference: response.reference ?? '', paymentId: response.payment.id });
        setPaybillPending(null);
        setPaymentMessage('Your Paystack payment link is ready. Click the button to pay, then return and verify your payment.');
      } else {
        setPaybillPending(null);
        setPaystackPending(null);
        setPaymentMessage(
          response.message ||
          (response.payment.status === 'pending'
            ? 'Payment initiated. Complete the payment on your device, then click Activate Subscription.'
            : 'Payment completed! Activate your subscription below.')
        );
      }
      historyQuery.refetch();
    },
  });

  const confirmPaybillMutation = useMutation({
    mutationFn: ({ paymentId, code }: { paymentId: number; code: string }) =>
      paymentService.confirmPaybill(paymentId, code),
    onSuccess: (data) => {
      setPaymentMessage(data.detail || 'Transaction code recorded. We will activate your plan once we confirm the payment.');
      setPaybillPending(null);
      setPaybillTransactionCode('');
      setLatestPayment(data.payment);
      historyQuery.refetch();
    },
    onError: (error: any) => {
      setPaymentMessage(error?.response?.data?.detail || 'Could not submit code. Please try again.');
    },
  });

  const verifyPaystackMutation = useMutation({
    mutationFn: paymentService.paystackVerify,
    onSuccess: (data) => {
      setLatestPayment(data.payment);
      setPaystackPending(null);
      setPaystackReference('');
      setPaymentMessage(data.detail || 'Payment verified successfully! Click "Activate Subscription" to complete.');
      historyQuery.refetch();
      // If triggered from the modal, show success state
      if (modalPaystackPending) {
        setModalPaystackPending(null);
        setStkSuccess(true);
        if (paymentModalTier) setActivatedTier(paymentModalTier);
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        if (onSubscriptionActivated && paymentModalTier) onSubscriptionActivated(paymentModalTier);
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Verification failed. Please check that you completed the payment and try again.';
      setPaymentMessage(msg);
      setModalPaymentMessage(msg);
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

  const mpesaQueryMutation = useMutation({
    mutationFn: (paymentId: number) =>
      apiClient.post('payments/mpesa/query/', { payment_id: paymentId }).then(r => r.data),
    onSuccess: (data) => {
      if (data.status === 'completed') {
        setStkPushPending(false);
        setStkSuccess(true);
        historyQuery.refetch();
        setModalPaymentMessage(data.message || 'Payment confirmed! Click Activate Subscription.');
      } else {
        setModalPaymentMessage(data.message || 'Payment still pending. Please wait and try again.');
      }
    },
    onError: (err: any) => {
      setModalPaymentMessage(err?.response?.data?.detail || 'Could not verify payment. Please try again.');
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: (tier: string) => paymentService.startTrial(tier),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      historyQuery.refetch();
      if (onSubscriptionActivated) {
        onSubscriptionActivated(data.subscription.tier as 'learner' | 'pro');
      }
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: paymentService.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const enterpriseInquiryMutation = useMutation({
    mutationFn: paymentService.submitEnterpriseInquiry,
    onSuccess: (res) => {
      setEnterpriseFormMessage(res.detail || 'Inquiry sent successfully.');
      setEnterpriseName('');
      setEnterpriseEmail('');
      setEnterpriseMessage('');
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || 'Could not send inquiry right now. Please try again.';
      setEnterpriseFormMessage(detail);
    },
  });

  const normalizeTier = (tier: unknown): UserTier => {
    switch (tier) {
      case 'free': case 'learner': case 'pro': case 'pro_plus': case 'admin':
        return tier;
      default:
        return 'free';
    }
  };
  const safeCurrentTier = normalizeTier(currentTier);

  const subscriptionQuery = useQuery<Subscription | null>({
    queryKey: ['subscription'],
    queryFn: paymentService.getSubscription,
    retry: false,
    enabled: safeCurrentTier !== 'free',
  });

  const currentPlanLabel = useMemo(() => {
    if (safeCurrentTier !== 'free') return safeCurrentTier.replace('_', ' ');
    if (!subscriptionQuery.data) return 'Free';
    return String(subscriptionQuery.data.tier || 'free').replace('_', ' ');
  }, [subscriptionQuery.data, safeCurrentTier]);

  const selectedMethod = useMemo(() => {
    const methods = Array.isArray(methodsQuery.data) ? methodsQuery.data : [];
    return methods.find((method) => method.id === selectedMethodId) ?? null;
  }, [methodsQuery.data, selectedMethodId]);

  const mpesaMethod = useMemo(() => {
    const methods = Array.isArray(methodsQuery.data) ? methodsQuery.data : [];
    return methods.find((m) => m.name === 'mpesa') ?? null;
  }, [methodsQuery.data]);

  const paystackMethod = useMemo(() => {
    const methods = Array.isArray(methodsQuery.data) ? methodsQuery.data : [];
    return methods.find((m) => m.name === 'paystack') ?? null;
  }, [methodsQuery.data]);

  const handleStartPayment = () => {
    if (!selectedMethodId) {
      setPaymentMessage('Select a payment method first.');
      return;
    }
    const effectiveCurrency: CurrencyCode =
      selectedMethod?.name === 'mpesa' || selectedMethod?.name === 'mpesa_paybill' ? 'KES' : currency;
    const amount = effectiveTiers[selectedTier].monthlyPrice[effectiveCurrency];
    const payload: any = {
      payment_method_id: selectedMethodId,
      amount,
      currency: effectiveCurrency,
      metadata: { tier: selectedTier, display_currency: currency },
    };
    if (selectedMethod?.name === 'mpesa') {
      if (!mpesaPhone) { setPaymentMessage('Enter the phone number linked to your M-Pesa account.'); return; }
      payload.phone_number = mpesaPhone;
    }
    if (selectedMethod?.name === 'card') {
      if (!cardToken) { setPaymentMessage('Enter a valid card token (demo only).'); return; }
      payload.card_token = cardToken;
    }
    initiatePaymentMutation.mutate(payload);
  };

  const handleActivateSubscription = () => {
    if (!latestPayment) { setPaymentMessage('No payment found. Start a payment first.'); return; }
    upgradeMutation.mutate({ tier: selectedTier, payment_id: latestPayment.id });
  };

  const handleCancelSubscription = () => cancelSubscriptionMutation.mutate();

  const openPaymentModal = (tier: 'learner' | 'pro') => {
    setPaymentModalTier(tier);
    setPaymentModalOpen(true);
    setStkPushPending(false);
    setStkSuccess(false);
    setStkPushPaymentId(null);
    setModalPaymentMessage('');
    setActivatedTier(null);
    setPayMethodTab('mpesa');
    setModalPaystackPending(null);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentModalTier(null);
    setStkPushPending(false);
    setStkSuccess(false);
    setStkPushPaymentId(null);
    setModalPaymentMessage('');
    setPayMethodTab('mpesa');
    setModalPaystackPending(null);
  };

  const handlePayWithPaystack = async () => {
    if (!paystackMethod) { setModalPaymentMessage('Paystack is not currently available. Please try M-Pesa.'); return; }
    if (!paymentModalTier) return;
    setModalPaymentMessage('');
    try {
      const payAmount = activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice
        ? effectiveTiers.learner.biweeklyPrice.KES
        : effectiveTiers[paymentModalTier].monthlyPrice.KES;
      const response = await initiatePaymentMutation.mutateAsync({
        payment_method_id: paystackMethod.id,
        amount: payAmount,
        currency: 'KES',
        metadata: { tier: paymentModalTier, display_currency: 'KES', billing_cycle: activeBillingCycle },
      } as any);
      if (response.paystack_url) {
        setModalPaystackPending({ url: response.paystack_url, reference: response.reference ?? '', paymentId: response.payment.id });
        window.open(response.paystack_url, '_blank', 'noopener,noreferrer');
      } else {
        setModalPaymentMessage('Could not get a Paystack payment link. Please try again.');
      }
    } catch (err: any) {
      setModalPaymentMessage(err?.response?.data?.detail || 'Paystack error. Please try again.');
    }
  };

  const handleSendStkPush = async () => {
    if (!mpesaMethod) { setModalPaymentMessage('M-Pesa is not currently available. Please try again later.'); return; }
    if (!paymentModalTier) return;
    const phone = modalMpesaPhone.trim();
    if (!phone) { setModalPaymentMessage('Please enter your M-Pesa phone number.'); return; }
    setModalPaymentMessage('');
    try {
      const payAmount = activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice
        ? effectiveTiers.learner.biweeklyPrice.KES
        : effectiveTiers[paymentModalTier].monthlyPrice.KES;
      const response = await initiatePaymentMutation.mutateAsync({
        payment_method_id: mpesaMethod.id,
        amount: payAmount,
        currency: 'KES',
        phone_number: phone,
        metadata: { tier: paymentModalTier, display_currency: 'KES', billing_cycle: activeBillingCycle },
      } as any);
      if (!response.paybill_number && !response.paystack_url) {
        setStkPushPending(true);
        setStkPushPaymentId(response.payment.id);
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send STK push. Please check your number and try again.';
      setModalPaymentMessage(`Error: ${detail}`);
    }
  };

  const handleSubmitEnterpriseInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setEnterpriseFormMessage('');
    enterpriseInquiryMutation.mutate({
      name: enterpriseName.trim(),
      email: enterpriseEmail.trim(),
      message: enterpriseMessage.trim(),
    });
  };

  useEffect(() => {
    const methods = Array.isArray(methodsQuery.data) ? methodsQuery.data : [];
    if (!selectedMethodId && methods.length > 0) setSelectedMethodId(methods[0].id);
  }, [methodsQuery.data, selectedMethodId]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  // ── STK push polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!stkPushPending) return;
    const interval = setInterval(() => { historyQuery.refetch(); }, 5000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setStkPushPending(false);
      setModalPaymentMessage('Payment confirmation timed out. If you paid, please contact support.');
    }, 120000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stkPushPending]);

  useEffect(() => {
    if (!stkPushPaymentId || !historyQuery.data) return;
    const payment = historyQuery.data.find((p) => p.id === stkPushPaymentId);
    if (payment?.status === 'completed') {
      setStkPushPending(false);
      setStkSuccess(true);
      setStkPushPaymentId(null);
      if (paymentModalTier) {
        upgradeMutation.mutate({ tier: paymentModalTier, payment_id: payment.id });
        setActivatedTier(paymentModalTier);
      }
    }
  }, [historyQuery.data, stkPushPaymentId, paymentModalTier, upgradeMutation]);

  // ── Subscription status helpers ──────────────────────────────────────────
  const sub = subscriptionQuery.data;
  // Cast to any to support optional backend fields not yet in the type definition
  const subAny = sub as any;
  const trialDaysLeft = daysUntil(subAny?.trial_ends_at ?? null);
  const renewsDaysLeft = daysUntil(sub?.expires_at);
  const isTrial = !!(subAny?.is_trial);

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
          <PriceTagIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Plans & Billing</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your subscription and payment methods.</p>
        </div>
        {learnerType && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            isEducator
              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-700'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
          }`}>
            <span>{isEducator ? '👨‍🏫' : '🎓'}</span>
            <span>
              {isEducator ? 'Educator pricing applied' : 'Student pricing applied'} —{' '}
              {isEducator
                ? 'Starter KES 399/mo · Pro KES 999/mo'
                : 'Starter KES 299/mo · Pro KES 799/mo'}
            </span>
          </div>
        )}
      </div>

      {/* ── Current subscription status ─────────────────────────────────── */}
      <div className={`rounded-2xl p-6 border shadow-sm ${safeCurrentTier === 'free'
          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          : isTrial
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
        }`}>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Current Subscription</p>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-100">{currentPlanLabel} Plan</p>

            {safeCurrentTier === 'free' && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                You're on the <strong>Free</strong> plan. Upgrade to unlock more features.
              </p>
            )}

            {isTrial && trialDaysLeft !== null && (
              <div className="flex items-center gap-2 mt-2 text-amber-700 dark:text-amber-300 text-sm font-medium">
                <ClockIcon className="w-4 h-4" />
                <span>
                  Trial ends in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</strong>
                  {subAny?.trial_ends_at ? ` (${formatDate(subAny.trial_ends_at)})` : ''}
                  {trialDaysLeft <= 3 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold animate-pulse">
                      Expires soon!
                    </span>
                  )}
                </span>
              </div>
            )}

            {sub && !isTrial && (
              <div className="flex items-center gap-2 mt-2 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <CheckCircleIcon className="w-4 h-4" />
                <span>
                  Active
                  {sub.expires_at ? ` • Renews on ${formatDate(sub.expires_at)}` : ''}
                  {renewsDaysLeft !== null && renewsDaysLeft <= 7 && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-bold">({renewsDaysLeft}d left)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowComparison((v) => !v)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition-colors"
            >
              {showComparison ? 'Hide' : 'Compare'} Plans
            </button>
            {sub && (
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600 dark:hover:text-red-400 text-sm"
                onClick={handleCancelSubscription}
                isLoading={cancelSubscriptionMutation.isPending}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>

        {/* Free plan feature comparison inline hint */}
        {safeCurrentTier === 'free' && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { label: 'AI Queries', free: '20/mo', paid: 'Unlimited' },
              { label: 'Courses', free: '1 max', paid: 'Up to Unlimited' },
              { label: 'Assessments', free: '3 max', paid: 'Up to Unlimited' },
              { label: 'Analytics', free: 'Basic', paid: 'Full dashboard' },
            ].map(({ label, free, paid }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>
                <p className="text-slate-400 line-through">{free}</p>
                <p className="text-indigo-600 dark:text-indigo-400 font-semibold">{paid}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Feature comparison table (collapsible) ───────────────────────── */}
      {showComparison && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Plan Comparison</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">All prices in KES. Pay with M-Pesa.</p>
          </div>
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-40">Feature</th>
                {(['free', 'learner', 'pro'] as const).map((tk) => {
                  const isActive = safeCurrentTier === tk;
                  const tierLabel = tk === 'free' ? 'Free' : effectiveTiers[tk as 'learner' | 'pro'].name;
                  const price = tk === 'free' ? 'Free' : formatDualPrice(tk as 'learner' | 'pro', effectiveTiers);
                  return (
                    <th
                      key={tk}
                      className={`px-4 py-3 text-center font-bold ${isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      <div>{tierLabel}</div>
                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">{price}</div>
                      {isActive && (
                        <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white inline-block">
                          Your Plan
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {featureRows.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{row.feature}</td>
                  <FeatureCell value={row.free} isActive={safeCurrentTier === 'free'} />
                  <FeatureCell value={row.learner} isActive={safeCurrentTier === 'learner'} />
                  <FeatureCell value={row.pro} isActive={safeCurrentTier === 'pro' || safeCurrentTier === 'pro_plus'} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Enterprise banner ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/20 dark:to-cyan-900/10 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Enterprise / Institution</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
              Need bulk onboarding for a full classroom, school, or academy? Talk to us for institution pricing and rollout support.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEnterpriseFormMessage(''); setIsEnterpriseModalOpen(true); }}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            Contact Sales
          </button>
        </div>
      </div>

      {/* ── Group & Team Billing ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/10 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">👥</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Group & Team Billing</p>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-3">
              Upgrade an entire study group or classroom with a single payment — no individual subscriptions required.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: '💰', label: 'One payment', desc: 'Covers all members' },
                { icon: '📉', label: 'Volume savings', desc: 'Lower per-seat cost' },
                { icon: '📊', label: 'Group dashboard', desc: 'Track progress together' },
                { icon: '🔑', label: 'Instant access', desc: 'Premium for everyone' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="bg-white/60 dark:bg-slate-800/40 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{icon}</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 md:min-w-[180px]">
            <a
              href="mailto:edu.reach.co@gmail.com?subject=Group%20Billing%20Inquiry&body=Hi%2C%20I%27d%20like%20to%20upgrade%20my%20study%20group%20to%20bulk%20billing."
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors whitespace-nowrap"
            >
              Get Group Pricing
            </a>
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              Available for 5+ members · Custom quotes
            </p>
          </div>
        </div>
      </div>

      {/* ── Plans + payment ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Plan cards — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Select a Plan</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              Prices in KES · Pay via M-Pesa
            </span>
          </div>

          {/* Kenya hint */}
          {currency === 'KES' && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
              Prices shown in Kenyan Shillings (KES). M-Pesa Paybill is available for Kenya-based payments.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(Object.keys(effectiveTiers) as Array<'learner' | 'pro'>).map((tierKey) => {
              const tier = effectiveTiers[tierKey];
              const isSelected = selectedTier === tierKey;
              const isCurrent = safeCurrentTier === tierKey || (tierKey === 'pro' && safeCurrentTier === 'pro_plus');
              return (
                <div
                  key={tierKey}
                  onClick={() => !isCurrent && setSelectedTier(tierKey)}
                  className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col h-full ${isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500 ring-1 ring-indigo-600 shadow-lg scale-[1.02]'
                      : isCurrent
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 cursor-default opacity-80'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                >
                  {tier.isPopular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-sm tracking-wider">
                      POPULAR
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow-sm tracking-wider">
                      CURRENT
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tier.name}</h3>
                    <div className="flex items-baseline mt-1 gap-1">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                        {formatAmount(currency, tier.monthlyPrice[currency])}
                      </span>
                      <span className="text-sm text-slate-500">{tier.priceSuffix}</span>
                    </div>
                    {/* Dual currency hint */}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {currency === 'KES'
                        ? `$${tier.monthlyPrice.USD} USD / month`
                        : `KES ${tier.monthlyPrice.KES.toLocaleString()} / month`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 min-h-[2.5rem]">{tier.description}</p>
                  </div>

                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700 pt-4 mb-4">
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <FeatureListItem key={idx}>{feature}</FeatureListItem>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto space-y-2">
                    <div className={`w-full py-2 rounded-xl text-center text-xs font-semibold transition-colors ${isSelected && !isCurrent
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : isCurrent
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                      {isCurrent ? 'Current Plan' : isSelected ? 'Selected' : 'Select Plan'}
                    </div>
                    {!isCurrent && (
                      <>
                        {safeCurrentTier === 'free' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startTrialMutation.mutate(tierKey); }}
                            disabled={startTrialMutation.isPending}
                            className="w-full py-2.5 rounded-xl text-center text-sm font-semibold border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-60"
                          >
                            {startTrialMutation.isPending ? 'Starting trial...' : '🎁 Start 14-Day Free Trial'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openPaymentModal(tierKey); }}
                          className="w-full py-2.5 rounded-xl text-center text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
                        >
                          Subscribe Now →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary + history panel — 1/3 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Order Summary</h2>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 sticky top-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Selected Plan</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{effectiveTiers[selectedTier].name}</span>
                <div className="text-right">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatAmount(currency, selectedPrice)}</p>
                  <p className="text-[10px] text-slate-400">
                    {currency === 'KES'
                      ? `$${effectiveTiers[selectedTier].monthlyPrice.USD} USD / mo`
                      : `KES ${effectiveTiers[selectedTier].monthlyPrice.KES.toLocaleString()} / mo`}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment method badges */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment Methods</p>
              <div className="space-y-2">
                {/* M-Pesa — active (always visible) */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📱</span>
                    <span className="text-sm font-semibold text-green-800 dark:text-green-200">M-Pesa</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-600 text-white">Active</span>
                </div>

                {/* Expand / collapse toggle */}
                <button
                  type="button"
                  onClick={() => setShowMoreMethods((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span>{showMoreMethods ? 'Hide other methods' : 'More payment methods'}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showMoreMethods ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Other methods — collapsible */}
                {showMoreMethods && (
                  <div className="space-y-2">
                    {isAdmin ? (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">💳</span>
                          <div>
                            <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Card / Paystack</span>
                            <p className="text-xs text-indigo-500 dark:text-indigo-400">Visa, Mastercard, bank</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 opacity-60">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">💳</span>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Card</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Coming Soon</span>
                      </div>
                    )}
                    {[
                      { icon: '🅿️', label: 'PayPal' },
                    ].map(({ icon, label }) => (
                      <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 opacity-60">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{icon}</span>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Billing cycle toggle — Starter only */}
            {selectedTier === 'learner' && effectiveTiers.learner.biweeklyPrice && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Billing Cycle</p>
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-2 transition-colors ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Monthly<br /><span className="text-xs font-normal">KES {effectiveTiers.learner.monthlyPrice.KES}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('biweekly')}
                    className={`flex-1 py-2 transition-colors ${billingCycle === 'biweekly' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    2 Weeks<br /><span className="text-xs font-normal">KES {effectiveTiers.learner.biweeklyPrice!.KES}</span>
                  </button>
                </div>
              </div>
            )}

            {safeCurrentTier !== selectedTier ? (
              <button
                type="button"
                onClick={() => openPaymentModal(selectedTier)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
              >
                Subscribe — {formatAmount('KES', selectedPrice)} {activeBillingCycle === 'biweekly' ? '/ 2 wks' : '/ mo'}
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl text-center text-sm font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                ✓ Current Plan Active
              </div>
            )}

            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
              {activeBillingCycle === 'biweekly' ? 'Billed every 2 weeks · ' : 'Billed monthly · '}Cancel anytime
            </p>
          </div>

          {/* ── Payment history ── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Payment History</h3>
            </div>
            {historyQuery.isLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    </div>
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : historyQuery.isError ? (
              <p className="p-5 text-sm text-amber-600 dark:text-amber-400">Unable to load payment history.</p>
            ) : Array.isArray(historyQuery.data) && historyQuery.data.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[300px] overflow-y-auto">
                {historyQuery.data.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        {payment.currency === 'KES'
                          ? `KES ${Number(payment.amount).toLocaleString()}`
                          : `$${Number(payment.amount).toLocaleString()} ${payment.currency}`}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(payment.created_at)}</p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 px-4 text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">No past payments</p>
                <p className="text-xs text-slate-400">Your payment history will appear here once you subscribe.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {paymentModalOpen && paymentModalTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <div>
                <h2 className="text-lg font-extrabold">Subscribe to {effectiveTiers[paymentModalTier].name}</h2>
                <p className="text-indigo-100 text-sm mt-0.5">
                  {activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice
                    ? `KES ${effectiveTiers.learner.biweeklyPrice.KES.toLocaleString()} / 2 weeks`
                    : `KES ${effectiveTiers[paymentModalTier].monthlyPrice.KES.toLocaleString()} / month`}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Payment method tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => { setPayMethodTab('mpesa'); setModalPaymentMessage(''); }}
                className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-0.5 transition-colors ${
                  payMethodTab === 'mpesa'
                    ? 'border-b-2 border-green-500 text-green-700 dark:text-green-400 bg-white dark:bg-slate-900'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>📱</span>
                <span>M-Pesa</span>
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => { setPayMethodTab('paystack'); setModalPaymentMessage(''); }}
                  className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-0.5 transition-colors ${
                    payMethodTab === 'paystack'
                      ? 'border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span>💳</span>
                  <span>Card / Paystack</span>
                </button>
              ) : (
                <div className="flex-1 py-3 text-center cursor-not-allowed flex flex-col items-center gap-0.5 opacity-40" title="Coming soon">
                  <span className="text-sm">💳</span>
                  <span className="text-xs text-slate-400">Card</span>
                  <span className="text-[9px] text-slate-300 dark:text-slate-600 font-semibold uppercase tracking-wide">Soon</span>
                </div>
              )}
              {/* Coming soon */}
              {[{ label: 'PayPal', icon: '🅿️' }].map(({ label, icon }) => (
                <div
                  key={label}
                  className="flex-1 py-3 text-center cursor-not-allowed flex flex-col items-center gap-0.5 opacity-40"
                  title="Coming soon"
                >
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-[9px] text-slate-300 dark:text-slate-600 font-semibold uppercase tracking-wide">Soon</span>
                </div>
              ))}
            </div>

            {/* ── Paystack body (admin-only during testing) ─────────────── */}
            {payMethodTab === 'paystack' && isAdmin && !stkSuccess && (
              <div className="p-6 space-y-5">
                {!modalPaystackPending ? (
                  <>
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                      <span className="text-2xl flex-shrink-0">💳</span>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        Pay securely with your Visa, Mastercard, or bank account via Paystack. You'll be redirected to a secure payment page — once paid, come back and click <strong>I've Paid</strong>.
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-600 dark:text-slate-400">You will be charged</span>
                      <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                        KES {paymentModalTier ? (activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice ? effectiveTiers.learner.biweeklyPrice.KES : effectiveTiers[paymentModalTier].monthlyPrice.KES).toLocaleString() : '—'}
                        <span className="text-sm font-normal text-slate-400 ml-1">{activeBillingCycle === 'biweekly' ? '/ 2 wks' : '/ mo'}</span>
                      </span>
                    </div>
                    {modalPaymentMessage && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
                        {modalPaymentMessage}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handlePayWithPaystack}
                      disabled={initiatePaymentMutation.isPending}
                      className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-base shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      {initiatePaymentMutation.isPending ? (
                        <><ClockIcon className="w-5 h-5 animate-spin" /><span>Opening Paystack...</span></>
                      ) : (
                        <><span>💳</span><span>Pay with Card / Bank — KES {paymentModalTier ? (activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice ? effectiveTiers.learner.biweeklyPrice.KES : effectiveTiers[paymentModalTier].monthlyPrice.KES).toLocaleString() : ''}</span></>
                      )}
                    </button>
                    <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                      Powered by Paystack · SSL secured · Cancel anytime
                    </p>
                  </>
                ) : (
                  <div className="text-center space-y-5 py-2">
                    <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center animate-pulse">
                      <span className="text-4xl">💳</span>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-white">Complete payment in the new tab</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        A Paystack page was opened. Complete the payment there, then click verify below.
                      </p>
                    </div>
                    <a
                      href={modalPaystackPending.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 underline hover:no-underline"
                    >
                      Re-open payment page ↗
                    </a>
                    {modalPaymentMessage && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
                        {modalPaymentMessage}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => verifyPaystackMutation.mutate({ reference: modalPaystackPending.reference })}
                      disabled={verifyPaystackMutation.isPending}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
                    >
                      {verifyPaystackMutation.isPending ? 'Verifying...' : '✓ I\'ve Paid — Verify Payment'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalPaystackPending(null); setModalPaymentMessage(''); }}
                      className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors"
                    >
                      Cancel — start over
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── M-Pesa body ─────────────────────────────────────────────── */}
            {payMethodTab === 'mpesa' && (
            <div className="p-6">
              {/* Success state */}
              {stkSuccess && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-3xl">
                    ✅
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">Payment Confirmed!</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {activatedTier
                        ? `Your ${tiers[activatedTier].name} subscription is now active.`
                        : 'Activating your subscription...'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* STK push pending state */}
              {stkPushPending && !stkSuccess && (
                <div className="text-center space-y-5 py-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
                    <span className="text-4xl">📱</span>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">Check your phone</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      An M-Pesa payment prompt was sent to<br />
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{modalMpesaPhone}</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                    <p className="font-semibold mb-1">Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Open M-Pesa on your phone</li>
                      <li>You'll see a payment request for <strong>KES {(activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice ? effectiveTiers.learner.biweeklyPrice.KES : effectiveTiers[paymentModalTier].monthlyPrice.KES).toLocaleString()}</strong></li>
                      <li>Enter your M-Pesa PIN to confirm</li>
                    </ol>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <ClockIcon className="w-4 h-4 animate-spin" />
                    <span>Waiting for confirmation...</span>
                  </div>
                  {modalPaymentMessage && (
                    <p className="text-sm text-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg p-2">{modalPaymentMessage}</p>
                  )}
                  {stkPushPaymentId && (
                    <button
                      type="button"
                      onClick={() => mpesaQueryMutation.mutate(stkPushPaymentId)}
                      disabled={mpesaQueryMutation.isPending}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                    >
                      {mpesaQueryMutation.isPending ? 'Checking...' : '✓ I paid — verify my payment'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setStkPushPending(false); setStkPushPaymentId(null); setModalPaymentMessage(''); }}
                    className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors"
                  >
                    Cancel — I didn't get a prompt
                  </button>
                </div>
              )}

              {/* Phone input state (default) */}
              {!stkPushPending && !stkSuccess && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <span className="text-2xl flex-shrink-0">📲</span>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Enter your M-Pesa number below. You'll receive an STK push — enter your PIN to complete the payment.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      value={modalMpesaPhone}
                      onChange={(e) => setModalMpesaPhone(e.target.value)}
                      placeholder="e.g. 2547XXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100 text-base font-mono tracking-wide"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1">Format: 2547XXXXXXXX</p>
                  </div>

                  {/* Amount reminder */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">You will be charged</span>
                    <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                      KES {(activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice ? effectiveTiers.learner.biweeklyPrice.KES : effectiveTiers[paymentModalTier].monthlyPrice.KES).toLocaleString()}
                      <span className="text-sm font-normal text-slate-400 ml-1">{activeBillingCycle === 'biweekly' ? '/ 2 wks' : '/ mo'}</span>
                    </span>
                  </div>

                  {modalPaymentMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <span>⚠️</span>
                      <span>{modalPaymentMessage}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendStkPush}
                    disabled={initiatePaymentMutation.isPending}
                    className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-base shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {initiatePaymentMutation.isPending ? (
                      <>
                        <ClockIcon className="w-5 h-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>📱</span>
                        <span>Send STK Push — KES {(activeBillingCycle === 'biweekly' && paymentModalTier === 'learner' && effectiveTiers.learner.biweeklyPrice ? effectiveTiers.learner.biweeklyPrice.KES : effectiveTiers[paymentModalTier].monthlyPrice.KES).toLocaleString()}</span>
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                    Secured by Safaricom M-Pesa · {activeBillingCycle === 'biweekly' ? 'Billed every 2 weeks' : 'Billed monthly'} · Cancel anytime
                  </p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* ── Enterprise modal ──────────────────────────────────────────────── */}
      {isEnterpriseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enterprise Inquiry</h3>
              <button
                type="button"
                onClick={() => setIsEnterpriseModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close dialog"
              >
                <XIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitEnterpriseInquiry} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={enterpriseName}
                  onChange={(e) => setEnterpriseName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={enterpriseEmail}
                  onChange={(e) => setEnterpriseEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@school.ac.ke"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Inquiry Details</label>
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  value={enterpriseMessage}
                  onChange={(e) => setEnterpriseMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell us about your institution size, needs, and timeline."
                />
              </div>
              {enterpriseFormMessage && (
                <p className="text-sm text-indigo-700 dark:text-indigo-300">{enterpriseFormMessage}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsEnterpriseModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={enterpriseInquiryMutation.isPending}>
                  Send Inquiry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
