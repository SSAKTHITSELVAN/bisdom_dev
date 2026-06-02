# Bisdom - Known Bugs & Issues

**Last Updated**: 2026-06-02

---

## ✅ Fixed Bugs

### ~~BUG-011: Navigation Fails After OTP Verification~~ ✅
Fixed 2026-05-19 — Token not synced to Zustand store.

### ~~BUG-012: pending-actions Unreachable~~ ✅
Fixed 2026-06-02 — `GET /conversations/pending-actions` was caught by `GET /{conversation_id}` (int parse fail). Moved to top of router.

### ~~BUG-013: AI Auto-Closes Deals~~ ✅
Fixed 2026-06-02 — When `offer_ready`, the autonomous loop was triggering supplier's final confirmation message, effectively closing the deal without buyer input. Now sets `ai_paused_for_buyer=True` and stops.

### ~~BUG-014: ConfirmationBar Uses Wrong Status Names~~ ✅
Fixed 2026-06-02 — Was checking `buyer_shortlisted`, `supplier_confirmed`, `supplier_declined` which don't exist. Now uses real statuses.

### ~~BUG-015: Supplier Never Sees Actions~~ ✅
Fixed 2026-06-02 — `canAct` was buyer-only. `ActionPanel` had no supplier section. Both fixed.

### ~~BUG-016: Chat Doesn't Open on Lead Click~~ ✅
Fixed 2026-06-02 — Hash `#/req/N/lead/N` parses to `view=chat` but MainPanel had no `case 'chat'`. Added.

### ~~BUG-017: Supplier Deal Chat Never Opens~~ ✅
Fixed 2026-06-02 — `MainPanel` checked `lead.conversation` (never in LeadOut) to decide routing. Now checks `lead.status` and `lead.card_status` directly.

### ~~BUG-018: Cards View Shows 0 After Selection~~ ✅
Fixed 2026-06-02 — `GET /cards/requirements/{id}/cards` only returned `card_status=submitted`. Now includes submitted+selected+rejected.

---

## 🔴 High Priority (P1 — Production Blockers)

### BUG-001: Admin Password Security Vulnerability
Admin panel uses current time in HHMM format as password.
**Location**: `api/app/api/v1/endpoints/admin.py::verify_admin_password()`
**Fix**: Replace with proper Admin table + bcrypt. See TASKS.md TASK-SEC-001.

### BUG-002: Open CORS Policy
`allow_origins=["*"]` — open to all domains.
**Location**: `api/.env` → `ALLOWED_ORIGINS`
**Fix**: Set to `https://bisdomai.com` before production. See TASK-SEC-002.

---

## 🟡 Medium Priority (P2)

### BUG-003: Matching Service Edge Cases
Null `pricing_bands` or `product_categories` can cause legacy matching errors.
**Location**: `api/app/services/matching_service.py`
**Fix**: Add null checks before accessing these fields.

### BUG-004: ESLint Warnings in ChatPage.jsx
Unused variables, empty blocks.
**Location**: `ui/src/components/chat/ChatPage.jsx`

### BUG-005: No Rate Limiting on Legacy Endpoints
`/requirements/chat`, `/onboarding/*`, `/admin/*` not rate-limited.
**Fix**: See TASK-RATE-002.

---

## 🟢 Low Priority (P3)

### BUG-006: Unused Lead Fields
`max_negotiation_rounds` still in DB but unused.
Note: `ai_paused_for_buyer/supplier`, `buyer/supplier_chat_enabled`, `negotiation_round` are actively used — do NOT remove.

---

## 🔵 Unconfirmed / Under Investigation

### BUG-009: AI Context Memory in Long Negotiations
If a conversation accumulates many rounds (>15), the AI context passed to Bedrock may be truncated or too expensive. Need to verify with a long negotiation.

### BUG-010: Card Generation Race Condition
If supplier clicks Generate Card twice quickly, two background tasks could fire. Guard exists (`card_status != 'generating'` check) but hasn't been stress-tested under rapid clicks.

### BUG-019: Autonomous Loop Persistence
The autonomous negotiation loop (`_run_autonomous_negotiation_round`) runs as an in-process coroutine. If the API server restarts mid-negotiation, the loop is lost and the lead stays stuck in `negotiating` status with no AI progressing it.
**Workaround**: None yet. Buyer/supplier can manually send a message to kick the AI, or use the AI Suggest button.
**Fix**: Move to Celery worker (TASK-014).

---

## 📋 Bug Summary

| Priority | Count | Status |
|----------|-------|--------|
| P1 | 2 | 🔴 Open |
| P2 | 3 | 🟡 Open |
| P3 | 1 | 🟢 Open |
| Unconfirmed | 3 | 🔵 Needs testing |
