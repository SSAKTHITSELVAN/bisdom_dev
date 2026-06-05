# Bisdom - Task List & Roadmap

**Last Updated**: 2026-06-05

---

## ✅ Completed (Recent)

### Supplier Chat View ✅
Supplier now sees chat directly (no card tabs). ConversationView with perspective-aware bubbles.

### AI Never Closes Deals ✅
Both AI agents rewritten — they only chat, never accept/decline. All decisions escalated to humans.

### Actions Panel Redesign ✅
Desktop: permanent sticky right panel. Mobile: bell icon + slide-in drawer. Click marks done.

### Sticky Chat Layout ✅
Header + input stay fixed. Only messages scroll. Works on mobile without hiding chat.

### Requirement AI Uses Company Names ✅
"Ask AI" assistant shows supplier trade names instead of "Lead #123".

### Textile-Only Suggestions ✅
Removed steel/motors. All suggestion chips are textile examples.

### Chat Role Labels Fixed ✅
Bubbles show correct perspective (your msgs = right, theirs = left). Company names shown.

---

## 🔄 Current Sprint

### TASK-TEST-001: End-to-End Test
**Status**: Not Started | **Priority**: P0

Full cycle:
- [ ] Buyer posts textile requirement → matching → leads created
- [ ] AI loop runs → pauses for human (never auto-accepts)
- [ ] Buyer sees action → opens chat → accepts
- [ ] Supplier sees confirm action → confirms
- [ ] deal_closed → human chat works

### TASK-SEC-001: Secure Admin Authentication
**Status**: Not Started | **Priority**: P1

Replace HHMM time-based password with proper admin accounts + bcrypt.

### TASK-SEC-002: Restrict CORS
**Status**: Not Started | **Priority**: P1

Set `ALLOWED_ORIGINS=https://bisdomai.com`

---

## 📋 Backlog

- Structured logging (structlog)
- Integration tests
- Clean up unused Lead fields
- Error tracking (Sentry)
- DB connection pooling
- Redis caching
- Persistent background workers (Celery)
