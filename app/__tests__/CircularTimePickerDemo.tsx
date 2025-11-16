import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import CircularTimePicker from '../components/CircularTimePicker';

export default function CircularTimePickerDemo() {
  const [selectedTime, setSelectedTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const handleTimeChange = (hours: number, minutes: number, seconds: number) => {
    setSelectedTime({ hours, minutes, seconds });
    console.log('Time changed to:', `${hours}:${minutes}:${seconds}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>iOS Timer Picker Demo</Text>
        <Text style={styles.subtitle}>Fixed Implementation - Edge Values Accessible</Text>
      </View>

      <View style={styles.timeDisplay}>
        <Text style={styles.timeDisplayText}>
          Selected Time: {selectedTime.hours}h {selectedTime.minutes}m {selectedTime.seconds}s
        </Text>
      </View>

      <View style={styles.pickerContainer}>
        <CircularTimePicker
          onTimeChange={handleTimeChange}
          initialHours={0}
          initialMinutes={0}
          initialSeconds={0}
          testID="demo-time-picker"
        />
      </View>

      <View style={styles.testSection}>
        <Text style={styles.testTitle}>✅ Fixes Implemented:</Text>
        
        <Text style={styles.fixItem}>• Correct viewport height (280px)</Text>
        <Text style={styles.fixItem}>• Perfect item centering with CONTENT_INSET</Text>
        <Text style={styles.fixItem}>• Center HUD with {`pointerEvents: "none"`}</Text>
        <Text style={styles.fixItem}>• Proper snapping with scrollToIndex</Text>
        <Text style={styles.fixItem}>• Infinite scroll (3x data duplication)</Text>
        <Text style={styles.fixItem}>• Smooth inertial scrolling</Text>
        <Text style={styles.fixItem}>• Haptic feedback on snap</Text>
        <Text style={styles.fixItem}>• iOS-style fade masks</Text>
        <Text style={styles.fixItem}>• Divider lines above/below center</Text>
        <Text style={styles.fixItem}>• Edge values (0, 23, 59) fully selectable</Text>
      </View>

      <View style={styles.constantsSection}>
        <Text style={styles.constantsTitle}>Constants Used:</Text>
        <Text style={styles.constantItem}>ITEM_HEIGHT = 56</Text>
        <Text style={styles.constantItem}>VISIBLE_ROWS = 5</Text>
        <Text style={styles.constantItem}>VIEWPORT_HEIGHT = 280</Text>
        <Text style={styles.constantItem}>CONTENT_INSET = 112</Text>
        <Text style={styles.constantItem}>MULTIPLIER = 3</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>🧪 Test Instructions:</Text>
        <Text style={styles.instructionItem}>1. Try selecting hour 0 and hour 23</Text>
        <Text style={styles.instructionItem}>2. Try selecting minute 0 and minute 59</Text>
        <Text style={styles.instructionItem}>3. Try selecting second 0 and second 59</Text>
        <Text style={styles.instructionItem}>4. Test quick scrolling and release</Text>
        <Text style={styles.instructionItem}>5. Tap above/below center HUD to verify no blocking</Text>
        <Text style={styles.instructionItem}>6. Notice smooth infinite scrolling at boundaries</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '500',
  },
  timeDisplay: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  timeDisplayText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  pickerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  testSection: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  fixItem: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
    paddingLeft: 10,
  },
  constantsSection: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  constantsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 12,
  },
  constantItem: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
    paddingLeft: 10,
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 6,
    paddingLeft: 10,
  },
});