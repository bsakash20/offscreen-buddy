/**
 * DeviceAdaptiveCard Component
 * Card component that adapts to device type and screen size
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useDeviceDetection } from '../../hooks/responsive/useDeviceDetection';
import { useResponsiveLayout } from '../../hooks/responsive/useResponsiveLayout';
import { ScalingUtils } from '../../utils/responsive/ScalingUtils';

export interface DeviceAdaptiveCardProps {
    children: ReactNode;
    elevated?: boolean;
    interactive?: boolean;
    style?: ViewStyle;
}

/**
 * Card that adapts to device characteristics
 */
export const DeviceAdaptiveCard: React.FC<DeviceAdaptiveCardProps> = ({
    children,
    elevated = true,
    interactive = false,
    style,
}) => {
    const { isTablet, category } = useDeviceDetection();
    const { getCardLayout } = useResponsiveLayout();

    const cardLayout = getCardLayout();
    const cardDimensions = ScalingUtils.cardDimensions();

    // Adjust for device type
    const padding = isTablet ? cardDimensions.padding * 1.25 : cardDimensions.padding;
    const borderRadius = cardDimensions.borderRadius;
    const minHeight = cardLayout.minHeight;

    // Shadow based on elevation and device
    const shadow = elevated ? ScalingUtils.shadow(isTablet ? 4 : 2) : {};

    const cardStyle: ViewStyle = {
        padding,
        borderRadius,
        minHeight,
        backgroundColor: '#FFFFFF',
        ...shadow,
        ...(interactive && {
            transform: [{ scale: 1 }],
        }),
    };

    return (
        <View style={[styles.card, cardStyle, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
    },
});

export default DeviceAdaptiveCard;