import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import {
  FUNNY_MESSAGES,
  SERIOUS_MESSAGES,
  MOTIVATIONAL_MESSAGES,
  DEFAULT_NOTIFICATION_FREQUENCY,
  getSmartMessage,
  getEscalatingMessage,
  NotificationCategory,
  NOTIFICATION_CONFIG,
} from "@/assets/constants/notifications";

// Enhanced app states for better detection
export type AppStateType = 
  | 'active'           // App in foreground, screen unlocked
  | 'locked'           // App in foreground, screen locked
  | 'background'       // App in background, screen unlocked
  | 'background-locked'; // App in background, screen locked

// Enhanced timer states
export type EnhancedTimerState = {
  isRunning: boolean;
  duration: number;
  remainingTime: number;
  startTime: number | null;
  isPaused: boolean;
  lastActiveTime: number;
  notificationCount: number;
};

// Enhanced settings
export type EnhancedTimerSettings = {
  notificationFrequency: number;
  funnyMode: boolean;
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  aggressiveMode: boolean;
  backgroundMode: boolean;
};

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'zenlock_enhanced_settings',
  STATE: 'zenlock_enhanced_timer_state',
  HISTORY: 'zenlock_timer_history',
  STATS: 'zenlock_user_stats',
};

// Utility function for debouncing
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number) => {
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

// Enhanced notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [EnhancedTimerProvider, useEnhancedTimer] = createContextHook(() => {
  const [settings, setSettings] = useState<EnhancedTimerSettings>({
    notificationFrequency: DEFAULT_NOTIFICATION_FREQUENCY,
    funnyMode: true,
    theme: "light",
    notificationsEnabled: false,
    soundEnabled: true,
    hapticEnabled: true,
    aggressiveMode: false,
    backgroundMode: true,
  });

  const [timerState, setTimerState] = useState<EnhancedTimerState>({
    isRunning: false,
    duration: 0,
    remainingTime: 0,
    startTime: null,
    isPaused: false,
    lastActiveTime: Date.now(),
    notificationCount: 0,
  });

  const [appState, setAppState] = useState<AppStateType>('active');
  const [isAppActive, setIsAppActive] = useState(true);
  const [screenLocked, setScreenLocked] = useState(false);

  // Refs for timers and intervals
  const notificationIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const backgroundTimerRef = useRef<number | null>(null);
  const lastNotificationTime = useRef<number>(0);
  const sessionStartTime = useRef<number>(0);
  const appStateRef = useRef<AppStateType>('active');
  const appStateSubscription = useRef<any>(null);

  // Enhanced app state detection
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const currentState = appStateRef.current;
      
      console.log(`App state changed: ${currentState} -> ${nextAppState}`);
      
      // Determine new enhanced app state
      let newAppState: AppStateType;
      let shouldResumeNotifications = false;
      
      if (nextAppState === "active") {
        if (screenLocked) {
          newAppState = 'locked';
        } else {
          newAppState = 'active';
          shouldResumeNotifications = true;
        }
      } else if (nextAppState === "background") {
        if (screenLocked) {
          newAppState = 'background-locked';
        } else {
          newAppState = 'background';
        }
      } else {
        newAppState = 'background';
      }
      
      // Update state and trigger appropriate actions
      appStateRef.current = newAppState;
      setAppState(newAppState);
      setIsAppActive(nextAppState === "active");
      
      // Handle notification state changes
      if (timerState.isRunning) {
        if (shouldResumeNotifications && newAppState === 'active') {
          startNotificationLoop();
        } else if (newAppState === 'locked' || newAppState === 'background-locked') {
          stopNotificationLoop();
        }
      }
    });

    appStateSubscription.current = subscription;

    return () => {
      subscription.remove();
    };
  }, [screenLocked, timerState.isRunning]);

  // Enhanced lock/unlock detection using visibility API
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web-based detection
      const handleVisibilityChange = () => {
        const isLocked = document.hidden;
        setScreenLocked(isLocked);
        updateAppState(appStateRef.current, isLocked);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    } else {
      // Native lock/unlock detection - simplified approach
      const handleAppStateChange = (nextAppState: string) => {
        // Use more sophisticated detection
        setScreenLocked(nextAppState !== "active");
        updateAppState(appStateRef.current, nextAppState !== "active");
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => {
        subscription.remove();
      };
    }
  }, []);

  // Update app state based on foreground/background and lock status
  const updateAppState = (foregroundState: AppStateType, isLocked: boolean) => {
    let newState: AppStateType;
    
    if (isLocked) {
      newState = 'locked';
    } else {
      newState = 'active';
    }
    
    appStateRef.current = newState;
    setAppState(newState);
    setIsAppActive(!isLocked);
  };

  // Enhanced timer management
  const startTimer = useCallback((durationInSeconds: number, existingStartTime?: number) => {
    clearAllIntervals();
    
    const startTime = existingStartTime || Date.now();
    sessionStartTime.current = startTime;

    setTimerState({
      isRunning: true,
      duration: durationInSeconds,
      remainingTime: durationInSeconds,
      startTime,
      isPaused: false,
      lastActiveTime: Date.now(),
      notificationCount: 0,
    });

    // Start notification loop if app is active and not locked
    if (isAppActive && !screenLocked) {
      startNotificationLoop();
    }

    // Start timer interval
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationInSeconds * 1000 - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);

      setTimerState(prev => ({
        ...prev,
        remainingTime: remainingSeconds,
        lastActiveTime: Date.now(),
      }));

      if (remaining <= 0) {
        completeTimer();
      }
    }, 100);

    // Background timer for when app is minimized
    if (settings.backgroundMode) {
      startBackgroundTimer(durationInSeconds, startTime);
    }

    // Enhanced haptic feedback
    if (settings.hapticEnabled && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isAppActive, screenLocked, settings.backgroundMode, settings.hapticEnabled]);

  // Enhanced notification loop with smart message selection
  const startNotificationLoop = useCallback(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    sendSmartNotification();

    notificationIntervalRef.current = setInterval(() => {
      if (Date.now() - lastNotificationTime.current < NOTIFICATION_CONFIG.MIN_INTERVAL * 1000) {
        return; // Prevent spam
      }

      const timerProgress = timerState.duration > 0 
        ? 1 - (timerState.remainingTime / timerState.duration)
        : 0;

      if (timerState.notificationCount >= NOTIFICATION_CONFIG.MAX_NOTIFICATIONS) {
        return; // Limit notifications
      }

      sendSmartNotification(timerProgress);
    }, settings.notificationFrequency * 1000);
  }, [settings.notificationFrequency, timerState.notificationCount, timerState.duration, timerState.remainingTime]);

  // Smart notification sending with escalating roast system
  const sendSmartNotification = useCallback((timerProgress = 0) => {
    if (Platform.OS === "web") {
      console.log("🔔 Notification:", getRandomMessage());
      return;
    }

    try {
      const message = settings.aggressiveMode 
        ? getEscalatingMessage(timerState.notificationCount)
        : getSmartMessage(
            settings.funnyMode ? NotificationCategory.ROAST : NotificationCategory.SERIOUS,
            timerProgress,
            timerState.notificationCount
          );

      Notifications.scheduleNotificationAsync({
        content: {
          title: "ZenLock Timer 🔒",
          body: message,
          sound: settings.soundEnabled,
          badge: timerState.notificationCount + 1,
        },
        trigger: null,
      });

      lastNotificationTime.current = Date.now();
      
      // Update notification count
      setTimerState(prev => ({
        ...prev,
        notificationCount: prev.notificationCount + 1,
      }));

      // Enhanced haptic feedback based on notification count
      if (settings.hapticEnabled) {
        if (timerState.notificationCount < 3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (timerState.notificationCount < 7) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }, [settings.funnyMode, settings.aggressiveMode, settings.soundEnabled, settings.hapticEnabled, timerState.notificationCount]);

  const stopNotificationLoop = useCallback(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
  }, []);

  // Background timer for app minimization
  const startBackgroundTimer = useCallback((durationInSeconds: number, startTime: number) => {
    backgroundTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationInSeconds * 1000 - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);

      // Update state for background operation
      setTimerState(prev => ({
        ...prev,
        remainingTime: remainingSeconds,
        lastActiveTime: Date.now(),
      }));

      // Check for completion
      if (remaining <= 0) {
        completeTimer();
      }
    }, 1000);
  }, []);

  // Enhanced timer completion
  const completeTimer = useCallback(async () => {
    clearAllIntervals();
    
    const totalTime = Date.now() - (timerState.startTime || Date.now());
    
    // Save session stats
    await saveSessionStats({
      duration: timerState.duration,
      notificationsSent: timerState.notificationCount,
      completedAt: Date.now(),
      success: true,
    });

    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      duration: 0,
      remainingTime: 0,
      startTime: null,
      isPaused: false,
    }));

    // Enhanced completion notification with haptic feedback
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🎉 Timer Complete!",
            body: "Amazing work! Your phone missed you 😄",
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
  }, [timerState.startTime, timerState.duration, timerState.notificationCount]);

  // Clear all intervals and timers
  const clearAllIntervals = useCallback(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (backgroundTimerRef.current) {
      clearInterval(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    }
  }, []);

  // Stop timer
  const stopTimer = useCallback(() => {
    clearAllIntervals();
    
    setTimerState({
      isRunning: false,
      duration: 0,
      remainingTime: 0,
      startTime: null,
      isPaused: false,
      lastActiveTime: Date.now(),
      notificationCount: 0,
    });

    // Haptic feedback
    if (settings.hapticEnabled && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [settings.hapticEnabled]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));

    if (timerState.isPaused) {
      stopNotificationLoop();
    } else if (isAppActive && !screenLocked) {
      startNotificationLoop();
    }

    // Haptic feedback
    if (settings.hapticEnabled && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [timerState.isPaused, isAppActive, screenLocked, settings.hapticEnabled]);

  // Save session stats
  const saveSessionStats = async (stats: any) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      const currentStats = existing ? JSON.parse(existing) : { sessions: [], totalTime: 0, totalNotifications: 0 };
      
      currentStats.sessions.push(stats);
      currentStats.totalTime += stats.duration;
      currentStats.totalNotifications += stats.notificationsSent;
      
      // Keep only last 100 sessions
      if (currentStats.sessions.length > 100) {
        currentStats.sessions = currentStats.sessions.slice(-100);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(currentStats));
    } catch (error) {
      console.error("Failed to save session stats:", error);
    }
  };

  // Get random message helper
  const getRandomMessage = () => {
    const messages = settings.funnyMode ? FUNNY_MESSAGES : SERIOUS_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Enhanced settings update
  const updateSettings = useCallback((newSettings: Partial<EnhancedTimerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));

    // Restart notification loop if frequency changed
    if (newSettings.notificationFrequency !== undefined && timerState.isRunning && isAppActive && !screenLocked) {
      stopNotificationLoop();
      startNotificationLoop();
    }
  }, [timerState.isRunning, isAppActive, screenLocked, stopNotificationLoop, startNotificationLoop]);

  return {
    settings,
    updateSettings,
    timerState,
    startTimer,
    stopTimer,
    pauseTimer,
    isAppActive,
    appState,
    screenLocked,
  };
});