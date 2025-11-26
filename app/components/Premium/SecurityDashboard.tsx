import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../assets/constants/colors';
import PaymentButton from '../Payment/PaymentButton';
import securityService, {
  SecuritySession,
  Device,
  SecurityAlert,
  SecurityMetrics,
  SecurityPolicy,
  // MFAMethod, // Reserved for future use
  AuditLog,
  TOTPSetup
} from '../../services/Premium/SecurityService';

const colors = Colors.dark;

interface SecurityDashboardProps {
  isPremium?: boolean;
  onUpgradePress?: () => void;
  currentUserId: string;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  isPremium = false,
  onUpgradePress,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'devices' | 'alerts' | 'policy' | 'audit'>('overview');
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [totpSetup, setTotpSetup] = useState<TOTPSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeService();
    loadSecurityData();
  }, []);

  const initializeService = () => {
    securityService.setCurrentUser(currentUserId);
  };

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [
        sessionsData,
        devicesData,
        alertsData,
        metricsData,
        policyData,
        auditData
      ] = await Promise.all([
        securityService.getActiveSessions(),
        securityService.getTrustedDevices(),
        securityService.getSecurityAlerts(),
        securityService.getSecurityMetrics(),
        securityService.getSecurityPolicy(),
        securityService.getAuditLogs(20)
      ]);

      setSessions(sessionsData);
      setDevices(devicesData);
      setAlerts(alertsData);
      setMetrics(metricsData);
      setPolicy(policyData);
      setAuditLogs(auditData);
    } catch (error) {
      console.error('Failed to load security data:', error);
      Alert.alert('Error', 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    Alert.alert(
      'Terminate Session',
      'Are you sure you want to terminate this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              await securityService.terminateSession(sessionId);
              await loadSecurityData();
              Alert.alert('Success', 'Session terminated successfully');
            } catch (error) {
              console.error('Failed to terminate session:', error);
              Alert.alert('Error', 'Failed to terminate session');
            }
          }
        }
      ]
    );
  };

// Reserved for future use
// const handleTrustDevice = async (deviceId: string) => {
//   try {
//     await securityService.trustDevice(deviceId);
//     await loadSecurityData();
//     Alert.alert('Success', 'Device trusted successfully');
//   } catch (error) {
//     console.error('Failed to trust device:', error);
//     Alert.alert('Error', 'Failed to trust device');
//   }
// };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await securityService.resolveSecurityAlert(alertId);
      await loadSecurityData();
      Alert.alert('Success', 'Alert resolved successfully');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      Alert.alert('Error', 'Failed to resolve alert');
    }
  };

  const handleEnableTOTP = async () => {
    try {
      const setup = await securityService.enableTOTP();
      setTotpSetup(setup);
      setShowMFASetup(true);
    } catch (error) {
      console.error('Failed to enable TOTP:', error);
      Alert.alert('Error', 'Failed to enable TOTP');
    }
  };

  const handleVerifyTOTP = async () => {
    if (!totpSetup || !verificationCode.trim()) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }

    try {
      const isValid = await securityService.verifyTOTP(totpSetup.secret, verificationCode);
      if (isValid) {
        setShowMFASetup(false);
        setVerificationCode('');
        setTotpSetup(null);
        Alert.alert('Success', 'TOTP enabled successfully!');
        await loadSecurityData();
      } else {
        Alert.alert('Error', 'Invalid verification code');
      }
    } catch (error) {
      console.error('Failed to verify TOTP:', error);
      Alert.alert('Error', 'Failed to verify TOTP');
    }
  };

  const handleUpdatePolicy = async (updates: Partial<SecurityPolicy>) => {
    try {
      await securityService.updateSecurityPolicy(updates);
      await loadSecurityData();
      Alert.alert('Success', 'Security policy updated successfully');
    } catch (error) {
      console.error('Failed to update policy:', error);
      Alert.alert('Error', 'Failed to update security policy');
    }
  };

  const handlePerformSecurityScan = async () => {
    try {
      setLoading(true);
      const scanResults = await securityService.performSecurityScan();
      setMetrics(scanResults);
      Alert.alert('Security Scan Complete', `Security Score: ${scanResults.securityScore}/100`);
    } catch (error) {
      console.error('Failed to perform security scan:', error);
      Alert.alert('Error', 'Failed to perform security scan');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.accent;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.accent;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

if (!isPremium) {
    return (
      <View style={styles.upgradeContainer}>
        <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
        <Text style={styles.upgradeTitle}>Advanced Security</Text>
        <Text style={styles.upgradeDescription}>
          Protect your data with enterprise-grade security features including
          multi-factor authentication, comprehensive audit logging, and real-time threat monitoring.
        </Text>
        <PaymentButton
          title="Upgrade to Pro"
          style={styles.upgradeButton}
          onSuccess={() => {
            console.log('Payment successful! Security features will be available.');
          }}
          onError={(error) => {
            console.error('Payment error:', error);
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="shield" size={32} color={colors.primary} />
          <Text style={styles.loadingText}>Loading security data...</Text>
        </View>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'sessions':
        return renderSessions();
      case 'devices':
        return renderDevices();
      case 'alerts':
        return renderAlerts();
      case 'policy':
        return renderPolicy();
      case 'audit':
        return renderAuditLogs();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      {/* Security Score Card */}
      {metrics && (
        <View style={styles.scoreCard}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.scoreGradient}
          >
            <View style={styles.scoreHeader}>
              <Ionicons name="shield" size={32} color="white" />
              <Text style={styles.scoreTitle}>Security Score</Text>
            </View>
            <Text style={styles.scoreValue}>{metrics.securityScore}/100</Text>
            <Text style={styles.scoreDescription}>
              {metrics.securityScore >= 80 ? 'Excellent' : 
               metrics.securityScore >= 60 ? 'Good' : 
               metrics.securityScore >= 40 ? 'Fair' : 'Needs Improvement'}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Quick Stats */}
      {metrics && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{metrics.activeSessions}</Text>
            <Text style={styles.statLabel}>Active Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{metrics.trustedDevices}</Text>
            <Text style={styles.statLabel}>Trusted Devices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(metrics.mfaUsageRate)}%</Text>
            <Text style={styles.statLabel}>MFA Usage</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.filter(a => !a.isResolved).length}</Text>
            <Text style={styles.statLabel}>Open Alerts</Text>
          </View>
        </View>
      )}

      {/* Risk Factors */}
      {metrics?.riskFactors && metrics.riskFactors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Risks</Text>
          {metrics.riskFactors.map((factor, index) => (
            <View key={index} style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <Ionicons name="warning" size={20} color={getRiskLevelColor(factor.severity)} />
                <Text style={styles.riskTitle}>{factor.description}</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(factor.severity) }]}>
                  <Text style={styles.riskBadgeText}>{factor.severity}</Text>
                </View>
              </View>
              <Text style={styles.riskMitigation}>{factor.mitigation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Security Alerts</Text>
            <TouchableOpacity onPress={() => setActiveTab('alerts')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {alerts.slice(0, 3).map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name={getAlertIcon(alert.type)} size={16} color={getSeverityColor(alert.severity)} />
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                  <Text style={styles.severityBadgeText}>{alert.severity}</Text>
                </View>
              </View>
              {alert.actionRequired && !alert.isResolved && (
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => handleResolveAlert(alert.id)}
                >
                  <Text style={styles.resolveButtonText}>Resolve</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEnableTOTP}>
            <Ionicons name="key" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>Enable MFA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handlePerformSecurityScan}>
            <Ionicons name="scan" size={24} color={colors.accent} />
            <Text style={styles.actionButtonText}>Security Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('sessions')}>
            <Ionicons name="desktop" size={24} color={colors.success} />
            <Text style={styles.actionButtonText}>Manage Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('policy')}>
            <Ionicons name="settings" size={24} color={colors.warning} />
            <Text style={styles.actionButtonText}>Security Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderSessions = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Sessions ({sessions.length})</Text>
        <TouchableOpacity onPress={loadSecurityData}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {sessions.map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionInfo}>
              <Text style={styles.deviceName}>{session.deviceName}</Text>
              <Text style={styles.deviceType}>{session.deviceType}</Text>
              <Text style={styles.sessionTime}>
                Started: {new Date(session.startedAt).toLocaleString()}
              </Text>
            </View>
            <View style={styles.sessionActions}>
              <View style={[
                styles.mfaIndicator,
                { backgroundColor: session.mfaVerified ? colors.success : colors.warning }
              ]}>
                <Text style={styles.mfaText}>
                  {session.mfaVerified ? 'MFA' : 'No MFA'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.terminateButton}
                onPress={() => handleTerminateSession(session.id)}
              >
                <Ionicons name="close" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sessionDetails}>
            <Text style={styles.ipAddress}>IP: {session.ipAddress}</Text>
            <Text style={styles.riskScore}>
              Risk: {session.riskScore > 70 ? 'High' : session.riskScore > 40 ? 'Medium' : 'Low'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderDevices = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trusted Devices ({devices.length})</Text>
      </View>
      {devices.map((device) => (
        <View key={device.id} style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{device.deviceName}</Text>
              <Text style={styles.deviceType}>{device.deviceType} • {device.platform}</Text>
              <Text style={styles.deviceDate}>
                Registered: {new Date(device.registeredAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.deviceStatus}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.trustedText}>Trusted</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Security Alerts ({alerts.length})</Text>
      </View>
      {alerts.map((alert) => (
        <View key={alert.id} style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Ionicons name={getAlertIcon(alert.type)} size={20} color={getSeverityColor(alert.severity)} />
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
              <Text style={styles.severityBadgeText}>{alert.severity}</Text>
            </View>
          </View>
          {!alert.isResolved && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => handleResolveAlert(alert.id)}
            >
              <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const renderPolicy = () => (
    <ScrollView style={styles.tabContent}>
      {policy && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Policy</Text>
          
          <View style={styles.policySection}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>Multi-Factor Authentication</Text>
              <Switch
                value={policy.mfaRequired}
                onValueChange={(value) => handleUpdatePolicy({ mfaRequired: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={policy.mfaRequired ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={styles.policyDescription}>
              Require MFA for all login attempts
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.policyTitle}>Session Timeout</Text>
            <Text style={styles.policyValue}>{policy.sessionTimeout} minutes</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.policyTitle}>Max Concurrent Sessions</Text>
            <Text style={styles.policyValue}>{policy.maxConcurrentSessions}</Text>
          </View>

          <View style={styles.policySection}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>Device Verification</Text>
              <Switch
                value={policy.requireDeviceVerification}
                onValueChange={(value) => handleUpdatePolicy({ requireDeviceVerification: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={policy.requireDeviceVerification ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={styles.policyDescription}>
              Require verification for new devices
            </Text>
          </View>

          <View style={styles.policySection}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>Biometric Authentication</Text>
              <Switch
                value={policy.allowBiometricAuth}
                onValueChange={(value) => handleUpdatePolicy({ allowBiometricAuth: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={policy.allowBiometricAuth ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={styles.policyDescription}>
              Allow biometric authentication methods
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderAuditLogs = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Audit Log ({auditLogs.length})</Text>
        <TouchableOpacity onPress={() => securityService.getAuditLogs(50).then(setAuditLogs)}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {auditLogs.map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={[
              styles.logStatus,
              { backgroundColor: getStatusColor(log.status) }
            ]} />
            <View style={styles.logInfo}>
              <Text style={styles.logAction}>{formatAction(log.action)}</Text>
              <Text style={styles.logDetails}>{log.details ? JSON.stringify(log.details) : ''}</Text>
              <Text style={styles.logTime}>
                {new Date(log.timestamp).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(log.riskLevel) }]}>
              <Text style={styles.riskBadgeText}>{log.riskLevel}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'suspicious_login': return 'warning';
      case 'unusual_activity': return 'alert-circle';
      case 'security_breach': return 'shield';
      case 'policy_violation': return 'document';
      case 'mfa_required': return 'key';
      default: return 'information-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return colors.success;
      case 'failure': return colors.error;
      case 'warning': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Security Center</Text>
        <TouchableOpacity style={styles.scanButton} onPress={handlePerformSecurityScan}>
          <Ionicons name="scan" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: 'grid' },
          { key: 'sessions', label: 'Sessions', icon: 'desktop' },
          { key: 'devices', label: 'Devices', icon: 'phone-portrait' },
          { key: 'alerts', label: 'Alerts', icon: 'warning' },
          { key: 'policy', label: 'Policy', icon: 'settings' },
          { key: 'audit', label: 'Audit', icon: 'list' },
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

      {/* MFA Setup Modal */}
      <Modal visible={showMFASetup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Setup TOTP Authentication</Text>
            </View>
            
            {totpSetup && (
              <View style={styles.totpSetup}>
                <Text style={styles.setupInstructions}>
                  Scan this QR code with your authenticator app and enter the verification code:
                </Text>
                
                <View style={styles.qrContainer}>
                  <Text style={styles.qrCode}>{totpSetup.qrCodeUrl}</Text>
                </View>
                
                <TextInput
                  style={styles.verificationInput}
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowMFASetup(false);
                      setVerificationCode('');
                      setTotpSetup(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerifyTOTP}
                  >
                    <Text style={styles.verifyButtonText}>Verify & Enable</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  scanButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  scoreCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  scoreGradient: {
    padding: 24,
    alignItems: 'center',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreTitle: {
    fontSize: 18,
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
  riskCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  riskMitigation: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  resolveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  resolveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mfaIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  mfaText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  terminateButton: {
    padding: 4,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ipAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  riskScore: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deviceCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustedText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 4,
  },
  logCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logStatus: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  logDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  logTime: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  policySection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  policyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  policyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  totpSetup: {
    alignItems: 'center',
  },
  setupInstructions: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  qrContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrCode: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  verificationInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SecurityDashboard;