
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Image,
    Platform
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useTheme } from './_design-system/providers/ThemeProvider';

import { useSupabaseAuth } from './_contexts/SupabaseAuthContext';
import { profileService, UserProfile, PaymentMethod } from './_services/Profile';
import { PremiumButton } from './_components/ui/PremiumButton';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, isAuthenticated, logout, isLoading: authLoading } = useSupabaseAuth();
    const { theme } = useTheme();
    const colors = theme.colors;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    // Fetch profile data
    const fetchProfileData = useCallback(async () => {
        if (!user?.id) return;

        try {
            profileService.initialize(user.id);
            const [profileResponse, paymentResponse] = await Promise.all([
                profileService.getProfile(),
                profileService.getPaymentMethods(),
            ]);

            if (profileResponse.success && profileResponse.data) {
                setProfile(profileResponse.data);
            } else {
                setProfile({
                    id: user.id,
                    email: user.email || '',
                    name: user.user_metadata?.name || 'User',
                    phone: '',
                    phoneCountryCode: '',
                    address: { city: '', country: '' },
                    createdAt: user.created_at || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
            if (paymentResponse.success && paymentResponse.data) {
                setPaymentMethods(paymentResponse.data);
            }
        } catch (error) {
            console.error('[ProfileScreen] Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.id) fetchProfileData();
        else setIsLoading(false);
    }, [user, fetchProfileData]);

    const handleLogout = async () => {
        try {
            await logout();
            profileService.clear();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAvatarChange = async () => {
        // Placeholder for image picker logic
        Alert.alert('Coming Soon', 'Profile picture upload will be available in the next update.');
    };

    // Render loading state
    if (authLoading || isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.background.primary }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={colors.brand.primary[500]} />
            </View>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.background.primary }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContent}>
                    <Text style={[styles.title, { color: colors.system.text.primary }]}>Sign In Required</Text>
                    <PremiumButton
                        title="Sign In"
                        onPress={() => router.replace('/(auth)/login')}
                        style={{ marginTop: 20 }}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.colors.system.background.primary, '#0f172a']}
                style={StyleSheet.absoluteFill}
            />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.system.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.system.text.primary }]}>Profile</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
                    <Ionicons name="log-out-outline" size={24} color={colors.semantic.error.main} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Hero */}
                <View style={styles.heroSection}>
                    <TouchableOpacity onPress={handleAvatarChange} style={styles.avatarContainer}>
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.brand.primary[500] }]}>
                                <Text style={styles.avatarInitials}>
                                    {(profile?.name || user.email || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={12} color="#FFF" />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.userName, { color: colors.system.text.primary }]}>
                        {profile?.name || 'OffScreen User'}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.system.text.secondary }]}>
                        {profile?.email || user.email}
                    </Text>

                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderColor: 'rgba(255, 215, 0, 0.3)' }]}>
                        <Text style={[styles.statusText, { color: '#FFD700' }]}>PRO MEMBER</Text>
                    </View>
                </View>

                {/* Info Cards */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.system.text.secondary }]}>PERSONAL INFO</Text>
                    <BlurView intensity={20} tint="dark" style={styles.card}>
                        <InfoRow label="Name" value={profile?.name || '-'} icon="person-outline" colors={colors} />
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                        <InfoRow label="Phone" value={profile?.phone || 'Not set'} icon="call-outline" colors={colors} />
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                        <InfoRow label="Location" value={profile?.address?.city || 'Not set'} icon="location-outline" colors={colors} />
                    </BlurView>
                </View>

                {/* Payment Methods */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.system.text.secondary }]}>PAYMENT METHODS</Text>
                        {paymentMethods.length > 0 && (
                            <TouchableOpacity onPress={() => Alert.alert('Manage', 'Manage Payments')}>
                                <Text style={{ color: colors.brand.primary[500], fontSize: 13, fontWeight: '600' }}>Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                            <BlurView key={method.id} intensity={20} tint="dark" style={[styles.card, { marginBottom: 10 }]}>
                                <View style={styles.paymentRow}>
                                    <Ionicons name="card-outline" size={24} color={colors.system.text.primary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.system.text.primary, fontWeight: '600' }}>•••• •••• •••• {method.last4}</Text>
                                        <Text style={{ color: colors.system.text.secondary, fontSize: 12 }}>Expires {method.expiryMonth}/{method.expiryYear}</Text>
                                    </View>
                                    {method.isDefault && (
                                        <Ionicons name="checkmark-circle" size={20} color={colors.brand.primary[500]} />
                                    )}
                                </View>
                            </BlurView>
                        ))
                    ) : (
                        <BlurView intensity={20} tint="dark" style={[styles.card, { padding: 20, alignItems: 'center' }]}>
                            <Ionicons name="wallet-outline" size={32} color={colors.system.text.secondary} style={{ marginBottom: 8 }} />
                            <Text style={{ color: colors.system.text.secondary, marginBottom: 12 }}>No payment methods added</Text>
                            <PremiumButton
                                title="Add Payment Method"
                                size="sm"
                                variant="outline"
                                onPress={() => Alert.alert('Add Payment', 'To be implemented')}
                            />
                        </BlurView>
                    )}
                </View>



                {/* Danger Zone */}
                <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.semantic.error.main }]}
                    onPress={() => Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.')}
                >
                    <Text style={{ color: colors.semantic.error.main, fontWeight: '600' }}>Delete Account</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const InfoRow = ({ label, value, icon, colors }: { label: string, value: string, icon: any, colors: any }) => (
    <View style={styles.infoRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name={icon} size={18} color={colors.system.text.secondary} style={{ width: 24 }} />
            <Text style={{ color: colors.system.text.secondary, marginLeft: 8, fontSize: 14 }}>{label}</Text>
        </View>
        <Text style={{ color: colors.system.text.primary, fontWeight: '500', fontSize: 14 }}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarInitials: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFF',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        opacity: 0.7,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    divider: {
        height: 1,
        marginLeft: 56, // Align with text start
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        marginTop: 40,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 20,
    }
});
