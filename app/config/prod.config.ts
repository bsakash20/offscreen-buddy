/**
 * PROD Environment Configuration
 * Production-ready configuration with AWS Secrets Manager integration
 */

import { ProdConfig } from './types';

export const prodConfig: ProdConfig = {
  environment: 'PROD',

  app: {
    name: 'OffScreen Buddy',
    version: '1.0.0',
    bundleId: 'com.offscreenbuddy.app',
  },

  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.offscreenbuddy.com',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  supabase: {
    // These will be loaded from AWS Secrets Manager in production
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  payu: {
    environment: 'production',
    merchantKey: process.env.EXPO_PUBLIC_PAYU_MERCHANT_KEY || '',
    salt: process.env.EXPO_PUBLIC_PAYU_SALT || '',
    baseUrl: 'https://secure.payu.in/_payment',
    successUrl: process.env.EXPO_PUBLIC_PAYU_SUCCESS_URL || 'https://offscreenbuddy.com/payment-success',
    failureUrl: process.env.EXPO_PUBLIC_PAYU_FAILURE_URL || 'https://offscreenbuddy.com/payment-failure',
  },

  logging: {
    level: 'warn',
    enableConsole: false,
    enableRemote: true,
  },

  features: {
    analytics: true,
    crashReporting: true,
    performanceMonitoring: true,
    mockPayments: false,
    debugMode: false,
  },

  security: {
    enforceHttps: true,
    allowInsecureConnections: false,
    csrfProtection: true,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    enablePerformanceMonitoring: true,
    tracesSampleRate: 0.1,
  },

  cache: {
    ttl: 3600, // 1 hour
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};

// Export configuration
export default prodConfig;