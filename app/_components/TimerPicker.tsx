import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

interface TimerPickerProps {
  onTimeChange: (hours: number, minutes: number, seconds: number) => void;
  theme: any;
  disabled?: boolean;
}

const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 5;
const PICKER_WIDTH = 90;

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);
const seconds = Array.from({ length: 60 }, (_, i) => i);

const AnimatedPickerItem = ({
  value,
  isSelected,
  theme,
  scrollY,
  index,
}: {
  value: number;
  isSelected: boolean;
  theme: any;
  scrollY: Animated.Value;
  index: number;
}) => {
  // Calculate relative position of this item to the center of the picker
  // Center is at 2 * ITEM_HEIGHT (since VISIBLE_ITEMS is 5, center is 3rd item, index 2)
  // At scrollY = 0, Index 0 is at the center (due to padding).
  // So for Index i, peak should be at scrollY = i * ITEM_HEIGHT.

  const inputRange = [
    (index - 1) * ITEM_HEIGHT,
    index * ITEM_HEIGHT,
    (index + 1) * ITEM_HEIGHT
  ];

  // Scale: 1.2 at center, 0.8 at edges
  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.8, 1.2, 0.8],
    extrapolate: 'clamp',
  });

  // Opacity: 1 at center, drastic falloff
  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.3, 1.0, 0.3],
    extrapolate: 'clamp',
  });

  // Perspective/Rotation attempt (subtle)
  const rotateX = scrollY.interpolate({
    inputRange,
    outputRange: ['45deg', '0deg', '-45deg'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.pickerItem,
        {
          height: ITEM_HEIGHT,
          justifyContent: "center",
          alignItems: "center",
          transform: [
            { scale },
            // { rotateX }, // 3D rotation can be glitchy on JS thread without reanimated
            // Simplified to just scale/opacity for 60fps
          ],
          opacity,
        },
      ]}
    >
      <Text
        style={[
          styles.itemText,
          {
            color: '#FFFFFF', // Always white for clean look on dark gradient
            fontWeight: "600",
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          },
        ]}
      >
        {value.toString().padStart(2, "0")}
      </Text>
    </Animated.View>
  );
};

export default function TimerPicker({ onTimeChange, theme, disabled = false }: TimerPickerProps) {
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [selectedSeconds, setSelectedSeconds] = useState(0);

  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);
  const secondsScrollRef = useRef<ScrollView>(null);

  const hoursScrollY = useRef(new Animated.Value(0)).current;
  const minutesScrollY = useRef(new Animated.Value(0)).current;
  const secondsScrollY = useRef(new Animated.Value(0)).current;

  // Refs for haptic tracking
  const lastHapticIndexHours = useRef(-1);
  const lastHapticIndexMinutes = useRef(-1);
  const lastHapticIndexSeconds = useRef(-1);

  useEffect(() => {
    // Initial scroll setup
    setTimeout(() => {
      // Set initial Animated values
      hoursScrollY.setValue(selectedHours * ITEM_HEIGHT);
      minutesScrollY.setValue(selectedMinutes * ITEM_HEIGHT);
      secondsScrollY.setValue(selectedSeconds * ITEM_HEIGHT);

      hoursScrollRef.current?.scrollTo({
        y: selectedHours * ITEM_HEIGHT,
        animated: false,
      });
      minutesScrollRef.current?.scrollTo({
        y: selectedMinutes * ITEM_HEIGHT,
        animated: false,
      });
      secondsScrollRef.current?.scrollTo({
        y: selectedSeconds * ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  const triggerHaptic = () => {
    // Light impact for scroll ticks
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    type: 'hours' | 'minutes' | 'seconds',
    animatedValue: Animated.Value,
    lastHapticRef: React.MutableRefObject<number>
  ) => {
    const y = event.nativeEvent.contentOffset.y;

    // Update Animated Value
    animatedValue.setValue(y);

    // Haptic Logic
    const currentIndex = Math.round(y / ITEM_HEIGHT);
    if (currentIndex !== lastHapticRef.current) {
      if (lastHapticRef.current !== -1) { // Skip initial load haptic
        triggerHaptic();
      }
      lastHapticRef.current = currentIndex;
    }
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    type: 'hours' | 'minutes' | 'seconds'
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);

    // Clamp
    const maxIndex = type === 'hours' ? 23 : 59;
    const clampedIndex = Math.max(0, Math.min(maxIndex, index));

    // Check if we need to snap (if stopped between items)
    // The ScrollView snapToInterval usually handles this, but we ensure logic update here.

    if (type === 'hours') setSelectedHours(clampedIndex);
    else if (type === 'minutes') setSelectedMinutes(clampedIndex);
    else setSelectedSeconds(clampedIndex);

    // Notify parent
    onTimeChange(
      type === 'hours' ? clampedIndex : selectedHours,
      type === 'minutes' ? clampedIndex : selectedMinutes,
      type === 'seconds' ? clampedIndex : selectedSeconds
    );

    // Heavier haptic for selection settlement
    Haptics.selectionAsync();
  };

  const renderPickerColumn = (
    data: number[],
    type: 'hours' | 'minutes' | 'seconds',
    selectedValue: number,
    scrollRef: React.RefObject<ScrollView | null>,
    scrollY: Animated.Value,
    lastHapticRef: React.MutableRefObject<number>,
    label: string
  ) => (
    <View style={styles.pickerColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="normal"
        onScroll={(e) => handleScroll(e, type, scrollY, lastHapticRef)}
        onMomentumScrollEnd={(e) => handleMomentumScrollEnd(e, type)}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        scrollEnabled={!disabled}
      >
        {data.map((value, index) => (
          <AnimatedPickerItem
            key={value}
            value={value}
            isSelected={value === selectedValue}
            theme={theme}
            scrollY={scrollY}
            index={index}
          />
        ))}
      </ScrollView>

      {/* Inline Label */}
      <View style={styles.inlineLabelContainer} pointerEvents="none">
        <Text style={styles.inlineLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Glass Overlay for Center Selection */}
      <View style={[styles.glassOverlay, {
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.08)'
      }]} pointerEvents="none" />

      <View style={styles.pickerContainer}>
        {renderPickerColumn(hours, 'hours', selectedHours, hoursScrollRef, hoursScrollY, lastHapticIndexHours, 'hrs')}

        <Text style={[styles.separator, { color: 'rgba(255,255,255,0.5)' }]}>:</Text>

        {renderPickerColumn(minutes, 'minutes', selectedMinutes, minutesScrollRef, minutesScrollY, lastHapticIndexMinutes, 'min')}

        <Text style={[styles.separator, { color: 'rgba(255,255,255,0.5)' }]}>:</Text>

        {renderPickerColumn(seconds, 'seconds', selectedSeconds, secondsScrollRef, secondsScrollY, lastHapticIndexSeconds, 'sec')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    position: 'relative',
    height: 320, // Enough height for the picker
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    // overflow: 'hidden',
  },
  pickerColumn: {
    width: PICKER_WIDTH,
    height: '100%',
    position: "relative",
  },
  pickerItem: {
    width: "100%",
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 34,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
  glassOverlay: {
    position: "absolute",
    top: ITEM_HEIGHT * 2, // Center of visible items
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 20,
    zIndex: 0, // Behind text but visible
  },
  separator: {
    fontSize: 28,
    fontWeight: "300",
    marginHorizontal: 4,
    textAlign: "center",
    width: 14,
    paddingBottom: 4, // Visual alignment
  },
  inlineLabelContainer: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  inlineLabel: {
    marginLeft: 70, // Push 70px right from center (Clearance for "00")
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    zIndex: 10,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    zIndex: 10,
  },
});