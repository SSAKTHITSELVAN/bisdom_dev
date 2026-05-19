# AI Context Folder - Bisdom Project Memory

**Purpose**: This folder serves as a comprehensive knowledge base for AI assistants working on the Bisdom project. It contains structured information about what's working, what needs to be done, system architecture, bugs, tasks, and technical stack.

**Last Updated**: 2026-05-19

---

## 📁 Folder Contents

### 1. **PROJECT_STATUS.md** ⭐
**What it is**: Current state of the project - what's working and what's not

**When to read**:
- Starting work on the project
- After long breaks
- Before making architectural decisions
- When onboarding new team members

**Key sections**:
- ✅ Working features (detailed)
- ⚠️ Features needing testing
- 🐛 Known issues
- 🔧 Technical debt
- 📊 Code quality metrics
- 🔐 Security assessment
- 🎯 Next priority actions

**Quick Summary**: 
- **Status**: 🟢 Good (Development Phase)
- **Working**: Core platform, AI agents, admin panel
- **Needs**: Testing, production security, monitoring

---

### 2. **ARCHITECTURE.md** 🏗️
**What it is**: Technical architecture and system design

**When to read**:
- Before adding new features
- When debugging complex issues
- When planning integrations
- For understanding data flow

**Key sections**:
- High-level architecture diagram
- Component breakdown (Frontend, Backend, Database, AI)
- Data flow diagrams
- Entity relationship diagram
- AI agent system
- Matching algorithm details
- External integrations
- Scalability considerations

**Quick Summary**:
- **Stack**: React + FastAPI + PostgreSQL + AWS Bedrock
- **Architecture**: Monolithic (considering microservices)
- **AI**: Custom agent system with Qwen3 model

---

### 3. **BUGS.md** 🐛
**What it is**: Tracked bugs with priority, status, and fix suggestions

**When to read**:
- Before starting bug fixes
- During QA sessions
- When similar issues appear
- For sprint planning

**Key sections**:
- Critical bugs (P0) - Currently none ✅
- High priority bugs (P1) - 2 open
- Medium priority bugs (P2) - 4 open
- Low priority bugs (P3) - 2 open
- Unconfirmed potential bugs - 3
- Bug investigation needed

**Priority Bugs**:
1. **BUG-001**: Admin password security (P1) 🔴
2. **BUG-002**: Open CORS policy (P1) 🔴
3. **BUG-003**: Matching service edge cases (P2) 🟡

---

### 4. **TASKS.md** ✅
**What it is**: Prioritized task list and roadmap

**When to read**:
- Daily standup preparation
- Sprint planning
- When looking for next task
- For roadmap discussions

**Key sections**:
- Current sprint tasks (Week 1)
- High/Medium/Low priority
- Backlog (prioritized)
- Feature requests
- Task dashboard
- Roadmap (weekly breakdown)

**Immediate Tasks**:
1. **TASK-001**: End-to-end testing (P0) 🔄
2. **TASK-002**: Fix matching service (P1)
3. **TASK-003**: Secure admin auth (P1)
4. **TASK-004**: Add rate limiting (P2)

**Total Tasks**: 24 identified

---

### 5. **TECH_STACK.md** 💻
**What it is**: Complete technology stack documentation

**When to read**:
- Evaluating new technologies
- Before adding dependencies
- For technical documentation
- When discussing architecture

**Key sections**:
- Frontend stack (React, Vite, Tailwind, Zustand)
- Backend stack (FastAPI, SQLAlchemy, Python)
- AI stack (AWS Bedrock, Qwen3)
- Database stack (PostgreSQL)
- External services (GST API)
- Development tools
- Dependency list
- Deployment recommendations

**Stack Health**: 7.3/10 - Good foundation, needs hardening

---

## 🎯 Quick Start Guide for AI Assistants

### First Time Working on Bisdom?

**Step 1**: Read **PROJECT_STATUS.md** (15 minutes)
- Understand what's working
- Identify current priorities
- Note any blockers

**Step 2**: Skim **ARCHITECTURE.md** (10 minutes)
- Understand system structure
- Know where each component lives
- Grasp data flow

**Step 3**: Check **BUGS.md** and **TASKS.md** (5 minutes)
- See what's broken
- Know what's being worked on
- Identify your next task

**Step 4**: Reference **TECH_STACK.md** as needed
- When adding dependencies
- When making architectural decisions
- When debugging technology-specific issues

---

## 🔄 How to Use This Context

### Scenario: "User reports a bug"

1. **Check BUGS.md**: Is it already tracked?
2. **If new**: Add to BUGS.md with priority
3. **Check ARCHITECTURE.md**: Understand affected components
4. **Check PROJECT_STATUS.md**: Any related known issues?
5. **Create task in TASKS.md**: If fix needed

### Scenario: "Adding a new feature"

1. **Check PROJECT_STATUS.md**: Does it fit roadmap?
2. **Check ARCHITECTURE.md**: Where does it fit?
3. **Check TECH_STACK.md**: Do we need new dependencies?
4. **Check TASKS.md**: Add to backlog with estimate
5. **Check BUGS.md**: Any blockers?

### Scenario: "Production deployment planning"

1. **Check PROJECT_STATUS.md**: Deployment readiness checklist
2. **Check BUGS.md**: P0/P1 bugs must be fixed
3. **Check TASKS.md**: What's left before launch?
4. **Check ARCHITECTURE.md**: Scaling considerations
5. **Check TECH_STACK.md**: Production stack recommendations

### Scenario: "Performance issue"

1. **Check ARCHITECTURE.md**: Bottlenecks section
2. **Check BUGS.md**: Similar issues?
3. **Check PROJECT_STATUS.md**: Performance metrics
4. **Check TECH_STACK.md**: Optimization options
5. **Add to TASKS.md**: Performance testing task

---

## 📊 Project Dashboard (Quick View)

### Status Overview
```
Overall Health:      🟢 Good (Development Phase)
Features Working:    ✅ 80%
Tests Coverage:      ❌ 0%
Production Ready:    ⚠️ No (security issues)
Documentation:       ✅ Excellent
```

### Immediate Priorities
```
1. 🔄 End-to-end testing          (In Progress)
2. 🔴 Secure admin authentication (High Priority)
3. 🔴 Fix CORS policy             (High Priority)
4. 🟡 Add rate limiting           (Medium Priority)
5. 🟡 Fix matching edge cases     (Medium Priority)
```

### Blockers
```
None currently
```

### This Week's Goals
```
- Complete end-to-end test
- Fix 2 P1 security bugs
- Add rate limiting
- Start unit tests
```

---

## 📝 Update Guidelines

### When to Update These Files

**PROJECT_STATUS.md**:
- ✅ Feature completed
- 🐛 New critical issue found
- 📊 Major milestone reached
- 🔄 Weekly status update

**ARCHITECTURE.md**:
- 🏗️ New component added
- 🔌 New integration added
- 📦 Major architectural change
- 🚀 Scaling changes

**BUGS.md**:
- 🐛 New bug discovered
- ✅ Bug fixed
- 🔄 Bug status changed
- 📊 After QA session

**TASKS.md**:
- ✅ Task completed
- 📝 New task identified
- 🔄 Sprint planning
- 📊 Daily/weekly updates

**TECH_STACK.md**:
- 📦 New dependency added
- 🔄 Technology upgraded
- 🚀 New service integrated
- 📊 Quarterly review

### Update Template

```markdown
**Update**: [Date] - [Who]
**Change**: [What changed]
**Reason**: [Why it changed]
**Impact**: [What it affects]
```

---

## 🤖 AI Assistant Best Practices

### Do's ✅
- ✅ Read PROJECT_STATUS.md first
- ✅ Update files after major changes
- ✅ Add new bugs to BUGS.md
- ✅ Add new tasks to TASKS.md
- ✅ Reference architecture when explaining
- ✅ Keep information current

### Don'ts ❌
- ❌ Make assumptions without checking docs
- ❌ Skip reading existing context
- ❌ Duplicate information across files
- ❌ Leave outdated information
- ❌ Forget to update after changes

### Communication Style
```
Good: "According to PROJECT_STATUS.md, the admin panel is fully functional. However, BUGS.md shows BUG-001 about weak password security."

Bad: "The admin panel works but has security issues."
```

---

## 📚 Related Documentation

### In Project Root
- `README.md` - General project overview
- `IMPLEMENTATION_NOTES.md` - Recent implementations
- `PROFILE_ENHANCEMENT.md` - Profile system docs
- `ADMIN_IMPLEMENTATION.md` - Admin system docs
- `ADMIN_QUICKSTART.md` - Admin access guide

### In Code
- `api/app/main.py` - Backend entry point
- `ui/src/App.jsx` - Frontend entry point
- `api/.env` - Configuration (not in git)
- `ui/package.json` - Frontend dependencies
- `api/requirements.txt` - Backend dependencies

---

## 🎯 Context Usage Checklist

Before starting any work:

- [ ] Read PROJECT_STATUS.md (current state)
- [ ] Check BUGS.md (known issues)
- [ ] Review TASKS.md (what's being worked on)
- [ ] Reference ARCHITECTURE.md (where things are)
- [ ] Consult TECH_STACK.md (technology decisions)

After completing work:

- [ ] Update PROJECT_STATUS.md (if status changed)
- [ ] Update BUGS.md (if bugs fixed/found)
- [ ] Update TASKS.md (mark done, add new)
- [ ] Update ARCHITECTURE.md (if structure changed)
- [ ] Update TECH_STACK.md (if dependencies changed)

---

## 🔍 Quick Reference

### Find Information About...

**"What's working?"** → PROJECT_STATUS.md (What's Working section)

**"What needs to be done?"** → TASKS.md (Current Sprint section)

**"What's broken?"** → BUGS.md (All bugs listed by priority)

**"How does X work?"** → ARCHITECTURE.md (Component Breakdown)

**"What technology is used?"** → TECH_STACK.md (Stack Overview)

**"Where is X in the code?"** → ARCHITECTURE.md (Structure section)

**"Can I add dependency Y?"** → TECH_STACK.md (Dependencies section)

**"Is feature Z production-ready?"** → PROJECT_STATUS.md (Deployment Readiness)

---

## 📞 Support & Questions

If you can't find information in these files:
1. Check main project README.md
2. Review code comments
3. Check API documentation at `/docs`
4. Ask the team

---

## 📈 Metrics

**Files**: 5  
**Total Lines**: ~3000+  
**Information Density**: High  
**Update Frequency**: Weekly (or after major changes)  
**Completeness**: 95%  

---

## 🎉 Success Criteria

This context folder is successful if:

- ✅ New team members can understand project in < 1 hour
- ✅ AI assistants can work effectively without repeated questions
- ✅ Bugs and tasks are tracked and prioritized
- ✅ Architecture decisions are documented and justified
- ✅ Technology stack is clear and up-to-date
- ✅ Project status is always current
- ✅ No duplicate or conflicting information

---

## 🚀 Next Steps

1. Keep these files updated (weekly)
2. Add more details as project grows
3. Create additional context files as needed:
   - TESTING.md (when tests added)
   - DEPLOYMENT.md (for production)
   - API_DOCS.md (detailed API reference)
   - TROUBLESHOOTING.md (common issues)

---

**Remember**: These files are living documents. Keep them updated, and they'll keep helping you build better!

---

_Last Updated: 2026-05-19_  
_Maintained by: Bisdom Team_  
_For AI Assistants: Read before coding, update after changes_
