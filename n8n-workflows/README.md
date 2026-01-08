# n8n Workflows für Recruitment CRM/ATS

Diese Workflows können direkt in n8n importiert werden.

## 📥 Verfügbare Workflows

### 1. candidate-auto-matching.json
**Neuer Kandidat → Automatisches Matching**

**Flow:**
1. Webhook empfängt neuen Kandidaten (z.B. von LinkedIn)
2. API erstellt Kandidat und berechnet Wechselwilligkeit
3. Automatisches Matching mit offenen Stellen
4. Falls Wechselwilligkeit >= 70%: Email an Recruiter
5. Response zurück

**Trigger:**
```bash
curl -X POST http://your-n8n-server:5678/webhook/new-candidate \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max@example.com",
    "skills": ["Java", "Spring Boot", "PostgreSQL"]
  }'
```

### 2. daily-change-readiness-update.json (TODO)
**Tägliches Update der Wechselwilligkeit**

**Flow:**
1. Cron: Täglich um 6 Uhr
2. API: Alle Kandidaten neu berechnen
3. API: Top 50 wechselbereite Kandidaten holen
4. Email-Report an Team

### 3. new-job-find-candidates.json (TODO)
**Neue Stelle → Finde passende Kandidaten**

**Flow:**
1. Webhook empfängt neue Stelle (von HR4you)
2. API erstellt Stelle
3. Automatisches Matching mit Kandidaten
4. Filter: Nur changeReadinessScore >= 70
5. Slack-Notification mit Top 10

## 🚀 Import in n8n

1. n8n öffnen
2. "Workflows" → "Import from File"
3. JSON-Datei auswählen
4. Workflow aktivieren

## ⚙️ Konfiguration

### API-URLs anpassen

In allen Workflows müssen Sie die API-URLs anpassen:

```
http://localhost:3000 → http://YOUR_SERVER:3000
```

### Email-Konfiguration

Für Email-Notifications benötigen Sie:
- SMTP-Credentials in n8n konfiguriert
- Email-Adressen der Recruiter

### Webhook-URLs

Nach dem Import erhalten Sie Webhook-URLs wie:
```
http://your-n8n-server:5678/webhook/new-candidate
```

Diese können Sie in anderen Systemen (LinkedIn, HR4you, etc.) als Callback-URL eintragen.

## 🔗 Integration mit externen Systemen

### LinkedIn
LinkedIn sendet Webhook bei neuen Profil-Aufrufen → n8n → API

### HR4you
HR4you sendet Webhook bei neuer Stelle → n8n → API

### advertsdata.com
Scraping-Job sendet Ergebnisse → n8n → API

## 📊 Monitoring

In n8n können Sie:
- Execution History anschauen
- Fehler-Logs einsehen
- Performance überwachen

## 🆘 Support

Bei Fragen zu n8n Workflows:
- n8n Docs: https://docs.n8n.io
- Community: https://community.n8n.io
