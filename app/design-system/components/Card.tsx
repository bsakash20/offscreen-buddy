/**
 * Mobile-First Design System - Card Component
 * Responsive card component optimized for mobile content containers
 */

import React, { forwardRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    GestureResponderEvent,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import Button from './Button';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
    // Content
    children: React.ReactNode;

    // Appearance
    variant?: CardVariant;
    padding?: CardPadding;

    // Layout
    fullWidth?: boolean;

    // Actions
    onPress?: (event: GestureResponderEvent) => void;

    // Style overrides
    style?: ViewStyle;
    contentStyle?: ViewStyle;

    // Header and Footer
    header?: React.ReactNode;
    footer?: React.ReactNode;

    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
}

const Card = forwardRef<View, CardProps>(({
    children,
    variant = 'elevated',
    padding = 'md',
    fullWidth = false,
    onPress,
    style,
    contentStyle,
    header,
    footer,
    accessibilityLabel,
    accessibilityHint,
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing, elevation, borderRadius } = theme;

    // Get card styles
    const getCardStyles = (): ViewStyle => {
        const cardStyle: ViewStyle = {
            width: fullWidth ? '100%' : undefined,
            borderRadius: borderRadius.medium,
            overflow: 'hidden',
        };

        // Variant styles
        switch (variant) {
            case 'elevated':
                cardStyle.backgroundColor = colors.system.background.surface;
                cardStyle.elevation = elevation.medium.elevation;
                break;
            case 'outlined':
                cardStyle.backgroundColor = colors.system.background.primary;
                cardStyle.borderWidth = 1;
                cardStyle.borderColor = colors.system.border.light;
                break;
            case 'filled':
                cardStyle.backgroundColor = colors.system.background.secondary;
                break;
            case 'ghost':
                cardStyle.backgroundColor = 'transparent';
                break;
        }

        // Padding styles
        switch (padding) {
            case 'none':
                break;
            case 'sm':
                cardStyle.padding = spacing.scale.sm;
                break;
            case 'md':
                cardStyle.padding = spacing.scale.md;
                break;
            case 'lg':
                cardStyle.padding = spacing.scale.lg;
                break;
            case 'xl':
                cardStyle.padding = spacing.scale.xl;
                break;
        }

        if (style) {
            Object.assign(cardStyle, style);
        }

        return cardStyle;
    };

    // Get header styles
    const getHeaderStyles = (): ViewStyle => {
        return {
            paddingBottom: padding !== 'none' ? spacing.scale.sm : 0,
            borderBottomWidth: padding !== 'none' ? 1 : 0,
            borderBottomColor: colors.system.border.light,
        };
    };

    // Get footer styles
    const getFooterStyles = (): ViewStyle => {
        return {
            paddingTop: padding !== 'none' ? spacing.scale.sm : 0,
            borderTopWidth: padding !== 'none' ? 1 : 0,
            borderTopColor: colors.system.border.light,
        };
    };

    // Get content styles
    const getContentStyles = (): ViewStyle => {
        const contentStyleObj: ViewStyle = {};

        if (padding === 'none') {
            contentStyleObj.padding = spacing.scale.md;
        }

        if (contentStyle) {
            Object.assign(contentStyleObj, contentStyle);
        }

        return contentStyleObj;
    };

    // Handle press
    const handlePress = (event: GestureResponderEvent) => {
        onPress?.(event);
    };

    const cardContent = (
        <>
            {header && (
                <View style={getHeaderStyles()}>
                    {header}
                </View>
            )}

            <View style={getContentStyles()}>
                {children}
            </View>

            {footer && (
                <View style={getFooterStyles()}>
                    {footer}
                </View>
            )}
        </>
    );

    if (onPress) {
        return (
            <View
                ref={ref}
                style={getCardStyles()}
                onTouchEnd={handlePress}
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                accessibilityRole="button"
                testID={testID}
            >
                {cardContent}
            </View>
        );
    }

    return (
        <View
            ref={ref}
            style={getCardStyles()}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
        >
            {cardContent}
        </View>
    );
});

Card.displayName = 'Card';

export default Card;

// Action card variant for mobile-first call-to-action
export interface ActionCardProps extends Omit<CardProps, 'footer'> {
    title?: string;
    description?: string;
    actionText?: string;
    onAction?: (event: GestureResponderEvent) => void;
    actionVariant?: 'primary' | 'secondary';
}

export const ActionCard = forwardRef<View, ActionCardProps>(({
    title,
    description,
    actionText,
    onAction,
    actionVariant = 'primary',
    children,
    ...props
}, ref) => {
    const { theme } = useTheme();
    const { typography } = theme;

    const header = (
        <>
            {title && (
                <Text style={styles.actionTitle}>
                    {title}
                </Text>
            )}
            {description && (
                <Text style={styles.actionDescription}>
                    {description}
                </Text>
            )}
        </>
    );

    const footer = actionText && onAction && (
        <Button
            variant={actionVariant}
            size="sm"
            fullWidth
            onPress={onAction}
            accessibilityLabel={actionText}
        >
            {actionText}
        </Button>
    );

    return (
        <Card
            {...props}
            ref={ref}
            variant="elevated"
            header={header}
            footer={footer}
        >
            {children}
        </Card>
    );
});

ActionCard.displayName = 'ActionCard';

// Card grid for responsive layouts
export interface CardGridProps {
    children: React.ReactNode;
    columns?: number;
    spacing?: number;
    fullWidth?: boolean;
    style?: ViewStyle;
}

export const CardGrid: React.FC<CardGridProps> = ({
    children,
    columns = 1,
    spacing = 16,
    fullWidth = false,
    style,
}) => {
    const getGridStyles = (): ViewStyle => ({
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing / 2,
        ...style,
    });

    const getItemStyles = (index: number): ViewStyle => ({
        width: `${100 / columns}%`,
        paddingHorizontal: spacing / 2,
        marginBottom: spacing,
    });

    return (
        <View style={getGridStyles()}>
            {React.Children.map(children, (child, index) => (
                <View key={index} style={getItemStyles(index)}>
                    {child}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    actionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
        color: '#000',
    },
    actionDescription: {
        fontSize: 14,
        color: '#666',
    },
});