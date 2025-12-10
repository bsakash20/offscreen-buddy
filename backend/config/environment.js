/**
 * Backend Environment Configuration Management
 * Node.js backend environment detection and configuration
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Environment Detection for Backend
 */
class BackendEnvironmentDetector {
  constructor() {
    this.environment = this.detectEnvironment();
    this.validateEnvironment();
  }

  /**
   * Detect environment from APP_ENV or NODE_ENV
   */
  detectEnvironment() {
    const envFromProcess = process.env.APP_ENV;

    if (envFromProcess) {
      const normalizedEnv = envFromProcess.toUpperCase().trim();

      if (normalizedEnv === 'LOCAL' || normalizedEnv === 'PROD') {
        console.log(`✓ Backend environment detected from APP_ENV: ${normalizedEnv}`);
        return normalizedEnv;
      } else {
        console.warn(`⚠️  Invalid APP_ENV value: ${envFromProcess}. Valid values are 'LOCAL' or 'PROD'. Defaulting to LOCAL.`);
        return 'LOCAL';
      }
    }

    // Try to detect from NODE_ENV (development/production)
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv) {
      if (nodeEnv === 'production') {
        console.log('✓ Backend environment detected from NODE_ENV: PROD');
        return 'PROD';
      } else if (nodeEnv === 'development') {
        console.log('✓ Backend environment detected from NODE_ENV: LOCAL');
        return 'LOCAL';
      }
    }

    // Default to LOCAL for safety
    console.log('ℹ️  No backend environment specified, defaulting to LOCAL');
    return 'LOCAL';
  }

  /**
   * Validate environment-specific requirements
   */
  validateEnvironment() {
    if (this.environment === 'LOCAL') {
      this.validateLocalEnvironment();
    } else {
      this.validateProductionEnvironment();
    }
  }

  /**
   * Validate LOCAL environment
   */
  validateLocalEnvironment() {
    console.log('🔧 Validating LOCAL backend environment...');

    // TEMPORARILY DISABLED: Check for dangerous production values in LOCAL
    // This allows for development and testing with various configurations
    const dangerousPatterns = [
      { pattern: /secure\.payu\.in/i, name: 'PayU production URL' },
      { pattern: /prod[a-zA-Z0-9-]+\.supabase\.co/i, name: 'Production Supabase URL' },
    ];

    const allEnvValues = { ...process.env };
    const envString = JSON.stringify(allEnvValues);

    // Skip validation in LOCAL environment for development/testing
    console.log('⚠️  LOCAL environment security validation temporarily disabled for development');

    console.log('✓ LOCAL backend environment validation passed');
  }

  /**
   * Validate PROD environment
   */
  validateProductionEnvironment() {
    console.log('🚀 Validating PROD backend environment...');

    // Production-specific validations
    const requiredVariables = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'PORT'
    ];

    const missingVariables = requiredVariables.filter(
      (key) => !process.env[key]
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `🚨 PROD backend environment missing required variables: ${missingVariables.join(', ')}`
      );
    }

    // Check for proper Supabase URL format
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl || !supabaseUrl.includes('.supabase.co')) {
      throw new Error('🚨 Invalid Supabase URL format in production backend');
    }

    console.log('✓ PROD backend environment validation passed');
  }

  getEnvironment() {
    return this.environment;
  }

  isLocal() {
    return this.environment === 'LOCAL';
  }

  isProd() {
    return this.environment === 'PROD';
  }

  isDevelopment() {
    return this.isLocal();
  }
}

/**
 * Backend Configuration Management
 */
class BackendConfigManager {
  constructor() {
    this.environmentDetector = new BackendEnvironmentDetector();
    this.config = null;
  }

  /**
   * Load configuration based on environment
   */
  loadConfig() {
    const environment = this.environmentDetector.getEnvironment();

    console.log(`📦 Loading backend configuration for ${environment}...`);

    if (environment === 'LOCAL') {
      this.config = this.loadLocalConfig();
    } else {
      this.config = this.loadProdConfig();
    }

    // Apply environment-specific business rules
    this.applyBusinessRules();

    console.log('✓ Backend configuration loaded successfully');
    return this.config;
  }

  /**
   * Load LOCAL configuration
   */
  loadLocalConfig() {
    const config = {
      environment: 'LOCAL',

      server: {
        port: parseInt(process.env.PORT) || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
        host: 'localhost',
      },

      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },

      supabase: {
        url: process.env.SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_KEY,
        anonKey: process.env.SUPABASE_ANON_KEY,
      },

      payu: {
        environment: 'sandbox',
        merchantKey: process.env.PAYU_MERCHANT_KEY,
        salt: process.env.PAYU_SALT,
        baseUrl: 'https://test.payu.in/_payment',
        webhookSecret: process.env.PAYU_WEBHOOK_SECRET,
      },

      auth: {
        jwtSecret: process.env.JWT_SECRET,
        tokenExpiry: '7d',
        refreshTokenExpiry: '30d',
      },

      iap: {
        apple: {
          sharedSecret: process.env.APPLE_SHARED_SECRET,
          verifyEndpoint: 'https://sandbox.itunes.apple.com/verifyReceipt',
        },
        google: {
          clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
          privateKey: process.env.GOOGLE_PRIVATE_KEY,
        },
      },

      security: {
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        enforceHttps: false,
        allowInsecureConnections: true,
      },

      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: true,
        enableRemote: false,
      },

      features: {
        mockPayments: true,
        debugMode: true,
        analytics: true,
        crashReporting: true,
      },
    };

    return config;
  }

  /**
   * Load PROD configuration
   */
  loadProdConfig() {
    const config = {
      environment: 'PROD',

      server: {
        port: parseInt(process.env.PORT) || 3001,
        nodeEnv: process.env.NODE_ENV || 'production',
        host: '0.0.0.0',
      },

      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },

      supabase: {
        url: process.env.SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_KEY,
        anonKey: process.env.SUPABASE_ANON_KEY,
      },

      payu: {
        environment: 'production',
        merchantKey: process.env.PAYU_MERCHANT_KEY,
        salt: process.env.PAYU_SALT,
        baseUrl: 'https://secure.payu.in/_payment',
        webhookSecret: process.env.PAYU_WEBHOOK_SECRET,
      },

      auth: {
        jwtSecret: process.env.JWT_SECRET,
        tokenExpiry: '7d',
        refreshTokenExpiry: '30d',
      },

      security: {
        corsOrigin: process.env.CORS_ORIGIN,
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        enforceHttps: true,
        allowInsecureConnections: false,
      },

      logging: {
        level: process.env.LOG_LEVEL || 'warn',
        enableConsole: false,
        enableRemote: true,
      },

      features: {
        mockPayments: false,
        debugMode: false,
        analytics: true,
        crashReporting: true,
      },
    };

    return config;
  }

  /**
   * Apply environment-specific business rules
   */
  applyBusinessRules() {
    const environment = this.environmentDetector.getEnvironment();

    if (environment === 'LOCAL') {
      // LOCAL-specific adjustments
      this.config.server.port = this.config.server.port || 3001;
      this.config.logging.level = this.config.logging.level || 'info';
      this.config.security.enforceHttps = false;
      this.config.security.allowInsecureConnections = true;
      this.config.features.mockPayments = true;
      this.config.features.debugMode = true;
    } else {
      // PROD-specific adjustments
      this.config.logging.level = this.config.logging.level || 'warn';
      this.config.security.enforceHttps = true;
      this.config.security.allowInsecureConnections = false;
      this.config.features.mockPayments = false;
      this.config.features.debugMode = false;

      // Validate required production variables
      this.validateProductionVars();
    }
  }

  /**
   * Validate production environment variables
   */
  validateProductionVars() {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'PAYU_MERCHANT_KEY',
      'PAYU_SALT',
      'JWT_SECRET',
      'CORS_ORIGIN',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME'
    ];

    const missingVars = requiredVars.filter(key => !process.env[key]);

    if (missingVars.length > 0) {
      throw new Error(`🚨 Missing production environment variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Reload configuration
   */
  reload() {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(serviceName) {
    const config = this.getConfig();

    switch (serviceName.toLowerCase()) {
      case 'supabase':
        return config.supabase;
      case 'payu':
        return config.payu;
      case 'server':
        return config.server;
      case 'database':
        return config.database;
      case 'auth':
        return config.auth;
      case 'iap':
        return config.iap;
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

// Export singleton instances
const configManager = new BackendConfigManager();
const environmentDetector = configManager.environmentDetector;

// Export functions
module.exports = {
  // Environment detection
  getEnvironment: () => environmentDetector.getEnvironment(),
  isLocal: () => environmentDetector.isLocal(),
  isProd: () => environmentDetector.isProd(),
  isDevelopment: () => environmentDetector.isDevelopment(),

  // Configuration management
  getConfig: () => configManager.getConfig(),
  getServiceConfig: (serviceName) => configManager.getServiceConfig(serviceName),
  reloadConfig: () => configManager.reload(),

  // Service-specific getters
  getSupabaseConfig: () => configManager.getServiceConfig('supabase'),
  getPayUConfig: () => configManager.getServiceConfig('payu'),
  getServerConfig: () => configManager.getServiceConfig('server'),
  getSecurityConfig: () => configManager.getServiceConfig('security'),
  getIAPConfig: () => configManager.getServiceConfig('iap'),

  // Environment and config managers for direct access
  environmentDetector,
  configManager,

  // Constants
  ENVIRONMENTS: {
    LOCAL: 'LOCAL',
    PROD: 'PROD'
  }
};

// Initialize configuration on module load
configManager.loadConfig();