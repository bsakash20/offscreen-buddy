import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { AppState, Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { HapticUtils } from "@/utils/HapticManager";
import { SoundUtils } from "@/utils/SoundManager";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import {
  FUNNY_MESSAGES,
  SERIOUS_MESSAGES,
  MOTIVATIONAL_MESSAGES,
  DEFAULT_NOTIFICATION_FREQUENCY,
} from "@/assets/constants/notifications";
import { sessionService } from "../_services/SessionService";

// Utility function for debouncing
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

// Type definitions for stored data
interface StoredSettings {
  funnyMode?: boolean;
  notificationsEnabled?: boolean;
  timerLockEnabled?: boolean;
  smartNotificationsEnabled?: boolean;
  premiumTier?: 'free' | 'pro';
  emergencyOverridePin?: string;
}

interface StoredTimerState {
  isRunning: boolean;
  duration: number;
  remainingTime: number;
  startTime: number | null;
}

export type ThemeMode = "light" | "dark";

export type TimerSettings = {
  funnyMode: boolean;
  theme: ThemeMode;
  notificationsEnabled: boolean;
  // Pro features
  timerLockEnabled: boolean;
  smartNotificationsEnabled: boolean;
  premiumTier: 'free' | 'pro';
  emergencyOverridePin?: string;
};

export type TimerState = {
  isRunning: boolean;
  isPaused: boolean;
  duration: number;
  remainingTime: number;
  startTime: number | null;
  pauseTime: number | null; // When the timer was paused
};

const STORAGE_KEYS = {
  SETTINGS: "timer_settings",
  STATE: "timer_state",
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [TimerProvider, useTimer] = createContextHook(() => {
  // Use proper SupabaseAuth hook - circular dependency resolved
  const supabaseAuth = useSupabaseAuth();

  // Memoize derived values to prevent infinite re-renders with safe fallback
  const hasPremiumAccess = useMemo(() => supabaseAuth.subscription?.tier === 'pro', [supabaseAuth.subscription?.tier]);
  const features = useMemo(() => supabaseAuth.subscription?.features || [], [supabaseAuth.subscription?.features]);
  const currentTier = useMemo(() => supabaseAuth.subscription?.tier || 'free', [supabaseAuth.subscription?.tier]);

  const [settings, setSettings] = useState<TimerSettings>({
    funnyMode: true,
    theme: "dark",
    notificationsEnabled: false,
    timerLockEnabled: hasPremiumAccess && features.includes('timer_lock'),
    smartNotificationsEnabled: hasPremiumAccess && features.includes('smart_notifications'),
    premiumTier: currentTier,
  });

  // Update settings when subscription changes
  useEffect(() => {
    const newTierLockEnabled = hasPremiumAccess && features.includes('timer_lock');
    const newSmartNotificationsEnabled = hasPremiumAccess && features.includes('smart_notifications');
    const newPremiumTier = currentTier;

    // Only update if values have actually changed to prevent unnecessary re-renders
    if (
      settings.timerLockEnabled !== newTierLockEnabled ||
      settings.smartNotificationsEnabled !== newSmartNotificationsEnabled ||
      settings.premiumTier !== newPremiumTier
    ) {
      setSettings(prev => ({
        ...prev,
        timerLockEnabled: newTierLockEnabled,
        smartNotificationsEnabled: newSmartNotificationsEnabled,
        premiumTier: newPremiumTier,
      }));
    }
  }, [supabaseAuth.subscription, hasPremiumAccess, features, currentTier, settings.timerLockEnabled, settings.smartNotificationsEnabled, settings.premiumTier]);

  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    duration: 0,
    remainingTime: 0,
    startTime: null,
    pauseTime: null,
  });

  const notificationIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const currentAppStateRef = useRef(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    loadSettings();
    loadTimerState();
    requestNotificationPermissions();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasActive = currentAppStateRef.current === "active";
      const isActive = nextAppState === "active";

      console.log(
        `App state changed: ${currentAppStateRef.current} -> ${nextAppState}`,
      );

      currentAppStateRef.current = nextAppState;
      setIsAppActive(isActive);

      // Use functional state update to avoid stale closures
      setTimerState(currentState => {
        if (currentState.isRunning) {
          if (wasActive && !isActive) {
            console.log(
              "App went to background. Stopping notification loop.",
            );
            stopNotificationLoop();
          } else if (!wasActive && isActive) {
            console.log(
              "App came to foreground. Resuming notification loop.",
            );
            startNotificationLoop();
          }
        }
        return currentState;
      });
    });

    return () => {
      subscription.remove();
      clearAllIntervals();
    };
  }, []);

  useEffect(() => {
    saveSettings();
  }, [settings]);

  // Debounced save function to prevent excessive AsyncStorage writes
  const saveTimerState = useCallback(
    debounce(async (state: TimerState) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save timer state:', error);
      }
    }, 1000), // Save at most once per second
    []
  );

  // Only save on meaningful state changes, not on every remainingTime change
  useEffect(() => {
    if (timerState.isRunning) {
      // Save during active timer but with debouncing
      saveTimerState(timerState);
    }
  }, [timerState.isRunning, timerState.duration, timerState.startTime, saveTimerState]); // Include saveTimerState to ensure latest version

  const requestNotificationPermissions = async () => {
    if (Platform.OS === "web") {
      console.log("Notifications not fully supported on web");
      // Update settings to indicate notifications are disabled for web
      updateSettings({ notificationsEnabled: false });
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permissions not granted");
        // Update settings to disable timer functionality that requires notifications
        updateSettings({ notificationsEnabled: false });
      } else {
        console.log("Notification permissions granted");
        updateSettings({ notificationsEnabled: true });
      }
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      // Fallback to disabling notifications if there's an error
      updateSettings({ notificationsEnabled: false });
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        try {
          const parsed: StoredSettings = JSON.parse(stored);
          // Validate parsed data structure with comprehensive checks
          if (parsed && typeof parsed === 'object') {
            const validatedSettings: TimerSettings = {
              funnyMode: typeof parsed.funnyMode === 'boolean' ? parsed.funnyMode : true,
              theme: 'dark',
              notificationsEnabled: typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : false,
              timerLockEnabled: typeof parsed.timerLockEnabled === 'boolean' ? parsed.timerLockEnabled : false,
              smartNotificationsEnabled: typeof parsed.smartNotificationsEnabled === 'boolean' ? parsed.smartNotificationsEnabled : false,
              premiumTier: (parsed.premiumTier === 'free' || parsed.premiumTier === 'pro') ? parsed.premiumTier : 'free',
              emergencyOverridePin: typeof parsed.emergencyOverridePin === 'string' ? parsed.emergencyOverridePin : undefined,
            };
            setSettings(validatedSettings);
          }
        } catch (parseError) {
          console.warn('Invalid settings data, using defaults:', parseError);
          // Clear corrupted data
          try {
            await AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS);
          } catch (clearError) {
            console.error('Failed to clear corrupted settings:', clearError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Continue with default settings
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings),
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const loadTimerState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.STATE);
      if (stored) {
        try {
          const state: StoredTimerState = JSON.parse(stored);

          // Comprehensive state validation
          if (state && typeof state === 'object' &&
            typeof state.isRunning === 'boolean' &&
            typeof state.duration === 'number' && state.duration >= 0 &&
            typeof state.remainingTime === 'number' && state.remainingTime >= 0) {

            // Handle running state with startTime validation
            if (state.isRunning && state.startTime && typeof state.startTime === 'number') {
              const elapsed = Date.now() - state.startTime;
              const remaining = Math.max(0, state.duration * 1000 - elapsed);

              if (remaining > 0) {
                setTimerState({
                  ...state,
                  remainingTime: Math.ceil(remaining / 1000),
                  isPaused: false,
                  pauseTime: null,
                });
                startTimer(state.duration, state.startTime);
              } else {
                // Timer has completed while app was closed
                setTimerState({
                  isRunning: false,
                  isPaused: false,
                  duration: 0,
                  remainingTime: 0,
                  startTime: null,
                  pauseTime: null,
                });
              }
            } else if (state.isRunning && !state.startTime) {
              // Invalid running state without startTime - reset
              console.warn('Invalid running state without startTime, resetting timer');
              setTimerState({
                isRunning: false,
                isPaused: false,
                duration: 0,
                remainingTime: 0,
                startTime: null,
                pauseTime: null,
              });
            }
          }
        } catch (parseError) {
          console.warn('Invalid timer state data, clearing corrupted data:', parseError);
          try {
            await AsyncStorage.removeItem(STORAGE_KEYS.STATE);
          } catch (clearError) {
            console.error('Failed to clear corrupted timer state:', clearError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load timer state:', error);
    }
  };


  const clearAllIntervals = () => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const sendNotification = async () => {
    try {
      // Smart Notifications: Only send when phone is unlocked and app is active
      if (settings.smartNotificationsEnabled && settings.premiumTier !== 'free') {
        // Check if app is in active state (phone unlocked)
        if (AppState.currentState !== 'active') {
          console.log('Smart notification blocked - phone not active');
          return;
        }

        // Additional check: if timer was recently started, give user a grace period
        if (timerState.startTime && Date.now() - timerState.startTime < 5000) {
          console.log('Smart notification blocked - grace period');
          return;
        }
      }

      if (Platform.OS === "web") {
        console.log("Notification:", getRandomMessage());
        return;
      }

      // Enhanced message selection based on timer progress
      const message = getEnhancedMessage();

      // Validate notification permissions before sending
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted, skipping notification');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "OffScreen Buddy Reminder 🔒",
          body: message,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
      // Don't throw error to prevent breaking the notification loop
    }
  };

  const getRandomMessage = () => {
    const messages = settings.funnyMode ? FUNNY_MESSAGES : SERIOUS_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getEnhancedMessage = () => {
    if (settings.smartNotificationsEnabled && settings.premiumTier !== 'free') {
      // Smart message selection based on timer progress
      const timerProgress = timerState.duration > 0 ? 1 - (timerState.remainingTime / timerState.duration) : 0;

      // Early phase (0-30%): More encouraging
      if (timerProgress < 0.3) {
        return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      }

      // Middle phase (30-70%): Mix of encouraging and category
      if (timerProgress < 0.7) {
        const allMessages = [...(settings.funnyMode ? FUNNY_MESSAGES : SERIOUS_MESSAGES), ...MOTIVATIONAL_MESSAGES];
        return allMessages[Math.floor(Math.random() * allMessages.length)];
      }

      // Late phase (70%+): More direct/roast messages
      const messages = settings.funnyMode ? FUNNY_MESSAGES : SERIOUS_MESSAGES;
      return messages[Math.floor(Math.random() * messages.length)];
    }

    // Fallback to regular message selection
    return getRandomMessage();
  };

  const startNotificationLoop = useCallback(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    sendNotification();

    notificationIntervalRef.current = setInterval(() => {
      console.log("Sending notification...");
      sendNotification();
    }, DEFAULT_NOTIFICATION_FREQUENCY * 1000); // Enforce default frequency
  }, []);

  const stopNotificationLoop = useCallback(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (durationInSeconds: number, existingStartTime?: number) => {
      clearAllIntervals();

      const startTime = existingStartTime || Date.now();

      setTimerState({
        isRunning: true,
        isPaused: false,
        duration: durationInSeconds,
        remainingTime: durationInSeconds,
        startTime,
        pauseTime: null,
      });

      if (isAppActive) {
        startNotificationLoop();
      }

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(
          0,
          durationInSeconds * 1000 - elapsed,
        );

        if (remaining <= 0) {
          completeTimer();
        } else {
          setTimerState((prev) => ({
            ...prev,
            remainingTime: Math.ceil(remaining / 1000),
          }));
        }
      }, 1000);
    },
    [isAppActive],
  );

  const stopTimer = useCallback(() => {
    // Check if Timer Lock Mode is enabled
    if (settings.timerLockEnabled && settings.premiumTier !== 'free' && timerState.isRunning) {
      console.log('Stop blocked by Timer Lock Mode');
      return;
    }

    clearAllIntervals();
    setTimerState({
      isRunning: false,
      isPaused: false,
      duration: 0,
      remainingTime: 0,
      startTime: null,
      pauseTime: null,
    });
  }, [settings.timerLockEnabled, settings.premiumTier, timerState.isRunning]);

  const completeTimer = useCallback(async () => {
    clearAllIntervals();
    setTimerState({
      isRunning: false,
      isPaused: false,
      duration: 0,
      remainingTime: 0,
      startTime: null,
      pauseTime: null,
    });

    if (Platform.OS !== "web") {
      try {
        // Use enhanced haptic and sound feedback
        await HapticUtils.timerComplete();
        await SoundUtils.completionFanfare();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🎉 Timer Complete!",
            body: "You did it! The phone missed you 😄",
            sound: true,
          },
          trigger: null,
        });
      } catch (error) {
        console.error("Failed to send completion notification:", error);
      }
    } else {
      console.log("Timer complete! 🎉");
    }

    // Save session to history
    if (timerState.startTime) {
      try {
        await sessionService.saveSession({
          startTime: timerState.startTime,
          endTime: Date.now(),
          duration: timerState.duration,
          completed: true
        });
      } catch (error) {
        console.error("Failed to save session history:", error);
      }
    }
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<TimerSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));

      if (
        timerState.isRunning &&
        isAppActive
      ) {
        stopNotificationLoop();
        startNotificationLoop();
      }
    },
    [timerState.isRunning, isAppActive, stopNotificationLoop, startNotificationLoop],
  );

  const pauseTimer = useCallback(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      // Check if Timer Lock Mode is enabled
      if (settings.timerLockEnabled && settings.premiumTier !== 'free') {
        console.log('Pause blocked by Timer Lock Mode');
        return;
      }

      clearAllIntervals();
      setTimerState(prev => ({
        ...prev,
        isPaused: true,
        pauseTime: Date.now(),
      }));
    }
  }, [timerState.isRunning, timerState.isPaused, settings.timerLockEnabled, settings.premiumTier]);

  const resumeTimer = useCallback(() => {
    if (timerState.isRunning && timerState.isPaused && timerState.pauseTime) {
      const pausedDuration = Date.now() - timerState.pauseTime;
      const newStartTime = (timerState.startTime || Date.now()) + pausedDuration;

      setTimerState(prev => ({
        ...prev,
        isPaused: false,
        pauseTime: null,
        startTime: newStartTime,
      }));

      // Restart the timer interval
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - newStartTime;
        const remaining = Math.max(
          0,
          timerState.duration * 1000 - elapsed,
        );

        if (remaining <= 0) {
          completeTimer();
        } else {
          setTimerState((prev) => ({
            ...prev,
            remainingTime: Math.ceil(remaining / 1000),
          }));
        }
      }, 1000);
    }
  }, [timerState.isRunning, timerState.isPaused, timerState.pauseTime, timerState.startTime, timerState.duration]);

  const togglePause = useCallback(() => {
    if (timerState.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [timerState.isPaused, pauseTimer, resumeTimer]);

  return {
    settings,
    updateSettings,
    timerState,
    startTimer,
    stopTimer,
    togglePause,
    isAppActive,
  };
});
