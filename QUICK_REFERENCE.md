# Bisdom - Quick Reference Card

**Production URLs**: https://bisdomai.com | https://api.bisdomai.com  
**Server**: ubuntu@3.109.70.144  
**Last Updated**: 2026-05-29

---

## 🔗 URLs

```
Frontend:    https://bisdomai.com
             https://www.bisdomai.com
API:         https://api.bisdomai.com
API Docs:    https://api.bisdomai.com/docs
GitHub:      https://github.com/SSAKTHITSELVAN/bisdom_dev
```

---

## 🔑 SSH Access

```bash
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
```

---

## 🔧 Service Commands

```bash
# Status
sudo systemctl status nginx bisdom-api bisdom-ui

# Restart all
sudo systemctl restart nginx bisdom-api bisdom-ui

# Restart individual
sudo systemctl restart nginx
sudo systemctl restart bisdom-api
sudo systemctl restart bisdom-ui

# Logs
sudo journalctl -u bisdom-api -f
sudo journalctl -u bisdom-ui -f
sudo tail -f /var/log/nginx/error.log
```

---

## 🚀 Deploy Updates

```bash
# Method 1: Automated (from local)
./deploy.sh "commit message"

# Method 2: Manual
ssh ubuntu@3.109.70.144
cd bisdom_dev
git pull origin main
sudo systemctl restart bisdom-api bisdom-ui
```

---

## 🔒 SSL Management

```bash
# Check certificates
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 🧪 Health Checks

```bash
# Frontend
curl -I https://bisdomai.com

# API
curl -I https://api.bisdomai.com

# Services
systemctl is-active nginx bisdom-api bisdom-ui
```

---

## 📁 Important Files

```bash
# Nginx configs
/etc/nginx/sites-available/bisdom
/etc/nginx/sites-available/bisdom-api

# SSL certs
/etc/letsencrypt/live/bisdomai.com/
/etc/letsencrypt/live/api.bisdomai.com/

# Backend config
/home/ubuntu/bisdom_dev/api/.env

# Frontend config
/home/ubuntu/bisdom_dev/ui/.env.local

# Services
/etc/systemd/system/bisdom-api.service
/etc/systemd/system/bisdom-ui.service
```

---

## 🐛 Quick Troubleshooting

**Site down?**
```bash
sudo systemctl restart nginx bisdom-api bisdom-ui
```

**CORS errors?**
```bash
cat /home/ubuntu/bisdom_dev/api/.env | grep ALLOWED_ORIGINS
# Should be: ["https://bisdomai.com","https://www.bisdomai.com","http://localhost:5173"]
```

**SSL warnings?**
```bash
sudo certbot certificates  # Check expiry
sudo certbot renew         # Renew if needed
```

**502 Bad Gateway?**
```bash
sudo systemctl status bisdom-api bisdom-ui  # Check if services running
sudo journalctl -u bisdom-api -n 50        # Check logs
```

---

## 📚 Documentation

- `DEPLOYMENT_SUMMARY.md` - Complete overview
- `SSL_DEPLOYMENT_COMPLETE.md` - SSL setup details
- `NGINX_SSL_SETUP.md` - Nginx configuration
- `FRONTEND_HTTPS_UPDATE.md` - Frontend API config
- `ai_context/` - Project documentation

---

## ⚠️ TODO

- [ ] Update AWS Security Groups (allow 443, 80 only)
- [ ] Test full user journey
- [ ] Set up monitoring

---

**Need help?** See `DEPLOYMENT_SUMMARY.md` for details.
