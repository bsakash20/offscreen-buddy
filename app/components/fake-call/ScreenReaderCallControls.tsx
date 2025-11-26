/**
 * Screen Reader Call Controls
 * Screen reader optimized call controls with comprehensive accessibility features
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { useVoiceOver, useErrorAnnouncements } from '../../components/ui-error-library/accessibility/enhanced-hooks';

// Screen reader call control configuration
export interface ScreenReaderCallControlConfig {
    enabled: boolean;
    announceStateChanges: boolean;
    announceControlActions: boolean;
    announceErrors: boolean;
    verboseAnnouncements: boolean;
    contextRetention: boolean;
    priorityAnnouncements: boolean;
}

// Call control state for screen readers
export interface ScreenReaderCallControlState {
    currentState: string;
    lastAnnouncement: string;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoOn: boolean;
    callDuration: number;
    pendingAnnouncements: string[];
}

// Props for screen reader call controls
export interface ScreenReaderCallControlsProps {
    // Call context
    callState: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'on_hold';
    callDuration?: number;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isVideoOn: boolean;
    callerName?: string;

    // Call handlers
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;

    // Configuration
    config: ScreenReaderCallControlConfig;

    // Event handlers
    onAnnouncement?: (message: string, priority: 'low' | 'normal' | 'high' | 'critical') => void;
    onError?: (error: string) => void;

    // Styling
    style?: any;
    theme?: any;
}

export const ScreenReaderCallControls: React.FC<ScreenReaderCallControlsProps> = ({
    callState,
    callDuration = 0,
    isMuted,
    isSpeakerOn,
    isVideoOn,
    callerName,
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    config,
    onAnnouncement,
    onError,
    style,
    theme,
}) => {
    // Hooks
    const { announce, createContextAwareAnnouncement } = useVoiceOver();
    const { addAnnouncement } = useErrorAnnouncements();

    // State
    const [screenReaderState, setScreenReaderState] = useState<ScreenReaderCallControlState>({
        currentState: callState,
        lastAnnouncement: '',
        isMuted: isMuted || false,
        isSpeakerOn: isSpeakerOn || false,
        isVideoOn: isVideoOn || false,
        callDuration: callDuration || 0,
        pendingAnnouncements: [],
    });

    const [callControls, setCallControls] = useState<any[]>([]);
    const [currentFocus, setCurrentFocus] = useState<string | null>(null);

    // Refs
    const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate accessibility announcements based on call state
    const generateStateAnnouncement = useCallback((state: string): string => {
        const announcements = {
            'ringing': `Incoming call from ${callerName || 'unknown caller'}. Available actions: Answer or Decline.`,
            'connecting': 'Connecting call. Please wait for connection.',
            'connected': `Call connected with ${callerName || 'caller'}. Call duration ${formatDuration(callDuration)}. Available actions: Mute, Speaker, End Call.`,
            'ended': 'Call ended.',
            'missed': `Missed call from ${callerName || 'unknown caller'}.`,
            'on_hold': 'Call is on hold. Available actions: Resume or End Call.',
        };

        return announcements[state as keyof typeof announcements] || `Call state: ${state}`;
    }, [callerName, callDuration]);

    // Generate control-specific announcements
    const generateControlAnnouncement = useCallback((
        controlId: string,
        action: string,
        result: 'success' | 'error' | 'pending'
    ): string => {
        const controlAnnouncements = {
            'answer_button': {
                success: 'Call answered successfully',
                error: 'Failed to answer call. Please try again',
                pending: 'Answering call...',
            },
            'decline_button': {
                success: 'Call declined',
                error: 'Failed to decline call. Please try again',
                pending: 'Declining call...',
            },
            'end_call_button': {
                success: 'Call ended',
                error: 'Failed to end call. Please try again',
                pending: 'Ending call...',
            },
            'mute_button': {
                success: isMuted ? 'Microphone unmuted. You can now speak' : 'Microphone muted',
                error: 'Failed to toggle mute. Please try again',
                pending: 'Toggling microphone...',
            },
            'speaker_button': {
                success: isSpeakerOn ? 'Speaker turned off' : 'Speaker turned on',
                error: 'Failed to toggle speaker. Please try again',
                pending: 'Toggling speaker...',
            },
            'video_button': {
                success: isVideoOn ? 'Video turned off' : 'Video turned on',
                error: 'Failed to toggle video. Please try again',
                pending: 'Toggling video...',
            },
        };

        return controlAnnouncements[controlId as keyof typeof controlAnnouncements]?.[result] ||
            `${action} ${result}`;
    }, [isMuted, isSpeakerOn, isVideoOn]);

    // Format call duration
    const formatDuration = useCallback((seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes} minutes and ${secs} seconds`;
    }, []);

    // Enhanced announcement function
    const announceWithContext = useCallback((
        message: string,
        priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
        interrupt: boolean = false
    ) => {
        if (!config.enabled) return;

        // Add context if configured
        let finalMessage = message;
        if (config.contextRetention && screenReaderState.lastAnnouncement) {
            finalMessage = createContextAwareAnnouncement(message, screenReaderState.lastAnnouncement);
        }

        // Create announcement
        const announcement = {
            id: `sr_announcement_${Date.now()}`,
            message: finalMessage,
            priority,
            category: 'call_control' as const,
            shouldInterrupt: interrupt,
        };

        // Announce based on priority
        if (priority === 'critical') {
            announce(announcement);
        } else {
            addAnnouncement(finalMessage, priority);
        }

        // Update state
        setScreenReaderState(prev => ({
            ...prev,
            lastAnnouncement: finalMessage,
        }));

        // Notify parent
        onAnnouncement?.(finalMessage, priority);
    }, [config, screenReaderState.lastAnnouncement, announce, addAnnouncement, createContextAwareAnnouncement, onAnnouncement]);

    // Create accessible call controls
    const createCallControls = useCallback(() => {
        const controls = [];

        switch (callState) {
            case 'ringing':
                controls.push(
                    {
                        id: 'answer_button',
                        label: 'Answer Call',
                        description: 'Accept the incoming call. Double-tap to answer.',
                        action: () => {
                            announceWithContext(generateControlAnnouncement('answer_button', 'Answering call', 'pending'), 'normal');
                            onAnswer?.();
                            announceWithContext(generateControlAnnouncement('answer_button', 'Answering call', 'success'), 'normal');
                        },
                        priority: 1,
                    },
                    {
                        id: 'decline_button',
                        label: 'Decline Call',
                        description: 'Reject the incoming call. Double-tap to decline.',
                        action: () => {
                            announceWithContext(generateControlAnnouncement('decline_button', 'Declining call', 'pending'), 'normal');
                            onDecline?.();
                            announceWithContext(generateControlAnnouncement('decline_button', 'Declining call', 'success'), 'normal');
                        },
                        priority: 1,
                    }
                );
                break;

            case 'connected':
            case 'on_hold':
                controls.push(
                    {
                        id: 'mute_button',
                        label: isMuted ? 'Unmute Microphone' : 'Mute Microphone',
                        description: `Toggle microphone ${isMuted ? 'on' : 'off'}. Double-tap to ${isMuted ? 'unmute' : 'mute'}.`,
                        action: () => {
                            const newMutedState = !isMuted;
                            announceWithContext(
                                generateControlAnnouncement('mute_button', 'Toggling mute', 'pending'),
                                'normal'
                            );
                            onToggleMute?.(newMutedState);
                            setScreenReaderState(prev => ({ ...prev, isMuted: newMutedState }));
                        },
                        priority: 2,
                    },
                    {
                        id: 'speaker_button',
                        label: isSpeakerOn ? 'Turn Off Speaker' : 'Turn On Speaker',
                        description: `Toggle speaker ${isSpeakerOn ? 'off' : 'on'}. Double-tap to ${isSpeakerOn ? 'turn off' : 'turn on'} speaker.`,
                        action: () => {
                            const newSpeakerState = !isSpeakerOn;
                            announceWithContext(
                                generateControlAnnouncement('speaker_button', 'Toggling speaker', 'pending'),
                                'normal'
                            );
                            onToggleSpeaker?.(newSpeakerState);
                            setScreenReaderState(prev => ({ ...prev, isSpeakerOn: newSpeakerState }));
                        },
                        priority: 2,
                    }
                );

                // Add video button for video calls
                if (isVideoOn !== undefined) {
                    controls.push({
                        id: 'video_button',
                        label: isVideoOn ? 'Turn Off Video' : 'Turn On Video',
                        description: `Toggle video ${isVideoOn ? 'off' : 'on'}. Double-tap to ${isVideoOn ? 'turn off' : 'turn on'} video.`,
                        action: () => {
                            const newVideoState = !isVideoOn;
                            announceWithContext(
                                generateControlAnnouncement('video_button', 'Toggling video', 'pending'),
                                'normal'
                            );
                            onToggleVideo?.(newVideoState);
                            setScreenReaderState(prev => ({ ...prev, isVideoOn: newVideoState }));
                        },
                        priority: 2,
                    });
                }

                // Add end call button
                controls.push({
                    id: 'end_call_button',
                    label: 'End Call',
                    description: 'Terminate the current call. Double-tap to hang up.',
                    action: () => {
                        announceWithContext(
                            generateControlAnnouncement('end_call_button', 'Ending call', 'pending'),
                            'high'
                        );
                        onEndCall?.();
                    },
                    priority: 3,
                });
                break;
        }

        // Sort by priority
        controls.sort((a, b) => a.priority - b.priority);
        return controls;
    }, [callState, isMuted, isSpeakerOn, isVideoOn, announceWithContext, generateControlAnnouncement, onAnswer, onDecline, onEndCall, onToggleMute, onToggleSpeaker, onToggleVideo]);

    // Handle call state changes
    useEffect(() => {
        if (config.announceStateChanges && callState !== screenReaderState.currentState) {
            const announcement = generateStateAnnouncement(callState);
            announceWithContext(announcement, callState === 'ringing' ? 'high' : 'normal');

            setScreenReaderState(prev => ({
                ...prev,
                currentState: callState,
                callDuration: callDuration || 0,
            }));
        }
    }, [callState, callDuration, config.announceStateChanges, screenReaderState.currentState, generateStateAnnouncement, announceWithContext]);

    // Update controls when call state changes
    useEffect(() => {
        const newControls = createCallControls();
        setCallControls(newControls);
    }, [callState, isMuted, isSpeakerOn, isVideoOn, createCallControls]);

    // Handle call duration updates
    useEffect(() => {
        if (callState === 'connected' && callDuration > 0) {
            // Announce every minute
            if (callDuration % 60 === 0 && callDuration > 0) {
                announceWithContext(`Call duration: ${formatDuration(callDuration)}`, 'low');
            }
        }
    }, [callState, callDuration, announceWithContext, formatDuration]);

    // Render accessible call controls
    const renderAccessibleControls = () => (
        <View style={styles.controlsContainer} accessibilityLabel="Call controls">
            {callControls.map((control) => (
                <TouchableOpacity
                    key={control.id}
                    style={[
                        styles.accessibleControl,
                        currentFocus === control.id && styles.focusedControl
                    ]}
                    onPress={control.action}
                    onFocus={() => setCurrentFocus(control.id)}
                    onBlur={() => setCurrentFocus(null)}
                    accessibilityRole="button"
                    accessibilityLabel={control.label}
                    accessibilityHint={control.description}
                    accessibilityState={{
                        focused: currentFocus === control.id,
                    }}
                >
                    <Text style={[
                        styles.controlLabel,
                        {
                            color: currentFocus === control.id ?
                                (theme?.colors?.primary || '#007AFF') :
                                (theme?.colors?.text || '#000000'),
                            fontSize: 16,
                            fontWeight: currentFocus === control.id ? 'bold' : 'normal',
                        }
                    ]}>
                        {control.label}
                    </Text>

                    {config.verboseAnnouncements && (
                        <Text style={[
                            styles.controlDescription,
                            {
                                color: theme?.colors?.textSecondary || '#666666',
                                fontSize: 12,
                            }
                        ]}>
                            {control.description}
                        </Text>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );

    // Render screen reader status (development/debug)
    const renderScreenReaderStatus = () => {
        if (!__DEV__) return null;

        return (
            <View style={[
                styles.statusContainer,
                {
                    backgroundColor: theme?.colors?.background || '#F5F5F5',
                    borderColor: theme?.colors?.border || '#CCCCCC',
                },
                style
            ]}>
                <Text style={[
                    styles.statusTitle,
                    {
                        color: theme?.colors?.text || '#000000',
                        fontSize: 16,
                        fontWeight: 'bold',
                    }
                ]}>
                    Screen Reader Call Controls Status
                </Text>

                <Text style={[
                    styles.statusText,
                    {
                        color: theme?.colors?.textSecondary || '#666666',
                        fontSize: 14,
                    }
                ]}>
                    Current State: {screenReaderState.currentState}
                </Text>

                <Text style={[
                    styles.statusText,
                    {
                        color: theme?.colors?.textSecondary || '#666666',
                        fontSize: 14,
                    }
                ]}>
                    Last Announcement: {screenReaderState.lastAnnouncement}
                </Text>

                <Text style={[
                    styles.statusText,
                    {
                        color: theme?.colors?.textSecondary || '#666666',
                        fontSize: 14,
                    }
                ]}>
                    Available Controls: {callControls.length}
                </Text>

                <Text style={[
                    styles.controlsListTitle,
                    {
                        color: theme?.colors?.text || '#000000',
                        fontSize: 14,
                        fontWeight: '600',
                        marginTop: 8,
                    }
                ]}>
                    Controls:
                </Text>

                {callControls.map((control, index) => (
                    <Text key={index} style={[
                        styles.controlListItem,
                        {
                            color: theme?.colors?.textSecondary || '#666666',
                            fontSize: 12,
                        }
                    ]}>
                        • {control.label} - {control.description}
                    </Text>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderAccessibleControls()}
            {renderScreenReaderStatus()}
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: -1000, // Hidden off-screen for screen readers
        left: -1000,
        width: 1,
        height: 1,
        opacity: 0,
    },
    controlsContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CCCCCC',
        zIndex: 1000,
    },
    accessibleControl: {
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    focusedControl: {
        borderColor: '#007AFF',
        backgroundColor: '#F0F8FF',
    },
    controlLabel: {
        marginBottom: 4,
    },
    controlDescription: {
        fontStyle: 'italic',
        opacity: 0.8,
    },
    statusContainer: {
        position: 'absolute',
        top: 250,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        zIndex: 1001,
        maxHeight: 300,
    },
    statusTitle: {
        marginBottom: 8,
    },
    statusText: {
        marginBottom: 4,
    },
    controlsListTitle: {
        marginBottom: 4,
    },
    controlListItem: {
        marginBottom: 2,
        paddingLeft: 8,
    },
});

// Hook for screen reader call controls
export const useScreenReaderCallControls = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [config, setConfig] = useState<ScreenReaderCallControlConfig>({
        enabled: true,
        announceStateChanges: true,
        announceControlActions: true,
        announceErrors: true,
        verboseAnnouncements: false,
        contextRetention: true,
        priorityAnnouncements: true,
    });

    const enable = useCallback(() => setIsEnabled(true), []);
    const disable = useCallback(() => setIsEnabled(false), []);
    const updateConfig = useCallback((newConfig: Partial<ScreenReaderCallControlConfig>) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    return {
        isEnabled,
        config,
        enable,
        disable,
        updateConfig,
    };
};

export default ScreenReaderCallControls;