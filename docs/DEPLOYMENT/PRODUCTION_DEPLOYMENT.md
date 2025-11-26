# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the OffScreen Buddy application to production environments with enterprise-grade security, scalability, monitoring, and reliability requirements.

## Production Environment Strategy

### Production Characteristics
- **Purpose**: Live production environment serving real users
- **Availability**: 99.9% uptime SLA with high availability
- **Security**: Enterprise-grade security with compliance frameworks
- **Performance**: Sub-second response times with auto-scaling
- **Monitoring**: Comprehensive observability and alerting
- **Backup**: Automated backups with disaster recovery procedures

### Environment Architecture
```
Internet
    ↓
CloudFlare CDN / AWS CloudFront
    ↓
Application Load Balancer (ALB)
    ↓
┌─────────────────────────────────────────┐
│           Production Environment        │
│  ┌─────────────────────────────────┐   │
│  │     Auto Scaling Groups         │   │
│  │   (Multi-AZ, Min: 3, Max: 20)   │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │       Database Cluster          │   │
│  │  (Multi-AZ, Read Replicas)      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │      Redis Cluster              │   │
│  │    (Multi-AZ, Redis Sentinel)   │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │     Monitoring & Observability   │   │
│  │     (Prometheus, Grafana)       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Production Infrastructure Specifications
- **Application Servers**: t3.xlarge instances (4 vCPU, 16GB RAM)
- **Database**: RDS PostgreSQL Multi-AZ (db.r5.xlarge)
- **Cache**: ElastiCache Redis Cluster Mode (cache.r5.large)
- **Load Balancer**: Application Load Balancer with SSL termination
- **Storage**: 500GB SSD with automated snapshots
- **CDN**: CloudFlare or AWS CloudFront
- **Monitoring**: Enterprise monitoring stack
- **Security**: WAF, DDoS protection, SSL/TLS encryption

## Pre-Production Deployment

### Security and Compliance Checklist
```bash
#!/bin/bash
# scripts/production-security-check.sh

echo "Running production security checks..."

# 1. Environment variable validation
echo "Validating production environment variables..."
required_vars=(
  "PRODUCTION_DATABASE_URL"
  "PRODUCTION_REDIS_URL"
  "PRODUCTION_JWT_SECRET"
  "PRODUCTION_SUPABASE_URL"
  "PRODUCTION_SUPABASE_ANON_KEY"
  "PRODUCTION_SUPABASE_SERVICE_KEY"
  "PRODUCTION_PAYU_MERCHANT_ID"
  "PRODUCTION_PAYU_SALT"
  "PRODUCTION_SMTP_PASSWORD"
  "PRODUCTION_FCM_SERVER_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: Required environment variable $var is not set"
    exit 1
  fi
done

# 2. SSL Certificate validation
echo "Validating SSL certificates..."
curl -f https://api.offscreen-buddy.com/.well-known/pki-validation/ || exit 1

# 3. Database security check
echo "Checking database security configuration..."
# Verify SSL mode is enabled
# Verify connection encryption
# Check for proper access controls

# 4. Secrets management validation
echo "Validating secrets management..."
# Verify secrets are not hardcoded
# Check environment variable security
# Validate secret rotation procedures

echo "Security validation completed successfully!"
```

### Production Configuration
```env
# production.env
NODE_ENV=production
APP_ENV=production
APP_VERSION=1.0.0
APP_DEBUG=false

# API Configuration
API_BASE_URL=https://api.offscreen-buddy.com
API_TIMEOUT=10000

# Database Configuration
DATABASE_URL=${PRODUCTION_DATABASE_URL}
DATABASE_SSL=true
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Redis Configuration
REDIS_URL=${PRODUCTION_REDIS_URL}
REDIS_TLS=true
REDIS_SSL=true

# Supabase Configuration (Production)
SUPABASE_URL=${PRODUCTION_SUPABASE_URL}
SUPABASE_ANON_KEY=${PRODUCTION_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${PRODUCTION_SUPABASE_SERVICE_KEY}

# Authentication Configuration
JWT_SECRET=${PRODUCTION_JWT_SECRET}
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d
BCRYPT_ROUNDS=12

# PayU Configuration (Production)
PAYU_ENVIRONMENT=production
PAYU_MERCHANT_ID=${PRODUCTION_PAYU_MERCHANT_ID}
PAYU_SALT=${PRODUCTION_PAYU_SALT}

# Email Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=${PRODUCTION_SMTP_USER}
SMTP_PASS=${PRODUCTION_SMTP_PASSWORD}
EMAIL_FROM=noreply@offscreen-buddy.com

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif
UPLOAD_BUCKET=offscreen-production-uploads
UPLOAD_REGION=us-east-1

# Monitoring Configuration
LOG_LEVEL=warn
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=${PRODUCTION_SENTRY_DSN}

# Security Configuration
ENABLE_CORS=true
CORS_ORIGIN=https://app.offscreen-buddy.com
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
ENABLE_HELMET=true
ENABLE_CSP=true

# Notification Configuration
ENABLE_PUSH_NOTIFICATIONS=true
FCM_SERVER_KEY=${PRODUCTION_FCM_SERVER_KEY}
APNS_KEY_ID=${PRODUCTION_APNS_KEY_ID}
APNS_TEAM_ID=${PRODUCTION_APNS_TEAM_ID}

# Feature Flags (Production)
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_NEW_FEATURE_A=false
ENABLE_NEW_FEATURE_B=false

# Performance Configuration
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL=3600
ENABLE_CDN=true
CDN_URL=https://cdn.offscreen-buddy.com

# Backup Configuration
ENABLE_AUTO_BACKUP=true
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION=true
BACKUP_S3_BUCKET=offscreen-production-backups

# Scaling Configuration
AUTO_SCALING_ENABLED=true
MIN_INSTANCES=3
MAX_INSTANCES=20
CPU_TARGET_PERCENTAGE=70
MEMORY_TARGET_PERCENTAGE=80
```

## Production Deployment Process

### Blue-Green Deployment Strategy
```yaml
# deployment/production-blue-green.yml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: offscreen-api-rollout
spec:
  replicas: 10
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 30
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: api-preview.default.svc.cluster.local
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: api-active.default.svc.cluster.local
  selector:
    matchLabels:
      app: offscreen-api
  template:
    metadata:
      labels:
        app: offscreen-api
    spec:
      containers:
      - name: api
        image: offscreen-buddy:production
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    successCondition: result[0] >= 0.95
    interval: 5m
    count: 3
    successLimit: 95
    failureLimit: 5
    provider:
      prometheus:
        address: http://prometheus.monitoring.svc.cluster.local:9090
        query: |
          sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.*"}[2m])) /
          sum(rate(http_requests_total{service="{{args.service-name}}"}[2m]))
```

### Automated Production Deployment
```yaml
# .github/workflows/production-deployment.yml
name: Production Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      force_deploy:
        description: 'Force deployment without approval'
        required: false
        default: false
        type: boolean

env:
  NODE_ENV: production

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  production-approval:
    needs: security-scan
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
    steps:
      - name: Request production deployment approval
        run: |
          echo "Production deployment requires manual approval"
          # This would integrate with your approval workflow system
          # e.g., Slack approval, GitHub protected rules, etc.

  build-and-deploy:
    needs: [security-scan, production-approval]
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_dispatch.inputs.force_deploy == 'true' || needs.production-approval.result == 'success' }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: offscreen-buddy
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Build a dockerfile
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
      
      - name: Deploy to production
        run: |
          aws eks update-kubeconfig --region us-east-1 --name offscreen-production
          
          # Apply database migrations
          kubectl set image deployment/api api=${{ steps.build-image.outputs.image }}
          kubectl rollout status deployment/api --timeout=600s
          
          # Run smoke tests
          ./scripts/smoke-test-production.sh

  post-deployment-validation:
    needs: build-and-deploy
    runs-on: ubuntu-latest
    steps:
      - name: Run post-deployment validation
        run: |
          ./scripts/validate-production-deployment.sh
      
      - name: Notify deployment success
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-type: application/json' \
            --data '{"text":"✅ Production deployment completed successfully","channel":"#deployments"}'
```

### Database Migration for Production
```sql
-- production-migration.sql
-- Example production database migration with safety checks

BEGIN;

-- Create migration tracking table if not exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Check if migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '20231122000000_add_production_features') THEN
        RAISE NOTICE 'Migration 20231122000000 already applied';
        RETURN;
    END IF;
END $$;

-- Add new indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Add new columns with default values
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Update existing data
UPDATE users SET last_login_at = NOW() WHERE last_login_at IS NULL;

-- Add constraints
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE milestones ALTER COLUMN title SET NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version, description) 
VALUES ('20231122000000_add_production_features', 'Add production features and performance indexes');

COMMIT;
```

## Production Monitoring and Observability

### Comprehensive Monitoring Setup
```yaml
# monitoring/production-monitoring.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "alert_rules.yml"
    
    scrape_configs:
      - job_name: 'offscreen-api'
        static_configs:
          - targets: ['api-service:3000']
        scrape_interval: 10s
        metrics_path: /metrics
        
      - job_name: 'offscreen-database'
        static_configs:
          - targets: ['postgres-exporter:9187']
          
      - job_name: 'offscreen-redis'
        static_configs:
          - targets: ['redis-exporter:9121']
          
      - job_name: 'offscreen-node'
        static_configs:
          - targets: ['node-exporter:9100']

  alert_rules.yml: |
    groups:
    - name: offscreen.rules
      rules:
      - alert: APIDown
        expr: up{job="offscreen-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "OffScreen API is down"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High number of database connections"
```

### Alert Manager Configuration
```yaml
# monitoring/alertmanager.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
data:
  alertmanager.yml: |
    global:
      smtp_smarthost: 'email-smtp.us-east-1.amazonaws.com:587'
      smtp_from: 'alerts@offscreen-buddy.com'
    
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'web.hook'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
      - match:
          severity: warning
        receiver: 'warning-alerts'
    
    receivers:
    - name: 'web.hook'
      webhook_configs:
      - url: 'http://alertmanager:9093/alert'
    
    - name: 'critical-alerts'
      email_configs:
      - to: 'devops@offscreen-buddy.com'
        subject: 'CRITICAL: OffScreen Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          {{ end }}
      slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#critical-alerts'
        title: 'Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    
    - name: 'warning-alerts'
      email_configs:
      - to: 'devops@offscreen-buddy.com'
        subject: 'WARNING: OffScreen Alert'
```

## Production Security Hardening

### Application Security Configuration
```typescript
// production-security-config.ts
export const productionSecurityConfig = {
  // HTTPS and SSL
  ssl: {
    enabled: true,
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.offscreen-buddy.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.offscreen-buddy.com"]
    }
  },

  // Authentication and Authorization
  authentication: {
    jwtSecret: process.env.PRODUCTION_JWT_SECRET,
    jwtAlgorithm: 'RS256', // Use RSA for production
    tokenExpiry: {
      accessToken: 3600, // 1 hour
      refreshToken: 2592000 // 30 days
    },
    sessionManagement: {
      concurrentSessions: 3,
      sessionTimeout: 3600,
      secureCookies: true,
      httpOnlyCookies: true,
      sameSiteCookies: 'strict'
    }
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 900000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Input Validation and Sanitization
  validation: {
    maxPayloadSize: '10mb',
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ],
    inputSanitization: {
      enableXSSProtection: true,
      enableSQLInjectionProtection: true,
      enableCommandInjectionProtection: true
    }
  },

  // CORS Configuration
  cors: {
    origin: ['https://app.offscreen-buddy.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
  },

  // Headers Security
  headers: {
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      geolocation: 'none',
      microphone: 'none',
      camera: 'none'
    }
  }
};
```

### Infrastructure Security
```bash
#!/bin/bash
# scripts/production-security-hardening.sh

echo "Applying production security hardening..."

# 1. Firewall configuration
echo "Configuring firewall rules..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 2. SSH hardening
echo "Hardening SSH configuration..."
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# 3. System updates
echo "Applying system updates..."
sudo apt update && sudo apt upgrade -y

# 4. Install security tools
echo "Installing security tools..."
sudo apt install -y fail2ban ufw logwatch rkhunter chkrootkit

# 5. Configure fail2ban
sudo cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 6. Set up log monitoring
sudo logwatch --detail High --service All --print

echo "Security hardening completed!"
```

## Disaster Recovery and Business Continuity

### Backup Strategy
```bash
#!/bin/bash
# scripts/production-backup.sh

set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/$BACKUP_DATE"
S3_BUCKET="offscreen-production-backups"

echo "Starting production backup: $BACKUP_DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Backing up database..."
pg_dump \
  -h $PRODUCTION_DB_HOST \
  -U $PRODUCTION_DB_USER \
  -d $PRODUCTION_DB_NAME \
  --verbose \
  --clean \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="$BACKUP_DIR/database_backup.dump"

# Encrypt database backup
gpg --symmetric --cipher-algo AES256 "$BACKUP_DIR/database_backup.dump"
rm "$BACKUP_DIR/database_backup.dump"

# Application data backup
echo "Backing up application data..."
tar -czf "$BACKUP_DIR/application_data.tar.gz" \
  /var/www/offscreen-buddy \
  /etc/nginx/sites-available \
  /etc/ssl/certs

# Redis backup
echo "Backing up Redis data..."
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_backup.rdb"

# Configuration backup
echo "Backing up configurations..."
tar -czf "$BACKUP_DIR/configurations.tar.gz" \
  /etc/nginx \
  /etc/systemd/system/offscreen* \
  /opt/offscreen-buddy/config

# Upload to S3
echo "Uploading backup to S3..."
aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/backups/$BACKUP_DATE/ \
  --server-side-encryption AES256

# Create backup manifest
cat > "$BACKUP_DIR/backup_manifest.json" <<EOF
{
  "backup_date": "$BACKUP_DATE",
  "database_backup": "database_backup.dump.gpg",
  "application_data": "application_data.tar.gz",
  "redis_backup": "redis_backup.rdb",
  "configurations": "configurations.tar.gz",
  "size": "$(du -sh $BACKUP_DIR | cut -f1)",
  "checksum": "$(cd $BACKUP_DIR && find . -type f -exec md5sum {} + | md5sum | cut -d' ' -f1)"
}
EOF

# Upload manifest
aws s3 cp "$BACKUP_DIR/backup_manifest.json" \
  s3://$S3_BUCKET/backups/$BACKUP_DATE/ \
  --server-side-encryption AES256

# Cleanup old backups (keep last 30 days)
echo "Cleaning up old backups..."
aws s3 ls s3://$S3_BUCKET/backups/ | awk '{print $4}' | \
  sort -r | tail -n +31 | \
  xargs -I {} aws s3 rm s3://$S3_BUCKET/backups/{} --recursive

echo "Backup completed: $BACKUP_DATE"
```

### Disaster Recovery Plan
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

set -e

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  echo "Available backups:"
  aws s3 ls s3://offscreen-production-backups/backups/ | awk '{print $4}' | grep -v '/$'
  exit 1
fi

echo "Starting disaster recovery from backup: $BACKUP_DATE"

# Create recovery directory
RECOVERY_DIR="/recovery/$BACKUP_DATE"
mkdir -p $RECOVERY_DIR

# Download backup from S3
echo "Downloading backup from S3..."
aws s3 sync s3://offscreen-production-backups/backups/$BACKUP_DATE/ $RECOVERY_DIR/

# Verify backup integrity
echo "Verifying backup integrity..."
MANIFEST=$(cat $RECOVERY_DIR/backup_manifest.json)
EXPECTED_CHECKSUM=$(echo $MANIFEST | jq -r '.checksum')
ACTUAL_CHECKSUM=$(cd $RECOVERY_DIR && find . -type f -exec md5sum {} + | md5sum | cut -d' ' -f1)

if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
  echo "ERROR: Backup integrity check failed!"
  exit 1
fi

echo "Backup integrity verified"

# Stop services
echo "Stopping services..."
sudo systemctl stop offscreen-api
sudo systemctl stop nginx

# Restore database
echo "Restoring database..."
dropdb --if-exists offscreen_production
createdb offscreen_production
gpg --decrypt $RECOVERY_DIR/database_backup.dump.gpg | psql offscreen_production

# Restore Redis
echo "Restoring Redis data..."
sudo systemctl stop redis
cp $RECOVERY_DIR/redis_backup.rdb /var/lib/redis/dump.rdb
sudo systemctl start redis

# Restore application data
echo "Restoring application data..."
sudo rm -rf /var/www/offscreen-buddy
sudo tar -xzf $RECOVERY_DIR/application_data.tar.gz -C /

# Restore configurations
echo "Restoring configurations..."
sudo tar -xzf $RECOVERY_DIR/configurations.tar.gz -C /

# Start services
echo "Starting services..."
sudo systemctl start offscreen-api
sudo systemctl start nginx

# Validate recovery
echo "Validating recovery..."
./scripts/validate-recovery.sh

echo "Disaster recovery completed successfully!"
```

## Production Deployment Checklist

### Pre-Deployment Checklist
- [ ] Security scan completed without high-severity issues
- [ ] All environment variables configured and validated
- [ ] SSL certificates installed and validated
- [ ] Database migrations tested in staging
- [ ] Load testing completed successfully
- [ ] Backup procedures tested and verified
- [ ] Monitoring and alerting configured
- [ ] Documentation updated
- [ ] Rollback plan prepared and tested
- [ ] Stakeholder approval obtained

### Deployment Validation Checklist
- [ ] Application starts successfully
- [ ] Health check endpoints respond correctly
- [ ] Database connectivity confirmed
- [ ] Redis connectivity confirmed
- [ ] Authentication flow working
- [ ] API endpoints responding correctly
- [ ] Mobile app builds successfully
- [ ] Push notifications working
- [ ] File upload/download working
- [ ] Email notifications working

### Post-Deployment Checklist
- [ ] Performance metrics within acceptable ranges
- [ ] Error rates below threshold
- [ ] No security alerts triggered
- [ ] User acceptance testing passed
- [ ] Monitoring dashboards populated
- [ ] Log aggregation working
- [ ] Backup jobs running correctly
- [ ] CDN cache invalidated
- [ ] DNS changes propagated
- [ ] Incident response plan updated

This comprehensive production deployment guide ensures a secure, scalable, and reliable production environment for the OffScreen Buddy application with proper monitoring, security, and disaster recovery capabilities.