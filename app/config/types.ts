/**
 * Environment Configuration Type Definitions
 * Provides type safety for all configuration values
 */

export type Environment = 'LOCAL' | 'PROD';

export interface AppConfig {
  environment: Environment;
  
  app: {
    name: string;
    version: string;
    bundleId: string;
  };
  
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  supabase: {
    url: string;
    anonKey: string;
    serviceKey?: string; // Only needed for backend operations
  };
  
  payu: {
    environment: 'sandbox' | 'production';
    merchantKey: string;
    salt: string;
    baseUrl: string;
    successUrl: string;
    failureUrl: string;
  };
  
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
  };
  
  features: {
    analytics: boolean;
    crashReporting: boolean;
    performanceMonitoring: boolean;
    mockPayments?: boolean;
    debugMode?: boolean;
  };
  
  security: {
    enforceHttps: boolean;
    allowInsecureConnections: boolean;
    csrfProtection: boolean;
    rateLimiting?: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  monitoring?: {
    sentryDsn?: string;
    enablePerformanceMonitoring: boolean;
    tracesSampleRate?: number;
  };
  
  cache: {
    ttl: number;
    maxSize: number;
  };
}

// Environment-specific configuration extensions
export interface LocalConfig extends AppConfig {
  environment: 'LOCAL';
  
  payu: AppConfig['payu'] & {
    environment: 'sandbox';
  };
  
  features: AppConfig['features'] & {
    mockPayments: true;
    debugMode: true;
  };
  
  security: AppConfig['security'] & {
    enforceHttps: false;
    allowInsecureConnections: true;
    csrfProtection: false;
  };
  
  logging: AppConfig['logging'] & {
    level: 'debug';
    enableConsole: true;
    enableRemote: false;
  };
}

export interface ProdConfig extends AppConfig {
  environment: 'PROD';
  
  payu: AppConfig['payu'] & {
    environment: 'production';
  };
  
  features: AppConfig['features'] & {
    mockPayments: false;
    debugMode: false;
  };
  
  security: AppConfig['security'] & {
    enforceHttps: true;
    allowInsecureConnections: false;
    csrfProtection: true;
  };
  
  logging: AppConfig['logging'] & {
    level: 'warn';
    enableConsole: false;
    enableRemote: true;
  };
  
  monitoring: {
    sentryDsn: string;
    enablePerformanceMonitoring: boolean;
    tracesSampleRate: number;
  };
}

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation?: string;
}

// Environment detection types
export interface EnvironmentInfo {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  detectedAt: Date;
  source: 'process.env' | 'default' | 'file' | 'override';
}

// Configuration cache types
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

// Runtime validation types
export interface RuntimeValidationResult {
  service: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}