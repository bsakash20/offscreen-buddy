import { Platform, EmitterSubscription } from 'react-native';
import { IAP_CONFIG, SUBSCRIPTION_SKUS } from '../../_config/iap.config';
import { supabaseAuthService } from '../SupabaseAuthService';
import type {
    Purchase,
    PurchaseError,
} from 'react-native-iap';

// Define a type for the purchase updated callback
type PurchaseUpdatedCallback = (purchase: Purchase) => void;
type PurchaseErrorCallback = (error: PurchaseError) => void;

class IAPService {
    private static instance: IAPService;
    private purchaseUpdateSubscription: any = null;
    private purchaseErrorSubscription: any = null;
    private isConnected: boolean = false;
    private baseUrl: string = 'http://localhost:3001'; // Default to localhost for dev
    private RNIap: any = null;
    private isAvailable: boolean = false;

    private constructor() {
        try {
            // Lazy load react-native-iap to prevent crashes in Expo Go
            this.RNIap = require('react-native-iap');
            this.isAvailable = true;
        } catch (error) {
            console.warn('⚠️ react-native-iap is not available (likely running in Expo Go). IAP features will be disabled.');
            this.isAvailable = false;
        }
    }

    public static getInstance(): IAPService {
        if (!IAPService.instance) {
            IAPService.instance = new IAPService();
        }
        return IAPService.instance;
    }

    /**
     * Initialize connection to the store
     */
    async initialize(): Promise<void> {
        if (!this.isAvailable || !this.RNIap) {
            console.log('ℹ️ IAP Service is unavailable (mocking init)');
            this.isConnected = true;
            return;
        }

        try {
            if (this.isConnected) return;

            const result = await this.RNIap.initConnection();
            this.isConnected = result;

            if (Platform.OS === 'android') {
                await this.RNIap.flushFailedPurchasesCachedAsPendingAndroid();
            }

            console.log('✅ IAP Service initialized');
        } catch (error) {
            console.error('❌ IAP Initialization failed:', error);
            // Don't throw to allow app usage without IAP
        }
    }

    /**
     * Close connection to the store
     */
    async destroy(): Promise<void> {
        if (!this.isAvailable) return;

        if (this.purchaseUpdateSubscription) {
            if (this.purchaseUpdateSubscription.remove) {
                this.purchaseUpdateSubscription.remove();
            }
            this.purchaseUpdateSubscription = null;
        }
        if (this.purchaseErrorSubscription) {
            if (this.purchaseErrorSubscription.remove) {
                this.purchaseErrorSubscription.remove();
            }
            this.purchaseErrorSubscription = null;
        }
        if (this.RNIap) {
            await this.RNIap.endConnection();
        }
        this.isConnected = false;
    }

    /**
     * Get available subscriptions
     */
    async getSubscriptions() {
        if (!this.isConnected) await this.initialize();
        if (!this.isAvailable) return [];

        try {
            // New API uses fetchProducts with 'subs' type
            const products = await this.RNIap.fetchProducts({ skus: SUBSCRIPTION_SKUS as string[] });
            return products;
        } catch (error) {
            console.error('❌ Failed to get subscriptions:', error);
            // throw error; // Don't throw, return empty
            return [];
        }
    }

    /**
     * Request a subscription purchase
     */
    async requestSubscription(sku: string): Promise<void> {
        if (!this.isConnected) await this.initialize();
        if (!this.isAvailable) {
            console.warn('IAP not available in this environment');
            return;
        }

        try {
            // Using 'sku' as 'any' to bypass strict check if 'sku' is renamed (e.g. 'id')
            await this.RNIap.requestPurchase({ sku } as any);
        } catch (error) {
            console.error('❌ Request subscription failed:', error);
            throw error;
        }
    }

    /**
     * Setup listeners for purchase updates
     */
    setupListeners(
        onPurchaseSuccess: PurchaseUpdatedCallback,
        onPurchaseError: PurchaseErrorCallback
    ): void {
        if (!this.isAvailable) return;

        this.purchaseUpdateSubscription = this.RNIap.purchaseUpdatedListener(async (purchase: Purchase) => {
            const p = purchase as any;
            const receipt = p.transactionReceipt || p.purchaseToken; // receipt for iOS, token for Android

            if (receipt) {
                try {
                    // Verify with backend
                    const validationResult = await this.verifyPurchase(purchase);

                    if (validationResult.verified) {
                        // Acknowledge the transaction (finish it)
                        await this.RNIap.finishTransaction({ purchase, isConsumable: false });
                        onPurchaseSuccess(purchase);
                    } else {
                        throw new Error('Receipt verification failed');
                    }
                } catch (error) {
                    console.error('❌ Receipt verification/finish failed:', error, purchase);
                    // Pass error or handle retry logic
                }
            }
        });

        this.purchaseErrorSubscription = this.RNIap.purchaseErrorListener((error: PurchaseError) => {
            console.warn('⚠️ Purchase error:', error);
            onPurchaseError(error);
        });
    }

    /**
     * Verify purchase with backend
     */
    private async verifyPurchase(purchase: Purchase): Promise<any> {
        // Prepare payload based on platform
        let payload: any = {
            productId: purchase.productId,
            transactionId: purchase.transactionId,
        };
        let endpoint = '';

        const p = purchase as any;

        if (Platform.OS === 'android') {
            payload = {
                ...payload,
                purchaseToken: p.purchaseToken,
                userId: supabaseAuthService.getCurrentUser()?.id || 'unknown', // Dynamic user ID
            };
            endpoint = IAP_CONFIG.VERIFY_ENDPOINT.ANDROID;

        } else if (Platform.OS === 'ios') {
            payload = {
                ...payload,
                receipt: p.transactionReceipt,
                userId: supabaseAuthService.getCurrentUser()?.id || 'unknown',
                originalTransactionId: p.originalTransactionIdentifierIOS
            };
            endpoint = IAP_CONFIG.VERIFY_ENDPOINT.IOS;
        }

        if (!endpoint) throw new Error('Unsupported platform');

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Verification failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Check for existing purchases (Restoring purchases)
     */
    async getAvailablePurchases(): Promise<Purchase[]> {
        if (!this.isConnected) await this.initialize();
        if (!this.isAvailable) return [];
        return await this.RNIap.getAvailablePurchases();
    }
}

export const iapService = IAPService.getInstance();
