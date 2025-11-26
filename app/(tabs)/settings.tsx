import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTimer } from "@/contexts/TimerContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import Colors from "@/assets/constants/colors";
import { NOTIFICATION_FREQUENCY_OPTIONS } from "@/assets/constants/notifications";
import PaymentButton from "../components/Payment/PaymentButton";
import { HapticUtils } from "@/utils/HapticManager";

export default function SettingsScreen() {
  const { settings, updateSettings } = useTimer();
  const { user, subscription, updateUserSubscription, logout } = useSupabaseAuth();
  const [showManageSubscription, setShowManageSubscription] = useState(false);
  const theme = Colors.dark;

  // Check if user has premium access (Pro tier includes all features)
  const hasPremiumAccess = subscription?.tier === 'pro';
  const isProUser = subscription?.tier === 'pro';

  // Handle payment success
  const handlePaymentSuccess = () => {
    console.log('Payment successful!');
    setShowManageSubscription(false);
    // The PaymentModal will handle subscription updates
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setShowManageSubscription(false);
  };

  // Dynamic island safe area padding
  const getTopPadding = () => {
    if (Platform.OS === 'ios') {
      return 60; // Extra padding for dynamic island
    }
    return 20;
  };

  const handleToggleFunnyMode = () => {
    HapticUtils.settingToggle();
    updateSettings({ funnyMode: !settings.funnyMode });
  };

  const handleFrequencyChange = (frequency: number) => {
    HapticUtils.settingAdjust();
    updateSettings({ notificationFrequency: frequency });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: getTopPadding() }
        ]}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Appearance
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }
                ]}>
                  <Ionicons name="moon" size={22} color={theme.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Dark Theme
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Always dark mode
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Notifications
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  {settings.funnyMode ? (
                    <Ionicons name="happy" size={20} color={theme.primary} />
                  ) : (
                    <Ionicons name="sad" size={20} color={theme.primary} />
                  )}
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Funny Mode
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {settings.funnyMode
                      ? "Humorous reminders"
                      : "Serious reminders"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.toggle,
                  {
                    backgroundColor: settings.funnyMode
                      ? theme.primary
                      : theme.surfaceSecondary,
                  },
                ]}
                onPress={handleToggleFunnyMode}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    {
                      backgroundColor: "#FFFFFF",
                      transform: [
                        {
                          translateX: settings.funnyMode ? 24 : 2,
                        },
                      ],
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.settingRow, styles.settingColumn]}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Notification Frequency
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    How often to remind you
                  </Text>
                </View>
              </View>

              <View style={styles.frequencyOptions}>
                {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyButton,
                      {
                        backgroundColor:
                          settings.notificationFrequency === option.value
                            ? theme.primary
                            : theme.surfaceSecondary,
                        borderColor:
                          settings.notificationFrequency === option.value
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                    onPress={() => handleFrequencyChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        {
                          color:
                            settings.notificationFrequency === option.value
                              ? "#FFFFFF"
                              : theme.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.surfaceSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              How it works
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Set a timer and lock your phone. If you unlock it while the timer
              is running, you'll receive notifications reminding you to lock it
              again. Stay focused and disciplined!
            </Text>
          </View>
        </View>

        {/* Premium Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {hasPremiumAccess ? "💎 Pro Features" : "🔓 Unlock Pro"}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Timer Lock Mode */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark" size={20} color={hasPremiumAccess ? theme.primary : theme.textSecondary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: hasPremiumAccess ? theme.text : theme.textSecondary }]}>
                    Timer Lock Mode
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: hasPremiumAccess ? theme.textSecondary : theme.textSecondary },
                    ]}
                  >
                    {hasPremiumAccess
                      ? "Cannot pause/cancel during active timer"
                      : "Block pause/cancel - stay committed!"
                    }
                  </Text>
                </View>
              </View>

              {hasPremiumAccess && subscription?.features?.includes('timer_lock') ? (
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: settings.timerLockEnabled
                        ? theme.primary
                        : theme.surfaceSecondary,
                    },
                  ]}
                  onPress={() => updateSettings({ timerLockEnabled: !settings.timerLockEnabled })}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: "#FFFFFF",
                        transform: [
                          {
                            translateX: settings.timerLockEnabled ? 24 : 2,
                          },
                        ],
                      },
                    ]}
                  />
                </TouchableOpacity>
              ) : (
                <PaymentButton
                  title="Upgrade"
                  style={[
                    styles.upgradeButton,
                    { backgroundColor: theme.warning || '#FF9500' }
                  ]}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Smart Notifications */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={20} color={hasPremiumAccess ? theme.primary : theme.textSecondary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: hasPremiumAccess ? theme.text : theme.textSecondary }]}>
                    Smart Notifications
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: hasPremiumAccess ? theme.textSecondary : theme.textSecondary },
                    ]}
                  >
                    {hasPremiumAccess
                      ? "Only when phone is unlocked"
                      : "Intelligent timing - no spam notifications"
                    }
                  </Text>
                </View>
              </View>

              {hasPremiumAccess && subscription?.features?.includes('smart_notifications') ? (
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: settings.smartNotificationsEnabled
                        ? theme.primary
                        : theme.surfaceSecondary,
                    },
                  ]}
                  onPress={() => updateSettings({ smartNotificationsEnabled: !settings.smartNotificationsEnabled })}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: "#FFFFFF",
                        transform: [
                          {
                            translateX: settings.smartNotificationsEnabled ? 24 : 2,
                          },
                        ],
                      },
                    ]}
                  />
                </TouchableOpacity>
              ) : (
                <PaymentButton
                  title="Upgrade"
                  style={[
                    styles.upgradeButton,
                    { backgroundColor: theme.warning || '#FF9500' }
                  ]}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
            </View>

            {/* Analytics Dashboard (Pro only) */}
            {isProUser && subscription?.features?.includes('analytics') && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="analytics" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        Analytics Dashboard
                      </Text>
                      <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                        Detailed focus insights and progress tracking
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.proBadge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.proBadgeText, { color: theme.textInverse }]}>PRO</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Security Features (Pro only) */}
            {isProUser && subscription?.features?.includes('security') && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="lock-closed" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        Security Features
                      </Text>
                      <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                        Emergency override and app blocking
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.proBadge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.proBadgeText, { color: theme.textInverse }]}>PRO</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Smart Automation (Pro only) */}
            {isProUser && subscription?.features?.includes('automation') && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="flash" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        Smart Automation
                      </Text>
                      <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                        AI-powered focus optimization
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.proBadge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.proBadgeText, { color: theme.textInverse }]}>PRO</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Pro Status */}
            {hasPremiumAccess && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="diamond" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        Pro Member
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: theme.textSecondary },
                        ]}
                      >
                        All features unlocked including Pro tools
                      </Text>
                      {subscription?.expiresAt && (
                        <Text style={[styles.subscriptionExpiry, { color: theme.textSecondary }]}>
                          Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.manageButton,
                      { backgroundColor: theme.surfaceSecondary }
                    ]}
                    onPress={() => setShowManageSubscription(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.manageButtonText, { color: theme.text }]}>
                      Manage
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Upgrade/Subscription Management */}
          {showManageSubscription && (
            <View
              style={[
                styles.subscriptionModal,
                { backgroundColor: theme.surface }
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {hasPremiumAccess ? 'Manage Subscription' : 'Upgrade to Pro'}
              </Text>

              {!hasPremiumAccess && (
                <View style={styles.subscriptionOptions}>
                  <PaymentButton
                    title="Upgrade to Pro"
                    style={[
                      styles.subscriptionOption,
                      { backgroundColor: theme.primary }
                    ]}
                    textStyle={styles.optionTitle}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </View>
              )}

              {hasPremiumAccess && (
                <View style={styles.subscriptionOptions}>
                  <TouchableOpacity
                    style={[
                      styles.subscriptionOption,
                      { backgroundColor: theme.surfaceSecondary }
                    ]}
                    onPress={() => {
                      // Handle subscription cancellation through backend
                      updateUserSubscription({
                        tier: 'free',
                        features: [],
                        expiresAt: null,
                      });
                      setShowManageSubscription(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionTitle, { color: theme.error || '#FF3B30' }]}>Cancel Subscription</Text>
                    <Text style={[styles.optionFeatures, { color: theme.textSecondary }]}>
                      You'll keep Pro features until your subscription expires.
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.closeModalButton,
                  { backgroundColor: theme.surfaceSecondary }
                ]}
                onPress={() => setShowManageSubscription(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeModalText, { color: theme.text }]}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upgrade Prompt for Free Users */}
          {!hasPremiumAccess && !showManageSubscription && (
            <View
              style={[
                styles.upgradeCard,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.warning || '#FF9500',
                },
              ]}
            >
              <View style={styles.upgradeIconContainer}>
                <Ionicons name="diamond" size={32} color={theme.warning || '#FF9500'} />
              </View>
              <View style={styles.upgradeContent}>
                <Text style={[styles.upgradeTitle, { color: theme.text }]}>
                  Unlock Pro Features
                </Text>
                <Text style={[styles.upgradeDescription, { color: theme.textSecondary }]}>
                  Get Timer Lock Mode, Smart Notifications, Analytics Dashboard, Smart Automation, Security Features, Team Management, and White Label options!
                </Text>
                <PaymentButton
                  style={styles.upgradeCTAButton}
                  title="Upgrade to Pro"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </View>
            </View>
          )}
        </View>

        {/* Account Section */}
        {subscription && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Account
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="person" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                      {user?.email}
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                      {hasPremiumAccess ? 'Pro member' : 'Free account'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={logout}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutText, { color: theme.error || '#FF3B30' }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingColumn: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  settingDescription: {
    fontSize: 13,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  frequencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  frequencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  upgradeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeContent: {
    flex: 1,
    gap: 8,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  upgradeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  upgradeCTAButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  upgradeCTAButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Premium Features Styles
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subscriptionExpiry: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Subscription Modal Styles
  subscriptionModal: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  subscriptionOptions: {
    gap: 12,
  },
  subscriptionOption: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionFeatures: {
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Account Section Styles
  logoutButton: {
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
