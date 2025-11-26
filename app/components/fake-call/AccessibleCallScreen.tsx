/**
 * Accessible Call Screen
 * WCAG 2.1 AA compliant call interface with comprehensive accessibility features
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo, Alert } from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { useFakeCallAccessibility } from '../../services/fake-call/accessibility/FakeCallAccessibilityProvider';
import { FakeCallAccessibilityWrapper } from '../../services/fake-call/accessibility/FakeCallAccessibilityProvider';
import Button from '../../design-system/components/Button';
import Card from '../../design-system/components/Card';

// Call screen states and props
export interface AccessibleCallScreenProps {
    // Call information
    callerName: string;
    callerId?: string;
    callerAvatar?: string;
    isVideoCall?: boolean;

    // Call state
    callState: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'on_hold';
    callDuration?: number;
    isMuted?: boolean;
    isSpeakerOn?: boolean;
    isVideoOn?: boolean;

    // Call controls
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;
    onHold?: () => void;

    // Accessibility settings
    accessibilitySettings?: {
        screenReaderMode?: boolean;
        highContrastMode?: boolean;
        largeTextMode?: boolean;
        voiceControlMode?: boolean;
        simplifiedInterface?: boolean;
    };

    // Theme and styling
    theme?: any;
    style?: any;

    // Event handlers
    onCallStateChange?: (state: string) => void;
    onAccessibilityEvent?: (event: string) => void;
}

export const AccessibleCallScreen: React.FC<AccessibleCallScreenProps> = ({
    callerName,
    callerId,
    callerAvatar,
    isVideoCall = false,
    callState,
    callDuration = 0,
    isMuted = false,
    isSpeakerOn = false,
    isVideoOn = false,
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    onHold,
    accessibilitySettings,
    theme: customTheme,
    style,
    onCallStateChange,
    onAccessibilityEvent,
}) => {
    // Hooks
    const { theme } = useTheme();
    const accessibility = useFakeCallAccessibility();

    // Local state
    const [currentFocus, setCurrentFocus] = useState<string>('answer_button');
    const [announcementQueue, setAnnouncementQueue] = useState<string[]>([]);
    const [shouldAnnounceState, setShouldAnnounceState] = useState(true);

    // Refs
    const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Accessibility modes
    const isScreenReaderActive = accessibility.state.screenReaderActive;
    const isHighContrastMode = accessibility.state.highContrastActive;
    const isLargeTextMode = accessibility.state.largeTextActive;
    const isVoiceControlActive = accessibility.state.voiceControlActive;
    const isSimplifiedMode = accessibility.config.cognitiveAccessibility.simplifiedInterface;

    // Format call duration
    const formatCallDuration = useCallback((duration: number): string => {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Get call state announcement
    const getCallStateAnnouncement = useCallback((state: string, duration?: number): string => {
        const announcements = {
            'ringing': `${callerName} is calling. Say "answer call" to answer or "decline call" to decline.`,
            'connecting': 'Connecting call. Please wait.',
            'connected': `Call connected with ${callerName}. Duration: ${formatCallDuration(duration || 0)}.`,
            'ended': 'Call ended.',
            'missed': `Missed call from ${callerName}.`,
            'on_hold': 'Call is on hold.',
        };

        return announcements[state as keyof typeof announcements] || `Call state: ${state}`;
    }, [callerName, formatCallDuration]);

    // Get control accessibility labels
    const getControlLabels = useCallback(() => {
        const baseLabels = {
            answer: isScreenReaderActive ? 'Answer incoming call. Double-tap to answer.' : 'Answer',
            decline: isScreenReaderActive ? 'Decline incoming call. Double-tap to decline.' : 'Decline',
            endCall: isScreenReaderActive ? 'End current call. Double-tap to hang up.' : 'End Call',
            mute: isMuted ? 'Unmute microphone. Double-tap to unmute.' : 'Mute microphone. Double-tap to mute.',
            speaker: isSpeakerOn ? 'Turn off speaker. Double-tap to turn off speaker.' : 'Turn on speaker. Double-tap to turn on speaker.',
            video: isVideoOn ? 'Turn off video. Double-tap to turn off video.' : 'Turn on video. Double-tap to turn on video.',
            hold: 'Hold call. Double-tap to put call on hold.',
        };

        return baseLabels;
    }, [isScreenReaderActive, isMuted, isSpeakerOn, isVideoOn]);

    // Announce state changes
    useEffect(() => {
        if (shouldAnnounceState && isScreenReaderActive) {
            const announcement = getCallStateAnnouncement(callState, callDuration);
            accessibility.announceCallState(callState, callDuration);

            setAnnouncementQueue(prev => [...prev, announcement]);
            setShouldAnnounceState(false);

            onAccessibilityEvent?.('state_announced');

            // Reset after a delay to allow for state changes
            setTimeout(() => setShouldAnnounceState(true), 1000);
        }
    }, [callState, callDuration, isScreenReaderActive, accessibility, getCallStateAnnouncement, onAccessibilityEvent, shouldAnnounceState]);

    // Voice command registration
    useEffect(() => {
        if (isVoiceControlActive) {
            // Register voice commands
            if (onAnswer) accessibility.registerVoiceCommand('answer call', onAnswer);
            if (onDecline) accessibility.registerVoiceCommand('decline call', onDecline);
            if (onEndCall) accessibility.registerVoiceCommand('end call', onEndCall);
            if (onToggleMute) accessibility.registerVoiceCommand('mute call', () => onToggleMute(!isMuted));
            if (onToggleSpeaker) accessibility.registerVoiceCommand('speaker on', () => onToggleSpeaker(true));
            if (onToggleSpeaker) accessibility.registerVoiceCommand('speaker off', () => onToggleSpeaker(false));
        }
    }, [isVoiceControlActive, accessibility, onAnswer, onDecline, onEndCall, onToggleMute, onToggleSpeaker, isMuted]);

    // Call event handlers with accessibility announcements
    const handleAnswer = useCallback(() => {
        accessibility.announceCallAction('Answering call', 'pending');
        onAnswer?.();
        accessibility.announceCallAction('Answering call', 'success');
        onAccessibilityEvent?.('call_answered');
    }, [accessibility, onAnswer, onAccessibilityEvent]);

    const handleDecline = useCallback(() => {
        accessibility.announceCallAction('Declining call', 'pending');
        onDecline?.();
        accessibility.announceCallAction('Declining call', 'success');
        onAccessibilityEvent?.('call_declined');
    }, [accessibility, onDecline, onAccessibilityEvent]);

    const handleEndCall = useCallback(() => {
        accessibility.announceCallAction('Ending call', 'pending');
        onEndCall?.();
        accessibility.announceCallAction('Ending call', 'success');
        onAccessibilityEvent?.('call_ended');
    }, [accessibility, onEndCall, onAccessibilityEvent]);

    const handleToggleMute = useCallback(() => {
        const newMutedState = !isMuted;
        accessibility.announceCallAction(newMutedState ? 'Muting call' : 'Unmuting call', 'success');
        onToggleMute?.(newMutedState);
        onAccessibilityEvent?.('mute_toggled');
    }, [accessibility, isMuted, onToggleMute, onAccessibilityEvent]);

    const handleToggleSpeaker = useCallback(() => {
        const newSpeakerState = !isSpeakerOn;
        accessibility.announceCallAction(newSpeakerState ? 'Turning on speaker' : 'Turning off speaker', 'success');
        onToggleSpeaker?.(newSpeakerState);
        onAccessibilityEvent?.('speaker_toggled');
    }, [accessibility, isSpeakerOn, onToggleSpeaker, onAccessibilityEvent]);

    const handleToggleVideo = useCallback(() => {
        const newVideoState = !isVideoOn;
        accessibility.announceCallAction(newVideoState ? 'Turning on video' : 'Turning off video', 'success');
        onToggleVideo?.(newVideoState);
        onAccessibilityEvent?.('video_toggled');
    }, [accessibility, isVideoOn, onToggleVideo, onAccessibilityEvent]);

    // Get theme colors based on accessibility mode
    const getThemeColors = useCallback(() => {
        if (isHighContrastMode) {
            return accessibility.getHighContrastColors();
        }

        return {
            primary: theme.colors.primary,
            secondary: theme.colors.secondary,
            background: theme.colors.system.background.primary,
            surface: theme.colors.system.background.secondary,
            text: theme.colors.text.primary,
            textSecondary: theme.colors.text.secondary,
            border: theme.colors.border.primary,
            success: theme.colors.success,
            error: theme.colors.error,
            warning: theme.colors.warning,
        };
    }, [isHighContrastMode, accessibility, theme]);

    const colors = getThemeColors();

    // Calculate font sizes based on accessibility settings
    const getFontSize = useCallback((baseSize: number): number => {
        if (isLargeTextMode) {
            return accessibility.getScalableFontSize(baseSize + 4);
        }
        return accessibility.getScalableFontSize(baseSize);
    }, [isLargeTextMode, accessibility]);

    // Calculate touch target size
    const getTouchTargetSize = useCallback((): number => {
        return accessibility.getAccessibilityTouchTarget();
    }, [accessibility]);

    // Render caller information
    const renderCallerInfo = () => (
        <View style={styles.callerInfo} accessibilityLabel={`Call with ${callerName}`}>
            {callerAvatar ? (
                <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
                    {/* Avatar image would go here */}
                </View>
            ) : (
                <View style={[styles.avatarPlaceholder, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border
                }]}>
                    <Text style={[styles.avatarText, { color: colors.textSecondary, fontSize: getFontSize(32) }]}>
                        👤
                    </Text>
                </View>
            )}

            <Text style={[styles.callerName, { color: colors.text, fontSize: getFontSize(24) }]}>
                {callerName}
            </Text>

            {callState === 'connected' && callDuration > 0 && (
                <Text style={[styles.callDuration, { color: colors.textSecondary, fontSize: getFontSize(16) }]}>
                    {formatCallDuration(callDuration)}
                </Text>
            )}

            <Text style={[styles.callState, { color: colors.textSecondary, fontSize: getFontSize(14) }]}>
                {callState === 'ringing' ? 'Incoming call' :
                    callState === 'connecting' ? 'Connecting...' :
                        callState === 'connected' ? 'Connected' :
                            callState === 'ended' ? 'Call ended' :
                                callState === 'missed' ? 'Missed call' :
                                    callState === 'on_hold' ? 'On hold' : callState}
            </Text>
        </View>
    );

    // Render incoming call controls
    const renderIncomingCallControls = () => (
        <View style={styles.callControls} accessibilityLabel="Incoming call controls">
            <FakeCallAccessibilityWrapper accessibilityRole="button" accessibilityLabel={getControlLabels().decline}>
                <TouchableOpacity
                    style={[styles.declineButton, {
                        backgroundColor: colors.error,
                        minHeight: getTouchTargetSize(),
                        minWidth: getTouchTargetSize(),
                    }]}
                    onPress={handleDecline}
                    accessibilityRole="button"
                    accessibilityLabel={getControlLabels().decline}
                    accessibilityHint={isScreenReaderActive ? 'Reject the incoming call' : undefined}
                >
                    <Text style={[styles.buttonText, { color: '#FFFFFF', fontSize: getFontSize(16) }]}>
                        Decline
                    </Text>
                </TouchableOpacity>
            </FakeCallAccessibilityWrapper>

            <FakeCallAccessibilityWrapper accessibilityRole="button" accessibilityLabel={getControlLabels().answer}>
                <TouchableOpacity
                    style={[styles.answerButton, {
                        backgroundColor: colors.success,
                        minHeight: getTouchTargetSize(),
                        minWidth: getTouchTargetSize(),
                    }]}
                    onPress={handleAnswer}
                    accessibilityRole="button"
                    accessibilityLabel={getControlLabels().answer}
                    accessibilityHint={isScreenReaderActive ? 'Accept the incoming call' : undefined}
                >
                    <Text style={[styles.buttonText, { color: '#FFFFFF', fontSize: getFontSize(16) }]}>
                        Answer
                    </Text>
                </TouchableOpacity>
            </FakeCallAccessibilityWrapper>
        </View>
    );

    // Render active call controls
    const renderActiveCallControls = () => (
        <View style={styles.activeCallControls} accessibilityLabel="Active call controls">
            {/* Mute button */}
            <TouchableOpacity
                style={[styles.controlButton, {
                    backgroundColor: isMuted ? colors.error : colors.surface,
                    borderColor: colors.border,
                    minHeight: getTouchTargetSize(),
                    minWidth: getTouchTargetSize(),
                }]}
                onPress={handleToggleMute}
                accessibilityRole="button"
                accessibilityLabel={getControlLabels().mute}
                accessibilityState={{ pressed: isMuted }}
            >
                <Text style={[styles.controlButtonText, { color: isMuted ? '#FFFFFF' : colors.text, fontSize: getFontSize(14) }]}>
                    {isMuted ? '🔇' : '🎤'}
                </Text>
                <Text style={[styles.controlButtonLabel, { color: isMuted ? '#FFFFFF' : colors.text, fontSize: getFontSize(12) }]}>
                    {isMuted ? 'Unmute' : 'Mute'}
                </Text>
            </TouchableOpacity>

            {/* Speaker button */}
            <TouchableOpacity
                style={[styles.controlButton, {
                    backgroundColor: isSpeakerOn ? colors.primary : colors.surface,
                    borderColor: colors.border,
                    minHeight: getTouchTargetSize(),
                    minWidth: getTouchTargetSize(),
                }]}
                onPress={handleToggleSpeaker}
                accessibilityRole="button"
                accessibilityLabel={getControlLabels().speaker}
                accessibilityState={{ pressed: isSpeakerOn }}
            >
                <Text style={[styles.controlButtonText, { color: isSpeakerOn ? '#FFFFFF' : colors.text, fontSize: getFontSize(14) }]}>
                    {isSpeakerOn ? '🔊' : '🔈'}
                </Text>
                <Text style={[styles.controlButtonLabel, { color: isSpeakerOn ? '#FFFFFF' : colors.text, fontSize: getFontSize(12) }]}>
                    Speaker
                </Text>
            </TouchableOpacity>

            {/* Video button (if video call) */}
            {isVideoCall && (
                <TouchableOpacity
                    style={[styles.controlButton, {
                        backgroundColor: isVideoOn ? colors.primary : colors.surface,
                        borderColor: colors.border,
                        minHeight: getTouchTargetSize(),
                        minWidth: getTouchTargetSize(),
                    }]}
                    onPress={handleToggleVideo}
                    accessibilityRole="button"
                    accessibilityLabel={getControlLabels().video}
                    accessibilityState={{ pressed: isVideoOn }}
                >
                    <Text style={[styles.controlButtonText, { color: isVideoOn ? '#FFFFFF' : colors.text, fontSize: getFontSize(14) }]}>
                        {isVideoOn ? '📹' : '📷'}
                    </Text>
                    <Text style={[styles.controlButtonLabel, { color: isVideoOn ? '#FFFFFF' : colors.text, fontSize: getFontSize(12) }]}>
                        Video
                    </Text>
                </TouchableOpacity>
            )}

            {/* End call button */}
            <TouchableOpacity
                style={[styles.endCallButton, {
                    backgroundColor: colors.error,
                    minHeight: getTouchTargetSize(),
                    minWidth: getTouchTargetSize(),
                }]}
                onPress={handleEndCall}
                accessibilityRole="button"
                accessibilityLabel={getControlLabels().endCall}
            >
                <Text style={[styles.controlButtonText, { color: '#FFFFFF', fontSize: getFontSize(14) }]}>
                    📞
                </Text>
                <Text style={[styles.controlButtonLabel, { color: '#FFFFFF', fontSize: getFontSize(12) }]}>
                    End Call
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: colors.background,
                padding: isLargeTextMode ? 24 : 16,
            },
            style
        ]}>
            {/* Main caller info */}
            {renderCallerInfo()}

            {/* Call controls based on state */}
            {callState === 'ringing' && renderIncomingCallControls()}
            {(callState === 'connected' || callState === 'on_hold') && renderActiveCallControls()}

            {/* Voice control instructions */}
            {isVoiceControlActive && (
                <View style={styles.voiceControlInfo} accessibilityLabel="Voice control instructions">
                    <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: getFontSize(12) }]}>
                        Voice commands available: {accessibility.getAvailableCommands().join(', ')}
                    </Text>
                </View>
            )}

            {/* Accessibility status indicator */}
            {(isScreenReaderActive || isHighContrastMode || isLargeTextMode) && (
                <View style={styles.accessibilityStatus} accessibilityLabel="Accessibility features active">
                    <Text style={[styles.statusText, { color: colors.success, fontSize: getFontSize(10) }]}>
                        Accessibility mode active
                    </Text>
                </View>
            )}
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },
    callerInfo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 24,
        borderWidth: 2,
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    avatarText: {
        fontSize: 48,
    },
    callerName: {
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    callDuration: {
        textAlign: 'center',
        marginBottom: 4,
    },
    callState: {
        textAlign: 'center',
        textTransform: 'capitalize',
    },
    callControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    answerButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    declineButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    activeCallControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
        paddingHorizontal: 20,
        flexWrap: 'wrap',
    },
    controlButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 12,
        minWidth: 80,
    },
    controlButtonText: {
        marginBottom: 4,
    },
    controlButtonLabel: {
        textAlign: 'center',
        fontWeight: '500',
    },
    endCallButton: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    buttonText: {
        fontWeight: '600',
        textAlign: 'center',
    },
    voiceControlInfo: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    infoText: {
        textAlign: 'center',
        fontStyle: 'italic',
    },
    accessibilityStatus: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default AccessibleCallScreen;