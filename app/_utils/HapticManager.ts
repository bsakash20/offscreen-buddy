import * as ExpoHaptics from "expo-haptics";
import { Platform } from "react-native";

// Enhanced haptic feedback types for different contexts
export enum HapticType {
  // UI Interactions
  LIGHT_TAP = "lightTap",
  MEDIUM_TAP = "mediumTap",
  HEAVY_TAP = "heavyTap",
  
  // Timer Actions
  TIMER_START = "timerStart",
  TIMER_PAUSE = "timerPause",
  TIMER_RESUME = "timerResume",
  TIMER_CANCEL = "timerCancel",
  TIMER_COMPLETE = "timerComplete",
  
  // Notification Levels
  NOTIFICATION_GENTLE = "notificationGentle",
  NOTIFICATION_MODERATE = "notificationModerate",
  NOTIFICATION_AGGRESSIVE = "notificationAggressive",
  
  // Special Events
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  
  // Settings Changes
  SETTING_TOGGLE = "settingToggle",
  SETTING_ADJUST = "settingAdjust",
  
  // App State Changes
  APP_LOCK = "appLock",
  APP_UNLOCK = "appUnlock",
  APP_BACKGROUND = "appBackground",
  APP_FOREGROUND = "appForeground",
}

export interface HapticConfig {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
  adaptiveIntensity: boolean;
  silentMode: boolean;
}

// Advanced haptic patterns for different contexts
const HAPTIC_PATTERNS = {
  // Light interactions
  [HapticType.LIGHT_TAP]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  
  [HapticType.MEDIUM_TAP]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  
  [HapticType.HEAVY_TAP]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy),
  
  // Timer-specific patterns
  [HapticType.TIMER_START]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  
  [HapticType.TIMER_PAUSE]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  
  [HapticType.TIMER_RESUME]: () => 
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  
  [HapticType.TIMER_CANCEL]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy),
  
  [HapticType.TIMER_COMPLETE]: () => 
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  
  // Notification escalation
  [HapticType.NOTIFICATION_GENTLE]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  
  [HapticType.NOTIFICATION_MODERATE]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  
  [HapticType.NOTIFICATION_AGGRESSIVE]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy),
  
  // Status feedback
  [HapticType.SUCCESS]: () => 
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  
  [HapticType.WARNING]: () => 
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning),
  
  [HapticType.ERROR]: () => 
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error),
  
  // Settings
  [HapticType.SETTING_TOGGLE]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  
  [HapticType.SETTING_ADJUST]: () => 
    ExpoHaptics.selectionAsync(),
  
  // App state
  [HapticType.APP_LOCK]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  
  [HapticType.APP_UNLOCK]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  
  [HapticType.APP_BACKGROUND]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  
  [HapticType.APP_FOREGROUND]: () => 
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
};

// Advanced haptic manager class
export class HapticManager {
  private config: HapticConfig = {
    enabled: true,
    intensity: 'medium',
    adaptiveIntensity: true,
    silentMode: false,
  };

  private notificationCount = 0;
  private lastNotificationTime = 0;
  private timerStartTime = 0; // Reserved for future implementation

  // Initialize with user settings
  initialize(config: Partial<HapticConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Check if haptic feedback is available and enabled
  private canUseHaptics(): boolean {
    return Platform.OS !== "web" && this.config.enabled && !this.config.silentMode;
  }

  // Core haptic trigger method
  async trigger(type: HapticType, customConfig?: Partial<HapticConfig>) {
    if (!this.canUseHaptics()) return;

    try {
      // Check if this is a notification type and apply adaptive intensity
      const isNotificationType = [
        HapticType.NOTIFICATION_GENTLE,
        HapticType.NOTIFICATION_MODERATE,
        HapticType.NOTIFICATION_AGGRESSIVE
      ].includes(type);

      let finalType = type;
      
      if (isNotificationType && this.config.adaptiveIntensity) {
        finalType = this.getAdaptiveNotificationType();
      }

      // Execute the haptic pattern
      const pattern = HAPTIC_PATTERNS[finalType];
      if (pattern) {
        await pattern();
      }

      // Update notification tracking
      if (isNotificationType) {
        this.updateNotificationTracking();
      }
    } catch (error) {
      console.warn("Haptic feedback failed:", error);
    }
  }

  // Get adaptive notification intensity based on user behavior
  private getAdaptiveNotificationType(): HapticType {
    const now = Date.now();
    const timeSinceLastNotification = now - this.lastNotificationTime;
    
    // First few notifications: gentle
    if (this.notificationCount < 3) {
      return HapticType.NOTIFICATION_GENTLE;
    }
    
    // If notifications are too frequent, use gentle
    if (timeSinceLastNotification < 10000) { // Less than 10 seconds
      return HapticType.NOTIFICATION_GENTLE;
    }
    
    // Escalate based on notification count
    if (this.notificationCount < 7) {
      return HapticType.NOTIFICATION_MODERATE;
    } else {
      return HapticType.NOTIFICATION_AGGRESSIVE;
    }
  }

  // Update notification tracking for adaptive behavior
  private updateNotificationTracking() {
    this.notificationCount++;
    this.lastNotificationTime = Date.now();
  }

  // Reset notification tracking (e.g., when timer starts/ends)
  resetNotificationTracking() {
    this.notificationCount = 0;
    this.lastNotificationTime = 0;
  }

  // Timer-specific haptic patterns
  async triggerTimerAction(action: 'start' | 'pause' | 'resume' | 'cancel' | 'complete') {
    switch (action) {
      case 'start':
        await this.trigger(HapticType.TIMER_START);
        this.timerStartTime = Date.now();
        break;
      case 'pause':
        await this.trigger(HapticType.TIMER_PAUSE);
        break;
      case 'resume':
        await this.trigger(HapticType.TIMER_RESUME);
        break;
      case 'cancel':
        await this.trigger(HapticType.TIMER_CANCEL);
        this.resetNotificationTracking();
        break;
      case 'complete':
        await this.trigger(HapticType.TIMER_COMPLETE);
        this.resetNotificationTracking();
        break;
    }
  }

  // Enhanced notification feedback with escalating intensity
  async triggerNotification(level: 'gentle' | 'moderate' | 'aggressive' = 'gentle') {
    const typeMap = {
      gentle: HapticType.NOTIFICATION_GENTLE,
      moderate: HapticType.NOTIFICATION_MODERATE,
      aggressive: HapticType.NOTIFICATION_AGGRESSIVE,
    };
    
    await this.trigger(typeMap[level]);
  }

  // UI interaction patterns
  async triggerUIInteraction(intensity: 'light' | 'medium' | 'heavy' = 'light') {
    const typeMap = {
      light: HapticType.LIGHT_TAP,
      medium: HapticType.MEDIUM_TAP,
      heavy: HapticType.HEAVY_TAP,
    };
    
    await this.trigger(typeMap[intensity]);
  }

  // Status feedback
  async triggerStatus(type: 'success' | 'warning' | 'error') {
    await this.trigger(
      type === 'success' ? HapticType.SUCCESS :
      type === 'warning' ? HapticType.WARNING :
      HapticType.ERROR
    );
  }

  // App state change feedback
  async triggerAppStateChange(state: 'lock' | 'unlock' | 'background' | 'foreground') {
    await this.trigger(
      state === 'lock' ? HapticType.APP_LOCK :
      state === 'unlock' ? HapticType.APP_UNLOCK :
      state === 'background' ? HapticType.APP_BACKGROUND :
      HapticType.APP_FOREGROUND
    );
  }

  // Settings change feedback
  async triggerSettingChange(type: 'toggle' | 'adjust') {
    await this.trigger(
      type === 'toggle' ? HapticType.SETTING_TOGGLE : HapticType.SETTING_ADJUST
    );
  }

  // Custom haptic pattern for complex interactions
  async triggerCustom(pattern: { type: HapticType; delay: number }[]) {
    if (!this.canUseHaptics()) return;

    for (const { type, delay } of pattern) {
      setTimeout(() => {
        this.trigger(type);
      }, delay);
    }
  }

  // Emergency pattern for when user needs strong feedback
  async triggerEmergency() {
    await this.triggerCustom([
      { type: HapticType.HEAVY_TAP, delay: 0 },
      { type: HapticType.ERROR, delay: 200 },
      { type: HapticType.HEAVY_TAP, delay: 400 },
    ]);
  }

  // Update configuration
  updateConfig(newConfig: Partial<HapticConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): HapticConfig {
    return { ...this.config };
  }

  // Enable/disable haptics
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  // Set silent mode
  setSilentMode(silent: boolean) {
    this.config.silentMode = silent;
  }

  // Get current notification level for external use
  getNotificationLevel(): 'gentle' | 'moderate' | 'aggressive' {
    if (this.notificationCount < 3) return 'gentle';
    if (this.notificationCount < 7) return 'moderate';
    return 'aggressive';
  }
}

// Create singleton instance
export const hapticManager = new HapticManager();

// Utility functions for easy use
export const HapticUtils = {
  // Simple triggers
  lightTap: () => hapticManager.trigger(HapticType.LIGHT_TAP),
  mediumTap: () => hapticManager.trigger(HapticType.MEDIUM_TAP),
  heavyTap: () => hapticManager.trigger(HapticType.HEAVY_TAP),
  
  // Timer actions
  timerStart: () => hapticManager.triggerTimerAction('start'),
  timerPause: () => hapticManager.triggerTimerAction('pause'),
  timerResume: () => hapticManager.triggerTimerAction('resume'),
  timerCancel: () => hapticManager.triggerTimerAction('cancel'),
  timerComplete: () => hapticManager.triggerTimerAction('complete'),
  
  // Notifications
  notificationGentle: () => hapticManager.triggerNotification('gentle'),
  notificationModerate: () => hapticManager.triggerNotification('moderate'),
  notificationAggressive: () => hapticManager.triggerNotification('aggressive'),
  
  // Status
  success: () => hapticManager.triggerStatus('success'),
  warning: () => hapticManager.triggerStatus('warning'),
  error: () => hapticManager.triggerStatus('error'),
  
  // Settings
  settingToggle: () => hapticManager.triggerSettingChange('toggle'),
  settingAdjust: () => hapticManager.triggerSettingChange('adjust'),
  
  // App state
  appLock: () => hapticManager.triggerAppStateChange('lock'),
  appUnlock: () => hapticManager.triggerAppStateChange('unlock'),
  appBackground: () => hapticManager.triggerAppStateChange('background'),
  appForeground: () => hapticManager.triggerAppStateChange('foreground'),
  
  // Emergency
  emergency: () => hapticManager.triggerEmergency(),
};

// Initialize with default settings
hapticManager.initialize({
  enabled: true,
  intensity: 'medium',
  adaptiveIntensity: true,
  silentMode: false,
});

export default hapticManager;