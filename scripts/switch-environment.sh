#!/bin/bash

# switch-environment.sh - Environment switching script
# Usage: ./switch-environment.sh [--to ENV] [--auto]

set -e

# Default values
TARGET_ENV=""
AUTO_MODE=false
SHOW_STATUS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --to)
            TARGET_ENV="$2"
            shift 2
            ;;
        --auto)
            AUTO_MODE=true
            shift
            ;;
        *)
            SHOW_STATUS=true
            shift
            ;;
    esac
done

echo "🔄 Environment switching tool"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show current status
show_status() {
    log "📊 Current environment status:"
    
    # Check for environment files
    env_files=(".env.local" ".env.production" "backend/.env.local" "backend/.env.production")
    for file in "${env_files[@]}"; do
        if [ -f "$file" ]; then
            log "✅ $file exists"
        else
            log "❌ $file missing"
        fi
    done
    
    # Check running services
    log "🔍 Running services:"
    if pgrep -f "expo" >/dev/null; then
        log "✅ Expo development server running"
    else
        log "❌ Expo development server not running"
    fi
    
    if pgrep -f "node.*backend" >/dev/null; then
        log "✅ Backend server running"
    else
        log "❌ Backend server not running"
    fi
    
    # Show current environment from package.json or other indicators
    if [ -f ".env.local" ]; then
        if grep -q "PROD" .env.local 2>/dev/null; then
            log "🌍 Current: Production configuration detected"
        else
            log "🏠 Current: Local configuration detected"
        fi
    else
        log "⚠️  No environment file detected"
    fi
}

# Function to switch to local environment
switch_to_local() {
    log "🏠 Switching to LOCAL environment..."
    
    # Backup current environment files
    if [ -f ".env.production" ]; then
        mv .env.production .env.production.backup
        log "✅ Backed up .env.production"
    fi
    
    # Set up local environment files
    if [ ! -f ".env.local" ]; then
        log "📝 Creating .env.local for local development..."
        cat > .env.local << EOF
# Local Development Environment
NODE_ENV=development
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_ENVIRONMENT=local
EXPO_PUBLIC_DEBUG=true
EOF
    fi
    
    if [ ! -f "backend/.env.local" ]; then
        log "📝 Creating backend/.env.local for local development..."
        mkdir -p backend
        cat > backend/.env.local << EOF
# Backend Local Development
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://localhost:5432/app_dev
EOF
    fi
    
    # Restart services
    log "🔄 Restarting services for local environment..."
    pkill -f "expo\|node.*server" || true
    sleep 2
}

# Function to switch to production environment
switch_to_production() {
    log "🌍 Switching to PRODUCTION environment..."
    
    # Check if production environment file exists
    if [ ! -f ".env.production" ]; then
        log "❌ .env.production file not found!"
        log "Please create .env.production with production configuration"
        exit 1
    fi
    
    # Backup local environment
    if [ -f ".env.local" ]; then
        mv .env.local .env.local.backup
        log "✅ Backed up .env.local"
    fi
    
    # Use production environment
    cp .env.production .env.local
    log "✅ Switched to production environment configuration"
    
    # Stop development services
    log "🛑 Stopping development services..."
    pkill -f "expo\|node.*server" || true
    
    log "⚠️  Production environment requires proper deployment setup"
    log "Use: npm run deploy:prod"
}

# Main execution
if [ "$SHOW_STATUS" = true ] || [ $# -eq 0 ]; then
    show_status
fi

if [ "$TARGET_ENV" != "" ]; then
    case $TARGET_ENV in
        "LOCAL")
            switch_to_local
            ;;
        "PROD"|"production")
            switch_to_production
            ;;
        *)
            log "❌ Unknown environment: $TARGET_ENV"
            log "Available: LOCAL, PROD"
            exit 1
            ;;
    esac
elif [ "$AUTO_MODE" = true ]; then
    # Auto-detect environment based on running services
    if pgrep -f "expo" >/dev/null; then
        log "🔄 Auto mode: Development server detected, ensuring LOCAL environment"
        switch_to_local
    else
        log "🔄 Auto mode: No development server, assuming production"
        show_status
    fi
fi

echo ""
echo "📋 Environment Status:"
if [ "$TARGET_ENV" = "LOCAL" ]; then
    echo "✅ Environment: LOCAL"
    echo "   Next: npm run dev"
elif [ "$TARGET_ENV" = "PROD" ]; then
    echo "✅ Environment: PRODUCTION"  
    echo "   Next: npm run deploy:prod"
else
    show_status
fi
echo "   Timestamp: $(date)"