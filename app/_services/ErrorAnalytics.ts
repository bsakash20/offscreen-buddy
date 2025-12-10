export const errorAnalyticsService = {
    trackError: (error: any, severity?: string) => console.log('[ErrorAnalytics] Tracked:', error, severity),
    getStats: () => ({ total: 0, recent: 0 }),
};
