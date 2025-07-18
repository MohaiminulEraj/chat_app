#!/bin/bash

# PM2 Startup Script for Kitty Backend

set -e

echo "🚀 Starting Kitty Backend with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed globally. Installing PM2..."
    npm install -g pm2
fi

# Check if application is built
if [ ! -d "dist" ]; then
    echo "📦 Building application..."
    npm run build
fi

# Check if already running
if pm2 describe kitty-backend &> /dev/null; then
    echo "🔄 Application is already running. Reloading..."
    npm run pm2:reload
else
    echo "▶️ Starting application in cluster mode..."
    npm run pm2:start
fi

echo "✅ Application started successfully!"
echo "📊 Check status with: npm run pm2:status"
echo "📝 View logs with: npm run pm2:logs"
echo "🖥️  Monitor with: npm run pm2:monitor"
