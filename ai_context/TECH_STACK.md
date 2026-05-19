# Bisdom - Technology Stack

**Last Updated**: 2026-05-19

---

## 🎯 Stack Overview

Bisdom is built using a modern, scalable tech stack optimized for AI-powered B2B commerce.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  React 19 + Vite + Tailwind CSS + Zustand              │
└─────────────────────────────────────────────────────────┘
                           │
                    REST API (JSON)
                           │
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
│  FastAPI + Python 3.11+ (AsyncIO)                      │
└─────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ PostgreSQL  │    │ AWS Bedrock  │    │   GST API   │
│   (RDS)     │    │   (AI)       │    │  (External) │
└─────────────┘    └──────────────┘    └─────────────┘
```

---

## 💻 Frontend Stack

### Core Framework
**React 19.2.5**
- **Why**: Latest React with improved performance
- **Features Used**: 
  - Hooks (useState, useEffect, useMemo)
  - Context API (minimal)
  - React Router DOM for navigation
- **Strengths**: Component reusability, virtual DOM, huge ecosystem
- **Considerations**: No TypeScript (could improve type safety)

### Build Tool
**Vite 8.0.10**
- **Why**: Lightning-fast HMR, optimized builds
- **Build Time**: 905ms (excellent)
- **Bundle Size**: 411.96 kB (good)
- **Features**:
  - ESM-based dev server
  - Automatic code splitting
  - CSS preprocessing (PostCSS)

### Styling
**Tailwind CSS 3.4.19**
- **Why**: Utility-first, rapid development
- **Configuration**: Custom design system
- **Strengths**: 
  - No CSS file bloat
  - Consistent design
  - Responsive out-of-the-box
- **Bundle**: Tree-shaken (only used classes)

### State Management
**Zustand 5.0.12**
- **Why**: Lightweight (1.2 kB), simple API
- **Stores**: 
  - `authStore` - Authentication state
  - `workspaceStore` - Navigation & UI state
  - `appStore` - Global app state
- **Alternative Considered**: Redux (too heavy), Context API (prop drilling)

### HTTP Client
**Axios 1.15.2**
- **Why**: Interceptors, automatic transforms, better error handling
- **Base Configuration**: `/ui/src/api/client.js`
- **Features Used**:
  - Request/response interceptors
  - Token injection
  - Error handling

### UI Components
**Lucide React 1.14.0**
- **Why**: Modern icon library, tree-shakeable
- **Icons Used**: 50+ icons
- **Bundle Impact**: Only used icons included

**React Hot Toast 2.6.0**
- **Why**: Simple, customizable notifications
- **Style**: Custom styled for Bisdom theme

### Routing
**React Router DOM 7.14.2**
- **Why**: De facto standard for React routing
- **Features Used**:
  - Nested routes
  - Protected routes
  - Dynamic params
  - Navigation hooks

---

## ⚙️ Backend Stack

### Framework
**FastAPI 0.115.5+**
- **Why**: High performance, automatic API docs, type hints
- **Performance**: Async/await throughout
- **Features Used**:
  - Automatic OpenAPI docs
  - Pydantic validation
  - Dependency injection
  - Background tasks
  - CORS middleware
- **Strengths**: Fast (on par with Node.js), modern, production-ready

### Language
**Python 3.11+**
- **Why**: Async improvements, performance gains
- **Features Used**:
  - Type hints
  - Async/await
  - Dataclasses
  - f-strings

### ORM
**SQLAlchemy 2.0.36+**
- **Why**: Industry standard, async support
- **Features Used**:
  - Async sessions
  - Declarative models
  - Relationships
  - Query builder
- **Strengths**: Prevents SQL injection, easy migrations

### Database Driver
**asyncpg 0.30.0**
- **Why**: Fastest PostgreSQL driver for Python
- **Performance**: 3x faster than psycopg2
- **Async**: Native async support

### Migrations
**Alembic 1.14.0**
- **Why**: Standard for SQLAlchemy migrations
- **Status**: Configured but not actively used yet
- **Commands**:
  ```bash
  alembic revision --autogenerate -m "message"
  alembic upgrade head
  alembic downgrade -1
  ```

### Validation
**Pydantic 2.10.3+**
- **Why**: Runtime type checking, automatic validation
- **Usage**: Request/response schemas
- **Features**:
  - Data validation
  - JSON serialization
  - Settings management

### Authentication
**python-jose 3.3.0**
- **Why**: JWT encoding/decoding
- **Algorithm**: HS256
- **Token Expiry**: 7 days

**passlib 1.7.4**
- **Why**: Password hashing (if needed in future)
- **Algorithm**: bcrypt

### HTTP Clients
**httpx 0.28.1**
- **Why**: Async HTTP client
- **Usage**: GST API calls

**aiohttp 3.11.10**
- **Why**: Async HTTP/WebSocket client
- **Usage**: External API calls, web scraping

### HTML Parsing
**BeautifulSoup4 4.12.3**
- **Why**: HTML parsing for profile extraction
- **Usage**: Parse IndiaMART, company websites

### Environment Management
**python-dotenv 1.0.1**
- **Why**: Load .env variables
- **Usage**: Configuration management

---

## 🤖 AI Stack

### Model Provider
**AWS Bedrock**
- **Why**: Managed AI models, no infrastructure
- **Region**: us-east-1
- **Authentication**: Bearer token

### AI Model
**Qwen3-VL-235B (qwen.qwen3-vl-235b-a22b)**
- **Provider**: Alibaba Cloud (via AWS Bedrock)
- **Parameters**: 235 billion
- **Capabilities**:
  - Text generation
  - Vision (images)
  - Long context (32K tokens)
  - Multilingual (English, Chinese, Hindi, etc.)
- **Why Chosen**: 
  - Cost-effective
  - Good performance on business tasks
  - Multilingual support for Indian languages

### Prompt Engineering
**Custom Prompts**
- **Location**: `api/app/agents/*_agent.py`
- **Strategy**: 
  - Role-based prompts
  - Structured output (JSON)
  - One-shot learning
  - Context injection (user settings)

### AI Agent System
**Custom Implementation**
- **Agents**:
  - Requirement Agent (enrichment)
  - Supplier Agent (offer generation)
  - Buyer Agent (negotiation)
  - Profile Agent (data extraction)
  - Config Agent (prompt building)
- **Communication**: Sequential (not parallel)
- **State**: Stored in database

---

## 🗄️ Database Stack

### Primary Database
**PostgreSQL 14+ (AWS RDS)**
- **Why**: ACID compliance, JSON support, full-text search
- **Instance**: AWS RDS (ap-south-1)
- **Connection**: asyncpg (connection pooling)
- **Features Used**:
  - JSON columns
  - Foreign keys
  - Indexes
  - Full-text search (potential)

### Schema
**9 Tables**:
1. `users` - Authentication
2. `agentic_profiles` - Business profiles
3. `user_configs` - Markdown settings
4. `requirements` - Buyer needs
5. `leads` - Matches
6. `conversations` - Negotiation threads
7. `messages` - Individual messages
8. `deals` - Confirmed agreements
9. `requirement_chats` - (legacy/unused?)

### Future Considerations
**Redis** (Not yet implemented)
- Use case: Caching, sessions, pub/sub
- Why needed: Performance, scalability

---

## 🔌 External Services

### GST Verification API
**Provider**: gstincheck.co.in
- **Purpose**: GSTIN validation
- **Method**: REST API
- **Authentication**: API key
- **Rate Limit**: Unknown
- **Response Time**: ~1-2 seconds

### AWS RDS
**Service**: Managed PostgreSQL
- **Region**: ap-south-1 (Mumbai)
- **Why**: Managed backups, high availability
- **SSL**: Enabled

---

## 🛠️ Development Tools

### Package Managers
**Frontend**: npm
- **Version**: Latest
- **Lock**: package-lock.json

**Backend**: pip
- **Version**: Latest
- **Requirements**: requirements.txt

### Version Control
**Git**
- **Platform**: GitHub (assumed)
- **Branching**: main branch
- **Commits**: Conventional commits (not enforced)

### Code Quality
**ESLint** (Frontend)
- **Config**: eslint.config.js
- **Rules**: React recommended + custom

**No Linter** (Backend)
- **Recommendation**: Add Black, flake8, mypy

### Environment
**.env Files**
- **Location**: `/api/.env`
- **Management**: Manual (not in version control)
- **Recommendation**: Add .env.example

---

## 📦 Dependency Management

### Frontend Dependencies (7)
```json
{
  "axios": "^1.15.2",           // HTTP client
  "lucide-react": "^1.14.0",    // Icons
  "react": "^19.2.5",           // Framework
  "react-dom": "^19.2.5",       // DOM bindings
  "react-hot-toast": "^2.6.0",  // Notifications
  "react-router-dom": "^7.14.2", // Routing
  "zustand": "^5.0.12"          // State management
}
```

### Frontend Dev Dependencies (11)
```json
{
  "@eslint/js": "^10.0.1",
  "@types/react": "^19.2.14",
  "@types/react-dom": "^19.2.3",
  "@vitejs/plugin-react": "^6.0.1",
  "autoprefixer": "^10.5.0",
  "eslint": "^10.2.1",
  "eslint-plugin-react-hooks": "^7.1.1",
  "eslint-plugin-react-refresh": "^0.5.2",
  "globals": "^17.5.0",
  "postcss": "^8.5.12",
  "tailwindcss": "^3.4.19",
  "vite": "^8.0.10"
}
```

### Backend Dependencies (15)
```
fastapi>=0.115.5              # Framework
uvicorn[standard]>=0.32.1     # ASGI server
sqlalchemy>=2.0.36            # ORM
alembic>=1.14.0               # Migrations
asyncpg>=0.30.0               # DB driver
pydantic>=2.10.3              # Validation
pydantic-settings>=2.6.1      # Settings
python-jose[cryptography]>=3.3.0  # JWT
passlib[bcrypt]>=1.7.4        # Password hashing
python-multipart>=0.0.20      # File uploads
httpx>=0.28.1                 # HTTP client
aiohttp>=3.11.10              # Async HTTP
beautifulsoup4>=4.12.3        # HTML parsing
python-dotenv>=1.0.1          # Env vars
websockets>=14.1              # WebSocket support
```

### Total Bundle Sizes
- **Frontend**: 411.96 kB (gzipped: ~120 kB)
- **Backend**: ~50 MB (with dependencies)

---

## 🚀 Deployment Stack

### Current (Development)
- **Frontend**: Vite dev server (port 5173)
- **Backend**: Uvicorn dev server (port 8000)
- **Database**: AWS RDS (production database)

### Recommended (Production)

**Frontend**:
- **CDN**: Cloudflare / AWS CloudFront
- **Hosting**: Vercel / Netlify / AWS S3
- **Build**: `npm run build`

**Backend**:
- **Server**: AWS EC2 / ECS / Lambda
- **WSGI**: Gunicorn + Uvicorn workers
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt / AWS ACM

**Database**:
- **Current**: AWS RDS (good)
- **Backups**: Automated daily
- **Replicas**: Read replicas for scaling

**Caching**: Redis (ElastiCache)

**Load Balancer**: AWS ALB

**Monitoring**:
- **Metrics**: Prometheus + Grafana
- **Errors**: Sentry
- **Logs**: CloudWatch / ELK

---

## 📊 Stack Comparison

### Why FastAPI over Flask/Django?
| Feature | FastAPI | Flask | Django |
|---------|---------|-------|--------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Async Support | ✅ Native | ❌ Limited | ❌ Limited |
| API Docs | ✅ Auto | ❌ Manual | ❌ Manual |
| Type Safety | ✅ Yes | ❌ No | ❌ No |
| Learning Curve | Medium | Easy | Hard |

### Why React over Vue/Angular?
| Feature | React | Vue | Angular |
|---------|-------|-----|---------|
| Popularity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Performance | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Ecosystem | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| TypeScript | ✅ | ✅ | ✅ Required |
| Learning Curve | Medium | Easy | Hard |

### Why PostgreSQL over MySQL/MongoDB?
| Feature | PostgreSQL | MySQL | MongoDB |
|---------|------------|-------|---------|
| JSON Support | ✅ Excellent | ⚠️ Limited | ✅ Native |
| ACID | ✅ Yes | ✅ Yes | ⚠️ Eventual |
| Full-Text Search | ✅ Yes | ✅ Yes | ✅ Yes |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Maturity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🔄 Potential Stack Changes

### Considered for Future

**TypeScript** (Frontend)
- **Pros**: Type safety, better IDE support
- **Cons**: Learning curve, migration effort
- **Decision**: Defer to Phase 2

**Redis** (Caching)
- **Pros**: Fast, scalable
- **Cons**: Additional infrastructure
- **Decision**: Add when needed (load testing)

**Celery** (Task Queue)
- **Pros**: Robust background tasks
- **Cons**: Complexity, Redis dependency
- **Decision**: Add for scaling

**Docker** (Containerization)
- **Pros**: Consistent environments
- **Cons**: Learning curve
- **Decision**: Add for production

**GraphQL** (API Layer)
- **Pros**: Flexible queries, less over-fetching
- **Cons**: Complexity, caching challenges
- **Decision**: Not needed currently

---

## 📚 Learning Resources

### Frontend
- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)

### Backend
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [SQLAlchemy](https://docs.sqlalchemy.org)
- [Pydantic](https://docs.pydantic.dev)

### AI
- [AWS Bedrock](https://aws.amazon.com/bedrock/)
- [Qwen Models](https://github.com/QwenLM/Qwen)

---

## 🎯 Stack Health Score

| Component | Score | Status |
|-----------|-------|--------|
| Frontend Framework | 9/10 | ✅ Excellent |
| Backend Framework | 10/10 | ✅ Excellent |
| Database | 9/10 | ✅ Excellent |
| AI Integration | 8/10 | ✅ Good |
| State Management | 9/10 | ✅ Excellent |
| Build Tools | 10/10 | ✅ Excellent |
| Security | 6/10 | ⚠️ Needs Improvement |
| Testing | 2/10 | ❌ Critical |
| Monitoring | 1/10 | ❌ Critical |

**Overall**: 7.3/10 - Good foundation, needs production hardening

---

## 📅 Technology Roadmap

### Phase 1 (Current)
- ✅ React + FastAPI foundation
- ✅ PostgreSQL + SQLAlchemy
- ✅ AWS Bedrock integration
- ⚠️ Basic security

### Phase 2 (Next 2 Months)
- Add TypeScript
- Add Redis caching
- Add Celery task queue
- Implement testing suite

### Phase 3 (Next 6 Months)
- Docker containerization
- CI/CD pipeline
- Multi-region deployment
- Advanced monitoring

---

## 🎉 Conclusion

Bisdom uses a modern, scalable tech stack optimized for:
- ⚡ Performance (async everywhere)
- 🤖 AI integration (AWS Bedrock)
- 🔒 Type safety (Pydantic)
- 🚀 Developer experience (Vite HMR)

**Strengths**: Solid foundation, modern choices, good performance

**To Improve**: Testing, monitoring, production security
