/**
 * Fake Call Settings Screen
 * Main settings interface for fake call configuration with Pro tier integration
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Alert,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { useResponsive } from '../../design-system/utils/responsive';
import Card, { ActionCard } from '../../design-system/components/Card';
import Button, { IconButton } from '../../design-system/components/Button';
import Input from '../../design-system/components/Input';

import CallFrequencyConfig from './CallFrequencyConfig';
import VoiceProfileSettings from './VoiceProfileSettings';
import CallerIDManager from './CallerIDManager';
import ProTierFeatureGate from './ProTierFeatureGate';
import FakeCallToggle from './FakeCallToggle';
import CallSchedulePreview from './CallSchedulePreview';

export interface FakeCallSettings {
    // Core settings
    isEnabled: boolean;
    frequency: 'never' | 'hourly' | 'daily' | 'weekly' | 'custom';
    customFrequencyMinutes?: number;

    // Scheduling
    schedule: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        workDaysOnly: boolean;
        avoidMeetings: boolean;
        avoidFocusMode: boolean;
    };

    // Voice profile
    voiceProfileId: string;
    voiceSettings: {
        speed: number;
        pitch: number;
        volume: number;
        tone: 'professional' | 'casual' | 'urgent' | 'friendly';
    };

    // Caller ID
    callerInfo: {
        id: string;
        name: string;
        phoneNumber: string;
        callerType: 'business' | 'personal' | 'emergency' | 'unknown';
        riskLevel: 'low' | 'medium' | 'high';
    };

    // Advanced settings
    callDuration: number; // seconds
    autoAnswer: boolean;
    emergencyOverride: boolean;
    notificationSound: string;
}

export interface FakeCallSettingsScreenProps {
    userId: string;
    isProTier: boolean;
    onSettingsChange: (settings: FakeCallSettings) => void;
    onProTierUpgrade: () => void;
    initialSettings?: Partial<FakeCallSettings>;
    testID?: string;
}

const defaultSettings: FakeCallSettings = {
    isEnabled: false,
    frequency: 'daily',
    schedule: {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        workDaysOnly: true,
        avoidMeetings: true,
        avoidFocusMode: true,
    },
    voiceProfileId: 'professional_male',
    voiceSettings: {
        speed: 1.0,
        pitch: 0,
        volume: 0.8,
        tone: 'professional',
    },
    callerInfo: {
        id: 'default',
        name: 'John Smith',
        phoneNumber: '+1-555-0123',
        callerType: 'business',
        riskLevel: 'low',
    },
    callDuration: 30,
    autoAnswer: false,
    emergencyOverride: false,
    notificationSound: 'default',
};

const FakeCallSettingsScreen: React.FC<FakeCallSettingsScreenProps> = ({
    userId,
    isProTier,
    onSettingsChange,
    onProTierUpgrade,
    initialSettings,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile, isTablet, isDesktop, window } = useResponsive();
    const [settings, setSettings] = useState<FakeCallSettings>({
        ...defaultSettings,
        ...initialSettings,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Update settings and notify parent
    const updateSettings = (updates: Partial<FakeCallSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        onSettingsChange(newSettings);
    };

    // Handle frequency change
    const handleFrequencyChange = (frequency: FakeCallSettings['frequency']) => {
        updateSettings({ frequency });
    };

    // Handle voice profile change
    const handleVoiceProfileChange = (voiceProfileId: string, voiceSettings: FakeCallSettings['voiceSettings']) => {
        updateSettings({
            voiceProfileId,
            voiceSettings,
        });
    };

    // Handle caller ID change
    const handleCallerIDChange = (callerInfo: FakeCallSettings['callerInfo']) => {
        updateSettings({ callerInfo });
    };

    // Handle schedule change
    const handleScheduleChange = (schedule: FakeCallSettings['schedule']) => {
        updateSettings({ schedule });
    };

    // Validate settings
    const validateSettings = (): boolean => {
        if (settings.frequency === 'custom' && (!settings.customFrequencyMinutes || settings.customFrequencyMinutes < 5)) {
            Alert.alert('Invalid Settings', 'Custom frequency must be at least 5 minutes.');
            return false;
        }

        if (settings.callDuration < 10 || settings.callDuration > 300) {
            Alert.alert('Invalid Settings', 'Call duration must be between 10 and 300 seconds.');
            return false;
        }

        if (!isProTier && settings.frequency === 'custom') {
            Alert.alert('Pro Feature', 'Custom frequency requires Pro tier subscription.');
            return false;
        }

        if (!isProTier && settings.callerInfo.callerType !== 'business') {
            Alert.alert('Pro Feature', 'Only business caller IDs are available in free tier.');
            return false;
        }

        return true;
    };

    // Reset to defaults
    const handleReset = () => {
        Alert.alert(
            'Reset Settings',
            'Are you sure you want to reset all fake call settings to defaults?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        setSettings(defaultSettings);
                        onSettingsChange(defaultSettings);
                    },
                },
            ]
        );
    };

    const styles = createStyles(theme, isMobile);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            testID={testID}
        >
            {/* Header Section */}
            <Card variant="elevated" padding="lg" style={styles.headerCard}>
                <View style={styles.headerContent}>
                    <View style={styles.headerText}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onPress={handleReset}
                            accessibilityLabel="Reset settings to defaults"
                        >
                            Reset to Defaults
                        </Button>
                    </View>
                    <View style={styles.headerActions}>
                        <IconButton
                            icon={<Text style={styles.helpIcon}>?</Text>}
                            variant="ghost"
                            size="sm"
                            onPress={() => {
                                // TODO: Show help modal
                            }}
                            accessibilityLabel="Help and tips"
                        />
                    </View>
                </View>
            </Card>

            {/* Main Toggle */}
            <FakeCallToggle
                isEnabled={settings.isEnabled}
                onToggle={(enabled) => updateSettings({ isEnabled: enabled })}
                isProTier={isProTier}
                onProTierUpgrade={onProTierUpgrade}
                style={styles.toggleCard}
            />

            {/* Settings Sections */}
            {settings.isEnabled && (
                <>
                    {/* Call Frequency Configuration */}
                    <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                        <CallFrequencyConfig
                            frequency={settings.frequency}
                            customFrequencyMinutes={settings.customFrequencyMinutes}
                            schedule={settings.schedule}
                            isProTier={isProTier}
                            onFrequencyChange={handleFrequencyChange}
                            onScheduleChange={handleScheduleChange}
                        />
                    </Card>

                    {/* Voice Profile Settings */}
                    <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                        <ProTierFeatureGate
                            isProTier={isProTier}
                            featureName="Advanced Voice Profiles"
                            requiredTier="pro"
                            onUpgrade={onProTierUpgrade}
                        >
                            <VoiceProfileSettings
                                voiceProfileId={settings.voiceProfileId}
                                voiceSettings={settings.voiceSettings}
                                isProTier={isProTier}
                                onVoiceProfileChange={handleVoiceProfileChange}
                            />
                        </ProTierFeatureGate>
                    </Card>

                    {/* Caller ID Management */}
                    <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                        <ProTierFeatureGate
                            isProTier={isProTier}
                            featureName="Custom Caller IDs"
                            requiredTier="pro"
                            onUpgrade={onProTierUpgrade}
                        >
                            <CallerIDManager
                                callerInfo={settings.callerInfo}
                                isProTier={isProTier}
                                onCallerIDChange={handleCallerIDChange}
                            />
                        </ProTierFeatureGate>
                    </Card>

                    {/* Schedule Preview */}
                    <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                        <CallSchedulePreview
                            frequency={settings.frequency}
                            customFrequencyMinutes={settings.customFrequencyMinutes}
                            schedule={settings.schedule}
                            voiceProfileId={settings.voiceProfileId}
                            callerInfo={settings.callerInfo}
                            isProTier={isProTier}
                        />
                    </Card>

                    {/* Advanced Settings */}
                    <Card variant="outlined" padding="lg" style={styles.sectionCard}>
                        <TouchableOpacity
                            onPress={() => setShowAdvanced(!showAdvanced)}
                            accessibilityLabel={showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
                        >
                            <View style={styles.advancedHeader}>
                                <Button variant="ghost" size="md">
                                    Advanced Settings
                                </Button>
                                <IconButton
                                    icon={<Text style={styles.chevronIcon}>{showAdvanced ? '▲' : '▼'}</Text>}
                                    variant="ghost"
                                    size="sm"
                                    accessibilityLabel={showAdvanced ? 'Collapse' : 'Expand'}
                                />
                            </View>
                        </TouchableOpacity>

                        {showAdvanced && (
                            <View style={styles.advancedContent}>
                                <Input
                                    label="Call Duration (seconds)"
                                    value={settings.callDuration.toString()}
                                    onChangeText={(text) => {
                                        const value = parseInt(text) || 30;
                                        updateSettings({ callDuration: Math.max(10, Math.min(300, value)) });
                                    }}
                                    keyboardType="numeric"
                                    helperText="Duration of fake calls (10-300 seconds)"
                                    fullWidth
                                />

                                <Button
                                    variant={settings.autoAnswer ? 'primary' : 'outline'}
                                    onPress={() => updateSettings({ autoAnswer: !settings.autoAnswer })}
                                    fullWidth
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: settings.autoAnswer }}
                                >
                                    Auto Answer Calls
                                </Button>

                                {isProTier && (
                                    <Button
                                        variant={settings.emergencyOverride ? 'destructive' : 'outline'}
                                        onPress={() => updateSettings({ emergencyOverride: !settings.emergencyOverride })}
                                        fullWidth
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: settings.emergencyOverride }}
                                    >
                                        Emergency Override Protection
                                    </Button>
                                )}
                            </View>
                        )}
                    </Card>
                </>
            )}

            {/* Save and Validate */}
            {settings.isEnabled && (
                <Card variant="elevated" padding="lg" style={styles.actionCard}>
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={isLoading}
                        onPress={() => {
                            if (validateSettings()) {
                                // Save settings
                                setIsLoading(true);
                                setTimeout(() => {
                                    setIsLoading(false);
                                    Alert.alert('Settings Saved', 'Fake call settings have been updated successfully.');
                                }, 1000);
                            }
                        }}
                        accessibilityLabel="Save fake call settings"
                    >
                        Save Settings
                    </Button>
                </Card>
            )}
        </ScrollView>
    );
};

const createStyles = (theme: any, isMobile: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.system.background.primary,
    },
    contentContainer: {
        padding: isMobile ? theme.spacing.scale.md : theme.spacing.scale.xl,
        paddingBottom: theme.spacing.scale['2xl'],
    },
    headerCard: {
        marginBottom: theme.spacing.scale.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
    },
    helpIcon: {
        fontSize: 18,
        color: theme.colors.brand.primary[600],
    },
    toggleCard: {
        marginBottom: theme.spacing.scale.lg,
    },
    sectionCard: {
        marginBottom: theme.spacing.scale.lg,
    },
    actionCard: {
        marginTop: theme.spacing.scale.xl,
    },
    advancedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: theme.spacing.scale.md,
    },
    advancedContent: {
        paddingTop: theme.spacing.scale.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.system.border.light,
    },
    chevronIcon: {
        fontSize: 14,
        color: theme.colors.system.text.secondary,
    },
});

export default FakeCallSettingsScreen;