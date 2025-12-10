/**
 * PayU Mobile View Component - WEBVIEW VERSION
 * Uses react-native-webview to handle PayU POST form submission
 */

import React, { useState } from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { type PayUPaymentResult } from '../../_services/Payment/PayUService';

interface PayUMobileViewProps {
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

export const PayUMobileView: React.FC<PayUMobileViewProps> = ({
    visible,
    onClose,
    onSuccess,
    onError,
    transactionData
}) => {
    const [loading, setLoading] = useState(true);

    // Construct HTML form for auto-submission
    const getPayUHtml = () => {
        const params = transactionData.payuParams || {};
        const action = transactionData.paymentUrl || 'https://test.payu.in/_payment';

        const inputs = Object.keys(params).map(key =>
            `<input type="hidden" name="${key}" value="${params[key]}" />`
        ).join('\n');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting to PayU...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background-color: #f5f5f5; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #10846D; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    p { margin-top: 20px; color: #666; }
                    .container { text-align: center; }
                </style>
            </head>
            <body onload="document.forms[0].submit()">
                <div class="container">
                    <div class="loader"></div>
                    <p>Redirecting to secure payment gateway...</p>
                </div>
                <form action="${action}" method="post">
                    ${inputs}
                </form>
            </body>
            </html>
        `;
    };

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;
        console.log('WebView navigation:', url);

        // Check for success URL
        if (url.includes('payu.in/sdk/success') || (transactionData.payuParams?.surl && url.includes(transactionData.payuParams.surl))) {
            onSuccess({
                id: transactionData.txnid,
                amount: Number(transactionData.amount),
                status: 'success',
                transactionId: transactionData.txnid
            });
            onClose();
        }
        // Check for failure URL
        else if (url.includes('payu.in/sdk/failure') || (transactionData.payuParams?.furl && url.includes(transactionData.payuParams.furl))) {
            onError('Payment failed or cancelled');
            onClose();
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Secure Payment</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                <WebView
                    source={{ html: getPayUHtml() }}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onNavigationStateChange={handleNavigationStateChange}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#10846D" />
                            <Text style={styles.loadingText}>Loading Payment Gateway...</Text>
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        fontSize: 16,
        color: '#FF3B30',
        fontWeight: '600',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
});

export default PayUMobileView;