# Frontend HTTPS API Update

**Date**: 2026-05-29  
**Status**: ✅ Complete

---

## 📋 Summary

Updated the frontend to use the new HTTPS API endpoint at `https://api.bisdomai.com/api/v1` instead of the old HTTP endpoint.

---

## 🔄 Changes Made

### 1. Environment Configuration

Created environment-specific configuration files:

| File | Environment | API URL |
|------|-------------|---------|
| `.env` | Local development | `http://localhost:8000/api/v1` |
| `.env.production` | Production builds | `https://api.bisdomai.com/api/v1` |
| `.env.local` | Server (EC2) | `https://api.bisdomai.com/api/v1` |
| `.env.server` | Template for deployment | `https://api.bisdomai.com/api/v1` |

### 2. Client Configuration

The frontend uses Vite's environment variables in `ui/src/api/client.js`:

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
```

**Priority Order:**
1. `.env.local` (highest priority, used on server)
2. `.env.production` (production builds)
3. `.env` (development default)
4. Fallback: `http://localhost:8000/api/v1`

---

## 🖥️ Server Configuration

### EC2 Server Setup

The production server at `3.109.70.144` now uses:

```bash
# /home/ubuntu/bisdom_dev/ui/.env.local
VITE_API_URL=https://api.bisdomai.com/api/v1
```

### Service Restart

After updating `.env.local`:

```bash
sudo systemctl restart bisdom-ui.service
```

Vite automatically detected the change and restarted the dev server.

---

## ✅ Verification

### 1. Check Environment File on Server

```bash
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
cd bisdom_dev/ui
cat .env.local
```

Expected output:
```
# Production server configuration
VITE_API_URL=https://api.bisdomai.com/api/v1
```

### 2. Test API Connection

Open browser and visit:
- **Frontend**: https://bisdomai.com
- Check browser console for API calls
- All API requests should go to: `https://api.bisdomai.com/api/v1/*`

### 3. Test Login Flow

1. Go to https://bisdomai.com/login
2. Enter phone number
3. Check Network tab in browser DevTools
4. Verify API calls are made to `https://api.bisdomai.com/api/v1/auth/send-otp`

---

## 🔧 Deployment Script

Created `update-frontend-env.sh` for easy deployment:

```bash
#!/bin/bash
# Updates frontend .env.local and restarts service

cat > /home/ubuntu/bisdom_dev/ui/.env.local << 'EOF'
VITE_API_URL=https://api.bisdomai.com/api/v1
EOF

sudo systemctl restart bisdom-ui.service
```

**Usage on EC2:**
```bash
cd /home/ubuntu/bisdom_dev
./update-frontend-env.sh
```

---

## 🌐 Environment Variable Priority

Vite loads environment files in this order (later files override earlier):

1. `.env` - Base configuration (all environments)
2. `.env.local` - Local overrides (gitignored)
3. `.env.[mode]` - Mode-specific (e.g., `.env.production`)
4. `.env.[mode].local` - Mode-specific local overrides

**On EC2 Server:**
- We use `.env.local` to override the default
- This file is gitignored for security
- Dev mode (`npm run dev`) still reads all env files

---

## 🔐 Security Notes

### Gitignore Status

All `.env*` files are gitignored (correct behavior):
```gitignore
# Environment files (contain sensitive info)
.env
.env.local
.env.*.local
.env.production
```

**Why?**
- Prevents committing sensitive URLs
- Allows different configs per environment
- Must be manually created on server

### CORS Configuration

Backend CORS is already updated to accept requests from:
- `https://bisdomai.com`
- `https://www.bisdomai.com`
- `http://localhost:5173` (for local dev)

Located in: `/home/ubuntu/bisdom_dev/api/.env`

```bash
ALLOWED_ORIGINS=["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]
```

---

## 🧪 Testing Checklist

- [x] `.env.local` created on server
- [x] Frontend service restarted
- [x] Vite detected env change
- [ ] Test login flow at https://bisdomai.com/login
- [ ] Test API calls in browser DevTools
- [ ] Verify no CORS errors
- [ ] Test full user journey

---

## 🔄 Future Updates

### To Update API URL Again:

**Option 1: Manual**
```bash
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
cd bisdom_dev/ui
nano .env.local
# Update VITE_API_URL
sudo systemctl restart bisdom-ui.service
```

**Option 2: Using Script**
```bash
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
cd bisdom_dev
./update-frontend-env.sh
```

### For Local Development

Update `ui/.env`:
```bash
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────┐
│  Browser (https://bisdomai.com)         │
└────────────────┬────────────────────────┘
                 │
                 │ API Calls
                 ▼
┌─────────────────────────────────────────┐
│  https://api.bisdomai.com/api/v1        │
│  (Nginx → FastAPI:8000)                 │
└─────────────────────────────────────────┘
```

**Frontend → Backend Flow:**
1. User visits `https://bisdomai.com`
2. Frontend loads with `VITE_API_URL=https://api.bisdomai.com/api/v1`
3. All API calls use HTTPS
4. Nginx routes to FastAPI backend
5. Response returned securely

---

## 🐛 Troubleshooting

### Issue: API calls still going to HTTP

**Check:**
```bash
# On server
cat /home/ubuntu/bisdom_dev/ui/.env.local
```

**Fix:**
```bash
echo "VITE_API_URL=https://api.bisdomai.com/api/v1" > /home/ubuntu/bisdom_dev/ui/.env.local
sudo systemctl restart bisdom-ui.service
```

### Issue: CORS errors in browser

**Check backend CORS:**
```bash
cat /home/ubuntu/bisdom_dev/api/.env | grep ALLOWED_ORIGINS
```

**Should show:**
```
ALLOWED_ORIGINS=["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]
```

### Issue: 404 on API calls

**Verify API is accessible:**
```bash
curl -I https://api.bisdomai.com/api/v1/health
```

**Check nginx:**
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 📝 Files Modified

### Local Repository
- `ui/.env` - Updated comments
- `ui/.env.production` - Changed to HTTPS
- `ui/.env.server` - Created template
- `update-frontend-env.sh` - Created deployment script

### EC2 Server
- `/home/ubuntu/bisdom_dev/ui/.env.local` - Created with HTTPS URL

### Not Modified
- `ui/src/api/client.js` - Already uses environment variables correctly

---

## ✅ Status

**Environment Configuration**: ✅ Complete  
**Server Deployment**: ✅ Complete  
**Service Restart**: ✅ Complete  
**Ready for Testing**: ✅ Yes  

**Next Step:** Test the live site at https://bisdomai.com and verify all API calls work correctly! 🚀
