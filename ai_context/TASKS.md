# Bisdom - Task List & Roadmap

**Last Updated**: 2026-06-02

---

## ✅ Completed

### TASK-CARD-001: Supplier Card Flow ✅
Full card generation, Q&A, submit, buyer compare + select, deal close.
Files: `card_agent.py`, `cards.py`, `card_qa.py`, `SupplierLeadsPanel.jsx`, `BuyerCardsView.jsx`

### TASK-RATE-001: Rate Limiting ✅
`slowapi` on auth + all card flow endpoints.

### TASK-CONV-001: Negotiation Loop Human Checkpoints ✅
- `pending-actions` moved before `/{conv_id}` route (routing bug fixed)
- `pending-actions` now covers: buyer_decision, review_offer, supplier_confirm, supplier_respond, supplier_declined
- `offer_ready` now sets `ai_paused_for_buyer=True` (AI no longer auto-confirms deals)
- Autonomous loop stops at `offer_ready` and waits for buyer

### TASK-CONV-002: ConversationView Both-Sides Actions ✅
- `ConfirmationBar`: correct statuses for buyer + supplier
- `ActionPanel`: buyer (accept/renegotiate/chat/decline) + supplier (confirm/reject or respond/decline)
- `canAct`: triggers for both buyer and supplier
- Paused banners + end-of-message prompts for both sides

### TASK-NAV-001: Routing Fixes ✅
- `#/req/{id}/lead/{id}` now opens chat (case 'chat' added to MainPanel)
- Supplier leads navigate via `goLead` / `goDealChat`, not `goChat`
- Supplier deal chat opens when `card_status=selected` or `status=deal_open|deal_closed`

### TASK-CARDS-002: Cards View Fixes ✅
- `GET /cards/requirements/{req_id}/cards` includes submitted+selected+rejected
- RequirementOverview "Submitted" counter includes selected+rejected

---

## 🔄 Current Sprint

### TASK-TEST-001: End-to-End Negotiation Test
**Status**: Not Started | **Priority**: P0

Full cycle with 2 users:
- [ ] Buyer posts requirement → matching → leads created
- [ ] AI loop runs → offer_ready
- [ ] Buyer sees action in widget → opens chat → accepts
- [ ] Supplier sees confirm action → confirms
- [ ] deal_closed → human chat works
- [ ] Supplier decline → buyer sees supplier_declined action → picks next

### TASK-SEC-001: Secure Admin Authentication
**Status**: Not Started | **Priority**: P1

Replace HHMM time-based password with proper admin accounts + bcrypt.
Files to change: `api/app/api/v1/endpoints/admin.py`, `AdminLogin.jsx`

### TASK-SEC-002: Restrict CORS
**Status**: Not Started | **Priority**: P1

In `api/.env`: set `ALLOWED_ORIGINS=https://bisdomai.com`

### TASK-RATE-002: Rate Limit Legacy Endpoints
**Status**: Not Started | **Priority**: P2

Add `@limiter.limit()` to:
- `/requirements/chat` → 10/min
- `/onboarding/start`, `/onboarding/submit` → 5/min
- `/admin/*` → 20/min

---

## 📋 Backlog

### TASK-007: Structured Logging
`structlog` — JSON format, log AI calls with latency, DB errors, auth events.

### TASK-008: Integration Tests
Test negotiation loop and card flow end-to-end against a test DB.

### TASK-009: Clean Up Old Lead Fields
Migration to drop unused columns: `max_negotiation_rounds`.
Note: `ai_paused_for_buyer/supplier`, `buyer/supplier_chat_enabled`, `negotiation_round` are still actively used — do NOT drop.

### TASK-010: Error Tracking (Sentry)
```python
sentry_sdk.init(dsn="...", integrations=[FastApiIntegration()])
```

### TASK-011: DB Connection Pooling
```python
engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10)
```

### TASK-012: Redis Caching
Cache match results + supplier profiles.

### TASK-013: Card Edit Feature
Allow supplier to manually edit the AI-generated card fields before submitting.

### TASK-014: Persistent Background Workers
Move AI negotiation loop and card generation to Celery workers so they survive API restarts.
