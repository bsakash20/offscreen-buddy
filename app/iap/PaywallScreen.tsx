import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design-system/providers/ThemeProvider';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { paymentService } from '@/services/Payment/PaymentService';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import PayUMobileView from '@/components/Payment/PayUMobileView';
import PayUWebView from '@/components/Payment/PayUWebView';

interface PaymentPlan {
    id: string;
    name: string;
    price: number;
    priceString: string;
    interval: 'month' | 'year';
    features: string[];
    trialDays?: number;
    platform: 'payu';
}

export default function PaywallScreen() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const router = useRouter();
    const { user, updateUserSubscription } = useSupabaseAuth();

    const [plans, setPlans] = useState<PaymentPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    // PayU State
    const [showPayUView, setShowPayUView] = useState(false);
    const [payuTransactionData, setPayuTransactionData] = useState<any>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const availablePlans = await paymentService.getAvailablePlans();
            if (Array.isArray(availablePlans)) {
                setPlans(availablePlans);
                // Select the yearly plan by default if available, otherwise the first one
                const yearlyPlan = availablePlans.find(p => p.interval === 'year');
                if (yearlyPlan) {
                    setSelectedPlanId(yearlyPlan.id);
                } else if (availablePlans.length > 0) {
                    setSelectedPlanId(availablePlans[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to load plans:', error);
            Alert.alert('Error', 'Failed to load subscription plans. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedPlanId || !user?.id) return;

        setPurchasing(selectedPlanId);
        try {
            const result = await paymentService.purchasePlan(selectedPlanId, user.id);

            if (result.success) {
                if (result.orderId || result.paymentId) {
                    const transactionData = {
                        txnid: result.orderId || result.paymentId,
                        amount: result.payuParams?.amount || '499.00',
                        payuParams: result.payuParams,
                        paymentUrl: result.paymentUrl || 'https://test.payu.in/_payment'
                    };
                    setPayuTransactionData(transactionData);
                    setShowPayUView(true);
                } else {
                    // Direct success (e.g., test mode)
                    handleSuccess({ transactionId: 'test_transaction_id' });
                }
            } else {
                Alert.alert('Purchase Failed', result.error || 'An error occurred.');
                setPurchasing(null);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Purchase failed.');
            setPurchasing(null);
        }
    };

    const handleSuccess = async (result: any) => {
        setPurchasing(null);
        setShowPayUView(false);

        // Verify and update subscription
        if (user?.id) {
            const subscriptionData = await paymentService.refreshSubscriptionStatus(user.id);
            if (subscriptionData.subscription) {
                await updateUserSubscription(subscriptionData.subscription);
            }
        }

        Alert.alert(
            'Welcome to Pro!',
            'Your subscription is active. Enjoy all the premium features!',
            [{ text: 'Get Started', onPress: () => router.back() }]
        );
    };

    const handleError = (error: string) => {
        setPurchasing(null);
        setShowPayUView(false);
        Alert.alert('Payment Failed', error);
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            const result = await paymentService.restorePurchases();
            if (result.success) {
                Alert.alert('Success', 'Your purchases have been restored successfully!');
                // Optionally refresh subscription status here
                if (user?.id) {
                    const sub = await paymentService.refreshSubscriptionStatus(user.id);
                    if (sub.subscription) await updateUserSubscription(sub.subscription);
                }
            } else {
                Alert.alert('Restore Failed', result.error || 'Unable to restore purchases');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const styles = getStyles(theme);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.primary[500]} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color={colors.system.text.secondary} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.chip}>PREMIUM</Text>
                    <Text style={styles.title}>Unlock Full Potential</Text>
                    <Text style={styles.subtitle}>Get advanced focus tools and insights</Text>
                </View>

                <View style={styles.featuresContainer}>
                    {FEATURES.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name={feature.icon as any} size={20} color={colors.premium?.gold.main} />
                            </View>
                            <View style={styles.featureTextContainer}>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDescription}>{feature.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.plansContainer}>
                    {plans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                activeOpacity={0.9}
                                onPress={() => setSelectedPlanId(plan.id)}
                                style={styles.planWrapper}
                            >
                                <PremiumCard
                                    variant={isSelected ? 'elevated' : 'glass'}
                                    style={[styles.planCard, isSelected && styles.selectedPlanCard]}
                                >
                                    <View style={styles.planContent}>
                                        <View style={styles.planHeader}>
                                            <Text style={[styles.planName, isSelected && styles.selectedText]}>{plan.name}</Text>
                                            {plan.interval === 'year' && (
                                                <View style={styles.saveBadge}>
                                                    <Text style={styles.saveText}>BEST VALUE</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.planPrice, isSelected && styles.selectedText]}>{plan.priceString} <Text style={styles.interval}>/{plan.interval}</Text></Text>
                                    </View>
                                    <View style={styles.radioButton}>
                                        {isSelected && <View style={styles.radioButtonInner} />}
                                    </View>
                                </PremiumCard>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.footer}>
                    <PremiumButton
                        title={purchasing ? "Processing..." : "Subscribe Now"}
                        onPress={handlePurchase}
                        variant="gold"
                        disabled={!!purchasing || !selectedPlanId}
                        icon={purchasing ? undefined : "lock-open"}
                    />
                    <Text style={styles.disclaimer}>
                        Recurring billing. Cancel anytime.
                    </Text>
                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                        <Text style={styles.restoreText}>Restore Purchases</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* PayU Views */}
            {Platform.OS === 'web' ? (
                <PayUWebView
                    visible={showPayUView}
                    onClose={() => handleError('Cancelled')}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    transactionData={payuTransactionData}
                />
            ) : (
                <PayUMobileView
                    visible={showPayUView}
                    onClose={() => handleError('Cancelled')}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    transactionData={payuTransactionData}
                />
            )}
        </View>
    );
}

const FEATURES = [
    { icon: 'time', title: 'Unlimited Focus Time', description: 'Remove all daily limits' },
    { icon: 'stats-chart', title: 'Advanced Analytics', description: 'Detailed insights & trends' },
    { icon: 'notifications', title: 'Smart Notifications', description: 'Intelligent focus reminders' },
    { icon: 'shield-checkmark', title: 'Cloud Backup', description: 'Sync data across devices' },
];

const getStyles = (theme: any) => {
    const colors = theme.colors;
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.system.background.primary,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.system.background.primary,
        },
        scrollContent: {
            padding: 24,
            paddingBottom: 100,
        },
        closeButton: {
            alignSelf: 'flex-end',
            padding: 8,
            marginBottom: 16,
        },
        header: {
            alignItems: 'center',
            marginBottom: 40,
        },
        chip: {
            fontSize: 12,
            fontWeight: 'bold',
            color: colors.premium?.gold.main,
            letterSpacing: 1.5,
            marginBottom: 16,
            backgroundColor: colors.premium?.gold.main + '20',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 100,
            overflow: 'hidden',
        },
        title: {
            fontSize: 32,
            fontWeight: '800',
            color: colors.system.text.primary,
            textAlign: 'center',
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            color: colors.system.text.secondary,
            textAlign: 'center',
        },
        featuresContainer: {
            marginBottom: 40,
        },
        featureRow: {
            flexDirection: 'row',
            marginBottom: 24,
            alignItems: 'flex-start',
        },
        featureIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.system.background.secondary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
        },
        featureTextContainer: {
            flex: 1,
        },
        featureTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.system.text.primary,
            marginBottom: 4,
        },
        featureDescription: {
            fontSize: 14,
            color: colors.system.text.secondary,
            lineHeight: 20,
        },
        plansContainer: {
            marginBottom: 24,
        },
        planWrapper: {
            marginBottom: 16,
        },
        planCard: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
        },
        selectedPlanCard: {
            borderColor: colors.premium?.gold.main,
        },
        planContent: {
            flex: 1,
        },
        planHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
        },
        planName: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.system.text.primary,
            marginRight: 8,
        },
        planPrice: {
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.system.text.primary,
        },
        interval: {
            fontSize: 14,
            fontWeight: 'normal',
            color: colors.system.text.secondary,
        },
        selectedText: {
            color: colors.system.text.inverse, // If using gold variant, text needs to be dark
        },
        saveBadge: {
            backgroundColor: colors.semantic.success.main,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
        },
        saveText: {
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold',
        },
        radioButton: {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.system.border.main,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 16,
        },
        radioButtonInner: {
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.system.background.primary,
        },
        footer: {
            marginTop: 8,
            alignItems: 'center',
        },
        disclaimer: {
            fontSize: 12,
            color: colors.system.text.tertiary,
            marginTop: 16,
        },
        restoreButton: {
            marginTop: 16,
            padding: 8,
        },
        restoreText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.system.text.secondary,
            textDecorationLine: 'underline',
        }
    });
};
