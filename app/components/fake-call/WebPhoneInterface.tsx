/**
 * Web Phone Interface Component
 * Web-based phone interface with realistic styling and Web API integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    Platform,
    TouchableOpacity,
    Dimensions,
    Alert,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { hapticManager } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';
import { CallStateIndicator } from './CallStateIndicator';
import { CallScreenAnimations } from './CallScreenAnimations';

export interface WebPhoneInterfaceProps {
    callerName?: string;
    callerId?: string;
    isVideoCall?: boolean;
    callState?: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed';
    platformStyle?: 'native' | 'custom';

    // Call controls
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;

    // Event handlers
    onCallStateChange?: (state: string) => void;
    onError?: (error: Error) => void;

    // Style overrides
    style?: any;
}

// Web Phone Interface Colors
const WEB_PHONE_COLORS = {
    incoming: '#00C853', // Green
    outgoing: '#2962FF', // Blue
    declined: '#D50000', // Red
    connected: '#00B8D4', // Cyan
    background: '#1a1a1a', // Dark gray
    text: '#ffffff', // White
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    buttonBackground: 'rgba(255, 255, 255, 0.15)',
    accent: '#6366f1', // Indigo
};

export const WebPhoneInterface: React.FC<WebPhoneInterfaceProps> = ({
    callerName = 'Unknown Caller',
    callerId,
    isVideoCall = false,
    callState = 'ringing',
    platformStyle = 'native',
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    onCallStateChange,
    onError,
    style,
}) => {
    const { theme } = useTheme();

    // State
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');

    // Refs
    const callTimerRef = useRef<any>(null);
    const controlsTimerRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const notificationPermissionRef = useRef<NotificationPermission | null>(null);

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Initialize Web Phone interface
    useEffect(() => {
        if (Platform.OS === 'web') {
            initializeWebPhoneInterface();
        }

        return () => {
            cleanup();
        };
    }, []);

    // Handle call state changes
    useEffect(() => {
        onCallStateChange?.(callState);

        if (callState === 'connected') {
            startCallTimer();
            requestNotificationPermission();
        } else {
            stopCallTimer();
        }
    }, [callState, onCallStateChange]);

    // Initialize Web APIs
    const initializeWebPhoneInterface = useCallback(async () => {
        try {
            console.log('Initializing Web Phone interface');

            // Initialize Web Audio API
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                try {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                    console.log('Web Audio API initialized');
                } catch (audioError) {
                    console.warn('Web Audio API not available:', audioError);
                }
            }

            // Display call notification
            displayCallNotification();

        } catch (error) {
            console.error('Failed to initialize Web Phone interface:', error);
            onError?.(error as Error);
        }
    }, [callerName, callerId, callState]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                notificationPermissionRef.current = permission;
                console.log('Notification permission:', permission);
            } catch (error) {
                console.warn('Notification permission request failed:', error);
            }
        }
    }, []);

    // Display call notification
    const displayCallNotification = useCallback(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
            try {
                if (notificationPermissionRef.current === 'granted') {
                    new Notification(`Incoming call from ${callerName}`, {
                        body: isVideoCall ? 'Video call' : 'Phone call',
                        icon: '/favicon.ico',
                        tag: 'fake-call-notification',
                    });
                }
            } catch (error) {
                console.warn('Failed to display notification:', error);
            }
        }
    }, [callerName, isVideoCall]);

    // Start call duration timer
    const startCallTimer = useCallback(() => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
        }

        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    }, []);

    // Stop call duration timer
    const stopCallTimer = useCallback(() => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
        setCallDuration(0);
    }, []);

    // Start controls auto-hide timer
    const startControlsTimer = useCallback(() => {
        if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
        }

        if (callState === 'connected') {
            controlsTimerRef.current = setTimeout(() => {
                setShowControls(false);
            }, 5000);
        }
    }, [callState]);

    // Show controls temporarily
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        startControlsTimer();
    }, [startControlsTimer]);

    // Cleanup
    const cleanup = useCallback(() => {
        stopCallTimer();

        if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
        }

        // Cleanup audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    }, [stopCallTimer]);

    // Handle call answer
    const handleAnswer = useCallback(async () => {
        console.log('Web Phone: Answering call');

        try {
            // Resume audio context if suspended
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            hapticManager.triggerUIInteraction('medium');
            soundManager.playStatusSound('success');

            onAnswer?.();
        } catch (error) {
            console.error('Failed to answer call:', error);
            onError?.(error as Error);
        }
    }, [onAnswer, onError]);

    // Handle call decline
    const handleDecline = useCallback(() => {
        console.log('Web Phone: Declining call');

        hapticManager.triggerUIInteraction('heavy');
        soundManager.playStatusSound('warning');

        onDecline?.();
    }, [onDecline]);

    // Handle call end
    const handleEndCall = useCallback(() => {
        console.log('Web Phone: Ending call');

        hapticManager.triggerUIInteraction('heavy');
        soundManager.playStatusSound('warning');

        onEndCall?.();
        cleanup();
    }, [onEndCall, cleanup]);

    // Handle mute toggle
    const handleMuteToggle = useCallback(() => {
        const newMutedState = !isMuted;
        console.log('Web Phone: Toggling mute:', newMutedState);

        setIsMuted(newMutedState);
        hapticManager.triggerSettingChange('toggle');

        onToggleMute?.(newMutedState);
    }, [isMuted, onToggleMute]);

    // Handle speaker toggle
    const handleSpeakerToggle = useCallback(() => {
        const newSpeakerState = !isSpeakerEnabled;
        console.log('Web Phone: Toggling speaker:', newSpeakerState);

        setIsSpeakerEnabled(newSpeakerState);
        hapticManager.triggerSettingChange('toggle');

        onToggleSpeaker?.(newSpeakerState);
    }, [isSpeakerEnabled, onToggleSpeaker]);

    // Handle fullscreen toggle
    const handleFullscreenToggle = useCallback(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            try {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    setIsFullScreen(true);
                } else {
                    document.exitFullscreen();
                    setIsFullScreen(false);
                }
            } catch (error) {
                console.warn('Fullscreen toggle failed:', error);
            }
        }
    }, []);

    // Format call duration
    const formatDuration = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Get network quality indicator
    const getNetworkQualityIndicator = () => {
        const indicators = {
            good: '🟢',
            fair: '🟡',
            poor: '🔴',
        };
        return indicators[networkQuality];
    };

    // Render Web-style caller avatar
    const renderAvatar = () => {
        return (
            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>
                        {callerName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                {callState === 'connected' && (
                    <View style={styles.networkIndicator}>
                        <Text style={styles.networkText}>
                            {getNetworkQualityIndicator()}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    // Render caller information
    const renderCallerInfo = () => {
        return (
            <View style={styles.callerInfoContainer}>
                <Text style={styles.callerName}>{callerName}</Text>
                <Text style={styles.callType}>
                    {isVideoCall ? 'Video Call' : 'Phone Call'} • {callState === 'connected' ? formatDuration(callDuration) : 'Calling...'}
                </Text>
                {callState === 'connected' && (
                    <View style={styles.callStats}>
                        <Text style={styles.callStatsText}>
                            Quality: {networkQuality} • {isSpeakerEnabled ? 'Speaker' : 'Earpiece'}
                        </Text>
                    </View>
                )}
                <CallStateIndicator
                    state={callState}
                    showDuration={callState === 'connected'}
                    variant="minimal"
                    style={styles.callStateIndicator}
                />
            </View>
        );
    };

    // Render incoming call controls
    const renderIncomingControls = () => {
        if (callState !== 'ringing') return null;

        return (
            <View style={styles.incomingControlsContainer}>
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={handleDecline}
                    activeOpacity={0.8}
                >
                    <Text style={styles.declineIcon}>📞</Text>
                    <Text style={styles.controlLabel}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.answerButton}
                    onPress={handleAnswer}
                    activeOpacity={0.8}
                >
                    <Text style={styles.answerIcon}>✅</Text>
                    <Text style={styles.controlLabel}>Answer</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render active call controls
    const renderActiveCallControls = () => {
        if (callState !== 'connected' || !showControls) return null;

        return (
            <View style={styles.activeControlsContainer}>
                {/* Top controls */}
                <View style={styles.topControls}>
                    <TouchableOpacity
                        style={styles.topControlButton}
                        onPress={handleFullscreenToggle}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.topControlIcon}>
                            {isFullScreen ? '🗗' : '🗖'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Main controls */}
                <View style={styles.mainControlsRow}>
                    <TouchableOpacity
                        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                        onPress={handleMuteToggle}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.controlIcon}>
                            {isMuted ? '🔇' : '🎤'}
                        </Text>
                        <Text style={styles.controlLabel}>
                            {isMuted ? 'Muted' : 'Mute'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.endCallButton}
                        onPress={handleEndCall}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.endCallIcon}>📞</Text>
                        <Text style={styles.endCallLabel}>End</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonActive]}
                        onPress={handleSpeakerToggle}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.controlIcon}>
                            {isSpeakerEnabled ? '🔊' : '📢'}
                        </Text>
                        <Text style={styles.controlLabel}>
                            {isSpeakerEnabled ? 'Speaker' : 'Speaker'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom controls */}
                <View style={styles.bottomControls}>
                    <TouchableOpacity
                        style={styles.bottomControlButton}
                        onPress={() => {/* Handle settings */ }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.bottomControlIcon}>⚙️</Text>
                    </TouchableOpacity>

                    {isVideoCall && (
                        <TouchableOpacity
                            style={styles.bottomControlButton}
                            onPress={() => onToggleVideo?.(!isVideoCall)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.bottomControlIcon}>📹</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.bottomControlButton}
                        onPress={() => {/* Handle hold */ }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.bottomControlIcon}>⏸️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Handle screen tap to show controls
    const handleScreenTap = () => {
        if (callState === 'connected' && !showControls) {
            showControlsTemporarily();
        }
    };

    // Main render
    return (
        <View
            style={[styles.container, style]}
            onTouchStart={handleScreenTap}
        >
            {/* Background pattern */}
            <View style={styles.backgroundPattern}>
                <CallScreenAnimations
                    isActive={callState === 'ringing' || callState === 'connecting'}
                    animationType="wave"
                    color={WEB_PHONE_COLORS.incoming}
                    intensity="medium"
                    style={styles.backgroundAnimations}
                />
            </View>

            {/* Caller avatar */}
            {renderAvatar()}

            {/* Caller information */}
            {renderCallerInfo()}

            {/* Call controls */}
            {renderIncomingControls()}
            {renderActiveCallControls()}

            {/* Controls hint */}
            {callState === 'connected' && !showControls && (
                <View style={styles.controlsHint}>
                    <Text style={styles.controlsHintText}>Tap to show controls</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WEB_PHONE_COLORS.background,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 100,
        paddingBottom: 50,
    },

    backgroundPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
    },

    backgroundAnimations: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -20,
    },

    avatarContainer: {
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: WEB_PHONE_COLORS.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: WEB_PHONE_COLORS.incoming,
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: '600',
        color: WEB_PHONE_COLORS.text,
    },
    networkIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: WEB_PHONE_COLORS.accent,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    networkText: {
        fontSize: 12,
    },

    callerInfoContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    callerName: {
        fontSize: 28,
        fontWeight: '700',
        color: WEB_PHONE_COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    callType: {
        fontSize: 16,
        color: WEB_PHONE_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    callStats: {
        marginBottom: 12,
    },
    callStatsText: {
        fontSize: 12,
        color: WEB_PHONE_COLORS.textSecondary,
        textAlign: 'center',
    },
    callStateIndicator: {
        marginTop: 8,
    },

    incomingControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 40,
    },
    declineButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: WEB_PHONE_COLORS.declined,
        shadowColor: WEB_PHONE_COLORS.declined,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    answerButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: WEB_PHONE_COLORS.incoming,
        shadowColor: WEB_PHONE_COLORS.incoming,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    declineIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    answerIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    controlLabel: {
        color: WEB_PHONE_COLORS.text,
        fontSize: 12,
        fontWeight: '600',
    },

    activeControlsContainer: {
        alignItems: 'center',
        width: '100%',
    },
    topControls: {
        width: '100%',
        alignItems: 'flex-end',
        paddingRight: 20,
        marginBottom: 40,
    },
    topControlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: WEB_PHONE_COLORS.buttonBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topControlIcon: {
        fontSize: 16,
        color: WEB_PHONE_COLORS.text,
    },

    mainControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 40,
        marginBottom: 40,
    },
    controlButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: WEB_PHONE_COLORS.buttonBackground,
    },
    controlButtonActive: {
        backgroundColor: WEB_PHONE_COLORS.accent,
    },
    controlIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    endCallButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: WEB_PHONE_COLORS.declined,
        shadowColor: WEB_PHONE_COLORS.declined,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    endCallIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    endCallLabel: {
        color: WEB_PHONE_COLORS.text,
        fontSize: 12,
        fontWeight: '600',
    },

    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    bottomControlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: WEB_PHONE_COLORS.buttonBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomControlIcon: {
        fontSize: 18,
        color: WEB_PHONE_COLORS.text,
    },

    controlsHint: {
        position: 'absolute',
        bottom: 100,
        left: '50%',
        marginLeft: -75,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    controlsHintText: {
        color: WEB_PHONE_COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
});

export default WebPhoneInterface;