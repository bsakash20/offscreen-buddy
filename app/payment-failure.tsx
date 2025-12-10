import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from './_assets/constants/colors';

export default function PaymentFailure() {
  const goBack = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Failed</Text>
      <Text style={styles.subtitle}>
        Your payment was not successful. Please try again or contact support if the problem persists.
      </Text>
      
      <TouchableOpacity style={styles.retryButton} onPress={goBack}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.contactButton} onPress={goBack}>
        <Text style={styles.contactButtonText}>Contact Support</Text>
      </TouchableOpacity>
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
    color: Colors.dark.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.dark.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButton: {
    paddingVertical: 8,
  },
  contactButtonText: {
    color: Colors.dark.primary,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});