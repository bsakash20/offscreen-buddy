# OffScreen Buddy - Push Notification System

A comprehensive push notification system for the OffScreen Buddy focus/productivity app, featuring intelligent scheduling, user preferences, and seamless integration with Expo's notification system.

## 🎯 Features

### Core Notification System
- ✅ **Expo Push Integration**: Full compatibility with Expo's push notification system
- ✅ **Local Notification Scheduling**: Immediate and scheduled notifications
- ✅ **Deep Linking**: Navigate directly from notifications to specific app screens
- ✅ **Notification Grouping**: Intelligent grouping by category and user preferences
- ✅ **Rich Notifications**: Support for images, action buttons, and custom layouts

### Smart Notification Features
- ✅ **Intelligent Timing**: Context-aware notifications based on user activity
- ✅ **Focus-Aware**: Automatically skips notifications during focus sessions
- ✅ **Do Not Disturb**: Smart DND with urgent notification overrides
- ✅ **Adaptive Frequency**: Learns from user behavior to optimize notification timing
- ✅ **Milestone Celebrations**: Special notifications for achievements and streaks
- ✅ **Haptic & Audio Feedback**: Comprehensive sensory feedback system

### User Preference Management
- ✅ **Granular Permissions**: Category-specific notification controls
- ✅ **Platform Settings**: iOS, Android, and web-specific configurations
- ✅ **Smart Scheduling**: AI-powered notification timing
- ✅ **Personalization**: Customizable message tone and humor level
- ✅ **Import/Export**: User preference backup and restore

### Technical Implementation
- ✅ **Expo Notifications**: Native push notification handling
- ✅ **Background Processing**: Queue management and retry logic
- ✅ **Badge Management**: Dynamic badge updates
- ✅ **Analytics Tracking**: Comprehensive notification engagement metrics
- ✅ **Security & Privacy**: GDPR/CCPA compliant data handling

## 🏗️ Architecture

```
app/services/notifications/
├── types.ts                    # TypeScript definitions
├── NotificationService.ts      # Core notification service
├── NotificationScheduler.ts    # Intelligent scheduling
├── NotificationPreferences.ts  # User preference management
├── NotificationActions.ts      # Action handling
└── NotificationIntegration.ts  # Integration examples

app/components/notifications/
├── NotificationBanner.tsx      # In-app notification display
├── NotificationPermissionPrompt.tsx
└── NotificationSettings.tsx

backend/services/
└── NotificationService.js     # Server-side notification handling

backend/routes/
└── notifications.js           # Notification API endpoints
```

## 🚀 Quick Start

### 1. Initialize Notification Service

```typescript
import { notificationService } from '../services/notifications/NotificationService';
import { NotificationIntegrationHooks } from '../services/notifications/NotificationIntegration';

// In your app initialization
async function initializeNotifications() {
  await NotificationIntegrationHooks.initializeNotificationSystem();
}
```

### 2. Send Timer Completion Notification

```typescript
import { TimerNotificationIntegration } from '../services/notifications/NotificationIntegration';

// Setup timer notifications
await TimerNotificationIntegration.setupTimerNotifications(
  'timer-123',
  25 * 60 // 25 minutes in seconds
);
```

### 3. Send Achievement Notification

```typescript
import { MilestoneNotificationIntegration } from '../services/notifications/NotificationIntegration';

// Send achievement notification
await MilestoneNotificationIntegration.sendAchievementNotification(
  'milestone-456',
  'Focus Streak',
  { days: 7, type: 'daily-focus' }
);
```

### 4. Custom Notification

```typescript
import { notificationService } from '../services/notifications/NotificationService';

await notificationService.sendImmediateNotification({
  type: NotificationType.QUICK_REMINDER,
  category: NotificationCategory.MOTIVATIONAL,
  title: 'Stay Focused! 💪',
  message: 'You\'re doing great! Keep up the momentum.',
  priority: NotificationPriority.NORMAL,
  userId: 'user-123',
  actions: ['view_timer', 'dismiss'],
});
```

## 📱 Platform Integration

### iOS Integration
- **Critical Alerts**: Support for iOS 12+ critical alerts
- **Notification Groups**: Grouped notifications by category
- **Time-Sensitive**: Proper interruption levels for urgent notifications
- **Background App Refresh**: Maintains notification delivery

### Android Integration
- **Notification Channels**: Organized channel structure
- **Doze Mode**: Optimized for Android 6+ battery optimization
- **Background Limits**: Respects Android background execution limits
- **Custom Sounds**: Support for custom notification sounds

### Web Integration
- **Service Workers**: Progressive Web App support
- **Web Push**: Browser-based push notifications
- **Persistent Notifications**: Non-dismissible notifications when needed

## ⚙️ Configuration

### User Preferences

```typescript
const preferences: NotificationPreferences = {
  enabled: true,
  doNotDisturb: {
    enabled: true,
    startTime: '22:00',
    endTime: '07:00',
    allowUrgent: true,
  },
  categories: {
    timers: {
      enabled: true,
      priority: 'normal',
      frequency: { type: 'immediate' },
    },
    achievements: {
      enabled: true,
      priority: 'high',
      frequency: { type: 'immediate' },
      quietHoursOverride: true, // Can break through DND
    },
  },
  smartScheduling: {
    enabled: true,
    adaptiveFrequency: true,
    skipDuringFocus: true,
    skipDuringMeetings: true,
  },
};
```

### Smart Scheduling Configuration

```typescript
// Automatic smart scheduling based on context
const smartContext: SmartScheduleContext = {
  userId: 'user-123',
  currentTime: new Date(),
  userActivity: {
    isFocused: true,
    isInMeeting: false,
    lastActivity: new Date(Date.now() - 5 * 60 * 1000),
    sessionType: 'focus',
  },
  deviceState: {
    batteryLevel: 0.75,
    isCharging: false,
    isLowPowerMode: false,
  },
  preferences: userPreferences,
  notificationHistory: recentNotifications,
};
```

## 🎨 Customization

### Notification Types

```typescript
enum NotificationType {
  TIMER_START = 'timer_start',
  TIMER_COMPLETE = 'timer_complete',
  TIMER_PAUSE = 'timer_pause',
  TIMER_RESUME = 'timer_resume',
  FOCUS_REMINDER = 'focus_reminder',
  BREAK_REMINDER = 'break_reminder',
  MILESTONE_ACHIEVEMENT = 'milestone_achievement',
  STREAK_CELEBRATION = 'streak_celebration',
  DAILY_GOAL = 'daily_goal',
  USER_ROAST = 'user_roast',
  HABIT_REMINDER = 'habit_reminder',
  ACHIEVEMENT_UNLOCK = 'achievement_unlock',
  SMART_BREAK = 'smart_break',
  QUICK_REMINDER = 'quick_reminder',
  URGENT_ALERT = 'urgent_alert',
}
```

### Notification Actions

```typescript
enum NotificationAction {
  VIEW_TIMER = 'view_timer',
  START_SESSION = 'start_session',
  PAUSE_SESSION = 'pause_session',
  STOP_SESSION = 'stop_session',
  VIEW_MILESTONES = 'view_milestones',
  VIEW_SETTINGS = 'view_settings',
  DISMISS = 'dismiss',
  SNOOZE = 'snooze',
  COMPLETE_TASK = 'complete_task',
}
```

## 🔧 Backend Integration

### API Endpoints

```javascript
// Register push token
POST /api/notifications/register-token
{
  "userId": "user-123",
  "pushToken": "ExponentPushToken[...]",
  "deviceInfo": { "platform": "ios", "version": "1.0.0" }
}

// Send notification
POST /api/notifications/send
{
  "userId": "user-123",
  "notification": {
    "title": "Timer Complete!",
    "message": "Great job!",
    "type": "timer_complete",
    "priority": "high"
  }
}

// Schedule notification
POST /api/notifications/schedule
{
  "userId": "user-123",
  "notification": { /* notification object */ },
  "scheduledTime": "2024-01-01T10:00:00Z"
}

// Batch send
POST /api/notifications/batch-send
{
  "notifications": [
    { "userId": "user-1", "notification": { /* ... */ } },
    { "userId": "user-2", "notification": { /* ... */ } }
  ]
}
```

### Server-side Service

```javascript
const notificationService = require('../services/NotificationService');

// Initialize
await notificationService.initialize();

// Send notification
await notificationService.sendPushNotification('user-123', {
  title: 'Focus Complete!',
  message: 'Great work!',
  priority: 'high',
  data: { sessionId: 'session-456' }
});

// Schedule for later
await notificationService.scheduleNotification('user-123', notification, futureDate);
```

## 📊 Analytics & Tracking

### Notification Analytics

```typescript
interface NotificationAnalytics {
  notificationId: string;
  userId: string;
  type: NotificationType;
  sentAt?: Date;
  deliveredAt?: Date;
  clickedAt?: Date;
  timeToClick?: number; // milliseconds
  context: {
    sessionId?: string;
    timerId?: string;
    screenSource?: string;
  };
}
```

### Engagement Metrics
- **Delivery Rate**: Percentage of successfully delivered notifications
- **Click-through Rate**: User engagement with notifications
- **Action Completion**: How often users complete notification actions
- **Timing Effectiveness**: Optimal delivery times per user
- **Category Performance**: Which notification types work best

## 🔒 Security & Privacy

### Data Protection
- **Push Token Encryption**: Secure token storage and transmission
- **User Consent**: Granular permission management
- **Data Minimization**: Only necessary data is processed
- **GDPR Compliance**: User data rights and deletion capabilities

### Security Features
- **Token Validation**: Verify push tokens before sending
- **Rate Limiting**: Prevent notification spam
- **Secure Headers**: HTTPS-only communication
- **Authentication**: User identity verification

## 🎯 Best Practices

### 1. User-Centric Design
- Always respect user's notification preferences
- Provide clear value in each notification
- Use smart scheduling to avoid notification fatigue
- Offer granular control over notification types

### 2. Performance Optimization
- Batch similar notifications to reduce noise
- Use intelligent timing to maximize engagement
- Implement proper error handling and retry logic
- Monitor and optimize battery usage

### 3. Accessibility
- Support screen readers with proper accessibility labels
- Provide haptic alternatives for audio cues
- Ensure high contrast for notification text
- Support dark mode and various themes

### 4. Cross-Platform Consistency
- Test on both iOS and Android devices
- Handle platform-specific notification limitations
- Use platform-appropriate visual design
- Implement platform-specific features when beneficial

## 🐛 Troubleshooting

### Common Issues

**Notifications not appearing:**
- Check permission status
- Verify push token registration
- Ensure app is not in device's battery optimization whitelist
- Check notification category preferences

**Actions not working:**
- Verify deep linking configuration
- Check navigation integration
- Ensure action handlers are properly registered

**Performance issues:**
- Monitor notification queue size
- Check for memory leaks in notification handlers
- Optimize notification frequency
- Review battery usage impact

### Debug Tools

```typescript
// Check notification service status
const status = notificationService.getStatus();
console.log('Notification Service Status:', status);

// Test notification
await notificationService.testNotification();

// Get service statistics
const stats = notificationService.getStats();
console.log('Service Stats:', stats);
```

## 📚 Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Push Notifications](https://github.com/react-native-push-notification-ios/plug-and-play)
- [iOS Notification Guide](https://developer.apple.com/documentation/usernotifications)
- [Android Notification Guide](https://developer.android.com/guide/topics/ui/notifiers/notifications)

## 🤝 Contributing

When extending the notification system:

1. **Follow TypeScript best practices** for type safety
2. **Test on multiple platforms** (iOS, Android, Web)
3. **Consider user experience** in all changes
4. **Maintain backward compatibility** where possible
5. **Add comprehensive tests** for new features
6. **Update documentation** for any API changes

## 📄 License

This notification system is part of the OffScreen Buddy project. See the main project license for details.

---

Built with ❤️ for better focus and productivity 🚀