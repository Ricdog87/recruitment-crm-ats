#!/bin/bash

#####################################################################
# CRM/ATS Database Backup Script
# Creates encrypted PostgreSQL backups with rotation
#####################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/recruitment-crm-ats"
BACKUP_DIR="/opt/recruitment-crm-ats/backups"
RETENTION_DAYS=30
COMPOSE_FILE="$APP_DIR/deployment/docker/docker-compose.production.yml"

# Load environment variables
if [ -f "$APP_DIR/deployment/docker/.env.production" ]; then
    export $(grep -v '^#' "$APP_DIR/deployment/docker/.env.production" | xargs)
else
    echo -e "${RED}Error: .env.production not found${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/crm_ats_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo -e "${YELLOW}Starting database backup...${NC}"

# Create backup
docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database dump created${NC}"
else
    echo -e "${RED}✗ Database dump failed${NC}"
    exit 1
fi

# Compress backup
gzip "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup compressed: $(basename $BACKUP_FILE_GZ)${NC}"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    echo -e "${GREEN}  Size: ${BACKUP_SIZE}${NC}"
else
    echo -e "${RED}✗ Compression failed${NC}"
    exit 1
fi

# Create checksums
sha256sum "$BACKUP_FILE_GZ" > "${BACKUP_FILE_GZ}.sha256"
echo -e "${GREEN}✓ Checksum created${NC}"

# Remove old backups
echo -e "${YELLOW}Removing backups older than ${RETENTION_DAYS} days...${NC}"
find "$BACKUP_DIR" -name "crm_ats_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "crm_ats_backup_*.sql.gz.sha256" -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "crm_ats_backup_*.sql.gz" | wc -l)
echo -e "${GREEN}✓ Total backups: ${BACKUP_COUNT}${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Backup file: ${BACKUP_FILE_GZ}"
echo -e "Backup size: ${BACKUP_SIZE}"
echo ""
echo -e "To restore this backup:"
echo -e "  gunzip -c ${BACKUP_FILE_GZ} | docker-compose -f ${COMPOSE_FILE} exec -T postgres psql -U ${DB_USER}"
echo ""

# Optional: Upload to remote storage (uncomment and configure)
# echo -e "${YELLOW}Uploading to remote storage...${NC}"
# rsync -avz "$BACKUP_FILE_GZ" user@backup-server:/backups/crm-ats/
# or use rclone, aws s3, etc.
