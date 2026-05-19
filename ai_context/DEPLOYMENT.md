# Bisdom - AWS EC2 Deployment Guide

**Last Updated**: 2026-05-19  
**Instance IP**: 3.109.70.144  
**Environment**: Production (Development mode enabled)

---

## 📋 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Server Configuration](#server-configuration)
3. [Deployment Architecture](#deployment-architecture)
4. [Systemd Services](#systemd-services)
5. [Update Workflow](#update-workflow)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring](#monitoring)
8. [Security Considerations](#security-considerations)

---

## 🌐 Deployment Overview

### Current Setup
- **Cloud Provider**: AWS EC2
- **Instance Type**: Ubuntu Server (7.0.0-1004-aws)
- **Region**: ap-south-1 (Mumbai)
- **Public IP**: 3.109.70.144
- **Access Method**: SSH with PEM key authentication
- **User**: ubuntu
- **Project Directory**: `/home/ubuntu/bisdom_dev`

### Deployed Components
- **Backend API**: FastAPI + Uvicorn (Port 8000)
- **Frontend UI**: React + Vite (Port 5173)
- **Database**: AWS RDS PostgreSQL (Remote)
- **Process Management**: systemd services

### Access URLs
```
Frontend: http://3.109.70.144:5173
Backend API: http://3.109.70.144:8000
API Docs: http://3.109.70.144:8000/docs
```

---

## 🖥️ Server Configuration

### System Information
```bash
OS: Linux ip-172-31-33-10 7.0.0-1004-aws
Architecture: x86_64 GNU/Linux
Kernel: 7.0.0-1004-aws
Distribution: Ubuntu (2026 version)
```

### Installed Software
```bash
Python: 3.14.4
pip: 25.1.1
Node.js: v20.20.2
npm: 10.8.2
Git: (installed)
Uvicorn: (installed via pip, located at ~/.local/bin/uvicorn)
```

### Directory Structure
```
/home/ubuntu/
├── bisdom_dev/                  # Main project directory (cloned from GitHub)
│   ├── .git/                    # Git repository
│   ├── api/                     # Backend (FastAPI)
│   │   ├── app/                 # Application code
│   │   ├── .env                 # Environment variables
│   │   ├── requirements.txt     # Python dependencies
│   │   └── ...
│   ├── ui/                      # Frontend (React)
│   │   ├── src/                 # Source code
│   │   ├── node_modules/        # Node dependencies
│   │   ├── package.json         # Node dependencies manifest
│   │   └── ...
│   └── .gitignore
├── .local/
│   └── bin/
│       └── uvicorn              # Uvicorn executable
├── api.log                      # API service logs
└── ui.log                       # UI service logs
```

### Git Configuration
```bash
Repository: https://github.com/SSAKTHITSELVAN/bisdom_dev.git
Current Branch: main
Remote: origin
Latest Commit: 5f30659 Initial commit: Bisdom B2B Commerce Platform
```

---

## 🏗️ Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS EC2 Instance                        │
│                  Ubuntu 7.0.0-1004-aws                      │
│                   Public IP: 3.109.70.144                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ bisdom-ui.service│                  │bisdom-api.service│
│                  │                  │                  │
│  Vite Dev Server │                  │     Uvicorn      │
│   (npm run dev)  │                  │  (FastAPI app)   │
│                  │                  │                  │
│   Port: 5173     │                  │   Port: 8000     │
│   0.0.0.0:5173   │                  │   0.0.0.0:8000   │
└──────────────────┘                  └──────────────────┘
        │                                       │
        │                                       │
        │                                       ▼
        │                            ┌─────────────────────┐
        │                            │  AWS RDS PostgreSQL │
        │                            │  bizzapdb (ap-south)│
        │                            │  Database: bizzap_v1│
        │                            └─────────────────────┘
        │                                       │
        │                                       ▼
        │                            ┌─────────────────────┐
        │                            │   AWS Bedrock API   │
        │                            │  Qwen3-VL-235B AI   │
        │                            │   (us-east-1)       │
        │                            └─────────────────────┘
        │
        └──────────► External Access
                    (Browser, API clients)
```

### Network Flow
```
User Browser
    ↓
http://3.109.70.144:5173 → Vite Dev Server (React UI)
    ↓
http://3.109.70.144:8000 → FastAPI Backend (REST API)
    ↓
AWS RDS PostgreSQL (bizzapdb.c3iya6wc0708.ap-south-1.rds.amazonaws.com:5432)
    ↓
AWS Bedrock AI (bedrock.us-east-1.amazonaws.com)
```

---

## ⚙️ Systemd Services

### Service Files Location
```
/etc/systemd/system/bisdom-api.service
/etc/systemd/system/bisdom-ui.service
```

### bisdom-api.service

**File**: `/etc/systemd/system/bisdom-api.service`

```ini
[Unit]
Description=Bisdom API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bisdom_dev/api
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/ubuntu/.local/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Key Details**:
- **User**: ubuntu
- **Working Directory**: `/home/ubuntu/bisdom_dev/api`
- **Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Port**: 8000 (exposed to all interfaces)
- **Restart Policy**: Always restart on failure after 10 seconds
- **Auto-start**: Enabled (starts on system boot)

### bisdom-ui.service

**File**: `/etc/systemd/system/bisdom-ui.service`

```ini
[Unit]
Description=Bisdom UI Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bisdom_dev/ui
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Key Details**:
- **User**: ubuntu
- **Working Directory**: `/home/ubuntu/bisdom_dev/ui`
- **Command**: `npm run dev -- --host 0.0.0.0 --port 5173`
- **Port**: 5173 (Vite dev server, exposed to all interfaces)
- **Restart Policy**: Always restart on failure after 10 seconds
- **Auto-start**: Enabled (starts on system boot)

### Service Management Commands

```bash
# Check service status
sudo systemctl status bisdom-api.service
sudo systemctl status bisdom-ui.service

# Start services
sudo systemctl start bisdom-api.service
sudo systemctl start bisdom-ui.service

# Stop services
sudo systemctl stop bisdom-api.service
sudo systemctl stop bisdom-ui.service

# Restart services
sudo systemctl restart bisdom-api.service
sudo systemctl restart bisdom-ui.service

# Enable services (auto-start on boot)
sudo systemctl enable bisdom-api.service
sudo systemctl enable bisdom-ui.service

# Disable services (prevent auto-start)
sudo systemctl disable bisdom-api.service
sudo systemctl disable bisdom-ui.service

# View logs
sudo journalctl -u bisdom-api.service -f
sudo journalctl -u bisdom-ui.service -f

# Reload systemd after editing service files
sudo systemctl daemon-reload
```

---

## 🔄 Update Workflow

### Complete Deployment Update Process

When you make changes locally and want to deploy to the EC2 instance, follow this workflow:

### Step 1: Local Development & Testing
```bash
# On local machine
cd /home/sakthi-selvan/bisdom

# Make your changes to code
# Test locally
# Ensure everything works
```

### Step 2: Commit Changes Locally
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Description of changes"

# IMPORTANT: Check current branch
git branch
# Should show: * main
```

### Step 3: Push to GitHub (main branch)
```bash
# Push to remote repository
git push origin main

# Verify push was successful
# Check GitHub: https://github.com/SSAKTHITSELVAN/bisdom_dev.git
```

### Step 4: SSH into EC2 Instance
```bash
# From local machine
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
```

### Step 5: Pull Latest Changes
```bash
# Once connected to EC2 instance
cd /home/ubuntu/bisdom_dev

# Check current status
git status

# Pull latest changes from main branch
git pull origin main

# Verify the pull
git log -3 --oneline
```

### Step 6: Update Dependencies (If Needed)

**Backend Dependencies** (if requirements.txt changed):
```bash
cd /home/ubuntu/bisdom_dev/api

# Install new Python packages
pip3 install -r requirements.txt --user
```

**Frontend Dependencies** (if package.json changed):
```bash
cd /home/ubuntu/bisdom_dev/ui

# Install new Node packages
npm install
```

### Step 7: Restart Services

**Restart Backend API**:
```bash
sudo systemctl restart bisdom-api.service

# Check if restart was successful
sudo systemctl status bisdom-api.service

# View logs if there are errors
sudo journalctl -u bisdom-api.service -n 50
```

**Restart Frontend UI**:
```bash
sudo systemctl restart bisdom-ui.service

# Check if restart was successful
sudo systemctl status bisdom-ui.service

# View logs if there are errors
sudo journalctl -u bisdom-ui.service -n 50
```

### Step 8: Verify Deployment
```bash
# Check if services are running
systemctl status bisdom-api.service bisdom-ui.service

# Check if ports are listening
ss -tlnp | grep -E ':(8000|5173)'

# Test API
curl http://localhost:8000/docs

# From local machine, test in browser:
# http://3.109.70.144:5173 (Frontend)
# http://3.109.70.144:8000/docs (API)
```

### Quick Update Script (Optional)

Create a helper script on the EC2 instance for faster updates:

**File**: `/home/ubuntu/update_bisdom.sh`
```bash
#!/bin/bash

echo "🔄 Starting Bisdom update..."

# Navigate to project directory
cd /home/ubuntu/bisdom_dev

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Check if pull was successful
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi

# Ask if dependencies need update
read -p "📦 Update dependencies? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Updating backend dependencies..."
    cd api
    pip3 install -r requirements.txt --user
    
    echo "📦 Updating frontend dependencies..."
    cd ../ui
    npm install
fi

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart bisdom-api.service
sudo systemctl restart bisdom-ui.service

# Wait for services to start
sleep 3

# Check status
echo "✅ Checking service status..."
systemctl is-active --quiet bisdom-api.service && echo "✅ API service is running" || echo "❌ API service failed"
systemctl is-active --quiet bisdom-ui.service && echo "✅ UI service is running" || echo "❌ UI service failed"

echo "🎉 Update complete!"
```

Make it executable:
```bash
chmod +x /home/ubuntu/update_bisdom.sh
```

Usage:
```bash
# SSH into instance
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144

# Run update script
./update_bisdom.sh
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptom**: `systemctl start` fails or service shows "failed" status

**Diagnosis**:
```bash
# Check service status
sudo systemctl status bisdom-api.service

# View detailed logs
sudo journalctl -u bisdom-api.service -n 100

# Check if port is already in use
ss -tlnp | grep 8000
```

**Solutions**:
- Check if port 8000/5173 is already in use
- Verify .env file exists and has correct values
- Check file permissions
- Ensure Python/Node dependencies are installed
- Check for syntax errors in code

#### 2. Database Connection Errors

**Symptom**: API returns 500 errors, logs show database connection failures

**Diagnosis**:
```bash
# Check .env file
cat /home/ubuntu/bisdom_dev/api/.env | grep DATABASE_URL

# Test database connectivity
cd /home/ubuntu/bisdom_dev/api
python3 -c "import asyncpg; import asyncio; asyncio.run(asyncpg.connect('postgresql://...'))"
```

**Solutions**:
- Verify DATABASE_URL is correct
- Check RDS security group allows inbound from EC2
- Verify RDS instance is running
- Check network connectivity

#### 3. Git Pull Conflicts

**Symptom**: `git pull` fails with merge conflicts

**Diagnosis**:
```bash
cd /home/ubuntu/bisdom_dev
git status
git diff
```

**Solutions**:
```bash
# If local changes exist
git stash                    # Save local changes
git pull origin main         # Pull latest
git stash pop                # Reapply local changes

# OR reset to remote (WARNING: loses local changes)
git fetch origin
git reset --hard origin/main
```

#### 4. Permission Denied Errors

**Symptom**: Service fails with permission errors

**Solutions**:
```bash
# Fix file ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/bisdom_dev

# Fix uvicorn permissions
chmod +x /home/ubuntu/.local/bin/uvicorn

# Fix log file permissions
sudo chmod 664 /home/ubuntu/*.log
sudo chown ubuntu:ubuntu /home/ubuntu/*.log
```

#### 5. Out of Memory

**Symptom**: Services crash randomly, OOM in logs

**Diagnosis**:
```bash
# Check memory usage
free -h

# Check swap
swapon -s

# Check service memory
systemctl status bisdom-api.service | grep Memory
```

**Solutions**:
- Add swap space
- Reduce worker processes in uvicorn
- Upgrade instance type
- Optimize application memory usage

#### 6. Port Already in Use

**Symptom**: Cannot bind to port 8000 or 5173

**Diagnosis**:
```bash
# Find process using port
sudo lsof -i :8000
sudo lsof -i :5173
```

**Solutions**:
```bash
# Kill process (if safe)
sudo kill -9 <PID>

# OR change port in service file
sudo systemctl edit bisdom-api.service
# Change ExecStart line with different port
```

### Logs and Debugging

**View Live Logs**:
```bash
# API logs
sudo journalctl -u bisdom-api.service -f

# UI logs
sudo journalctl -u bisdom-ui.service -f

# Both together
sudo journalctl -u bisdom-api.service -u bisdom-ui.service -f

# Application logs (if any)
tail -f /home/ubuntu/api.log
tail -f /home/ubuntu/ui.log
```

**View Historical Logs**:
```bash
# Last 100 lines
sudo journalctl -u bisdom-api.service -n 100

# Since specific time
sudo journalctl -u bisdom-api.service --since "2026-05-19 10:00:00"

# With timestamps
sudo journalctl -u bisdom-api.service -o short-precise
```

**Enable Debug Logging** (API):
Edit `/home/ubuntu/bisdom_dev/api/.env`:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```
Then restart: `sudo systemctl restart bisdom-api.service`

---

## 📊 Monitoring

### Service Health Checks

**Check Service Status**:
```bash
# Quick status
systemctl is-active bisdom-api.service bisdom-ui.service

# Detailed status
systemctl status bisdom-api.service bisdom-ui.service

# Uptime
systemctl show bisdom-api.service -p ActiveEnterTimestamp
```

**Check Resource Usage**:
```bash
# CPU and Memory
systemctl status bisdom-api.service bisdom-ui.service | grep -E "(CPU|Memory)"

# System resources
htop

# Disk usage
df -h

# Network connections
ss -tulpn
```

**Health Check Endpoints**:
```bash
# API health
curl http://localhost:8000/docs
curl http://localhost:8000/api/v1/expiry/check

# Response time test
time curl http://localhost:8000/docs
```

### Automated Monitoring Setup (Recommended)

**Simple Uptime Monitor** (using cron):

Create `/home/ubuntu/monitor_bisdom.sh`:
```bash
#!/bin/bash
LOG_FILE="/home/ubuntu/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check API
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "$DATE - API: OK" >> $LOG_FILE
else
    echo "$DATE - API: DOWN - Restarting" >> $LOG_FILE
    sudo systemctl restart bisdom-api.service
fi

# Check UI
if curl -s http://localhost:5173 > /dev/null; then
    echo "$DATE - UI: OK" >> $LOG_FILE
else
    echo "$DATE - UI: DOWN - Restarting" >> $LOG_FILE
    sudo systemctl restart bisdom-ui.service
fi
```

Add to cron (check every 5 minutes):
```bash
chmod +x /home/ubuntu/monitor_bisdom.sh
crontab -e
# Add: */5 * * * * /home/ubuntu/monitor_bisdom.sh
```

### Log Rotation (Prevent Disk Fill)

Create `/etc/logrotate.d/bisdom`:
```
/home/ubuntu/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## 🔒 Security Considerations

### Current Security Posture

**⚠️ WARNING: Development Configuration in Production**

The current deployment has several security issues that MUST be addressed before production use:

#### High Priority Issues

1. **Open Ports to Internet**
   - ❌ Port 8000 (API) exposed directly
   - ❌ Port 5173 (Dev server) exposed directly
   - ✅ Should be behind reverse proxy (nginx)

2. **CORS Policy Too Permissive**
   - ❌ `ALLOWED_ORIGINS = ["*"]` in .env
   - ✅ Should be specific domains only

3. **Debug Mode Enabled**
   - ❌ `DEBUG=true` in production
   - ✅ Should be `DEBUG=false`

4. **Static OTP**
   - ❌ `STATIC_OTP=123456` for all users
   - ✅ Should use real SMS/email OTP service

5. **Admin Time-Based Password**
   - ❌ Weak admin authentication
   - ✅ Should use proper auth (see BUG-001)

6. **Vite Dev Server in Production**
   - ❌ Using `npm run dev`
   - ✅ Should use `npm run build` and serve static files

7. **Credentials in .env**
   - ❌ Database password in plain text
   - ❌ Bedrock token in plain text
   - ✅ Should use AWS Secrets Manager or similar

8. **No HTTPS**
   - ❌ HTTP only (unencrypted)
   - ✅ Should use HTTPS with SSL certificate

9. **No Rate Limiting**
   - ❌ API can be abused
   - ✅ Should implement rate limiting (see TASK-004)

10. **No Firewall Rules**
    - ❌ All ports open by default
    - ✅ Should use AWS Security Groups and ufw

### Recommended Production Setup

**1. Add Nginx Reverse Proxy**:
```nginx
# /etc/nginx/sites-available/bisdom
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**2. Enable SSL with Let's Encrypt**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**3. Configure Firewall**:
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to app ports
sudo ufw deny 8000/tcp
sudo ufw deny 5173/tcp

# Check rules
sudo ufw status
```

**4. Update Security Group (AWS Console)**:
- Allow: 22 (SSH from your IP only)
- Allow: 80 (HTTP from anywhere)
- Allow: 443 (HTTPS from anywhere)
- Deny: 8000, 5173 (internal only)

**5. Use Production Build for Frontend**:

Update `/etc/systemd/system/bisdom-ui.service`:
```ini
[Service]
# Instead of: ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 5173
# Use production build:
ExecStart=/usr/bin/npm run preview -- --host 127.0.0.1 --port 5173
```

Build once:
```bash
cd /home/ubuntu/bisdom_dev/ui
npm run build
```

**6. Harden .env**:
```bash
# Move sensitive config to AWS Secrets Manager
# Use IAM roles instead of hardcoded tokens
# Set proper permissions
chmod 600 /home/ubuntu/bisdom_dev/api/.env
```

**7. Disable Debug Mode**:
```bash
# In .env
DEBUG=false
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

### SSH Key Security

**Current Setup**:
- ✅ Using PEM key authentication (good)
- ⚠️ PEM file location: `~/Downloads/bisdom_server.pem`

**Best Practices**:
```bash
# On local machine, secure PEM file
chmod 400 ~/Downloads/bisdom_server.pem

# Better: Move to ~/.ssh/
mv ~/Downloads/bisdom_server.pem ~/.ssh/bisdom_ec2.pem
chmod 400 ~/.ssh/bisdom_ec2.pem

# Update SSH command
ssh -i ~/.ssh/bisdom_ec2.pem ubuntu@3.109.70.144

# Optional: Add to ~/.ssh/config
cat << EOF >> ~/.ssh/config
Host bisdom-server
    HostName 3.109.70.144
    User ubuntu
    IdentityFile ~/.ssh/bisdom_ec2.pem
    StrictHostKeyChecking yes
EOF

# Then just use:
ssh bisdom-server
```

---

## 📝 Environment Variables Reference

**Location**: `/home/ubuntu/bisdom_dev/api/.env`

### Application Settings
```bash
APP_NAME=Bisdom                          # Application name
APP_VERSION=1.0.0                        # Version
DEBUG=true                               # ⚠️ Should be false in production
ACCESS_TOKEN_EXPIRE_MINUTES=10080        # JWT expiry (7 days)
```

### Database
```bash
DATABASE_URL=postgresql+asyncpg://postgres:bizzap123@bizzapdb.c3iya6wc0708.ap-south-1.rds.amazonaws.com:5432/bizzap_v1_db
SYNC_DATABASE_URL=postgresql://postgres:bizzap123@bizzapdb.c3iya6wc0708.ap-south-1.rds.amazonaws.com:5432/bizzap_v1_db
```

### AWS Bedrock (AI)
```bash
AWS_BEARER_TOKEN_BEDROCK=ABSKQmVkcm9ja0FQSUtleS1...  # Bedrock API token
BEDROCK_MODEL_ID=qwen.qwen3-vl-235b-a22b            # AI model ID
BEDROCK_API_BASE=https://bedrock.us-east-1.amazonaws.com
```

### External APIs
```bash
GST_API_BASE_URL=https://sheet.gstincheck.co.in/check  # GST validation API
```

### Authentication
```bash
STATIC_OTP=123456                        # ⚠️ Development only - insecure!
OTP_EXPIRE_MINUTES=10                    # OTP validity period
```

### CORS
```bash
ALLOWED_ORIGINS=["*"]                    # ⚠️ Too permissive - fix for production
```

---

## 🎯 Deployment Checklist

### Pre-Deployment (Local)
- [ ] Code changes tested locally
- [ ] All tests passing (once implemented)
- [ ] Code committed to git
- [ ] Commit message is descriptive
- [ ] Branch is `main`
- [ ] Pushed to GitHub successfully

### Deployment (EC2)
- [ ] SSH into EC2 instance
- [ ] Navigate to project directory (`cd bisdom_dev`)
- [ ] Pull latest changes (`git pull origin main`)
- [ ] Update dependencies if needed (pip/npm install)
- [ ] Restart backend service (`sudo systemctl restart bisdom-api.service`)
- [ ] Restart frontend service (`sudo systemctl restart bisdom-ui.service`)
- [ ] Check service status (both running)
- [ ] Check logs for errors

### Post-Deployment Verification
- [ ] Frontend loads (http://3.109.70.144:5173)
- [ ] Backend API accessible (http://3.109.70.144:8000/docs)
- [ ] Login flow works
- [ ] Critical features tested
- [ ] No errors in logs
- [ ] Services are stable (no crashes after 5 minutes)

### Production Hardening (TODO)
- [ ] Add nginx reverse proxy
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure firewall (ufw)
- [ ] Update AWS Security Groups
- [ ] Change DEBUG=false
- [ ] Fix CORS policy
- [ ] Implement real OTP service
- [ ] Use production build for frontend
- [ ] Move secrets to AWS Secrets Manager
- [ ] Set up monitoring/alerts
- [ ] Configure log rotation
- [ ] Set up automated backups

---

## 📚 Additional Resources

### Related Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [TECH_STACK.md](TECH_STACK.md) - Technology stack
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current status
- [BUGS.md](BUGS.md) - Known issues (see BUG-002 for CORS)
- [TASKS.md](TASKS.md) - Planned improvements

### Useful Commands Reference

**SSH Access**:
```bash
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
```

**Service Management**:
```bash
sudo systemctl {start|stop|restart|status} bisdom-api.service
sudo systemctl {start|stop|restart|status} bisdom-ui.service
```

**Logs**:
```bash
sudo journalctl -u bisdom-api.service -f
sudo journalctl -u bisdom-ui.service -f
```

**Git Operations**:
```bash
git status
git pull origin main
git log -3 --oneline
```

**Process Monitoring**:
```bash
ps aux | grep -E '(uvicorn|node)'
ss -tlnp | grep -E ':(8000|5173)'
```

---

## 🚨 Emergency Procedures

### Service Down Emergency

**Quick Recovery**:
```bash
# SSH into server
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144

# Restart services
sudo systemctl restart bisdom-api.service bisdom-ui.service

# Check status
systemctl status bisdom-api.service bisdom-ui.service

# If still failing, check logs
sudo journalctl -u bisdom-api.service -n 50
sudo journalctl -u bisdom-ui.service -n 50
```

### Database Connection Lost

**Quick Fix**:
```bash
# Check if RDS is running (AWS Console)
# Restart API service
sudo systemctl restart bisdom-api.service

# Test connectivity
cd /home/ubuntu/bisdom_dev/api
python3 -c "import asyncpg; print('Testing DB...')"
```

### Complete System Recovery

**Full Reset** (if everything is broken):
```bash
# Stop services
sudo systemctl stop bisdom-api.service bisdom-ui.service

# Reset to last known good state
cd /home/ubuntu/bisdom_dev
git fetch origin
git reset --hard origin/main

# Reinstall dependencies
cd api && pip3 install -r requirements.txt --user
cd ../ui && npm install

# Restart services
sudo systemctl start bisdom-api.service bisdom-ui.service

# Monitor for stability
sudo journalctl -u bisdom-api.service -u bisdom-ui.service -f
```

---

**Last Updated**: 2026-05-19  
**Maintained By**: Bisdom Team  
**For Questions**: Contact system administrator

---

## 🔄 Update History

| Date | Changes | Updated By |
|------|---------|------------|
| 2026-05-19 | Initial deployment documentation | AI Assistant |
| 2026-05-18 | Services deployed and configured | Sakthi Selvan |

---

**Notes**:
- This deployment is currently in **development mode** on a production server
- Several security hardening steps are required before true production use
- Monitoring and alerting systems should be implemented
- Consider using CI/CD pipeline for automated deployments
