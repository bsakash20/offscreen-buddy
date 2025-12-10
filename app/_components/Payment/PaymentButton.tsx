import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, View } from 'react-native';
import Colors from '../../_assets/constants/colors';
import PaymentModal from './PaymentModal';
import { paymentService } from '../../_services/Payment/PaymentService';
import { useSupabaseAuth } from '../../_contexts/SupabaseAuthContext';

interface PaymentButtonProps {
  title?: string;
  style?: any;
  textStyle?: any;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function PaymentButton({
  title = "Upgrade to Pro",
  style,
  textStyle,
  onSuccess,
  onError,
  disabled = false
}: PaymentButtonProps) {
  const { user } = useSupabaseAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to upgrade your subscription');
      return;
    }

    if (disabled) return;

    try {
      // Initialize payment service if needed
      await paymentService.initialize(user.id);
      console.log('Payment service initialized, showing payment modal');
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Failed to initialize payment service:', error);
      Alert.alert('Error', 'Unable to initialize payment system. Please try again.');
    }
  };

  const handlePaymentSuccess = () => {
    onSuccess?.();
    setShowPaymentModal(false);
  };

  const handlePaymentError = (error: string) => {
    onError?.(error);
    setShowPaymentModal(false);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          {
            backgroundColor: Colors.dark.primary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.6 : 1,
          },
          style
        ]}
        onPress={handlePress}
        disabled={disabled || loading}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={[{ color: '#ffffff', marginLeft: 8, fontSize: 16, fontWeight: '600' }, textStyle]}>
              Processing...
            </Text>
          </View>
        ) : (
          <Text style={[{ color: '#ffffff', fontSize: 16, fontWeight: '600' }, textStyle]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>

      <PaymentModal
        visible={showPaymentModal}
        onClose={handleCloseModal}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}