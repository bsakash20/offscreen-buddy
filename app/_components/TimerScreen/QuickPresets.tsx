import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../_design-system/providers/ThemeProvider';

// Moved from index.tsx
export const TIMER_PRESETS = [
    { name: "Pomodoro", duration: 25 * 60, icon: "🍅", premium: false },
    { name: "Deep Focus", duration: 45 * 60, icon: "🧠", premium: false },
    { name: "Power Hour", duration: 60 * 60, icon: "⚡", premium: false },
    { name: "Study Block", duration: 90 * 60, icon: "📚", premium: false },
    { name: "Creative Flow", duration: 120 * 60, icon: "🎨", premium: false },
    { name: "Deep Work", duration: 180 * 60, icon: "💎", premium: false },
];

interface QuickPresetsProps {
    onPresetSelect: (preset: typeof TIMER_PRESETS[0]) => void;
    hasPremiumAccess: boolean;
}

export const QuickPresets = ({ onPresetSelect, hasPremiumAccess }: QuickPresetsProps) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    return (
        <View style={styles.presetsContainer}>
            <Text style={[styles.presetsTitle, { color: colors.system.text.primary }]}>
                Quick Presets
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                {TIMER_PRESETS.map((preset) => (
                    <TouchableOpacity
                        key={preset.name}
                        style={[
                            styles.presetButton,
                            {
                                backgroundColor: preset.premium ? colors.premium?.gold.main : colors.system.background.surface,
                                opacity: preset.premium ? 1 : 0.8,
                                borderColor: preset.premium ? colors.premium?.gold.light : colors.system.border.light,
                                borderWidth: 1,
                            }
                        ]}
                        onPress={() => onPresetSelect(preset)}
                        disabled={preset.premium && !hasPremiumAccess}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.presetIcon}>{preset.icon}</Text>
                        <Text style={[styles.presetName, { color: colors.system.text.primary }]}>{preset.name}</Text>
                        <Text style={[styles.presetDuration, { color: colors.system.text.secondary }]}>
                            {Math.floor(preset.duration / 60)}m
                        </Text>
                        {preset.premium && <Text style={styles.premiumBadge}>PRO</Text>}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    presetsContainer: {
        width: '100%',
        marginVertical: 20,
    },
    presetsTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
    },
    presetsScroll: {
        maxHeight: 100,
    },
    presetButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginRight: 12,
        alignItems: 'center',
        minWidth: 80,
    },
    presetIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    presetName: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    presetDuration: {
        fontSize: 10,
        fontWeight: '400',
    },
    premiumBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FFD700',
        color: '#000',
        fontSize: 8,
        fontWeight: '700',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
});
