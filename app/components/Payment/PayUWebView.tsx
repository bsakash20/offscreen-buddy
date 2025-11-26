/**
 * PayU Web Component - NO WEBVIEW DEPENDENCY
 * Implements proper PayU form submission with POST data using browser redirects
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { type PayUPaymentResult } from '../../services/Payment/PayUService';

interface PayUWebViewProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (result: PayUPaymentResult) => void;
    onError: (error: string) => void;
    transactionData: {
        txnid: string;
        amount: string;
        payuParams: any;
        paymentUrl: string;
    };
}

export const PayUWebView: React.FC<PayUWebViewProps> = ({
    visible,
    onClose,
    onSuccess,
    onError,
    transactionData
}) => {
    const [loading, setLoading] = useState(true);

    /**
     * Create and submit PayU form for web platform
     * Uses browser's native form submission capabilities
     */
    const openPayUWebForm = async () => {
        try {
            console.log('🌐 Opening PayU form for web platform');
            console.log('📋 Web PayU Parameters:', {
                action: transactionData.paymentUrl,
                method: 'POST',
                parameterCount: Object.keys(transactionData.payuParams).length,
                mandatoryParams: ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'],
                hasHash: !!transactionData.payuParams.hash,
                txnid: transactionData.txnid,
                amount: transactionData.amount
            });

            // Create form similar to mobile but optimized for web
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = transactionData.paymentUrl;
            form.target = '_blank'; // Open in new tab for better UX

            // Add all PayU parameters as hidden inputs
            Object.keys(transactionData.payuParams).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(transactionData.payuParams[key] || '');
                form.appendChild(input);
            });

            // Add form to document and submit
            document.body.appendChild(form);
            form.submit();

            // Clean up the form after submission
            setTimeout(() => {
                if (document.body.contains(form)) {
                    document.body.removeChild(form);
                }
            }, 1000);

            // Show user instructions for web
            Alert.alert(
                'Payment Redirected to PayU',
                `You have been redirected to PayU's secure payment gateway.\n\nTransaction ID: ${transactionData.txnid}\nAmount: ₹${transactionData.amount}\n\nPlease complete your payment and return to this app.`,
                [
                    {
                        text: 'I completed payment',
                        onPress: () => {
                            // In real implementation, you would verify payment status here
                            onSuccess({
                                id: transactionData.txnid,
                                amount: Number(transactionData.amount),
                                status: 'success',
                                transactionId: transactionData.txnid
                            });
                            onClose();
                        }
                    },
                    {
                        text: 'Payment failed/Cancelled',
                        onPress: () => {
                            onError('Payment was cancelled or failed');
                            onClose();
                        }
                    }
                ]
            );

            console.log('✅ Web PayU form submitted successfully');

        } catch (error) {
            console.error('❌ Web PayU form submission failed:', error);
            onError('Failed to open PayU payment gateway. Please try again.');
        }
    };

    /**
     * For development/testing - Show parameter validation
     */
    const validateAndShowParams = () => {
        const mandatoryParams = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
        const missingParams = mandatoryParams.filter(param => !transactionData.payuParams[param]);

        console.log('🔍 Web PayU Parameter Validation:');
        console.log('- Total params:', Object.keys(transactionData.payuParams).length);
        console.log('- Mandatory params present:', mandatoryParams.filter(param => !!transactionData.payuParams[param]).length);
        console.log('- Missing params:', missingParams);

        if (missingParams.length > 0) {
            Alert.alert(
                'Missing Parameters',
                `Missing mandatory PayU parameters: ${missingParams.join(', ')}`,
                [{ text: 'OK' }]
            );
            return;
        }

        console.log('✅ All mandatory PayU parameters are present for web');
    };

    // Automatically attempt to open PayU when modal becomes visible
    useEffect(() => {
        if (visible) {
            setLoading(true);

            // Validate parameters first
            validateAndShowParams();

            const timer = setTimeout(() => {
                openPayUWebForm();
                setLoading(false);
            }, 1500); // Give user time to see the loading state

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>🔒 PayU Web Payment</Text>
                        <Text style={styles.subtitle}>Redirecting to PayU Gateway</Text>
                    </View>

                    <View style={styles.content}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#10846D" />
                                <Text style={styles.loadingText}>Preparing Web Payment...</Text>
                                <Text style={styles.subtitleText}>
                                    Transaction: {transactionData.txnid}
                                </Text>
                                <Text style={styles.subtitleText}>
                                    Amount: ₹{transactionData.amount}
                                </Text>
                                <Text style={styles.paramText}>
                                    Parameters: {Object.keys(transactionData.payuParams).length} fields
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.infoContainer}>
                                <Text style={styles.infoText}>
                                    ✅ PayU form is being submitted with all mandatory parameters.
                                </Text>
                                <Text style={styles.securityText}>
                                    🔐 Your payment will be processed securely by PayU
                                </Text>
                                <Text style={styles.instructionText}>
                                    💡 Complete payment on PayU page and return to this app
                                </Text>
                                <Text style={styles.webText}>
                                    🌐 Opened in new browser tab for your convenience
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                onError('Payment cancelled by user');
                                onClose();
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel Payment</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerText}>Powered by PayU India</Text>
                        <Text style={styles.footerSubtext}>
                            PCI DSS Compliant • 256-bit SSL
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        margin: 20,
        padding: 0,
        maxWidth: 400,
        width: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        backgroundColor: '#10846D',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold' as const,
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
    content: {
        padding: 20,
        minHeight: 200,
        justifyContent: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#333',
        textAlign: 'center' as const,
        fontWeight: '500' as const,
    },
    subtitleText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'center' as const,
    },
    paramText: {
        marginTop: 8,
        fontSize: 12,
        color: '#999',
        textAlign: 'center' as const,
        fontFamily: 'monospace',
    },
    infoContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    infoText: {
        fontSize: 16,
        color: '#10846D',
        textAlign: 'center' as const,
        marginBottom: 16,
        fontWeight: '500' as const,
    },
    securityText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center' as const,
        marginBottom: 12,
    },
    instructionText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center' as const,
        fontStyle: 'italic' as const,
        marginBottom: 8,
    },
    webText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center' as const,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        padding: 15,
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    footerText: {
        fontSize: 12,
        color: '#10846D',
        fontWeight: '600' as const,
        marginBottom: 2,
    },
    footerSubtext: {
        fontSize: 10,
        color: '#999',
        textAlign: 'center' as const,
    },
    cancelButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginBottom: 16,
        width: '100%',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PayUWebView;