/**
 * Frontend Security Configuration System
 * Environment-specific security settings for React Native/Expo app
 * Complements backend security configuration system
 */

import { getEnvironment, isLocal, isProd } from './env';

export interface SecurityConfig {
  environment: 'LOCAL' | 'PROD';

  // Authentication Security
  authentication: {
    tokenStorage: {
      storage: 'localStorage' | 'asyncStorage' | 'secureStore';
      encryption: boolean;
      autoRefresh: boolean;
      refreshThreshold: number; // seconds before expiry
      maxStorageAge: number; // seconds
    };

    session: {
      timeout: number; // minutes
      extendOnActivity: boolean;
      warningTime: number; // minutes before timeout
      forceLogout: boolean;
    };

    biometric: {
      enabled: boolean;
      fallbackToPassword: boolean;
      maxAttempts: number;
      lockoutDuration: number; // minutes
    };

    password: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      preventCommon: boolean;
      preventReuse: number;
    };
  };

  // Network Security
  network: {
    ssl: {
      enforceHttps: boolean;
      allowInsecureConnections: boolean;
      certificatePinning: boolean;
      strictTLS: boolean;
    };

    api: {
      baseUrl: string;
      timeout: number;
      retries: number;
      backoffStrategy: 'linear' | 'exponential';
      rateLimitEnabled: boolean;
      rateLimitWindow: number; // seconds
      rateLimitMax: number;
    };

    headers: {
      userAgent: string;
      acceptLanguage: string;
      contentType: string;
      cacheControl: string;
      xRequestedWith: string;
    };

    csp: {
      enabled: boolean;
      allowedDomains: string[];
      blockedDomains: string[];
    };
  };

  // Data Protection
  dataProtection: {
    encryption: {
      atRest: boolean;
      inTransit: boolean;
      algorithm: 'AES-256' | 'ChaCha20-Poly1305';
      keyDerivation: 'PBKDF2' | 'Argon2';
    };

    sensitive: {
      patterns: RegExp[];
      masking: {
        enabled: boolean;
        preserveLength: boolean;
        replaceWith: string;
      };
      storage: 'secure' | 'local' | 'memory';
    };

    logging: {
      level: 'none' | 'error' | 'warn' | 'info' | 'debug';
      sanitization: boolean;
      maxLogSize: number;
      retentionDays: number;
      remoteLogging: boolean;
    };

    privacy: {
      analyticsEnabled: boolean;
      crashReportingEnabled: boolean;
      performanceMonitoring: boolean;
      userTracking: boolean;
      gdprCompliance: boolean;
    };
  };

  // UI Security
  ui: {
    input: {
      maxLength: number;
      sanitizeInput: boolean;
      preventPaste: boolean;
      disableCopy: boolean;
      keyboardType: 'default' | 'emailAddress' | 'numeric' | 'phoneNumber';
    };

    display: {
      hideOnScreenshot: boolean;
      disableDebugMode: boolean;
      secureTextEntry: boolean;
      biometricEnabled: boolean;
    };

    navigation: {
      blockDeepLinking: boolean;
      whitelistDomains: string[];
      forceHttps: boolean;
    };
  };

  // Payment Security
  payment: {
    validation: {
      amountLimits: {
        min: number;
        max: number;
        dailyLimit: number;
      };
      currencyValidation: boolean;
      fraudDetection: boolean;
      velocityChecking: boolean;
    };

    storage: {
      tokenization: boolean;
      encryption: boolean;
      secureStorage: boolean;
      expiryHandling: boolean;
    };

    ui: {
      secureInput: boolean;
      hideAmount: boolean;
      biometricConfirmation: boolean;
      timeoutWarning: boolean;
    };
  };

  // Development Security (LOCAL only)
  development: {
    debugMode: boolean;
    allowInsecureConnections: boolean;
    mockSecurityFeatures: boolean;
    skipValidationRules: string[];
    verboseLogging: boolean;
    performanceMonitoring: boolean;
  };

  // Production Security (PROD only)
  production: {
    secureMode: boolean;
    strictValidation: boolean;
    minimalLogging: boolean;
    fullEncryption: boolean;
    biometricRequired: boolean;
    certificateValidation: boolean;
  };

  // Monitoring & Analytics
  monitoring: {
    securityEvents: {
      enabled: boolean;
      logLevel: 'none' | 'error' | 'warn' | 'info';
      trackBiometricAttempts: boolean;
      trackFailedLogins: boolean;
      trackSuspiciousActivity: boolean;
    };

    performance: {
      enabled: boolean;
      sampleRate: number;
      trackNetworkRequests: boolean;
      trackMemoryUsage: boolean;
    };
  };
}

/**
 * Security Configuration Manager
 * Manages environment-specific security policies for the frontend
 */
class SecurityConfigManager {
  private config: SecurityConfig;

  constructor() {
    this.config = this.loadSecurityConfig();
    this.validateConfig();
  }

  /**
   * Load security configuration based on current environment
   */
  private loadSecurityConfig(): SecurityConfig {
    const environment = getEnvironment();
    console.log(`🔒 Loading frontend security configuration for ${environment} environment...`);

    if (isLocal()) {
      return this.getLocalSecurityConfig();
    } else {
      return this.getProdSecurityConfig();
    }
  }

  /**
   * LOCAL Environment Security Configuration
   * Relaxed security for development productivity
   */
  private getLocalSecurityConfig(): SecurityConfig {
    return {
      environment: 'LOCAL',

      // Authentication Security
      authentication: {
        tokenStorage: {
          storage: 'asyncStorage',
          encryption: false,
          autoRefresh: true,
          refreshThreshold: 300, // 5 minutes
          maxStorageAge: 86400 * 7 // 7 days
        },

        session: {
          timeout: 480, // 8 hours
          extendOnActivity: true,
          warningTime: 15, // 15 minutes
          forceLogout: false
        },

        biometric: {
          enabled: false,
          fallbackToPassword: true,
          maxAttempts: 5,
          lockoutDuration: 5 // 5 minutes
        },

        password: {
          minLength: 6,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
          preventCommon: false,
          preventReuse: 0
        }
      },

      // Network Security
      network: {
        ssl: {
          enforceHttps: false,
          allowInsecureConnections: true,
          certificatePinning: false,
          strictTLS: false
        },

        api: {
          baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
          timeout: 30000, // 30 seconds
          retries: 3,
          backoffStrategy: 'linear',
          rateLimitEnabled: false,
          rateLimitWindow: 60,
          rateLimitMax: 1000
        },

        headers: {
          userAgent: 'OffScreen-Buddy-LOCAL',
          acceptLanguage: 'en-US',
          contentType: 'application/json',
          cacheControl: 'no-cache',
          xRequestedWith: 'XMLHttpRequest'
        },

        csp: {
          enabled: false,
          allowedDomains: [
            'localhost:3001',
            'cjjfegvtqvkcplvakpnk.supabase.co',
            'test.payu.in'
          ],
          blockedDomains: []
        }
      },

      // Data Protection
      dataProtection: {
        encryption: {
          atRest: false,
          inTransit: false,
          algorithm: 'AES-256',
          keyDerivation: 'PBKDF2'
        },

        sensitive: {
          patterns: [
            /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
          ],
          masking: {
            enabled: true,
            preserveLength: true,
            replaceWith: '*'
          },
          storage: 'local'
        },

        logging: {
          level: 'debug',
          sanitization: true,
          maxLogSize: 1000,
          retentionDays: 7,
          remoteLogging: false
        },

        privacy: {
          analyticsEnabled: true,
          crashReportingEnabled: true,
          performanceMonitoring: true,
          userTracking: true,
          gdprCompliance: false
        }
      },

      // UI Security
      ui: {
        input: {
          maxLength: 10000,
          sanitizeInput: true,
          preventPaste: false,
          disableCopy: false,
          keyboardType: 'default'
        },

        display: {
          hideOnScreenshot: false,
          disableDebugMode: false,
          secureTextEntry: false,
          biometricEnabled: false
        },

        navigation: {
          blockDeepLinking: false,
          whitelistDomains: ['localhost:3000', 'localhost:3001'],
          forceHttps: false
        }
      },

      // Payment Security
      payment: {
        validation: {
          amountLimits: {
            min: 1,
            max: 1000000,
            dailyLimit: 10000
          },
          currencyValidation: true,
          fraudDetection: false,
          velocityChecking: false
        },

        storage: {
          tokenization: false,
          encryption: false,
          secureStorage: false,
          expiryHandling: false
        },

        ui: {
          secureInput: false,
          hideAmount: false,
          biometricConfirmation: false,
          timeoutWarning: false
        }
      },

      // Development-specific settings
      development: {
        debugMode: true,
        allowInsecureConnections: true,
        mockSecurityFeatures: true,
        skipValidationRules: [],
        verboseLogging: true,
        performanceMonitoring: true
      },

      // Production settings (inactive in LOCAL)
      production: {
        secureMode: false,
        strictValidation: false,
        minimalLogging: false,
        fullEncryption: false,
        biometricRequired: false,
        certificateValidation: false
      },

      // Monitoring & Analytics
      monitoring: {
        securityEvents: {
          enabled: true,
          logLevel: 'info',
          trackBiometricAttempts: false,
          trackFailedLogins: true,
          trackSuspiciousActivity: false
        },

        performance: {
          enabled: true,
          sampleRate: 1.0,
          trackNetworkRequests: true,
          trackMemoryUsage: true
        }
      }
    };
  }

  /**
   * PROD Environment Security Configuration
   * Maximum security enforcement for production
   */
  private getProdSecurityConfig(): SecurityConfig {
    return {
      environment: 'PROD',

      // Authentication Security
      authentication: {
        tokenStorage: {
          storage: 'secureStore', // Use secure storage in production
          encryption: true,
          autoRefresh: true,
          refreshThreshold: 60, // 1 minute
          maxStorageAge: 86400 * 1 // 1 day
        },

        session: {
          timeout: 30, // 30 minutes
          extendOnActivity: false,
          warningTime: 5, // 5 minutes
          forceLogout: true
        },

        biometric: {
          enabled: true,
          fallbackToPassword: true,
          maxAttempts: 3,
          lockoutDuration: 15 // 15 minutes
        },

        password: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          preventCommon: true,
          preventReuse: 5
        }
      },

      // Network Security
      network: {
        ssl: {
          enforceHttps: true,
          allowInsecureConnections: false,
          certificatePinning: true,
          strictTLS: true
        },

        api: {
          baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://your-api-domain.com',
          timeout: 10000, // 10 seconds
          retries: 1,
          backoffStrategy: 'exponential',
          rateLimitEnabled: true,
          rateLimitWindow: 60,
          rateLimitMax: 60
        },

        headers: {
          userAgent: 'OffScreen-Buddy-PROD',
          acceptLanguage: 'en-US',
          contentType: 'application/json',
          cacheControl: 'no-cache, no-store, must-revalidate',
          xRequestedWith: 'XMLHttpRequest'
        },

        csp: {
          enabled: true,
          allowedDomains: [
            process.env.EXPO_PUBLIC_API_DOMAIN || 'your-api-domain.com',
            '*.supabase.co',
            'secure.payu.in'
          ],
          blockedDomains: ['localhost', '127.0.0.1', '10.', '192.168.']
        }
      },

      // Data Protection
      dataProtection: {
        encryption: {
          atRest: true,
          inTransit: true,
          algorithm: 'ChaCha20-Poly1305',
          keyDerivation: 'Argon2'
        },

        sensitive: {
          patterns: [
            /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
            /\b\d{10,15}\b/, // Phone
            /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{4}[A-Z0-9]{3,7}\b/ // IBAN
          ],
          masking: {
            enabled: true,
            preserveLength: false,
            replaceWith: '***'
          },
          storage: 'secure'
        },

        logging: {
          level: 'warn',
          sanitization: true,
          maxLogSize: 100,
          retentionDays: 30,
          remoteLogging: true
        },

        privacy: {
          analyticsEnabled: false,
          crashReportingEnabled: true,
          performanceMonitoring: true,
          userTracking: false,
          gdprCompliance: true
        }
      },

      // UI Security
      ui: {
        input: {
          maxLength: 1000,
          sanitizeInput: true,
          preventPaste: true,
          disableCopy: true,
          keyboardType: 'default'
        },

        display: {
          hideOnScreenshot: true,
          disableDebugMode: true,
          secureTextEntry: true,
          biometricEnabled: true
        },

        navigation: {
          blockDeepLinking: true,
          whitelistDomains: [process.env.EXPO_PUBLIC_APP_DOMAIN || 'your-app-domain.com'],
          forceHttps: true
        }
      },

      // Payment Security
      payment: {
        validation: {
          amountLimits: {
            min: 1,
            max: 50000,
            dailyLimit: 1000
          },
          currencyValidation: true,
          fraudDetection: true,
          velocityChecking: true
        },

        storage: {
          tokenization: true,
          encryption: true,
          secureStorage: true,
          expiryHandling: true
        },

        ui: {
          secureInput: true,
          hideAmount: false,
          biometricConfirmation: true,
          timeoutWarning: true
        }
      },

      // Development settings (inactive in PROD)
      development: {
        debugMode: false,
        allowInsecureConnections: false,
        mockSecurityFeatures: false,
        skipValidationRules: [],
        verboseLogging: false,
        performanceMonitoring: false
      },

      // Production-specific settings
      production: {
        secureMode: true,
        strictValidation: true,
        minimalLogging: true,
        fullEncryption: true,
        biometricRequired: true,
        certificateValidation: true
      },

      // Monitoring & Analytics
      monitoring: {
        securityEvents: {
          enabled: true,
          logLevel: 'error',
          trackBiometricAttempts: true,
          trackFailedLogins: true,
          trackSuspiciousActivity: true
        },

        performance: {
          enabled: true,
          sampleRate: 0.1, // 10% sample rate
          trackNetworkRequests: true,
          trackMemoryUsage: true
        }
      }
    };
  }

  /**
   * Validate security configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    if (isProd()) {
      // Validate production requirements
      if (!process.env.EXPO_PUBLIC_API_URL) {
        errors.push('EXPO_PUBLIC_API_URL is required in production');
      }

      // Validate token storage security
      if (this.config.authentication.tokenStorage.storage !== 'secureStore') {
        errors.push('secureStore is required for token storage in production');
      }

      // Validate network security
      if (!this.config.network.ssl.enforceHttps) {
        errors.push('HTTPS must be enforced in production');
      }

      // Validate biometric requirements
      if (this.config.production.biometricRequired && !this.config.authentication.biometric.enabled) {
        errors.push('Biometric authentication is required in production');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Security configuration validation failed: ${errors.join(', ')}`);
    }

    console.log(`✓ Frontend security configuration validated for ${this.config.environment}`);
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(serviceName: keyof SecurityConfig): any {
    return this.config[serviceName];
  }

  /**
   * Check if security feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    const path = feature.split('.');
    let current: any = this.config;

    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }

    return Boolean(current);
  }

  /**
   * Get security setting with environment-specific defaults
   */
  getSecuritySetting(path: string, defaultValue?: any): any {
    const parts = path.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Check if current environment requires strict security
   */
  isStrictMode(): boolean {
    return isProd() || this.config.production.secureMode;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return isLocal() && this.config.development.debugMode;
  }

  /**
   * Get environment-specific API configuration
   */
  getApiConfig() {
    return {
      baseURL: this.config.network.api.baseUrl,
      timeout: this.config.network.api.timeout,
      headers: this.config.network.headers,
      rateLimit: {
        enabled: this.config.network.api.rateLimitEnabled,
        windowMs: this.config.network.api.rateLimitWindow * 1000,
        maxRequests: this.config.network.api.rateLimitMax
      }
    };
  }

  /**
   * Get security middleware configuration
   */
  getMiddlewareConfig() {
    return {
      authentication: {
        tokenRefreshThreshold: this.config.authentication.tokenStorage.refreshThreshold,
        sessionTimeout: this.config.authentication.session.timeout * 60 * 1000,
        biometricRequired: this.config.production.biometricRequired
      },
      network: {
        enforceHttps: this.config.network.ssl.enforceHttps,
        certificatePinning: this.config.network.ssl.certificatePinning,
        strictTLS: this.config.network.ssl.strictTLS
      },
      data: {
        encryptAtRest: this.config.dataProtection.encryption.atRest,
        sanitizeLogging: this.config.dataProtection.logging.sanitization,
        maskSensitiveData: this.config.dataProtection.sensitive.masking.enabled
      }
    };
  }
}

// Export singleton instance
export const securityConfigManager = new SecurityConfigManager();

// Export convenience functions
export const getSecurityConfig = () => securityConfigManager.getConfig();
export const getSecurityServiceConfig = (serviceName: keyof SecurityConfig) =>
  securityConfigManager.getServiceConfig(serviceName);
export const isSecurityFeatureEnabled = (feature: string) =>
  securityConfigManager.isFeatureEnabled(feature);
export const getSecuritySetting = (path: string, defaultValue?: any) =>
  securityConfigManager.getSecuritySetting(path, defaultValue);
export const isSecurityStrictMode = () => securityConfigManager.isStrictMode();
export const isSecurityDebugMode = () => securityConfigManager.isDebugMode();
export const getSecurityApiConfig = () => securityConfigManager.getApiConfig();
export const getSecurityMiddlewareConfig = () => securityConfigManager.getMiddlewareConfig();

// Export type for service names
export type SecurityServiceName = keyof SecurityConfig;