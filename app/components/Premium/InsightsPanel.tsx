import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../assets/constants/colors';
import { DistractionPattern } from '../../services/Premium/AnalyticsService';

const colors = Colors.dark;

interface InsightsPanelProps {
  suggestions: string[];
  patterns: DistractionPattern[];
  onSuggestionAction: (suggestion: string) => void;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({
  suggestions,
  patterns,
  onSuggestionAction
}) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const [animValues] = useState(Array(suggestions.length).fill(0).map(() => new Animated.Value(0)));

  const toggleSuggestion = (index: number) => {
    const newExpanded = new Set(expandedSuggestions);
    
    if (expandedSuggestions.has(index)) {
      newExpanded.delete(index);
      Animated.timing(animValues[index], {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      newExpanded.add(index);
      Animated.timing(animValues[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    
    setExpandedSuggestions(newExpanded);
  };

  const getSuggestionIcon = (suggestion: string) => {
    if (suggestion.includes('🔥')) return 'flame';
    if (suggestion.includes('📈')) return 'trending-up';
    if (suggestion.includes('⚡')) return 'zap';
    if (suggestion.includes('🎯')) return 'target';
    if (suggestion.includes('💪')) return 'fitness';
    if (suggestion.includes('🧠')) return 'brain';
    return 'bulb';
  };

  const getSuggestionColor = (suggestion: string) => {
    if (suggestion.includes('🔥')) return colors.warning;
    if (suggestion.includes('📈')) return colors.success;
    if (suggestion.includes('⚡')) return colors.accent;
    if (suggestion.includes('🎯')) return colors.primary;
    if (suggestion.includes('💪')) return colors.success;
    if (suggestion.includes('🧠')) return colors.primary;
    return colors.textSecondary;
  };

  const analyzePatterns = () => {
    if (patterns.length === 0) return null;

    const hourCounts: { [key: number]: number } = {};
    const dayCounts: { [key: number]: number } = {};
    
    patterns.forEach(pattern => {
      hourCounts[pattern.hour] = (hourCounts[pattern.hour] || 0) + pattern.frequency;
      dayCounts[pattern.dayOfWeek] = (dayCounts[pattern.dayOfWeek] || 0) + pattern.frequency;
    });

    const peakHour = Object.entries(hourCounts).reduce((a, b) => 
      hourCounts[parseInt(a[0])] > hourCounts[parseInt(b[0])] ? a : b
    );
    
    const peakDay = Object.entries(dayCounts).reduce((a, b) => 
      dayCounts[parseInt(a[0])] > dayCounts[parseInt(b[0])] ? a : b
    );

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      peakHour: parseInt(peakHour[0]),
      peakDay: parseInt(peakDay[0]),
      peakDayName: dayNames[parseInt(peakDay[0])],
      intensity: peakHour[1] + peakDay[1]
    };
  };

  const patternAnalysis = analyzePatterns();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={24} color={colors.accent} />
        <Text style={styles.title}>AI Insights & Recommendations</Text>
      </View>

      {/* Pattern Analysis */}
      {patternAnalysis && (
        <View style={styles.patternSection}>
          <Text style={styles.sectionTitle}>Your Focus Patterns</Text>
          <View style={styles.patternCard}>
            <View style={styles.patternHeader}>
              <Ionicons name="analytics" size={20} color={colors.primary} />
              <Text style={styles.patternTitle}>Peak Distraction Time</Text>
            </View>
            <Text style={styles.patternDescription}>
              You tend to get distracted most around {patternAnalysis.peakHour}:00 
              on {patternAnalysis.peakDayName}s.
            </Text>
            <View style={styles.recommendation}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.recommendationText}>
                Try scheduling important tasks during your low-distraction hours
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Smart Suggestions */}
      <View style={styles.suggestionsSection}>
        <Text style={styles.sectionTitle}>Smart Suggestions</Text>
        {suggestions.map((suggestion, index) => (
          <Animated.View
            key={index}
            style={[
              styles.suggestionCard,
              {
                maxHeight: animValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 120], // Collapsed vs expanded height
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.suggestionHeader}
              onPress={() => toggleSuggestion(index)}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionLeft}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: `${getSuggestionColor(suggestion)}20` }
                ]}>
                  <Ionicons 
                    name={getSuggestionIcon(suggestion) as any} 
                    size={20} 
                    color={getSuggestionColor(suggestion)} 
                  />
                </View>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
              <Ionicons 
                name={expandedSuggestions.has(index) ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {expandedSuggestions.has(index) && (
              <View style={styles.suggestionDetails}>
                <Text style={styles.detailText}>
                  {getSuggestionDetails(suggestion)}
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onSuggestionAction(suggestion)}
                >
                  <Text style={styles.actionButtonText}>Take Action</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        ))}
      </View>

      {/* Weekly Optimization */}
      <View style={styles.optimizationSection}>
        <Text style={styles.sectionTitle}>Weekly Optimization</Text>
        <View style={styles.optimizationCard}>
          <View style={styles.optimizationHeader}>
            <Ionicons name="calendar" size={20} color={colors.accent} />
            <Text style={styles.optimizationTitle}>Optimal Schedule</Text>
          </View>
          
          <View style={styles.scheduleGrid}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const dayPattern = patterns.filter(p => p.dayOfWeek === index);
              const distractionScore = dayPattern.reduce((sum, p) => sum + p.frequency, 0);
              const isLowDistraction = distractionScore < 2;
              const isMediumDistraction = distractionScore >= 2 && distractionScore < 4;
              
              return (
                <View key={day} style={styles.dayCard}>
                  <Text style={styles.dayText}>{day}</Text>
                  <View style={[
                    styles.distractionIndicator,
                    {
                      backgroundColor: isLowDistraction ? colors.success :
                                     isMediumDistraction ? colors.warning : colors.error
                    }
                  ]} />
                  <Text style={styles.distractionLabel}>
                    {isLowDistraction ? 'Great' : isMediumDistraction ? 'Fair' : 'Challenging'}
                  </Text>
                </View>
              );
            })}
          </View>
          
          <View style={styles.scheduleRecommendation}>
            <Ionicons name="bulb" size={16} color={colors.accent} />
            <Text style={styles.scheduleRecommendationText}>
              Schedule your most important focus sessions on days with low distraction scores
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="settings" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Optimize Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="notifications" size={20} color={colors.accent} />
            <Text style={styles.quickActionText}>Smart Alerts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="lock-closed" size={20} color={colors.warning} />
            <Text style={styles.quickActionText}>Lock Mode</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="people" size={20} color={colors.success} />
            <Text style={styles.quickActionText}>Share Progress</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

function getSuggestionDetails(suggestion: string): string {
  if (suggestion.includes('🔥')) {
    return 'Building a focus streak helps establish consistent habits. Start with shorter sessions to build momentum.';
  }
  if (suggestion.includes('📈')) {
    return 'Gradually increasing session duration improves your concentration ability and mental endurance.';
  }
  if (suggestion.includes('⚡')) {
    return 'Timer Lock Mode prevents interruptions during focus sessions, dramatically improving completion rates.';
  }
  if (suggestion.includes('🎯')) {
    return 'Understanding your peak focus times helps you schedule important tasks when you\'re most productive.';
  }
  return 'These insights are based on your usage patterns and can help improve your focus habits.';
}

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  patternSection: {
    marginBottom: 16,
  },
  patternCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  patternDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 11,
    color: colors.success,
    marginLeft: 6,
    flex: 1,
  },
  suggestionsSection: {
    marginBottom: 16,
  },
  suggestionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  suggestionDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  optimizationSection: {
    marginBottom: 16,
  },
  optimizationCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  optimizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optimizationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  scheduleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayCard: {
    alignItems: 'center',
    padding: 4,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  distractionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  distractionLabel: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  scheduleRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scheduleRecommendationText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 14,
  },
  quickActionsSection: {
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default InsightsPanel;