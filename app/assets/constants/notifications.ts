/**
 * Enhanced Notification System for ZenLock Timer
 * Premium roast messages with intelligent timing
 */

export const FUNNY_MESSAGES = [
  "Hey! Lock your phone before it locks eyes with you again 👀",
  "Your screen needs a break — and so do you 💤",
  "Put me down, human. I'm tired of being touched 😂",
  "Discipline mode: ON. Lock me before I start roasting you 🔥",
  "Don't scroll, just soul! Lock your screen 🧘‍♂️",
  "Your phone misses its pocket. Let it rest 📱",
  "Still here? Your willpower called, it wants a word 💪",
  "I'm starting to think you have commitment issues... with discipline 😏",
  "Plot twist: You're supposed to be the one in control 🎭",
  "Breaking news: Human fails to lock phone, again 📰",
  "Your future self is judging you right now ⏰",
  "This is an intervention. Lock. The. Phone. 🚨",
  "I'm not mad, just disappointed 😔",
  "Tick tock, lock the clock! ⏱️",
  "Your screen time stats are crying 😢",
  // New enhanced roast messages
  "Breaking: Phone discovers human has 'just checking' syndrome 📊",
  "Your focus level: 0%. Your scroll level: 100% 📈",
  "Reminder: You're supposed to be the boss here 😎",
  "Phone update: Human still unlocked after 30 seconds. Shocking! 😱",
  "Plot twist: Locking your phone won't hurt, I promise 🤞",
  "Your phone is like: 'Please put me down, I'm tired' 🥺",
  "Emergency alert: User detected scrolling during focus time! 🚨",
  "Level unlocked: Master of Self-Control. You just need to lock it first 🎮",
  "Breaking: Human defeats phone addiction by... not touching it 🏆",
  "Your phone is whispering: '士官, put me to sleep' 😴",
  "Scientific fact: Locking your phone burns 0 calories but saves 1000 brain cells 🧠",
  "Pro tip: The app works better when you actually follow its advice 💡",
  "Your future self sent a postcard: 'Thanks for locking the phone!' 📮",
  "Phone status: Still waiting for human to show some willpower 📞",
  "Breaking: Social media loses again. Local human chooses discipline 🏅",
];

export const SERIOUS_MESSAGES = [
  "Please lock your phone to continue your focus session 🔒",
  "Lock your device to pause notifications ⏸️",
  "Focus mode active: Lock your phone 🎯",
  "Reminder: Lock your phone to stop notifications 📲",
  "Your timer is running. Lock your device 🔐",
  // Additional serious messages
  "Stay focused: Lock your phone to maintain concentration 💪",
  "Protect your focus: Lock your device now 🔐",
  "Timer active: Lock your phone for optimal results ⏰",
  "Focus session in progress: Please lock your device 🎯",
  "Maintain discipline: Lock your phone and stay present 🧘‍♀️",
];

export const MOTIVATIONAL_MESSAGES = [
  "You're doing great! Keep that phone locked 🔓",
  "Discipline unlocked! Your future self is proud 💯",
  "Focus champion: Still staying strong! 🏆",
  "Mindful moment: Phone locked, mind free 🧠",
  "Consistency is key! You're nailing it 💪",
  "Focus streak: Keep it going! 🔥",
  "Strength training: Mental edition 💪",
  "Mindful choice: Phone down, life up 🌟",
];

export const NOTIFICATION_FREQUENCY_OPTIONS = [
  { label: "15 seconds", value: 15, description: "Very frequent reminders" },
  { label: "30 seconds", value: 30, description: "Balanced reminders" },
  { label: "45 seconds", value: 45, description: "Moderate reminders" },
  { label: "1 minute", value: 60, description: "Standard reminders" },
  { label: "2 minutes", value: 120, description: "Gentle reminders" },
  { label: "3 minutes", value: 180, description: "Minimal reminders" },
];

export const DEFAULT_NOTIFICATION_FREQUENCY = 30;

// Enhanced notification categories for smart message selection
export const NotificationCategory = {
  ROAST: 'roast',
  SERIOUS: 'serious',
  MOTIVATIONAL: 'motivational',
  ENCOURAGING: 'encouraging',
} as const;

// Smart message selection based on timer progress and user behavior
export const getSmartMessage = (
  category: typeof NotificationCategory[keyof typeof NotificationCategory],
  timerProgress: number,
  notificationCount: number
): string => {
  const messages = {
    [NotificationCategory.ROAST]: FUNNY_MESSAGES,
    [NotificationCategory.SERIOUS]: SERIOUS_MESSAGES,
    [NotificationCategory.MOTIVATIONAL]: MOTIVATIONAL_MESSAGES,
    [NotificationCategory.ENCOURAGING]: MOTIVATIONAL_MESSAGES,
  };

  const categoryMessages = messages[category];
  
  // Early phase (0-30%): More encouraging
  if (timerProgress < 0.3) {
    const encouragingMessages = MOTIVATIONAL_MESSAGES;
    return encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
  }
  
  // Middle phase (30-70%): Mix of category and encouraging
  if (timerProgress < 0.7) {
    const allMessages = [...categoryMessages, ...MOTIVATIONAL_MESSAGES];
    return allMessages[Math.floor(Math.random() * allMessages.length)];
  }
  
  // Late phase (70%+): More direct/roast messages
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
};

// Escalating roast system based on notification count
export const getEscalatingMessage = (notificationCount: number): string => {
  if (notificationCount <= 2) {
    // Gentle reminders
    return FUNNY_MESSAGES[Math.floor(Math.random() * Math.min(5, FUNNY_MESSAGES.length))];
  } else if (notificationCount <= 5) {
    // Moderate roasting
    return FUNNY_MESSAGES[Math.floor(Math.random() * Math.min(10, FUNNY_MESSAGES.length))];
  } else {
    // Full roast mode
    const roastMessages = FUNNY_MESSAGES.slice(10); // Get the more roasting messages
    return roastMessages[Math.floor(Math.random() * roastMessages.length)];
  }
};

// Notification timing and behavior configuration
export const NOTIFICATION_CONFIG = {
  // Minimum time between notifications to avoid spam
  MIN_INTERVAL: 5,
  
  // Maximum notifications per timer session
  MAX_NOTIFICATIONS: 20,
  
  // After how many notifications to switch to more aggressive messaging
  AGGRESSIVE_THRESHOLD: 5,
  
  // Haptic feedback patterns for different notification types
  HAPTIC_PATTERNS: {
    gentle: 'light',
    moderate: 'medium',
    aggressive: 'heavy',
  },
  
  // Sound effects for different timer phases
  SOUND_EFFECTS: {
    completion: 'chime',
    warning: 'bell',
    urgent: 'alert',
  },
};

export type NotificationConfig = typeof NOTIFICATION_CONFIG;
