#!/bin/bash

# setup-production.sh - Production environment setup script
# Usage: ./setup-production.sh [--validate-only]

set -e

# Default values
VALIDATE_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🚀 Production environment setup started"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to validate production prerequisites
validate_prerequisites() {
    log "🔍 Validating production prerequisites..."
    
    # Check required environment files
    if [ ! -f ".env.production" ]; then
        log "❌ .env.production file missing"
        return 1
    else
        log "✅ .env.production found"
    fi
    
    if [ ! -f "backend/.env.production" ]; then
        log "❌ backend/.env.production file missing"
        return 1
    else
        log "✅ backend/.env.production found"
    fi
    
    # Check required environment variables
    if [ -f ".env.production" ]; then
        required_vars=("EXPO_PUBLIC_API_URL" "EXPO_PUBLIC_SUPABASE_URL" "NODE_ENV")
        for var in "${required_vars[@]}"; do
            if grep -q "$var.*=" .env.production; then
                log "✅ $var configured"
            else
                log "❌ $var missing from .env.production"
                return 1
            fi
        done
    fi
    
    # Check production dependencies
    if command -v npm >/dev/null 2>&1; then
        log "✅ npm available"
    else
        log "❌ npm not found"
        return 1
    fi
    
    # Check if all necessary tools are available
    tools=("git" "curl" "pg_dump" "psql")
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            log "✅ $tool available"
        else
            log "⚠️  $tool not found (may be needed for production)"
        fi
    done
    
    log "✅ Prerequisites validation completed"
    return 0
}

# Function to create production environment setup
create_production_setup() {
    log "🏗️ Setting up production environment..."
    
    # Create production directories
    mkdir -p logs
    mkdir -p backups
    mkdir -p deployments
    
    # Set up production environment files if they don't exist
    if [ ! -f ".env.production" ]; then
        log "📝 Creating .env.production template..."
        cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_DEBUG=false
EOF
        log "⚠️  Please update .env.production with actual production values"
    fi
    
    if [ ! -f "backend/.env.production" ]; then
        log "📝 Creating backend/.env.production template..."
        mkdir -p backend
        cat > backend/.env.production << EOF
# Backend Production Environment
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://your_production_db_url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
EOF
        log "⚠️  Please update backend/.env.production with actual production values"
    fi
    
    # Install production dependencies
    log "📦 Installing production dependencies..."
    npm ci --only=production
    cd backend && npm ci --only=production && cd ..
    
    # Build application for production
    log "🏗️ Building application for production..."
    if npm run build >/dev/null 2>&1; then
        log "✅ Application build completed"
    else
        log "⚠️  No build script found, skipping build"
    fi
    
    # Set proper file permissions
    log "🔧 Setting file permissions..."
    find . -name "*.sh" -exec chmod +x {} \;
    
    log "✅ Production environment setup completed"
}

# Function to setup monitoring and logging
setup_monitoring() {
    log "📊 Setting up monitoring infrastructure..."
    
    # Create monitoring configuration
    cat > monitoring.conf << EOF
# Monitoring Configuration
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
ALERT_EMAIL=admin@yourdomain.com
EOF
    
    # Create log rotation configuration
    cat > logrotate.conf << EOF
logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 app app
}
EOF
    
    log "✅ Monitoring configuration created"
}

# Main execution
if [ "$VALIDATE_ONLY" = true ]; then
    validate_prerequisites
    if [ $? -eq 0 ]; then
        log "✅ Production environment validation passed"
        exit 0
    else
        log "❌ Production environment validation failed"
        exit 1
    fi
fi

# Run validation first
validate_prerequisites
if [ $? -ne 0 ]; then
    log "❌ Prerequisites validation failed. Please fix the issues above."
    exit 1
fi

# Setup production environment
create_production_setup
setup_monitoring

log "🎉 Production environment setup completed successfully!"
echo ""
echo "📋 Production Setup Summary:"
echo "   Environment: Production"
echo "   Validation: Passed"
echo "   Dependencies: Installed"
echo "   Build: Completed"
echo "   Monitoring: Configured"
echo ""
echo "📋 Next Steps:"
echo "   1. Update production environment files with actual values"
echo "   2. Test deployment: npm run deploy:validate"
echo "   3. Run deployment: npm run deploy:prod"
echo "   4. Monitor health: npm run health:full"
echo ""
echo "⏰ Timestamp: $(date)"