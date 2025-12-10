export const crossPlatformErrorLogger = {
    log: (message: string, details?: any) => console.log('[CrossPlatformLogger]', message, details),
    error: (error: any, context?: any) => console.error('[CrossPlatformLogger]', error, context),
    warn: (message: string, details?: any) => console.warn('[CrossPlatformLogger]', message, details),
    info: (message: string, details?: any) => console.info('[CrossPlatformLogger]', message, details),
    logError: (error: any, context?: any, details?: any) => {
        console.error('[CrossPlatformLogger] Error:', error, context, details);
        return `err_${Date.now()}`;
    },
    addBreadcrumb: (message: string, category?: string, level?: string, data?: any) => {
        console.log('[CrossPlatformLogger] Breadcrumb:', message, category, level, data);
    },
};
