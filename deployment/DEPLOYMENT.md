# 🚀 Production Deployment Guide - Hostinger VPS

Complete guide for deploying the CRM/ATS system to Hostinger VPS with Docker, Nginx, and SSL.

**Domain:** crm.rsg-recruiting.de
**Stack:** Docker Compose + PostgreSQL + NestJS + Nginx + Let's Encrypt SSL

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [Automated Deployment](#automated-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Post-Deployment](#post-deployment)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring](#monitoring)

---

## 🔧 Prerequisites

### On Your VPS

- Ubuntu 20.04+ or Debian 11+
- Minimum 2 GB RAM (4 GB recommended)
- 20 GB+ free disk space
- Root or sudo access
- Ports 80, 443, and 3001 available

### DNS Configuration

**IMPORTANT:** Before starting, configure DNS:

1. Log into your domain registrar (Hostinger, Namecheap, etc.)
2. Add an A record:
   ```
   Type: A
   Host: crm
   Points to: YOUR_VPS_IP_ADDRESS
   TTL: 3600
   ```
3. Wait 5-15 minutes for DNS propagation
4. Verify: `ping crm.rsg-recruiting.de`

### Required Software

The deployment script will check for these (and help install if missing):

- Docker 20.10+
- Docker Compose / Docker Compose Plugin
- Nginx
- Certbot (Let's Encrypt)
- Git
- curl, jq (optional, for monitoring)

---

## 🛠 Initial Server Setup

### 1. Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
# or
ssh your_username@YOUR_VPS_IP
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose Plugin
apt install docker-compose-plugin -y

# Or standalone docker-compose (alternative)
# curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
# chmod +x /usr/local/bin/docker-compose

# Install Nginx
apt install nginx -y
systemctl enable nginx
systemctl start nginx

# Install Certbot
apt install certbot python3-certbot-nginx -y

# Install Git and utilities
apt install git curl jq -y
```

### 4. Configure Firewall (if using UFW)

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 5. Verify Installations

```bash
docker --version
docker compose version
nginx -v
certbot --version
```

---

## 🚀 Automated Deployment

The easiest way to deploy is using our automated script:

### 1. Download and Run Deployment Script

```bash
# Create deployment directory
mkdir -p /opt/recruitment-crm-ats
cd /opt/recruitment-crm-ats

# Clone repository
git clone https://github.com/Ricdog87/recruitment-crm-ats.git .
git checkout claude/crm-recruiting-backend-kRGn2

# Make scripts executable
chmod +x deployment/scripts/*.sh

# Run deployment script
sudo ./deployment/scripts/deploy.sh
```

### 2. Configure Environment Variables

The script will create `.env.production` from the example. **You MUST edit it:**

```bash
nano /opt/recruitment-crm-ats/deployment/docker/.env.production
```

**Required changes:**

```bash
# Generate strong passwords and secrets
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# Update these in .env.production:
DB_PASSWORD=your_generated_password_here
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here

# Update CORS if needed
CORS_ORIGINS=https://crm.rsg-recruiting.de,https://www.rsg-recruiting.de
```

### 3. Continue Deployment

After editing the `.env.production` file, press ENTER to continue.

The script will:
- ✅ Build Docker images
- ✅ Start containers
- ✅ Run database migrations
- ✅ Configure Nginx
- ✅ Setup SSL with Let's Encrypt
- ✅ Configure auto-renewal
- ✅ Setup log rotation
- ✅ Perform health checks

### 4. Verify Deployment

```bash
# Check containers
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml ps

# Check health
curl https://crm.rsg-recruiting.de/health

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

**Done! 🎉** Your CRM is now live at `https://crm.rsg-recruiting.de`

---

## 📖 Manual Deployment

If you prefer manual deployment or the script fails:

### 1. Clone Repository

```bash
mkdir -p /opt/recruitment-crm-ats
cd /opt/recruitment-crm-ats
git clone https://github.com/Ricdog87/recruitment-crm-ats.git .
git checkout claude/crm-recruiting-backend-kRGn2
```

### 2. Configure Environment

```bash
cd deployment/docker
cp .env.production.example .env.production
nano .env.production
```

Generate secrets:

```bash
# Database password
openssl rand -base64 32

# JWT secret
openssl rand -base64 48

# JWT refresh secret
openssl rand -base64 48
```

### 3. Build and Start Containers

```bash
cd /opt/recruitment-crm-ats/deployment/docker

# Build images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

### 4. Run Database Migrations

```bash
docker-compose -f docker-compose.production.yml exec backend npx prisma migrate deploy
```

### 5. Configure Nginx

```bash
# Copy nginx config
cp /opt/recruitment-crm-ats/deployment/nginx/crm.rsg-recruiting.de.conf \
   /etc/nginx/sites-available/crm.rsg-recruiting.de.conf

# Enable site
ln -s /etc/nginx/sites-available/crm.rsg-recruiting.de.conf \
      /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### 6. Setup SSL Certificate

```bash
# Create webroot directory
mkdir -p /var/www/certbot

# Obtain certificate
certbot certonly --webroot \
    -w /var/www/certbot \
    -d crm.rsg-recruiting.de \
    --email your-email@rsg-recruiting.de \
    --agree-tos \
    --non-interactive

# Reload nginx with SSL
systemctl reload nginx
```

### 7. Setup Auto-Renewal

```bash
# Add to crontab
crontab -e

# Add this line:
0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'
```

### 8. Health Check

```bash
# Local health check
curl http://localhost:3001/api/health

# Public health check
curl https://crm.rsg-recruiting.de/health
```

---

## ✅ Post-Deployment

### 1. Verify API Access

```bash
# Health check
curl https://crm.rsg-recruiting.de/health

# API documentation
open https://crm.rsg-recruiting.de/api/docs
```

### 2. Create First Admin User

**Option A: Via API (Recommended)**

```bash
curl -X POST https://crm.rsg-recruiting.de/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rsg-recruiting.de",
    "password": "YourSecurePassword123!",
    "first_name": "Admin",
    "last_name": "User"
  }'
```

**Option B: Seed Demo Data**

```bash
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml exec backend npm run prisma:seed
```

This creates demo users (see main README.md for credentials).

### 3. Setup Daily Backups

```bash
# Make backup script executable
chmod +x /opt/recruitment-crm-ats/deployment/scripts/backup.sh

# Test backup
/opt/recruitment-crm-ats/deployment/scripts/backup.sh

# Add to crontab for daily backups at 2 AM
crontab -e

# Add:
0 2 * * * /opt/recruitment-crm-ats/deployment/scripts/backup.sh >> /var/log/crm-backup.log 2>&1
```

### 4. Configure Remote Backups (Optional but Recommended)

Edit `backup.sh` and uncomment the remote backup section:

```bash
nano /opt/recruitment-crm-ats/deployment/scripts/backup.sh

# Uncomment and configure:
# rsync -avz "$BACKUP_FILE_GZ" user@backup-server:/backups/crm-ats/
# or
# rclone copy "$BACKUP_FILE_GZ" remote:backups/crm-ats/
# or
# aws s3 cp "$BACKUP_FILE_GZ" s3://your-bucket/backups/crm-ats/
```

### 5. Setup Monitoring (Optional)

```bash
# Make monitor script executable
chmod +x /opt/recruitment-crm-ats/deployment/scripts/monitor.sh

# Run monitor
/opt/recruitment-crm-ats/deployment/scripts/monitor.sh
```

---

## 🔄 Maintenance

### Viewing Logs

```bash
# All logs
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml logs -f

# Backend only
docker-compose -f docker-compose.production.yml logs -f backend

# Database only
docker-compose -f docker-compose.production.yml logs -f postgres

# Nginx logs
tail -f /var/log/nginx/crm.rsg-recruiting.de.access.log
tail -f /var/log/nginx/crm.rsg-recruiting.de.error.log
```

### Updating the Application

```bash
# Use the update script
/opt/recruitment-crm-ats/deployment/scripts/update.sh

# Or manually:
cd /opt/recruitment-crm-ats
git pull origin claude/crm-recruiting-backend-kRGn2

cd deployment/docker
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Restarting Services

```bash
cd /opt/recruitment-crm-ats/deployment/docker

# Restart all
docker-compose -f docker-compose.production.yml restart

# Restart backend only
docker-compose -f docker-compose.production.yml restart backend

# Restart database only
docker-compose -f docker-compose.production.yml restart postgres
```

### Database Operations

**Connect to Database:**

```bash
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml exec postgres psql -U crm_ats_user -d recruitment_crm_ats
```

**Backup Database:**

```bash
/opt/recruitment-crm-ats/deployment/scripts/backup.sh
```

**Restore Database:**

```bash
# List available backups
ls -lh /opt/recruitment-crm-ats/backups/

# Restore specific backup
gunzip -c /opt/recruitment-crm-ats/backups/crm_ats_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U crm_ats_user -d recruitment_crm_ats
```

### SSL Certificate Renewal

Automatic renewal is configured, but to manually renew:

```bash
# Renew all certificates
certbot renew

# Renew specific certificate
certbot renew --cert-name crm.rsg-recruiting.de

# Test renewal (dry run)
certbot renew --dry-run

# Check certificate expiry
certbot certificates
```

---

## 🔍 Troubleshooting

### Issue: Containers won't start

```bash
# Check logs
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml logs

# Check if ports are in use
netstat -tulpn | grep :3001

# Restart Docker
systemctl restart docker
```

### Issue: Database connection failed

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.production.yml ps postgres

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Verify environment variables
docker-compose -f docker-compose.production.yml exec backend env | grep DATABASE_URL
```

### Issue: 502 Bad Gateway from Nginx

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check nginx error logs
tail -f /var/log/nginx/crm.rsg-recruiting.de.error.log

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
```

### Issue: SSL certificate not working

```bash
# Check certificate exists
ls -la /etc/letsencrypt/live/crm.rsg-recruiting.de/

# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/crm.rsg-recruiting.de/cert.pem -text -noout

# Re-obtain certificate
certbot certonly --webroot -w /var/www/certbot -d crm.rsg-recruiting.de --force-renew
```

### Issue: High memory usage

```bash
# Check container stats
docker stats

# Restart containers to free memory
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml restart
```

### Issue: Disk space full

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a --volumes

# Remove old backups
find /opt/recruitment-crm-ats/backups -name "*.sql.gz" -mtime +30 -delete
```

---

## 📊 Monitoring

### System Status

```bash
# Run monitor script
/opt/recruitment-crm-ats/deployment/scripts/monitor.sh
```

### Health Checks

```bash
# Local health check
curl http://localhost:3001/api/health

# Public health check
curl https://crm.rsg-recruiting.de/health

# Detailed health with pretty print
curl -s https://crm.rsg-recruiting.de/health | jq
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# System resources
htop
# or
top
```

### Log Monitoring

```bash
# Real-time logs
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Search logs for errors
docker-compose -f docker-compose.production.yml logs | grep -i error

# Nginx access logs
tail -f /var/log/nginx/crm.rsg-recruiting.de.access.log

# Count requests per minute
tail -1000 /var/log/nginx/crm.rsg-recruiting.de.access.log | cut -d[ -f2 | cut -d] -f1 | awk -F: '{print $2":"$3}' | sort -n | uniq -c | tail
```

---

## 🔐 Security Hardening

### 1. Change Default Secrets

Ensure you've changed all default values in `.env.production`:

```bash
nano /opt/recruitment-crm-ats/deployment/docker/.env.production
```

### 2. Setup Fail2Ban (Optional)

```bash
apt install fail2ban -y

# Create jail for nginx
cat > /etc/fail2ban/jail.d/nginx-crm.conf << EOF
[nginx-crm]
enabled = true
port = http,https
filter = nginx-crm
logpath = /var/log/nginx/crm.rsg-recruiting.de.access.log
maxretry = 5
bantime = 3600
EOF

systemctl restart fail2ban
```

### 3. Restrict Database Access

Ensure PostgreSQL is only accessible from localhost (default in our docker-compose).

### 4. Regular Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update Docker images
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

---

## 📞 Support & Resources

- **Main Documentation:** `/opt/recruitment-crm-ats/README.md`
- **API Documentation:** `https://crm.rsg-recruiting.de/api/docs`
- **Logs:** `/var/log/nginx/` and Docker logs
- **Backups:** `/opt/recruitment-crm-ats/backups/`

### Useful Commands Quick Reference

```bash
# Deploy/Update
sudo /opt/recruitment-crm-ats/deployment/scripts/deploy.sh
sudo /opt/recruitment-crm-ats/deployment/scripts/update.sh

# Backup
sudo /opt/recruitment-crm-ats/deployment/scripts/backup.sh

# Monitor
sudo /opt/recruitment-crm-ats/deployment/scripts/monitor.sh

# Logs
cd /opt/recruitment-crm-ats/deployment/docker
docker-compose -f docker-compose.production.yml logs -f

# Restart
docker-compose -f docker-compose.production.yml restart

# Stop
docker-compose -f docker-compose.production.yml down

# Start
docker-compose -f docker-compose.production.yml up -d
```

---

## 🎉 Success!

Your CRM/ATS system is now deployed at **https://crm.rsg-recruiting.de**

Next steps:
1. ✅ Create your first admin user
2. ✅ Test the API endpoints
3. ✅ Setup daily backups
4. ✅ Configure monitoring
5. ✅ Integrate with your frontend (when ready)

Happy recruiting! 🚀
