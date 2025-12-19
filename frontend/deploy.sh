#!/bin/bash
set -euo pipefail

################################################################################
# Frontend Deployment Script for recruiting-sg.com
# Deploys Next.js frontend with Traefik integration
################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
DEPLOY_DIR="/root/recruitment-crm-deploy/frontend"
COMPOSE_FILE="docker-compose.traefik.yml"
TRAEFIK_NETWORK="root_traefik"

log_info "Starting frontend deployment for recruiting-sg.com..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Check Traefik network
if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    log_error "Traefik network not found"
    exit 1
fi
log_success "Traefik network found"

# Navigate to deploy directory
cd "$DEPLOY_DIR" || exit 1

# Pull latest changes
log_info "Pulling latest changes..."
git pull origin claude/crm-recruiting-backend-kRGn2
log_success "Repository updated"

# Create .env if not exists
if [ ! -f .env ]; then
    log_info "Creating .env file..."
    cat > .env <<EOF
NEXT_PUBLIC_API_URL=https://recruiting-sg.com/api
EOF
    log_success ".env created"
fi

# Build image
log_info "Building Docker image..."
docker-compose -f "$COMPOSE_FILE" build --no-cache
log_success "Image built"

# Stop old container
log_info "Stopping old container..."
docker-compose -f "$COMPOSE_FILE" down || true

# Start new container
log_info "Starting new container..."
docker-compose -f "$COMPOSE_FILE" up -d
log_success "Container started"

# Wait for health check
log_info "Waiting for frontend to be ready..."
sleep 10

# Test endpoint
if curl -f -s https://recruiting-sg.com >/dev/null 2>&1; then
    log_success "Frontend is healthy and responding"
else
    log_error "Frontend health check failed"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50
    exit 1
fi

# Show status
log_success "========================================="
log_success "  FRONTEND DEPLOYMENT COMPLETED!"
log_success "========================================="
echo ""
echo "🚀 Frontend URL: https://recruiting-sg.com"
echo "📚 API Docs: https://recruiting-sg.com/api/docs"
echo ""
echo "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps
echo ""
echo "📝 Demo Login:"
echo "   Email: admin@example.com"
echo "   Password: password123"
echo ""
log_success "Deployment completed successfully!"
