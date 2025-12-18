# 📦 Deployment Files

This directory contains all production deployment configurations and scripts for the CRM/ATS system.

## 📁 Directory Structure

```
deployment/
├── docker/
│   ├── docker-compose.production.yml  # Production Docker Compose
│   ├── Dockerfile                      # Production-optimized Dockerfile
│   ├── .env.production.example         # Environment template
│   └── .dockerignore                   # Docker build exclusions
├── nginx/
│   └── crm.rsg-recruiting.de.conf      # Nginx reverse proxy config
├── scripts/
│   ├── deploy.sh                       # Automated deployment
│   ├── update.sh                       # Application updates
│   ├── backup.sh                       # Database backups
│   └── monitor.sh                      # System monitoring
├── DEPLOYMENT.md                        # Full deployment guide
├── QUICK_START.md                       # Quick deployment guide
└── README.md                            # This file
```

## 🚀 Quick Deployment

**For first-time deployment:**

```bash
# Run automated deployment
sudo ./scripts/deploy.sh
```

**For updates:**

```bash
# Run update script
sudo ./scripts/update.sh
```

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 10-minute deployment guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment documentation with troubleshooting

## 🔧 Scripts

### deploy.sh
Automated deployment script that handles:
- Prerequisites check
- Repository setup
- Environment configuration
- Docker build & deployment
- Nginx configuration
- SSL certificate setup
- Health checks

**Usage:**
```bash
sudo ./scripts/deploy.sh
```

### update.sh
Safely update the application with zero-downtime:
- Automatic backup before update
- Git pull latest changes
- Rebuild containers
- Run migrations
- Health check verification

**Usage:**
```bash
sudo ./scripts/update.sh
```

### backup.sh
Create compressed PostgreSQL backups:
- Full database dump
- Gzip compression
- SHA256 checksum
- Automatic rotation (30 days)
- Optional remote backup support

**Usage:**
```bash
sudo ./scripts/backup.sh
```

**Schedule daily backups:**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /opt/recruitment-crm-ats/deployment/scripts/backup.sh >> /var/log/crm-backup.log 2>&1
```

### monitor.sh
Display comprehensive system status:
- Container health
- Resource usage
- Database status
- Backup status
- SSL certificate expiry
- Recent logs

**Usage:**
```bash
sudo ./scripts/monitor.sh
```

## 🐳 Docker Configuration

### Production Docker Compose

Located at `docker/docker-compose.production.yml`

**Services:**
- `postgres` - PostgreSQL 16 database
- `backend` - NestJS application

**Features:**
- Health checks
- Resource limits
- Persistent volumes
- Automatic restart
- Log rotation
- Isolated network

### Environment Variables

Template: `docker/.env.production.example`

**Required variables:**
```env
DB_USER=crm_ats_user
DB_PASSWORD=<generate-strong-password>
DB_NAME=recruitment_crm_ats
JWT_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>
CORS_ORIGINS=https://crm.rsg-recruiting.de
```

**Generate secrets:**
```bash
# Database password
openssl rand -base64 32

# JWT secrets
openssl rand -base64 48
```

## 🌐 Nginx Configuration

Located at `nginx/crm.rsg-recruiting.de.conf`

**Features:**
- HTTPS/SSL with Let's Encrypt
- HTTP to HTTPS redirect
- Rate limiting (login: 5/min, API: 100/min)
- Security headers (HSTS, X-Frame-Options, etc.)
- Gzip compression
- Request size limits (20MB for CV uploads)
- Proxy configuration with timeouts
- Logging

**Installation:**
```bash
sudo cp nginx/crm.rsg-recruiting.de.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/crm.rsg-recruiting.de.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔐 SSL/TLS

SSL certificates are managed by Let's Encrypt via Certbot.

**Setup:**
```bash
sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d crm.rsg-recruiting.de \
    --email your-email@rsg-recruiting.de \
    --agree-tos \
    --non-interactive
```

**Auto-renewal is configured in deploy.sh:**
```bash
0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'
```

## 📊 Monitoring & Logs

**View application logs:**
```bash
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml logs -f
```

**View Nginx logs:**
```bash
tail -f /var/log/nginx/crm.rsg-recruiting.de.access.log
tail -f /var/log/nginx/crm.rsg-recruiting.de.error.log
```

**System monitor:**
```bash
./scripts/monitor.sh
```

## 💾 Backups

Backups are stored in: `/opt/recruitment-crm-ats/backups/`

**Backup format:**
```
crm_ats_backup_YYYYMMDD_HHMMSS.sql.gz
crm_ats_backup_YYYYMMDD_HHMMSS.sql.gz.sha256
```

**Restore backup:**
```bash
gunzip -c /opt/recruitment-crm-ats/backups/crm_ats_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U crm_ats_user -d recruitment_crm_ats
```

## 🔄 Update Process

1. Automatic backup is created
2. Git pull latest changes
3. Rebuild Docker images
4. Run database migrations
5. Restart containers
6. Health check verification

**To update:**
```bash
sudo ./scripts/update.sh
```

## ⚡ Performance Tips

### PostgreSQL Tuning

Edit `docker-compose.production.yml` and add to postgres service:

```yaml
command:
  - postgres
  - -c
  - shared_buffers=256MB
  - -c
  - effective_cache_size=1GB
  - -c
  - max_connections=100
```

### Nginx Caching

For static assets (future frontend):

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🛡️ Security Checklist

- [x] Strong database password
- [x] Unique JWT secrets
- [x] HTTPS/SSL enabled
- [x] Security headers configured
- [x] Rate limiting enabled
- [x] Firewall configured
- [x] Auto-updates for SSL
- [ ] Consider: Fail2Ban for brute-force protection
- [ ] Consider: Database backups to remote storage
- [ ] Consider: CloudFlare for DDoS protection

## 🆘 Troubleshooting

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive troubleshooting guide.

**Quick checks:**

```bash
# Container status
docker-compose -f docker-compose.production.yml ps

# Health check
curl https://crm.rsg-recruiting.de/health

# Logs
docker-compose -f docker-compose.production.yml logs --tail=100

# Nginx test
sudo nginx -t

# SSL check
sudo certbot certificates
```

## 📞 Support

For detailed documentation, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [../README.md](../README.md) - Application documentation
