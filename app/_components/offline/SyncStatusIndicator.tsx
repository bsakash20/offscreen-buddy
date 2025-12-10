/**
 * Sync Status Indicator Component
 * Shows real-time sync status with actionable controls
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useOfflineSync, useOfflineStorage } from '../../_hooks/useOfflineData';
import { SyncStatus, SyncProgress } from '../../_services/offline/types';
import { colorTokens } from '../../_design-system/tokens/colors';
import { spacing } from '../../_design-system/tokens/spacing';

// Get current color tokens (light mode by default)
const colors = colorTokens.light;

const getSemanticColor = (type: 'success' | 'warning' | 'error' | 'info') => {
    return colors.semantic[type].main;
};

interface SyncStatusIndicatorProps {
    showDetails?: boolean;
    compact?: boolean;
    onSyncPress?: () => void;
    onSettingsPress?: () => void;
}

export function SyncStatusIndicator({
    showDetails = false,
    compact = false,
    onSyncPress,
    onSettingsPress
}: SyncStatusIndicatorProps) {
    const {
        isSyncing,
        progress,
        conflicts,
        queueSize,
        triggerSync,
        serviceStatus
    } = useOfflineSync();

    const { getStorageInfo } = useOfflineStorage();
    const [animation] = useState(new Animated.Value(0));

    const storageInfo = getStorageInfo();

    useEffect(() => {
        // Animate when syncing
        if (isSyncing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animation, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animation, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            animation.setValue(0);
        }
    }, [isSyncing]);

    const getStatusIcon = () => {
        if (isSyncing) return 'sync';
        if (conflicts.length > 0) return 'alert-circle';
        if (queueSize > 0) return 'clock-outline';
        if (storageInfo.isOffline) return 'wifi-off';
        return 'wifi';
    };

    const getStatusColor = () => {
        if (isSyncing) return colors.brand.primary[500];
        if (conflicts.length > 0) return getSemanticColor('warning');
        if (queueSize > 0) return getSemanticColor('info');
        if (storageInfo.isOffline) return getSemanticColor('error');
        return getSemanticColor('success');
    };

    const getStatusText = () => {
        if (isSyncing) return 'Syncing...';
        if (conflicts.length > 0) return `${conflicts.length} conflicts`;
        if (queueSize > 0) return `${queueSize} pending`;
        if (storageInfo.isOffline) return 'Offline';
        return 'Synced';
    };

    const getDetailedStatusText = () => {
        if (isSyncing) {
            return `Syncing: ${progress.percentage}% (${progress.completedOperations}/${progress.totalOperations})`;
        }
        if (conflicts.length > 0) {
            return `Resolve ${conflicts.length} sync conflict${conflicts.length > 1 ? 's' : ''}`;
        }
        if (queueSize > 0) {
            return `Sync ${queueSize} operation${queueSize > 1 ? 's' : ''} when online`;
        }
        if (storageInfo.isOffline) {
            return 'Working offline - changes will sync when connected';
        }
        return 'All data synchronized';
    };

    const handleSyncPress = async () => {
        if (onSyncPress) {
            onSyncPress();
        } else {
            try {
                await triggerSync();
            } catch (error) {
                console.error('Manual sync failed:', error);
            }
        }
    };

    const spin = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (compact) {
        return (
            <TouchableOpacity
                style={styles.compactContainer}
                onPress={handleSyncPress}
                disabled={isSyncing}
            >
                <Animated.View style={[styles.iconContainer, { transform: [{ rotate: spin }] }]}>
                    <MaterialCommunityIcons
                        name={getStatusIcon()}
                        size={16}
                        color={getStatusColor()}
                    />
                </Animated.View>
                <Text style={[styles.compactText, { color: getStatusColor() }]}>
                    {getStatusText()}
                </Text>
                {queueSize > 0 && (
                    <View style={styles.queueBadge}>
                        <Text style={styles.queueBadgeText}>{queueSize}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.statusRow}>
                <Animated.View style={[styles.iconContainer, { transform: [{ rotate: spin }] }]}>
                    <MaterialCommunityIcons
                        name={getStatusIcon()}
                        size={24}
                        color={getStatusColor()}
                    />
                </Animated.View>

                <View style={styles.textContainer}>
                    <Text style={styles.statusText}>{getStatusText()}</Text>
                    {showDetails && (
                        <Text style={styles.detailText}>
                            {getDetailedStatusText()}
                        </Text>
                    )}
                </View>

                <View style={styles.actionsContainer}>
                    {queueSize > 0 && !storageInfo.isOffline && (
                        <TouchableOpacity
                            style={styles.syncButton}
                            onPress={handleSyncPress}
                            disabled={isSyncing}
                        >
                            <MaterialCommunityIcons
                                name="sync"
                                size={20}
                                color={colors.brand.primary[500]}
                            />
                        </TouchableOpacity>
                    )}

                    {onSettingsPress && (
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={onSettingsPress}
                        >
                            <MaterialCommunityIcons
                                name="cog"
                                size={20}
                                color={colors.system.text.secondary}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {showDetails && (
                <View style={styles.detailsContainer}>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Storage:</Text>
                        <Text style={styles.statValue}>
                            {Math.round(storageInfo.usagePercentage)}% used
                        </Text>
                    </View>

                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${storageInfo.usagePercentage}%` }
                            ]}
                        />
                    </View>

                    {isSyncing && progress.totalOperations > 0 && (
                        <View style={styles.syncProgressContainer}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Sync Progress:</Text>
                                <Text style={styles.statValue}>
                                    {progress.completedOperations}/{progress.totalOperations}
                                </Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progress.percentage}%` }
                                    ]}
                                />
                            </View>
                        </View>
                    )}
                </View>
            )}

            {conflicts.length > 0 && (
                <View style={styles.conflictWarning}>
                    <MaterialCommunityIcons
                        name="alert"
                        size={16}
                        color={getSemanticColor('warning')}
                    />
                    <Text style={styles.conflictText}>
                        Sync conflicts detected. Tap to resolve.
                    </Text>
                    <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => {/* Navigate to conflict resolution */ }}
                    >
                        <Text style={styles.resolveButtonText}>Resolve</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.system.background.surface,
        borderRadius: 8,
        padding: spacing.md,
        marginVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.system.border.light,
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.system.background.surface,
        borderRadius: 16,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginHorizontal: spacing.xs,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: spacing.sm,
    },
    textContainer: {
        flex: 1,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.system.text.primary,
    },
    detailText: {
        fontSize: 14,
        color: colors.system.text.secondary,
        marginTop: 2,
    },
    compactText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: spacing.xs,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    syncButton: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
    },
    settingsButton: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    queueBadge: {
        backgroundColor: colors.semantic.warning.main,
        borderRadius: 16,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.xs,
    },
    queueBadgeText: {
        color: colors.system.background.surface,
        fontSize: 12,
        fontWeight: '600',
    },
    detailsContainer: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.system.border.light,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    statLabel: {
        fontSize: 14,
        color: colors.system.text.secondary,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.system.text.primary,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.system.border.light,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.brand.primary[500],
        borderRadius: 2,
    },
    syncProgressContainer: {
        marginTop: spacing.md,
    },
    conflictWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.warning.background,
        borderRadius: 4,
        padding: spacing.sm,
        marginTop: spacing.md,
    },
    conflictText: {
        flex: 1,
        fontSize: 14,
        color: colors.system.text.primary,
        marginLeft: spacing.sm,
    },
    resolveButton: {
        backgroundColor: colors.semantic.warning.main,
        borderRadius: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    resolveButtonText: {
        color: colors.system.background.surface,
        fontSize: 12,
        fontWeight: '600',
    },
});

export default SyncStatusIndicator;