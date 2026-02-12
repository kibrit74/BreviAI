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

    echo "🐳 Building Docker image..."
    cd backend
    docker build -t whatsapp-service -f Dockerfile.whatsapp .

    echo "🔄 Restarting container..."
    docker stop whatsapp-service || true
    docker rm whatsapp-service || true

    echo "🚀 Starting service..."
    docker run -d \
        --name whatsapp-service \
        --restart unless-stopped \
        -p 3001:3001 \
        -v /opt/breviai/.wwebjs_auth:/usr/src/app/.wwebjs_auth \
        -e WA_AUTH_KEY=breviai-secret-password \
        whatsapp-service

    echo "✅ Remote deployment commands finished."
'

echo ""
echo "🎉 Deployment Process Complete!"
