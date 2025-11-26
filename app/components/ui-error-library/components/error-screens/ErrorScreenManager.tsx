/**
 * Error Screen Manager Component for iOS Error UI Library
 * Handles multiple error screens with lifecycle management and retry functionality
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ErrorScreen from './ErrorScreen';
import { ErrorScreenConfig, ErrorScreenState, ErrorScreenManager , CrossPlatformAppError } from '../../types/ErrorUITypes';

interface Props {
    theme: any;
    errorLogger?: any; // Integration with CrossPlatformErrorLogger
    maxScreens?: number;
    defaultRetryInterval?: number;
    enableAutoRetry?: boolean;
}

interface ErrorScreenManagerRef {
    show: (config: ErrorScreenConfig) => string;
    hide: (id: string) => void;
    retry: (id: string) => void;
    getState: () => ErrorScreenState;
    showNetworkOffline: (options?: Partial<ErrorScreenConfig>) => string;
    showServerError: (options?: Partial<ErrorScreenConfig>) => string;
    showMaintenanceMode: (options?: Partial<ErrorScreenConfig>) => string;
    showEmptyState: (title?: string, message?: string, options?: Partial<ErrorScreenConfig>) => string;
    showRecoveryScreen: (error: CrossPlatformAppError, steps: any[], options?: Partial<ErrorScreenConfig>) => string;
}

const ErrorScreenManagerComponent = forwardRef<ErrorScreenManagerRef, Props>(({
    theme,
    errorLogger,
    maxScreens = 1,
    defaultRetryInterval = 5000,
    enableAutoRetry = true,
}, ref) => {
    const [state, setState] = useState<ErrorScreenState>({
        visible: false,
        currentScreen: undefined,
        retryCount: 0,
        lastRetry: undefined,
        canRetry: true,
    });

    const [retryCount, setRetryCount] = useState(0);
    const [lastRetry, setLastRetry] = useState<Date | undefined>(undefined);

    const screenMap = useRef<Map<string, ErrorScreenConfig>>(new Map());
    const screenRefs = useRef<Map<string, React.ElementRef<typeof ErrorScreen>>>(new Map());

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        show: (config: ErrorScreenConfig): string => {
            return show(config);
        },
        hide: (id: string): void => {
            hide(id);
        },
        retry: (id: string): void => {
            retry(id);
        },
        getState: (): ErrorScreenState => {
            return getState();
        },
        showNetworkOffline: (options?: Partial<ErrorScreenConfig>): string => {
            return showNetworkOffline(options);
        },
        showServerError: (options?: Partial<ErrorScreenConfig>): string => {
            return showServerError(options);
        },
        showMaintenanceMode: (options?: Partial<ErrorScreenConfig>): string => {
            return showMaintenanceMode(options);
        },
        showEmptyState: (title?: string, message?: string, options?: Partial<ErrorScreenConfig>): string => {
            return showEmptyState(title, message, options);
        },
        showRecoveryScreen: (error: CrossPlatformAppError, steps: any[], options?: Partial<ErrorScreenConfig>): string => {
            return showRecoveryScreen(error, steps, options);
        },
    }));

    // Public API methods
    const show = (config: ErrorScreenConfig): string => {
        const screenId = config.id || generateScreenId();
        const finalConfig: ErrorScreenConfig = {
            ...config,
            id: screenId,
            autoRetry: config.autoRetry ?? enableAutoRetry,
            retryInterval: config.retryInterval ?? defaultRetryInterval,
            fullScreen: config.fullScreen ?? true,
        };

        screenMap.current.set(screenId, finalConfig);

        setState(prevState => {
            const visible = true;
            const currentScreen = finalConfig;
            const canRetry = prevState.retryCount < (config.maxRetries || 3);

            return {
                ...prevState,
                visible,
                currentScreen,
                retryCount: prevState.retryCount,
                canRetry,
            };
        });

        errorLogger?.logError({
            type: 'error_screen_shown',
            screenId,
            screenType: finalConfig.type,
            timestamp: new Date(),
        });

        return screenId;
    };

    const hide = (id: string): void => {
        if (!screenMap.current.has(id)) return;

        const config = screenMap.current.get(id)!;
        screenMap.current.delete(id);

        setState(prevState => {
            const visible = screenMap.current.size > 0;
            const currentScreen = visible ? Array.from(screenMap.current.values())[0] : undefined;
            const canRetry = prevState.retryCount < (config.maxRetries || 3);

            return {
                ...prevState,
                visible,
                currentScreen,
                canRetry,
            };
        });

        errorLogger?.logError({
            type: 'error_screen_dismissed',
            screenId: id,
            screenType: config.type,
            timestamp: new Date(),
        });
    };

    const retry = (id: string): void => {
        const screenRef = screenRefs.current.get(id);
        if (screenRef && screenRef.retry) {
            screenRef.retry();
        }

        setRetryCount(prev => prev + 1);
        setLastRetry(new Date());

        setState(prevState => ({
            ...prevState,
            retryCount: prevState.retryCount + 1,
            lastRetry: new Date(),
            canRetry: prevState.retryCount < (maxScreens || 3),
        }));

        errorLogger?.logError({
            type: 'error_screen_retry',
            screenId: id,
            retryCount: retryCount + 1,
            timestamp: new Date(),
        });
    };

    const getState = (): ErrorScreenState => {
        return {
            ...state,
            retryCount,
            lastRetry,
            canRetry: retryCount < (maxScreens || 3),
        };
    };

    // Predefined error screen types
    const showNetworkOffline = (options?: Partial<ErrorScreenConfig>): string => {
        const config: ErrorScreenConfig = {
            id: generateScreenId(),
            type: 'network_offline',
            title: 'No Internet Connection',
            message: 'Please check your internet connection and try again.',
            primaryAction: {
                title: 'Try Again',
                onPress: () => {
                    // Network check would go here
                    setTimeout(() => hide(config.id!), 1000);
                },
                style: 'primary',
            },
            secondaryAction: {
                title: 'Settings',
                onPress: () => {
                    // Open network settings
                },
                style: 'secondary',
            },
            autoRetry: true,
            retryInterval: 3000,
            maxRetries: 5,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: ['No internet connection. Please check your connection and try again.'],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showServerError = (options?: Partial<ErrorScreenConfig>): string => {
        const config: ErrorScreenConfig = {
            id: generateScreenId(),
            type: 'server_error',
            title: 'Server Error',
            message: 'We\'re experiencing technical difficulties. Please try again later.',
            primaryAction: {
                title: 'Retry',
                onPress: () => {
                    // Retry server request
                    setTimeout(() => hide(config.id!), 1000);
                },
                style: 'primary',
            },
            secondaryAction: {
                title: 'Contact Support',
                onPress: () => {
                    // Open support contact
                },
                style: 'secondary',
            },
            autoRetry: true,
            retryInterval: 5000,
            maxRetries: 3,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: ['Server error occurred. Please try again later.'],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showMaintenanceMode = (options?: Partial<ErrorScreenConfig>): string => {
        const config: ErrorScreenConfig = {
            id: generateScreenId(),
            type: 'maintenance_mode',
            title: 'Under Maintenance',
            message: 'We\'re currently performing maintenance. Please check back soon.',
            primaryAction: {
                title: 'Check Status',
                onPress: () => {
                    // Check maintenance status
                },
                style: 'primary',
            },
            secondaryAction: {
                title: 'Notify Me',
                onPress: () => {
                    // Enable notifications for maintenance completion
                },
                style: 'secondary',
            },
            autoRetry: false,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: ['The app is currently under maintenance. Please check back later.'],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showEmptyState = (title?: string, message?: string, options?: Partial<ErrorScreenConfig>): string => {
        const config: ErrorScreenConfig = {
            id: generateScreenId(),
            type: 'empty_state',
            title: title || 'No Data Available',
            message: message || 'There\'s nothing to show here at the moment.',
            primaryAction: {
                title: 'Refresh',
                onPress: () => {
                    // Refresh data
                    setTimeout(() => hide(config.id!), 1000);
                },
                style: 'primary',
            },
            secondaryAction: {
                title: 'Learn More',
                onPress: () => {
                    // Open help or documentation
                },
                style: 'secondary',
            },
            autoRetry: false,
            ...options,
            accessibility: {
                liveRegion: 'polite',
                announcements: ['No data available. Please try refreshing.'],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showRecoveryScreen = (error: CrossPlatformAppError, steps: any[], options?: Partial<ErrorScreenConfig>): string => {
        const config: ErrorScreenConfig = {
            id: generateScreenId(),
            type: 'recovery',
            title: 'Recovering from Error',
            message: `We're working to resolve the issue: ${error.userFriendlyMessage}`,
            steps: steps.map((step, index) => ({
                id: `step_${index}`,
                title: step.title || `Step ${index + 1}`,
                description: step.description || '',
                completed: index === 0,
                action: step.action,
            })),
            primaryAction: {
                title: 'Retry',
                onPress: () => {
                    retry(config.id!);
                },
                style: 'primary',
            },
            autoRetry: true,
            retryInterval: 3000,
            maxRetries: 3,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: ['Recovery process started. Please follow the steps shown.'],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    // Helper functions
    const generateScreenId = (): string => {
        return `error_screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const registerScreenRef = (id: string, ref: React.ElementRef<typeof ErrorScreen>) => {
        screenRefs.current.set(id, ref);
    };

    const unregisterScreenRef = (id: string) => {
        screenRefs.current.delete(id);
    };

    const handleScreenDismiss = (id: string): void => {
        hide(id);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            screenMap.current.clear();
            screenRefs.current.clear();
        };
    }, []);

    // Render error screens (only show the first one if maxScreens is 1)
    const renderScreens = () => {
        if (!state.visible || !state.currentScreen) {
            return null;
        }

        const screensToShow = Array.from(screenMap.current.values()).slice(0, maxScreens);

        return screensToShow.map((config, index) => (
            <ErrorScreen
                key={config.id}
                ref={(ref) => {
                    if (ref) {
                        registerScreenRef(config.id!, ref);
                    }
                }}
                config={config}
                onDismiss={handleScreenDismiss}
                theme={theme}
                visible={state.visible && index === 0}
            />
        ));
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {renderScreens()}
        </View>
    );
});

ErrorScreenManagerComponent.displayName = 'ErrorScreenManagerComponent';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9997,
        pointerEvents: 'none',
    },
});

export default ErrorScreenManagerComponent;

// Export the ref interface for external usage
export type { ErrorScreenManagerRef };

// Convenience hook for easy integration
export const useErrorScreenManager = (theme: any) => {
    const managerRef = useRef<ErrorScreenManagerRef>(null);

    return {
        manager: managerRef,
        ref: managerRef,
        show: (config: ErrorScreenConfig) => managerRef.current?.show(config) || '',
        hide: (id: string) => managerRef.current?.hide(id),
        retry: (id: string) => managerRef.current?.retry(id),
        getState: () => managerRef.current?.getState() || {
            visible: false,
            currentScreen: undefined,
            retryCount: 0,
            lastRetry: undefined,
            canRetry: false,
        },
        showNetworkOffline: (options?: Partial<ErrorScreenConfig>) =>
            managerRef.current?.showNetworkOffline(options),
        showServerError: (options?: Partial<ErrorScreenConfig>) =>
            managerRef.current?.showServerError(options),
        showMaintenanceMode: (options?: Partial<ErrorScreenConfig>) =>
            managerRef.current?.showMaintenanceMode(options),
        showEmptyState: (title?: string, message?: string, options?: Partial<ErrorScreenConfig>) =>
            managerRef.current?.showEmptyState(title, message, options),
        showRecoveryScreen: (error: CrossPlatformAppError, steps: any[], options?: Partial<ErrorScreenConfig>) =>
            managerRef.current?.showRecoveryScreen(error, steps, options),
    };
};