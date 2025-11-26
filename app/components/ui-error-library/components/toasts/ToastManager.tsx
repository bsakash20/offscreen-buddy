/**
 * Toast Manager Component for iOS Error UI Library
 * Handles multiple toast notifications with queue management and positioning
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ToastNotification from './ToastNotification';
import { ToastConfig, ToastState, ToastManager , CrossPlatformAppError } from '../../types/ErrorUITypes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
    theme: any;
    errorLogger?: any; // Integration with CrossPlatformErrorLogger
    maxToasts?: number;
    defaultDuration?: number;
    position?: 'top' | 'center' | 'bottom';
    enableHapticFeedback?: boolean;
}

// Exposed methods via ref
export interface ToastManagerRef {
    show: (config: ToastConfig) => string;
    hide: (id: string) => void;
    hideAll: () => void;
    update: (id: string, config: Partial<ToastConfig>) => void;
    getState: () => ToastState;
    showErrorToast: (error: CrossPlatformAppError, options?: Partial<ToastConfig>) => string;
    showSuccessToast: (message: string, title?: string, options?: Partial<ToastConfig>) => string;
    showWarningToast: (message: string, title?: string, options?: Partial<ToastConfig>) => string;
    showInfoToast: (message: string, title?: string, options?: Partial<ToastConfig>) => string;
}

const ToastManagerComponent = forwardRef<ToastManagerRef, Props>(({
    theme,
    errorLogger,
    maxToasts = 3,
    defaultDuration = 4000,
    position = 'top',
    enableHapticFeedback = true,
}, ref) => {
    const [state, setState] = useState<ToastState>({
        visible: false,
        queue: [],
        current: undefined,
        progress: 0,
    });

    const toastMap = useRef<Map<string, ToastConfig>>(new Map());
    const visibilityTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        show: (config: ToastConfig): string => {
            return show(config);
        },
        hide: (id: string): void => {
            hide(id);
        },
        hideAll: (): void => {
            hideAll();
        },
        update: (id: string, config: Partial<ToastConfig>): void => {
            update(id, config);
        },
        getState: (): ToastState => {
            return getState();
        },
        showErrorToast: (error: CrossPlatformAppError, options?: Partial<ToastConfig>): string => {
            return showErrorToast(error, options);
        },
        showSuccessToast: (message: string, title?: string, options?: Partial<ToastConfig>): string => {
            return showSuccessToast(message, title, options);
        },
        showWarningToast: (message: string, title?: string, options?: Partial<ToastConfig>): string => {
            return showWarningToast(message, title, options);
        },
        showInfoToast: (message: string, title?: string, options?: Partial<ToastConfig>): string => {
            return showInfoToast(message, title, options);
        },
    }));

    // Public API methods
    const show = (config: ToastConfig): string => {
        const toastId = config.id || generateToastId();
        const finalConfig: ToastConfig = {
            ...config,
            id: toastId,
            duration: config.duration ?? defaultDuration,
            haptic: config.haptic ?? enableHapticFeedback,
        };

        toastMap.current.set(toastId, finalConfig);

        setState(prevState => {
            const newQueue = [...prevState.queue, finalConfig];

            return {
                ...prevState,
                visible: newQueue.length > 0,
                queue: newQueue,
            };
        });

        errorLogger?.logError({
            type: 'toast_shown',
            toastId,
            toastType: finalConfig.type,
            timestamp: new Date(),
        });

        return toastId;
    };

    const hide = (id: string): void => {
        if (!toastMap.current.has(id)) return;

        const config = toastMap.current.get(id)!;
        toastMap.current.delete(id);

        // Clear any existing timer
        const timer = visibilityTimers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            visibilityTimers.current.delete(id);
        }

        setState(prevState => {
            const newQueue = prevState.queue.filter(toast => toast.id !== id);

            return {
                ...prevState,
                visible: newQueue.length > 0,
                queue: newQueue,
            };
        });

        errorLogger?.logError({
            type: 'toast_dismissed',
            toastId: id,
            toastType: config.type,
            timestamp: new Date(),
        });
    };

    const hideAll = (): void => {
        toastMap.current.clear();
        visibilityTimers.current.forEach(timer => clearTimeout(timer));
        visibilityTimers.current.clear();

        setState({
            visible: false,
            queue: [],
            current: undefined,
            progress: 0,
        });
    };

    const update = (id: string, config: Partial<ToastConfig>): void => {
        const existingToast = toastMap.current.get(id);
        if (!existingToast) return;

        const updatedToast = { ...existingToast, ...config };
        toastMap.current.set(id, updatedToast);

        setState(prevState => ({
            ...prevState,
            queue: prevState.queue.map(toast =>
                toast.id === id ? updatedToast : toast
            ),
        }));
    };

    const getState = (): ToastState => state;

    // Integration with error framework
    const showErrorToast = (error: CrossPlatformAppError, options?: Partial<ToastConfig>): string => {
        const config: ToastConfig = {
            id: generateToastId(),
            title: getErrorTitle(error),
            message: error.userFriendlyMessage,
            type: 'error',
            severity: mapSeverity(error.severity),
            persistent: error.userImpact === 'blocking',
            position,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: [error.userFriendlyMessage],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showSuccessToast = (message: string, title?: string, options?: Partial<ToastConfig>): string => {
        const config: ToastConfig = {
            id: generateToastId(),
            title: title || 'Success',
            message,
            type: 'success',
            severity: 'low',
            duration: options?.persistent ? undefined : 3000,
            position,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'polite',
                announcements: [`${title || 'Success'}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showWarningToast = (message: string, title?: string, options?: Partial<ToastConfig>): string => {
        const config: ToastConfig = {
            id: generateToastId(),
            title: title || 'Warning',
            message,
            type: 'warning',
            severity: 'medium',
            duration: options?.persistent ? undefined : 5000,
            position,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: [`${title || 'Warning'}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showInfoToast = (message: string, title?: string, options?: Partial<ToastConfig>): string => {
        const config: ToastConfig = {
            id: generateToastId(),
            title: title || 'Info',
            message,
            type: 'info',
            severity: 'low',
            duration: options?.persistent ? undefined : 4000,
            position,
            haptic: false,
            ...options,
            accessibility: {
                liveRegion: 'polite',
                announcements: [`${title || 'Info'}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    // Helper functions
    const generateToastId = (): string => {
        return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const getErrorTitle = (error: CrossPlatformAppError): string => {
        switch (error.userImpact) {
            case 'blocking':
                return 'Action Required';
            case 'disruptive':
                return 'Something Went Wrong';
            case 'minor':
                return 'Notice';
            default:
                return 'Information';
        }
    };

    const mapSeverity = (errorSeverity: string): 'low' | 'medium' | 'high' | 'critical' => {
        switch (errorSeverity) {
            case 'critical':
                return 'critical';
            case 'high':
                return 'high';
            case 'medium':
                return 'medium';
            default:
                return 'low';
        }
    };

    const handleToastDismiss = (id: string): void => {
        hide(id);
    };

    const renderToasts = () => {
        const visibleToasts = state.queue.slice(0, maxToasts);

        return visibleToasts.map((config, index) => (
            <ToastNotification
                key={config.id}
                config={config}
                onDismiss={handleToastDismiss}
                theme={theme}
                index={index}
                total={visibleToasts.length}
            />
        ));
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            hideAll();
        };
    }, []);

    if (!state.visible || state.queue.length === 0) {
        return null;
    }

    return (
        <View style={[
            styles.container,
            position === 'top' && styles.topContainer,
            position === 'center' && styles.centerContainer,
            position === 'bottom' && styles.bottomContainer,
        ]}>
            {renderToasts()}
        </View>
    );
});

ToastManagerComponent.displayName = 'ToastManagerComponent';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'none',
    },
    topContainer: {
        top: 0,
        paddingTop: 50, // Account for status bar and safe area
    },
    centerContainer: {
        top: screenHeight / 2 - 100,
        transform: [{ translateY: -100 }],
    },
    bottomContainer: {
        bottom: 0,
        paddingBottom: 50, // Account for home indicator and safe area
    },
});

export default ToastManagerComponent;

// Convenience hook for easy integration
export const useToastManager = (theme: any) => {
    const managerRef = useRef<ToastManagerRef>(null);

    return {
        manager: managerRef,
        ref: managerRef,
        show: (config: ToastConfig) => managerRef.current?.show(config) || '',
        hide: (id: string) => managerRef.current?.hide(id),
        hideAll: () => managerRef.current?.hideAll(),
        update: (id: string, config: Partial<ToastConfig>) => managerRef.current?.update(id, config),
        getState: () => managerRef.current?.getState() || {
            visible: false,
            queue: [],
            current: undefined,
            progress: 0,
        },
        showError: (error: CrossPlatformAppError, options?: Partial<ToastConfig>) =>
            managerRef.current?.showErrorToast(error, options),
        showSuccess: (message: string, title?: string, options?: Partial<ToastConfig>) =>
            managerRef.current?.showSuccessToast(message, title, options),
        showWarning: (message: string, title?: string, options?: Partial<ToastConfig>) =>
            managerRef.current?.showWarningToast(message, title, options),
        showInfo: (message: string, title?: string, options?: Partial<ToastConfig>) =>
            managerRef.current?.showInfoToast(message, title, options),
    };
};