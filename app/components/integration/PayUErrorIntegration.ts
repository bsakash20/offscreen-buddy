/**
 * PayU Error Integration
 * Provides PayU-specific error handling and crash reporting integration
 * Maps PayU payment errors to the cross-platform error system with enhanced context
 */

import {
    CrossPlatformAppError,
    CrossPlatformErrorCategory,
    ErrorSeverity,
    UserImpactLevel,
    PlatformErrorContext,
    PayUError
} from '../../types/ErrorTypes';
import { crossPlatformErrorLogger } from '../../services/CrossPlatformErrorLogger';
import { crashReportingService } from '../../services/CrashReportingService';
import { errorAnalyticsService } from '../../services/ErrorAnalytics';
import { performanceMonitoringService } from '../../services/PerformanceMonitoring';
import { errorStorageService } from '../../services/ErrorStorageService';
import { logError, logWarn, logInfo } from '../../utils/Logger';

export interface PayUErrorData {
    transactionId?: string;
    bankCode?: string;
    amount?: number;
    currency?: string;
    gatewayResponse?: any;
    paymentMethod?: string;
    customerDetails?: {
        email?: string;
        phone?: string;
        name?: string;
    };
    merchantDetails?: {
        key?: string;
        salt?: string;
        environment?: 'test' | 'production';
    };
    retryCount?: number;
    timeout?: boolean;
    networkError?: boolean;
    validationError?: boolean;
    authorizationError?: boolean;
}

export interface PayUErrorMapping {
    code: string;
    category: CrossPlatformErrorCategory;
    severity: ErrorSeverity;
    userImpact: UserImpactLevel;
    userFriendlyMessage: string;
    retryable: boolean;
    recoverable: boolean;
    actionRequired?: string;
    supportMessage?: string;
    merchantAdvice?: string;
}

export class PayUErrorIntegrator {
    private static instance: PayUErrorIntegrator;

    private constructor() { }

    public static getInstance(): PayUErrorIntegrator {
        if (!PayUErrorIntegrator.instance) {
            PayUErrorIntegrator.instance = new PayUErrorIntegrator();
        }
        return PayUErrorIntegrator.instance;
    }

    /**
     * Handle PayU-specific errors and integrate with cross-platform system
     */
    public handlePayUError(
        errorData: PayUErrorData,
        originalError?: Error | any,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        try {
            // Map PayU error to cross-platform error
            const crossPlatformError = this.mapPayUErrorToCrossPlatform(errorData, originalError, context);

            // Log to cross-platform logger
            const errorId = crossPlatformErrorLogger.logError(crossPlatformError, context, {
                paymentProvider: 'PayU',
                transactionId: errorData.transactionId,
                amount: errorData.amount,
                currency: errorData.currency,
                gateway: 'PayU'
            });

            // Report to crash reporting service
            crashReportingService.reportError(crossPlatformError);

            // Track analytics
            errorAnalyticsService.trackError(crossPlatformError);

            // Store for offline scenarios
            errorStorageService.storeError(crossPlatformError, {
                priority: crossPlatformError.severity === 'critical' ? 'high' : 'medium',
                tags: ['payu', 'payment', crossPlatformError.subcategory, crossPlatformError.category],
                forceSync: crossPlatformError.severity === 'critical'
            });

            // Add payment-specific breadcrumb
            crossPlatformErrorLogger.addBreadcrumb(
                `PayU payment error: ${crossPlatformError.message}`,
                'payment',
                'error',
                {
                    errorId,
                    transactionId: errorData.transactionId,
                    amount: errorData.amount,
                    currency: errorData.currency,
                    bankCode: errorData.bankCode,
                    paymentMethod: errorData.paymentMethod,
                    retryCount: errorData.retryCount || 0,
                    environment: errorData.merchantDetails?.environment || 'unknown'
                }
            );

            // Track payment performance impact
            performanceMonitoringService.trackOperation(
                'payment_error',
                Date.now(),
                {
                    errorId,
                    transactionId: errorData.transactionId,
                    amount: errorData.amount,
                    currency: errorData.currency,
                    errorType: crossPlatformError.subcategory,
                    severity: crossPlatformError.severity
                }
            );

            logWarn('PayU payment error handled', {
                errorId,
                transactionId: errorData.transactionId,
                category: crossPlatformError.category,
                severity: crossPlatformError.severity,
                amount: errorData.amount,
                currency: errorData.currency
            });

            return crossPlatformError;

        } catch (integrationError) {
            logError('Failed to handle PayU error', {
                error: integrationError instanceof Error ? integrationError.message : String(integrationError),
                transactionId: errorData.transactionId,
                originalError: originalError?.message
            });

            // Return basic error if integration fails
            return this.createBasicPayUError(errorData, originalError, context);
        }
    }

    /**
     * Handle PayU transaction success for analytics
     */
    public handlePayUSuccess(transactionData: PayUTransactionData): void {
        try {
            crossPlatformErrorLogger.addBreadcrumb(
                `PayU payment successful for transaction ${transactionData.transactionId}`,
                'payment',
                'info',
                {
                    transactionId: transactionData.transactionId,
                    amount: transactionData.amount,
                    currency: transactionData.currency,
                    paymentMethod: transactionData.paymentMethod,
                    bankCode: transactionData.bankCode,
                    processingTime: transactionData.processingTime,
                    environment: transactionData.merchantDetails?.environment || 'unknown'
                }
            );

            // Track successful payment performance
            performanceMonitoringService.trackOperation(
                'payment_success',
                transactionData.processingTime || 0,
                {
                    transactionId: transactionData.transactionId,
                    amount: transactionData.amount,
                    currency: transactionData.currency,
                    paymentMethod: transactionData.paymentMethod,
                    bankCode: transactionData.bankCode
                }
            );

            logInfo('PayU payment successful', {
                transactionId: transactionData.transactionId,
                amount: transactionData.amount,
                currency: transactionData.currency,
                processingTime: transactionData.processingTime
            });

        } catch (error) {
            logError('Failed to handle PayU success', {
                error: error instanceof Error ? error.message : String(error),
                transactionId: transactionData.transactionId
            });
        }
    }

    /**
     * Handle PayU transaction timeout
     */
    public handlePayUTimeout(
        timeoutData: PayUErrorData,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        return this.handlePayUError(
            {
                ...timeoutData,
                timeout: true,
                retryCount: timeoutData.retryCount || 0
            },
            new Error('PayU transaction timeout'),
            context
        );
    }

    /**
     * Handle PayU network errors
     */
    public handlePayUNetworkError(
        networkError: PayUErrorData,
        originalError: Error,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        return this.handlePayUError(
            {
                ...networkError,
                networkError: true
            },
            originalError,
            context
        );
    }

    /**
     * Handle PayU validation errors
     */
    public handlePayUValidationError(
        validationError: PayUErrorData,
        originalError: Error,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        return this.handlePayUError(
            {
                ...validationError,
                validationError: true
            },
            originalError,
            context
        );
    }

    /**
     * Handle PayU authorization errors
     */
    public handlePayUAuthorizationError(
        authError: PayUErrorData,
        originalError: Error,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        return this.handlePayUError(
            {
                ...authError,
                authorizationError: true
            },
            originalError,
            context
        );
    }

    /**
     * Get PayU error mapping for specific error code
     */
    public getPayUErrorMapping(errorCode: string): PayUErrorMapping | null {
        const errorMappings: Record<string, PayUErrorMapping> = {
            // Transaction validation errors
            'TRANSACTION_INVALID_AMOUNT': {
                code: 'TRANSACTION_INVALID_AMOUNT',
                category: CrossPlatformErrorCategory.VALIDATION,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Invalid transaction amount. Please check the amount and try again.',
                retryable: false,
                recoverable: true,
                actionRequired: 'Please verify the transaction amount',
                supportMessage: 'Contact support if the issue persists',
                merchantAdvice: 'Validate amount input before initiating transaction'
            },

            'TRANSACTION_INVALID_CURRENCY': {
                code: 'TRANSACTION_INVALID_CURRENCY',
                category: CrossPlatformErrorCategory.VALIDATION,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Invalid currency specified. Please check your currency settings.',
                retryable: false,
                recoverable: true,
                actionRequired: 'Please select a valid currency',
                supportMessage: 'Contact support for currency support',
                merchantAdvice: 'Verify currency codes are supported'
            },

            'TRANSACTION_INVALID_EMAIL': {
                code: 'TRANSACTION_INVALID_EMAIL',
                category: CrossPlatformErrorCategory.VALIDATION,
                severity: ErrorSeverity.MEDIUM,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'Invalid email address format. Please provide a valid email.',
                retryable: false,
                recoverable: true,
                actionRequired: 'Please enter a valid email address',
                supportMessage: 'Check email format requirements',
                merchantAdvice: 'Implement email validation on frontend'
            },

            // Payment gateway errors
            'GATEWAY_UNAVAILABLE': {
                code: 'GATEWAY_UNAVAILABLE',
                category: CrossPlatformErrorCategory.NETWORK,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'Payment gateway is temporarily unavailable. Please try again later.',
                retryable: true,
                recoverable: true,
                actionRequired: 'Please wait and try again',
                supportMessage: 'Contact support if issue persists',
                merchantAdvice: 'Implement retry mechanism with exponential backoff'
            },

            'GATEWAY_TIMEOUT': {
                code: 'GATEWAY_TIMEOUT',
                category: CrossPlatformErrorCategory.NETWORK,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'Payment processing timed out. Please check your connection and try again.',
                retryable: true,
                recoverable: true,
                actionRequired: 'Please check your internet connection and try again',
                supportMessage: 'Contact support if timeout persists',
                merchantAdvice: 'Increase timeout values and implement retry logic'
            },

            // Authentication errors
            'INVALID_MERCHANT_CREDENTIALS': {
                code: 'INVALID_MERCHANT_CREDENTIALS',
                category: CrossPlatformErrorCategory.AUTHENTICATION,
                severity: ErrorSeverity.CRITICAL,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Payment system configuration error. Please contact support.',
                retryable: false,
                recoverable: false,
                actionRequired: 'Contact support immediately',
                supportMessage: 'Check merchant credentials and API keys',
                merchantAdvice: 'Verify PayU API credentials and environment settings'
            },

            'INSUFFICIENT_MERCHANT_PERMISSIONS': {
                code: 'INSUFFICIENT_MERCHANT_PERMISSIONS',
                category: CrossPlatformErrorCategory.AUTHENTICATION,
                severity: ErrorSeverity.CRITICAL,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Payment permissions error. Please contact support.',
                retryable: false,
                recoverable: false,
                actionRequired: 'Contact support immediately',
                supportMessage: 'Check merchant permissions and account status',
                merchantAdvice: 'Verify PayU account permissions and feature access'
            },

            // Bank/processing errors
            'BANK_DECLINED': {
                code: 'BANK_DECLINED',
                category: CrossPlatformErrorCategory.PAYMENT,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Your bank declined this transaction. Please try a different payment method.',
                retryable: false,
                recoverable: false,
                actionRequired: 'Please try a different payment method',
                supportMessage: 'Contact your bank for transaction details',
                merchantAdvice: 'Provide alternative payment methods to user'
            },

            'INSUFFICIENT_FUNDS': {
                code: 'INSUFFICIENT_FUNDS',
                category: CrossPlatformErrorCategory.PAYMENT,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Insufficient funds. Please check your account balance and try again.',
                retryable: false,
                recoverable: false,
                actionRequired: 'Please check your account balance',
                supportMessage: 'Contact your bank for account details',
                merchantAdvice: 'Suggest alternative payment methods'
            },

            'CARD_EXPIRED': {
                code: 'CARD_EXPIRED',
                category: CrossPlatformErrorCategory.PAYMENT,
                severity: ErrorSeverity.MEDIUM,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'Your card has expired. Please use a valid card.',
                retryable: false,
                recoverable: true,
                actionRequired: 'Please use a different payment method',
                supportMessage: 'Check card validity and expiration date',
                merchantAdvice: 'Implement card validation on frontend'
            },

            'INVALID_CVV': {
                code: 'INVALID_CVV',
                category: CrossPlatformErrorCategory.VALIDATION,
                severity: ErrorSeverity.MEDIUM,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'Invalid security code. Please check your card details.',
                retryable: false,
                recoverable: true,
                actionRequired: 'Please check your card details',
                supportMessage: 'Verify CVV format requirements',
                merchantAdvice: 'Implement CVV validation and format guidance'
            },

            // System errors
            'SYSTEM_ERROR': {
                code: 'SYSTEM_ERROR',
                category: CrossPlatformErrorCategory.SYSTEM,
                severity: ErrorSeverity.CRITICAL,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Payment system is experiencing issues. Please try again later.',
                retryable: true,
                recoverable: true,
                actionRequired: 'Please wait and try again later',
                supportMessage: 'Monitor system status and contact support',
                merchantAdvice: 'Implement circuit breaker pattern for system resilience'
            },

            'DATABASE_ERROR': {
                code: 'DATABASE_ERROR',
                category: CrossPlatformErrorCategory.SYSTEM,
                severity: ErrorSeverity.CRITICAL,
                userImpact: UserImpactLevel.BLOCKING,
                userFriendlyMessage: 'Payment system is temporarily unavailable. Please try again later.',
                retryable: true,
                recoverable: true,
                actionRequired: 'Please wait and try again later',
                supportMessage: 'Contact support for system status',
                merchantAdvice: 'Implement database connection pooling and retry logic'
            },

            // Network errors
            'NETWORK_ERROR': {
                code: 'NETWORK_ERROR',
                category: CrossPlatformErrorCategory.NETWORK,
                severity: ErrorSeverity.HIGH,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'Network connection error. Please check your internet connection.',
                retryable: true,
                recoverable: true,
                actionRequired: 'Please check your internet connection',
                supportMessage: 'Verify network connectivity and try again',
                merchantAdvice: 'Implement network error handling and retry mechanisms'
            },

            // Unknown errors
            'UNKNOWN_ERROR': {
                code: 'UNKNOWN_ERROR',
                category: CrossPlatformErrorCategory.UNKNOWN,
                severity: ErrorSeverity.MEDIUM,
                userImpact: UserImpactLevel.DISRUPTIVE,
                userFriendlyMessage: 'An unexpected payment error occurred. Please try again.',
                retryable: true,
                recoverable: true,
                actionRequired: 'Please try again',
                supportMessage: 'Contact support if the issue persists',
                merchantAdvice: 'Implement comprehensive error logging and monitoring'
            }
        };

        return errorMappings[errorCode] || null;
    }

    /**
     * Private helper methods
     */

    private mapPayUErrorToCrossPlatform(
        errorData: PayUErrorData,
        originalError?: Error | any,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        const errorMapping = this.determineErrorMapping(errorData, originalError);
        const transactionId = errorData.transactionId || this.generateTransactionId();

        // Create enhanced PayU error data
        const payUError: PayUError = {
            provider: 'PayU',
            originalError: originalError,
            retryable: errorMapping.retryable,
            transactionId,
            errorCode: errorMapping.code,
            responseData: {
                ...errorData.gatewayResponse,
                bankCode: errorData.bankCode,
                paymentMethod: errorData.paymentMethod,
                retryCount: errorData.retryCount || 0,
                timestamp: new Date().toISOString()
            }
        };

        // Create cross-platform error
        const crossPlatformError: CrossPlatformAppError = {
            id: this.generateErrorId(),
            category: errorMapping.category,
            subcategory: this.determineSubcategory(errorData),
            severity: errorMapping.severity,
            userImpact: errorMapping.userImpact,
            timestamp: new Date(),
            message: this.generateErrorMessage(errorData, errorMapping),
            userFriendlyMessage: errorMapping.userFriendlyMessage,
            platformContext: this.createPaymentContext(errorData, context, transactionId),
            recoverable: errorMapping.recoverable,
            retryable: errorMapping.retryable,
            code: `PAYU_${errorMapping.code}`,
            paymentError: payUError
        };

        return crossPlatformError;
    }

    private determineErrorMapping(errorData: PayUErrorData, originalError?: Error | any): PayUErrorMapping {
        // Check for specific error codes first
        if (errorData.gatewayResponse?.errorCode) {
            const mapping = this.getPayUErrorMapping(errorData.gatewayResponse.errorCode);
            if (mapping) return mapping;
        }

        // Check for specific error conditions
        if (errorData.timeout) {
            return this.getPayUErrorMapping('GATEWAY_TIMEOUT');
        }

        if (errorData.networkError) {
            return this.getPayUErrorMapping('NETWORK_ERROR');
        }

        if (errorData.validationError) {
            return this.getPayUErrorMapping('TRANSACTION_INVALID_AMOUNT');
        }

        if (errorData.authorizationError) {
            return this.getPayUErrorMapping('INVALID_MERCHANT_CREDENTIALS');
        }

        // Check error message patterns
        const message = (originalError?.message || errorData.gatewayResponse?.message || '').toLowerCase();

        if (message.includes('timeout')) {
            return this.getPayUErrorMapping('GATEWAY_TIMEOUT');
        }

        if (message.includes('network') || message.includes('connection')) {
            return this.getPayUErrorMapping('NETWORK_ERROR');
        }

        if (message.includes('invalid') || message.includes('validation')) {
            return this.getPayUErrorMapping('TRANSACTION_INVALID_AMOUNT');
        }

        if (message.includes('declined') || message.includes('bank')) {
            return this.getPayUErrorMapping('BANK_DECLINED');
        }

        if (message.includes('insufficient') || message.includes('funds')) {
            return this.getPayUErrorMapping('INSUFFICIENT_FUNDS');
        }

        if (message.includes('expired') || message.includes('expiry')) {
            return this.getPayUErrorMapping('CARD_EXPIRED');
        }

        if (message.includes('cvv') || message.includes('security code')) {
            return this.getPayUErrorMapping('INVALID_CVV');
        }

        if (message.includes('system') || message.includes('server')) {
            return this.getPayUErrorMapping('SYSTEM_ERROR');
        }

        if (message.includes('auth') || message.includes('credential')) {
            return this.getPayUErrorMapping('INVALID_MERCHANT_CREDENTIALS');
        }

        // Default fallback
        return this.getPayUErrorMapping('UNKNOWN_ERROR');
    }

    private determineSubcategory(errorData: PayUErrorData): string {
        if (errorData.timeout) return 'timeout';
        if (errorData.networkError) return 'network_error';
        if (errorData.validationError) return 'validation_error';
        if (errorData.authorizationError) return 'authorization_error';
        if (errorData.gatewayResponse?.errorCode) return 'gateway_error';

        const response = errorData.gatewayResponse;
        if (response?.bankCode) return 'bank_error';
        if (response?.paymentMethod) return 'payment_method_error';

        return 'unknown_payu_error';
    }

    private generateErrorMessage(errorData: PayUErrorData, mapping: PayUErrorMapping): string {
        const transactionId = errorData.transactionId || 'unknown';
        const amount = errorData.amount ? `${errorData.amount} ${errorData.currency}` : 'unknown amount';

        return `PayU Payment Error [${mapping.code}] in transaction ${transactionId} for ${amount}: ${mapping.userFriendlyMessage}`;
    }

    private createPaymentContext(
        errorData: PayUErrorData,
        context?: Partial<PlatformErrorContext>,
        transactionId: string
    ): PlatformErrorContext {
        return {
            platform: context?.platform || 'web',
            appState: context?.appState || 'active',
            deviceInfo: context?.deviceInfo || {
                platform: 'web',
                osVersion: 'unknown',
                appVersion: '1.0.0',
                buildNumber: '1',
                deviceModel: 'Web Browser',
                screenSize: 'unknown',
                isTablet: false,
                memoryPressure: 'normal'
            },
            sessionId: context?.sessionId || `session_${Date.now()}`,
            additionalContext: {
                paymentProvider: 'PayU',
                transactionId,
                amount: errorData.amount,
                currency: errorData.currency,
                bankCode: errorData.bankCode,
                paymentMethod: errorData.paymentMethod,
                gatewayResponse: errorData.gatewayResponse,
                retryCount: errorData.retryCount || 0,
                environment: errorData.merchantDetails?.environment,
                ...context?.additionalContext
            }
        };
    }

    private createBasicPayUError(
        errorData: PayUErrorData,
        originalError?: Error | any,
        context?: Partial<PlatformErrorContext>
    ): CrossPlatformAppError {
        return {
            id: this.generateErrorId(),
            category: CrossPlatformErrorCategory.PAYMENT,
            subcategory: 'payu_error',
            severity: ErrorSeverity.HIGH,
            userImpact: UserImpactLevel.DISRUPTIVE,
            timestamp: new Date(),
            message: originalError?.message || 'PayU payment error occurred',
            userFriendlyMessage: 'Payment processing failed. Please try again.',
            platformContext: this.createPaymentContext(errorData, context, errorData.transactionId || 'unknown'),
            recoverable: true,
            retryable: true,
            code: 'PAYU_BASIC_ERROR',
            paymentError: {
                provider: 'PayU',
                originalError,
                retryable: true,
                transactionId: errorData.transactionId
            }
        };
    }

    private generateErrorId(): string {
        return `payu_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateTransactionId(): string {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
}

// PayU Transaction Data Interface
export interface PayUTransactionData {
    transactionId: string;
    amount: number;
    currency: string;
    bankCode?: string;
    paymentMethod?: string;
    gatewayResponse?: any;
    processingTime?: number;
    customerDetails?: {
        email?: string;
        phone?: string;
        name?: string;
    };
    merchantDetails?: {
        key?: string;
        salt?: string;
        environment?: 'test' | 'production';
    };
}

// Export singleton instance
export const payUErrorIntegrator = PayUErrorIntegrator.getInstance();

// Export convenience functions
export const handlePayUError = (
    errorData: PayUErrorData,
    originalError?: Error | any,
    context?: Partial<PlatformErrorContext>
) => payUErrorIntegrator.handlePayUError(errorData, originalError, context);

export const handlePayUSuccess = (transactionData: PayUTransactionData) =>
    payUErrorIntegrator.handlePayUSuccess(transactionData);

export const handlePayUTimeout = (
    timeoutData: PayUErrorData,
    context?: Partial<PlatformErrorContext>
) => payUErrorIntegrator.handlePayUTimeout(timeoutData, context);

export const handlePayUNetworkError = (
    networkError: PayUErrorData,
    originalError: Error,
    context?: Partial<PlatformErrorContext>
) => payUErrorIntegrator.handlePayUNetworkError(networkError, originalError, context);

export const handlePayUValidationError = (
    validationError: PayUErrorData,
    originalError: Error,
    context?: Partial<PlatformErrorContext>
) => payUErrorIntegrator.handlePayUValidationError(validationError, originalError, context);

export const handlePayUAuthorizationError = (
    authError: PayUErrorData,
    originalError: Error,
    context?: Partial<PlatformErrorContext>
) => payUErrorIntegrator.handlePayUAuthorizationError(authError, originalError, context);