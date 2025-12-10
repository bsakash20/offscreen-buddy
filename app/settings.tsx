import React, { useState } from "react";
// Force reload
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";

import { useTimer } from "./_contexts/TimerContext";
import { useSupabaseAuth } from "./_contexts/SupabaseAuthContext";
import { useTheme } from "./_design-system/providers/ThemeProvider";
import PaymentModal from "./_components/Payment/PaymentModal";
import { paymentService } from "./_services/Payment/PaymentService";

// Setting Row Component for consistent list styling
const SettingItem = ({
  icon,
  title,
  subtitle,
  value,
  onToggle,
  onPress,
  type = "toggle", // 'toggle' | 'link' | 'value'
  chevron = false,
  destructive = false,
  theme
}: any) => {
  const colors = theme.colors;

  const content = (
    <View style={styles.settingItemContent}>
      <View style={[
        styles.iconContainer,
        { backgroundColor: destructive ? colors.semantic.error.light : 'rgba(255,255,255,0.08)' }
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? colors.semantic.error.main : colors.system.text.primary}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={[
          styles.itemTitle,
          { color: destructive ? colors.semantic.error.main : colors.system.text.primary }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.itemSubtitle, { color: colors.system.text.secondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {type === "toggle" && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.system.background.tertiary, true: colors.brand.primary[500] }}
          thumbColor={"#FFFFFF"}
          ios_backgroundColor={colors.system.background.tertiary}
        />
      )}

      {type === "link" && chevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.system.text.tertiary} />
      )}

      {type === "value" && (
        <Text style={[styles.valueText, { color: colors.system.text.secondary }]}>{value}</Text>
      )}
    </View>
  );

  if (type === "link" || onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.settingItem}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.settingItem}>{content}</View>;
};

export default function SettingsScreen() {
  const { user, subscription, logout } = useSupabaseAuth();
  const { theme: appTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = appTheme.colors;
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Adapter for theme prop
  const theme = {
    colors: colors
  };

  const hasPremiumAccess = subscription?.tier === 'pro';

  const handleUpgradePress = async () => {
    if (!user) {
      // Handle guest case if needed, or redirect to login
      return;
    }
    try {
      await paymentService.initialize(user.id);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Failed to initialize payment service:', error);
    }
  };








  return (
    <View style={[styles.container, { backgroundColor: colors.system.background.primary }]}>
      <LinearGradient
        colors={[colors.system.background.primary, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.system.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.system.text.primary }]}>Settings</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >




        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.system.text.tertiary }]}>ACCOUNT</Text>
          <View style={[styles.sectionBody, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
            <SettingItem
              theme={theme}
              icon="person"
              title={user?.email || "Guest"}
              subtitle={hasPremiumAccess ? "Pro Plan" : "Free Plan"}
              type="value"
              value=""
            />
            {!hasPremiumAccess && (
              <>
                <View style={[styles.separator, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                <SettingItem
                  theme={theme}
                  icon="diamond"
                  title="Upgrade to Pro"
                  subtitle="Unlock all features"
                  type="link"
                  chevron
                  onPress={handleUpgradePress}
                />
              </>
            )}
            <View style={[styles.separator, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
            <SettingItem
              theme={theme}
              icon="log-out-outline"
              title="Sign Out"
              type="link"
              destructive
              onPress={logout}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.system.text.tertiary }]}>
            Version 1.0.0 (Build 42)
          </Text>
        </View>

      </ScrollView >

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          // Optionally refresh subscription or show success alert
        }}
      />
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: -8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 24,
    gap: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
    opacity: 0.7,
  },
  sectionBody: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginLeft: 56, // Icon width + gap + padding
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
  }
});
