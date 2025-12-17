export interface PaymentMethod { id: number; name: string; display_name: string; }
export interface Payment { id: number; amount: number; currency: string; status: string; created_at: string; method?: PaymentMethod; }
export interface Subscription { tier: string; expires_at: string; auto_renew: boolean; }
export interface InitiatePaymentResponse { payment: Payment; message?: string; }

export const paymentService = {
  getSubscription: async (): Promise<Subscription> => {
    // Mock response
    return { 
        tier: 'free', 
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), 
        auto_renew: false 
    };
  },
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    // Mock response
    return [
      { id: 1, name: 'mpesa', display_name: 'M-Pesa' },
      { id: 2, name: 'card', display_name: 'Credit/Debit Card' }
    ];
  },
  getPaymentHistory: async (): Promise<Payment[]> => {
    // Mock response
    return [];
  },
  initiatePayment: async (data: any): Promise<InitiatePaymentResponse> => {
    // Mock response
    return {
      payment: {
        id: Date.now(),
        amount: data.amount,
        currency: data.currency,
        status: 'pending',
        created_at: new Date().toISOString()
      },
      message: 'Payment initiated (Mock)'
    };
  },
  upgradeSubscription: async (data: any): Promise<void> => {
    console.log('Upgrading subscription (Mock)', data);
  },
  cancelSubscription: async (): Promise<void> => {
    console.log('Cancelling subscription (Mock)');
  }
};