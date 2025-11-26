# Staging Environment Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the OffScreen Buddy application to a staging environment that mirrors production with realistic data and configurations for thorough testing before production release.

## Staging Environment Strategy

### Environment Characteristics
- **Purpose**: Pre-production testing and validation
- **Data**: Sanitized production-like data
- **Infrastructure**: Production-like architecture with reduced capacity
- **Security**: Production-level security configurations
- **Monitoring**: Production monitoring with staging-specific alerts
- **Access**: Limited to development team and stakeholders

### Environment Components
- **Mobile Application**: Staging builds with staging API endpoints
- **Backend API**: Production code with staging database and services
- **Database**: Staging PostgreSQL instance with anonymized data
- **Caching**: Redis cluster for performance testing
- **Monitoring**: Full observability stack for testing and validation
- **CDN**: Content delivery for asset testing
- **Security**: WAF, SSL certificates, and security monitoring

## Staging Infrastructure Architecture

### Network Architecture
```
Internet
    ↓
Cloud Load Balancer (ALB)
    ↓
┌─────────────────────────────────────────┐
│           Staging Environment           │
│  ┌─────────────────────────────────┐   │
│  │      Web Application            │   │
│  │    (Auto Scaling Group)         │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │        API Gateway              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │      Database Cluster           │   │
│  │   (Read Replica, Staging DB)    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │        Redis Cache              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │      Monitoring Stack           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Resource Allocation
- **Application Servers**: 2-4 t3.medium instances
- **Database**: 1 db.t3.small instance
- **Redis Cache**: 1 cache.t3.micro instance
- **Load Balancer**: Application Load Balancer
- **Storage**: 100GB SSD storage
- **Bandwidth**: 1TB/month data transfer

## Pre-Deployment Preparation

### Code Preparation
```bash
# 1. Ensure all features are feature-flagged
git checkout staging
git merge feature/new-feature
npm run test:staging
npm run build:staging

# 2. Validate staging configurations
npm run validate:staging-config

# 3. Run staging-specific tests
npm run test:integration:staging
npm run test:e2e:staging
npm run test:performance:staging
```

### Database Preparation
```bash
# 1. Create staging database backup
pg_dump -h production-db.internal -U app_user production_db > staging_backup_$(date +%Y%m%d).sql

# 2. Anonymize sensitive data
./scripts/anonymize_data.py staging_backup_20231122.sql > staging_anonymized_backup.sql

# 3. Restore to staging database
psql -h staging-db.internal -U app_user staging_db < staging_anonymized_backup.sql

# 4. Apply staging-specific migrations
npm run migrate:staging
```

### Environment Configuration
```env
# staging.env
NODE_ENV=staging
APP_ENV=staging
APP_VERSION=1.0.0-staging.${BUILD_NUMBER}
APP_DEBUG=false

# API Configuration
API_BASE_URL=https://api-staging.offscreen-buddy.com
API_TIMEOUT=15000

# Database Configuration
DATABASE_URL=postgresql://staging_user:${STAGING_DB_PASSWORD}@staging-db.internal:5432/offscreen_staging
REDIS_URL=redis://staging-redis.internal:6379

# Supabase Configuration (Staging Project)
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=${STAGING_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${STAGING_SUPABASE_SERVICE_KEY}

# Authentication Configuration
JWT_SECRET=${STAGING_JWT_SECRET}
JWT_EXPIRES_IN=4h
REFRESH_TOKEN_EXPIRES_IN=7d

# PayU Configuration (Staging)
PAYU_ENVIRONMENT=sandbox
PAYU_MERCHANT_ID=${STAGING_PAYU_MERCHANT_ID}
PAYU_SALT=${STAGING_PAYU_SALT_KEY}

# Email Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=${SMTP_USERNAME}
SMTP_PASS=${SMTP_PASSWORD}
EMAIL_FROM=noreply-staging@offscreen-buddy.com

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif
UPLOAD_BUCKET=offscreen-staging-uploads

# Monitoring Configuration
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=${SENTRY_DSN_STAGING}

# Security Configuration
ENABLE_CORS=true
CORS_ORIGIN=https://app-staging.offscreen-buddy.com
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Notification Configuration
ENABLE_PUSH_NOTIFICATIONS=true
FCM_SERVER_KEY=${STAGING_FCM_SERVER_KEY}
APNS_KEY_ID=${STAGING_APNS_KEY_ID}
APNS_TEAM_ID=${STAGING_APNS_TEAM_ID}

# Cache Configuration
CACHE_TTL=1800
ENABLE_CACHE=true
CACHE_TYPE=redis

# Feature Flags (Staging)
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_NEW_FEATURE_A=true
ENABLE_NEW_FEATURE_B=false

# Load Testing Configuration
LOAD_TEST_ENABLED=true
LOAD_TEST_USERS=100
LOAD_TEST_DURATION=30m
```

## Deployment Process

### Automated Deployment Pipeline
```yaml
# .github/workflows/staging-deployment.yml
name: Staging Deployment

on:
  push:
    branches: [staging]
  pull_request:
    branches: [staging]

env:
  NODE_ENV: staging

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration:staging
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Build application
        run: npm run build:staging

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t offscreen-buddy:staging-${GITHUB_SHA} .
          docker tag offscreen-buddy:staging-${GITHUB_SHA} ${ECR_REGISTRY}/offscreen-buddy:staging
      
      - name: Push to ECR
        run: |
          aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push ${ECR_REGISTRY}/offscreen-buddy:staging-${GITHUB_SHA}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          aws eks update-kubeconfig --region $AWS_DEFAULT_REGION --name offscreen-staging
          kubectl set image deployment/api api=${ECR_REGISTRY}/offscreen-buddy:staging-${GITHUB_SHA}
          kubectl rollout status deployment/api --timeout=300s

  mobile-build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Build mobile app for staging
        run: |
          cd app
          EXPO_PUBLIC_API_URL=https://api-staging.offscreen-buddy.com npm run build:staging
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: mobile-build-staging
          path: app/dist/

  smoke-tests:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Run smoke tests
        run: |
          npm run test:smoke:staging
          
      - name: Test API endpoints
        run: |
          curl -f https://api-staging.offscreen-buddy.com/health
          curl -f https://api-staging.offscreen-buddy.com/api/v1/health
          
      - name: Test database connectivity
        run: |
          npm run test:db:connectivity:staging
```

### Manual Deployment Steps
```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "Starting staging deployment..."

# 1. Pre-deployment checks
echo "Running pre-deployment checks..."
npm run validate:staging-config
npm run test:smoke:staging

# 2. Database backup
echo "Creating staging database backup..."
BACKUP_FILE="staging_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h staging-db.internal -U staging_user offscreen_staging > $BACKUP_FILE
echo "Database backup created: $BACKUP_FILE"

# 3. Deploy backend
echo "Deploying backend application..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
kubectl set image deployment/api api=$ECR_REGISTRY/offscreen-buddy:staging-$BUILD_SHA
kubectl rollout status deployment/api --timeout=300s

# 4. Deploy database migrations
echo "Running database migrations..."
kubectl exec -n offscreen-staging deployment/api -- npm run migrate:staging

# 5. Deploy mobile app build
echo "Deploying mobile app to staging..."
EXPO_PUBLIC_API_URL=https://api-staging.offscreen-buddy.com npm run build:staging:production

# 6. Post-deployment validation
echo "Running post-deployment validation..."
npm run test:post-deployment:staging

# 7. Health checks
echo "Performing health checks..."
curl -f https://api-staging.offscreen-buddy.com/health || exit 1
curl -f https://api-staging.offscreen-buddy.com/api/v1/health || exit 1

# 8. Performance validation
echo "Running performance tests..."
npm run test:performance:staging

echo "Staging deployment completed successfully!"
```

## Environment-Specific Configurations

### Mobile App Staging Configuration
```typescript
// app/config/staging.config.ts
import { stagingConfig } from './environments/staging';

export const config = {
  ...stagingConfig,
  
  // Staging-specific features
  features: {
    offlineMode: true,
    pushNotifications: true,
    analytics: true,
    crashReporting: true,
    performanceMonitoring: true,
    newFeatureA: true,
    newFeatureB: false, // Disabled for safety
    experimentalFeature: false
  },
  
  // Debug settings (disabled in production)
  debug: {
    enableDebugMenu: false,
    enableNetworkLogging: true,
    enablePerformanceLogging: true,
    mockData: false
  },
  
  // API endpoints
  api: {
    baseURL: 'https://api-staging.offscreen-buddy.com',
    timeout: 15000,
    retryAttempts: 3
  },
  
  // Authentication
  auth: {
    tokenRefreshThreshold: 300, // 5 minutes
    sessionTimeout: 14400 // 4 hours
  },
  
  // Storage
  storage: {
    bucketName: 'offscreen-staging-uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  },
  
  // Monitoring
  monitoring: {
    errorReporting: true,
    performanceTracking: true,
    userAnalytics: true,
    crashReporting: true
  }
};
```

### Backend Service Configuration
```typescript
// backend/config/staging.ts
export const stagingConfig = {
  environment: 'staging',
  debug: false,
  
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    cors: {
      origin: ['https://app-staging.offscreen-buddy.com'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Higher limit for testing
      standardHeaders: true,
      legacyHeaders: false
    }
  },
  
  database: {
    url: process.env.DATABASE_URL,
    ssl: true,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'staging-redis.internal',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  },
  
  authentication: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '4h',
    refreshTokenExpiresIn: '7d',
    bcryptRounds: 12,
    maxLoginAttempts: 10,
    lockTime: 900000 // 15 minutes
  },
  
  logging: {
    level: 'info',
    format: 'combined',
    enableConsole: true,
    enableFile: true,
    enableRemote: true
  },
  
  monitoring: {
    enableMetrics: true,
    enableTracing: true,
    enableHealthChecks: true,
    healthCheckInterval: 30000
  },
  
  features: {
    enableRateLimiting: true,
    enableCORS: true,
    enableCompression: true,
    enableHelmet: true,
    enableValidation: true
  }
};
```

## Testing and Validation

### Automated Testing Suite
```bash
#!/bin/bash
# scripts/test-staging.sh

set -e

echo "Starting staging environment testing..."

# 1. API Health Check
echo "Testing API health..."
curl -f https://api-staging.offscreen-buddy.com/health || exit 1
curl -f https://api-staging.offscreen-buddy.com/api/v1/health || exit 1

# 2. Database Connectivity Test
echo "Testing database connectivity..."
npm run test:db:connectivity:staging

# 3. Authentication Flow Test
echo "Testing authentication flow..."
npm run test:auth:flow:staging

# 4. API Endpoint Tests
echo "Testing API endpoints..."
npm run test:api:endpoints:staging

# 5. Mobile App Build Test
echo "Testing mobile app build..."
cd app
npm run build:staging:production
cd ..

# 6. Integration Tests
echo "Running integration tests..."
npm run test:integration:staging

# 7. Performance Tests
echo "Running performance tests..."
npm run test:performance:staging

# 8. Load Tests
echo "Running load tests..."
npm run test:load:staging

# 9. Security Tests
echo "Running security tests..."
npm run test:security:staging

# 10. User Acceptance Tests
echo "Running user acceptance tests..."
npm run test:uat:staging

echo "All staging tests passed!"
```

### Performance Benchmarking
```typescript
// tests/performance/staging-benchmark.ts
import { performance } from 'perf_hooks';

describe('Staging Performance Benchmarks', () => {
  const API_BASE = 'https://api-staging.offscreen-buddy.com';
  
  beforeAll(async () => {
    // Warm up the application
    await fetch(`${API_BASE}/health`);
  });

  describe('API Performance', () => {
    test('should respond within 200ms', async () => {
      const start = performance.now();
      const response = await fetch(`${API_BASE}/api/v1/users/profile`);
      const end = performance.now();
      
      expect(response.status).toBe(200);
      expect(end - start).toBeLessThan(200);
    });

    test('should handle 100 concurrent requests', async () => {
      const requests = Array(100).fill(null).map(() => 
        fetch(`${API_BASE}/api/v1/milestones`)
      );
      
      const start = performance.now();
      const responses = await Promise.all(requests);
      const end = performance.now();
      
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(end - start).toBeLessThan(5000); // 5 seconds total
    });
  });

  describe('Database Performance', () => {
    test('should query database within 50ms', async () => {
      const start = performance.now();
      // Test database query performance
      const result = await queryDatabase('SELECT COUNT(*) FROM users');
      const end = performance.now();
      
      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(50);
    });
  });
});
```

### User Acceptance Testing
```typescript
// tests/uat/staging-user-journey.ts
import { test, expect } from '@playwright/test';

test.describe('Staging User Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://app-staging.offscreen-buddy.com');
  });

  test('complete user onboarding flow', async ({ page }) => {
    // Test complete user onboarding
    await page.click('[data-testid="signup-button"]');
    await page.fill('[data-testid="email-input"]', 'test-user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="submit-button"]');
    
    // Wait for onboarding completion
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="milestones-section"]')).toBeVisible();
  });

  test('core feature functionality', async ({ page }) => {
    // Test creating a milestone
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-title"]', 'Test Milestone');
    await page.fill('[data-testid="milestone-description"]', 'Test Description');
    await page.click('[data-testid="save-milestone"]');
    
    await expect(page.locator('[data-testid="milestone-list"]')).toContainText('Test Milestone');
  });

  test('notification functionality', async ({ page }) => {
    // Test notification setup
    await page.click('[data-testid="settings"]');
    await page.click('[data-testid="notifications"]');
    await page.click('[data-testid="enable-push-notifications"]');
    
    // Verify notification permission
    const permission = await page.evaluate(() => Notification.permission);
    expect(['granted', 'denied']).toContain(permission);
  });
});
```

## Monitoring and Observability

### Staging Monitoring Stack
```yaml
# monitoring/staging-config.yml
prometheus:
  scrape_configs:
    - job_name: 'offscreen-staging-api'
      static_configs:
        - targets: ['api-service:3000']
      scrape_interval: 15s
      metrics_path: /metrics

    - job_name: 'offscreen-staging-database'
      static_configs:
        - targets: ['postgres-exporter:9187']

grafana:
  dashboards:
    - name: 'staging-overview'
      file: 'dashboards/staging-overview.json'
    - name: 'staging-performance'
      file: 'dashboards/staging-performance.json'
    - name: 'staging-errors'
      file: 'dashboards/staging-errors.json'

alerting:
  rules:
    - alert: StagingAPIDown
      expr: up{job="offscreen-staging-api"} == 0
      for: 1m
      labels:
        severity: critical
        environment: staging
      annotations:
        summary: "Staging API is down"

    - alert: StagingHighResponseTime
      expr: http_request_duration_seconds{quantile="0.95", job="offscreen-staging-api"} > 0.5
      for: 2m
      labels:
        severity: warning
        environment: staging
      annotations:
        summary: "High response time in staging"
```

### Health Check Endpoints
```typescript
// backend/routes/health.ts
import { Router } from 'express';
import { check } from 'express-validator';

const router = Router();

// Basic health check
router.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  });
});

// Detailed health check
router.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Database connectivity
    health.checks.database = await checkDatabase();
    
    // Redis connectivity
    health.checks.redis = await checkRedis();
    
    // External service connectivity
    health.checks.supabase = await checkSupabase();
    health.checks.payu = await checkPayU();
    
    // Overall status
    const allHealthy = Object.values(health.checks).every(check => check.healthy);
    health.status = allHealthy ? 'healthy' : 'unhealthy';
    
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;
```

## Rollback Procedures

### Automated Rollback
```bash
#!/bin/bash
# scripts/rollback-staging.sh

set -e

echo "Starting staging rollback..."

# 1. Identify previous working version
PREVIOUS_VERSION=$(kubectl rollout history deployment/api | grep -v "REVISION" | tail -2 | head -1 | awk '{print $1}')

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "No previous version found for rollback"
  exit 1
fi

echo "Rolling back to version: $PREVIOUS_VERSION"

# 2. Rollback deployment
kubectl rollout undo deployment/api --to-revision=$PREVIOUS_VERSION
kubectl rollout status deployment/api --timeout=300s

# 3. Rollback database if needed
read -p "Do you need to rollback database? (y/N): " rollback_db
if [ "$rollback_db" = "y" ]; then
  echo "Rolling back database..."
  # Database rollback procedure
  ./scripts/rollback-database-staging.sh
fi

# 4. Verify rollback
echo "Verifying rollback..."
npm run test:post-rollback:staging

# 5. Notify team
echo "Staging rollback completed"
```

## Staging-Specific Features

### Feature Flags Management
```typescript
// backend/services/FeatureFlagService.ts
export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  
  constructor() {
    this.initializeStagingFlags();
  }

  private initializeStagingFlags(): void {
    // Staging-specific flags
    this.flags.set('new-analytics', {
      enabled: true,
      rolloutPercentage: 100,
      targetUsers: 'staging-users',
      description: 'New analytics dashboard for staging testing'
    });

    this.flags.set('experimental-ui', {
      enabled: true,
      rolloutPercentage: 50,
      targetUsers: 'beta-testers',
      description: 'Experimental UI components'
    });

    this.flags.set('debug-mode', {
      enabled: true,
      rolloutPercentage: 100,
      targetUsers: 'developers',
      description: 'Enable debug logging and features'
    });
  }

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && userId) {
      const userHash = this.hashUserId(userId);
      const percentage = (userHash % 100) + 1;
      return percentage <= flag.rolloutPercentage;
    }

    return true;
  }
}
```

### Testing Data Management
```sql
-- staging/test-data-seed.sql

-- Create test users
INSERT INTO users (id, email, created_at) VALUES
('test-user-1', 'test1@example.com', NOW()),
('test-user-2', 'test2@example.com', NOW()),
('test-user-3', 'test3@example.com', NOW());

-- Create test milestones
INSERT INTO milestones (id, user_id, title, description, target_date, created_at) VALUES
('milestone-1', 'test-user-1', 'Complete Onboarding', 'Finish user onboarding flow', NOW() + INTERVAL '7 days', NOW()),
('milestone-2', 'test-user-1', 'First Week Review', 'Review first week performance', NOW() + INTERVAL '14 days', NOW()),
('milestone-3', 'test-user-2', 'Habit Formation', 'Establish daily habits', NOW() + INTERVAL '30 days', NOW());

-- Create test progress entries
INSERT INTO milestone_progress (id, milestone_id, progress_percentage, notes, created_at) VALUES
('progress-1', 'milestone-1', 25, 'Started onboarding process', NOW()),
('progress-2', 'milestone-1', 50, 'Completed profile setup', NOW()),
('progress-3', 'milestone-2', 0, 'Milestone just created', NOW());

-- Create test notifications
INSERT INTO notifications (id, user_id, type, title, message, scheduled_for, created_at) VALUES
('notif-1', 'test-user-1', 'reminder', 'Milestone Reminder', 'Don''t forget to check your milestone progress', NOW() + INTERVAL '1 hour', NOW()),
('notif-2', 'test-user-2', 'achievement', 'Achievement Unlocked', 'You completed your first milestone!', NOW() + INTERVAL '2 hours', NOW());
```

This comprehensive staging deployment guide ensures thorough testing and validation of the OffScreen Buddy application before production deployment, with realistic data, production-like infrastructure, and comprehensive monitoring.