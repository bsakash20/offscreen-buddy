# Fake Call Services Documentation

## Overview

The Fake Call Services provide a comprehensive system for generating and managing realistic fake calls for the OffScreen Buddy app's Pro tier. This system integrates voice synthesis, caller ID generation, and notification management to create authentic call experiences.

## Architecture

The fake call system consists of three main services:

1. **VoiceSynthesisService** - Multi-platform text-to-speech with voice profiles
2. **CallerIDService** - Safe caller ID generation with validation
3. **FakeCallService** - Main orchestrator for call lifecycle management

## Core Features

### VoiceSynthesisService Features
- **Multi-platform TTS Support**
  - iOS: Speech framework integration
  - Android: TextToSpeech API
  - Web: Web Speech API
- **Voice Profile Management**
  - Professional, casual, business, emergency profiles
  - Custom voice selection and speed control
- **Audio Processing**
  - Quality enhancement algorithms
  - Audio caching for performance
  - Noise reduction and normalization
- **Accessibility Features**
  - Screen reader compatibility
  - High contrast support
  - Voice control integration

### CallerIDService Features
- **Safe Caller ID Generation**
  - Professional contact database
  - Geographic validation patterns
  - Emergency number blocking
- **Contact Management**
  - Business caller ID patterns
  - Custom contact management (Pro)
  - Realistic number formatting
- **Safety Validation**
  - Suspicious pattern detection
  - Emergency service protection
  - Privacy compliance

### FakeCallService Features
- **Call Lifecycle Management**
  - Scheduling and timing
  - State management (incoming, active, ended)
  - Auto-disconnect logic
- **Integration**
  - Notification system integration
  - Audio pipeline management
  - User interaction handling
- **Smart Features**
  - Focus mode respect
  - Meeting schedule awareness
  - Battery optimization

## Installation and Setup

### Import Services

```typescript
// Import individual services
import { voiceSynthesisService } from './fake-call/VoiceSynthesisService';
import { callerIDService } from './fake-call/CallerIDService';
import { fakeCallService } from './fake-call/FakeCallService';

// Import complete system
import { createFakeCallSystem } from './fake-call/index';

const fakeCallSystem = createFakeCallSystem();
```

### Initialize Services

```typescript
// Individual service initialization
async function initializeServices() {
    await voiceSynthesisService.initialize();
    await callerIDService.initialize();
    await fakeCallService.initialize();
}

// Complete system initialization
async function initializeSystem() {
    await fakeCallSystem.initialize();
}
```

## Usage Examples

### Basic Voice Synthesis

```typescript
// Synthesize speech with voice profile
const result = await voiceSynthesisService.synthesizeSpeech(
    "Hello, this is a test call. Please let me know if you can hear me clearly.",
    "professional_male"
);

if (result.success && result.data) {
    console.log(`Audio generated: ${result.data.audioUri}`);
    console.log(`Duration: ${result.data.duration}ms`);
}
```

### Generate Safe Caller ID

```typescript
// Generate business caller ID
const callerResult = await callerIDService.generateSafeCallerID({
    callerType: 'business',
    region: 'US',
    category: 'tech_support',
    timeOfDay: 'business_hours'
});

if (callerResult.success && callerResult.data) {
    console.log(`Caller: ${callerResult.data.displayName}`);
    console.log(`Number: ${callerResult.data.phoneNumber}`);
    console.log(`Reason: ${callerResult.data.callerReason}`);
}
```

### Schedule a Fake Call

```typescript
// Schedule call for 5 minutes from now
const callConfig: CallSchedule = {
    id: uuidv4(),
    userId: 'user123',
    scheduledFor: new Date(Date.now() + 5 * 60 * 1000),
    config: {
        callerInfo: {
            displayName: 'John Smith',
            phoneNumber: '+1-555-0123',
            callerType: 'business',
            profileImage: 'https://example.com/avatar.jpg'
        },
        callType: FakeCallType.BUSINESS_MEETING,
        callDuration: 30,
        voiceProfileId: 'professional_female',
        audioMessage: 'Hi, this is Sarah from Tech Solutions. Are you available for a brief meeting?',
        autoAnswer: false,
        priority: CallPriority.NORMAL,
        enableHaptics: true,
        enableSound: true,
        smartScheduling: {
            enabled: true,
            respectFocusMode: true,
            respectMeetings: true,
            respectDoNotDisturb: true,
            skipDuringFocus: true,
            skipDuringMeetings: true
        }
    }
};

const scheduleResult = await fakeCallService.scheduleCall(callConfig);

if (scheduleResult.success) {
    console.log(`Call scheduled: ${scheduleResult.data.callId}`);
    console.log(`Notification ID: ${scheduleResult.data.notificationId}`);
}
```

### Handle Call Actions

```typescript
// When user answers the call
await fakeCallService.handleCallAction(callId, CallAction.ANSWER);

// When user declines the call
await fakeCallService.handleCallAction(callId, CallAction.DECLINE);

// When user ends the call
await fakeCallService.handleCallAction(callId, CallAction.END);
```

### Get Call Status

```typescript
// Get current call status
const statusResult = await fakeCallService.getCallStatus(callId);

if (statusResult.success && statusResult.data) {
    console.log(`Call State: ${statusResult.data.state}`);
    console.log(`Duration: ${statusResult.data.duration}s`);
    console.log(`Interactions: ${statusResult.data.interactionHistory.length}`);
}

// Get all active calls for user
const activeCalls = await fakeCallService.getActiveCalls('user123');

if (activeCalls.success) {
    console.log(`Active calls: ${activeCalls.data.length}`);
    activeCalls.data.forEach(call => {
        console.log(`- ${call.callId}: ${call.state}`);
    });
}
```

### User Preferences Management

```typescript
// Get user preferences
const prefsResult = await fakeCallService.getUserPreferences('user123');

// Update preferences
const updatedPrefs = await fakeCallService.updateUserPreferences('user123', {
    autoAnswer: true,
    defaultCallDuration: 45,
    smartScheduling: {
        enabled: true,
        respectFocusMode: true,
        respectDoNotDisturb: false
    }
});
```

## Event System

The FakeCallService provides an event system for real-time updates:

```typescript
// Listen for call events
fakeCallService.on(FakeCallEventType.CALL_STARTED, (event) => {
    console.log(`Call started: ${event.callId}`);
    console.log(`Caller: ${event.data.call.config.callerInfo.displayName}`);
});

fakeCallService.on(FakeCallEventType.CALL_ANSWERED, (event) => {
    console.log(`Call answered by user: ${event.userId}`);
});

fakeCallService.on(FakeCallEventType.CALL_ENDED, (event) => {
    console.log(`Call ended: ${event.callId}`);
    console.log(`Duration: ${event.data.duration}s`);
});

// Unsubscribe from events
const handler = (event: FakeCallEvent) => {
    console.log('Call event:', event);
};

fakeCallService.on(FakeCallEventType.CALL_STARTED, handler);
// Later...
fakeCallService.off(FakeCallEventType.CALL_STARTED, handler);
```

## Advanced Features

### Custom Voice Profiles

```typescript
// Create custom voice profile
const customProfile: VoiceProfile = {
    id: 'custom_professional',
    name: 'Custom Professional Voice',
    description: 'Professional voice for business calls',
    language: 'en-US',
    gender: 'female',
    age: 'adult',
    tone: 'professional',
    speed: 1.0,
    pitch: 0.8,
    volume: 0.9,
    quality: 'high',
    characteristics: ['warm', 'confident', 'clear'],
    useCases: ['business_meeting', 'professional_call'],
    platformSpecific: {
        ios: { voiceId: 'com.apple.ttsbundle.siri_female_en-us_premium' },
        android: { voiceName: 'en-us-x-sfg' },
        web: { voiceName: 'Google US English Female' }
    },
    accessibility: {
        screenReaderCompatible: true,
        highContrast: true,
        voiceControl: true,
        cognitiveLoad: 'low'
    },
    createdAt: new Date(),
    updatedAt: new Date()
};

await voiceSynthesisService.createVoiceProfile(customProfile);
```

### Smart Scheduling Context

```typescript
// Get smart scheduling context
const context = await fakeCallService.getSmartSchedulingContext('user123');
console.log(`In focus mode: ${context.isInFocusMode}`);
console.log(`In meeting: ${context.isInMeeting}`);
console.log(`Battery level: ${context.batteryLevel}`);
console.log(`Network status: ${context.networkStatus}`);

// Apply smart scheduling rules
const schedulingResult = await fakeCallService.applySmartScheduling(callConfig, context);
if (!schedulingResult.shouldProceed) {
    console.log(`Scheduling blocked: ${schedulingResult.reason}`);
}
```

## Error Handling

All services use comprehensive error handling:

```typescript
try {
    const result = await voiceSynthesisService.synthesizeSpeech(text, voiceProfile);
    
    if (!result.success) {
        const error = result.error;
        console.log(`Error type: ${error.type}`);
        console.log(`Error code: ${error.code}`);
        console.log(`Message: ${error.message}`);
        console.log(`Recoverable: ${error.recoverable}`);
        
        if (error.suggestedAction) {
            console.log(`Suggested action: ${error.suggestedAction}`);
        }
    }
} catch (error) {
    console.error('Unexpected error:', error);
}
```

## Best Practices

### Performance Optimization
- Use voice caching for repeated audio content
- Implement proper cleanup when calls end
- Monitor memory usage during long calls
- Use appropriate audio quality settings

### Security Considerations
- Never use real emergency numbers
- Validate all caller IDs before display
- Implement proper access controls
- Follow privacy guidelines for user data

### User Experience
- Provide haptic feedback for call actions
- Respect user's focus mode and meeting schedules
- Allow customization of voice profiles
- Implement accessibility features

### Error Recovery
- Implement graceful fallbacks for TTS failures
- Provide alternative caller ID options
- Handle notification permission denials
- Support offline scenarios

## Service Limits

- **Max Active Calls**: 3 simultaneous calls
- **Daily Call Limit**: 100 calls per day
- **Default Call Duration**: 30 seconds
- **Auto-disconnect Delay**: 30 seconds
- **Voice Cache Size**: 50MB
- **Max Voice Profiles**: 10 per user

## Integration Checklist

- [ ] Initialize all services
- [ ] Request notification permissions
- [ ] Set up haptic feedback
- [ ] Configure audio session
- [ ] Implement event listeners
- [ ] Set up user preferences
- [ ] Test call scheduling
- [ ] Verify call lifecycle
- [ ] Test error scenarios
- [ ] Validate accessibility features

## Support and Troubleshooting

### Common Issues

**TTS Not Working**
- Check platform-specific TTS permissions
- Verify voice profiles are loaded
- Test with default voice settings

**Notifications Not Showing**
- Verify notification permissions
- Check notification service integration
- Test scheduled notification timing

**Call Audio Issues**
- Check audio session configuration
- Verify haptic feedback permissions
- Test sound manager integration

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
import { logger } from '../utils/Logger';

// Enable debug logging
logger.setLevel('debug');

// Check service status
console.log('Voice synthesis service initialized:', voiceSynthesisService.isInitialized);
console.log('Caller ID service initialized:', callerIDService.isInitialized);
console.log('Fake call service initialized:', fakeCallService.isInitialized);
```

## API Reference

For complete API documentation, see the individual service files:
- [VoiceSynthesisService](./VoiceSynthesisService.ts)
- [CallerIDService](./CallerIDService.ts)  
- [FakeCallService](./FakeCallService.ts)
- [Types](./types.ts)