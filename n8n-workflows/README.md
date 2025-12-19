# 🔄 n8n Workflows for CRM/ATS Automation

Production-ready n8n workflows for automating recruitment processes.

## 📦 Available Workflows

### 1. **auth-crm.json** - CRM Authentication & Token Management
- **Purpose**: Authenticates with CRM API and stores tokens in Redis
- **Trigger**: Manual or Daily
- **Features**:
  - JWT token generation
  - Redis caching with 7-day expiry
  - Auto-refresh logic
  - Error handling
- **Dependencies**: Redis
- **Status**: ✅ Production Ready

---

### 2. **candidate-import-index.json** - Candidate Import from Index Platform
- **Purpose**: Automated candidate import from Index Recruiting Platform
- **Trigger**: Every 2 hours
- **Features**:
  - Fetch new candidates from Index API
  - Data transformation to CRM format
  - Batch import (10 candidates/batch)
  - Duplicate detection
  - Google Sheets logging
- **Dependencies**: Index Platform API, Redis, Google Sheets
- **Status**: ✅ Production Ready
- **Import Rate**: ~120 candidates/hour

---

### 3. **apollo-enrichment.json** - Contact Data Enrichment
- **Purpose**: Enriches contact data using Apollo.io API
- **Trigger**: Every 4 hours
- **Features**:
  - Finds contacts with missing phone numbers
  - Apollo.io lookup
  - Data extraction (phone, LinkedIn, Twitter)
  - CRM update
  - Credit usage tracking
- **Dependencies**: Apollo.io API, Redis, Google Sheets
- **Status**: ✅ Production Ready
- **API Cost**: 1 credit per enrichment

---

### 4. **auto-matching.json** - Automated Candidate Matching
- **Purpose**: Runs matching engine and sends notifications for high-score matches
- **Trigger**: Every 6 hours
- **Features**:
  - Fetches active projects
  - Runs matching engine
  - Filters high-score matches (≥70)
  - Email notifications to recruiters
  - Google Sheets logging
  - Health alerts
- **Dependencies**: Redis, Mailgun, Google Sheets
- **Status**: ✅ Production Ready
- **Email Frequency**: 4x daily for active projects

---

### 5. **email-notifications.json** - Event-Based Email Notifications
- **Purpose**: Webhook-triggered email notifications for CRM events
- **Trigger**: Webhook (on-demand)
- **Features**:
  - Event routing (submitted, interview, offer, hired)
  - Professional email templates
  - Personalized content
  - Mailgun integration
  - Immediate delivery
- **Dependencies**: Mailgun
- **Status**: ✅ Production Ready
- **Webhook URL**: `https://n8n.rsg-recruiting.de/webhook/crm-webhook`

**Supported Events:**
- `candidate_submitted` - Candidate submitted to project
- `interview_scheduled` - Interview scheduled
- `offer_sent` - Job offer sent
- `candidate_hired` - Candidate successfully hired

---

### 6. **kpi-dashboard-sync.json** - KPI Dashboard Synchronization
- **Purpose**: Daily KPI sync to Google Sheets for reporting and analytics
- **Trigger**: Daily at 8 AM
- **Features**:
  - Comprehensive KPI calculation
  - Historical data tracking
  - Health score monitoring
  - Alert emails for low health scores
  - Conversion rate metrics
  - Time-to-hire tracking
- **Dependencies**: Redis, Google Sheets, Mailgun
- **Status**: ✅ Production Ready
- **Metrics Tracked**: 25+ KPIs

**KPIs Included:**
- Project metrics (total, active, filled, fill rate)
- Candidate metrics (total, new this month/week)
- Submission metrics (status breakdown, conversion rates)
- Performance metrics (time-to-hire, hire rate)
- Health score (0-100)

---

### 7. **hubspot-migration.json** - HubSpot Contact Migration
- **Purpose**: One-time migration of contacts from HubSpot to CRM
- **Trigger**: Manual execution
- **Features**:
  - Bulk contact export from HubSpot
  - Data transformation and validation
  - Company creation (if applicable)
  - Batch processing (20 contacts/batch)
  - Duplicate handling
  - Migration report
  - Google Sheets logging
- **Dependencies**: HubSpot API, Redis, Google Sheets, Mailgun
- **Status**: ✅ Production Ready
- **Migration Speed**: ~1200 contacts/hour

⚠️ **Important**: This is a one-time operation. Do not activate; run manually.

---

## 🚀 Quick Start

### 1. Import All Workflows

```bash
# In n8n UI
1. Click "Workflows" → "Import from File"
2. Select all .json files from this directory
3. Import in this order:
   a. auth-crm.json (required first)
   b. All other workflows
```

### 2. Configure Credentials

Required credentials (set up in n8n UI):
- **Redis** - Token storage
- **Google Sheets OAuth2** - Dashboard and logging
- **Mailgun API** - Email notifications
- **Apollo.io API** (optional) - Contact enrichment
- **HubSpot OAuth2** (optional) - Migration only

### 3. Set Environment Variables

```bash
# Copy template
cp ../.env.n8n.example .env

# Edit with your values
nano .env
```

**Required variables:**
```bash
CRM_API_URL=https://crm.rsg-recruiting.de
CRM_USER_EMAIL=admin@rsg-recruiting.de
CRM_USER_PASSWORD=your-password
CRM_TEAM_ID=your-team-id
MAILGUN_FROM_EMAIL=crm@rsg-recruiting.de
NOTIFICATION_EMAIL=team@rsg-recruiting.de
GOOGLE_SHEET_ID=your-sheet-id
```

### 4. Activate Workflows

1. **auth-crm.json**: Run manually first to authenticate
2. **candidate-import-index.json**: Activate (auto-runs every 2h)
3. **apollo-enrichment.json**: Activate (auto-runs every 4h)
4. **auto-matching.json**: Activate (auto-runs every 6h)
5. **email-notifications.json**: Activate (webhook-triggered)
6. **kpi-dashboard-sync.json**: Activate (runs daily at 8 AM)
7. **hubspot-migration.json**: Run manually when needed

---

## 📊 Monitoring & Logging

All workflows log to Google Sheets:

| Sheet Name | Workflow | Logs |
|------------|----------|------|
| `ImportLog` | Candidate Import | Timestamp, Total, Imported, Failed, Success Rate |
| `EnrichmentLog` | Apollo Enrichment | Timestamp, Total, Enriched, Credits Used |
| `MatchingLog` | Auto-Matching | Timestamp, Project, Matches, Avg Score |
| `MigrationLog` | HubSpot Migration | Timestamp, Type, Total, Migrated, Duration |
| `KPI_Dashboard` | KPI Sync | Current KPIs (updated daily) |
| `Historical_Data` | KPI Sync | Daily historical KPIs |

---

## 🔧 Customization

### Adjust Schedules

Edit schedule trigger nodes:

```javascript
// Every 2 hours → Every 1 hour
"hoursInterval": 1

// Daily at 8 AM → Daily at 6 AM
"cronExpression": "0 6 * * *"
```

### Adjust Batch Sizes

In HTTP Request nodes:

```javascript
options: {
  batching: {
    batch: {
      batchSize: 20,      // Increase for faster processing
      batchInterval: 1000  // Decrease for faster processing
    }
  }
}
```

### Adjust Match Score Threshold

In auto-matching workflow:

```javascript
// "Filter: High Score Matches" node
value2: 70  // Change to 80 for higher quality matches
```

### Custom Email Templates

In email-notifications workflow, edit template nodes:

```javascript
const emailBody = `
  <h2>Your Custom Title</h2>
  <p>Your custom content...</p>
`;
```

---

## 🐛 Troubleshooting

### Workflow Fails with "Token Not Found"

**Solution**: Run `auth-crm.json` workflow first.

```bash
1. Open auth-crm.json
2. Click "Execute Workflow"
3. Verify success message
4. Check Redis: redis-cli → GET crm_access_token
```

### Google Sheets "Permission Denied"

**Solution**: Share sheet with service account.

```bash
1. Open Google Sheet
2. Click "Share"
3. Add service account email (or OAuth email)
4. Set permission: "Editor"
```

### Mailgun Emails Not Sending

**Solution**: Verify Mailgun domain.

```bash
1. Go to https://app.mailgun.com/
2. Sending → Domains
3. Check verification status
4. Add DNS records if needed
```

### High API Usage (Apollo.io)

**Solution**: Reduce enrichment frequency.

```bash
1. Open apollo-enrichment.json
2. Change schedule: Every 4h → Every 8h
3. Or disable workflow temporarily
```

---

## 📈 Performance Metrics

| Workflow | Execution Time | API Calls | Resource Usage |
|----------|---------------|-----------|----------------|
| Auth | ~2s | 1 | Low |
| Candidate Import | ~5-30s | 10-100 | Medium |
| Apollo Enrichment | ~10-60s | 5-50 | Medium |
| Auto-Matching | ~10-120s | 20-200 | High |
| Email Notifications | ~1-3s | 1 | Low |
| KPI Dashboard | ~15-45s | 3 | Medium |
| HubSpot Migration | ~5-60min | 100-10,000 | High |

---

## 🔒 Security Best Practices

1. **Store secrets in environment variables**, not in workflow code
2. **Use Redis for token caching**, not workflow variables
3. **Enable n8n Basic Auth** or OAuth for UI access
4. **Use HTTPS** for all webhook URLs
5. **Rotate API keys** regularly
6. **Monitor execution logs** for suspicious activity
7. **Limit webhook access** with IP whitelist (optional)

---

## 🎓 Learning Resources

### n8n Documentation
- Official Docs: https://docs.n8n.io
- Workflow Library: https://n8n.io/workflows
- Community Forum: https://community.n8n.io

### Video Tutorials
- n8n Basics: https://www.youtube.com/n8n
- Workflow Best Practices
- Error Handling Patterns

### CRM API Documentation
- Swagger UI: https://crm.rsg-recruiting.de/api/docs
- Main README: ../README.md
- Integration Guide: ../N8N_INTEGRATION.md

---

## 📞 Support

**For workflow issues:**
- Check execution logs in n8n UI
- Review Google Sheets logs
- See troubleshooting section above

**For CRM API issues:**
- Check `/api/docs` for endpoint documentation
- Verify authentication token
- Check team_id permissions

**For n8n platform issues:**
- n8n Community: https://community.n8n.io
- GitHub Issues: https://github.com/n8n-io/n8n/issues

---

## 📝 Changelog

### Version 1.0.0 (December 2025)
- ✅ Initial release with 7 production workflows
- ✅ Full CRM API integration
- ✅ Google Sheets logging
- ✅ Mailgun email notifications
- ✅ Apollo.io enrichment
- ✅ HubSpot migration support

---

## 🎉 Success Checklist

Before going live:

- [ ] All 7 workflows imported
- [ ] Credentials configured (Redis, Google Sheets, Mailgun)
- [ ] Environment variables set
- [ ] Auth workflow executed successfully
- [ ] Test data created in CRM (1 project, 3 candidates)
- [ ] Test email received from notifications workflow
- [ ] Google Sheets populated with test data
- [ ] Monitoring confirmed in Google Sheets logs
- [ ] All active workflows enabled
- [ ] Backup strategy in place

**You're ready to automate recruitment! 🚀**

---

**Created:** December 2025
**Version:** 1.0.0
**Compatibility:** n8n v1.x+, CRM Backend v1.0.0+
**Maintainer:** RSG Recruiting Team
