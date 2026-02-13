#!/bin/bash
# BreviAI PM2 Setup Script (Optimized for Low RAM)
# Installs Node.js, Chrome, PM2 and starts the app

set -e

echo "🚀 Starting PM2 Setup..."

# 0. Create Swap File (Crucial for Low RAM)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB Swap file for stability..."
    # Fallback to dd if fallocate fails (common in cloud shells)
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile || true
    echo "✅ Swap created."
    free -h
else
    echo "✅ Swap file already exists."
fi


# 1. Install Node.js 18
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed."
fi

# 2. Install Google Chrome Stable (for Puppeteer)
if ! command -v google-chrome-stable &> /dev/null; then
    echo "🌐 Installing Google Chrome..."
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 --no-install-recommends
else
    echo "✅ Google Chrome is already installed."
fi

# 3. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 is already installed."
fi

# 4. Install Dependencies (Split to save RAM)
echo "📦 Installing dependencies (Split mode)..."
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_SKIP_DOWNLOAD=true
export CHROME_PATH=/usr/bin/google-chrome-stable

# Install lighter packages first
echo "   - Installing core packages..."
npm install qrcode express cors node-cron dotenv fast-xml-parser --no-audit --no-fund --loglevel=error

# Install heavy package separately
echo "   - Installing whatsapp-web.js (Release memory first)..."
sync && sudo sysctl -w vm.drop_caches=3
npm install whatsapp-web.js --no-audit --no-fund --loglevel=verbose

# 5. Start App with PM2
echo "🚀 Starting App with PM2..."
pm2 stop whatsapp-service || true
pm2 delete whatsapp-service || true

# Start with memory limit to prevent hanging whole server
pm2 start scripts/breviai-hub.js --name whatsapp-service --max-memory-restart 500M

pm2 save
echo "✅ Setup Complete! App is running."
pm2 list
