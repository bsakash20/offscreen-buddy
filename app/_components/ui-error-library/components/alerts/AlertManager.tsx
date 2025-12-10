/**
 * Alert Manager Component for iOS Error UI Library
 * Handles multiple alert dialogs with queue management and modal presentation
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import AlertDialog from './AlertDialog';
import { AlertConfig, AlertState, AlertManager , CrossPlatformAppError } from '../../types/ErrorUITypes';

interface Props {
    theme: any;
    errorLogger?: any; // Integration with CrossPlatformErrorLogger
    maxAlerts?: number;
    enableHapticFeedback?: boolean;
    enableBlurBackground?: boolean;
}

interface AlertManagerRef {
    show: (config: AlertConfig) => string;
    hide: (id: string) => void;
    hideAll: () => void;
    update: (id: string, config: Partial<AlertConfig>) => void;
    getState: () => AlertState;
    showErrorAlert: (error: CrossPlatformAppError, options?: Partial<AlertConfig>) => string;
    showCriticalAlert: (title: string, message: string, options?: Partial<AlertConfig>) => string;
    showWarningAlert: (title: string, message: string, options?: Partial<AlertConfig>) => string;
    showConfirmationAlert: (title: string, message: string, onConfirm: () => void, onCancel?: () => void, options?: Partial<AlertConfig>) => string;
    showInputAlert: (title: string, message: string, onSubmit: (input: string) => void, onCancel?: () => void, options?: Partial<AlertConfig>) => string;
}

const AlertManagerComponent = forwardRef<AlertManagerRef, Props>(({
    theme,
    errorLogger,
    maxAlerts = 1,
    enableHapticFeedback = true,
    enableBlurBackground = false,
}, ref) => {
    const [state, setState] = useState<AlertState>({
        visible: false,
        currentAlert: undefined,
        queue: [],
    });

    const alertMap = useRef<Map<string, AlertConfig>>(new Map());
    const alertDialogRefs = useRef<Map<string, any>>(new Map());

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        show: (config: AlertConfig): string => {
            return show(config);
        },
        hide: (id: string): void => {
            hide(id);
        },
        hideAll: (): void => {
            hideAll();
        },
        update: (id: string, config: Partial<AlertConfig>): void => {
            update(id, config);
        },
        getState: (): AlertState => {
            return getState();
        },
        showErrorAlert: (error: CrossPlatformAppError, options?: Partial<AlertConfig>): string => {
            return showErrorAlert(error, options);
        },
        showCriticalAlert: (title: string, message: string, options?: Partial<AlertConfig>): string => {
            return showCriticalAlert(title, message, options);
        },
        showWarningAlert: (title: string, message: string, options?: Partial<AlertConfig>): string => {
            return showWarningAlert(title, message, options);
        },
        showConfirmationAlert: (title: string, message: string, onConfirm: () => void, onCancel?: () => void, options?: Partial<AlertConfig>): string => {
            return showConfirmationAlert(title, message, onConfirm, onCancel, options);
        },
        showInputAlert: (title: string, message: string, onSubmit: (input: string) => void, onCancel?: () => void, options?: Partial<AlertConfig>): string => {
            return showInputAlert(title, message, onSubmit, onCancel, options);
        },
    }));

    // Public API methods
    const show = (config: AlertConfig): string => {
        const alertId = config.id || generateAlertId();
        const finalConfig: AlertConfig = {
            ...config,
            id: alertId,
            haptic: config.haptic ?? enableHapticFeedback,
            blurBackground: config.blurBackground ?? enableBlurBackground,
            modal: config.modal ?? true,
        };

        alertMap.current.set(alertId, finalConfig);

        setState(prevState => {
            const newQueue = [...prevState.queue, finalConfig];
            const visible = newQueue.length > 0;
            const currentAlert = visible ? newQueue[0] : undefined;

            return {
                ...prevState,
                visible,
                queue: newQueue,
                currentAlert,
            };
        });

        errorLogger?.logError({
            type: 'alert_shown',
            alertId,
            alertType: finalConfig.type,
            timestamp: new Date(),
        });

        return alertId;
    };

    const hide = (id: string): void => {
        if (!alertMap.current.has(id)) return;

        const config = alertMap.current.get(id)!;
        alertMap.current.delete(id);

        setState(prevState => {
            const newQueue = prevState.queue.filter(alert => alert.id !== id);
            const visible = newQueue.length > 0;
            const currentAlert = visible ? newQueue[0] : undefined;

            return {
                ...prevState,
                visible,
                queue: newQueue,
                currentAlert,
            };
        });

        errorLogger?.logError({
            type: 'alert_dismissed',
            alertId: id,
            alertType: config.type,
            timestamp: new Date(),
        });
    };

    const hideAll = (): void => {
        alertMap.current.clear();

        setState({
            visible: false,
            currentAlert: undefined,
            queue: [],
        });
    };

    const update = (id: string, config: Partial<AlertConfig>): void => {
        const existingAlert = alertMap.current.get(id);
        if (!existingAlert) return;

        const updatedAlert = { ...existingAlert, ...config };
        alertMap.current.set(id, updatedAlert);

        setState(prevState => ({
            ...prevState,
            queue: prevState.queue.map(alert =>
                alert.id === id ? updatedAlert : alert
            ),
        }));
    };

    const getState = (): AlertState => state;

    // Integration with error framework
    const showErrorAlert = (error: CrossPlatformAppError, options?: Partial<AlertConfig>): string => {
        const config: AlertConfig = {
            id: generateAlertId(),
            title: getErrorTitle(error),
            message: error.userFriendlyMessage,
            type: 'critical',
            style: 'default',
            buttons: [
                {
                    title: 'OK',
                    onPress: () => { },
                    style: 'default',
                },
            ],
            modal: true,
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

    const showCriticalAlert = (title: string, message: string, options?: Partial<AlertConfig>): string => {
        const config: AlertConfig = {
            id: generateAlertId(),
            title,
            message,
            type: 'critical',
            style: 'default',
            buttons: [
                {
                    title: 'OK',
                    onPress: () => { },
                    style: 'default',
                },
            ],
            modal: true,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: [`${title}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showWarningAlert = (title: string, message: string, options?: Partial<AlertConfig>): string => {
        const config: AlertConfig = {
            id: generateAlertId(),
            title,
            message,
            type: 'warning',
            style: 'default',
            buttons: [
                {
                    title: 'OK',
                    onPress: () => { },
                    style: 'default',
                },
                {
                    title: 'Cancel',
                    onPress: () => { },
                    style: 'cancel',
                },
            ],
            modal: true,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: [`${title}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showConfirmationAlert = (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        options?: Partial<AlertConfig>
    ): string => {
        const config: AlertConfig = {
            id: generateAlertId(),
            title,
            message,
            type: 'confirmation',
            style: 'sheet',
            buttons: [
                {
                    title: options?.cancelButton || 'Cancel',
                    onPress: () => {
                        onCancel?.();
                    },
                    style: 'cancel',
                },
                {
                    title: options?.defaultButton || 'OK',
                    onPress: () => {
                        onConfirm();
                    },
                    style: 'default',
                },
            ],
            modal: true,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'polite',
                announcements: [`${title}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showInputAlert = (
        title: string,
        message: string,
        onSubmit: (input: string) => void,
        onCancel?: () => void,
        options?: Partial<AlertConfig>
    ): string => {
        const config: AlertConfig = {
            id: generateAlertId(),
            title,
            message,
            type: 'input_required',
            style: 'card',
            buttons: [
                {
                    title: options?.cancelButton || 'Cancel',
                    onPress: () => {
                        onCancel?.();
                    },
                    style: 'cancel',
                },
                {
                    title: options?.defaultButton || 'Submit',
                    onPress: () => {
                        // In a real implementation, you'd include input handling here
                        // For now, we'll just call the submit handler
                        onSubmit('');
                    },
                    style: 'default',
                },
            ],
            modal: true,
            haptic: true,
            ...options,
            accessibility: {
                liveRegion: 'polite',
                announcements: [`${title}: ${message}`],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    // Helper functions
    const generateAlertId = (): string => {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    const handleAlertDismiss = (id: string): void => {
        hide(id);
    };

    const registerAlertRef = (id: string, ref: any) => {
        alertDialogRefs.current.set(id, ref);
    };

    const unregisterAlertRef = (id: string) => {
        alertDialogRefs.current.delete(id);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            hideAll();
        };
    }, []);

    // Render alert dialogs (only show the first one if maxAlerts is 1)
    const renderAlerts = () => {
        if (!state.visible || state.queue.length === 0) {
            return null;
        }

        const alertsToShow = state.queue.slice(0, maxAlerts);

        return alertsToShow.map((config, index) => (
            <AlertDialog
                key={config.id}
                ref={(ref) => {
                    if (ref) {
                        registerAlertRef(config.id, ref);
                    }
                }}
                config={config}
                onDismiss={handleAlertDismiss}
                theme={theme}
                visible={state.visible && index === 0}
            />
        ));
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {renderAlerts()}
        </View>
    );
});

AlertManagerComponent.displayName = 'AlertManagerComponent';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'none',
    },
});

export default AlertManagerComponent;

// Export the ref interface for external usage
export type { AlertManagerRef };

// Convenience hook for easy integration
export const useAlertManager = (theme: any) => {
    const managerRef = useRef<AlertManagerRef>(null);

    return {
        manager: managerRef,
        ref: managerRef,
        show: (config: AlertConfig) => managerRef.current?.show(config) || '',
        hide: (id: string) => managerRef.current?.hide(id),
        hideAll: () => managerRef.current?.hideAll(),
        update: (id: string, config: Partial<AlertConfig>) => managerRef.current?.update(id, config),
        getState: () => managerRef.current?.getState() || {
            visible: false,
            currentAlert: undefined,
            queue: [],
        },
        showError: (error: CrossPlatformAppError, options?: Partial<AlertConfig>) =>
            managerRef.current?.showErrorAlert(error, options),
        showCritical: (title: string, message: string, options?: Partial<AlertConfig>) =>
            managerRef.current?.showCriticalAlert(title, message, options),
        showWarning: (title: string, message: string, options?: Partial<AlertConfig>) =>
            managerRef.current?.showWarningAlert(title, message, options),
        showConfirmation: (title: string, message: string, onConfirm: () => void, onCancel?: () => void, options?: Partial<AlertConfig>) =>
            managerRef.current?.showConfirmationAlert(title, message, onConfirm, onCancel, options),
        showInput: (title: string, message: string, onSubmit: (input: string) => void, onCancel?: () => void, options?: Partial<AlertConfig>) =>
            managerRef.current?.showInputAlert(title, message, onSubmit, onCancel, options),
    };
};