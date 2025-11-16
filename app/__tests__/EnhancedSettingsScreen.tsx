import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { 
  Moon, 
  Bell, 
  Smile, 
  Meh, 
  Info,
  RotateCcw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTimer } from "../contexts/TimerContext";
import { NOTIFICATION_FREQUENCY_OPTIONS } from "@/assets/constants/notifications";

interface SettingCardProps {
  children: React.ReactNode;
  theme: any;
  onPress?: () => void;
  disabled?: boolean;
}

const SettingCard: React.FC<SettingCardProps> = ({ children, theme, onPress, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.card,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        opacity: disabled ? 0.6 : 1,
      },
    ]}
    onPress={onPress}
    disabled={disabled || !onPress}
    activeOpacity={0.7}
  >
    {children}
  </TouchableOpacity>
);

interface ToggleSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  theme: any;
  disabled?: boolean;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({
  icon,
  title,
  description,
  value,
  onToggle,
  theme,
  disabled = false,
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <View style={[
        styles.iconContainer,
        {
          backgroundColor: value ? theme.primary : theme.surfaceSecondary,
        }
      ]}>
        {icon}
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>

    <TouchableOpacity
      style={[
        styles.toggle,
        {
          backgroundColor: value ? theme.primary : theme.surfaceSecondary,
        },
        disabled && styles.toggleDisabled,
      ]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: "#FFFFFF",
            transform: [
              {
                translateX: value ? 24 : 2,
              },
            ],
          },
        ]}
      />
    </TouchableOpacity>
  </View>
);

export default function EnhancedSettingsScreen() {
  const { settings, updateSettings } = useTimer();
  const theme = require("@/assets/constants/colors").default.dark;

  const handleToggleFunnyMode = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ funnyMode: !settings.funnyMode });
  };

  const handleFrequencyChange = (frequency: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ notificationFrequency: frequency });
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            updateSettings({
              notificationFrequency: 30,
              funnyMode: true,
              theme: "dark",
            });
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const selectedFrequency = NOTIFICATION_FREQUENCY_OPTIONS.find(
    option => option.value === settings.notificationFrequency
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Appearance
          </Text>

          <SettingCard theme={theme}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary }
                ]}>
                  <Moon size={20} color="#FFFFFF" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Dark Theme
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Always dark mode
                  </Text>
                </View>
              </View>
            </View>
          </SettingCard>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Notifications
          </Text>

          <SettingCard theme={theme}>
            <ToggleSetting
              icon={settings.funnyMode ? 
                <Smile size={20} color="#FFFFFF" /> : 
                <Meh size={20} color="#FFFFFF" />
              }
              title="Funny Mode"
              description={settings.funnyMode ? "Humorous roast messages" : "Serious reminders"}
              value={settings.funnyMode}
              onToggle={handleToggleFunnyMode}
              theme={theme}
            />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary }
                ]}>
                  <Bell size={20} color="#FFFFFF" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Notification Frequency
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {selectedFrequency?.description}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.frequencyOptions}>
              {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyButton,
                    {
                      backgroundColor: settings.notificationFrequency === option.value
                        ? theme.primary
                        : theme.surfaceSecondary,
                      borderColor: settings.notificationFrequency === option.value
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
                        color: settings.notificationFrequency === option.value
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
          </SettingCard>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <SettingCard theme={theme} onPress={handleResetSettings}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: theme.error }
                ]}>
                  <RotateCcw size={20} color="#FFFFFF" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Reset Settings
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Restore all settings to default values
                  </Text>
                </View>
              </View>
            </View>
          </SettingCard>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={[
            styles.infoCard,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
            },
          ]}>
            <View style={styles.infoHeader}>
              <Info size={20} color={theme.primary} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>
                How ZenLock Works
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Set a timer and lock your phone. If you unlock it while the timer is running, 
              you'll receive notifications reminding you to lock it again. Stay focused and disciplined!
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary, marginTop: 8 }]}>
              Version 2.0 - Enhanced with smart notifications and premium design.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
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
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
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
    fontWeight: "600",
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
  toggleDisabled: {
    opacity: 0.5,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  frequencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});