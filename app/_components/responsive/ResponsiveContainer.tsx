/**
 * ResponsiveContainer Component
 * Adaptive container that adjusts to screen size and orientation
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useScreenDimensions } from '../../_hooks/responsive/useScreenDimensions';
import { useOrientation } from '../../_hooks/responsive/useOrientation';
import { ResponsiveValue } from '../../_utils/responsive/BreakpointSystem';

export interface ResponsiveContainerProps {
    children: ReactNode;
    maxWidth?: number | ResponsiveValue<number>;
    padding?: number | ResponsiveValue<number>;
    margin?: number | ResponsiveValue<number>;
    centered?: boolean;
    fullWidth?: boolean;
    fullHeight?: boolean;
    style?: ViewStyle;
}

/**
 * Responsive container that adapts to screen size
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
    children,
    maxWidth,
    padding,
    margin,
    centered = false,
    fullWidth = false,
    fullHeight = false,
    style,
}) => {
    const { layout, getResponsiveValue } = useScreenDimensions();
    const { dimensions } = useOrientation();

    // Calculate responsive values
    const responsivePadding = padding !== undefined
        ? typeof padding === 'number'
            ? padding
            : getResponsiveValue(padding, 16)
        : layout.margins.left;

    const responsiveMargin = margin !== undefined
        ? typeof margin === 'number'
            ? margin
            : getResponsiveValue(margin, 0)
        : 0;

    const responsiveMaxWidth = maxWidth !== undefined
        ? typeof maxWidth === 'number'
            ? maxWidth
            : getResponsiveValue(maxWidth, dimensions.width)
        : layout.maxContentWidth;

    const containerStyle: ViewStyle = {
        width: fullWidth ? '100%' : responsiveMaxWidth || '100%',
        height: fullHeight ? '100%' : 'auto',
        paddingHorizontal: responsivePadding,
        paddingVertical: responsivePadding,
        marginHorizontal: centered ? 'auto' : responsiveMargin,
        marginVertical: responsiveMargin,
        alignSelf: centered ? 'center' : 'auto',
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

export default ResponsiveContainer;