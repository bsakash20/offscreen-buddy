/**
 * Phone Call Interface Component
 * Main call screen with platform-specific integrations for authentic call experiences
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    StatusBar,
    Platform,
    Alert,
    BackHandler,
    Text,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import DeviceDetectorService from '../../services/responsive/DeviceDetector';
import { hapticManager } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';
import { CallStateIndicator } from './CallStateIndicator';
import { CallScreenAnimations } from './CallScreenAnimations';
import { CallInteractionHandler } from './CallInteractionHandler';
import { iOSCallKitIntegration } from './iOSCallKitIntegration';
import { AndroidTelecomIntegration } from './AndroidTelecomIntegration';
import { WebPhoneInterface } from './WebPhoneInterface';

import Button, { IconButton } from '../../design-system/components/Button';

// Platform detection
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const isWeb = Platform.OS === 'web';

export interface PhoneCallInterfaceProps {
    // Call information
    callerId?: string;
    callerName?: string;
    callerAvatar?: string;
    isVideoCall?: boolean;

    // Call state
    isIncoming?: boolean;
    isOutgoing?: boolean;
    callState?: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed';

    // Interface options
    platformStyle?: 'native' | 'custom';
    showStatusBar?: boolean;
    enableFullScreen?: boolean;
    enableHapticFeedback?: boolean;
    enableSoundEffects?: boolean;

    // Call controls
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;

    // Event handlers
    onCallDurationUpdate?: (duration: number) => void;
    onCallStateChange?: (state: string) => void;
    onError?: (error: Error) => void;

    // Style overrides
    style?: any;
    theme?: any;
}

export const PhoneCallInterface: React.FC<PhoneCallInterfaceProps> = ({
    callerId,
    callerName = 'Unknown Caller',
    callerAvatar,
    isVideoCall = false,
    isIncoming = true,
    isOutgoing = false,
    callState = 'ringing',
    platformStyle = 'native',
    showStatusBar = true,
    enableFullScreen = true,
    enableHapticFeedback = true,
    enableSoundEffects = true,
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    onCallDurationUpdate,
    onCallStateChange,
    onError,
    style,
    theme: customTheme,
}) => {
    // Hooks
    const { theme } = useTheme();

    // State
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showCallControls, setShowCallControls] = useState(true);

    // Refs
    const durationTimer = useRef<any>(null);
    const controlsTimer = useRef<any>(null);

    // Get device info
    const deviceInfo = DeviceDetectorService.getDeviceInfo();
    const isTablet = deviceInfo.type === 'tablet';

    // Get appropriate call interface based on platform
    const getCallInterface = () => {
        if (isIOS) {
            return React.createElement(iOSCallKitIntegration, {
                callerName,
                callerId,
                isVideoCall,
                callState,
                platformStyle,
                onAnswer: handleAnswer,
                onDecline: handleDecline,
                onEndCall: handleEndCall,
                onToggleMute: handleToggleMute,
                onToggleSpeaker: handleToggleSpeaker,
                onToggleVideo: handleToggleVideo,
                onError: handleError,
            });
        }

        if (isAndroid) {
            return React.createElement(AndroidTelecomIntegration, {
                callerName,
                callerId,
                isVideoCall,
                callState,
                platformStyle,
                onAnswer: handleAnswer,
                onDecline: handleDecline,
                onEndCall: handleEndCall,
                onToggleMute: handleToggleMute,
                onToggleSpeaker: handleToggleSpeaker,
                onToggleVideo: handleToggleVideo,
                onError: handleError,
            });
        }

        if (isWeb) {
            return React.createElement(WebPhoneInterface, {
                callerName,
                callerId,
                isVideoCall,
                callState,
                platformStyle,
                onAnswer: handleAnswer,
                onDecline: handleDecline,
                onEndCall: handleEndCall,
                onToggleMute: handleToggleMute,
                onToggleSpeaker: handleToggleSpeaker,
                onToggleVideo: handleToggleVideo,
                onError: handleError,
            });
        }

        // Fallback to generic interface
        return renderGenericInterface();
    };

    // Render generic interface for unsupported platforms
    const renderGenericInterface = () => {
        return (
            <View style={[
                styles.container,
                { backgroundColor: theme.colors.system.background.primary },
                style
            ]}>
                {/* Caller Information */}
                <View style={styles.callerInfo}>
                    {callerAvatar ? (
                        <View style={styles.avatarContainer}>
                            {/* Avatar component would go here */}
                        </View>
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <IconButton
                                icon={<Text>👤</Text>}
                                size="xl"
                                variant="ghost"
                            />
                        </View>
                    )}
                    <Text style={styles.callerName}>{callerName}</Text>
                    <CallStateIndicator
                        state={callState}
                        duration={callDuration}
                        style={styles.callState}
                    />
                    <CallScreenAnimations
                        isActive={callState === 'connecting' || callState === 'connected'}
                        style={styles.animations}
                    />
                </View>

                {/* Call Controls */}
                <CallInteractionHandler
                    isIncoming={isIncoming}
                    isOutgoing={isOutgoing}
                    isMuted={isMuted}
                    isSpeakerOn={isSpeakerOn}
                    isVideoOn={isVideoOn}
                    callState={callState}
                    onAnswer={handleAnswer}
                    onDecline={handleDecline}
                    onEndCall={handleEndCall}
                    onToggleMute={handleToggleMute}
                    onToggleSpeaker={handleToggleSpeaker}
                    onToggleVideo={handleToggleVideo}
                    style={styles.callControls}
                />
            </View>
        );
    };

    // Call event handlers
    const handleAnswer = useCallback(() => {
        console.log('Answering call');
        if (enableHapticFeedback) {
            hapticManager.triggerUIInteraction('medium');
        }
        onAnswer?.();
        startCallDuration();
    }, [enableHapticFeedback, onAnswer]);

    const handleDecline = useCallback(() => {
        console.log('Declining call');
        if (enableHapticFeedback) {
            hapticManager.triggerUIInteraction('heavy');
        }
        onDecline?.();
        endCall();
    }, [enableHapticFeedback, onDecline]);

    const handleEndCall = useCallback(() => {
        console.log('Ending call');
        if (enableHapticFeedback) {
            hapticManager.triggerUIInteraction('heavy');
        }
        onEndCall?.();
        endCall();
    }, [enableHapticFeedback, onEndCall]);

    const handleToggleMute = useCallback((muted: boolean) => {
        console.log('Toggling mute:', muted);
        setIsMuted(muted);
        if (enableHapticFeedback) {
            hapticManager.triggerSettingChange('toggle');
        }
        onToggleMute?.(muted);
    }, [enableHapticFeedback, onToggleMute]);

    const handleToggleSpeaker = useCallback((speakerOn: boolean) => {
        console.log('Toggling speaker:', speakerOn);
        setIsSpeakerOn(speakerOn);
        if (enableHapticFeedback) {
            hapticManager.triggerSettingChange('toggle');
        }
        onToggleSpeaker?.(speakerOn);
    }, [enableHapticFeedback, onToggleSpeaker]);

    const handleToggleVideo = useCallback((videoOn: boolean) => {
        console.log('Toggling video:', videoOn);
        setIsVideoOn(videoOn);
        if (enableHapticFeedback) {
            hapticManager.triggerSettingChange('toggle');
        }
        onToggleVideo?.(videoOn);
    }, [enableHapticFeedback, onToggleVideo]);

    const handleError = useCallback((error: Error) => {
        console.error('Call interface error:', error);
        onError?.(error);
    }, [onError]);

    // Call duration management
    const startCallDuration = useCallback(() => {
        if (durationTimer.current) {
            clearInterval(durationTimer.current);
        }

        durationTimer.current = setInterval(() => {
            setCallDuration(prev => {
                const newDuration = prev + 1;
                onCallDurationUpdate?.(newDuration);
                return newDuration;
            });
        }, 1000);
    }, [onCallDurationUpdate]);

    const endCall = useCallback(() => {
        if (durationTimer.current) {
            clearInterval(durationTimer.current);
            durationTimer.current = null;
        }
        setCallDuration(0);
        onCallStateChange?.('ended');
    }, [onCallStateChange]);

    // Auto-hide controls
    const resetControlsTimer = useCallback(() => {
        if (controlsTimer.current) {
            clearTimeout(controlsTimer.current);
        }

        if (callState === 'connected' && showCallControls) {
            controlsTimer.current = setTimeout(() => {
                setShowCallControls(false);
            }, 5000);
        }
    }, [callState, showCallControls]);

    // Effects
    useEffect(() => {
        if (callState === 'connected') {
            startCallDuration();
        } else {
            endCall();
        }

        return () => {
            if (durationTimer.current) {
                clearInterval(durationTimer.current);
            }
        };
    }, [callState, startCallDuration, endCall]);

    useEffect(() => {
        resetControlsTimer();
        return () => {
            if (controlsTimer.current) {
                clearTimeout(controlsTimer.current);
            }
        };
    }, [resetControlsTimer]);

    useEffect(() => {
        if (enableSoundEffects && callState === 'ringing') {
            soundManager.playNotificationSound('gentle');
        }

        return () => {
            // Cleanup any playing sounds
        };
    }, [callState, enableSoundEffects]);

    // Platform-specific interface
    if (platformStyle === 'native') {
        return getCallInterface();
    }

    // Custom interface
    return (
        <View style={[
            styles.container,
            { backgroundColor: theme.colors.system.background.primary },
            style
        ]}>
            {/* Status Bar */}
            {showStatusBar && (
                <StatusBar
                    hidden={isFullScreen}
                    barStyle={callState === 'connected' ? 'light-content' : 'dark-content'}
                    backgroundColor="transparent"
                    translucent={Platform.OS === 'android'}
                />
            )}

            {/* Main Interface */}
            {getCallInterface()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    callerInfo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    callerName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: 20,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 30,
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    callState: {
        marginTop: 20,
    },
    animations: {
        marginTop: 20,
    },
    callControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    declineButton: {
        flex: 1,
        marginRight: 10,
    },
    answerButton: {
        flex: 1,
        marginLeft: 10,
    },
    endCallButton: {
        flex: 1,
    },
});

export default PhoneCallInterface;