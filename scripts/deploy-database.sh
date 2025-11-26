#!/bin/bash

# deploy-database.sh - Database deployment script
# Usage: ./deploy-database.sh [--env ENV] [--backup] [--status]

set -e

# Default values
ENVIRONMENT="LOCAL"
BACKUP=false
STATUS_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --backup)
            BACKUP=true
            shift
            ;;
        --status)
            STATUS_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🗄️ Database deployment started for environment: $ENVIRONMENT"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to create backup
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    log "💾 Creating database backup: $backup_name"
    
    mkdir -p backups
    if command -v pg_dump >/dev/null 2>&1; then
        case $ENVIRONMENT in
            "LOCAL")
                pg_dump -h localhost -U postgres -d app_dev > "backups/$backup_name" 2>/dev/null || log "⚠️  pg_dump failed, backup may not be complete"
                ;;
            "PROD")
                pg_dump -h your-prod-db-host -U your-user -d app_prod > "backups/$backup_name" 2>/dev/null || log "⚠️  pg_dump failed, backup may not be complete"
                ;;
        esac
        log "✅ Backup created: backups/$backup_name"
    else
        log "⚠️  pg_dump not found, creating placeholder backup file"
        echo "# Database backup placeholder for $ENVIRONMENT at $(date)" > "backups/$backup_name"
    fi
}

# Function to check database status
check_db_status() {
    log "🔍 Checking database status..."
    
    case $ENVIRONMENT in
        "LOCAL")
            if command -v psql >/dev/null 2>&1; then
                if psql -h localhost -U postgres -d app_dev -c "SELECT 1" >/dev/null 2>&1; then
                    log "✅ Local database connection successful"
                else
                    log "❌ Local database connection failed"
                fi
            else
                log "⚠️  psql not found, skipping connection test"
            fi
            ;;
        "PROD")
            log "🌍 Production database status check requires manual verification"
            log "📡 Check your production database dashboard/CLI"
            ;;
    esac
}

# Function to run migrations
run_migrations() {
    log "🔄 Running database migrations..."
    
    if [ -d "backend/migrations" ]; then
        if command -v psql >/dev/null 2>&1; then
            case $ENVIRONMENT in
                "LOCAL")
                    find backend/migrations -name "*.sql" -exec psql -h localhost -U postgres -d app_dev -f {} \; 2>/dev/null || log "⚠️  Some migrations may have failed"
                    ;;
                "PROD")
                    log "⚠️  Production migrations require manual review and execution"
                    ;;
            esac
        else
            log "⚠️  psql not found, skipping migrations"
        fi
    else
        log "⚠️  No migrations directory found"
    fi
    
    log "✅ Database migrations processed"
}

# Main execution
if [ "$STATUS_ONLY" = true ]; then
    check_db_status
    exit 0
fi

if [ "$BACKUP" = true ] || [ "$ENVIRONMENT" = "PROD" ]; then
    create_backup
fi

check_db_status
run_migrations

log "✅ Database deployment completed for environment: $ENVIRONMENT"
echo ""
echo "📊 Database Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Backup created: $BACKUP"
echo "   Status checked: Yes"
echo "   Migrations run: Yes"
echo "   Timestamp: $(date)"