/**
 * Fake Call Toggle Component
 * Main enable/disable control for fake call functionality with Pro tier messaging
 */

import React from 'react';
import {
    View,
    StyleSheet,
    Text,
    Switch,
    Alert,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { useResponsive } from '../../design-system/utils/responsive';
import Card from '../../design-system/components/Card';
import Button from '../../design-system/components/Button';

export interface FakeCallToggleProps {
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    isProTier: boolean;
    onProTierUpgrade: () => void;
    style?: any;
    testID?: string;
}

const FakeCallToggle: React.FC<FakeCallToggleProps> = ({
    isEnabled,
    onToggle,
    isProTier,
    onProTierUpgrade,
    style,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();

    const handleToggle = (newValue: boolean) => {
        if (newValue && !isProTier) {
            Alert.alert(
                'Pro Feature',
                'Fake call functionality requires a Pro tier subscription. Would you like to upgrade?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Upgrade to Pro',
                        onPress: onProTierUpgrade,
                    },
                ]
            );
            return;
        }

        onToggle(newValue);
    };

    const styles = createStyles(theme, isMobile);

    return (
        <Card variant="elevated" padding="lg" style={style || styles.container} testID={testID}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Fake Call System</Text>
                    <Switch
                        value={isEnabled}
                        onValueChange={handleToggle}
                        trackColor={{
                            false: theme.colors.system.border.light,
                            true: theme.colors.brand.primary[600],
                        }}
                        thumbColor={isEnabled ? theme.colors.system.background.primary : theme.colors.system.text.secondary}
                        accessibilityLabel="Enable or disable fake call functionality"
                        accessibilityRole="switch"
                        accessibilityState={{ checked: isEnabled }}
                    />
                </View>

                <View style={styles.description}>
                    <Text style={styles.descriptionText}>
                        {isEnabled
                            ? 'Your device will receive carefully timed fake calls to help you exit uncomfortable situations.'
                            : 'Receive fake calls to gracefully exit meetings, conversations, or social situations.'
                        }
                    </Text>
                </View>

                {!isProTier && (
                    <View style={styles.proNotice}>
                        <Text style={styles.proNoticeText}>
                            🔒 Pro features available: custom frequencies, advanced voice profiles, and caller ID management.
                        </Text>
                        <Button
                            variant="outline"
                            size="sm"
                            onPress={onProTierUpgrade}
                            accessibilityLabel="Upgrade to Pro tier"
                        >
                            Upgrade to Pro
                        </Button>
                    </View>
                )}

                {isEnabled && (
                    <View style={styles.status}>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Status:</Text>
                            <Text style={[styles.statusValue, styles.statusActive]}>Active</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Mode:</Text>
                            <Text style={styles.statusValue}>
                                {isProTier ? 'Pro Tier' : 'Free Tier'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </Card>
    );
};

const createStyles = (theme: any, isMobile: boolean) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.system.background.surface,
    },
    content: {
        gap: theme.spacing.scale.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: theme.typography.text.heading.h3.fontSize,
        fontWeight: theme.typography.text.heading.h3.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        flex: 1,
    },
    description: {
        paddingVertical: theme.spacing.scale.sm,
    },
    descriptionText: {
        fontSize: theme.typography.text.body.base.fontSize,
        lineHeight: theme.typography.text.body.base.lineHeight,
        color: theme.colors.system.text.secondary,
    },
    proNotice: {
        backgroundColor: theme.colors.brand.primary[50],
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.brand.primary[600],
    },
    proNoticeText: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        marginBottom: theme.spacing.scale.sm,
    },
    status: {
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        gap: theme.spacing.scale.xs,
    },
    statusItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    statusValue: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.primary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    statusActive: {
        color: theme.colors.semantic.success.main,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
});

export default FakeCallToggle;