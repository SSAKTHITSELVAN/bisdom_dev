# Bisdom - B2B Commerce Platform

> AI-powered procurement and supplier matching platform for B2B commerce

[![Status](https://img.shields.io/badge/status-development-yellow)](https://github.com/SSAKTHITSELVAN/bisdom_dev)
[![Python](https://img.shields.io/badge/python-3.14+-blue)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19.2-blue)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115+-green)](https://fastapi.tiangolo.com/)

---

## 📖 Overview

Bisdom is an intelligent B2B commerce platform that uses AI agents to automate supplier discovery, procurement negotiations, and deal closure. Built with React, FastAPI, PostgreSQL, and AWS Bedrock AI.

### Key Features

✅ **Smart Onboarding** - GSTIN-based business verification  
✅ **AI Requirement Enrichment** - Conversational requirement gathering  
✅ **Intelligent Matching** - Multi-factor supplier matching algorithm  
✅ **Automated Negotiations** - AI agents negotiate on behalf of buyers and suppliers  
✅ **Admin Dashboard** - Real-time monitoring and analytics  
✅ **Profile Management** - Editable business profiles with AI insights  

---

## 🚀 Quick Start

### Prerequisites

- **Python**: 3.11+ (3.14+ recommended)
- **Node.js**: 20+ 
- **PostgreSQL**: 14+ (or AWS RDS)
- **AWS Bedrock**: Access to Qwen3-VL model

### Local Development

**1. Clone Repository**
```bash
git clone https://github.com/SSAKTHITSELVAN/bisdom_dev.git
cd bisdom_dev
```

**2. Backend Setup**
```bash
cd api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database and API credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000

**3. Frontend Setup**
```bash
cd ui

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

---

## 🌐 Deployment

### Production Deployment (AWS EC2)

The application is deployed on AWS EC2 with systemd services.

**Server Details:**
- **IP**: 3.109.70.144
- **Frontend**: http://3.109.70.144:5173
- **Backend**: http://3.109.70.144:8000

**Quick Deploy:**
```bash
# Use the automated deployment script
./deploy.sh "Your commit message"
```

**Manual Deploy:**
```bash
# 1. Push to GitHub
git add .
git commit -m "Your changes"
git push origin main

# 2. SSH to EC2
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144

# 3. Pull and restart
cd bisdom_dev
git pull origin main
sudo systemctl restart bisdom-api.service bisdom-ui.service
```

📚 **Full deployment guide**: See [`ai_context/DEPLOYMENT.md`](ai_context/DEPLOYMENT.md)

---

## 📁 Project Structure

```
bisdom/
├── api/                      # Backend (FastAPI)
│   ├── app/
│   │   ├── main.py          # Application entry point
│   │   ├── api/v1/          # API endpoints
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── agents/          # AI agent logic
│   │   ├── services/        # Business logic
│   │   └── core/            # Config, security
│   ├── .env                 # Environment variables
│   └── requirements.txt     # Python dependencies
│
├── ui/                       # Frontend (React)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api/             # API clients
│   │   ├── store/           # Zustand state management
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
│
├── ai_context/              # 🤖 AI Assistant Memory
│   ├── README.md            # How to use this folder
│   ├── INDEX.md             # Quick navigation
│   ├── PROJECT_STATUS.md    # Current status
│   ├── ARCHITECTURE.md      # System architecture
│   ├── DEPLOYMENT.md        # Deployment guide ⭐
│   ├── TECH_STACK.md        # Technologies used
│   ├── BUGS.md              # Known issues
│   └── TASKS.md             # To-do list
│
├── deploy.sh                # 🚀 Automated deployment script
└── README.md                # This file
```

---

## 🧠 AI Context Folder

The `ai_context/` folder contains comprehensive project documentation optimized for AI assistants:

- **PROJECT_STATUS.md** - What's working, what's not, what's next
- **ARCHITECTURE.md** - Technical architecture and system design
- **DEPLOYMENT.md** - Deployment workflow and server configuration ⭐
- **BUGS.md** - Tracked bugs with priority and fixes
- **TASKS.md** - Prioritized task list and roadmap
- **TECH_STACK.md** - Complete technology stack documentation

👉 **Start here**: [`ai_context/README.md`](ai_context/README.md)

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2** - UI framework
- **Vite 8.0** - Build tool
- **Tailwind CSS 3.4** - Styling
- **Zustand 5.0** - State management
- **React Router 7.14** - Routing
- **Axios 1.15** - HTTP client

### Backend
- **FastAPI 0.115** - Web framework
- **SQLAlchemy 2.0** - ORM (async)
- **PostgreSQL** - Database
- **Uvicorn** - ASGI server
- **Pydantic 2.10** - Data validation
- **Alembic 1.14** - Database migrations

### AI & External Services
- **AWS Bedrock** - AI model hosting
- **Qwen3-VL-235B** - AI model
- **GST API** - Business verification
- **AWS RDS** - Managed PostgreSQL

📚 **Full stack details**: See [`ai_context/TECH_STACK.md`](ai_context/TECH_STACK.md)

---

## 🏗️ Architecture

### High-Level Flow

```
User → React UI → FastAPI Backend → PostgreSQL + AWS Bedrock AI
                        ↓
                  Matching Service
                        ↓
              AI Buyer & Supplier Agents
                        ↓
                  Deal Confirmation
```

### Key Components

1. **Authentication** - Phone + OTP with JWT tokens
2. **Onboarding** - GSTIN verification and profile building
3. **Requirement Agent** - AI-powered requirement enrichment
4. **Matching Service** - Multi-factor supplier matching (product, location, pricing, MOQ, lead time)
5. **Negotiation Agents** - Automated buyer-supplier negotiations
6. **Admin Panel** - Real-time monitoring and analytics

📚 **Full architecture**: See [`ai_context/ARCHITECTURE.md`](ai_context/ARCHITECTURE.md)

---

## 🔐 Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
SYNC_DATABASE_URL=postgresql://user:pass@host:5432/dbname

# AWS Bedrock
AWS_BEARER_TOKEN_BEDROCK=your_token
BEDROCK_MODEL_ID=qwen.qwen3-vl-235b-a22b
BEDROCK_API_BASE=https://bedrock.us-east-1.amazonaws.com

# GST API
GST_API_BASE_URL=https://sheet.gstincheck.co.in/check
GST_API_KEY=your_key

# Authentication
SECRET_KEY=your_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Development
DEBUG=true
STATIC_OTP=123456  # Remove in production

# CORS
ALLOWED_ORIGINS=["http://localhost:5173"]
```

---

## 🔄 Update Workflow

### Using Deployment Script (Recommended)

```bash
# Make changes, test locally
# Then deploy:
./deploy.sh "Fixed bug in matching service"
```

The script will:
1. ✅ Commit your changes
2. ✅ Push to GitHub
3. ✅ SSH to EC2
4. ✅ Pull latest code
5. ✅ Update dependencies (optional)
6. ✅ Restart services
7. ✅ Verify deployment

### Manual Workflow

```bash
# Local: commit and push
git add .
git commit -m "Your changes"
git push origin main

# EC2: pull and restart
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144
cd bisdom_dev
git pull origin main
sudo systemctl restart bisdom-api.service bisdom-ui.service
```

📚 **Detailed workflow**: See [`ai_context/DEPLOYMENT.md`](ai_context/DEPLOYMENT.md)

---

## 📊 Project Status

**Overall Health**: 🟢 Good (7.3/10)  
**Features Complete**: 80%  
**Tests Coverage**: 0% ❌  
**Production Ready**: No ⚠️  

### Working Features
✅ Phone authentication with OTP  
✅ GSTIN-based onboarding  
✅ AI requirement enrichment  
✅ Supplier matching  
✅ AI-powered negotiations  
✅ Admin dashboard  
✅ Profile management  

### Known Issues
🐛 Admin password security (P1)  
🐛 Open CORS policy (P1)  
🐛 Matching service edge cases (P2)  
🐛 No rate limiting (P2)  

### Next Priorities
1. 🔄 End-to-end testing (In Progress)
2. 🔴 Fix security issues
3. 🔴 Production hardening
4. 🟡 Add monitoring

📚 **Full status**: See [`ai_context/PROJECT_STATUS.md`](ai_context/PROJECT_STATUS.md)

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check status
sudo systemctl status bisdom-api.service bisdom-ui.service

# View logs
sudo journalctl -u bisdom-api.service -f
sudo journalctl -u bisdom-ui.service -f
```

### Database Connection Issues

```bash
# Check .env configuration
cat api/.env | grep DATABASE_URL

# Test connection
cd api
python3 -c "import asyncpg; print('OK')"
```

### Git Pull Conflicts

```bash
# Stash local changes
git stash
git pull origin main
git stash pop

# Or reset (WARNING: loses local changes)
git reset --hard origin/main
```

📚 **Full troubleshooting guide**: See [`ai_context/DEPLOYMENT.md#troubleshooting`](ai_context/DEPLOYMENT.md#troubleshooting)

---

## 📝 Documentation

### For Developers
- [`ai_context/ARCHITECTURE.md`](ai_context/ARCHITECTURE.md) - System architecture
- [`ai_context/TECH_STACK.md`](ai_context/TECH_STACK.md) - Technology stack
- [`api/README.md`](api/README.md) - Backend documentation
- [`ui/README.md`](ui/README.md) - Frontend documentation

### For DevOps
- [`ai_context/DEPLOYMENT.md`](ai_context/DEPLOYMENT.md) - Deployment guide ⭐
- [`deploy.sh`](deploy.sh) - Automated deployment script

### For Project Managers
- [`ai_context/PROJECT_STATUS.md`](ai_context/PROJECT_STATUS.md) - Current status
- [`ai_context/TASKS.md`](ai_context/TASKS.md) - Task list and roadmap
- [`ai_context/BUGS.md`](ai_context/BUGS.md) - Known issues

### For AI Assistants
- [`ai_context/README.md`](ai_context/README.md) - How to use AI context
- [`ai_context/INDEX.md`](ai_context/INDEX.md) - Quick navigation

---

## 🔒 Security

⚠️ **Current deployment is in development mode on a production server**

### Critical Security Issues

1. ❌ **Debug mode enabled** - `DEBUG=true` exposes stack traces
2. ❌ **Open CORS policy** - `ALLOWED_ORIGINS=["*"]` allows any origin
3. ❌ **Static OTP** - All users can login with `123456`
4. ❌ **No HTTPS** - Unencrypted traffic
5. ❌ **Weak admin auth** - Time-based password system
6. ❌ **No rate limiting** - API can be abused
7. ❌ **Plain text secrets** - Credentials in .env file

### Production Checklist

- [ ] Add nginx reverse proxy
- [ ] Enable HTTPS with SSL certificate
- [ ] Set `DEBUG=false`
- [ ] Fix CORS policy to specific domains
- [ ] Implement real OTP service (SMS/email)
- [ ] Add proper admin authentication
- [ ] Use AWS Secrets Manager for credentials
- [ ] Add rate limiting
- [ ] Configure firewall (ufw)
- [ ] Update AWS Security Groups
- [ ] Set up monitoring and alerts

📚 **Full security guide**: See [`ai_context/DEPLOYMENT.md#security`](ai_context/DEPLOYMENT.md#security-considerations)

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request
6. After merge, deploy: `./deploy.sh "Deployed feature X"`

### Code Standards

- **Backend**: Follow PEP 8, use type hints, async/await
- **Frontend**: Follow React best practices, use functional components
- **Commit Messages**: Use clear, descriptive messages
- **Testing**: Write tests for new features (when test suite is ready)

---

## 📞 Support

### Useful Commands

```bash
# SSH to server
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144

# View logs
sudo journalctl -u bisdom-api.service -f
sudo journalctl -u bisdom-ui.service -f

# Restart services
sudo systemctl restart bisdom-api.service bisdom-ui.service

# Check status
systemctl status bisdom-api.service bisdom-ui.service
```

### Access URLs

- **Frontend**: http://3.109.70.144:5173
- **Backend API**: http://3.109.70.144:8000
- **API Docs**: http://3.109.70.144:8000/docs
- **GitHub**: https://github.com/SSAKTHITSELVAN/bisdom_dev

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

**Maintained by**: Bisdom Development Team  
**Last Updated**: 2026-05-19

---

## 🎯 Quick Links

| Resource | Link |
|----------|------|
| 🚀 Deployment Guide | [ai_context/DEPLOYMENT.md](ai_context/DEPLOYMENT.md) |
| 🏗️ Architecture | [ai_context/ARCHITECTURE.md](ai_context/ARCHITECTURE.md) |
| 📊 Project Status | [ai_context/PROJECT_STATUS.md](ai_context/PROJECT_STATUS.md) |
| 🐛 Known Issues | [ai_context/BUGS.md](ai_context/BUGS.md) |
| ✅ Task List | [ai_context/TASKS.md](ai_context/TASKS.md) |
| 💻 Tech Stack | [ai_context/TECH_STACK.md](ai_context/TECH_STACK.md) |
| 🤖 AI Context | [ai_context/README.md](ai_context/README.md) |

---

**🚀 Ready to deploy?** Run `./deploy.sh "Your commit message"`

**🤖 AI Assistant?** Start with [`ai_context/README.md`](ai_context/README.md)

**👨‍💻 New Developer?** Read [`ai_context/PROJECT_STATUS.md`](ai_context/PROJECT_STATUS.md) first
