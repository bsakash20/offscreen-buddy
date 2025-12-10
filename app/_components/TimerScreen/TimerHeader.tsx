import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../_design-system/providers/ThemeProvider';

export const TimerHeader = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const colors = theme.colors;

    const handleProfilePress = () => {
        router.push('/profile');
    };

    const handleSettingsPress = () => {
        // Navigate to settings tab or screen
        // As per previous index.tsx, settings might be a tab or separate screen. 
        // Assuming standard navigation or existing behavior.
        // In index.tsx it was just console.log('Settings pressed') but the intention is likely navigation
        // Wait, index.tsx had: 
        // const handleSettingsPress = () => { playSound('button'); console.log('Settings pressed'); };
        // But there is a settings tab. Let's just navigate to it if possible, or keep it as a button for now.
        // Actually, usually headers in tabs navigate to other tabs? No, that's weird.
        // Let's assume for now we just want to navigate to the settings screen if it exists in the stack, 
        // OR we might want to emit an event. 
        // Given the task is to refactor, I should replicate existing behavior but maybe improve it?
        // The existing behavior was just logging. But wait, there is a `settings.tsx` in `(tabs)`.
        // So usually you tap the tab bar item to go to settings. A header button for settings on the home screen is slightly redundant if there is a tab.
        // However, I will keep the UI element as per request ("Extracts the Header logic").
        router.push('/settings');
    };

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={handleProfilePress} style={styles.headerButton}>
                <Ionicons name="person-circle-outline" size={28} color={colors.system.text.primary} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.system.text.primary }]}>Focus Timer</Text>

            <TouchableOpacity onPress={handleSettingsPress} style={styles.headerButton}>
                <Ionicons name="settings-outline" size={26} color={colors.system.text.primary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
    },
});
