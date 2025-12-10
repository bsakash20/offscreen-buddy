// Import React and React Native components
import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import context and hooks
import { useTimer } from "./_contexts/TimerContext";
import { useSupabaseAuth } from "./_contexts/SupabaseAuthContext";

// Import utility functions
import { HapticUtils } from "./_utils/HapticManager";
import { SoundUtils } from "./_utils/SoundManager";

// Import our enhanced components
import TimerPicker from "./_components/TimerPicker";
import CountdownDisplay from "./_components/CountdownDisplay";
import CompletionModal from "./_components/CompletionModal";
import PaymentButton from "./_components/Payment/PaymentButton";

// Import enhanced systems (with fallback)
import { useTheme } from "./_design-system/providers/ThemeProvider";
import { PremiumButton } from "./_components/ui/PremiumButton";
import { StartTimerButton } from "./_components/Timer/StartTimerButton";
import { LinearGradient } from "expo-linear-gradient";

// Advanced Pro Timer Presets
const TIMER_PRESETS = [
  { name: "Pomodoro", duration: 25 * 60, icon: "🍅", premium: false },
  { name: "Deep Focus", duration: 45 * 60, icon: "🧠", premium: false },
  { name: "Power Hour", duration: 60 * 60, icon: "⚡", premium: false },
  { name: "Study Block", duration: 90 * 60, icon: "📚", premium: false },
  { name: "Creative Flow", duration: 120 * 60, icon: "🎨", premium: false },
  { name: "Deep Work", duration: 180 * 60, icon: "💎", premium: false },
];



// Enhanced Sound Management
const playSound = async (type: 'start' | 'pause' | 'complete' | 'cancel' | 'button') => {
  try {
    const soundMap = {
      start: () => {
        HapticUtils.timerStart();
        SoundUtils.timerStart();
      },
      pause: () => {
        HapticUtils.timerPause();
        SoundUtils.timerPause();
      },
      complete: () => {
        HapticUtils.timerComplete();
        SoundUtils.completionFanfare();
      },
      cancel: () => {
        HapticUtils.timerCancel();
        SoundUtils.timerCancel();
      },
      button: () => {
        HapticUtils.settingToggle();
        SoundUtils.buttonPress();
      },
    };

    await soundMap[type]();
    console.log(`🔊 Playing ${type} sound with haptic`);
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
};

export default function EnhancedHomeScreen() {
  const { settings, timerState, startTimer, stopTimer, togglePause } = useTimer();
  const { subscription } = useSupabaseAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [showCompletion, setShowCompletion] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [analyticsData, setAnalyticsData] = useState({
    todaySessions: 0,
    totalFocusTime: 0,
    streak: 0,
  });

  const progressAnim = useRef(new Animated.Value(0)).current;

  const { theme: appTheme } = useTheme();
  const colors = appTheme.colors;

  // Adapter for legacy components causing 'theme' prop issues
  const theme = {
    background: colors.system.background.primary,
    surface: colors.system.background.surface,
    surfaceSecondary: colors.system.background.secondary,
    text: colors.system.text.primary,
    textSecondary: colors.system.text.secondary,
    textInverse: colors.system.text.inverse,
    primary: colors.brand.primary[500],
    secondary: colors.brand.primary[600],
    accent: colors.brand.accent[500],
    error: colors.semantic.error.main,
    success: colors.semantic.success.main,
    warning: colors.semantic.warning.main,
    shadow: colors.system.shadow.medium,
  };

  // Check premium access
  const hasPremiumAccess = subscription?.tier === 'pro';


  // Dynamic island safe area padding
  const getTopPadding = () => {
    if (Platform.OS === 'ios') {
      return 60; // Extra padding for dynamic island
    }
    return 20;
  };

  const handleTimeChange = (hours: number, minutes: number, seconds: number) => {
    setSelectedTime({ hours, minutes, seconds });
  };

  const getTotalSeconds = () => {
    return selectedTime.hours * 3600 + selectedTime.minutes * 60 + selectedTime.seconds;
  };

  const handlePresetSelect = (preset: typeof TIMER_PRESETS[0]) => {
    // Pro check removed for Time Presets as requested - now free for all
    // if (preset.premium && !hasPremiumAccess) {
    //   return; 
    // }

    const hours = Math.floor(preset.duration / 3600);
    const minutes = Math.floor((preset.duration % 3600) / 60);
    const seconds = preset.duration % 60;

    setSelectedTime({ hours, minutes, seconds });

    // Stop existing timer and start new one
    if (timerState.isRunning) {
      stopTimer();
    }

    // Start timer immediately with preset duration
    startTimer(preset.duration);
    playSound('button');
  };



  const handleStartTimer = async () => {
    const totalSeconds = getTotalSeconds();

    if (totalSeconds <= 0) {
      return;
    }

    await playSound('start');
    startTimer(totalSeconds);
    setShowCompletion(false);
    setShowAdvanced(false);

    // Track analytics (premium feature)
    if (hasPremiumAccess) {
      setAnalyticsData(prev => ({
        ...prev,
        todaySessions: prev.todaySessions + 1,
        totalFocusTime: prev.totalFocusTime + totalSeconds,
      }));
    }
  };

  const handleCancelTimer = async () => {
    await playSound('cancel');
    stopTimer();
    setShowCompletion(false);
  };

  const handleTimerComplete = async () => {
    setShowCompletion(true);
    await playSound('complete');

    // Premium: Update streak and achievements
    if (hasPremiumAccess) {
      setAnalyticsData(prev => ({
        ...prev,
        streak: prev.streak + 1,
      }));
    }
  };

  const handleRestartFromCompletion = () => {
    setShowCompletion(false);
    handleStartTimer();
  };

  const handleCloseCompletion = () => {
    setShowCompletion(false);
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
    playSound('button');
  };

  const handleSettingsPress = () => {
    playSound('button');
    router.push('/settings');
  };

  const handleProfilePress = () => {
    playSound('button');
    router.push('/profile');
  };

  const handleUpgradePress = () => {
    playSound('button');
    // Payment flow is now handled directly by PaymentButton component
  };

  // Animation effects for timer
  useEffect(() => {
    if (timerState.isRunning) {
      const progress = timerState.duration
        ? 1 - timerState.remainingTime / timerState.duration
        : 0;

      Animated.spring(progressAnim, {
        toValue: progress,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();

      // Check for completion
      if (timerState.remainingTime <= 0) {
        handleTimerComplete();
      }
    } else {
      Animated.spring(progressAnim, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  }, [timerState.remainingTime, timerState.duration, timerState.isRunning]);

  return (
    <View style={[styles.container, { backgroundColor: colors.system.background.primary }]}>
      <LinearGradient
        colors={[colors.system.background.primary, '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            headerShown: false, // We'll use custom header or just safe area
          }}
        />

        {/* Custom Header with Inset Padding */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={handleProfilePress} style={styles.headerButton}>
            <Ionicons name="person-circle-outline" size={28} color={colors.system.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.system.text.primary }]}>Focus Timer</Text>

          <TouchableOpacity onPress={handleSettingsPress} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={26} color={colors.system.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: 20, // Separation from header
              paddingBottom: insets.bottom + 40 // Ensure content is above home indicator + spacing
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!timerState.isRunning ? (
            <>
              {/* Timer Setup */}
              <View style={styles.timerSetupContainer}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Set Your Focus Time
                </Text>

                <TimerPicker
                  onTimeChange={handleTimeChange}
                  theme={theme}
                  disabled={false}
                />

                {/* Pro Presets (Now Free) */}
                {(
                  <View style={styles.presetsContainer}>
                    <Text style={[styles.presetsTitle, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                      Quick Presets
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.presetsScroll}
                      contentContainerStyle={{ paddingHorizontal: 24 }}
                    >
                      {TIMER_PRESETS.map((preset) => (
                        <TouchableOpacity
                          key={preset.name}
                          style={[
                            styles.presetButton,
                            {
                              backgroundColor: preset.premium ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                              borderColor: preset.premium ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                              borderWidth: 1,
                            }
                          ]}
                          onPress={() => handlePresetSelect(preset)}
                          disabled={preset.premium && !hasPremiumAccess}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.presetIcon}>{preset.icon}</Text>
                          <Text style={[styles.presetName, { color: '#FFFFFF' }]}>{preset.name}</Text>
                          <Text style={[styles.presetDuration, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                            {Math.floor(preset.duration / 60)}m
                          </Text>
                          {preset.premium && <Text style={styles.premiumBadge}>PRO</Text>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Focus Mode Selection (Pro/Free) */}


                {/* Start Button */}
                <View style={styles.startButtonContainer}>
                  <StartTimerButton
                    onPress={handleStartTimer}
                    disabled={getTotalSeconds() <= 0}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Running Timer */}
              <View style={styles.timerRunningContainer}>
                <CountdownDisplay
                  remainingTime={timerState.remainingTime}
                  duration={timerState.duration}
                  theme={theme}
                  onAnimationComplete={handleTimerComplete}
                />



                {/* Lock Mode Indicator */}
                {settings.timerLockEnabled && hasPremiumAccess && (
                  <View style={[
                    styles.lockModeIndicator,
                    {
                      backgroundColor: theme.warning || '#FF9500',
                      shadowColor: theme.shadow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }
                  ]}>
                    <Text style={[styles.lockModeText, { color: theme.textInverse }]}>
                      🔒 LOCK MODE ACTIVE
                    </Text>
                    <Text style={[styles.lockModeSubtext, { color: theme.textInverse }]}>
                      Timer cannot be cancelled or paused
                    </Text>
                  </View>
                )}

                {/* Control Buttons */}
                <View style={styles.controlButtons}>
                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      styles.cancelButton,
                      {
                        backgroundColor: (settings.timerLockEnabled && hasPremiumAccess)
                          ? theme.surfaceSecondary || '#2C2C2E'
                          : theme.error || '#FF3B30',
                        shadowColor: theme.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 6,
                      },
                    ]}
                    onPress={handleCancelTimer}
                    disabled={settings.timerLockEnabled && hasPremiumAccess}
                    activeOpacity={(settings.timerLockEnabled && hasPremiumAccess) ? 1.0 : 0.8}
                  >
                    <Text style={[
                      styles.controlButtonText,
                      {
                        color: (settings.timerLockEnabled && hasPremiumAccess)
                          ? theme.textSecondary || '#8E8E93'
                          : '#FFFFFF'
                      }
                    ]}>
                      {settings.timerLockEnabled && hasPremiumAccess ? '🔒' : '✕'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      styles.pauseButton,
                      {
                        backgroundColor: (settings.timerLockEnabled && hasPremiumAccess)
                          ? theme.surfaceSecondary || '#2C2C2E'
                          : theme.accent,
                        shadowColor: theme.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 6,
                      },
                    ]}
                    onPress={async () => {
                      await playSound(timerState.isPaused ? 'start' : 'pause');
                      togglePause();
                    }}
                    disabled={settings.timerLockEnabled && hasPremiumAccess}
                    activeOpacity={(settings.timerLockEnabled && hasPremiumAccess) ? 1.0 : 0.8}
                  >
                    <Text style={[
                      styles.controlButtonText,
                      {
                        color: (settings.timerLockEnabled && hasPremiumAccess)
                          ? theme.textSecondary || '#8E8E93'
                          : '#FFFFFF'
                      }
                    ]}>
                      {settings.timerLockEnabled && hasPremiumAccess ? '🔒' : (timerState.isPaused ? "▶" : "❚❚")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Enhanced Status Info */}
                <View style={[
                  styles.statusCard,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 3,
                  }
                ]}>
                  <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                    {timerState.isPaused
                      ? "Timer paused - tap play to resume"
                      : hasPremiumAccess
                        ? `Stay focused! Smart notifications ${settings.smartNotificationsEnabled ? 'ON' : 'OFF'} `
                        : `Stay focused! Notifications every 5 s`
                    }
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Completion Modal */}
        <CompletionModal
          visible={showCompletion}
          duration={timerState.duration}
          onRestart={handleRestartFromCompletion}
          onClose={handleCloseCompletion}
          theme={theme}
        />
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, // Consistent padding
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
  },
  timerSetupContainer: {
    alignItems: "center",
    marginBottom: 40,
    width: '100%',
  },
  timerRunningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24, // Keep running view padded
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  startButtonContainer: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 24,
    width: '100%',
  },
  startButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    width: '100%', // Full width button within padding
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  controlButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 60,
    marginTop: 40,
    marginBottom: 20,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cancelButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  controlButtonText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "300",
  },
  statusCard: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    maxWidth: 300,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  // Merged into headerButton
  lockModeIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  lockModeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  lockModeSubtext: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.9,
  },
  // Premium Features Styles
  presetsContainer: {
    width: '100%',
    marginVertical: 20,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  presetsScroll: {
    maxHeight: 100,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  presetIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetDuration: {
    fontSize: 10,
    fontWeight: '400',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    color: '#000',
    fontSize: 8,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  focusModesContainer: {
    width: '100%',
    marginVertical: 20,
  },
  focusModeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  focusModeDesc: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  advancedToggle: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  advancedContainer: {
    width: '100%',
    marginVertical: 20,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyticsNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
  },
  smartFeatures: {
    gap: 12,
  },
  smartFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  smartFeatureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  upgradePrompt: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  runningFeatures: {
    marginVertical: 20,
  },
  focusModeIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  focusModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
