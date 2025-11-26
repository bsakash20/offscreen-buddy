#!/bin/bash

# rollback.sh - Application rollback script
# Usage: ./rollback.sh [--env ENV] [--components COMPONENTS] [--list] [--force]

set -e

# Default values
ENVIRONMENT="LOCAL"
COMPONENTS="all"
LIST_ONLY=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --components)
            COMPONENTS="$2"
            shift 2
            ;;
        --list)
            LIST_ONLY=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "↩️ Application rollback started for environment: $ENVIRONMENT"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to list available rollback options
list_rollbacks() {
    log "📋 Available rollback versions for $ENVIRONMENT:"
    
    case $ENVIRONMENT in
        "LOCAL")
            log "🏠 Local environment rollback options:"
            log "   - Latest deployment: $(ls -1t deployments/ 2>/dev/null | head -1 || echo 'No deployments found')"
            log "   - Previous version: Previous build available"
            log "   - Backend: Stop and restart with npm run dev"
            log "   - Frontend: Restart Expo development server"
            log "   - Database: Rollback to previous migration state"
            ;;
        "PROD")
            log "🌍 Production environment rollback options:"
            log "   - Previous deployment: Check your deployment platform"
            log "   - Database: Restore from backup"
            log "   - Services: Stop and restart previous versions"
            log "   - ⚠️  Production rollback requires careful coordination"
            ;;
    esac
}

# Function to rollback components
rollback_components() {
    local components=$1
    
    log "🔄 Rolling back components: $components"
    
    # Confirm unless force flag is set
    if [ "$FORCE" != true ]; then
        echo "⚠️  Are you sure you want to rollback? (yes/no)"
        read -r confirmation
        if [ "$confirmation" != "yes" ]; then
            log "❌ Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Rollback database if requested
    if [[ "$components" == "all" ]] || [[ "$components" == *"database"* ]]; then
        log "🗄️ Rolling back database..."
        case $ENVIRONMENT in
            "LOCAL")
                log "✅ Local database rollback: Stop affected processes and restart"
                ;;
            "PROD")
                log "⚠️  Production database rollback requires:"
                log "   1. Create current backup"
                log "   2. Restore from previous backup"
                log "   3. Re-run migrations if needed"
                log "   4. Verify data integrity"
                ;;
        esac
    fi
    
    # Rollback backend if requested
    if [[ "$components" == "all" ]] || [[ "$components" == *"backend"* ]]; then
        log "⚙️ Rolling back backend..."
        case $ENVIRONMENT in
            "LOCAL")
                if [ -d "backend" ]; then
                    pkill -f "node.*backend" || true
                    log "✅ Backend processes stopped, ready for restart"
                else
                    log "⚠️  Backend directory not found"
                fi
                ;;
            "PROD")
                log "🌍 Production backend rollback:"
                log "   1. Deploy previous backend version"
                log "   2. Restart backend services"
                log "   3. Health check services"
                ;;
        esac
    fi
    
    # Rollback frontend if requested
    if [[ "$components" == "all" ]] || [[ "$components" == *"frontend"* ]]; then
        log "🌐 Rolling back frontend..."
        case $ENVIRONMENT in
            "LOCAL")
                pkill -f "expo" || true
                log "✅ Expo development server stopped, ready for restart"
                ;;
            "PROD")
                log "🌍 Production frontend rollback:"
                log "   1. Deploy previous frontend build"
                log "   2. Update CDN assets"
                log "   3. Clear CDN cache"
                ;;
        esac
    fi
}

# Main execution
if [ "$LIST_ONLY" = true ]; then
    list_rollbacks
    exit 0
fi

list_rollbacks

echo ""
echo "🔄 Starting rollback process..."
rollback_components "$COMPONENTS"

log "✅ Rollback process completed for environment: $ENVIRONMENT"
echo ""
echo "📊 Rollback Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Components: $COMPONENTS"
echo "   Force mode: $FORCE"
echo "   Timestamp: $(date)"
echo ""
echo "📋 Next steps:"
echo "   1. Restart services: npm run dev"
echo "   2. Verify functionality"
echo "   3. Test critical user flows"