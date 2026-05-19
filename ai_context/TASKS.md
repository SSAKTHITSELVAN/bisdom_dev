# Bisdom - Task List & Roadmap

**Last Updated**: 2026-05-19

---

## 🎯 Current Sprint (Week 1)

### High Priority Tasks

#### TASK-001: End-to-End Testing ✅➡️🔄
**Status**: In Progress  
**Priority**: P0 (Critical)  
**Assigned**: Pending  
**Estimate**: 2 days

**Description**:
Complete end-to-end testing with 2 real users (1 buyer, 1 supplier)

**Acceptance Criteria**:
- [ ] User A registers as buyer
- [ ] User B registers as supplier  
- [ ] User A posts requirement
- [ ] Requirement matches User B
- [ ] Lead created
- [ ] Supplier AI initiates conversation
- [ ] Buyer AI responds
- [ ] At least 3 negotiation rounds
- [ ] Deal confirmed OR timeout reached
- [ ] All data visible in admin panel

**Sub-tasks**:
1. Create test accounts
2. Complete onboarding for both
3. Post test requirement (e.g., "100 cotton t-shirts")
4. Monitor matching service
5. Verify lead creation
6. Watch AI negotiation
7. Document results

**Blockers**: None

---

#### TASK-002: Fix Matching Service Edge Cases
**Status**: Not Started  
**Priority**: P1 (High)  
**Assigned**: Pending  
**Estimate**: 4 hours

**Description**:
Add null checks and error handling to matching service

**Files to Modify**:
- `api/app/services/matching_service.py`

**Changes Needed**:
```python
# Add filters
suppliers = db.query(AgenticProfile).filter(
    AgenticProfile.is_supplier == True,
    AgenticProfile.profile_build_status == "complete",
    AgenticProfile.product_categories.isnot(None),
    AgenticProfile.pricing_bands.isnot(None)
).all()

# Add try-catch
for supplier in suppliers:
    try:
        score = calculate_match_score(requirement, supplier)
        if score >= 30:
            leads.append(...)
    except Exception as e:
        logger.warning(f"Skipping supplier {supplier.id}: {e}")
        continue
```

**Acceptance Criteria**:
- [ ] No crashes when profile incomplete
- [ ] Logging for skipped suppliers
- [ ] Match scores calculated correctly
- [ ] Tests written

---

#### TASK-003: Secure Admin Authentication
**Status**: Not Started  
**Priority**: P1 (High)  
**Assigned**: Pending  
**Estimate**: 1 day

**Description**:
Replace time-based password with proper admin auth

**Options**:
1. **Option A**: Add Admin table with username/password
2. **Option B**: Use existing User table with `is_admin` flag
3. **Option C**: OAuth (Google/GitHub)

**Recommended**: Option A

**Implementation**:
```python
# New model
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# New endpoints
POST /admin/login (username, password)
POST /admin/logout
GET /admin/me

# Frontend updates
- AdminLogin.jsx: Add username field
- Store JWT token instead of time password
```

**Acceptance Criteria**:
- [ ] Admin table created
- [ ] Password hashing implemented
- [ ] Login endpoint secured
- [ ] Frontend updated
- [ ] Migration script created

---

### Medium Priority Tasks

#### TASK-004: Add Rate Limiting
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Assigned**: Pending  
**Estimate**: 4 hours

**Description**:
Implement rate limiting on all API endpoints

**Library**: `slowapi` (FastAPI-compatible)

**Install**:
```bash
pip install slowapi
```

**Implementation**:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply limits
@router.post("/requirements/chat")
@limiter.limit("10/minute")
async def requirement_chat(...):
    ...
```

**Limits to Set**:
- Auth endpoints: 5/minute
- Requirement chat: 10/minute
- Admin endpoints: 20/minute
- General: 100/minute

**Acceptance Criteria**:
- [ ] Rate limiting installed
- [ ] Limits configured
- [ ] Error messages friendly
- [ ] Documented in API docs

---

#### TASK-005: Fix ESLint Warnings
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Assigned**: Pending  
**Estimate**: 1 hour

**Description**:
Clean up ESLint warnings in ChatPage.jsx

**File**: `ui/src/components/chat/ChatPage.jsx`

**Changes**:
1. Remove unused `is_new_user` variable
2. Remove unused `supplierEscalation` import
3. Fill or remove empty blocks (lines 149-150)
4. Fix setState in useEffect (line 154)

**Acceptance Criteria**:
- [ ] All ESLint errors resolved
- [ ] No functionality broken
- [ ] Build passes

---

#### TASK-006: Add Structured Logging
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Assigned**: Pending  
**Estimate**: 4 hours

**Description**:
Implement structured JSON logging

**Library**: `structlog`

**Setup**:
```python
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Usage
logger.info("requirement_created", 
    requirement_id=123, 
    user_id=456, 
    product="cotton t-shirts"
)
```

**Logs Needed**:
- User authentication
- Requirement creation
- Lead generation
- AI calls (with latency)
- Errors (with stack traces)

**Acceptance Criteria**:
- [ ] structlog installed
- [ ] Logs in JSON format
- [ ] Critical events logged
- [ ] Log levels configured

---

### Low Priority Tasks

#### TASK-007: Database Migration Setup
**Status**: Not Started  
**Priority**: P3 (Low)  
**Assigned**: Pending  
**Estimate**: 2 hours

**Description**:
Create initial Alembic migration and document process

**Steps**:
```bash
cd api
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

**Acceptance Criteria**:
- [ ] Initial migration created
- [ ] Migration tested
- [ ] Documentation written
- [ ] Rollback tested

---

#### TASK-008: Add Health Check Endpoint
**Status**: Not Started  
**Priority**: P3 (Low)  
**Assigned**: Pending  
**Estimate**: 1 hour

**Description**:
Enhance /health endpoint with detailed checks

**Current**:
```python
@app.get("/health")
async def health():
    return {"status": "healthy"}
```

**Enhanced**:
```python
@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    checks = {
        "status": "healthy",
        "database": "unknown",
        "bedrock": "unknown",
        "gst_api": "unknown"
    }
    
    # Database check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except:
        checks["database"] = "unhealthy"
        checks["status"] = "degraded"
    
    # Bedrock check
    try:
        # Simple ping to bedrock
        checks["bedrock"] = "healthy"
    except:
        checks["bedrock"] = "unhealthy"
    
    return checks
```

**Acceptance Criteria**:
- [ ] Database connectivity checked
- [ ] External APIs checked
- [ ] Status codes correct (200/503)

---

## 🚀 Sprint 2 (Week 2)

### TASK-009: Unit Test Suite
**Status**: Not Started  
**Priority**: P1 (High)  
**Estimate**: 3 days

**Description**:
Write unit tests for critical functions

**Framework**: pytest

**Files to Test**:
- `matching_service.py`
- `requirement_agent.py`
- `supplier_agent.py`
- `buyer_agent.py`
- All endpoints

**Target Coverage**: 60%

---

### TASK-010: Integration Tests
**Status**: Not Started  
**Priority**: P1 (High)  
**Estimate**: 2 days

**Description**:
Write integration tests for API endpoints

**Test Cases**:
- Auth flow
- Onboarding flow
- Requirement creation
- Lead generation
- Conversation flow

---

### TASK-011: Frontend Tests
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Estimate**: 2 days

**Description**:
Add React Testing Library tests

**Components to Test**:
- AdminLogin
- NewRequirementChat
- ProfilePanel
- ConversationView

---

### TASK-012: Error Tracking (Sentry)
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Estimate**: 4 hours

**Description**:
Integrate Sentry for error tracking

**Setup**:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="...",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
)
```

---

### TASK-013: Performance Monitoring
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Estimate**: 1 day

**Description**:
Add Prometheus metrics

**Metrics to Track**:
- Request count
- Response time
- Error rate
- AI call latency
- Database query time

---

## 📋 Backlog (Prioritized)

### High Priority Backlog

#### TASK-014: Restrict CORS
**Priority**: P1  
**Estimate**: 30 minutes

Change `ALLOWED_ORIGINS` from `["*"]` to specific domains

---

#### TASK-015: Add Input Validation
**Priority**: P1  
**Estimate**: 4 hours

Add Pydantic validators for:
- Phone number format
- GSTIN format (15 chars, alphanumeric)
- URL validation

---

#### TASK-016: Session Management
**Priority**: P1  
**Estimate**: 1 day

Implement:
- Refresh tokens
- Sliding session (30 min inactive timeout)
- Token revocation

---

### Medium Priority Backlog

#### TASK-017: AI Cost Monitoring
**Priority**: P2  
**Estimate**: 1 day

Track and alert on AI API costs

---

#### TASK-018: Database Connection Pooling
**Priority**: P2  
**Estimate**: 2 hours

Configure connection pool explicitly

---

#### TASK-019: Caching Layer
**Priority**: P2  
**Estimate**: 2 days

Add Redis for:
- User sessions
- Profile data
- Match results

---

#### TASK-020: Message Queue
**Priority**: P2  
**Estimate**: 3 days

Add Celery for background tasks:
- Matching service
- AI negotiations
- Email notifications

---

### Low Priority Backlog

#### TASK-021: API Documentation
**Priority**: P3  
**Estimate**: 1 day

Enhance Swagger docs with examples

---

#### TASK-022: Admin Audit Logs
**Priority**: P3  
**Estimate**: 1 day

Log all admin actions

---

#### TASK-023: Export Features
**Priority**: P3  
**Estimate**: 2 days

Export requirements/leads to CSV

---

#### TASK-024: Analytics Dashboard
**Priority**: P3  
**Estimate**: 3 days

Advanced analytics in admin panel

---

## 🎨 Feature Requests

### FR-001: Email Notifications
**Status**: Backlog  
**Priority**: P2  
**Estimate**: 3 days

Send emails for:
- Requirement matched
- New message
- Deal confirmed

---

### FR-002: SMS Notifications
**Status**: Backlog  
**Priority**: P3  
**Estimate**: 2 days

SMS for critical events

---

### FR-003: Mobile App
**Status**: Backlog  
**Priority**: P3  
**Estimate**: 2 months

React Native mobile app

---

### FR-004: Multi-language Support
**Status**: Backlog  
**Priority**: P3  
**Estimate**: 1 week

Support Hindi, Tamil, etc.

---

### FR-005: Bulk Upload
**Status**: Backlog  
**Priority**: P2  
**Estimate**: 1 week

Upload multiple requirements via CSV

---

## 📊 Task Dashboard

### By Priority
| Priority | Count | Status |
|----------|-------|--------|
| P0 | 1 | 🔄 In Progress |
| P1 | 6 | ❌ Not Started |
| P2 | 10 | ❌ Not Started |
| P3 | 7 | ❌ Not Started |

### By Status
| Status | Count |
|--------|-------|
| ✅ Done | 0 |
| 🔄 In Progress | 1 |
| ❌ Not Started | 23 |
| 🚫 Blocked | 0 |

### By Category
| Category | Count |
|----------|-------|
| Testing | 5 |
| Security | 4 |
| Infrastructure | 5 |
| Features | 5 |
| Bug Fixes | 2 |
| DevOps | 2 |

---

## 📅 Roadmap

### Week 1 (Current)
- End-to-end testing
- Fix matching service
- Secure admin auth
- Add rate limiting

### Week 2
- Unit tests (60% coverage)
- Integration tests
- Error tracking
- Performance monitoring

### Week 3
- Frontend tests
- Caching layer (Redis)
- Connection pooling
- Input validation

### Week 4
- Message queue (Celery)
- Session management
- CORS restrictions
- Documentation

### Month 2
- Email notifications
- Analytics dashboard
- Bulk operations
- Mobile app (start)

### Month 3
- Production deployment
- CI/CD pipeline
- Load testing
- Security audit

---

## 🎯 Definition of Done

For each task to be considered "Done":

- [ ] Code written and reviewed
- [ ] Unit tests added (if applicable)
- [ ] Integration tests added (if applicable)
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Tested locally
- [ ] Tested on staging (when available)
- [ ] Merged to main branch

---

## 📝 Task Template

```markdown
### TASK-XXX: [Task Name]
**Status**: Not Started / In Progress / Done / Blocked  
**Priority**: P0/P1/P2/P3  
**Assigned**: Name  
**Estimate**: X hours/days

**Description**: What needs to be done

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Sub-tasks**: (if applicable)
1. Sub-task 1
2. Sub-task 2

**Blockers**: Any blockers

**Related**: Related tasks/bugs
```

---

## 🔄 Task Workflow

```
Backlog → In Progress → Code Review → Testing → Done
   ↓           ↓            ↓           ↓        ↓
 Planned    Active      Review     Verify   Deploy
```

---

## 📈 Progress Tracking

### Sprint Velocity
- **Week 1 Target**: Complete 4 P0/P1 tasks
- **Week 2 Target**: Complete 5 P1/P2 tasks
- **Week 3 Target**: Complete 6 P2/P3 tasks

### Team Capacity
- **Backend Dev**: TBD
- **Frontend Dev**: TBD
- **DevOps**: TBD
- **QA**: TBD

---

## 🎉 Next Actions

1. ✅ **Start TASK-001**: End-to-end testing
2. ⚠️ **Prioritize**: Security tasks (TASK-003, TASK-014)
3. 📊 **Assign**: Tasks to team members
4. 📅 **Schedule**: Sprint planning meeting
5. 🔄 **Update**: This document weekly
