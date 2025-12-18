# Recruitment CRM/ATS Backend

Production-ready CRM/ATS Backend for Headhunters and Recruitment Agencies in Germany. Built with Node.js, TypeScript, NestJS, PostgreSQL, and Prisma ORM.

## Features

### Core Functionality

- **Multi-User CRM System**: Team-based isolation with role-based access control (ADMIN, MANAGER, RECRUITER, VIEWER)
- **Recruitment Projects**: Manage search projects with detailed requirements
- **Candidate Pipeline**: Track candidates through the recruitment funnel
- **Intelligent Matching Engine**: Score-based candidate matching with distance calculation
- **PLZ Distance Filter**: Haversine-based distance calculation for German postal codes
- **CV Parsing Pipeline**: Stub implementation for extracting skills and information from CVs
- **CSV Import**: Bulk import candidates from CSV files
- **Activity Tracking**: Log all interactions (calls, emails, meetings, notes)
- **Audit Logging**: Automatic tracking of all data changes
- **GDPR Compliance**: Consent record management

### Technical Features

- JWT-based authentication with refresh tokens
- Team-based data isolation
- Role-based access control (RBAC)
- RESTful API with OpenAPI/Swagger documentation
- Comprehensive test coverage (unit + e2e)
- Docker Compose for local development
- Production-ready error handling and validation

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5
- **Authentication**: JWT (passport-jwt)
- **Validation**: Zod + class-validator
- **Testing**: Vitest
- **Documentation**: Swagger/OpenAPI
- **DevOps**: Docker Compose

## Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- PostgreSQL (via Docker or local)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd recruitment-crm-ats

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env and configure your database and JWT secrets
# Default values work for local development
```

### 3. Start Database

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Wait for database to be ready (5-10 seconds)
```

### 4. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with demo data
npm run prisma:seed
```

### 5. Start Application

```bash
# Development mode with hot reload
npm run start:dev

# The API will be available at http://localhost:3000/api
# Swagger docs at http://localhost:3000/api/docs
```

## Demo Users

After running the seed script, you can use these test accounts:

| Email                      | Password    | Role      |
|----------------------------|-------------|-----------|
| admin@example.com          | password123 | ADMIN     |
| manager@example.com        | password123 | MANAGER   |
| recruiter1@example.com     | password123 | RECRUITER |
| recruiter2@example.com     | password123 | RECRUITER |
| viewer@example.com         | password123 | VIEWER    |

## API Documentation

### Authentication

```bash
# Register new user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

# Refresh token
POST /api/auth/refresh
{
  "refresh_token": "your_refresh_token"
}
```

### Core Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

#### Companies

- `GET /api/companies?team_id=<teamId>` - List all companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id?team_id=<teamId>` - Get company
- `PATCH /api/companies/:id?team_id=<teamId>` - Update company
- `DELETE /api/companies/:id?team_id=<teamId>` - Delete company

#### Contacts

- `GET /api/contacts?team_id=<teamId>` - List all contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id?team_id=<teamId>` - Get contact
- `PATCH /api/contacts/:id?team_id=<teamId>` - Update contact
- `DELETE /api/contacts/:id?team_id=<teamId>` - Delete contact

#### Projects

- `GET /api/projects?team_id=<teamId>` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id?team_id=<teamId>` - Get project
- `PATCH /api/projects/:id?team_id=<teamId>` - Update project
- `DELETE /api/projects/:id?team_id=<teamId>` - Delete project

#### Candidates

- `GET /api/candidates?team_id=<teamId>` - List all candidates
- `POST /api/candidates` - Create candidate
- `GET /api/candidates/:id?team_id=<teamId>` - Get candidate
- `PATCH /api/candidates/:id?team_id=<teamId>` - Update candidate
- `DELETE /api/candidates/:id?team_id=<teamId>` - Delete candidate
- `POST /api/candidates/:id/cv/parse?team_id=<teamId>` - Parse CV (stub)
- `POST /api/candidates/import/csv?team_id=<teamId>` - Import from CSV

#### Submissions

- `GET /api/submissions?team_id=<teamId>` - List all submissions
- `POST /api/submissions` - Create submission
- `GET /api/submissions/:id?team_id=<teamId>` - Get submission
- `PATCH /api/submissions/:id?team_id=<teamId>` - Update submission
- `DELETE /api/submissions/:id?team_id=<teamId>` - Delete submission

#### Activities

- `GET /api/activities?team_id=<teamId>` - List all activities
- `POST /api/activities` - Create activity
- `GET /api/activities/:id?team_id=<teamId>` - Get activity
- `PATCH /api/activities/:id?team_id=<teamId>` - Update activity
- `DELETE /api/activities/:id?team_id=<teamId>` - Delete activity

#### Matching Engine

```bash
# Get top matching candidates for a project
GET /api/projects/:id/matches?team_id=<teamId>&limit=10

# Response example:
[
  {
    "candidate_id": "clx...",
    "candidate_name": "Max Mustermann",
    "candidate_email": "max@example.com",
    "score": 85,
    "distance_km": 12.5,
    "short_reason": "6/6 Must-Skills, 12km, Salary✓",
    "hard_filters_passed": true
  }
]
```

### Matching Engine Logic

The matching engine scores candidates from 0-100 based on:

- **Must-have Skills** (0-50 points): Percentage of required skills matched
- **Nice-to-have Skills** (0-20 points): Bonus points for optional skills
- **Seniority Match** (0-10 points): How well candidate level matches requirement
- **Salary Fit** (0-10 points): Salary expectation vs. project budget
- **Distance** (0-10 points): Geographic proximity for onsite/hybrid roles

**Hard Filters** (must pass or candidate excluded):
- Work model + radius (if onsite/hybrid)
- Minimum 50% must-have skills coverage
- Required languages

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Database Management

```bash
# Open Prisma Studio (visual database browser)
npm run prisma:studio

# Create a new migration
npm run prisma:migrate -- --name your_migration_name

# Reset database (WARNING: deletes all data)
npm run db:reset

# Re-seed database
npm run prisma:seed
```

## Project Structure

```
recruitment-crm-ats/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data script
├── src/
│   ├── common/                # Shared utilities
│   │   ├── decorators/        # Custom decorators
│   │   ├── guards/            # Auth and RBAC guards
│   │   └── interceptors/      # Audit log interceptor
│   ├── modules/
│   │   ├── auth/              # Authentication
│   │   ├── prisma/            # Database service
│   │   ├── plz/               # PLZ distance calculation
│   │   ├── matching/          # Matching engine
│   │   ├── companies/         # Company CRUD
│   │   ├── contacts/          # Contact CRUD
│   │   ├── projects/          # Project CRUD
│   │   ├── candidates/        # Candidate CRUD + CV parsing
│   │   ├── submissions/       # Submission CRUD
│   │   └── activities/        # Activity CRUD
│   ├── main.ts                # Application entry point
│   └── app.module.ts          # Root module
├── test/                      # E2E tests
├── docker-compose.yml         # PostgreSQL container
└── package.json
```

## Environment Variables

| Variable              | Description                    | Default                        |
|-----------------------|--------------------------------|--------------------------------|
| DATABASE_URL          | PostgreSQL connection string   | postgresql://ats_user:...      |
| JWT_SECRET            | JWT signing secret             | change-me-in-production        |
| JWT_EXPIRES_IN        | Access token expiration        | 7d                             |
| JWT_REFRESH_SECRET    | Refresh token signing secret   | change-me-in-production        |
| JWT_REFRESH_EXPIRES_IN| Refresh token expiration       | 30d                            |
| NODE_ENV              | Environment                    | development                    |
| PORT                  | Server port                    | 3000                           |
| CORS_ORIGINS          | Allowed CORS origins           | http://localhost:3000,...      |

## Production Deployment

### Security Checklist

- [ ] Change all JWT secrets to long random strings (min 32 characters)
- [ ] Use strong database passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for your frontend domain only
- [ ] Set up rate limiting
- [ ] Enable database connection pooling
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] Review and update dependencies regularly

### Database Migration

```bash
# Run migrations in production
npm run prisma:migrate:deploy

# Do NOT run prisma:migrate or prisma:seed in production
```

## Architecture Decisions

### Team-Based Isolation

All data is scoped to teams. Users can be members of multiple teams with different roles. Every entity (companies, contacts, projects, candidates, etc.) belongs to a team.

### Role-Based Access Control

- **ADMIN**: Full access to everything including team management
- **MANAGER**: Full access except team settings
- **RECRUITER**: CRUD operations on operational entities
- **VIEWER**: Read-only access

### Audit Logging

All CREATE, UPDATE, DELETE operations are automatically logged with before/after snapshots for compliance and debugging.

### Matching Engine

The matching engine is deterministic and fully testable. It can be easily extended with:
- Machine learning scoring
- LLM-based skill matching
- Advanced NLP for CV parsing
- Historical success rate weighting

### PLZ Distance Calculation

Uses Haversine formula for accurate distance calculation. The `plz_geodata` table contains coordinates for German postal codes. Missing PLZs return `null` distance without breaking matches.

## CSV Import Format

```csv
first_name,last_name,email,phone,plz,skills,seniority,languages,salary_expectation,availability_date,notes
Max,Mustermann,max@example.com,+49170123456,10115,"Node.js,TypeScript,React",SENIOR,"Deutsch,Englisch",75000,2024-03-01,Great candidate
```

## Extending the System

### Adding a New Entity

1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate -- --name add_entity_name`
3. Create module: `src/modules/entity-name/`
4. Add DTOs, service, controller following existing patterns
5. Register in `app.module.ts`
6. Add tests

### Integrating Real CV Parser

Replace the stub in `candidates.service.ts` `extractDataFromCV()` with:
- LLM API (OpenAI, Anthropic)
- OCR + NLP pipeline
- Specialized CV parsing service

### Adding Real-time Updates

Consider adding:
- WebSocket gateway for live updates
- Server-Sent Events for notifications
- Redis for pub/sub

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma Issues

```bash
# Regenerate Prisma Client
npm run prisma:generate

# Format schema
npx prisma format
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=3001
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
