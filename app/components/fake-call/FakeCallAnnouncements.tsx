/**
 * Fake Call Announcements Component
 * Real-time screen reader announcements for call events with customizable timing and verbosity
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAccessibility } from '../../components/ui-error-library/components/accessibility/AccessibilityProvider';

// Announcement configuration
export interface AnnouncementConfig {
    priority: 'low' | 'normal' | 'high' | 'critical';
    delay: number; // milliseconds
    duration: number; // milliseconds before auto-dismiss
    interrupt: boolean; // should interrupt current announcement
    repeat: boolean; // should repeat announcement
    verbosity: 'minimal' | 'normal' | 'detailed';
}

// Call event types
export interface CallAnnouncementEvent {
    id: string;
    type: 'incoming_call' | 'call_answered' | 'call_declined' | 'call_connected' | 'call_ended' | 'call_muted' | 'call_unmuted' | 'speaker_on' | 'speaker_off' | 'video_on' | 'video_off' | 'call_hold' | 'call_resume' | 'error';
    message: string;
    details?: string;
    timestamp: number;
    config: AnnouncementConfig;
}

// Props for the announcements component
export interface FakeCallAnnouncementsProps {
    // Call context
    callerName?: string;
    callState: string;
    callDuration?: number;
    isMuted?: boolean;
    isSpeakerOn?: boolean;
    isVideoOn?: boolean;

    // Configuration
    enabled: boolean;
    queueSize: number;
    defaultConfig: AnnouncementConfig;

    // Event handlers
    onAnnouncementStart?: (event: CallAnnouncementEvent) => void;
    onAnnouncementEnd?: (event: CallAnnouncementEvent) => void;
    onAnnouncementError?: (error: string) => void;

    // Styling
    style?: any;
    theme?: any;
}

export const FakeCallAnnouncements: React.FC<FakeCallAnnouncementsProps> = ({
    callerName,
    callState,
    callDuration = 0,
    isMuted = false,
    isSpeakerOn = false,
    isVideoOn = false,
    enabled = true,
    queueSize = 5,
    defaultConfig = {
        priority: 'normal',
        delay: 0,
        duration: 3000,
        interrupt: false,
        repeat: false,
        verbosity: 'normal',
    },
    onAnnouncementStart,
    onAnnouncementEnd,
    onAnnouncementError,
    style,
    theme,
}) => {
    // Hooks
    const { announceForAccessibility, announceForAccessibilityWithOptions } = useAccessibility();

    // State
    const [announcementQueue, setAnnouncementQueue] = useState<CallAnnouncementEvent[]>([]);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<CallAnnouncementEvent | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const durationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Format call duration
    const formatDuration = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Generate announcement messages based on call state
    const generateAnnouncementMessage = useCallback((
        type: CallAnnouncementEvent['type'],
        state: string,
        details?: any
    ): string => {
        const baseMessages = {
            incoming_call: callerName
                ? `Incoming call from ${callerName}. Say "answer call" to answer or "decline call" to decline.`
                : 'Incoming call. Say "answer call" to answer or "decline call" to decline.',
            call_answered: 'Call answered. You are now connected.',
            call_declined: 'Call declined.',
            call_connected: callerName
                ? `Connected with ${callerName}. Call duration ${formatDuration(callDuration)}.`
                : `Call connected. Duration ${formatDuration(callDuration)}.`,
            call_ended: 'Call ended.',
            call_muted: 'Microphone muted. Say "unmute call" to start speaking.',
            call_unmuted: 'Microphone unmuted. You can now speak.',
            speaker_on: 'Speaker turned on. Audio is now playing through the speaker.',
            speaker_off: 'Speaker turned off. Audio is now playing through the earpiece.',
            video_on: 'Video turned on. The other person can now see you.',
            video_off: 'Video turned off. The other person can no longer see you.',
            call_hold: 'Call placed on hold.',
            call_resume: 'Call resumed.',
            error: 'An error occurred with the call.',
        };

        return baseMessages[type] || `Call ${type.replace('_', ' ')}`;
    }, [callerName, callDuration, formatDuration]);

    // Create announcement event
    const createAnnouncementEvent = useCallback((
        type: CallAnnouncementEvent['type'],
        customMessage?: string,
        customConfig?: Partial<AnnouncementConfig>
    ): CallAnnouncementEvent => {
        const config = { ...defaultConfig, ...customConfig };
        const message = customMessage || generateAnnouncementMessage(type, callState, {
            callDuration,
            isMuted,
            isSpeakerOn,
            isVideoOn,
        });

        return {
            id: `announcement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            details: generateAnnouncementMessage(type, callState, {
                callDuration,
                isMuted,
                isSpeakerOn,
                isVideoOn,
            }),
            timestamp: Date.now(),
            config,
        };
    }, [defaultConfig, generateAnnouncementMessage, callState, callDuration, isMuted, isSpeakerOn, isVideoOn]);

    // Add announcement to queue
    const addAnnouncement = useCallback((event: CallAnnouncementEvent) => {
        if (!enabled) return;

        setAnnouncementQueue(prev => {
            const newQueue = [...prev, event];

            // Limit queue size
            if (newQueue.length > queueSize) {
                newQueue.shift();
            }

            return newQueue;
        });

        onAnnouncementStart?.(event);
    }, [enabled, queueSize, onAnnouncementStart]);

    // Process announcement queue
    const processQueue = useCallback(async () => {
        if (isProcessing || announcementQueue.length === 0) return;

        setIsProcessing(true);

        const [nextEvent] = announcementQueue;
        setCurrentAnnouncement(nextEvent);
        setAnnouncementQueue(prev => prev.slice(1));

        try {
            // Apply delay if specified
            if (nextEvent.config.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, nextEvent.config.delay));
            }

            // Announce based on priority
            if (nextEvent.config.priority === 'critical') {
                announceForAccessibilityWithOptions(nextEvent.message, {
                    priority: 'high',
                    delay: nextEvent.config.delay,
                });
            } else {
                announceForAccessibility(nextEvent.message);
            }

            // Auto-dismiss after duration
            if (nextEvent.config.duration > 0) {
                durationTimeoutRef.current = setTimeout(() => {
                    setCurrentAnnouncement(null);
                    onAnnouncementEnd?.(nextEvent);
                }, nextEvent.config.duration);
            }

        } catch (error) {
            onAnnouncementError?.(error instanceof Error ? error.message : 'Unknown announcement error');
        }

        setIsProcessing(false);

        // Process next announcement after a short delay
        if (announcementQueue.length > 1) {
            queueTimeoutRef.current = setTimeout(() => {
                processQueue();
            }, 500);
        }
    }, [isProcessing, announcementQueue, announceForAccessibility, announceForAccessibilityWithOptions, onAnnouncementEnd, onAnnouncementError]);

    // Generate announcements based on call state changes
    useEffect(() => {
        if (!enabled) return;

        let newEvent: CallAnnouncementEvent | null = null;

        switch (callState) {
            case 'ringing':
                newEvent = createAnnouncementEvent('incoming_call');
                break;
            case 'connected':
                newEvent = createAnnouncementEvent('call_connected');
                break;
            case 'ended':
                newEvent = createAnnouncementEvent('call_ended');
                break;
            case 'missed':
                newEvent = createAnnouncementEvent('call_declined');
                break;
            case 'on_hold':
                newEvent = createAnnouncementEvent('call_hold');
                break;
        }

        if (newEvent) {
            addAnnouncement(newEvent);
        }
    }, [callState, enabled, createAnnouncementEvent, addAnnouncement]);

    // Monitor call property changes
    useEffect(() => {
        if (!enabled || !currentAnnouncement) return;

        // These would trigger on property changes during an active call
        if (callState === 'connected') {
            // Monitor mute changes
            if (isMuted !== undefined) {
                const muteEvent = createAnnouncementEvent(isMuted ? 'call_muted' : 'call_unmuted');
                addAnnouncement(muteEvent);
            }

            // Monitor speaker changes
            if (isSpeakerOn !== undefined) {
                const speakerEvent = createAnnouncementEvent(isSpeakerOn ? 'speaker_on' : 'speaker_off');
                addAnnouncement(speakerEvent);
            }

            // Monitor video changes (for video calls)
            if (isVideoCall !== undefined && isVideoOn !== undefined) {
                const videoEvent = createAnnouncementEvent(isVideoOn ? 'video_on' : 'video_off');
                addAnnouncement(videoEvent);
            }
        }
    }, [callState, isMuted, isSpeakerOn, isVideoOn, enabled, currentAnnouncement, createAnnouncementEvent, addAnnouncement]);

    // Process queue when announcements are added
    useEffect(() => {
        if (!isProcessing && announcementQueue.length > 0) {
            processQueue();
        }
    }, [announcementQueue, isProcessing, processQueue]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (queueTimeoutRef.current) clearTimeout(queueTimeoutRef.current);
            if (durationTimeoutRef.current) clearTimeout(durationTimeoutRef.current);
        };
    }, []);

    // Public methods for manual announcements
    const announceCustomMessage = useCallback((
        message: string,
        priority: AnnouncementConfig['priority'] = 'normal',
        duration?: number
    ) => {
        const event = createAnnouncementEvent('incoming_call', message, {
            priority,
            duration: duration || defaultConfig.duration,
        });
        addAnnouncement(event);
    }, [createAnnouncementEvent, addAnnouncement, defaultConfig]);

    const clearQueue = useCallback(() => {
        setAnnouncementQueue([]);
        setCurrentAnnouncement(null);
        if (queueTimeoutRef.current) clearTimeout(queueTimeoutRef.current);
        if (durationTimeoutRef.current) clearTimeout(durationTimeoutRef.current);
    }, []);

    // Render announcement display (for debugging/development)
    const renderAnnouncementDisplay = () => {
        if (!currentAnnouncement || __DEV__) {
            return (
                <View style={[
                    styles.announcementContainer,
                    {
                        backgroundColor: theme?.colors?.background || '#000000',
                        borderColor: theme?.colors?.border || '#333333',
                    },
                    style
                ]}>
                    {currentAnnouncement && (
                        <>
                            <Text style={[
                                styles.announcementMessage,
                                { color: theme?.colors?.text || '#FFFFFF' }
                            ]}>
                                {currentAnnouncement.message}
                            </Text>
                            <Text style={[
                                styles.announcementDetails,
                                { color: theme?.colors?.textSecondary || '#CCCCCC' }
                            ]}>
                                Priority: {currentAnnouncement.config.priority}
                            </Text>
                        </>
                    )}

                    {announcementQueue.length > 0 && (
                        <Text style={[
                            styles.queueInfo,
                            { color: theme?.colors?.textSecondary || '#CCCCCC' }
                        ]}>
                            Queue: {announcementQueue.length} announcements pending
                        </Text>
                    )}
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            {renderAnnouncementDisplay()}

            {/* Hidden announcement element for screen readers */}
            <View
                accessible={true}
                accessibilityLabel={currentAnnouncement?.message}
                accessibilityRole="announcement"
                style={styles.hiddenAnnouncement}
            >
                {currentAnnouncement && (
                    <Text accessibilityRole="announcement">
                        {currentAnnouncement.message}
                    </Text>
                )}
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: -1000, // Hidden off-screen
        left: -1000,
        width: 1,
        height: 1,
        opacity: 0,
    },
    announcementContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        zIndex: 1000,
    },
    announcementMessage: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    announcementDetails: {
        fontSize: 14,
        marginBottom: 4,
    },
    queueInfo: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    hiddenAnnouncement: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
});

export default FakeCallAnnouncements;