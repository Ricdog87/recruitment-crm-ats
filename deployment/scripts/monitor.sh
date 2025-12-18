#!/bin/bash

#####################################################################
# CRM/ATS Monitoring Script
# Displays system status and health information
#####################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/recruitment-crm-ats"
COMPOSE_FILE="$APP_DIR/deployment/docker/docker-compose.production.yml"

clear
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CRM/ATS System Monitor${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Docker containers status
echo -e "${YELLOW}📦 Container Status:${NC}"
cd "$APP_DIR/deployment/docker"
docker-compose -f docker-compose.production.yml ps
echo ""

# Health check
echo -e "${YELLOW}🏥 Health Check:${NC}"
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    HEALTH_DATA=$(curl -s http://localhost:3001/api/health)
    echo -e "${GREEN}  Uptime: $(echo $HEALTH_DATA | jq -r '.uptime' 2>/dev/null || echo 'N/A')s${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi
echo ""

# Database status
echo -e "${YELLOW}🗄 Database Status:${NC}"
DB_STATUS=$(docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U ${DB_USER:-crm_ats_user} 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database is ready${NC}"
else
    echo -e "${RED}✗ Database is not ready${NC}"
fi

# Database size
DB_SIZE=$(docker-compose -f docker-compose.production.yml exec -T postgres psql -U ${DB_USER:-crm_ats_user} -d ${DB_NAME:-recruitment_crm_ats} -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME:-recruitment_crm_ats}'));" 2>/dev/null | xargs)
echo -e "${GREEN}  Database size: ${DB_SIZE}${NC}"
echo ""

# Resource usage
echo -e "${YELLOW}💾 Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose -f docker-compose.production.yml ps -q)
echo ""

# Disk usage
echo -e "${YELLOW}💿 Disk Usage:${NC}"
df -h "$APP_DIR" | tail -1
echo ""

# Recent logs
echo -e "${YELLOW}📋 Recent Logs (last 10 lines):${NC}"
docker-compose -f docker-compose.production.yml logs --tail=10
echo ""

# Backup status
echo -e "${YELLOW}💾 Latest Backup:${NC}"
LATEST_BACKUP=$(ls -t "$APP_DIR/backups/"crm_ats_backup_*.sql.gz 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1,2 | cut -d'.' -f1)
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
    echo -e "${GREEN}✓ Latest backup: $BACKUP_DATE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}✗ No backups found${NC}"
fi
echo ""

# Nginx status
echo -e "${YELLOW}🌐 Nginx Status:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"

    # Check if our site is accessible
    if curl -f -s -k https://crm.rsg-recruiting.de/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ HTTPS endpoint is accessible${NC}"
    else
        echo -e "${YELLOW}⚠ HTTPS endpoint check failed${NC}"
    fi
else
    echo -e "${RED}✗ Nginx is not running${NC}"
fi
echo ""

# SSL certificate status
echo -e "${YELLOW}🔒 SSL Certificate:${NC}"
if [ -d "/etc/letsencrypt/live/crm.rsg-recruiting.de" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/crm.rsg-recruiting.de/cert.pem | cut -d= -f2)
    echo -e "${GREEN}✓ Certificate expires: $CERT_EXPIRY${NC}"
else
    echo -e "${YELLOW}⚠ SSL certificate not found${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Press Ctrl+C to exit${NC}"
echo ""
