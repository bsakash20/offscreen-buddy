/**
 * Configuration System Index
 * Main entry point for the unified configuration management system
 */

import './env';
import './types';
import './validation';
import './app.config';

// Re-export environment functions
export { environmentDetector } from './env';
export type { Environment, EnvironmentInfo } from './env';

// Re-export types
export type {
  AppConfig,
  LocalConfig,
  ProdConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CacheEntry,
  RuntimeValidationResult
} from './types';

// Re-export validation functions
export {
  validateLocalConfig,
  validateProdConfig,
  validateAppConfig,
  validateLocalBusinessRules,
  validateProdBusinessRules,
  formatValidationErrors,
  isValidEnvironment,
  normalizeEnvironment,
  validateConfig
} from './validation';

// Re-export configuration management
export {
  configManager,
  getConfig,
  getServiceConfig,
  getSupabaseConfig,
  getPayUConfig,
  getApiConfig,
  initializeConfig
} from './app.config';

// Re-export environment-specific configurations (loaded dynamically)
// export { default as localConfig } from './local.config';
// export { default as prodConfig } from './prod.config';

// Configuration initialization
export async function initConfig(): Promise<void> {
  try {
    const { initializeConfig } = await import('./app.config');
    await initializeConfig();
    console.log('✅ Configuration system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize configuration system:', error);
    throw error;
  }
}

// Configuration status
export async function getConfigStatus() {
  const { configManager } = await import('./app.config');

  // Import functions directly from the modules
  const envModule = await import('./env');
  const getEnvironment = envModule.getEnvironment;
  const isLocal = envModule.isLocal;
  const isProd = envModule.isProd;
  const getEnvironmentInfo = envModule.getEnvironmentInfo;

  return {
    isReady: configManager.isReady(),
    environment: getEnvironment(),
    isLocal: isLocal(),
    isProd: isProd(),
    environmentInfo: getEnvironmentInfo(),
  };
}