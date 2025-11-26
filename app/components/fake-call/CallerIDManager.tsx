/**
 * Caller ID Manager Component
 * Manages caller ID selection with safety validation and Pro tier features
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';
import { useResponsive } from '../../design-system/utils/responsive';
import Button from '../../design-system/components/Button';
import Input from '../../design-system/components/Input';

export interface CallerIDManagerProps {
    callerInfo: {
        id: string;
        name: string;
        phoneNumber: string;
        callerType: 'business' | 'personal' | 'emergency' | 'unknown';
        riskLevel: 'low' | 'medium' | 'high';
    };
    isProTier: boolean;
    onCallerIDChange: (callerInfo: any) => void;
    style?: any;
    testID?: string;
}

// Predefined safe caller IDs for free tier
const freeTierCallerIDs = [
    {
        id: 'business_default',
        name: 'John Smith',
        phoneNumber: '+1-555-0123',
        callerType: 'business' as const,
        riskLevel: 'low' as const,
        isDefault: true,
    },
    {
        id: 'business_alt',
        name: 'Sarah Johnson',
        phoneNumber: '+1-555-0456',
        callerType: 'business' as const,
        riskLevel: 'low' as const,
    },
] as const;

// Pro tier caller IDs
const proTierCallerIDs = [
    ...freeTierCallerIDs,
    {
        id: 'personal_family',
        name: 'Mom',
        phoneNumber: '+1-555-0789',
        callerType: 'personal' as const,
        riskLevel: 'low' as const,
    },
    {
        id: 'personal_friend',
        name: 'Mike Wilson',
        phoneNumber: '+1-555-0234',
        callerType: 'personal' as const,
        riskLevel: 'medium' as const,
    },
    {
        id: 'business_partner',
        name: 'ABC Consulting',
        phoneNumber: '+1-555-0567',
        callerType: 'business' as const,
        riskLevel: 'low' as const,
    },
    {
        id: 'business_local',
        name: 'Local Restaurant',
        phoneNumber: '+1-555-0890',
        callerType: 'business' as const,
        riskLevel: 'medium' as const,
    },
] as const;

const CallerIDManager: React.FC<CallerIDManagerProps> = ({
    callerInfo,
    isProTier,
    onCallerIDChange,
    style,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();
    const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
    const [customName, setCustomName] = useState('');
    const [customPhone, setCustomPhone] = useState('');
    const [customType, setCustomType] = useState<'business' | 'personal'>('business');

    const availableCallerIDs = isProTier ? proTierCallerIDs : freeTierCallerIDs;

    const handleCallerIDSelect = (callerID: typeof availableCallerIDs[0]) => {
        if (callerID.riskLevel === 'high' && !isProTier) {
            Alert.alert(
                'Safety Warning',
                'This caller ID has been flagged for safety. Pro tier users can override safety warnings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Pro Users Only',
                        style: 'destructive',
                        onPress: () => {
                            // TODO: Show upgrade prompt
                        },
                    },
                ]
            );
            return;
        }

        if (callerID.riskLevel === 'medium' && !isProTier) {
            Alert.alert(
                'Safety Check',
                'This caller ID has moderate risk. Would you like to use it?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Use Anyway',
                        onPress: () => onCallerIDChange(callerID),
                    },
                ]
            );
            return;
        }

        onCallerIDChange(callerID);
    };

    const validateCustomCallerID = (): boolean => {
        // Basic phone number validation
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(customPhone)) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
            return false;
        }

        // Check for emergency numbers
        const emergencyPatterns = [
            /^(911|112|999)$/, // US/International emergency
            /^emergency/i, // Contains emergency
            /police/i, // Police impersonation
            /fire/i, // Fire department
            /hospital/i, // Hospital
        ];

        const isEmergency = emergencyPatterns.some(pattern =>
            pattern.test(customPhone) || pattern.test(customName)
        );

        if (isEmergency) {
            Alert.alert(
                'Safety Blocked',
                'Emergency service numbers and their variations are blocked for safety.',
                [{ text: 'OK', style: 'default' }]
            );
            return false;
        }

        return true;
    };

    const handleCustomCallerIDCreate = () => {
        if (!customName.trim() || !customPhone.trim()) {
            Alert.alert('Missing Information', 'Please enter both name and phone number.');
            return;
        }

        if (!validateCustomCallerID()) {
            return;
        }

        if (!isProTier) {
            Alert.alert(
                'Pro Feature',
                'Custom caller ID creation requires a Pro tier subscription.',
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

        const newCallerID = {
            id: `custom_${Date.now()}`,
            name: customName,
            phoneNumber: customPhone,
            callerType: customType,
            riskLevel: 'medium' as const, // Default to medium for custom IDs
        };

        onCallerIDChange(newCallerID);
        setCustomName('');
        setCustomPhone('');
        setCustomType('business');
    };

    const getRiskLevelColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low':
                return theme.colors.semantic.success.main;
            case 'medium':
                return theme.colors.semantic.warning.main;
            case 'high':
                return theme.colors.semantic.error.main;
            default:
                return theme.colors.system.text.secondary;
        }
    };

    const getRiskLevelIcon = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low':
                return '🟢';
            case 'medium':
                return '🟡';
            case 'high':
                return '🔴';
            default:
                return '⚪';
        }
    };

    const renderCallerIDOption = (callerID: typeof availableCallerIDs[0]) => {
        const isSelected = callerInfo.id === callerID.id;
        const hasRisk = callerID.riskLevel === 'high' || (callerID.riskLevel === 'medium' && !isProTier);

        return (
            <TouchableOpacity
                key={callerID.id}
                style={[
                    styles.callerIDOption,
                    isSelected && styles.callerIDOptionSelected,
                    hasRisk && styles.callerIDOptionWarning,
                ]}
                onPress={() => handleCallerIDSelect(callerID)}
                accessibilityLabel={`Select ${callerID.name} as caller ID`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
            >
                <View style={styles.callerIDOptionContent}>
                    <View style={styles.callerIDOptionHeader}>
                        <View style={styles.callerIDOptionInfo}>
                            <View style={styles.callerIDNameRow}>
                                <Text style={[
                                    styles.callerIDName,
                                    isSelected && styles.callerIDNameSelected,
                                ]}>
                                    {callerID.name}
                                </Text>
                                {callerID.isDefault && (
                                    <Text style={styles.defaultBadge}>DEFAULT</Text>
                                )}
                            </View>
                            <Text style={styles.callerIDPhone}>{callerID.phoneNumber}</Text>
                            <Text style={styles.callerIDType}>
                                {callerID.callerType.charAt(0).toUpperCase() + callerID.callerType.slice(1)}
                            </Text>
                        </View>
                        <View style={styles.callerIDMeta}>
                            <Text style={styles.riskIndicator}>
                                {getRiskLevelIcon(callerID.riskLevel)} {callerID.riskLevel.toUpperCase()}
                            </Text>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const styles = createStyles(theme, isMobile);

    return (
        <View style={style} testID={testID}>
            <View style={styles.header}>
                <Text style={styles.title}>Caller ID</Text>
                <Text style={styles.description}>
                    Choose who appears when you receive a fake call
                </Text>
            </View>

            {/* Safety Notice */}
            <View style={styles.safetyNotice}>
                <Text style={styles.safetyNoticeIcon}>🛡️</Text>
                <Text style={styles.safetyNoticeText}>
                    All caller IDs are automatically validated for safety. Emergency numbers and their variations are blocked.
                </Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'presets' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('presets')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === 'presets' }}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'presets' && styles.tabTextActive,
                    ]}>
                        Presets
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'custom' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('custom')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === 'custom' }}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'custom' && styles.tabTextActive,
                    ]}>
                        Custom
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Current Selection */}
            <View style={styles.currentSelection}>
                <Text style={styles.currentSelectionLabel}>Current Selection:</Text>
                <View style={styles.currentSelectionDisplay}>
                    <Text style={styles.currentSelectionName}>{callerInfo.name}</Text>
                    <Text style={styles.currentSelectionPhone}>{callerInfo.phoneNumber}</Text>
                    <Text style={[
                        styles.currentSelectionRisk,
                        { color: getRiskLevelColor(callerInfo.riskLevel) }
                    ]}>
                        {getRiskLevelIcon(callerInfo.riskLevel)} {callerInfo.riskLevel.toUpperCase()} RISK
                    </Text>
                </View>
            </View>

            {/* Presets Tab */}
            {activeTab === 'presets' && (
                <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>Available Caller IDs</Text>
                    <View style={styles.callerIDList}>
                        {availableCallerIDs.map(renderCallerIDOption)}
                    </View>
                </ScrollView>
            )}

            {/* Custom Tab */}
            {activeTab === 'custom' && (
                <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>Create Custom Caller ID</Text>
                    <View style={styles.customForm}>
                        <Input
                            label="Name"
                            value={customName}
                            onChangeText={setCustomName}
                            placeholder="Enter caller name"
                            helperText="Name to display on caller ID"
                            fullWidth
                        />

                        <Input
                            label="Phone Number"
                            value={customPhone}
                            onChangeText={setCustomPhone}
                            placeholder="+1-555-0123"
                            helperText="Phone number format: +country-number"
                            keyboardType="phone-pad"
                            fullWidth
                        />

                        <View style={styles.callerTypeSelector}>
                            <Text style={styles.callerTypeLabel}>Caller Type:</Text>
                            <View style={styles.callerTypeOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.callerTypeOption,
                                        customType === 'business' && styles.callerTypeOptionSelected,
                                    ]}
                                    onPress={() => setCustomType('business')}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: customType === 'business' }}
                                >
                                    <Text style={[
                                        styles.callerTypeOptionText,
                                        customType === 'business' && styles.callerTypeOptionTextSelected,
                                    ]}>
                                        Business
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.callerTypeOption,
                                        customType === 'personal' && styles.callerTypeOptionSelected,
                                    ]}
                                    onPress={() => setCustomType('personal')}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: customType === 'personal' }}
                                >
                                    <Text style={[
                                        styles.callerTypeOptionText,
                                        customType === 'personal' && styles.callerTypeOptionTextSelected,
                                    ]}>
                                        Personal
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            onPress={handleCustomCallerIDCreate}
                            disabled={!customName.trim() || !customPhone.trim()}
                            accessibilityLabel="Create custom caller ID"
                        >
                            Create Caller ID
                        </Button>
                    </View>
                </View>
            )}
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
    safetyNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.semantic.info.background,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        marginBottom: theme.spacing.scale.lg,
        gap: theme.spacing.scale.sm,
    },
    safetyNoticeIcon: {
        fontSize: 18,
        marginTop: 2,
    },
    safetyNoticeText: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        flex: 1,
        lineHeight: theme.typography.text.body.sm.lineHeight,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.xs,
        marginBottom: theme.spacing.scale.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: theme.spacing.scale.sm,
        paddingHorizontal: theme.spacing.scale.md,
        borderRadius: theme.spacing.scale.xs,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: theme.colors.system.background.primary,
        shadowColor: theme.colors.system.shadow.small,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.secondary,
    },
    tabTextActive: {
        color: theme.colors.system.text.primary,
    },
    currentSelection: {
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        marginBottom: theme.spacing.scale.lg,
    },
    currentSelectionLabel: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.secondary,
        marginBottom: theme.spacing.scale.xs,
    },
    currentSelectionDisplay: {
        gap: theme.spacing.scale.xs,
    },
    currentSelectionName: {
        fontSize: theme.typography.text.body.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
    },
    currentSelectionPhone: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        fontFamily: 'monospace',
    },
    currentSelectionRisk: {
        fontSize: theme.typography.text.caption.sm.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    tabContent: {
        maxHeight: 300,
    },
    sectionTitle: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: theme.spacing.scale.md,
    },
    callerIDList: {
        gap: theme.spacing.scale.sm,
    },
    callerIDOption: {
        borderWidth: 2,
        borderColor: theme.colors.system.border.light,
        borderRadius: theme.spacing.scale.md,
        padding: theme.spacing.scale.md,
        backgroundColor: theme.colors.system.background.primary,
    },
    callerIDOptionSelected: {
        borderColor: theme.colors.brand.primary[600],
        backgroundColor: theme.colors.brand.primary[50],
    },
    callerIDOptionWarning: {
        borderColor: theme.colors.semantic.warning.main,
        backgroundColor: theme.colors.semantic.warning.background,
    },
    callerIDOptionContent: {
        gap: theme.spacing.scale.sm,
    },
    callerIDOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    callerIDOptionInfo: {
        flex: 1,
    },
    callerIDNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.scale.sm,
        marginBottom: 2,
    },
    callerIDName: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
    },
    callerIDNameSelected: {
        color: theme.colors.brand.primary[600],
    },
    callerIDPhone: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
        fontFamily: 'monospace',
        marginBottom: 2,
    },
    callerIDType: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.tertiary,
        textTransform: 'capitalize',
    },
    callerIDMeta: {
        alignItems: 'flex-end',
        gap: theme.spacing.scale.xs,
    },
    riskIndicator: {
        fontSize: theme.typography.text.caption.sm.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.secondary,
    },
    checkmark: {
        fontSize: 18,
        color: theme.colors.brand.primary[600],
        fontWeight: 'bold',
    },
    defaultBadge: {
        fontSize: theme.typography.text.caption.sm.fontSize,
        color: theme.colors.semantic.success.main,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        backgroundColor: theme.colors.semantic.success.light,
        paddingHorizontal: theme.spacing.scale.xs,
        paddingVertical: 2,
        borderRadius: 4,
    },
    customForm: {
        gap: theme.spacing.scale.md,
    },
    callerTypeSelector: {
        gap: theme.spacing.scale.sm,
    },
    callerTypeLabel: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
    },
    callerTypeOptions: {
        flexDirection: 'row',
        gap: theme.spacing.scale.sm,
    },
    callerTypeOption: {
        flex: 1,
        paddingVertical: theme.spacing.scale.sm,
        paddingHorizontal: theme.spacing.scale.md,
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.sm,
        borderWidth: 1,
        borderColor: theme.colors.system.border.light,
        alignItems: 'center',
    },
    callerTypeOptionSelected: {
        backgroundColor: theme.colors.brand.primary[50],
        borderColor: theme.colors.brand.primary[600],
    },
    callerTypeOptionText: {
        fontSize: theme.typography.text.label.base.fontSize,
        color: theme.colors.system.text.secondary,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    callerTypeOptionTextSelected: {
        color: theme.colors.brand.primary[600],
    },
});

export default CallerIDManager;