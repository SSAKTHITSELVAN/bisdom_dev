# Bisdom - System Architecture

**Last Updated**: 2026-06-05
**Domain**: Textile B2B Commerce

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
│  Auth & Onboarding │ Requirements + Matching │ AI Chat Loop        │
│  Leads & Deals     │ Admin Panel             │ Actions System      │
└──────────────────────────┬──────────────────────┬───────────────────┘
                           │                      │
          ┌────────────────┴────────┐    ┌────────┴───────────┐
          │  PostgreSQL (AWS RDS)   │    │  AWS Bedrock       │
          │  Users, Profiles        │    │  Qwen3-VL-235B     │
          │  Requirements, Leads    │    │  (AI agents)       │
          │  Conversations, Msgs    │    └────────────────────┘
          │  Deals, UserConfigs     │
          └─────────────────────────┘
```

---

## 📦 Frontend Structure

```
ui/src/
├── api/              — API clients (cards, conversations, leads, requirements, auth)
├── components/workspace/
│   ├── ConversationView.jsx   — main chat UI (perspective-aware bubbles, sticky header/input)
│   ├── MainPanel.jsx          — routing + mobile header with notification bell
│   ├── ActionsWidget.jsx      — sticky right panel (desktop) / slide-in (mobile)
│   ├── Sidebar.jsx            — buying tab (req folders) + selling tab (leads)
│   ├── WorkspaceLayout.jsx    — data fetching + layout
│   ├── RequirementOverview.jsx— requirement details + leads list
│   ├── NewRequirementChat.jsx — textile-focused requirement posting
│   ├── GeneralReqChat.jsx     — AI assistant for requirement (uses company names)
│   ├── DealChat.jsx           — thin wrapper → ConversationView
│   └── WelcomeScreen, ProfileEditorV4, SettingsPanel
├── store/
│   ├── workspaceStore.js  — hash-based routing + navigation
│   └── authStore.js       — JWT token + user object (with user_id)
```

### Hash-based routing
```
#/              → WelcomeScreen
#/new           → NewRequirementChat (textile suggestions)
#/req/{id}      → RequirementOverview
#/req/{id}/lead/{id} → ConversationView (buyer chat)
#/lead/{id}     → ConversationView (supplier chat)
#/deal/{id}     → DealChat (post-selection)
#/profile       → ProfileEditorV4
```

---

## 📦 Backend Structure

```
api/app/
├── agents/
│   ├── buyer_agent.py       — WhatsApp-style buyer chat (never accepts deals)
│   ├── supplier_agent.py    — WhatsApp-style supplier chat (never closes deals)
│   ├── card_agent.py        — card generation + Q&A auto-answer
│   ├── requirement_agent.py — conversational requirement enrichment
│   ├── profile_agent.py     — extract supplier profile from URLs
│   └── bedrock_client.py    — AWS Bedrock Qwen3 client
│
├── api/v1/endpoints/
│   ├── conversations.py     — chat loop, pending-actions, buyer/supplier decisions
│   ├── cards.py             — supplier card flow (generate, Q&A, submit, select)
│   ├── leads.py             — list leads (as-buyer, as-supplier)
│   ├── requirements.py      — requirement chat + confirm + matching trigger
│   ├── requirement_chat.py  — AI assistant (uses company names, not Lead #IDs)
│   ├── auth.py, onboarding.py, config.py, admin.py
│
├── models/
│   ├── lead.py              — Lead (status + card_status + ai_paused fields)
│   ├── conversation.py      — Conversation, Message
│   └── user.py, profile.py, requirement.py, deal.py
```

---

## 🔄 AI Agent Behavior

### Key Principle: AI talks, humans decide

Both agents follow the same rules:
1. Chat naturally like WhatsApp (2-4 sentences max)
2. Use company profile info to answer questions and quote prices
3. NEVER accept, confirm, decline, or close a deal
4. When decision is needed → say "Let me check with my team" → escalate to human
5. If AI accidentally outputs acceptance → code forces escalation anyway
6. Raw XML tags are never shown to users (fallback messages used)

### Autonomous Loop
```
_run_autonomous_negotiation_round(lead_id)
  loops max 20 rounds, 2s delay between
  ├── buyer spoke → supplier AI responds
  │     if needs_supplier_input → pause, show in Actions panel
  └── supplier spoke → buyer AI responds
        if needs_buyer_input → pause, show in Actions panel
        if acceptance detected → force pause for human (never auto-close)
```

---

## 🎯 Actions System

```
GET /api/v1/conversations/pending-actions
  Returns all leads where current user must act:
  - buyer_decision    → ai_paused_for_buyer
  - review_offer      → status=offer_ready (legacy, rare now)
  - supplier_confirm  → status=awaiting_supplier_confirm
  - supplier_respond  → ai_paused_for_supplier
  - supplier_declined → status=declined
```

### Frontend
- **Desktop**: permanent 240px panel on right side, always visible
- **Mobile**: bell icon in top-right of mobile header, opens slide-in drawer
- Clicked items marked as "done" (dull, moved to bottom), count decreases

---

## 📊 Lead Status Lifecycle

```
new → agent_initiated → negotiating →
  → ai_paused_for_buyer (human decides)
  → ai_paused_for_supplier (human decides)
  → awaiting_supplier_confirm (buyer accepted, supplier must confirm)
  → deal_closed
  → declined / not_selected
```

---

## 🔒 Security

- Auth: Phone OTP + JWT (7-day expiry)
- Rate limiting: slowapi on sensitive endpoints
- CORS: `allow_origins=["*"]` — **must restrict** (BUG-002)
- Admin: time-based HHMM password — **must replace** (BUG-001)

---

## 🚀 Deployment

- EC2 instance: 3.109.70.144 (ap-south-1)
- Frontend: Vite dev server (port 5173) via systemd
- Backend: Uvicorn (port 8000) via systemd
- Database: AWS RDS PostgreSQL
- AI: AWS Bedrock Qwen3-VL-235B (us-east-1)
- Deploy: git push → SSH → git pull → restart services
