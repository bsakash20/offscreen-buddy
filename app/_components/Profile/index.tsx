import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/design-system/providers/ThemeProvider';
import { PremiumCard } from '../ui/PremiumCard';

const StubComponent = ({ name }: { name: string }) => {
    const { theme } = useTheme();
    return (
        <PremiumCard variant="glass">
            <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.system.text.primary, fontSize: 16, fontWeight: '600' }}>
                    {name}
                </Text>
                <Text style={{ color: theme.colors.system.text.secondary, marginTop: 4 }}>
                    Component Placeholder
                </Text>
            </View>
        </PremiumCard>
    );
};

export const ProfileHeader = (props: any) => <StubComponent name="Profile Header" />;
export const PersonalInfoForm = (props: any) => <StubComponent name="Personal Info Form" />;
export const PaymentMethodCard = (props: any) => <StubComponent name="Payment Method Card" />;
export const TransactionHistory = (props: any) => <StubComponent name="Transaction History" />;
export const ConsentManager = (props: any) => <StubComponent name="Consent Manager" />;
