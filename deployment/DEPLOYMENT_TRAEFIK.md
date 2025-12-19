# CRM/ATS Deployment Guide - recruiting-sg.com (Traefik)

Complete deployment guide for deploying the CRM/ATS backend on **recruiting-sg.com** (VPS: 72.60.80.120) with Traefik integration.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Deployment](#quick-deployment)
- [Manual Deployment](#manual-deployment)
- [n8n Workflow Configuration](#n8n-workflow-configuration)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### VPS Requirements

- **Domain**: recruiting-sg.com (DNS configured to 72.60.80.120)
- **Existing Services**:
  - Traefik running on network: `root_traefik`
  - n8n running on port 5678
- **System Requirements**:
  - Ubuntu 20.04+ / Debian 11+
  - 4GB RAM minimum
  - 20GB free disk space
  - Docker 20.10+
  - Docker Compose 2.0+

### Verify Traefik Network

```bash
docker network inspect root_traefik
```

Should show the existing Traefik network. If not found, create it:

```bash
docker network create root_traefik
```

## 🚀 Quick Deployment

### Automated Deployment (Recommended)

Run the automated deployment script as root:

```bash
# On VPS (72.60.80.120)
sudo su

# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/Ricdog87/recruitment-crm-ats/claude/crm-recruiting-backend-kRGn2/deployment/scripts/deploy-traefik.sh -o deploy.sh

chmod +x deploy.sh
./deploy.sh
```

The script will:
1. ✅ Check prerequisites (Docker, Traefik network)
2. ✅ Clone/update repository
3. ✅ Generate secure passwords
4. ✅ Build Docker images
5. ✅ Run database migrations
6. ✅ Start all services (PostgreSQL, Redis, Backend)
7. ✅ Perform health checks
8. ✅ Display credentials and next steps

**IMPORTANT**: Save the credentials displayed at the end - you'll need them for n8n!

### Expected Output

```
✅ Backend is healthy and responding
=========================================
  DEPLOYMENT COMPLETED SUCCESSFULLY!
=========================================

🚀 CRM/ATS Backend Information:
   Domain: https://recruiting-sg.com
   API Base URL: https://recruiting-sg.com/api
   API Docs: https://recruiting-sg.com/api/docs
   Health Check: https://recruiting-sg.com/api/health
```

## 🔧 Manual Deployment

### Step 1: Clone Repository

```bash
sudo su
mkdir -p /root/recruitment-crm-deploy
cd /root/recruitment-crm-deploy

git clone -b claude/crm-recruiting-backend-kRGn2 \
  https://github.com/Ricdog87/recruitment-crm-ats.git .
```

### Step 2: Generate Environment File

```bash
cd deployment/docker

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/")
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d "=+/")

# Create .env file
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

# Display credentials (SAVE THESE!)
echo "========================================="
echo "SAVE THESE CREDENTIALS:"
echo "========================================="
echo "DB_PASSWORD: ${DB_PASSWORD}"
echo "REDIS_PASSWORD: ${REDIS_PASSWORD}"
echo "API_URL: https://recruiting-sg.com/api"
echo "========================================="
```

### Step 3: Build Docker Images

```bash
docker-compose -f docker-compose.traefik.yml build --no-cache
```

### Step 4: Start Database & Redis

```bash
docker-compose -f docker-compose.traefik.yml up -d postgres redis

# Wait for PostgreSQL
until docker-compose -f docker-compose.traefik.yml exec -T postgres \
  pg_isready -U crm_ats_user -d recruitment_crm_ats; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done
```

### Step 5: Run Database Migrations

```bash
# Load environment
source .env

# Run migrations
docker run --rm \
  --network crm-ats-internal \
  -v /root/recruitment-crm-deploy:/app \
  -w /app \
  -e DATABASE_URL="postgresql://crm_ats_user:${DB_PASSWORD}@crm-ats-postgres:5432/recruitment_crm_ats?schema=public" \
  node:20-alpine \
  sh -c "npm install --only=production && npx prisma migrate deploy"
```

### Step 6: Seed Demo Data (Optional)

```bash
docker run --rm \
  --network crm-ats-internal \
  -v /root/recruitment-crm-deploy:/app \
  -w /app \
  -e DATABASE_URL="postgresql://crm_ats_user:${DB_PASSWORD}@crm-ats-postgres:5432/recruitment_crm_ats?schema=public" \
  node:20-alpine \
  sh -c "npm install --only=production && npx prisma db seed"
```

Demo users:
- `admin@example.com` / `password123` (ADMIN)
- `manager@example.com` / `password123` (MANAGER)
- `recruiter@example.com` / `password123` (RECRUITER)

### Step 7: Start Backend

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

### Step 8: Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.traefik.yml ps

# Check logs
docker-compose -f docker-compose.traefik.yml logs -f backend

# Test health endpoint
curl https://recruiting-sg.com/api/health

# Should return:
# {"status":"ok","timestamp":"2025-12-19T...","uptime":...}
```

## 🔄 n8n Workflow Configuration

### Update Workflow Files

All n8n workflows in `n8n-workflows/` need to be updated with production credentials:

1. **API Base URL**: `https://recruiting-sg.com/api`
2. **Redis Credentials**: Use the `REDIS_PASSWORD` from deployment
3. **External API Keys**: Add your API keys for Index, Apollo, Mailgun, HubSpot

### Import Workflows to n8n

```bash
# On your VPS, access n8n (assuming it's at http://localhost:5678)
# Import each workflow JSON from n8n-workflows/ folder:

1. auth-crm.json - CRM Authentication
2. candidate-import-index.json - Index Import
3. apollo-enrichment.json - Apollo Enrichment
4. auto-matching.json - Auto Matching
5. email-notifications.json - Email Notifications
6. kpi-dashboard-sync.json - KPI Dashboard
7. hubspot-migration.json - HubSpot Migration
```

### Configure Credentials in n8n

#### 1. CRM API Credentials

Create new credential: **HTTP Request Auth**
- **Name**: CRM API Auth
- **Type**: Header Auth
- **Header Name**: `Authorization`
- **Header Value**: `Bearer <token>` (get from auth workflow)

#### 2. Redis Credentials

Create new credential: **Redis**
- **Host**: `crm-ats-redis`
- **Port**: `6379`
- **Password**: `<REDIS_PASSWORD from deployment>`
- **Database**: `0`

#### 3. External Service Credentials

Follow `N8N_INTEGRATION.md` for detailed setup of:
- Index Platform API
- Apollo.io API
- Mailgun API
- HubSpot API
- Google Sheets OAuth

### Update Environment Variables in Workflows

Replace these placeholders in workflow JSON files:

```json
{
  "CRM_API_URL": "https://recruiting-sg.com/api",
  "CRM_TEAM_ID": "<your-team-id>",
  "INDEX_API_KEY": "<your-index-api-key>",
  "APOLLO_API_KEY": "<your-apollo-api-key>",
  "MAILGUN_API_KEY": "<your-mailgun-api-key>",
  "HUBSPOT_ACCESS_TOKEN": "<your-hubspot-token>"
}
```

### Test Authentication Workflow

1. **Import** `auth-crm.json`
2. **Update** CRM_API_URL to `https://recruiting-sg.com/api`
3. **Execute** workflow manually
4. **Verify** token is stored in Redis:

```bash
docker exec -it crm-ats-redis redis-cli -a <REDIS_PASSWORD>
GET crm:access_token
# Should return JWT token
```

## 📊 Post-Deployment

### Verify All Services

```bash
# Container status
docker ps | grep crm-ats

# Expected containers:
# crm-ats-backend
# crm-ats-postgres
# crm-ats-redis
```

### Test API Endpoints

```bash
# Health check
curl https://recruiting-sg.com/api/health

# Swagger docs
curl https://recruiting-sg.com/api/docs

# Login test
curl -X POST https://recruiting-sg.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Should return access_token and refresh_token
```

### Monitor Logs

```bash
# All services
docker-compose -f docker-compose.traefik.yml logs -f

# Backend only
docker-compose -f docker-compose.traefik.yml logs -f backend

# PostgreSQL only
docker-compose -f docker-compose.traefik.yml logs -f postgres

# Redis only
docker-compose -f docker-compose.traefik.yml logs -f redis
```

### Check Resource Usage

```bash
# Container stats
docker stats crm-ats-backend crm-ats-postgres crm-ats-redis

# Disk usage
docker system df
```

## 🔍 Troubleshooting

### Backend Not Responding

```bash
# Check container status
docker ps -a | grep crm-ats-backend

# Check logs
docker logs crm-ats-backend --tail 100

# Check health
docker inspect --format='{{json .State.Health}}' crm-ats-backend | jq
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker exec crm-ats-postgres psql -U crm_ats_user -d recruitment_crm_ats -c "SELECT 1;"

# Check database logs
docker logs crm-ats-postgres --tail 50

# Verify environment
docker exec crm-ats-backend env | grep DATABASE_URL
```

### Redis Connection Issues

```bash
# Test Redis connection
docker exec -it crm-ats-redis redis-cli -a <REDIS_PASSWORD> PING
# Should return: PONG

# Check Redis logs
docker logs crm-ats-redis

# Check memory
docker exec -it crm-ats-redis redis-cli -a <REDIS_PASSWORD> INFO memory
```

### SSL/Traefik Issues

```bash
# Check Traefik logs
docker logs traefik --tail 100

# Verify backend is in Traefik network
docker inspect crm-ats-backend | grep Networks -A 10

# Check Traefik dashboard (if enabled)
# Usually at: https://traefik.recruiting-sg.com
```

### n8n Workflow Failures

```bash
# Check n8n can reach backend
docker exec -it <n8n-container> curl https://recruiting-sg.com/api/health

# Check Redis from n8n
docker exec -it <n8n-container> nc -zv crm-ats-redis 6379

# Verify workflow logs in n8n UI
```

## 🛠️ Maintenance

### Update Application

```bash
cd /root/recruitment-crm-deploy

# Pull latest changes
git pull origin claude/crm-recruiting-backend-kRGn2

# Rebuild and restart
cd deployment/docker
docker-compose -f docker-compose.traefik.yml build --no-cache
docker-compose -f docker-compose.traefik.yml up -d
```

### Backup Database

```bash
# Create backup
docker exec crm-ats-postgres pg_dump \
  -U crm_ats_user -d recruitment_crm_ats \
  --clean --if-exists \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress
gzip backup_*.sql

# Restore from backup
gunzip backup_20251219_120000.sql.gz
cat backup_20251219_120000.sql | docker exec -i crm-ats-postgres \
  psql -U crm_ats_user -d recruitment_crm_ats
```

### Automated Backup Script

```bash
# Create backup script
cat > /root/backup-crm.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/root/crm-backups"
mkdir -p "$BACKUP_DIR"
cd /root/recruitment-crm-deploy/deployment/docker

docker exec crm-ats-postgres pg_dump \
  -U crm_ats_user -d recruitment_crm_ats \
  --clean --if-exists \
  > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

gzip "$BACKUP_DIR"/backup_*.sql
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /root/backup-crm.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-crm.sh") | crontab -
```

### View Database Schema

```bash
docker exec -it crm-ats-postgres psql -U crm_ats_user -d recruitment_crm_ats

# Inside psql:
\dt                  # List tables
\d users             # Describe users table
\d+ candidates       # Describe candidates with details
SELECT count(*) FROM candidates;  # Count records
```

### Scale Resources

Edit `docker-compose.traefik.yml` resource limits:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G
    reservations:
      memory: 1G  # Increase from 512M
```

Then restart:

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

### Monitor Performance

```bash
# Real-time stats
docker stats

# Database connections
docker exec crm-ats-postgres psql -U crm_ats_user -d recruitment_crm_ats \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
docker exec -it crm-ats-redis redis-cli -a <REDIS_PASSWORD> INFO stats
```

## 🔐 Security Checklist

- ✅ `.env` file has `chmod 600` permissions
- ✅ Strong passwords (32+ characters) for DB and Redis
- ✅ JWT secrets are randomly generated (48+ characters)
- ✅ HTTPS enforced via Traefik
- ✅ CORS origins restricted to recruiting-sg.com
- ✅ Rate limiting enabled (100 req/min)
- ✅ Security headers configured
- ✅ Database backups scheduled
- ✅ Containers run as non-root user
- ✅ Container logs rotated

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this documentation
3. Check `N8N_INTEGRATION.md` for workflow issues
4. Verify Traefik configuration

## 📚 Related Documentation

- [Main README](../../README.md) - API documentation and features
- [N8N Integration Guide](../../N8N_INTEGRATION.md) - Complete n8n setup
- [Workflow README](../../n8n-workflows/README.md) - Workflow reference

---

**Deployed**: recruiting-sg.com
**IP**: 72.60.80.120
**API**: https://recruiting-sg.com/api
**Docs**: https://recruiting-sg.com/api/docs
