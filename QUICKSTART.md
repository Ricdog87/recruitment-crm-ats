# ⚡ Quick Start - Live-Deployment in 5 Minuten

## 🎯 Schnellster Weg zum Live-System

### Auf dem VPS (72.60.80.120)

```bash
# 1. SSH verbinden
ssh root@72.60.80.120

# 2. Ins Verzeichnis wechseln
cd /opt/recruitment-crm-ats

# 3. Code aktualisieren
git pull origin claude/crm-recruiting-backend-kRGn2

# 4. Automatisches Deployment-Script ausführen
chmod +x deploy.sh
./deploy.sh
```

**Das war's!** 🎉

Das Script macht automatisch:
- ✅ Dependencies installieren
- ✅ Prisma Migration ausführen
- ✅ Backend bauen
- ✅ Docker-Container neu starten
- ✅ Frontend deployen
- ✅ Health-Checks durchführen

---

## 🔧 Manuelle Schritte (falls Script nicht funktioniert)

### Backend

```bash
cd /opt/recruitment-crm-ats

# Dependencies & Build
npm install
npm run prisma:generate
npm run build
npm run prisma:migrate:deploy

# Container starten
cd deployment/docker
docker-compose down
docker-compose up -d --build
```

### Frontend

```bash
cd /opt/recruitment-crm-ats/frontend

# Environment
echo "NEXT_PUBLIC_API_URL=https://recruiting-sg.com/api" > .env

# Deploy
npm install
docker-compose -f docker-compose.traefik.yml up -d --build
```

---

## ✅ Testen

```bash
# Backend
curl https://recruiting-sg.com/api/health

# Frontend (im Browser)
open https://recruiting-sg.com
```

**Login:**
- Email: `admin@example.com`
- Password: `password123`

---

## 🐛 Wenn etwas schief geht

```bash
# Logs ansehen
docker logs -f crm-ats-backend
docker logs -f crm-ats-frontend

# Container-Status
docker ps | grep crm-ats

# Neustart erzwingen
docker-compose -f deployment/docker/docker-compose.yml restart
```

---

## 🆕 Neue Features aktivieren

### OpenAI CV-Parsing aktivieren

```bash
# deployment/docker/.env bearbeiten
nano deployment/docker/.env

# Hinzufügen:
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Backend neu starten
docker-compose -f deployment/docker/docker-compose.yml restart
```

### S3 Document Storage aktivieren

```bash
# deployment/docker/.env bearbeiten
nano deployment/docker/.env

# Hinzufügen:
AWS_S3_BUCKET=recruitment-crm-documents
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET

# Backend neu starten
docker-compose -f deployment/docker/docker-compose.yml restart
```

---

## 📞 Support

- **Deployment-Guide:** `DEPLOYMENT.md`
- **API-Docs:** https://recruiting-sg.com/api/docs
- **Container-Logs:** `docker-compose logs -f`
