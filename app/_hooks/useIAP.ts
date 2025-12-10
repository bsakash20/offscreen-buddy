
import { useEffect, useState, useCallback } from 'react';
import { Purchase, PurchaseError, Subscription } from 'react-native-iap';
import { iapService } from '../_services/iap/IAPService';
import { useSupabaseAuth } from '../_contexts/SupabaseAuthContext'; // To get userId

export const useIAP = () => {
    const { user } = useSupabaseAuth();
    const [products, setProducts] = useState<any[]>([]); // Using any[] to bypass type mismatch between internal NitroProduct and public Subscription/Product types
    const [loading, setLoading] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize IAP and fetch products
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                setLoading(true);
                await iapService.initialize();
                const items = await iapService.getSubscriptions();
                if (mounted) setProducts(items || []);
            } catch (err: any) {
                if (mounted) setError(err.message || 'Failed to fetch products');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        init();

        // Cleanup connections on unmount? 
        // Typically initializing once is fine, but cleaning up listeners is important.
        // We'll rely on the service to manage listeners when we start the purchase flow, 
        // or we could add a granular init/destroy here if we wanted strict scope.

        return () => {
            mounted = false;
            // We don't destroy connection here blindly because it might be shared,
            // but we should clean up listeners if we added them.
            // Given IAPService is singleton, listeners might be global.
        };
    }, []);

    // Setup purchase listeners
    useEffect(() => {
        const handleSuccess = (purchase: Purchase) => {
            console.log('Purchase successful hook callback:', purchase);
            setPurchasing(false);
            // Optionally trigger a re-fetch of user subscription status here
        };

        const handleError = (err: PurchaseError) => {
            console.error('Purchase error hook callback:', err);
            setPurchasing(false);
            setError(err.message);
        };

        iapService.setupListeners(handleSuccess, handleError);

        return () => {
            // In a real app we'd probably want to unsubscribe listeners to avoid leaks/duplicates 
            // if we navigate away and back.
            // iapService.removeListeners(); // Implementation needed in service if we want rigorous cleanup
        };
    }, []);

    const requestSubscription = useCallback(async (sku: string) => {
        try {
            setPurchasing(true);
            setError(null);

            // If Android, we might need to find the specific offer token from `products`
            // For now, simply passing SKU. 
            await iapService.requestSubscription(sku);

            // The success/failure will be handled by the listeners set up in useEffect
        } catch (err: any) {
            setPurchasing(false);
            setError(err.message || 'Failed to request subscription');
        }
    }, [products]);

    const restorePurchases = useCallback(async () => {
        try {
            setLoading(true);
            const purchases = await iapService.getAvailablePurchases();
            // Manually verify these with backend if needed, or rely on them being valid
            console.log('Restored purchases:', purchases);
            // Logic to sync with backend...
        } catch (err: any) {
            setError(err.message || 'Failed to restore purchases');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        products,
        loading,
        purchasing,
        error,
        requestSubscription,
        restorePurchases
    };
};
