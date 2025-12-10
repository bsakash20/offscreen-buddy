import { Platform } from 'react-native';
import {
    PerformanceMetrics,
    MemoryStats,
    BatteryInfo,
    DeviceInfo,
    PerformanceAlert,
    PerformanceThresholds
} from '../../_types/performance';
import { MemoryManager } from './MemoryManager';
import { BatteryOptimizer } from './BatteryOptimizer';
import { ResourceManager } from './ResourceManager';
import { StartupOptimizer } from './StartupOptimizer';
import { PerformanceAnalytics } from './PerformanceAnalytics';
import { MemoryUtils } from '../../_utils/performance/MemoryUtils';
import { BatteryUtils } from '../../_utils/performance/BatteryUtils';

export interface PerformanceConfig {
    memory: {
        maxUsageMB: number;
        gcThreshold: number;
        leakDetectionEnabled: boolean;
    };
    battery: {
        optimizationEnabled: boolean;
        backgroundOptimization: boolean;
        networkOptimization: boolean;
    };
    monitoring: {
        realTimeMetrics: boolean;
        performanceAlerts: boolean;
        analyticsEnabled: boolean;
    };
    thresholds: PerformanceThresholds;
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private memoryManager: MemoryManager;
    private batteryOptimizer: BatteryOptimizer;
    private resourceManager: ResourceManager;
    private startupOptimizer: StartupOptimizer;
    private performanceAnalytics: PerformanceAnalytics;

    private config: PerformanceConfig;
    private isMonitoring = false;
    private monitoringInterval: ReturnType<typeof setInterval> | null = null;
    private metricsHistory: PerformanceMetrics[] = [];
    private deviceInfo: DeviceInfo;

    private constructor(config: PerformanceConfig) {
        this.config = config;
        this.deviceInfo = this.getDeviceInfo();

        // Initialize performance services
        this.memoryManager = new MemoryManager(config.memory);
        this.batteryOptimizer = new BatteryOptimizer(config.battery);
        this.resourceManager = new ResourceManager({
            maxCacheSize: config.memory.maxUsageMB * 1024 * 1024, // Convert MB to bytes
            cacheStrategy: 'lru',
            enableImageOptimization: true,
            enableFontOptimization: true,
            enableNetworkOptimization: config.battery.networkOptimization,
        });
        this.startupOptimizer = new StartupOptimizer();
        this.performanceAnalytics = new PerformanceAnalytics({
            enabled: config.monitoring.analyticsEnabled,
            batchSize: 50,
            flushInterval: 60000, // 1 minute
            maxRetentionDays: 7,
            enableRealtime: config.monitoring.realTimeMetrics,
            enableAlerts: config.monitoring.performanceAlerts,
        });

        // Initialize performance monitoring
        this.initializeMonitoring();
    }

    public static getInstance(config?: PerformanceConfig): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            const defaultConfig: PerformanceConfig = {
                memory: {
                    maxUsageMB: 100,
                    gcThreshold: 80,
                    leakDetectionEnabled: true,
                },
                battery: {
                    optimizationEnabled: true,
                    backgroundOptimization: true,
                    networkOptimization: true,
                },
                monitoring: {
                    realTimeMetrics: true,
                    performanceAlerts: true,
                    analyticsEnabled: true,
                },
                thresholds: {
                    memory: { warning: 80, critical: 95 },
                    battery: { warning: 20, critical: 10 },
                    cpu: { warning: 70, critical: 90 },
                    startup: { warning: 2000, critical: 3000 },
                    fps: { warning: 45, critical: 30 },
                },
            };

            PerformanceMonitor.instance = new PerformanceMonitor(config || defaultConfig);
        }

        return PerformanceMonitor.instance;
    }

    private getDeviceInfo(): DeviceInfo {
        // In a real implementation, this would use React Native device info
        return {
            platform: Platform.OS as 'ios' | 'android',
            model: 'Unknown',
            totalMemory: 4 * 1024 * 1024 * 1024, // 4GB in bytes
            isLowEndDevice: false,
            supportsLowPowerMode: true,
            screenDensity: 2,
            isTablet: false,
        };
    }

    private initializeMonitoring(): void {
        // Don't auto-start monitoring to prevent blocking app initialization
        // Monitoring can be started manually by calling startMonitoring()

        // Initialize services without starting monitoring loops
        this.batteryOptimizer.initialize();
        this.resourceManager.initialize();

        // Note: Real-time monitoring is disabled by default
        // Call startMonitoring() or startRealTimeMonitoring() to enable
    }

    public startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.processMetrics();
            this.checkThresholds();
        }, 5000); // Collect metrics every 5 seconds

        console.log('Performance monitoring started');
    }

    public stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('Performance monitoring stopped');
    }

    private startRealTimeMonitoring(): void {
        // Start memory monitoring
        this.memoryManager.startMonitoring();

        // Start battery monitoring
        this.batteryOptimizer.startMonitoring();

        // Start resource monitoring
        this.resourceManager.startMonitoring();
    }

    private collectMetrics(): void {
        const timestamp = Date.now();

        // Collect memory metrics
        const memoryStats = this.memoryManager.getCurrentStats();

        // Collect battery metrics
        const batteryInfo = this.batteryOptimizer.getCurrentStats();

        // Collect resource metrics
        const resourceStats = this.resourceManager.getCurrentStats();

        // Collect FPS and render metrics
        const renderStats = this.getRenderStats();

        const metrics: PerformanceMetrics = {
            timestamp,
            memory: memoryStats,
            battery: batteryInfo,
            resources: resourceStats,
            render: renderStats,
            network: this.getNetworkStats(),
        };

        this.metricsHistory.push(metrics);

        // Keep only last 100 metrics to prevent memory buildup
        if (this.metricsHistory.length > 100) {
            this.metricsHistory.shift();
        }

        // Send metrics to analytics if enabled
        if (this.config.monitoring.analyticsEnabled) {
            this.performanceAnalytics.recordMetrics(metrics);
        }
    }

    private processMetrics(): void {
        if (this.metricsHistory.length < 2) return;

        const recentMetrics = this.metricsHistory.slice(-10);

        // Analyze trends
        this.analyzeMemoryTrends(recentMetrics);
        this.analyzeBatteryTrends(recentMetrics);
        this.analyzePerformanceTrends(recentMetrics);

        // Trigger optimizations if needed
        this.triggerOptimizations();
    }

    private analyzeMemoryTrends(metrics: PerformanceMetrics[]): void {
        if (metrics.length < 5) return;

        const memoryUsage = metrics.map(m => m.memory.usedPercentage);
        const trend = this.calculateTrend(memoryUsage);

        if (trend.slope > 0.5) {
            // Memory usage is increasing rapidly
            this.memoryManager.triggerGarbageCollection();
            this.resourceManager.optimizeMemory();
        }
    }

    private analyzeBatteryTrends(metrics: PerformanceMetrics[]): void {
        if (metrics.length < 3) return;

        const recentMetrics = metrics[metrics.length - 1];
        const batteryLevel = recentMetrics.battery.level;

        if (batteryLevel < this.config.thresholds.battery.warning) {
            this.batteryOptimizer.enableBatterySavingMode();
        }

        if (batteryLevel < this.config.thresholds.battery.critical) {
            this.batteryOptimizer.enableCriticalBatteryMode();
        }
    }

    private analyzePerformanceTrends(metrics: PerformanceMetrics[]): void {
        const avgFPS = metrics.reduce((sum, m) => sum + m.render.fps, 0) / metrics.length;

        if (avgFPS < this.config.thresholds.fps.warning) {
            this.batteryOptimizer.reduceAnimationQuality();
            this.resourceManager.optimizeAnimations();
        }
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

    private checkThresholds(): void {
        const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];
        if (!currentMetrics) return;

        const alerts: PerformanceAlert[] = [];

        // Check memory thresholds
        if (currentMetrics.memory.usedPercentage > this.config.thresholds.memory.critical) {
            alerts.push({
                type: 'memory',
                level: 'critical',
                message: 'Memory usage critically high',
                timestamp: Date.now(),
            });
        } else if (currentMetrics.memory.usedPercentage > this.config.thresholds.memory.warning) {
            alerts.push({
                type: 'memory',
                level: 'warning',
                message: 'Memory usage high',
                timestamp: Date.now(),
            });
        }

        // Check battery thresholds
        if (currentMetrics.battery.level < this.config.thresholds.battery.critical) {
            alerts.push({
                type: 'battery',
                level: 'critical',
                message: 'Battery level critically low',
                timestamp: Date.now(),
            });
        }

        // Check startup time
        if (currentMetrics.startupTime && currentMetrics.startupTime > this.config.thresholds.startup.critical) {
            alerts.push({
                type: 'startup',
                level: 'critical',
                message: 'Startup time too slow',
                timestamp: Date.now(),
            });
        }

        // Process alerts
        alerts.forEach(alert => this.handlePerformanceAlert(alert));
    }

    private setupPerformanceAlerts(): void {
        if (!this.config.monitoring.performanceAlerts) return;

        // Set up memory leak detection
        this.memoryManager.onMemoryLeakDetected(() => {
            this.handlePerformanceAlert({
                type: 'memory',
                level: 'warning',
                message: 'Potential memory leak detected',
                timestamp: Date.now(),
            });
        });

        // Set up battery optimization alerts
        this.batteryOptimizer.onOptimizationTriggered((optimization) => {
            console.log('Battery optimization triggered:', optimization);
        });
    }

    private handlePerformanceAlert(alert: PerformanceAlert): void {
        console.warn('Performance Alert:', alert);

        // Send alert to analytics
        if (this.config.monitoring.analyticsEnabled) {
            this.performanceAnalytics.recordAlert(alert);
        }

        // Trigger appropriate responses
        this.handleAlertResponse(alert);
    }

    private handleAlertResponse(alert: PerformanceAlert): void {
        switch (alert.type) {
            case 'memory':
                this.memoryManager.handleMemoryAlert(alert);
                this.resourceManager.optimizeMemory();
                break;
            case 'battery':
                this.batteryOptimizer.handleBatteryAlert(alert);
                break;
            case 'startup':
                this.startupOptimizer.analyzeAndOptimize();
                break;
        }
    }

    private triggerOptimizations(): void {
        // Memory optimization
        if (this.memoryManager.shouldOptimize()) {
            this.memoryManager.optimizeMemory();
        }

        // Battery optimization
        if (this.batteryOptimizer.shouldOptimize()) {
            this.batteryOptimizer.optimize();
        }

        // Resource optimization
        if (this.resourceManager.shouldOptimize()) {
            this.resourceManager.optimize();
        }
    }

    // Public API methods

    public getCurrentMetrics(): PerformanceMetrics | null {
        return this.metricsHistory[this.metricsHistory.length - 1] || null;
    }

    public getMetricsHistory(): PerformanceMetrics[] {
        return [...this.metricsHistory];
    }

    public enableLowPowerMode(): void {
        this.batteryOptimizer.enableBatterySavingMode();
        this.resourceManager.enableLowPowerMode();
        this.memoryManager.enableAggressiveGC();
    }

    public disableLowPowerMode(): void {
        this.batteryOptimizer.disableBatterySavingMode();
        this.resourceManager.disableLowPowerMode();
        this.memoryManager.disableAggressiveGC();
    }

    public optimizeForStartup(): void {
        this.startupOptimizer.optimize();
    }

    public optimizeForFocus(): void {
        // Optimize for extended focus sessions
        this.enableLowPowerMode();
        this.batteryOptimizer.optimizeForBackground();
        this.resourceManager.reserveResources();
    }

    public resetPerformanceData(): void {
        this.metricsHistory = [];
        this.memoryManager.reset();
        this.batteryOptimizer.reset();
        this.resourceManager.reset();
        this.performanceAnalytics.reset();
    }

    // Device-specific optimizations

    private getRenderStats() {
        return {
            fps: 60, // This would be calculated from actual render cycles
            frameTime: 16.67, // 60fps = 16.67ms per frame
            droppedFrames: 0,
            renderTime: 10,
            animationCount: 0,
        };
    }

    private getNetworkStats() {
        return {
            latency: 50,
            downloadSpeed: 1000000, // 1Mbps
            uploadSpeed: 500000, // 500kbps
            requestsCount: 0,
            cacheHitRate: 85,
            dataUsed: {
                sent: 0,
                received: 0,
            },
        };
    }

    public dispose(): void {
        this.stopMonitoring();
        this.memoryManager.dispose();
        this.batteryOptimizer.dispose();
        this.resourceManager.dispose();
        this.startupOptimizer.dispose();
        this.performanceAnalytics.dispose();
    }
}

// Export default instance
export default PerformanceMonitor.getInstance();