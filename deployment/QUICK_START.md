# ⚡ Quick Start - Hostinger VPS Deployment

**Goal:** Deploy CRM/ATS to `crm.rsg-recruiting.de` in under 10 minutes.

## Prerequisites Check

- [ ] VPS with Ubuntu 20.04+ (2GB RAM minimum)
- [ ] DNS A record: `crm` → Your VPS IP
- [ ] Root/sudo access to VPS

## 🚀 Installation Commands

Copy and paste these commands on your VPS:

### 1. Install Prerequisites (3 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker --now

# Install Docker Compose Plugin
sudo apt install docker-compose-plugin -y

# Install Nginx & Certbot
sudo apt install nginx certbot python3-certbot-nginx git curl jq -y
sudo systemctl enable nginx --now

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. Deploy CRM/ATS (5 minutes)

```bash
# Clone and deploy
sudo mkdir -p /opt/recruitment-crm-ats
cd /opt/recruitment-crm-ats
sudo git clone https://github.com/Ricdog87/recruitment-crm-ats.git .
sudo git checkout claude/crm-recruiting-backend-kRGn2
sudo chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh
```

### 3. Configure Environment

When prompted, edit `.env.production`:

```bash
# Generate secrets (run these first):
openssl rand -base64 32  # Copy for DB_PASSWORD
openssl rand -base64 48  # Copy for JWT_SECRET
openssl rand -base64 48  # Copy for JWT_REFRESH_SECRET

# Then edit the file:
sudo nano /opt/recruitment-crm-ats/deployment/docker/.env.production
```

Paste your generated values into these fields:
```env
DB_PASSWORD=paste_generated_password_here
JWT_SECRET=paste_generated_jwt_secret_here
JWT_REFRESH_SECRET=paste_generated_refresh_secret_here
```

Save and exit (Ctrl+X, Y, Enter).

Press ENTER to continue deployment.

### 4. Setup SSL

When asked about SSL setup, choose **YES** (y).

The script will automatically:
- Configure Let's Encrypt SSL
- Setup auto-renewal
- Configure Nginx with SSL

## ✅ Verify Deployment

```bash
# Check health
curl https://crm.rsg-recruiting.de/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}

# View Swagger docs
open https://crm.rsg-recruiting.de/api/docs
```

## 🎯 Create First User

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

## 📦 Setup Daily Backups

```bash
# Test backup
sudo /opt/recruitment-crm-ats/deployment/scripts/backup.sh

# Add to crontab (daily at 2 AM)
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /opt/recruitment-crm-ats/deployment/scripts/backup.sh >> /var/log/crm-backup.log 2>&1") | sudo crontab -
```

## 🎉 Done!

Your CRM is live at: **https://crm.rsg-recruiting.de**

### Useful Commands

```bash
# Monitor status
sudo /opt/recruitment-crm-ats/deployment/scripts/monitor.sh

# View logs
cd /opt/recruitment-crm-ats/deployment/docker
sudo docker-compose -f docker-compose.production.yml logs -f

# Update application
sudo /opt/recruitment-crm-ats/deployment/scripts/update.sh

# Restart services
cd /opt/recruitment-crm-ats/deployment/docker
sudo docker-compose -f docker-compose.production.yml restart
```

## ❓ Troubleshooting

**DNS not resolving?**
```bash
ping crm.rsg-recruiting.de
# Wait 5-15 minutes for propagation
```

**Containers not starting?**
```bash
cd /opt/recruitment-crm-ats/deployment/docker
sudo docker-compose -f docker-compose.production.yml logs
```

**SSL certificate failed?**
```bash
# Check DNS first
ping crm.rsg-recruiting.de

# Then retry
sudo certbot certonly --webroot -w /var/www/certbot -d crm.rsg-recruiting.de
```

**Need help?** See full documentation: `/opt/recruitment-crm-ats/deployment/DEPLOYMENT.md`

---

**Total Time:** ~10 minutes ⚡
**Difficulty:** Easy 🟢
