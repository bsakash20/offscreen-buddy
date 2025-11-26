# Deployment & Verification Guide

## Overview
This guide provides step-by-step instructions for deploying and verifying the OffScreen Buddy application in production environments.

## Pre-Deployment Checklist

### 🔧 Technical Infrastructure
- [ ] Node.js 18+ installed on production servers
- [ ] PostgreSQL 13+ database configured
- [ ] Redis instance for caching and sessions
- [ ] SSL certificates configured
- [ ] Domain and DNS settings configured
- [ ] Environment variables configured
- [ ] CDN configured for static assets

### 🔐 Security Configuration
- [ ] All API keys and secrets moved to environment variables
- [ ] CORS settings properly configured for production domains
- [ ] Rate limiting enabled on all API endpoints
- [ ] Input validation implemented on all forms
- [ ] SQL injection prevention measures in place
- [ ] XSS protection headers configured
- [ ] HTTPS enforcement enabled

### 🧪 Testing Validation
- [ ] All unit tests passing (coverage ≥ 80%)
- [ ] Integration tests passing
- [ ] E2E tests passing for critical user flows
- [ ] Performance tests passed (response times < 2s)
- [ ] Load tests passed (support 1000 concurrent users)
- [ ] Security scans completed with no critical issues

### 📊 Monitoring Setup
- [ ] Application monitoring (e.g., Sentry, LogRocket)
- [ ] Server monitoring (CPU, memory, disk usage)
- [ ] Database monitoring (connections, queries, performance)
- [ ] API monitoring (response times, error rates)
- [ ] Uptime monitoring configured

## Deployment Steps

### 1. Environment Setup

#### Production Environment Variables
```bash
# Frontend (.env.production)
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_DEBUG=false

# Backend (.env.production)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/offscreen_buddy_prod
REDIS_URL=redis://redis-host:6379/0
JWT_SECRET=your-super-secure-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=https://your-project.supabase.co

# PayU Configuration
PAYU_MERCHANT_KEY=your-production-merchant-key
PAYU_SALT=your-production-salt
PAYU_BASE_URL=https://secure.payu.in
```

#### Database Migration
```bash
# Run database migrations
cd backend
npm run migrate:production

# Verify migration status
npm run migrate:status
```

### 2. Backend Deployment

#### Using PM2 (Recommended)
```bash
# Install dependencies
cd backend
npm ci --production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor application
pm2 monit

# View logs
pm2 logs offscreen-buddy-backend
```

#### Ecosystem Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'offscreen-buddy-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Using Docker
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t offscreen-buddy-backend .
docker run -d --name backend -p 3001:3001 --env-file .env.production offscreen-buddy-backend
```

### 3. Frontend Deployment

#### Web Deployment (Netlify/Vercel)
```bash
# Build for web
npm run build:web

# Deploy to Netlify
npx netlify deploy --prod --dir dist

# Deploy to Vercel
npx vercel --prod
```

#### Mobile App Deployment

**iOS App Store:**
```bash
# Build for iOS
npx expo run:ios --device

# Build for App Store
eas build --platform ios --profile production
eas submit --platform ios
```

**Google Play Store:**
```bash
# Build for Android
eas build --platform android --profile production
eas submit --platform android
```

### 4. Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Web app
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Static assets
    location /assets/ {
        root /path/to/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Post-Deployment Verification

### 1. Health Checks

#### Backend API Health
```bash
# Basic health check
curl -f https://api.yourdomain.com/api/health || exit 1

# Detailed health check
curl -s https://api.yourdomain.com/api/health/detailed | jq .
```

#### Database Connectivity
```bash
# Test database connection
curl -s https://api.yourdomain.com/api/health/database | jq '.database.connected'

# Expected: true
```

#### External Services
```bash
# Test PayU integration
curl -s https://api.yourdomain.com/api/payu/health | jq '.paymentProvider.status'

# Expected: "healthy"
```

### 2. Functional Testing

#### Authentication Flow
```bash
# Test user registration
curl -X POST https://api.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123","name":"Test User"}'

# Test user login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

#### Core Features
```bash
# Test timer functionality
curl -X POST https://api.yourdomain.com/api/timer/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration":25,"type":"work"}'

# Test subscription functionality
curl -s https://api.yourdomain.com/api/payment/plans \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Performance Testing

#### Load Testing
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run backend/tests/load/load-test.yml

# Expected results:
# - 95th percentile response time < 2s
# - Error rate < 1%
# - No memory leaks
```

#### Database Performance
```bash
# Test query performance
psql $DATABASE_URL -c "
SELECT schemaname, tablename, attname, inherited, null_frac, avg_width, n_distinct, most_common_vals
FROM pg_stats
WHERE tablename = 'user_profiles';
"
```

### 4. Security Verification

#### SSL Configuration
```bash
# Test SSL rating
ssllabs-scan yourdomain.com

# Expected: A+ rating

# Test HTTPS redirect
curl -I http://yourdomain.com
# Expected: 301 Moved Permanently
```

#### Security Headers
```bash
# Check security headers
curl -I https://api.yourdomain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

#### Rate Limiting
```bash
# Test rate limiting (should fail after 100 requests)
for i in {1..120}; do
  curl -s https://api.yourdomain.com/api/health > /dev/null
  echo "Request $i"
done
```

### 5. Monitoring Verification

#### Application Logs
```bash
# Check for errors in production logs
tail -f backend/logs/error.log | grep -i error

# Expected: No critical errors
```

#### Performance Metrics
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/api/health

# curl-format.txt:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#           time_total:  %{time_total}\n

# Expected: time_total < 2s
```

## Rollback Strategy

### Automated Rollback
```bash
# Backend rollback (using PM2)
pm2 stop offscreen-buddy-backend
pm2 start offscreen-buddy-backend --env previous

# Database rollback
psql $DATABASE_URL -f backup/scripts/rollback-to-2023-11-23.sql

# Frontend rollback
npx vercel rollback your-deployment-url
```

### Manual Rollback
1. Stop current services
2. Restore database from backup
3. Deploy previous version
4. Update DNS if needed
5. Verify functionality

## Monitoring & Maintenance

### Daily Checks
- [ ] Application uptime (≥ 99.9%)
- [ ] Error rate (≤ 1%)
- [ ] Response times (≤ 2s)
- [ ] Database performance
- [ ] Storage usage (≤ 80%)

### Weekly Tasks
- [ ] Security updates
- [ ] Performance optimization
- [ ] Log analysis
- [ ] Backup verification
- [ ] Load testing

### Monthly Tasks
- [ ] Security audit
- [ ] Dependency updates
- [ ] Performance review
- [ ] Disaster recovery test
- [ ] Cost optimization

## Troubleshooting Common Issues

### Database Connection Issues
```bash
# Check database connectivity
telnet database-host 5432

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart service if needed
pm2 restart offscreen-buddy-backend
```

### API Response Time Issues
```bash
# Check API logs
pm2 logs offscreen-buddy-backend --lines 100

# Check system resources
htop
df -h
```

## Success Criteria

✅ **Deployment Successful When:**
- All health checks pass
- Functional tests pass
- Performance benchmarks met
- Security scans clean
- User acceptance tests pass
- Monitoring alerts configured
- Rollback plan tested

This deployment guide ensures a smooth, secure, and reliable production deployment of the OffScreen Buddy application.