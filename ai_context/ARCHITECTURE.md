# Bisdom - System Architecture

**Last Updated**: 2026-06-01

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
│  │   Auth &    │  │  Requirement │  │  Card Flow │                │
│  │ Onboarding  │  │  Management  │  │  Endpoints │                │
│  └─────────────┘  └──────────────┘  └────────────┘                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐                │
│  │   Matching  │  │  Deal Chat   │  │   Admin    │                │
│  │   Service   │  │  (Human↔Human│  │   Panel    │                │
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
          │   │ SupplierCardQA  │   │    │ (Validation) │
          │   │ Conversations   │   │    └──────────────┘
          │   │ Deals           │   │
          │   └─────────────────┘   │
          └─────────────────────────┘
```

---

## 📦 Component Breakdown

### 1. Frontend (React SPA)

#### Tech Stack
- React 19.2.5, Vite 8.0.10, Tailwind CSS 3.4.19
- React Router DOM 7.14.2, Zustand 5.0.12, Axios 1.15.2
- React Hot Toast, Lucide React

#### Structure
```
ui/src/
├── api/
│   ├── cards.js           # NEW — all card flow API calls
│   ├── auth.js, client.js, config.js, conversations.js
│   ├── leads.js, requirements.js, onboarding.js, ...
│
├── components/workspace/
│   ├── SupplierLeadsPanel.jsx  # NEW — supplier card view + Q&A
│   ├── BuyerCardsView.jsx      # NEW — side-by-side card comparison
│   ├── DealChat.jsx            # NEW — human-to-human post-selection chat
│   ├── ActionsPanel.jsx        # UPDATED — new action types
│   ├── Sidebar.jsx             # UPDATED — card_status grouping
│   ├── RequirementOverview.jsx # UPDATED — Cards tab added
│   ├── MainPanel.jsx           # UPDATED — routes lead/deal_chat views
│   ├── NewRequirementChat.jsx, ProfileEditorFixed.jsx, SettingsPanel.jsx
│   └── WelcomeScreen.jsx, GeneralReqChat.jsx, ConversationView.jsx
│
├── store/
│   ├── workspaceStore.js   # UPDATED — goLead, goDealChat actions added
│   ├── authStore.js
│   └── appStore.js
│
└── App.jsx, main.jsx
```

#### Routes
```
/ → LandingPage
/login → LandingPage
/login-chat → ConversationalLogin
/onboarding → OnboardingPage
/workspace → WorkspaceLayout (hash-based sub-routing)
  #/              → WelcomeScreen
  #/new           → NewRequirementChat
  #/req/{id}      → RequirementOverview (Buyer: Cards tab + All Leads tab)
  #/req/{id}/general → GeneralReqChat
  #/lead/{id}     → SupplierLeadsPanel (Supplier: card + Q&A)
  #/deal/{id}     → DealChat (post-selection human chat)
  #/profile       → ProfileEditorFixed
  #/settings      → SettingsPanel
/admin/* → AdminLayout
```

#### State (Zustand)
```javascript
// workspaceStore
{
  route: { view, reqId, leadId, convId },
  goWelcome, goNewReq, goRequirement, goGeneralChat,
  goLead(leadId),         // NEW — supplier lead view
  goDealChat(leadId, convId), // NEW — post-selection deal chat
  goProfile, goSettings,
  sidebarTab: 'buying'|'selling',
  expandedRequirements: {},
  refreshKey, triggerRefresh,
}
```

---

### 2. Backend (FastAPI)

#### Structure
```
api/app/
├── main.py                # Rate limiter + global error handlers
├── core/
│   ├── limiter.py         # NEW — shared slowapi Limiter instance
│   ├── config.py, security.py, dependencies.py
│
├── models/
│   ├── card_qa.py         # NEW — SupplierCardQA table
│   ├── lead.py            # UPDATED — supplier_card, card_status fields
│   ├── user.py, profile.py, requirement.py
│   ├── conversation.py, deal.py, user_config.py
│
├── schemas/
│   └── conversation.py    # UPDATED — SupplierCardOut, CardQAOut, CardQARequest,
│                          #           BuyerSelectRequest, DealCloseRequest,
│                          #           LeadOut updated (card fields, old negotiation fields removed)
│
├── api/v1/endpoints/
│   ├── cards.py           # NEW — entire card flow (12 endpoints)
│   ├── conversations.py   # REPLACED — now a minimal stub (old negotiation loop removed)
│   ├── auth.py            # UPDATED — rate limited (5/min)
│   ├── requirements.py, leads.py, onboarding.py, config.py
│   ├── admin.py, dashboard.py, profile.py, preprocessing.py
│
├── agents/
│   ├── card_agent.py      # NEW — single-shot card generation + Q&A auto-answer
│   ├── requirement_agent.py, profile_agent.py
│   ├── supplier_agent.py, buyer_agent.py  # kept but no longer called in main flow
│   └── bedrock_client.py, config_agent.py
│
└── services/
    ├── matching_service.py    # unchanged
    ├── efficient_matching.py  # unchanged
    └── otp_service.py, gst_service.py
```

---

### 3. Card Flow — New Core Flow

#### What replaced the negotiation loop
**Old**: `_initiate_seller_conversation()` → supplier AI opens → buyer AI responds → 20-round loop

**New**: After matching, leads are created with `card_status=pending`. No AI runs automatically.
The supplier triggers card generation manually → one AI call → structured card saved.

#### card_agent.py — two functions
```python
async def generate_supplier_card(requirement, supplier_profile, profile_md, seller_settings_md) -> dict
# Single Bedrock call → returns {price_estimate, price_unit, lead_time_days,
#   payment_terms, moq, certifications, key_strengths, ai_verdict, raw_message}
# Never raises — returns safe defaults on failure

async def answer_qa_question(question, requirement, buyer_profile_md) -> str
# Single Bedrock call → answers supplier's clarification question
# Returns "The buyer will need to confirm this directly." when uncertain
```

#### Lead status lifecycle
```
new
└─► card_generating  (supplier clicked Generate Card, AI running)
      └─► card_draft     (AI card ready, supplier reviewing)
            └─► card_qa      (supplier asked Q&A question)
                  └─► card_submitted  (supplier submitted formal offer)
                        ├─► selected    (buyer selected this supplier)
                        │     └─► deal_open   (deal chat active)
                        │           └─► deal_closed
                        └─► rejected   (buyer selected someone else)
```

#### SupplierCardQA model
```python
supplier_card_qa table:
  id, lead_id, question, asked_by (supplier),
  answer, answered_by (buyer or None), answered_by_ai,
  status (open|answered), created_at, answered_at
```

---

### 4. Database Schema (Updated)

**Lead — new fields**:
```python
supplier_card      = Column(JSON)          # AI-generated card dict
card_status        = Column(String(50))    # pending|generating|draft|qa_open|submitted|selected|rejected
card_submitted_at  = Column(DateTime)
card_selected_at   = Column(DateTime)
```

**Lead — removed fields** (still in DB, no longer used):
- `max_negotiation_rounds`, `ai_paused_for_buyer`, `ai_paused_for_supplier`
- `buyer_chat_enabled`, `supplier_chat_enabled`

**New table**: `supplier_card_qa` — see model above.

---

### 5. AI Agent System (Updated)

**Active agents**:
| Agent | Purpose | Called by |
|-------|---------|-----------|
| `requirement_agent.py` | Enrich buyer requirement | `/requirements/chat` |
| `card_agent.py` | Generate supplier card (single-shot) | `/cards/leads/{id}/generate-card` (background) |
| `card_agent.py` | Auto-answer Q&A questions | `/cards/leads/{id}/qa` (background) |
| `profile_agent.py` | Extract profile from URLs | `/onboarding/submit` |
| `config_agent.py` | Build system prompts | Used internally |

**No longer called in main flow**:
- `supplier_agent.py` — was the negotiation loop opener
- `buyer_agent.py` — was the negotiation loop responder

---

### 6. Rate Limiting

**Library**: `slowapi` (installed in `billion` venv)
**Config**: `api/app/core/limiter.py`
**Applied to**:

| Endpoint group | Limit |
|---------------|-------|
| `/auth/send-otp`, `/auth/verify-otp` | 5/minute |
| `/cards/leads/{id}/generate-card` | 5/minute |
| `/cards/leads/{id}/qa` | 20/minute |
| `/cards/leads/{id}/submit-card` | 10/minute |
| `/cards/requirements/{id}/select` | 10/minute |
| `/cards/deal/close` | 10/minute |
| `/cards/conversations/{id}/send` | 30/minute |

---

### 7. External Integrations

Same as before:
- **AWS Bedrock**: Qwen3-VL-235B — now used only for card_agent + requirement_agent
- **GST API**: GSTIN verification at onboarding
- **PostgreSQL RDS**: ap-south-1

---

## 🔄 Data Flow

### Requirement Posting Flow (unchanged)
```
User describes requirement → requirement_agent enriches →
User confirms → matching service runs → Lead records created (card_status=pending)
```

### Card Flow (NEW — replaces negotiation)
```
Supplier sees new lead → clicks Generate Card →
  card_agent.py (one AI call) → supplier_card JSON saved → card_status=draft

Supplier reviews card → asks Q&A (optional) →
  card_agent.answer_qa_question (AI auto-answer) or buyer answers manually →
  card_status=qa_open → all answered → supplier submits → card_status=submitted

Buyer opens RequirementOverview → Supplier Cards tab →
  BuyerCardsView shows submitted cards sorted by fit score →
  Buyer picks one → selectSupplier() →
  Selected lead: card_status=selected, status=deal_open →
  Other leads: card_status=rejected →
  Conversation record created (mode=deal_chat)

Human-to-human chat →
  Buyer sends messages → Supplier replies →
  Buyer confirms → closeDeal() → Deal record created → status=deal_closed
```

### Actions polling
```
Frontend polls GET /cards/actions-needed every 30s →
Returns: generate_card | card_ready | qa_pending | submit_card
ActionsPanel shows badge count + action cards
```

---

## 🔒 Security

- Auth: Phone OTP + JWT (7-day expiry, localStorage)
- Rate limiting: slowapi on all sensitive endpoints ✅
- CORS: still `allow_origins=["*"]` — **must restrict before production** (BUG-002)
- Admin: time-based HHMM password — **must replace before production** (BUG-001)

---

## 🎯 Architecture Strengths

1. ✅ Single-shot AI card (no expensive multi-round loops)
2. ✅ Clean lead lifecycle with explicit card_status states
3. ✅ Human decisions at the right moments (review card, select supplier)
4. ✅ AI handles Q&A automatically for standard questions
5. ✅ Rate limiting on all mutation endpoints
6. ✅ Async throughout, modular agent system

## ⚠️ Architecture Weaknesses

1. ❌ No caching layer (Redis)
2. ❌ No message queue (Celery)
3. ❌ Single DB instance
4. ❌ No structured logging
5. ❌ JWT in localStorage (XSS risk)
6. ❌ Weak admin auth
