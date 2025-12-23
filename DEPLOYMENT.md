# 🚀 Production Deployment Guide

## Voraussetzungen

- VPS: 72.60.80.120 (recruiting-sg.com)
- Docker + Docker Compose installiert
- Traefik läuft auf Netzwerk `root_traefik`
- SSH-Zugang zum VPS

## 📦 1. Code auf VPS bringen

### Option A: Git Pull (Empfohlen)

```bash
# Auf dem VPS
ssh root@72.60.80.120

cd /opt/recruitment-crm-ats
git pull origin claude/crm-recruiting-backend-kRGn2
```

### Option B: Lokale Änderungen hochladen

```bash
# Lokal ausführen
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  ./ root@72.60.80.120:/opt/recruitment-crm-ats/
```

## 🔧 2. Backend Dependencies & Build

```bash
# Auf dem VPS
cd /opt/recruitment-crm-ats

# Dependencies installieren (inkl. neue Packages)
npm install

# Prisma Client generieren
npm run prisma:generate

# TypeScript Build
npm run build
```

## 🗄️ 3. Datenbank-Migration

```bash
cd /opt/recruitment-crm-ats

# Migration ausführen (workflows, workflow_logs Tabellen)
npm run prisma:migrate:deploy

# Optional: Demo-Daten seeden (falls noch nicht vorhanden)
# npm run prisma:seed
```

## 🔐 4. Umgebungsvariablen konfigurieren

```bash
cd /opt/recruitment-crm-ats/deployment/docker

# Erweitere .env mit neuen Features
nano .env
```

**Füge diese Variablen hinzu:**

```bash
# === Existierende Variablen (bereits vorhanden) ===
DB_USER=crm_ats_user
DB_PASSWORD=KgIhMyKC2r7zMlYJlCfwQWkL5TuGP2yM
DB_NAME=recruitment_crm_ats
REDIS_PASSWORD=KgIhMyKC2r7zMlYJlCfwQWkL5TuGP2yM
JWT_SECRET=zPohOeWSsBADNjODBXZH51fsBjQbTH6FteOV1yxDKcrvEP9eTsbOQQTRf57uLNTa
JWT_REFRESH_SECRET=ErAT7xT0RZH1qJ9sL2kN4mP6vW8yB5cD
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# === NEU: OpenAI für CV-Parsing (optional) ===
# Wenn nicht gesetzt: Fallback auf Keyword-Matching
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# === NEU: S3 für Document Storage (optional) ===
# Wenn nicht gesetzt: Lokaler Upload nach ./uploads
AWS_S3_BUCKET=recruitment-crm-documents
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET

# === NEU: Upload Directory (wenn kein S3) ===
UPLOAD_DIR=/app/uploads
```

**Speichern:** `Ctrl+O`, `Enter`, `Ctrl+X`

## 🐳 5. Backend-Container neu starten

```bash
cd /opt/recruitment-crm-ats/deployment/docker

# Alte Container stoppen
docker-compose down

# Neu bauen und starten
docker-compose up -d --build

# Logs prüfen
docker-compose logs -f backend
```

**Erfolg, wenn du siehst:**
```
✅ Nest application successfully started
✅ Swagger documentation available at /api/docs
✅ Workflow engine initialized and listening for events
```

## 🎨 6. Frontend deployen

```bash
cd /opt/recruitment-crm-ats/frontend

# .env für Frontend erstellen (falls nicht vorhanden)
cat > .env <<'EOF'
NEXT_PUBLIC_API_URL=https://recruiting-sg.com/api
EOF

# Dependencies installieren
npm install

# Frontend bauen und starten
docker-compose -f docker-compose.traefik.yml up -d --build

# Logs prüfen
docker-compose -f docker-compose.traefik.yml logs -f
```

## ✅ 7. Deployment verifizieren

### Backend-Health-Check

```bash
curl https://recruiting-sg.com/api/health
# Sollte: {"status":"ok","timestamp":"..."}
```

### API-Dokumentation öffnen

Browser: **https://recruiting-sg.com/api/docs**

Neue Endpoints sichtbar:
- ✅ `/documents` - Document Upload
- ✅ `/workflows` - Workflow Automation
- ✅ `/analytics` - Dashboard KPIs

### Frontend öffnen

Browser: **https://recruiting-sg.com**

Login mit Demo-Account:
- Email: `admin@example.com`
- Password: `password123`

### Datenbank-Tabellen prüfen

```bash
# Auf dem VPS
docker exec -it crm-ats-backend npx prisma studio

# Oder CLI:
docker exec -it crm-ats-postgres psql -U crm_ats_user -d recruitment_crm_ats -c "\dt"
```

**Neue Tabellen sollten existieren:**
- ✅ `workflows`
- ✅ `workflow_logs`

## 🔍 8. Container-Status prüfen

```bash
# Alle laufenden Container
docker ps

# Sollte zeigen:
# - crm-ats-postgres
# - crm-ats-redis
# - crm-ats-backend
# - crm-ats-frontend
```

## 🐛 Troubleshooting

### Backend startet nicht

```bash
# Logs ansehen
docker-compose -f /opt/recruitment-crm-ats/deployment/docker/docker-compose.yml logs backend

# Häufige Probleme:
# 1. Fehlende Dependencies → npm install
# 2. Migration nicht ausgeführt → npm run prisma:migrate:deploy
# 3. Port 3000 belegt → docker-compose down && docker-compose up -d
```

### Frontend zeigt 404

```bash
# Frontend-Container prüfen
docker ps | grep crm-ats-frontend

# Falls nicht läuft:
cd /opt/recruitment-crm-ats/frontend
docker-compose -f docker-compose.traefik.yml up -d
```

### Datenbank-Fehler

```bash
# PostgreSQL-Logs
docker logs crm-ats-postgres

# DB-Verbindung testen
docker exec crm-ats-backend npx prisma db pull
```

### Traefik-Routing-Probleme

```bash
# Traefik-Logs
docker logs traefik

# Labels prüfen
docker inspect crm-ats-backend | grep -A 10 Labels
docker inspect crm-ats-frontend | grep -A 10 Labels
```

## 🎯 Neue Features testen

### 1. CV-Upload mit Auto-Parsing

```bash
# Login-Token holen
TOKEN=$(curl -X POST https://recruiting-sg.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Team-ID und Candidate-ID holen
TEAM_ID="..." # Aus /api/auth/profile
CANDIDATE_ID="..." # Aus /api/candidates?team_id=...

# CV hochladen
curl -X POST "https://recruiting-sg.com/api/documents/upload?team_id=$TEAM_ID&candidate_id=$CANDIDATE_ID&parse_cv=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/lebenslauf.pdf"
```

### 2. Dashboard-KPIs abrufen

```bash
curl "https://recruiting-sg.com/api/analytics/dashboard?team_id=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. Workflow erstellen

Browser → **https://recruiting-sg.com/api/docs** → `/workflows` → Try it out

## 📊 Monitoring

### Container-Ressourcen

```bash
docker stats crm-ats-backend crm-ats-frontend crm-ats-postgres
```

### Logs verfolgen

```bash
# Backend
docker logs -f crm-ats-backend

# Frontend
docker logs -f crm-ats-frontend

# Alle
docker-compose -f /opt/recruitment-crm-ats/deployment/docker/docker-compose.yml logs -f
```

### Backup-Strategie

```bash
# PostgreSQL Backup
docker exec crm-ats-postgres pg_dump -U crm_ats_user recruitment_crm_ats > backup_$(date +%Y%m%d).sql

# Uploads sichern
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /opt/recruitment-crm-ats/uploads
```

## 🔄 Update-Prozess (für künftige Updates)

```bash
cd /opt/recruitment-crm-ats
git pull
npm install
npm run prisma:generate
npm run build
npm run prisma:migrate:deploy
docker-compose -f deployment/docker/docker-compose.yml up -d --build
```

## 🎉 Fertig!

Dein CRM ist jetzt live unter:

- **Frontend:** https://recruiting-sg.com
- **API:** https://recruiting-sg.com/api
- **Docs:** https://recruiting-sg.com/api/docs

**Demo-Login:**
- Email: `admin@example.com`
- Password: `password123`
