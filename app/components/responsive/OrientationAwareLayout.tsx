/**
 * OrientationAwareLayout Component
 * Layout that automatically adapts to orientation changes
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { useOrientation } from '../../hooks/responsive/useOrientation';
import { useDeviceDetection } from '../../hooks/responsive/useDeviceDetection';

export interface OrientationAwareLayoutProps {
    children: ReactNode;
    portraitLayout?: 'column' | 'row';
    landscapeLayout?: 'column' | 'row';
    portraitSpacing?: number;
    landscapeSpacing?: number;
    portraitPadding?: number;
    landscapePadding?: number;
    animateTransition?: boolean;
    style?: ViewStyle;
}

/**
 * Layout that automatically adapts to orientation
 */
export const OrientationAwareLayout: React.FC<OrientationAwareLayoutProps> = ({
    children,
    portraitLayout = 'column',
    landscapeLayout = 'row',
    portraitSpacing = 16,
    landscapeSpacing = 24,
    portraitPadding = 16,
    landscapePadding = 24,
    animateTransition = true,
    style,
}) => {
    const { isPortrait, isTransitioning, transitionProgress } = useOrientation();
    const { isTablet } = useDeviceDetection();

    // Calculate current values based on orientation
    const flexDirection = isPortrait ? portraitLayout : landscapeLayout;
    const spacing = isPortrait ? portraitSpacing : landscapeSpacing;
    const padding = isPortrait ? portraitPadding : landscapePadding;

    // Tablet-specific adjustments
    const tabletMultiplier = isTablet ? 1.25 : 1;
    const adjustedSpacing = spacing * tabletMultiplier;
    const adjustedPadding = padding * tabletMultiplier;

    const containerStyle: ViewStyle = {
        flexDirection,
        gap: adjustedSpacing,
        padding: adjustedPadding,
        opacity: isTransitioning && animateTransition ? 0.8 + transitionProgress * 0.2 : 1,
    };

    return (
        <View style={[styles.container, containerStyle, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default OrientationAwareLayout;