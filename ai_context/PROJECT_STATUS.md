# Bisdom Project - Current Status

**Last Updated**: 2026-06-05
**Status**: Active Development
**Version**: 1.3.0
**Domain**: Textile B2B Commerce (Indian SMEs)

---

## 🎯 Project Overview

**Bisdom** is an AI-powered B2B Commerce Platform for Indian textile SMEs. After matching, buyer and supplier AI agents negotiate autonomously via chat. Humans are prompted only when a decision is needed. AI never accepts/closes/declines deals — only humans do.

### Core Flow
```
Buyer posts textile requirement → AI enriches → confirmed →
Matching runs → Leads created →
AI agents chat (buyer AI ↔ supplier AI, like WhatsApp) →
  AI pauses when: decision needed from either side →
Human buyer: Accept / Renegotiate / Decline / Take over chat →
  Accept → awaiting_supplier_confirm →
Human supplier: Confirm / Reject →
  Confirm → deal_closed (human chat opens)
```

### Key Principle
**AI only talks — humans decide.** AI agents never accept, confirm, decline, or close deals. They negotiate, share info, and escalate to humans for all decisions.

---

## ✅ What's Working

### 1. Authentication & Onboarding ✅
- Phone OTP auth, conversational login UI, GSTIN verification, profile creation
- All login flows store user_id properly for role detection

### 2. Profile Management ✅
- Markdown profile stored in `user_configs.profile_md`

### 3. Requirement Enrichment ✅
- AI-guided conversational enrichment (textile-focused suggestions)
- Confirmation modal before posting

### 4. Supplier Matching ✅
- MiniLM embeddings + hard SQL filters; fallback to TF-IDF
- Threshold: fit_score >= 15%

### 5. AI Negotiation Chat ✅
- Both AI agents chat like WhatsApp — short, natural, 2-4 sentences
- Supplier AI leads with pricing options immediately
- Buyer AI negotiates price, never reveals budget
- AI never accepts/closes deals — always escalates to human
- If AI accidentally outputs acceptance → force-escalated to human
- Raw XML tags never shown (fallback messages used)

### 6. Conversation UI ✅
- Supplier sees chat directly (no card tabs)
- Chat bubbles perspective-aware (your msgs on right, theirs on left)
- Role labels show company names (not "Lead #123")
- Sticky header + sticky input box, only messages scroll
- Mobile-friendly: compact header, icon-only buttons

### 7. Actions System ✅
- Desktop: permanent sticky panel on right side (240px)
- Mobile: bell icon in top-right, opens slide-in panel
- Click action → navigates to chat, marks as done (dull color, moves to bottom)
- Clear All button
- Incomplete items at top, done items at bottom

### 8. Requirement AI Assistant ✅
- "Ask AI about this" chat shows supplier company names
- Never mentions "Lead #" — always uses trade names

### 9. Admin Panel ✅
- Time-based password (P1 security issue — dev/demo only)

### 10. Rate Limiting ✅
- slowapi on auth + all card flow endpoints

---

## ⚠️ What Needs Testing

- [ ] Full negotiation → AI pauses → human accepts → supplier confirms → deal closed
- [ ] Supplier decline flow
- [ ] AI never auto-accepts even after many rounds
- [ ] Mobile actions panel navigation works
- [ ] Sticky header/input on various phone sizes

---

## 🐛 Known Issues

### BUG-001: Admin Password Security (P1 — Production Blocker)
Time-based HHMM password. Fix: replace with proper admin accounts.

### BUG-002: CORS Open to All Origins (P1 — Production Blocker)
`allow_origins=["*"]`. Fix: restrict to actual domains.

### BUG-003: Matching Service Edge Cases (P2)
Null pricing_bands/categories can cause legacy matching errors.

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
