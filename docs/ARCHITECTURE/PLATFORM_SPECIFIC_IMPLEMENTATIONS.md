# Platform-Specific Implementation Examples
## Fake Call Notification System - Cross-Platform Integration

This document provides concrete implementation examples for iOS, Android, and Web platforms, demonstrating how to integrate the Fake Call Notification System with native platform capabilities.

## iOS Implementation - CallKit Integration

### Core CallKit Manager

```swift
import Foundation
import CallKit
import AVFoundation
import ExpoAV

class IOSCallKitManager: NSObject, CXProviderDelegate {
    private let callController = CXCallController()
    private let provider: CXProvider
    private var currentCall: UUID?
    
    // Initialize CallKit provider
    override init() {
        let configuration = CXProviderConfiguration(localizedName: "OffScreen Buddy")
        configuration.iconTemplateImageData = UIImage(named: "callIcon")?.pngData()
        configuration.ringtoneSound = "phone.caf"
        configuration.supportsVideo = false
        configuration.maximumCallGroups = 1
        configuration.supportedHandleTypes = [.phoneNumber]
        
        self.provider = CXProvider(configuration: configuration)
        super.init()
        self.provider.setDelegate(self, queue: nil)
    }
    
    // MARK: - Public API
    
    func startIncomingCall(callerInfo: CallerInfo, completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.async {
            let callUUID = UUID()
            let callUpdate = CXCallUpdate()
            
            // Configure caller information
            callUpdate.remoteHandle = CXHandle(type: .phoneNumber, value: callerInfo.phoneNumber)
            callUpdate.hasVideo = false
            callUpdate.hasConnected = false
            callUpdate.hasEnded = false
            callUpdate.supportsDTMF = true
            callUpdate.supportsHolding = false
            callUpdate.supportsGrouping = false
            callUpdate.supportsUngrouping = false
            callUpdate.localizedCallerName = callerInfo.displayName
            
            // Set caller details
            if let imageData = self.generateAvatarData(for: callerInfo) {
                callUpdate.remoteHandle = CXHandle(type: .phoneNumber, value: callerInfo.phoneNumber)
            }
            
            self.currentCall = callUUID
            
            self.provider.reportNewIncomingCall(with: callUUID, update: callUpdate) { error in
                if error == nil {
                    self.storeCallInfo(callUUID: callUUID, callerInfo: callerInfo)
                    completion(true)
                } else {
                    print("Failed to report incoming call: \(error!.localizedDescription)")
                    completion(false)
                }
            }
        }
    }
    
    func answerCall(callUUID: UUID) {
        DispatchQueue.main.async {
            let transaction = CXTransaction(action: CXCallAction.answer(callUUID: callUUID))
            self.performTransaction(transaction)
        }
    }
    
    func endCall(callUUID: UUID) {
        DispatchQueue.main.async {
            let transaction = CXTransaction(action: CXCallAction.end(callUUID: callUUID))
            self.performTransaction(transaction)
        }
    }
    
    // MARK: - CXProviderDelegate
    
    func providerDidReset(_ provider: CXProvider) {
        // Handle provider reset (typically when app is terminated)
        currentCall = nil
        cleanupCallResources()
    }
    
    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        print("Call answered by user")
        
        // Start audio session for voice synthesis
        self.configureAudioSession()
        
        // Notify the app that call was answered
        NotificationCenter.default.post(
            name: Notification.Name("CallAnswered"),
            object: action.callUUID
        )
        
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        print("Call ended by user")
        
        // Stop audio playback
        self.stopAudioPlayback()
        
        // Notify the app that call was ended
        NotificationCenter.default.post(
            name: Notification.Name("CallEnded"),
            object: action.callUUID
        )
        
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        // Handle mute/unmute
        let muted = action.isMuted
        NotificationCenter.default.post(
            name: Notification.Name("CallMuteChanged"),
            object: action.callUUID,
            userInfo: ["muted": muted]
        )
        action.fulfill()
    }
    
    // MARK: - Audio Configuration
    
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }
    
    private func stopAudioPlayback() {
        // Stop any ongoing audio playback
        NotificationCenter.default.post(name: Notification.Name("StopAudioPlayback"), object: nil)
    }
    
    // MARK: - Transaction Handling
    
    private func performTransaction(_ transaction: CXTransaction) {
        self.callController.request(transaction) { error in
            if let error = error {
                print("CXTransaction failed: \(error.localizedDescription)")
            }
        }
    }
    
    private func generateAvatarData(for callerInfo: CallerInfo) -> Data? {
        // Generate avatar based on caller info
        let size = CGSize(width: 160, height: 160)
        let rect = CGRect(origin: .zero, size: size)
        
        UIGraphicsBeginImageContextWithOptions(size, false, 0)
        UIColor.systemBlue.setFill()
        UIGraphicsGetCurrentContext()?.fill(rect)
        
        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return image?.pngData()
    }
    
    private func storeCallInfo(callUUID: UUID, callerInfo: CallerInfo) {
        // Store call information for later retrieval
        let callInfo = [
            "callUUID": callUUID.uuidString,
            "callerInfo": callerInfo.dictionary
        ]
        
        UserDefaults.standard.set(callInfo, forKey: "currentCallInfo")
    }
    
    private func cleanupCallResources() {
        // Clean up any resources when call is ended
        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("Failed to deactivate audio session: \(error)")
        }
    }
}

// CallerInfo Swift bridge
struct CallerInfo {
    let name: String
    let phoneNumber: String
    let displayName: String
    let callerType: String
    
    var dictionary: [String: Any] {
        return [
            "name": name,
            "phoneNumber": phoneNumber,
            "displayName": displayName,
            "callerType": callerType
        ]
    }
}
```

### Expo AV Integration for Voice Synthesis

```swift
import ExpoModulesCore
import ExpoAV

class ExpoVoiceSynthesis: NSObject {
    private var audioPlayer: AVPlayer?
    
    func playSynthesizedSpeech(audioData: Data, completion: @escaping (Bool) -> Void) {
        do {
            // Create temporary file with audio data
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("voice_\(UUID().uuidString).wav")
            try audioData.write(to: tempURL)
            
            // Configure audio player
            let playerItem = AVPlayerItem(url: tempURL)
            audioPlayer = AVPlayer(playerItem: playerItem)
            
            // Configure audio session
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [])
            
            // Start playback
            audioPlayer?.play()
            
            // Listen for playback completion
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: playerItem,
                queue: .main
            ) { _ in
                completion(true)
                self.cleanup()
            }
            
        } catch {
            print("Failed to play synthesized speech: \(error)")
            completion(false)
        }
    }
    
    private func cleanup() {
        audioPlayer = nil
        // Clean up temporary files
        // Remove any temporary audio files
    }
}
```

## Android Implementation - InCallService Integration

### Main InCallService Implementation

```kotlin
package com.offscreenbuddy.fakecall

import android.content.Context
import android.telecom.Call
import android.telecom.InCallService
import android.telecom.CallAudioState
import android.media.AudioManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class AndroidCallSimulationService : InCallService() {
    
    private var currentCall: Call? = null
    private var audioManager: AudioManager? = null
    private var isMuted = false
    private var isSpeakerOn = false
    
    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }
    
    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        currentCall = call
        
        // Set up call state callbacks
        call.registerCallback(callCallback)
        
        // Show incoming call notification
        showIncomingCallNotification(call)
        
        // Start voice synthesis if configured
        startVoiceSynthesis(call)
    }
    
    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        currentCall = null
        stopVoiceSynthesis()
        hideIncomingCallNotification()
    }
    
    override fun onSetMuted(audioState: CallAudioState) {
        super.onSetMuted(audioState)
        isMuted = audioState.isMuted
        
        // Notify voice synthesis service
        notifyVoiceSynthesisMuteState(isMuted)
    }
    
    override fun onSetAudioRoute(audioState: CallAudioState) {
        super.onSetAudioRoute(audioState)
        isSpeakerOn = audioState.route == CallAudioState.ROUTE_SPEAKER
        
        // Configure audio output
        configureAudioOutput(isSpeakerOn)
    }
    
    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, newState: Int) {
            super.onStateChanged(call, newState)
            
            when (newState) {
                Call.STATE_ACTIVE -> {
                    onCallAnswered()
                }
                Call.STATE_DISCONNECTED -> {
                    onCallEnded()
                }
                Call.STATE_HOLDING -> {
                    onCallOnHold()
                }
            }
        }
        
        override fun onCallDestroyed(call: Call) {
            super.onCallDestroyed(call)
            onCallEnded()
        }
    }
    
    private fun showIncomingCallNotification(call: Call) {
        val callerInfo = getCallerInfo(call)
        val notificationId = System.currentTimeMillis().toInt()
        
        val incomingCallIntent = Intent(this, IncomingCallActivity::class.java).apply {
            putExtra("caller_info", callerInfo)
            putExtra("notification_id", notificationId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            incomingCallIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val answerIntent = Intent(this, CallActionReceiver::class.java).apply {
            action = ACTION_ANSWER_CALL
            putExtra("call_id", call.details.id)
        }
        
        val declineIntent = Intent(this, CallActionReceiver::class.java).apply {
            action = ACTION_DECLINE_CALL
            putExtra("call_id", call.details.id)
        }
        
        val answerPendingIntent = PendingIntent.getBroadcast(
            this,
            1001,
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val declinePendingIntent = PendingIntent.getBroadcast(
            this,
            1002,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID_INCOMING_CALL)
            .setContentTitle("Incoming Call")
            .setContentText(callerInfo.displayName)
            .setSmallIcon(R.drawable.ic_phone_call)
            .setLargeIcon(BitmapFactory.decodeResource(resources, R.drawable.ic_contact_avatar))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(pendingIntent, true)
            .addAction(R.drawable.ic_call_accept, "Answer", answerPendingIntent)
            .addAction(R.drawable.ic_call_decline, "Decline", declinePendingIntent)
            .setAutoCancel(false)
            .setOngoing(true)
            .build()
        
        NotificationManagerCompat.from(this).notify(notificationId, notification)
    }
    
    private fun startVoiceSynthesis(call: Call) {
        val callerInfo = getCallerInfo(call)
        VoiceSynthesisService.startSynthesis(
            context = this,
            callerInfo = callerInfo,
            callback = object : VoiceSynthesisCallback {
                override fun onSynthesisComplete() {
                    // Synthesis complete, continue with call
                }
                
                override fun onSynthesisError(error: String) {
                    Log.e(TAG, "Voice synthesis error: $error")
                }
            }
        )
    }
    
    private fun stopVoiceSynthesis() {
        VoiceSynthesisService.stopSynthesis()
    }
    
    private fun configureAudioOutput(usingSpeaker: Boolean) {
        val mode = if (usingSpeaker) {
            AudioManager.MODE_IN_COMMUNICATION
        } else {
            AudioManager.MODE_IN_CALL
        }
        
        audioManager?.mode = mode
        audioManager?.setSpeakerphoneOn(usingSpeaker)
    }
    
    private fun notifyVoiceSynthesisMuteState(isMuted: Boolean) {
        VoiceSynthesisService.setMuted(isMuted)
    }
    
    private fun getCallerInfo(call: Call): CallerInfo {
        // Extract caller information from call details
        val handle = call.details.handle?.schemeSpecificPart ?: "Unknown"
        val displayName = call.details.callerDisplayName ?: "Unknown Caller"
        
        return CallerInfo(
            name = displayName,
            phoneNumber = handle,
            displayName = displayName,
            callerType = "safe"
        )
    }
    
    companion object {
        private const val TAG = "AndroidCallSimulation"
        private const val CHANNEL_ID_INCOMING_CALL = "incoming_call_channel"
        private const val ACTION_ANSWER_CALL = "answer_call"
        private const val ACTION_DECLINE_CALL = "decline_call"
    }
}
```

### Voice Synthesis Service for Android

```kotlin
package com.offscreenbuddy.fakecall

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

class VoiceSynthesisService {
    
    private var textToSpeech: TextToSpeech? = null
    private var isInitialized = false
    private var isMuted = false
    private var currentCallback: VoiceSynthesisCallback? = null
    
    interface VoiceSynthesisCallback {
        fun onSynthesisComplete()
        fun onSynthesisError(error: String)
    }
    
    fun initialize(context: Context, callback: VoiceSynthesisCallback) {
        currentCallback = callback
        
        textToSpeech = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val result = textToSpeech!!.setLanguage(Locale.US)
                if (result == TextToSpeech.LANG_MISSING_DATA ||
                    result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    callback.onSynthesisError("Language not supported")
                } else {
                    isInitialized = true
                    setupUtteranceProgressListener()
                }
            } else {
                callback.onSynthesisError("Failed to initialize TextToSpeech")
            }
        }
    }
    
    fun startSynthesis(context: Context, callerInfo: CallerInfo, callback: VoiceSynthesisCallback) {
        if (!isInitialized) {
            initialize(context, callback)
            return
        }
        
        val greeting = generateGreeting(callerInfo)
        val utteranceId = "call_greeting_${System.currentTimeMillis()}"
        
        textToSpeech?.speak(
            greeting,
            TextToSpeech.QUEUE_FLUSH,
            Bundle().apply {
                putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
            },
            utteranceId
        )
    }
    
    fun stopSynthesis() {
        textToSpeech?.stop()
    }
    
    fun setMuted(muted: Boolean) {
        isMuted = muted
        if (muted) {
            textToSpeech?.stop()
        }
    }
    
    private fun setupUtteranceProgressListener() {
        textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                // Synthesis started
            }
            
            override fun onDone(utteranceId: String?) {
                currentCallback?.onSynthesisComplete()
            }
            
            override fun onError(utteranceId: String?) {
                currentCallback?.onSynthesisError("Utterance error: $utteranceId")
            }
        })
    }
    
    private fun generateGreeting(callerInfo: CallerInfo): String {
        val greetings = listOf(
            "Hi, this is ${callerInfo.name}. I hope you're doing well.",
            "Hello, this is ${callerInfo.name}. How are things going?",
            "Hey there, it's ${callerInfo.name}. Just checking in."
        )
        
        return greetings.random()
    }
    
    fun dispose() {
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        isInitialized = false
    }
}
```

## Web Implementation - React Components

### Web Call Interface Component

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../design-system/providers/ThemeProvider';
import { CallState, CallerInfo, CallAction } from '../../services/fake-call/types';

interface WebCallInterfaceProps {
  callerInfo: CallerInfo;
  callState: CallState;
  onAction: (action: CallAction) => void;
  audioMessage?: string;
  isMuted?: boolean;
}

const { width, height } = Dimensions.get('window');

export const WebCallInterface: React.FC<WebCallInterfaceProps> = ({
  callerInfo,
  callState,
  onAction,
  audioMessage,
  isMuted = false
}) => {
  const { theme, colors } = useTheme();
  const [isAnswered, setIsAnswered] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === CallState.CONNECTED) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Initialize Web Audio API
  useEffect(() => {
    initializeAudio();
  }, []);

  const initializeAudio = async () => {
    try {
      // Request audio permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Clean up the stream as we only needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = useCallback(() => {
    setIsAnswered(true);
    onAction(CallAction.ANSWER);
    
    // Start playing synthesized speech
    if (audioMessage) {
      playSynthesizedSpeech(audioMessage);
    }
  }, [audioMessage, onAction]);

  const handleDecline = useCallback(() => {
    onAction(CallAction.DECLINE);
  }, [onAction]);

  const handleEnd = useCallback(() => {
    onAction(CallAction.END);
  }, [onAction]);

  const handleToggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    onAction(newMuteState ? CallAction.MUTE : CallAction.UNMUTE);
  }, [isMuted, onAction]);

  const handleToggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
    // Implementation would toggle speaker output
  }, []);

  const playSynthesizedSpeech = (text: string) => {
    // Use Web Speech API or external TTS service
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        console.log('Speech synthesis completed');
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  const getCallStateDisplay = () => {
    switch (callState) {
      case CallState.INCOMING:
        return isAnswered ? 'Connecting...' : 'Incoming Call';
      case CallState.CONNECTED:
        return formatDuration(callDuration);
      case CallState.ENDED:
        return 'Call Ended';
      default:
        return 'Connecting...';
    }
  };

  const renderCallControls = () => {
    const controls = [];
    
    // Answer/Decline buttons for incoming calls
    if (callState === CallState.INCOMING && !isAnswered) {
      controls.push(
        <TouchableOpacity
          key="decline"
          style={[styles.declineButton, { backgroundColor: colors.call.decline }]}
          onPress={handleDecline}
        >
          <Text style={[styles.buttonText, { color: colors.call.text }]}>Decline</Text>
        </TouchableOpacity>
      );
      
      controls.push(
        <TouchableOpacity
          key="answer"
          style={[styles.answerButton, { backgroundColor: colors.call.accept }]}
          onPress={handleAnswer}
        >
          <Text style={[styles.buttonText, { color: colors.call.text }]}>Answer</Text>
        </TouchableOpacity>
      );
    }
    
    // Call controls for active calls
    if (callState === CallState.CONNECTED) {
      controls.push(
        <TouchableOpacity
          key="mute"
          style={[
            styles.controlButton,
            { backgroundColor: isMuted ? colors.call.controlActive : colors.call.controlBackground }
          ]}
          onPress={handleToggleMute}
        >
          <Text style={[styles.controlText, { color: colors.call.controlText }]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>
      );
      
      controls.push(
        <TouchableOpacity
          key="end"
          style={[styles.endButton, { backgroundColor: colors.call.decline }]}
          onPress={handleEnd}
        >
          <Text style={[styles.buttonText, { color: colors.call.text }]}>End</Text>
        </TouchableOpacity>
      );
      
      controls.push(
        <TouchableOpacity
          key="speaker"
          style={[
            styles.controlButton,
            { backgroundColor: isSpeakerOn ? colors.call.controlActive : colors.call.controlBackground }
          ]}
          onPress={handleToggleSpeaker}
        >
          <Text style={[styles.controlText, { color: colors.call.controlText }]}>
            {isSpeakerOn ? 'Speaker Off' : 'Speaker'}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return controls;
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.call.background,
        borderColor: colors.call.border
      }
    ]}>
      {/* Caller Information */}
      <View style={styles.callerInfo}>
        <View style={styles.avatarContainer}>
          {callerInfo.avatarUrl ? (
            <img 
              src={callerInfo.avatarUrl} 
              alt={`${callerInfo.displayName} avatar`}
              style={styles.avatar}
            />
          ) : (
            <View style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.call.avatarBackground }
            ]}>
              <Text style={[
                styles.avatarText,
                { color: colors.call.avatarText }
              ]}>
                {callerInfo.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.callerName, { color: colors.call.callerName }]}>
          {callerInfo.displayName}
        </Text>
        
        <Text style={[styles.callerNumber, { color: colors.call.callerNumber }]}>
          {callerInfo.phoneNumber}
        </Text>
        
        <Text style={[styles.callState, { color: colors.call.stateText }]}>
          {getCallStateDisplay()}
        </Text>
      </View>
      
      {/* Call Controls */}
      <View style={styles.controls}>
        {renderCallControls()}
      </View>
      
      {/* Audio Visualization */}
      {callState === CallState.CONNECTED && !isMuted && (
        <View style={styles.audioVisualization}>
          <AudioWaveform isActive={true} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 9999,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  callerName: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerNumber: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  callState: {
    fontSize: 18,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  answerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  controlText: {
    fontSize: 14,
    fontWeight: '500',
  },
  audioVisualization: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -50 }],
  },
});

// Audio Waveform Component
const AudioWaveform: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const { theme, colors } = useTheme();
  
  return (
    <View style={styles.waveformContainer}>
      {[...Array(20)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.waveformBar,
            {
              backgroundColor: colors.call.waveform,
              height: isActive ? Math.random() * 40 + 10 : 4,
              opacity: isActive ? 1 : 0.3,
            }
          ]}
        />
      ))}
    </View>
  );
};
```

### Web Audio Manager

```typescript
export class WebAudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      // Create analyser for audio visualization
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.gainNode.connect(this.analyserNode);
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Failed to initialize Web Audio:', error);
    }
  }

  async playSynthesizedSpeech(text: string, options: SpeechSynthesisOptions = {}): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure speech
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 0.8;
      utterance.lang = options.lang || 'en-US';
      
      // Voice selection
      const voices = speechSynthesis.getVoices();
      if (options.voiceName) {
        const selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes(options.voiceName!.toLowerCase())
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));
      
      speechSynthesis.speak(utterance);
    });
  }

  async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    try {
      const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = decodedAudio;
      source.connect(gainNode);
      gainNode.connect(this.gainNode!);
      
      return new Promise((resolve, reject) => {
        source.onended = () => resolve();
        source.onerror = (event) => reject(new Error(event.error));
        source.start();
      });
    } catch (error) {
      console.error('Failed to play audio buffer:', error);
      throw error;
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext!.currentTime
      );
    }
  }

  setMuted(muted: boolean): void {
    this.setVolume(muted ? 0 : 1);
  }

  async startRecording(): Promise<MediaRecorder> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    return mediaRecorder;
  }

  getAnalyserData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    return dataArray;
  }

  dispose(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

interface SpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  voiceName?: string;
}
```

## Cross-Platform Service Integration

### Main Service Orchestrator

```typescript
export class FakeCallService {
  private platformInterface: PlatformCallInterface;
  private voiceSynthesis: VoiceSynthesisService;
  private security: ProTierSecurity;
  private isInitialized = false;
  private currentCall: CallStateData | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Validate Pro tier access
      const userId = await this.getCurrentUserId();
      const hasAccess = await this.security.validateProTierAccess(userId);
      
      if (!hasAccess) {
        throw new Error('Pro tier access required');
      }

      // Initialize platform-specific interface
      const platform = Platform.OS;
      this.platformInterface = this.createPlatformInterface(platform);
      
      const initialized = await this.platformInterface.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize platform interface');
      }

      // Initialize voice synthesis
      this.voiceSynthesis = new VoiceSynthesisService();
      await this.voiceSynthesis.initialize();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize FakeCallService:', error);
      return false;
    }
  }

  async scheduleCall(config: FakeCallConfig): Promise<CallSchedulingResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      // Validate Pro tier access and limits
      const userId = await this.getCurrentUserId();
      const limitStatus = await this.security.checkFeatureLimit(userId, 'fake_calls');
      
      if (!limitStatus.allowed) {
        throw new Error('Call limit exceeded');
      }

      // Generate call ID and schedule
      const callId = this.generateCallId();
      const callConfig: FakeCallConfig = {
        ...config,
        callerInfo: await this.validateAndGenerateCallerId(config.callerInfo),
      };

      // Store call configuration
      const callSchedule: CallSchedule = {
        id: callId,
        userId,
        config: callConfig,
        scheduledFor: new Date(),
        timezone: await this.getUserTimezone(),
        smartScheduling: {
          enabled: true,
          skipDuringFocus: true,
          skipDuringMeetings: true,
          respectDoNotDisturb: true,
          contextAware: true,
        },
        notification: {
          advanceWarning: 5,
          reminderEnabled: true,
          reminderMessage: 'Incoming fake call incoming...',
        },
      };

      // Schedule with notification system
      await this.scheduleWithNotifications(callSchedule);

      // Log feature usage
      await this.security.logFeatureUsage(userId, 'call_scheduled', {
        callId,
        callType: config.callType,
        callerType: config.callerInfo.callerType,
      });

      return {
        success: true,
        data: {
          callId,
          scheduledTime: new Date(),
        },
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          duration: 0,
          platform: Platform.OS,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError(CallErrorType.SCHEDULE_FAILED, error.message),
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          duration: 0,
          platform: Platform.OS,
        },
      };
    }
  }

  async triggerCall(callId: string): Promise<CallInitializationResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      const callData = await this.getCallData(callId);
      const callerInfo = callData.config.callerInfo;

      // Display incoming call interface
      const displayed = await this.platformInterface.displayIncomingCall(callerInfo);
      
      if (!displayed) {
        throw new Error('Failed to display call interface');
      }

      // Configure audio session
      await this.platformInterface.configureAudioSession({
        category: 'playback',
        mode: 'spokenAudio',
        options: [],
        sampleRate: 22050,
        channels: 1,
        bufferSize: 1024,
      });

      // Update call state
      this.currentCall = {
        callId,
        userId: callData.userId,
        config: callData.config,
        state: CallState.INCOMING,
        startTime: new Date(),
        interactionHistory: [],
        metadata: {
          platform: Platform.OS,
          appVersion: await this.getAppVersion(),
          deviceInfo: await this.getDeviceInfo(),
          sessionId: this.generateSessionId(),
        },
      };

      return {
        success: true,
        data: {
          call: this.currentCall,
          platformSupport: this.platformInterface.getCapabilities(),
          audioConfig: {
            category: 'playback',
            mode: 'spokenAudio',
            options: [],
            sampleRate: 22050,
            channels: 1,
            bufferSize: 1024,
          },
        },
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          duration: 0,
          platform: Platform.OS,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError(CallErrorType.CALL_INIT_FAILED, error.message),
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          duration: 0,
          platform: Platform.OS,
        },
      };
    }
  }

  // Private helper methods
  private createPlatformInterface(platform: Platform): PlatformCallInterface {
    switch (platform) {
      case 'ios':
        return new IOSPlatformInterface();
      case 'android':
        return new AndroidPlatformInterface();
      case 'web':
        return new WebPlatformInterface();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async validateAndGenerateCallerId(callerInfo: CallerInfo): Promise<CallerInfo> {
    // Validate caller ID safety
    const safety = await this.security.validateCallerID(callerInfo);
    
    if (!safety.isSafe) {
      throw new Error(`Caller ID failed safety validation: ${safety.reasons.join(', ')}`);
    }

    return callerInfo;
  }

  // Additional implementation details...
}
```

This comprehensive implementation guide provides concrete examples for integrating the Fake Call Notification System across all three platforms (iOS, Android, Web), ensuring consistent functionality while leveraging each platform's native capabilities.