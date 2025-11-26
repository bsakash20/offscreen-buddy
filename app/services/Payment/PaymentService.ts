/**
 * Payment Service
 * Handles subscription plans and payment processing via PayU
 */

export interface PaymentPlan {
    id: string;
    name: string;
    price: number;
    priceString: string;
    interval: 'month' | 'year';
    features: string[];
    trialDays?: number;
    platform: 'payu';
}

export class PaymentService {
    private userId: string | null = null;
    private initialized: boolean = false;

    /**
     * Initialize the payment service
     */
    async initialize(userId: string): Promise<void> {
        this.userId = userId;
        this.initialized = true;
        console.log('PaymentService initialized for user:', userId);
    }

    /**
     * Get available subscription plans
     */
    async getAvailablePlans(): Promise<PaymentPlan[]> {
        // Mock plans for now
        return [
            {
                id: 'pro_monthly',
                name: 'Pro Monthly',
                price: 499,
                priceString: '₹499/month',
                interval: 'month',
                features: ['Timer Lock Mode', 'Smart Notifications', 'Analytics Dashboard', 'Team Management'],
                trialDays: 7,
                platform: 'payu'
            },
            {
                id: 'pro_yearly',
                name: 'Pro Yearly',
                price: 4999,
                priceString: '₹4999/year',
                interval: 'year',
                features: ['Timer Lock Mode', 'Smart Notifications', 'Analytics Dashboard', 'Team Management', '2 Months Free'],
                trialDays: 14,
                platform: 'payu'
            }
        ];
    }

    /**
     * Get current subscription status
     */
    async getSubscriptionStatus(): Promise<any> {
        if (!this.userId) {
            return { active: false, plan: 'free' };
        }

        // In a real app, fetch from backend
        return {
            active: false,
            plan: 'free',
            status: 'inactive'
        };
    }

    /**
     * Purchase a subscription plan
     */
    async purchasePlan(planId: string, userId: string): Promise<{ success: boolean; orderId?: string; paymentId?: string; payuParams?: any; paymentUrl?: string; error?: string }> {
        try {
            console.log(`Initiating purchase for plan ${planId} by user ${userId}`);

            const response = await fetch('http://localhost:3001/api/payment/payu/create-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planId,
                    userId,
                    currency: 'INR'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create transaction');
            }

            console.log('Transaction created successfully:', data);

            return {
                success: true,
                orderId: data.txnid,
                paymentId: data.txnid,
                payuParams: data.payuParams,
                paymentUrl: data.paymentUrl
            };
        } catch (error: any) {
            console.error('Purchase plan error:', error);
            return {
                success: false,
                error: error.message || 'Failed to initiate purchase'
            };
        }
    }

    /**
     * Restore previous purchases
     */
    async restorePurchases(): Promise<{ success: boolean; error?: string }> {
        console.log('Restoring purchases...');
        return { success: true };
    }

    /**
     * Verify payment with backend
     */
    async verifyPayment(txnid: string): Promise<{ verified: boolean; transaction?: any; error?: string }> {
        try {
            console.log('Verifying payment:', txnid);

            const response = await fetch('http://localhost:3001/api/payu/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ txnid }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn('Payment verification returned error:', data.error);
                return {
                    verified: false,
                    error: data.error || 'Payment verification failed'
                };
            }

            console.log('Payment verification result:', data);
            return data;
        } catch (error: any) {
            console.error('Payment verification error:', error);
            return {
                verified: false,
                error: error.message || 'Failed to verify payment'
            };
        }
    }

    /**
     * Refresh subscription status from backend
     */
    async refreshSubscriptionStatus(userId: string): Promise<{ subscription: any; error?: string }> {
        try {
            console.log('Refreshing subscription status for user:', userId);

            const response = await fetch(`http://localhost:3001/api/payment/payu/subscription/${userId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch subscription');
            }

            console.log('Subscription status refreshed:', data);
            return { subscription: data };
        } catch (error: any) {
            console.error('Subscription refresh error:', error);
            return {
                subscription: null,
                error: error.message || 'Failed to refresh subscription'
            };
        }
    }
}

export const paymentService = new PaymentService();
