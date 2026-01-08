# 🚀 Recruitment CRM/ATS - AI-Powered Matching Platform

**Multi-User CRM/ATS für Headhunter & Personalvermittler**

## 🎯 Projekt-Vision

Ein intelligentes Recruitment-System, das **Kandidaten und Stellen automatisch matched** - mit Fokus auf **Wechselwilligkeit**!

### 🔥 Unique Selling Points (USP)

1. **Wechselwilligkeit-Tracking** ⭐
   - Identifiziere Kandidaten, die **JETZT** wechseln wollen
   - Automatische Berechnung basierend auf:
     - LinkedIn-Aktivität
     - Profil-Updates
     - "Open to Work" Signale
     - Response-Rate
   - **Vorteil**: Exklusiver Zugriff auf wechselbereite Kandidaten vor anderen PDLern!

2. **Smart Matching Engine** 🎯
   - Multi-Faktor-Algorithmus:
     - Skills (35%)
     - Experience (20%)
     - **Wechselwilligkeit (25%)** 🔥
     - Location (10%)
     - Salary (10%)
   - Bidirektional: Kandidaten ↔ Stellen

3. **Natural Language CLI** 🤖
   - Natürliche Befehle statt SQL:
     - "Suche mir Kandidaten für Java Developer Stelle"
     - "Finde wechselbereite Python-Entwickler"
     - "Welche Kandidaten sind Open to Work?"
   - Powered by OpenAI GPT

4. **Multi-Source Integration** 🔌
   - LinkedIn Recruiter Lite
   - StepStone Datenbank
   - Indeed Datenbank
   - advertsdata.com Scraper
   - HR4you CRM Sync

5. **n8n Workflow Automation** ⚡
   - Webhook-basierte Integration
   - Automatische Workflows
   - Trigger-basierte Aktionen

## 📦 Tech Stack

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **APIs**: LinkedIn, StepStone, Indeed, HR4you
- **Scraping**: Puppeteer, Cheerio
- **NLP**: OpenAI GPT-4
- **Automation**: n8n Webhooks
- **CLI**: Commander.js

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLI/Natural Language Interface               │
│  "Suche wechselbereite Kandidaten mit Java Skills"             │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                      NestJS API Server                          │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ Candidates │  │    Jobs    │  │  Matching  │              │
│  │  Module    │  │   Module   │  │   Engine   │              │
│  └────────────┘  └────────────┘  └────────────┘              │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   Change   │  │Integrations│  │  Webhooks  │              │
│  │ Readiness  │  │   Module   │  │   (n8n)    │              │
│  └────────────┘  └────────────┘  └────────────┘              │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  Candidates | Jobs | Skills | Matches | ChangeReadiness        │
└─────────────────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                  External Integrations                          │
│                                                                 │
│  LinkedIn  │  StepStone  │  Indeed  │  HR4you  │  advertsdata │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

Siehe [SETUP.md](./SETUP.md) für detaillierte Installationsanleitung.

```bash
# 1. Install
npm install

# 2. Datenbank starten
docker-compose up -d

# 3. DB Migrations
npm run prisma:generate
npm run prisma:migrate

# 4. Server starten
npm run start:dev

# 5. CLI Interactive Mode
npm run cli interactive
```

## 💡 Anwendungsbeispiele

### 1. CLI - Natural Language Commands

```bash
$ npm run cli interactive

🚀 > Suche mir wechselbereite Kandidaten mit Java und Spring Boot

🎯 Intent erkannt: find_candidates_for_job

🔍 Suche Kandidaten...

Gefunden: 15 Kandidaten
────────────────────────────────────────────────────────────────

👤 Max Mustermann
   📧 max.mustermann@example.com
   💼 Senior Java Developer
   🎯 Skills: Java, Spring Boot, PostgreSQL, Docker
   🔄 Wechselwilligkeit: 92% 🔥
   📍 Berlin

────────────────────────────────────────────────────────────────
...
```

### 2. API - Programmatic Access

```bash
# Finde Kandidaten für Job
curl -X POST http://localhost:3000/matching/jobs/{jobId}/find-candidates?minScore=70

# Top wechselbereite Kandidaten
curl http://localhost:3000/change-readiness/top?limit=20

# Wechselwilligkeit berechnen
curl -X POST http://localhost:3000/change-readiness/{candidateId}/calculate
```

### 3. n8n Workflow Integration

```javascript
// n8n HTTP Request Node
{
  "url": "http://localhost:3000/webhooks/n8n/candidate/new",
  "method": "POST",
  "body": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max@example.com",
    "skills": ["Java", "Spring Boot"],
    "source": "LINKEDIN"
  }
}

// Response
{
  "success": true,
  "candidate": {...},
  "changeReadiness": {
    "overallScore": 85,
    "openToWork": true
  },
  "matchesFound": 12
}
```

## 🎯 Core Features

### 1. Wechselwilligkeit-Tracking

**Automatische Berechnung** basierend auf:

- **LinkedIn-Aktivität** (30%)
  - Letzte Posts/Updates
  - Profil-Änderungen

- **Profil-Updates** (25%)
  - Kürzliche CV-Aktualisierungen
  - Skills hinzugefügt

- **Job-Search Signals** (35%)
  - "Open to Work" Badge
  - Verfügbarkeit gesetzt
  - Kündigungsfrist angegeben

- **Response-Rate** (10%)
  - Reaktion auf Kontaktversuche

**Score-Range**: 0-100%
- **90-100%**: 🔥 Hochgradig wechselbereit
- **70-89%**: ⭐ Wechselbereit
- **60-69%**: ✅ Möglicherweise wechselbereit
- **< 60%**: ⚠️ Nicht prioritär

### 2. Smart Matching

**Algorithmus-Gewichtung**:

```typescript
overallScore =
  skillsScore * 0.35 +
  experienceScore * 0.20 +
  changeReadinessScore * 0.25 +  // ⭐ KEY DIFFERENTIATOR
  locationScore * 0.10 +
  salaryScore * 0.10
```

**Output**:
- Matching Skills
- Missing Skills
- Detailed Score-Breakdown
- Sortiert nach Change Readiness!

### 3. Multi-Source Integration

#### LinkedIn Integration
```typescript
// Kandidat von LinkedIn importieren
POST /integrations/linkedin/import
{
  "linkedInUrl": "https://www.linkedin.com/in/max-mustermann"
}

// Aktivität prüfen
POST /integrations/linkedin/check-activity
{
  "candidateId": "uuid"
}
```

#### StepStone Integration
```typescript
// Kandidaten suchen
POST /integrations/stepstone/search
{
  "skills": ["Java", "Spring"],
  "location": "Berlin",
  "experienceYears": 5
}

// Batch-Import
POST /integrations/stepstone/batch-import
{
  "skills": ["Python", "Django"],
  "limit": 50
}
```

#### advertsdata.com Scraper
```bash
# CLI
npm run cli scrape -- --limit 100

# API
POST /integrations/advertsdata/scrape
{
  "limit": 100
}
```

## 📊 Datenbank-Schema

### Hauptentitäten

- **Candidate** - Kandidaten mit Skills
- **Job** - Stellen mit Required Skills
- **Match** - Kandidat ↔ Stelle Matches
- **ChangeReadiness** - Wechselwilligkeit-Tracking
- **Skill** - Skills Katalog
- **Activity** - Aktivitäts-Log
- **Note** - Notizen

Siehe [prisma/schema.prisma](./prisma/schema.prisma) für Details.

## 🔌 API Endpoints

### Candidates
- `GET /candidates` - Alle Kandidaten
- `GET /candidates/:id` - Kandidat Details
- `POST /candidates` - Kandidat erstellen
- `PUT /candidates/:id` - Kandidat updaten
- `GET /candidates/change-ready` - Wechselbereite Kandidaten
- `GET /candidates/open-to-work` - "Open to Work" Kandidaten
- `POST /candidates/:id/skills` - Skill hinzufügen

### Jobs
- `GET /jobs` - Alle Stellen
- `GET /jobs/:id` - Stelle Details
- `POST /jobs` - Stelle erstellen
- `GET /jobs/open` - Offene Stellen
- `POST /jobs/:id/skills` - Required Skill hinzufügen

### Matching
- `POST /matching/jobs/:jobId/find-candidates` - Kandidaten für Stelle finden
- `POST /matching/candidates/:candidateId/find-jobs` - Stellen für Kandidat finden
- `GET /matching/jobs/:jobId/top-matches` - Top Matches für Stelle
- `GET /matching/candidates/:candidateId/top-matches` - Top Matches für Kandidat

### Change Readiness
- `POST /change-readiness/:candidateId/calculate` - Score berechnen
- `POST /change-readiness/recalculate-all` - Alle neu berechnen
- `GET /change-readiness/top` - Top wechselbereite Kandidaten
- `POST /change-readiness/:candidateId/open-to-work` - "Open to Work" setzen

### Webhooks (n8n)
- `POST /webhooks/n8n/candidate/new` - Neuer Kandidat
- `POST /webhooks/n8n/job/new` - Neue Stelle
- `POST /webhooks/n8n/matching/find-candidates` - Matching triggern
- `POST /webhooks/test` - Webhook Test

## 🤖 CLI Commands

### Interactive Mode
```bash
npm run cli interactive
```

### Direct Commands
```bash
# Top wechselbereite Kandidaten
npm run cli top-change-ready --limit 20

# Kandidaten für Job finden
npm run cli find-candidates --job-id <id> --min-score 70

# Stellen für Kandidat finden
npm run cli find-jobs --candidate-id <id>

# Scrape advertsdata
npm run cli scrape --limit 50
```

## 🔗 n8n Integration

### Beispiel-Workflows

#### 1. Neuer LinkedIn-Kandidat → Auto-Matching
```
1. LinkedIn Webhook/Trigger
2. HTTP Request → POST /webhooks/n8n/candidate/new
3. Wechselwilligkeit wird berechnet
4. Auto-Matching mit offenen Stellen
5. Email an Recruiter mit Top-Matches
```

#### 2. Neue Stelle → Finde wechselbereite Kandidaten
```
1. HR4you CRM Webhook
2. HTTP Request → POST /webhooks/n8n/job/new
3. Auto-Matching mit Kandidaten
4. Filter: changeReadinessScore >= 70
5. Slack-Notification mit Top 10
```

#### 3. Täglicher Wechselwilligkeit-Update
```
1. Cron Schedule (täglich 6 Uhr)
2. HTTP Request → POST /change-readiness/recalculate-all
3. HTTP Request → GET /change-readiness/top
4. Email-Report mit neuen wechselbereiten Kandidaten
```

Siehe `n8n-workflows/` für Import-Ready Workflows.

## 🛠️ Development

### Project Structure
```
src/
├── candidates/          # Kandidaten-Management
├── jobs/               # Stellen-Management
├── matching/           # Matching-Engine
├── change-readiness/   # Wechselwilligkeit-Tracking
├── integrations/       # LinkedIn, StepStone, Indeed, HR4you
├── webhooks/          # n8n Integration
├── cli/               # CLI Interface
└── prisma/            # Database Schema & Migrations
```

### Scripts
```bash
npm run start:dev      # Development Server
npm run build          # Production Build
npm run test           # Tests
npm run prisma:studio  # DB GUI
npm run lint           # Linting
```

## 📈 Roadmap

- [ ] Machine Learning für besseres Matching
- [ ] XING Integration
- [ ] Kandidaten-Pool automatisch enrichen
- [ ] Email-Integration (Auto-Contact)
- [ ] WhatsApp Business Integration
- [ ] Mobile App
- [ ] Analytics Dashboard
- [ ] Multi-Tenancy (verschiedene Recruiter-Teams)

## 🤝 Contributing

Contributions welcome! Siehe [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 License

MIT License - siehe [LICENSE](./LICENSE)

## 🆘 Support

- GitHub Issues: https://github.com/your-repo/issues
- Email: support@your-domain.com
- Docs: https://docs.your-domain.com

---

**Entwickelt mit ❤️ für Recruiter, die einen Wettbewerbsvorteil wollen!** 🚀
