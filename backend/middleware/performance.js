const { logRequest } = require('../config/logger');

/**
 * Performance Monitoring Middleware
 * Logs request duration and details
 */
const performanceLogger = (req, res, next) => {
  const start = Date.now();

  // Hook into response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, res, duration);
  });

  next();
};

module.exports = performanceLogger;