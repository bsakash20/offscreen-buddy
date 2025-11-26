/**
 * Phone Interface Type Definitions
 * Comprehensive type system for all phone interface components
 */

import type { CallState } from './CallStateIndicator';

// Core Call Types
export type CallDirection = 'incoming' | 'outgoing';
export type CallStateType = 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'on_hold';
export type PlatformType = 'ios' | 'android' | 'web' | 'generic';
export type PlatformStyle = 'native' | 'custom';
export type AnimationType = 'pulse' | 'ring' | 'wave' | 'dots' | 'minimal';
export type AnimationIntensity = 'low' | 'medium' | 'high';

// Call Information
export interface CallInfo {
    id: string;
    callerId?: string;
    callerName: string;
    callerAvatar?: string;
    isVideoCall: boolean;
    direction: CallDirection;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
}

// Call State
export interface CallStateInfo {
    state: CallStateType;
    duration: number;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoOn: boolean;
    networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
    callStats?: CallStats;
}

// Call Statistics
export interface CallStats {
    duration: number;
    dataUsage?: number;
    networkQuality: NetworkQuality;
    audioLevels?: AudioLevels;
}

// Network Quality
export interface NetworkQuality {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    signal?: number;
    latency?: number;
    jitter?: number;
    packetLoss?: number;
}

// Audio Levels
export interface AudioLevels {
    input: number;
    output: number;
    microphone: number;
    speaker: number;
}

// User Interface
export interface UIState {
    isFullScreen: boolean;
    showControls: boolean;
    showKeypad: boolean;
    showAdditionalControls: boolean;
    showHoldMenu: boolean;
    theme: 'light' | 'dark' | 'auto';
    compact: boolean;
}

// Platform Configuration
export interface PlatformConfig {
    platform: PlatformType;
    style: PlatformStyle;
    features: PlatformFeatures;
    limitations: PlatformLimitations;
}

// Platform Features
export interface PlatformFeatures {
    hapticFeedback: boolean;
    soundEffects: boolean;
    notifications: boolean;
    fullScreen: boolean;
    audioFocus: boolean;
    callKit: boolean;
    telecomManager: boolean;
    webApis: boolean;
}

// Platform Limitations
export interface PlatformLimitations {
    noNativeCallKit: boolean;
    noNativeTelecom: boolean;
    noWebAudio: boolean;
    noNotifications: boolean;
    noHaptics: boolean;
}

// Call Controls
export interface CallControls {
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;
    onHold?: () => void;
    onTransfer?: () => void;
    onAddCall?: () => void;
    onKeypad?: () => void;
}

// Event Handlers
export interface CallEventHandlers {
    onCallStateChange?: (state: CallStateType) => void;
    onCallDurationUpdate?: (duration: number) => void;
    onError?: (error: Error) => void;
    onNetworkQualityChange?: (quality: NetworkQuality) => void;
    onAudioLevelChange?: (levels: AudioLevels) => void;
}

// Animation Configuration
export interface AnimationConfig {
    type: AnimationType;
    intensity: AnimationIntensity;
    color?: string;
    size?: number;
    enabled: boolean;
}

// Haptic Configuration
export interface HapticConfig {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'heavy';
    adaptiveIntensity: boolean;
    silentMode: boolean;
}

// Sound Configuration
export interface SoundConfig {
    enabled: boolean;
    volume: number;
    muted: boolean;
    quality: 'low' | 'medium' | 'high';
}

// Notification Configuration
export interface NotificationConfig {
    enabled: boolean;
    permission: NotificationPermission;
    priority: 'low' | 'normal' | 'high';
    sound: boolean;
    badge: boolean;
}

// Call Theme
export interface CallTheme {
    colors: {
        incoming: string;
        outgoing: string;
        declined: string;
        connected: string;
        background: string;
        text: string;
        textSecondary: string;
        cardBackground: string;
        buttonBackground: string;
        accent: string;
    };
    spacing: {
        small: number;
        medium: number;
        large: number;
    };
    typography: {
        small: number;
        medium: number;
        large: number;
    };
    borderRadius: {
        small: number;
        medium: number;
        large: number;
    };
}

// Component Props Base
export interface BaseComponentProps {
    style?: any;
    testID?: string;
    accessibilityLabel?: string;
}

// Phone Interface Props
export interface PhoneInterfaceProps extends BaseComponentProps {
    callInfo: CallInfo;
    callState: CallStateInfo;
    uiState: UIState;
    platformConfig: PlatformConfig;
    callControls: CallControls;
    eventHandlers: CallEventHandlers;
    animationConfig: AnimationConfig;
    hapticConfig: HapticConfig;
    soundConfig: SoundConfig;
    notificationConfig: NotificationConfig;
    theme?: CallTheme;
}

// iOS CallKit Props
export interface iOSCallKitProps extends BaseComponentProps {
    callerName: string;
    callerId?: string;
    isVideoCall: boolean;
    callState: CallStateType;
    platformStyle: PlatformStyle;
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;
    onCallStateChange?: (state: string) => void;
    onError?: (error: Error) => void;
}

// Android Telecom Props
export interface AndroidTelecomProps extends BaseComponentProps {
    callerName: string;
    callerId?: string;
    isVideoCall: boolean;
    callState: CallStateType;
    platformStyle: PlatformStyle;
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;
    onCallStateChange?: (state: string) => void;
    onError?: (error: Error) => void;
}

// Web Phone Props
export interface WebPhoneProps extends BaseComponentProps {
    callerName: string;
    callerId?: string;
    isVideoCall: boolean;
    callState: CallStateType;
    platformStyle: PlatformStyle;
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;
    onCallStateChange?: (state: string) => void;
    onError?: (error: Error) => void;
}

// Call State Indicator Props
export interface CallStateIndicatorProps extends BaseComponentProps {
    state: CallState;
    duration?: number;
    showDuration?: boolean;
    variant?: 'default' | 'minimal' | 'detailed';
}

// Call Screen Animations Props
export interface CallScreenAnimationsProps extends BaseComponentProps {
    isActive: boolean;
    animationType?: AnimationType;
    color?: string;
    size?: number;
    intensity?: AnimationIntensity;
}

// Call Interaction Handler Props
export interface CallInteractionHandlerProps extends BaseComponentProps {
    isIncoming: boolean;
    isOutgoing: boolean;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoOn: boolean;
    isVideoCall?: boolean;
    callState: CallState;
    onAnswer: () => void;
    onDecline: () => void;
    onEndCall: () => void;
    onToggleMute: (muted: boolean) => void;
    onToggleSpeaker: (speakerOn: boolean) => void;
    onToggleVideo: (videoOn: boolean) => void;
    onHold?: () => void;
    onTransfer?: () => void;
    onAddCall?: () => void;
    onKeypad?: () => void;
    variant?: PlatformType;
    showAdvancedControls?: boolean;
    compact?: boolean;
}

// Utility Types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error Types
export class CallInterfaceError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'CallInterfaceError';
    }
}

export class PlatformNotSupportedError extends CallInterfaceError {
    constructor(platform: PlatformType) {
        super(
            `Platform ${platform} is not supported`,
            'PLATFORM_NOT_SUPPORTED',
            { platform }
        );
        this.name = 'PlatformNotSupportedError';
    }
}

export class CallStateError extends CallInterfaceError {
    constructor(message: string, state: CallStateType) {
        super(message, 'INVALID_CALL_STATE', { state });
        this.name = 'CallStateError';
    }
}

// Constants
export const CALL_STATES: Record<CallStateType, CallStateType> = {
    ringing: 'ringing',
    connecting: 'connecting',
    connected: 'connected',
    ended: 'ended',
    missed: 'missed',
    on_hold: 'on_hold',
} as const;

export const PLATFORM_TYPES: Record<PlatformType, PlatformType> = {
    ios: 'ios',
    android: 'android',
    web: 'web',
    generic: 'generic',
} as const;

export const ANIMATION_TYPES: Record<AnimationType, AnimationType> = {
    pulse: 'pulse',
    ring: 'ring',
    wave: 'wave',
    dots: 'dots',
    minimal: 'minimal',
} as const;

export const NETWORK_QUALITY_LEVELS: NetworkQuality['level'][] = [
    'excellent',
    'good',
    'fair',
    'poor'
] as const;