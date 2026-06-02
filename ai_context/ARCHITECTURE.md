# Bisdom - System Architecture

**Last Updated**: 2026-06-02

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Interface                            │
│              (React 19 + Vite + Tailwind + Zustand)                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP/REST
┌──────────────────────────────┴──────────────────────────────────────┐
│                         FastAPI Backend                             │
│                     (Python 3.14 / AsyncIO)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐  │
│  │   Auth &    │  │ Requirements │  │ Negotiation│  │   Card   │  │
│  │ Onboarding  │  │  + Matching  │  │    Loop    │  │   Flow   │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └──────────┘  │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐                │
│  │   Leads &   │  │    Admin     │  │  Actions   │                │
│  │ Deals Chat  │  │    Panel     │  │   System   │                │
│  └─────────────┘  └──────────────┘  └────────────┘                │
└──────────────────────────┬──────────────────┬───────────────────────┘
                           │                  │
          ┌────────────────┴────────┐    ┌────┴─────────────┐
          │  PostgreSQL (AWS RDS)   │    │  AWS Bedrock     │
          │  Users, Profiles        │    │  Qwen3-VL-235B   │
          │  Requirements, Leads    │    │  (AI agents)     │
          │  Conversations, Msgs    │    └──────────────────┘
          │  SupplierCardQA, Deals  │
          │  UserConfigs            │    ┌──────────────────┐
          └─────────────────────────┘    │   GST API        │
                                         │  (GSTIN verify)  │
                                         └──────────────────┘
```

---

## 📦 Component Breakdown

### 1. Frontend (React SPA)

#### Tech Stack
- React 19, Vite, Tailwind CSS, Zustand, Axios, React Hot Toast, Lucide React

#### Structure
```
ui/src/
├── api/
│   ├── cards.js           — card flow API (generate, Q&A, submit, select, close)
│   ├── conversations.js   — negotiation + pending-actions + suggest
│   ├── leads.js           — list leads, as-buyer, as-supplier, actions-needed
│   ├── requirements.js    — chat, confirm, list
│   ├── auth.js, client.js, config.js, onboarding.js, profile.js
│
├── components/workspace/
│   ├── ConversationView.jsx   — full negotiation chat UI (both sides)
│   │     ConfirmationBar       — context-aware top bar (accept/confirm/waiting)
│   │     ActionPanel           — side panel for buyer + supplier decisions
│   │     ChatSummaryStrip      — offer price / requirement summary strip
│   ├── SupplierLeadsPanel.jsx — supplier card view (generate/draft/submit/Q&A)
│   ├── BuyerCardsView.jsx     — side-by-side card comparison + select
│   ├── DealChat.jsx           — thin wrapper → ConversationView (post-selection)
│   ├── ActionsWidget.jsx      — floating badge + panel (all pending actions)
│   ├── RequirementOverview.jsx— Cards tab + All Leads tab for buyer
│   ├── Sidebar.jsx            — buying tab (req folders) + selling tab (card_status groups)
│   ├── MainPanel.jsx          — hash-based routing to all views
│   ├── WorkspaceLayout.jsx    — data fetching + layout
│   ├── NewRequirementChat.jsx, GeneralReqChat.jsx
│   ├── ProfileEditorV4.jsx, SettingsPanel.jsx, WelcomeScreen.jsx
│
├── store/
│   ├── workspaceStore.js  — route state + navigation helpers
│   ├── authStore.js       — JWT token + user object
│   └── appStore.js
```

#### Hash-based routing (workspace)
```
#/              → WelcomeScreen
#/new           → NewRequirementChat
#/req/{id}      → RequirementOverview   (buyer: Cards tab + All Leads tab)
#/req/{id}/lead/{id} → ConversationView (buyer chat with supplier)
#/req/{id}/general   → GeneralReqChat
#/lead/{id}     → SupplierLeadsPanel    (supplier: card + Q&A)
                  OR DealChat if status=deal_open|deal_closed|card_status=selected
#/deal/{id}     → DealChat             (post-selection human chat)
#/profile       → ProfileEditorV4
#/settings      → SettingsPanel
```

#### Zustand stores
```javascript
// workspaceStore
{
  route: { view, reqId, leadId, convId },
  goWelcome, goNewReq, goRequirement, goChat, goGeneralChat,
  goLead(leadId),              // supplier lead view
  goDealChat(leadId, convId),  // post-selection deal chat
  goProfile, goSettings,
  sidebarTab: 'buying'|'selling',
  expandedRequirements: {},
  refreshKey, triggerRefresh,
  syncFromHash,
}
```

---

### 2. Backend (FastAPI)

#### Structure
```
api/app/
├── main.py                  — app init, CORS, rate limiter, error handlers
├── core/
│   ├── limiter.py           — shared slowapi Limiter instance
│   ├── config.py, security.py, dependencies.py
│
├── models/
│   ├── lead.py              — Lead (status + card_status + ai_paused fields)
│   ├── conversation.py      — Conversation, Message
│   ├── card_qa.py           — SupplierCardQA
│   ├── user.py, profile.py, requirement.py
│   ├── deal.py, user_config.py, requirement_chat.py, supplier_product.py
│
├── schemas/
│   └── conversation.py      — LeadOut (full, incl. card fields + ai_paused fields)
│                              CardQAOut, AskQuestionRequest, AnswerQuestionRequest
│                              SelectSupplierRequest, CloseDealRequest
│                              ConversationOut, MessageOut, SendMessageRequest
│                              BuyerDecisionRequest, SupplierConfirmRequest, etc.
│
├── api/v1/endpoints/
│   ├── conversations.py     — negotiation loop, pending-actions, buyer/supplier decisions
│   ├── cards.py             — supplier card flow (12 endpoints)
│   ├── leads.py             — list leads (as-buyer, as-supplier, actions-needed)
│   ├── requirements.py      — requirement chat + confirm + list
│   ├── auth.py              — OTP send/verify
│   ├── onboarding.py        — GSTIN verify, profile creation
│   ├── config.py            — user config (profile_md, buyer/seller settings)
│   ├── profile.py, admin.py, dashboard.py, preprocessing.py, expiry.py
│
├── agents/
│   ├── buyer_agent.py       — negotiation AI for buyer (phases: cooperate→evaluate→close)
│   ├── supplier_agent.py    — negotiation AI for supplier (phases: discover→options→negotiate)
│   ├── card_agent.py        — single-shot card generation + Q&A auto-answer
│   ├── requirement_agent.py — conversational requirement enrichment
│   ├── profile_agent.py     — extract supplier profile from URLs
│   ├── config_agent.py      — build system prompts from user config
│   └── bedrock_client.py    — AWS Bedrock Qwen3 client
│
└── services/
    ├── matching_service.py      — legacy TF-IDF matching
    ├── efficient_matching.py    — MiniLM embeddings matching (primary)
    └── otp_service.py, gst_service.py
```

---

### 3. Negotiation Flow (AI Loop)

**Both agents run autonomously**, alternating turns. The loop stops when:
- `ai_paused_for_buyer=True` → buyer must decide
- `ai_paused_for_supplier=True` → supplier must respond
- `status=offer_ready` → buyer must accept/reject
- `status=deal_closed` or `declined` → terminal

```
conversations.py::_run_autonomous_negotiation_round(lead_id)
  ↕ loops (max 20 rounds, 2s delay between)
  ├── buyer just spoke → _trigger_supplier_ai_response()
  │     supplier_agent_respond() → saves Message(role=ai_supplier)
  │     if needs_supplier_input → ai_paused_for_supplier=True → stop
  │
  └── supplier just spoke → _trigger_buyer_ai_response()
        buyer_agent_respond() → saves Message(role=ai_buyer)
        if needs_buyer_input  → ai_paused_for_buyer=True → stop
        if is_deal_ready      → status=offer_ready, ai_paused_for_buyer=True → stop
        if walkaway detected  → status=declined → stop
```

**Human actions** (POST endpoints in conversations.py):
```
POST /buyer-decision   {action: accept|renegotiate|manual_chat|decline}
  accept     → status=awaiting_supplier_confirm, ai_paused_for_supplier=True
  renegotiate→ status=renegotiating, posts instruction as system message
  manual_chat→ buyer_chat_enabled=True, mode=hybrid
  decline    → status=not_selected

POST /supplier-confirm {action: confirm|reject}
  confirm → status=deal_closed, buyer+supplier chat enabled, Deal record created
  reject  → status=declined

POST /supplier-escalation {action: accept|counter|hold|decline}
  Used when ai_paused_for_supplier (not awaiting_confirm)
```

---

### 4. Card Flow

Runs in parallel with / after negotiation. Not mandatory — either flow can close the deal.

```
Supplier clicks Generate Card → POST /cards/leads/{id}/generate-card
  → card_status=generating, background task starts
  → card_agent.generate_card(requirement, supplier_profile, match_reasons)
  → card saved to lead.supplier_card, card_status=draft

Buyer asks Q&A → POST /cards/leads/{id}/qa
  → SupplierCardQA saved, card_status=qa
  → background: card_agent.answer_qa() auto-answers in ~5s

Supplier submits → POST /cards/leads/{id}/submit-card
  → card_status=submitted

Buyer views all submitted → GET /cards/requirements/{req_id}/cards
  Returns: submitted + selected + rejected cards (sorted by fit_score)

Buyer selects → POST /cards/requirements/{req_id}/select
  → selected lead: card_status=selected, status=deal_open
  → others: card_status=rejected, status=not_selected
  → Conversation created (mode=deal_chat)

Buyer closes → POST /cards/deal/close
  → status=deal_closed
```

---

### 5. Actions System

```
GET /api/v1/conversations/pending-actions
  Returns all leads where current user must act:
  - buyer_decision    → ai_paused_for_buyer=True
  - review_offer      → status=offer_ready
  - supplier_confirm  → status=awaiting_supplier_confirm
  - supplier_respond  → ai_paused_for_supplier=True
  - supplier_declined → status=declined (buyer needs to pick next)
  Response includes: lead_id, requirement_id, action, status, product, current_offer_price

GET /api/v1/cards/actions-needed
  Card-specific actions (supplier: generate_card, submit_card; buyer: review_cards)
```

Frontend `ActionsWidget.jsx`:
- Polls `/conversations/pending-actions` every 20s
- Floating amber badge with count
- Click item → `goLead` (supplier) or `goChat` (buyer)

---

### 6. Database Schema

**Lead — key fields**:
```python
status         # new|agent_initiated|negotiating|renegotiating|offer_ready|
               # awaiting_supplier_confirm|deal_closed|declined|not_selected
card_status    # pending|generating|draft|qa|submitted|selected|rejected
supplier_card  # JSON — AI-generated card dict
card_submitted_at, card_selected_at

ai_paused_for_buyer    # True when buyer must act
ai_paused_for_supplier # True when supplier must act
buyer_chat_enabled     # True when buyer has taken over chat
supplier_chat_enabled  # True when supplier has taken over chat
current_offer_price, current_lead_time, negotiation_round
fit_score, match_reasons
```

**Conversation**:
```python
mode       # ai_negotiating | hybrid | manual | deal_chat
ai_context # JSON array — full message history for AI context window
```

**SupplierCardQA**:
```python
lead_id, question, asked_by
answer, answered_by, answered_by_ai
status  # open | answered
```

---

### 7. AI Agents

| Agent | Trigger | Purpose |
|-------|---------|---------|
| `requirement_agent.py` | `/requirements/chat` | Enrich buyer requirement conversationally |
| `supplier_agent.py` | Auto (negotiation loop) | Negotiate as supplier AI |
| `buyer_agent.py` | Auto (negotiation loop) | Negotiate as buyer AI |
| `card_agent.generate_card` | Background after `/generate-card` | One-shot card generation |
| `card_agent.answer_qa` | Background after `/qa` | Auto-answer buyer Q&A |
| `profile_agent.py` | `/onboarding/submit` | Extract supplier profile from URLs |
| `config_agent.py` | Internal | Build context-rich system prompts |

All agents call **AWS Bedrock Qwen3-VL-235B** via `bedrock_client.py` using a Bearer token.

---

### 8. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/send-otp`, `/auth/verify-otp` | 5/min |
| `/cards/leads/{id}/generate-card` | 5/min |
| `/cards/leads/{id}/qa` | 20/min |
| `/cards/leads/{id}/submit-card` | 10/min |
| `/cards/requirements/{id}/select` | 10/min |
| `/cards/deal/close` | 10/min |

---

### 9. Security

- Auth: Phone OTP + JWT (7-day expiry, stored in localStorage)
- Rate limiting: slowapi on all sensitive endpoints
- CORS: `allow_origins=["*"]` — **must restrict before production** (BUG-002)
- Admin: time-based HHMM password — **must replace before production** (BUG-001)

---

## 🎯 Architecture Strengths

1. Autonomous AI negotiation — no manual work for routine back-and-forth
2. Human checkpoints at the right moments (offer ready, confirmation)
3. Clean status + card_status dual lifecycle — each tracks a distinct concern
4. Background tasks for AI card gen + Q&A (non-blocking UX)
5. Actions system surfaces all pending decisions across both flows
6. Async throughout, modular agents, rate limited

## ⚠️ Architecture Weaknesses

1. No caching layer (Redis) — every match/profile fetch hits DB
2. No message queue — background tasks are in-process (lost on restart)
3. Autonomous loop runs per-request — no persistent worker
4. No structured logging or error tracking
5. JWT in localStorage (XSS risk)
6. Single DB instance, no read replicas
