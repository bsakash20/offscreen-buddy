import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../assets/constants/colors';
const colors = Colors.dark;

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: {
    week: string;
    completedSessions: number;
    streakDays: number;
    successRate: number;
  }[];
}

const StreakTracker: React.FC<StreakTrackerProps> = ({
  currentStreak,
  longestStreak,
  weeklyProgress
}) => {
  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { level: 'Legendary', color: '#FFD700', icon: 'trophy' };
    if (streak >= 14) return { level: 'Expert', color: '#FF6B6B', icon: 'flame' };
    if (streak >= 7) return { level: 'Advanced', color: '#4ECDC4', icon: 'flame' };
    if (streak >= 3) return { level: 'Intermediate', color: '#FFB347', icon: 'flame' };
    return { level: 'Beginner', color: '#4A8FFF', icon: 'leaf' };
  };

  const currentLevel = getStreakLevel(currentStreak);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Focus Streaks</Text>
      
      {/* Current Streak */}
      <View style={styles.streakSection}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.currentStreakCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.streakHeader}>
            <Ionicons name={currentLevel.icon as any} size={32} color="white" />
            <Text style={styles.currentStreakLabel}>Current Streak</Text>
          </View>
          <Text style={styles.currentStreakValue}>{currentStreak}</Text>
          <Text style={styles.streakDays}>days</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{currentLevel.level}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Streak Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={20} color={colors.warning} />
          <Text style={styles.statValue}>{longestStreak}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={20} color={colors.success} />
          <Text style={styles.statValue}>
            {weeklyProgress.reduce((sum, week) => sum + week.streakDays, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={20} color={colors.primary} />
          <Text style={styles.statValue}>
            {weeklyProgress.length > 0 
              ? Math.round(weeklyProgress.reduce((sum, week) => sum + week.successRate, 0) / weeklyProgress.length)
              : 0}%
          </Text>
          <Text style={styles.statLabel}>Avg Success</Text>
        </View>
      </View>

      {/* Streak Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Path to Next Level</Text>
        <View style={styles.progressBar}>
          <View style={styles.progressFill}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.progressGradient}
            />
          </View>
          <Text style={styles.progressText}>
            {currentStreak < 3 ? `${3 - currentStreak} days to Intermediate` :
             currentStreak < 7 ? `${7 - currentStreak} days to Advanced` :
             currentStreak < 14 ? `${14 - currentStreak} days to Expert` :
             currentStreak < 30 ? `${30 - currentStreak} days to Legendary` :
             'Max level achieved!'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  streakSection: {
    marginBottom: 16,
  },
  currentStreakCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentStreakLabel: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  currentStreakValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  streakDays: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    width: '0%', // This would be calculated based on progress
  },
  progressGradient: {
    width: '30%', // This would be dynamic
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StreakTracker;