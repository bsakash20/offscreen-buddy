import { useTimer } from "@/contexts/TimerContext";
import Colors from "@/assets/constants/colors";
import { NOTIFICATION_FREQUENCY_OPTIONS } from "@/assets/constants/notifications";
import { Stack } from "expo-router";
import { Moon, Bell, Smile, Meh } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
} from "react-native";
import { HapticUtils } from "@/utils/HapticManager";

export default function SettingsScreen() {
  const { settings, updateSettings } = useTimer();
  const theme = Colors.dark;

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
                  <Moon size={22} color={theme.primary} />
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
                    <Smile size={20} color={theme.primary} />
                  ) : (
                    <Meh size={20} color={theme.primary} />
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
                  <Bell size={20} color={theme.primary} />
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
              is running, you&apos;ll receive notifications reminding you to lock it
              again. Stay focused and disciplined!
            </Text>
          </View>
        </View>
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
});
