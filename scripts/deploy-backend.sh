#!/bin/bash

# deploy-backend.sh - Backend deployment script
# Usage: ./deploy-backend.sh [--env ENV] [--migrate-only]

set -e

# Default values
ENVIRONMENT="LOCAL"
MIGRATE_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --migrate-only)
            MIGRATE_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "⚙️ Backend deployment started for environment: $ENVIRONMENT"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Validate environment
log "🔍 Validating environment..."
case $ENVIRONMENT in
    "LOCAL")
        PORT=3001
        DB_URL="postgresql://localhost:5432/app_dev"
        ;;
    "PROD")
        PORT=3001
        DB_URL="postgresql://your-prod-db-url"
        ;;
    *)
        log "❌ Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Check if backend directory exists
if [ ! -d "backend" ]; then
    log "❌ Backend directory not found"
    exit 1
fi

# Install dependencies
log "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Run migrations if needed
if [ "$MIGRATE_ONLY" = true ]; then
    log "🗄️ Running database migrations..."
    cd backend && npm run migrate 2>/dev/null || log "⚠️  No migration script found"
    cd ..
    exit 0
fi

# Start backend service
log "🚀 Starting backend service..."

case $ENVIRONMENT in
    "LOCAL")
        log "🏠 Starting backend in development mode..."
        cd backend && npm run dev &
        BACKEND_PID=$!
        cd ..
        
        # Wait a moment for backend to start
        sleep 5
        
        # Health check
        if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
            log "✅ Backend started successfully on port $PORT"
        else
            log "⚠️  Backend health check failed, but process may still be starting"
        fi
        ;;
    "PROD")
        log "🚀 Starting backend in production mode..."
        cd backend && npm start &
        BACKEND_PID=$!
        cd ..
        
        log "✅ Backend deployment initiated (PID: $BACKEND_PID)"
        log "📡 Backend should be available at your production URL"
        ;;
esac

log "✅ Backend deployment completed for environment: $ENVIRONMENT"
echo ""
echo "📊 Backend Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Port: $PORT"
echo "   Database: $DB_URL"
echo "   PID: $BACKEND_PID"
echo "   Timestamp: $(date)"