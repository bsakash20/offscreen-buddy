import {
    PerformanceMetrics,
    PerformanceAlert,
    PerformanceReport,
    OptimizationResult,
    PerformanceEvent,
    PerformanceEventType
} from '../../types/performance';

export interface AnalyticsConfig {
    enabled: boolean;
    batchSize: number;
    flushInterval: number; // ms
    maxRetentionDays: number;
    enableRealtime: boolean;
    enableAlerts: boolean;
}

export class PerformanceAnalytics {
    private config: AnalyticsConfig;
    private isInitialized = false;

    // Data storage
    private metricsBuffer: PerformanceMetrics[] = [];
    private alertsBuffer: PerformanceAlert[] = [];
    private eventsBuffer: PerformanceEvent[] = [];
    private reports: PerformanceReport[] = [];

    // Analytics data
    private sessionStartTime = Date.now();
    private totalSessions = 0;
    private performanceHistory: Array<{ timestamp: number; metrics: PerformanceMetrics }> = [];
    private optimizationResults: OptimizationResult[] = [];

    // Real-time analytics
    private realtimeEnabled = false;
    private realtimeCallbacks: Array<(data: any) => void> = [];

    // Aggregation data
    private dailyStats: Map<string, any> = new Map();
    private deviceStats: Map<string, any> = new Map();
    private featureStats: Map<string, any> = new Map();

    constructor(config?: AnalyticsConfig) {
        this.config = config || {
            enabled: true,
            batchSize: 50,
            flushInterval: 60000, // 1 minute
            maxRetentionDays: 7,
            enableRealtime: false,
            enableAlerts: true,
        };
    }

    public initialize(): void {
        if (this.isInitialized) return;

        console.log('Performance Analytics initialized');

        this.isInitialized = true;
        this.setupDataRetention();
        this.startPeriodicFlush();
        this.setupEventTracking();

        if (this.config.enableRealtime) {
            this.enableRealtimeAnalytics();
        }

        console.log('Performance Analytics initialization complete');
    }

    public recordMetrics(metrics: PerformanceMetrics): void {
        if (!this.isInitialized) return;

        // Add timestamp if not present
        const timestampedMetrics = {
            ...metrics,
            timestamp: metrics.timestamp || Date.now(),
        };

        this.metricsBuffer.push(timestampedMetrics);
        this.performanceHistory.push({
            timestamp: timestampedMetrics.timestamp,
            metrics: timestampedMetrics,
        });

        // Update real-time data if enabled
        if (this.realtimeEnabled) {
            this.processRealtimeMetrics(timestampedMetrics);
        }

        // Process analytics
        this.processMetricsAnalytics(timestampedMetrics);

        // Check if buffer should be flushed
        if (this.metricsBuffer.length >= this.config.batchSize) {
            this.flushMetrics();
        }
    }

    public recordAlert(alert: PerformanceAlert): void {
        if (!this.isInitialized) return;

        this.alertsBuffer.push(alert);

        // Process alert analytics
        this.processAlertAnalytics(alert);

        // Check if buffer should be flushed
        if (this.alertsBuffer.length >= Math.max(1, this.config.batchSize / 4)) {
            this.flushAlerts();
        }
    }

    public recordEvent(event: PerformanceEvent): void {
        if (!this.isInitialized) return;

        this.eventsBuffer.push(event);

        // Process event analytics
        this.processEventAnalytics(event);

        // Check if buffer should be flushed
        if (this.eventsBuffer.length >= this.config.batchSize) {
            this.flushEvents();
        }
    }

    public recordOptimizationResult(result: OptimizationResult): void {
        if (!this.isInitialized) return;

        this.optimizationResults.push({
            ...result,
            duration: result.duration || Date.now(),
        });

        console.log(`Optimization recorded: ${result.type} - ${result.impact}% improvement`);
    }

    public generateReport(duration?: number): PerformanceReport {
        const endTime = Date.now();
        const startTime = duration ? endTime - duration : this.sessionStartTime;

        // Filter data for the report period
        const reportMetrics = this.performanceHistory
            .filter(h => h.timestamp >= startTime && h.timestamp <= endTime)
            .map(h => h.metrics);

        const reportAlerts = this.alertsBuffer
            .filter(a => a.timestamp >= startTime && a.timestamp <= endTime);

        const reportEvents = this.eventsBuffer
            .filter(e => e.timestamp >= startTime && e.timestamp <= endTime);

        const reportOptimizations = this.optimizationResults
            .filter(o => o.duration >= startTime && o.duration <= endTime);

        // Generate report
        const report: PerformanceReport = {
            id: this.generateReportId(),
            timestamp: endTime,
            duration: endTime - startTime,
            metrics: reportMetrics,
            alerts: reportAlerts,
            optimizations: reportOptimizations,
            recommendations: this.generateRecommendations(reportMetrics, reportAlerts, reportOptimizations),
        };

        this.reports.push(report);

        console.log(`Generated performance report: ${Math.round((endTime - startTime) / 1000)}s duration`);

        return report;
    }

    public getRealtimeData(): any {
        if (!this.realtimeEnabled) return null;

        const recentMetrics = this.getRecentMetrics(10);
        const currentMetrics = recentMetrics[recentMetrics.length - 1];

        return {
            current: currentMetrics,
            trends: this.calculateTrends(recentMetrics),
            alerts: this.getRecentAlerts(5),
            performance: this.calculatePerformanceScore(recentMetrics),
        };
    }

    public getPerformanceSummary(): any {
        const recentHistory = this.performanceHistory.slice(-100);

        if (recentHistory.length === 0) {
            return {
                average: null,
                trends: null,
                recommendations: ['No performance data available'],
            };
        }

        const metrics = recentHistory.map(h => h.metrics);

        return {
            average: this.calculateAverages(metrics),
            trends: this.calculateTrends(metrics),
            alerts: this.getAlertSummary(),
            recommendations: this.generateRecommendations(metrics, this.alertsBuffer, this.optimizationResults),
            score: this.calculatePerformanceScore(metrics),
        };
    }

    public getOptimizationImpact(): any {
        const successfulOptimizations = this.optimizationResults.filter(o => o.success);

        if (successfulOptimizations.length === 0) {
            return {
                totalImpact: 0,
                averageImpact: 0,
                optimizationCount: 0,
                recommendations: ['No optimizations recorded'],
            };
        }

        const totalImpact = successfulOptimizations.reduce((sum, o) => sum + o.impact, 0);
        const averageImpact = totalImpact / successfulOptimizations.length;

        const impactByType = successfulOptimizations.reduce((acc, o) => {
            acc[o.type] = (acc[o.type] || 0) + o.impact;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalImpact,
            averageImpact,
            optimizationCount: successfulOptimizations.length,
            impactByType,
            mostEffectiveOptimization: this.getMostEffectiveOptimization(),
            recommendations: this.generateOptimizationRecommendations(),
        };
    }

    public exportData(format: 'json' | 'csv' = 'json'): string {
        const data = {
            sessionStartTime: this.sessionStartTime,
            totalSessions: this.totalSessions,
            metrics: this.metricsBuffer,
            alerts: this.alertsBuffer,
            events: this.eventsBuffer,
            optimizations: this.optimizationResults,
            reports: this.reports,
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else {
            return this.convertToCSV(data);
        }
    }

    public reset(): void {
        this.metricsBuffer = [];
        this.alertsBuffer = [];
        this.eventsBuffer = [];
        this.performanceHistory = [];
        this.optimizationResults = [];
        this.sessionStartTime = Date.now();
        this.dailyStats.clear();
        this.deviceStats.clear();
        this.featureStats.clear();

        console.log('Performance analytics data reset');
    }

    public dispose(): void {
        // Flush all remaining data
        this.flushAll();

        // Clean up
        this.isInitialized = false;
        this.realtimeCallbacks = [];
        this.realtimeEnabled = false;

        console.log('Performance Analytics disposed');
    }

    // Event tracking API

    public trackAppStart(): void {
        this.recordEvent({
            type: 'memory_warning' as PerformanceEventType,
            timestamp: Date.now(),
            data: { timestamp: Date.now() },
            deviceInfo: this.getDeviceInfo(),
        });
    }

    public trackComponentMount(componentName: string): void {
        this.recordEvent({
            type: 'low_fps' as PerformanceEventType,
            timestamp: Date.now(),
            data: { componentName, mountTime: Date.now() },
            deviceInfo: this.getDeviceInfo(),
        });
    }

    public trackUserInteraction(action: string, details?: any): void {
        this.recordEvent({
            type: 'optimization_applied' as PerformanceEventType,
            timestamp: Date.now(),
            data: { action, details, sessionId: this.getSessionId() },
            deviceInfo: this.getDeviceInfo(),
        });
    }

    public trackError(error: any, context?: string): void {
        this.recordEvent({
            type: 'network_timeout' as PerformanceEventType,
            timestamp: Date.now(),
            data: { error: error.toString(), context, stack: error.stack },
            deviceInfo: this.getDeviceInfo(),
        });
    }

    public subscribeToRealtime(callback: (data: any) => void): void {
        if (!this.realtimeEnabled) {
            this.enableRealtimeAnalytics();
        }

        this.realtimeCallbacks.push(callback);
    }

    public unsubscribeFromRealtime(callback: (data: any) => void): void {
        const index = this.realtimeCallbacks.indexOf(callback);
        if (index > -1) {
            this.realtimeCallbacks.splice(index, 1);
        }
    }

    // Private methods

    private setupDataRetention(): void {
        // Schedule data cleanup
        setInterval(() => {
            this.cleanupOldData();
        }, 3600000); // Every hour

        console.log('Data retention setup complete');
    }

    private startPeriodicFlush(): void {
        if (this.config.flushInterval <= 0) return;

        setInterval(() => {
            this.flushAll();
        }, this.config.flushInterval);

        console.log(`Periodic flush scheduled every ${this.config.flushInterval}ms`);
    }

    private setupEventTracking(): void {
        // Set up automatic event tracking
        this.trackAppStart();

        // Track page visibility changes
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.recordEvent({
                        type: 'battery_low' as PerformanceEventType,
                        timestamp: Date.now(),
                        data: {},
                        deviceInfo: this.getDeviceInfo(),
                    });
                } else {
                    this.recordEvent({
                        type: 'leak_detected' as PerformanceEventType,
                        timestamp: Date.now(),
                        data: {},
                        deviceInfo: this.getDeviceInfo(),
                    });
                }
            });
        }
    }

    private enableRealtimeAnalytics(): void {
        this.realtimeEnabled = true;
        console.log('Realtime analytics enabled');
    }

    private processMetricsAnalytics(metrics: PerformanceMetrics): void {
        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        if (!this.dailyStats.has(today)) {
            this.dailyStats.set(today, {
                metrics: [],
                alerts: 0,
                optimizations: 0,
            });
        }

        const dayStats = this.dailyStats.get(today)!;
        dayStats.metrics.push(metrics);

        // Update device stats
        const deviceKey = `${metrics.battery.level}_${metrics.memory.usedPercentage}`;
        if (!this.deviceStats.has(deviceKey)) {
            this.deviceStats.set(deviceKey, {
                count: 0,
                avgMemory: 0,
                avgBattery: 0,
            });
        }

        const deviceStats = this.deviceStats.get(deviceKey)!;
        deviceStats.count++;
        deviceStats.avgMemory = (deviceStats.avgMemory * (deviceStats.count - 1) + metrics.memory.usedPercentage) / deviceStats.count;
        deviceStats.avgBattery = (deviceStats.avgBattery * (deviceStats.count - 1) + metrics.battery.level) / deviceStats.count;
    }

    private processAlertAnalytics(alert: PerformanceAlert): void {
        // Update daily stats for alerts
        const today = new Date().toISOString().split('T')[0];
        if (this.dailyStats.has(today)) {
            const dayStats = this.dailyStats.get(today)!;
            dayStats.alerts++;
        }
    }

    private processEventAnalytics(event: PerformanceEvent): void {
        // Process event data for analytics
        // Implementation would update feature usage stats, user behavior patterns, etc.
    }

    private processRealtimeMetrics(metrics: PerformanceMetrics): void {
        const realtimeData = {
            timestamp: metrics.timestamp,
            memory: metrics.memory.usedPercentage,
            battery: metrics.battery.level,
            fps: metrics.render.fps,
            network: metrics.network.latency,
        };

        // Notify all realtime subscribers
        this.realtimeCallbacks.forEach(callback => {
            try {
                callback(realtimeData);
            } catch (error) {
                console.error('Error in realtime callback:', error);
            }
        });
    }

    private calculateTrends(metrics: PerformanceMetrics[]): any {
        if (metrics.length < 2) return null;

        const memoryTrend = this.calculateTrend(metrics.map(m => m.memory.usedPercentage));
        const batteryTrend = this.calculateTrend(metrics.map(m => m.battery.level));
        const fpsTrend = this.calculateTrend(metrics.map(m => m.render.fps));

        return {
            memory: {
                direction: memoryTrend.slope > 0 ? 'increasing' : 'decreasing',
                rate: Math.abs(memoryTrend.slope),
            },
            battery: {
                direction: batteryTrend.slope > 0 ? 'increasing' : 'decreasing',
                rate: Math.abs(batteryTrend.slope),
            },
            fps: {
                direction: fpsTrend.slope > 0 ? 'increasing' : 'decreasing',
                rate: Math.abs(fpsTrend.slope),
            },
        };
    }

    private calculateTrend(values: number[]): { slope: number; intercept: number } {
        const n = values.length;
        const sumX = values.reduce((sum, _, i) => sum + i, 0);
        const sumY = values.reduce((sum, value) => sum + value, 0);
        const sumXY = values.reduce((sum, value, i) => sum + i * value, 0);
        const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    private calculateAverages(metrics: PerformanceMetrics[]): any {
        if (metrics.length === 0) return null;

        const sum = metrics.reduce((acc, m) => ({
            memory: acc.memory + m.memory.usedPercentage,
            battery: acc.battery + m.battery.level,
            fps: acc.fps + m.render.fps,
            network: acc.network + m.network.latency,
        }), { memory: 0, battery: 0, fps: 0, network: 0 });

        const count = metrics.length;

        return {
            memory: sum.memory / count,
            battery: sum.battery / count,
            fps: sum.fps / count,
            network: sum.network / count,
        };
    }

    private calculatePerformanceScore(metrics: PerformanceMetrics[]): number {
        if (metrics.length === 0) return 0;

        const latest = metrics[metrics.length - 1];

        // Calculate performance score based on various factors
        const memoryScore = Math.max(0, 100 - latest.memory.usedPercentage);
        const batteryScore = latest.battery.level;
        const fpsScore = Math.min(100, (latest.render.fps / 60) * 100);
        const networkScore = Math.max(0, 100 - (latest.network.latency / 100) * 100);

        // Weighted average
        const score = (memoryScore * 0.3 + batteryScore * 0.2 + fpsScore * 0.3 + networkScore * 0.2);

        return Math.round(score);
    }

    private generateRecommendations(metrics: PerformanceMetrics[], alerts: PerformanceAlert[], optimizations: OptimizationResult[]): string[] {
        const recommendations: string[] = [];

        if (metrics.length === 0) return recommendations;

        const latest = metrics[metrics.length - 1];

        // Memory recommendations
        if (latest.memory.usedPercentage > 80) {
            recommendations.push('Memory usage is high - consider enabling aggressive garbage collection');
        }

        // Battery recommendations
        if (latest.battery.level < 20) {
            recommendations.push('Battery level is low - enable battery saving mode');
        }

        // FPS recommendations
        if (latest.render.fps < 45) {
            recommendations.push('Frame rate is low - reduce animation quality or complexity');
        }

        // Network recommendations
        if (latest.network.latency > 100) {
            recommendations.push('Network latency is high - optimize network requests');
        }

        // Alert-based recommendations
        const criticalAlerts = alerts.filter(a => a.level === 'critical');
        if (criticalAlerts.length > 0) {
            recommendations.push('Critical performance issues detected - immediate optimization recommended');
        }

        return recommendations;
    }

    private getAlertSummary(): any {
        const alertCounts = this.alertsBuffer.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total: this.alertsBuffer.length,
            byType: alertCounts,
            critical: this.alertsBuffer.filter(a => a.level === 'critical').length,
        };
    }

    private getMostEffectiveOptimization(): OptimizationResult | null {
        if (this.optimizationResults.length === 0) return null;

        return this.optimizationResults.reduce((max, current) =>
            current.impact > max.impact ? current : max
        );
    }

    private generateOptimizationRecommendations(): string[] {
        const recommendations: string[] = [];

        const optimizationCounts = this.optimizationResults.reduce((acc, o) => {
            acc[o.type] = (acc[o.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Analyze optimization patterns
        if ((optimizationCounts['memory'] || 0) < 2) {
            recommendations.push('Consider more memory optimization strategies');
        }

        if ((optimizationCounts['battery'] || 0) < 2) {
            recommendations.push('Battery optimization could be improved');
        }

        return recommendations;
    }

    private getRecentMetrics(count: number): PerformanceMetrics[] {
        return this.performanceHistory
            .slice(-count)
            .map(h => h.metrics);
    }

    private getRecentAlerts(count: number): PerformanceAlert[] {
        return this.alertsBuffer.slice(-count);
    }

    private generateReportId(): string {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getDeviceInfo() {
        // Return device information for analytics
        return {
            platform: 'ios' as 'ios' | 'android',
            model: 'Unknown',
            totalMemory: 4 * 1024 * 1024 * 1024, // 4GB
            isLowEndDevice: false,
            supportsLowPowerMode: true,
            screenDensity: 2,
            isTablet: false,
        };
    }

    private getSessionId(): string {
        // Generate or return session ID
        return `session_${this.sessionStartTime}`;
    }

    private convertToCSV(data: any): string {
        // Simple CSV conversion (would be more sophisticated in real implementation)
        const headers = ['timestamp', 'type', 'data'];
        const rows = [headers.join(',')];

        data.events.forEach((event: any) => {
            rows.push([
                event.timestamp,
                event.type,
                JSON.stringify(event.data)
            ].join(','));
        });

        return rows.join('\n');
    }

    private cleanupOldData(): void {
        const cutoff = Date.now() - (this.config.maxRetentionDays * 24 * 60 * 60 * 1000);

        // Clean up performance history
        this.performanceHistory = this.performanceHistory.filter(h => h.timestamp > cutoff);

        // Clean up alerts
        this.alertsBuffer = this.alertsBuffer.filter(a => a.timestamp > cutoff);

        // Clean up events
        this.eventsBuffer = this.eventsBuffer.filter(e => e.timestamp > cutoff);

        // Clean up optimization results
        this.optimizationResults = this.optimizationResults.filter(o => o.duration > cutoff);

        // Clean up daily stats (keep last 30 days)
        const cutoffDate = new Date(cutoff).toISOString().split('T')[0];
        for (const [date] of this.dailyStats) {
            if (date < cutoffDate) {
                this.dailyStats.delete(date);
            }
        }

        console.log('Old performance data cleaned up');
    }

    private flushMetrics(): void {
        if (this.metricsBuffer.length === 0) return;

        console.log(`Flushing ${this.metricsBuffer.length} metrics`);
        // In real implementation, would send to analytics service

        this.metricsBuffer = [];
    }

    private flushAlerts(): void {
        if (this.alertsBuffer.length === 0) return;

        console.log(`Flushing ${this.alertsBuffer.length} alerts`);
        // In real implementation, would send to alerting service

        this.alertsBuffer = [];
    }

    private flushEvents(): void {
        if (this.eventsBuffer.length === 0) return;

        console.log(`Flushing ${this.eventsBuffer.length} events`);
        // In real implementation, would send to event tracking service

        this.eventsBuffer = [];
    }

    private flushAll(): void {
        this.flushMetrics();
        this.flushAlerts();
        this.flushEvents();
    }
}