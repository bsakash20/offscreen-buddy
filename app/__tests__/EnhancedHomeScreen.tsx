import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { Pause, X, Play, Settings } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

// Import our enhanced components
import TimerPicker from "../components/TimerPicker";
import CountdownDisplay from "../components/CountdownDisplay";
import CompletionModal from "../components/CompletionModal";

// Import enhanced systems (with fallback)
import Colors from "@/assets/constants/colors";

interface EnhancedHomeScreenProps {
  // Props for integration
}

export default function EnhancedHomeScreen({}: EnhancedHomeScreenProps) {
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 5,
    seconds: 0,
  });
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState({
    funnyMode: true,
    theme: 'light' as 'light' | 'dark',
    soundEnabled: true,
    hapticEnabled: true,
    notificationFrequency: 30,
  });

  const timerRef = useRef<number | null>(null);
  const theme = Colors.dark;

  const handleTimeChange = (hours: number, minutes: number, seconds: number) => {
    setSelectedTime({ hours, minutes, seconds });
  };

  const getTotalSeconds = () => {
    return selectedTime.hours * 3600 + selectedTime.minutes * 60 + selectedTime.seconds;
  };

  const playSound = (type: 'start' | 'pause' | 'complete' | 'cancel' | 'button') => {
    if (!settings.soundEnabled) return;
    
    if (Platform.OS === "web") {
      // Simple console sound for web
      console.log(`🔊 Sound: ${type}`);
      return;
    }
    
    try {
      // Simple beep pattern for native
      const frequencies = {
        start: 800,
        pause: 400,
        complete: 523,
        cancel: 300,
        button: 440,
      };
      
      console.log(`🔊 Playing ${type} sound at ${frequencies[type]}Hz`);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  };

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.hapticEnabled || Platform.OS === "web") return;
    
    try {
      const hapticMap = {
        light: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        medium: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        heavy: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      };
      
      hapticMap[intensity];
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  };

  const sendNotification = (message: string) => {
    if (Platform.OS === "web") {
      console.log(`🔔 ${message}`);
      return;
    }

    try {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "ZenLock Timer 🔒",
          body: message,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Notification failed:', error);
    }
  };

  const getRoastMessage = () => {
    const funnyMessages = [
      "Hey! Lock your phone before it locks eyes with you again 👀",
      "Your screen needs a break — and so do you 💤",
      "Put me down, human. I'm tired of being touched 😂",
      "Discipline mode: ON. Lock me before I start roasting you 🔥",
      "Don't scroll, just soul! Lock your screen 🧘‍♂️",
      "Your phone misses its pocket. Let it rest 📱",
      "Still here? Your willpower called, it wants a word 💪",
      "Breaking: Phone discovers human has 'just checking' syndrome 📊",
    ];

    const seriousMessages = [
      "Please lock your phone to continue your focus session 🔒",
      "Lock your device to pause notifications ⏸️",
      "Focus mode active: Lock your phone 🎯",
      "Reminder: Lock your phone to stop notifications 📲",
      "Your timer is running. Lock your device 🔐",
    ];

    const messages = settings.funnyMode ? funnyMessages : seriousMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const startTimerLoop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const remaining = Math.max(0, currentTimer - Math.floor((Date.now() - startTimeRef.current) / 1000));
        
        if (remaining <= 0) {
          // Timer complete
          setIsTimerRunning(false);
          setShowCompletion(true);
          playSound('complete');
          triggerHaptic('heavy');
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          timerRef.current = null;
          return;
        }
        
        // Send notification every 30 seconds (or custom frequency)
        if (remaining % settings.notificationFrequency === 0) {
          sendNotification(getRoastMessage());
          triggerHaptic('medium');
        }
      }
    }, 1000);
  };

  const startTimeRef = useRef<number>(0);

  const handleStartTimer = () => {
    const totalSeconds = getTotalSeconds();
    
    if (totalSeconds <= 0) {
      return;
    }

    // Enhanced feedback
    playSound('start');
    triggerHaptic('light');

    setCurrentTimer(totalSeconds);
    setIsTimerRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    startTimerLoop();
  };

  const handlePauseTimer = () => {
    playSound(isPaused ? 'start' : 'pause');
    triggerHaptic('medium');
    setIsPaused(!isPaused);
  };

  const handleCancelTimer = () => {
    playSound('cancel');
    triggerHaptic('heavy');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTimerRunning(false);
    setIsPaused(false);
    setCurrentTimer(0);
  };

  const handleTimerComplete = () => {
    setIsTimerRunning(false);
    setShowCompletion(true);
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
    triggerHaptic('light');
    // Navigate to settings (implement navigation)
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getRemainingTime = () => {
    if (!isTimerRunning || currentTimer === 0) return 0;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    return Math.max(0, currentTimer - elapsed);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!isTimerRunning ? (
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
                    },
                  ]}
                  onPress={handleStartTimer}
                  disabled={getTotalSeconds() <= 0}
                  activeOpacity={0.8}
                >
                  <Play size={24} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>START FOCUS</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Feature Preview */}
            <View style={styles.featurePreview}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                What You'll Get
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: theme.accent }]}>🔔</Text>
                  <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                    Smart roast notifications every {settings.notificationFrequency}s
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: theme.accent }]}>🎯</Text>
                  <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                    Lock/unlock detection
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: theme.accent }]}>🎵</Text>
                  <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                    Sound & haptic feedback
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={[styles.featureIcon, { color: theme.accent }]}>😄</Text>
                  <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                    {settings.funnyMode ? "Humorous roast messages" : "Professional reminders"}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Running Timer */}
            <View style={styles.timerRunningContainer}>
              <CountdownDisplay
                remainingTime={getRemainingTime()}
                duration={currentTimer}
                theme={theme}
                onAnimationComplete={handleTimerComplete}
              />

              {/* Control Buttons */}
              <View style={styles.controlButtons}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.cancelButton,
                    { backgroundColor: theme.error },
                  ]}
                  onPress={handleCancelTimer}
                  activeOpacity={0.8}
                >
                  <X size={28} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.pauseButton,
                    { backgroundColor: theme.accent },
                  ]}
                  onPress={handlePauseTimer}
                  activeOpacity={0.8}
                >
                  {isPaused ? (
                    <Play size={32} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <Pause size={32} color="#FFFFFF" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Status Info */}
              <View style={[
                styles.statusCard,
                { backgroundColor: theme.surfaceSecondary }
              ]}>
                <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                  {isPaused 
                    ? "Timer paused - lock your phone to continue" 
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
        duration={currentTimer}
        onRestart={handleRestartFromCompletion}
        onClose={handleCloseCompletion}
        theme={theme}
      />
    </View>
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
    paddingTop: 20,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  featurePreview: {
    marginTop: 20,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  featureIcon: {
    fontSize: 20,
    width: 24,
  },
  featureText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
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