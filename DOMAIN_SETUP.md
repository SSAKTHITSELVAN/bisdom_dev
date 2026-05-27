# 🌐 Domain Setup - bisdomai.com

**Date**: 2026-05-27  
**Status**: ✅ Configured

---

## 🎯 **Domain Configuration**

### **Domains**
- **Frontend**: `bisdomai.com` (and `www.bisdomai.com`)
- **Backend API**: `api.bisdomai.com`

### **DNS Records** (Already configured by user)
```
Type: A
Host: @              → Points to: 3.109.70.144 (Frontend)
Host: api            → Points to: 3.109.70.144 (Backend API)
```

---

## 🔧 **Server Configuration**

### **Nginx Reverse Proxy**

**Installed**: ✅ nginx 1.28.3

**Configuration**: `/etc/nginx/sites-available/bisdomai.conf`

```nginx
# Backend API - api.bisdomai.com
server {
    listen 80;
    server_name api.bisdomai.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend - bisdomai.com
server {
    listen 80;
    server_name bisdomai.com www.bisdomai.com;
    
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🎨 **Frontend Configuration**

**File**: `ui/.env.production`

```env
VITE_API_URL=http://api.bisdomai.com/api/v1
```

This tells the React app to call the API at `api.bisdomai.com` instead of the IP address.

---

## 🔐 **Backend Configuration**

**File**: `api/.env` (on server)

```python
# Updated CORS to allow the new domain
ALLOWED_ORIGINS = [
    "http://bisdomai.com", 
    "http://www.bisdomai.com", 
    "https://bisdomai.com", 
    "https://www.bisdomai.com"
]
```

---

## 🚀 **How It Works**

### **Request Flow**

**Frontend Request**:
```
User → http://bisdomai.com 
     → Nginx (port 80) 
     → React App (port 5173)
     → Browser loads React app
```

**API Request**:
```
React App → http://api.bisdomai.com/api/v1/auth/...
          → Nginx (port 80)
          → FastAPI (port 8000)
          → Response back to React
```

### **Before (IP-based)**:
- Frontend: `http://3.109.70.144:5173`
- Backend: `http://3.109.70.144:8000`

### **After (Domain-based)**:
- Frontend: `http://bisdomai.com` ✅
- Backend: `http://api.bisdomai.com` ✅

---

## 🔒 **Next Steps (Optional - HTTPS)**

To enable HTTPS with SSL certificates:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates for both domains
sudo certbot --nginx -d bisdomai.com -d www.bisdomai.com -d api.bisdomai.com

# Auto-renewal is configured automatically
```

This will:
- ✅ Get free SSL certificates from Let's Encrypt
- ✅ Configure nginx to redirect HTTP → HTTPS
- ✅ Auto-renew certificates every 90 days

---

## ✅ **Verification**

### **Test Frontend**
```bash
curl -I http://bisdomai.com
# Should return: 200 OK
```

### **Test API**
```bash
curl http://api.bisdomai.com/api/v1/
# Should return: {"app":"Bisdom","version":"1.0.0",...}
```

### **Browser Test**
1. Open: `http://bisdomai.com`
2. Should see: Bisdom login page
3. Login and test: All features should work

---

## 📊 **Services Running**

```bash
# Check nginx
sudo systemctl status nginx

# Check API
sudo systemctl status bisdom-api.service

# Check UI
sudo systemctl status bisdom-ui.service
```

All three services need to be running for the domains to work.

---

## 🐛 **Troubleshooting**

### **Domain not loading**
```bash
# Check nginx
sudo systemctl status nginx
sudo nginx -t

# Check DNS
dig +short bisdomai.com
# Should show: 3.109.70.144
```

### **API calls failing**
```bash
# Check CORS settings
cd ~/bisdom_dev/api
grep ALLOWED_ORIGINS .env

# Should include bisdomai.com domains
```

### **502 Bad Gateway**
```bash
# Backend or frontend service might be down
sudo systemctl restart bisdom-api.service
sudo systemctl restart bisdom-ui.service
```

---

## 📝 **Configuration Files**

| File | Location | Purpose |
|------|----------|---------|
| Nginx config | `/etc/nginx/sites-available/bisdomai.conf` | Reverse proxy |
| Frontend env | `ui/.env.production` | API URL |
| Backend env | `api/.env` | CORS origins |

---

**Status**: ✅ **COMPLETE**  
**Domains**: ✅ **ACTIVE**  
**SSL**: ⏳ **Pending** (optional)

---

_Last Updated: 2026-05-27_
