# Bisdom - Task List & Roadmap

**Last Updated**: 2026-06-01

---

## ✅ Completed (2026-06-01)

### TASK-CARD-001: Supplier Card Flow ✅ DONE
Complete replacement of AI negotiation loop with single-shot card generation.
- `card_agent.py` — AI card generation + Q&A auto-answer
- `cards.py` — 12 new endpoints
- `SupplierCardQA` model
- Lead model updated with `supplier_card`, `card_status` fields
- Frontend: `SupplierLeadsPanel.jsx`, `BuyerCardsView.jsx`, `DealChat.jsx`
- `Sidebar.jsx`, `ActionsPanel.jsx`, `RequirementOverview.jsx`, `MainPanel.jsx` updated

### TASK-RATE-001: Rate Limiting ✅ DONE
`slowapi` installed, limiter on auth + all card flow endpoints.

### TASK-TEST-001: Unit Tests ✅ DONE
`api/tests/test_card_flow.py` + `test_rate_limiting.py` — 10/10 passing.

---

## 🔄 Current Sprint

### TASK-001: End-to-End Testing
**Status**: Not Started | **Priority**: P0 | **Estimate**: 2 days

Test full card flow with 2 real users (buyer + supplier):
- [ ] Supplier registers, completes profile
- [ ] Buyer posts requirement
- [ ] Matching runs → leads created
- [ ] Supplier generates card → reviews → submits
- [ ] Buyer compares cards → selects supplier
- [ ] Deal chat opens → deal closes
- [ ] Admin views all data

---

### TASK-002: AI Card Quality Verification
**Status**: Not Started | **Priority**: P1 | **Estimate**: 4 hours

Verify `card_agent.py` with real supplier profiles:
- [ ] Card price estimates are realistic (not hallucinated)
- [ ] AI verdict correctly compares to buyer budget
- [ ] Q&A auto-answer covers common questions
- [ ] Fallback (card generation fails) shows sensible message to supplier

---

### TASK-003: Secure Admin Authentication
**Status**: Not Started | **Priority**: P1 | **Estimate**: 1 day

Replace HHMM time-based password with proper auth:
```python
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
```
Update `AdminLogin.jsx` to show username field.

---

### TASK-004: Rate Limit Legacy Endpoints
**Status**: Not Started | **Priority**: P2 | **Estimate**: 2 hours

Add `@limiter.limit()` to:
- `/requirements/chat` → 10/min
- `/onboarding/start`, `/onboarding/submit` → 5/min
- `/admin/*` → 20/min

---

### TASK-005: Fix ESLint Warnings
**Status**: Not Started | **Priority**: P2 | **Estimate**: 1 hour

`ui/src/components/chat/ChatPage.jsx` — remove unused vars, fix empty blocks.

---

### TASK-006: Restrict CORS
**Status**: Not Started | **Priority**: P1 | **Estimate**: 30 min

In `api/.env`: `ALLOWED_ORIGINS=https://bisdom.com,https://app.bisdom.com`

---

## 📋 Backlog

### TASK-007: Structured Logging
`structlog` — JSON format, log AI calls with latency, DB errors, auth events.

### TASK-008: Integration Tests
Test card flow endpoints end-to-end with a test DB.

### TASK-009: Clean Up Old Lead Fields
Migration to drop unused columns: `max_negotiation_rounds`, `ai_paused_for_buyer`, `ai_paused_for_supplier`, `buyer_chat_enabled`, `supplier_chat_enabled`.

### TASK-010: Error Tracking (Sentry)
```python
sentry_sdk.init(dsn="...", integrations=[FastApiIntegration()])
```

### TASK-011: DB Connection Pooling
Configure explicit pool in `api/app/db/base.py`:
```python
engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10)
```

### TASK-012: Redis Caching
Cache match results, supplier profiles. Reduces DB load.

### TASK-013: Card Edit Feature
Allow supplier to manually edit the AI-generated card before submitting (not just accept/reject).

---

## 📊 Task Dashboard

| Priority | Count | Status |
|----------|-------|--------|
| P0 | 1 | 🔄 Not started |
| P1 | 4 | ❌ Not started |
| P2 | 2 | ❌ Not started |
| P3 | 6 | 📋 Backlog |
