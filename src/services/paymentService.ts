import apiClient from './apiClient';

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
}

export const paymentService = {
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await apiClient.get('/payments/methods/');
    return data;
  },

  initiatePayment: async (payload: InitiatePaymentPayload): Promise<InitiatePaymentResponse> => {
    const { data } = await apiClient.post('/payments/initiate/', payload);
    return data;
  },

  getPaymentHistory: async (): Promise<Payment[]> => {
    const { data } = await apiClient.get('/payments/history/');
    return data;
  },

  getSubscription: async (): Promise<Subscription> => {
    const { data } = await apiClient.get('/payments/subscription/');
    return data;
  },

  upgradeSubscription: async (payload: {
    tier: string;
    payment_id: number;
    duration_days?: number;
  }): Promise<Subscription> => {
    const { data } = await apiClient.post('/payments/subscription/upgrade/', payload);
    return data;
  },

  cancelSubscription: async (): Promise<void> => {
    await apiClient.post('/payments/subscription/cancel/', {});
  },
};

export default paymentService;

