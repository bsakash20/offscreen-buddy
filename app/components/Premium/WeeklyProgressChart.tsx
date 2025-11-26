import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../assets/constants/colors';
const colors = Colors.dark;

interface WeeklyProgressData {
  week: string;
  completedSessions: number;
  totalFocusTime: number;
  successRate: number;
  streakDays: number;
}

interface WeeklyProgressChartProps {
  data: WeeklyProgressData[];
  timeframe: 'week' | 'month' | 'year';
  onDataPointPress?: (data: WeeklyProgressData) => void;
}

  // const { width } = Dimensions.get('window'); // Reserved for future implementation
const { width } = Dimensions.get('window');

const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
  data,
  timeframe,
  onDataPointPress
}) => {
  const chartData = useMemo(() => {
    const processedData = data.slice(-7).map((item, index) => ({
      ...item,
      day: getDayLabel(index),
      value: item.completedSessions,
      percentage: (item.completedSessions / 10) * 100,
      color: getBarColor(item.successRate)
    }));
    
    return processedData;
  }, [data, timeframe]);

  function getDayLabel(index: number): string {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[index] || '';
  }

  function getBarColor(successRate: number): string {
    if (successRate >= 80) return colors.success;
    if (successRate >= 60) return colors.accent;
    if (successRate >= 40) return colors.warning;
    return colors.error;
  }

  const maxValue = Math.max(...chartData.map(d => d.value), 10);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Progress</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Excellent (80%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Good (60%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Fair (40%+)</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {chartData.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.barContainer}
              onPress={() => onDataPointPress?.(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.barValue}>{item.value}</Text>
              
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar,
                    { 
                      height: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color
                    }
                  ]}
                />
              </View>
              
              <Text style={styles.dayLabel}>{item.day}</Text>
              <Text style={styles.successRate}>{item.successRate}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={styles.summaryValue}>
              {chartData.reduce((sum, item) => sum + item.completedSessions, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Sessions</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={16} color={colors.accent} />
            <Text style={styles.summaryValue}>
              {Math.round(chartData.reduce((sum, item) => sum + item.totalFocusTime, 0) / 60000)}m
            </Text>
            <Text style={styles.summaryLabel}>Focus Time</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
            <Text style={styles.summaryValue}>
              {chartData.length > 0 
                ? Math.round(chartData.reduce((sum, item) => sum + item.successRate, 0) / chartData.length)
                : 0}%
            </Text>
            <Text style={styles.summaryLabel}>Avg Success</Text>
          </View>
        </View>
      </View>

      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Week Breakdown</Text>
        {chartData.map((item, index) => (
          <View key={index} style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: item.color }]} />
              <Text style={styles.breakdownDay}>{item.day}</Text>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownSessions}>{item.completedSessions} sessions</Text>
              <Text style={styles.breakdownTime}>
                {Math.round(item.totalFocusTime / 60000)}min
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  chartContainer: {
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: 40,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  barWrapper: {
    width: 24,
    height: 80,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  successRate: {
    fontSize: 8,
    color: colors.textTertiary,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  breakdownContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  breakdownDay: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownSessions: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});

export default WeeklyProgressChart;