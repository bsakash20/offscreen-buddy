import { Platform } from 'react-native';

interface PerformanceMetrics {
    timestamp: number;
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
}

interface PerformanceThresholds {
    acceptable: number;
    slow: number;
    critical: number;
}

class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: PerformanceMetrics[] = [];
    private readonly maxMetricsCount = 1000;
    private thresholds: Record<string, PerformanceThresholds> = {
        api: { acceptable: 500, slow: 1000, critical: 3000 },
        render: { acceptable: 16, slow: 50, critical: 100 },
        database: { acceptable: 100, slow: 500, critical: 2000 },
        imageLoad: { acceptable: 1000, slow: 3000, critical: 5000 }
    };

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Start timing an operation
     */
    startTimer(operation: string, metadata?: Record<string, any>) {
        const startTime = performance.now();
        return {
            end: (success: boolean = true, additionalMetadata?: Record<string, any>) => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                this.recordMetric(operation, duration, success, {
                    ...metadata,
                    ...additionalMetadata
                });

                return duration;
            }
        };
    }

    /**
     * Record a performance metric
     */
    private recordMetric(
        operation: string,
        duration: number,
        success: boolean,
        metadata?: Record<string, any>
    ) {
        const metric: PerformanceMetrics = {
            timestamp: Date.now(),
            operation,
            duration,
            success,
            metadata
        };

        this.metrics.push(metric);

        // Keep only the latest metrics
        if (this.metrics.length > this.maxMetricsCount) {
            this.metrics = this.metrics.slice(-this.maxMetricsCount);
        }

        // Log slow operations
        const category = this.categorizeOperation(operation);
        if (category) {
            const threshold = this.thresholds[category];
            if (duration > threshold.critical) {
                console.warn(`🚀 CRITICAL performance issue: ${operation} took ${duration.toFixed(2)}ms`, metadata);
            } else if (duration > threshold.slow) {
                console.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, metadata);
            }
        }

        // Development logging
        if (__DEV__) {
            console.log(`📊 Performance: ${operation} - ${duration.toFixed(2)}ms`, metadata);
        }
    }

    /**
     * Categorize operation based on name
     */
    private categorizeOperation(operation: string): keyof typeof PerformanceMonitor.prototype.thresholds | null {
        if (operation.toLowerCase().includes('api') || operation.toLowerCase().includes('fetch')) {
            return 'api';
        }
        if (operation.toLowerCase().includes('render') || operation.toLowerCase().includes('component')) {
            return 'render';
        }
        if (operation.toLowerCase().includes('db') || operation.toLowerCase().includes('database') || operation.toLowerCase().includes('supabase')) {
            return 'database';
        }
        if (operation.toLowerCase().includes('image') || operation.toLowerCase().includes('load')) {
            return 'imageLoad';
        }
        return null;
    }

    /**
     * Get performance summary
     */
    getSummary() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);

        const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);

        const summary = {
            totalOperations: recentMetrics.length,
            avgDuration: 0,
            slowestOperation: null as PerformanceMetrics | null,
            errorRate: 0,
            categoryBreakdown: {} as Record<string, { count: number; avgDuration: number; errorRate: number }>
        };

        if (recentMetrics.length === 0) return summary;

        const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
        summary.avgDuration = totalDuration / recentMetrics.length;

        const errors = recentMetrics.filter(m => !m.success).length;
        summary.errorRate = (errors / recentMetrics.length) * 100;

        // Find slowest operation
        summary.slowestOperation = recentMetrics.reduce((slowest, current) =>
            current.duration > (slowest?.duration || 0) ? current : slowest
            , null as PerformanceMetrics | null);

        // Category breakdown
        recentMetrics.forEach(metric => {
            const category = this.categorizeOperation(metric.operation) || 'other';
            if (!summary.categoryBreakdown[category]) {
                summary.categoryBreakdown[category] = { count: 0, avgDuration: 0, errorRate: 0 };
            }

            const breakdown = summary.categoryBreakdown[category];
            breakdown.count++;
            breakdown.avgDuration = (breakdown.avgDuration * (breakdown.count - 1) + metric.duration) / breakdown.count;

            if (!metric.success) {
                const errorCount = recentMetrics.filter(m =>
                    this.categorizeOperation(m.operation) === category && !m.success
                ).length;
                breakdown.errorRate = (errorCount / breakdown.count) * 100;
            }
        });

        return summary;
    }

    /**
     * Get slow operations
     */
    getSlowOperations(limit: number = 10): PerformanceMetrics[] {
        return this.metrics
            .filter(m => !m.success || this.isSlowOperation(m))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }

    /**
     * Check if operation is slow
     */
    private isSlowOperation(metric: PerformanceMetrics): boolean {
        const category = this.categorizeOperation(metric.operation);
        if (!category) return false;

        return metric.duration > this.thresholds[category].slow;
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics = [];
    }

    /**
     * Export metrics for debugging
     */
    exportMetrics() {
        return {
            timestamp: Date.now(),
            platform: Platform.OS,
            metrics: this.metrics,
            summary: this.getSummary()
        };
    }
}

export default PerformanceMonitor;