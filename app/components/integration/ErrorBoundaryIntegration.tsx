/**
 * Error Boundary Integration
 * Enhanced ErrorBoundary that integrates with the complete error handling framework
 * Provides seamless integration with crash reporting, analytics, and performance monitoring
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import {
    CrossPlatformAppError,
    CrossPlatformErrorCategory,
    ErrorSeverity,
    UserImpactLevel,
    PlatformErrorContext,
    PlatformDeviceInfo
} from '../../types/ErrorTypes';
import { crossPlatformErrorLogger } from '../../services/CrossPlatformErrorLogger';
import { crashReportingService } from '../../services/CrashReportingService';
import { errorAnalyticsService } from '../../services/ErrorAnalytics';
import { performanceMonitoringService } from '../../services/PerformanceMonitoring';
import { errorStorageService } from '../../services/ErrorStorageService';
import { getUserFriendlyError } from '../../utils/ErrorMessageMapper';
import { logger, logError, logWarn, logInfo } from '../../utils/Logger';

interface ErrorBoundaryIntegrationProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: CrossPlatformAppError, errorInfo: ErrorInfo) => void;
    enableRetry?: boolean;
    enableReporting?: boolean;
    enableAnalytics?: boolean;
    enablePerformanceTracking?: boolean;
    retryLimit?: number;
    componentName?: string;
    errorCategory?: CrossPlatformErrorCategory;
    customRecoveryHandler?: (error: CrossPlatformAppError) => Promise<void>;
}

interface ErrorBoundaryIntegrationState {
    hasError: boolean;
    error?: CrossPlatformAppError;
    errorInfo?: ErrorInfo;
    retryCount: number;
    isReporting: boolean;
    isRecovering: boolean;
    errorId?: string;
    recoveryAttempts: number;
    performanceImpact?: number;
}

export class ErrorBoundaryIntegration extends Component<ErrorBoundaryIntegrationProps, ErrorBoundaryIntegrationState> {
    private maxRetries: number;
    private performanceTimer?: number;
    private startTime: number;
    private retryDelays = [1000, 3000, 5000, 10000]; // Progressive backoff

    constructor(props: ErrorBoundaryIntegrationProps) {
        super(props);

        this.maxRetries = props.retryLimit || 3;
        this.startTime = Date.now();

        this.state = {
            hasError: false,
            retryCount: 0,
            isReporting: false,
            isRecovering: false,
            recoveryAttempts: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryIntegrationState> {
        return {
            hasError: true,
            error: undefined, // Will be set in componentDidCatch
            timestamp: new Date().toISOString()
        };
    }

    async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const {
            onError,
            componentName,
            enableReporting = true,
            enableAnalytics = true,
            enablePerformanceTracking = true,
            errorCategory = CrossPlatformErrorCategory.SYSTEM,
            customRecoveryHandler
        } = this.props;

        const startTime = Date.now();

        try {
            // Create comprehensive error context
            const platformContext = await this.createPlatformContext(error, errorInfo);

            // Create cross-platform error
            const crossPlatformError: CrossPlatformAppError = {
                id: this.generateErrorId(),
                category: errorCategory,
                subcategory: this.categorizeError(error, errorInfo),
                severity: this.determineSeverity(error, errorInfo),
                userImpact: this.determineUserImpact(error, errorInfo),
                timestamp: new Date(),
                message: error.message || 'Unknown error occurred',
                userFriendlyMessage: getUserFriendlyError(error, componentName).message,
                platformContext,
                recoverable: this.isRecoverable(error, errorInfo),
                retryable: this.isRetryable(error, errorInfo),
                code: this.generateErrorCode(error, errorInfo),
                reactNativeError: {
                    componentStack: errorInfo.componentStack,
                    jsEngine: 'react-native',
                    isFatal: false,
                    errorBoundary: componentName
                }
            };

            // Track performance impact before logging
            if (enablePerformanceTracking) {
                const renderTime = Date.now() - this.startTime;
                performanceMonitoringService.trackRender(
                    componentName || 'UnknownComponent',
                    renderTime,
                    {
                        errorId: crossPlatformError.id,
                        category: crossPlatformError.category,
                        severity: crossPlatformError.severity
                    }
                );
            }

            // Log error to cross-platform logger
            const errorId = crossPlatformErrorLogger.logError(crossPlatformError, platformContext, {
                componentName,
                errorBoundary: true,
                renderTime: Date.now() - startTime
            });

            // Report to crash reporting service
            if (enableReporting) {
                await crashReportingService.reportError(crossPlatformError);
            }

            // Track analytics
            if (enableAnalytics) {
                await errorAnalyticsService.trackError(crossPlatformError, Date.now() - startTime);
            }

            // Store for offline scenarios
            await errorStorageService.storeError(crossPlatformError, {
                priority: crossPlatformError.severity === 'critical' ? 'high' : 'medium',
                tags: ['error_boundary', componentName || 'unknown', crossPlatformError.category],
                forceSync: crossPlatformError.severity === 'critical'
            });

            // Call custom recovery handler if provided
            if (customRecoveryHandler) {
                try {
                    await customRecoveryHandler(crossPlatformError);
                    logInfo('Custom recovery handler completed successfully', { errorId });
                } catch (recoveryError) {
                    logWarn('Custom recovery handler failed', {
                        errorId,
                        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
                    });
                }
            }

            // Add performance breadcrumb
            crossPlatformErrorLogger.addBreadcrumb(
                `ErrorBoundary caught error in ${componentName || 'component'}`,
                'error_boundary',
                'error',
                {
                    errorId,
                    category: crossPlatformError.category,
                    severity: crossPlatformError.severity,
                    recoverable: crossPlatformError.recoverable,
                    retryable: crossPlatformError.retryable
                }
            );

            // Call custom error handler if provided
            if (onError) {
                try {
                    onError(crossPlatformError, errorInfo);
                } catch (handlerError) {
                    logError('Custom error handler failed', {
                        originalError: crossPlatformError.message,
                        handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError)
                    });
                }
            }

            // Update state with error info
            this.setState({
                error: crossPlatformError,
                errorInfo,
                errorId,
                recoveryAttempts: 0
            });

            // Log component lifecycle event
            logger.userAction('error_boundary_triggered', {
                componentName,
                errorId,
                category: crossPlatformError.category,
                severity: crossPlatformError.severity,
                retryable: crossPlatformError.retryable
            });

        } catch (boundaryError) {
            // Fallback error handling if the boundary itself fails
            logError('ErrorBoundary failed to handle error', {
                boundaryError: boundaryError instanceof Error ? boundaryError.message : String(boundaryError),
                originalError: error.message,
                componentName
            });

            // Still update state so UI shows an error
            this.setState({
                error: undefined,
                errorInfo
            });
        }
    }

    componentWillUnmount() {
        if (this.performanceTimer) {
            clearTimeout(this.performanceTimer);
        }
    }

    /**
     * Enhanced retry handler with performance tracking
     */
    handleRetry = async (): Promise<void> => {
        const { error, retryCount } = this.state;
        const { componentName } = this.props;

        if (!error || retryCount >= this.maxRetries) {
            this.handleMaxRetriesExceeded();
            return;
        }

        try {
            this.setState({ isRecovering: true });

            // Track retry attempt
            const delay = this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];

            logInfo('Error boundary retry attempt', {
                componentName,
                retryCount: retryCount + 1,
                maxRetries: this.maxRetries,
                delay: `${delay}ms`,
                errorId: error.id
            });

            logger.userAction('error_boundary_retry', {
                componentName,
                retryCount: retryCount + 1,
                maxRetries: this.maxRetries,
                delay,
                errorId: error.id
            });

            // Add breadcrumb for retry
            crossPlatformErrorLogger.addBreadcrumb(
                `Error boundary retry attempt ${retryCount + 1}/${this.maxRetries}`,
                'error_boundary',
                'info',
                {
                    componentName,
                    retryCount,
                    maxRetries: this.maxRetries,
                    delay,
                    errorId: error.id
                }
            );

            // Wait for retry delay
            await new Promise(resolve => setTimeout(resolve, delay));

            // Reset error state to trigger re-render
            this.setState(prevState => ({
                hasError: false,
                error: undefined,
                errorInfo: undefined,
                errorId: undefined,
                retryCount: prevState.retryCount + 1,
                isRecovering: false,
                recoveryAttempts: prevState.recoveryAttempts + 1
            }));

            // Track successful recovery
            performanceMonitoringService.trackOperation(
                'error_recovery',
                Date.now() - this.startTime,
                {
                    componentName,
                    retryCount,
                    maxRetries: this.maxRetries,
                    errorId: error.id,
                    success: true
                }
            );

        } catch (retryError) {
            logError('Error boundary retry failed', {
                componentName,
                retryCount,
                retryError: retryError instanceof Error ? retryError.message : String(retryError),
                errorId: error?.id
            });

            this.setState({ isRecovering: false });

            // If retry fails, consider it a failed recovery attempt
            if (retryCount + 1 >= this.maxRetries) {
                this.handleMaxRetriesExceeded();
            }
        }
    };

    /**
     * Handle manual error reporting
     */
    handleReportError = async (): Promise<void> => {
        const { error, errorInfo, errorId } = this.state;

        if (!error || !errorInfo || !errorId) {
            Alert.alert('Error', 'No error information available to report.');
            return;
        }

        this.setState({ isReporting: true });

        try {
            // Report to crash reporting service
            await crashReportingService.reportError(error);

            // Track manual report
            logger.userAction('error_boundary_manual_report', {
                errorId,
                componentName: this.props.componentName,
                category: error.category,
                severity: error.severity
            });

            Alert.alert(
                'Error Reported',
                'Thank you for reporting this issue. Our team will investigate.',
                [{ text: 'OK' }]
            );

        } catch (reportError) {
            logError('Manual error reporting failed', {
                errorId,
                reportError: reportError instanceof Error ? reportError.message : String(reportError)
            });

            Alert.alert(
                'Report Failed',
                'Unable to report error at this time. Please try again later.',
                [{ text: 'OK' }]
            );
        } finally {
            this.setState({ isReporting: false });
        }
    };

    /**
     * Handle app restart suggestion
     */
    handleRestartApp = (): void => {
        const { componentName } = this.props;
        const { errorId } = this.state;

        Alert.alert(
            'Restart Recommended',
            'The component has encountered repeated errors. Would you like to restart the app?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restart App',
                    onPress: () => {
                        // Log restart action
                        logger.userAction('error_boundary_app_restart', {
                            componentName,
                            errorId,
                            reason: 'max_retries_exceeded'
                        });

                        // In a real app, this would trigger app restart
                        if (Platform.OS === 'web') {
                            window.location.reload();
                        } else {
                            // For native apps, you'd use a library like react-native-restart
                            Alert.alert('Restart Required', 'Please manually restart the app to continue.');
                        }
                    }
                }
            ]
        );
    };

    render() {
        if (this.state.hasError && this.state.error) {
            const {
                fallback,
                componentName,
                enableRetry = true,
                enableReporting = true
            } = this.props;

            const { error, retryCount, isReporting, isRecovering, recoveryAttempts } = this.state;

            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.emoji}>
                            {this.getEmojiForSeverity(error.severity)}
                        </Text>

                        <Text style={styles.title}>
                            {this.getTitleForError(error)}
                        </Text>

                        <Text style={styles.message}>
                            {error.userFriendlyMessage}
                        </Text>

                        {__DEV__ && (
                            <View style={styles.debugContainer}>
                                <Text style={styles.debugTitle}>
                                    Debug Information (Development Mode):
                                </Text>
                                <Text style={styles.debugText}>
                                    Error ID: {error.id}
                                </Text>
                                <Text style={styles.debugText}>
                                    Category: {error.category}
                                </Text>
                                <Text style={styles.debugText}>
                                    Severity: {error.severity}
                                </Text>
                                <Text style={styles.debugText}>
                                    Component: {componentName || 'Unknown'}
                                </Text>
                                <Text style={styles.debugText}>
                                    Recovery Attempts: {recoveryAttempts}
                                </Text>
                                <Text style={styles.debugText} numberOfLines={3}>
                                    {error.message}
                                </Text>
                                {error.reactNativeError?.componentStack && (
                                    <Text style={styles.debugStack} numberOfLines={5}>
                                        {error.reactNativeError.componentStack}
                                    </Text>
                                )}
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            {enableRetry && (
                                <TouchableOpacity
                                    style={[
                                        styles.retryButton,
                                        (retryCount >= this.maxRetries || isRecovering) && styles.retryButtonDisabled
                                    ]}
                                    onPress={this.handleRetry}
                                    activeOpacity={0.8}
                                    disabled={retryCount >= this.maxRetries || isRecovering}
                                >
                                    <Text style={styles.retryButtonText}>
                                        {isRecovering
                                            ? 'Recovering...'
                                            : retryCount < this.maxRetries
                                                ? `Try Again (${retryCount + 1}/${this.maxRetries})`
                                                : 'Max Retries Reached'
                                        }
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {enableReporting && (
                                <TouchableOpacity
                                    style={styles.reportButton}
                                    onPress={this.handleReportError}
                                    activeOpacity={0.8}
                                    disabled={isReporting}
                                >
                                    <Text style={styles.reportButtonText}>
                                        {isReporting ? 'Reporting...' : 'Report Issue'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {retryCount >= this.maxRetries && (
                                <TouchableOpacity
                                    style={styles.restartButton}
                                    onPress={this.handleRestartApp}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.restartButtonText}>
                                        Restart App
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }

    /**
     * Private helper methods
     */

    private async createPlatformContext(error: Error, errorInfo: ErrorInfo): Promise<PlatformErrorContext> {
        // Get device information
        const deviceInfo: PlatformDeviceInfo = {
            platform: Platform.OS,
            osVersion: Platform.Version?.toString() || 'unknown',
            appVersion: '1.0.0', // Would come from app config
            buildNumber: '1',
            deviceModel: Platform.select({
                ios: 'iOS Device',
                android: 'Android Device',
                web: 'Web Browser'
            }) || 'Unknown',
            screenSize: 'unknown',
            isTablet: false,
            memoryPressure: 'normal'
        };

        // Create session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
            platform: Platform.OS as any,
            reactNativeError: {
                componentStack: errorInfo.componentStack,
                jsEngine: 'react-native',
                isFatal: false,
                errorBoundary: this.props.componentName
            },
            appState: 'active', // Would come from AppState API
            deviceInfo,
            sessionId,
            additionalContext: {
                errorBoundary: this.props.componentName,
                timestamp: new Date().toISOString(),
                memoryUsage: this.getMemoryUsage(),
                activeScreens: this.getActiveScreens()
            }
        };
    }

    private categorizeError(error: Error, errorInfo: ErrorInfo): string {
        const message = error.message.toLowerCase();
        const componentStack = errorInfo.componentStack.toLowerCase();

        if (message.includes('network') || message.includes('fetch')) {
            return 'network_error';
        }

        if (message.includes('auth') || message.includes('login')) {
            return 'authentication_error';
        }

        if (message.includes('render') || componentStack.includes('render')) {
            return 'rendering_error';
        }

        if (message.includes('memory')) {
            return 'memory_error';
        }

        if (message.includes('navigation') || message.includes('router')) {
            return 'navigation_error';
        }

        return 'unknown_error';
    }

    private determineSeverity(error: Error, errorInfo: ErrorInfo): ErrorSeverity {
        const message = error.message.toLowerCase();

        if (message.includes('fatal') || message.includes('critical')) {
            return ErrorSeverity.CRITICAL;
        }

        if (message.includes('network') || message.includes('auth') || message.includes('payment')) {
            return ErrorSeverity.HIGH;
        }

        if (message.includes('warning') || errorInfo.componentStack.includes('virtualizedlist')) {
            return ErrorSeverity.MEDIUM;
        }

        return ErrorSeverity.LOW;
    }

    private determineUserImpact(error: Error, errorInfo: ErrorInfo): UserImpactLevel {
        const severity = this.determineSeverity(error, errorInfo);

        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return UserImpactLevel.BLOCKING;
            case ErrorSeverity.HIGH:
                return UserImpactLevel.DISRUPTIVE;
            case ErrorSeverity.MEDIUM:
                return UserImpactLevel.MINOR;
            default:
                return UserImpactLevel.NONE;
        }
    }

    private isRecoverable(error: Error, errorInfo: ErrorInfo): boolean {
        const message = error.message.toLowerCase();

        // Network errors and temporary issues are recoverable
        if (message.includes('network') || message.includes('timeout')) {
            return true;
        }

        // Memory issues might be recoverable with cleanup
        if (message.includes('memory')) {
            return true;
        }

        // Render errors are often recoverable
        if (message.includes('render') || errorInfo.componentStack.includes('render')) {
            return true;
        }

        return false;
    }

    private isRetryable(error: Error, errorInfo: ErrorInfo): boolean {
        const message = error.message.toLowerCase();

        // Network and timeout errors are retryable
        if (message.includes('network') || message.includes('timeout')) {
            return true;
        }

        // Authentication errors are typically not retryable without user action
        if (message.includes('auth') || message.includes('login')) {
            return false;
        }

        // Render errors might be retryable
        if (message.includes('render')) {
            return true;
        }

        return true; // Default to retryable
    }

    private generateErrorCode(error: Error, errorInfo: ErrorInfo): string {
        const category = this.categorizeError(error, errorInfo);
        const timestamp = Date.now().toString().slice(-6);

        return `ERROR_BOUNDARY_${category.toUpperCase()}_${timestamp}`;
    }

    private getEmojiForSeverity(severity: ErrorSeverity): string {
        switch (severity) {
            case ErrorSeverity.CRITICAL: return '🚨';
            case ErrorSeverity.HIGH: return '⚠️';
            case ErrorSeverity.MEDIUM: return '🔶';
            case ErrorSeverity.LOW: return '💡';
            default: return '💡';
        }
    }

    private getTitleForError(error: CrossPlatformAppError): string {
        switch (error.userImpact) {
            case UserImpactLevel.BLOCKING: return 'Action Required';
            case UserImpactLevel.DISRUPTIVE: return 'Something Went Wrong';
            case UserImpactLevel.MINOR: return 'Notice';
            default: return 'Information';
        }
    }

    private handleMaxRetriesExceeded(): void {
        const { componentName } = this.props;

        logWarn('Error boundary max retries exceeded', {
            componentName,
            maxRetries: this.maxRetries,
            errorId: this.state.error?.id
        });

        logger.userAction('error_boundary_max_retries', {
            componentName,
            maxRetries: this.maxRetries,
            errorId: this.state.error?.id
        });

        this.handleRestartApp();
    }

    private generateErrorId(): string {
        return `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getMemoryUsage(): number {
        // This would use actual memory monitoring APIs
        return 0;
    }

    private getActiveScreens(): string[] {
        // This would use navigation state to get active screens
        return [];
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FBF9F7',
    },
    content: {
        alignItems: 'center',
        maxWidth: 350,
    },
    emoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#2D2D2D',
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6B6B6B',
        marginBottom: 24,
        lineHeight: 20,
    },
    debugContainer: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        maxWidth: 300,
    },
    debugTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 11,
        color: '#666',
        fontFamily: 'monospace',
        marginBottom: 4,
    },
    debugStack: {
        fontSize: 9,
        color: '#888',
        fontFamily: 'monospace',
        marginTop: 4,
    },
    buttonContainer: {
        gap: 12,
        alignItems: 'center',
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 140,
    },
    retryButtonDisabled: {
        backgroundColor: '#ccc',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    reportButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007AFF',
        minWidth: 120,
    },
    reportButtonText: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    restartButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 120,
    },
    restartButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ErrorBoundaryIntegration;