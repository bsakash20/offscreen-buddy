import { MemoryStats, MemoryLeak } from '../../types/performance';

export class MemoryUtils {
    /**
     * Format bytes to human readable format
     */
    static formatBytes(bytes: number, decimals = 2): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Calculate memory usage percentage
     */
    static calculateUsagePercentage(used: number, total: number): number {
        return total > 0 ? (used / total) * 100 : 0;
    }

    /**
     * Estimate memory footprint of common objects
     */
    static estimateObjectSize(obj: any): number {
        if (obj === null || obj === undefined) return 0;

        if (typeof obj === 'string') {
            return obj.length * 2; // UTF-16 encoding
        }

        if (typeof obj === 'number') {
            return 8; // 64-bit float
        }

        if (typeof obj === 'boolean') {
            return 4; // Boolean + overhead
        }

        if (Array.isArray(obj)) {
            return obj.reduce((sum, item) => sum + this.estimateObjectSize(item), 0) + obj.length * 4;
        }

        if (typeof obj === 'object') {
            let size = 0;
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    size += key.length * 2; // Key string
                    size += this.estimateObjectSize(obj[key]); // Value
                }
            }
            return size + 16; // Object overhead
        }

        return 0;
    }

    /**
     * Detect memory leak patterns
     */
    static detectMemoryLeakPatterns(
        currentStats: MemoryStats & { timestamp: number },
        previousStats: Array<MemoryStats & { timestamp: number }>,
        timeThreshold: number = 300000 // 5 minutes
    ): MemoryLeak[] {
        const leaks: MemoryLeak[] = [];

        if (previousStats.length < 3) return leaks;

        // Check for steady memory increase
        const memoryIncrease = currentStats.used - previousStats[0].used;
        const timeElapsed = currentStats.timestamp - previousStats[0].timestamp;

        if (memoryIncrease > 1024 * 1024 * 10 && timeElapsed > timeThreshold) { // 10MB increase
            leaks.push({
                type: 'component',
                source: 'Memory Growth Pattern',
                description: 'Steady memory increase detected over time',
                size: memoryIncrease,
                firstDetected: previousStats[0].timestamp,
                lastDetected: currentStats.timestamp,
                frequency: Math.floor(timeElapsed / timeThreshold),
            });
        }

        // Check for GC frequency issues
        if (currentStats.gcCount < previousStats[previousStats.length - 1].gcCount) {
            const gcTime = (currentStats.lastGCTime || 0) - (previousStats[0].lastGCTime || 0);
            if (gcTime > timeThreshold) {
                leaks.push({
                    type: 'network',
                    source: 'Garbage Collection',
                    description: 'Infrequent garbage collection may indicate memory pressure',
                    size: memoryIncrease,
                    firstDetected: previousStats[0].timestamp,
                    lastDetected: currentStats.timestamp,
                    frequency: 1,
                });
            }
        }

        return leaks;
    }

    /**
     * Calculate memory pressure level
     */
    static calculateMemoryPressure(used: number, total: number): 'low' | 'medium' | 'high' | 'critical' {
        const percentage = this.calculateUsagePercentage(used, total);

        if (percentage < 50) return 'low';
        if (percentage < 70) return 'medium';
        if (percentage < 85) return 'high';
        return 'critical';
    }

    /**
     * Get optimal garbage collection timing recommendations
     */
    static getGCTimingRecommendations(
        currentStats: MemoryStats,
        historicalStats: MemoryStats[]
    ): string[] {
        const recommendations: string[] = [];

        const avgMemoryUsage = historicalStats.reduce((sum, stat) =>
            sum + this.calculateUsagePercentage(stat.used, stat.total), 0) / historicalStats.length;

        const currentUsage = this.calculateUsagePercentage(currentStats.used, currentStats.total);

        // Memory usage recommendations
        if (currentUsage > 80) {
            recommendations.push('Immediate garbage collection recommended due to high memory usage');
        } else if (currentUsage > avgMemoryUsage * 1.2) {
            recommendations.push('Consider garbage collection as memory usage is above average');
        }

        // GC frequency recommendations
        const recentGCs = historicalStats.filter(stat => stat.gcCount > 0).length;
        if (recentGCs === 0 && historicalStats.length > 5) {
            recommendations.push('No recent garbage collection detected - consider manual GC trigger');
        }

        // Timing recommendations
        const hour = new Date().getHours();
        if (hour >= 0 && hour <= 6) {
            recommendations.push('Night hours detected - good time for intensive cleanup operations');
        } else if (hour >= 9 && hour <= 17) {
            recommendations.push('Business hours - use gentle GC strategies to avoid performance impact');
        }

        return recommendations;
    }

    /**
     * Optimize memory allocation patterns
     */
    static optimizeAllocationPatterns(objects: any[]): any[] {
        return objects.map(obj => {
            if (typeof obj === 'string' && obj.length > 100) {
                // Use substring for long strings if they're not needed in full
                return obj.substring(0, 100) + (obj.length > 100 ? '...' : '');
            }

            if (Array.isArray(obj) && obj.length > 100) {
                // Limit array sizes in memory-intensive operations
                return obj.slice(0, 100);
            }

            if (typeof obj === 'object' && obj !== null) {
                // Create a shallow copy to avoid references to large objects
                const copy = { ...obj };

                // Remove non-essential properties for memory optimization
                delete copy.metadata;
                delete copy.debugInfo;
                delete copy.tempData;

                return copy;
            }

            return obj;
        });
    }

    /**
     * Calculate memory efficiency score
     */
    static calculateMemoryEfficiency(current: MemoryStats, historical: MemoryStats[]): number {
        if (historical.length === 0) return 100;

        const currentUsage = this.calculateUsagePercentage(current.used, current.total);
        const avgUsage = historical.reduce((sum, stat) =>
            sum + this.calculateUsagePercentage(stat.used, stat.total), 0) / historical.length;

        // Calculate efficiency based on memory usage trends
        const usageScore = Math.max(0, 100 - Math.abs(currentUsage - avgUsage));

        // Factor in garbage collection frequency
        const gcScore = Math.min(100, current.gcCount * 10);

        // Combine scores with weights
        return Math.round((usageScore * 0.7) + (gcScore * 0.3));
    }

    /**
     * Generate memory optimization suggestions
     */
    static generateOptimizationSuggestions(
        current: MemoryStats,
        historical: MemoryStats[]
    ): string[] {
        const suggestions: string[] = [];

        const usage = this.calculateUsagePercentage(current.used, current.total);
        const pressure = this.calculateMemoryPressure(current.used, current.total);

        // Usage-based suggestions
        if (usage > 90) {
            suggestions.push('Critical memory usage - implement immediate cleanup');
            suggestions.push('Consider using memory pooling for frequent object creation');
        } else if (usage > 75) {
            suggestions.push('High memory usage detected - optimize data structures');
            suggestions.push('Implement lazy loading for non-critical resources');
        } else if (usage < 30) {
            suggestions.push('Low memory usage - opportunity to preload critical data');
        }

        // Pressure-based suggestions
        switch (pressure) {
            case 'critical':
                suggestions.push('Critical memory pressure - enable emergency cleanup mode');
                suggestions.push('Consider reducing cache sizes temporarily');
                break;
            case 'high':
                suggestions.push('High memory pressure - implement aggressive GC scheduling');
                suggestions.push('Reduce background processes');
                break;
            case 'medium':
                suggestions.push('Medium memory pressure - monitor closely for trends');
                break;
            case 'low':
                suggestions.push('Low memory pressure - good time for maintenance tasks');
                break;
        }

        // Trend-based suggestions
        if (historical.length >= 5) {
            const recentTrend = this.calculateMemoryTrend(historical.slice(-5));
            if (recentTrend.slope > 0.5) {
                suggestions.push('Memory usage is increasing - implement proactive cleanup');
            } else if (recentTrend.slope < -0.5) {
                suggestions.push('Memory usage decreasing - optimization efforts working');
            }
        }

        return suggestions;
    }

    /**
     * Calculate memory trend over time
     */
    private static calculateMemoryTrend(stats: MemoryStats[]): { slope: number; intercept: number } {
        const values = stats.map(stat => this.calculateUsagePercentage(stat.used, stat.total));
        const times = stats.map((_, i) => i);

        const n = times.length;
        const sumX = times.reduce((sum, x) => sum + x, 0);
        const sumY = values.reduce((sum, y) => sum + y, 0);
        const sumXY = times.reduce((sum, x, i) => sum + x * values[i], 0);
        const sumXX = times.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * Monitor component memory usage patterns
     */
    static monitorComponentMemory(
        componentId: string,
        previousUsage: number,
        currentUsage: number
    ): { isLeaking: boolean; severity: 'low' | 'medium' | 'high'; suggestion: string } {
        const increase = currentUsage - previousUsage;
        const increasePercentage = (increase / previousUsage) * 100;

        if (increasePercentage > 50) {
            return {
                isLeaking: true,
                severity: 'high',
                suggestion: `Component ${componentId} shows significant memory increase (${increasePercentage.toFixed(1)}%). Check for event listeners and timers that may not be cleaned up.`,
            };
        } else if (increasePercentage > 20) {
            return {
                isLeaking: true,
                severity: 'medium',
                suggestion: `Component ${componentId} memory usage increased by ${increasePercentage.toFixed(1)}%. Review memory allocation patterns.`,
            };
        } else if (increasePercentage > 5) {
            return {
                isLeaking: false,
                severity: 'low',
                suggestion: `Minor memory increase in component ${componentId}. Monitor for continued growth.`,
            };
        }

        return {
            isLeaking: false,
            severity: 'low',
            suggestion: `Component ${componentId} memory usage is stable.`,
        };
    }

    /**
     * Create memory pool for frequent allocations
     */
    static createMemoryPool<T>(createFn: () => T, maxSize: number = 100): {
        get: () => T;
        return: (item: T) => void;
        clear: () => void;
        size: () => number;
    } {
        const pool: T[] = [];

        return {
            get: (): T => {
                return pool.pop() || createFn();
            },
            return: (item: T): void => {
                if (pool.length < maxSize) {
                    pool.push(item);
                }
            },
            clear: (): void => {
                pool.length = 0;
            },
            size: (): number => {
                return pool.length;
            },
        };
    }
}