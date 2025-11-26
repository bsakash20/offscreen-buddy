/**
 * Pro Tier Feature Gate Component
 * Provides feature gating with upgrade prompts for Pro tier functionality
 */

import React from 'react';
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
import Card from '../../design-system/components/Card';

export interface ProTierFeatureGateProps {
    isProTier: boolean;
    featureName: string;
    requiredTier: 'pro' | 'premium';
    onUpgrade: () => void;
    children: React.ReactNode;
    showUpgradePrompt?: boolean;
    upgradeMessage?: string;
    style?: any;
    testID?: string;
}

const ProTierFeatureGate: React.FC<ProTierFeatureGateProps> = ({
    isProTier,
    featureName,
    requiredTier,
    onUpgrade,
    children,
    showUpgradePrompt = true,
    upgradeMessage,
    style,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();

    const handleUpgradePress = () => {
        if (upgradeMessage) {
            Alert.alert(
                `${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Tier Required`,
                upgradeMessage,
                [
                    { text: 'Maybe Later', style: 'cancel' },
                    {
                        text: 'Upgrade Now',
                        onPress: onUpgrade,
                    },
                ]
            );
        } else {
            onUpgrade();
        }
    };

    const styles = createStyles(theme, isMobile);

    if (isProTier) {
        return (
            <View style={style} testID={testID}>
                {children}
            </View>
        );
    }

    // Show upgrade prompt for non-Pro users
    return (
        <View style={style} testID={testID}>
            <Card variant="outlined" padding="lg" style={styles.gateCard}>
                <View style={styles.gateContent}>
                    <View style={styles.gateHeader}>
                        <Text style={styles.gateIcon}>🔒</Text>
                        <View style={styles.gateText}>
                            <Text style={styles.gateTitle}>{featureName}</Text>
                            <Text style={styles.gateSubtitle}>
                                {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} tier required
                            </Text>
                        </View>
                    </View>

                    {showUpgradePrompt && (
                        <View style={styles.gateActions}>
                            <Button
                                variant="primary"
                                size="md"
                                fullWidth
                                onPress={handleUpgradePress}
                                accessibilityLabel={`Upgrade to ${requiredTier} tier to access ${featureName}`}
                            >
                                Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
                            </Button>
                        </View>
                    )}

                    <View style={styles.benefitsList}>
                        <Text style={styles.benefitsTitle}>Included benefits:</Text>
                        {getBenefitsForFeature(featureName).map((benefit, index) => (
                            <View key={index} style={styles.benefitItem}>
                                <Text style={styles.benefitIcon}>✓</Text>
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </Card>

            {/* Show disabled preview of the actual feature */}
            <View style={styles.previewContainer}>
                {children}
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.overlayContent}
                        onPress={handleUpgradePress}
                        activeOpacity={0.8}
                        accessibilityLabel={`Tap to upgrade to ${requiredTier} tier`}
                    >
                        <Text style={styles.overlayText}>🔒 Upgrade Required</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const getBenefitsForFeature = (featureName: string): string[] => {
    const benefitMap: Record<string, string[]> = {
        'Custom Caller IDs': [
            'Personal caller ID selection',
            'Professional contact database',
            'Geographic number patterns',
            'Emergency number protection',
        ],
        'Advanced Voice Profiles': [
            'Premium voice synthesis',
            'Voice speed and pitch control',
            'Multiple voice styles',
            'Accessibility-optimized voices',
        ],
        'Custom Frequency': [
            'Any frequency from 5 minutes',
            'Smart scheduling options',
            'Context-aware timing',
            'Priority call management',
        ],
        'Extended Scheduling': [
            'Advanced time range settings',
            'Meeting avoidance',
            'Focus mode integration',
            'Timezone support',
        ],
        'Pro Tier Features': [
            'All free tier features',
            'Unlimited calls',
            'Advanced customization',
            'Priority support',
        ],
    };

    return benefitMap[featureName] || [
        'Enhanced functionality',
        'Premium support',
        'Priority features',
    ];
};

const createStyles = (theme: any, isMobile: boolean) => StyleSheet.create({
    gateCard: {
        backgroundColor: theme.colors.system.background.secondary,
        borderColor: theme.colors.brand.primary[300],
        borderWidth: 2,
    },
    gateContent: {
        gap: theme.spacing.scale.md,
    },
    gateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.scale.md,
    },
    gateIcon: {
        fontSize: 24,
        textAlign: 'center',
    },
    gateText: {
        flex: 1,
    },
    gateTitle: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: 2,
    },
    gateSubtitle: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    gateActions: {
        marginTop: theme.spacing.scale.sm,
    },
    benefitsList: {
        backgroundColor: theme.colors.system.background.primary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        gap: theme.spacing.scale.sm,
    },
    benefitsTitle: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.xs,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.scale.sm,
    },
    benefitIcon: {
        fontSize: 14,
        color: theme.colors.semantic.success.main,
        width: 16,
    },
    benefitText: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        flex: 1,
    },
    previewContainer: {
        position: 'relative',
        marginTop: theme.spacing.scale.sm,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.system.background.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.spacing.scale.sm,
    },
    overlayContent: {
        backgroundColor: theme.colors.system.background.surface,
        paddingHorizontal: theme.spacing.scale.lg,
        paddingVertical: theme.spacing.scale.md,
        borderRadius: theme.spacing.scale.md,
        elevation: 4,
        shadowColor: theme.colors.system.shadow.large,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    overlayText: {
        fontSize: theme.typography.text.body.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.brand.primary[600],
        textAlign: 'center',
    },
});

export default ProTierFeatureGate;