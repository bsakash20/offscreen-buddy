/**
 * Configuration Validation Schemas using Zod
 * Provides runtime validation for all configuration values
 */

import { z } from 'zod';
import { Environment, AppConfig, LocalConfig, ProdConfig } from './types';

// Base schema for environment validation
const environmentSchema = z.enum(['LOCAL', 'PROD']);

// Application configuration schema
const appSchema = z.object({
  name: z.string().min(1, 'App name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (x.y.z)'),
  bundleId: z.string().min(1, 'Bundle ID is required'),
});

// API configuration schema
const apiSchema = z.object({
  baseUrl: z.string().url('API base URL must be valid'),
  timeout: z.number().min(1000).max(120000, 'Timeout must be between 1s and 120s'),
  retryAttempts: z.number().min(0).max(5, 'Retry attempts must be between 0 and 5'),
  retryDelay: z.number().min(100).max(5000, 'Retry delay must be between 100ms and 5s'),
});

// Supabase configuration schema
const supabaseSchema = z.object({
  url: z.string().url('Supabase URL must be valid'),
  anonKey: z.string().min(20, 'Supabase anon key must be at least 20 characters'),
  serviceKey: z.string().min(20).optional(), // Only required for backend operations
});

// PayU configuration schema
const payuSchema = z.object({
  environment: z.enum(['sandbox', 'production']),
  merchantKey: z.string().min(1, 'PayU merchant key is required'),
  salt: z.string().min(20, 'PayU salt must be at least 20 characters'),
  baseUrl: z.string().url('PayU base URL must be valid'),
  successUrl: z.string().url('PayU success URL must be valid'),
  failureUrl: z.string().url('PayU failure URL must be valid'),
});

// Logging configuration schema
const loggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  enableConsole: z.boolean(),
  enableRemote: z.boolean(),
});

// Features configuration schema
const featuresSchema = z.object({
  analytics: z.boolean(),
  crashReporting: z.boolean(),
  performanceMonitoring: z.boolean(),
  mockPayments: z.boolean().optional(),
  debugMode: z.boolean().optional(),
});

// Security configuration schema
const securitySchema = z.object({
  enforceHttps: z.boolean(),
  allowInsecureConnections: z.boolean(),
  csrfProtection: z.boolean(),
  rateLimiting: z.object({
    windowMs: z.number().min(1000),
    maxRequests: z.number().min(1),
  }).optional(),
});

// Monitoring configuration schema
const monitoringSchema = z.object({
  sentryDsn: z.string().url().optional(),
  enablePerformanceMonitoring: z.boolean(),
  tracesSampleRate: z.number().min(0).max(1),
}).optional();

// Cache configuration schema
const cacheSchema = z.object({
  ttl: z.number().min(0, 'Cache TTL must be non-negative'),
  maxSize: z.number().min(0, 'Cache max size must be non-negative'),
});

// Main configuration schema
export const configSchema = z.object({
  environment: environmentSchema,
  app: appSchema,
  api: apiSchema,
  supabase: supabaseSchema,
  payu: payuSchema,
  logging: loggingSchema,
  features: featuresSchema,
  security: securitySchema,
  monitoring: monitoringSchema,
  cache: cacheSchema,
});

// Environment-specific schemas
export const localConfigSchema = configSchema.extend({
  environment: z.literal('LOCAL'),
  payu: payuSchema.extend({
    environment: z.literal('sandbox'),
  }),
  features: featuresSchema.extend({
    mockPayments: z.literal(true),
    debugMode: z.literal(true),
  }),
  security: securitySchema.extend({
    enforceHttps: z.literal(false),
    allowInsecureConnections: z.literal(true),
    csrfProtection: z.literal(false),
  }),
  logging: loggingSchema.extend({
    level: z.literal('debug'),
    enableConsole: z.literal(true),
    enableRemote: z.literal(false),
  }),
});

export const prodConfigSchema = configSchema.extend({
  environment: z.literal('PROD'),
  payu: payuSchema.extend({
    environment: z.literal('production'),
  }),
  features: featuresSchema.extend({
    mockPayments: z.literal(false),
    debugMode: z.literal(false),
  }),
  security: securitySchema.extend({
    enforceHttps: z.literal(true),
    allowInsecureConnections: z.literal(false),
    csrfProtection: z.literal(true),
  }),
  logging: loggingSchema.extend({
    level: z.literal('warn'),
    enableConsole: z.literal(false),
    enableRemote: z.literal(true),
  }),
  monitoring: z.object({
    sentryDsn: z.string().url(),
    enablePerformanceMonitoring: z.boolean(),
    tracesSampleRate: z.number().min(0).max(1),
  }),
});

// Validation function
export function validateConfig<T>(config: unknown, schema: z.ZodSchema<T>): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  const result = schema.safeParse(config);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

// Environment-specific validation functions
export function validateLocalConfig(config: unknown): {
  success: boolean;
  data?: LocalConfig;
  errors?: z.ZodError;
} {
  return validateConfig(config, localConfigSchema);
}

export function validateProdConfig(config: unknown): {
  success: boolean;
  data?: ProdConfig;
  errors?: z.ZodError;
} {
  return validateConfig(config, prodConfigSchema);
}

// Generic config validation
export function validateAppConfig(config: unknown): {
  success: boolean;
  data?: AppConfig;
  errors?: z.ZodError;
} {
  return validateConfig(config, configSchema);
}

// Environment-specific business rule validators
export function validateLocalBusinessRules(config: LocalConfig): string[] {
  const errors: string[] = [];

  // LOCAL must use sandbox PayU
  if (config.payu.environment !== 'sandbox') {
    errors.push('LOCAL environment must use PayU sandbox');
  }

  // LOCAL should not have production URLs
  if (config.payu.baseUrl.includes('secure.payu.in')) {
    errors.push('LOCAL environment must not use production PayU URL');
  }

  if (config.supabase.url.includes('prod') && config.supabase.url.includes('supabase.co')) {
    errors.push('LOCAL environment should not use production Supabase URL');
  }

  return errors;
}

export function validateProdBusinessRules(config: ProdConfig): string[] {
  const errors: string[] = [];

  // PROD must use production PayU
  if (config.payu.environment !== 'production') {
    errors.push('PROD environment must use PayU production');
  }

  // PROD must enforce HTTPS
  if (!config.security.enforceHttps) {
    errors.push('PROD environment must enforce HTTPS');
  }

  // PROD must have monitoring
  if (!config.monitoring?.sentryDsn) {
    errors.push('PROD environment must have Sentry DSN configured');
  }

  // PROD should not allow insecure connections
  if (config.security.allowInsecureConnections) {
    errors.push('PROD environment must not allow insecure connections');
  }

  return errors;
}

// Validation helpers
export function formatValidationErrors(errors: z.ZodError): string {
  return errors.errors
    .map((error) => `${error.path.join('.')}: ${error.message}`)
    .join('\n');
}

export function isValidEnvironment(value: unknown): value is Environment {
  return typeof value === 'string' && (value === 'LOCAL' || value === 'PROD');
}

export function normalizeEnvironment(value: unknown): Environment | null {
  if (typeof value === 'string') {
    const normalized = value.toUpperCase().trim();
    if (normalized === 'LOCAL' || normalized === 'PROD') {
      return normalized;
    }
  }
  return null;
}