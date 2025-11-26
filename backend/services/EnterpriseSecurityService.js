/**
 * Enterprise Security Service
 * Backend security monitoring, threat detection, and incident response
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { supabase } = require('../config/supabase');
const { getSecurityConfig } = require('../config/security');

class EnterpriseSecurityService {
    constructor() {
        this.config = getSecurityConfig();
        this.threatPatterns = this.initializeThreatPatterns();
        this.securityEvents = new Map();
        this.incidentResponse = new Map();
        this.securityMetrics = {
            threatsDetected: 0,
            incidentsResolved: 0,
            falsePositives: 0,
            lastUpdated: new Date()
        };
    }

    /**
     * Initialize threat detection patterns
     */
    initializeThreatPatterns() {
        return {
            // SQL Injection patterns
            sqlInjection: [
                /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
                /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\b)/i,
                /(\b(UNION|SELECT)\s+.*\b(FROM|INTO|WHERE)\b)/i
            ],

            // XSS patterns
            xss: [
                /<script[^>]*>.*?<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /<iframe[^>]*>.*?<\/iframe>/gi
            ],

            // Command injection patterns
            commandInjection: [
                /[;&|`$(){}\[\]\\]/,
                /(curl|wget|nc|netcat|telnet|ssh)/i
            ],

            // Suspicious file upload patterns
            fileUpload: [
                /\.php$/i,
                /\.jsp$/i,
                /\.asp$/i,
                /\.aspx$/i,
                /\.exe$/i,
                /\.bat$/i,
                /\.sh$/i
            ],

            // Brute force patterns
            bruteForce: [
                /(password|passwd|pwd)\s*[:=]\s*['"][^'"]*['"]/i,
                /(login|signin)\s*[:=]\s*['"][^'"]*['"]/i
            ]
        };
    }

    /**
     * Comprehensive security monitoring
     */
    async monitorSecurity(request, response, next) {
        try {
            const startTime = Date.now();

            // Analyze request for threats
            const threatAnalysis = await this.analyzeRequestThreats(request);

            // Log security event
            await this.logSecurityEvent({
                type: 'request_analysis',
                requestId: this.generateRequestId(),
                method: request.method,
                url: request.url,
                userAgent: request.get('User-Agent'),
                ipAddress: this.getClientIP(request),
                threatLevel: threatAnalysis.threatLevel,
                threats: threatAnalysis.threats,
                duration: Date.now() - startTime
            });

            // Take action based on threat level
            await this.handleThreatResponse(threatAnalysis, request, response);

            next();
        } catch (error) {
            console.error('Security monitoring error:', error);
            await this.handleSecurityError(error, request);
            next();
        }
    }

    /**
     * Analyze request for security threats
     */
    async analyzeRequestThreats(request) {
        const threats = [];
        let threatLevel = 'low';

        // Check URL for threats
        const urlThreats = this.checkThreatPatterns(request.url, this.threatPatterns.sqlInjection, 'URL_SQL_INJECTION');
        threats.push(...urlThreats);

        // Check query parameters
        if (request.query) {
            const queryThreats = this.analyzeObjectThreats(request.query, 'QUERY_PARAMETER');
            threats.push(...queryThreats);
        }

        // Check request body
        if (request.body) {
            const bodyThreats = await this.analyzeObjectThreats(request.body, 'REQUEST_BODY');
            threats.push(...bodyThreats);
        }

        // Check headers
        const headerThreats = this.analyzeHeaders(request.headers);
        threats.push(...headerThreats);

        // Determine overall threat level
        if (threats.some(t => t.severity === 'critical')) {
            threatLevel = 'critical';
        } else if (threats.some(t => t.severity === 'high')) {
            threatLevel = 'high';
        } else if (threats.some(t => t.severity === 'medium')) {
            threatLevel = 'medium';
        }

        return {
            threatLevel,
            threats,
            riskScore: this.calculateRiskScore(threats)
        };
    }

    /**
     * Check object for security threats
     */
    analyzeObjectThreats(obj, source, depth = 0) {
        if (depth > 5) return []; // Prevent infinite recursion

        const threats = [];
        const maxDepth = 10;
        const maxArrayLength = 100;
        const maxStringLength = 10000;

        // Validate object depth
        if (depth > maxDepth) {
            threats.push({
                type: 'DEPTH_LIMIT_EXCEEDED',
                severity: 'medium',
                message: 'Object nesting depth exceeded security limit',
                source,
                value: 'NESTING_LIMIT'
            });
            return threats;
        }

        if (Array.isArray(obj)) {
            // Validate array length
            if (obj.length > maxArrayLength) {
                threats.push({
                    type: 'ARRAY_LENGTH_EXCEEDED',
                    severity: 'medium',
                    message: 'Array length exceeded security limit',
                    source,
                    value: obj.length.toString()
                });
                return threats;
            }

            // Recursively check array elements
            for (let i = 0; i < obj.length; i++) {
                threats.push(...this.analyzeObjectThreats(obj[i], `${source}[${i}]`, depth + 1));
            }
        } else if (typeof obj === 'object' && obj !== null) {
            // Recursively check object properties
            for (const [key, value] of Object.entries(obj)) {
                threats.push(...this.analyzeObjectThreats(value, `${source}.${key}`, depth + 1));
            }
        } else if (typeof obj === 'string') {
            // Validate string length
            if (obj.length > maxStringLength) {
                threats.push({
                    type: 'STRING_LENGTH_EXCEEDED',
                    severity: 'medium',
                    message: 'String length exceeded security limit',
                    source,
                    value: obj.substring(0, 50) + '...'
                });
                return threats;
            }

            // Check string content against threat patterns
            const stringThreats = this.checkThreatPatterns(obj, Object.values(this.threatPatterns).flat(), 'STRING_CONTENT');
            threats.push(...stringThreats);
        }

        return threats;
    }

    /**
     * Analyze request headers for threats
     */
    analyzeHeaders(headers) {
        const threats = [];
        const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];

        // Check for suspicious header patterns
        for (const [headerName, headerValue] of Object.entries(headers)) {
            if (typeof headerValue === 'string') {
                const headerThreats = this.checkThreatPatterns(headerValue,
                    this.threatPatterns.commandInjection, 'HEADER_INJECTION');
                threats.push(...headerThreats);

                // Check for header injection attempts
                if (headerName.toLowerCase().includes('host') && headerValue.includes('<')) {
                    threats.push({
                        type: 'HEADER_XSS',
                        severity: 'high',
                        message: 'XSS attempt in header',
                        source: `HEADER_${headerName.toUpperCase()}`,
                        value: headerValue.substring(0, 50)
                    });
                }
            }
        }

        return threats;
    }

    /**
     * Check string against threat patterns
     */
    checkThreatPatterns(input, patterns, threatType) {
        const threats = [];

        for (const pattern of patterns) {
            if (pattern.test(input)) {
                let severity = 'low';
                let message = `Potential ${threatType} detected`;

                // Determine severity based on threat type
                if (threatType.includes('SQL') || threatType.includes('COMMAND')) {
                    severity = 'high';
                    message = `Critical ${threatType} pattern detected`;
                } else if (threatType.includes('XSS')) {
                    severity = 'medium';
                    message = `XSS pattern detected`;
                }

                threats.push({
                    type: threatType,
                    severity,
                    message,
                    pattern: pattern.toString(),
                    value: input.substring(0, 100) // Limit captured value
                });
            }
        }

        return threats;
    }

    /**
     * Calculate overall risk score
     */
    calculateRiskScore(threats) {
        let score = 0;

        for (const threat of threats) {
            switch (threat.severity) {
                case 'critical':
                    score += 90;
                    break;
                case 'high':
                    score += 70;
                    break;
                case 'medium':
                    score += 40;
                    break;
                case 'low':
                    score += 20;
                    break;
            }
        }

        return Math.min(score, 100);
    }

    /**
     * Handle threat response based on analysis
     */
    async handleThreatResponse(threatAnalysis, request, response) {
        const { threatLevel, threats, riskScore } = threatAnalysis;

        // Log the security incident
        await this.logSecurityIncident({
            requestId: this.generateRequestId(),
            threatLevel,
            threats,
            riskScore,
            clientInfo: {
                ip: this.getClientIP(request),
                userAgent: request.get('User-Agent'),
                method: request.method,
                url: request.url
            }
        });

        // Take action based on threat level
        switch (threatLevel) {
            case 'critical':
                await this.handleCriticalThreat(threats, request, response);
                break;
            case 'high':
                await this.handleHighThreat(threats, request, response);
                break;
            case 'medium':
                await this.handleMediumThreat(threats, request, response);
                break;
            default:
                // Low threat - continue with request
                break;
        }
    }

    /**
     * Handle critical security threats
     */
    async handleCriticalThreat(threats, request, response) {
        // Immediately block the request
        response.status(403).json({
            error: 'SECURITY_VIOLATION',
            message: 'Request blocked due to critical security threat',
            threatType: threats[0]?.type,
            timestamp: new Date().toISOString()
        });

        // Initiate incident response
        await this.initiateIncidentResponse({
            level: 'CRITICAL',
            type: 'SECURITY_BREACH',
            threats,
            source: this.getClientIP(request)
        });

        // Update security metrics
        this.securityMetrics.threatsDetected++;
    }

    /**
     * Handle high-level security threats
     */
    async handleHighThreat(threats, request, response) {
        // Add additional security headers
        response.setHeader('X-Security-Status', 'monitored');
        response.setHeader('X-Request-ID', this.generateRequestId());

        // Continue processing but flag for monitoring
        request.securityFlagged = true;
        request.securityThreats = threats;

        // Log for security team review
        await this.flagForReview(threats, request);
    }

    /**
     * Handle medium-level security threats
     */
    async handleMediumThreat(threats, request, response) {
        // Add monitoring headers
        response.setHeader('X-Security-Status', 'flagged');
        response.setHeader('X-Request-ID', this.generateRequestId());

        // Continue processing with enhanced monitoring
        request.securityFlagged = true;
    }

    /**
     * Log security event to database
     */
    async logSecurityEvent(eventData) {
        try {
            await supabase
                .from('security_events')
                .insert({
                    event_id: this.generateEventId(),
                    event_type: eventData.type,
                    request_id: eventData.requestId,
                    user_id: eventData.userId || null,
                    ip_address: eventData.ipAddress,
                    user_agent: eventData.userAgent,
                    threat_level: eventData.threatLevel || 'low',
                    threats: JSON.stringify(eventData.threats || []),
                    risk_score: eventData.riskScore || 0,
                    metadata: JSON.stringify({
                        method: eventData.method,
                        url: eventData.url,
                        duration: eventData.duration
                    }),
                    created_at: new Date().toISOString()
                });

        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Log security incident
     */
    async logSecurityIncident(incidentData) {
        try {
            await supabase
                .from('security_incidents')
                .insert({
                    incident_id: this.generateIncidentId(),
                    threat_level: incidentData.threatLevel,
                    risk_score: incidentData.riskScore,
                    threats: JSON.stringify(incidentData.threats),
                    client_info: JSON.stringify(incidentData.clientInfo),
                    status: 'OPEN',
                    created_at: new Date().toISOString()
                });

            // Store in memory for real-time monitoring
            this.incidentResponse.set(incidentData.requestId, {
                ...incidentData,
                timestamp: new Date(),
                status: 'OPEN'
            });

        } catch (error) {
            console.error('Failed to log security incident:', error);
        }
    }

    /**
     * Initiate incident response
     */
    async initiateIncidentResponse(incident) {
        try {
            console.log(`🚨 CRITICAL SECURITY INCIDENT: ${incident.type} from ${incident.source}`);

            // Auto-block IP if critical
            if (incident.level === 'CRITICAL') {
                await this.blockIPAddress(incident.source, 'Security Breach');
            }

            // Notify security team (in production, would send alerts)
            await this.notifySecurityTeam(incident);

            // Update metrics
            this.securityMetrics.threatsDetected++;

        } catch (error) {
            console.error('Failed to initiate incident response:', error);
        }
    }

    /**
     * Block IP address
     */
    async blockIPAddress(ipAddress, reason) {
        try {
            await supabase
                .from('ip_blocklist')
                .insert({
                    ip_address: ipAddress,
                    reason,
                    blocked_at: new Date().toISOString(),
                    blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                });

            console.log(`🔒 IP Address ${ipAddress} blocked: ${reason}`);

        } catch (error) {
            console.error('Failed to block IP address:', error);
        }
    }

    /**
     * Notify security team
     */
    async notifySecurityTeam(incident) {
        // In production, this would send alerts via email, Slack, etc.
        console.log('📧 Security Team Notification:', {
            level: incident.level,
            type: incident.type,
            threats: incident.threats,
            source: incident.source,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Flag request for security review
     */
    async flagForReview(threats, request) {
        // Store flagged request for manual review
        console.log('🔍 Request flagged for security review:', {
            threats,
            method: request.method,
            url: request.url,
            ip: this.getClientIP(request)
        });
    }

    /**
     * Handle security errors
     */
    async handleSecurityError(error, request) {
        console.error('Security error:', error);

        await this.logSecurityEvent({
            type: 'security_error',
            requestId: this.generateRequestId(),
            error: error.message,
            stack: error.stack,
            clientInfo: {
                ip: this.getClientIP(request),
                userAgent: request.get('User-Agent'),
                method: request.method,
                url: request.url
            }
        });
    }

    /**
     * Get client IP address
     */
    getClientIP(request) {
        return request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            'unknown';
    }

    /**
     * Generate unique IDs
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    generateIncidentId() {
        return `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        return {
            ...this.securityMetrics,
            activeIncidents: this.incidentResponse.size,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            lastUpdated: new Date()
        };
    }

    /**
     * Get active security incidents
     */
    getActiveIncidents() {
        return Array.from(this.incidentResponse.values())
            .filter(incident => incident.status === 'OPEN')
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Resolve security incident
     */
    async resolveIncident(incidentId, resolution) {
        try {
            const incident = this.incidentResponse.get(incidentId);
            if (incident) {
                incident.status = 'RESOLVED';
                incident.resolution = resolution;
                incident.resolvedAt = new Date();

                // Update database
                await supabase
                    .from('security_incidents')
                    .update({
                        status: 'RESOLVED',
                        resolution: resolution,
                        resolved_at: new Date().toISOString()
                    })
                    .eq('incident_id', incidentId);

                this.securityMetrics.incidentsResolved++;
            }

        } catch (error) {
            console.error('Failed to resolve incident:', error);
        }
    }

    /**
     * Clean up old security data
     */
    async cleanup() {
        try {
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

            // Clean up resolved incidents older than 30 days
            await supabase
                .from('security_incidents')
                .delete()
                .lt('created_at', cutoffDate.toISOString())
                .eq('status', 'RESOLVED');

            // Clean up old security events
            await supabase
                .from('security_events')
                .delete()
                .lt('created_at', cutoffDate.toISOString());

            console.log('🧹 Security data cleanup completed');

        } catch (error) {
            console.error('Security cleanup failed:', error);
        }
    }
}

// Create singleton instance
const enterpriseSecurityService = new EnterpriseSecurityService();

// Export middleware and service
module.exports = {
    // Middleware function
    securityMiddleware: (req, res, next) => {
        return enterpriseSecurityService.monitorSecurity(req, res, next);
    },

    // Service instance
    enterpriseSecurityService,

    // Utility functions
    checkThreatLevel: (threats) => {
        return enterpriseSecurityService.analyzeThreats ? 'low' : 'high';
    },

    // Rate limiting for security
    securityRateLimit: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    // Security headers middleware
    securityHeaders: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false
    })
};

// Initialize cleanup interval (every 24 hours)
setInterval(() => {
    enterpriseSecurityService.cleanup();
}, 24 * 60 * 60 * 1000);