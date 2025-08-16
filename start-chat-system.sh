#!/bin/bash

echo "🚀 Starting Kitty Backend Chat System..."
echo "📁 Working directory: $(pwd)"

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set default environment variables if not set
export JWT_SECRET=${JWT_SECRET:-"default-jwt-secret-for-testing"}
export MONGO_URI=${MONGO_URI:-"mongodb://localhost:27017/kitty_chat"}
export DB_HOST=${DB_HOST:-"localhost"}
export DB_PORT=${DB_PORT:-"5432"}
export DB_USERNAME=${DB_USERNAME:-"postgres"}
export DB_PASSWORD=${DB_PASSWORD:-"password"}
export DB_NAME=${DB_NAME:-"kitty_backend"}

echo "🔧 Environment Configuration:"
echo "   JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "   MONGO_URI: $MONGO_URI"
echo "   DB_HOST: $DB_HOST:$DB_PORT"
echo "   DB_NAME: $DB_NAME"
echo ""

echo "🏗️  Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Starting development server..."
    echo "📡 Direct Chat: http://localhost:3000/socket.io/ (namespace: /chat)"
    echo "👥 Group Chat: http://localhost:3000/socket.io/ (namespace: /)"
    echo "🧪 Test Interface: file://$(pwd)/test-chat-system.html"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "=========================="

    npm run start:dev
else
    echo "❌ Build failed. Please check the errors above."
    echo ""
    echo "💡 Common issues:"
    echo "   - Database connection problems"
    echo "   - Missing environment variables"
    echo "   - TypeScript compilation errors"
    echo ""
    echo "📋 To debug:"
    echo "   1. Check your .env file"
    echo "   2. Ensure databases are running"
    echo "   3. Run: npm run build --verbose"
    exit 1
fi
