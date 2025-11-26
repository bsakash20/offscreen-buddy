/**
 * Voice Profile Settings Component
 * Manages voice profiles with customization options and Pro tier features
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

export interface VoiceProfileSettingsProps {
    voiceProfileId: string;
    voiceSettings: {
        speed: number;
        pitch: number;
        volume: number;
        tone: 'professional' | 'casual' | 'urgent' | 'friendly';
    };
    isProTier: boolean;
    onVoiceProfileChange: (voiceProfileId: string, voiceSettings: any) => void;
    style?: any;
    testID?: string;
}

// Predefined voice profiles
const freeTierVoices = [
    {
        id: 'professional_male',
        name: 'Professional Male',
        description: 'Clear, authoritative male voice',
        preview: 'Hello, this is a professional call for you.',
        isDefault: true,
    },
    {
        id: 'professional_female',
        name: 'Professional Female',
        description: 'Clear, authoritative female voice',
        preview: 'Hello, this is a professional call for you.',
        isProOnly: true,
    },
];

const proTierVoices = [
    ...freeTierVoices,
    {
        id: 'casual_male',
        name: 'Casual Male',
        description: 'Friendly, conversational male voice',
        preview: 'Hey! Got a minute to chat?',
        isProOnly: true,
    },
    {
        id: 'casual_female',
        name: 'Casual Female',
        description: 'Friendly, conversational female voice',
        preview: 'Hey! Got a minute to chat?',
        isProOnly: true,
    },
    {
        id: 'urgent_male',
        name: 'Urgent Male',
        description: 'Faster pace, urgent tone',
        preview: 'This is urgent. We need to talk immediately.',
        isProOnly: true,
    },
    {
        id: 'elderly_male',
        name: 'Elderly Male',
        description: 'Gentle, slower pace voice',
        preview: 'Hello dear, how are you doing today?',
        isProOnly: true,
    },
];

const voiceTones = [
    { value: 'professional', label: 'Professional', description: 'Formal, business-appropriate' },
    { value: 'casual', label: 'Casual', description: 'Friendly, conversational', isProOnly: true },
    { value: 'urgent', label: 'Urgent', description: 'Pressing, time-sensitive', isProOnly: true },
    { value: 'friendly', label: 'Friendly', description: 'Warm, approachable', isProOnly: true },
];

const VoiceProfileSettings: React.FC<VoiceProfileSettingsProps> = ({
    voiceProfileId,
    voiceSettings,
    isProTier,
    onVoiceProfileChange,
    style,
    testID,
}) => {
    const { theme } = useTheme();
    const { isMobile } = useResponsive();
    const [activeTab, setActiveTab] = useState<'profiles' | 'customize'>('profiles');

    const availableVoices = isProTier ? proTierVoices : freeTierVoices;

    const handleVoiceProfileSelect = (profileId: string) => {
        const voice = availableVoices.find(v => v.id === profileId);
        if (voice && voice.isProOnly && !isProTier) {
            Alert.alert(
                'Pro Feature',
                'This voice profile requires a Pro tier subscription.',
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

        onVoiceProfileChange(profileId, voiceSettings);
    };

    const handleVoiceSettingChange = (setting: keyof typeof voiceSettings, value: any) => {
        const newSettings = {
            ...voiceSettings,
            [setting]: value,
        };
        onVoiceProfileChange(voiceProfileId, newSettings);
    };

    const handlePreview = (voiceId: string) => {
        const voice = availableVoices.find(v => v.id === voiceId);
        if (voice) {
            Alert.alert('Voice Preview', voice.preview);
        }
    };

    // Custom slider component
    const renderSliderControl = (
        label: string,
        value: number,
        min: number,
        max: number,
        step: number,
        onChange: (value: number) => void,
        description?: string,
        isProOnly?: boolean
    ) => {
        const percentage = ((value - min) / (max - min)) * 100;

        return (
            <View style={styles.sliderControl}>
                <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>{label}</Text>
                    {isProOnly && <Text style={styles.proBadge}>PRO</Text>}
                </View>
                {description && <Text style={styles.sliderDescription}>{description}</Text>}
                <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                        <View style={[
                            styles.sliderFill,
                            { width: `${percentage}%` }
                        ]} />
                    </View>
                    <View style={styles.sliderControls}>
                        <TouchableOpacity
                            style={styles.sliderButton}
                            onPress={() => {
                                const newValue = Math.max(min, value - step);
                                onChange(parseFloat(newValue.toFixed(1)));
                            }}
                            accessibilityLabel={`Decrease ${label}`}
                        >
                            <Text style={styles.sliderButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.sliderValue}>{value.toFixed(1)}</Text>
                        <TouchableOpacity
                            style={styles.sliderButton}
                            onPress={() => {
                                const newValue = Math.min(max, value + step);
                                onChange(parseFloat(newValue.toFixed(1)));
                            }}
                            accessibilityLabel={`Increase ${label}`}
                        >
                            <Text style={styles.sliderButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const styles = createStyles(theme, isMobile);

    return (
        <View style={style} testID={testID}>
            <View style={styles.header}>
                <Text style={styles.title}>Voice Profile</Text>
                <Text style={styles.description}>
                    Choose a voice profile and customize its settings
                </Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'profiles' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('profiles')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === 'profiles' }}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'profiles' && styles.tabTextActive,
                    ]}>
                        Profiles
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'customize' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('customize')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === 'customize' }}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'customize' && styles.tabTextActive,
                    ]}>
                        Customize
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Voice Profiles Tab */}
            {activeTab === 'profiles' && (
                <View style={styles.tabContent}>
                    <View style={styles.voiceList}>
                        {availableVoices.map((voice) => {
                            const isSelected = voiceProfileId === voice.id;
                            const isLocked = voice.isProOnly && !isProTier;

                            return (
                                <TouchableOpacity
                                    key={voice.id}
                                    style={[
                                        styles.voiceOption,
                                        isSelected && styles.voiceOptionSelected,
                                        isLocked && styles.voiceOptionLocked,
                                    ]}
                                    onPress={() => handleVoiceProfileSelect(voice.id)}
                                    disabled={isLocked}
                                    accessibilityLabel={`Select ${voice.name} voice profile`}
                                    accessibilityRole="radio"
                                    accessibilityState={{
                                        selected: isSelected,
                                        disabled: isLocked,
                                    }}
                                >
                                    <View style={styles.voiceOptionContent}>
                                        <View style={styles.voiceOptionHeader}>
                                            <View style={styles.voiceOptionInfo}>
                                                <Text style={[
                                                    styles.voiceOptionName,
                                                    isSelected && styles.voiceOptionNameSelected,
                                                    isLocked && styles.voiceOptionNameLocked,
                                                ]}>
                                                    {voice.name}
                                                    {voice.isDefault && (
                                                        <Text style={styles.defaultBadge}> DEFAULT</Text>
                                                    )}
                                                    {isLocked && ' 🔒'}
                                                </Text>
                                                <Text style={[
                                                    styles.voiceOptionDescription,
                                                    isSelected && styles.voiceOptionDescriptionSelected,
                                                ]}>
                                                    {voice.description}
                                                </Text>
                                            </View>
                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.previewButton}
                                            onPress={() => handlePreview(voice.id)}
                                            disabled={isLocked}
                                            accessibilityLabel={`Preview ${voice.name} voice`}
                                        >
                                            <Text style={[
                                                styles.previewButtonText,
                                                isLocked && styles.previewButtonTextLocked,
                                            ]}>
                                                🔊 Preview
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Customize Tab */}
            {activeTab === 'customize' && (
                <View style={styles.tabContent}>
                    {/* Voice Tone Selection */}
                    <View style={styles.toneSection}>
                        <Text style={styles.sectionTitle}>Voice Tone</Text>
                        <View style={styles.toneOptions}>
                            {voiceTones.map((tone) => {
                                const isSelected = voiceSettings.tone === tone.value;
                                const isLocked = tone.isProOnly && !isProTier;

                                return (
                                    <TouchableOpacity
                                        key={tone.value}
                                        style={[
                                            styles.toneOption,
                                            isSelected && styles.toneOptionSelected,
                                            isLocked && styles.toneOptionLocked,
                                        ]}
                                        onPress={() => !isLocked && handleVoiceSettingChange('tone', tone.value)}
                                        disabled={isLocked}
                                        accessibilityLabel={`Select ${tone.label} tone`}
                                        accessibilityRole="radio"
                                        accessibilityState={{
                                            selected: isSelected,
                                            disabled: isLocked,
                                        }}
                                    >
                                        <Text style={[
                                            styles.toneOptionLabel,
                                            isSelected && styles.toneOptionLabelSelected,
                                            isLocked && styles.toneOptionLabelLocked,
                                        ]}>
                                            {tone.label}
                                            {isLocked && ' 🔒'}
                                        </Text>
                                        <Text style={styles.toneOptionDescription}>{tone.description}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Voice Parameters */}
                    <View style={styles.parametersSection}>
                        <Text style={styles.sectionTitle}>Voice Parameters</Text>

                        {renderSliderControl(
                            'Speech Speed',
                            voiceSettings.speed,
                            0.5,
                            2.0,
                            0.1,
                            (value) => handleVoiceSettingChange('speed', value),
                            'How fast the voice speaks',
                            !isProTier
                        )}

                        {renderSliderControl(
                            'Pitch',
                            voiceSettings.pitch,
                            -10,
                            10,
                            1,
                            (value) => handleVoiceSettingChange('pitch', value),
                            'Voice pitch adjustment',
                            !isProTier
                        )}

                        {renderSliderControl(
                            'Volume',
                            voiceSettings.volume,
                            0.1,
                            1.0,
                            0.1,
                            (value) => handleVoiceSettingChange('volume', value),
                            'Voice volume level',
                            false
                        )}
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
    tabContent: {
        gap: theme.spacing.scale.lg,
    },
    voiceList: {
        gap: theme.spacing.scale.sm,
    },
    voiceOption: {
        borderWidth: 2,
        borderColor: theme.colors.system.border.light,
        borderRadius: theme.spacing.scale.md,
        padding: theme.spacing.scale.md,
        backgroundColor: theme.colors.system.background.primary,
    },
    voiceOptionSelected: {
        borderColor: theme.colors.brand.primary[600],
        backgroundColor: theme.colors.brand.primary[50],
    },
    voiceOptionLocked: {
        opacity: 0.6,
        borderColor: theme.colors.system.border.light,
    },
    voiceOptionContent: {
        gap: theme.spacing.scale.sm,
    },
    voiceOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    voiceOptionInfo: {
        flex: 1,
    },
    voiceOptionName: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: 2,
    },
    voiceOptionNameSelected: {
        color: theme.colors.brand.primary[600],
    },
    voiceOptionNameLocked: {
        color: theme.colors.system.text.disabled,
    },
    voiceOptionDescription: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    voiceOptionDescriptionSelected: {
        color: theme.colors.brand.primary[600],
    },
    checkmark: {
        fontSize: 18,
        color: theme.colors.brand.primary[600],
        fontWeight: 'bold',
    },
    previewButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.scale.sm,
        paddingVertical: theme.spacing.scale.xs,
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.sm,
    },
    previewButtonText: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.brand.primary[600],
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
    previewButtonTextLocked: {
        color: theme.colors.system.text.disabled,
    },
    toneSection: {
        gap: theme.spacing.scale.md,
    },
    parametersSection: {
        gap: theme.spacing.scale.md,
    },
    sectionTitle: {
        fontSize: theme.typography.text.heading.h4.fontSize,
        fontWeight: theme.typography.text.heading.h4.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
    },
    toneOptions: {
        gap: theme.spacing.scale.sm,
    },
    toneOption: {
        borderWidth: 1,
        borderColor: theme.colors.system.border.light,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.md,
        backgroundColor: theme.colors.system.background.primary,
    },
    toneOptionSelected: {
        borderColor: theme.colors.brand.primary[600],
        backgroundColor: theme.colors.brand.primary[50],
    },
    toneOptionLocked: {
        opacity: 0.6,
        borderColor: theme.colors.system.border.light,
    },
    toneOptionLabel: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
        marginBottom: 2,
    },
    toneOptionLabelSelected: {
        color: theme.colors.brand.primary[600],
    },
    toneOptionLabelLocked: {
        color: theme.colors.system.text.disabled,
    },
    toneOptionDescription: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    sliderControl: {
        gap: theme.spacing.scale.sm,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sliderLabel: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.system.text.primary,
    },
    proBadge: {
        fontSize: theme.typography.text.caption.sm.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.brand.primary[600],
        backgroundColor: theme.colors.brand.primary[100],
        paddingHorizontal: theme.spacing.scale.xs,
        paddingVertical: 2,
        borderRadius: 4,
        textTransform: 'uppercase',
    },
    sliderDescription: {
        fontSize: theme.typography.text.body.sm.fontSize,
        color: theme.colors.system.text.secondary,
    },
    sliderContainer: {
        gap: theme.spacing.scale.sm,
    },
    sliderTrack: {
        height: 4,
        backgroundColor: theme.colors.system.border.light,
        borderRadius: 2,
        overflow: 'hidden',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: theme.colors.brand.primary[600],
    },
    sliderControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.system.background.secondary,
        borderRadius: theme.spacing.scale.sm,
        padding: theme.spacing.scale.sm,
    },
    sliderButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.brand.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sliderButtonText: {
        color: theme.colors.system.text.inverse,
        fontSize: 18,
        fontWeight: 'bold',
    },
    sliderValue: {
        fontSize: theme.typography.text.label.base.fontSize,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
        color: theme.colors.brand.primary[600],
        minWidth: 40,
        textAlign: 'center',
    },
    defaultBadge: {
        fontSize: theme.typography.text.caption.sm.fontSize,
        color: theme.colors.semantic.success.main,
        fontWeight: theme.typography.text.label.base.fontWeight.toString() as any,
    },
});

export default VoiceProfileSettings;