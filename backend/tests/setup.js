// Mock Axios for PayU/External checks
jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ status: 200 }),
    post: jest.fn().mockResolvedValue({ data: {} })
}));

// Mock Supabase to prevent actual DB calls during unit tests
jest.mock('../config/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })),
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
        }
    },
    checkSupabaseConnection: jest.fn().mockResolvedValue(true),
    checkDatabaseTables: jest.fn().mockResolvedValue(true),
    createDefaultPlans: jest.fn().mockResolvedValue(true),
    runEnhancedOnboardingMigration: jest.fn().mockResolvedValue(true)
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                limit: jest.fn(() => ({
                    maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
                    single: jest.fn().mockResolvedValue({ data: {}, error: null })
                })),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null })
            })),
        })),
    }))
}));

// Mock Logger
jest.mock('../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock Security Config to avoid loading complex logic
jest.mock('../config/security', () => ({
    getSecurityConfig: () => ({
        database: { audit: { enabled: false } },
        connection: { maxPayloadSize: 1024 },
        authentication: {
            session: { timeout: 30, cookie: { maxAge: 3600000 } },
            jwt: { secret: 'test-secret', verify: {} },
            password: { lockoutThreshold: 5, lockoutDuration: 900000 },
            tokens: { expiry: 3600 }
        },
        network: { access: { control: { enabled: false } } },
        environment: 'test'
    }),
    isSecurityProd: () => false
}));

// Mock Rate Limiter Middleware
jest.mock('../middleware/rateLimiter', () => ({
    authLimiter: (req, res, next) => next(),
    paymentLimiter: (req, res, next) => next(),
    sensitiveLimiter: (req, res, next) => next(),
    ipLimiter: (req, res, next) => next()
}));

// Mock Security Middleware
jest.mock('../middleware/security', () => ({
    logSecurityEvent: jest.fn(),
    applySecurity: (req, res, next) => next(),
    securityHeaders: (req, res, next) => next(),
    inputValidation: (req, res, next) => next(),
    inputSanitization: (req, res, next) => next(),
    csrfProtection: (req, res, next) => next()
}));
