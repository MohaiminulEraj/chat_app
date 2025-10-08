#!/bin/bash

# 🚀 Kitty Admin Panel - Environment Setup Script
# This script sets up the admin panel environment

set -e  # Exit on error

echo "🎨 Kitty Admin Panel - Environment Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}📦 Checking Node.js version...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

# Check npm version
echo -e "${BLUE}📦 Checking npm version...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo ""

# Navigate to admin panel directory
ADMIN_PANEL_DIR="kitty-admin-panel"

if [ ! -d "$ADMIN_PANEL_DIR" ]; then
    echo -e "${RED}❌ Admin panel directory not found: $ADMIN_PANEL_DIR${NC}"
    exit 1
fi

cd "$ADMIN_PANEL_DIR"
echo -e "${GREEN}✅ Changed to directory: $(pwd)${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${BLUE}🔧 Creating .env file...${NC}"
    cat > .env << EOF
# Kitty Admin Panel Environment Variables
VITE_API_BASE_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

echo ""

# Display .env contents
echo -e "${BLUE}📋 Current environment configuration:${NC}"
cat .env
echo ""

# Check if backend is running
echo -e "${BLUE}🔍 Checking if backend API is running...${NC}"
BACKEND_URL="http://localhost:3000"

if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -q "200\|404"; then
    echo -e "${GREEN}✅ Backend API is running at $BACKEND_URL${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API is not responding at $BACKEND_URL${NC}"
    echo -e "${YELLOW}   Please make sure your NestJS backend is running${NC}"
fi

echo ""

# Display summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo ""
echo -e "1. Start the development server:"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo -e "2. Open your browser:"
echo -e "   ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "3. Login with admin credentials"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "   - README.md - Complete documentation"
echo -e "   - ADMIN_PANEL_QUICK_START.md - Quick start guide"
echo -e "   - ADMIN_PANEL_IMPLEMENTATION.md - Implementation details"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"
