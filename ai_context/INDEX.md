# AI Context - Quick Index

📁 **ai_context/** - Complete project memory for AI assistants

---

## 📄 Files Overview

| File | Purpose | Priority |
|------|---------|----------|
| [README.md](README.md) | How to use this folder | ⭐ Start Here |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | What's working, current flow | ⭐⭐⭐ Critical |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, new card flow, all components | ⭐⭐⭐ Critical |
| [BUGS.md](BUGS.md) | Known issues | ⭐⭐ Important |
| [TASKS.md](TASKS.md) | To-do list & roadmap | ⭐⭐ Important |
| [TECH_STACK.md](TECH_STACK.md) | Technologies used | ⭐ Reference |
| [DEPLOYMENT.md](DEPLOYMENT.md) | AWS EC2 deployment guide | ⭐⭐⭐ Critical |
| [CONVERSATIONAL_LOGIN.md](CONVERSATIONAL_LOGIN.md) | Login UI implementation | ⭐ Reference |

---

## 🎯 Quick Navigation

**Starting work? Read in this order:**
1. PROJECT_STATUS.md → understand current state
2. ARCHITECTURE.md → understand the card flow
3. BUGS.md → check open blockers
4. TASKS.md → pick work

**Deploying?** → DEPLOYMENT.md (unchanged, still accurate)

---

## 🔥 Current Architecture (2026-06-01)

The core user flow is now:
```
Buyer posts requirement
→ AI matches suppliers (fit score)
→ Supplier generates offer card (AI, single-shot)
→ Supplier asks Q&A if needed → buyer/AI answers
→ Supplier submits card
→ Buyer compares all submitted cards → picks one
→ Human-to-human deal chat → deal closes
```

**No more AI negotiation loops.** The old `_run_autonomous_negotiation_round()` is gone.

---

## 📊 Project Health (2026-06-01)

**Overall**: 🟢 Good (8/10)
**Features**: ~90% complete
**Tests**: 10 unit tests passing
**Production Ready**: No (CORS + Admin auth blockers)

**Bugs**: 2 P1 open (admin auth, CORS), 3 P2 open
**Tasks**: 7 active + 6 backlog

---

## 📝 Last Updated

- **Date**: 2026-06-01
- **By**: Claude + Sakthi
- **Changes**:
  - Replaced AI negotiation loop with Supplier Card Flow
  - Added card_agent.py, cards.py, SupplierCardQA model
  - Added slowapi rate limiting
  - New frontend: SupplierLeadsPanel, BuyerCardsView, DealChat
  - Updated Sidebar, ActionsPanel, RequirementOverview, MainPanel
  - 10/10 unit tests passing
