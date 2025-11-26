const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const {
  checkSupabaseConnection,
  checkDatabaseTables,
  createDefaultPlans,
  runEnhancedOnboardingMigration
} = require('./config/supabase');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/performanceLogger');
const { logger } = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subscriptionRoutes = require('./routes/subscriptions');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const payuRoutes = require('./routes/payu');
const payuWebhookRoutes = require('./routes/payu-webhooks');
const healthRoutes = require('./routes/health');

// Import PayU security configuration
const payuSecurity = require('./config/payuSecurity');

// Security middleware with PayU mobile app security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://secure.payu.in", "https://test.payu.in"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://secure.payu.in", "https://test.payu.in"],
      frameSrc: ["https://secure.payu.in", "https://test.payu.in"],
      objectSrc: ["'none'"],
      formAction: ["'self'", "https://secure.payu.in", "https://test.payu.in"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' }
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19006' // Expo web
  ],
  credentials: true
}));

// Body parsing middleware with PayU webhook support
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PayU webhook specific middleware - raw body parser for webhook verification
app.use('/api/payu/webhook', express.raw({
  type: 'application/x-www-form-urlencoded',
  limit: payuSecurity.maxWebhookSize
}));

// Performance and request logging middleware (must be before routes)
app.use(requestLogger);

// Health check endpoints


// API Routes with PayU mobile app security
// Health check endpoints (mounted at /api/health for consistency)
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment/subscriptions', subscriptionRoutes);
app.use('/api/payment/payu', payuRoutes);
app.use('/api/payu', payuWebhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// Log successful server startup
logger.info('Server configuration loaded', {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
  features: {
    healthMonitoring: true,
    performanceLogging: true,
    errorHandling: true,
    structuredLogging: true
  }
});

// Enhanced error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use(notFound);

// Initialize Supabase and start server
async function startServer() {
  logger.info('Starting server initialization...');

  try {
    // Check Supabase connectivity
    logger.info('Checking Supabase connectivity...');
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      logger.error('Failed to connect to Supabase');
      throw new Error('Supabase connection failed');
    }

    logger.info('Supabase connection successful');

    // Check database tables
    logger.info('Checking database tables...');
    await checkDatabaseTables();

    // Create default plans if needed
    logger.info('Creating default subscription plans...');
    await createDefaultPlans();

    // Run enhanced onboarding migration if needed
    logger.info('Running enhanced onboarding migration...');
    await runEnhancedOnboardingMigration();

    // Start the server - listen on all interfaces for mobile access
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        features: {
          healthMonitoring: true,
          performanceLogging: true,
          errorHandling: true,
          structuredLogging: true
        },
        access: {
          local: `http://localhost:${PORT}`,
          network: `http://0.0.0.0:${PORT}`
        }
      });

      // Console output for user feedback
      console.log(`\n🚀 Server running on port ${PORT} (accessible on all interfaces)`);
      console.log(`📱 Mobile apps can access the server via your computer's local IP address`);
      console.log(`💰 Payment provider: PayU (${process.env.NODE_ENV === 'production' ? 'Production' : 'Test Environment'})`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: Supabase`);
      console.log(`📊 Features: Health monitoring, performance logging, error handling`);
      console.log(`🔑 PayU Keys: ${process.env.PAYU_MERCHANT_KEY ? '✓ Configured' : '✗ Missing'}`);
      console.log(`\n✅ OffScreen Buddy Backend with comprehensive logging is ready!\n`);
    });

  } catch (error) {
    logger.error('Server startup failed', {
      error: error.message,
      stack: error.stack
    });

    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

// Start the server with initialization
startServer().catch(error => {
  logger.error('Server initialization failed', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

module.exports = app;