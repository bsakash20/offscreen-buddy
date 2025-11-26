module.exports = {
  development: {
    server: {
      port: parseInt(process.env.PORT) || 3001,
      host: 'localhost',
      nodeEnv: 'development'
    },
    
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      name: process.env.DB_NAME || 'offscreen_buddy_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    
    logging: {
      level: 'debug',
      enableConsole: true,
      enableRemote: false
    },
    
    security: {
      enforceHttps: false,
      allowInsecureConnections: true,
      csrfProtection: false,
      rateLimitEnabled: false
    },
    
    features: {
      debugMode: true,
      mockPayments: true,
      analytics: false,
      crashReporting: false
    }
  }
};
