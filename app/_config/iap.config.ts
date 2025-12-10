
import { Platform } from 'react-native';

export const IAP_CONFIG = {
    // These should match your Google Play Console / App Store Connect product IDs
    PRODUCT_IDS: {
        PRO_MONTHLY: 'com.offscreenbuddy.pro.monthly', // 1 Month
        PRO_YEARLY: 'com.offscreenbuddy.pro.yearly',   // 1 Year
        // Add more as needed
    },
    PLATFORM: {
        IS_ANDROID: Platform.OS === 'android',
        IS_IOS: Platform.OS === 'ios',
    },
    // Backend endpoint for verification (relative to your API base URL)
    VERIFY_ENDPOINT: {
        ANDROID: '/api/iap/verify-android',
        IOS: '/api/iap/verify-ios',
    }
};

export const SUBSCRIPTION_SKUS = Platform.select({
    ios: [
        IAP_CONFIG.PRODUCT_IDS.PRO_MONTHLY,
        IAP_CONFIG.PRODUCT_IDS.PRO_YEARLY,
    ],
    android: [
        IAP_CONFIG.PRODUCT_IDS.PRO_MONTHLY,
        IAP_CONFIG.PRODUCT_IDS.PRO_YEARLY,
    ],
    default: [],
});
