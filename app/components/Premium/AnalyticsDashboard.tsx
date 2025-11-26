import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  // Dimensions,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../assets/constants/colors';
import PaymentButton from '../Payment/PaymentButton';
import analyticsService, { AnalyticsData, RealTimeMetrics } from '../../services/Premium/AnalyticsService';
import MetricsCard from './MetricsCard';
import StreakTracker from './StreakTracker';
import WeeklyProgressChart from './WeeklyProgressChart';
import FocusReport from './FocusReport';
import InsightsPanel from './InsightsPanel';

const colors = Colors.dark;

interface AnalyticsDashboardProps {
  isPremium?: boolean;
  onUpgradePress?: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isPremium = false,
  onUpgradePress
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('week');

  const loadAnalytics = useCallback(async () => {
    try {
      const [analyticsData, metrics] = await Promise.all([
        analyticsService.getAnalytics(),
        analyticsService.getRealTimeMetrics()
      ]);
      setAnalytics(analyticsData);
      setRealTimeMetrics(metrics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();

    // Set up real-time updates
    const interval = setInterval(async () => {
      if ((await analyticsService.getConfig()).realTimeUpdates) {
        const metrics = await analyticsService.getRealTimeMetrics();
        setRealTimeMetrics(metrics);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

if (!isPremium) {
    return (
      <View style={styles.upgradeContainer}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.upgradeGradient}
        >
          <Ionicons name="analytics" size={64} color="white" />
          <Text style={styles.upgradeTitle}>Pro Analytics</Text>
          <Text style={styles.upgradeDescription}>
            Get detailed insights into your focus patterns, track your progress,
            and receive personalized recommendations.
          </Text>
          <PaymentButton
            title="Upgrade to Pro"
            style={styles.upgradeButton}
            onSuccess={() => {
              console.log('Payment successful! Analytics dashboard will refresh.');
              // Refresh will happen automatically when parent re-renders
            }}
            onError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Real-time Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={styles.statusText}>Live Updates Active</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Real-time Metrics Overview */}
      {realTimeMetrics && (
        <View style={styles.realtimeSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.realtimeCards}>
            <MetricsCard
              title="Focus Time"
              value={`${Math.floor(realTimeMetrics.todayFocusTime / 60000)}m`}
              subtitle="Today"
              icon="time"
              trend="neutral"
            />
            <MetricsCard
              title="Current Streak"
              value={realTimeMetrics.currentStreak.toString()}
              subtitle="days"
              icon="flame"
              trend="up"
            />
          </View>
          <View style={styles.realtimeCards}>
            <MetricsCard
              title="Weekly Goal"
              value={`${Math.round(realTimeMetrics.weeklyGoalProgress)}%`}
              subtitle="Progress"
              icon="flag"
              trend={realTimeMetrics.weeklyGoalProgress > 80 ? "up" : "neutral"}
            />
            <MetricsCard
              title="Distraction Rate"
              value={`${realTimeMetrics.distractionRate}%`}
              subtitle="Today"
              icon="warning"
              trend={realTimeMetrics.distractionRate < 20 ? "down" : "up"}
            />
          </View>
        </View>
      )}

      {/* Timeframe Selector */}
      <View style={styles.timeframeSelector}>
        {(['week', 'month', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.timeframeButton,
              timeframe === period && styles.timeframeButtonActive
            ]}
            onPress={() => setTimeframe(period)}
          >
            <Text style={[
              styles.timeframeButtonText,
              timeframe === period && styles.timeframeButtonTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Analytics Content */}
      {analytics && (
        <>
          {/* Streak Tracker */}
          <StreakTracker
            currentStreak={analytics.currentStreak}
            longestStreak={analytics.longestStreak}
            weeklyProgress={analytics.weeklyProgress}
          />

          {/* Progress Chart */}
          <WeeklyProgressChart
            data={analytics.weeklyProgress}
            timeframe={timeframe}
            onDataPointPress={(data) => {
              console.log('Chart data point pressed:', data);
            }}
          />

          {/* Detailed Metrics */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Detailed Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricsCard
                title="Total Sessions"
                value={analytics.sessionsCompleted.toString()}
                subtitle="completed"
                icon="checkmark-circle"
                trend="neutral"
              />
              <MetricsCard
                title="Success Rate"
                value={`${Math.round((analytics.sessionsCompleted / 
                  (analytics.sessionsCompleted + analytics.sessionsCancelled)) * 100)}%`}
                subtitle="completion"
                icon="trending-up"
                trend="up"
              />
              <MetricsCard
                title="Avg. Duration"
                value={`${Math.floor(analytics.averageSessionDuration / 60000)}m`}
                subtitle="per session"
                icon="timer"
                trend="neutral"
              />
              <MetricsCard
                title="Peak Hour"
                value={`${realTimeMetrics?.peakPerformanceHour || 9}:00`}
                subtitle="focus time"
                icon="partly-sunny"
                trend="neutral"
              />
            </View>
          </View>

          {/* Focus Report */}
          <FocusReport
            analytics={analytics}
            timeframe={timeframe}
            onExport={(format) => {
              analyticsService.exportAnalytics(format).then(data => {
                console.log('Exported analytics:', data);
                // Handle export data
              });
            }}
          />

          {/* AI Insights */}
          {analytics.improvementSuggestions.length > 0 && (
            <InsightsPanel
              suggestions={analytics.improvementSuggestions}
              patterns={analytics.distractionPatterns}
              onSuggestionAction={(suggestion) => {
                console.log('Suggestion action:', suggestion);
                // Handle suggestion actions
              }}
            />
          )}

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Handle schedule optimization
              }}
            >
              <Ionicons name="calendar" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Optimize Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Handle export report
              }}
            >
              <Ionicons name="download" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Export Report</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  upgradeContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeGradient: {
    padding: 32,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  refreshButton: {
    padding: 8,
  },
  realtimeSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  realtimeCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeframeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  timeframeButtonTextActive: {
    color: 'white',
  },
  metricsSection: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionsSection: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 8,
  },
});

export default AnalyticsDashboard;