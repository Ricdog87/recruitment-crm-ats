#!/bin/bash

###############################################################################
# PRODUCTION DEPLOYMENT SCRIPT
# Deployes Backend + Frontend auf recruiting-sg.com
###############################################################################

set -e  # Exit on error

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       Recruitment CRM - Production Deployment           ║"
echo "║              recruiting-sg.com                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running on VPS
if [ ! -f "/opt/recruitment-crm-ats/.vps-marker" ]; then
  echo -e "${YELLOW}⚠️  Warnung: Scheint nicht auf dem VPS zu laufen${NC}"
  read -p "Trotzdem fortfahren? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

###############################################################################
# 1. GIT PULL
###############################################################################

echo -e "\n${BLUE}[1/7] Git Pull...${NC}"
if [ -d ".git" ]; then
  echo "Hole neuesten Code..."
  git fetch origin
  git pull origin claude/crm-recruiting-backend-kRGn2
  echo -e "${GREEN}✓ Code aktualisiert${NC}"
else
  echo -e "${YELLOW}⚠️  Kein Git-Repository gefunden, überspringe Git Pull${NC}"
fi

###############################################################################
# 2. BACKEND DEPENDENCIES
###############################################################################

echo -e "\n${BLUE}[2/7] Backend Dependencies installieren...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installiert${NC}"

###############################################################################
# 3. PRISMA
###############################################################################

echo -e "\n${BLUE}[3/7] Prisma Setup...${NC}"
npm run prisma:generate
echo -e "${GREEN}✓ Prisma Client generiert${NC}"

echo "Führe Datenbank-Migration aus..."
npm run prisma:migrate:deploy
echo -e "${GREEN}✓ Migration abgeschlossen${NC}"

###############################################################################
# 4. BUILD BACKEND
###############################################################################

echo -e "\n${BLUE}[4/7] Backend Build...${NC}"
npm run build
echo -e "${GREEN}✓ Backend gebaut${NC}"

###############################################################################
# 5. CHECK ENVIRONMENT
###############################################################################

echo -e "\n${BLUE}[5/7] Umgebungsvariablen prüfen...${NC}"

ENV_FILE="deployment/docker/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗ Fehler: $ENV_FILE nicht gefunden!${NC}"
  echo "Bitte erstelle die .env-Datei mit den erforderlichen Variablen."
  exit 1
fi

# Check for required variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "REDIS_URL")
for VAR in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${VAR}=" "$ENV_FILE"; then
    echo -e "${RED}✗ Fehler: $VAR fehlt in .env${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ Umgebungsvariablen OK${NC}"

# Check for optional new variables
if ! grep -q "^OPENAI_API_KEY=" "$ENV_FILE"; then
  echo -e "${YELLOW}⚠️  OPENAI_API_KEY nicht gesetzt → CV-Parsing nutzt Keyword-Fallback${NC}"
fi

if ! grep -q "^AWS_S3_BUCKET=" "$ENV_FILE"; then
  echo -e "${YELLOW}⚠️  AWS_S3_BUCKET nicht gesetzt → Dokumente werden lokal gespeichert${NC}"
fi

###############################################################################
# 6. DEPLOY BACKEND
###############################################################################

echo -e "\n${BLUE}[6/7] Backend-Container deployen...${NC}"

cd deployment/docker

# Stop old containers
echo "Stoppe alte Container..."
docker-compose down

# Start new containers
echo "Starte neue Container..."
docker-compose up -d --build

# Wait for backend to be ready
echo "Warte auf Backend-Start..."
sleep 10

# Check if backend is running
if docker ps | grep -q "crm-ats-backend"; then
  echo -e "${GREEN}✓ Backend-Container läuft${NC}"
else
  echo -e "${RED}✗ Fehler: Backend-Container läuft nicht!${NC}"
  echo "Logs:"
  docker-compose logs backend
  exit 1
fi

cd ../..

###############################################################################
# 7. DEPLOY FRONTEND
###############################################################################

echo -e "\n${BLUE}[7/7] Frontend deployen...${NC}"

cd frontend

# Check/Create .env
if [ ! -f ".env" ]; then
  echo "Erstelle Frontend .env..."
  cat > .env <<'EOF'
NEXT_PUBLIC_API_URL=https://recruiting-sg.com/api
EOF
fi

# Install dependencies
echo "Installiere Frontend-Dependencies..."
npm install

# Deploy with Docker
echo "Starte Frontend-Container..."
docker-compose -f docker-compose.traefik.yml up -d --build

# Wait for frontend
sleep 5

# Check if frontend is running
if docker ps | grep -q "crm-ats-frontend"; then
  echo -e "${GREEN}✓ Frontend-Container läuft${NC}"
else
  echo -e "${YELLOW}⚠️  Frontend-Container nicht gefunden (möglicherweise anderer Name)${NC}"
fi

cd ..

###############################################################################
# 8. HEALTH CHECKS
###############################################################################

echo -e "\n${BLUE}Führe Health-Checks durch...${NC}"

# Check Backend Health
echo -n "Backend-Health: "
if curl -f -s https://recruiting-sg.com/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
else
  echo -e "${RED}✗ Fehlgeschlagen${NC}"
  echo "Versuche http://localhost:3000/health..."
  if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend läuft, aber Traefik-Routing funktioniert nicht${NC}"
  else
    echo -e "${RED}✗ Backend antwortet nicht${NC}"
    echo "Logs:"
    docker logs crm-ats-backend --tail 50
  fi
fi

# Check Frontend
echo -n "Frontend-Health: "
if curl -f -s https://recruiting-sg.com > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
else
  echo -e "${RED}✗ Fehlgeschlagen${NC}"
fi

###############################################################################
# 9. SUMMARY
###############################################################################

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              🎉 DEPLOYMENT ABGESCHLOSSEN 🎉              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}URLs:${NC}"
echo "  Frontend:  https://recruiting-sg.com"
echo "  API:       https://recruiting-sg.com/api"
echo "  API Docs:  https://recruiting-sg.com/api/docs"
echo ""
echo -e "${BLUE}Demo-Login:${NC}"
echo "  Email:     admin@example.com"
echo "  Password:  password123"
echo ""
echo -e "${BLUE}Nützliche Befehle:${NC}"
echo "  Logs ansehen:    docker-compose -f deployment/docker/docker-compose.yml logs -f"
echo "  Container-Status: docker ps"
echo "  Backend-Logs:    docker logs -f crm-ats-backend"
echo "  Frontend-Logs:   docker logs -f crm-ats-frontend"
echo ""
echo -e "${BLUE}Neue Features:${NC}"
echo "  ✓ AI-Powered CV-Parsing (OpenAI)"
echo "  ✓ Document Upload System (S3 / Local)"
echo "  ✓ Workflow Automation Engine"
echo "  ✓ Analytics Dashboard (KPIs)"
echo ""

# Show container status
echo -e "${BLUE}Container-Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep crm-ats || echo "Keine CRM-Container gefunden"

echo ""
echo -e "${GREEN}Deployment erfolgreich! 🚀${NC}"
