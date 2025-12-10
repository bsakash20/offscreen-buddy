/**
 * Unified Configuration Management System
 * Provides a single interface for all configuration across the application
 */

import { z } from 'zod';
import { environmentDetector, getEnvironment, isLocal, isProd } from './env';
import { AppConfig, LocalConfig, ProdConfig, CacheEntry } from './types';
import {
  validateLocalConfig,
  validateProdConfig,
  validateLocalBusinessRules,
  validateProdBusinessRules,
  formatValidationErrors
} from './validation';

// Configuration cache
class ConfigCache {
  private static cache: Map<string, CacheEntry<any>> = new Map();
  private static readonly TTL = 5 * 60 * 1000; // 5 minutes

  static set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: this.TTL,
    });
  }

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  static clear(): void {
    this.cache.clear();
  }

  static isExpired(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return true;

    return Date.now() - cached.timestamp > cached.ttl;
  }
}

// Unified Configuration Manager
class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<AppConfig> | null = null;

  private constructor() { }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration system
   */
  async initialize(): Promise<AppConfig> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<AppConfig> {
    try {
      console.log('🚀 Initializing configuration system...');

      // Check cache first
      const cachedConfig = ConfigCache.get<AppConfig>('app_config');
      if (cachedConfig && !ConfigCache.isExpired('app_config')) {
        console.log('✓ Using cached configuration');
        this.config = cachedConfig;
        this.isInitialized = true;
        return cachedConfig;
      }

      // Detect environment
      const environment = environmentDetector.getEnvironment();
      console.log(`📍 Environment detected: ${environment}`);

      // Load appropriate configuration
      let config: AppConfig;
      if (environment === 'LOCAL') {
        config = await this.loadLocalConfig();
      } else {
        config = await this.loadProdConfig();
      }

      // Validate configuration
      await this.validateConfig(config);

      // Apply environment-specific business rules
      this.applyBusinessRules(config);

      // Cache the configuration
      ConfigCache.set('app_config', config);

      this.config = config;
      this.isInitialized = true;

      console.log(`✅ Configuration initialized for ${environment} environment`);
      return config;

    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      throw new Error(`Failed to initialize configuration: ${error}`);
    }
  }

  private async loadLocalConfig(): Promise<LocalConfig> {
    console.log('📦 Loading LOCAL configuration...');

    // Dynamically import LOCAL configuration
    const { default: localConfig } = await import('./local.config');

    // Validate LOCAL configuration
    const validation = validateLocalConfig(localConfig);
    if (!validation.success) {
      throw new Error(`LOCAL configuration validation failed:\n${formatValidationErrors(validation.errors!)}`);
    }

    console.log('✓ LOCAL configuration loaded and validated');
    return validation.data!;
  }

  private async loadProdConfig(): Promise<ProdConfig> {
    console.log('📦 Loading PROD configuration...');

    // Dynamically import PROD configuration
    const { default: prodConfig } = await import('./prod.config');

    // For production, we would load secrets from AWS Secrets Manager
    // For now, using environment variables with fallback
    await this.loadProductionSecrets();

    // Validate PROD configuration
    const validation = validateProdConfig(prodConfig);
    if (!validation.success) {
      throw new Error(`PROD configuration validation failed:\n${formatValidationErrors(validation.errors!)}`);
    }

    console.log('✓ PROD configuration loaded and validated');
    return validation.data!;
  }

  private async loadProductionSecrets(): Promise<void> {
    if (!isProd()) return;

    try {
      // In a real implementation, this would fetch from AWS Secrets Manager
      // For now, we're using environment variables
      console.log('📋 Using environment variables for production secrets');

      // Validate that required secrets are available
      const requiredSecrets = [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_PAYU_MERCHANT_KEY',
        'EXPO_PUBLIC_PAYU_SALT',
        'SENTRY_DSN',
      ];

      const missingSecrets = requiredSecrets.filter(key => !process.env[key]);
      if (missingSecrets.length > 0) {
        throw new Error(`Missing production secrets: ${missingSecrets.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Failed to load production secrets:', error);
      throw error;
    }
  }

  private async validateConfig(config: AppConfig): Promise<void> {
    console.log('🔍 Validating configuration...');

    // Validate environment-specific rules
    if (config.environment === 'LOCAL') {
      const localErrors = validateLocalBusinessRules(config as LocalConfig);
      if (localErrors.length > 0) {
        throw new Error(`LOCAL business rule validation failed:\n${localErrors.join('\n')}`);
      }
    } else {
      const prodErrors = validateProdBusinessRules(config as ProdConfig);
      if (prodErrors.length > 0) {
        throw new Error(`PROD business rule validation failed:\n${prodErrors.join('\n')}`);
      }
    }

    console.log('✓ Configuration validation passed');
  }

  private applyBusinessRules(config: AppConfig): void {
    console.log('⚙️  Applying environment-specific business rules...');

    // Environment-specific modifications
    if (config.environment === 'LOCAL') {
      // Add development-specific configurations
      (config as LocalConfig).features.mockPayments = true;
      (config as LocalConfig).features.debugMode = true;
      (config as LocalConfig).security.allowInsecureConnections = true;
    } else {
      // Add production-specific configurations
      (config as ProdConfig).security.enforceHttps = true;
      (config as ProdConfig).security.allowInsecureConnections = false;
      (config as ProdConfig).features.mockPayments = false;
      (config as ProdConfig).features.debugMode = false;
    }

    console.log('✓ Business rules applied');
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    if (!this.isInitialized || !this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Reload configuration (useful for testing)
   */
  async reload(): Promise<AppConfig> {
    console.log('🔄 Reloading configuration...');
    ConfigCache.clear();
    this.isInitialized = false;
    this.config = null;
    this.initializationPromise = null;
    return this.initialize();
  }

  /**
   * Check if configuration is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.config !== null;
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(serviceName: string): any {
    const config = this.getConfig();

    switch (serviceName.toLowerCase()) {
      case 'supabase':
        return config.supabase;
      case 'payu':
        return config.payu;
      case 'api':
        return config.api;
      case 'app':
        return config.app;
      case 'security':
        return config.security;
      case 'logging':
        return config.logging;
      case 'features':
        return config.features;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Convenience function to get configuration
export async function getConfig(): Promise<AppConfig> {
  return configManager.getConfig();
}

// Convenience function to get service-specific config
export async function getServiceConfig(serviceName: string): Promise<any> {
  return configManager.getServiceConfig(serviceName);
}

// Environment-aware convenience functions
export async function getSupabaseConfig() {
  return getServiceConfig('supabase');
}

export async function getPayUConfig() {
  return getServiceConfig('payu');
}

export async function getApiConfig() {
  return getServiceConfig('api');
}

// Get raw configuration without validation (for debugging)
export async function getRawConfig(): Promise<LocalConfig | ProdConfig | null> {
  const environment = environmentDetector.getEnvironment();

  try {
    if (environment === 'LOCAL') {
      const { default: localConfig } = await import('./local.config');
      return localConfig;
    } else {
      const { default: prodConfig } = await import('./prod.config');
      return prodConfig;
    }
  } catch (error) {
    console.error('Failed to load raw config:', error);
    return null;
  }
}

// Initialize function for app startup
export async function initializeConfig(): Promise<AppConfig> {
  return configManager.initialize();
}

// Re-export types for convenience
export type { AppConfig, LocalConfig, ProdConfig, CacheEntry };