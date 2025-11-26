/**
 * Inline Error Manager Component for iOS Error UI Library
 * Handles form field validation errors with field-specific error management
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import InlineError from './InlineError';
import { InlineErrorConfig, InlineErrorManager as IInlineErrorManager , CrossPlatformAppError } from '../../types/ErrorUITypes';

interface Props {
    theme: any;
    errorLogger?: any; // Integration with CrossPlatformErrorLogger
    maxErrorsPerField?: number;
    maxErrorsTotal?: number;
    autoHideDelay?: number;
    enableFieldFocus?: boolean;
}

interface InlineErrorManagerRef {
    show: (config: InlineErrorConfig) => string;
    hide: (id: string) => void;
    clearField: (fieldId: string) => void;
    clearAll: () => void;
    getFieldErrors: (fieldId: string) => InlineErrorConfig[];
    showFieldError: (fieldId: string, message: string, severity?: 'low' | 'medium' | 'high', options?: Partial<InlineErrorConfig>) => string;
    showValidationError: (error: CrossPlatformAppError, fieldId?: string, options?: Partial<InlineErrorConfig>) => string;
    focusField: (fieldId: string) => void;
}

const InlineErrorManagerComponent = forwardRef<InlineErrorManagerRef, Props>(({
    theme,
    errorLogger,
    maxErrorsPerField = 3,
    maxErrorsTotal = 10,
    autoHideDelay = 5000,
    enableFieldFocus = true,
}, ref) => {
    const [errorMap, setErrorMap] = useState<Map<string, InlineErrorConfig>>(new Map());
    const [fieldErrors, setFieldErrors] = useState<Map<string, InlineErrorConfig[]>>(new Map());

    const errorRefs = useRef<Map<string, React.ElementRef<typeof InlineError>>>(new Map());
    const inputRefs = useRef<Map<string, React.ElementRef<typeof TextInput>>>(new Map());

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        show: (config: InlineErrorConfig): string => {
            return show(config);
        },
        hide: (id: string): void => {
            hide(id);
        },
        clearField: (fieldId: string): void => {
            clearField(fieldId);
        },
        clearAll: (): void => {
            clearAll();
        },
        getFieldErrors: (fieldId: string): InlineErrorConfig[] => {
            return getFieldErrors(fieldId);
        },
        showFieldError: (fieldId: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium', options?: Partial<InlineErrorConfig>): string => {
            return showFieldError(fieldId, message, severity, options);
        },
        showValidationError: (error: CrossPlatformAppError, fieldId?: string, options?: Partial<InlineErrorConfig>): string => {
            return showValidationError(error, fieldId, options);
        },
        focusField: (fieldId: string): void => {
            focusField(fieldId);
        },
    }));

    // Public API methods
    const show = (config: InlineErrorConfig): string => {
        const errorId = config.id || generateErrorId();
        const finalConfig: InlineErrorConfig = {
            ...config,
            id: errorId,
            autoHide: config.autoHide ?? true,
            autoHideDelay: config.autoHideDelay ?? autoHideDelay,
            fieldId: config.fieldId,
        };

        // Check limits
        if (errorMap.size >= maxErrorsTotal) {
            console.warn('Maximum number of inline errors reached');
            return '';
        }

        if (config.fieldId) {
            const fieldErrorList = fieldErrors.get(config.fieldId) || [];
            if (fieldErrorList.length >= maxErrorsPerField) {
                console.warn(`Maximum number of errors for field ${config.fieldId} reached`);
                return '';
            }
        }

        // Add error
        setErrorMap(prev => new Map(prev.set(errorId, finalConfig)));

        if (config.fieldId) {
            setFieldErrors(prev => {
                const newMap = new Map(prev);
                const currentFieldErrors = newMap.get(config.fieldId!) || [];
                newMap.set(config.fieldId!, [...currentFieldErrors, finalConfig]);
                return newMap;
            });
        }

        // Focus field if enabled
        if (enableFieldFocus && config.fieldId) {
            focusField(config.fieldId);
        }

        errorLogger?.logError({
            type: 'inline_error_shown',
            errorId,
            fieldId: config.fieldId,
            severity: config.severity,
            timestamp: new Date(),
        });

        return errorId;
    };

    const hide = (id: string): void => {
        if (!errorMap.has(id)) return;

        const config = errorMap.get(id)!;

        // Remove from error map
        setErrorMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });

        // Remove from field errors if applicable
        if (config.fieldId) {
            setFieldErrors(prev => {
                const newMap = new Map(prev);
                const currentFieldErrors = newMap.get(config.fieldId!) || [];
                const updatedFieldErrors = currentFieldErrors.filter(error => error.id !== id);

                if (updatedFieldErrors.length > 0) {
                    newMap.set(config.fieldId!, updatedFieldErrors);
                } else {
                    newMap.delete(config.fieldId!);
                }

                return newMap;
            });
        }

        errorLogger?.logError({
            type: 'inline_error_dismissed',
            errorId: id,
            fieldId: config.fieldId,
            timestamp: new Date(),
        });
    };

    const clearField = (fieldId: string): void => {
        const fieldErrorList = fieldErrors.get(fieldId) || [];

        // Remove all errors for this field
        fieldErrorList.forEach(error => {
            hide(error.id);
        });

        setFieldErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(fieldId);
            return newMap;
        });
    };

    const clearAll = (): void => {
        const allErrors = Array.from(errorMap.values());
        allErrors.forEach(error => {
            hide(error.id);
        });

        setErrorMap(new Map());
        setFieldErrors(new Map());
    };

    const getFieldErrors = (fieldId: string): InlineErrorConfig[] => {
        return fieldErrors.get(fieldId) || [];
    };

    // Convenience methods
    const showFieldError = (fieldId: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium', options?: Partial<InlineErrorConfig>): string => {
        const config: InlineErrorConfig = {
            id: generateErrorId(),
            message,
            severity,
            type: 'field',
            fieldId,
            dismissible: true,
            autoHide: true,
            autoHideDelay,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: [message],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const showValidationError = (error: CrossPlatformAppError, fieldId?: string, options?: Partial<InlineErrorConfig>): string => {
        const config: InlineErrorConfig = {
            id: generateErrorId(),
            message: error.userFriendlyMessage,
            severity: error.severity as 'low' | 'medium' | 'high',
            type: 'field',
            fieldId: fieldId || error.platformContext?.additionalContext?.fieldId,
            dismissible: true,
            autoHide: true,
            autoHideDelay,
            ...options,
            accessibility: {
                liveRegion: 'assertive',
                announcements: [error.userFriendlyMessage],
                ...options?.accessibility,
            },
        };

        return show(config);
    };

    const focusField = (fieldId: string): void => {
        const inputRef = inputRefs.current.get(fieldId);
        if (inputRef && inputRef.focus) {
            inputRef.focus();
        }
    };

    // Helper functions
    const generateErrorId = (): string => {
        return `inline_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const registerErrorRef = (id: string, ref: React.ElementRef<typeof InlineError>) => {
        errorRefs.current.set(id, ref);
    };

    const unregisterErrorRef = (id: string) => {
        errorRefs.current.delete(id);
    };

    const registerInputRef = (fieldId: string, ref: React.ElementRef<typeof TextInput>) => {
        inputRefs.current.set(fieldId, ref);
    };

    const unregisterInputRef = (fieldId: string) => {
        inputRefs.current.delete(fieldId);
    };

    const handleErrorDismiss = (id: string): void => {
        hide(id);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAll();
            errorRefs.current.clear();
            inputRefs.current.clear();
        };
    }, []);

    // Render inline errors
    const renderErrors = () => {
        return Array.from(errorMap.values()).map(config => (
            <InlineError
                key={config.id}
                ref={(ref) => {
                    if (ref) {
                        registerErrorRef(config.id!, ref);
                    }
                }}
                config={config}
                onDismiss={handleErrorDismiss}
                theme={theme}
                visible={true}
                inputRef={config.fieldId ? inputRefs.current.get(config.fieldId) : undefined}
            />
        ));
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {renderErrors()}
        </View>
    );
});

InlineErrorManagerComponent.displayName = 'InlineErrorManagerComponent';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9996,
        pointerEvents: 'none',
    },
});

export default InlineErrorManagerComponent;

// Export the ref interface for external usage
export type { InlineErrorManagerRef };

// Hook for easy integration
export const useInlineErrorManager = (theme: any, errorLogger?: any) => {
    const managerRef = useRef<InlineErrorManagerRef>(null);

    return {
        manager: managerRef,
        ref: managerRef,
        show: (config: InlineErrorConfig) => managerRef.current?.show(config) || '',
        hide: (id: string) => managerRef.current?.hide(id),
        clearField: (fieldId: string) => managerRef.current?.clearField(fieldId),
        clearAll: () => managerRef.current?.clearAll(),
        getFieldErrors: (fieldId: string) => managerRef.current?.getFieldErrors(fieldId) || [],
        showFieldError: (fieldId: string, message: string, severity?: 'low' | 'medium' | 'high', options?: Partial<InlineErrorConfig>) =>
            managerRef.current?.showFieldError(fieldId, message, severity, options) || '',
        showValidationError: (error: CrossPlatformAppError, fieldId?: string, options?: Partial<InlineErrorConfig>) =>
            managerRef.current?.showValidationError(error, fieldId, options) || '',
        focusField: (fieldId: string) => managerRef.current?.focusField(fieldId),
    };
};