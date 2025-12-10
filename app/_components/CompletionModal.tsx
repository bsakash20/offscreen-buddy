import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface CompletionModalProps {
  visible: boolean;
  duration: number;
  onRestart: () => void;
  onClose: () => void;
  theme: any;
}

const { width, height } = Dimensions.get("window");

// Particle system for celebration effects
const Particle = ({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Animate particle explosion
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100 - Math.random() * 50,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: (Math.random() - 0.5) * 200,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
};

export default function CompletionModal({ 
  visible, 
  duration, 
  onRestart, 
  onClose, 
  theme 
}: CompletionModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(30)).current;
  const confettiRotation = useRef(new Animated.Value(0)).current;

  const [particles, setParticles] = React.useState<{
    id: number;
    x: number;
    y: number;
    delay: number;
    color: string;
  }[]>([]);

  const colors = ['#FF9500', '#FFB340', '#FF6B35', '#F7931E', '#FFA500'];

  useEffect(() => {
    if (visible) {
      // Show modal with scale and fade animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Trigger checkmark animation with delay
      setTimeout(() => {
        Animated.sequence([
          Animated.spring(checkScale, {
            toValue: 1.2,
            useNativeDriver: true,
            tension: 200,
            friction: 5,
          }),
          Animated.spring(checkScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();

        // Slide in text
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Generate celebration particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 2 + (Math.random() - 0.5) * 300,
        delay: Math.random() * 1000,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setParticles(newParticles);

      // Continuous confetti rotation
      Animated.loop(
        Animated.timing(confettiRotation, {
          toValue: 360,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Play celebration effects
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Play sound (simplified for now)
      console.log("🎉 Timer complete! Playing celebration sound...");
    }
  }, [visible]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleRestart = () => {
    // Play sound and haptic feedback
    console.log("🔄 Restarting timer...");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onRestart();
    
    // Close modal with animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset animations
      checkScale.setValue(0);
      textSlide.setValue(30);
    });
  };

  const handleClose = () => {
    // Play gentle close sound
    console.log("✅ Closing completion modal...");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Close modal with animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset animations
      checkScale.setValue(0);
      textSlide.setValue(30);
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Background blur */}
      <BlurView
        intensity={50}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.surface,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 32,
              elevation: 12,
            },
          ]}
        >
          {/* Success checkmark */}
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <View style={[
              styles.checkmarkCircle, 
              { 
                backgroundColor: theme.success,
                shadowColor: theme.success,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }
            ]}>
              <Ionicons name="checkmark-circle" size={60} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                transform: [{ translateY: textSlide }],
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Timer Complete!
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your phone missed you 😄
            </Text>
          </Animated.View>

          {/* Timer stats */}
          <View style={[styles.statsContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <View style={styles.statItem}>
              <View style={[
                styles.statIconContainer,
                {
                  backgroundColor: theme.accent,
                }
              ]}>
                <Ionicons name="trophy" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>
                  Duration
                </Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {formatDuration(duration)}
                </Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.restartButton,
                { 
                  backgroundColor: theme.primary,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  elevation: 6,
                },
              ]}
              onPress={handleRestart}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.restartButtonText}>Restart Timer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={theme.text} />
              <Text style={[styles.closeButtonText, { color: theme.text }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Motivational message */}
          <View style={styles.motivationContainer}>
            <View style={[
              styles.motivationIcon,
              {
                backgroundColor: theme.accent,
              }
            ]}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.motivationText, { color: theme.textSecondary }]}>
              Discipline unlocked! Your future self is proud 💯
            </Text>
          </View>
        </Animated.View>

        {/* Celebration particles */}
        {particles.map((particle) => (
          <Particle
            key={particle.id}
            x={particle.x}
            y={particle.y}
            delay={particle.delay}
            color={particle.color}
          />
        ))}

        {/* Floating stars */}
        <Animated.View
          style={[
            styles.floatingStars,
            {
              transform: [{ rotate: confettiRotation }],
            },
          ]}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Ionicons
              name="star"
              key={i}
              size={16}
              color={colors[i % colors.length]}
              style={{
                position: 'absolute',
                left: (i * 50) % width,
                top: (i * 80) % height,
                opacity: 0.6,
              }}
            />
          ))}
        </Animated.View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  checkmarkContainer: {
    marginBottom: 20,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 12,
    flexDirection: 'row',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: 'left',
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: 'left',
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  restartButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  restartButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  motivationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    flex: 1,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  floatingStars: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});