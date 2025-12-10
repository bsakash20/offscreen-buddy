/**
 * React Native Logging Utilities
 * Provides structured logging for mobile applications with environment-specific configurations
 * Supports console logging, crash reporting, and analytics integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { environmentDetector, getEnvironment } from '../_config/env';

// Log levels enum
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry interface
interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: {
    deviceInfo?: DeviceInfo;
    appInfo?: AppInfo;
    userInfo?: UserInfo;
    networkInfo?: NetworkInfo;
  };
}

// Device information
interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  isTablet?: boolean;
  memoryUsage?: number;
}

// App information
interface AppInfo {
  version: string;
  buildNumber: string;
  bundleId: string;
  environment: string;
}

// User information (anonymized)
interface UserInfo {
  userId?: string;
  sessionId?: string;
  anonymizedId?: string;
}

// Network information
interface NetworkInfo {
  isConnected: boolean;
  networkType?: string;
  effectiveType?: string;
}

class Logger {
  private static instance: Logger;
  private environment: string;
  private deviceInfo: DeviceInfo;
  private appInfo: AppInfo;
  private userSessionId: string;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.environment = getEnvironment();
    this.deviceInfo = this.getDeviceInfo();
    this.appInfo = this.getAppInfo();
    this.userSessionId = this.generateSessionId();
    
    this.initialize();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async initialize() {
    try {
      await this.loadStoredSession();
      this.startBufferFlush();
      
      // Log app start
      this.info('Logger initialized', {
        environment: this.environment,
        deviceInfo: this.deviceInfo,
        appInfo: this.appInfo
      });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  /**
   * Log error level message
   */
  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info level message
   */
  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: Record<string, any>) {
    if (this.environment === 'LOCAL') {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Log payment transaction
   */
  payment(transactionType: string, details: Record<string, any>) {
    const sanitizedDetails = this.sanitizeSensitiveData(details);
    
    this.log(LogLevel.INFO, `Payment ${transactionType}`, {
      transactionType,
      ...sanitizedDetails
    }, undefined, {
      category: 'payment',
      sensitive: true
    });
  }

  /**
   * Log authentication events
   */
  auth(event: string, details: Record<string, any>) {
    const sanitizedDetails = this.sanitizeSensitiveData(details);
    
    this.log(LogLevel.INFO, `Auth ${event}`, {
      event,
      ...sanitizedDetails
    }, undefined, {
      category: 'authentication',
      sensitive: true
    });
  }

  /**
   * Log user action for analytics
   */
  userAction(action: string, details?: Record<string, any>) {
    this.log(LogLevel.INFO, `User action: ${action}`, {
      action,
      ...details
    }, undefined, {
      category: 'analytics',
      anonymized: true
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, `Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...metadata
    }, undefined, {
      category: 'performance'
    });
  }

  /**
   * Log security events
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: Record<string, any>) {
    const logLevel = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    
    this.log(logLevel, `Security event: ${event}`, {
      event,
      severity,
      ...details
    }, undefined, {
      category: 'security',
      priority: severity
    });
  }

  /**
   * Log API requests
   */
  apiRequest(method: string, url: string, statusCode: number, duration: number, responseSize?: number) {
    const isError = statusCode >= 400;
    const logLevel = isError ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(logLevel, `API ${method} ${url}`, {
      method,
      url: this.sanitizeUrl(url),
      statusCode,
      duration: `${duration}ms`,
      responseSize,
      isError
    }, undefined, {
      category: 'api'
    });
  }

  /**
   * Log errors with stack trace
   */
  errorWithStack(message: string, error: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    metadata?: {
      category?: string;
      sensitive?: boolean;
      anonymized?: boolean;
      priority?: string;
    }
  ) {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context: metadata?.sensitive ? this.sanitizeSensitiveData(context) : context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      metadata: {
        deviceInfo: this.deviceInfo,
        appInfo: this.appInfo,
        userInfo: this.getAnonymizedUserInfo(),
        networkInfo: this.getNetworkInfo()
      }
    };

    // Add metadata
    if (metadata) {
      (logEntry as any).metadata = {
        ...logEntry.metadata,
        ...metadata
      };
    }

    // Console output for development
    if (this.environment === 'LOCAL') {
      this.outputToConsole(logEntry);
    }

    // Add to buffer
    this.addToBuffer(logEntry);

    // Send to crash reporting service in production
    if (this.environment === 'PROD' && level === LogLevel.ERROR) {
      this.sendToCrashReporting(logEntry);
    }
  }

  /**
   * Output to console based on environment
   */
  private outputToConsole(logEntry: LogEntry) {
    const { level, message, context, error } = logEntry;
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    
    let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      output += `\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    if (error) {
      output += `\nError: ${error.message}`;
      if (error.stack) {
        output += `\nStack: ${error.stack}`;
      }
    }

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
    }
  }

  /**
   * Add log entry to buffer
   */
  private addToBuffer(logEntry: LogEntry) {
    this.logBuffer.push(logEntry);
    
    // Maintain buffer size limit
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift();
    }
  }

  /**
   * Start periodic buffer flush
   */
  private startBufferFlush() {
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.FLUSH_INTERVAL);

    // Flush on app state changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushBuffer();
        }
      });
    }
  }

  /**
   * Flush log buffer to storage
   */
  private async flushBuffer() {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // Store in AsyncStorage
      const existingLogs = await this.getStoredLogs();
      const updatedLogs = [...existingLogs, ...logsToFlush].slice(-1000); // Keep last 1000 logs
      
      await AsyncStorage.setItem('app_logs', JSON.stringify(updatedLogs));
      
      // In production, also send to analytics service
      if (this.environment === 'PROD') {
        await this.sendToAnalytics(logsToFlush);
      }
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
    }
  }

  /**
   * Send logs to analytics service
   */
  private async sendToAnalytics(logs: LogEntry[]) {
    try {
      // Implementation would send to your analytics service
      // For now, we'll just structure the data
      const analyticsData = logs.map(log => ({
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        category: (log.metadata as any)?.category,
        anonymized: (log.metadata as any)?.anonymized
      }));
      
      // Send to your analytics endpoint
      // await fetch('/api/analytics/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(analyticsData)
      // });
    } catch (error) {
      console.error('Failed to send logs to analytics:', error);
    }
  }

  /**
   * Send error logs to crash reporting service
   */
  private async sendToCrashReporting(logEntry: LogEntry) {
    try {
      // Implementation would send to crash reporting service like Sentry
      // For now, we'll structure the data appropriately
      const crashData = {
        message: logEntry.message,
        level: logEntry.level,
        timestamp: logEntry.timestamp,
        error: logEntry.error,
        context: logEntry.context,
        metadata: logEntry.metadata
      };
      
      // Send to your crash reporting endpoint
      // await fetch('/api/crash-reporting', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(crashData)
      // });
    } catch (error) {
      console.error('Failed to send crash report:', error);
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS,
      version: Platform.Version?.toString() || 'unknown',
      model: Platform.select({ ios: 'iOS', android: 'Android' }),
      isTablet: false // Would need react-native-device-info for actual detection
    };
  }

  /**
   * Get app information
   */
  private getAppInfo(): AppInfo {
    return {
      version: '1.0.0', // Would come from app config
      buildNumber: '1', // Would come from app config
      bundleId: 'com.offscreenbuddy.app',
      environment: this.environment
    };
  }

  /**
   * Get anonymized user information
   */
  private getAnonymizedUserInfo(): UserInfo {
    return {
      sessionId: this.userSessionId,
      anonymizedId: this.userSessionId.slice(-8)
    };
  }

  /**
   * Get network information
   */
  private getNetworkInfo(): NetworkInfo {
    return {
      isConnected: true, // Would need react-native-netinfo for actual detection
      networkType: 'unknown'
    };
  }

  /**
   * Load stored session from AsyncStorage
   */
  private async loadStoredSession() {
    try {
      const storedSession = await AsyncStorage.getItem('user_session');
      if (storedSession) {
        this.userSessionId = storedSession;
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
    }
  }

  /**
   * Store session in AsyncStorage
   */
  private async storeSession() {
    try {
      await AsyncStorage.setItem('user_session', this.userSessionId);
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  /**
   * Get stored logs from AsyncStorage
   */
  private async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const storedLogs = await AsyncStorage.getItem('app_logs');
      return storedLogs ? JSON.parse(storedLogs) : [];
    } catch (error) {
      console.error('Failed to get stored logs:', error);
      return [];
    }
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeSensitiveData(data: Record<string, any> | undefined): Record<string, any> {
    if (!data) return {};

    const sensitiveFields = [
      'password', 'token', 'key', 'secret', 'auth', 'authorization',
      'cardNumber', 'cvv', 'pan', 'accountNumber', 'upi', 'pin',
      'salt', 'merchantKey', 'hash'
    ];

    const sanitized = { ...data };

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    return url.replace(/\?.*$/, ''); // Remove query parameters
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get logs for debugging
   */
  async getLogs(): Promise<LogEntry[]> {
    const storedLogs = await this.getStoredLogs();
    return [...storedLogs, ...this.logBuffer];
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem('app_logs');
      this.logBuffer = [];
      this.info('Logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Force flush buffer
   */
  async flushNow(): Promise<void> {
    await this.flushBuffer();
  }

  /**
   * Update user session
   */
  setUserSession(userId: string) {
    this.userSessionId = `user_${userId}_${Date.now()}`;
    this.storeSession();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logError = (message: string, context?: Record<string, any>, error?: Error) => 
  logger.error(message, context, error);

export const logWarn = (message: string, context?: Record<string, any>) => 
  logger.warn(message, context);

export const logInfo = (message: string, context?: Record<string, any>) => 
  logger.info(message, context);

export const logDebug = (message: string, context?: Record<string, any>) => 
  logger.debug(message, context);

export const logPayment = (transactionType: string, details: Record<string, any>) => 
  logger.payment(transactionType, details);

export const logAuth = (event: string, details: Record<string, any>) => 
  logger.auth(event, details);

export const logUserAction = (action: string, details?: Record<string, any>) => 
  logger.userAction(action, details);

export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => 
  logger.performance(operation, duration, metadata);

export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: Record<string, any>) => 
  logger.security(event, severity, details);

export const logApiRequest = (method: string, url: string, statusCode: number, duration: number, responseSize?: number) => 
  logger.apiRequest(method, url, statusCode, duration, responseSize);

// Export types
export type { LogEntry, DeviceInfo, AppInfo, UserInfo, NetworkInfo };