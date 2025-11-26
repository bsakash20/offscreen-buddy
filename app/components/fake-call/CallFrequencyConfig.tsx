/**
 * Call Frequency Configuration Component
 * Handles call frequency settings with smart scheduling and Pro tier features
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { useResponsive } from '../../design-system/utils/responsive';
import Button from '../../design-system/components/Button';
import Input from '../../design-system/components/Input';

export interface CallFrequencyConfigProps {
    frequency: 'never' | 'hourly' | 'daily' | 'weekly' | 'custom';
    customFrequencyMinutes?: number;
    schedule: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        workDaysOnly: boolean;
        avoidMeetings: boolean;
        avoidFocusMode: boolean;
    };
    isProTier: boolean;
    onFrequencyChange: (frequency: 'never' | 'hourly' | 'daily' | 'weekly' | 'custom') => void;
    onScheduleChange: (schedule: any) => void;
    style?: any;
    testID?: string;
}

const frequencyOptions = [
    { value: 'never', label: 'Never', description: 'Disable fake calls' },
    { value: 'hourly', label: 'Every Hour', description: 'Calls every hour during active hours' },
    { value: 'daily', label: 'Daily', description: 'Calls once per day during active hours' },
    { value: 'weekly', label: 'Weekly', description: 'Calls once per week during active hours' },
    { value: 'custom', label: 'Custom', description: 'Set your own interval (Pro feature)' },
] as const;

const CallFrequencyConfig: React.FC<CallFrequencyConfigProps> = ({
    frequency,
    customFrequencyMinutes,
    schedule,
    isProTier,
    onFrequencyChange,
    onScheduleChange,
    style,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();
    const [showSchedule, setShowSchedule] = useState(false);

    const handleFrequencySelect = (newFrequency: typeof frequency) => {
        if (newFrequency === 'custom' && !isProTier) {
            Alert.alert(
                'Pro Feature',
                'Custom frequency requires a Pro tier subscription. Upgrade to set any frequency interval.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Upgrade to Pro',
                        onPress: () => {
                            // TODO: Trigger upgrade flow
                        },
                    },
                ]
            );
            return;
        }
        onFrequencyChange(newFrequency);
    };

    const handleScheduleToggle = () => {
        onScheduleChange({
            ...schedule,
            enabled: !schedule.enabled,
        });
    };

    const handleCustomFrequencyChange = (text: string) => {
        const value = parseInt(text) || 0;
        if (value >= 5 && value <= 1440) { // 5 minutes to 24 hours
            // This would update the settings through the parent
            // For now, we'll show an alert since this is controlled by parent
            Alert.alert('Custom Frequency', `Setting frequency to ${value} minutes.`);
        }
    };

    const handleTimeChange = (field: 'startTime' | 'endTime', time: string) => {
        onScheduleChange({
            ...schedule,
            [field]: time,
        });
    };

    const handleScheduleOptionToggle = (field: keyof typeof schedule) => {
        if (field === 'enabled') return; // Handled separately
        onScheduleChange({
            ...schedule,
            [field]: !schedule[field as keyof typeof schedule],
        });
    };

    const styles = createStyles(theme, isMobile);

    return (
        <View style={[style]} testID={testID}>
            <View style={styles.header}>
                <Text style={styles.title}>Call Frequency</Text>
                <Text style={styles.description}>
                    Choose how often you want to receive fake calls
                </Text>
            </View>

            <View style={styles.frequencyOptions}>
                {frequencyOptions.map((option) => {
                    const isSelected = frequency === option.value;
                    const isDisabled = option.value === 'custom' && !isProTier;
                    const isDisabledByChoice = option.value === 'never';

                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.frequencyOption,
                                isSelected && styles.frequencyOptionSelected,
                                isDisabled && styles.frequencyOptionDisabled,
                            ]}
                            onPress={() => handleFrequencySelect(option.value as typeof frequency)}
                            disabled={isDisabled || isDisabledByChoice}
                            accessibilityLabel={`Select ${option.label} frequency`}
                            accessibilityRole="radio"
                            accessibilityState={{
                                selected: isSelected,
                                disabled: isDisabled || isDisabledByChoice,
                            }}
                        >
                            <View style={styles.frequencyOptionContent}>
                                <View style={styles.frequencyOptionHeader}>
                                    <Text style={[
                                        styles.frequencyOptionLabel,
                                        isSelected && styles.frequencyOptionLabelSelected,
                                        isDisabled && styles.frequencyOptionLabelDisabled,
                                    ]}>
                                        {option.label}
                                        {isDisabled && ' 🔒'}
                                    </Text>
                                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={[
                                    styles.frequencyOptionDescription,
                                    isSelected && styles.frequencyOptionDescriptionSelected,
                                ]}>
                                    {option.description}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Custom frequency input */}
            {frequency === 'custom' && isProTier && (
                <View style={styles.customFrequencyContainer}>
                    <Input
                        label="Custom Frequency (minutes)"
                        value={customFrequencyMinutes?.toString() || ''}
                        onChangeText={handleCustomFrequencyChange}
                        keyboardType="numeric"
                        placeholder="Enter minutes (5-1440)"
                        helperText="Minimum 5 minutes, maximum 24 hours (1440 minutes)"
                        fullWidth
                    />
                </View>
            )}

            {/* Schedule settings */}
            <View style={styles.scheduleSection}>
                <TouchableOpacity
                    style={styles.scheduleHeader}
                    onPress={() => setShowSchedule(!showSchedule)}
                    accessibilityLabel={showSchedule ? 'Hide schedule settings' : 'Show schedule settings'}
                >
                    <View style={styles.scheduleHeaderLeft}>
                        <Text style={styles.scheduleTitle}>Schedule Settings</Text>
                        <Text style={styles.scheduleSubtitle}>
                            {schedule.enabled ? 'Active' : 'Disabled'}
                        </Text>
                    </View>
                    <Text style={styles.chevron}>
                        {showSchedule ? '▲' : '▼'}
                    </Text>
                </TouchableOpacity>

                {showSchedule && (
                    <View style={styles.scheduleContent}>
                        <TouchableOpacity
                            style={[
                                styles.toggleOption,
                                schedule.enabled && styles.toggleOptionActive,
                            ]}
                            onPress={handleScheduleToggle}
                            accessibilityRole="switch"
                            accessibilityState={{ checked: schedule.enabled }}
                        >
                            <Text style={[
                                styles.toggleLabel,
                                schedule.enabled && styles.toggleLabelActive,
                            ]}>
                                Enable Schedule
                            </Text>
                            <Text style={[
                                styles.toggleValue,
                                schedule.enabled && styles.toggleValueActive,
                            ]}>
                                {schedule.enabled ? 'ON' : 'OFF'}
                            </Text>
                        </TouchableOpacity>

                        {schedule.enabled && (
                            <>
                                {/* Time range */}
                                <View style={styles.timeRangeContainer}>
                                    <Input
                                        label="Start Time"
                                        value={schedule.startTime}
                                        onChangeText={(time) => handleTimeChange('startTime', time)}
                                        placeholder="09:00"
                                        helperText="Format: HH:MM (24-hour)"
                                        keyboardType="numeric"
                                        fullWidth
                                        containerStyle={styles.timeInput}
                                    />
                                    <Input
                                        label="End Time"
                                        value={schedule.endTime}
                                        onChangeText={(time) => handleTimeChange('endTime', time)}
                                        placeholder="17:00"
                                        helperText="Format: HH:MM (24-hour)"
                                        keyboardType="numeric"
                                        fullWidth
                                        containerStyle={styles.timeInput}
                                    />
                                </View>

                                {/* Schedule options */}
                                <View style={styles.scheduleOptions}>
                                    <TouchableOpacity
                                        style={styles.optionItem}
                                        onPress={() => handleScheduleOptionToggle('workDaysOnly')}
                                        accessibilityRole="switch"
                                        accessibilityState={{ checked: schedule.workDaysOnly }}
                                    >
                                        <Text style={styles.optionItemText}>Work Days Only</Text>
                                        <Text style={styles.optionItemState}>
                                            {schedule.workDaysOnly ? 'ON' : 'OFF'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.optionItem}
                                        onPress={() => handleScheduleOptionToggle('avoidMeetings')}
                                        accessibilityRole="switch"
                                        accessibilityState={{ checked: schedule.avoidMeetings }}
                                    >
                                        <Text style={styles.optionItemText}>Avoid During Meetings</Text>
                                        <Text style={styles.optionItemState}>
                                            {schedule.avoidMeetings ? 'ON' : 'OFF'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.optionItem}
                                        onPress={() => handleScheduleOptionToggle('avoidFocusMode')}
                                        accessibilityRole="switch"
                                        accessibilityState={{ checked: schedule.avoidFocusMode }}
                                    >
                                        <Text style={styles.optionItemText}>Avoid During Focus Mode</Text>
                                        <Text style={styles.optionItemState}>
                                            {schedule.avoidFocusMode ? 'ON' : 'OFF'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const createStyles = (theme: any, isMobile: boolean) => StyleSheet.create({
    header: {
        marginBottom: theme.spacing.scale.lg,
    },
    title: {
        fontSize: theme.typography.text.heading.h3.fontSize,
        fontWeight: theme.typography.text.heading.h3.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.xs,
    },
    description: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.secondary,
    },
    frequencyOptions: {
        gap: theme.spacing.scale.sm,
        marginBottom: theme.spacing.scale.lg,
    },
    frequencyOption: {
        borderWidth: 2,
        borderColor: theme.colors.system.border.light,
        borderRadius: theme.spacing.scale.md,
        padding: theme.spacing.scale.md,
        backgroundColor: theme.colors.system.background.primary,
    },
    frequencyOptionSelected: {
        borderColor: theme.colors.brand.primary[600],
        backgroundColor: theme.colors.brand.primary[50],
    },
    frequencyOptionDisabled: {
        opacity: 0.5,
        borderColor: theme.colors.system.border.light,
    },
    frequencyOptionContent: {
        gap: theme.spacing.scale.xs,
    },
    frequencyOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    frequencyOptionLabel: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
    },
    frequencyOptionLabelSelected: {
        color: theme.colors.brand.primary[600],
    },
    frequencyOptionLabelDisabled: {
        color: theme.colors.system.text.disabled,
    },
    frequencyOptionDescription: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    frequencyOptionDescriptionSelected: {
        color: theme.colors.brand.primary[600],
    },
    checkmark: {
        fontSize: 18,
        color: theme.colors.brand.primary[600],
        fontWeight: 'bold',
    },
    customFrequencyContainer: {
        marginBottom: theme.spacing.scale.lg,
    },
    scheduleSection: {
        borderWidth: 1,
        borderColor: theme.colors.system.border.light,
        borderRadius: theme.spacing.scale.md,
        overflow: 'hidden',
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.scale.md,
        backgroundColor: theme.colors.system.background.secondary,
    },
    scheduleHeaderLeft: {
        flex: 1,
    },
    scheduleTitle: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: 2,
    },
    scheduleSubtitle: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        textTransform: 'uppercase',
    },
    chevron: {
        fontSize: 14,
        color: theme.colors.system.text.secondary,
    },
    scheduleContent: {
        padding: theme.spacing.scale.md,
        gap: theme.spacing.scale.md,
    },
    toggleOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.scale.sm,
        backgroundColor: theme.colors.system.background.primary,
        borderRadius: theme.spacing.scale.sm,
    },
    toggleOptionActive: {
        backgroundColor: theme.colors.brand.primary[50],
    },
    toggleLabel: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.primary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    toggleLabelActive: {
        color: theme.colors.brand.primary[600],
    },
    toggleValue: {
        fontSize: theme.typography.text.label.base.fontSize,
        color: theme.colors.system.text.secondary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        textTransform: 'uppercase',
    },
    toggleValueActive: {
        color: theme.colors.brand.primary[600],
    },
    timeRangeContainer: {
        flexDirection: isMobile ? 'column' : 'row',
        gap: theme.spacing.scale.md,
    },
    timeInput: {
        flex: isMobile ? undefined : 1,
    },
    scheduleOptions: {
        gap: theme.spacing.scale.sm,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.scale.sm,
        backgroundColor: theme.colors.system.background.primary,
        borderRadius: theme.spacing.scale.sm,
    },
    optionItemText: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.primary,
        flex: 1,
    },
    optionItemState: {
        fontSize: theme.typography.text.label.base.fontSize,
        color: theme.colors.system.text.secondary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        textTransform: 'uppercase',
    },
});

export default CallFrequencyConfig;