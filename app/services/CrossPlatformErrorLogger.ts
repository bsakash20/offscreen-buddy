export const crossPlatformErrorLogger = {
    log: (message: string, details?: any) => console.log('[CrossPlatformLogger]', message, details),
    error: (error: any, context?: any) => console.error('[CrossPlatformLogger]', error, context),
    warn: (message: string, details?: any) => console.warn('[CrossPlatformLogger]', message, details),
    info: (message: string, details?: any) => console.info('[CrossPlatformLogger]', message, details),
};
