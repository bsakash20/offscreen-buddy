import { useTimer } from "@/contexts/TimerContext";
import { Stack } from "expo-router";
import { Settings } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, SafeAreaView } from "react-native";
import { HapticUtils } from "@/utils/HapticManager";
import { SoundUtils } from "@/utils/SoundManager";

// Import our enhanced components
import TimerPicker from "../components/TimerPicker";
import CountdownDisplay from "../components/CountdownDisplay";
import CompletionModal from "../components/CompletionModal";

// Import enhanced systems (with fallback)
import Colors from "@/assets/constants/colors";

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
  
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 5,
    seconds: 0,
  });
  
  const [showCompletion, setShowCompletion] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const theme = Colors.dark;

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

  const handleStartTimer = async () => {
    const totalSeconds = getTotalSeconds();
    
    if (totalSeconds <= 0) {
      return;
    }

    await playSound('start');
    startTimer(totalSeconds);
    setShowCompletion(false);
  };

  const handleCancelTimer = async () => {
    await playSound('cancel');
    stopTimer();
    setShowCompletion(false);
  };

  const handleTimerComplete = async () => {
    setShowCompletion(true);
    await playSound('complete');
  };

  const handleRestartFromCompletion = () => {
    setShowCompletion(false);
    handleStartTimer();
  };

  const handleCloseCompletion = () => {
    setShowCompletion(false);
  };

  const handleSettingsPress = () => {
    playSound('button');
    console.log('Settings pressed');
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
          title: "ZenLock Timer",
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLargeTitle: true,
          headerRight: () => (
            <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
              <Settings size={24} color={theme.text} />
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
                  <Text style={[styles.startButtonText, { color: theme.textInverse }]}>START FOCUS</Text>
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

              {/* Control Buttons */}
              <View style={styles.controlButtons}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.cancelButton,
                    {
                      backgroundColor: theme.error || '#FF3B30',
                      shadowColor: theme.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}
                  onPress={handleCancelTimer}
                  activeOpacity={0.8}
                >
                  <Text style={styles.controlButtonText}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.pauseButton,
                    {
                      backgroundColor: theme.accent,
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
                  activeOpacity={0.8}
                >
                  <Text style={styles.controlButtonText}>
                    {timerState.isPaused ? "▶" : "❚❚"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Info */}
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
});
