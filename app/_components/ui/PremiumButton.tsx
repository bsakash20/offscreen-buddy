import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { BlurView } from 'expo-blur';

interface PremiumButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'glass' | 'gold' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    style,
    textStyle,
    icon,
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    const getGradientColors = () => {
        // if (disabled) return [colors.system.background.surface, colors.system.background.surface]; // User prefers visual appeal over flat gray
        switch (variant) {
            case 'primary':
                return theme.gradients?.primary || [colors.brand.primary[500], colors.brand.primary[600]];
            case 'gold':
                return theme.gradients?.gold || [colors.premium?.gold.main || '#EAB308', colors.premium?.gold.dark || '#A16207'];
            case 'secondary':
                return theme.gradients?.secondary || [colors.system.background.secondary, colors.system.background.tertiary];
            default:
                return undefined;
        }
    };

    const getButtonSizeStyle = (): ViewStyle => {
        switch (size) {
            case 'sm': return { paddingVertical: 8, paddingHorizontal: 16 };
            case 'lg': return { paddingVertical: theme.spacing.scale.md, paddingHorizontal: theme.spacing.scale.xl, minWidth: 160 };
            case 'xl': return { paddingVertical: 18, paddingHorizontal: 40, minWidth: 200, borderRadius: 20 };
            default: return { paddingVertical: 12, paddingHorizontal: 24 };
        }
    };

    const getContainerStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: theme.borderRadius.medium,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            opacity: disabled ? 0.5 : 1,
            ...theme.elevation.small,
        };

        const variantStyles: Record<string, ViewStyle> = {
            outline: {
                borderWidth: 1,
                borderColor: colors.brand.primary[500],
                backgroundColor: 'transparent',
            },
            glass: {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
            },
        };

        return {
            ...baseStyle,
            ...getButtonSizeStyle(),
            ...(variant === 'outline' || variant === 'glass' ? variantStyles[variant] : {}),
            ...style,
        };
    };

    const getTextStyle = (): TextStyle => {
        const baseStyle: TextStyle = {
            fontWeight: '600',
            fontSize: size === 'lg' ? 18 : size === 'md' ? 16 : 14,
            color: colors.system.text.inverse,
        };

        if (variant === 'outline') {
            baseStyle.color = colors.brand.primary[500];
        } else if (variant === 'secondary') {
            baseStyle.color = colors.system.text.primary;
        } else if (variant === 'glass') {
            baseStyle.color = colors.system.text.primary;
        }

        return {
            ...baseStyle,
            ...textStyle,
        };
    };

    const gradientColors = getGradientColors();

    const Content = () => (
        <>
            {loading ? (
                <ActivityIndicator color={getTextStyle().color} size="small" style={{ marginRight: 8 }} />
            ) : (
                icon && <View style={{ marginRight: 8 }}>{icon}</View>
            )}
            <Text style={getTextStyle()}>{title}</Text>
        </>
    );

    if (variant === 'glass') {
        return (
            <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[getContainerStyle(), { overflow: 'hidden' }]}>
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                <Content />
            </TouchableOpacity>
        );
    }

    if (gradientColors) {
        return (
            <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[getContainerStyle(), { padding: 0, overflow: 'hidden' }]}>
                <LinearGradient
                    colors={gradientColors as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill]}
                />
                <View style={{ paddingVertical: (getContainerStyle().paddingVertical as number) || 12, paddingHorizontal: (getContainerStyle().paddingHorizontal as number) || 24, flexDirection: 'row', alignItems: 'center' }}>
                    <Content />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={getContainerStyle()}>
            <Content />
        </TouchableOpacity>
    );
};
