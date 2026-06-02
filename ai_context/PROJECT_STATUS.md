# Bisdom Project - Current Status

**Last Updated**: 2026-06-02
**Status**: Active Development
**Version**: 1.2.0

---

## 🎯 Project Overview

**Bisdom** is an AI-powered B2B Commerce Platform for Indian SMEs. After matching, buyer and supplier AI agents negotiate autonomously. Humans are prompted only when a decision is needed. The negotiation ends with buyer acceptance → supplier confirmation → deal closed.

### Core Flow
```
Buyer posts requirement → AI enriches → confirmed →
Matching runs → Leads created →
AI agents negotiate (buyer AI ↔ supplier AI, autonomous loop) →
  AI pauses when: offer ready for buyer / input needed from either side →
Human buyer: Accept / Renegotiate / Decline / Take over chat →
  Accept → awaiting_supplier_confirm →
Human supplier: Confirm / Reject →
  Confirm → deal_closed (human chat opens)
  Reject → buyer must try other matched suppliers
```

---

## ✅ What's Working

### 1. Authentication & Onboarding ✅
- Phone OTP auth, conversational login UI, GSTIN verification, profile creation
- Backend: `/api/v1/auth/send-otp`, `/api/v1/auth/verify-otp`, `/api/v1/onboarding/*`
- Frontend: `ConversationalLogin.jsx`, `OnboardingPage.jsx`

---

### 2. Profile Management ✅
- Markdown profile stored in `user_configs.profile_md`
- Backend: `/api/v1/config`
- Frontend: `ProfileEditorV4.jsx`, `SettingsPanel.jsx`

---

### 3. Requirement Enrichment ✅
- AI-guided conversational enrichment (one question at a time)
- Confirmation modal before posting
- Backend: `/api/v1/requirements/chat`, `/api/v1/requirements/confirm`
- Frontend: `NewRequirementChat.jsx`

---

### 4. Supplier Matching ✅
- MiniLM embeddings + hard SQL filters; fallback to TF-IDF
- Threshold: fit_score >= 15%
- Leads created with `status=new`
- Backend: `api/app/services/matching_service.py`, `efficient_matching.py`

---

### 5. AI Negotiation Loop ✅
**Status**: Live and actively used.

After matching, AI agents negotiate on behalf of both parties:
- **Supplier AI** (`supplier_agent.py`): Greets buyer, clarifies requirements, presents 2–3 options with pricing
- **Buyer AI** (`buyer_agent.py`): Evaluates offers against budget ceiling, negotiates down, signals when ready to accept
- Loop runs autonomously (max 20 rounds, stops on pause/deal)
- Either agent can pause for human input via `<NEEDS_BUYER_INPUT>` / `<NEEDS_SUPPLIER_INPUT>` signals

**Human checkpoints** (AI stops, user must act):
| Trigger | Who acts | Action |
|---------|---------|--------|
| `status=offer_ready` / `ai_paused_for_buyer=True` | Buyer | Accept / Renegotiate / Decline / Take over chat |
| `status=awaiting_supplier_confirm` | Supplier | Confirm / Reject |
| `ai_paused_for_supplier=True` | Supplier | Let AI continue / Reply yourself / Decline |

**Backend**: `api/app/api/v1/endpoints/conversations.py`
**Agents**: `buyer_agent.py`, `supplier_agent.py`

#### Lead status lifecycle
```
new → agent_initiated → negotiating → renegotiating
    → offer_ready (buyer must act)
    → awaiting_supplier_confirm (supplier must act)
    → deal_closed
    → declined / not_selected
```

#### Conversation endpoints (`/api/v1/conversations/`)
- `GET /pending-actions` — all leads needing user action (buyer or supplier)
- `GET /lead/{lead_id}` — get conversation by lead
- `GET /{conv_id}` — get conversation by ID
- `POST /send` — human sends message
- `POST /toggle-chat` — enable/disable human chat (hybrid mode)
- `POST /buyer-decision` — accept / renegotiate / manual_chat / decline
- `POST /supplier-escalation` — accept / counter / hold / decline
- `POST /supplier-confirm` — confirm / reject
- `POST /suggest-response` — AI suggests best next message for human
- `POST /toggle-chat` — enable/disable manual chat

---

### 6. Supplier Card Flow ✅
**Status**: Implemented — used in parallel with negotiation for leads that need formal offers.

Supplier can generate an AI offer card from their lead, ask/answer Q&A, and submit. Buyer compares submitted cards and selects one.

**Backend**: `api/app/api/v1/endpoints/cards.py`, `api/app/agents/card_agent.py`
**Model**: `api/app/models/card_qa.py` (SupplierCardQA)
**Frontend**: `SupplierLeadsPanel.jsx`, `BuyerCardsView.jsx`

#### Card endpoints (`/api/v1/cards/`)
- `POST /leads/{id}/generate-card` — AI card generation (background, 5/min)
- `GET /leads/{id}/card` — get card status + data
- `POST /leads/{id}/qa` — buyer asks question (AI auto-answers in background)
- `POST /leads/{id}/qa/{qa_id}/answer` — supplier manually answers
- `GET /leads/{id}/qa` — list Q&A
- `POST /leads/{id}/submit-card` — supplier submits formal offer
- `GET /requirements/{req_id}/cards` — buyer sees submitted+selected+rejected cards
- `POST /requirements/{req_id}/select` — buyer selects a supplier
- `POST /deal/close` — buyer closes deal
- `GET /actions-needed` — card-specific pending actions

#### card_status lifecycle
```
pending → generating → draft → qa → submitted → selected | rejected
```

---

### 7. Actions System ✅
**Status**: Working for both buyer and supplier.

- `GET /api/v1/conversations/pending-actions` — returns all leads needing human action
- Action types: `buyer_decision`, `review_offer`, `supplier_confirm`, `supplier_respond`, `supplier_declined`
- Each item includes: `lead_id`, `requirement_id`, `action`, `status`, `product`, `current_offer_price`
- Frontend: `ActionsWidget.jsx` (floating badge, 20s poll)
  - Supplier actions → `goLead(leadId)`
  - Buyer actions → `goChat(reqId, leadId)`

---

### 8. ConversationView ✅
**Status**: Full UI for both buyer and supplier sides.

- `ConfirmationBar`: context-aware bar at top — shows correct action for each status
  - `offer_ready` / `ai_paused_for_buyer` → buyer Accept / Decline buttons
  - `awaiting_supplier_confirm` (buyer) → waiting message
  - `awaiting_supplier_confirm` (supplier) → Confirm / Reject buttons
  - `ai_paused_for_supplier` → supplier respond prompt
  - `declined` → "Supplier declined" message
  - `deal_closed` → deal closed confirmation
- `ActionPanel` (side panel): full actions for buyer (accept/renegotiate/chat/decline) and supplier (confirm/reject or respond/decline)
- `canAct` triggers for both buyer and supplier conditions
- AI Suggest button — generates best next message for the human on either side
- Live Chat toggle — enables human to send messages (hybrid mode)
- End-of-message paused bubble — prompts correct side to act

---

### 9. Admin Panel ✅
- Time-based password (P1 security issue — dev/demo only)
- Dashboard, requirements, users, supplier map
- Pages: `/admin/login`, `/admin/dashboard`, `/admin/requirements`, `/admin/users`, `/admin/map`

---

### 10. Rate Limiting ✅
- Library: `slowapi`
- Limiter: `api/app/core/limiter.py`
- Auth: 5/min; Card gen: 5/min; Q&A: 20/min; Submit/Select: 10/min; Deal chat: 30/min

---

## ⚠️ What Needs Testing

- [ ] Full negotiation → buyer accept → supplier confirm → deal closed (end-to-end)
- [ ] Supplier decline → buyer sees "supplier_declined" action → picks next supplier
- [ ] AI renegotiation after buyer sends target price
- [ ] Supplier "AI paused for supplier" → supplier responds manually
- [ ] Card flow: generate → Q&A → submit → buyer select → deal chat

---

## 🐛 Known Issues

### BUG-001: Admin Password Security (P1 — Production Blocker)
Time-based HHMM password. Fix: replace with proper admin accounts.

### BUG-002: CORS Open to All Origins (P1 — Production Blocker)
`allow_origins=["*"]`. Fix: restrict to actual domains.

### BUG-003: Matching Service Edge Cases (P2)
Null pricing_bands/categories can cause legacy matching errors.

### BUG-006: Unused Lead Fields (P3)
Old fields still in DB: `max_negotiation_rounds`, `negotiation_round`. Harmless.

---

## 🔧 Technical Debt

- No integration tests for negotiation loop
- No structured logging
- JWT in localStorage (XSS risk)
- No staging environment

---

## 📊 Code Size

### Backend
- ~38 Python files, ~5000+ lines
- 10 SQLAlchemy models
- ~50 API endpoints
- 5 AI agents (buyer, supplier, card, requirement, profile)

### Frontend
- 35+ JSX components
- 3 Zustand stores (authStore, workspaceStore, appStore)
