#!/bin/bash

###############################################################################
# Bisdom Deployment Script
#
# This script automates the deployment workflow for Bisdom project:
# 1. Commits local changes (if any)
# 2. Pushes to GitHub
# 3. SSHs to EC2 instance
# 4. Pulls latest changes
# 5. Updates dependencies (if requested)
# 6. Restarts services
# 7. Verifies deployment
#
# Usage: ./deploy.sh [commit-message]
# Example: ./deploy.sh "Fixed admin panel bug"
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_IP="3.109.70.144"
EC2_USER="ubuntu"
PEM_FILE="$HOME/Downloads/bisdom_server.pem"
PROJECT_DIR="/home/ubuntu/bisdom_dev"

# Check if PEM file exists
if [ ! -f "$PEM_FILE" ]; then
    echo -e "${RED}❌ PEM file not found at: $PEM_FILE${NC}"
    echo "Please update PEM_FILE variable in this script."
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Bisdom Deployment Script          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}📋 Checking for local changes...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Found uncommitted changes:${NC}"
    git status -s
    echo ""

    # Get commit message
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Please provide a commit message:${NC}"
        read -p "Commit message: " COMMIT_MSG
    else
        COMMIT_MSG="$1"
    fi

    # Commit changes
    echo -e "${BLUE}📝 Committing changes...${NC}"
    git add .
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ Changes committed${NC}"
else
    echo -e "${GREEN}✅ No local changes to commit${NC}"
fi

# Step 2: Push to GitHub
echo ""
echo -e "${BLUE}📤 Pushing to GitHub (main branch)...${NC}"
git push origin main
echo -e "${GREEN}✅ Pushed to GitHub${NC}"

# Step 3: Deploy to EC2
echo ""
echo -e "${BLUE}🚀 Deploying to EC2 instance ($EC2_IP)...${NC}"
echo ""

# Create remote deployment script
REMOTE_SCRIPT=$(cat << 'EOF'
#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📥 Pulling latest changes from GitHub...${NC}"
cd /home/ubuntu/bisdom_dev
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Code updated${NC}"

# Ask about dependencies
echo ""
read -p "Update dependencies? (y/n) " -n 1 -r UPDATE_DEPS
echo ""

if [[ $UPDATE_DEPS =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📦 Updating backend dependencies...${NC}"
    cd /home/ubuntu/bisdom_dev/api
    pip3 install -r requirements.txt --user --quiet
    echo -e "${GREEN}✅ Backend dependencies updated${NC}"

    echo -e "${BLUE}📦 Updating frontend dependencies...${NC}"
    cd /home/ubuntu/bisdom_dev/ui
    npm install --silent
    echo -e "${GREEN}✅ Frontend dependencies updated${NC}"
fi

# Restart services
echo ""
echo -e "${BLUE}🔄 Restarting services...${NC}"
sudo systemctl restart bisdom-api.service
echo -e "${GREEN}✅ API service restarted${NC}"

sudo systemctl restart bisdom-ui.service
echo -e "${GREEN}✅ UI service restarted${NC}"

# Wait for services to start
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 3

# Check service status
echo ""
echo -e "${BLUE}🔍 Checking service status...${NC}"

if systemctl is-active --quiet bisdom-api.service; then
    echo -e "${GREEN}✅ API service is running${NC}"
else
    echo -e "${RED}❌ API service failed to start${NC}"
    echo "Logs:"
    sudo journalctl -u bisdom-api.service -n 20 --no-pager
    exit 1
fi

if systemctl is-active --quiet bisdom-ui.service; then
    echo -e "${GREEN}✅ UI service is running${NC}"
else
    echo -e "${RED}❌ UI service failed to start${NC}"
    echo "Logs:"
    sudo journalctl -u bisdom-ui.service -n 20 --no-pager
    exit 1
fi

# Show resource usage
echo ""
echo -e "${BLUE}📊 Service Resource Usage:${NC}"
systemctl status bisdom-api.service bisdom-ui.service | grep -E "(Memory|CPU)" || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🎉 Deployment Successful!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Frontend: ${GREEN}http://3.109.70.144:5173${NC}"
echo -e "  API Docs: ${GREEN}http://3.109.70.144:8000/docs${NC}"
echo ""
EOF
)

# Execute remote deployment
ssh -i "$PEM_FILE" "$EC2_USER@$EC2_IP" "bash -s" <<< "$REMOTE_SCRIPT"

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ Deployment Complete!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • Code pushed to GitHub: ${GREEN}✓${NC}"
echo -e "  • Deployed to EC2: ${GREEN}✓${NC}"
echo -e "  • Services restarted: ${GREEN}✓${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test frontend: ${BLUE}http://3.109.70.144:5173${NC}"
echo -e "  2. Test API: ${BLUE}http://3.109.70.144:8000/docs${NC}"
echo -e "  3. Monitor logs if needed:"
echo -e "     ${BLUE}ssh -i $PEM_FILE $EC2_USER@$EC2_IP${NC}"
echo -e "     ${BLUE}sudo journalctl -u bisdom-api.service -f${NC}"
echo ""
