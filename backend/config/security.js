/**
 * Comprehensive Security Configuration System - Enhanced Version
 * Environment-specific security settings for LOCAL/PROD environments
 * Includes advanced protections, rate limiting, and comprehensive monitoring
 */

const crypto = require('crypto');
const { getEnvironment, isLocal, isProd, getConfig } = require('./environment');

/**
 * Enhanced Security Configuration Manager
 * Manages comprehensive security policies and configurations
 */
class EnhancedSecurityConfigManager {
  constructor() {
    this.config = this.loadSecurityConfig();
    this.loadEnhancedProtections();
  }

  /**
   * Load security configuration based on current environment
   */
  loadSecurityConfig() {
    const environment = getEnvironment();
    console.log(`🔒 Loading enhanced security configuration for ${environment} environment...`);

    if (isLocal()) {
      return this.getLocalSecurityConfig();
    } else {
      return this.getProdSecurityConfig();
    }
  }

  /**
   * Load additional enhanced protections
   */
  loadEnhancedProtections() {
    this.enhancedProtections = {
      // Advanced threat detection
      threatDetection: {
        enabled: isProd(),
        suspiciousPatterns: [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
          /(<script|javascript:|vbscript:|data:)/i,
          /(union.*select|or\s+1=1|and\s+1=1)/i
        ],
        ipReputationCheck: isProd(),
        userAgentValidation: true,
        referrerValidation: true
      },

      // Advanced rate limiting
      advancedRateLimit: {
        enabled: true,
        redis: {
          enabled: false, // Will be enabled in production with Redis
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB || 0
        },
        slidingWindow: true,
        burstProtection: true,
        whitelist: ['127.0.0.1', '::1'],
        blacklist: []
      },

      // Request fingerprinting
      fingerprinting: {
        enabled: true,
        headerValidation: true,
        browserFingerprinting: true,
        deviceTracking: true,
        suspiciousDetection: true
      },

      // Content validation
      contentValidation: {
        enabled: true,
        maxDepth: 10, // Maximum nested object depth
        maxArrayLength: 1000,
        maxStringLength: 10000,
        restrictedFields: ['__proto__', 'constructor', 'prototype']
      }
    };
  }

  /**
   * LOCAL Environment Security Configuration
   * Enhanced security for development with proper protections
   */
  getLocalSecurityConfig() {
    return {
      environment: 'LOCAL',

      // Authentication Security (Enhanced)
      authentication: {
        jwt: {
          secret: process.env.JWT_SECRET,
          algorithm: 'HS256',
          expiresIn: '24h', // Longer expiry for development
          issuer: 'offscreen-buddy-local',
          audience: 'offscreen-buddy-dev',
          refreshTokenExpiry: '30d',
          algorithmOptions: {
            expiresIn: '24h',
            issuer: 'offscreen-buddy-local',
            audience: 'offscreen-buddy-dev'
          },
          // Enhanced security settings
          issuerValidation: true,
          audienceValidation: true,
          clockTolerance: 5,
          maxAge: 24 * 60 * 60 // 24 hours
        },

        session: {
          name: 'offscreen_buddy_sid',
          secret: process.env.SESSION_SECRET,
          resave: true,
          saveUninitialized: true,
          cookie: {
            secure: false, // HTTP for local development
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax'
          }
        },

        password: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
          allowCommonPasswords: false,
          strengthMeterEnabled: true,
          // Enhanced password protection
          preventReuse: 3,
          lockoutThreshold: 5,
          lockoutDuration: 5 * 60 * 1000, // 5 minutes
          complexityValidation: true
        },

        tokens: {
          refreshTokenRotation: true,
          maxRefreshTokens: 3,
          blacklistEnabled: true,
          gracePeriod: 5 * 60 * 1000, // 5 minutes
          // Enhanced token security
          secureGeneration: true,
          algorithm: 'SHA256',
          keyDerivation: 'PBKDF2',
          iterations: 10000
        }
      },

      // API Security (Enhanced)
      api: {
        rateLimit: {
          enabled: true,
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // Higher limit for development
          message: 'Too many requests from this IP',
          standardHeaders: true,
          legacyHeaders: false,
          skip: (req) => {
            // Skip rate limiting for local development
            return req.ip === '127.0.0.1' || req.ip === '::1';
          },
          // Enhanced rate limiting
          burstLimit: 50, // Max requests in burst
          burstWindow: 5000, // 5 second burst window
          ipBlocklist: [],
          userAgentValidation: true
        },

        cors: {
          origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-API-Key',
            'X-CSRF-Token'
          ],
          exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Limit', 'X-Request-ID'],
          maxAge: 86400, // 24 hours
          // Enhanced CORS security
          strictOrigin: false, // Relaxed for development
          credentialsValidation: true
        },

        requestValidation: {
          enabled: true,
          strictMode: true,
          sanitizeInputs: true,
          removeNullBytes: true,
          maxRequestSize: '5mb', // Reduced for security
          allowedContentTypes: [
            'application/json',
            'application/x-www-form-urlencoded'
          ],
          // Enhanced validation
          contentTypeValidation: true,
          headerValidation: true,
          bodySizeValidation: true,
          nestedObjectLimit: 10,
          arrayLengthLimit: 100
        },

        sqlInjectionPrevention: {
          enabled: true,
          mode: 'block', // Block in development too
          blockedPatterns: [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\b)/i,
            /(\b(UNION|SELECT)\s+.*\b(FROM|INTO|WHERE)\b)/i,
            /(union.*select|or\s+1=1|and\s+1=1)/i
          ],
          sanitizeUserInput: true,
          // Enhanced SQL injection prevention
          whitelistQueries: true,
          parameterValidation: true,
          queryAnalysis: true
        },

        xssProtection: {
          enabled: true,
          mode: 'block', // Block in development
          contentSecurityPolicy: true,
          sanitizeHtml: {
            allowedTags: ['p', 'br', 'strong', 'em'],
            allowedAttributes: {},
            allowedSchemes: ['http', 'https', 'mailto']
          },
          // Enhanced XSS protection
          scriptInjectionDetection: true,
          eventHandlerRemoval: true,
          dangerousProtocolBlocking: true,
          domPurify: true
        },

        csrf: {
          enabled: true, // Enabled even in development
          cookie: {
            key: '_csrf',
            options: {
              httpOnly: true,
              secure: false,
              sameSite: 'lax'
            }
          },
          // Enhanced CSRF protection
          tokenValidation: true,
          doubleSubmitCookie: true,
          sameSiteValidation: true
        }
      },

      // Database Security
      database: {
        connection: {
          ssl: false, // Disabled for local development
          requireSSL: false,
          rejectUnauthorized: false,
          retryAttempts: 3,
          timeout: 30000,
          idleTimeout: 600000
        },

        permissions: {
          enforceRLS: false, // Disabled for local development
          rowLevelSecurity: false,
          columnLevelSecurity: false
        },

        encryption: {
          atRest: false, // Disabled for local development
          inTransit: false,
          algorithm: 'AES-256-GCM',
          keyRotation: false
        },

        audit: {
          enabled: false, // Disabled for local development
          logAllQueries: false,
          logFailedQueries: true,
          retentionDays: 7
        },

        backup: {
          automated: false,
          encryption: false,
          retention: 1 // 1 day
        }
      },

      // Payment Security
      payment: {
        payu: {
          environment: 'sandbox',
          merchantKey: process.env.PAYU_MERCHANT_KEY,
          salt: process.env.PAYU_SALT,
          baseUrl: 'https://test.payu.in/_payment',
          webhookSecret: process.env.PAYU_WEBHOOK_SECRET,
          hashAlgorithm: 'SHA512',
          timeout: 30000,
          retryAttempts: 3
        },

        pci: {
          enabled: false, // Disabled for local development
          strictMode: false,
          validateCardData: false,
          encryptCardData: false,
          tokenizePaymentData: false
        },

        fraud: {
          enabled: false, // Disabled for local development
          velocityCheck: false,
          geoLocationCheck: false,
          deviceFingerprinting: false,
          riskScoring: false
        },

        validation: {
          amount: {
            min: 1,
            max: 1000000,
            currency: 'INR'
          },
          currency: {
            allowed: ['INR', 'USD'],
            default: 'INR'
          },
          callback: {
            timeout: 30000,
            retryAttempts: 3,
            verifySignature: false // Disabled for local development
          }
        }
      },

      // Network Security
      network: {
        https: {
          enforce: false, // Disabled for local development
          redirectHttp: false,
          hsts: {
            enabled: false,
            maxAge: 31536000,
            includeSubDomains: false,
            preload: false
          }
        },

        tls: {
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.3',
          ciphers: [], // Default ciphers for development
          honorCipherOrder: false,
          ecdhCurve: 'prime256v1'
        },

        certificate: {
          autoGenerate: false,
          path: null,
          keyPath: null,
          caPath: null,
          passphrase: null
        },

        firewall: {
          enabled: false, // Disabled for local development
          rules: [],
          defaultPolicy: 'allow'
        },

        access: {
          control: {
            enabled: false,
            vpnRequired: false,
            ipWhitelist: ['127.0.0.1', '::1'],
            ipBlacklist: []
          }
        }
      },

      // Data Protection
      dataProtection: {
        sensitive: {
          detection: {
            enabled: true,
            patterns: [
              /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
              /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card pattern
              /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
              /\b\d{10,15}\b/ // Phone number pattern
            ]
          },
          handling: 'mask', // Mask sensitive data in logs
          masking: {
            email: { enabled: true, keepDomain: true },
            phone: { enabled: true, keepLast4: true },
            card: { enabled: true, keepLast4: true },
            ssn: { enabled: true, keepLast4: true }
          }
        },

        logging: {
          pii: {
            enabled: false, // Allow PII in logs for local development
            retention: 30,
            anonymization: false
          },
          sensitiveFields: [
            'password',
            'token',
            'secret',
            'key',
            'credit_card',
            'ssn'
          ],
          maskingEnabled: true,
          excludeFields: []
        },

        retention: {
          userData: {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            autoDelete: false
          },
          sessionData: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            autoDelete: true
          },
          auditLogs: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            autoDelete: false
          }
        },

        gdpr: {
          enabled: false, // Disabled for local development
          consentRequired: false,
          rightToErasure: false,
          dataPortability: false,
          breachNotification: false,
          privacyByDesign: false
        }
      },

      // Monitoring and Logging
      monitoring: {
        security: {
          enabled: true,
          logLevel: 'info',
          events: {
            authentication: {
              enabled: true,
              logLevel: 'info',
              includeDetails: true
            },
            authorization: {
              enabled: true,
              logLevel: 'info',
              includeDetails: true
            },
            dataAccess: {
              enabled: false, // Disabled for local development
              logLevel: 'warn',
              includeDetails: false
            },
            suspicious: {
              enabled: true,
              logLevel: 'warn',
              thresholds: {
                failedLogins: 5,
                rapidRequests: 100,
                unusualActivity: true
              }
            }
          }
        },

        alerts: {
          enabled: false, // Disabled for local development
          channels: [],
          escalation: false,
          silenceHours: []
        },

        audit: {
          enabled: false, // Disabled for local development
          detailed: false,
          includeRequestBody: false,
          includeResponseBody: false
        }
      },

      // Headers Security
      headers: {
        xssProtection: '1; mode=block',
        contentTypeNosniff: true,
        frameOptions: 'SAMEORIGIN',
        contentSecurityPolicy: false, // Disabled for local development
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: [
          'camera=()',
          'microphone=()',
          'geolocation=()'
        ].join(', ')
      },

      // Development-specific settings
      development: {
        debugMode: true,
        allowPasswordLeaks: true, // For debugging
        skipValidation: [],
        mockSecurityServices: true,
        bypassPaymentValidation: true
      }
    };
  }

  /**
   * PROD Environment Security Configuration
   * Maximum security enforcement for production
   */
  getProdSecurityConfig() {
    return {
      environment: 'PROD',

      // Authentication Security
      authentication: {
        jwt: {
          secret: this.generateSecureSecret('JWT_SECRET', 64),
          algorithm: 'HS256',
          expiresIn: '15m', // Short expiry for production
          issuer: 'offscreen-buddy',
          audience: 'offscreen-buddy-app',
          refreshTokenExpiry: '7d',
          algorithmOptions: {
            expiresIn: '15m',
            issuer: 'offscreen-buddy',
            audience: 'offscreen-buddy-app'
          },
          clockTolerance: 5 // 5 seconds
        },

        session: {
          name: 'offscreen_buddy_secure',
          secret: this.generateSecureSecret('SESSION_SECRET', 128),
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: true, // HTTPS only
            httpOnly: true,
            maxAge: 60 * 60 * 1000, // 1 hour
            sameSite: 'strict'
          }
        },

        password: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          allowCommonPasswords: false,
          strengthMeterEnabled: true,
          preventReuse: 5,
          lockoutThreshold: 5,
          lockoutDuration: 30 * 60 * 1000 // 30 minutes
        },

        tokens: {
          refreshTokenRotation: true,
          maxRefreshTokens: 1,
          blacklistEnabled: true,
          gracePeriod: 0 // No grace period in production
        }
      },

      // API Security
      api: {
        rateLimit: {
          enabled: true,
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100, // Strict limit for production
          message: 'Rate limit exceeded',
          standardHeaders: true,
          legacyHeaders: false,
          skip: (req) => false, // No skips in production
          keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise IP
            return req.user?.id || req.ip;
          }
        },

        cors: {
          origin: process.env.CORS_ORIGIN,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With'
          ],
          exposedHeaders: ['X-Total-Count'],
          maxAge: 3600 // 1 hour
        },

        requestValidation: {
          enabled: true,
          strictMode: true,
          sanitizeInputs: true,
          removeNullBytes: true,
          maxRequestSize: '1mb', // Smaller limit for production
          allowedContentTypes: ['application/json']
        },

        sqlInjectionPrevention: {
          enabled: true,
          mode: 'block', // Block in production
          blockedPatterns: [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|INFORMATION_SCHEMA|SYS|TABLE_SCHEMA)\b)/i,
            /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\b)/i,
            /(\b(UNION|SELECT)\s+.*\b(FROM|INTO|WHERE)\b)/i,
            /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
          ],
          sanitizeUserInput: true,
          whitelistQueries: []
        },

        xssProtection: {
          enabled: true,
          mode: 'block', // Block in production
          contentSecurityPolicy: true,
          cspPolicy: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'", "https://*.supabase.co"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            childSrc: ["'none'"]
          },
          sanitizeHtml: {
            allowedTags: ['p', 'br', 'strong', 'em'],
            allowedAttributes: {},
            allowedSchemes: ['http', 'https', 'mailto']
          }
        },

        csrf: {
          enabled: true,
          cookie: {
            key: '_csrf',
            options: {
              httpOnly: true,
              secure: true,
              sameSite: 'strict'
            }
          }
        }
      },

      // Database Security
      database: {
        connection: {
          ssl: true,
          requireSSL: true,
          rejectUnauthorized: true,
          retryAttempts: 3,
          timeout: 10000,
          idleTimeout: 300000,
          maxConnections: 10
        },

        permissions: {
          enforceRLS: true,
          rowLevelSecurity: true,
          columnLevelSecurity: true,
          readOnly: false,
          granularPermissions: true
        },

        encryption: {
          atRest: true,
          inTransit: true,
          algorithm: 'AES-256-GCM',
          keyRotation: true,
          keyRotationInterval: 90 * 24 * 60 * 60 * 1000 // 90 days
        },

        audit: {
          enabled: true,
          logAllQueries: false,
          logFailedQueries: true,
          logSlowQueries: true,
          slowQueryThreshold: 1000, // 1 second
          retentionDays: 90
        },

        backup: {
          automated: true,
          encryption: true,
          retention: 30, // 30 days
          verification: true
        }
      },

      // Payment Security
      payment: {
        payu: {
          environment: 'production',
          merchantKey: process.env.PAYU_MERCHANT_KEY,
          salt: process.env.PAYU_SALT,
          baseUrl: 'https://secure.payu.in/_payment',
          webhookSecret: process.env.PAYU_WEBHOOK_SECRET,
          hashAlgorithm: 'SHA512',
          timeout: 10000,
          retryAttempts: 1
        },

        pci: {
          enabled: true,
          strictMode: true,
          validateCardData: true,
          encryptCardData: true,
          tokenizePaymentData: true,
          complianceLevel: 'level1'
        },

        fraud: {
          enabled: true,
          velocityCheck: true,
          geoLocationCheck: true,
          deviceFingerprinting: true,
          riskScoring: true,
          riskThresholds: {
            high: 80,
            medium: 60,
            low: 40
          }
        },

        validation: {
          amount: {
            min: 1,
            max: 100000,
            currency: 'INR'
          },
          currency: {
            allowed: ['INR'],
            default: 'INR'
          },
          callback: {
            timeout: 10000,
            retryAttempts: 1,
            verifySignature: true,
            strictValidation: true
          }
        }
      },

      // Network Security
      network: {
        https: {
          enforce: true,
          redirectHttp: true,
          hsts: {
            enabled: true,
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
        },

        tls: {
          minVersion: 'TLSv1.3',
          maxVersion: 'TLSv1.3',
          ciphers: [
            'TLS_AES_256_GCM_SHA384',
            'TLS_CHACHA20_POLY1305_SHA256',
            'TLS_AES_128_GCM_SHA256'
          ],
          honorCipherOrder: true,
          ecdhCurve: 'X25519'
        },

        certificate: {
          autoGenerate: false,
          path: process.env.SSL_CERT_PATH,
          keyPath: process.env.SSL_KEY_PATH,
          caPath: process.env.SSL_CA_PATH,
          passphrase: process.env.SSL_PASSPHRASE
        },

        firewall: {
          enabled: true,
          rules: [
            {
              action: 'allow',
              protocol: 'tcp',
              port: 443,
              source: 'any'
            },
            {
              action: 'redirect',
              from: 80,
              to: 443
            }
          ],
          defaultPolicy: 'deny'
        },

        access: {
          control: {
            enabled: true,
            vpnRequired: false,
            ipWhitelist: this.parseIpWhitelist(process.env.ALLOWED_IPS),
            ipBlacklist: this.parseIpBlacklist(process.env.BLOCKED_IPS)
          }
        }
      },

      // Data Protection
      dataProtection: {
        sensitive: {
          detection: {
            enabled: true,
            patterns: [
              /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
              /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card pattern
              /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
              /\b\d{10,15}\b/, // Phone number pattern
              /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{4}[A-Z0-9]{3,7}\b/ // IBAN pattern
            ]
          },
          handling: 'block', // Block in production
          masking: {
            email: { enabled: true, keepDomain: true },
            phone: { enabled: true, keepLast4: true },
            card: { enabled: true, keepLast4: true },
            ssn: { enabled: true, keepLast4: true }
          }
        },

        logging: {
          pii: {
            enabled: false, // Never log PII in production
            retention: 0,
            anonymization: true
          },
          sensitiveFields: [
            'password',
            'token',
            'secret',
            'key',
            'credit_card',
            'ssn',
            'cvv',
            'pin'
          ],
          maskingEnabled: true,
          excludeFields: [
            'authorization',
            'cookie',
            'x-api-key'
          ]
        },

        retention: {
          userData: {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            autoDelete: true
          },
          sessionData: {
            maxAge: 60 * 60 * 1000, // 1 hour
            autoDelete: true
          },
          auditLogs: {
            maxAge: 2555 * 24 * 60 * 60 * 1000, // 7 years for compliance
            autoDelete: true
          }
        },

        gdpr: {
          enabled: true,
          consentRequired: true,
          rightToErasure: true,
          dataPortability: true,
          breachNotification: true,
          privacyByDesign: true
        }
      },

      // Monitoring and Logging
      monitoring: {
        security: {
          enabled: true,
          logLevel: 'info',
          events: {
            authentication: {
              enabled: true,
              logLevel: 'info',
              includeDetails: true
            },
            authorization: {
              enabled: true,
              logLevel: 'info',
              includeDetails: true
            },
            dataAccess: {
              enabled: true,
              logLevel: 'info',
              includeDetails: true
            },
            suspicious: {
              enabled: true,
              logLevel: 'error',
              thresholds: {
                failedLogins: 3,
                rapidRequests: 50,
                unusualActivity: true
              }
            }
          }
        },

        alerts: {
          enabled: true,
          channels: this.parseAlertChannels(process.env.ALERT_CHANNELS),
          escalation: true,
          silenceHours: this.parseSilenceHours(process.env.ALERT_SILENCE_HOURS)
        },

        audit: {
          enabled: true,
          detailed: true,
          includeRequestBody: false,
          includeResponseBody: false,
          retention: 7 * 365 // 7 years
        }
      },

      // Headers Security
      headers: {
        xssProtection: '1; mode=block',
        contentTypeNosniff: true,
        frameOptions: 'DENY',
        contentSecurityPolicy: true,
        referrerPolicy: 'strict-origin',
        permissionsPolicy: [
          'camera=()',
          'microphone=()',
          'geolocation=()',
          'payment=()'
        ].join(', '),
        strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload'
      },

      // Production-specific settings
      production: {
        debugMode: false,
        allowPasswordLeaks: false,
        skipValidation: [],
        mockSecurityServices: false,
        bypassPaymentValidation: false,
        strictMode: true
      }
    };
  }

  /**
   * Generate secure random secret
   */
  generateSecureSecret(envVar, length = 64) {
    const existingSecret = process.env[envVar];
    if (existingSecret && existingSecret.length >= length) {
      return existingSecret;
    }

    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Parse IP whitelist from environment variable
   */
  parseIpWhitelist(ipString) {
    if (!ipString) return ['127.0.0.1'];
    return ipString.split(',').map(ip => ip.trim());
  }

  /**
   * Parse IP blacklist from environment variable
   */
  parseIpBlacklist(ipString) {
    if (!ipString) return [];
    return ipString.split(',').map(ip => ip.trim());
  }

  /**
   * Parse alert channels from environment variable
   */
  parseAlertChannels(channelString) {
    if (!channelString) return [];
    return channelString.split(',').map(channel => channel.trim());
  }

  /**
   * Parse silence hours from environment variable
   */
  parseSilenceHours(hoursString) {
    if (!hoursString) return [];
    return hoursString.split(',').map(hour => parseInt(hour.trim()));
  }

  /**
   * Get current security configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(serviceName) {
    const config = this.getConfig();

    switch (serviceName.toLowerCase()) {
      case 'authentication':
        return config.authentication;
      case 'api':
        return config.api;
      case 'database':
        return config.database;
      case 'payment':
        return config.payment;
      case 'network':
        return config.network;
      case 'data-protection':
        return config.dataProtection;
      case 'monitoring':
        return config.monitoring;
      case 'headers':
        return config.headers;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Reload security configuration
   */
  reload() {
    this.config = this.loadSecurityConfig();
    return this.config;
  }

  /**
   * Validate security configuration
   */
  validate() {
    const config = this.getConfig();
    const errors = [];

    // Validate required environment variables
    if (isProd()) {
      const requiredVars = [
        'JWT_SECRET',
        'SESSION_SECRET',
        'PAYU_MERCHANT_KEY',
        'PAYU_SALT',
        'CORS_ORIGIN'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        errors.push(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      // Validate secrets are sufficiently long
      const secrets = [
        { name: 'JWT_SECRET', value: process.env.JWT_SECRET, minLength: 32 },
        { name: 'SESSION_SECRET', value: process.env.SESSION_SECRET, minLength: 32 }
      ];

      secrets.forEach(({ name, value, minLength }) => {
        if (value && value.length < minLength) {
          errors.push(`${name} must be at least ${minLength} characters long`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}

// Export singleton instance
const securityConfigManager = new EnhancedSecurityConfigManager();

// Export functions
module.exports = {
  // Security configuration
  getSecurityConfig: () => securityConfigManager.getConfig(),
  getSecurityServiceConfig: (serviceName) => securityConfigManager.getServiceConfig(serviceName),
  reloadSecurityConfig: () => securityConfigManager.reload(),
  validateSecurityConfig: () => securityConfigManager.validate(),

  // Environment info
  getSecurityEnvironment: () => getEnvironment(),
  isSecurityLocal: () => isLocal(),
  isSecurityProd: () => isProd(),

  // Security managers
  securityConfigManager,

  // Constants
  SECURITY_ENVIRONMENTS: {
    LOCAL: 'LOCAL',
    PROD: 'PROD'
  }
};

// Initialize security configuration
securityConfigManager.loadSecurityConfig();