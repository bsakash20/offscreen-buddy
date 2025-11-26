import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../assets/constants/colors';
import PaymentButton from '../Payment/PaymentButton';
import automationService, {
  AutomationRule,
  AIRecommendation,
  AutomationMetrics,
  ContextData
} from '../../services/Premium/AutomationService';

const colors = Colors.dark;

interface AutomationDashboardProps {
  isPremium?: boolean;
  onUpgradePress?: () => void;
  currentContext?: ContextData;
}

const AutomationDashboard: React.FC<AutomationDashboardProps> = ({
  isPremium = false,
  onUpgradePress,
  currentContext
}) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      const [rulesData, recommendationsData, metricsData] = await Promise.all([
        automationService.getRules(),
        automationService.getRecommendations(),
        automationService.getAutomationMetrics()
      ]);
      
      setRules(rulesData);
      setRecommendations(recommendationsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load automation data:', error);
    }
  };

const handleRefresh = async () => {
    setRefreshing(true);
    await loadAutomationData();
    setRefreshing(false);
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await automationService.updateRule(ruleId, { isActive });
      await loadAutomationData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const applyRecommendation = async (recommendationId: string) => {
    try {
      const success = await automationService.applyRecommendation(recommendationId);
      if (success) {
        Alert.alert('Success', 'Recommendation applied successfully!');
        await loadAutomationData();
      }
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  const dismissRecommendation = async (recommendationId: string) => {
    try {
      await automationService.dismissRecommendation(recommendationId);
      await loadAutomationData();
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error);
    }
  };

  const createNewRule = async () => {
    if (!newRuleName.trim()) {
      Alert.alert('Error', 'Please enter a rule name');
      return;
    }

    try {
      await automationService.addRule({
        name: newRuleName,
        description: newRuleDescription,
        trigger: { type: 'time', data: { startTime: '09:00', endTime: '17:00' } },
        actions: [{ type: 'send_notification', parameters: { title: 'Focus Time!', message: 'Time to focus!' } }],
        conditions: [],
        isActive: true,
        priority: 1
      });

      setShowNewRuleModal(false);
      setNewRuleName('');
      setNewRuleDescription('');
      await loadAutomationData();
      
      Alert.alert('Success', 'Automation rule created successfully!');
    } catch (error) {
      console.error('Failed to create rule:', error);
      Alert.alert('Error', 'Failed to create automation rule');
    }
  };

  const executeAutomation = async () => {
    if (!currentContext) {
      Alert.alert('Info', 'No current context available for automation execution');
      return;
    }

    try {
      await automationService.evaluateAndExecute(currentContext);
      Alert.alert('Success', 'Automation rules evaluated and executed!');
      await loadAutomationData();
    } catch (error) {
      console.error('Failed to execute automation:', error);
    }
  };

if (!isPremium) {
    return (
      <View style={styles.upgradeContainer}>
        <Ionicons name="build" size={64} color={colors.primary} />
        <Text style={styles.upgradeTitle}>Smart Automation</Text>
        <Text style={styles.upgradeDescription}>
          Let AI optimize your focus routine with intelligent automation,
          personalized recommendations, and context-aware scheduling.
        </Text>
        <PaymentButton
          title="Upgrade to Pro"
          style={styles.upgradeButton}
          onSuccess={() => {
            console.log('Payment successful! Automation features will be available.');
          }}
          onError={(error) => {
            console.error('Payment error:', error);
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Smart Automation</Text>
          <View style={styles.statusContainer}>
            <Ionicons name="bulb" size={16} color={colors.accent} />
            <Text style={styles.statusText}>AI-Powered Optimization</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.executeButton} onPress={executeAutomation}>
          <Ionicons name="play" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Automation Metrics */}
      {metrics && (
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Automation Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.activeRules}</Text>
              <Text style={styles.metricLabel}>Active Rules</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.executionsToday}</Text>
              <Text style={styles.metricLabel}>Executed Today</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{Math.round(metrics.successRate * 100)}%</Text>
              <Text style={styles.metricLabel}>Success Rate</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{Math.round(metrics.avgExecutionTime)}ms</Text>
              <Text style={styles.metricLabel}>Avg Response</Text>
            </View>
          </View>
        </View>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Recommendations</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {recommendations.map((recommendation) => (
            <View key={recommendation.id} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Ionicons 
                  name={getRecommendationIcon(recommendation.type)} 
                  size={20} 
                  color={getRecommendationColor(recommendation.impact)} 
                />
                <View style={styles.recommendationInfo}>
                  <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                  <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
                  <View style={styles.recommendationMeta}>
                    <Text style={styles.confidenceText}>
                      {Math.round(recommendation.confidence * 100)}% confidence
                    </Text>
                    <Text style={styles.impactText}>
                      {recommendation.impact} impact
                    </Text>
                    {recommendation.estimatedImprovement > 0 && (
                      <Text style={styles.improvementText}>
                        +{recommendation.estimatedImprovement}% improvement
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              
              <View style={styles.recommendationActions}>
                {recommendation.actionRequired && (
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => applyRecommendation(recommendation.id)}
                  >
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => dismissRecommendation(recommendation.id)}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Automation Rules */}
      <View style={styles.rulesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Automation Rules</Text>
          <TouchableOpacity
            style={styles.addRuleButton}
            onPress={() => setShowNewRuleModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addRuleText}>Add Rule</Text>
          </TouchableOpacity>
        </View>

        {rules.map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Switch
                value={rule.isActive}
                onValueChange={(value) => toggleRule(rule.id, value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={rule.isActive ? 'white' : colors.textSecondary}
              />
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text style={styles.ruleDescription}>{rule.description}</Text>
                <View style={styles.ruleMeta}>
                  <Text style={styles.rulePriority}>Priority: {rule.priority}</Text>
                  <Text style={styles.ruleExecutionCount}>
                    Executed {rule.executionCount} times
                  </Text>
                  {rule.lastTriggered && (
                    <Text style={styles.ruleLastTriggered}>
                      Last: {new Date(rule.lastTriggered).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.ruleDetails}>
              <Text style={styles.ruleTrigger}>
                Trigger: {rule.trigger.type}
              </Text>
              <Text style={styles.ruleActions}>
                Actions: {rule.actions.length} action(s)
              </Text>
            </View>
          </View>
        ))}

        {rules.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="build-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No automation rules yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first rule to start automating your focus routine
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>Analyze Patterns</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="calendar" size={24} color={colors.accent} />
            <Text style={styles.quickActionText}>Optimize Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="time" size={24} color={colors.success} />
            <Text style={styles.quickActionText}>Smart Breaks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="settings" size={24} color={colors.warning} />
            <Text style={styles.quickActionText}>Advanced Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* New Rule Modal */}
      <Modal visible={showNewRuleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Automation Rule</Text>
              <TouchableOpacity onPress={() => setShowNewRuleModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Rule Name"
              value={newRuleName}
              onChangeText={setNewRuleName}
              placeholderTextColor={colors.textSecondary}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newRuleDescription}
              onChangeText={setNewRuleDescription}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewRuleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={createNewRule}
              >
                <Text style={styles.createButtonText}>Create Rule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getRecommendationIcon = (type: string) => {
  switch (type) {
    case 'schedule_optimization': return 'calendar';
    case 'duration_suggestion': return 'timer';
    case 'break_timing': return 'restaurant';
    case 'feature_enabling': return 'bulb';
    case 'pattern_analysis': return 'analytics';
    default: return 'bulb';
  }
};

const getRecommendationColor = (impact: string) => {
  switch (impact) {
    case 'high': return Colors.dark.success;
    case 'medium': return Colors.dark.accent;
    case 'low': return Colors.dark.warning;
    default: return Colors.dark.primary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  upgradeContainer: {
    margin: 16,
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
upgradeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
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
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  executeButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recommendationsSection: {
    padding: 16,
  },
  recommendationCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  confidenceText: {
    fontSize: 10,
    color: colors.success,
    marginRight: 8,
  },
  impactText: {
    fontSize: 10,
    color: colors.warning,
    marginRight: 8,
  },
  improvementText: {
    fontSize: 10,
    color: colors.accent,
  },
  recommendationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  rulesSection: {
    padding: 16,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addRuleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
  },
  ruleCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  ruleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rulePriority: {
    fontSize: 10,
    color: colors.accent,
    marginRight: 8,
  },
  ruleExecutionCount: {
    fontSize: 10,
    color: colors.textSecondary,
    marginRight: 8,
  },
  ruleLastTriggered: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  ruleDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  ruleTrigger: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ruleActions: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quickActionsSection: {
    padding: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AutomationDashboard;