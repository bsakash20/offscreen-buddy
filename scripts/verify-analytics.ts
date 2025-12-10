
import analyticsService from '../app/_services/Premium/AnalyticsService';

async function verifyAnalytics() {
    console.log('Starting Analytics Verification...');

    // 1. Verify Get Analytics
    console.log('Fetching analytics...');
    const data = await analyticsService.getAnalytics();

    console.log('Analytics Data:', JSON.stringify(data, null, 2));

    if (data.sessionsCompleted >= 0) {
        console.log('✅ Sessions completed count is valid');
    } else {
        console.error('❌ Sessions completed count is invalid');
    }

    if (data.weeklyProgress && Array.isArray(data.weeklyProgress)) {
        console.log('✅ Weekly progress is array');
    } else {
        console.error('❌ Weekly progress is not array');
    }

    // 2. Verify Real Time Metrics
    const metrics = await analyticsService.getRealTimeMetrics();
    if (metrics.currentStreak >= 0) {
        console.log('✅ Real-time metrics valid');
    }

    // 3. Verify Export
    console.log('Testing export...');
    const csv = await analyticsService.exportAnalytics('csv');
    console.log('Exported file:', csv);

    console.log('Analytics Verification Completed.');
}

verifyAnalytics().catch(console.error);
