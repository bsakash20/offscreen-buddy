const Milestone = require('../models/Milestone');
const MilestoneProgress = require('../models/MilestoneProgress');
const QualityGate = require('./QualityGate');
const RiskAssessment = require('./RiskAssessment');

class AutomatedMilestoneValidator {
    constructor() {
        this.validationRules = {
            security_remediation: {
                qualityGates: ['security_scan', 'vulnerability_assessment', 'compliance_check'],
                successCriteria: ['no_critical_vulnerabilities', 'all_tests_passed', 'documentation_updated'],
                performanceThresholds: {
                    responseTime: 200, // milliseconds
                    memoryUsage: 100, // MB
                    cpuUsage: 80 // percentage
                }
            },
            frontend_auth_migration: {
                qualityGates: ['unit_tests', 'integration_tests', 'ui_tests', 'accessibility_check'],
                successCriteria: ['authentication_flow_complete', 'no_security_issues', 'responsive_design'],
                performanceThresholds: {
                    loadTime: 3, // seconds
                    bundleSize: 1000, // KB
                    lighthouseScore: 90
                }
            },
            data_migration: {
                qualityGates: ['data_integrity_check', 'performance_test', 'backup_verification'],
                successCriteria: ['all_data_migrated', 'zero_data_loss', 'performance_maintained'],
                performanceThresholds: {
                    migrationTime: 300, // seconds
                    dataIntegrity: 100, // percentage
                    downtime: 0 // minutes
                }
            },
            realtime_features: {
                qualityGates: ['websocket_test', 'latency_test', 'scalability_test'],
                successCriteria: ['real_time_sync_working', 'low_latency', 'high_availability'],
                performanceThresholds: {
                    latency: 100, // milliseconds
                    uptime: 99.9, // percentage
                    concurrentConnections: 1000
                }
            },
            integration_testing: {
                qualityGates: ['end_to_end_tests', 'api_tests', 'database_tests'],
                successCriteria: ['all_integrations_working', 'no_bugs', 'performance_ok'],
                performanceThresholds: {
                    testCoverage: 90, // percentage
                    testExecutionTime: 300, // seconds
                    defectRate: 1 // percentage
                }
            },
            performance_optimization: {
                qualityGates: ['performance_benchmark', 'load_test', 'stress_test'],
                successCriteria: ['improved_performance', 'optimized_resources', 'no_regressions'],
                performanceThresholds: {
                    responseTimeImprovement: 20, // percentage
                    memoryOptimization: 15, // percentage
                    throughputImprovement: 25 // percentage
                }
            }
        };

        this.notificationThresholds = {
            progressStagnation: 48, // hours
            overdueWarning: 24, // hours before due date
            criticalRiskLevel: 2, // days since critical risk
            lowVelocity: 5 // percentage per day
        };
    }

    /**
     * Validate a milestone against all quality gates and success criteria
     */
    async validateMilestone(milestoneId, options = {}) {
        try {
            const milestone = await Milestone.findByPk(milestoneId);
            if (!milestone) {
                throw new Error(`Milestone ${milestoneId} not found`);
            }

            const validationRules = this.validationRules[milestone.streamType];
            if (!validationRules) {
                throw new Error(`No validation rules defined for stream: ${milestone.streamType}`);
            }

            const validationResults = {
                milestoneId,
                timestamp: new Date(),
                streamType: milestone.streamType,
                status: milestone.status,
                qualityGates: [],
                successCriteria: [],
                performanceThresholds: [],
                risks: [],
                recommendations: [],
                overallScore: 0,
                isValidated: false,
                blockers: []
            };

            // Run quality gate validations
            const gateResults = await this.validateQualityGates(milestone, validationRules.qualityGates);
            validationResults.qualityGates = gateResults;

            // Run success criteria validations
            const criteriaResults = await this.validateSuccessCriteria(milestone, validationRules.successCriteria);
            validationResults.successCriteria = criteriaResults;

            // Run performance threshold validations
            const performanceResults = await this.validatePerformanceThresholds(milestone, validationRules.performanceThresholds);
            validationResults.performanceThresholds = performanceResults;

            // Assess current risks
            const riskAssessment = await RiskAssessment.assessMilestoneRisks(milestone);
            validationResults.risks = riskAssessment.risks;

            // Generate recommendations
            const recommendations = this.generateRecommendations(validationResults);
            validationResults.recommendations = recommendations;

            // Calculate overall validation score
            const overallScore = this.calculateOverallScore(validationResults);
            validationResults.overallScore = overallScore;

            // Determine if milestone is fully validated
            validationResults.isValidated = this.isMilestoneValidated(validationResults);

            // Identify blockers
            validationResults.blockers = this.identifyBlockers(validationResults);

            // Store validation results
            await this.storeValidationResults(validationResults);

            // Trigger notifications if needed
            await this.checkNotificationTriggers(milestone, validationResults);

            return validationResults;

        } catch (error) {
            console.error('Error validating milestone:', error);
            throw error;
        }
    }

    /**
     * Validate quality gates for a milestone
     */
    async validateQualityGates(milestone, qualityGates) {
        const results = [];

        for (const gate of qualityGates) {
            try {
                const gateResult = await QualityGate.validate(gate, milestone);
                results.push({
                    gateName: gate,
                    status: gateResult.passed ? 'passed' : 'failed',
                    score: gateResult.score,
                    details: gateResult.details,
                    timestamp: new Date()
                });
            } catch (error) {
                results.push({
                    gateName: gate,
                    status: 'error',
                    score: 0,
                    details: { error: error.message },
                    timestamp: new Date()
                });
            }
        }

        return results;
    }

    /**
     * Validate success criteria for a milestone
     */
    async validateSuccessCriteria(milestone, successCriteria) {
        const results = [];

        for (const criterion of successCriteria) {
            const result = await this.evaluateSuccessCriterion(milestone, criterion);
            results.push({
                criterionName: criterion,
                status: result.passed ? 'passed' : 'failed',
                value: result.value,
                threshold: result.threshold,
                details: result.details,
                timestamp: new Date()
            });
        }

        return results;
    }

    /**
     * Validate performance thresholds for a milestone
     */
    async validatePerformanceThresholds(milestone, thresholds) {
        const results = [];

        // Get current performance metrics from milestone data or monitoring system
        const currentMetrics = await this.getCurrentPerformanceMetrics(milestone);

        for (const [metric, threshold] of Object.entries(thresholds)) {
            const currentValue = currentMetrics[metric] || 0;
            const passed = this.comparePerformanceMetric(currentValue, threshold, metric);

            results.push({
                metricName: metric,
                currentValue,
                threshold,
                status: passed ? 'passed' : 'failed',
                improvement: this.calculateImprovement(currentValue, threshold, metric),
                details: { current: currentValue, target: threshold },
                timestamp: new Date()
            });
        }

        return results;
    }

    /**
     * Get current performance metrics for a milestone
     */
    async getCurrentPerformanceMetrics(milestone) {
        const metrics = {};

        try {
            // Get metrics from the most recent progress update
            const latestProgress = await MilestoneProgress.findOne({
                where: { milestoneId: milestone.id },
                order: [['createdAt', 'DESC']]
            });

            if (latestProgress && latestProgress.metrics) {
                Object.assign(metrics, latestProgress.metrics);
            }

            // Get metrics from milestone metadata
            if (milestone.metrics) {
                Object.assign(metrics, milestone.metrics);
            }

            // If no metrics available, try to fetch from external monitoring system
            if (Object.keys(metrics).length === 0) {
                const externalMetrics = await this.fetchExternalMetrics(milestone);
                Object.assign(metrics, externalMetrics);
            }

        } catch (error) {
            console.warn('Error fetching performance metrics:', error);
        }

        return metrics;
    }

    /**
     * Fetch metrics from external monitoring systems
     */
    async fetchExternalMetrics(milestone) {
        // This would integrate with your existing monitoring system
        try {
            const response = await fetch('/api/monitoring/milestone-metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    milestoneId: milestone.id,
                    streamType: milestone.streamType,
                    timeframe: '24h'
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.metrics || {};
            }
        } catch (error) {
            console.warn('External metrics fetch failed:', error);
        }

        return {};
    }

    /**
     * Evaluate a specific success criterion
     */
    async evaluateSuccessCriterion(milestone, criterion) {
        // Implementation would depend on the specific criterion
        // This is a template implementation
        const evaluators = {
            'no_critical_vulnerabilities': () => this.checkCriticalVulnerabilities(milestone),
            'all_tests_passed': () => this.checkTestPassing(milestone),
            'documentation_updated': () => this.checkDocumentationUpdated(milestone),
            'authentication_flow_complete': () => this.checkAuthFlowComplete(milestone),
            'all_data_migrated': () => this.checkDataMigrationComplete(milestone),
            'real_time_sync_working': () => this.checkRealTimeSync(milestone),
            'all_integrations_working': () => this.checkIntegrationsWorking(milestone),
            'improved_performance': () => this.checkPerformanceImprovement(milestone)
        };

        const evaluator = evaluators[criterion];
        if (evaluator) {
            return await evaluator();
        }

        // Default evaluation
        return {
            passed: false,
            value: 0,
            threshold: 1,
            details: { message: 'Unknown criterion' }
        };
    }

    // Individual criterion evaluators
    async checkCriticalVulnerabilities(milestone) {
        // Implementation would check security scan results
        return { passed: true, value: 0, threshold: 0, details: { criticalVulns: 0 } };
    }

    async checkTestPassing(milestone) {
        // Implementation would check test results
        return { passed: true, value: 95, threshold: 90, details: { passRate: '95%' } };
    }

    async checkDocumentationUpdated(milestone) {
        // Implementation would check documentation timestamps
        return { passed: true, value: 1, threshold: 1, details: { docsUpdated: true } };
    }

    async checkAuthFlowComplete(milestone) {
        // Implementation would test authentication flow
        return { passed: true, value: 100, threshold: 100, details: { flowComplete: true } };
    }

    async checkDataMigrationComplete(milestone) {
        // Implementation would check migration status
        return { passed: true, value: 100, threshold: 100, details: { migrationProgress: '100%' } };
    }

    async checkRealTimeSync(milestone) {
        // Implementation would test real-time functionality
        return { passed: true, value: 50, threshold: 100, details: { latency: '50ms' } };
    }

    async checkIntegrationsWorking(milestone) {
        // Implementation would test all integrations
        return { passed: true, value: 15, threshold: 15, details: { workingIntegrations: '15/15' } };
    }

    async checkPerformanceImprovement(milestone) {
        // Implementation would compare baseline vs current performance
        return { passed: true, value: 25, threshold: 20, details: { improvement: '25%' } };
    }

    /**
     * Compare performance metric against threshold
     */
    comparePerformanceMetric(current, threshold, metric) {
        // Different metrics have different comparison logic
        const higherIsBetter = ['lighthouseScore', 'uptime', 'testCoverage', 'dataIntegrity'];
        const lowerIsBetter = ['responseTime', 'loadTime', 'memoryUsage', 'latency'];
        const improvementMetrics = ['responseTimeImprovement', 'memoryOptimization', 'throughputImprovement'];

        if (higherIsBetter.includes(metric)) {
            return current >= threshold;
        } else if (lowerIsBetter.includes(metric)) {
            return current <= threshold;
        } else if (improvementMetrics.includes(metric)) {
            return current >= threshold;
        }

        // Default comparison
        return current >= threshold;
    }

    /**
     * Calculate improvement percentage
     */
    calculateImprovement(current, threshold, metric) {
        const improvementMetrics = ['responseTimeImprovement', 'memoryOptimization', 'throughputImprovement'];
        return improvementMetrics.includes(metric) ? current : 0;
    }

    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations(validationResults) {
        const recommendations = [];

        // Check quality gates
        const failedGates = validationResults.qualityGates.filter(g => g.status !== 'passed');
        if (failedGates.length > 0) {
            recommendations.push({
                type: 'quality_gate',
                priority: 'high',
                message: `Failed quality gates: ${failedGates.map(g => g.gateName).join(', ')}`,
                action: 'Address failed quality gates before proceeding'
            });
        }

        // Check success criteria
        const failedCriteria = validationResults.successCriteria.filter(c => c.status !== 'failed');
        if (failedCriteria.length > 0) {
            recommendations.push({
                type: 'success_criteria',
                priority: 'critical',
                message: `Failed success criteria: ${failedCriteria.map(c => c.criterionName).join(', ')}`,
                action: 'Complete all success criteria before milestone completion'
            });
        }

        // Check performance thresholds
        const failedPerformance = validationResults.performanceThresholds.filter(p => p.status !== 'passed');
        if (failedPerformance.length > 0) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: `Performance thresholds not met: ${failedPerformance.map(p => p.metricName).join(', ')}`,
                action: 'Optimize performance to meet defined thresholds'
            });
        }

        // Check risks
        const highRisks = validationResults.risks.filter(r => r.level === 'high' || r.level === 'critical');
        if (highRisks.length > 0) {
            recommendations.push({
                type: 'risk',
                priority: 'critical',
                message: `High risks identified: ${highRisks.length} active risks`,
                action: 'Implement risk mitigation strategies immediately'
            });
        }

        return recommendations;
    }

    /**
     * Calculate overall validation score (0-100)
     */
    calculateOverallScore(validationResults) {
        const scores = [];

        // Quality gates score (40% weight)
        const gateScore = validationResults.qualityGates.length > 0
            ? (validationResults.qualityGates.filter(g => g.status === 'passed').length / validationResults.qualityGates.length) * 100
            : 100;
        scores.push(gateScore * 0.4);

        // Success criteria score (40% weight)
        const criteriaScore = validationResults.successCriteria.length > 0
            ? (validationResults.successCriteria.filter(c => c.status === 'passed').length / validationResults.successCriteria.length) * 100
            : 100;
        scores.push(criteriaScore * 0.4);

        // Performance thresholds score (20% weight)
        const perfScore = validationResults.performanceThresholds.length > 0
            ? (validationResults.performanceThresholds.filter(p => p.status === 'passed').length / validationResults.performanceThresholds.length) * 100
            : 100;
        scores.push(perfScore * 0.2);

        return Math.round(scores.reduce((sum, score) => sum + score, 0));
    }

    /**
     * Determine if milestone is fully validated
     */
    isMilestoneValidated(validationResults) {
        const allGatesPassed = validationResults.qualityGates.every(g => g.status === 'passed');
        const allCriteriaPassed = validationResults.successCriteria.every(c => c.status === 'passed');
        const performanceScore = validationResults.overallScore >= 80;
        const noCriticalRisks = validationResults.risks.every(r => r.level !== 'critical');

        return allGatesPassed && allCriteriaPassed && performanceScore && noCriticalRisks;
    }

    /**
     * Identify blockers preventing milestone completion
     */
    identifyBlockers(validationResults) {
        const blockers = [];

        // Failed quality gates
        const failedGates = validationResults.qualityGates.filter(g => g.status !== 'passed');
        failedGates.forEach(gate => {
            blockers.push({
                type: 'quality_gate',
                description: `Quality gate "${gate.gateName}" failed`,
                severity: 'high',
                impact: 'Cannot proceed without passing this gate'
            });
        });

        // Failed success criteria
        const failedCriteria = validationResults.successCriteria.filter(c => c.status !== 'failed');
        failedCriteria.forEach(criterion => {
            blockers.push({
                type: 'success_criteria',
                description: `Success criterion "${criterion.criterionName}" not met`,
                severity: 'critical',
                impact: 'Milestone cannot be considered complete'
            });
        });

        // Critical risks
        const criticalRisks = validationResults.risks.filter(r => r.level === 'critical');
        criticalRisks.forEach(risk => {
            blockers.push({
                type: 'risk',
                description: `Critical risk: ${risk.description}`,
                severity: 'critical',
                impact: 'Must be resolved before milestone completion'
            });
        });

        return blockers;
    }

    /**
     * Store validation results
     */
    async storeValidationResults(validationResults) {
        // This would store results in a ValidationResults table
        console.log('Storing validation results:', validationResults.milestoneId);
    }

    /**
     * Check if any notification thresholds are triggered
     */
    async checkNotificationTriggers(milestone, validationResults) {
        const now = new Date();

        // Progress stagnation check
        const latestProgress = await MilestoneProgress.findOne({
            where: { milestoneId: milestone.id },
            order: [['createdAt', 'DESC']]
        });

        if (latestProgress) {
            const hoursSinceUpdate = (now - latestProgress.createdAt) / (1000 * 60 * 60);
            if (hoursSinceUpdate > this.notificationThresholds.progressStagnation && milestone.progressPercentage < 100) {
                await this.sendNotification('progress_stagnation', milestone, {
                    hoursSinceUpdate: Math.round(hoursSinceUpdate)
                });
            }
        }

        // Overdue warning
        if (milestone.estimatedEndDate < now && milestone.status !== 'completed') {
            const hoursOverdue = (now - milestone.estimatedEndDate) / (1000 * 60 * 60);
            if (hoursOverdue > this.notificationThresholds.overdueWarning) {
                await this.sendNotification('overdue', milestone, {
                    hoursOverdue: Math.round(hoursOverdue)
                });
            }
        }

        // Critical risk alerts
        const criticalRisks = validationResults.risks.filter(r => r.level === 'critical');
        if (criticalRisks.length > 0) {
            await this.sendNotification('critical_risk', milestone, {
                criticalRisks: criticalRisks.length
            });
        }
    }

    /**
     * Send notification
     */
    async sendNotification(type, milestone, data) {
        // Implementation would integrate with notification system
        console.log(`Notification: ${type} for milestone ${milestone.id}`, data);
    }

    /**
     * Batch validate multiple milestones
     */
    async validateMultipleMilestones(milestoneIds, options = {}) {
        const results = [];
        const concurrency = options.concurrency || 5;

        for (let i = 0; i < milestoneIds.length; i += concurrency) {
            const batch = milestoneIds.slice(i, i + concurrency);
            const batchPromises = batch.map(id => this.validateMilestone(id, options));

            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                console.error('Error in batch validation:', error);
                // Continue with remaining batches
            }
        }

        return results;
    }
}

module.exports = AutomatedMilestoneValidator;