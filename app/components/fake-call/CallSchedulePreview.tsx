/**
 * Call Schedule Preview Component
 * Shows a preview of when fake calls will occur based on current settings
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { useResponsive } from '../../design-system/utils/responsive';

export interface CallSchedulePreviewProps {
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
    voiceProfileId: string;
    callerInfo: {
        id: string;
        name: string;
        phoneNumber: string;
        callerType: 'business' | 'personal' | 'emergency' | 'unknown';
        riskLevel: 'low' | 'medium' | 'high';
    };
    isProTier: boolean;
    style?: any;
    testID?: string;
}

const CallSchedulePreview: React.FC<CallSchedulePreviewProps> = ({
    frequency,
    customFrequencyMinutes,
    schedule,
    voiceProfileId,
    callerInfo,
    isProTier,
    style,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();
    const [activeView, setActiveView] = useState<'week' | 'day'>('week');

    // Generate next call schedule based on current settings
    const generateSchedule = () => {
        const now = new Date();
        const scheduleList: Array<{
            date: Date;
            time: string;
            day: string;
            reason?: string;
        }> = [];

        if (frequency === 'never') {
            return [];
        }

        // Calculate next calls for the next 7 days
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(now);
            currentDate.setDate(now.getDate() + day);

            // Skip if work days only and it's weekend
            if (schedule.workDaysOnly && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
                continue;
            }

            // Parse start and end times
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

            let callTime: Date | null = null;
            let reason = '';

            switch (frequency) {
                case 'hourly':
                    // During active hours
                    callTime = new Date(currentDate);
                    callTime.setHours(startHour, 0, 0, 0);
                    reason = 'Regular hourly call';
                    break;

                case 'daily':
                    // Once per day during active hours
                    callTime = new Date(currentDate);
                    callTime.setHours(startHour, startMinute, 0, 0);
                    reason = 'Daily call';
                    break;

                case 'weekly':
                    // Once per week (e.g., Mondays)
                    if (currentDate.getDay() === 1) { // Monday
                        callTime = new Date(currentDate);
                        callTime.setHours(startHour, startMinute, 0, 0);
                        reason = 'Weekly call';
                    }
                    break;

                case 'custom':
                    // Custom interval (simplified for preview)
                    if (customFrequencyMinutes) {
                        if (customFrequencyMinutes >= 60) {
                            // For intervals >= 1 hour, show one call per day
                            callTime = new Date(currentDate);
                            callTime.setHours(startHour, startMinute, 0, 0);
                            reason = `Every ${customFrequencyMinutes} minutes`;
                        } else {
                            // For shorter intervals, show multiple calls
                            const callsPerDay = Math.floor((24 * 60) / customFrequencyMinutes);
                            for (let i = 0; i < Math.min(callsPerDay, 3); i++) { // Limit to 3 calls per day for preview
                                const customCallTime = new Date(currentDate);
                                const hourOffset = Math.floor((i * customFrequencyMinutes) / 60);
                                const minuteOffset = (i * customFrequencyMinutes) % 60;
                                customCallTime.setHours(startHour + hourOffset, startMinute + minuteOffset, 0, 0);

                                if (customCallTime.getHours() < endHour ||
                                    (customCallTime.getHours() === endHour && customCallTime.getMinutes() <= endMinute)) {
                                    scheduleList.push({
                                        date: customCallTime,
                                        time: customCallTime.toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        }),
                                        day: customCallTime.toLocaleDateString('en-US', { weekday: 'short' }),
                                        reason: `Every ${customFrequencyMinutes} minutes`,
                                    });
                                }
                            }
                        }
                    }
                    break;
            }

            if (callTime && callTime > now) {
                scheduleList.push({
                    date: callTime,
                    time: callTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    day: callTime.toLocaleDateString('en-US', { weekday: 'short' }),
                    reason,
                });
            }
        }

        return scheduleList.slice(0, 10); // Limit preview to 10 upcoming calls
    };

    const scheduleData = generateSchedule();

    const getFrequencyDescription = () => {
        switch (frequency) {
            case 'never':
                return 'No calls scheduled';
            case 'hourly':
                return 'Calls every hour during active hours';
            case 'daily':
                return 'Calls once per day during active hours';
            case 'weekly':
                return 'Calls once per week during active hours';
            case 'custom':
                return customFrequencyMinutes
                    ? `Calls every ${customFrequencyMinutes} minutes during active hours`
                    : 'Custom frequency set';
            default:
                return 'Unknown frequency';
        }
    };

    const getScheduleSummary = () => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const callsThisWeek = scheduleData.filter(call =>
            call.date >= today && call.date <= nextWeek
        ).length;

        return {
            totalCalls: scheduleData.length,
            callsThisWeek,
            nextCall: scheduleData.length > 0 ? scheduleData[0] : null,
        };
    };

    const summary = getScheduleSummary();

    const styles = createStyles(theme, isMobile);

    if (frequency === 'never') {
        return (
            <View style={[style]} testID={testID}>
                <View style={styles.header}>
                    <Text style={styles.title}>Schedule Preview</Text>
                    <Text style={styles.description}>
                        Fake calls are currently disabled
                    </Text>
                </View>
                <View style={styles.disabledState}>
                    <Text style={styles.disabledIcon}>🚫</Text>
                    <Text style={styles.disabledText}>
                        No calls will be scheduled while frequency is set to "Never"
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[style]} testID={testID}>
            <View style={styles.header}>
                <Text style={styles.title}>Schedule Preview</Text>
                <Text style={styles.description}>
                    {getFrequencyDescription()}
                </Text>
            </View>

            {/* Schedule Summary */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{summary.callsThisWeek}</Text>
                        <Text style={styles.statLabel}>This Week</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{summary.totalCalls}</Text>
                        <Text style={styles.statLabel}>Next 7 Days</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{schedule.enabled ? 'ON' : 'OFF'}</Text>
                        <Text style={styles.statLabel}>Schedule</Text>
                    </View>
                </View>

                {summary.nextCall && (
                    <View style={styles.nextCallCard}>
                        <Text style={styles.nextCallLabel}>Next Call:</Text>
                        <Text style={styles.nextCallTime}>
                            {summary.nextCall.day} at {summary.nextCall.time}
                        </Text>
                        <Text style={styles.nextCallDetails}>
                            {summary.nextCall.reason}
                        </Text>
                    </View>
                )}
            </View>

            {/* Schedule Settings Summary */}
            <View style={styles.settingsSummary}>
                <Text style={styles.settingsTitle}>Active Settings</Text>
                <View style={styles.settingsGrid}>
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Time Range:</Text>
                        <Text style={styles.settingValue}>
                            {schedule.startTime} - {schedule.endTime}
                        </Text>
                    </View>
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Work Days:</Text>
                        <Text style={styles.settingValue}>
                            {schedule.workDaysOnly ? 'Yes' : 'All Days'}
                        </Text>
                    </View>
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Voice Profile:</Text>
                        <Text style={styles.settingValue}>
                            {voiceProfileId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                    </View>
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Caller ID:</Text>
                        <Text style={styles.settingValue}>
                            {callerInfo.name}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Upcoming Calls List */}
            {scheduleData.length > 0 && (
                <View style={styles.upcomingCalls}>
                    <Text style={styles.upcomingTitle}>Upcoming Calls</Text>
                    <ScrollView
                        style={styles.callsList}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                    >
                        {scheduleData.map((call, index) => (
                            <View key={index} style={styles.callItem}>
                                <View style={styles.callItemLeft}>
                                    <Text style={styles.callDay}>{call.day}</Text>
                                    <Text style={styles.callTime}>{call.time}</Text>
                                </View>
                                <View style={styles.callItemRight}>
                                    {call.reason && (
                                        <Text style={styles.callReason}>{call.reason}</Text>
                                    )}
                                    <Text style={styles.callDate}>
                                        {call.date.toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Safety Notes */}
            <View style={styles.safetyNotes}>
                <Text style={styles.safetyTitle}>Safety Features</Text>
                <View style={styles.safetyItem}>
                    <Text style={styles.safetyIcon}>🛡️</Text>
                    <Text style={styles.safetyText}>
                        Emergency numbers are automatically blocked
                    </Text>
                </View>
                {schedule.avoidMeetings && (
                    <View style={styles.safetyItem}>
                        <Text style={styles.safetyIcon}>📅</Text>
                        <Text style={styles.safetyText}>
                            Calls are avoided during scheduled meetings
                        </Text>
                    </View>
                )}
                {schedule.avoidFocusMode && (
                    <View style={styles.safetyItem}>
                        <Text style={styles.safetyIcon}>🎯</Text>
                        <Text style={styles.safetyText}>
                            Calls are paused during focus mode
                        </Text>
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
    disabledState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.scale.xl,
        gap: theme.spacing.scale.md,
    },
    disabledIcon: {
        fontSize: 48,
    },
    disabledText: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.secondary,
        textAlign: 'center',
    },
    summaryCard: {
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.md,
        padding: theme.spacing.scale.lg,
        marginBottom: theme.spacing.scale.lg,
        gap: theme.spacing.scale.md,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        gap: theme.spacing.scale.xs,
    },
    statNumber: {
        fontSize: theme.typography.text.heading.h3.fontSize,
        fontWeight: theme.typography.text.heading.h3.fontWeight.toString() as any,
        color: theme.colors.brand.primary[600],
    },
    statLabel: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.system.border.light,
    },
    nextCallCard: {
        backgroundColor: theme.colors.system.background.primary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.brand.primary[600],
    },
    nextCallLabel: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        marginBottom: 2,
    },
    nextCallTime: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.xs,
    },
    nextCallDetails: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    settingsSummary: {
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.md,
        padding: theme.spacing.scale.lg,
        marginBottom: theme.spacing.scale.lg,
    },
    settingsTitle: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.md,
    },
    settingsGrid: {
        gap: theme.spacing.scale.sm,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.secondary,
        flex: 1,
    },
    settingValue: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.primary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        textAlign: 'right',
        flex: 1,
    },
    upcomingCalls: {
        marginBottom: theme.spacing.scale.lg,
    },
    upcomingTitle: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.md,
    },
    callsList: {
        maxHeight: 200,
    },
    callItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.system.background.primary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        marginBottom: theme.spacing.scale.sm,
    },
    callItemLeft: {
        alignItems: 'flex-start',
        gap: theme.spacing.scale.xs,
    },
    callDay: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.brand.primary[600],
    },
    callTime: {
        fontSize: theme.typography.text.body.base.fontSize,
        color: theme.colors.system.text.primary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    callItemRight: {
        alignItems: 'flex-end',
        gap: theme.spacing.scale.xs,
    },
    callReason: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    callDate: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.tertiary,
    },
    safetyNotes: {
        backgroundColor: theme.colors.semantic.info.background,
        borderRadius: theme.spacing.scale.md,
        padding: theme.spacing.scale.lg,
    },
    safetyTitle: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.md,
    },
    safetyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.scale.sm,
        marginBottom: theme.spacing.scale.sm,
    },
    safetyIcon: {
        fontSize: 16,
        width: 20,
    },
    safetyText: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        flex: 1,
        lineHeight: theme.typography.text.body.sm.lineHeight,
    },
});

export default CallSchedulePreview;