#!/bin/bash

# Smart Guide System - Quick Start Script
# Run this to start all services

echo "🚀 Smart Guide System - Starting All Services"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on correct directory
if [ ! -f "global.json" ]; then
    echo "❌ Error: Run this script from project root!"
    exit 1
fi

echo -e "${BLUE}1️⃣  Database Setup${NC}"
echo "Initializing PostgreSQL database..."
psql -U postgres -d smartguide -f services/api/database/init.sql > /dev/null 2>&1
psql -U postgres -d smartguide -f services/api/database/seed.sql > /dev/null 2>&1
echo -e "${GREEN}✅ Database ready${NC}"
echo ""

echo -e "${BLUE}2️⃣  Backend API${NC}"
echo "Starting .NET API (port 5022)..."
cd services/api
dotnet run &
API_PID=$!
cd ../..
sleep 3
echo -e "${GREEN}✅ API running (PID: $API_PID)${NC}"
echo ""

echo -e "${BLUE}3️⃣  Owner Web (Seller Dashboard)${NC}"
echo "Installing dependencies..."
cd apps/seller-web
npm install > /dev/null 2>&1
echo "Starting Next.js (port 3000)..."
npm run dev &
SELLER_PID=$!
cd ../..
sleep 3
echo -e "${GREEN}✅ Seller Web running (PID: $SELLER_PID)${NC}"
echo "   👉 Open: http://localhost:3000"
echo ""

echo -e "${BLUE}4️⃣  Admin Web (Admin Dashboard)${NC}"
echo "Installing dependencies..."
cd apps/admin-web
npm install > /dev/null 2>&1
echo "Starting Next.js (port 3001)..."
npm run dev &
ADMIN_PID=$!
cd ../..
sleep 3
echo -e "${GREEN}✅ Admin Web running (PID: $ADMIN_PID)${NC}"
echo "   👉 Open: http://localhost:3001"
echo ""

echo "=============================================="
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo ""
echo "📱 Services Running:"
echo "  • Backend API    → http://192.168.22.4:5022"
echo "  • Seller Web     → http://localhost:3000"
echo "  • Admin Web      → http://localhost:3001"
echo "  • Database       → PostgreSQL (smartguide)"
echo ""
echo "🔐 Test Accounts:"
echo "  • Owner: owner1@example.com / 123456"
echo "  • Admin: admin@smartguide.com / 123456"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all processes
wait
