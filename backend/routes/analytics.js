const express = require('express');
const { supabase } = require('../config/supabase');
// Security Middleware Imports
const { securityHeaders, inputSanitization } = require('../middleware/security');
const { ipLimiter } = require('../middleware/rateLimiter');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use(ipLimiter);
router.use(optionalAuth);

// Get payment analytics
router.get('/analytics', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    let targetUserId = userId;
    if (!userId && req.user) {
      targetUserId = req.user.id;
    }

    // Calculate total revenue using Supabase
    let revenueQuery = supabase
      .from('payment_events')
      .select('*');

    if (targetUserId) {
      revenueQuery = revenueQuery.eq('user_id', targetUserId);
    }
    if (startDate) {
      revenueQuery = revenueQuery.gte('created_at', startDate);
    }
    if (endDate) {
      revenueQuery = revenueQuery.lte('created_at', endDate);
    }

    const { data: paymentEvents } = await revenueQuery;

    // Calculate subscription metrics using Supabase
    let subscriptionQuery = supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)');

    const { data: subscriptions } = await subscriptionQuery;

    const revenue = paymentEvents || [];
    const subs = subscriptions || [];

    const totalRevenue = revenue
      .filter(event => ['checkout_completed', 'payment_succeeded'].includes(event.event_type))
      .reduce((sum, event) => sum + (event.amount || 0), 0);

    const payingCustomers = new Set(
      revenue
        .filter(event => ['checkout_completed', 'payment_succeeded'].includes(event.event_type))
        .map(event => event.user_id)
    ).size;

    const activeSubscriptions = subs.filter(sub => sub.status === 'active').length;
    const trialSubscriptions = subs.filter(sub => sub.status === 'trial').length;
    const newSubscriptions = subs.filter(sub =>
      new Date(sub.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const cancelledSubscriptions = subs.filter(sub =>
      sub.status === 'cancelled' &&
      new Date(sub.expires_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    const monthlyRecurringRevenue = subs
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.subscription_plans?.price_monthly || 0), 0);

    // Calculate rates
    const conversionRate = payingCustomers > 0 ? (payingCustomers / Math.max(payingCustomers, 1)) * 100 : 0;
    const churnRate = activeSubscriptions > 0 ? (cancelledSubscriptions / activeSubscriptions) * 100 : 0;
    const averageRevenuePerUser = payingCustomers > 0 ? totalRevenue / payingCustomers : 0;
    const customerLifetimeValue = payingCustomers > 0 ? totalRevenue / payingCustomers : 0;

    res.json({
      totalRevenue,
      activeSubscriptions,
      trialSubscriptions,
      conversionRate,
      churnRate,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      customerLifetimeValue,
      newSubscriptions,
      cancelledSubscriptions,
      refunds: 0, // Would be calculated from separate refunds table
      failedPayments: 0 // Would be calculated from failed payment events
    });
  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({
      error: 'Failed to get payment analytics',
      message: 'An unexpected error occurred'
    });
  }
});

// Get revenue metrics by period
router.get('/revenue-metrics', async (req, res) => {
  try {
    const { period = 'month', userId } = req.query;

    let targetUserId = userId;
    if (!userId && req.user) {
      targetUserId = req.user.id;
    }

    // Calculate date range based on period
    const now = new Date();
    const ranges = {
      day: 1,
      week: 7,
      month: 30,
      year: 365
    };
    const daysBack = ranges[period] || 30;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get payment events using Supabase
    let query = supabase
      .from('payment_events')
      .select('*')
      .in('event_type', ['checkout_completed', 'payment_succeeded'])
      .gte('created_at', startDate.toISOString());

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: paymentEvents } = await query;

    // Group by period
    const periodGroups = {};
    paymentEvents.forEach(event => {
      let periodKey;
      const eventDate = new Date(event.created_at);

      switch (period) {
        case 'day':
          periodKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(eventDate);
          weekStart.setDate(eventDate.getDate() - eventDate.getDay());
          periodKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD (week start)
          break;
        case 'year':
          periodKey = eventDate.getFullYear().toString(); // YYYY
          break;
        default: // month
          periodKey = eventDate.toISOString().substring(0, 7); // YYYY-MM
      }

      if (!periodGroups[periodKey]) {
        periodGroups[periodKey] = {
          period: periodKey,
          revenue: 0,
          subscriptions: new Set(),
          churn: 0,
          growth: 0
        };
      }

      periodGroups[periodKey].revenue += event.amount || 0;
      periodGroups[periodKey].subscriptions.add(event.user_id);
    });

    const result = Object.values(periodGroups).map(group => ({
      period: group.period,
      revenue: group.revenue,
      subscriptions: group.subscriptions.size,
      churn: group.churn,
      growth: group.growth
    }));

    res.json(result);
  } catch (error) {
    console.error('Get revenue metrics error:', error);
    res.status(500).json({
      error: 'Failed to get revenue metrics',
      message: 'An unexpected error occurred'
    });
  }
});

// Get subscription metrics
router.get('/subscription-metrics', async (req, res) => {
  try {
    const { userId } = req.query;

    let query = supabase
      .from('user_subscriptions')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions } = await query;

    const metrics = subscriptions || [];

    res.json({
      totalSubscriptions: metrics.length,
      activeSubscriptions: metrics.filter(sub => sub.status === 'active').length,
      trialSubscriptions: metrics.filter(sub => sub.status === 'trial').length,
      cancelledSubscriptions: metrics.filter(sub => sub.status === 'cancelled').length,
      newSubscriptions: metrics.filter(sub =>
        new Date(sub.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      reactivations: 0 // Would need cancelled_at field to calculate
    });
  } catch (error) {
    console.error('Get subscription metrics error:', error);
    res.status(500).json({
      error: 'Failed to get subscription metrics',
      message: 'An unexpected error occurred'
    });
  }
});

// Get payment events
router.get('/events', async (req, res) => {
  try {
    const { userId, limit = 100 } = req.query;

    let query = supabase
      .from('payment_events')
      .select(`
        *,
        users!payment_events_user_id_fkey (
          email
        )
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    const { data: paymentEvents } = await query;

    res.json(paymentEvents || []);
  } catch (error) {
    console.error('Get payment events error:', error);
    res.status(500).json({
      error: 'Failed to get payment events',
      message: 'An unexpected error occurred'
    });
  }
});

// Track payment event
router.post('/track', async (req, res) => {
  try {
    const { eventType, eventData, timestamp } = req.body;

    // This would typically come from authenticated user context
    const userId = req.user?.id || null;

    const { error } = await supabase
      .from('payment_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        amount: eventData.amount || 0,
        currency: eventData.currency || 'INR',
        provider: eventData.provider || 'payu',
        provider_event_id: eventData.eventId || null,
        metadata: JSON.stringify(eventData),
        created_at: timestamp ? new Date(timestamp) : new Date()
      });

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Track payment event error:', error);
    res.status(500).json({
      error: 'Failed to track payment event',
      message: 'An unexpected error occurred'
    });
  }
});

// PayU specific metrics
router.get('/payu/metrics', async (req, res) => {
  try {
    const { userId } = req.query;

    let query = supabase
      .from('payment_events')
      .select('*')
      .eq('provider', 'payu')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: paymentEvents } = await query;

    const events = paymentEvents || [];

    const metrics = {
      total_events: events.length,
      unique_users: new Set(events.map(event => event.user_id)).size,
      revenue: events
        .filter(event => ['payment_success', 'payment_verified', 'checkout_completed'].includes(event.event_type))
        .reduce((sum, event) => sum + (event.amount || 0), 0),
      failed_payments: events.filter(event => event.event_type === 'payment_failure').length,
      successful_payments: events
        .filter(event => ['payment_success', 'payment_verified'].includes(event.event_type)).length
    };

    // Calculate conversion rate and other PayU-specific metrics
    const conversionRate = metrics.unique_users > 0 ? (metrics.successful_payments / metrics.unique_users) * 100 : 0;

    res.json({
      ...metrics,
      conversion_rate: conversionRate,
      payment_success_rate: metrics.total_events > 0 ? (metrics.successful_payments / metrics.total_events) * 100 : 0
    });
  } catch (error) {
    console.error('Get PayU metrics error:', error);
    res.status(500).json({
      error: 'Failed to get PayU metrics',
      message: 'An unexpected error occurred'
    });
  }
});

// Legacy RevenueCat metrics (for backward compatibility - deprecated)
router.get('/revenuecat/metrics', async (req, res) => {
  res.status(410).json({
    error: 'Service Unavailable',
    message: 'RevenueCat integration has been removed. Please use PayU instead.'
  });
});

// Legacy Stripe metrics (for backward compatibility - deprecated)
router.get('/stripe/metrics', async (req, res) => {
  res.status(410).json({
    error: 'Service Unavailable',
    message: 'Stripe integration has been removed. Please use PayU instead.'
  });
});

// Export analytics data
router.post('/export', async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.body;

    // This would generate and return a download URL for the exported data
    // For now, return a mock response
    res.json({
      downloadUrl: `https://api.offscreenbuddy.com/exports/analytics-${Date.now()}.${format}`,
      format,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      error: 'Failed to export analytics',
      message: 'An unexpected error occurred'
    });
  }
});

module.exports = router;
