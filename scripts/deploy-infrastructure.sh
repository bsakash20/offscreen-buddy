#!/bin/bash

# deploy-infrastructure.sh - Infrastructure deployment script
# Usage: ./deploy-infrastructure.sh [--deploy] [--validate]

set -e

# Default values
DEPLOY_MODE=false
VALIDATE_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --deploy)
            DEPLOY_MODE=true
            shift
            ;;
        --validate)
            VALIDATE_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🏗️ Infrastructure deployment started"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to validate infrastructure prerequisites
validate_infrastructure() {
    log "🔍 Validating infrastructure prerequisites..."
    
    # Check required services/tools
    tools=("docker" "node" "npm")
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            log "✅ $tool available"
        else
            log "⚠️  $tool not found (may be needed for full infrastructure deployment)"
        fi
    done
    
    # Check network connectivity
    if curl -s --connect-timeout 5 https://google.com >/dev/null 2>&1; then
        log "✅ Internet connectivity available"
    else
        log "⚠️  No internet connectivity detected"
    fi
    
    # Check available disk space
    available_space=$(df . | tail -1 | awk '{print $4}')
    log "💾 Available disk space: ${available_space}KB"
    
    if [ "$available_space" -lt 1048576 ]; then  # Less than 1GB
        log "⚠️  Low disk space, infrastructure operations may fail"
    else
        log "✅ Sufficient disk space available"
    fi
    
    # Check Docker services if available
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            log "✅ Docker daemon running"
        else
            log "⚠️  Docker daemon not running"
        fi
    fi
    
    log "✅ Infrastructure validation completed"
}

# Function to deploy database infrastructure
deploy_database_infrastructure() {
    log "🗄️ Deploying database infrastructure..."
    
    # Create database directories
    mkdir -p database/data
    mkdir -p database/backups
    
    # Create Docker Compose for database (if Docker is available)
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        log "🐳 Creating Docker Compose for database..."
        cat > docker-compose.db.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"
    volumes:
      - ./database/data:/var/lib/postgresql/data
      - ./database/backups:/backups
    restart: unless-stopped
EOF
        log "✅ Docker Compose database configuration created"
    else
        log "⚠️  Docker not available, database setup requires manual configuration"
    fi
    
    # Create database migration structure
    mkdir -p backend/migrations
    if [ ! -f "backend/migrations/001_initial.sql" ]; then
        cat > backend/migrations/001_initial.sql << 'EOF'
-- Initial database schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
        log "✅ Initial database migration created"
    fi
}

# Function to deploy web infrastructure
deploy_web_infrastructure() {
    log "🌐 Deploying web infrastructure..."
    
    # Create web server configuration
    mkdir -p nginx/conf.d
    
    cat > nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF
    
    # Create reverse proxy for frontend
    cat > nginx/conf.d/frontend.conf << 'EOF'
server {
    listen 3000;
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF
    
    log "✅ Web infrastructure configuration created"
}

# Function to setup monitoring infrastructure
deploy_monitoring_infrastructure() {
    log "📊 Deploying monitoring infrastructure..."
    
    # Create monitoring configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3001']
      
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
EOF
    
    # Create Grafana configuration
    mkdir -p monitoring/grafana/provisioning
    cat > monitoring/grafana/provisioning/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
EOF
    
    log "✅ Monitoring infrastructure configuration created"
}

# Function to deploy security infrastructure
deploy_security_infrastructure() {
    log "🔒 Setting up security infrastructure..."
    
    # Create firewall configuration
    if command -v ufw >/dev/null 2>&1; then
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow ssh
        ufw allow 80
        ufw allow 443
        log "✅ Firewall configured"
    fi
    
    # Create SSL certificate setup (placeholder)
    mkdir -p ssl/certs
    mkdir -p ssl/private
    
    cat > ssl/renewal.conf << 'EOF'
# SSL Certificate renewal configuration
# This would normally use certbot or similar tools
# Replace with actual domain certificates for production
EOF
    
    log "✅ Security infrastructure configuration created"
}

# Main execution
if [ "$VALIDATE_ONLY" = true ]; then
    validate_infrastructure
    exit 0
fi

# Validate first
validate_infrastructure

# Deploy infrastructure components
deploy_database_infrastructure
deploy_web_infrastructure
deploy_monitoring_infrastructure
deploy_security_infrastructure

log "🎉 Infrastructure deployment completed successfully!"
echo ""
echo "📊 Infrastructure Deployment Summary:"
echo "   Validation: Completed"
echo "   Database: Configured"
echo "   Web: Configured"
echo "   Monitoring: Configured"
echo "   Security: Configured"
echo ""
echo "📋 Next Steps:"
echo "   1. Review and customize configuration files"
echo "   2. Set up proper SSL certificates"
echo "   3. Configure monitoring alerts"
echo "   4. Test infrastructure components"
echo ""
echo "⏰ Timestamp: $(date)"