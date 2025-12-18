#!/bin/bash

#####################################################################
# CRM/ATS Deployment Script for Hostinger VPS
# Domain: crm.rsg-recruiting.de
#####################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="crm.rsg-recruiting.de"
EMAIL="your-email@rsg-recruiting.de"  # Change this!
APP_DIR="/opt/recruitment-crm-ats"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}.conf"

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if running as root or with sudo
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    local missing_deps=()

    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_deps+=("docker-compose")
    fi

    if ! command -v nginx &> /dev/null; then
        missing_deps+=("nginx")
    fi

    if ! command -v certbot &> /dev/null; then
        missing_deps+=("certbot")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_info "Install them with: apt update && apt install -y ${missing_deps[*]}"
        exit 1
    fi

    print_success "All prerequisites met"
}

# Create application directory
setup_app_directory() {
    print_info "Setting up application directory..."

    if [ ! -d "$APP_DIR" ]; then
        mkdir -p "$APP_DIR"
        print_success "Created $APP_DIR"
    else
        print_warning "Directory $APP_DIR already exists"
    fi

    cd "$APP_DIR"
}

# Clone or update repository
setup_repository() {
    print_info "Setting up repository..."

    if [ ! -d ".git" ]; then
        print_info "Cloning repository..."
        git clone https://github.com/Ricdog87/recruitment-crm-ats.git .
        git checkout claude/crm-recruiting-backend-kRGn2
        print_success "Repository cloned"
    else
        print_info "Updating repository..."
        git fetch origin
        git checkout claude/crm-recruiting-backend-kRGn2
        git pull origin claude/crm-recruiting-backend-kRGn2
        print_success "Repository updated"
    fi
}

# Setup environment file
setup_environment() {
    print_info "Setting up environment file..."

    local env_file="$APP_DIR/deployment/docker/.env.production"

    if [ ! -f "$env_file" ]; then
        cp "$APP_DIR/deployment/docker/.env.production.example" "$env_file"
        print_warning "Created .env.production from example"
        print_warning "YOU MUST EDIT $env_file and set:"
        print_warning "  - DB_PASSWORD (strong password)"
        print_warning "  - JWT_SECRET (run: openssl rand -base64 48)"
        print_warning "  - JWT_REFRESH_SECRET (run: openssl rand -base64 48)"
        print_info "Press ENTER after you've edited the file..."
        read -r
    else
        print_success "Environment file already exists"
    fi
}

# Build and start containers
deploy_containers() {
    print_info "Building and deploying containers..."

    cd "$APP_DIR/deployment/docker"

    # Load environment variables
    export $(grep -v '^#' .env.production | xargs)

    # Stop existing containers
    docker-compose -f docker-compose.production.yml down || true

    # Build new images
    print_info "Building Docker images (this may take a few minutes)..."
    docker-compose -f docker-compose.production.yml build --no-cache

    # Start containers
    print_info "Starting containers..."
    docker-compose -f docker-compose.production.yml up -d

    print_success "Containers deployed"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."

    cd "$APP_DIR/deployment/docker"

    # Wait for database to be ready
    print_info "Waiting for database to be ready..."
    sleep 10

    # Run migrations
    docker-compose -f docker-compose.production.yml exec -T backend npx prisma migrate deploy

    print_success "Database migrations completed"
}

# Setup Nginx
setup_nginx() {
    print_info "Setting up Nginx configuration..."

    # Copy nginx config
    cp "$APP_DIR/deployment/nginx/${DOMAIN}.conf" "$NGINX_CONF"

    # Create symlink if it doesn't exist
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_CONF" "$NGINX_ENABLED"
        print_success "Nginx site enabled"
    else
        print_warning "Nginx site already enabled"
    fi

    # Test nginx configuration
    if nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration is invalid"
        exit 1
    fi

    # Reload nginx
    systemctl reload nginx
    print_success "Nginx reloaded"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    print_info "Setting up SSL certificate..."

    # Check if certificate already exists
    if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
        print_warning "SSL certificate already exists"
        print_info "Renewing certificate..."
        certbot renew --nginx -d "$DOMAIN"
    else
        print_info "Obtaining new SSL certificate..."

        # Make sure certbot webroot directory exists
        mkdir -p /var/www/certbot

        # Obtain certificate
        certbot certonly --webroot \
            -w /var/www/certbot \
            -d "$DOMAIN" \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive

        print_success "SSL certificate obtained"

        # Reload nginx with SSL configuration
        systemctl reload nginx
    fi

    print_success "SSL setup completed"
}

# Setup automatic certificate renewal
setup_cert_renewal() {
    print_info "Setting up automatic certificate renewal..."

    # Add certbot renewal cron job if it doesn't exist
    if ! crontab -l | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
        print_success "Certbot auto-renewal configured"
    else
        print_warning "Certbot auto-renewal already configured"
    fi
}

# Setup log rotation
setup_log_rotation() {
    print_info "Setting up log rotation..."

    cat > /etc/logrotate.d/crm-ats << EOF
/var/log/nginx/crm.rsg-recruiting.de.*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 \$(cat /var/run/nginx.pid)
    endscript
}
EOF

    print_success "Log rotation configured"
}

# Health check
health_check() {
    print_info "Performing health check..."

    sleep 5

    # Check if containers are running
    cd "$APP_DIR/deployment/docker"
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        print_success "Containers are running"
    else
        print_error "Containers are not running properly"
        docker-compose -f docker-compose.production.yml logs --tail=50
        exit 1
    fi

    # Check backend health endpoint
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        exit 1
    fi

    # Check HTTPS endpoint (if SSL is set up)
    if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
        if curl -f -s -k "https://${DOMAIN}/health" > /dev/null; then
            print_success "HTTPS endpoint is accessible"
        else
            print_warning "HTTPS endpoint check failed (might need DNS propagation)"
        fi
    fi
}

# Print deployment summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "  CRM/ATS Deployment Summary"
    echo "=========================================="
    echo ""
    echo "🌐 Domain: https://${DOMAIN}"
    echo "📁 App Directory: ${APP_DIR}"
    echo "🐳 Docker Status: $(cd ${APP_DIR}/deployment/docker && docker-compose -f docker-compose.production.yml ps --services | wc -l) services running"
    echo ""
    echo "🔗 Endpoints:"
    echo "   - API: https://${DOMAIN}/api"
    echo "   - Swagger: https://${DOMAIN}/api/docs"
    echo "   - Health: https://${DOMAIN}/health"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Test the API: curl https://${DOMAIN}/health"
    echo "   2. Access Swagger docs: https://${DOMAIN}/api/docs"
    echo "   3. Create first user via API or seed database"
    echo "   4. Set up database backups (see backup.sh)"
    echo "   5. Configure monitoring (optional)"
    echo ""
    echo "🛠 Useful Commands:"
    echo "   - View logs: cd ${APP_DIR}/deployment/docker && docker-compose -f docker-compose.production.yml logs -f"
    echo "   - Restart: cd ${APP_DIR}/deployment/docker && docker-compose -f docker-compose.production.yml restart"
    echo "   - Update: cd ${APP_DIR} && ./deployment/scripts/deploy.sh"
    echo "   - Backup DB: ${APP_DIR}/deployment/scripts/backup.sh"
    echo ""
    echo "=========================================="
}

# Main deployment flow
main() {
    print_info "Starting CRM/ATS deployment for ${DOMAIN}..."
    echo ""

    check_root
    check_prerequisites
    setup_app_directory
    setup_repository
    setup_environment
    deploy_containers
    run_migrations
    setup_nginx

    # Ask about SSL setup
    read -p "Do you want to setup SSL with Let's Encrypt? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
        setup_cert_renewal
    else
        print_warning "Skipping SSL setup. You can run this script again later."
    fi

    setup_log_rotation
    health_check
    print_summary

    print_success "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"
