export const performanceMonitoringService = {
    startTrace: (name: string) => ({ stop: () => console.log('[Performance] Trace stopped:', name) }),
    recordMetric: (name: string, value: number) => console.log('[Performance] Metric:', name, value),
    trackOperation: (name: string, duration: number, metadata?: any) => {
        console.log('[Performance] Operation:', name, duration, metadata);
    },
};
