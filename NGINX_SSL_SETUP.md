# Nginx + SSL Setup Guide for Bisdom

**Last Updated**: 2026-05-29  
**Domains**: bisdomai.com, api.bisdomai.com  
**Server**: 3.109.70.144

---

## 📋 Prerequisites

Before running the setup script, ensure:

### 1. DNS Configuration ✅

Configure the following DNS A records with your domain registrar:

| Record Type | Hostname | Value | TTL |
|-------------|----------|-------|-----|
| A | bisdomai.com | 3.109.70.144 | 3600 |
| A | www.bisdomai.com | 3.109.70.144 | 3600 |
| A | api.bisdomai.com | 3.109.70.144 | 3600 |

**Verify DNS propagation:**
```bash
dig bisdomai.com +short
dig www.bisdomai.com +short
dig api.bisdomai.com +short
```

All should return: `3.109.70.144`

**Alternative check:**
```bash
nslookup bisdomai.com
nslookup api.bisdomai.com
```

### 2. AWS Security Groups ✅

Update your EC2 instance security group to allow:

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| HTTP | TCP | 80 | 0.0.0.0/0 | For SSL verification & HTTP redirect |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure website access |
| SSH | TCP | 22 | Your IP | SSH access |

**Optional (remove after SSL setup):**
- Port 8000 (direct API access) - will be replaced by nginx
- Port 5173 (direct frontend access) - will be replaced by nginx

### 3. Email Address ✅

You need a valid email for Let's Encrypt certificate notifications.

---

## 🚀 Installation Steps

### Step 1: Upload Script to EC2

From your local machine:

```bash
# Copy the script to EC2
scp -i ~/Downloads/bisdom_server.pem setup-nginx-ssl.sh ubuntu@3.109.70.144:~/

# Or use the deployment script
./deploy.sh "Add nginx SSL setup script"
```

### Step 2: SSH to EC2

```bash
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
```

### Step 3: Edit Email in Script

```bash
cd ~/bisdom_dev

# Edit the script and replace email
nano setup-nginx-ssl.sh

# Find this line and change it:
# EMAIL="your-email@example.com"
# To:
# EMAIL="your-actual-email@example.com"
```

### Step 4: Make Script Executable

```bash
chmod +x setup-nginx-ssl.sh
```

### Step 5: Run Setup Script

```bash
sudo ./setup-nginx-ssl.sh
```

The script will:
1. ✅ Install nginx and certbot
2. ✅ Configure firewall (if UFW active)
3. ✅ Create nginx configurations
4. ✅ Obtain SSL certificates from Let's Encrypt
5. ✅ Update backend CORS settings
6. ✅ Update frontend API URL
7. ✅ Set up auto-renewal
8. ✅ Apply security headers

### Step 6: Verify Setup

```bash
# Check nginx status
sudo systemctl status nginx

# Check certificates
sudo certbot certificates

# Test HTTPS
curl -I https://bisdomai.com
curl -I https://api.bisdomai.com

# Check auto-renewal
sudo certbot renew --dry-run
```

---

## 📁 File Locations

### Nginx Configurations

```bash
# Main configs
/etc/nginx/sites-available/bisdom           # Frontend config
/etc/nginx/sites-available/bisdom-api       # API config

# Enabled sites (symlinks)
/etc/nginx/sites-enabled/bisdom
/etc/nginx/sites-enabled/bisdom-api

# SSL parameters
/etc/nginx/snippets/ssl-params.conf

# Main nginx config
/etc/nginx/nginx.conf
```

### SSL Certificates

```bash
# Certificates
/etc/letsencrypt/live/bisdomai.com/fullchain.pem
/etc/letsencrypt/live/bisdomai.com/privkey.pem
/etc/letsencrypt/live/api.bisdomai.com/fullchain.pem
/etc/letsencrypt/live/api.bisdomai.com/privkey.pem

# Renewal configs
/etc/letsencrypt/renewal/bisdomai.com.conf
/etc/letsencrypt/renewal/api.bisdomai.com.conf
```

### Logs

```bash
# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Certbot logs
/var/log/letsencrypt/letsencrypt.log
```

---

## 🔧 Configuration Details

### Frontend Nginx Config (After SSL)

The script creates an initial HTTP config, then certbot automatically upgrades it to HTTPS:

```nginx
# /etc/nginx/sites-available/bisdom

# HTTP → HTTPS redirect (added by certbot)
server {
    listen 80;
    listen [::]:80;
    server_name bisdomai.com www.bisdomai.com;
    return 301 https://$host$request_uri;
}

# HTTPS server (configured by certbot)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bisdomai.com www.bisdomai.com;

    ssl_certificate /etc/letsencrypt/live/bisdomai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bisdomai.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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
```

### API Nginx Config (After SSL)

```nginx
# /etc/nginx/sites-available/bisdom-api

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.bisdomai.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.bisdomai.com;

    ssl_certificate /etc/letsencrypt/live/api.bisdomai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bisdomai.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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

        # Long timeouts for AI requests
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
}
```

### Backend CORS Update

The script automatically updates `/home/ubuntu/bisdom_dev/api/.env`:

```bash
# Before
ALLOWED_ORIGINS=["*"]

# After
ALLOWED_ORIGINS=["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]
```

### Frontend API URL Update

The script automatically updates `/home/ubuntu/bisdom_dev/ui/src/api/client.js`:

```javascript
// Before
baseURL: 'http://3.109.70.144:8000'

// After
baseURL: 'https://api.bisdomai.com'
```

---

## 🔄 Certificate Management

### Auto-Renewal

Certbot automatically configures a systemd timer for renewal:

```bash
# Check renewal timer
systemctl status certbot.timer

# View next renewal time
systemctl list-timers certbot.timer

# Manual renewal test (dry run)
sudo certbot renew --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal
```

### Certificate Information

```bash
# List all certificates
sudo certbot certificates

# Certificate details
sudo openssl x509 -in /etc/letsencrypt/live/bisdomai.com/fullchain.pem -text -noout
```

### Renewal Process

- **Frequency**: Certbot checks twice daily
- **Renewal window**: 30 days before expiration
- **Validity**: 90 days per certificate
- **Post-renewal hook**: Nginx reload (automatic)

---

## 🛠️ Common Operations

### Restart Services

```bash
# Restart nginx
sudo systemctl restart nginx

# Restart backend API
sudo systemctl restart bisdom-api.service

# Restart frontend UI
sudo systemctl restart bisdom-ui.service

# Restart all
sudo systemctl restart nginx bisdom-api.service bisdom-ui.service
```

### Check Status

```bash
# Nginx status
sudo systemctl status nginx

# Check nginx config
sudo nginx -t

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Reload Configuration

```bash
# Reload nginx (no downtime)
sudo nginx -t && sudo systemctl reload nginx
```

### Edit Configurations

```bash
# Edit frontend config
sudo nano /etc/nginx/sites-available/bisdom

# Edit API config
sudo nano /etc/nginx/sites-available/bisdom-api

# After editing, always test and reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🐛 Troubleshooting

### Issue: DNS Not Resolving

**Symptoms:**
```bash
dig bisdomai.com +short
# Returns nothing or wrong IP
```

**Solution:**
1. Check DNS records in your registrar
2. Wait for propagation (can take up to 48 hours)
3. Try different DNS server: `dig @8.8.8.8 bisdomai.com +short`

### Issue: Certbot Fails - "Connection Refused"

**Symptoms:**
```
Failed to obtain certificate
Connection refused
```

**Solution:**
1. Check nginx is running: `sudo systemctl status nginx`
2. Verify port 80 is open: `sudo netstat -tulpn | grep :80`
3. Check AWS Security Groups allow port 80
4. Test locally: `curl http://localhost`

### Issue: Certbot Fails - "DNS Problem"

**Symptoms:**
```
DNS problem: NXDOMAIN looking up A for bisdomai.com
```

**Solution:**
1. Verify DNS is configured correctly
2. Wait longer for propagation
3. Check with: `dig bisdomai.com +short`

### Issue: 502 Bad Gateway

**Symptoms:**
Browser shows "502 Bad Gateway" error

**Solution:**
```bash
# Check if services are running
sudo systemctl status bisdom-api.service
sudo systemctl status bisdom-ui.service

# Restart services
sudo systemctl restart bisdom-api.service bisdom-ui.service

# Check logs
sudo journalctl -u bisdom-api.service -f
sudo journalctl -u bisdom-ui.service -f
```

### Issue: CORS Errors After SSL Setup

**Symptoms:**
Browser console shows CORS errors

**Solution:**
```bash
# Check backend CORS settings
cat /home/ubuntu/bisdom_dev/api/.env | grep ALLOWED_ORIGINS

# Should be:
# ALLOWED_ORIGINS=["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]

# If wrong, update and restart:
nano /home/ubuntu/bisdom_dev/api/.env
sudo systemctl restart bisdom-api.service
```

### Issue: Mixed Content Warnings

**Symptoms:**
Browser console shows "Mixed Content" warnings

**Solution:**
```bash
# Check frontend API URL
cat /home/ubuntu/bisdom_dev/ui/src/api/client.js | grep baseURL

# Should be:
# baseURL: 'https://api.bisdomai.com'

# If wrong, update, rebuild, and restart:
nano /home/ubuntu/bisdom_dev/ui/src/api/client.js
cd /home/ubuntu/bisdom_dev/ui
npm run build
sudo systemctl restart bisdom-ui.service
```

### Issue: Certificate Expiring Soon

**Symptoms:**
Email warning from Let's Encrypt

**Solution:**
```bash
# Check renewal status
sudo certbot renew --dry-run

# If dry run fails, check certbot timer
systemctl status certbot.timer

# If timer is inactive
sudo systemctl start certbot.timer
sudo systemctl enable certbot.timer

# Force renewal if needed
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 🔐 Security Checklist

After setup, verify:

- [ ] HTTPS working for all domains
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate valid (check with browser)
- [ ] SSL grade A or A+ (test at ssllabs.com)
- [ ] CORS restricted to actual domains (not "*")
- [ ] Ports 8000 and 5173 blocked from public (AWS Security Groups)
- [ ] Only ports 22, 80, 443 open
- [ ] Security headers present (check browser dev tools)
- [ ] Auto-renewal enabled (`systemctl status certbot.timer`)

---

## 📊 Testing Commands

```bash
# Test HTTPS
curl -I https://bisdomai.com
curl -I https://www.bisdomai.com
curl -I https://api.bisdomai.com

# Test HTTP redirect
curl -I http://bisdomai.com
# Should show: Location: https://bisdomai.com/

# Test SSL certificate
openssl s_client -connect bisdomai.com:443 -servername bisdomai.com

# Check security headers
curl -I https://bisdomai.com | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"

# Test API endpoint
curl https://api.bisdomai.com/docs
```

---

## 📈 Performance Optimization (Optional)

### Enable Gzip Compression

```bash
sudo nano /etc/nginx/nginx.conf
```

Add/uncomment:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### Enable Caching

Add to server blocks:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable HTTP/2 (Already Enabled)

The script already enables HTTP/2 in the SSL configs:
```nginx
listen 443 ssl http2;
```

---

## 🆘 Support

### Useful Links

- **Let's Encrypt Status**: https://letsencrypt.status.io/
- **SSL Test**: https://www.ssllabs.com/ssltest/
- **DNS Checker**: https://dnschecker.org/
- **Nginx Docs**: https://nginx.org/en/docs/

### Quick Reference

```bash
# View all services
sudo systemctl status nginx bisdom-api bisdom-ui

# View all logs
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u bisdom-api -f
sudo journalctl -u bisdom-ui -f

# Certbot help
sudo certbot --help
sudo certbot certificates
sudo certbot renew --help
```

---

## 📝 Rollback (If Needed)

If something goes wrong:

```bash
# Stop nginx
sudo systemctl stop nginx

# Restore original setup (direct access)
# Backend still on port 8000
# Frontend still on port 5173

# Re-enable AWS Security Groups for ports 8000, 5173

# Revert CORS in backend
nano /home/ubuntu/bisdom_dev/api/.env
# Change ALLOWED_ORIGINS back to ["*"]
sudo systemctl restart bisdom-api.service

# Revert API URL in frontend
nano /home/ubuntu/bisdom_dev/ui/src/api/client.js
# Change baseURL back to http://3.109.70.144:8000
sudo systemctl restart bisdom-ui.service
```

---

**Ready?** Run `sudo ./setup-nginx-ssl.sh` on your EC2 instance! 🚀
