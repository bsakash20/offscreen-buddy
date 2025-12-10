/**
 * LOCAL Environment Configuration
 * Safe defaults for development environment
 */

import { LocalConfig } from './types';

export const localConfig: LocalConfig = {
  environment: 'LOCAL',

  app: {
    name: 'OffScreen Buddy',
    version: '1.0.0',
    bundleId: 'com.offscreenbuddy.app',
  },

  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    timeout: 60000, // Longer timeout for debugging
    retryAttempts: 3,
    retryDelay: 1000,
  },

  supabase: {
    url: process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cjjfegvtqvkcplvakpnk.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamZlZ3Z0cXZrY3BsdmFrcG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTQ2NjAsImV4cCI6MjA3ODg3MDY2MH0.G3igL_Gb3PamvZOo0ZjalMdz-BCIWk3fGs0WtCzTG9o',
  },

  payu: {
    environment: 'sandbox',
    merchantKey: process.env.EXPO_PUBLIC_PAYU_MERCHANT_KEY,
    salt: process.env.EXPO_PUBLIC_PAYU_SALT,
    baseUrl: process.env.EXPO_PUBLIC_PAYU_BASE_URL || 'https://sandboxsecure.payu.in/_payment',
    successUrl: process.env.EXPO_PUBLIC_PAYU_SUCCESS_URL || 'http://localhost:8081/payment-success',
    failureUrl: process.env.EXPO_PUBLIC_PAYU_FAILURE_URL || 'http://localhost:8081/payment-failure',
  },

  logging: {
    level: 'debug',
    enableConsole: true,
    enableRemote: false,
  },

  features: {
    analytics: true,
    crashReporting: true,
    performanceMonitoring: true,
    mockPayments: true,
    debugMode: true,
  },

  security: {
    enforceHttps: false,
    allowInsecureConnections: true,
    csrfProtection: false,
  },

  cache: {
    ttl: 3600, // 1 hour
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};

// Export configuration
export default localConfig;