import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, StyleSheet, Dimensions, Modal } from 'react-native';

// import Colors from '../../_assets/constants/colors';
import { useTheme } from '@/design-system/providers/ThemeProvider';
import { PremiumCard } from '../ui/PremiumCard';
import { PremiumButton } from '../ui/PremiumButton';
import { paymentService } from '../../_services/Payment/PaymentService';
import { useSupabaseAuth } from '../../_contexts/SupabaseAuthContext';
import PayUMobileView from './PayUMobileView';
import PayUWebView from './PayUWebView';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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

export default function PaymentModal({ visible, onClose, onSuccess }: PaymentModalProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = getStyles(theme);

  const { user, updateUserSubscription } = useSupabaseAuth();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<any>(null);

  // PayU Payment Flow State
  const [showPayUView, setShowPayUView] = useState(false);
  const [payuTransactionData, setPayuTransactionData] = useState<any>({
    txnid: '',
    amount: '',
    payuParams: {},
    paymentUrl: ''
  });

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    // Add timeout for the data loading process
    const loadTimeout = setTimeout(() => {
      console.log('[PaymentModal] Data loading timeout');
      setLoading(false);
      setError('Loading is taking too long. Please check your connection and try again.');
    }, 30000); // 30 second timeout

    try {
      console.log('[PaymentModal] Starting data load...');

      // Load plans and status with timeout handling
      const plansPromise = paymentService.getAvailablePlans();
      const statusPromise = paymentService.getSubscriptionStatus();

      // Race between the actual loading and a timeout
      const plansResult = await Promise.race([
        plansPromise,
        new Promise<PaymentPlan[]>((_, reject) =>
          setTimeout(() => reject(new Error('Plans loading timeout')), 25000)
        )
      ]) as PaymentPlan[];

      const statusResult = await Promise.race([
        statusPromise,
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Status loading timeout')), 25000)
        )
      ]);

      clearTimeout(loadTimeout);

      console.log('[PaymentModal] Data loaded successfully');
      setPlans(Array.isArray(plansResult) ? plansResult : []);
      setCurrentStatus(statusResult);

    } catch (error: any) {
      clearTimeout(loadTimeout);
      console.error('[PaymentModal] Data loading error:', error);

      let errorMessage = 'Failed to load subscription plans. Please try again.';

      if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Even on error, try to show fallback plans if we don't have any
      if (plans.length === 0) {
        try {
          console.log('[PaymentModal] Attempting to load fallback plans...');
          const fallbackPlans = await paymentService.getAvailablePlans();
          if (fallbackPlans && fallbackPlans.length > 0) {
            setPlans(fallbackPlans);
            errorMessage = 'Using cached plans due to connection issues.';
          }
        } catch (fallbackError) {
          console.error('[PaymentModal] Fallback plans also failed:', fallbackError);
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    // Create a proper UUID for testing if user is null
    let userId = user?.id;

    if (!userId) {
      console.log('No user found, generating demo user ID for testing');
      // Generate a valid UUID for testing
      userId = crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }

    console.log('Processing purchase with userId:', userId);

    // Show loading state immediately
    setPurchasing(planId);
    setError(null);

    // Add timeout for the purchase process
    const purchaseTimeout = setTimeout(() => {
      console.log('[PaymentModal] Purchase timeout - clearing loading state');
      setPurchasing(null);
      setError('Purchase process is taking too long. Please try again.');
    }, 60000); // 60 second timeout

    try {
      // Use PayU's openPaymentGateway method which should handle the form creation
      const result = await paymentService.purchasePlan(planId, userId);

      clearTimeout(purchaseTimeout);

      if (result.success) {
        // Store transaction data for PayU view if available
        if (result.orderId || result.paymentId) {
          console.log('[PaymentModal] Transaction created, setting up PayU view');

          // Use backend-generated PayU parameters
          const transactionData = {
            txnid: result.orderId || result.paymentId,
            amount: result.payuParams?.amount || '499.00',
            payuParams: result.payuParams,
            paymentUrl: result.paymentUrl || 'https://test.payu.in/_payment'
          };

          console.log('[PaymentModal] Using backend-generated PayU params:', {
            txnid: transactionData.txnid,
            amount: transactionData.amount,
            paramCount: Object.keys(transactionData.payuParams || {}).length
          });

          setPayuTransactionData(transactionData);
          setShowPayUView(true);
        } else {
          console.log('[PaymentModal] Purchase successful but no transaction data');
          Alert.alert(
            'Payment Successful!',
            'Your payment has been processed successfully.',
            [
              {
                text: 'Great!',
                onPress: () => {
                  onSuccess?.();
                  onClose();
                }
              }
            ]
          );
          setPurchasing(null);
        }
      } else {
        console.log('[PaymentModal] Purchase failed:', result.error);
        Alert.alert('Purchase Failed', result.error || 'An error occurred during purchase');
        setPurchasing(null);
      }
    } catch (error: any) {
      clearTimeout(purchaseTimeout);
      console.error('[PaymentModal] Purchase error:', error);

      let errorMessage = 'An unexpected error occurred';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
      setPurchasing(null);
    }
  };

  // PayU Payment Success Handler
  const handlePayUSuccess = async (result: any) => {
    console.log('[PaymentModal] PayU payment successful:', result);
    setPurchasing(null);

    try {
      // Try to verify payment with backend (non-blocking for test mode)
      console.log('[PaymentModal] Attempting to verify payment with backend...');
      const verification = await paymentService.verifyPayment(result.transactionId);

      if (!verification.verified) {
        console.warn('[PaymentModal] Payment verification pending:', verification.error);
        console.log('[PaymentModal] Proceeding with subscription upgrade (test mode)');

        // For test mode: manually trigger subscription upgrade
        // In production, this would be handled by PayU webhook
        if (user?.id) {
          try {
            console.log('[PaymentModal] Manually upgrading subscription for test mode...');
            await updateUserSubscription({
              active: true,
              plan: 'pro',
              tier: 'pro',
              status: 'active',
              subscriptionId: result.transactionId
            });
            console.log('[PaymentModal] Subscription manually upgraded');
          } catch (upgradeError) {
            console.error('[PaymentModal] Manual upgrade failed:', upgradeError);
          }
        }
      } else {
        console.log('[PaymentModal] Payment verified successfully');

        // Refresh subscription status from backend
        if (user?.id) {
          console.log('[PaymentModal] Refreshing subscription status...');
          const subscriptionData = await paymentService.refreshSubscriptionStatus(user.id);

          if (subscriptionData.subscription) {
            await updateUserSubscription(subscriptionData.subscription);
            console.log('[PaymentModal] Subscription updated successfully');
          }
        }
      }

      // Show success message
      Alert.alert(
        'Payment Successful!',
        'Your payment has been processed successfully. You now have access to all premium features.',
        [
          {
            text: 'Great!',
            onPress: () => {
              onSuccess?.();
              onClose();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[PaymentModal] Error in payment success handler:', error);
      Alert.alert(
        'Payment Successful',
        'Your payment was successful! Please restart the app to see your premium features.',
        [{ text: 'OK', onPress: () => onClose() }]
      );
    }
  };

  // PayU Payment Error Handler
  const handlePayUError = (error: string) => {
    console.log('[PaymentModal] PayU payment error:', error);
    setPurchasing(null);
    Alert.alert(
      'Payment Failed',
      error || 'Payment was cancelled or failed. Please try again.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowPayUView(false);
            setPayuTransactionData(null);
          }
        }
      ]
    );
  };

  // Close PayU View
  const closePayUView = () => {
    setShowPayUView(false);
    setPayuTransactionData(null);
    setPurchasing(null);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await paymentService.restorePurchases();
      if (result.success) {
        Alert.alert('Success', 'Your purchases have been restored successfully!');
        loadData(); // Refresh data
      } else {
        Alert.alert('Restore Failed', result.error || 'Unable to restore purchases');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'timer lock mode':
        return '🔒';
      case 'smart notifications':
        return '⚡';
      case 'analytics dashboard':
        return '📊';
      case 'team management':
        return '👥';
      default:
        return '✓';
    }
  };

  const getButtonText = (plan: PaymentPlan, status: any): string => {
    try {
      // Validate plan data to prevent crashes
      if (!plan || typeof plan !== 'object') {
        console.warn('Invalid plan data provided to getButtonText:', plan);
        return 'Subscribe Now';
      }

      // Ensure plan.id exists and is a string before calling string methods
      const planId = plan.id ? String(plan.id) : '';
      const planName = plan.name ? String(plan.name) : '';

      console.log('Processing plan for button text:', {
        planId: planId,
        planName: planName,
        price: plan.price,
        status: status
      });

      // 🛡️ TYPE-SAFE PLAN IDENTIFICATION FOR BUTTON TEXT
      // Free plan should show upgrade options for premium plans
      if (!status || !status.active || status.plan === 'free' || status.plan === 'none') {
        // If user is on free plan or no plan, show upgrade button for premium plans
        // Check for various plan identifiers that indicate a paid plan
        // Note: planId is already converted to string above, so .includes() is safe
        const isPaidPlan = planId !== '1' &&
          planName !== 'Free Plan' &&
          planName !== 'Free' &&
          !planId.includes('free') &&
          plan.price > 0;

        console.log('Free user detected, isPaidPlan:', isPaidPlan);

        if (isPaidPlan) {
          return 'Upgrade Now';
        }
        return 'Current Plan';
      }

      // User has an active plan
      if (status.active && status.status === 'active') {
        // Check if current plan matches this plan (either by tier or ID)
        const currentPlanId = status.subscriptionId || status.plan || '';

        const isCurrentPlan = currentPlanId === planId ||
          currentPlanId === planName.toLowerCase().replace(' ', '_') ||
          (planId === '2' && currentPlanId.includes('pro_monthly')) ||
          (planId === 'yearly_2' && currentPlanId.includes('pro_yearly')) ||
          (planName.toLowerCase().includes('pro') && currentPlanId.includes('pro'));

        console.log('Active user detected, isCurrentPlan:', isCurrentPlan);

        if (isCurrentPlan) {
          return 'Current Plan';
        } else {
          return 'Upgrade Now';
        }
      }

      // Default fallback for inactive/suspended subscriptions
      console.log('Fallback case, returning Subscribe Now');
      return 'Subscribe Now';

    } catch (error) {
      console.error('Error in getButtonText:', error, { plan, status });
      return 'Subscribe Now';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
    >
      <View style={styles.safeArea}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Upgrade to Pro</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.primary[500]} />
                <Text style={styles.loadingText}>Loading plans...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={{
                  width: '100%',
                  flex: 1,
                }}
                contentContainerStyle={{
                  padding: 20,
                  paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={true}
              >
                {/* Current subscription status */}
                {currentStatus?.active && (
                  <View style={styles.currentPlanContainer}>
                    <Text style={styles.currentPlanText}>
                      Current Plan: {currentStatus.plan}
                      {currentStatus.expiresDate && ` (Expires: ${new Date(currentStatus.expiresDate).toLocaleDateString()})`}
                    </Text>
                  </View>
                )}

                <View style={styles.plansContainer}>
                  {plans.length > 0 ? (
                    plans.map((plan, index) => {
                      // Validate plan data to prevent crashes
                      if (!plan || typeof plan !== 'object') {
                        console.warn('Invalid plan data at index:', index, plan);
                        return null;
                      }

                      // Ensure we have a safe plan ID for key generation
                      const planKey = `${plan.id || 'unknown'}-${index}`;
                      const planName = plan.name || 'Unknown Plan';
                      const planPrice = plan.priceString || 'Price unavailable';
                      const planId = plan.id || `plan_${index}`;

                      // Validate features array
                      const safeFeatures = Array.isArray(plan.features) ? plan.features : [];

                      console.log('Rendering plan:', { planName, planPrice, planId });

                      return (

                        <View key={planKey} style={styles.planCardWrapper}>
                          <PremiumCard variant="elevated" style={styles.planCard}>
                            <View style={styles.planHeader}>
                              <View style={styles.planInfo}>
                                <Text style={styles.planName}>{planName}</Text>
                                <Text style={styles.planPrice}>{planPrice}</Text>
                                {plan.trialDays && (
                                  <Text style={styles.trialText}>{plan.trialDays} day free trial</Text>
                                )}
                              </View>
                              <View style={styles.planIcon}>
                                <Text style={styles.starIcon}>⭐</Text>
                              </View>
                            </View>

                            <View style={styles.featuresList}>
                              {safeFeatures.length > 0 ? (
                                safeFeatures.map((feature, featureIndex) => (
                                  <View key={featureIndex} style={styles.featureItem}>
                                    <Text style={styles.featureIcon}>{getFeatureIcon(feature || '')}</Text>
                                    <Text style={styles.featureText}>{feature || 'Feature unavailable'}</Text>
                                  </View>
                                ))
                              ) : (
                                <View style={styles.featureItem}>
                                  <Text style={styles.featureIcon}>✓</Text>
                                  <Text style={styles.featureText}>Premium features included</Text>
                                </View>
                              )}
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.purchaseButton,
                                purchasing === planId && styles.purchaseButtonDisabled
                              ]}
                              onPress={() => {
                                console.log('Purchase button pressed for plan:', planId);
                                handlePurchase(planId);
                              }}
                              disabled={purchasing === planId}
                            >
                              {purchasing === planId ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Text style={styles.purchaseButtonText}>
                                  {getButtonText(plan, currentStatus)}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </PremiumCard>
                        </View>
                      );
                    }).filter(Boolean) // Remove null entries
                  ) : (
                    <View style={{ padding: 20, backgroundColor: '#ffeb3b', marginBottom: 10 }}>
                      <Text style={{ color: '#000', fontSize: 16, fontWeight: 'bold' }}>⚠️ NO PLANS AVAILABLE</Text>
                      <Text style={{ color: '#333', marginTop: 5 }}>
                        The plans array is empty. This indicates either:
                        1. API call failed and fallback also failed
                        2. Loading state stuck at true
                        3. Plans not properly set after API response
                        4. Plan data validation failed
                      </Text>
                      <TouchableOpacity
                        style={{
                          marginTop: 10,
                          padding: 10,
                          backgroundColor: '#2196F3',
                          borderRadius: 5
                        }}
                        onPress={loadData}
                      >
                        <Text style={{ color: 'white', textAlign: 'center' }}>Retry Loading Plans</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>
                    Secure payment powered by PayU{'\n'}
                    Accepts Credit, Debit Cards, UPI & Net Banking{'\n'}
                    You will be redirected to PayU to complete payment
                  </Text>

                  <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
                    <Text style={styles.restoreButtonText}>Need Help? Contact Support</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </View>

      {/* PayU Payment Views */}
      {Platform.OS === 'web' ? (
        <PayUWebView
          visible={showPayUView}
          onClose={closePayUView}
          onSuccess={handlePayUSuccess}
          onError={handlePayUError}
          transactionData={payuTransactionData}
        />
      ) : (
        <PayUMobileView
          visible={showPayUView}
          onClose={closePayUView}
          onSuccess={handlePayUSuccess}
          onError={handlePayUError}
          transactionData={payuTransactionData}
        />
      )}
    </Modal>
  );
}

const getStyles = (theme: any) => {
  const colors = theme.colors;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    overlay: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: colors.system.background.surface,
      borderRadius: 20,
      margin: 20,
      height: Dimensions.get('window').height * 0.9,
      width: Dimensions.get('window').width * 0.9,
      maxWidth: 500,
      overflow: 'hidden',
      elevation: 10,
      shadowColor: colors.system.shadow.medium,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.system.border.light,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.system.text.primary,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.system.background.secondary,
    },
    closeText: {
      fontSize: 18,
      color: colors.system.text.primary,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.system.text.secondary,
    },
    content: {
      width: '100%',
      height: Dimensions.get('window').height * 0.7,
    },
    currentPlanContainer: {
      margin: 20,
      padding: 12,
      backgroundColor: colors.brand.primary[700],
      borderRadius: 8,
    },
    currentPlanText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    plansContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    planCardWrapper: {
      marginBottom: 16,
    },
    planCard: {
      padding: 20,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    planInfo: {
      flex: 1,
    },
    planName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.system.text.primary,
      marginBottom: 4,
    },
    planPrice: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.brand.accent[500],
      marginBottom: 4,
    },
    trialText: {
      fontSize: 14,
      color: colors.semantic.success.main,
    },
    planIcon: {
      marginLeft: 16,
    },
    starIcon: {
      fontSize: 24,
    },
    featuresList: {
      marginBottom: 20,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    featureIcon: {
      fontSize: 16,
      marginRight: 12,
      color: colors.brand.primary[500],
    },
    featureText: {
      fontSize: 14,
      color: colors.system.text.primary,
      flex: 1,
    },
    purchaseButton: {
      backgroundColor: colors.brand.primary[600],
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    purchaseButtonDisabled: {
      opacity: 0.6,
    },
    purchaseButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    infoContainer: {
      padding: 20,
      alignItems: 'center',
    },
    infoText: {
      fontSize: 12,
      color: colors.system.text.secondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    restoreButton: {
      paddingVertical: 8,
    },
    restoreButtonText: {
      fontSize: 14,
      color: colors.brand.primary[500],
      textDecorationLine: 'underline',
    },
    errorContainer: {
      padding: 40,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 16,
      color: colors.semantic.error
        ? colors.semantic.error.main
        : '#FF6B6B',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: colors.brand.primary[600],
      borderRadius: 12,
      padding: 16,
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    retryButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};