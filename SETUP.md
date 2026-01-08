# Setup & Installation

## 📋 Voraussetzungen

- Node.js 18+
- PostgreSQL 15+
- npm oder yarn
- (Optional) Docker & Docker Compose
- (Optional) n8n Server

## 🚀 Installation

### 1. Repository klonen & Dependencies installieren

```bash
npm install
```

### 2. Datenbank starten

**Option A: Docker Compose (empfohlen)**

```bash
docker-compose up -d
```

Dies startet:
- PostgreSQL auf Port 5432
- pgAdmin auf Port 5050 (http://localhost:5050)

**Option B: Lokale PostgreSQL**

Stelle sicher, dass PostgreSQL läuft und erstelle eine Datenbank:

```sql
CREATE DATABASE recruitment_crm;
```

### 3. Environment Variables konfigurieren

Kopiere `.env.example` zu `.env` und fülle die Werte aus:

```bash
cp .env.example .env
```

Mindestens erforderlich:
```env
DATABASE_URL="postgresql://recruitment:recruitment123@localhost:5432/recruitment_crm"
```

Optional (für volle Funktionalität):
- `OPENAI_API_KEY` - Für CLI Natural Language Processing
- `LINKEDIN_ACCESS_TOKEN` - Für LinkedIn-Integration
- `STEPSTONE_API_KEY` - Für StepStone-Integration
- `INDEED_API_TOKEN` - Für Indeed-Integration
- `HR4YOU_API_KEY` - Für HR4you CRM-Sync
- `ADVERTSDATA_USERNAME` & `ADVERTSDATA_PASSWORD` - Für Stellenanzeigen-Scraping
- `N8N_WEBHOOK_URL` - Für n8n-Integration

### 4. Datenbank-Migrationen ausführen

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Daten seed (optional)

Erstelle Test-Daten:

```bash
# TODO: Seed-Script erstellen
npm run seed
```

## 🎯 Starten

### Development Mode

```bash
npm run start:dev
```

Server läuft auf: http://localhost:3000

### Production Mode

```bash
npm run build
npm run start:prod
```

### CLI Interactive Mode

```bash
npm run cli interactive
```

Oder kürzer:

```bash
npm run cli i
```

## 🔧 Nützliche Befehle

### Prisma Studio (DB GUI)

```bash
npm run prisma:studio
```

Öffnet: http://localhost:5555

### CLI Quick Commands

```bash
# Top wechselbereite Kandidaten
npm run cli top-change-ready -- --limit 20

# Scrape advertsdata.com
npm run cli scrape -- --limit 50
```

## 🐳 Docker (Production)

```bash
# Build Image
docker build -t recruitment-crm-ats .

# Run Container
docker run -p 3000:3000 --env-file .env recruitment-crm-ats
```

## 🔗 API Endpoints

Nach dem Start verfügbar:

- **Candidates**: http://localhost:3000/candidates
- **Jobs**: http://localhost:3000/jobs
- **Matching**: http://localhost:3000/matching
- **Change Readiness**: http://localhost:3000/change-readiness
- **Webhooks**: http://localhost:3000/webhooks

## 🤖 n8n Integration

### n8n Workflow einrichten

1. In n8n einen HTTP Request Node erstellen
2. URL: `http://localhost:3000/webhooks/n8n/candidate/new`
3. Method: POST
4. Body:
```json
{
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@example.com",
  "skills": ["Java", "Spring Boot", "PostgreSQL"]
}
```

Siehe `n8n-workflows/` für Beispiel-Workflows.

## 🧪 Testing

```bash
# Unit Tests
npm run test

# E2E Tests
npm run test:e2e

# Test Coverage
npm run test:cov
```

## 📊 Monitoring & Logs

- App-Logs: Console Output
- pgAdmin: http://localhost:5050
- Prisma Studio: http://localhost:5555

## ⚠️ Troubleshooting

### Database Connection Error

```bash
# Prüfen ob PostgreSQL läuft
docker-compose ps

# Logs anschauen
docker-compose logs postgres
```

### Prisma Errors

```bash
# Prisma Client neu generieren
npm run prisma:generate

# DB zurücksetzen
npm run prisma:migrate reset
```

### Port already in use

```bash
# Port in .env ändern
PORT=3001
```
