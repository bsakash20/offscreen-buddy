export interface PayUPaymentResult {
    id: string;
    amount: number;
    status: 'success' | 'failure' | 'pending';
    transactionId: string;
}

export interface PayUPayment {
    id: string;
    amount: number;
    status: 'success' | 'failure' | 'pending';
    transactionId: string;
}

export const payUService = {
    initiatePayment: async (amount: number, user: any) => ({ transactionId: 'mock-txn-id' }),
    verifyPayment: async (transactionId: string) => ({ status: 'success', id: 'mock-payment-id', amount: 100, transactionId }),
};
