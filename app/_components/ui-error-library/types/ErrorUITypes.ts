// Core type definitions for iOS Error UI Components Library
// Based on existing error handling architecture

// Re-export types from existing error framework  
// These types would typically come from the error handling framework
export interface CrossPlatformAppError {
    id: string;
    category: CrossPlatformErrorCategory;
    subcategory: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    userImpact: 'blocking' | 'disruptive' | 'minor' | 'none';
    timestamp: Date;
    message: string;
    userFriendlyMessage: string;
    platformContext: PlatformErrorContext;
    recoverable: boolean;
    retryable: boolean;
    code: string;
    nativeError?: any;
    reactNativeError?: any;
    paymentError?: PayUError;
}

export enum CrossPlatformErrorCategory {
    NETWORK = 'network',
    AUTHENTICATION = 'authentication',
    VALIDATION = 'validation',
    SYSTEM = 'system',
    PAYMENT = 'payment',
    STORAGE = 'storage',
    NAVIGATION = 'navigation',
    BUSINESS_LOGIC = 'business_logic',
    CRASH = 'crash',
    PERFORMANCE = 'performance'
}

export interface PlatformErrorContext {
    platform: 'ios' | 'android' | 'web';
    nativeError?: any;
    reactNativeError?: any;
    appState: 'active' | 'inactive' | 'background' | 'terminated';
    deviceInfo: PlatformDeviceInfo;
    userId?: string;
    sessionId: string;
    additionalContext: Record<string, any>;
}

export interface PlatformDeviceInfo {
    platform: string;
    osVersion: string;
    appVersion: string;
    deviceModel: string;
    screenSize: string;
    isTablet: boolean;
    networkType: 'wifi' | 'cellular' | 'offline';
    memoryPressure: 'normal' | 'warning' | 'critical';
}

export interface PayUError {
    provider: 'PayU';
    originalError: any;
    retryable: boolean;
}

// Toast notification types
export interface ToastConfig {
    id: string;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
    severity: 'low' | 'medium' | 'high' | 'critical';
    duration?: number; // Auto-dismiss duration in milliseconds
    persistent?: boolean; // If true, toast won't auto-dismiss
    position?: 'top' | 'center' | 'bottom';
    actions?: ToastAction[];
    haptic?: boolean;
    dismissible?: boolean; // If true, user can dismiss manually
    accessibility?: AccessibilityConfig;
    animation?: AnimationConfig;
}

export interface ToastAction {
    title: string;
    onPress: () => void;
    style?: 'default' | 'destructive';
    disabled?: boolean;
}

export interface ToastState {
    visible: boolean;
    queue: ToastConfig[];
    current?: ToastConfig;
    progress: number; // 0-1 for animation progress
}

// Alert dialog types
export interface AlertConfig {
    id: string;
    title: string;
    message: string;
    type: 'critical' | 'warning' | 'confirmation' | 'input_required';
    style: 'default' | 'sheet' | 'card';
    buttons: AlertButton[];
    defaultButton?: string;
    cancelButton?: string;
    destructiveButton?: string;
    maxWidth?: number;
    modal?: boolean;
    blurBackground?: boolean;
    haptic?: boolean;
    accessibility?: AccessibilityConfig;
    animation?: AnimationConfig;
}

export interface AlertButton {
    title: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
    disabled?: boolean;
    accessibilityLabel?: string;
    keyboardShortcut?: string; // For web accessibility
}

export interface AlertState {
    visible: boolean;
    currentAlert?: AlertConfig;
    queue: AlertConfig[];
}

// Error screen types
export interface ErrorScreenConfig {
    id?: string;
    type: 'network_offline' | 'server_error' | 'maintenance_mode' | 'empty_state' | 'recovery';
    title: string;
    message: string;
    emoji?: string;
    primaryAction?: ErrorScreenAction;
    secondaryAction?: ErrorScreenAction;
    illustration?: string;
    steps?: RecoveryStep[];
    autoRetry?: boolean;
    retryInterval?: number;
    maxRetries?: number;
    fullScreen?: boolean;
    backgroundColor?: string;
    illustrationStyle?: 'light' | 'dark' | 'auto';
    accessibility?: AccessibilityConfig;
}

export interface ErrorScreenAction {
    title: string;
    onPress: () => void;
    style?: 'primary' | 'secondary' | 'link';
    icon?: string;
    disabled?: boolean;
}

export interface RecoveryStep {
    id: string;
    title: string;
    description: string;
    completed?: boolean;
    action?: () => void;
}

// Inline error types
export interface InlineErrorConfig {
    id: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    type: 'field' | 'badge' | 'pill' | 'hint' | 'placeholder';
    fieldId?: string;
    dismissible?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
    actions?: InlineErrorAction[];
    styling?: InlineErrorStyling;
    accessibility?: AccessibilityConfig;
}

export interface InlineErrorAction {
    title: string;
    onPress: () => void;
    style?: 'link' | 'button';
    icon?: string;
}

export interface InlineErrorStyling {
    variant?: 'default' | 'subtle' | 'prominent';
    position?: 'below_field' | 'right_of_field' | 'inline';
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: number;
    padding?: number;
    margin?: number;
}

// Accessibility configuration
export interface AccessibilityConfig {
    label?: string;
    hint?: string;
    traits?: string[];
    identifier?: string;
    elementType?: 'static_text' | 'button' | 'alert' | 'image';
    supportsVoiceOver?: boolean;
    supportsDynamicType?: boolean;
    role?: 'alert' | 'alertdialog' | 'status' | 'button';
    liveRegion?: 'polite' | 'assertive' | 'off';
    announcements?: string[];
}

// Animation configuration
export interface AnimationConfig {
    duration?: number;
    easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    delay?: number;
    springConfig?: {
        damping?: number;
        mass?: number;
        stiffness?: number;
        velocity?: number;
    };
    reducedMotion?: {
        duration: number;
        easing: string;
    };
}

// Theme integration
export interface ErrorTheme {
    colors: ErrorThemeColors;
    typography: ErrorThemeTypography;
    spacing: ErrorThemeSpacing;
    borders: ErrorThemeBorders;
    shadows: ErrorThemeShadows;
    animations: ErrorThemeAnimations;
    ios?: ErrorThemeIOS;
    darkMode?: ErrorThemeDarkMode;
}

export interface ErrorThemeColors {
    error: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
        border: string;
        success: string;
        warning: string;
        info: string;
    };
    severity: {
        low: string;
        medium: string;
        high: string;
        critical: string;
    };
    ui: {
        background: string;
        surface: string;
        overlay: string;
        border: string;
        shadow: string;
        text: {
            primary: string;
            secondary: string;
            disabled: string;
        };
    };
}

export interface ErrorThemeTypography {
    fontFamily: string;
    sizes: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
    };
    weights: {
        regular: string;
        medium: string;
        semibold: string;
        bold: string;
    };
    lineHeights: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}

export interface ErrorThemeSpacing {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    component: {
        padding: number;
        margin: number;
        borderRadius: number;
    };
}

export interface ErrorThemeBorders {
    radius: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    width: {
        thin: number;
        normal: number;
        thick: number;
    };
}

export interface ErrorThemeShadows {
    small: {
        shadowColor: string;
        shadowOffset: { width: number; height: number };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    };
    medium: any;
    large: any;
}

export interface ErrorThemeAnimations {
    duration: {
        fast: number;
        normal: number;
        slow: number;
    };
    easing: {
        entrance: string;
        exit: string;
        interaction: string;
    };
}

export interface ErrorThemeIOS {
    hapticFeedback: {
        success: string;
        warning: string;
        error: string;
        light: string;
        medium: string;
        heavy: string;
    };
    blurEffects: {
        regular: string;
        prominent: string;
        ultraThin: string;
    };
    cornerRadius: {
        small: number;
        medium: number;
        large: number;
    };
}

export interface ErrorThemeDarkMode {
    isEnabled: boolean;
    autoAdapt: boolean;
    overrideColors?: Partial<ErrorThemeColors>;
}

// Component state types
export interface ComponentState {
    loading: boolean;
    error?: string;
    success?: boolean;
    disabled?: boolean;
    focused?: boolean;
    pressed?: boolean;
}

// PayU-specific error types
export interface PayUErrorConfig extends ErrorUIConfig {
    paymentContext: {
        amount: number;
        currency: string;
        transactionId?: string;
        gateway?: string;
    };
    paymentType: 'card' | 'wallet' | 'netbanking' | 'upi';
    canRetry: boolean;
    nextSteps?: string[];
}

// Cross-platform compatibility
export interface ErrorUIConfig {
    platform: 'ios' | 'android' | 'web';
    deviceInfo: PlatformDeviceInfo;
    userId?: string;
    sessionId: string;
    environment: 'development' | 'staging' | 'production';
    featureFlags?: Record<string, boolean>;
    userPreferences?: {
        reducedMotion: boolean;
        highContrast: boolean;
        largeText: boolean;
    };
}

// Component registry types
export interface ComponentRegistry {
    toasts: {
        manager: ToastManager;
        components: Map<string, React.ComponentType<ToastConfig>>;
    };
    alerts: {
        manager: AlertManager;
        components: Map<string, React.ComponentType<AlertConfig>>;
    };
    errorScreens: {
        manager: ErrorScreenManager;
        components: Map<string, React.ComponentType<ErrorScreenConfig>>;
    };
    inlineErrors: {
        manager: InlineErrorManager;
        components: Map<string, React.ComponentType<InlineErrorConfig>>;
    };
}

// Manager interfaces
export interface ToastManager {
    show: (config: ToastConfig) => string;
    hide: (id: string) => void;
    hideAll: () => void;
    getState: () => ToastState;
    update: (id: string, config: Partial<ToastConfig>) => void;
}

export interface AlertManager {
    show: (config: AlertConfig) => string;
    hide: (id: string) => void;
    hideAll: () => void;
    getState: () => AlertState;
    update: (id: string, config: Partial<AlertConfig>) => void;
}

export interface ErrorScreenManager {
    show: (config: ErrorScreenConfig) => string;
    hide: (id: string) => void;
    retry: (id: string) => void;
    getState: () => ErrorScreenState;
}

export interface InlineErrorManager {
    show: (config: InlineErrorConfig) => string;
    hide: (id: string) => void;
    clearField: (fieldId: string) => void;
    clearAll: () => void;
    getFieldErrors: (fieldId: string) => InlineErrorConfig[];
}

export interface ErrorScreenState {
    visible: boolean;
    currentScreen?: ErrorScreenConfig;
    retryCount: number;
    lastRetry?: Date;
    canRetry: boolean;
}

// Export utility types
export type ErrorUIPriority = 'low' | 'normal' | 'high' | 'critical';
export type ErrorUIVisibility = 'visible' | 'hidden' | 'transitioning';
export type ErrorUIInteraction = 'dismissible' | 'modal' | 'blocking' | 'non-interactive';

// React Native specific types
export interface ReactNativeErrorUIConfig extends ErrorUIConfig {
    style: any;
    testID?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}