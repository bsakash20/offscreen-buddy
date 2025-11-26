import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

interface TimerPickerProps {
  onTimeChange: (hours: number, minutes: number, seconds: number) => void;
  theme: any;
  disabled?: boolean;
}

const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 5;
const PICKER_WIDTH = 80;

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);
const seconds = Array.from({ length: 60 }, (_, i) => i);

const AnimatedPickerItem = ({
  value,
  isSelected,
  theme,
  delay
}: {
  value: number;
  isSelected: boolean;
  theme: any;
  delay: number;
}) => {
  const translateY = useRef(new Animated.Value(isSelected ? 0 : 25)).current;
  const opacity = useRef(new Animated.Value(isSelected ? 1 : 0.3)).current;
  const scale = useRef(new Animated.Value(isSelected ? 1 : 0.85)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: isSelected ? 0 : 25,
        delay,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isSelected ? 1 : 0.3,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: isSelected ? 1 : 0.85,
        delay,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isSelected ? 0.6 : 0,
        duration: 200,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, delay]);

  return (
    <Animated.View
      style={[
        styles.pickerItem,
        {
          height: ITEM_HEIGHT,
          justifyContent: "center",
          alignItems: "center",
          transform: [
            { translateY },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <Text
        style={[
          styles.pickerText,
          {
            color: isSelected ? theme.accent : theme.textTertiary,
            fontSize: isSelected ? 34 : 26,
            fontWeight: isSelected ? "800" : "400",
            fontFamily: "SF-Pro-Rounded",
            opacity: isSelected ? 1 : 0.4,
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
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [selectedSeconds, setSelectedSeconds] = useState(0);

  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);
  const secondsScrollRef = useRef<ScrollView>(null);

  const hoursOverlayOpacity = useRef(new Animated.Value(0)).current;
  const minutesOverlayOpacity = useRef(new Animated.Value(0)).current;
  const secondsOverlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial scroll to default positions
    setTimeout(() => {
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

  const handleScroll = (
    event: any,
    type: 'hours' | 'minutes' | 'seconds',
    setSelected: (value: number) => void
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(
      0,
      Math.min(type === 'hours' ? 23 : 59, index)
    );
    
    setSelected(clampedIndex);
    onTimeChange(
      type === 'hours' ? clampedIndex : selectedHours,
      type === 'minutes' ? clampedIndex : selectedMinutes,
      type === 'seconds' ? clampedIndex : selectedSeconds,
    );
  };

  const handleMomentumScrollEnd = (
    event: any,
    type: 'hours' | 'minutes' | 'seconds'
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(
      0,
      Math.min(type === 'hours' ? 23 : 59, index)
    );
    
    const scrollRef = 
      type === 'hours' ? hoursScrollRef :
      type === 'minutes' ? minutesScrollRef : 
      secondsScrollRef;

    scrollRef.current?.scrollTo({
      y: clampedIndex * ITEM_HEIGHT,
      animated: true,
    });

    // Enhanced haptic feedback
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const handleScrollBeginDrag = (type: 'hours' | 'minutes' | 'seconds') => {
    const opacity = 
      type === 'hours' ? hoursOverlayOpacity :
      type === 'minutes' ? minutesOverlayOpacity :
      secondsOverlayOpacity;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleScrollEndDrag = (type: 'hours' | 'minutes' | 'seconds') => {
    const opacity = 
      type === 'hours' ? hoursOverlayOpacity :
      type === 'minutes' ? minutesOverlayOpacity :
      secondsOverlayOpacity;

    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 100);
  };

  const renderPickerColumn = (
    data: number[],
    type: 'hours' | 'minutes' | 'seconds',
    selectedValue: number,
    scrollRef: React.RefObject<ScrollView | null>,
    overlayOpacity: Animated.Value
  ) => (
    <View style={styles.pickerColumn}>
      <ScrollView
        ref={scrollRef}
        style={styles.picker}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={(e) => handleScroll(e, type,
          type === 'hours' ? setSelectedHours :
          type === 'minutes' ? setSelectedMinutes :
          setSelectedSeconds
        )}
        onMomentumScrollEnd={(e) => handleMomentumScrollEnd(e, type)}
        onScrollBeginDrag={() => handleScrollBeginDrag(type)}
        onScrollEndDrag={() => handleScrollEndDrag(type)}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        scrollEnabled={!disabled}
      >
        {data.map((value) => (
          <AnimatedPickerItem
            key={value}
            value={value}
            isSelected={value === selectedValue}
            theme={theme}
            delay={Math.abs(value - selectedValue) * 50}
          />
        ))}
      </ScrollView>

      {/* Selection Indicator - removed background box for transparency */}

      {/* Overlay during scrolling */}
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: theme.surface,
            opacity: overlayOpacity,
          }
        ]}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        {renderPickerColumn(hours, 'hours', selectedHours, hoursScrollRef, hoursOverlayOpacity)}
        
        <Text style={[styles.separator, { color: theme.textSecondary }]}>:</Text>
        
        {renderPickerColumn(minutes, 'minutes', selectedMinutes, minutesScrollRef, minutesOverlayOpacity)}
        
        <Text style={[styles.separator, { color: theme.textSecondary }]}>:</Text>
        
        {renderPickerColumn(seconds, 'seconds', selectedSeconds, secondsScrollRef, secondsOverlayOpacity)}
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <Text style={[styles.label, { color: theme.textTertiary }]}>H</Text>
        <Text style={[styles.label, { color: theme.textTertiary }]}>M</Text>
        <Text style={[styles.label, { color: theme.textTertiary }]}>S</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  pickerColumn: {
    width: PICKER_WIDTH,
    position: "relative",
  },
  picker: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  pickerItem: {
    width: "100%",
    position: "relative",
  },
  pickerText: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    zIndex: 2,
  },
  pickerGlow: {
    position: "absolute",
    width: 60,
    height: 50,
    borderRadius: 25,
    top: 5,
    left: 10,
    zIndex: 1,
  },
  selectionIndicator: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    pointerEvents: "none",
  },
  selectionHighlight: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  overlay: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    pointerEvents: "none",
  },
  separator: {
    fontSize: 36,
    fontWeight: "300",
    marginHorizontal: 8,
    textAlign: "center",
    width: 16,
    lineHeight: 36,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  labelsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    width: PICKER_WIDTH,
  },
});