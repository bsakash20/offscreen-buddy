/**
 * PayU Mobile App Security Configuration
 * Enhanced security for PayU mobile app integration
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

/**
 * PayU Mobile App Security Middleware
 */
class PayUMobileSecurity {
    constructor() {
        this.webhookSecret = process.env.PAYU_WEBHOOK_SECRET || 'eS2I5u4ic00hxq7bx3PLCySTkuzTGm4i';
        this.encryptionKey = process.env.PAYU_ENCRYPTION_KEY || 'default_encryption_key_32_chars';
        this.maxWebhookSize = '2mb';
        this.webhookTimeout = 30000; // 30 seconds
    }

    /**
     * Generate secure hash for PayU parameters
     */
    generateSecureHash(params) {
        const hashSequence = [
            params.key,
            params.txnid,
            params.amount,
            params.productinfo,
            params.firstname,
            params.email,
            params.udf1 || '',
            params.udf2 || '',
            params.udf3 || '',
            params.udf4 || '',
            params.udf5 || '',
            params.surl,
            params.furl,
            this.webhookSecret
        ].join('|');

        return crypto.createHash('sha512').update(hashSequence).digest('hex');
    }

    /**
     * Verify PayU callback authenticity
     */
    verifyCallbackAuthenticity(callbackData, receivedHash) {
        try {
            const expectedHash = this.generateSecureHash(callbackData);
            return crypto.timingSafeEqual(
                Buffer.from(expectedHash, 'hex'),
                Buffer.from(receivedHash, 'hex')
            );
        } catch (error) {
            console.error('PayU callback verification error:', error);
            return false;
        }
    }

    /**
     * Encrypt sensitive payment data
     */
    encryptPaymentData(data) {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, this.encryptionKey);
        cipher.setAAD(Buffer.from('PayU Mobile App'), {
            plaintextLength: Buffer.byteLength(JSON.stringify(data))
        });

        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Decrypt payment data
     */
    decryptPaymentData(encryptedData) {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
        decipher.setAAD(Buffer.from('PayU Mobile App'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    /**
     * Generate secure transaction ID
     */
    generateSecureTxnid(userId, planId) {
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(8).toString('hex');
        const hash = crypto.createHash('sha256')
            .update(`${userId}_${planId}_${timestamp}_${randomBytes}`)
            .digest('hex')
            .substring(0, 12);

        return `txn_${timestamp}_${hash}`;
    }

    /**
     * PayU webhook rate limiting
     */
    getWebhookRateLimit() {
        return rateLimit({
            windowMs: 60000, // 1 minute
            max: 10, // limit each IP to 10 webhook requests per minute
            message: {
                error: 'Too many PayU webhook requests from this IP',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true,
            handler: (req, res) => {
                console.warn('PayU webhook rate limit exceeded:', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                });

                res.status(429).json({
                    error: 'Too many requests',
                    message: 'Rate limit exceeded for PayU webhook endpoint',
                    retryAfter: 60
                });
            }
        });
    }

    /**
     * PayU API rate limiting
     */
    getPayURateLimit() {
        return rateLimit({
            windowMs: 60000, // 1 minute
            max: 60, // limit each IP to 60 requests per minute
            message: {
                error: 'Too many PayU API requests from this IP',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                console.warn('PayU API rate limit exceeded:', {
                    ip: req.ip,
                    endpoint: req.path,
                    userAgent: req.get('User-Agent')
                });

                res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Too many requests to PayU API',
                    retryAfter: 60
                });
            }
        });
    }

    /**
     * Security headers for PayU mobile apps
     */
    getSecurityHeaders() {
        return helmet({
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
                    mediaSrc: ["'self'"],
                    childSrc: ["'none'"],
                    workerSrc: ["'self'"],
                    formAction: ["'self'", "https://secure.payu.in", "https://test.payu.in"],
                    baseUri: ["'self'"],
                    upgradeInsecureRequests: []
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            xssFilter: true,
            noSniff: true,
            frameguard: {
                action: 'deny'
            },
            ieNoOpen: true,
            noSniff: true,
            originAgentCluster: true,
            permissionsPolicy: {
                camera: [],
                microphone: [],
                geolocation: [],
                payment: ["'self'"]
            }
        });
    }

    /**
     * Input validation and sanitization for PayU
     */
    validatePayUInput(req, res, next) {
        try {
            // Sanitize request body
            if (req.body && typeof req.body === 'object') {
                const sanitized = {};

                for (const [key, value] of Object.entries(req.body)) {
                    if (typeof value === 'string') {
                        // Remove potentially dangerous characters
                        sanitized[key] = value
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/javascript:/gi, '')
                            .replace(/on\w+="[^"]*"/gi, '')
                            .trim();
                    } else {
                        sanitized[key] = value;
                    }
                }

                req.body = sanitized;
            }

            // Validate required PayU fields
            const requiredFields = ['key', 'txnid', 'amount', 'productinfo', 'surl', 'furl'];
            for (const field of requiredFields) {
                if (!req.body[field]) {
                    return res.status(400).json({
                        error: 'Missing required field',
                        field: field
                    });
                }
            }

            // Validate amount format
            const amount = parseFloat(req.body.amount);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    error: 'Invalid amount format',
                    field: 'amount'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (req.body.email && !emailRegex.test(req.body.email)) {
                return res.status(400).json({
                    error: 'Invalid email format',
                    field: 'email'
                });
            }

            // Validate transaction ID format
            const txnidRegex = /^[a-zA-Z0-9_-]{10,50}$/;
            if (!txnidRegex.test(req.body.txnid)) {
                return res.status(400).json({
                    error: 'Invalid transaction ID format',
                    field: 'txnid'
                });
            }

            next();
        } catch (error) {
            console.error('PayU input validation error:', error);
            res.status(500).json({
                error: 'Input validation failed'
            });
        }
    }

    /**
     * Request logging for PayU operations
     */
    logPayURequest(req, res, next) {
        const requestId = req.id || crypto.randomUUID();
        req.id = requestId;

        console.log('PayU Request:', {
            requestId,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type'),
            timestamp: new Date().toISOString()
        });

        res.on('finish', () => {
            console.log('PayU Response:', {
                requestId,
                status: res.statusCode,
                duration: Date.now() - new Date(req.startTime || Date.now()).getTime(),
                timestamp: new Date().toISOString()
            });
        });

        req.startTime = Date.now();
        next();
    }

    /**
     * Environment-specific security configuration
     */
    getEnvironmentSecurityConfig() {
        const isProduction = process.env.NODE_ENV === 'production';

        return {
            enforceHttps: isProduction,
            allowInsecureConnections: !isProduction,
            enableDetailedLogging: !isProduction,
            maxPayloadSize: isProduction ? '1mb' : '2mb',
            enableRequestLogging: true,
            enableResponseLogging: !isProduction,
            enableErrorLogging: true,
            enableAuditTrail: isProduction
        };
    }
}

module.exports = new PayUMobileSecurity();