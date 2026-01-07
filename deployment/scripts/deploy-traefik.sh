#!/bin/bash
set -euo pipefail

################################################################################
# CRM/ATS Backend Deployment Script for recruiting-sg.com
# Traefik Integration (VPS: 72.60.80.120)
################################################################################

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/root/recruitment-crm-deploy"
REPO_URL="https://github.com/Ricdog87/recruitment-crm-ats.git"
BRANCH="claude/crm-recruiting-backend-kRGn2"
DOMAIN="recruiting-sg.com"
TRAEFIK_NETWORK="root_traefik"
COMPOSE_FILE="docker-compose.traefik.yml"

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

################################################################################
# Pre-flight Checks
################################################################################

log_info "Starting CRM/ATS Backend Deployment for ${DOMAIN}..."
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Check Docker
if ! command_exists docker; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi
log_success "Docker is installed: $(docker --version)"

# Check Docker Compose
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
log_success "Docker Compose is available"

# Check if Traefik network exists
if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    log_error "Traefik network '${TRAEFIK_NETWORK}' not found. Please ensure Traefik is running."
    exit 1
fi
log_success "Traefik network '${TRAEFIK_NETWORK}' exists"

# Check if Git is installed
if ! command_exists git; then
    log_error "Git is not installed. Installing..."
    apt-get update && apt-get install -y git
fi
log_success "Git is installed"

echo ""

################################################################################
# Clone/Update Repository
################################################################################

log_info "Preparing deployment directory..."

if [ -d "$DEPLOY_DIR" ]; then
    log_warning "Deployment directory already exists. Updating..."
    cd "$DEPLOY_DIR"

    # Stash any local changes
    git stash save "Auto-stash before deployment $(date +%Y%m%d_%H%M%S)" || true

    # Fetch and checkout
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"

    log_success "Repository updated"
else
    log_info "Cloning repository..."
    mkdir -p "$DEPLOY_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    log_success "Repository cloned"
fi

echo ""

################################################################################
# Environment Configuration
################################################################################

log_info "Setting up environment configuration..."

ENV_FILE="$DEPLOY_DIR/deployment/docker/.env"

if [ -f "$ENV_FILE" ]; then
    log_warning "Environment file already exists"
    read -p "Do you want to regenerate passwords? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Keeping existing environment configuration"
    else
        REGENERATE_PASSWORDS=true
    fi
else
    log_info "Creating new environment configuration..."
    REGENERATE_PASSWORDS=true
fi

if [ "${REGENERATE_PASSWORDS:-false}" = true ]; then
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/")
    JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d "=+/")

    cat > "$ENV_FILE" <<EOF
# Database Configuration
DB_USER=crm_ats_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=recruitment_crm_ats

# Redis Configuration
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT Secrets
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGINS=https://recruiting-sg.com,https://www.recruiting-sg.com
EOF

    chmod 600 "$ENV_FILE"
    log_success "Environment file created with secure passwords"

    # Display credentials (for n8n configuration)
    echo ""
    log_warning "SAVE THESE CREDENTIALS - You'll need them for n8n workflows:"
    echo "----------------------------------------"
    echo "DB_USER: crm_ats_user"
    echo "DB_PASSWORD: ${DB_PASSWORD}"
    echo "DB_NAME: recruitment_crm_ats"
    echo "REDIS_PASSWORD: ${REDIS_PASSWORD}"
    echo "API_URL: https://recruiting-sg.com/api"
    echo "----------------------------------------"
    echo ""
    read -p "Press Enter to continue after saving these credentials..."
fi

log_success "Environment configuration ready"
echo ""

################################################################################
# Build & Deploy
################################################################################

log_info "Building Docker images..."

cd "$DEPLOY_DIR/deployment/docker"

# Build the backend image
docker-compose -f "$COMPOSE_FILE" build --no-cache

log_success "Docker images built"
echo ""

################################################################################
# Database Migration
################################################################################

log_info "Starting services for migration..."

# Start postgres and redis first
docker-compose -f "$COMPOSE_FILE" up -d postgres redis

# Wait for postgres to be healthy
log_info "Waiting for PostgreSQL to be ready..."
RETRIES=0
MAX_RETRIES=30
until docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U crm_ats_user -d recruitment_crm_ats >/dev/null 2>&1; do
    RETRIES=$((RETRIES+1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        log_error "PostgreSQL failed to start after ${MAX_RETRIES} attempts"
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""
log_success "PostgreSQL is ready"

# Run Prisma migrations
log_info "Running database migrations..."

# Create a temporary container to run migrations
docker run --rm \
    --network crm-ats-internal \
    -v "$DEPLOY_DIR:/app" \
    -w /app \
    -e DATABASE_URL="postgresql://crm_ats_user:${DB_PASSWORD}@crm-ats-postgres:5432/recruitment_crm_ats?schema=public" \
    node:20-alpine \
    sh -c "npm install --only=production && npx prisma migrate deploy"

log_success "Database migrations completed"

# Optional: Seed data
read -p "Do you want to seed the database with demo data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Seeding database..."
    docker run --rm \
        --network crm-ats-internal \
        -v "$DEPLOY_DIR:/app" \
        -w /app \
        -e DATABASE_URL="postgresql://crm_ats_user:${DB_PASSWORD}@crm-ats-postgres:5432/recruitment_crm_ats?schema=public" \
        node:20-alpine \
        sh -c "npm install --only=production && npx prisma db seed"
    log_success "Database seeded"
fi

echo ""

################################################################################
# Start All Services
################################################################################

log_info "Starting all services..."

docker-compose -f "$COMPOSE_FILE" up -d

log_success "All services started"
echo ""

################################################################################
# Health Checks
################################################################################

log_info "Performing health checks..."

# Wait for backend to be healthy
log_info "Waiting for backend to be ready..."
sleep 10

RETRIES=0
MAX_RETRIES=30
until curl -f -s https://${DOMAIN}/api/health >/dev/null 2>&1; do
    RETRIES=$((RETRIES+1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        log_error "Backend health check failed after ${MAX_RETRIES} attempts"
        log_warning "Checking container logs..."
        docker-compose -f "$COMPOSE_FILE" logs --tail=50 backend
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

log_success "Backend is healthy and responding"

# Test API endpoints
log_info "Testing API endpoints..."

# Health endpoint
HEALTH_RESPONSE=$(curl -s https://${DOMAIN}/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    log_success "Health endpoint OK"
else
    log_error "Health endpoint returned unexpected response"
    echo "$HEALTH_RESPONSE"
fi

# Swagger docs
if curl -f -s https://${DOMAIN}/api/docs >/dev/null 2>&1; then
    log_success "Swagger documentation accessible"
else
    log_warning "Swagger documentation may not be accessible"
fi

echo ""

################################################################################
# Deployment Summary
################################################################################

log_success "========================================="
log_success "  DEPLOYMENT COMPLETED SUCCESSFULLY!"
log_success "========================================="
echo ""

echo "🚀 CRM/ATS Backend Information:"
echo "   Domain: https://${DOMAIN}"
echo "   API Base URL: https://${DOMAIN}/api"
echo "   API Docs: https://${DOMAIN}/api/docs"
echo "   Health Check: https://${DOMAIN}/api/health"
echo ""

echo "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps
echo ""

echo "🔐 Database Info:"
echo "   Host: crm-ats-postgres (internal)"
echo "   Database: recruitment_crm_ats"
echo "   User: crm_ats_user"
echo ""

echo "💾 Redis Info:"
echo "   Host: crm-ats-redis (internal)"
echo "   Port: 6379"
echo ""

echo "📝 Next Steps:"
echo "   1. Import n8n workflows from: n8n-workflows/"
echo "   2. Configure n8n credentials with the passwords shown above"
echo "   3. Update CRM_API_URL in n8n: https://recruiting-sg.com/api"
echo "   4. Test authentication: POST https://recruiting-sg.com/api/auth/login"
echo ""

echo "🛠️  Useful Commands:"
echo "   View logs: cd ${DEPLOY_DIR}/deployment/docker && docker-compose -f ${COMPOSE_FILE} logs -f"
echo "   Restart: docker-compose -f ${COMPOSE_FILE} restart backend"
echo "   Stop all: docker-compose -f ${COMPOSE_FILE} down"
echo "   Backup DB: docker-compose -f ${COMPOSE_FILE} exec postgres pg_dump -U crm_ats_user recruitment_crm_ats > backup.sql"
echo ""

log_success "Deployment script completed!"
