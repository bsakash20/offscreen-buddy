import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../assets/constants/colors';
const colors = Colors.dark;

interface MetricsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
  onPress?: () => void;
  gradient?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
  onPress,
  gradient = false,
  size = 'medium'
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const cardContent = (
    <View style={[styles.card, getSizeStyle(), gradient && styles.gradientCard]}>
      {gradient && (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={size === 'small' ? 16 : size === 'large' ? 32 : 24} color={gradient ? 'white' : colors.primary} />
          </View>
          {trend !== 'neutral' && (
            <Ionicons 
              name={getTrendIcon()} 
              size={12} 
              color={gradient ? 'white' : getTrendColor()} 
            />
          )}
        </View>
        
        <Text style={[styles.value, gradient && styles.gradientText]}>{value}</Text>
        <Text style={[styles.subtitle, gradient && styles.gradientText]}>{subtitle}</Text>
        <Text style={[styles.title, gradient && styles.gradientText]}>{title}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientCard: {
    borderWidth: 0,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  gradientText: {
    color: 'white',
  },
  small: {
    minHeight: 80,
    padding: 12,
  },
  medium: {
    minHeight: 100,
    padding: 16,
  },
  large: {
    minHeight: 140,
    padding: 20,
  },
});

export default MetricsCard;