import { StartupMetrics as StartupMetricsType } from '../../_types/performance';

export interface StartupPhase {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    dependencies?: string[];
    isCritical: boolean;
    resourceUsage?: {
        memory: number;
        network: number;
        cpu: number;
    };
}

export interface StartupAnalysis {
    phases: StartupPhase[];
    criticalPath: StartupPhase[];
    bottlenecks: StartupPhase[];
    optimizations: OptimizationRecommendation[];
    totalTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
    recommendations: string[];
    score: number; // 0-100
}

export interface OptimizationRecommendation {
    phaseName: string;
    currentTime: number;
    targetTime: number;
    improvement: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    implementation: string[];
}

export class StartupAnalyzer {
    private phases: StartupPhase[] = [];
    private isTracking = false;
    private startTime = 0;
    private criticalPhases = new Set<string>();

    // Performance thresholds
    private readonly THRESHOLDS = {
        totalStartup: 2000, // 2 seconds
        criticalPath: 1500, // 1.5 seconds
        timeToInteractive: 3000, // 3 seconds
        firstContentfulPaint: 1000, // 1 second
        perPhase: 300, // 300ms per phase
    };

    public startTracking(): void {
        if (this.isTracking) {
            console.warn('Startup tracking already active');
            return;
        }

        this.isTracking = true;
        this.startTime = performance.now();
        this.phases = [];
        this.criticalPhases.clear();

        console.log('Startup tracking initiated');
    }

    public endTracking(): StartupMetricsType {
        if (!this.isTracking) {
            console.warn('No active startup tracking to end');
            return this.getEmptyMetrics();
        }

        this.isTracking = false;

        const endTime = performance.now();
        const totalTime = endTime - this.startTime;

        // Complete any unfinished phases
        this.phases.forEach(phase => {
            if (!phase.endTime) {
                phase.endTime = endTime;
                phase.duration = phase.endTime - phase.startTime;
            }
        });

        // Create final metrics
        const metrics = this.createMetrics(totalTime);

        console.log('Startup tracking completed:', metrics);

        return metrics;
    }

    public addPhase(phase: Omit<StartupPhase, 'startTime'> & { startTime?: number }): void {
        if (!this.isTracking) {
            console.warn('Cannot add phase - startup tracking not active');
            return;
        }

        const startTime = phase.startTime || performance.now();

        const newPhase: StartupPhase = {
            ...phase,
            startTime,
            dependencies: phase.dependencies || [],
            isCritical: phase.isCritical || false,
        };

        this.phases.push(newPhase);

        if (newPhase.isCritical) {
            this.criticalPhases.add(newPhase.name);
        }

        console.log(`Added startup phase: ${phase.name} (${phase.isCritical ? 'critical' : 'non-critical'})`);
    }

    public completePhase(phaseName: string): void {
        const phase = this.phases.find(p => p.name === phaseName);
        if (!phase) {
            console.warn(`Phase not found: ${phaseName}`);
            return;
        }

        if (phase.endTime) {
            console.warn(`Phase ${phaseName} already completed`);
            return;
        }

        phase.endTime = performance.now();
        phase.duration = phase.endTime - phase.startTime;

        console.log(`Completed phase: ${phaseName} (${phase.duration.toFixed(2)}ms)`);
    }

    public analyzeStartup(): StartupAnalysis {
        if (this.phases.length === 0) {
            return this.createEmptyAnalysis();
        }

        // Calculate timing metrics
        const totalTime = this.phases.length > 0 ?
            Math.max(...this.phases.map(p => p.endTime || 0)) - this.startTime : 0;

        const timeToInteractive = this.calculateTimeToInteractive();
        const firstContentfulPaint = this.calculateFirstContentfulPaint();

        // Identify critical path
        const criticalPath = this.identifyCriticalPath();

        // Identify bottlenecks
        const bottlenecks = this.identifyBottlenecks();

        // Generate optimization recommendations
        const optimizations = this.generateOptimizations();

        // Generate recommendations
        const recommendations = this.generateRecommendations();

        // Calculate performance score
        const score = this.calculateStartupScore(totalTime, criticalPath, bottlenecks);

        return {
            phases: this.phases,
            criticalPath,
            bottlenecks,
            optimizations,
            totalTime,
            timeToInteractive,
            firstContentfulPaint,
            recommendations,
            score,
        };
    }

    public getCurrentMetrics(): StartupMetricsType | null {
        if (!this.isTracking) return null;

        const now = performance.now();
        const totalTime = now - this.startTime;

        // Complete any unfinished phases for current metrics
        const currentPhases = this.phases.map(phase => ({
            ...phase,
            endTime: phase.endTime || now,
            duration: (phase.endTime || now) - phase.startTime,
        }));

        return this.createMetrics(totalTime);
    }

    public compareWithBaseline(baseline: StartupAnalysis): {
        improvement: number;
        regressions: string[];
        progress: string[];
    } {
        const current = this.analyzeStartup();

        const timeImprovement = baseline.totalTime - current.totalTime;
        const improvement = (timeImprovement / baseline.totalTime) * 100;

        const regressions: string[] = [];
        const progress: string[] = [];

        // Compare phases
        current.phases.forEach(currentPhase => {
            const baselinePhase = baseline.phases.find(bp => bp.name === currentPhase.name);
            if (baselinePhase) {
                const phaseImprovement = baselinePhase.duration! - currentPhase.duration!;
                const phaseImprovementPercent = (phaseImprovement / baselinePhase.duration!) * 100;

                if (phaseImprovementPercent > 10) {
                    progress.push(`${currentPhase.name}: ${phaseImprovement.toFixed(1)}ms improvement (${phaseImprovementPercent.toFixed(1)}%)`);
                } else if (phaseImprovementPercent < -10) {
                    regressions.push(`${currentPhase.name}: ${Math.abs(phaseImprovement).toFixed(1)}ms regression (${Math.abs(phaseImprovementPercent).toFixed(1)}%)`);
                }
            }
        });

        return {
            improvement: Math.max(0, improvement),
            regressions,
            progress,
        };
    }

    public exportData(format: 'json' | 'csv' = 'json'): string {
        const analysis = this.analyzeStartup();

        if (format === 'json') {
            return JSON.stringify(analysis, null, 2);
        } else {
            return this.convertToCSV(analysis);
        }
    }

    public reset(): void {
        this.phases = [];
        this.criticalPhases.clear();
        this.isTracking = false;
        this.startTime = 0;

        console.log('Startup metrics reset');
    }

    // Predefined phase templates

    public static PHASES = {
        APP_LAUNCH: 'app_launch',
        NATIVE_LOAD: 'native_load',
        JS_LOAD: 'js_load',
        BUNDLE_PARSE: 'bundle_parse',
        MODULE_RESOLVE: 'module_resolve',
        INITIALIZE_REACT: 'initialize_react',
        RENDER_APP: 'render_app',
        FIRST_CONTENTFUL_PAINT: 'first_contentful_paint',
        INTERACTIVE: 'interactive',
        API_INITIALIZE: 'api_initialize',
        DATA_LOAD: 'data_load',
        ASSET_LOAD: 'asset_load',
    } as const;

    public static createPhase(
        name: string,
        isCritical = false,
        dependencies: string[] = []
    ): Omit<StartupPhase, 'startTime'> {
        return {
            name,
            dependencies,
            isCritical,
            resourceUsage: {
                memory: 0,
                network: 0,
                cpu: 0,
            },
        };
    }

    // Private methods

    private createMetrics(totalTime: number): StartupMetricsType {
        const timeToInteractive = this.calculateTimeToInteractive();
        const firstContentfulPaint = this.calculateFirstContentfulPaint();
        const componentsLoaded = this.phases
            .filter(p => p.name.includes('component') || p.name.includes('load'))
            .map(p => p.name);

        return {
            totalTime,
            jsLoadTime: this.getPhaseTime('js_load') || 0,
            nativeLoadTime: this.getPhaseTime('native_load') || 0,
            renderTime: this.getPhaseTime('render_app') || 0,
            mountTime: this.getPhaseTime('interactive') || 0,
            timeToInteractive,
            firstContentfulPaint,
            componentsLoaded,
        };
    }

    private getEmptyMetrics(): StartupMetricsType {
        return {
            totalTime: 0,
            jsLoadTime: 0,
            nativeLoadTime: 0,
            renderTime: 0,
            mountTime: 0,
            timeToInteractive: 0,
            firstContentfulPaint: 0,
            componentsLoaded: [],
        };
    }

    private createEmptyAnalysis(): StartupAnalysis {
        return {
            phases: [],
            criticalPath: [],
            bottlenecks: [],
            optimizations: [],
            totalTime: 0,
            timeToInteractive: 0,
            firstContentfulPaint: 0,
            recommendations: [],
            score: 100,
        };
    }

    private calculateTimeToInteractive(): number {
        const interactivePhase = this.phases.find(p => p.name === 'interactive');
        if (interactivePhase && interactivePhase.endTime) {
            return interactivePhase.endTime - this.startTime;
        }

        // Fallback: use last critical phase
        const lastCriticalPhase = this.phases
            .filter(p => p.isCritical)
            .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];

        return lastCriticalPhase?.endTime ? lastCriticalPhase.endTime - this.startTime : 0;
    }

    private calculateFirstContentfulPaint(): number {
        const fcpPhase = this.phases.find(p => p.name === 'first_contentful_paint');
        if (fcpPhase && fcpPhase.endTime) {
            return fcpPhase.endTime - this.startTime;
        }

        // Fallback: use render app phase
        const renderPhase = this.phases.find(p => p.name === 'render_app');
        if (renderPhase && renderPhase.endTime) {
            return renderPhase.endTime - this.startTime;
        }

        return 0;
    }

    private identifyCriticalPath(): StartupPhase[] {
        // Build dependency graph
        const phaseMap = new Map(this.phases.map(p => [p.name, p]));

        // Simple critical path identification: phases that have no non-critical dependencies
        const criticalPath = this.phases.filter(phase => {
            if (!phase.isCritical) return false;

            // Check if all dependencies are also critical or completed
            const dependenciesMet = (phase.dependencies || []).every(dep => {
                const depPhase = phaseMap.get(dep);
                return !depPhase || !depPhase.isCritical || depPhase.endTime;
            });

            return dependenciesMet;
        });

        // Sort by start time
        return criticalPath.sort((a, b) => a.startTime - b.startTime);
    }

    private identifyBottlenecks(): StartupPhase[] {
        return this.phases
            .filter(phase => phase.duration! > this.THRESHOLDS.perPhase)
            .sort((a, b) => b.duration! - a.duration!);
    }

    private generateOptimizations(): OptimizationRecommendation[] {
        const optimizations: OptimizationRecommendation[] = [];

        this.phases.forEach(phase => {
            if (phase.duration! > this.THRESHOLDS.perPhase) {
                const improvement = phase.duration! - this.THRESHOLDS.perPhase;
                const targetTime = this.THRESHOLDS.perPhase;

                optimizations.push({
                    phaseName: phase.name,
                    currentTime: phase.duration!,
                    targetTime,
                    improvement: `Reduce ${phase.name} from ${phase.duration!.toFixed(1)}ms to ${targetTime}ms`,
                    effort: this.estimateEffort(phase.name),
                    impact: improvement > 100 ? 'high' : improvement > 50 ? 'medium' : 'low',
                    implementation: this.getImplementationSuggestions(phase.name),
                });
            }
        });

        return optimizations.sort((a, b) => b.impact.localeCompare(a.impact));
    }

    private estimateEffort(phaseName: string): 'low' | 'medium' | 'high' {
        // Heuristic effort estimation based on phase type
        if (phaseName.includes('load') || phaseName.includes('bundle')) {
            return 'medium';
        }

        if (phaseName.includes('render') || phaseName.includes('initialize')) {
            return 'high';
        }

        if (phaseName.includes('api') || phaseName.includes('data')) {
            return 'low';
        }

        return 'medium';
    }

    private getImplementationSuggestions(phaseName: string): string[] {
        const suggestions: Record<string, string[]> = {
            'js_load': [
                'Enable code splitting',
                'Use React Native Hermes',
                'Optimize bundle size with tree shaking'
            ],
            'bundle_parse': [
                'Implement lazy loading',
                'Use dynamic imports',
                'Optimize module dependencies'
            ],
            'render_app': [
                'Use React.memo for expensive components',
                'Optimize component hierarchy',
                'Reduce unnecessary re-renders'
            ],
            'api_initialize': [
                'Cache API responses',
                'Use connection pooling',
                'Optimize API calls'
            ],
            'data_load': [
                'Implement data prefetching',
                'Use pagination for large datasets',
                'Optimize database queries'
            ],
        };

        return suggestions[phaseName] || [
            'Profile the phase to identify bottlenecks',
            'Consider caching strategies',
            'Optimize resource usage'
        ];
    }

    private generateRecommendations(): string[] {
        const recommendations: string[] = [];
        const analysis = this.analyzeStartup();

        if (analysis.totalTime > this.THRESHOLDS.totalStartup) {
            recommendations.push(`Startup time exceeds ${this.THRESHOLDS.totalStartup}ms threshold. Focus on optimizing critical path phases.`);
        }

        if (analysis.timeToInteractive > this.THRESHOLDS.timeToInteractive) {
            recommendations.push('Time to interactive is high. Prioritize making the app interactive as early as possible.');
        }

        if (analysis.firstContentfulPaint > this.THRESHOLDS.firstContentfulPaint) {
            recommendations.push('First contentful paint is slow. Optimize initial rendering and content loading.');
        }

        if (analysis.bottlenecks.length > 0) {
            recommendations.push(`${analysis.bottlenecks.length} bottlenecks detected. Focus optimization efforts on these phases.`);
        }

        // Device-specific recommendations
        const hour = new Date().getHours();
        if (hour >= 0 && hour <= 6) {
            recommendations.push('Night hours detected - good time for intensive background optimizations.');
        }

        return recommendations;
    }

    private calculateStartupScore(
        totalTime: number,
        criticalPath: StartupPhase[],
        bottlenecks: StartupPhase[]
    ): number {
        let score = 100;

        // Time penalties
        if (totalTime > this.THRESHOLDS.totalStartup) {
            score -= Math.min(50, (totalTime - this.THRESHOLDS.totalStartup) / 100);
        }

        // Critical path penalties
        const criticalPathTime = criticalPath.reduce((sum, phase) => sum + (phase.duration || 0), 0);
        if (criticalPathTime > this.THRESHOLDS.criticalPath) {
            score -= Math.min(30, (criticalPathTime - this.THRESHOLDS.criticalPath) / 50);
        }

        // Bottleneck penalties
        score -= Math.min(20, bottlenecks.length * 5);

        return Math.max(0, Math.round(score));
    }

    private getPhaseTime(phaseName: string): number | undefined {
        const phase = this.phases.find(p => p.name === phaseName);
        return phase?.duration;
    }

    private convertToCSV(analysis: StartupAnalysis): string {
        const headers = ['Phase', 'Start Time', 'Duration', 'Critical', 'Dependencies'];
        const rows = [headers.join(',')];

        analysis.phases.forEach(phase => {
            rows.push([
                phase.name,
                phase.startTime.toFixed(2),
                (phase.duration || 0).toFixed(2),
                phase.isCritical ? 'Yes' : 'No',
                (phase.dependencies || []).join(';'),
            ].join(','));
        });

        return rows.join('\n');
    }
}

// Utility class for easy startup measurement
export class StartupMeasurer {
    private analyzer = new StartupAnalyzer();

    public start(): void {
        this.analyzer.startTracking();
    }

    public end(): StartupAnalysis {
        const results = this.analyzer.analyzeStartup();
        this.analyzer.reset();
        return results;
    }

    public addPhase(name: string, isCritical = false, dependencies: string[] = []): void {
        this.analyzer.addPhase(StartupAnalyzer.createPhase(name, isCritical, dependencies));
    }

    public completePhase(name: string): void {
        this.analyzer.completePhase(name);
    }
}