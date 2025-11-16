import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import CircularTimePicker from '../components/CircularTimePicker';

export default function CircularTimePickerTest() {
  const [testResults, setTestResults] = useState({
    edgeValues: false,
    quickScroll: false,
    touchInterception: false,
    haptics: false,
    infiniteScroll: false,
    accessibility: false
  });

  const [lastTimeChange, setLastTimeChange] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const handleTimeChange = (hours: number, minutes: number, seconds: number) => {
    setLastTimeChange({ hours, minutes, seconds });
    console.log('Time changed:', { hours, minutes, seconds });
  };

  // Test 1: Edge Value Selection Test
  const testEdgeValues = () => {
    Alert.alert(
      'Test 1: Edge Values',
      'Please select 0 and 23 hours. Verify they align to center line and are fully visible.',
      [
        {
          text: 'Pass',
          onPress: () => setTestResults(prev => ({ ...prev, edgeValues: true }))
        },
        {
          text: 'Fail',
          style: 'destructive'
        }
      ]
    );
  };

  // Test 2: Quick Scroll Snap Test
  const testQuickScroll = () => {
    Alert.alert(
      'Test 2: Quick Scroll',
      'Drag quickly to wheel edges and release. Confirm it snaps to center without overshoot.',
      [
        {
          text: 'Pass',
          onPress: () => setTestResults(prev => ({ ...prev, quickScroll: true }))
        },
        {
          text: 'Fail',
          style: 'destructive'
        }
      ]
    );
  };

  // Test 3: Touch Interception Test
  const testTouchInterception = () => {
    Alert.alert(
      'Test 3: Touch Interception',
      'Tap above and below central HUD. Verify HUD doesn\'t block touches and wheels scroll.',
      [
        {
          text: 'Pass',
          onPress: () => setTestResults(prev => ({ ...prev, touchInterception: true }))
        },
        {
          text: 'Fail',
          style: 'destructive'
        }
      ]
    );
  };

  // Test 4: Haptic Feedback Test
  const testHaptics = () => {
    // Trigger haptic manually to test
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Test 4: Haptics',
      'Light haptic should have fired. Now test rollover from 59 to 0 (minutes/seconds) for medium haptic.',
      [
        {
          text: 'Pass',
          onPress: () => setTestResults(prev => ({ ...prev, haptics: true }))
        },
        {
          text: 'Fail',
          style: 'destructive'
        }
      ]
    );
  };

  // Test 5: Infinite Scroll Test
  const testInfiniteScroll = () => {
    Alert.alert(
      'Test 5: Infinite Scroll',
      'Drag past first/last items multiple times. Confirm smooth continuation without jumps.',
      [
        {
          text: 'Pass',
          onPress: () => setTestResults(prev => ({ ...prev, infiniteScroll: true }))
        },
        {
          text: 'Fail',
          style: 'destructive'
        }
      ]
    );
  };

  // Test 6: Accessibility Test
  const testAccessibility = () => {
    Alert.alert(
      'Test 6: Accessibility',
      'Use accessibility actions to increment/decrement wheels. Verify center snap and haptics.',
      [
        {
          text: 'Pass',
          onPress: () => setTestResults(prev => ({ ...prev, accessibility: true }))
        },
        {
          text: 'Fail',
          style: 'destructive'
        }
      ]
    );
  };

  const completedTests = Object.values(testResults).filter(Boolean).length;
  const allTestsPassed = completedTests === 6;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>iOS Circular Time Picker Test Suite</Text>
        <Text style={styles.subtitle}>
          Tests Completed: {completedTests}/6 {allTestsPassed ? '✅' : ''}
        </Text>
      </View>

      <View style={styles.currentTimeDisplay}>
        <Text style={styles.currentTimeLabel}>Current Selection:</Text>
        <Text style={styles.currentTimeValue}>
          {lastTimeChange.hours}h {lastTimeChange.minutes}m {lastTimeChange.seconds}s
        </Text>
      </View>

      <CircularTimePicker
        onTimeChange={handleTimeChange}
        initialHours={0}
        initialMinutes={0}
        initialSeconds={0}
        testID="test-time-picker"
      />

      <View style={styles.testsContainer}>
        <Text style={styles.testsTitle}>Test Checklist:</Text>
        
        <TestButton
          title="1. Edge Value Selection"
          passed={testResults.edgeValues}
          onPress={testEdgeValues}
        />
        
        <TestButton
          title="2. Quick Scroll Snap"
          passed={testResults.quickScroll}
          onPress={testQuickScroll}
        />
        
        <TestButton
          title="3. Touch Interception"
          passed={testResults.touchInterception}
          onPress={testTouchInterception}
        />
        
        <TestButton
          title="4. Haptic Feedback"
          passed={testResults.haptics}
          onPress={testHaptics}
        />
        
        <TestButton
          title="5. Infinite Scroll"
          passed={testResults.infiniteScroll}
          onPress={testInfiniteScroll}
        />
        
        <TestButton
          title="6. Accessibility"
          passed={testResults.accessibility}
          onPress={testAccessibility}
        />
      </View>

      {allTestsPassed && (
        <View style={styles.passedContainer}>
          <Text style={styles.passedText}>🎉 All Tests Passed!</Text>
        </View>
      )}
    </View>
  );
}

function TestButton({ title, passed, onPress }: {
  title: string;
  passed: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.testButton}>
      <Text style={[styles.testButtonText, passed && styles.testButtonTextPassed]}>
        {passed ? '✅' : '⏳'} {title}
      </Text>
      {!passed && (
        <Text style={styles.testButtonAction} onPress={onPress}>
          Run Test
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
  },
  currentTimeDisplay: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  currentTimeLabel: {
    fontSize: 14,
    color: '#888888',
  },
  currentTimeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  testsContainer: {
    padding: 20,
  },
  testsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  testButtonText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  testButtonTextPassed: {
    color: '#4CAF50',
  },
  testButtonAction: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  passedContainer: {
    padding: 16,
    alignItems: 'center',
  },
  passedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
  },
});