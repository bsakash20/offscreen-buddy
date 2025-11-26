#!/bin/bash

# deploy.sh - Main deployment orchestration script
# Usage: ./deploy.sh [--env ENV] [--force] [--dry-run] [--validate]

set -e

# Default values
ENVIRONMENT="LOCAL"
FORCE=false
DRY_RUN=false
VALIDATE_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
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

echo "🚀 Deployment started for environment: $ENVIRONMENT"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to execute deployment steps
deploy_component() {
    local component=$1
    local script=$2
    
    log "Deploying $component..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: ./$script --env $ENVIRONMENT"
        return 0
    fi
    
    if [ -f "scripts/$script" ]; then
        if ./scripts/"$script" --env "$ENVIRONMENT"; then
            log "✅ $component deployment completed successfully"
        else
            log "❌ $component deployment failed"
            return 1
        fi
    else
        log "⚠️  Script scripts/$script not found, skipping $component"
    fi
}

# Validate environment
if [ "$VALIDATE_ONLY" = true ]; then
    log "🔍 Validating deployment environment..."
    
    # Check if environment file exists
    env_file=".env.$ENVIRONMENT"
    if [ ! -f "$env_file" ]; then
        log "⚠️  Environment file $env_file not found"
    else
        log "✅ Environment file $env_file found"
    fi
    
    # Check if all deployment scripts exist
    required_scripts=("deploy-frontend.sh" "deploy-backend.sh" "deploy-database.sh")
    for script in "${required_scripts[@]}"; do
        if [ -f "scripts/$script" ]; then
            log "✅ $script found"
        else
            log "❌ $script missing"
        fi
    done
    
    log "✅ Validation complete"
    exit 0
fi

# Main deployment flow
log "Starting deployment sequence for $ENVIRONMENT..."

# Deploy in order: infrastructure, database, backend, frontend
deploy_component "infrastructure" "deploy-infrastructure.sh"
deploy_component "database" "deploy-database.sh"
deploy_component "backend" "deploy-backend.sh"
deploy_component "frontend" "deploy-frontend.sh"

log "🎉 Deployment completed successfully for environment: $ENVIRONMENT"
echo ""
echo "📊 Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Timestamp: $(date)"
echo "   Force mode: $FORCE"
echo "   Dry run: $DRY_RUN"