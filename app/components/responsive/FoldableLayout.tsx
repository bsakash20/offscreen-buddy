/**
 * FoldableLayout Component
 * Layout component optimized for foldable devices
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import FoldableDeviceManager, { FoldInfo } from '../../services/responsive/FoldableDeviceManager';

export interface FoldableLayoutProps {
    masterContent: ReactNode;
    detailContent: ReactNode;
    showDivider?: boolean;
    dividerColor?: string;
    style?: ViewStyle;
}

/**
 * Layout optimized for foldable devices with master-detail pattern
 */
export const FoldableLayout: React.FC<FoldableLayoutProps> = ({
    masterContent,
    detailContent,
    showDivider = true,
    dividerColor = '#E0E0E0',
    style,
}) => {
    const [foldInfo, setFoldInfo] = useState<FoldInfo>(() =>
        FoldableDeviceManager.getFoldInfo()
    );

    useEffect(() => {
        const unsubscribe = FoldableDeviceManager.subscribe((info) => {
            setFoldInfo(info);
        });

        return unsubscribe;
    }, []);

    // If not foldable or folded, show only master content
    if (!foldInfo.isFoldable || foldInfo.state === 'folded') {
        return (
            <View style={[styles.container, style]}>
                {masterContent}
            </View>
        );
    }

    const adaptiveStyles = FoldableDeviceManager.getAdaptiveStyles();

    return (
        <View style={[styles.container, adaptiveStyles.container, style]}>
            <View style={adaptiveStyles.masterPane}>
                {masterContent}
            </View>

            {showDivider && foldInfo.hingeRect && (
                <View style={[adaptiveStyles.hinge, { backgroundColor: dividerColor }]} />
            )}

            <View style={adaptiveStyles.detailPane}>
                {detailContent}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default FoldableLayout;