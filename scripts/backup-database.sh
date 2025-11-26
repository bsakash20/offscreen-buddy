#!/bin/bash

# backup-database.sh - Database backup script
# Usage: ./backup-database.sh [--list]

set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to list backups
list_backups() {
    log "📋 Available database backups:"
    
    if [ -d "backups" ] && [ "$(ls -A backups)" ]; then
        echo ""
        ls -la backups/ | grep -E '\.(sql|dump|backup)$' | while read -r line; do
            echo "   $line"
        done
        echo ""
        echo "Total backups: $(ls -1 backups/ | grep -E '\.(sql|dump|backup)$' | wc -l)"
    else
        log "❌ No backups directory found or no backups available"
    fi
}

# Function to create a backup
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="backups/$backup_name"
    
    log "💾 Creating database backup: $backup_name"
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    # Check if PostgreSQL tools are available
    if command -v pg_dump >/dev/null 2>&1; then
        # Try to dump database
        if pg_dump -h localhost -U postgres -d app_dev > "$backup_path" 2>/dev/null; then
            log "✅ Backup created successfully: $backup_path"
        elif pg_dump -h localhost -U app -d app > "$backup_path" 2>/dev/null; then
            log "✅ Backup created successfully: $backup_path"
        else
            log "⚠️  pg_dump failed, creating placeholder backup"
            echo "-- Database backup placeholder" > "$backup_path"
            echo "-- Created: $(date)" >> "$backup_path"
            echo "-- Note: Replace with actual database dump" >> "$backup_path"
        fi
    else
        log "⚠️  pg_dump not found, creating placeholder backup"
        echo "-- Database backup placeholder" > "$backup_path"
        echo "-- Created: $(date)" >> "$backup_path"
        echo "-- Note: Install PostgreSQL client tools for actual backups" >> "$backup_path"
    fi
    
    # Create backup metadata
    cat > "${backup_path}.meta" << EOF
Backup: $backup_name
Created: $(date)
Type: database
Environment: local
Size: $(ls -lh "$backup_path" | awk '{print $5}')
EOF
    
    log "✅ Backup metadata created: ${backup_path}.meta"
}

# Function to restore a backup
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        log "❌ Backup file not specified"
        exit 1
    fi
    
    if [ ! -f "backups/$backup_file" ]; then
        log "❌ Backup file not found: backups/$backup_file"
        exit 1
    fi
    
    log "🔄 Restoring backup: $backup_file"
    echo "⚠️  This will overwrite the current database!"
    echo "Are you sure you want to continue? (yes/no)"
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log "❌ Restore cancelled by user"
        exit 0
    fi
    
    # Create a backup of current state first
    create_backup
    
    # Attempt restore
    if command -v psql >/dev/null 2>&1; then
        if psql -h localhost -U postgres -d app_dev -f "backups/$backup_file" >/dev/null 2>&1; then
            log "✅ Database restored successfully from $backup_file"
        elif psql -h localhost -U app -d app -f "backups/$backup_file" >/dev/null 2>&1; then
            log "✅ Database restored successfully from $backup_file"
        else
            log "❌ Restore failed - check database connection and permissions"
        fi
    else
        log "❌ psql not found - cannot restore database"
        log "📁 Backup file location: backups/$backup_file"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    local days_to_keep=${1:-30}
    
    log "🧹 Cleaning up backups older than $days_to_keep days..."
    
    if [ -d "backups" ]; then
        local deleted_count=0
        find backups/ -name "*.sql" -mtime +$days_to_keep -type f | while read -r old_backup; do
            rm -f "$old_backup" "${old_backup}.meta"
            log "🗑️  Deleted old backup: $(basename "$old_backup")"
            ((deleted_count++))
        done
        
        if [ $deleted_count -eq 0 ]; then
            log "✅ No old backups to clean up"
        else
            log "✅ Cleaned up $deleted_count old backup(s)"
        fi
    else
        log "⚠️  Backups directory not found"
    fi
}

# Parse command line arguments
case "${1:-}" in
    --list)
        list_backups
        ;;
    --restore)
        if [ -z "$2" ]; then
            echo "Usage: ./backup-database.sh --restore <backup_filename>"
            exit 1
        fi
        restore_backup "$2"
        ;;
    --cleanup)
        cleanup_old_backups "${2:-30}"
        ;;
    *)
        create_backup
        ;;
esac

echo ""
echo "📊 Database Backup Summary:"
echo "   Timestamp: $(date)"
echo "   Backup location: ./backups/"
echo ""
echo "📋 Available commands:"
echo "   ./backup-database.sh               # Create new backup"
echo "   ./backup-database.sh --list        # List all backups"
echo "   ./backup-database.sh --restore FILE # Restore specific backup"
echo "   ./backup-database.sh --cleanup DAYS # Cleanup backups older than DAYS"