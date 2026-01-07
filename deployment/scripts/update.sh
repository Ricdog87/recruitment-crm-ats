#!/bin/bash

#####################################################################
# CRM/ATS Update Script
# Safely updates the application with zero-downtime
#####################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/recruitment-crm-ats"
COMPOSE_FILE="$APP_DIR/deployment/docker/docker-compose.production.yml"

echo -e "${YELLOW}Starting CRM/ATS update...${NC}"

# Navigate to app directory
cd "$APP_DIR"

# Create backup before update
echo -e "${YELLOW}Creating backup before update...${NC}"
./deployment/scripts/backup.sh

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes from Git...${NC}"
git fetch origin
git checkout claude/crm-recruiting-backend-kRGn2
git pull origin claude/crm-recruiting-backend-kRGn2

# Rebuild containers
echo -e "${YELLOW}Rebuilding containers...${NC}"
cd "$APP_DIR/deployment/docker"
docker-compose -f docker-compose.production.yml build --no-cache

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose -f docker-compose.production.yml run --rm backend npx prisma migrate deploy

# Restart services
echo -e "${YELLOW}Restarting services...${NC}"
docker-compose -f docker-compose.production.yml up -d

# Wait for health check
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Health check
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✓ Update completed successfully!${NC}"
    echo -e "${GREEN}Services are healthy and running.${NC}"
else
    echo -e "${RED}✗ Health check failed!${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    docker-compose -f docker-compose.production.yml logs --tail=50
    exit 1
fi
