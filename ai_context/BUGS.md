# Bisdom - Known Bugs & Issues

**Last Updated**: 2026-05-19

---

## 🐛 Critical Bugs (P0)

### ~~BUG-011: Navigation Fails After OTP Verification~~ ✅ FIXED
**Status**: ✅ Fixed (2026-05-19)  
**Priority**: P0 (Critical)  
**Severity**: Critical (System Unusable)

**Description**:
After successful OTP verification in conversational login, the app would restart the conversation instead of navigating to workspace. Users were stuck in an infinite login loop.

**Root Cause**:
Token was being saved to `localStorage` but NOT to zustand store. `ProtectedRoute` reads from zustand (`useAuthStore`), so it never saw the token and kept redirecting back to `/login`.

**Fix Applied**:
```javascript
// Before (BROKEN)
localStorage.setItem('token', response.data.access_token)
navigate('/workspace', { replace: true })  // ProtectedRoute redirects back

// After (WORKING)
setAuth(token, null, isOnboarded)  // Update zustand store
localStorage.setItem('token', token)
navigate('/workspace', { replace: true })  // Now works!
```

**Files Changed**:
- `ui/src/components/auth/ConversationalLogin.jsx`

**Fixed In**: Commit d914111  
**Fixed By**: Claude + Sakthi  
**Date**: 2026-05-19

---

## ⚠️ High Priority Bugs (P1)

### BUG-001: Admin Password Security Vulnerability
**Status**: 🔴 Open  
**Priority**: P1 (High)  
**Severity**: High (Production Blocker)

**Description**:
Admin panel uses time-based password (current time in HHMM format). Anyone with access to system time can login.

**Impact**:
- Unauthorized admin access
- Data breach risk
- No audit trail

**Location**:
- `api/app/api/v1/endpoints/admin.py::verify_admin_password()`
- `ui/src/components/admin/AdminLogin.jsx`

**Steps to Reproduce**:
1. Check current time (e.g., 14:30)
2. Go to `/admin/login`
3. Enter `1430`
4. Access granted

**Expected Behavior**:
- Proper admin authentication with username/password
- 2FA enabled
- Session management
- Audit logging

**Actual Behavior**:
- Time-based password accepted

**Fix Suggestions**:
```python
# Replace with proper auth
- def verify_admin_password(password: str) -> bool:
-     return password == datetime.now().strftime("%H%M")

+ def verify_admin_credentials(username: str, password: str, db: Session):
+     admin = db.query(Admin).filter(Admin.username == username).first()
+     if not admin:
+         return False
+     return verify_password(password, admin.hashed_password)
```

**Workaround**: Use only in development/demo environments

**Assigned To**: Unassigned  
**Created**: 2026-05-19

---

### BUG-002: Open CORS Policy
**Status**: 🔴 Open  
**Priority**: P1 (High)  
**Severity**: High (Production Blocker)

**Description**:
CORS is configured to allow all origins (`allow_origins = ["*"]`)

**Impact**:
- CSRF attacks possible
- Unauthorized API access
- Security risk

**Location**:
- `api/.env::ALLOWED_ORIGINS = ["*"]`
- `api/app/main.py::CORSMiddleware`

**Expected Behavior**:
```python
allow_origins=[
    "https://bisdom.com",
    "https://app.bisdom.com",
]
```

**Actual Behavior**:
```python
allow_origins=["*"]
```

**Fix**:
```python
# In production
ALLOWED_ORIGINS=https://bisdom.com,https://app.bisdom.com
```

**Assigned To**: Unassigned  
**Created**: 2026-05-19

---

## 🟠 Medium Priority Bugs (P2)

### BUG-003: Matching Service Unhandled Edge Cases
**Status**: 🟡 Open  
**Priority**: P2 (Medium)  
**Severity**: Medium

**Description**:
Matching service doesn't handle cases where supplier profile is incomplete

**Impact**:
- Potential crashes during matching
- Incorrect match scores
- Missing leads

**Location**:
- `api/app/services/matching_service.py::match_requirement_to_suppliers()`

**Scenarios Not Handled**:
1. `pricing_bands` is `null`
2. `product_categories` is empty array
3. `city` or `state` is `null`
4. `profile_build_status != "complete"`

**Example Error**:
```python
# When pricing_bands is null
TypeError: 'NoneType' object is not iterable
```

**Expected Behavior**:
- Skip suppliers with incomplete profiles
- Log warning
- Continue matching

**Actual Behavior**:
- May crash or return incorrect scores

**Fix**:
```python
def match_requirement_to_suppliers(requirement, db):
    suppliers = db.query(AgenticProfile).filter(
        AgenticProfile.is_supplier == True,
        AgenticProfile.profile_build_status == "complete",
        AgenticProfile.product_categories.isnot(None),  # Add null checks
        AgenticProfile.pricing_bands.isnot(None)
    ).all()
    
    for supplier in suppliers:
        try:
            score = calculate_match_score(requirement, supplier)
            # ... rest of logic
        except Exception as e:
            logger.warning(f"Skipping supplier {supplier.id}: {e}")
            continue
```

**Assigned To**: Unassigned  
**Created**: 2026-05-19

---

### BUG-004: ESLint Warnings in ChatPage.jsx
**Status**: 🟡 Open  
**Priority**: P2 (Low)  
**Severity**: Low (Code Quality)

**Description**:
Multiple ESLint warnings in ChatPage component

**Impact**:
- Code quality issues
- Potential bugs (unused variables)

**Location**:
- `ui/src/components/chat/ChatPage.jsx`

**Issues**:
```
Line 51:29  error  'is_new_user' is assigned a value but never used
Line 3:65   error  'supplierEscalation' is defined but never used
Line 149:84 error  Empty block statement
Line 150:13 error  Empty block statement
Line 154:19 error  setState in useEffect warning
```

**Fix**:
1. Remove unused variables
2. Fill empty blocks or remove them
3. Move setState out of useEffect or add to dependency array

**Assigned To**: Unassigned  
**Created**: 2026-05-19

---

### BUG-005: No Rate Limiting on API Endpoints
**Status**: 🟡 Open  
**Priority**: P2 (Medium)  
**Severity**: Medium (Production Risk)

**Description**:
API endpoints have no rate limiting, vulnerable to abuse

**Impact**:
- DDoS attacks possible
- Resource exhaustion
- Increased costs (AI API calls)

**Location**:
- All API endpoints

**Expected Behavior**:
- Rate limit: 100 requests/minute per IP
- Admin endpoints: 20 requests/minute
- AI endpoints: 10 requests/minute per user

**Fix**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/requirements/chat")
@limiter.limit("10/minute")
async def requirement_chat(...):
    ...
```

**Assigned To**: Unassigned  
**Created**: 2026-05-19

---

## 🟢 Low Priority Bugs (P3)

### BUG-006: Missing Input Validation
**Status**: 🟢 Open  
**Priority**: P3 (Low)  
**Severity**: Low

**Description**:
Some endpoints lack comprehensive input validation

**Examples**:
- Phone number format not validated (beyond basic checks)
- GSTIN format not strictly validated
- URL validation in onboarding

**Location**:
- Various endpoint schemas

**Fix**: Add Pydantic validators

---

### BUG-007: No Session Timeout
**Status**: 🟢 Open  
**Priority**: P3 (Low)  
**Severity**: Low

**Description**:
JWT tokens expire after 7 days, but no inactive session timeout

**Expected**: Auto-logout after 30 minutes of inactivity  
**Actual**: Token valid for full 7 days regardless of activity

**Fix**: Implement sliding session with refresh tokens

---

## 🔵 Potential Bugs (Unconfirmed)

### BUG-008: Race Condition in Negotiation Loop
**Status**: 🔵 Unconfirmed  
**Priority**: P2 (Medium)  
**Severity**: Unknown

**Description**:
Autonomous negotiation loop may have race condition if both agents respond simultaneously

**Location**:
- `api/app/api/v1/endpoints/conversations.py::_run_autonomous_negotiation_round()`

**Needs Investigation**: 
- [ ] Test with concurrent requests
- [ ] Check database locking
- [ ] Verify message ordering

---

### BUG-009: Memory Leak in AI Context
**Status**: 🔵 Unconfirmed  
**Priority**: P2 (Medium)  
**Severity**: Unknown

**Description**:
AI context grows unbounded in long negotiations

**Location**:
- `Conversation.ai_context` field

**Expected**: Context should be trimmed after N messages  
**Actual**: Full history stored, may cause memory issues

**Needs Investigation**:
- [ ] Test with 100+ message conversations
- [ ] Monitor memory usage
- [ ] Implement context windowing

---

### BUG-010: Database Connection Pool Exhaustion
**Status**: 🔵 Unconfirmed  
**Priority**: P1 (High)  
**Severity**: Unknown

**Description**:
No explicit connection pool configuration, may exhaust under load

**Location**:
- `api/app/db/base.py`

**Needs Investigation**:
- [ ] Load test with 100+ concurrent users
- [ ] Monitor connection count
- [ ] Configure pool size

**Suggested Fix**:
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600
)
```

---

## 📋 Bug Tracking Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 (Critical) | 1 | ✅ Fixed |
| P1 (High) | 2 | 🔴 Open |
| P2 (Medium) | 4 | 🟡 Open |
| P3 (Low) | 2 | 🟢 Open |
| Unconfirmed | 3 | 🔵 Needs Investigation |

**Total**: 12 issues tracked (1 fixed, 11 open)

---

## 🔍 Bug Investigation Needed

### Areas to Test:
1. ⚠️ **Load Testing**: Test with 50+ concurrent users
2. ⚠️ **Long-Running Negotiations**: 50+ message conversations
3. ⚠️ **Edge Cases**: Null values, missing data, invalid inputs
4. ⚠️ **Network Failures**: API timeouts, database disconnects
5. ⚠️ **Concurrent Operations**: Multiple users, same requirement

### Test Scenarios:
```
Scenario 1: Incomplete Supplier Profile
- Create supplier with null pricing_bands
- Post requirement
- Verify no crash, lead skipped

Scenario 2: Admin Brute Force
- Try 1000 login attempts
- Verify rate limiting (when implemented)

Scenario 3: Long Negotiation
- Create 100 messages in conversation
- Check memory usage
- Verify performance

Scenario 4: Concurrent Matching
- Post 10 requirements simultaneously
- Verify leads created correctly
- Check for race conditions

Scenario 5: Database Failure
- Simulate database disconnect
- Verify graceful error handling
- Check recovery
```

---

## 📊 Bug Severity Definitions

**P0 - Critical**:
- System down / unusable
- Data loss
- Security breach
- Fix immediately

**P1 - High**:
- Major feature broken
- Production blocker
- Security risk
- Fix before production

**P2 - Medium**:
- Feature partially broken
- Workaround exists
- Fix in next sprint

**P3 - Low**:
- Minor inconvenience
- UI/UX issue
- Fix when time permits

---

## 🛠️ Bug Fixing Workflow

1. **Reproduce**: Verify bug exists
2. **Investigate**: Root cause analysis
3. **Fix**: Implement solution
4. **Test**: Unit + integration tests
5. **Review**: Code review
6. **Deploy**: To staging first
7. **Verify**: Confirm fixed in production
8. **Close**: Update bug status

---

## 📝 Bug Reporting Template

```markdown
### BUG-XXX: [Short Description]
**Status**: 🔴/🟡/🟢/🔵  
**Priority**: P0/P1/P2/P3  
**Severity**: Critical/High/Medium/Low

**Description**: What is wrong

**Impact**: Effect on system/users

**Location**: File and function

**Steps to Reproduce**:
1. Step one
2. Step two
3. Expected vs Actual

**Fix Suggestion**: Proposed solution

**Assigned To**: Name  
**Created**: Date
```

---

## 🔄 Next Steps

1. ✅ Prioritize P1 bugs for immediate fix
2. ⚠️ Investigate unconfirmed bugs
3. 📊 Set up error tracking (Sentry)
4. 🧪 Create bug reproduction test suite
5. 📈 Monitor production for new issues
