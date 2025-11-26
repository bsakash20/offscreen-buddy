/**
 * Call Interaction Handler Component
 * Unified call interaction management with platform-specific controls
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { hapticManager } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';
import Button, { IconButton } from '../../design-system/components/Button';
import { CallState } from './CallStateIndicator';

export interface CallInteractionHandlerProps {
    // Call state
    isIncoming: boolean;
    isOutgoing: boolean;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoOn: boolean;
    isVideoCall?: boolean;
    callState: CallState;

    // Call controls
    onAnswer: () => void;
    onDecline: () => void;
    onEndCall: () => void;
    onToggleMute: (muted: boolean) => void;
    onToggleSpeaker: (speakerOn: boolean) => void;
    onToggleVideo: (videoOn: boolean) => void;

    // Optional callbacks
    onHold?: () => void;
    onTransfer?: () => void;
    onAddCall?: () => void;
    onKeypad?: () => void;

    // Configuration
    style?: any;
    variant?: 'ios' | 'android' | 'web' | 'generic';
    showAdvancedControls?: boolean;
    compact?: boolean;
    theme?: any;
}

export const CallInteractionHandler: React.FC<CallInteractionHandlerProps> = ({
    isIncoming,
    isOutgoing,
    isMuted,
    isSpeakerOn,
    isVideoOn,
    isVideoCall = false,
    callState,
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    onHold,
    onTransfer,
    onAddCall,
    onKeypad,
    style,
    variant = 'generic',
    showAdvancedControls = false,
    compact = false,
    theme: customTheme,
}) => {
    const { theme } = useTheme();

    // Local state for animations and feedback
    const [isPressed, setIsPressed] = useState<string | null>(null);
    const [longPressTimeout, setLongPressTimeout] = useState<any>(null);

    // Get platform-appropriate variant
    const getPlatformVariant = (): 'ios' | 'android' | 'web' | 'generic' => {
        if (variant !== 'generic') return variant;

        if (Platform.OS === 'ios') return 'ios';
        if (Platform.OS === 'android') return 'android';
        if (Platform.OS === 'web') return 'web';
        return 'generic';
    };

    const platformVariant = getPlatformVariant();

    // Handle button press with haptic feedback
    const handleButtonPress = useCallback(async (action: string, callback: () => void) => {
        setIsPressed(action);

        // Trigger haptic feedback
        if (action === 'answer' || action === 'decline' || action === 'end') {
            await hapticManager.triggerUIInteraction('heavy');
        } else {
            await hapticManager.triggerSettingChange('toggle');
        }

        // Play sound effect
        if (action === 'answer') {
            soundManager.playStatusSound('success');
        } else if (action === 'decline' || action === 'end') {
            soundManager.playStatusSound('warning');
        } else {
            soundManager.playUISound('button');
        }

        callback();

        // Reset pressed state
        setTimeout(() => setIsPressed(null), 200);
    }, []);

    // Handle long press for advanced features
    const handleLongPress = useCallback((action: string) => {
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
        }

        setLongPressTimeout(null);
    }, [longPressTimeout]);

    // Cleanup long press timeout
    useEffect(() => {
        return () => {
            if (longPressTimeout) {
                clearTimeout(longPressTimeout);
            }
        };
    }, [longPressTimeout]);

    // Render incoming call controls
    const renderIncomingCallControls = () => {
        if (!isIncoming || callState !== 'ringing') return null;

        if (platformVariant === 'ios') {
            return (
                <View style={[styles.iosContainer, compact && styles.compactContainer, style]}>
                    {/* Decline button - red circle */}
                    <TouchableOpacity
                        style={[styles.iosDeclineButton, isPressed === 'decline' && styles.pressed]}
                        onPress={() => handleButtonPress('decline', onDecline)}
                        onLongPress={() => handleLongPress('decline')}
                    >
                        <Text style={styles.iosDeclineIcon}>📞</Text>
                        <Text style={styles.iosButtonText}>Decline</Text>
                    </TouchableOpacity>

                    {/* Answer button - green circle */}
                    <TouchableOpacity
                        style={[styles.iosAnswerButton, isPressed === 'answer' && styles.pressed]}
                        onPress={() => handleButtonPress('answer', onAnswer)}
                        onLongPress={() => handleLongPress('answer')}
                    >
                        <Text style={styles.iosAnswerIcon}>📱</Text>
                        <Text style={styles.iosButtonText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (platformVariant === 'android') {
            return (
                <View style={[styles.androidContainer, compact && styles.compactContainer, style]}>
                    <Button
                        variant="destructive"
                        size={compact ? "md" : "lg"}
                        onPress={() => handleButtonPress('decline', onDecline)}
                        style={{ ...styles.androidButton, ...styles.declineButton }}
                    >
                        Decline
                    </Button>
                    <Button
                        variant="primary"
                        size={compact ? "md" : "lg"}
                        onPress={() => handleButtonPress('answer', onAnswer)}
                        style={{ ...styles.androidButton, ...styles.answerButton }}
                    >
                        Answer
                    </Button>
                </View>
            );
        }

        // Generic fallback
        return (
            <View style={[styles.genericContainer, compact && styles.compactContainer, style]}>
                <IconButton
                    icon={<Text>❌</Text>}
                    variant="destructive"
                    size={compact ? "md" : "lg"}
                    onPress={() => handleButtonPress('decline', onDecline)}
                    style={styles.genericButton}
                />
                <IconButton
                    icon={<Text>✅</Text>}
                    variant="primary"
                    size={compact ? "md" : "lg"}
                    onPress={() => handleButtonPress('answer', onAnswer)}
                    style={styles.genericButton}
                />
            </View>
        );
    };

    // Render active call controls
    const renderActiveCallControls = () => {
        if (callState !== 'connected') return null;

        const baseControls = (
            <View style={[styles.activeContainer, compact && styles.compactContainer, style]}>
                {/* Mute button */}
                <IconButton
                    icon={<Text>{isMuted ? '🔇' : '🎤'}</Text>}
                    variant={isMuted ? "destructive" : "secondary"}
                    size={compact ? "md" : "lg"}
                    onPress={() => handleButtonPress('mute', () => onToggleMute(!isMuted))}
                    style={styles.controlButton}
                />

                {/* End call button */}
                <Button
                    variant="destructive"
                    size={compact ? "lg" : "xl"}
                    onPress={() => handleButtonPress('end', onEndCall)}
                    style={{ ...styles.endCallButton, ...(isPressed === 'end' && styles.pressed) }}
                >
                    End Call
                </Button>

                {/* Speaker button */}
                <IconButton
                    icon={<Text>{isSpeakerOn ? '🔊' : '📢'}</Text>}
                    variant={isSpeakerOn ? "primary" : "secondary"}
                    size={compact ? "md" : "lg"}
                    onPress={() => handleButtonPress('speaker', () => onToggleSpeaker(!isSpeakerOn))}
                    style={styles.controlButton}
                />
            </View>
        );

        // Add video toggle if video call
        const videoControls = isVideoCall ? (
            <IconButton
                icon={<Text>{isVideoOn ? '📹' : '📷'}</Text>}
                variant={isVideoOn ? "primary" : "secondary"}
                size={compact ? "md" : "lg"}
                onPress={() => handleButtonPress('video', () => onToggleVideo(!isVideoOn))}
                style={styles.controlButton}
            />
        ) : null;

        // Add advanced controls if enabled
        const advancedControls = showAdvancedControls && (
            <View style={styles.advancedControls}>
                {onHold && (
                    <IconButton
                        icon={<Text>⏸️</Text>}
                        variant="ghost"
                        size="md"
                        onPress={() => handleButtonPress('hold', onHold)}
                        style={styles.advancedButton}
                    />
                )}
                {onAddCall && (
                    <IconButton
                        icon={<Text>➕</Text>}
                        variant="ghost"
                        size="md"
                        onPress={() => handleButtonPress('add', onAddCall)}
                        style={styles.advancedButton}
                    />
                )}
                {onKeypad && (
                    <IconButton
                        icon={<Text>🔢</Text>}
                        variant="ghost"
                        size="md"
                        onPress={() => handleButtonPress('keypad', onKeypad)}
                        style={styles.advancedButton}
                    />
                )}
            </View>
        );

        return (
            <>
                {baseControls}
                {videoControls}
                {advancedControls}
            </>
        );
    };

    // Render outgoing call controls
    const renderOutgoingCallControls = () => {
        if (!isOutgoing || callState !== 'connecting') return null;

        return (
            <View style={[styles.outgoingContainer, compact && styles.compactContainer, style]}>
                <Button
                    variant="destructive"
                    size={compact ? "md" : "lg"}
                    onPress={() => handleButtonPress('cancel', onDecline)}
                    style={styles.cancelButton}
                >
                    Cancel
                </Button>
            </View>
        );
    };

    // Main render logic
    const renderControls = () => {
        switch (callState) {
            case 'ringing':
                return renderIncomingCallControls();
            case 'connecting':
                return renderOutgoingCallControls();
            case 'connected':
                return renderActiveCallControls();
            case 'ended':
            case 'missed':
                return null;
            default:
                return renderActiveCallControls();
        }
    };

    return (
        <View style={[styles.container, style]}>
            {renderControls()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactContainer: {
        paddingHorizontal: 10,
    },

    // iOS styles
    iosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    iosDeclineButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FF3B30',
    },
    iosAnswerButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#34C759',
    },
    iosDeclineIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    iosAnswerIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    iosButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },

    // Android styles
    androidContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    androidButton: {
        flex: 1,
        marginHorizontal: 10,
    },
    declineButton: {
        backgroundColor: '#FF4444',
    },
    answerButton: {
        backgroundColor: '#4CAF50',
    },

    // Generic styles
    genericContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    genericButton: {
        marginHorizontal: 15,
    },

    // Active call styles
    activeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    controlButton: {
        marginHorizontal: 10,
    },
    endCallButton: {
        flex: 1,
        marginHorizontal: 15,
    },

    // Outgoing call styles
    outgoingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    cancelButton: {
        minWidth: 120,
    },

    // Advanced controls
    advancedControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    advancedButton: {
        marginHorizontal: 8,
    },

    // Pressed state
    pressed: {
        transform: [{ scale: 0.95 }],
        opacity: 0.8,
    },
});

export default CallInteractionHandler;