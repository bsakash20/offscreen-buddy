/**
 * Android Telecom Integration Component
 * Android TelecomManager integration for authentic call experiences
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    Platform,
    Alert,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { hapticManager } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';
import { CallStateIndicator } from './CallStateIndicator';
import { CallScreenAnimations } from './CallScreenAnimations';

export interface AndroidTelecomIntegrationProps {
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

// Android Telecom Colors
const ANDROID_TELECOM_COLORS = {
    incoming: '#4CAF50', // Material Green
    outgoing: '#2196F3', // Material Blue
    declined: '#F44336', // Material Red
    connected: '#00BCD4', // Material Cyan
    background: '#000000', // Black
    text: '#FFFFFF', // White
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    cardBackground: 'rgba(33, 33, 33, 0.95)',
    buttonBackground: 'rgba(66, 66, 66, 0.8)',
    rippleColor: 'rgba(255, 255, 255, 0.2)',
};

export const AndroidTelecomIntegration: React.FC<AndroidTelecomIntegrationProps> = ({
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
    const [showKeypad, setShowKeypad] = useState(false);
    const [showHoldMenu, setShowHoldMenu] = useState(false);

    // Refs
    const callTimerRef = useRef<any>(null);

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Initialize Android Telecom integration
    useEffect(() => {
        if (Platform.OS === 'android') {
            initializeAndroidTelecom();
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
        } else {
            stopCallTimer();
        }
    }, [callState, onCallStateChange]);

    // Initialize Android Telecom (simulated)
    const initializeAndroidTelecom = useCallback(async () => {
        try {
            console.log('Initializing Android Telecom integration');

            // In a real implementation, this would interact with Android TelecomManager
            displayTelecomCall();

        } catch (error) {
            console.error('Failed to initialize Android Telecom:', error);
            onError?.(error as Error);
        }
    }, [callerName, callerId, isVideoCall, callState]);

    // Simulate Telecom call display
    const displayTelecomCall = useCallback(() => {
        console.log(`Displaying Telecom call: ${callerName} (${callerId})`);

        if (callState === 'ringing') {
            soundManager.playNotificationSound('gentle');
        }
    }, [callerName, callerId, callState]);

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

    // Cleanup
    const cleanup = useCallback(() => {
        stopCallTimer();
    }, [stopCallTimer]);

    // Handle call answer
    const handleAnswer = useCallback(() => {
        console.log('Android Telecom: Answering call');

        hapticManager.triggerUIInteraction('medium');
        soundManager.playStatusSound('success');

        // Update native Android Telecom
        // In real implementation: telecomManager.answerCall();

        onAnswer?.();
    }, [onAnswer]);

    // Handle call decline
    const handleDecline = useCallback(() => {
        console.log('Android Telecom: Declining call');

        hapticManager.triggerUIInteraction('heavy');
        soundManager.playStatusSound('warning');

        // Update native Android Telecom
        // In real implementation: telecomManager.rejectCall();

        onDecline?.();
    }, [onDecline]);

    // Handle call end
    const handleEndCall = useCallback(() => {
        console.log('Android Telecom: Ending call');

        hapticManager.triggerUIInteraction('heavy');
        soundManager.playStatusSound('warning');

        // Update native Android Telecom
        // In real implementation: telecomManager.endCall();

        onEndCall?.();
        cleanup();
    }, [onEndCall, cleanup]);

    // Handle mute toggle
    const handleMuteToggle = useCallback(() => {
        const newMutedState = !isMuted;
        console.log('Android Telecom: Toggling mute:', newMutedState);

        setIsMuted(newMutedState);
        hapticManager.triggerSettingChange('toggle');

        // Update native Android Telecom
        // In real implementation: telecomManager.setMuted(newMutedState);

        onToggleMute?.(newMutedState);
    }, [isMuted, onToggleMute]);

    // Handle speaker toggle
    const handleSpeakerToggle = useCallback(() => {
        const newSpeakerState = !isSpeakerEnabled;
        console.log('Android Telecom: Toggling speaker:', newSpeakerState);

        setIsSpeakerEnabled(newSpeakerState);
        hapticManager.triggerSettingChange('toggle');

        // Update native Android Telecom
        // In real implementation: telecomManager.setSpeakerphoneOn(newSpeakerState);

        onToggleSpeaker?.(newSpeakerState);
    }, [isSpeakerEnabled, onToggleSpeaker]);

    // Handle hold
    const handleHold = useCallback(() => {
        console.log('Android Telecom: Holding call');

        hapticManager.triggerSettingChange('toggle');

        // In real implementation: telecomManager.setMuted(true);
        // Also would show hold notification

        // Simulate hold by showing menu
        setShowHoldMenu(!showHoldMenu);
    }, [showHoldMenu]);

    // Format call duration
    const formatDuration = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Render Android-style caller avatar
    const renderAvatar = () => {
        return (
            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>
                        {callerName.charAt(0).toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    // Render caller information with Android styling
    const renderCallerInfo = () => {
        return (
            <View style={styles.callerInfoContainer}>
                <Text style={styles.callerName}>{callerName}</Text>
                <Text style={styles.callType}>
                    {isVideoCall ? 'Video Call' : 'Phone Call'} • {callState === 'connected' ? formatDuration(callDuration) : 'Calling...'}
                </Text>
                <CallStateIndicator
                    state={callState}
                    showDuration={callState === 'connected'}
                    variant="minimal"
                    style={styles.callStateIndicator}
                />
            </View>
        );
    };

    // Render incoming call controls (Android Material Design)
    const renderIncomingControls = () => {
        if (callState !== 'ringing') return null;

        return (
            <View style={styles.incomingControlsContainer}>
                {/* Message button */}
                <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => {/* Handle message */ }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.messageIcon}>💬</Text>
                    <Text style={styles.controlLabel}>Message</Text>
                </TouchableOpacity>

                {/* Decline button */}
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={handleDecline}
                    activeOpacity={0.7}
                >
                    <Text style={styles.declineIcon}>📞</Text>
                    <Text style={styles.controlLabel}>Decline</Text>
                </TouchableOpacity>

                {/* Answer button */}
                <TouchableOpacity
                    style={styles.answerButton}
                    onPress={handleAnswer}
                    activeOpacity={0.7}
                >
                    <Text style={styles.answerIcon}>✅</Text>
                    <Text style={styles.controlLabel}>Answer</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render active call controls (Android Material Design)
    const renderActiveCallControls = () => {
        if (callState !== 'connected') return null;

        return (
            <View style={styles.activeControlsContainer}>
                {/* Main controls row */}
                <View style={styles.mainControlsRow}>
                    {/* Mute button */}
                    <TouchableOpacity
                        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                        onPress={handleMuteToggle}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.controlIcon}>
                            {isMuted ? '🔇' : '🎤'}
                        </Text>
                        <Text style={styles.controlLabel}>
                            {isMuted ? 'Muted' : 'Mute'}
                        </Text>
                    </TouchableOpacity>

                    {/* Keypad button */}
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setShowKeypad(!showKeypad)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.controlIcon}>🔢</Text>
                        <Text style={styles.controlLabel}>Keypad</Text>
                    </TouchableOpacity>

                    {/* Hold button */}
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleHold}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.controlIcon}>⏸️</Text>
                        <Text style={styles.controlLabel}>Hold</Text>
                    </TouchableOpacity>
                </View>

                {/* End call button */}
                <TouchableOpacity
                    style={styles.endCallButton}
                    onPress={handleEndCall}
                    activeOpacity={0.7}
                >
                    <Text style={styles.endCallIcon}>📞</Text>
                    <Text style={styles.endCallLabel}>End Call</Text>
                </TouchableOpacity>

                {/* Bottom controls row */}
                <View style={styles.bottomControlsRow}>
                    {/* Speaker button */}
                    <TouchableOpacity
                        style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonActive]}
                        onPress={handleSpeakerToggle}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.controlIcon}>
                            {isSpeakerEnabled ? '🔊' : '📢'}
                        </Text>
                        <Text style={styles.controlLabel}>Speaker</Text>
                    </TouchableOpacity>

                    {/* Add call button */}
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => {/* Handle add call */ }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.controlIcon}>➕</Text>
                        <Text style={styles.controlLabel}>Add Call</Text>
                    </TouchableOpacity>

                    {/* Merge button */}
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => {/* Handle merge */ }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.controlIcon}>🔗</Text>
                        <Text style={styles.controlLabel}>Merge</Text>
                    </TouchableOpacity>
                </View>

                {/* Hold menu */}
                {showHoldMenu && (
                    <View style={styles.holdMenu}>
                        <TouchableOpacity
                            style={styles.holdMenuItem}
                            onPress={() => {/* Handle unhold */ }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.holdMenuText}>Unhold</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Keypad */}
                {showKeypad && renderKeypad()}
            </View>
        );
    };

    // Render DTMF keypad
    const renderKeypad = () => {
        const keypadNumbers = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#']
        ];

        return (
            <View style={styles.keypadContainer}>
                <View style={styles.keypadGrid}>
                    {keypadNumbers.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.keypadRow}>
                            {row.map((digit) => (
                                <TouchableOpacity
                                    key={digit}
                                    style={styles.keypadButton}
                                    onPress={() => {/* Handle DTMF tone */ }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.keypadText}>{digit}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // Main render
    return (
        <View style={[styles.container, style]}>
            {/* Status bar for Android */}
            {Platform.OS === 'android' && callState === 'connected' && (
                <StatusBar
                    backgroundColor={ANDROID_TELECOM_COLORS.background}
                    barStyle="light-content"
                    translucent={true}
                />
            )}

            {/* Call animations */}
            {(callState === 'ringing' || callState === 'connecting') && (
                <CallScreenAnimations
                    isActive={true}
                    animationType="ring"
                    color={ANDROID_TELECOM_COLORS.incoming}
                    intensity="medium"
                    style={styles.callAnimations}
                />
            )}

            {/* Caller avatar */}
            {renderAvatar()}

            {/* Caller information */}
            {renderCallerInfo()}

            {/* Call controls */}
            {renderIncomingControls()}
            {renderActiveCallControls()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ANDROID_TELECOM_COLORS.background,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 100,
        paddingBottom: 50,
    },

    callAnimations: {
        position: 'absolute',
        top: 150,
        left: '50%',
        marginLeft: -20,
    },

    avatarContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: ANDROID_TELECOM_COLORS.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: ANDROID_TELECOM_COLORS.incoming,
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: '400',
        color: ANDROID_TELECOM_COLORS.text,
    },

    callerInfoContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    callerName: {
        fontSize: 28,
        fontWeight: '300',
        color: ANDROID_TELECOM_COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    callType: {
        fontSize: 16,
        color: ANDROID_TELECOM_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
    },
    callStateIndicator: {
        marginTop: 8,
    },

    incomingControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    messageButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: ANDROID_TELECOM_COLORS.buttonBackground,
    },
    declineButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: ANDROID_TELECOM_COLORS.declined,
    },
    answerButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: ANDROID_TELECOM_COLORS.incoming,
    },
    messageIcon: {
        fontSize: 20,
        marginBottom: 4,
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
        color: ANDROID_TELECOM_COLORS.text,
        fontSize: 11,
        fontWeight: '500',
    },

    activeControlsContainer: {
        alignItems: 'center',
        width: '100%',
    },
    mainControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    bottomControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    controlButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: ANDROID_TELECOM_COLORS.buttonBackground,
    },
    controlButtonActive: {
        backgroundColor: ANDROID_TELECOM_COLORS.incoming,
    },
    controlIcon: {
        fontSize: 18,
        marginBottom: 4,
    },
    endCallButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: ANDROID_TELECOM_COLORS.declined,
        marginBottom: 20,
    },
    endCallIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    endCallLabel: {
        color: ANDROID_TELECOM_COLORS.text,
        fontSize: 11,
        fontWeight: '500',
    },

    holdMenu: {
        backgroundColor: ANDROID_TELECOM_COLORS.cardBackground,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 10,
    },
    holdMenuItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    holdMenuText: {
        color: ANDROID_TELECOM_COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    },

    keypadContainer: {
        marginTop: 20,
    },
    keypadGrid: {
        flexDirection: 'column',
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 4,
    },
    keypadButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: ANDROID_TELECOM_COLORS.buttonBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
    },
    keypadText: {
        color: ANDROID_TELECOM_COLORS.text,
        fontSize: 18,
        fontWeight: '500',
    },
});

export default AndroidTelecomIntegration;