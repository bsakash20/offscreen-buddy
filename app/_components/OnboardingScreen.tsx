import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    Animated,
    SafeAreaView,
    TouchableOpacity,
    StatusBar,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../_design-system/providers/ThemeProvider';
import { PremiumButton } from './ui/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

const SLIDES: OnboardingSlide[] = [
    {
        id: '1',
        title: 'Focus on What Matters',
        description: 'Boost your productivity by blocking distracting apps and tracking your focused time.',
        icon: 'hourglass',
        color: '#4F46E5', // Indigo
    },
    {
        id: '2',
        title: 'Visualize Your Progress',
        description: 'Gain insights into your habits with beautiful analytics and detailed reports.',
        icon: 'stats-chart',
        color: '#10B981', // Emerald
    },
    {
        id: '3',
        title: 'Stay Secure & Private',
        description: 'Your data is encrypted and protected. We value your privacy above all else.',
        icon: 'shield-checkmark',
        color: '#F59E0B', // Amber
    },
    {
        id: '4',
        title: 'Stay Updated',
        description: 'Enable notifications to stay on track and get important updates about your focus sessions.',
        icon: 'notifications',
        color: '#EC4899', // Pink
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollToNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            if (currentIndex === 2) { // Before moving to Permissions slide (which is index 3)
                // Optional: Prepare anything? No.
            }
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // Logic for the last slide (Permissions) 'Get Started'
            await requestPermissions();
            onComplete();
        }
    };

    const requestPermissions = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            // We don't block if they say no, just proceed.
        } catch (error) {
            console.log('Permission request failed', error);
        }
    };

    const skip = () => {
        onComplete();
    };

    const renderItem = useCallback(({ item }: { item: OnboardingSlide }) => {
        return (
            <View style={[styles.slide, { width }]}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={[item.color, colors.system.background.surface]}
                        style={styles.iconBackground}
                    >
                        <Ionicons name={item.icon} size={100} color="#FFFFFF" />
                    </LinearGradient>
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.system.text.primary }]}>
                        {item.title}
                    </Text>
                    <Text style={[styles.description, { color: colors.system.text.secondary }]}>
                        {item.description}
                    </Text>
                </View>
            </View>
        );
    }, [colors]);

    return (
        <View style={[styles.container, { backgroundColor: colors.system.background.primary }]}>
            <StatusBar barStyle="light-content" />

            {/* Background Gradient */}
            <LinearGradient
                colors={[colors.system.background.primary, '#111827']} // Darker at bottom
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    {currentIndex < SLIDES.length - 1 && (
                        <TouchableOpacity onPress={skip} style={styles.skipButton}>
                            <Text style={[styles.skipText, { color: colors.system.text.secondary }]}>Skip</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={SLIDES}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />

                <View style={styles.footer}>
                    {/* Paginator */}
                    <View style={styles.paginator}>
                        {SLIDES.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [10, 20, 10],
                                extrapolate: 'clamp',
                            });

                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });

                            return (
                                <Animated.View
                                    key={i.toString()}
                                    style={[
                                        styles.dot,
                                        {
                                            width: dotWidth,
                                            opacity,
                                            backgroundColor: colors.brand.primary[500],
                                        },
                                    ]}
                                />
                            );
                        })}
                    </View>

                    {/* Next/Get Started Button */}
                    <View style={styles.buttonContainer}>
                        <PremiumButton
                            title={currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
                            onPress={scrollToNext}
                            size="lg"
                            variant={currentIndex === SLIDES.length - 1 ? "gold" : "primary"}
                            style={{ width: '100%' }}
                        />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
    },
    skipButton: {
        padding: 8,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        flex: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        width: '100%',
    },
    iconBackground: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    textContainer: {
        flex: 0.3,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    footer: {
        paddingHorizontal: 32,
        paddingBottom: Platform.OS === 'ios' ? 0 : 24,
        height: 180,
        justifyContent: 'space-between',
    },
    paginator: {
        flexDirection: 'row',
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 8,
    },
    buttonContainer: {
        marginBottom: 24,
    },
});
