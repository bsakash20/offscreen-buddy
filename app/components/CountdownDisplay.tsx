import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";

interface CountdownDisplayProps {
  remainingTime: number;
  duration: number;
  theme: any;
  onAnimationComplete?: () => void;
}

const { width } = Dimensions.get("window");
const PROGRESS_SIZE = Math.min(width * 0.7, 280);
const PROGRESS_STROKE_WIDTH = 8;
const PROGRESS_RADIUS = (PROGRESS_SIZE - PROGRESS_STROKE_WIDTH) / 2;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedDigitProps {
  digit: string;
  previousDigit: string;
  theme: any;
  index: number;
}

const AnimatedDigit = ({ digit, previousDigit, theme, index }: AnimatedDigitProps) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (previousDigit !== digit) {
      // Enhanced premium transition animation
      Animated.sequence([
        // Phase 1: Fade out and slide up with scale
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Phase 2: Reset position and fade in with new digit
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 25,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        // Phase 3: Slide down to final position with bounce
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }),
        ]),
      ]).start();

      // Enhanced haptic feedback with intensity variation
      if (index >= 2) { // Only for seconds to avoid too much haptic noise
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
      }
    }
  }, [digit, previousDigit, index]);

  return (
    <Animated.View
      style={[
        styles.digitContainer,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: fadeAnim,
        },
      ]}
    >
      <Text
        style={[
          styles.digit,
          {
            color: theme.accent,
            fontFamily: "SF-Pro-Rounded-Bold",
          },
        ]}
      >
        {digit}
      </Text>
    </Animated.View>
  );
};

const TimeSeparator = ({ isVisible, theme }: { isVisible: boolean; theme: any }) => {
  const opacity = useRef(new Animated.Value(isVisible ? 1 : 0.3)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isVisible ? 1 : 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  return (
    <Animated.Text
      style={[
        styles.separator,
        {
          color: theme.accent,
          opacity: opacity,
          fontFamily: "SF-Pro-Rounded-Light",
        },
      ]}
    >
      :
    </Animated.Text>
  );
};

export default function CountdownDisplay({
  remainingTime,
  duration,
  theme,
  onAnimationComplete
}: CountdownDisplayProps) {
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [timeDisplay, setTimeDisplay] = React.useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [previousTime, setPreviousTime] = React.useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  // Format time helper - use React.useCallback to avoid warnings
  const formatTime = React.useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return {
      hours: hrs.toString().padStart(2, "0"),
      minutes: mins.toString().padStart(2, "0"),
      seconds: secs.toString().padStart(2, "0"),
    };
  }, []);

  // Update display when time changes
  useEffect(() => {
    const newTime = formatTime(remainingTime);
    // Only update if the time has actually changed
    if (newTime.hours !== timeDisplay.hours ||
        newTime.minutes !== timeDisplay.minutes ||
        newTime.seconds !== timeDisplay.seconds) {
      setPreviousTime(timeDisplay);
      setTimeDisplay(newTime);
    }
  }, [remainingTime, formatTime]);

  // Animate progress ring - always animate for better responsiveness
  useEffect(() => {
    const progress = duration > 0 ? remainingTime / duration : 0;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [remainingTime, duration, progressAnim]);

  // Pulsing effect for last 10 seconds
  useEffect(() => {
    if (remainingTime <= 10 && remainingTime > 0) {
      // Pulsing effect
      Animated.loop(
        Animated.sequence([
          Animated.spring(pulseAnim, {
            toValue: 1.05,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
          }),
          Animated.spring(pulseAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      pulseAnim.removeAllListeners();
    };
  }, [remainingTime, pulseAnim]);

  // Completion animation
  useEffect(() => {
    if (remainingTime === 0 && duration > 0) {
      // Success haptic feedback
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Completion animation - ensure ring goes to empty (0 progress)
      Animated.spring(progressAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 80,
        friction: 10,
      }).start(() => {
        onAnimationComplete?.();
      });
    }
  }, [remainingTime, duration, onAnimationComplete, progressAnim]);

  return (
    <View style={styles.container}>
      {/* Main timer display */}
      <View style={styles.timerContainer}>
        <View style={styles.timeDisplay}>
          {/* Hours */}
          <View style={styles.timeGroup}>
            <Animated.View
              style={[
                styles.digitGroup,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <AnimatedDigit
                digit={timeDisplay.hours[0]}
                previousDigit={previousTime.hours[0]}
                theme={theme}
                index={0}
              />
              <AnimatedDigit
                digit={timeDisplay.hours[1]}
                previousDigit={previousTime.hours[1]}
                theme={theme}
                index={1}
              />
            </Animated.View>
            <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>
              H
            </Text>
          </View>

          <TimeSeparator isVisible={duration >= 3600} theme={theme} />

          {/* Minutes */}
          <View style={styles.timeGroup}>
            <View style={styles.digitGroup}>
              <AnimatedDigit
                digit={timeDisplay.minutes[0]}
                previousDigit={previousTime.minutes[0]}
                theme={theme}
                index={2}
              />
              <AnimatedDigit
                digit={timeDisplay.minutes[1]}
                previousDigit={previousTime.minutes[1]}
                theme={theme}
                index={3}
              />
            </View>
            <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>
              M
            </Text>
          </View>

          <TimeSeparator isVisible={true} theme={theme} />

          {/* Seconds */}
          <View style={styles.timeGroup}>
            <View style={styles.digitGroup}>
              <AnimatedDigit
                digit={timeDisplay.seconds[0]}
                previousDigit={previousTime.seconds[0]}
                theme={theme}
                index={4}
              />
              <AnimatedDigit
                digit={timeDisplay.seconds[1]}
                previousDigit={previousTime.seconds[1]}
                theme={theme}
                index={5}
              />
            </View>
            <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>
              S
            </Text>
          </View>
        </View>
      </View>

      {/* Circular Progress Ring using SVG */}
      <View style={styles.progressContainer}>
        <Svg width={PROGRESS_SIZE} height={PROGRESS_SIZE} style={styles.progressSvg}>
          {/* Background circle */}
          <Circle
            cx={PROGRESS_SIZE / 2}
            cy={PROGRESS_SIZE / 2}
            r={PROGRESS_RADIUS}
            stroke={theme.progressBackground}
            strokeWidth={PROGRESS_STROKE_WIDTH}
            fill="transparent"
          />
          
          {/* Progress circle that shows remaining time */}
          <AnimatedCircle
            cx={PROGRESS_SIZE / 2}
            cy={PROGRESS_SIZE / 2}
            r={PROGRESS_RADIUS}
            stroke={theme.progress}
            strokeWidth={PROGRESS_STROKE_WIDTH}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${PROGRESS_CIRCUMFERENCE} ${PROGRESS_CIRCUMFERENCE}`}
            // Start at 12 o'clock and animate anti-clockwise with time remaining
            strokeDashoffset={Animated.multiply(
              progressAnim,
              PROGRESS_CIRCUMFERENCE
            )}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  timeGroup: {
    alignItems: "center",
  },
  digitGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  digitContainer: {
    width: 45,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  digit: {
    fontSize: 64,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    lineHeight: 80,
    zIndex: 2,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  separator: {
    fontSize: 64,
    fontWeight: "200",
    marginHorizontal: 12,
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 64,
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
    height: 80,
    alignSelf: "center",
  },
  progressContainer: {
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  progressSvg: {
    transform: [{ rotate: "-90deg" }],
  },
  // Simple progress styles
  simpleProgressContainer: {
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    borderRadius: PROGRESS_SIZE / 2,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  simpleProgressBackground: {
    position: "absolute",
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    borderRadius: PROGRESS_SIZE / 2,
    opacity: 0.3,
  },
  simpleProgressFill: {
    position: "absolute",
    height: PROGRESS_STROKE_WIDTH,
    borderRadius: PROGRESS_STROKE_WIDTH / 2,
    top: PROGRESS_SIZE / 2 - PROGRESS_STROKE_WIDTH / 2,
    left: 0,
  },
  simpleProgressOutline: {
    position: "absolute",
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    borderRadius: PROGRESS_SIZE / 2,
    borderWidth: 2,
    borderStyle: "solid",
  },
  // New visible progress styles
  visibleProgressContainer: {
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  outerRing: {
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    borderRadius: PROGRESS_SIZE / 2,
    borderWidth: PROGRESS_STROKE_WIDTH,
    borderStyle: "solid",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  innerProgress: {
    width: PROGRESS_SIZE - (PROGRESS_STROKE_WIDTH * 2),
    height: PROGRESS_SIZE - (PROGRESS_STROKE_WIDTH * 2),
    borderRadius: (PROGRESS_SIZE - (PROGRESS_STROKE_WIDTH * 2)) / 2,
    position: "absolute",
  },
  timerOverlay: {
    position: "absolute",
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  // Very visible progress styles
  visibleProgressBackground: {
    position: "absolute",
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    borderRadius: PROGRESS_SIZE / 2,
    opacity: 0.3,
  },
  visibleProgressRing: {
    position: "absolute",
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    borderRadius: PROGRESS_SIZE / 2,
    // Make it very visible with thick border
    borderWidth: 20,
  },
  // Simple progress styles
  simpleProgressDisplay: {
    alignItems: "center",
    marginTop: 20,
  },
  progressText: {
    fontSize: 18,
    fontWeight: "600",
  },
  progressBar: {
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  progressPercentage: {
    fontSize: 14,
    color: "#888",
  },
  progressTextContainer: {
    position: "absolute",
    width: PROGRESS_SIZE,
    height: PROGRESS_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarBackground: {
    width: 200,
    height: 20,
    borderRadius: 10,
  },
  progressFillBar: {
    height: 20,
    borderRadius: 10,
    position: "absolute",
    top: 0,
    left: 0,
  },
});