# Bisdom - Known Bugs & Issues

**Last Updated**: 2026-06-01

---

## ✅ Fixed Bugs

### ~~BUG-011: Navigation Fails After OTP Verification~~ ✅ FIXED
**Fixed**: 2026-05-19 — Token not synced to Zustand store. Fixed in `ConversationalLogin.jsx`.

### ~~BUG-OLD: AI Negotiation Loop Creates Reading Burden~~ ✅ REPLACED
**Fixed**: 2026-06-01 — Entire negotiation loop replaced with Supplier Card Flow.
Old `_run_autonomous_negotiation_round()` removed. No more 20-round AI loops.

---

## 🔴 High Priority (P1 — Production Blockers)

### BUG-001: Admin Password Security Vulnerability
**Status**: 🔴 Open
**Priority**: P1

Admin panel uses current time in HHMM format as password. Anyone knowing the time can login.

**Location**: `api/app/api/v1/endpoints/admin.py::verify_admin_password()`

**Fix**: Replace with proper Admin table + bcrypt password. See TASKS.md TASK-003.

---

### BUG-002: Open CORS Policy
**Status**: 🔴 Open
**Priority**: P1

`allow_origins=["*"]` — open to all domains.

**Location**: `api/.env` → `ALLOWED_ORIGINS`

**Fix**: Set to `https://bisdom.com,https://app.bisdom.com` before production.

---

## 🟡 Medium Priority (P2)

### BUG-003: Matching Service Edge Cases
**Status**: 🟡 Open
**Priority**: P2

Null `pricing_bands` or `product_categories` can cause errors in legacy matching fallback.

**Location**: `api/app/services/matching_service.py`

**Fix** (partial — add null checks):
```python
suppliers = db.query(AgenticProfile).filter(
    AgenticProfile.product_categories.isnot(None),
    AgenticProfile.pricing_bands.isnot(None)
).all()
```

---

### BUG-004: ESLint Warnings in ChatPage.jsx
**Status**: 🟡 Open
**Priority**: P2 (Low — cosmetic)

Unused variables, empty blocks in `ui/src/components/chat/ChatPage.jsx`.

---

### BUG-005: No Rate Limiting on Legacy Endpoints
**Status**: 🟡 Partial
**Priority**: P2

Rate limiting added to card flow + auth endpoints. Legacy endpoints (onboarding, requirements chat, admin) not yet rate-limited.

**What's covered**: auth (5/min), card generation (5/min), Q&A (20/min), submit (10/min), deal chat (30/min)
**What's missing**: `/requirements/chat`, `/onboarding/*`, `/admin/*`

---

### BUG-006: Unused Lead Fields in DB
**Status**: 🟢 Low priority
**Priority**: P3

Old negotiation fields still exist in `leads` table but are no longer used:
- `max_negotiation_rounds`
- `ai_paused_for_buyer`
- `ai_paused_for_supplier`
- `buyer_chat_enabled`
- `supplier_chat_enabled`
- `negotiation_round`

Harmless but creates confusion. Clean up with a migration.

---

## 🔵 Unconfirmed / Under Investigation

### BUG-009: AI Context Memory in Long Q&A
**Status**: 🔵 Unconfirmed

If a lead accumulates many Q&A threads, `answer_qa_question` may not have enough context. Need to test with 10+ Q&A pairs.

### BUG-010: Card Generation Race Condition
**Status**: 🔵 Unconfirmed

If supplier clicks Generate Card twice quickly, two background tasks could fire for the same lead. The second would overwrite the first. Guard: check `card_status != 'generating'` before starting (already in endpoint — verify it holds under rapid clicks).

---

## 📋 Bug Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 | 0 | — |
| P1 | 2 | 🔴 Open |
| P2 | 3 | 🟡 Open |
| P3 | 1 | 🟢 Open |
| Unconfirmed | 2 | 🔵 Needs testing |
