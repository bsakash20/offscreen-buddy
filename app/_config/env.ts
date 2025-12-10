/**
 * Environment Detection and Validation System
 * Provides automatic environment detection and validation for the single APP_ENV variable
 */

import { Environment, EnvironmentInfo } from './types';

class EnvironmentDetector {
  private static instance: EnvironmentDetector | null = null;
  private environment: Environment = 'LOCAL';
  private isValidated: boolean = false;
  private info: EnvironmentInfo;

  private constructor() {
    this.environment = this.detectEnvironment();
    this.info = this.createEnvironmentInfo();
    this.validate();
  }

  static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  private detectEnvironment(): Environment {
    // Try to get APP_ENV from environment variables
    const envFromProcess = process.env.APP_ENV;
    
    if (envFromProcess) {
      const normalizedEnv = envFromProcess.toUpperCase().trim();
      
      if (normalizedEnv === 'LOCAL' || normalizedEnv === 'PROD') {
        console.log(`✓ Environment detected from process.env: ${normalizedEnv}`);
        return normalizedEnv as Environment;
      } else {
        console.warn(`⚠️  Invalid APP_ENV value: ${envFromProcess}. Valid values are 'LOCAL' or 'PROD'. Defaulting to LOCAL.`);
        return 'LOCAL';
      }
    }

    // Try to detect from NODE_ENV (development/production)
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv) {
      if (nodeEnv === 'production') {
        console.log('✓ Environment detected from NODE_ENV: PROD');
        return 'PROD';
      } else if (nodeEnv === 'development') {
        console.log('✓ Environment detected from NODE_ENV: LOCAL');
        return 'LOCAL';
      }
    }

    // Default to LOCAL for safety
    console.log('ℹ️  No environment specified, defaulting to LOCAL');
    return 'LOCAL';
  }

  private createEnvironmentInfo(): EnvironmentInfo {
    const envFromProcess = process.env.APP_ENV;
    
    let source: EnvironmentInfo['source'] = 'default';
    if (envFromProcess) {
      source = 'process.env';
    }

    return {
      environment: this.environment,
      isDevelopment: this.environment === 'LOCAL',
      isProduction: this.environment === 'PROD',
      isTest: process.env.NODE_ENV === 'test',
      detectedAt: new Date(),
      source,
    };
  }

  private validate(): void {
    if (this.isValidated) return;

    try {
      this.validateEnvironmentSpecificRules();
      this.isValidated = true;
      console.log(`✓ Environment validation passed for: ${this.environment}`);
    } catch (error) {
      console.error(`❌ Environment validation failed: ${error}`);
      throw error;
    }
  }

  private validateEnvironmentSpecificRules(): void {
    if (this.environment === 'LOCAL') {
      this.validateLocalEnvironment();
    } else {
      this.validateProductionEnvironment();
    }
  }

  private validateLocalEnvironment(): void {
    console.log('🔧 Validating LOCAL environment...');

    // Check for dangerous production values in LOCAL
    const dangerousPatterns = [
      { pattern: /secure\.payu\.in/i, name: 'PayU production URL' },
      { pattern: /prod[\w-]*\.supabase\.co/i, name: 'Production Supabase URL' },
    ];

    const allEnvValues = { ...process.env };
    const envString = JSON.stringify(allEnvValues);

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(envString)) {
        throw new Error(
          `🚨 SECURITY: ${name} detected in LOCAL environment. This is not allowed.`
        );
      }
    }

    console.log('✓ LOCAL environment validation passed');
  }

  private validateProductionEnvironment(): void {
    console.log('🚀 Validating PROD environment...');

    // Production-specific validations
    const requiredVariables = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
    ];

    const missingVariables = requiredVariables.filter(
      (key) => !process.env[key]
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `🚨 PROD environment missing required variables: ${missingVariables.join(', ')}`
      );
    }

    // Check for proper Supabase URL format
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl || !supabaseUrl.includes('.supabase.co')) {
      throw new Error('🚨 Invalid Supabase URL format in production');
    }

    console.log('✓ PROD environment validation passed');
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  getEnvironmentInfo(): EnvironmentInfo {
    return { ...this.info };
  }

  isLocal(): boolean {
    return this.environment === 'LOCAL';
  }

  isProd(): boolean {
    return this.environment === 'PROD';
  }

  isDevelopment(): boolean {
    return this.isLocal();
  }

  // Force environment (useful for testing)
  setEnvironment(environment: Environment): void {
    if (environment !== 'LOCAL' && environment !== 'PROD') {
      throw new Error(`Invalid environment: ${environment}`);
    }

    this.environment = environment;
    this.info = this.createEnvironmentInfo();
    this.isValidated = false; // Revalidate with new environment
    this.validate();
    
    console.log(`🔄 Environment forced to: ${environment}`);
  }

  // Reset to auto-detection
  resetToAuto(): void {
    this.environment = this.detectEnvironment();
    this.info = this.createEnvironmentInfo();
    this.isValidated = false;
    this.validate();
    
    console.log('🔄 Environment reset to auto-detection');
  }
}

// Export singleton instance
export const environmentDetector = EnvironmentDetector.getInstance();

// Export convenience functions
export const getEnvironment = () => environmentDetector.getEnvironment();
export const isLocal = () => environmentDetector.isLocal();
export const isProd = () => environmentDetector.isProd();
export const isDevelopment = () => environmentDetector.isDevelopment();

// Export environment info
export const getEnvironmentInfo = () => environmentDetector.getEnvironmentInfo();

// Re-export types for convenience
export type { Environment, EnvironmentInfo };