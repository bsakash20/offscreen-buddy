/**
 * Notification Permission Prompt Component for OffScreen Buddy
 * Handles requesting notification permissions from users
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import Button from '../../design-system/components/Button';
import Card from '../../design-system/components/Card';
import { notificationService } from '../../services/notifications/NotificationService';
import { hapticManager } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';

const { width } = Dimensions.get('window');

interface NotificationPermissionPromptProps {
    onPermissionGranted?: () => void;
    onPermissionDenied?: () => void;
    showImmediately?: boolean;
    customTitle?: string;
    customMessage?: string;
    showSkipOption?: boolean;
    style?: any;
}

export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
    onPermissionGranted,
    onPermissionDenied,
    showImmediately = false,
    customTitle,
    customMessage,
    showSkipOption = true,
    style,
}) => {
    const [hasCheckedPermission, setHasCheckedPermission] = useState(false);
    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

    useEffect(() => {
        checkPermissionStatus();
    }, []);

    const checkPermissionStatus = async () => {
        try {
            if (!Device.isDevice) {
                // Notifications don't work on simulators
                Alert.alert(
                    'Simulator Notice',
                    'Notifications are not available on the simulator. Please test on a physical device.',
                    [{ text: 'OK', style: 'cancel' }]
                );
                setHasCheckedPermission(true);
                return;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                // Only show prompt if explicitly requested
                if (showImmediately) {
                    setShouldShowPrompt(true);
                }
            }

            setHasCheckedPermission(true);
        } catch (error) {
            console.error('Error checking notification permissions:', error);
            setHasCheckedPermission(true);
        }
    };

    const requestPermissions = async () => {
        try {
            hapticManager.trigger('lightTap');

            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    allowAnnouncements: true,
                },
            });

            if (status === 'granted') {
                // Initialize notification service
                await notificationService.initialize();

                soundManager.playUISound('success');
                hapticManager.trigger('success');

                setShouldShowPrompt(false);
                onPermissionGranted?.();

                Alert.alert(
                    'Great! 🎉',
                    'You\'ll now receive helpful notifications to stay focused and achieve your goals.',
                    [{ text: 'Thanks!', style: 'default' }]
                );
            } else {
                hapticManager.trigger('warning');
                onPermissionDenied?.();

                // Show gentle explanation if user denies
                Alert.alert(
                    'No worries! 😊',
                    'You can always enable notifications later in your device settings. We\'ll still help you stay focused!',
                    [{ text: 'Got it', style: 'default' }]
                );
            }
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            hapticManager.trigger('error');

            Alert.alert(
                'Oops!',
                'There was an issue requesting permissions. Please try again later.',
                [{ text: 'OK', style: 'cancel' }]
            );
        }
    };

    const handleSkip = () => {
        hapticManager.trigger('lightTap');
        setShouldShowPrompt(false);
        onPermissionDenied?.();
    };

    if (!hasCheckedPermission || !shouldShowPrompt) {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            <Card variant="elevated" padding="lg" style={styles.card}>
                <View style={styles.content}>
                    {/* Icon */}
                    <Text style={styles.icon}>🔔</Text>

                    {/* Title */}
                    <Text style={styles.title}>
                        {customTitle || 'Stay Focused with Notifications'}
                    </Text>

                    {/* Message */}
                    <Text style={styles.message}>
                        {customMessage ||
                            'Get gentle reminders and achievements to help you build better habits and stay on track with your focus goals.'}
                    </Text>

                    {/* Benefits */}
                    <View style={styles.benefits}>
                        <Text style={styles.benefit}>• Timer completion celebrations 🎉</Text>
                        <Text style={styles.benefit}>• Break reminders ☕</Text>
                        <Text style={styles.benefit}>• Milestone achievements 🏆</Text>
                        <Text style={styles.benefit}>• Motivational nudges 💪</Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onPress={requestPermissions}
                            style={styles.enableButton}
                        >
                            Enable Notifications
                        </Button>

                        {showSkipOption && (
                            <TouchableOpacity
                                onPress={handleSkip}
                                style={styles.skipButton}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.skipText}>Maybe Later</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Privacy note */}
                    <Text style={styles.privacyNote}>
                        We respect your privacy. You can change these settings anytime in the app or your device preferences.
                    </Text>
                </View>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#4a5568',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    benefits: {
        alignSelf: 'stretch',
        marginBottom: 24,
    },
    benefit: {
        fontSize: 14,
        color: '#2d3748',
        marginBottom: 8,
        textAlign: 'left',
    },
    actions: {
        width: '100%',
        alignItems: 'center',
    },
    enableButton: {
        marginBottom: 16,
        backgroundColor: '#4f46e5',
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    skipText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    privacyNote: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 16,
    },
});

export default NotificationPermissionPrompt;