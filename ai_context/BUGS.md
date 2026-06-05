# Bisdom - Known Bugs & Issues

**Last Updated**: 2026-06-05

---

## ✅ Fixed (Recent Session)

- ~~Supplier only sees card, no chat~~ → Now shows ConversationView directly
- ~~Chat bubbles always show buyer perspective~~ → Perspective-aware based on user role
- ~~"You" label on both sides~~ → Shows company names via counterpart API
- ~~isBuyer always false (old sessions)~~ → Fallback to route-based detection + all login flows store user_id
- ~~Sticky header hides all chat on mobile~~ → Compact header, removed info cards from sticky section
- ~~AI outputs raw XML tags~~ → Fallback messages ("Let me check with my team")
- ~~AI auto-accepts/closes deals~~ → Never. Always escalates to human.
- ~~"Lead #118" in AI assistant~~ → Shows supplier company names
- ~~Steel/motors in suggestions~~ → Textile-only examples

---

## 🔴 High Priority (P1 — Production Blockers)

### BUG-001: Admin Password Security
Admin panel uses HHMM time-based password.
**Fix**: Proper Admin table + bcrypt.

### BUG-002: Open CORS Policy
`allow_origins=["*"]`.
**Fix**: Set to production domain.

---

## 🟡 Medium Priority (P2)

### BUG-003: Matching Service Edge Cases
Null pricing_bands/categories can cause legacy matching errors.

### BUG-005: No Rate Limiting on Legacy Endpoints
`/requirements/chat`, `/onboarding/*`, `/admin/*` not rate-limited.

---

## 🔵 Unconfirmed

### BUG-009: AI Context Memory in Long Negotiations
If conversation > 15 rounds, AI context may be too large/expensive.

### BUG-019: Autonomous Loop Persistence
Loop runs in-process. Server restart kills it. Leads stuck in "negotiating".
**Workaround**: Human can send message to kick AI.
