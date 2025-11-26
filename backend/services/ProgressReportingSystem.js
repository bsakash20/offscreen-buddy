const Milestone = require('../models/Milestone');
const MilestoneProgress = require('../models/MilestoneProgress');
const AutomatedMilestoneValidator = require('./AutomatedMilestoneValidator');

class ProgressReportingSystem {
    constructor() {
        this.validator = new AutomatedMilestoneValidator();
        this.reportTemplates = {
            executive: this.getExecutiveReportTemplate(),
            technical: this.getTechnicalReportTemplate(),
            stakeholder: this.getStakeholderReportTemplate(),
            team: this.getTeamReportTemplate()
        };
        this.notificationChannels = {
            email: this.sendEmailNotification,
            slack: this.sendSlackNotification,
            webhook: this.sendWebhookNotification,
            dashboard: this.updateDashboard
        };
    }

    /**
     * Generate comprehensive progress report for all stakeholders
     */
    async generateProgressReport(reportType = 'comprehensive', options = {}) {
        const reportData = {
            reportType,
            generatedAt: new Date(),
            timeframe: options.timeframe || 'current',
            streams: options.streams || 'all'
        };

        try {
            // Get all active milestones
            const milestones = await this.getFilteredMilestones(options);

            // Generate stream-wise progress
            const streamProgress = await this.generateStreamProgress(milestones);

            // Calculate key metrics
            const metrics = await this.calculateKeyMetrics(milestones);

            // Identify issues and risks
            const issuesAndRisks = await this.identifyIssuesAndRisks(milestones);

            // Generate recommendations
            const recommendations = await this.generateRecommendations(milestones, issuesAndRisks);

            // Compile report sections
            reportData.sections = {
                executiveSummary: await this.generateExecutiveSummary(streamProgress, metrics),
                streamProgress,
                metrics,
                issuesAndRisks,
                recommendations,
                timeline: await this.generateTimelineAnalysis(milestones),
                resourceUtilization: await this.generateResourceUtilization(milestones),
                qualityGates: await this.generateQualityGatesReport(milestones)
            };

            // Format report based on type
            const formattedReport = await this.formatReport(reportData, reportType);

            // Distribute report to stakeholders
            await this.distributeReport(formattedReport, reportType, options);

            return formattedReport;

        } catch (error) {
            console.error('Error generating progress report:', error);
            throw error;
        }
    }

    /**
     * Get filtered milestones based on options
     */
    async getFilteredMilestones(options) {
        const whereClause = {};

        if (options.streams && options.streams !== 'all') {
            whereClause.streamType = options.streams;
        }

        if (options.timeframe) {
            const now = new Date();
            let dateFilter = {};

            switch (options.timeframe) {
                case 'current':
                    // Active milestones
                    break;
                case 'last_7_days':
                    dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                    break;
                case 'last_30_days':
                    dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                    break;
                case 'overdue':
                    whereClause.status = { not: 'completed' };
                    whereClause.estimatedEndDate = { lt: now };
                    break;
            }

            if (Object.keys(dateFilter).length > 0) {
                whereClause.createdAt = dateFilter;
            }
        }

        return await Milestone.findAll({
            where: whereClause,
            include: [{
                model: MilestoneProgress,
                as: 'progressHistory',
                limit: 5,
                order: [['createdAt', 'DESC']]
            }],
            order: [['estimatedEndDate', 'ASC']]
        });
    }

    /**
     * Generate stream-wise progress analysis
     */
    async generateStreamProgress(milestones) {
        const streamTypes = [
            'security_remediation',
            'frontend_auth_migration',
            'data_migration',
            'realtime_features',
            'integration_testing',
            'performance_optimization'
        ];

        const streamProgress = {};

        for (const streamType of streamTypes) {
            const streamMilestones = milestones.filter(m => m.streamType === streamType);

            if (streamMilestones.length === 0) {
                streamProgress[streamType] = {
                    name: this.getStreamName(streamType),
                    status: 'no_milestones',
                    totalMilestones: 0,
                    completed: 0,
                    inProgress: 0,
                    blocked: 0,
                    averageProgress: 0,
                    velocity: 0,
                    risks: [],
                    upcomingDeadlines: []
                };
                continue;
            }

            const completed = streamMilestones.filter(m => m.status === 'completed').length;
            const inProgress = streamMilestones.filter(m => m.status === 'in_progress').length;
            const blocked = streamMilestones.filter(m => m.status === 'blocked').length;

            const averageProgress = streamMilestones.reduce((sum, m) => sum + m.progressPercentage, 0) / streamMilestones.length;

            const velocity = this.calculateStreamVelocity(streamMilestones);

            // Get recent risks
            const risks = this.aggregateStreamRisks(streamMilestones);

            // Get upcoming deadlines (next 7 days)
            const upcomingDeadlines = streamMilestones
                .filter(m => m.status !== 'completed')
                .map(m => ({
                    milestoneId: m.id,
                    title: m.title,
                    dueDate: m.estimatedEndDate,
                    daysRemaining: Math.ceil((new Date(m.estimatedEndDate) - new Date()) / (1000 * 60 * 60 * 24))
                }))
                .filter(d => d.daysRemaining <= 7 && d.daysRemaining >= 0)
                .sort((a, b) => a.daysRemaining - b.daysRemaining);

            streamProgress[streamType] = {
                name: this.getStreamName(streamType),
                status: this.determineStreamStatus(streamMilestones),
                totalMilestones: streamMilestones.length,
                completed,
                inProgress,
                blocked,
                averageProgress: Math.round(averageProgress),
                velocity,
                risks,
                upcomingDeadlines,
                completionRate: streamMilestones.length > 0 ? Math.round((completed / streamMilestones.length) * 100) : 0
            };
        }

        return streamProgress;
    }

    /**
     * Calculate key performance metrics
     */
    async calculateKeyMetrics(milestones) {
        const total = milestones.length;
        const completed = milestones.filter(m => m.status === 'completed').length;
        const inProgress = milestones.filter(m => m.status === 'in_progress').length;
        const blocked = milestones.filter(m => m.status === 'blocked').length;

        // Calculate average progress
        const averageProgress = total > 0
            ? milestones.reduce((sum, m) => sum + m.progressPercentage, 0) / total
            : 0;

        // Calculate completion rate
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        // Calculate on-time completion rate
        const onTimeCompletions = milestones.filter(m =>
            m.status === 'completed' &&
            m.actualEndDate &&
            new Date(m.actualEndDate) <= new Date(m.estimatedEndDate)
        ).length;
        const onTimeRate = completed > 0 ? (onTimeCompletions / completed) * 100 : 0;

        // Calculate average velocity
        const velocities = milestones.map(m => this.calculateMilestoneVelocity(m));
        const averageVelocity = velocities.filter(v => v > 0).reduce((sum, v, _, arr) => sum + v / arr.length, 0);

        // Identify overdue milestones
        const now = new Date();
        const overdueMilestones = milestones.filter(m =>
            m.status !== 'completed' &&
            new Date(m.estimatedEndDate) < now
        ).length;

        // Calculate resource utilization
        const resourceUtilization = await this.calculateResourceUtilization(milestones);

        // Risk metrics
        const riskMetrics = this.calculateRiskMetrics(milestones);

        return {
            totalMilestones: total,
            completed,
            inProgress,
            blocked,
            overdue: overdueMilestones,
            averageProgress: Math.round(averageProgress),
            completionRate: Math.round(completionRate),
            onTimeRate: Math.round(onTimeRate),
            averageVelocity: Math.round(averageVelocity * 100) / 100,
            resourceUtilization,
            riskMetrics,
            healthScore: this.calculateOverallHealthScore({
                completionRate,
                onTimeRate,
                blocked,
                averageProgress,
                riskMetrics
            })
        };
    }

    /**
     * Identify issues and risks across all milestones
     */
    async identifyIssuesAndRisks(milestones) {
        const issues = [];
        const risks = [];

        for (const milestone of milestones) {
            // Check for overdue milestones
            if (milestone.status !== 'completed' && new Date(milestone.estimatedEndDate) < new Date()) {
                issues.push({
                    type: 'overdue',
                    milestoneId: milestone.id,
                    milestoneTitle: milestone.title,
                    streamType: milestone.streamType,
                    severity: 'high',
                    description: `Milestone is ${Math.ceil((new Date() - new Date(milestone.estimatedEndDate)) / (1000 * 60 * 60 * 24))} days overdue`,
                    impact: 'Schedule delay affecting overall timeline'
                });
            }

            // Check for blocked milestones
            if (milestone.status === 'blocked') {
                issues.push({
                    type: 'blocked',
                    milestoneId: milestone.id,
                    milestoneTitle: milestone.title,
                    streamType: milestone.streamType,
                    severity: 'critical',
                    description: 'Milestone is blocked and cannot proceed',
                    impact: 'Complete halt in development stream'
                });
            }

            // Check for risk factors
            const riskFactors = milestone.riskFactors || [];
            for (const risk of riskFactors) {
                if (risk.status === 'active') {
                    risks.push({
                        milestoneId: milestone.id,
                        milestoneTitle: milestone.title,
                        streamType: milestone.streamType,
                        level: risk.level,
                        description: risk.description,
                        mitigation: risk.mitigation,
                        daysSinceIdentified: Math.ceil((new Date() - new Date(risk.createdAt)) / (1000 * 60 * 60 * 24)),
                        impact: this.getRiskImpact(risk.level)
                    });
                }
            }

            // Check for slow progress
            const velocity = this.calculateMilestoneVelocity(milestone);
            if (velocity < 2 && milestone.status === 'in_progress' && milestone.progressPercentage < 90) {
                issues.push({
                    type: 'slow_progress',
                    milestoneId: milestone.id,
                    milestoneTitle: milestone.title,
                    streamType: milestone.streamType,
                    severity: 'medium',
                    description: `Progress velocity is ${velocity}% per day (below threshold of 2%)`,
                    impact: 'May miss estimated completion date'
                });
            }

            // Check for dependency issues
            const dependencies = milestone.dependencies || [];
            for (const depId of dependencies) {
                const dependency = milestones.find(m => m.id === depId);
                if (dependency && dependency.status !== 'completed') {
                    risks.push({
                        milestoneId: milestone.id,
                        milestoneTitle: milestone.title,
                        streamType: milestone.streamType,
                        level: 'medium',
                        description: `Dependency "${dependency.title}" is not completed`,
                        mitigation: 'Monitor dependency progress and adjust timeline if needed',
                        daysSinceIdentified: 0,
                        impact: 'Cannot start or complete this milestone'
                    });
                }
            }
        }

        return {
            issues: issues.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
            risks: risks.sort((a, b) => this.getRiskWeight(b.level) - this.getRiskWeight(a.level)),
            summary: {
                totalIssues: issues.length,
                totalRisks: risks.length,
                criticalIssues: issues.filter(i => i.severity === 'critical').length,
                criticalRisks: risks.filter(r => r.level === 'critical').length,
                highIssues: issues.filter(i => i.severity === 'high').length,
                highRisks: risks.filter(r => r.level === 'high').length
            }
        };
    }

    /**
     * Generate strategic recommendations
     */
    async generateRecommendations(milestones, issuesAndRisks) {
        const recommendations = [];

        // Resource reallocation recommendations
        const blockedMilestones = milestones.filter(m => m.status === 'blocked');
        if (blockedMilestones.length > 0) {
            recommendations.push({
                type: 'resource_reallocation',
                priority: 'critical',
                title: 'Address Blocked Milestones',
                description: `${blockedMilestones.length} milestones are currently blocked`,
                actions: [
                    'Identify root causes of blocking issues',
                    'Assign additional resources to resolve blockers',
                    'Consider escalation to leadership for critical blocks'
                ],
                impact: 'high',
                timeline: 'immediate'
            });
        }

        // Schedule adjustment recommendations
        const overdueMilestones = milestones.filter(m =>
            m.status !== 'completed' &&
            new Date(m.estimatedEndDate) < new Date()
        );
        if (overdueMilestones.length > 2) {
            recommendations.push({
                type: 'schedule_adjustment',
                priority: 'high',
                title: 'Revise Project Timeline',
                description: `${overdueMilestones.length} milestones are overdue`,
                actions: [
                    'Conduct schedule impact analysis',
                    'Revise milestone dates and dependencies',
                    'Communicate changes to all stakeholders'
                ],
                impact: 'high',
                timeline: '1-2 days'
            });
        }

        // Risk mitigation recommendations
        const criticalRisks = issuesAndRisks.risks.filter(r => r.level === 'critical');
        if (criticalRisks.length > 0) {
            recommendations.push({
                type: 'risk_mitigation',
                priority: 'critical',
                title: 'Address Critical Risks',
                description: `${criticalRisks.length} critical risks identified`,
                actions: criticalRisks.map(r => `Implement mitigation for: ${r.description}`),
                impact: 'critical',
                timeline: 'immediate'
            });
        }

        // Quality improvement recommendations
        const qualityIssues = issuesAndRisks.issues.filter(i => i.type === 'slow_progress');
        if (qualityIssues.length > 3) {
            recommendations.push({
                type: 'quality_improvement',
                priority: 'medium',
                title: 'Improve Development Velocity',
                description: 'Multiple milestones showing slow progress',
                actions: [
                    'Review team capacity and workload distribution',
                    'Implement additional quality gates',
                    'Consider process improvements'
                ],
                impact: 'medium',
                timeline: '1 week'
            });
        }

        // Positive reinforcement recommendations
        const wellPerformingStreams = this.identifyWellPerformingStreams(milestones);
        if (wellPerformingStreams.length > 0) {
            recommendations.push({
                type: 'recognition',
                priority: 'low',
                title: 'Recognize High Performance',
                description: `${wellPerformingStreams.length} streams performing exceptionally well`,
                actions: wellPerformingStreams.map(stream =>
                    `Document best practices from ${stream.name} stream`
                ),
                impact: 'positive',
                timeline: 'ongoing'
            });
        }

        return recommendations.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
    }

    /**
     * Generate executive summary
     */
    async generateExecutiveSummary(streamProgress, metrics) {
        const overallStatus = this.determineOverallStatus(metrics);

        return {
            overallStatus,
            keyMetrics: {
                completionRate: `${metrics.completionRate}%`,
                healthScore: `${metrics.healthScore}/100`,
                onTimeRate: `${metrics.onTimeRate}%`,
                activeRisks: metrics.riskMetrics.totalRisks
            },
            streamStatus: Object.values(streamProgress).map(sp => ({
                name: sp.name,
                status: sp.status,
                progress: sp.averageProgress,
                completionRate: sp.completionRate
            })),
            criticalIssues: metrics.issues?.filter(i => i.severity === 'critical').length || 0,
            keyHighlights: this.generateKeyHighlights(streamProgress, metrics),
            nextActions: this.generateNextActions(metrics, streamProgress)
        };
    }

    /**
     * Send notifications based on milestone changes
     */
    async sendNotifications(notificationType, data) {
        try {
            const notification = {
                type: notificationType,
                timestamp: new Date(),
                data,
                recipients: this.getRecipientsForNotification(notificationType)
            };

            // Send via configured channels
            for (const [channel, sender] of Object.entries(this.notificationChannels)) {
                try {
                    await sender(notification);
                } catch (error) {
                    console.error(`Failed to send notification via ${channel}:`, error);
                }
            }

            return { success: true, notificationId: Date.now() };
        } catch (error) {
            console.error('Error sending notifications:', error);
            throw error;
        }
    }

    /**
     * Send email notification
     */
    async sendEmailNotification(notification) {
        // Integration with email service (SendGrid, AWS SES, etc.)
        console.log('Sending email notification:', notification.type);
    }

    /**
     * Send Slack notification
     */
    async sendSlackNotification(notification) {
        // Integration with Slack API
        console.log('Sending Slack notification:', notification.type);
    }

    /**
     * Send webhook notification
     */
    async sendWebhookNotification(notification) {
        // Send to configured webhook URLs
        const webhooks = process.env.NOTIFICATION_WEBHOOKS?.split(',') || [];

        for (const webhook of webhooks) {
            try {
                await fetch(webhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(notification)
                });
            } catch (error) {
                console.error(`Webhook notification failed for ${webhook}:`, error);
            }
        }
    }

    /**
     * Update dashboard with notifications
     */
    async updateDashboard(notification) {
        // Store notification for dashboard display
        console.log('Updating dashboard with notification:', notification.type);
    }

    /**
     * Helper methods
     */
    getStreamName(streamType) {
        const names = {
            security_remediation: 'Security Remediation',
            frontend_auth_migration: 'Frontend Auth Migration',
            data_migration: 'Data Migration',
            realtime_features: 'Real-time Features',
            integration_testing: 'Integration Testing',
            performance_optimization: 'Performance Optimization'
        };
        return names[streamType] || streamType;
    }

    calculateStreamVelocity(milestones) {
        if (milestones.length === 0) return 0;

        const velocities = milestones.map(m => this.calculateMilestoneVelocity(m));
        const validVelocities = velocities.filter(v => v > 0);

        return validVelocities.length > 0
            ? validVelocities.reduce((sum, v) => sum + v, 0) / validVelocities.length
            : 0;
    }

    calculateMilestoneVelocity(milestone) {
        const progressHistory = milestone.progressHistory || [];
        if (progressHistory.length < 2) return 0;

        const recent = progressHistory.slice(0, 3);
        let totalProgress = 0;
        let totalDays = 0;

        for (let i = 1; i < recent.length; i++) {
            const progressDiff = recent[i - 1].progressPercentage - recent[i].progressPercentage;
            const daysDiff = (new Date(recent[i - 1].createdAt) - new Date(recent[i].createdAt)) / (1000 * 60 * 60 * 24);

            if (daysDiff > 0) {
                totalProgress += progressDiff;
                totalDays += daysDiff;
            }
        }

        return totalDays > 0 ? totalProgress / totalDays : 0;
    }

    aggregateStreamRisks(milestones) {
        const allRisks = milestones.flatMap(m => m.riskFactors || []);
        const activeRisks = allRisks.filter(r => r.status === 'active');

        const riskSummary = {
            critical: activeRisks.filter(r => r.level === 'critical').length,
            high: activeRisks.filter(r => r.level === 'high').length,
            medium: activeRisks.filter(r => r.level === 'medium').length,
            low: activeRisks.filter(r => r.level === 'low').length
        };

        return riskSummary;
    }

    determineStreamStatus(milestones) {
        const blocked = milestones.filter(m => m.status === 'blocked').length;
        if (blocked > 0) return 'blocked';

        const overdue = milestones.filter(m =>
            m.status !== 'completed' &&
            new Date(m.estimatedEndDate) < new Date()
        ).length;
        if (overdue > 0) return 'at_risk';

        const inProgress = milestones.filter(m => m.status === 'in_progress').length;
        if (inProgress > 0) return 'on_track';

        const completed = milestones.filter(m => m.status === 'completed').length;
        if (completed === milestones.length) return 'completed';

        return 'not_started';
    }

    calculateResourceUtilization(milestones) {
        const teamUtilization = {};

        milestones.forEach(milestone => {
            if (!teamUtilization[milestone.assignedTeam]) {
                teamUtilization[milestone.assignedTeam] = {
                    totalMilestones: 0,
                    completed: 0,
                    inProgress: 0,
                    blocked: 0,
                    averageProgress: 0
                };
            }

            const team = teamUtilization[milestone.assignedTeam];
            team.totalMilestones++;

            if (milestone.status === 'completed') team.completed++;
            else if (milestone.status === 'in_progress') team.inProgress++;
            else if (milestone.status === 'blocked') team.blocked++;

            team.averageProgress += milestone.progressPercentage;
        });

        // Calculate averages
        Object.values(teamUtilization).forEach(team => {
            if (team.totalMilestones > 0) {
                team.averageProgress = Math.round(team.averageProgress / team.totalMilestones);
                team.utilizationRate = Math.round(((team.inProgress + team.blocked) / team.totalMilestones) * 100);
            }
        });

        return teamUtilization;
    }

    calculateRiskMetrics(milestones) {
        const allRisks = milestones.flatMap(m => m.riskFactors || []);
        const activeRisks = allRisks.filter(r => r.status === 'active');

        return {
            totalRisks: activeRisks.length,
            critical: activeRisks.filter(r => r.level === 'critical').length,
            high: activeRisks.filter(r => r.level === 'high').length,
            medium: activeRisks.filter(r => r.level === 'medium').length,
            low: activeRisks.filter(r => r.level === 'low').length
        };
    }

    calculateOverallHealthScore(metrics) {
        const weights = {
            completionRate: 0.3,
            onTimeRate: 0.25,
            progressScore: 0.2,
            riskScore: 0.15,
            blockageScore: 0.1
        };

        const progressScore = Math.min(100, metrics.averageProgress);
        const riskScore = Math.max(0, 100 - (metrics.riskMetrics.critical * 20 + metrics.riskMetrics.high * 10));
        const blockageScore = Math.max(0, 100 - (metrics.blocked * 10));

        const score = (
            metrics.completionRate * weights.completionRate +
            metrics.onTimeRate * weights.onTimeRate +
            progressScore * weights.progressScore +
            riskScore * weights.riskScore +
            blockageScore * weights.blockageScore
        );

        return Math.round(score);
    }

    // Additional helper methods for report generation
    getExecutiveReportTemplate() {
        return {
            sections: ['executiveSummary', 'streamProgress', 'keyMetrics', 'criticalIssues', 'recommendations'],
            format: 'dashboard',
            frequency: 'daily'
        };
    }

    getTechnicalReportTemplate() {
        return {
            sections: ['detailedProgress', 'technicalIssues', 'qualityGates', 'risks', 'timeline'],
            format: 'detailed',
            frequency: 'daily'
        };
    }

    getStakeholderReportTemplate() {
        return {
            sections: ['progressOverview', 'milestones', 'timeline', 'keyDates'],
            format: 'summary',
            frequency: 'weekly'
        };
    }

    getTeamReportTemplate() {
        return {
            sections: ['teamProgress', 'blockers', 'dependencies', 'nextSteps'],
            format: 'actionable',
            frequency: 'daily'
        };
    }

    // Additional implementation methods would continue here...
    // (trimmed for brevity)

}

module.exports = ProgressReportingSystem;