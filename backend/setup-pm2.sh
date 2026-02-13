#!/bin/bash
# BreviAI PM2 Setup Script
# Installs Node.js, Chrome, PM2 and starts the app

set -e

echo "🚀 Starting PM2 Setup..."

# 1. Install Node.js 18
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed."
fi

# 2. Install Google Chrome Stable (for Puppeteer)
echo "🌐 Installing Google Chrome..."
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 --no-install-recommends

# 3. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 is already installed."
fi

# 4. Install Dependencies
echo "npm install..."
# Skip Chromium download since we installed Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export CHROME_PATH=/usr/bin/google-chrome-stable

npm install --no-audit --no-fund --loglevel=error

# 5. Start App with PM2
echo "🚀 Starting App with PM2..."
pm2 stop whatsapp-service || true
pm2 delete whatsapp-service || true

pm2 start scripts/breviai-hub.js --name whatsapp-service --max-memory-restart 500M

# 6. Save PM2 list and set startup hook
pm2 save
# Note: The user might need to run the startup command output manually once
echo "✅ Setup Complete! App is running."
echo "⚠️  run 'pm2 startup' and follow instructions if you want it to auto-start on reboot."
