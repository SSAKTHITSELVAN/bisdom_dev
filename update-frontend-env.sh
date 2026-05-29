#!/bin/bash

# ============================================================================
# Update Frontend Environment Configuration
# ============================================================================
# This script updates the frontend .env file on the EC2 server to use HTTPS
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Updating frontend environment configuration...${NC}"

# Create .env.local for server
cat > /home/ubuntu/bisdom_dev/ui/.env.local << 'EOF'
# Production server configuration
VITE_API_URL=https://api.bisdomai.com/api/v1
EOF

echo -e "${GREEN}✓ Created .env.local with HTTPS API URL${NC}"

# Restart UI service
echo -e "${BLUE}Restarting frontend service...${NC}"
sudo systemctl restart bisdom-ui.service

echo -e "${GREEN}✓ Frontend service restarted${NC}"
echo -e "${GREEN}✓ Frontend now using: https://api.bisdomai.com/api/v1${NC}"
