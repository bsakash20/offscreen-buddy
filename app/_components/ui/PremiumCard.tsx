import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../_design-system/providers/ThemeProvider';

interface PremiumCardProps {
    children: React.ReactNode;
    variant?: 'default' | 'glass' | 'elevated' | 'outlined';
    style?: StyleProp<ViewStyle>;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
    children,
    variant = 'default',
    style,
    padding = 'md',
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    const getPadding = () => {
        switch (padding) {
            case 'sm': return theme.spacing.scale.sm;
            case 'md': return theme.spacing.scale.md;
            case 'lg': return theme.spacing.scale.lg;
            default: return 0;
        }
    };

    const containerStyle: ViewStyle = StyleSheet.flatten([
        {
            borderRadius: theme.borderRadius.large,
            padding: getPadding(),
            overflow: 'hidden',
            backgroundColor: colors.system.background.surface,
        },
        style
    ]);

    if (variant === 'glass') {
        return (
            <View style={[containerStyle, { backgroundColor: 'transparent', borderColor: colors.system.glass.border, borderWidth: 1 }]}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ zIndex: 1 }}>{children}</View>
            </View>
        );
    }

    if (variant === 'elevated') {
        return (
            <View style={[containerStyle, theme.elevation.medium]}>
                {children}
            </View>
        );
    }

    if (variant === 'outlined') {
        return (
            <View style={[containerStyle, { borderWidth: 1, borderColor: colors.system.border.light, backgroundColor: 'transparent' }]}>
                {children}
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            {children}
        </View>
    );
};
