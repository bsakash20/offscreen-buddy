import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from './assets/constants/colors';
import { useSupabaseAuth } from './contexts/SupabaseAuthContext';
import { PayUPayment } from './services/Payment/PayUService';

export default function PaymentSuccess() {
  const { updateUserSubscription } = useSupabaseAuth();

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      // Parse URL parameters for PayU callback data
      const url = window.location.href;
      const urlParams = new URLSearchParams(url.split('?')[1]);

      // Extract PayU callback data
      const txnid = urlParams.get('txnid');
      const mihpayid = urlParams.get('mihpayid');
      const status = urlParams.get('status');
      const hash = urlParams.get('hash');
      const amount = urlParams.get('amount');
      const email = urlParams.get('email');
      const firstname = urlParams.get('firstname');

      if (txnid && mihpayid && status) {
        // Process the PayU callback
        const callbackData = {
          txnid,
          mihpayid,
          status,
          hash,
          amount,
          email,
          firstname,
          udf1: urlParams.get('udf1'), // userId
          udf2: urlParams.get('udf2'), // planId
        };

        const result = await PayUPayment.verifyPayment(callbackData);

        if (result) {
          // Update user subscription
          updateUserSubscription({
            tier: 'pro',
            features: [
              'timer_lock',
              'smart_notifications',
              'analytics',
              'automation',
              'security',
              'team',
              'white_label'
            ]
          });
        }
      }

      // Redirect back to the main app after a short delay
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }, 3000);
    } catch (error) {
      console.error('Error handling payment success:', error);
      // Still redirect to main app
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={styles.title}>Processing Payment...</Text>
      <Text style={styles.subtitle}>
        Please wait while we verify your payment and activate your subscription.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
});