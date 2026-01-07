# 🔄 n8n Integration Guide - CRM/ATS Automation

Complete guide for integrating your CRM/ATS with n8n workflow automation platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [n8n Setup](#n8n-setup)
4. [Import Workflows](#import-workflows)
5. [Configure Credentials](#configure-credentials)
6. [Workflow Configuration](#workflow-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## 🎯 Overview

This integration package includes **7 production-ready n8n workflows**:

1. **CRM Authentication** - Token management with Redis caching
2. **Candidate Import** - Automated import from Index Platform every 2 hours
3. **Apollo Enrichment** - Contact data enrichment every 4 hours
4. **Auto-Matching** - Intelligent candidate matching every 6 hours
5. **Email Notifications** - Event-based notifications via Mailgun
6. **KPI Dashboard** - Daily Google Sheets sync at 8 AM
7. **HubSpot Migration** - One-time migration from HubSpot

### Key Features

- ✅ **Production-Ready**: All workflows tested and optimized
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Batch Processing**: Efficient API rate limit management
- ✅ **Monitoring**: Google Sheets logging for all workflows
- ✅ **Notifications**: Email alerts for important events
- ✅ **Scalable**: Designed to handle thousands of records

---

## 🔧 Prerequisites

### 1. n8n Installation

You mentioned you already have n8n running on your Hostinger VPS. If not:

```bash
# Via Docker (recommended)
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -e N8N_HOST=n8n.rsg-recruiting.de \
  -e N8N_PROTOCOL=https \
  --restart unless-stopped \
  n8nio/n8n:latest

# Or via npm
npm install n8n -g
n8n start
```

### 2. Required Services

- ✅ **CRM Backend**: https://crm.rsg-recruiting.de (deployed)
- ✅ **Redis**: For token caching (can use Docker)
- ⚠️ **Mailgun**: Email service account
- ⚠️ **Google Sheets API**: OAuth2 credentials
- ⚠️ **Apollo.io**: API key (optional, for enrichment)
- ⚠️ **HubSpot**: API key (optional, for migration)
- ⚠️ **Index Platform**: API key (if using)

### 3. Redis Setup (if not installed)

```bash
# Via Docker
docker run -d --name redis \
  -p 6379:6379 \
  -v redis_data:/data \
  --restart unless-stopped \
  redis:7-alpine redis-server --requirepass your-redis-password

# Verify
docker exec -it redis redis-cli
> AUTH your-redis-password
> PING
PONG
```

---

## 🚀 n8n Setup

### 1. Access n8n Interface

Open: `https://n8n.rsg-recruiting.de` (or your n8n URL)

Login with your credentials.

### 2. Configure Base Settings

1. Go to **Settings** (gear icon, bottom left)
2. Update these settings:

```
Timezone: Europe/Berlin
Execution timeout: 600 seconds
Max payload size: 16 MB
Save execution data: All executions
```

### 3. Enable Webhooks

Go to **Settings** > **Endpoints**:
- Webhook URL: `https://n8n.rsg-recruiting.de/webhook`
- Production: `https://n8n.rsg-recruiting.de/webhook/WEBHOOK_ID`

---

## 📥 Import Workflows

### Method 1: Via n8n UI (Recommended)

1. In n8n, click **"Workflows"** (top left)
2. Click **"Import from File"** button
3. Select workflow JSON files from `n8n-workflows/` folder
4. Import in this order:
   1. `auth-crm.json` (required first)
   2. `candidate-import-index.json`
   3. `apollo-enrichment.json`
   4. `auto-matching.json`
   5. `email-notifications.json`
   6. `kpi-dashboard-sync.json`
   7. `hubspot-migration.json`

### Method 2: Via n8n CLI

```bash
# Copy workflow files to n8n data directory
cp n8n-workflows/*.json /path/to/n8n/data/workflows/

# Restart n8n
docker restart n8n
# or
pm2 restart n8n
```

### Method 3: Via API

```bash
# For each workflow
curl -X POST https://n8n.rsg-recruiting.de/rest/workflows \
  -H "Content-Type: application/json" \
  -u admin:your-password \
  -d @n8n-workflows/auth-crm.json
```

---

## 🔐 Configure Credentials

After importing workflows, you need to configure credentials for each service.

### 1. CRM Backend (HTTP Basic Auth)

**Go to:** Credentials → Add Credential → HTTP Basic Auth

```
Name: CRM Backend API
Username: [leave empty]
Password: [leave empty]
```

Note: We'll use environment variables instead (see below).

### 2. Redis

**Go to:** Credentials → Add Credential → Redis

```
Name: Redis account
Host: localhost (or your Redis host)
Port: 6379
Password: your-redis-password
Database: 0
```

**Test Connection:** Click "Test" - should show "Connection successful"

### 3. Mailgun

**Go to:** Credentials → Add Credential → Mailgun

```
Name: Mailgun account
API Key: your-mailgun-api-key
Domain: mg.rsg-recruiting.de
```

**Get API Key:**
1. Go to https://app.mailgun.com/
2. Settings → API Keys
3. Copy Private API key

### 4. Google Sheets (OAuth2)

**Go to:** Credentials → Add Credential → Google Sheets OAuth2

```
Name: Google Sheets account
```

**Setup:**
1. Click "Connect Google Account"
2. Follow OAuth flow
3. Grant permissions
4. Save

**Alternative - Service Account:**
1. Go to https://console.cloud.google.com/
2. Create Service Account
3. Download JSON key
4. Share your Google Sheet with service account email
5. In n8n, use "Service Account" auth type

### 5. Apollo.io

**Go to:** Credentials → Add Credential → HTTP Header Auth

```
Name: Apollo API
Header Name: X-Api-Key
Header Value: your-apollo-api-key
```

**Get API Key:**
1. Go to https://app.apollo.io/
2. Settings → Integrations → API
3. Copy API key

### 6. HubSpot (OAuth2)

**Go to:** Credentials → Add Credential → HubSpot OAuth2

```
Name: HubSpot account
```

**Setup:**
1. Click "Connect HubSpot Account"
2. Follow OAuth flow
3. Select required scopes:
   - crm.objects.contacts.read
   - crm.objects.contacts.write
   - crm.objects.companies.read
4. Authorize
5. Save

---

## ⚙️ Workflow Configuration

### Environment Variables

Create `.env` file in your n8n directory:

```bash
# Copy template
cp .env.n8n.example .env

# Edit with your values
nano .env
```

**Required Variables:**

```bash
# CRM Configuration
CRM_API_URL=https://crm.rsg-recruiting.de
CRM_USER_EMAIL=admin@rsg-recruiting.de
CRM_USER_PASSWORD=your-crm-password
CRM_TEAM_ID=your-team-id

# Mailgun
MAILGUN_FROM_EMAIL=crm@rsg-recruiting.de
NOTIFICATION_EMAIL=team@rsg-recruiting.de

# Google Sheets
GOOGLE_SHEET_ID=1ABC...XYZ

# Other services (if using)
INDEX_API_URL=https://api.index-recruiting.com
APOLLO_API_KEY=your-key
```

**Load Environment Variables:**

```bash
# If using Docker
docker run -d --name n8n \
  --env-file .env \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest

# Or set in n8n UI
# Settings → Variables → Add Variable
```

### Get Your Team ID

Run this after first CRM login:

```bash
# Login to CRM
curl -X POST https://crm.rsg-recruiting.de/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rsg-recruiting.de",
    "password": "your-password"
  }'

# Response includes user data with team_memberships
# Extract team_id from response
```

Or use the `auth-crm.json` workflow to login and check Redis:

```bash
# After running auth workflow
redis-cli
> AUTH your-redis-password
> GET crm_access_token
> # Decode JWT to see user/team info
```

---

## 🔧 Individual Workflow Configuration

### 1. CRM Authentication Workflow

**Purpose:** Authenticates with CRM and stores tokens in Redis.

**Setup:**
1. Open workflow
2. Check "Login to CRM" node
3. Verify environment variables are set:
   - `CRM_API_URL`
   - `CRM_USER_EMAIL`
   - `CRM_USER_PASSWORD`
4. Click "Execute Workflow"
5. Verify success message

**Schedule:** Run manually or daily to refresh tokens.

**Token Expiry:** Access tokens expire in 7 days, workflow auto-refreshes.

---

### 2. Candidate Import from Index

**Purpose:** Imports new candidates from Index Platform every 2 hours.

**Setup:**
1. Configure Index API credentials
2. Update `INDEX_API_URL` in environment
3. Adjust schedule if needed (node: "Every 2 hours")
4. Set `CRM_TEAM_ID`

**Activate:**
1. Open workflow
2. Toggle "Active" switch (top right)
3. Workflow runs automatically

**Monitoring:**
- Check "ImportLog" sheet in Google Sheets
- View execution history in n8n

**Customization:**
```javascript
// In "Transform to CRM Format" node
// Adjust field mapping if needed
const mapped = candidates.map(c => ({
  team_id: $env.CRM_TEAM_ID,
  first_name: c.firstName || c.first_name, // Add your API fields
  // ... customize fields
}));
```

---

### 3. Apollo.io Contact Enrichment

**Purpose:** Enriches contacts with missing phone numbers using Apollo.io.

**Setup:**
1. Get Apollo.io API key
2. Add to environment: `APOLLO_API_KEY`
3. Configure "apolloApi" credential
4. Adjust schedule (default: every 4 hours)

**Activate:**
1. Open workflow
2. Toggle "Active"

**Cost Management:**
- Apollo.io has API credit limits
- Workflow batches requests (5 at a time, 2s delay)
- Monitor "EnrichmentLog" sheet for credit usage

**Disable if not needed:**
- Simply deactivate workflow
- Or comment out the schedule trigger

---

### 4. Auto-Matching Engine

**Purpose:** Runs matching engine every 6 hours, sends email alerts for high-score matches.

**Setup:**
1. Configure Mailgun credentials
2. Set `NOTIFICATION_EMAIL`
3. Adjust minimum score threshold (default: 70):
   ```javascript
   // In "Filter: High Score Matches" node
   value2: 70 // Change to your threshold
   ```

**Activate:**
1. Open workflow
2. Toggle "Active"

**Email Alerts:**
- Sends when matches have score ≥ 70
- Top 5 candidates per project
- Includes score, distance, and reasoning

**Customization:**
```javascript
// In "Prepare Email Notification" node
// Adjust email template
const emailBody = `
  <h2>🎯 Top Candidates Found!</h2>
  // Customize HTML here
`;
```

---

### 5. Email Notifications

**Purpose:** Webhook-based email notifications for CRM events.

**Setup:**
1. Open workflow
2. Copy webhook URL from "Webhook Trigger" node
3. Configure CRM backend to send webhooks (see below)
4. Activate workflow

**Webhook URL:**
```
https://n8n.rsg-recruiting.de/webhook/crm-webhook
```

**CRM Backend Integration:**

Add to your CRM backend (e.g., in submission service):

```typescript
// src/modules/submissions/submissions.service.ts

async updateStatus(id: string, status: SubmissionStatus) {
  const submission = await this.prisma.submission.update({
    where: { id },
    data: { status },
    include: { candidate: true, project: true }
  });

  // Send webhook to n8n
  await this.sendWebhookNotification({
    event_type: this.getEventType(status),
    recipient_email: process.env.NOTIFICATION_EMAIL,
    data: {
      submission_id: submission.id,
      project_title: submission.project.title,
      candidate_name: `${submission.candidate.first_name} ${submission.candidate.last_name}`,
      candidate_email: submission.candidate.email,
      // ... other data
    }
  });
}

private async sendWebhookNotification(payload: any) {
  try {
    await axios.post(
      process.env.N8N_WEBHOOK_URL + '/crm-webhook',
      payload
    );
  } catch (error) {
    console.error('Webhook notification failed:', error);
  }
}

private getEventType(status: SubmissionStatus): string {
  const eventMap = {
    SUBMITTED: 'candidate_submitted',
    INTERVIEW: 'interview_scheduled',
    OFFER: 'offer_sent',
    HIRED: 'candidate_hired'
  };
  return eventMap[status] || 'status_changed';
}
```

**Supported Events:**
- `candidate_submitted` - Candidate submitted to project
- `interview_scheduled` - Interview scheduled
- `offer_sent` - Offer sent to candidate
- `candidate_hired` - Candidate hired

**Test Webhook:**

```bash
curl -X POST https://n8n.rsg-recruiting.de/webhook/crm-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "candidate_submitted",
    "recipient_email": "test@rsg-recruiting.de",
    "data": {
      "project_title": "Senior Backend Engineer",
      "candidate_name": "John Doe",
      "candidate_email": "john@example.com",
      "match_score": 85,
      "submitted_by": "Recruiter Name"
    }
  }'
```

---

### 6. KPI Dashboard Sync

**Purpose:** Syncs CRM metrics to Google Sheets daily at 8 AM.

**Setup:**

1. **Create Google Sheet:**
   - Create new Google Sheet named "CRM KPI Dashboard"
   - Create these sheets (tabs):
     - `KPI_Dashboard` - Current KPIs
     - `Historical_Data` - Daily historical data
     - `ImportLog` - Candidate import log
     - `EnrichmentLog` - Apollo enrichment log
     - `MatchingLog` - Auto-matching log
     - `MigrationLog` - HubSpot migration log

2. **KPI_Dashboard Sheet Headers (Row 1):**
   ```
   Date | Total Projects | Active Projects | Filled Projects | Fill Rate |
   Total Candidates | New Candidates (Month) | New Candidates (Week) |
   Total Submissions | Submissions (Month) | Submissions (Week) |
   Identified | Qualified | Submitted | Interview | Offer | Hired | Rejected |
   Submission to Interview | Interview to Offer | Offer to Hire | Overall Hire Rate |
   Avg Time to Hire (Days) | Health Score
   ```

3. **Share Sheet:**
   - Click "Share" button
   - Add your Google Service Account email
   - Or use OAuth2 (already configured)

4. **Copy Sheet ID:**
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit
   ```
   Add to environment: `GOOGLE_SHEET_ID=your-sheet-id`

5. **Activate Workflow:**
   - Open workflow
   - Toggle "Active"
   - Runs daily at 8 AM

**Health Score:**
- Calculated from: active projects, new candidates, submissions, hire rate
- Score < 50 triggers alert email
- Adjust formula in "Calculate KPIs" node if needed

---

### 7. HubSpot Migration

**Purpose:** One-time migration of contacts from HubSpot to CRM.

**Setup:**
1. Configure HubSpot OAuth2 credentials
2. Set `CRM_TEAM_ID`
3. Review mapping in "Transform" node
4. **DO NOT activate** - run manually only

**Run Migration:**
1. Open workflow
2. Click "Execute Workflow"
3. Monitor progress in execution log
4. Check migration summary in Google Sheets

**Important:**
- This is a **one-time** operation
- Duplicates are skipped (409 status)
- Can take several minutes for large datasets
- Creates both Contacts and Companies
- Batch size: 20 contacts/minute (respects API limits)

**Rollback:**
If needed, delete imported contacts:
```sql
-- In CRM database
DELETE FROM contacts WHERE notes LIKE '%Migrated from HubSpot%';
DELETE FROM companies WHERE description LIKE '%Migrated from HubSpot%';
```

---

## 🧪 Testing

### Test Individual Workflows

**1. Test CRM Authentication:**
```bash
# In n8n UI
1. Open "CRM Authentication" workflow
2. Click "Execute Workflow"
3. Check for success message
4. Verify token in Redis:
   redis-cli
   > GET crm_access_token
```

**2. Test Candidate Import:**
```bash
# Temporarily change schedule to manual trigger
# Or use "Execute Workflow" button
# Check:
- Candidates created in CRM
- Log entry in Google Sheets "ImportLog"
- No errors in execution log
```

**3. Test Email Notifications:**
```bash
# Send test webhook
curl -X POST https://n8n.rsg-recruiting.de/webhook/crm-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "candidate_submitted",
    "recipient_email": "your-test-email@example.com",
    "data": {
      "project_title": "Test Project",
      "candidate_name": "Test Candidate",
      "candidate_email": "test@example.com",
      "match_score": 95,
      "submitted_by": "Test Recruiter"
    }
  }'

# Check your inbox
```

**4. Test Matching Engine:**
```bash
# Ensure you have:
- At least 1 active project
- At least 3 candidates with skills

# Run workflow manually
# Check:
- Email notification received
- Matches logged to Google Sheets
- Scores calculated correctly
```

**5. Test KPI Dashboard:**
```bash
# Run workflow manually
# Check Google Sheets:
- KPI_Dashboard updated (row 2)
- Historical_Data new row added
- All metrics populated
```

### Test with Sample Data

```bash
# Create test project
curl -X POST https://crm.rsg-recruiting.de/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "team_id": "YOUR_TEAM_ID",
    "title": "Test Backend Developer",
    "status": "ACTIVE",
    "work_model": "HYBRID",
    "plz": "10115",
    "radius_km": 30,
    "must_have_skills": ["Node.js", "TypeScript"],
    "nice_to_have_skills": ["NestJS"],
    "required_languages": ["German", "English"]
  }'

# Create test candidate
curl -X POST https://crm.rsg-recruiting.de/api/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "team_id": "YOUR_TEAM_ID",
    "first_name": "Test",
    "last_name": "Candidate",
    "email": "test@example.com",
    "plz": "10117",
    "skills": ["Node.js", "TypeScript", "NestJS"],
    "seniority": "SENIOR",
    "languages": ["German", "English"]
  }'

# Now run matching workflow
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "CRM Token Not Found" Error

**Symptom:** Workflows fail with Redis key not found.

**Solution:**
```bash
# Run auth workflow first
1. Open "CRM Authentication" workflow
2. Click "Execute Workflow"
3. Verify success

# Check Redis
redis-cli
> AUTH your-password
> GET crm_access_token
> # Should return JWT token

# If empty, check CRM credentials in .env
```

#### 2. "401 Unauthorized" from CRM

**Symptom:** HTTP 401 errors in workflow execution.

**Solution:**
```bash
# Token expired, refresh:
1. Run auth workflow again
2. Check token expiry (default: 7 days)
3. Consider scheduling auth workflow daily

# Or check credentials:
echo $CRM_USER_EMAIL
echo $CRM_USER_PASSWORD
```

#### 3. Google Sheets "Access Denied"

**Symptom:** Cannot write to Google Sheets.

**Solution:**
```bash
# Check sharing:
1. Open Google Sheet
2. Click "Share"
3. Add service account email or OAuth user
4. Set permission: "Editor"

# Re-authenticate OAuth:
1. Credentials → Google Sheets OAuth2
2. Delete credential
3. Re-add and authorize
```

#### 4. Mailgun "Domain Not Verified"

**Symptom:** Emails not sending.

**Solution:**
```bash
# Verify domain in Mailgun:
1. Go to https://app.mailgun.com/
2. Sending → Domains
3. Check verification status
4. Add DNS records if needed:
   - TXT record for SPF
   - TXT record for DKIM
   - MX records

# Test sending:
curl -s --user 'api:YOUR_API_KEY' \
  https://api.mailgun.net/v3/mg.rsg-recruiting.de/messages \
  -F from='CRM <crm@mg.rsg-recruiting.de>' \
  -F to='test@example.com' \
  -F subject='Test' \
  -F text='Test message'
```

#### 5. Workflow Execution Timeout

**Symptom:** "Execution timed out" errors.

**Solution:**
```bash
# Increase timeout:
1. Settings → Execution settings
2. Set "Execution timeout": 600 seconds
3. For large migrations, increase to 3600

# Or split into smaller batches:
# In workflow code, adjust batch sizes
```

#### 6. High Memory Usage

**Symptom:** n8n crashes or slows down.

**Solution:**
```bash
# Check execution history:
1. Settings → Execution settings
2. Set "Save execution data": "On error only"
3. Or limit: "Save last 100 executions"

# Clear old executions:
# Settings → Executions → Clear All

# Increase Docker memory:
docker update --memory 2g n8n
```

### Debug Mode

Enable verbose logging:

```bash
# In .env
N8N_LOG_LEVEL=debug
N8N_LOG_OUTPUT=console,file

# Restart n8n
docker restart n8n

# View logs
docker logs -f n8n
```

### Test API Endpoints

```bash
# Test CRM health
curl https://crm.rsg-recruiting.de/health

# Test webhook
curl -X POST https://n8n.rsg-recruiting.de/webhook-test/crm-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check Redis connection
docker exec -it redis redis-cli
> AUTH your-password
> PING
```

---

## 🚀 Advanced Configuration

### Custom Schedules

Edit cron expressions in schedule trigger nodes:

```javascript
// Every 2 hours
0 */2 * * *

// Every 6 hours (at 0, 6, 12, 18)
0 0,6,12,18 * * *

// Daily at 8 AM
0 8 * * *

// Monday to Friday at 9 AM
0 9 * * 1-5

// Every 15 minutes
*/15 * * * *
```

### Rate Limiting

Adjust batch processing:

```javascript
// In HTTP Request nodes
options: {
  batching: {
    batch: {
      batchSize: 10,      // Requests per batch
      batchInterval: 1000  // Milliseconds between batches
    }
  }
}
```

### Error Notifications

Add error handling to workflows:

```javascript
// Add "On Error" workflow trigger
// Send Slack/Email on failure

// In Mailgun node
if ($execution.mode === 'error') {
  return {
    subject: '❌ Workflow Failed',
    text: `Workflow: ${$workflow.name}\nError: ${$execution.error}`
  };
}
```

### Monitoring Dashboard

Create monitoring workflow:

```javascript
// Schedule: Every hour
// Check:
- Workflow execution status
- API response times
- Error rates
- Token expiry

// Send weekly report
```

### Backup Workflows

```bash
# Export all workflows
curl https://n8n.rsg-recruiting.de/rest/workflows \
  -u admin:password \
  -o workflows-backup.json

# Schedule automatic backups
0 3 * * * /path/to/backup-n8n.sh
```

---

## 📊 Performance Optimization

### 1. Enable Execution Data Pruning

```bash
# In .env
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168  # Hours (7 days)
EXECUTIONS_DATA_PRUNE_TIMEOUT=3600
```

### 2. Use Binary Data Mode

```bash
# For file processing
N8N_DEFAULT_BINARY_DATA_MODE=filesystem
N8N_BINARY_DATA_TTL=1
```

### 3. Optimize Database Queries

In workflow code:

```javascript
// Bad: Multiple API calls
for (const candidate of candidates) {
  await fetch(`/api/candidates/${candidate.id}`);
}

// Good: Batch fetch
const ids = candidates.map(c => c.id).join(',');
const results = await fetch(`/api/candidates?ids=${ids}`);
```

### 4. Cache Results

Use Redis for caching:

```javascript
// Check cache first
const cached = await redis.get(`cache:${key}`);
if (cached) return cached;

// Fetch and cache
const data = await fetchData();
await redis.set(`cache:${key}`, data, 'EX', 3600);
```

---

## 🎓 Learning Resources

### n8n Documentation
- Official Docs: https://docs.n8n.io
- Workflow Examples: https://n8n.io/workflows
- Community Forum: https://community.n8n.io

### Video Tutorials
- n8n Crash Course: https://www.youtube.com/n8n
- Workflow Best Practices
- Error Handling Patterns

### Support
- GitHub Issues: https://github.com/n8n-io/n8n/issues
- Discord Community: https://discord.gg/n8n

---

## 📞 Support

For CRM-specific integration questions:
- Check workflow comments in n8n UI
- Review Google Sheets logs
- Check CRM API documentation at `/api/docs`

For n8n platform issues:
- n8n Community: https://community.n8n.io
- Documentation: https://docs.n8n.io

---

## 🎉 Success Checklist

Before going live:

- [ ] All workflows imported
- [ ] Credentials configured and tested
- [ ] Environment variables set
- [ ] Redis connected
- [ ] Google Sheets shared and populated
- [ ] Mailgun domain verified
- [ ] Test webhooks working
- [ ] Auth workflow runs successfully
- [ ] At least one full workflow execution completed
- [ ] Monitoring/logging confirmed in Google Sheets
- [ ] Error notifications tested
- [ ] Backup strategy in place

**You're ready to automate! 🚀**

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Compatibility:** n8n v1.x, CRM Backend v1.0.0
