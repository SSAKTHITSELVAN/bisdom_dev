# Bisdom - System Architecture

**Last Updated**: 2026-05-19

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Interface                            │
│                    (React 19 + Vite + Tailwind)                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP/REST
┌──────────────────────────────┴──────────────────────────────────────┐
│                         FastAPI Backend                             │
│                     (Python 3.11+ / AsyncIO)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐                │
│  │   Auth &    │  │  Requirement │  │  AI Agent  │                │
│  │ Onboarding  │  │  Management  │  │  Services  │                │
│  └─────────────┘  └──────────────┘  └────────────┘                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐                │
│  │   Matching  │  │ Conversation │  │   Admin    │                │
│  │   Service   │  │    Engine    │  │   Panel    │                │
│  └─────────────┘  └──────────────┘  └────────────┘                │
└──────────────────────────┬──────────────────┬───────────────────────┘
                           │                  │
          ┌────────────────┴────────┐    ┌────┴─────────┐
          │   PostgreSQL (RDS)      │    │ AWS Bedrock  │
          │   ┌─────────────────┐   │    │  (Qwen3 AI)  │
          │   │ Users           │   │    └──────────────┘
          │   │ Profiles        │   │
          │   │ Requirements    │   │    ┌──────────────┐
          │   │ Leads           │   │    │   GST API    │
          │   │ Conversations   │   │    │ (Validation) │
          │   │ Deals           │   │    └──────────────┘
          │   └─────────────────┘   │
          └─────────────────────────┘
```

---

## 📦 Component Breakdown

### 1. Frontend (React SPA)

#### Tech Stack
- **Framework**: React 19.2.5
- **Build Tool**: Vite 8.0.10
- **Styling**: Tailwind CSS 3.4.19
- **Router**: React Router DOM 7.14.2
- **State**: Zustand 5.0.12
- **HTTP Client**: Axios 1.15.2
- **Notifications**: React Hot Toast 2.6.0
- **Icons**: Lucide React 1.14.0

#### Structure
```
ui/src/
├── api/                    # API clients
│   ├── admin.js           # Admin endpoints
│   ├── auth.js            # Authentication
│   ├── client.js          # Base axios instance
│   ├── config.js          # Configuration
│   ├── conversations.js   # Conversation endpoints
│   ├── dashboard.js       # Dashboard data
│   ├── leads.js           # Lead management
│   ├── onboarding.js      # Onboarding flow
│   ├── reqchat.js         # Requirement chat
│   ├── requirements.js    # Requirements CRUD
│   └── expiry.js          # Session management
│
├── components/            # React components
│   ├── admin/            # Admin panel (6 components)
│   ├── auth/             # Login/OTP (3 components)
│   ├── chat/             # Chat interface
│   ├── dashboard/        # Dashboard views
│   ├── home/             # Landing page
│   ├── leads/            # Leads management
│   ├── onboarding/       # Onboarding wizard
│   ├── profile/          # Profile pages
│   ├── ui/               # Reusable UI (Spinner, etc.)
│   └── workspace/        # Main workspace (10 components)
│
├── store/                # Zustand state management
│   ├── appStore.js       # App-level state
│   ├── authStore.js      # Auth state (user, token)
│   └── workspaceStore.js # Workspace navigation
│
├── App.jsx               # Root component with routes
└── main.jsx              # Entry point
```

#### Key Pages & Routes
```
/ → /workspace              # Main workspace
/login                      # Phone authentication
/verify-otp                 # OTP verification
/onboarding                 # Profile setup
/workspace/new              # New requirement
/workspace/requirement/:id  # Requirement detail
/workspace/chat/:leadId     # Conversation with supplier
/workspace/profile          # Edit profile
/workspace/settings         # Settings
/admin/login                # Admin login
/admin/dashboard            # Admin dashboard
/admin/requirements         # Admin requirements
/admin/users                # Admin users
/admin/map                  # Supplier map
```

#### State Management (Zustand)

**authStore**:
```javascript
{
  user: { id, phone, is_verified, onboarding_complete },
  token: "jwt_token",
  isAuthenticated: boolean,
  login, logout, checkAuth
}
```

**workspaceStore**:
```javascript
{
  activeView: "welcome|new|requirement|chat",
  selectedReqId, selectedLeadId,
  goWelcome, goNew, goRequirement, goChat,
  triggerRefresh, refreshKey
}
```

---

### 2. Backend (FastAPI)

#### Tech Stack
- **Framework**: FastAPI 0.115.5+
- **Server**: Uvicorn (ASGI)
- **ORM**: SQLAlchemy 2.0.36+ (Async)
- **Database Driver**: asyncpg 0.30.0
- **Migrations**: Alembic 1.14.0
- **Validation**: Pydantic 2.10.3+
- **Auth**: python-jose + passlib
- **HTTP Client**: httpx + aiohttp
- **Parsing**: BeautifulSoup4

#### Structure
```
api/app/
├── main.py                # FastAPI app initialization
├── core/                  # Core utilities
│   ├── config.py         # Settings (env vars)
│   ├── security.py       # JWT handling
│   └── dependencies.py   # Dependency injection
│
├── db/                   # Database setup
│   ├── base.py          # Session management
│   └── init_db.py       # Database initialization
│
├── models/              # SQLAlchemy models (9 models)
│   ├── user.py          # User model
│   ├── profile.py       # AgenticProfile
│   ├── user_config.py   # UserConfig (markdown storage)
│   ├── requirement.py   # Requirement
│   ├── lead.py          # Lead (match result)
│   ├── conversation.py  # Conversation + Message
│   ├── deal.py          # Deal
│   └── requirement_chat.py # RequirementChat
│
├── schemas/             # Pydantic schemas
│   ├── auth.py         # Login, OTP schemas
│   ├── onboarding.py   # Onboarding request/response
│   ├── requirement.py  # Requirement schemas
│   └── conversation.py # Conversation schemas
│
├── api/v1/             # API routes
│   ├── router.py       # Main router
│   └── endpoints/      # Endpoint modules
│       ├── auth.py              # /auth/*
│       ├── onboarding.py        # /onboarding/*
│       ├── requirements.py      # /requirements/*
│       ├── requirement_chat.py  # /requirement-chat/*
│       ├── conversations.py     # /conversations/*
│       ├── leads.py             # /leads/*
│       ├── dashboard.py         # /dashboard/*
│       ├── config.py            # /config/*
│       ├── admin.py             # /admin/*
│       └── expiry.py            # /expiry/*
│
├── agents/             # AI agent logic
│   ├── bedrock_client.py      # AWS Bedrock API
│   ├── requirement_agent.py   # Requirement enrichment
│   ├── supplier_agent.py      # Supplier negotiation
│   ├── buyer_agent.py         # Buyer negotiation
│   ├── profile_agent.py       # Profile extraction
│   └── config_agent.py        # System prompt builder
│
└── services/           # Business logic
    ├── matching_service.py    # Supplier matching
    ├── otp_service.py         # OTP generation
    └── gst_service.py         # GST API integration
```

#### API Endpoints Summary

**Authentication** (`/api/v1/auth/*`):
- `POST /send-otp` - Send OTP to phone
- `POST /verify-otp` - Verify OTP and get token

**Onboarding** (`/api/v1/onboarding/*`):
- `POST /start` - Start onboarding with GSTIN
- `POST /submit` - Submit profile with links

**Requirements** (`/api/v1/requirements/*`):
- `POST /chat` - Requirement enrichment chat
- `POST /confirm` - Confirm and post requirement
- `GET /` - List user's requirements
- `GET /{id}` - Get requirement details

**Conversations** (`/api/v1/conversations/*`):
- `GET /{leadId}` - Get conversation
- `GET /{leadId}/messages` - Get messages
- `POST /{leadId}/pause` - Pause AI
- `POST /{leadId}/resume` - Resume AI

**Admin** (`/api/v1/admin/*`):
- `POST /login` - Time-based auth
- `GET /stats` - Dashboard stats
- `GET /requirements` - All requirements
- `GET /requirements/{id}/matches` - Supplier matches
- `GET /users` - All users
- `GET /map-data` - Supplier locations

---

### 3. Database Schema

#### Entity Relationship Diagram
```
┌──────────────┐
│     User     │
│──────────────│
│ id (PK)      │
│ phone        │◄────────────┐
│ otp_code     │             │
│ is_verified  │             │
│ is_onboarded │             │
└──────────────┘             │
       │                     │
       │ 1                   │
       │                     │
       │ 1                   │
       ▼                     │
┌──────────────────┐         │
│ AgenticProfile   │         │
│──────────────────│         │
│ id (PK)          │         │
│ user_id (FK)     │─────────┘
│ gstin            │
│ trade_name       │
│ is_buyer         │
│ is_supplier      │
│ product_categories│
│ pricing_bands    │
│ reliability_score│
│ agent_config     │
└──────────────────┘
       │
       │ 1
       │
       │ 1
       ▼
┌──────────────────┐
│   UserConfig     │
│──────────────────│
│ id (PK)          │
│ user_id (FK)     │
│ profile_md       │  # Markdown profile
│ buyer_settings_md│  # Buyer AI config
│ seller_settings_md│ # Seller AI config
└──────────────────┘

┌──────────────────┐
│   Requirement    │
│──────────────────│
│ id (PK)          │
│ buyer_id (FK)    │───► User
│ product          │
│ quantity         │
│ budget_max       │
│ specifications   │
│ delivery_location│
│ enrichment_status│
│ structured_json  │
└──────────────────┘
       │
       │ 1
       │
       │ *
       ▼
┌──────────────────┐
│      Lead        │
│──────────────────│
│ id (PK)          │
│ requirement_id(FK)│
│ supplier_id (FK) │───► User
│ buyer_id (FK)    │───► User
│ match_score      │  # 0-100
│ status           │  # negotiating, deal_confirmed, etc.
│ negotiation_round│
│ current_offer_price│
└──────────────────┘
       │
       │ 1
       │
       │ 1
       ▼
┌──────────────────┐
│  Conversation    │
│──────────────────│
│ id (PK)          │
│ lead_id (FK)     │
│ buyer_id (FK)    │
│ supplier_id (FK) │
│ mode             │  # ai_negotiating, human_override
│ ai_context       │  # Conversation history
└──────────────────┘
       │
       │ 1
       │
       │ *
       ▼
┌──────────────────┐
│     Message      │
│──────────────────│
│ id (PK)          │
│ conversation_id(FK)│
│ role             │  # ai_buyer, ai_supplier, human
│ content          │
│ structured_data  │  # Extracted offers
│ created_at       │
└──────────────────┘

┌──────────────────┐
│      Deal        │
│──────────────────│
│ id (PK)          │
│ lead_id (FK)     │
│ buyer_id (FK)    │
│ supplier_id (FK) │
│ product          │
│ quantity         │
│ final_price      │
│ total_value      │
│ status           │  # pending, accepted, completed
│ confirmed_at     │
└──────────────────┘
```

#### Key Tables

**User**
- Basic auth info (phone, OTP)
- Verification status
- Onboarding completion

**AgenticProfile**
- GST details
- Business information
- AI-extracted capabilities
- Product categories, pricing, MOQ
- Reliability score
- Agent configuration

**UserConfig**
- Editable markdown profile
- Buyer AI settings
- Seller AI settings

**Requirement**
- Buyer's procurement need
- Enrichment status
- Structured JSON
- Conversation history

**Lead**
- Match between requirement and supplier
- Match score
- Negotiation status
- Current offer

**Conversation**
- AI negotiation thread
- Mode (AI or human override)
- Context for agents

**Message**
- Individual message
- Role (buyer AI, supplier AI, human)
- Structured offer data

**Deal**
- Confirmed agreement
- Final terms
- Status tracking

---

### 4. AI Agent System

#### Architecture
```
┌────────────────────────────────────────────────────────┐
│                   Agent Orchestration                  │
└────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│ Requirement   │  │  Supplier    │  │    Buyer     │
│    Agent      │  │    Agent     │  │    Agent     │
│               │  │              │  │              │
│ Enriches      │  │ Generates    │  │ Evaluates    │
│ requirements  │  │ offers       │  │ & responds   │
└───────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                ┌──────────────────┐
                │  Bedrock Client  │
                │                  │
                │  AWS Bedrock     │
                │  Qwen3-VL-235B   │
                └──────────────────┘
```

#### Agent Descriptions

**1. Requirement Agent** (`requirement_agent.py`)
- **Purpose**: Enrich buyer requirements through conversation
- **Input**: User's initial requirement message
- **Output**: Structured JSON with product, quantity, specs, etc.
- **Strategy**: Ask one question at a time, be flexible
- **Model**: Qwen3-VL-235B via AWS Bedrock

**2. Supplier Agent** (`supplier_agent.py`)
- **Purpose**: Generate supplier opening offers
- **Input**: Requirement + supplier profile + agent config
- **Output**: Opening message with offer details
- **Strategy**: Read seller settings, make competitive offer
- **Model**: Qwen3-VL-235B

**3. Buyer Agent** (`buyer_agent.py`)
- **Purpose**: Evaluate supplier offers and negotiate
- **Input**: Supplier message + requirement + buyer settings
- **Output**: Response (accept, counter, reject)
- **Strategy**: Read buyer settings, negotiate within budget
- **Model**: Qwen3-VL-235B

**4. Profile Agent** (`profile_agent.py`)
- **Purpose**: Extract business info from external links
- **Input**: URLs (IndiaMART, website, etc.)
- **Output**: Structured profile data
- **Strategy**: Scrape HTML, parse with AI
- **Model**: Qwen3-VL-235B

**5. Config Agent** (`config_agent.py`)
- **Purpose**: Build system prompts for agents
- **Input**: UserConfig markdown
- **Output**: Formatted system prompt
- **Strategy**: Template-based prompt engineering

#### Prompt Engineering

**System Prompt Structure**:
```
You are [Agent Role]

CONTEXT:
- User profile: [markdown]
- Agent settings: [markdown]

OBJECTIVE:
- [Specific goal]

RULES:
- [Constraints and guidelines]

OUTPUT FORMAT:
- [Expected structure]
```

**Example (Supplier Agent)**:
```
You are a seller agent representing {supplier_name}.

CONTEXT:
- Your products: {product_categories}
- Your pricing: {pricing_bands}
- Your MOQ: {moq}

BUYER REQUIREMENT:
- Product: {product}
- Quantity: {quantity}
- Budget: {budget_max}

OBJECTIVE:
Generate a competitive opening offer.

RULES:
- Stay within your price floors
- Respect your MOQ
- Be professional but persuasive

OUTPUT:
{
  "message": "...",
  "offer": { "price": 150, "quantity": 500, "lead_time": 15 }
}
```

---

### 5. Matching Algorithm

**Location**: `api/app/services/matching_service.py`

**Function**: `match_requirement_to_suppliers(requirement, db)`

**Algorithm**:
```python
def calculate_match_score(requirement, supplier_profile):
    # Product match (40%)
    product_score = fuzzy_match(
        requirement.product,
        supplier_profile.product_categories
    )
    
    # Location match (20%)
    location_score = proximity_score(
        requirement.delivery_location,
        supplier_profile.city, supplier_profile.state
    )
    
    # Pricing match (20%)
    pricing_score = price_compatibility(
        requirement.budget_max,
        supplier_profile.pricing_bands
    )
    
    # MOQ match (10%)
    moq_score = moq_compatibility(
        requirement.quantity,
        supplier_profile.min_order_quantities
    )
    
    # Lead time match (10%)
    leadtime_score = delivery_compatibility(
        requirement.delivery_days,
        supplier_profile.standard_lead_times
    )
    
    return (
        product_score * 0.4 +
        location_score * 0.2 +
        pricing_score * 0.2 +
        moq_score * 0.1 +
        leadtime_score * 0.1
    )
```

**Filters**:
1. `is_supplier == True`
2. `profile_build_status == "complete"`
3. Match score >= 30

**Output**: List of Lead objects sorted by match score

---

### 6. External Integrations

#### AWS Bedrock (AI Model)
- **Model**: qwen.qwen3-vl-235b-a22b
- **Authentication**: Bearer token
- **API**: HTTPS POST requests
- **Latency**: ~2-5 seconds per call
- **Cost**: Pay-per-token

#### GST API
- **Provider**: gstincheck.co.in
- **Purpose**: GSTIN verification
- **Authentication**: API key
- **Response**: Business details (name, address, status)

#### PostgreSQL RDS
- **Provider**: AWS RDS
- **Region**: ap-south-1 (Mumbai)
- **Instance**: (not specified, likely db.t3.micro)
- **SSL**: Enabled
- **Backups**: Not configured in code

---

## 🔄 Data Flow

### User Registration Flow
```
1. User enters phone → OTP sent (static 123456 in dev)
2. User enters OTP → Token generated
3. Redirect to onboarding
4. User enters GSTIN → GST API call → Validate
5. User provides external links → Profile agent scrapes
6. Profile saved → Onboarding complete
```

### Requirement Posting Flow
```
1. User describes requirement → Requirement agent enriches
2. AI asks follow-up questions → User responds
3. Requirement marked "enriched"
4. User confirms → Status = "matching"
5. Background task runs matching service
6. Leads created for top suppliers
7. Supplier AI initiates conversation
8. Buyer AI responds
9. Negotiation loop continues
10. Deal confirmed or timeout
```

### Admin Monitoring Flow
```
1. Admin gets current time (HHMM)
2. Admin enters password → Verified
3. Token stored in session
4. Admin views dashboard → Stats loaded
5. Admin expands requirement → Matches loaded
6. Admin views supplier details → Profile displayed
```

---

## 🔒 Security Architecture

### Authentication
- **Method**: Phone + OTP (JWT)
- **Token**: JWT with 7-day expiry
- **Storage**: localStorage (frontend)
- **Refresh**: Manual re-login

### Authorization
- **User Roles**: Buyer, Supplier, Both
- **Admin**: Time-based password (weak)
- **Middleware**: Dependency injection (`get_current_user`)

### Data Protection
- **Database**: SSL connections
- **API**: CORS configured (allow all in dev)
- **Secrets**: .env file (not secure for prod)

---

## 📊 Scalability Considerations

### Current Setup
- **Backend**: Single server (not load-balanced)
- **Database**: Single PostgreSQL instance
- **AI**: AWS Bedrock (auto-scales)

### Bottlenecks
1. **Database**: Single point of failure
2. **AI Calls**: Sequential (not batched)
3. **Session Storage**: In-memory (not distributed)

### Scaling Strategy (Future)
1. Horizontal scaling with load balancer
2. Database read replicas
3. Redis for session storage
4. Message queue for background tasks
5. CDN for static assets

---

## 📈 Monitoring Points

### Backend Metrics to Track
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- AI call latency
- Database query time
- Active connections

### Frontend Metrics to Track
- Page load time
- Time to interactive
- Bundle size
- API call failures
- User session duration

### Business Metrics
- User registrations
- Requirements posted
- Leads generated
- Deals confirmed
- Average negotiation rounds
- Conversion rate (leads → deals)

---

## 🎯 Architecture Strengths

1. ✅ Clean separation of concerns
2. ✅ Async/await throughout (good performance)
3. ✅ SQLAlchemy ORM (prevents SQL injection)
4. ✅ Pydantic validation (type safety)
5. ✅ Modular agent system
6. ✅ React component architecture

## ⚠️ Architecture Weaknesses

1. ❌ No caching layer
2. ❌ No message queue
3. ❌ Single database instance
4. ❌ No service mesh
5. ❌ Limited error handling
6. ❌ No circuit breakers
7. ❌ Time-based admin auth

---

## 🚀 Recommended Improvements

### Short Term
1. Add Redis for caching
2. Implement proper admin auth
3. Add request validation middleware
4. Set up structured logging

### Medium Term
5. Add Celery for background tasks
6. Implement database connection pooling
7. Add API versioning strategy
8. Set up error tracking (Sentry)

### Long Term
9. Microservices architecture
10. Event-driven architecture
11. GraphQL layer
12. Multi-region deployment
