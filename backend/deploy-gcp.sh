#!/bin/bash
# BreviAI GCP Deployment Script (Bash)
# Usage: ./deploy-gcp.sh

INSTANCE_NAME="breviai-whatsapp"
ZONE="us-west1-b"

echo "🚀 BreviAI Deployment Started..."

# 1. Trigger Remote Update via SSH
echo "📡 Connecting to VM ($INSTANCE_NAME)..."

gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command '
    set -e # Stop on error

    echo "🔍 Checking directory..."
    if [ ! -d "/opt/breviai" ]; then
        echo "❌ /opt/breviai not found. Please run initial setup first."
        exit 1
    fi

    cd /opt/breviai
    
    echo "⬇️ Pulling latest code..."
    git checkout main
    git pull origin main

    echo "📦 Installing dependencies..."
    cd backend
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_SKIP_DOWNLOAD=true
    export CHROME_PATH=/usr/bin/google-chrome-stable
    npm install --no-audit --no-fund --loglevel=error

    echo "🔄 Restarting PM2 service..."
    pm2 restart whatsapp-service || pm2 start scripts/breviai-hub.js --name whatsapp-service

    echo "✅ Remote deployment commands finished."
'

echo ""
echo "🎉 Deployment Process Complete!"
