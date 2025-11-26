/**
 * Keyboard and Switch Control Navigation System for iOS Accessibility
 * Comprehensive keyboard navigation and switch control support for error components
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Keyboard,
    Platform,
    BackHandler,
} from 'react-native';

// Keyboard and switch control configuration
export interface KeyboardNavigationConfig {
    enabled: boolean;
    keyboardNavigation: {
        enabled: boolean;
        tabOrder: 'sequential' | 'logical' | 'custom';
        trapFocus: boolean;
        autoFocus: boolean;
        announceFocus: boolean;
        skipLinks: boolean;
    };
    switchControl: {
        enabled: boolean;
        autoScan: boolean;
        scanSpeed: number;
        highlightFocus: boolean;
        customActions: Record<string, () => void>;
    };
    focusManagement: {
        restoration: boolean;
        initialFocus: string;
        returnFocus: boolean;
        focusTrapDuration: number;
    };
    accessibilityAnnouncements: {
        focusChanges: boolean;
        actionDescriptions: boolean;
        navigationInstructions: boolean;
    };
}

// Navigation state
interface NavigationState {
    focusedElementId: string | null;
    focusableElements: FocusableElement[];
    navigationHistory: string[];
    currentTabIndex: number;
    isKeyboardActive: boolean;
    isSwitchControlActive: boolean;
    trappedFocus: boolean;
}

// Focusable element definition
interface FocusableElement {
    id: string;
    element: any;
    tabIndex: number;
    role: string;
    label: string;
    description?: string;
    disabled?: boolean;
    groupId?: string;
    order?: number;
    skipToNext?: string;
    skipToPrevious?: string;
    actions: Record<string, () => void>;
}

// Keyboard and switch control context
interface KeyboardNavigationContextType {
    config: KeyboardNavigationConfig;
    updateConfig: (newConfig: Partial<KeyboardNavigationConfig>) => void;
    registerFocusable: (element: FocusableElement) => void;
    unregisterFocusable: (id: string) => void;
    moveFocus: (direction: 'next' | 'previous' | 'first' | 'last', groupId?: string) => void;
    focusElement: (id: string, announce?: boolean) => void;
    getFocusedElement: () => FocusableElement | null;
    getNextFocusable: (currentId?: string) => FocusableElement | null;
    getPreviousFocusable: (currentId?: string) => FocusableElement | null;
    trapFocus: (containerId: string) => void;
    releaseFocusTrap: () => void;
    addCustomAction: (key: string, action: () => void) => void;
    getNavigationState: () => NavigationState;
    announceNavigation: (message: string) => void;
}

// Context creation
const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | undefined>(undefined);

// Default configuration
const DEFAULT_KEYBOARD_NAVIGATION_CONFIG: KeyboardNavigationConfig = {
    enabled: true,
    keyboardNavigation: {
        enabled: true,
        tabOrder: 'sequential',
        trapFocus: true,
        autoFocus: true,
        announceFocus: true,
        skipLinks: true,
    },
    switchControl: {
        enabled: true,
        autoScan: false,
        scanSpeed: 1000,
        highlightFocus: true,
        customActions: {},
    },
    focusManagement: {
        restoration: true,
        initialFocus: 'first',
        returnFocus: true,
        focusTrapDuration: 5000,
    },
    accessibilityAnnouncements: {
        focusChanges: true,
        actionDescriptions: true,
        navigationInstructions: true,
    },
};

// Provider component
interface KeyboardNavigationProviderProps {
    children: ReactNode;
    config?: Partial<KeyboardNavigationConfig>;
    onFocusChange?: (element: FocusableElement | null) => void;
    onKeyboardActivity?: (isActive: boolean) => void;
    onSwitchControlActivity?: (isActive: boolean) => void;
}

const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({
    children,
    config = {},
    onFocusChange,
    onKeyboardActivity,
    onSwitchControlActivity,
}) => {
    const [keyboardConfig, setKeyboardConfig] = useState<KeyboardNavigationConfig>({
        ...DEFAULT_KEYBOARD_NAVIGATION_CONFIG,
        ...config,
    });

    const [navigationState, setNavigationState] = useState<NavigationState>({
        focusedElementId: null,
        focusableElements: [],
        navigationHistory: [],
        currentTabIndex: 0,
        isKeyboardActive: false,
        isSwitchControlActive: false,
        trappedFocus: false,
    });

    const focusTrapContainerId = useRef<string | null>(null);
    const keyHandler = useRef<((event: any) => void) | null>(null);

    // Keyboard event handling
    useEffect(() => {
        if (!keyboardConfig.enabled || !keyboardConfig.keyboardNavigation.enabled) {
            return;
        }

        keyHandler.current = (event: any) => {
            const { key, ctrlKey, altKey, shiftKey } = event;
            const isModifierPressed = ctrlKey || altKey;

            // Keyboard shortcuts
            if (isModifierPressed) {
                switch (key.toLowerCase()) {
                    case 'tab':
                        event.preventDefault();
                        handleTabNavigation(!shiftKey);
                        break;
                    case 'enter':
                        if (navigationState.focusedElementId) {
                            event.preventDefault();
                            handleElementActivation(navigationState.focusedElementId);
                        }
                        break;
                    case 'escape':
                        if (navigationState.focusedElementId) {
                            event.preventDefault();
                            handleEscapeAction(navigationState.focusedElementId);
                        }
                        break;
                    case 'arrowright':
                    case 'arrowdown':
                        event.preventDefault();
                        moveFocus('next');
                        break;
                    case 'arrowleft':
                    case 'arrowup':
                        event.preventDefault();
                        moveFocus('previous');
                        break;
                    case 'home':
                        event.preventDefault();
                        moveFocus('first');
                        break;
                    case 'end':
                        event.preventDefault();
                        moveFocus('last');
                        break;
                }
            }

            // Single key navigation
            switch (key) {
                case 'Tab':
                    handleTabNavigation(!shiftKey);
                    break;
                case 'Enter':
                case ' ':
                    if (navigationState.focusedElementId) {
                        event.preventDefault();
                        handleElementActivation(navigationState.focusedElementId);
                    }
                    break;
                case 'Escape':
                    if (navigationState.focusedElementId) {
                        handleEscapeAction(navigationState.focusedElementId);
                    }
                    break;
            }
        };

        // Add keyboard event listeners
        if (Platform.OS === 'web') {
            document.addEventListener('keydown', keyHandler.current);

            // Detect keyboard activity
            document.addEventListener('mousedown', () => {
                if (navigationState.isKeyboardActive) {
                    setNavigationState(prev => ({ ...prev, isKeyboardActive: false }));
                    onKeyboardActivity?.(false);
                }
            });

            document.addEventListener('keydown', () => {
                if (!navigationState.isKeyboardActive) {
                    setNavigationState(prev => ({ ...prev, isKeyboardActive: true }));
                    onKeyboardActivity?.(true);
                }
            });
        } else {
            // iOS/Android keyboard handling would go here
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                if (navigationState.focusedElementId) {
                    handleEscapeAction(navigationState.focusedElementId);
                    return true;
                }
                return false;
            });

            return () => {
                backHandler.remove();
            };
        }

        return () => {
            if (Platform.OS === 'web' && keyHandler.current) {
                document.removeEventListener('keydown', keyHandler.current);
            }
        };
    }, [
        keyboardConfig,
        navigationState.focusedElementId,
        navigationState.isKeyboardActive,
        onFocusChange,
        onKeyboardActivity,
    ]);

    // Focus management utilities
    const registerFocusable = useCallback((element: FocusableElement) => {
        setNavigationState(prev => {
            const existingIndex = prev.focusableElements.findIndex(e => e.id === element.id);
            const newElements = [...prev.focusableElements];

            if (existingIndex >= 0) {
                newElements[existingIndex] = element;
            } else {
                newElements.push(element);
            }

            // Sort by tabIndex
            newElements.sort((a, b) => a.tabIndex - b.tabIndex);

            return {
                ...prev,
                focusableElements: newElements,
            };
        });
    }, []);

    const unregisterFocusable = useCallback((id: string) => {
        setNavigationState(prev => ({
            ...prev,
            focusableElements: prev.focusableElements.filter(e => e.id !== id),
            focusedElementId: prev.focusedElementId === id ? null : prev.focusedElementId,
            navigationHistory: prev.navigationHistory.filter(id => id !== id),
        }));
    }, []);

    const getNextFocusable = useCallback((currentId?: string) => {
        const { focusableElements } = navigationState;
        if (focusableElements.length === 0) return null;

        let currentIndex = 0;
        if (currentId) {
            currentIndex = focusableElements.findIndex(e => e.id === currentId);
            if (currentIndex === -1) currentIndex = 0;
        }

        // Skip disabled elements
        for (let i = 1; i <= focusableElements.length; i++) {
            const nextIndex = (currentIndex + i) % focusableElements.length;
            const nextElement = focusableElements[nextIndex];
            if (!nextElement.disabled) {
                return nextElement;
            }
        }

        return null;
    }, [navigationState.focusableElements]);

    const getPreviousFocusable = useCallback((currentId?: string) => {
        const { focusableElements } = navigationState;
        if (focusableElements.length === 0) return null;

        let currentIndex = 0;
        if (currentId) {
            currentIndex = focusableElements.findIndex(e => e.id === currentId);
            if (currentIndex === -1) currentIndex = 0;
        }

        // Skip disabled elements
        for (let i = 1; i <= focusableElements.length; i++) {
            const prevIndex = (currentIndex - i + focusableElements.length) % focusableElements.length;
            const prevElement = focusableElements[prevIndex];
            if (!prevElement.disabled) {
                return prevElement;
            }
        }

        return null;
    }, [navigationState.focusableElements]);

    // Focus movement
    const moveFocus = useCallback((direction: 'next' | 'previous' | 'first' | 'last', groupId?: string) => {
        let targetElement: FocusableElement | null = null;

        switch (direction) {
            case 'next':
                targetElement = getNextFocusable(navigationState.focusedElementId || undefined);
                break;
            case 'previous':
                targetElement = getPreviousFocusable(navigationState.focusedElementId || undefined);
                break;
            case 'first':
                targetElement = navigationState.focusableElements.find((e: any) => !e.disabled) || null;
                break;
            case 'last':
                const elements = navigationState.focusableElements.filter((e: any) => !e.disabled);
                targetElement = elements[elements.length - 1] || null;
                break;
        }

        if (targetElement) {
            focusElement(targetElement.id, true);
        }
    }, [
        navigationState.focusedElementId,
        navigationState.focusableElements,
        getNextFocusable,
        getPreviousFocusable,
    ]);

    const focusElement = useCallback((id: string, announce = false) => {
        const element = navigationState.focusableElements.find(e => e.id === id);
        if (!element || element.disabled) return;

        setNavigationState(prev => {
            const newHistory = [...prev.navigationHistory];
            if (prev.focusedElementId && newHistory[newHistory.length - 1] !== prev.focusedElementId) {
                newHistory.push(prev.focusedElementId);
                if (newHistory.length > 10) {
                    newHistory.shift();
                }
            }

            return {
                ...prev,
                focusedElementId: id,
                navigationHistory: newHistory,
                currentTabIndex: prev.focusableElements.findIndex(e => e.id === id),
            };
        });

        if (announce && keyboardConfig.accessibilityAnnouncements.focusChanges) {
            announceNavigation(`Focused: ${element.label}`);
        }

        onFocusChange?.(element);
    }, [
        navigationState.focusableElements,
        keyboardConfig.accessibilityAnnouncements.focusChanges,
        onFocusChange,
    ]);

    // Focus trapping
    const trapFocus = useCallback((containerId: string) => {
        focusTrapContainerId.current = containerId;
        setNavigationState(prev => ({ ...prev, trappedFocus: true }));
    }, []);

    const releaseFocusTrap = useCallback(() => {
        focusTrapContainerId.current = null;
        setNavigationState(prev => ({ ...prev, trappedFocus: false }));
    }, []);

    // Action handlers
    const handleTabNavigation = useCallback((forward: boolean) => {
        moveFocus(forward ? 'next' : 'previous');
    }, [moveFocus]);

    const handleElementActivation = useCallback((elementId: string) => {
        const element = navigationState.focusableElements.find((e: any) => e.id === elementId);
        if (element && element.actions.onActivate) {
            element.actions.onActivate();
        }
    }, [navigationState.focusableElements]);

    const handleEscapeAction = useCallback((elementId: string) => {
        const element = navigationState.focusableElements.find((e: any) => e.id === elementId);
        if (element && element.actions.onEscape) {
            element.actions.onEscape();
        } else {
            // Default escape behavior
            releaseFocusTrap();
            if (Platform.OS !== 'ios') {
                Keyboard.dismiss();
            }
        }
    }, [navigationState.focusableElements, releaseFocusTrap]);

    // Navigation announcements
    const announceNavigation = useCallback((message: string) => {
        if (keyboardConfig.accessibilityAnnouncements.navigationInstructions) {
            console.log(`[Accessibility Navigation]: ${message}`);
            // This would integrate with actual accessibility announcement system
        }
    }, [keyboardConfig.accessibilityAnnouncements.navigationInstructions]);

    // Custom actions
    const addCustomAction = useCallback((key: string, action: () => void) => {
        setKeyboardConfig(prev => ({
            ...prev,
            switchControl: {
                ...prev.switchControl,
                customActions: {
                    ...prev.switchControl.customActions,
                    [key]: action,
                },
            },
        }));
    }, []);

    const updateConfig = useCallback((newConfig: Partial<KeyboardNavigationConfig>) => {
        setKeyboardConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const getFocusedElement = useCallback(() => {
        const { focusedElementId, focusableElements } = navigationState;
        return focusableElements.find((e: any) => e.id === focusedElementId) || null;
    }, [navigationState]);

    const getNavigationState = useCallback(() => navigationState, [navigationState]);

    const contextValue: KeyboardNavigationContextType = {
        config: keyboardConfig,
        updateConfig,
        registerFocusable,
        unregisterFocusable,
        moveFocus,
        focusElement,
        getFocusedElement,
        getNextFocusable,
        getPreviousFocusable,
        trapFocus,
        releaseFocusTrap,
        addCustomAction,
        getNavigationState,
        announceNavigation,
    };

    return (
        <KeyboardNavigationContext.Provider value={contextValue}>
            {children}
        </KeyboardNavigationContext.Provider>
    );
};

// Hook to use keyboard navigation context
export const useKeyboardNavigation = (): KeyboardNavigationContextType => {
    const context = useContext(KeyboardNavigationContext);
    if (context === undefined) {
        throw new Error('useKeyboardNavigation must be used within a KeyboardNavigationProvider');
    }
    return context;
};

// Focusable component wrapper
interface FocusableProps {
    id: string;
    children: ReactNode;
    tabIndex?: number;
    role?: string;
    label: string;
    description?: string;
    disabled?: boolean;
    groupId?: string;
    onActivate?: () => void;
    onEscape?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    skipToNext?: string;
    skipToPrevious?: string;
}

export const Focusable: React.FC<FocusableProps> = ({
    id,
    children,
    tabIndex = 0,
    role = 'button',
    label,
    description,
    disabled = false,
    groupId,
    onActivate,
    onEscape,
    onFocus,
    onBlur,
    skipToNext,
    skipToPrevious,
}) => {
    const { registerFocusable, unregisterFocusable, focusElement, getFocusedElement } = useKeyboardNavigation();
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const element: FocusableElement = {
            id,
            element: null,
            tabIndex,
            role,
            label,
            description,
            disabled,
            groupId,
            skipToNext,
            skipToPrevious,
            actions: {
                onActivate: onActivate || (() => { }),
                onEscape: onEscape || (() => { }),
            },
        };

        registerFocusable(element);

        return () => {
            unregisterFocusable(id);
        };
    }, [
        id,
        tabIndex,
        role,
        label,
        description,
        disabled,
        groupId,
        skipToNext,
        skipToPrevious,
        onActivate,
        onEscape,
        registerFocusable,
        unregisterFocusable,
    ]);

    const handlePress = useCallback(() => {
        if (disabled) return;

        focusElement(id);
        onActivate?.();
    }, [disabled, focusElement, id, onActivate]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onFocus?.();
    }, [onFocus]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        onBlur?.();
    }, [onBlur]);

    return (
        <TouchableOpacity
            ref={(ref) => {
                // Store reference for focus management
                const { focusableElements } = { focusableElements: [] };
                const element = focusableElements.find((e: any) => e.id === id);
                if (element && ref) {
                    element.element = ref;
                }
            }}
            accessibilityRole={role as any}
            accessibilityLabel={label}
            accessibilityHint={description}
            accessibilityState={{ disabled }}
            accessible={!disabled}
            onPress={handlePress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
                isFocused && {
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    borderColor: '#007BFF',
                },
                disabled && { opacity: 0.5 },
            ]}
        >
            {children}
        </TouchableOpacity>
    );
};

// Focus trap component for modals and dialogs
interface FocusTrapProps {
    children: ReactNode;
    trapId: string;
    onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, trapId, onEscape }) => {
    const { trapFocus, releaseFocusTrap } = useKeyboardNavigation();

    useEffect(() => {
        trapFocus(trapId);
        return () => {
            releaseFocusTrap();
        };
    }, [trapId, trapFocus, releaseFocusTrap]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onEscape?.();
                releaseFocusTrap();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onEscape, releaseFocusTrap]);

    return <>{children}</>;
};

// Error-specific focusable components
interface AccessibleErrorButtonProps {
    title: string;
    onPress: () => void;
    id: string;
    description?: string;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'destructive';
}

export const AccessibleErrorButton: React.FC<AccessibleErrorButtonProps> = ({
    title,
    onPress,
    id,
    description,
    disabled = false,
    variant = 'primary',
}) => {
    const getVariantStyles = () => {
        const baseStyles = {
            padding: 16,
            borderRadius: 8,
            minHeight: 44,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
        };

        const variantStyles = {
            primary: { backgroundColor: '#007AFF', color: '#FFFFFF' },
            secondary: { backgroundColor: '#E5E5E7', color: '#000000' },
            destructive: { backgroundColor: '#FF3B30', color: '#FFFFFF' },
        };

        return {
            ...baseStyles,
            ...variantStyles[variant],
            opacity: disabled ? 0.5 : 1,
        };
    };

    return (
        <Focusable
            id={id}
            label={title}
            description={description}
            disabled={disabled}
            onActivate={onPress}
        >
            <Text style={{ ...getVariantStyles(), color: getVariantStyles().color }}>
                {title}
            </Text>
        </Focusable>
    );
};

// Navigation instructions component
interface NavigationInstructionsProps {
    visible: boolean;
    onDismiss: () => void;
}

export const NavigationInstructions: React.FC<NavigationInstructionsProps> = ({
    visible,
    onDismiss,
}) => {
    const { announceNavigation } = useKeyboardNavigation();

    useEffect(() => {
        if (visible) {
            announceNavigation(
                'Use Tab to navigate between elements. Press Enter to activate. Press Escape to close dialogs.'
            );
        }
    }, [visible, announceNavigation]);

    if (!visible) return null;

    return (
        <View style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 16,
            borderRadius: 8,
        }}>
            <Text style={{ color: 'white', marginBottom: 8 }}>
                Keyboard Navigation:
            </Text>
            <Text style={{ color: 'white', fontSize: 14 }}>
                • Tab / Shift+Tab: Navigate between elements
            </Text>
            <Text style={{ color: 'white', fontSize: 14 }}>
                • Enter: Activate focused element
            </Text>
            <Text style={{ color: 'white', fontSize: 14 }}>
                • Escape: Close dialogs and menus
            </Text>
            <AccessibleErrorButton
                title="Got it"
                onPress={onDismiss}
                id="navigation-instructions-dismiss"
            />
        </View>
    );
};

export default KeyboardNavigationProvider;