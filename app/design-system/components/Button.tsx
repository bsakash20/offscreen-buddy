/**
 * Mobile-First Design System - Button Component
 * Touch-optimized button with haptic feedback and responsive design
 */

import React, { forwardRef } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    GestureResponderEvent,
    View,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import * as Haptics from 'expo-haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
    // Content
    children: React.ReactNode;

    // Appearance
    variant?: ButtonVariant;
    size?: ButtonSize;

    // States
    disabled?: boolean;
    loading?: boolean;

    // Touch behavior
    haptic?: boolean;

    // Layout
    fullWidth?: boolean;

    // Event handlers
    onPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;

    // Style overrides
    style?: ViewStyle;
    textStyle?: TextStyle;

    // Accessibility
    accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'link';
    testID?: string;
}

const Button = forwardRef<View, ButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    haptic = true,
    fullWidth = false,
    onPress,
    onPressIn,
    onPressOut,
    style,
    textStyle,
    accessibilityLabel,
    accessibilityRole = 'button',
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing, typography, elevation } = theme;

    // Get button styles
    const getButtonStyles = (): ViewStyle => {
        const buttonStyle: ViewStyle = {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderRadius: 8,
            opacity: disabled ? 0.4 : 1,
        };

        // Size styles
        switch (size) {
            case 'sm':
                buttonStyle.height = 36;
                buttonStyle.paddingHorizontal = 12;
                break;
            case 'md':
                buttonStyle.height = 44;
                buttonStyle.paddingHorizontal = 16;
                break;
            case 'lg':
                buttonStyle.height = 52;
                buttonStyle.paddingHorizontal = 20;
                break;
            case 'xl':
                buttonStyle.height = 60;
                buttonStyle.paddingHorizontal = 24;
                break;
        }

        // Variant styles
        switch (variant) {
            case 'primary':
                buttonStyle.backgroundColor = colors.brand.primary[600];
                buttonStyle.borderColor = colors.brand.primary[600];
                break;
            case 'secondary':
                buttonStyle.backgroundColor = colors.system.background.secondary;
                buttonStyle.borderColor = colors.brand.primary[600];
                break;
            case 'outline':
                buttonStyle.backgroundColor = 'transparent';
                buttonStyle.borderColor = colors.brand.primary[600];
                break;
            case 'ghost':
                buttonStyle.backgroundColor = 'transparent';
                buttonStyle.borderColor = 'transparent';
                break;
            case 'destructive':
                buttonStyle.backgroundColor = colors.semantic.error.main;
                buttonStyle.borderColor = colors.semantic.error.main;
                break;
        }

        if (fullWidth) {
            buttonStyle.width = '100%';
        }

        if (variant === 'primary') {
            buttonStyle.elevation = elevation.small.elevation;
        }

        if (style) {
            Object.assign(buttonStyle, style);
        }

        return buttonStyle;
    };

    // Get text styles
    const getTextStyles = (): TextStyle => {
        const textStyleObj: TextStyle = {
            textAlign: 'center',
            fontWeight: '500',
        };

        // Size styles
        switch (size) {
            case 'sm':
                textStyleObj.fontSize = 12;
                break;
            case 'md':
                textStyleObj.fontSize = 14;
                break;
            case 'lg':
                textStyleObj.fontSize = 16;
                break;
            case 'xl':
                textStyleObj.fontSize = 18;
                break;
        }

        // Color styles
        switch (variant) {
            case 'primary':
            case 'destructive':
                textStyleObj.color = colors.system.text.inverse;
                break;
            default:
                textStyleObj.color = colors.brand.primary[600];
                break;
        }

        if (textStyle) {
            Object.assign(textStyleObj, textStyle);
        }

        return textStyleObj;
    };

    // Handle press events
    const handlePress = (event: GestureResponderEvent) => {
        if (disabled || loading) return;

        // Trigger haptic feedback
        if (haptic) {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {
                console.debug('Haptic feedback not available:', error);
            }
        }

        onPress?.(event);
    };

    // Get loading spinner color
    const getSpinnerColor = (): string => {
        switch (variant) {
            case 'primary':
            case 'destructive':
                return colors.system.text.inverse;
            default:
                return colors.brand.primary[600];
        }
    };

    return (
        <TouchableOpacity
            ref={ref}
            style={getButtonStyles()}
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={disabled || loading}
            activeOpacity={0.8}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            testID={testID}
        >
            {loading ? (
                <View style={styles.contentContainer}>
                    <ActivityIndicator
                        size="small"
                        color={getSpinnerColor()}
                        style={styles.spinner}
                    />
                    <Text style={getTextStyles()}>{children}</Text>
                </View>
            ) : (
                <Text style={getTextStyles()}>{children}</Text>
            )}
        </TouchableOpacity>
    );
});

Button.displayName = 'Button';

const styles = StyleSheet.create({
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinner: {
        marginRight: 8,
    },
});

export default Button;

// Icon button variant
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
    icon: React.ReactElement;
    iconSize?: number;
    iconColor?: string;
}

export const IconButton = forwardRef<View, IconButtonProps>(({
    icon,
    iconSize = 20,
    iconColor,
    style,
    size = 'md',
    variant = 'ghost',
    ...props
}, ref) => {
    const { theme } = useTheme();
    const { colors } = theme;

    const getButtonStyles = (): ViewStyle => {
        const buttonStyle: ViewStyle = {};

        // Size styles
        switch (size) {
            case 'sm':
                buttonStyle.width = 36;
                buttonStyle.height = 36;
                break;
            case 'md':
                buttonStyle.width = 44;
                buttonStyle.height = 44;
                break;
            case 'lg':
                buttonStyle.width = 52;
                buttonStyle.height = 52;
                break;
            case 'xl':
                buttonStyle.width = 60;
                buttonStyle.height = 60;
                break;
        }

        if (style) {
            Object.assign(buttonStyle, style);
        }

        return buttonStyle;
    };

    return (
        <Button
            ref={ref}
            style={getButtonStyles()}
            variant={variant}
            size={size}
            {...props}
        >
            {React.isValidElement(icon) ? React.cloneElement(icon, {
                color: iconColor || colors.brand.primary[600],
                size: iconSize,
            } as any) : icon}
        </Button>
    );
});

IconButton.displayName = 'IconButton';

// Floating action button
export interface FloatingActionButtonProps extends Omit<IconButtonProps, 'variant'> {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    elevation?: 'small' | 'medium' | 'large';
}

export const FloatingActionButton = forwardRef<View, FloatingActionButtonProps>(({
    position = 'bottom-right',
    elevation = 'medium',
    style,
    ...props
}, ref) => {
    const { theme } = useTheme();
    const { elevation: elevationTokens } = theme;

    const getPositionStyle = (): ViewStyle => {
        const positionStyle: ViewStyle = {
            position: 'absolute',
        };

        switch (position) {
            case 'bottom-right':
                positionStyle.bottom = 80;
                positionStyle.right = 20;
                break;
            case 'bottom-left':
                positionStyle.bottom = 80;
                positionStyle.left = 20;
                break;
            case 'top-right':
                positionStyle.top = 80;
                positionStyle.right = 20;
                break;
            case 'top-left':
                positionStyle.top = 80;
                positionStyle.left = 20;
                break;
        }

        return positionStyle;
    };

    const finalStyle: ViewStyle = {
        ...getPositionStyle(),
        ...style,
        elevation: elevationTokens[elevation].elevation,
    };

    return (
        <IconButton
            ref={ref}
            variant="primary"
            size="lg"
            style={finalStyle}
            {...props}
        />
    );
});

FloatingActionButton.displayName = 'FloatingActionButton';