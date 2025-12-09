#!/bin/bash
# deploy-to-ec2.sh - Script to deploy the automation app to EC2

set -e

# Configuration
EC2_USER="ubuntu"
APP_DIR="/home/ubuntu/app"

# Get EC2 IP from SST outputs
echo "📡 Getting EC2 instance IP..."
EC2_IP=$(pnpm sst output --stage dev publicIp 2>/dev/null || echo "")

if [ -z "$EC2_IP" ]; then
    echo "❌ EC2 instance not found. Run 'pnpm sst deploy --stage dev' first."
    exit 1
fi

echo "🎯 Found EC2 at: $EC2_IP"

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf .deploy-package
mkdir -p .deploy-package

# Copy necessary files
cp -r app .deploy-package/
cp -r components .deploy-package/
cp -r config .deploy-package/
cp -r lib .deploy-package/
cp -r styles .deploy-package/
cp package.json .deploy-package/
cp pnpm-lock.yaml .deploy-package/
cp next.config.js .deploy-package/
cp tsconfig.json .deploy-package/
cp tailwind.config.ts .deploy-package/
cp postcss.config.mjs .deploy-package/
cp components.json .deploy-package/ 2>/dev/null || true

# Create .env file
echo "GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}" > .deploy-package/.env

# Archive it
tar -czf deploy.tar.gz -C .deploy-package .

echo "📤 Uploading to EC2..."
scp -o StrictHostKeyChecking=no -i ~/.ssh/automation-key.pem deploy.tar.gz ${EC2_USER}@${EC2_IP}:/tmp/

echo "🚀 Deploying on EC2..."
ssh -o StrictHostKeyChecking=no -i ~/.ssh/automation-key.pem ${EC2_USER}@${EC2_IP} << 'EOF'
set -e

# Extract app
sudo rm -rf /home/ubuntu/app
mkdir -p /home/ubuntu/app
tar -xzf /tmp/deploy.tar.gz -C /home/ubuntu/app
cd /home/ubuntu/app

# Install dependencies
pnpm install --frozen-lockfile || npm install

# Install playwright browsers
npx playwright install chromium

# Build the app
pnpm run build || npm run build

# Start/restart with PM2
pm2 delete automation 2>/dev/null || true
pm2 start npm --name "automation" -- run start
pm2 save

echo "✅ Deployment complete!"
EOF

# Cleanup
rm -rf .deploy-package deploy.tar.gz

echo ""
echo "=========================================="
echo "✅ Deployment successful!"
echo "🌐 App URL: http://${EC2_IP}:3000"
echo "🔗 SSH: ssh -i ~/.ssh/automation-key.pem ubuntu@${EC2_IP}"
echo "=========================================="
