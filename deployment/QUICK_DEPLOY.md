# Quick Deploy Guide - recruiting-sg.com

**10-Minute Production Deployment**

## Prerequisites Check

```bash
# Verify Traefik is running
docker network inspect root_traefik

# If not, create it
docker network create root_traefik
```

## One-Command Deployment

```bash
# On VPS (72.60.80.120) as root
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/Ricdog87/recruitment-crm-ats/claude/crm-recruiting-backend-kRGn2/deployment/scripts/deploy-traefik.sh)"
```

**That's it!** The script handles everything:
- ✅ Clones repository
- ✅ Generates secure passwords
- ✅ Builds Docker images
- ✅ Runs database migrations
- ✅ Starts all services
- ✅ Performs health checks

## Manual Deployment (5 Steps)

### 1. Clone & Setup

```bash
sudo su
git clone -b claude/crm-recruiting-backend-kRGn2 \
  https://github.com/Ricdog87/recruitment-crm-ats.git \
  /root/recruitment-crm-deploy

cd /root/recruitment-crm-deploy/deployment/docker
```

### 2. Create Environment

```bash
# Generate secrets
cat > .env <<EOF
DB_USER=crm_ats_user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
DB_NAME=recruitment_crm_ats
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/")
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d "=+/")
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGINS=https://recruiting-sg.com,https://www.recruiting-sg.com
EOF

chmod 600 .env
source .env

# SAVE THESE
echo "DB_PASSWORD: $DB_PASSWORD"
echo "REDIS_PASSWORD: $REDIS_PASSWORD"
```

### 3. Build & Start

```bash
# Build
docker-compose -f docker-compose.traefik.yml build

# Start DB & Redis
docker-compose -f docker-compose.traefik.yml up -d postgres redis

# Wait for DB
sleep 10
```

### 4. Migrate Database

```bash
docker run --rm \
  --network crm-ats-internal \
  -v /root/recruitment-crm-deploy:/app \
  -w /app \
  -e DATABASE_URL="postgresql://crm_ats_user:${DB_PASSWORD}@crm-ats-postgres:5432/recruitment_crm_ats?schema=public" \
  node:20-alpine \
  sh -c "npm install --only=production && npx prisma migrate deploy"
```

### 5. Start Backend

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

## Verify Deployment

```bash
# Check containers
docker ps | grep crm-ats

# Test API
curl https://recruiting-sg.com/api/health
# Expected: {"status":"ok",...}

# Test login
curl -X POST https://recruiting-sg.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

## n8n Configuration

1. **Get Token**:
```bash
TOKEN=$(curl -X POST https://recruiting-sg.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.access_token')

echo $TOKEN
```

2. **Store in Redis** (via n8n auth workflow):
- Import `n8n-workflows/auth-crm.json`
- Update API URL to `https://recruiting-sg.com/api`
- Execute workflow

3. **Configure Other Workflows**:
- Update `CRM_API_URL` in all workflows to `https://recruiting-sg.com/api`
- Add Redis credentials (host: `crm-ats-redis`, password: from .env)
- Import and activate workflows

## Essential Commands

```bash
# View logs
docker-compose -f docker-compose.traefik.yml logs -f backend

# Restart
docker-compose -f docker-compose.traefik.yml restart backend

# Stop all
docker-compose -f docker-compose.traefik.yml down

# Backup DB
docker exec crm-ats-postgres pg_dump -U crm_ats_user recruitment_crm_ats \
  > backup_$(date +%Y%m%d).sql
```

## Endpoints

- **API Base**: https://recruiting-sg.com/api
- **Health**: https://recruiting-sg.com/api/health
- **Docs**: https://recruiting-sg.com/api/docs
- **Login**: POST https://recruiting-sg.com/api/auth/login

## Demo Users

After seeding:
- `admin@example.com` / `password123` (ADMIN)
- `manager@example.com` / `password123` (MANAGER)
- `recruiter@example.com` / `password123` (RECRUITER)

## Next Steps

1. ✅ Import n8n workflows from `n8n-workflows/`
2. ✅ Configure external API keys (Index, Apollo, Mailgun, HubSpot)
3. ✅ Test matching engine
4. ✅ Set up automated backups

## Troubleshooting

**Backend not starting?**
```bash
docker logs crm-ats-backend --tail 50
```

**Database errors?**
```bash
docker exec crm-ats-postgres psql -U crm_ats_user -d recruitment_crm_ats -c "SELECT 1;"
```

**Traefik not routing?**
```bash
docker logs traefik --tail 50
docker inspect crm-ats-backend | grep Networks -A 10
```

## Full Documentation

See [DEPLOYMENT_TRAEFIK.md](./DEPLOYMENT_TRAEFIK.md) for complete guide.

---

**Production URL**: https://recruiting-sg.com
**VPS IP**: 72.60.80.120
**Stack**: Docker + Traefik + PostgreSQL + Redis + NestJS
