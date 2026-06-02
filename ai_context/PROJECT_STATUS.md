# Bisdom Project - Current Status

**Last Updated**: 2026-06-01
**Status**: Active Development
**Version**: 1.1.0

---

## 🎯 Project Overview

**Bisdom** is an AI-powered B2B Commerce Platform for Indian SMEs. It uses a **Supplier Card Flow** (not negotiation loops) for buyer-supplier matching:

1. Buyer posts requirement → AI enriches via conversation
2. AI matches suppliers → Lead records created
3. AI generates a **Supplier Card** per lead (single-shot, no back-and-forth)
4. Supplier reviews card, asks Q&A questions if needed
5. Buyer/AI answers Q&A
6. Supplier submits card (formal offer)
7. Buyer compares submitted cards side-by-side → selects one supplier
8. Human-to-human deal chat opens → buyer closes deal

---

## ✅ What's Working

### 1. Authentication & Onboarding ✅
**Status**: Fully Functional

- Phone OTP auth, conversational login UI, GSTIN verification, profile creation
- Backend: `/api/v1/auth/send-otp`, `/api/v1/auth/verify-otp`, `/api/v1/onboarding/*`
- Frontend: `ConversationalLogin.jsx`, `OnboardingPage.jsx`

---

### 2. Profile Management ✅
**Status**: Fully Functional

- Markdown profile stored in `user_configs.profile_md`
- Smart section parsing and display
- Backend: `/api/v1/config`
- Frontend: `ProfileEditorFixed.jsx`, `SettingsPanel.jsx`

---

### 3. Requirement Enrichment ✅
**Status**: Fully Functional

- AI-guided conversational enrichment (one question at a time)
- Confirmation modal before posting
- Backend: `/api/v1/requirements/chat`, `/api/v1/requirements/confirm`
- Frontend: `NewRequirementChat.jsx`

---

### 4. Supplier Matching ✅
**Status**: Functional

- Efficient matching with MiniLM embeddings + hard SQL filters
- Fallback to legacy TF-IDF if no preprocessed products
- Threshold: fit_score >= 15%
- Leads created with `status=new`, `card_status=pending`

---

### 5. Supplier Card Flow ✅ NEW
**Status**: Fully Implemented (2026-06-01)

**Replaces the old AI negotiation loop entirely.**

#### Supplier side:
- Sees new leads in sidebar grouped by card_status
- Clicks "Generate Card" → AI creates offer in one shot (`card_agent.py`)
- Reviews AI-generated card (price, lead time, MOQ, payment terms, certifications, key strengths, AI verdict)
- Can ask Q&A questions about the requirement
- Buyer/AI answers Q&A
- Submits card when satisfied

#### Buyer side:
- Sees "Supplier Cards (N)" tab in RequirementOverview
- Compares submitted cards side-by-side (sortable by fit score, price, lead time)
- Confirmation modal before selecting
- All other suppliers rejected automatically on selection

#### After selection:
- Human-to-human deal chat opens
- Buyer closes deal → Deal record created

**Backend**: `api/app/api/v1/endpoints/cards.py`
**AI**: `api/app/agents/card_agent.py`
**Model**: `api/app/models/card_qa.py` (SupplierCardQA)
**Frontend**: `SupplierLeadsPanel.jsx`, `BuyerCardsView.jsx`, `DealChat.jsx`

#### Lead status lifecycle:
```
new → card_generating → card_draft → card_qa → card_submitted → selected|rejected → deal_open → deal_closed
```

#### Card endpoints (all at `/api/v1/cards/`):
- `POST /leads/{id}/generate-card` — trigger AI card gen (5/min rate limit)
- `GET /leads/{id}/card` — get card
- `POST /leads/{id}/qa` — supplier asks question (20/min)
- `POST /leads/{id}/qa/{qa_id}/answer` — buyer answers manually
- `GET /leads/{id}/qa` — list all Q&A
- `POST /leads/{id}/submit-card` — supplier submits (10/min)
- `GET /requirements/{req_id}/cards` — buyer sees all submitted cards
- `POST /requirements/{req_id}/select` — buyer selects supplier (10/min)
- `POST /deal/close` — buyer closes deal
- `GET /actions-needed` — poll for pending actions
- `POST /conversations/{conv_id}/send` — deal chat send (30/min)
- `GET /conversations/{conv_id}/messages` — deal chat read

---

### 6. Admin Panel ✅
**Status**: Fully Functional

- Time-based password (P1 security issue — dev/demo only)
- Dashboard, requirements, users, supplier map
- Pages: `/admin/login`, `/admin/dashboard`, `/admin/requirements`, `/admin/users`, `/admin/map`

---

### 7. Rate Limiting ✅ NEW
**Status**: Implemented (2026-06-01)

- Library: `slowapi` (installed in venv `billion`)
- Limiter: `api/app/core/limiter.py`
- Auth endpoints: 5/min
- Card generation: 5/min
- Q&A: 20/min
- Deal chat: 30/min
- General: 100/min

---

## ⚠️ What Needs Testing

### 1. End-to-End Card Flow ⚠️
**Critical path**:
```
Register supplier → profile complete →
Buyer posts requirement → matching runs →
Supplier sees lead → generates card →
Asks Q&A (optional) → submits card →
Buyer reviews cards → selects supplier →
Deal chat opens → deal closed
```

- [ ] Test with 2 real users (buyer + supplier)
- [ ] Verify AI card generation returns sensible prices
- [ ] Verify Q&A AI auto-answer works
- [ ] Test buyer comparison and selection flow
- [ ] Verify deal record created correctly

### 2. AI Card Quality ⚠️
- [ ] Test card_agent.py with real supplier profiles
- [ ] Verify price estimates are within realistic range
- [ ] Test answer_qa_question with various question types

---

## 🐛 Known Issues

### BUG-001: Admin Password Security (P1 — Production Blocker)
Time-based HHMM password. Replace with proper admin accounts before production.

### BUG-002: CORS Open to All Origins (P1 — Production Blocker)
`allow_origins=["*"]` in `.env`. Restrict to actual domains before production.

### BUG-003: Matching Service Edge Cases (P2)
Null pricing_bands/categories can cause errors. Partially mitigated by efficient matching.

### BUG-012: Old `negotiation_round` field still in Lead model (P3)
Not used in new flow but still in DB. Can be cleaned up in a future migration.

---

## 🔧 Technical Debt

- No test suite for full E2E flow (only unit tests exist)
- No logging system (structured logging not yet added)
- No monitoring/alerting
- No staging environment
- JWT stored in localStorage (not httpOnly cookie)
- `negotiation_round` and related old fields still in Lead DB table (harmless but unused)

---

## 📊 Code Quality

### Backend
- ~35 Python files, ~4000+ lines
- 9 SQLAlchemy models + 1 new (SupplierCardQA)
- ~40 API endpoints (new card flow adds 12)
- 5 AI agents (card_agent replaces negotiation loop)
- Rate limiting on all sensitive endpoints

### Frontend
- 35+ JSX components
- New: `SupplierLeadsPanel.jsx`, `BuyerCardsView.jsx`, `DealChat.jsx`, `api/cards.js`
- Updated: `Sidebar.jsx`, `ActionsPanel.jsx`, `RequirementOverview.jsx`, `MainPanel.jsx`
- Zustand store updated with `goLead`, `goDealChat` actions

---

## 🚀 Deployment Readiness

### Development ✅
- Local development working
- `billion` venv has all dependencies including slowapi

### Production ❌
- CORS must be restricted
- Admin auth must be replaced
- Rate limiting is in place ✅
- Monitoring still needed
- SSL on EC2 is configured (see DEPLOYMENT.md)

---

## 🎯 Next Priority Actions

### Immediate
1. 🔄 **End-to-end testing** — card flow with 2 real users
2. 🔄 **AI card quality** — verify card_agent produces good output with real profiles
3. 🔴 **Admin security** (BUG-001) — before any public access
4. 🔴 **CORS restriction** (BUG-002) — before production

### Short Term
5. Add structured logging (structlog)
6. Add Sentry error tracking
7. Write integration tests for card flow endpoints
8. Clean up unused Lead fields (negotiation_round, max_negotiation_rounds)
