export const crashReportingService = {
    recordError: (error: any, context?: any) => console.log('[CrashReporting]', error, context),
    init: () => console.log('[CrashReporting] Initialized'),
    setUser: (userId: string) => console.log('[CrashReporting] User set:', userId),
};
