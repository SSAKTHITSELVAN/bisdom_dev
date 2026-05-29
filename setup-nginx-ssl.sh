#!/bin/bash

# ============================================================================
# Bisdom - Nginx + SSL Setup Script
# ============================================================================
# This script will:
# 1. Install nginx and certbot
# 2. Configure nginx for bisdomai.com and api.bisdomai.com
# 3. Obtain SSL certificates from Let's Encrypt
# 4. Set up automatic certificate renewal
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="bisdomai.com"
API_DOMAIN="api.bisdomai.com"
EMAIL="your-email@example.com"  # CHANGE THIS!
PROJECT_DIR="/home/ubuntu/bisdom_dev"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

print_header "Pre-flight Checks"

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root or with sudo"
    exit 1
fi

print_success "Running with sudo privileges"

# Check if we're on the EC2 instance
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    print_info "This script should be run on the EC2 server (3.109.70.144)"
    exit 1
fi

print_success "Project directory found"

# Verify email is configured
if [ "$EMAIL" = "your-email@example.com" ]; then
    print_error "Please edit this script and set your email address for SSL certificates"
    exit 1
fi

print_success "Email configured: $EMAIL"

# ============================================================================
# Step 1: Install Nginx and Certbot
# ============================================================================

print_header "Step 1: Installing Nginx and Certbot"

# Update package list
print_info "Updating package list..."
apt-get update -qq

# Install nginx
if ! command -v nginx &> /dev/null; then
    print_info "Installing nginx..."
    apt-get install -y nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Install certbot
if ! command -v certbot &> /dev/null; then
    print_info "Installing certbot and nginx plugin..."
    apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# ============================================================================
# Step 2: Configure Firewall (if UFW is active)
# ============================================================================

print_header "Step 2: Configuring Firewall"

if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    print_info "UFW is active, configuring firewall rules..."
    ufw allow 'Nginx Full'
    ufw delete allow 8000/tcp 2>/dev/null || true
    ufw delete allow 5173/tcp 2>/dev/null || true
    print_success "Firewall configured"
else
    print_warning "UFW not active - remember to configure AWS Security Groups:"
    print_info "  - Allow inbound HTTPS (443) from 0.0.0.0/0"
    print_info "  - Allow inbound HTTP (80) from 0.0.0.0/0 (for SSL verification)"
    print_info "  - Remove direct access to ports 8000 and 5173"
fi

# ============================================================================
# Step 3: Create Nginx Configuration (HTTP only, for SSL verification)
# ============================================================================

print_header "Step 3: Creating Initial Nginx Configuration"

# Backup existing config if present
if [ -f /etc/nginx/sites-available/bisdom ]; then
    print_info "Backing up existing config..."
    cp /etc/nginx/sites-available/bisdom /etc/nginx/sites-available/bisdom.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create nginx config for frontend
print_info "Creating nginx config for $DOMAIN..."
cat > /etc/nginx/sites-available/bisdom << 'EOF'
# Bisdom Frontend - HTTP (will be upgraded to HTTPS by certbot)
server {
    listen 80;
    listen [::]:80;
    server_name bisdomai.com www.bisdomai.com;

    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Serve frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

print_success "Frontend config created"

# Create nginx config for API
print_info "Creating nginx config for $API_DOMAIN..."
cat > /etc/nginx/sites-available/bisdom-api << 'EOF'
# Bisdom API - HTTP (will be upgraded to HTTPS by certbot)
server {
    listen 80;
    listen [::]:80;
    server_name api.bisdomai.com;

    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # API endpoints
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for long-running AI requests
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
}
EOF

print_success "API config created"

# Create certbot webroot directory
mkdir -p /var/www/certbot

# Enable sites
print_info "Enabling nginx sites..."
ln -sf /etc/nginx/sites-available/bisdom /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/bisdom-api /etc/nginx/sites-enabled/

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
print_info "Testing nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Restart nginx
print_info "Restarting nginx..."
systemctl restart nginx
systemctl enable nginx
print_success "Nginx restarted and enabled"

# ============================================================================
# Step 4: Obtain SSL Certificates
# ============================================================================

print_header "Step 4: Obtaining SSL Certificates"

print_warning "IMPORTANT: Before proceeding, ensure DNS records are configured:"
print_info "  - $DOMAIN → 3.109.70.144 (A record)"
print_info "  - www.$DOMAIN → 3.109.70.144 (A record)"
print_info "  - $API_DOMAIN → 3.109.70.144 (A record)"
echo ""
read -p "Have you configured DNS records? (yes/no): " dns_ready

if [ "$dns_ready" != "yes" ]; then
    print_warning "Please configure DNS first, then run this script again"
    print_info "You can test DNS with: dig $DOMAIN +short"
    exit 0
fi

# Obtain SSL for frontend domain
print_info "Obtaining SSL certificate for $DOMAIN..."
certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained for $DOMAIN"
else
    print_error "Failed to obtain SSL certificate for $DOMAIN"
    print_info "Check DNS configuration: dig $DOMAIN +short"
    exit 1
fi

# Obtain SSL for API domain
print_info "Obtaining SSL certificate for $API_DOMAIN..."
certbot --nginx \
    -d $API_DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained for $API_DOMAIN"
else
    print_error "Failed to obtain SSL certificate for $API_DOMAIN"
    print_info "Check DNS configuration: dig $API_DOMAIN +short"
    exit 1
fi

# ============================================================================
# Step 5: Update Backend CORS Settings
# ============================================================================

print_header "Step 5: Updating Backend CORS Settings"

ENV_FILE="$PROJECT_DIR/api/.env"

if [ -f "$ENV_FILE" ]; then
    print_info "Updating ALLOWED_ORIGINS in .env..."

    # Backup .env
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

    # Update ALLOWED_ORIGINS
    if grep -q "ALLOWED_ORIGINS" "$ENV_FILE"; then
        sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]|' "$ENV_FILE"
    else
        echo 'ALLOWED_ORIGINS=["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]' >> "$ENV_FILE"
    fi

    print_success "CORS settings updated"

    # Restart API service
    print_info "Restarting API service..."
    systemctl restart bisdom-api.service
    print_success "API service restarted"
else
    print_error ".env file not found at $ENV_FILE"
fi

# ============================================================================
# Step 6: Update Frontend API URL
# ============================================================================

print_header "Step 6: Updating Frontend API Configuration"

CLIENT_JS="$PROJECT_DIR/ui/src/api/client.js"

if [ -f "$CLIENT_JS" ]; then
    print_info "Updating API base URL in client.js..."

    # Backup client.js
    cp "$CLIENT_JS" "$CLIENT_JS.backup.$(date +%Y%m%d_%H%M%S)"

    # Update baseURL
    sed -i "s|baseURL: ['\"]http://.*['\"]|baseURL: 'https://api.bisdomai.com'|" "$CLIENT_JS"
    sed -i "s|baseURL: process\.env\..*|baseURL: 'https://api.bisdomai.com',|" "$CLIENT_JS"

    print_success "API URL updated"

    # Restart UI service
    print_info "Restarting UI service..."
    systemctl restart bisdom-ui.service
    print_success "UI service restarted"
else
    print_warning "client.js not found at $CLIENT_JS - may need manual update"
fi

# ============================================================================
# Step 7: Set Up Auto-Renewal
# ============================================================================

print_header "Step 7: Setting Up Certificate Auto-Renewal"

# Test renewal
print_info "Testing certificate renewal..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    print_success "Certificate auto-renewal is configured (certbot timer active)"
else
    print_error "Certificate renewal test failed"
fi

# ============================================================================
# Step 8: Security Hardening
# ============================================================================

print_header "Step 8: Applying Security Headers"

# Update nginx configs with security headers
print_info "Adding security headers to nginx configs..."

# This will be added by certbot, but we ensure it's there
cat >> /etc/nginx/snippets/ssl-params.conf << 'EOF'
# SSL Security Parameters
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF

print_success "Security headers configured"

# Reload nginx
nginx -t && systemctl reload nginx

# ============================================================================
# Final Summary
# ============================================================================

print_header "✓ Setup Complete!"

echo -e "${GREEN}Your sites are now secured with SSL:${NC}"
echo -e "  Frontend: ${BLUE}https://bisdomai.com${NC}"
echo -e "  Frontend: ${BLUE}https://www.bisdomai.com${NC}"
echo -e "  API:      ${BLUE}https://api.bisdomai.com${NC}"
echo ""
echo -e "${GREEN}SSL Certificates:${NC}"
echo -e "  - Issued by: Let's Encrypt"
echo -e "  - Valid for: 90 days"
echo -e "  - Auto-renewal: Enabled (certbot timer)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Update AWS Security Groups:"
echo -e "     - Allow HTTPS (443) from 0.0.0.0/0"
echo -e "     - Allow HTTP (80) from 0.0.0.0/0 (for SSL renewal)"
echo -e "     - Remove/restrict direct access to ports 8000 and 5173"
echo ""
echo -e "  2. Test your sites:"
echo -e "     ${BLUE}curl -I https://bisdomai.com${NC}"
echo -e "     ${BLUE}curl -I https://api.bisdomai.com${NC}"
echo ""
echo -e "  3. Check SSL grade:"
echo -e "     ${BLUE}https://www.ssllabs.com/ssltest/analyze.html?d=bisdomai.com${NC}"
echo ""
echo -e "${GREEN}Configuration files:${NC}"
echo -e "  - Nginx configs: /etc/nginx/sites-available/bisdom*"
echo -e "  - SSL certs: /etc/letsencrypt/live/"
echo -e "  - Renewal timer: systemctl status certbot.timer"
echo ""
print_success "All done! 🎉"
