// Import React and React Native components
import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, SafeAreaView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Import context and hooks
import { useTimer } from "../contexts/TimerContext";
import { useSupabaseAuth } from "../contexts/SupabaseAuthContext";

// Import utility functions
import { HapticUtils } from "../utils/HapticManager";
import { SoundUtils } from "../utils/SoundManager";

// Import our enhanced components
import TimerPicker from "../components/TimerPicker";
import CountdownDisplay from "../components/CountdownDisplay";
import CompletionModal from "../components/CompletionModal";
import PaymentButton from "../components/Payment/PaymentButton";

// Import enhanced systems (with fallback)
import Colors from "../assets/constants/colors";

// Advanced Pro Timer Presets
const TIMER_PRESETS = [
  { name: "Pomodoro", duration: 25 * 60, icon: "🍅", premium: false },
  { name: "Deep Focus", duration: 45 * 60, icon: "🧠", premium: false },
  { name: "Power Hour", duration: 60 * 60, icon: "⚡", premium: true },
  { name: "Study Block", duration: 90 * 60, icon: "📚", premium: true },
  { name: "Creative Flow", duration: 120 * 60, icon: "🎨", premium: true },
  { name: "Deep Work", duration: 180 * 60, icon: "💎", premium: true },
];

const FOCUS_MODES = [
  { id: 'standard', name: 'Standard Focus', icon: '🎯', description: 'Balanced notifications & alerts' },
  { id: 'deep', name: 'Deep Focus', icon: '🧘', description: 'Minimal distractions, max concentration' },
  { id: 'intensive', name: 'Intensive', icon: '🔥', description: 'Complete digital detox mode' },
  { id: 'adaptive', name: 'Adaptive', icon: '🧠', description: 'AI-powered distraction blocking', premium: true },
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

  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 5,
    seconds: 0,
  });

  const [showCompletion, setShowCompletion] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedFocusMode, setSelectedFocusMode] = useState('standard');
  const [analyticsData, setAnalyticsData] = useState({
    todaySessions: 0,
    totalFocusTime: 0,
    streak: 0,
  });

  const progressAnim = useRef(new Animated.Value(0)).current;
  const theme = Colors.dark;

  // Check premium access
  const hasPremiumAccess = subscription?.tier === 'pro';
  const hasProAccess = subscription?.tier === 'pro';

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
    if (preset.premium && !hasPremiumAccess) {
      return; // Don't allow selection without premium
    }

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

  const handleFocusModeSelect = (mode: typeof FOCUS_MODES[0]) => {
    if (mode.premium && !hasPremiumAccess) {
      return; // Don't allow selection without premium
    }
    setSelectedFocusMode(mode.id);
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
    console.log('Settings pressed');
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: "OffScreen Buddy Timer",
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLargeTitle: true,
          headerRight: () => (
            <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
              <Ionicons name="settings" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: getTopPadding() }
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

              {/* Pro Presets */}
              {hasPremiumAccess && (
                <View style={styles.presetsContainer}>
                  <Text style={[styles.presetsTitle, { color: theme.text }]}>
                    Quick Presets
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                    {TIMER_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.name}
                        style={[
                          styles.presetButton,
                          {
                            backgroundColor: preset.premium ? theme.primary : theme.surfaceSecondary,
                            opacity: preset.premium ? 1 : 0.8,
                            borderWidth: preset.premium ? 2 : 0,
                            borderColor: theme.accent,
                          }
                        ]}
                        onPress={() => handlePresetSelect(preset)}
                        disabled={preset.premium && !hasPremiumAccess}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.presetIcon}>{preset.icon}</Text>
                        <Text style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
                        <Text style={[styles.presetDuration, { color: theme.textSecondary }]}>
                          {Math.floor(preset.duration / 60)}m
                        </Text>
                        {preset.premium && <Text style={styles.premiumBadge}>PRO</Text>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Focus Mode Selection (Pro) */}
              {hasPremiumAccess && (
                <View style={styles.focusModesContainer}>
                  <Text style={[styles.presetsTitle, { color: theme.text }]}>
                    Focus Mode
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                    {FOCUS_MODES.map((mode) => (
                      <TouchableOpacity
                        key={mode.id}
                        style={[
                          styles.focusModeButton,
                          {
                            backgroundColor: selectedFocusMode === mode.id ? theme.primary : theme.surfaceSecondary,
                            borderWidth: selectedFocusMode === mode.id ? 2 : 1,
                            borderColor: selectedFocusMode === mode.id ? theme.accent : theme.textSecondary,
                            opacity: mode.premium && !hasProAccess ? 0.5 : 1,
                          }
                        ]}
                        onPress={() => handleFocusModeSelect(mode)}
                        disabled={mode.premium && !hasProAccess}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.presetIcon}>{mode.icon}</Text>
                        <Text style={[styles.presetName, { color: theme.text }]}>{mode.name}</Text>
                        <Text style={[styles.focusModeDesc, { color: theme.textSecondary }]}>
                          {mode.description}
                        </Text>
                        {mode.premium && <Text style={styles.premiumBadge}>PRO</Text>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Advanced Controls Toggle */}
              <TouchableOpacity
                style={[
                  styles.advancedToggle,
                  {
                    backgroundColor: showAdvanced ? theme.primary : theme.surfaceSecondary,
                  }
                ]}
                onPress={toggleAdvanced}
                activeOpacity={0.8}
              >
                <Text style={[styles.advancedToggleText, { color: theme.text }]}>
                  Advanced Features {showAdvanced ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {/* Advanced Features */}
              {showAdvanced && (
                <View style={styles.advancedContainer}>
                  {hasPremiumAccess ? (
                    <>
                      <Text style={[styles.advancedTitle, { color: theme.text }]}>
                        Pro Analytics
                      </Text>
                      <View style={styles.analyticsGrid}>
                        <View style={[styles.analyticsCard, { backgroundColor: theme.surface }]}>
                          <Text style={[styles.analyticsNumber, { color: theme.primary }]}>
                            {analyticsData.todaySessions}
                          </Text>
                          <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>
                            Today's Sessions
                          </Text>
                        </View>
                        <View style={[styles.analyticsCard, { backgroundColor: theme.surface }]}>
                          <Text style={[styles.analyticsNumber, { color: theme.accent }]}>
                            {Math.floor(analyticsData.totalFocusTime / 3600)}h
                          </Text>
                          <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>
                            Total Focus Time
                          </Text>
                        </View>
                        <View style={[styles.analyticsCard, { backgroundColor: theme.surface }]}>
                          <Text style={[styles.analyticsNumber, { color: theme.success || '#34C759' }]}>
                            {analyticsData.streak}
                          </Text>
                          <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>
                            Day Streak
                          </Text>
                        </View>
                      </View>

                      {/* Smart Automation Features */}
                      <Text style={[styles.advancedTitle, { color: theme.text }]}>
                        Smart Automation
                      </Text>
                      <View style={styles.smartFeatures}>
                        <TouchableOpacity style={[styles.smartFeature, { backgroundColor: theme.surface }]}>
                          <Ionicons name="notifications-outline" size={24} color={theme.text} />
                          <Text style={[styles.smartFeatureText, { color: theme.text }]}>
                            Auto-Breaks: Every 90min
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.smartFeature, { backgroundColor: theme.surface }]}>
                          <Ionicons name="flash-outline" size={24} color={theme.text} />
                          <Text style={[styles.smartFeatureText, { color: theme.text }]}>
                            AI Distraction Blocker
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View style={styles.upgradePrompt}>
                      <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
                      <Text style={[styles.upgradeTitle, { color: theme.text }]}>
                        Unlock Advanced Features
                      </Text>
                      <Text style={[styles.upgradeDesc, { color: theme.textSecondary }]}>
                        Get Pro presets, focus modes, analytics, and smart automation
                      </Text>
                      <PaymentButton
                        style={styles.upgradeButton}
                        onSuccess={() => {
                          console.log('Payment successful!');
                          // The PaymentModal will handle the success callback
                        }}
                        onError={(error) => {
                          console.error('Payment error:', error);
                        }}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Start Button */}
              <View style={styles.startButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: getTotalSeconds() > 0 ? 1 : 0.5,
                      shadowColor: theme.shadow,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                      elevation: 8,
                    },
                  ]}
                  onPress={handleStartTimer}
                  disabled={getTotalSeconds() <= 0}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.startButtonText, { color: theme.textInverse }]}>
                    START FOCUS {hasPremiumAccess ? '🔥' : '🎯'}
                  </Text>
                </TouchableOpacity>
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

              {/* Pro Running Features */}
              {hasPremiumAccess && (
                <View style={styles.runningFeatures}>
                  <View style={[styles.focusModeIndicator, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.focusModeText, { color: theme.text }]}>
                      {FOCUS_MODES.find(m => m.id === selectedFocusMode)?.icon} {FOCUS_MODES.find(m => m.id === selectedFocusMode)?.name}
                    </Text>
                  </View>
                </View>
              )}

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
                      ? `Stay focused! Smart notifications ${settings.smartNotificationsEnabled ? 'ON' : 'OFF'}`
                      : `Stay focused! Notifications every ${settings.notificationFrequency}s`
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
    </SafeAreaView>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  timerSetupContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  timerRunningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
  },
  startButtonContainer: {
    marginTop: 40,
    alignItems: "center",
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
    minWidth: 200,
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
  settingsButton: {
    marginRight: 16,
    padding: 8,
  },
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
