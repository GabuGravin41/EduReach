import axios from 'axios';
import apiClient from './api';

export interface PaymentMethod {
  id: number;
  name: string;
  display_name: string;
  is_active: boolean;
}

export interface Payment {
  id: number;
  amount: string;
  currency: string;
  status: string;
  transaction_id: string;
  reference_code: string;
  metadata: Record<string, unknown>;
  phone_number: string;
  created_at: string;
  processed_at: string | null;
  method: PaymentMethod;
}

export interface Subscription {
  id: number;
  tier: string;
  status: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_method: PaymentMethod | null;
  last_payment: Payment | null;
  price: string;
  currency: string;
}

export interface InitiatePaymentPayload {
  payment_method_id: number;
  amount: number;
  currency?: string;
  reference_code?: string;
  metadata?: Record<string, unknown>;
  phone_number?: string;
  card_token?: string;
}

export interface InitiatePaymentResponse {
  payment: Payment;
  message?: string;
  /** M-Pesa Paybill flow: show these so user can pay then enter transaction code */
  paybill_number?: string;
  account?: string;
  amount?: string;
  currency?: string;
  /** Paystack flow: redirect user to this URL to complete payment */
  paystack_url?: string;
  reference?: string;
}

export interface EnterpriseInquiryPayload {
  name: string;
  email: string;
  message: string;
}

export const paymentService = {
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await apiClient.get('payments/methods/');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).results)) return (data as any).results;
    return [];
  },

  initiatePayment: async (payload: InitiatePaymentPayload): Promise<InitiatePaymentResponse> => {
    const { data } = await apiClient.post('payments/initiate/', payload);
    return data;
  },

  confirmPaybill: async (paymentId: number, transactionCode: string): Promise<{ detail: string; payment: Payment }> => {
    const { data } = await apiClient.post(`payments/${paymentId}/confirm-paybill/`, {
      transaction_code: transactionCode.trim(),
    });
    return data;
  },

  getPaymentHistory: async (): Promise<Payment[]> => {
    const { data } = await apiClient.get('payments/history/');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).results)) return (data as any).results;
    return [];
  },

  getSubscription: async (): Promise<Subscription | null> => {
    try {
      const { data } = await apiClient.get('payments/subscription/');
      return data;
    } catch (error) {
      // "No active subscription" is expected for new/free users.
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  upgradeSubscription: async (payload: {
    tier: string;
    payment_id: number;
    duration_days?: number;
  }): Promise<Subscription> => {
    const { data } = await apiClient.post('payments/subscription/upgrade/', payload);
    return data;
  },

  cancelSubscription: async (): Promise<void> => {
    await apiClient.post('payments/subscription/cancel/', {});
  },

  submitEnterpriseInquiry: async (payload: EnterpriseInquiryPayload): Promise<{ detail: string }> => {
    const { data } = await apiClient.post('payments/enterprise-inquiry/', payload);
    return data;
  },

  paystackVerify: async (payload: { reference: string }): Promise<{ detail: string; payment: Payment }> => {
    const { data } = await apiClient.post('payments/paystack/verify/', payload);
    return data;
  },

  startTrial: async (tier: string): Promise<{ detail: string; trial_ends_at: string; subscription: Subscription }> => {
    const { data } = await apiClient.post('payments/subscription/start-trial/', { tier });
    return data;
  },
};

export default paymentService;

