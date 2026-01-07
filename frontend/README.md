# Recruitment CRM Frontend

Modern Next.js 14 frontend for the Recruitment CRM/ATS system.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript for type safety
- ✅ TailwindCSS + Shadcn/ui for modern UI
- ✅ React Query for API state management
- ✅ Zustand for client state
- ✅ JWT Authentication with auto-refresh
- ✅ Dashboard with KPIs
- ✅ Candidates Management
- ✅ Companies & Contacts Management
- ✅ Projects Management
- ✅ AI-powered Matching Engine UI
- ✅ Responsive Design
- ✅ Production-ready Docker deployment

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3
- **UI Components**: Shadcn/ui + Radix UI
- **State Management**: Zustand + React Query
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://recruiting-sg.com/api
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Build Image

```bash
docker build -t crm-frontend .
```

### Run with Docker Compose (Traefik)

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

### Deploy to recruiting-sg.com

```bash
# On VPS
cd /root/recruitment-crm-deploy/frontend
git pull origin claude/crm-recruiting-backend-kRGn2
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d
```

## Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── dashboard/       # Dashboard page
│   │   ├── candidates/      # Candidates management
│   │   ├── companies/       # Companies management
│   │   ├── projects/        # Projects management
│   │   ├── matching/        # Matching engine UI
│   │   └── layout.tsx       # Dashboard layout with sidebar
│   ├── login/               # Login page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home (redirects to dashboard)
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── table.tsx
│   └── providers.tsx        # React Query provider
├── lib/
│   ├── hooks/
│   │   └── use-api.ts       # React Query API hooks
│   ├── api-client.ts        # Axios client with interceptors
│   ├── auth-store.ts        # Zustand auth store
│   └── utils.ts             # Utility functions
├── types/
│   └── index.ts             # TypeScript types
├── Dockerfile               # Production Docker image
├── docker-compose.traefik.yml  # Traefik deployment
├── next.config.js           # Next.js configuration
├── tailwind.config.ts       # TailwindCSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies

```

## Features Overview

### Authentication

- JWT-based auth with automatic token refresh
- Secure localStorage token storage
- Protected routes with auth guard
- Auto-redirect to login if unauthorized

### Dashboard

- KPI cards (Projects, Candidates, Submissions, Success Rate)
- Recent activities feed
- Quick action cards
- Real-time data with React Query

### Candidates Management

- List view with search and filters
- Display skills, seniority, location
- Email and phone contact info
- Delete functionality
- Responsive table layout

### Companies Management

- Company list with industry and location
- Website links
- Search functionality
- Delete functionality

### Projects Management

- Project list with status badges
- Skills overview
- Salary ranges
- Work model and location
- Company association

### Matching Engine

- Project selection dropdown
- Adjustable minimum score slider
- Sorted results by score
- Distance calculation
- Skills matching visualization
- Contact information
- Match reasoning

## API Integration

All API calls use React Query hooks from `lib/hooks/use-api.ts`:

- `useDashboard()` - Dashboard stats
- `useCandidates()` - List candidates
- `useCreateCandidate()` - Create candidate
- `useUpdateCandidate()` - Update candidate
- `useDeleteCandidate()` - Delete candidate
- `useCompanies()` - List companies
- `useProjects()` - List projects
- `useMatching()` - Run matching engine

## Deployment

### Production URL

**Frontend**: https://recruiting-sg.com
**API**: https://recruiting-sg.com/api
**Docs**: https://recruiting-sg.com/api/docs

### Traefik Configuration

The frontend is configured for Traefik with:
- Automatic SSL via Let's Encrypt
- HTTPS redirect
- Security headers (HSTS, X-Frame-Options)
- Health checks
- Resource limits (512M)

### Environment

- `NEXT_PUBLIC_API_URL`: Backend API URL

### Demo Login

```
Email: admin@example.com
Password: password123
```

## Scripts

```bash
# Development
npm run dev          # Start dev server

# Build
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
```

## Performance

- Next.js 14 with React Server Components
- Standalone output for optimized Docker images
- Image optimization with Next.js Image
- Code splitting and lazy loading
- React Query caching (1 minute stale time)

## Security

- JWT tokens with HTTP-only recommendations
- HTTPS enforced via Traefik
- Security headers (CSP, HSTS, X-Frame-Options)
- Non-root Docker container
- Environment variable validation

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## License

Proprietary - All rights reserved

---

**Built with ❤️ for recruiting excellence**
