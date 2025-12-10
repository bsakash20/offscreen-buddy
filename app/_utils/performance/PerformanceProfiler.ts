import { RenderStats } from '../../_types/performance';

export interface ProfilerOptions {
    enableMetrics: boolean;
    enableFrameTracking: boolean;
    enableMemoryProfiling: boolean;
    sampleRate: number; // 0-1, higher = more samples
    bufferSize: number;
}

export interface ProfilerFrame {
    timestamp: number;
    duration: number;
    fps: number;
    renderTime: number;
    memoryUsage?: number;
    components?: string[];
}

export interface PerformanceProfile {
    name: string;
    averageFPS: number;
    averageRenderTime: number;
    frameDrops: number;
    totalFrames: number;
    worstFrame: ProfilerFrame;
    bestFrame: ProfilerFrame;
    percentile95: number;
    percentile99: number;
}

export interface ComponentPerformance {
    componentName: string;
    mountTime: number;
    renderCount: number;
    totalRenderTime: number;
    averageRenderTime: number;
    isOptimized: boolean;
    suggestions: string[];
}

export class PerformanceProfiler {
    private options: ProfilerOptions;
    private isProfiling = false;
    private frameBuffer: ProfilerFrame[] = [];
    private componentMetrics: Map<string, ComponentPerformance> = new Map();

    // Frame tracking
    private lastFrameTime = 0;
    private frameCount = 0;
    private droppedFrames = 0;
    private frameHistory: number[] = [];

    // Memory tracking
    private memorySnapshots: Array<{ timestamp: number; usage: number }> = [];
    private peakMemoryUsage = 0;

    // Component tracking
    private activeComponents: Set<string> = new Set();
    private renderTimings: Map<string, number[]> = new Map();

    constructor(options: Partial<ProfilerOptions> = {}) {
        this.options = {
            enableMetrics: true,
            enableFrameTracking: true,
            enableMemoryProfiling: true,
            sampleRate: 1.0,
            bufferSize: 1000,
            ...options,
        };
    }

    public start(): void {
        if (this.isProfiling) return;

        this.isProfiling = true;
        this.frameBuffer = [];
        this.componentMetrics.clear();
        this.frameHistory = [];
        this.memorySnapshots = [];
        this.peakMemoryUsage = 0;

        console.log('Performance profiling started');
        this.startFrameTracking();

        if (this.options.enableMemoryProfiling) {
            this.startMemoryProfiling();
        }
    }

    public stop(): void {
        if (!this.isProfiling) return;

        this.isProfiling = false;
        console.log('Performance profiling stopped');
        console.log(`Collected ${this.frameBuffer.length} frames`);
        console.log(`Dropped ${this.droppedFrames} frames`);
        console.log(`Peak memory usage: ${this.formatBytes(this.peakMemoryUsage)}`);
    }

    public recordFrame(frameTime: number): void {
        if (!this.isProfiling || Math.random() > this.options.sampleRate) return;

        const now = Date.now();
        const fps = frameTime > 0 ? 1000 / frameTime : 60;
        const renderTime = frameTime;

        const frame: ProfilerFrame = {
            timestamp: now,
            duration: frameTime,
            fps,
            renderTime,
            memoryUsage: this.getCurrentMemoryUsage(),
            components: Array.from(this.activeComponents),
        };

        this.frameBuffer.push(frame);

        // Keep buffer size in check
        if (this.frameBuffer.length > this.options.bufferSize) {
            this.frameBuffer.shift();
        }

        // Track frame history for FPS calculation
        this.frameHistory.push(fps);
        if (this.frameHistory.length > 60) {
            this.frameHistory.shift();
        }

        // Detect frame drops
        if (fps < 45) {
            this.droppedFrames++;
        }

        // Update peak memory
        if (frame.memoryUsage && frame.memoryUsage > this.peakMemoryUsage) {
            this.peakMemoryUsage = frame.memoryUsage;
        }

        this.lastFrameTime = now;
        this.frameCount++;
    }

    public startComponentTiming(componentName: string): () => void {
        const startTime = performance.now();
        this.activeComponents.add(componentName);

        return () => {
            const duration = performance.now() - startTime;
            this.recordComponentRender(componentName, duration);
            this.activeComponents.delete(componentName);
        };
    }

    public recordComponentRender(componentName: string, renderTime: number): void {
        if (!this.options.enableMetrics) return;

        if (!this.renderTimings.has(componentName)) {
            this.renderTimings.set(componentName, []);
        }

        const timings = this.renderTimings.get(componentName)!;
        timings.push(renderTime);

        // Keep only recent timings
        if (timings.length > 100) {
            timings.shift();
        }

        // Update component metrics
        const renderCount = timings.length;
        const totalRenderTime = timings.reduce((sum, time) => sum + time, 0);
        const averageRenderTime = totalRenderTime / renderCount;

        this.componentMetrics.set(componentName, {
            componentName,
            mountTime: this.getComponentMountTime(componentName),
            renderCount,
            totalRenderTime,
            averageRenderTime,
            isOptimized: this.isComponentOptimized(componentName, averageRenderTime),
            suggestions: this.generateComponentSuggestions(componentName, averageRenderTime, renderCount),
        });
    }

    public getCurrentFPS(): number {
        if (this.frameHistory.length === 0) return 60;

        const recentFrames = this.frameHistory.slice(-10);
        const averageFPS = recentFrames.reduce((sum, fps) => sum + fps, 0) / recentFrames.length;

        return Math.round(averageFPS);
    }

    public getPerformanceProfile(name: string = 'default'): PerformanceProfile {
        if (this.frameBuffer.length === 0) {
            return this.createEmptyProfile(name);
        }

        const frames = this.frameBuffer;
        const renderTimes = frames.map(f => f.renderTime);
        const fpsValues = frames.map(f => f.fps);

        // Sort for percentiles
        const sortedRenderTimes = [...renderTimes].sort((a, b) => a - b);
        const sortedFPS = [...fpsValues].sort((a, b) => a - b);

        const totalFrames = frames.length;
        const frameDrops = frames.filter(f => f.fps < 45).length;

        const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / totalFrames;
        const averageFPS = fpsValues.reduce((sum, fps) => sum + fps, 0) / totalFrames;

        // Find best and worst frames
        const worstFrame = frames.reduce((worst, current) =>
            current.renderTime > worst.renderTime ? current : worst
        );
        const bestFrame = frames.reduce((best, current) =>
            current.renderTime < best.renderTime ? current : best
        );

        // Calculate percentiles
        const percentile95 = this.calculatePercentile(sortedRenderTimes, 95);
        const percentile99 = this.calculatePercentile(sortedRenderTimes, 99);

        return {
            name,
            averageFPS: Math.round(averageFPS),
            averageRenderTime: Math.round(averageRenderTime * 100) / 100,
            frameDrops,
            totalFrames,
            worstFrame,
            bestFrame,
            percentile95: Math.round(percentile95 * 100) / 100,
            percentile99: Math.round(percentile99 * 100) / 100,
        };
    }

    public getComponentPerformance(componentName: string): ComponentPerformance | null {
        return this.componentMetrics.get(componentName) || null;
    }

    public getAllComponentPerformance(): ComponentPerformance[] {
        return Array.from(this.componentMetrics.values());
    }

    public generateOptimizationReport(): {
        performance: PerformanceProfile;
        components: ComponentPerformance[];
        recommendations: string[];
        criticalIssues: string[];
    } {
        const performance = this.getPerformanceProfile();
        const components = this.getAllComponentPerformance();

        const recommendations: string[] = [];
        const criticalIssues: string[] = [];

        // Performance-based recommendations
        if (performance.averageFPS < 50) {
            recommendations.push('Average FPS is below 60 - consider reducing animation complexity');
            criticalIssues.push('Low frame rate detected');
        }

        if (performance.frameDrops > performance.totalFrames * 0.1) {
            recommendations.push('High frame drop rate - optimize render pipeline');
            criticalIssues.push('Excessive frame drops');
        }

        if (performance.percentile95 > 20) {
            recommendations.push('95th percentile frame time is high - investigate worst-case scenarios');
        }

        // Component-based recommendations
        components.forEach(comp => {
            if (comp.averageRenderTime > 10) {
                recommendations.push(`Component ${comp.componentName} has high render time (${comp.averageRenderTime.toFixed(1)}ms) - consider optimization`);
            }

            if (!comp.isOptimized) {
                recommendations.push(`Component ${comp.componentName} is not optimized - implement React.memo or similar optimizations`);
            }

            if (comp.renderCount > 100) {
                recommendations.push(`Component ${comp.componentName} renders frequently (${comp.renderCount} times) - check for unnecessary re-renders`);
            }
        });

        // Memory recommendations
        if (this.peakMemoryUsage > 100 * 1024 * 1024) { // 100MB
            recommendations.push('High memory usage detected - implement memory cleanup strategies');
            criticalIssues.push('High memory usage');
        }

        return {
            performance,
            components,
            recommendations,
            criticalIssues,
        };
    }

    public exportData(format: 'json' | 'csv' = 'json'): string {
        const data = {
            profile: this.getPerformanceProfile(),
            components: this.getAllComponentPerformance(),
            memorySnapshots: this.memorySnapshots,
            frameBuffer: this.frameBuffer,
            summary: {
                totalFrames: this.frameCount,
                droppedFrames: this.droppedFrames,
                peakMemoryUsage: this.peakMemoryUsage,
                profilingDuration: this.frameCount > 0 ?
                    this.frameBuffer[this.frameBuffer.length - 1].timestamp - this.frameBuffer[0].timestamp : 0,
            },
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else {
            return this.convertToCSV(data);
        }
    }

    public reset(): void {
        this.frameBuffer = [];
        this.componentMetrics.clear();
        this.frameHistory = [];
        this.memorySnapshots = [];
        this.droppedFrames = 0;
        this.frameCount = 0;
        this.peakMemoryUsage = 0;

        console.log('Performance profiler reset');
    }

    public dispose(): void {
        this.stop();
        this.reset();
    }

    // Private methods

    private startFrameTracking(): void {
        const trackFrame = () => {
            if (!this.isProfiling) return;

            const now = performance.now();
            if (this.lastFrameTime > 0) {
                const frameTime = now - this.lastFrameTime;
                this.recordFrame(frameTime);
            }

            requestAnimationFrame(trackFrame);
        };

        requestAnimationFrame(trackFrame);
    }

    private startMemoryProfiling(): void {
        setInterval(() => {
            if (!this.isProfiling) return;

            const memoryUsage = this.getCurrentMemoryUsage();
            this.memorySnapshots.push({
                timestamp: Date.now(),
                usage: memoryUsage,
            });

            // Keep only recent snapshots
            if (this.memorySnapshots.length > 100) {
                this.memorySnapshots.shift();
            }
        }, 5000); // Every 5 seconds
    }

    private getCurrentMemoryUsage(): number {
        // In a real implementation, this would get actual memory usage
        // For now, return a simulated value
        return Math.random() * 50 * 1024 * 1024; // 0-50MB
    }

    private getComponentMountTime(componentName: string): number {
        // This would track actual mount times in a real implementation
        return Math.random() * 100; // 0-100ms
    }

    private isComponentOptimized(componentName: string, renderTime: number): boolean {
        // Simple heuristic: components with render time < 5ms are considered optimized
        return renderTime < 5;
    }

    private generateComponentSuggestions(componentName: string, renderTime: number, renderCount: number): string[] {
        const suggestions: string[] = [];

        if (renderTime > 10) {
            suggestions.push('Consider using React.memo to prevent unnecessary re-renders');
            suggestions.push('Optimize component logic to reduce render time');
        }

        if (renderCount > 50) {
            suggestions.push('High render count detected - check dependencies in useEffect or useCallback');
            suggestions.push('Consider using useMemo for expensive calculations');
        }

        if (renderTime > renderCount * 0.1) {
            suggestions.push('Component is becoming a performance bottleneck - consider splitting or refactoring');
        }

        return suggestions;
    }

    private calculatePercentile(sortedArray: number[], percentile: number): number {
        if (sortedArray.length === 0) return 0;

        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        if (upper >= sortedArray.length) {
            return sortedArray[sortedArray.length - 1];
        }

        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }

    private createEmptyProfile(name: string): PerformanceProfile {
        return {
            name,
            averageFPS: 60,
            averageRenderTime: 0,
            frameDrops: 0,
            totalFrames: 0,
            worstFrame: {
                timestamp: 0,
                duration: 0,
                fps: 60,
                renderTime: 0,
            },
            bestFrame: {
                timestamp: 0,
                duration: 0,
                fps: 60,
                renderTime: 0,
            },
            percentile95: 0,
            percentile99: 0,
        };
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private convertToCSV(data: any): string {
        // Simple CSV conversion for frame data
        const headers = ['timestamp', 'duration', 'fps', 'renderTime', 'memoryUsage'];
        const rows = [headers.join(',')];

        data.frameBuffer.forEach((frame: any) => {
            rows.push([
                frame.timestamp,
                frame.duration,
                frame.fps,
                frame.renderTime,
                frame.memoryUsage || 0,
            ].join(','));
        });

        return rows.join('\n');
    }
}

// Utility functions for easy integration
export class ProfilerUtils {
    /**
     * Create a performance profiler with default settings
     */
    static createDefaultProfiler(): PerformanceProfiler {
        return new PerformanceProfiler({
            enableMetrics: true,
            enableFrameTracking: true,
            enableMemoryProfiling: true,
            sampleRate: 1.0,
            bufferSize: 1000,
        });
    }

    /**
     * Create a lightweight profiler for production
     */
    static createLightweightProfiler(): PerformanceProfiler {
        return new PerformanceProfiler({
            enableMetrics: true,
            enableFrameTracking: true,
            enableMemoryProfiling: false,
            sampleRate: 0.1, // 10% sample rate
            bufferSize: 100,
        });
    }

    /**
     * Create a detailed profiler for development
     */
    static createDetailedProfiler(): PerformanceProfiler {
        return new PerformanceProfiler({
            enableMetrics: true,
            enableFrameTracking: true,
            enableMemoryProfiling: true,
            sampleRate: 1.0, // 100% sample rate
            bufferSize: 5000,
        });
    }

    /**
     * Hook for React components
     */
    static useComponentProfiler(componentName: string): () => void {
        const profiler = ProfilerUtils.createDefaultProfiler();
        return profiler.startComponentTiming(componentName);
    }
}