import { Platform, Alert } from "react-native";

// Sound effect types for different app events
export enum SoundType {
  // Timer sounds
  TIMER_START = "timerStart",
  TIMER_PAUSE = "timerPause",
  TIMER_RESUME = "timerResume",
  TIMER_CANCEL = "timerCancel",
  TIMER_COMPLETE = "timerComplete",
  TIMER_TICK = "timerTick",
  
  // UI sounds
  BUTTON_PRESS = "buttonPress",
  SETTING_TOGGLE = "settingToggle",
  PICKER_SELECT = "pickerSelect",
  
  // Notification sounds
  NOTIFICATION_GENTLE = "notificationGentle",
  NOTIFICATION_MODERATE = "notificationModerate",
  NOTIFICATION_AGGRESSIVE = "notificationAggressive",
  
  // Status sounds
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  
  // App state sounds
  APP_LOCK = "appLock",
  APP_UNLOCK = "appUnlock",
}

// Sound configuration interface
export interface SoundConfig {
  enabled: boolean;
  volume: number;
  muted: boolean;
  quality: 'low' | 'medium' | 'high';
}

// Predefined sound patterns (using simple beeps for cross-platform compatibility)
const SOUND_PATTERNS = {
  // Timer sounds - ascending beeps for start, descending for cancel
  [SoundType.TIMER_START]: { 
    frequency: 800, 
    duration: 200, 
    type: 'sine',
    envelope: 'fadeIn' 
  },
  [SoundType.TIMER_PAUSE]: { 
    frequency: 400, 
    duration: 300, 
    type: 'sine',
    envelope: 'fadeOut' 
  },
  [SoundType.TIMER_RESUME]: { 
    frequency: 600, 
    duration: 200, 
    type: 'sine',
    envelope: 'fadeIn' 
  },
  [SoundType.TIMER_CANCEL]: { 
    frequency: 300, 
    duration: 400, 
    type: 'sine',
    envelope: 'fadeOut' 
  },
  [SoundType.TIMER_COMPLETE]: { 
    frequency: 523, // C5
    duration: 150, 
    type: 'sine',
    envelope: 'fadeIn'
  },
  [SoundType.TIMER_TICK]: { 
    frequency: 1000, 
    duration: 50, 
    type: 'sine',
    envelope: 'sharp' 
  },
  
  // UI sounds
  [SoundType.BUTTON_PRESS]: { 
    frequency: 440, 
    duration: 100, 
    type: 'sine',
    envelope: 'sharp' 
  },
  [SoundType.SETTING_TOGGLE]: { 
    frequency: 660, 
    duration: 120, 
    type: 'sine',
    envelope: 'fadeIn' 
  },
  [SoundType.PICKER_SELECT]: { 
    frequency: 550, 
    duration: 80, 
    type: 'sine',
    envelope: 'sharp' 
  },
  
  // Notification sounds - increasing intensity
  [SoundType.NOTIFICATION_GENTLE]: { 
    frequency: 600, 
    duration: 200, 
    type: 'sine',
    envelope: 'gentle' 
  },
  [SoundType.NOTIFICATION_MODERATE]: { 
    frequency: 700, 
    duration: 250, 
    type: 'sine',
    envelope: 'moderate' 
  },
  [SoundType.NOTIFICATION_AGGRESSIVE]: { 
    frequency: 800, 
    duration: 300, 
    type: 'square',
    envelope: 'aggressive' 
  },
  
  // Status sounds
  [SoundType.SUCCESS]: { 
    frequency: 523, // C5
    duration: 300, 
    type: 'sine',
    envelope: 'success' 
  },
  [SoundType.WARNING]: { 
    frequency: 392, // G4
    duration: 400, 
    type: 'triangle',
    envelope: 'warning' 
  },
  [SoundType.ERROR]: { 
    frequency: 261, // C4
    duration: 500, 
    type: 'square',
    envelope: 'error' 
  },
  
  // App state sounds
  [SoundType.APP_LOCK]: { 
    frequency: 440, 
    duration: 200, 
    type: 'sine',
    envelope: 'fadeOut' 
  },
  [SoundType.APP_UNLOCK]: { 
    frequency: 880, 
    duration: 200, 
    type: 'sine',
    envelope: 'fadeIn' 
  },
};

// Simple beep generator using Web Audio API for web, console logs for native
class SimpleSoundGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (Platform.OS === 'web') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  async playBeep(frequency: number, duration: number, volume: number = 0.5) {
    if (Platform.OS === 'web' && this.audioContext) {
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';

        // Simple envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);

        oscillator.start(now);
        oscillator.stop(now + duration / 1000);
      } catch (error) {
        console.warn('Web Audio playback failed:', error);
      }
    } else {
      // For native platforms, just log the sound event
      console.log(`🔊 Sound: ${frequency}Hz for ${duration}ms`);
      
      // Optional: Could add native sound generation here if needed
      // For now, we rely on haptic feedback for native platforms
    }
  }
}

// Advanced Sound Manager class
export class SoundManager {
  private config: SoundConfig = {
    enabled: true,
    volume: 0.7,
    muted: false,
    quality: 'medium',
  };

  private soundGenerator: SimpleSoundGenerator = new SimpleSoundGenerator();
  private isInitialized = false;

  // Initialize sound system
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize audio context for web
      if (Platform.OS === 'web' && this.soundGenerator) {
        // Resume audio context if suspended (required by browsers)
        if ((this.soundGenerator as any).audioContext?.state === 'suspended') {
          await (this.soundGenerator as any).audioContext.resume();
        }
      }

      this.isInitialized = true;
      console.log('SoundManager initialized');
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
      this.config.enabled = false;
    }
  }

  // Main sound playback method
  async playSound(type: SoundType, options?: { volume?: number }) {
    if (!this.config.enabled || this.config.muted || !this.isInitialized) {
      return;
    }

    try {
      const pattern = SOUND_PATTERNS[type];
      if (pattern) {
        const volume = options?.volume || this.config.volume;
        await this.soundGenerator.playBeep(pattern.frequency, pattern.duration, volume);
      }
    } catch (error) {
      console.warn(`Failed to play sound ${type}:`, error);
    }
  }

  // Timer-specific sound methods
  async playTimerSound(action: 'start' | 'pause' | 'resume' | 'cancel' | 'complete' | 'tick') {
    const soundMap = {
      start: SoundType.TIMER_START,
      pause: SoundType.TIMER_PAUSE,
      resume: SoundType.TIMER_RESUME,
      cancel: SoundType.TIMER_CANCEL,
      complete: SoundType.TIMER_COMPLETE,
      tick: SoundType.TIMER_TICK,
    };
    
    await this.playSound(soundMap[action]);
  }

  // UI sound methods
  async playUISound(type: 'button' | 'toggle' | 'select') {
    const soundMap = {
      button: SoundType.BUTTON_PRESS,
      toggle: SoundType.SETTING_TOGGLE,
      select: SoundType.PICKER_SELECT,
    };
    
    await this.playSound(soundMap[type]);
  }

  // Notification sound with escalation
  async playNotificationSound(level: 'gentle' | 'moderate' | 'aggressive') {
    const soundMap = {
      gentle: SoundType.NOTIFICATION_GENTLE,
      moderate: SoundType.NOTIFICATION_MODERATE,
      aggressive: SoundType.NOTIFICATION_AGGRESSIVE,
    };
    
    await this.playSound(soundMap[level]);
  }

  // Status sound methods
  async playStatusSound(status: 'success' | 'warning' | 'error') {
    const soundMap = {
      success: SoundType.SUCCESS,
      warning: SoundType.WARNING,
      error: SoundType.ERROR,
    };
    
    await this.playSound(soundMap[status]);
  }

  // App state sound methods
  async playAppStateSound(state: 'lock' | 'unlock') {
    await this.playSound(state === 'lock' ? SoundType.APP_LOCK : SoundType.APP_UNLOCK);
  }

  // Play completion fanfare (special method for timer completion)
  async playCompletionFanfare() {
    if (!this.config.enabled || this.config.muted) return;

    try {
      // Play a sequence of success sounds for a more impressive effect
      const sounds = [
        { type: SoundType.SUCCESS, delay: 0 },
        { type: SoundType.TIMER_COMPLETE, delay: 200 },
        { type: SoundType.SUCCESS, delay: 400 },
      ];

      for (const { type, delay } of sounds) {
        setTimeout(() => {
          this.playSound(type);
        }, delay);
      }
    } catch (error) {
      console.warn('Failed to play completion fanfare:', error);
    }
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SoundConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SoundConfig {
    return { ...this.config };
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean) {
    this.config.muted = muted;
  }

  // Test sound functionality
  async testSound() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    Alert.alert(
      "Sound Test",
      "Testing audio system...",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Test", 
          onPress: async () => {
            await this.playSound(SoundType.SUCCESS);
            setTimeout(() => this.playSound(SoundType.TIMER_COMPLETE), 500);
          }
        },
      ]
    );
  }

  // Get available sound patterns (for debugging)
  getAvailableSounds(): string[] {
    return Object.keys(SOUND_PATTERNS);
  }

  // Cleanup
  dispose() {
    // Clean up audio context if needed
    this.isInitialized = false;
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Initialize on module load
soundManager.initialize();

// Utility functions for easy use
export const SoundUtils = {
  // Timer sounds
  timerStart: () => soundManager.playTimerSound('start'),
  timerPause: () => soundManager.playTimerSound('pause'),
  timerResume: () => soundManager.playTimerSound('resume'),
  timerCancel: () => soundManager.playTimerSound('cancel'),
  timerComplete: () => soundManager.playTimerSound('complete'),
  timerTick: () => soundManager.playTimerSound('tick'),
  
  // UI sounds
  buttonPress: () => soundManager.playUISound('button'),
  settingToggle: () => soundManager.playUISound('toggle'),
  pickerSelect: () => soundManager.playUISound('select'),
  
  // Notifications
  notificationGentle: () => soundManager.playNotificationSound('gentle'),
  notificationModerate: () => soundManager.playNotificationSound('moderate'),
  notificationAggressive: () => soundManager.playNotificationSound('aggressive'),
  
  // Status
  success: () => soundManager.playStatusSound('success'),
  warning: () => soundManager.playStatusSound('warning'),
  error: () => soundManager.playStatusSound('error'),
  
  // App state
  appLock: () => soundManager.playAppStateSound('lock'),
  appUnlock: () => soundManager.playAppStateSound('unlock'),
  
  // Special effects
  completionFanfare: () => soundManager.playCompletionFanfare(),
};

export default soundManager;