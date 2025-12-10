import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { HapticUtils } from '@/utils/HapticManager';

// Required constants for perfect behavior
const ITEM_HEIGHT = 56;
const VISIBLE_ROWS = 5;
const VIEWPORT_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS; // 280px
const CONTENT_INSET = (VIEWPORT_HEIGHT - ITEM_HEIGHT) / 2; // 112px
const MULTIPLIER = 3;

// Base data arrays
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_SEC = Array.from({ length: 60 }, (_, i) => i);

// Data types
interface TimeData {
  key: string;
  value: number;
}

// Utility functions
const getItemLayout = (data: ArrayLike<TimeData> | null | undefined, offset: number) => {
  if (!data) return { length: ITEM_HEIGHT, offset: 0, index: 0 };
  return {
    length: ITEM_HEIGHT,
    offset: offset * ITEM_HEIGHT,
    index: offset,
  };
};

// Calculate initial index so value appears centered in viewport on load
const getCenterIndex = (dataLength: number, initialValue: number) => {
  const centerRow = Math.floor(VISIBLE_ROWS / 2); // Row 2 for 5 rows (0,1,2,3,4)
  
  // Start from the BEGINNING of the first data segment (not middle)
  const firstSegmentStart = 0;
  
  // Position the value at the center row
  return firstSegmentStart + initialValue + centerRow;
};

interface WheelProps {
  data: TimeData[];
  initialIndex: number;
  onChange: (value: number) => void;
  testID?: string;
  maxValue: number;
  wheelType: 'hours' | 'minutes' | 'seconds';
}

function Wheel({ data, initialIndex, onChange, testID, maxValue, wheelType }: WheelProps) {
  const listRef = useRef<FlatList<TimeData>>(null);
  const prevIndexRef = useRef(initialIndex);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    listRef.current?.scrollToOffset({ 
      offset: initialIndex * ITEM_HEIGHT, 
      animated: false 
    });
  }, [initialIndex]);

  const valueForIndex = (i: number) => {
    const realIndex = ((i % data.length) + data.length) % data.length;
    
    // Map to actual value (0-23 for hours, 0-59 for minutes/seconds)
    if (wheelType === 'hours') {
      return Math.floor(realIndex / MULTIPLIER) % 24;
    } else {
      return Math.floor(realIndex / MULTIPLIER) % 60;
    }
  };

  const triggerHaptic = async (isRollover: boolean) => {
    if (isRollover) {
      await HapticUtils.warning();
    } else {
      await HapticUtils.lightTap();
    }
  };

  const snapToIndex = useCallback(async (i: number) => {
    const clampedIndex = Math.max(0, Math.min(i, data.length - 1));
    const offset = clampedIndex * ITEM_HEIGHT;
    
    listRef.current?.scrollToOffset({
      offset,
      animated: true,
    });
    
    setIndex(clampedIndex);
    const prev = prevIndexRef.current;
    const prevVal = valueForIndex(prev);
    const newVal = valueForIndex(clampedIndex);
    
    // Check for rollover at boundaries
    const rollover = (prevVal === maxValue - 1 && newVal === 0) ||
                    (prevVal === 0 && newVal === maxValue - 1);
    
    await triggerHaptic(rollover);
    prevIndexRef.current = clampedIndex;
    
    if (onChange) onChange(newVal);
  }, [data, onChange, maxValue, valueForIndex]);

  const onMomentumScrollEnd = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const i = Math.round(y / ITEM_HEIGHT);
    snapToIndex(i);
  };

  const onScrollEndDrag = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const i = Math.round(y / ITEM_HEIGHT);
    snapToIndex(i);
  };

  const renderItem = ({ item, index: itemIndex }: { item: TimeData; index: number }) => {
    const isSelected = Math.abs(itemIndex - index) <= 1;
    
    return (
      <View style={styles.item}>
        <Text style={[
          styles.text,
          isSelected ? styles.textSelected : styles.textUnselected
        ]}>
          {String(item.value).padStart(2, '0')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.wheel} pointerEvents="auto">
      <FlatList<TimeData>
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        initialScrollIndex={initialIndex}
        initialNumToRender={Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + 4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingVertical: CONTENT_INSET, 
          paddingHorizontal: 12 
        }}
        extraData={index}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Time picker wheel, ${wheelType}`}
        testID={testID}
      />
    </View>
  );
}

interface CircularTimePickerProps {
  onTimeChange?: (hours: number, minutes: number, seconds: number) => void;
  initialHours?: number;
  initialMinutes?: number;
  initialSeconds?: number;
  testID?: string;
}

export default function CircularTimePicker({
  onTimeChange,
  initialHours = 0,
  initialMinutes = 0,
  initialSeconds = 0,
  testID = "circular-time-picker"
}: CircularTimePickerProps) {
  // Duplicated data for infinite scroll (3x) - inside component
  const HourData = useMemo(() => {
    const base = HOURS.map((n) => ({ key: `h-${n}`, value: n }));
    return [...base, ...base, ...base];
  }, []);

  const MinData = useMemo(() => {
    const base = MIN_SEC.map((n) => ({ key: `m-${n}`, value: n }));
    return [...base, ...base, ...base];
  }, []);

  const SecData = useMemo(() => {
    const base = MIN_SEC.map((n) => ({ key: `s-${n}`, value: n }));
    return [...base, ...base, ...base];
  }, []);

  const [hour, setHour] = useState(initialHours);
  const [minute, setMinute] = useState(initialMinutes);
  const [second, setSecond] = useState(initialSeconds);

  const handleTimeChange = useCallback((h: number, m: number, s: number) => {
    if (onTimeChange) {
      onTimeChange(h, m, s);
    }
  }, [onTimeChange]);

  const handleHourChange = useCallback((newHour: number) => {
    setHour(newHour);
    handleTimeChange(newHour, minute, second);
  }, [minute, second, handleTimeChange]);

  const handleMinuteChange = useCallback((newMinute: number) => {
    setMinute(newMinute);
    handleTimeChange(hour, newMinute, second);
  }, [hour, second, handleTimeChange]);

  const handleSecondChange = useCallback((newSecond: number) => {
    setSecond(newSecond);
    handleTimeChange(hour, minute, newSecond);
  }, [hour, minute, handleTimeChange]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.wheelsRow}>
        <Wheel
          data={HourData}
          initialIndex={getCenterIndex(HourData.length, initialHours)}
          onChange={handleHourChange}
          testID="wheel-hour"
          maxValue={24}
          wheelType="hours"
        />
        <Wheel
          data={MinData}
          initialIndex={getCenterIndex(MinData.length, initialMinutes)}
          onChange={handleMinuteChange}
          testID="wheel-minute"
          maxValue={60}
          wheelType="minutes"
        />
        <Wheel
          data={SecData}
          initialIndex={getCenterIndex(SecData.length, initialSeconds)}
          onChange={handleSecondChange}
          testID="wheel-second"
          maxValue={60}
          wheelType="seconds"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    width: '100%',
    height: VIEWPORT_HEIGHT,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  wheelsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    height: VIEWPORT_HEIGHT,
    width: '100%',
  },
  wheel: { 
    flex: 1,
    height: VIEWPORT_HEIGHT,
    maxWidth: 110,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  textSelected: {
    fontWeight: '700',
    fontSize: 32,
    color: '#FFB347',
    lineHeight: 38,
  },
  textUnselected: {
    fontWeight: '400',
    fontSize: 24,
    color: '#ffffff',
    opacity: 0.4,
    lineHeight: 30,
  },
});