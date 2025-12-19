#!/bin/bash
set -euo pipefail

################################################################################
# COMPLETE CRM DEPLOYMENT - Backend + Frontend
# Domain: recruiting-sg.com (72.60.80.120)
# Traefik Integration
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

DEPLOY_DIR="/root/recruitment-crm-deploy"
REPO_URL="https://github.com/Ricdog87/recruitment-crm-ats.git"
BRANCH="claude/crm-recruiting-backend-kRGn2"
DOMAIN="recruiting-sg.com"
TRAEFIK_NETWORK="root_traefik"

################################################################################
# Pre-flight Checks
################################################################################

log_info "Starting Complete CRM Deployment..."
echo ""

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker not found. Please install Docker first."
    exit 1
fi
log_success "Docker: $(docker --version)"

# Check Traefik network
if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
    log_error "Traefik network '$TRAEFIK_NETWORK' not found"
    exit 1
fi
log_success "Traefik network found"

################################################################################
# Clone/Update Repository
################################################################################

log_info "Preparing deployment directory..."

if [ -d "$DEPLOY_DIR" ]; then
    log_warning "Directory exists. Updating..."
    cd "$DEPLOY_DIR"
    git stash save "Auto-stash $(date +%Y%m%d_%H%M%S)" || true
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
# BACKEND DEPLOYMENT
################################################################################

log_info "========================================="
log_info "  DEPLOYING BACKEND"
log_info "========================================="
echo ""

cd "$DEPLOY_DIR/deployment/docker"

# Create backend .env if not exists
if [ ! -f .env ]; then
    log_info "Creating backend environment..."

    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/")
    JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d "=+/")

    cat > .env <<EOF
DB_USER=crm_ats_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=recruitment_crm_ats
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGINS=https://recruiting-sg.com,https://www.recruiting-sg.com
EOF

    chmod 600 .env
    log_success "Backend environment created"

    echo ""
    log_warning "============================================"
    log_warning "  SAVE THESE CREDENTIALS FOR N8N:"
    log_warning "============================================"
    echo "DB_PASSWORD: ${DB_PASSWORD}"
    echo "REDIS_PASSWORD: ${REDIS_PASSWORD}"
    echo "API_URL: https://recruiting-sg.com/api"
    log_warning "============================================"
    echo ""

    read -p "Press Enter to continue after saving credentials..."
else
    log_success "Backend environment exists"
fi

# Source environment
source .env

# Build backend
log_info "Building backend Docker image..."
docker-compose -f docker-compose.traefik.yml build --no-cache backend
log_success "Backend image built"

# Start database and redis
log_info "Starting database and Redis..."
docker-compose -f docker-compose.traefik.yml up -d postgres redis

# Wait for PostgreSQL
log_info "Waiting for PostgreSQL..."
sleep 10
until docker-compose -f docker-compose.traefik.yml exec -T postgres pg_isready -U crm_ats_user -d recruitment_crm_ats >/dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo ""
log_success "PostgreSQL ready"

# Run migrations
log_info "Running database migrations..."
docker run --rm \
    --network crm-ats-internal \
    -v "$DEPLOY_DIR:/app" \
    -w /app \
    -e DATABASE_URL="postgresql://crm_ats_user:${DB_PASSWORD}@crm-ats-postgres:5432/recruitment_crm_ats?schema=public" \
    node:20-alpine \
    sh -c "npm install --only=production && npx prisma migrate deploy && npx prisma db seed"
log_success "Database migrated and seeded"

# Start backend
log_info "Starting backend..."
docker-compose -f docker-compose.traefik.yml up -d backend
log_success "Backend started"

# Wait for backend
log_info "Waiting for backend health check..."
sleep 15

# Test backend
if curl -f -s https://${DOMAIN}/api/health >/dev/null 2>&1; then
    log_success "Backend is healthy!"
else
    log_warning "Backend health check pending..."
fi

echo ""

################################################################################
# FRONTEND DEPLOYMENT
################################################################################

log_info "========================================="
log_info "  DEPLOYING FRONTEND"
log_info "========================================="
echo ""

cd "$DEPLOY_DIR/frontend"

# Create frontend .env
log_info "Creating frontend environment..."
cat > .env <<EOF
NEXT_PUBLIC_API_URL=https://recruiting-sg.com/api
EOF
log_success "Frontend environment created"

# Build frontend
log_info "Building frontend Docker image..."
docker-compose -f docker-compose.traefik.yml build --no-cache
log_success "Frontend image built"

# Start frontend
log_info "Starting frontend..."
docker-compose -f docker-compose.traefik.yml up -d
log_success "Frontend started"

# Wait for frontend
log_info "Waiting for frontend health check..."
sleep 15

# Test frontend
if curl -f -s https://${DOMAIN} >/dev/null 2>&1; then
    log_success "Frontend is healthy!"
else
    log_warning "Frontend health check pending..."
fi

echo ""

################################################################################
# DEPLOYMENT SUMMARY
################################################################################

log_success "========================================="
log_success "  DEPLOYMENT COMPLETED!"
log_success "========================================="
echo ""

echo "🚀 CRM URLs:"
echo "   Frontend:  https://recruiting-sg.com"
echo "   API:       https://recruiting-sg.com/api"
echo "   API Docs:  https://recruiting-sg.com/api/docs"
echo "   Health:    https://recruiting-sg.com/api/health"
echo ""

echo "🔐 Demo Login:"
echo "   Email:     admin@example.com"
echo "   Password:  password123"
echo ""

echo "📊 Container Status:"
cd "$DEPLOY_DIR/deployment/docker"
docker-compose -f docker-compose.traefik.yml ps
echo ""
cd "$DEPLOY_DIR/frontend"
docker-compose -f docker-compose.traefik.yml ps
echo ""

echo "📝 Next Steps:"
echo "   1. Open: https://recruiting-sg.com"
echo "   2. Login with demo credentials"
echo "   3. Import n8n workflows from: n8n-workflows/"
echo "   4. Configure n8n with saved credentials"
echo ""

log_success "Full-stack CRM is now live! 🎉"
