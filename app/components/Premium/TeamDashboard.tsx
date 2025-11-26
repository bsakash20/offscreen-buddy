import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../assets/constants/colors';
import PaymentButton from '../Payment/PaymentButton';
import teamManagementService, {
  Team,
  TeamMember,
  TeamRole,
  TeamGoal,
  TeamAnalytics,
  TeamActivity,
  // TeamInvite, // Reserved for future use
} from '../../services/Premium/TeamManagementService';

const colors = Colors.dark;

interface TeamDashboardProps {
  teamId?: string;
  isPremium?: boolean;
  onUpgradePress?: () => void;
  currentUserId: string;
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({
  teamId,
  isPremium = false,
  onUpgradePress,
  currentUserId
}) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'goals' | 'analytics' | 'activity'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeService();
    if (teamId) {
      loadTeamData(teamId);
    }
  }, [teamId]);

  const initializeService = () => {
    teamManagementService.setCurrentUser(currentUserId);
  };

  const loadTeamData = async (teamId: string) => {
    try {
      setLoading(true);
      const [teamData, membersData, goalsData, analyticsData, activitiesData] = await Promise.all([
        teamManagementService.getTeam(teamId),
        teamManagementService.getTeamMembers(teamId),
        teamManagementService.getTeamGoals(teamId),
        teamManagementService.getTeamAnalytics(teamId, 'week'),
        teamManagementService.getTeamActivities(teamId, 20)
      ]);

      setTeam(teamData);
      setMembers(membersData);
      setGoals(goalsData);
      setAnalytics(analyticsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load team data:', error);
      Alert.alert('Error', 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!team || !inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await teamManagementService.createInvite(team.id, inviteEmail, inviteRole);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      Alert.alert('Success', 'Invitation sent successfully!');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleCreateGoal = async () => {
    if (!team || !goalTitle.trim() || !goalTarget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await teamManagementService.createTeamGoal({
        teamId: team.id,
        title: goalTitle,
        description: `Team goal: ${goalTitle}`,
        type: 'focus_time',
        targetValue: parseInt(goalTarget),
        unit: 'minutes',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'active',
        createdBy: currentUserId,
        participants: members.map(m => m.userId),
        isPublic: true
      });

      setShowCreateGoalModal(false);
      setGoalTitle('');
      setGoalTarget('');
      await loadTeamData(team.id);
      Alert.alert('Success', 'Team goal created successfully!');
    } catch (error) {
      console.error('Failed to create goal:', error);
      Alert.alert('Error', 'Failed to create team goal');
    }
  };

// Reserved for future use
// const handleJoinTeam = async (inviteCode: string) => {
//   try {
//     await teamManagementService.joinTeamByInvite(inviteCode);
//     Alert.alert('Success', 'Successfully joined the team!');
//   } catch (error) {
//     console.error('Failed to join team:', error);
//     Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join team');
//   }
// };

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner': return colors.warning;
      case 'admin': return colors.accent;
      case 'manager': return colors.success;
      case 'member': return colors.primary;
      case 'viewer': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'person';
      case 'admin': return 'shield';
      case 'manager': return 'briefcase';
      case 'member': return 'people';
      case 'viewer': return 'eye';
      default: return 'person';
    }
  };

if (!isPremium) {
    return (
      <View style={styles.upgradeContainer}>
        <Ionicons name="people" size={64} color={colors.primary} />
        <Text style={styles.upgradeTitle}>Team Collaboration</Text>
        <Text style={styles.upgradeDescription}>
          Collaborate with your team, family, or organization. Set shared goals,
          track progress together, and build accountability with role-based permissions.
        </Text>
        <PaymentButton
          title="Upgrade to Pro"
          style={styles.upgradeButton}
          onSuccess={() => {
            console.log('Payment successful! Team features will be available.');
          }}
          onError={(error) => {
            console.error('Payment error:', error);
          }}
        />
      </View>
    );
  }

  if (!teamId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Teams</Text>
        </View>
        
        <View style={styles.noTeamContainer}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.noTeamTitle}>No Teams Yet</Text>
          <Text style={styles.noTeamDescription}>
            Create or join a team to start collaborating on focus goals
          </Text>
          <TouchableOpacity style={styles.createTeamButton}>
            <Text style={styles.createTeamButtonText}>Create New Team</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color={colors.primary} />
          <Text style={styles.loadingText}>Loading team data...</Text>
        </View>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={styles.errorText}>Team not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTeamData(teamId!)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'members':
        return renderMembers();
      case 'goals':
        return renderGoals();
      case 'analytics':
        return renderAnalytics();
      case 'activity':
        return renderActivity();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      {/* Team Header */}
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamType}>{team.type.charAt(0).toUpperCase() + team.type.slice(1)} Team</Text>
          <Text style={styles.memberCount}>{team.memberCount} members</Text>
        </View>
        <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
          <Ionicons name="person-add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      {analytics && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.activeMembers}</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(analytics.totalFocusTime / 3600000)}h</Text>
            <Text style={styles.statLabel}>Focus Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.teamStreak}</Text>
            <Text style={styles.statLabel}>Team Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.goalProgress}%</Text>
            <Text style={styles.statLabel}>Goal Progress</Text>
          </View>
        </View>
      )}

      {/* Active Goals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
          <TouchableOpacity onPress={() => setActiveTab('goals')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {goals.slice(0, 2).map((goal) => (
          <View key={goal.id} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalProgress}>
                {goal.currentValue}/{goal.targetValue} {goal.unit}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${(goal.currentValue / goal.targetValue) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.goalStatus}>{goal.status}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.addGoalButton} onPress={() => setShowCreateGoalModal(true)}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addGoalButtonText}>Create New Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => setActiveTab('activity')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {activities.slice(0, 3).map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name={getActivityIcon(activity.type)} size={16} color={colors.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityDescription}>{activity.description}</Text>
              <Text style={styles.activityTime}>
                {new Date(activity.timestamp).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderMembers = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Members ({members.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowInviteModal(true)}>
          <Ionicons name="person-add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item: member }) => (
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>
                {member.profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.profile.name}</Text>
              <Text style={styles.memberEmail}>{member.profile.email}</Text>
              {member.profile.department && (
                <Text style={styles.memberDepartment}>{member.profile.department}</Text>
              )}
            </View>
            <View style={styles.memberRole}>
              <Ionicons name={getRoleIcon(member.role)} size={16} color={getRoleColor(member.role)} />
              <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderGoals = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Goals</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateGoalModal(true)}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item: goal }) => (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <View style={styles.goalMeta}>
                <Text style={styles.goalProgress}>
                  {goal.currentValue}/{goal.targetValue} {goal.unit}
                </Text>
                <Text style={[styles.goalStatus, { color: getStatusColor(goal.status) }]}>
                  {goal.status}
                </Text>
              </View>
            </View>
            <Text style={styles.goalDescription}>{goal.description}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${(goal.currentValue / goal.targetValue) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.goalDates}>
              {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </View>
  );

  const renderAnalytics = () => (
    <ScrollView style={styles.tabContent}>
      {analytics && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Performance</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>{analytics.totalSessions}</Text>
                <Text style={styles.analyticsLabel}>Total Sessions</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>
                  {Math.round(analytics.totalFocusTime / 3600000)}h
                </Text>
                <Text style={styles.analyticsLabel}>Total Focus Time</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>
                  {Math.round(analytics.averageSessionDuration / 60000)}m
                </Text>
                <Text style={styles.analyticsLabel}>Avg Session</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>{analytics.participationRate}%</Text>
                <Text style={styles.analyticsLabel}>Participation</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            {analytics.topPerformers.map((performer, index) => (
              <View key={performer.userId} style={styles.performerCard}>
                <View style={styles.performerRank}>
                  <Text style={styles.rankText}>#{performer.rank}</Text>
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{performer.name}</Text>
                  <Text style={styles.performerStats}>
                    {Math.round(performer.focusTime / 3600000)}h • {performer.sessionsCompleted} sessions
                  </Text>
                </View>
                <View style={styles.performerSuccessRate}>
                  <Text style={styles.successRateText}>{performer.successRate}%</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderActivity = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item: activity }) => (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name={getActivityIcon(activity.type)} size={16} color={colors.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityDescription}>{activity.description}</Text>
              <Text style={styles.activityTime}>
                {new Date(activity.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_joined': return 'person-add';
      case 'member_left': return 'person-remove';
      case 'goal_achieved': return 'trophy';
      case 'milestone_achieved': return 'medal';
      case 'role_changed': return 'people';
      case 'settings_updated': return 'settings';
      case 'session_completed': return 'checkmark-circle';
      default: return 'grid';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'completed': return colors.primary;
      case 'paused': return colors.warning;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{team.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="settings" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="share" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: 'grid' },
          { key: 'members', label: 'Members', icon: 'people' },
          { key: 'goals', label: 'Goals', icon: 'trophy' },
          { key: 'analytics', label: 'Analytics', icon: 'analytics' },
          { key: 'activity', label: 'Activity', icon: 'time' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
            />
            <Text 
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {renderTabContent()}

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Member</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
            />
            
            <View style={styles.roleSelector}>
              <Text style={styles.roleLabel}>Role:</Text>
              {(['owner', 'admin', 'manager', 'member', 'viewer'] as TeamRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    inviteRole === role && styles.selectedRoleOption
                  ]}
                  onPress={() => setInviteRole(role)}
                >
                  <Text 
                    style={[
                      styles.roleOptionText,
                      inviteRole === role && styles.selectedRoleOptionText
                    ]}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inviteSendButton}
                onPress={handleInviteMember}
              >
                <Text style={styles.inviteSendButtonText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Goal Modal */}
      <Modal visible={showCreateGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Team Goal</Text>
              <TouchableOpacity onPress={() => setShowCreateGoalModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Goal title"
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholderTextColor={colors.textSecondary}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Target value (minutes)"
              value={goalTarget}
              onChangeText={setGoalTarget}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateGoalModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateGoal}
              >
                <Text style={styles.createButtonText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    color: colors.error,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  noTeamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noTeamTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noTeamDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createTeamButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createTeamButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  teamType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inviteButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: '1%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  addButton: {
    padding: 8,
  },
  goalCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  goalMeta: {
    alignItems: 'flex-end',
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  goalStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  goalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  goalDates: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addGoalButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  memberDepartment: {
    fontSize: 12,
    color: colors.accent,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  performerRank: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  performerStats: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  performerSuccessRate: {
    alignItems: 'center',
  },
  successRateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleSelector: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  roleOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 4,
  },
  selectedRoleOption: {
    backgroundColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedRoleOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  inviteSendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteSendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.success,
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

export default TeamDashboard;