/**
 * Secure Token and Session Management Service
 * Provides enhanced JWT handling, session security, and token refresh mechanisms
 * Implements enterprise-grade session management with proper security controls
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSecurityConfig, isSecurityProd } = require('../config/security');
const { supabase } = require('../config/supabase');

/**
 * JWT Token Manager
 */
class SecureTokenManager {
    constructor() {
        this.config = getSecurityConfig().authentication;
        this.tokenBlacklist = new Set();
        this.refreshTokenStore = new Map();
    }

    /**
     * Generate secure access token
     */
    generateAccessToken(userId, additionalClaims = {}) {
        const now = Math.floor(Date.now() / 1000);
        const expirationTime = this.getAccessTokenExpiration();

        const payload = {
            sub: userId,
            iat: now,
            exp: expirationTime,
            iss: this.config.jwt.issuer,
            aud: this.config.jwt.audience,
            tokenType: 'access',
            ...additionalClaims
        };

        const token = jwt.sign(payload, this.getSecret(), {
            algorithm: this.config.jwt.algorithm,
            expiresIn: this.config.jwt.expiresIn,
            issuer: this.config.jwt.issuer,
            audience: this.config.jwt.audience,
            header: {
                typ: 'JWT',
                alg: this.config.jwt.algorithm
            }
        });

        return {
            token,
            expiresAt: new Date(expirationTime * 1000).toISOString(),
            tokenType: 'access'
        };
    }

    /**
     * Generate secure refresh token
     */
    async generateRefreshToken(userId, sessionId) {
        const now = Date.now();
        const expirationTime = now + (30 * 24 * 60 * 60 * 1000); // 30 days

        const tokenId = crypto.randomUUID();
        const refreshToken = crypto.randomBytes(64).toString('hex');

        // Store refresh token securely
        const tokenData = {
            tokenId,
            userId,
            sessionId,
            token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
            createdAt: now,
            expiresAt: expirationTime,
            usedAt: null,
            revokedAt: null,
            lastUsed: now,
            userAgent: null,
            ipAddress: null
        };

        this.refreshTokenStore.set(tokenId, tokenData);

        // In production, this should be stored in secure database/Redis
        if (isSecurityProd()) {
            await this.storeRefreshTokenInDatabase(tokenData);
        }

        return {
            token: refreshToken,
            tokenId,
            expiresAt: new Date(expirationTime).toISOString(),
            tokenType: 'refresh'
        };
    }

    /**
     * Validate and decode access token
     */
    validateAccessToken(token) {
        try {
            // Check if token is blacklisted
            if (this.tokenBlacklist.has(token)) {
                throw new Error('Token has been revoked');
            }

            const payload = jwt.verify(token, this.getSecret(), {
                algorithms: [this.config.jwt.algorithm],
                issuer: this.config.jwt.issuer,
                audience: this.config.jwt.audience,
                clockTolerance: this.config.jwt.clockTolerance || 5
            });

            // Validate token type
            if (payload.tokenType !== 'access') {
                throw new Error('Invalid token type');
            }

            // Check if token is expired
            if (payload.exp < Math.floor(Date.now() / 1000)) {
                throw new Error('Token has expired');
            }

            return {
                isValid: true,
                payload,
                userId: payload.sub
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message,
                payload: null,
                userId: null
            };
        }
    }

    /**
     * Validate and rotate refresh token
     */
    async validateAndRotateRefreshToken(token, tokenId, userAgent = null, ipAddress = null) {
        try {
            const tokenData = this.refreshTokenStore.get(tokenId);

            if (!tokenData) {
                // Check database in production
                if (isSecurityProd()) {
                    const dbToken = await this.getRefreshTokenFromDatabase(tokenId);
                    if (!dbToken) {
                        throw new Error('Invalid refresh token');
                    }
                    tokenData = dbToken;
                } else {
                    throw new Error('Invalid refresh token');
                }
            }

            // Verify token hash
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            if (tokenData.token !== tokenHash) {
                throw new Error('Invalid refresh token');
            }

            // Check expiration
            if (Date.now() > tokenData.expiresAt) {
                throw new Error('Refresh token has expired');
            }

            // Check if already used/revoked
            if (tokenData.revokedAt) {
                throw new Error('Refresh token has been revoked');
            }

            // Update usage tracking
            tokenData.lastUsed = Date.now();
            tokenData.usedAt = Date.now();
            tokenData.userAgent = userAgent;
            tokenData.ipAddress = ipAddress;

            // Rotate refresh token (implement refresh token rotation)
            if (this.config.tokens.refreshTokenRotation) {
                await this.rotateRefreshToken(tokenData);
            }

            // Update in store/database
            this.refreshTokenStore.set(tokenId, tokenData);
            if (isSecurityProd()) {
                await this.updateRefreshTokenInDatabase(tokenData);
            }

            return {
                isValid: true,
                userId: tokenData.userId,
                sessionId: tokenData.sessionId,
                tokenData
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Revoke access token (add to blacklist)
     */
    revokeAccessToken(token) {
        this.tokenBlacklist.add(token);

        // Clean up old blacklisted tokens (keep for max token lifetime)
        setTimeout(() => {
            this.tokenBlacklist.delete(token);
        }, this.getAccessTokenExpiration() * 1000 - Date.now());
    }

    /**
     * Revoke refresh token
     */
    async revokeRefreshToken(tokenId, reason = 'user_logout') {
        const tokenData = this.refreshTokenStore.get(tokenId);

        if (tokenData) {
            tokenData.revokedAt = Date.now();
            tokenData.revocationReason = reason;

            // Update in store/database
            this.refreshTokenStore.set(tokenId, tokenData);

            if (isSecurityProd()) {
                await this.updateRefreshTokenInDatabase(tokenData);
            }
        }
    }

    /**
     * Revoke all tokens for user (session termination)
     */
    async revokeAllUserTokens(userId, reason = 'security_breach') {
        // Revoke all refresh tokens for user
        for (const [tokenId, tokenData] of this.refreshTokenStore.entries()) {
            if (tokenData.userId === userId) {
                await this.revokeRefreshToken(tokenId, reason);
            }
        }

        // Clear all access tokens for user (add to blacklist)
        // This would require tracking active access tokens per user
    }

    /**
     * Rotate refresh token (implement refresh token rotation)
     */
    async rotateRefreshToken(oldTokenData) {
        const newTokenId = crypto.randomUUID();
        const newRefreshToken = crypto.randomBytes(64).toString('hex');

        const newTokenData = {
            ...oldTokenData,
            tokenId: newTokenId,
            token: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
            createdAt: Date.now(),
            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            usedAt: null,
            revokedAt: null,
            lastUsed: null
        };

        // Store new token
        this.refreshTokenStore.set(newTokenData.tokenId, newTokenData);

        // Revoke old token
        oldTokenData.revokedAt = Date.now();
        oldTokenData.revocationReason = 'rotated';
        this.refreshTokenStore.set(oldTokenData.tokenId, oldTokenData);

        return {
            token: newRefreshToken,
            tokenId: newTokenId,
            expiresAt: new Date(newTokenData.expiresAt).toISOString()
        };
    }

    /**
     * Get access token expiration time
     */
    getAccessTokenExpiration() {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = this.parseExpirationTime(this.config.jwt.expiresIn);
        return now + expiresIn;
    }

    /**
     * Parse expiration time string to seconds
     */
    parseExpirationTime(expiresIn) {
        const timeUnit = expiresIn.slice(-1);
        const timeValue = parseInt(expiresIn.slice(0, -1));

        switch (timeUnit) {
            case 's': return timeValue;
            case 'm': return timeValue * 60;
            case 'h': return timeValue * 60 * 60;
            case 'd': return timeValue * 24 * 60 * 60;
            default: return 3600; // Default 1 hour
        }
    }

    /**
     * Get JWT secret from environment
     */
    getSecret() {
        return this.config.jwt.secret;
    }

    /**
     * Store refresh token in database (production only)
     */
    async storeRefreshTokenInDatabase(tokenData) {
        try {
            await supabase
                .from('refresh_tokens')
                .insert({
                    token_id: tokenData.tokenId,
                    user_id: tokenData.userId,
                    session_id: tokenData.sessionId,
                    token_hash: tokenData.token,
                    created_at: new Date(tokenData.createdAt).toISOString(),
                    expires_at: new Date(tokenData.expiresAt).toISOString(),
                    user_agent: tokenData.userAgent,
                    ip_address: tokenData.ipAddress
                });
        } catch (error) {
            console.error('Failed to store refresh token:', error);
        }
    }

    /**
     * Get refresh token from database
     */
    async getRefreshTokenFromDatabase(tokenId) {
        try {
            const { data } = await supabase
                .from('refresh_tokens')
                .select('*')
                .eq('token_id', tokenId)
                .single();

            return data ? {
                tokenId: data.token_id,
                userId: data.user_id,
                sessionId: data.session_id,
                token: data.token_hash,
                createdAt: new Date(data.created_at).getTime(),
                expiresAt: new Date(data.expires_at).getTime(),
                usedAt: data.used_at ? new Date(data.used_at).getTime() : null,
                revokedAt: data.revoked_at ? new Date(data.revoked_at).getTime() : null,
                lastUsed: data.last_used ? new Date(data.last_used).getTime() : null,
                userAgent: data.user_agent,
                ipAddress: data.ip_address
            } : null;
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    }

    /**
     * Update refresh token in database
     */
    async updateRefreshTokenInDatabase(tokenData) {
        try {
            await supabase
                .from('refresh_tokens')
                .update({
                    used_at: tokenData.usedAt ? new Date(tokenData.usedAt).toISOString() : null,
                    revoked_at: tokenData.revokedAt ? new Date(tokenData.revokedAt).toISOString() : null,
                    last_used: new Date(tokenData.lastUsed).toISOString()
                })
                .eq('token_id', tokenData.tokenId);
        } catch (error) {
            console.error('Failed to update refresh token:', error);
        }
    }
}

/**
 * Session Manager
 */
class SecureSessionManager {
    constructor() {
        this.config = getSecurityConfig().authentication;
        this.activeSessions = new Map();
        this.sessionBlacklist = new Set();
    }

    /**
     * Create new user session
     */
    async createSession(userId, deviceInfo = {}) {
        const sessionId = crypto.randomUUID();
        const now = Date.now();
        const expirationTime = now + (this.config.session.cookie.maxAge || 3600000);

        const sessionData = {
            sessionId,
            userId,
            createdAt: now,
            expiresAt: expirationTime,
            lastActivity: now,
            deviceInfo: {
                userAgent: deviceInfo.userAgent,
                ipAddress: deviceInfo.ipAddress,
                platform: deviceInfo.platform,
                fingerprint: deviceInfo.fingerprint
            },
            securityFlags: {
                isMobile: deviceInfo.isMobile || false,
                isTrusted: deviceInfo.isTrusted || false,
                mfaVerified: deviceInfo.mfaVerified || false
            },
            metadata: {
                loginMethod: deviceInfo.loginMethod || 'password',
                location: deviceInfo.location || null
            }
        };

        this.activeSessions.set(sessionId, sessionData);

        // In production, store in secure session store (Redis/database)
        if (isSecurityProd()) {
            await this.storeSessionInDatabase(sessionData);
        }

        return {
            sessionId,
            expiresAt: new Date(expirationTime).toISOString(),
            sessionData
        };
    }

    /**
     * Validate session
     */
    validateSession(sessionId) {
        const sessionData = this.activeSessions.get(sessionId);

        if (!sessionData) {
            // Check database in production
            if (isSecurityProd()) {
                return this.getSessionFromDatabase(sessionId);
            }
            return { isValid: false, error: 'Session not found' };
        }

        // Check expiration
        if (Date.now() > sessionData.expiresAt) {
            this.activeSessions.delete(sessionId);
            return { isValid: false, error: 'Session has expired' };
        }

        // Update last activity
        sessionData.lastActivity = Date.now();
        this.activeSessions.set(sessionId, sessionData);

        return {
            isValid: true,
            sessionData,
            userId: sessionData.userId
        };
    }

    /**
     * Extend session (extend expiration)
     */
    extendSession(sessionId, extensionMs = null) {
        const sessionData = this.activeSessions.get(sessionId);

        if (!sessionData) {
            return { isValid: false, error: 'Session not found' };
        }

        const extension = extensionMs || (this.config.session.cookie.maxAge || 3600000);
        sessionData.expiresAt = Date.now() + extension;
        sessionData.lastActivity = Date.now();

        this.activeSessions.set(sessionId, sessionData);

        // Update in database
        if (isSecurityProd()) {
            this.updateSessionInDatabase(sessionData);
        }

        return {
            isValid: true,
            expiresAt: new Date(sessionData.expiresAt).toISOString()
        };
    }

    /**
     * Invalidate session
     */
    async invalidateSession(sessionId, reason = 'user_logout') {
        const sessionData = this.activeSessions.get(sessionId);

        if (sessionData) {
            sessionData.invalidatedAt = Date.now();
            sessionData.invalidationReason = reason;

            this.activeSessions.delete(sessionId);
            this.sessionBlacklist.add(sessionId);

            // Update in database
            if (isSecurityProd()) {
                await this.updateSessionInDatabase(sessionData);
            }
        }
    }

    /**
     * Invalidate all sessions for user
     */
    async invalidateAllUserSessions(userId, reason = 'security_breach') {
        const sessionsToInvalidate = [];

        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            if (sessionData.userId === userId) {
                sessionsToInvalidate.push(sessionId);
            }
        }

        for (const sessionId of sessionsToInvalidate) {
            await this.invalidateSession(sessionId, reason);
        }
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            if (now > sessionData.expiresAt) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            this.activeSessions.delete(sessionId);
        }

        console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
        return expiredSessions.length;
    }

    /**
     * Get active sessions for user
     */
    getUserSessions(userId) {
        const userSessions = [];

        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            if (sessionData.userId === userId && !sessionData.invalidatedAt) {
                userSessions.push({
                    sessionId,
                    ...sessionData
                });
            }
        }

        return userSessions;
    }

    /**
     * Store session in database (production only)
     */
    async storeSessionInDatabase(sessionData) {
        try {
            await supabase
                .from('user_sessions')
                .insert({
                    session_id: sessionData.sessionId,
                    user_id: sessionData.userId,
                    created_at: new Date(sessionData.createdAt).toISOString(),
                    expires_at: new Date(sessionData.expiresAt).toISOString(),
                    device_info: sessionData.deviceInfo,
                    security_flags: sessionData.securityFlags,
                    metadata: sessionData.metadata,
                    user_agent: sessionData.deviceInfo.userAgent,
                    ip_address: sessionData.deviceInfo.ipAddress
                });
        } catch (error) {
            console.error('Failed to store session:', error);
        }
    }

    /**
     * Get session from database
     */
    async getSessionFromDatabase(sessionId) {
        try {
            const { data } = await supabase
                .from('user_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (!data) {
                return { isValid: false, error: 'Session not found' };
            }

            const sessionData = {
                sessionId: data.session_id,
                userId: data.user_id,
                createdAt: new Date(data.created_at).getTime(),
                expiresAt: new Date(data.expires_at).getTime(),
                lastActivity: data.last_activity ? new Date(data.last_activity).getTime() : new Date(data.created_at).getTime(),
                deviceInfo: data.device_info,
                securityFlags: data.security_flags,
                metadata: data.metadata,
                invalidatedAt: data.invalidated_at ? new Date(data.invalidated_at).getTime() : null,
                invalidationReason: data.invalidation_reason
            };

            if (sessionData.invalidatedAt || Date.now() > sessionData.expiresAt) {
                return { isValid: false, error: 'Session has expired or been invalidated' };
            }

            return {
                isValid: true,
                sessionData,
                userId: sessionData.userId
            };
        } catch (error) {
            console.error('Failed to get session:', error);
            return { isValid: false, error: 'Failed to validate session' };
        }
    }

    /**
     * Update session in database
     */
    async updateSessionInDatabase(sessionData) {
        try {
            await supabase
                .from('user_sessions')
                .update({
                    last_activity: new Date(sessionData.lastActivity).toISOString(),
                    expires_at: new Date(sessionData.expiresAt).toISOString(),
                    invalidated_at: sessionData.invalidatedAt ? new Date(sessionData.invalidatedAt).toISOString() : null,
                    invalidation_reason: sessionData.invalidationReason || null
                })
                .eq('session_id', sessionData.sessionId);
        } catch (error) {
            console.error('Failed to update session:', error);
        }
    }
}

/**
 * Main Secure Token and Session Service
 */
class SecureTokenService {
    constructor() {
        this.tokenManager = new SecureTokenManager();
        this.sessionManager = new SecureSessionManager();
    }

    /**
     * Create complete authentication tokens and session
     */
    async createAuthenticationSession(userId, deviceInfo = {}) {
        try {
            // Create session
            const session = await this.sessionManager.createSession(userId, deviceInfo);

            // Create access token
            const accessToken = this.tokenManager.generateAccessToken(userId, {
                sessionId: session.sessionId,
                deviceFingerprint: deviceInfo.fingerprint
            });

            // Create refresh token
            const refreshToken = await this.tokenManager.generateRefreshToken(userId, session.sessionId);

            return {
                accessToken: accessToken.token,
                accessTokenExpiresAt: accessToken.expiresAt,
                refreshToken: refreshToken.token,
                refreshTokenId: refreshToken.tokenId,
                refreshTokenExpiresAt: refreshToken.expiresAt,
                sessionId: session.sessionId,
                sessionExpiresAt: session.expiresAt
            };
        } catch (error) {
            console.error('Failed to create authentication session:', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken, refreshTokenId, userAgent = null, ipAddress = null) {
        const validation = await this.tokenManager.validateAndRotateRefreshToken(
            refreshToken,
            refreshTokenId,
            userAgent,
            ipAddress
        );

        if (!validation.isValid) {
            throw new Error(`Refresh token validation failed: ${validation.error}`);
        }

        // Generate new access token
        const newAccessToken = this.tokenManager.generateAccessToken(validation.userId, {
            sessionId: validation.sessionId
        });

        // If rotation occurred, return new refresh token
        const result = {
            accessToken: newAccessToken.token,
            accessTokenExpiresAt: newAccessToken.expiresAt,
            sessionId: validation.sessionId
        };

        // Check if token was rotated (this would be returned by validateAndRotateRefreshToken)
        // For now, we'll handle rotation separately

        return result;
    }

    /**
     * Logout user (invalidate session and tokens)
     */
    async logoutUser(sessionId, accessToken = null, refreshTokenId = null) {
        try {
            // Invalidate session
            await this.sessionManager.invalidateSession(sessionId, 'user_logout');

            // Revoke access token
            if (accessToken) {
                this.tokenManager.revokeAccessToken(accessToken);
            }

            // Revoke refresh token
            if (refreshTokenId) {
                await this.tokenManager.revokeRefreshToken(refreshTokenId, 'user_logout');
            }

            return {
                success: true,
                message: 'User logged out successfully'
            };
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    /**
     * Validate access token
     */
    validateAccessToken(token) {
        return this.tokenManager.validateAccessToken(token);
    }

    /**
     * Validate session
     */
    validateSession(sessionId) {
        return this.sessionManager.validateSession(sessionId);
    }

    /**
     * Invalidate all user sessions (emergency/suspicious activity)
     */
    async invalidateAllUserSessions(userId, reason = 'security_breach') {
        try {
            // Invalidate all sessions
            await this.sessionManager.invalidateAllUserSessions(userId, reason);

            // Revoke all user tokens
            await this.tokenManager.revokeAllUserTokens(userId, reason);

            return {
                success: true,
                message: `All sessions and tokens invalidated for user ${userId}`,
                reason
            };
        } catch (error) {
            console.error('Failed to invalidate user sessions:', error);
            throw error;
        }
    }

    /**
     * Get token security metrics
     */
    async getSecurityMetrics() {
        try {
            const metrics = {
                activeSessions: this.sessionManager.activeSessions.size,
                blacklistedTokens: this.tokenManager.tokenBlacklist.size,
                activeRefreshTokens: this.tokenManager.refreshTokenStore.size,
                sessionMetrics: await this.getSessionMetrics(),
                tokenMetrics: await this.getTokenMetrics()
            };

            return metrics;
        } catch (error) {
            console.error('Failed to get security metrics:', error);
            return {
                error: error.message,
                activeSessions: 0,
                blacklistedTokens: 0,
                activeRefreshTokens: 0
            };
        }
    }

    /**
     * Get session metrics
     */
    async getSessionMetrics() {
        try {
            const { data } = await supabase
                .from('user_sessions')
                .select('created_at, invalidated_at, user_agent')
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            const now = Date.now();
            const last24hSessions = data?.length || 0;
            const activeSessions = data?.filter(s => !s.invalidated_at).length || 0;

            return {
                totalSessions: last24hSessions,
                activeSessions,
                invalidationRate: last24hSessions > 0 ? ((last24hSessions - activeSessions) / last24hSessions) * 100 : 0
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Get token metrics
     */
    async getTokenMetrics() {
        try {
            const { data } = await supabase
                .from('refresh_tokens')
                .select('created_at, revoked_at, expires_at')
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            const totalTokens = data?.length || 0;
            const revokedTokens = data?.filter(t => t.revoked_at).length || 0;
            const expiredTokens = data?.filter(t => new Date(t.expires_at) < new Date()).length || 0;

            return {
                totalTokens,
                revokedTokens,
                expiredTokens,
                revocationRate: totalTokens > 0 ? (revokedTokens / totalTokens) * 100 : 0
            };
        } catch (error) {
            return { error: error.message };
        }
    }
}

// Create singleton instance
const secureTokenService = new SecureTokenService();

module.exports = {
    // Main service class
    SecureTokenService,
    secureTokenService,

    // Supporting classes
    SecureTokenManager,
    SecureSessionManager,

    // Utility functions
    createTokenManager: () => new SecureTokenManager(),
    createSessionManager: () => new SecureSessionManager(),

    // Helper functions
    generateCSRFToken: () => crypto.randomBytes(32).toString('hex'),
    hashToken: (token) => crypto.createHash('sha256').update(token).digest('hex'),
    isTokenExpired: (expirationTime) => new Date(expirationTime) < new Date(),

    // Security constants
    TOKEN_CONSTANTS: {
        ACCESS_TOKEN_EXPIRY: '15m',
        REFRESH_TOKEN_EXPIRY: '30d',
        SESSION_EXPIRY: '24h',
        CSRF_TOKEN_EXPIRY: '1h'
    }
};