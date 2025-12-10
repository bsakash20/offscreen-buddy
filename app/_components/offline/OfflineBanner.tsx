/**
 * Offline Banner Component
 * 
 * Displays a banner when the app is offline or has poor connectivity.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useOffline } from '../../_hooks/useOffline';
import { NetworkQuality } from '../../_services/offline/types';

interface OfflineBannerProps {
    showOnPoorConnection?: boolean;
    onRetry?: () => void;
    customMessage?: string;
    style?: any;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
    showOnPoorConnection = true,
    onRetry,
    customMessage,
    style
}) => {
    const {
        isOffline,
        networkQuality,
        queuedOperationsCount,
        refreshState
    } = useOffline();

    const [slideAnim] = React.useState(new Animated.Value(-100));
    const [isVisible, setIsVisible] = React.useState(false);

    const shouldShow = isOffline || (showOnPoorConnection && networkQuality === NetworkQuality.POOR);

    React.useEffect(() => {
        if (shouldShow && !isVisible) {
            setIsVisible(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 10
            }).start();
        } else if (!shouldShow && isVisible) {
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true
            }).start(() => setIsVisible(false));
        }
    }, [shouldShow, isVisible, slideAnim]);

    const handleRetry = async () => {
        await refreshState();
        onRetry?.();
    };

    if (!isVisible && !shouldShow) {
        return null;
    }

    const getMessage = () => {
        if (customMessage) return customMessage;

        if (isOffline) {
            return queuedOperationsCount > 0
                ? `You're offline. ${queuedOperationsCount} operation${queuedOperationsCount > 1 ? 's' : ''} queued.`
                : "You're offline. Some features may be limited.";
        }

        if (networkQuality === NetworkQuality.POOR) {
            return "Poor connection. Some features may be slow.";
        }

        return "Connection issue detected.";
    };

    const getBannerStyle = () => {
        if (isOffline) {
            return styles.offlineBanner;
        }
        return styles.poorConnectionBanner;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                getBannerStyle(),
                { transform: [{ translateY: slideAnim }] },
                style
            ]}
        >
            <View style={styles.content}>
                <Text style={styles.icon}>
                    {isOffline ? '📡' : '⚠️'}
                </Text>
                <Text style={styles.message}>{getMessage()}</Text>
            </View>
            {onRetry && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                    activeOpacity={0.7}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 1000
    },
    offlineBanner: {
        backgroundColor: '#FF6B6B'
    },
    poorConnectionBanner: {
        backgroundColor: '#FFA726'
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    icon: {
        fontSize: 20,
        marginRight: 12
    },
    message: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        flex: 1
    },
    retryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 4,
        marginLeft: 12
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    }
});