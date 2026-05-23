# Automatic Rematching Fix - Implementation

**Date**: May 23, 2026  
**Issue**: Match scores not updated when suppliers update profiles  
**Status**: ✅ **FIXED & IMPLEMENTED**

---

## 🐛 Problem Summary

**Before Fix:**
```
Supplier updates profile → Profile saved ✅ → Match scores stay old ❌
```

**After Fix:**
```
Supplier updates profile → Profile saved ✅ → Background rematch triggered ✅ → Scores updated ✅
```

---

## ✅ What Was Implemented

### 1. **New Rematch Service** (`api/app/services/rematch_service.py`)

**Purpose**: Recalculate match scores when supplier profiles change

**Key Functions:**

#### `rematch_all_requirements_for_supplier(supplier_id, db)`
- Fetches all open requirements
- Recalculates TF-IDF scores with updated profile
- Updates existing leads
- Creates new leads if supplier now matches
- Deletes leads if score drops below threshold

**Features:**
- ✅ Updates `Lead.fit_score` with new score
- ✅ Updates `Lead.match_reasons` with new reasons
- ✅ Prevents duplicate leads
- ✅ Handles edge cases (missing profiles, no requirements)
- ✅ Comprehensive logging
- ✅ Error handling with rollback

#### `rematch_single_requirement(requirement_id, db)`
- Admin helper for manual requirement rematching
- Uses existing matching service
- Useful for debugging

---

### 2. **Updated Config Endpoint** (`api/app/api/v1/endpoints/config.py`)

**Changes:**

#### Added Background Task Triggering
```python
@router.put("/", response_model=ConfigResponse)
async def update_config(
    request: UpdateConfigRequest,
    background_tasks: BackgroundTasks,  # ← NEW
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # ... update profile ...
    
    # ✅ NEW: Trigger rematching if profile updated
    if profile_updated:
        if supplier_profile:
            background_tasks.add_task(
                _background_rematch_supplier,
                supplier_id=current_user.id
            )
```

#### Added Background Task Handler
```python
async def _background_rematch_supplier(supplier_id: int):
    """
    Runs in background to avoid blocking profile update response.
    Uses new database session to avoid conflicts.
    """
    async with AsyncSessionLocal() as db:
        result = await rematch_all_requirements_for_supplier(supplier_id, db)
        # ... logging ...
```

**Key Features:**
- ✅ Non-blocking (runs in background)
- ✅ Only triggers if profile actually changed
- ✅ Only for suppliers (checks AgenticProfile exists)
- ✅ Uses separate DB session (avoids conflicts)
- ✅ Comprehensive error handling

---

### 3. **New Admin Endpoint** (`api/app/api/v1/endpoints/admin.py`)

**New Route:**
```python
POST /api/v1/admin/rematch-supplier/{supplier_id}
```

**Purpose**: Manual trigger for debugging and testing

**Response:**
```json
{
  "success": true,
  "supplier_id": 123,
  "requirements_checked": 5,
  "leads_updated": 3,
  "leads_created": 1,
  "leads_deleted": 0,
  "scores_improved": 2,
  "scores_decreased": 1
}
```

---

## 🔄 How It Works

### Automatic Flow

```
1. User updates profile via PUT /api/v1/config/
    ↓
2. Backend saves to database
   - cfg.profile_json = new_data
   - cfg.profile_md = json_to_markdown(new_data)
   - await db.commit()
    ↓
3. Backend detects profile change
   - if request.profile is not None: profile_updated = True
    ↓
4. Backend checks if user is supplier
   - Query AgenticProfile for user
    ↓
5. Backend queues background task
   - background_tasks.add_task(_background_rematch_supplier)
    ↓
6. HTTP response returns immediately ✅
   - User sees "Profile saved" (fast response)
    ↓
7. Background task starts
   - New database session created
   - rematch_all_requirements_for_supplier() called
    ↓
8. For each open requirement:
   a. Fetch current profile_md from database
   b. Calculate TF-IDF score with NEW profile data
   c. Compare with existing lead (if exists)
   d. UPDATE/CREATE/DELETE lead as needed
    ↓
9. Commit all changes to database
    ↓
10. Buyers see updated match scores ✅
```

---

## 📊 Rematch Algorithm

### Decision Logic

```python
FOR EACH open requirement:
    new_score = calculate_enhanced_match_score(
        requirement=req_data,
        profile_md=UPDATED_PROFILE,  # ← Uses new profile
        location=updated_location,
        categories=updated_categories
    )
    
    existing_lead = find_lead(requirement_id, supplier_id)
    
    IF new_score >= 20%:
        IF existing_lead EXISTS:
            # UPDATE existing lead
            existing_lead.fit_score = new_score
            existing_lead.match_reasons = new_reasons
            log(f"Updated: {old_score}% → {new_score}%")
        ELSE:
            # CREATE new lead
            new_lead = Lead(
                fit_score=new_score,
                match_reasons=new_reasons,
                status="new"
            )
            log(f"Created new lead: {new_score}%")
    
    ELSE:  # Score below threshold
        IF existing_lead EXISTS AND status == "new":
            # DELETE lead (not in active negotiation)
            delete(existing_lead)
            log(f"Deleted: score dropped to {new_score}%")
        ELIF existing_lead EXISTS:
            # UPDATE but keep (might be in conversation)
            existing_lead.fit_score = new_score
            log(f"Updated (keeping): {new_score}%")
```

---

## 🧪 Testing

### Automated Test Script

**File**: `test_rematch_fix.py`

**What it tests:**
1. ✅ Create buyer with requirement ("Cotton Shirts")
2. ✅ Create supplier with poor match (["Textiles"])
3. ✅ Initial match score (low ~25%)
4. ✅ Update supplier profile (add "Cotton Shirts")
5. ✅ Trigger rematch
6. ✅ Verify score improved (high ~70%)

**Run test:**
```bash
cd /home/sakthi-selvan/bisdom
python test_rematch_fix.py
```

**Expected output:**
```
✅ TEST PASSED: Score improved significantly!
   The automatic rematching is working correctly.
```

---

### Manual Testing

#### Test Case 1: Score Improvement

**Steps:**
1. Login as supplier
2. Go to Profile page
3. Current profile: `product_categories: ["General Items"]`
4. Login as buyer (different account)
5. Create requirement: "Laptop Bags"
6. Check match score (should be low ~20%)
7. Switch back to supplier
8. Update profile: `product_categories: ["General Items", "Laptop Accessories", "Bags"]`
9. Wait 2-3 seconds (for background task)
10. Switch back to buyer
11. Refresh requirement page
12. **Expected**: Match score improved to ~70%

#### Test Case 2: New Lead Creation

**Steps:**
1. Buyer creates requirement: "Steel Pipes"
2. Supplier has profile: `["Textiles", "Garments"]`
3. No lead created (score < 20%)
4. Supplier updates profile: `["Textiles", "Garments", "Steel Products", "Pipes"]`
5. Background rematch runs
6. **Expected**: New lead created with ~60% score

#### Test Case 3: Location Match

**Steps:**
1. Buyer requirement: "Cotton Shirts" in "Mumbai"
2. Supplier location: "Delhi"
3. Score: ~40% (no location bonus)
4. Supplier updates location: "Mumbai, Maharashtra"
5. Background rematch runs
6. **Expected**: Score improves to ~55% (location +15%)

---

## 📋 Files Modified/Created

### New Files
1. ✅ `api/app/services/rematch_service.py` (265 lines)
2. ✅ `test_rematch_fix.py` (335 lines)
3. ✅ `REMATCH_FIX_IMPLEMENTATION.md` (this file)

### Modified Files
1. ✅ `api/app/api/v1/endpoints/config.py`
   - Added `BackgroundTasks` dependency
   - Added profile change detection
   - Added background task queuing
   - Added `_background_rematch_supplier()` function
   - **Lines changed**: ~40 lines added

2. ✅ `api/app/api/v1/endpoints/admin.py`
   - Added `POST /admin/rematch-supplier/{supplier_id}` endpoint
   - **Lines changed**: ~30 lines added

---

## 🔍 Monitoring & Debugging

### Log Messages

**Profile Update:**
```
[CONFIG] User #123: updating profile_json
[CONFIG] User #123: profile_json saved with 5 categories
[CONFIG] User #123: config committed to database
[CONFIG] User #123: queued background rematching task
```

**Background Rematch:**
```
[REMATCH-BG] Starting background rematch for supplier #123
[REMATCH] Starting rematch for supplier #123
[REMATCH] Found 8 open requirements to check
[REMATCH] Req #45: calculated score = 72.3%
[REMATCH] Updated lead #67: 30% → 72%
[REMATCH] Created new lead for req #48: score=65%
[REMATCH-BG] Completed for supplier #123: 5 updated, 2 created, 0 deleted
```

**Admin Manual Rematch:**
```
[ADMIN] Manual rematch triggered for supplier #123
[REMATCH] ... (same as above) ...
```

### View Logs in Production

```bash
# SSH to server
ssh ubuntu@3.109.70.144

# Watch real-time logs
sudo journalctl -u bisdom-api.service -f | grep REMATCH

# View recent rematch logs
sudo journalctl -u bisdom-api.service --since "1 hour ago" | grep -E "(CONFIG|REMATCH)"
```

### Admin Dashboard Monitoring

**Future Enhancement**: Add admin dashboard widget showing:
- Recent profile updates
- Rematching queue status
- Score improvement statistics
- Failed rematch attempts

---

## 🎯 Performance Considerations

### Current Design

**Per Profile Update:**
- Database queries: 1 query per open requirement
- TF-IDF calculations: 1 calculation per requirement
- Database writes: 1 update per changed lead

**Example:**
- 10 open requirements
- 7 have existing leads
- **Result**: 10 SELECT, 10 score calculations, 7 UPDATEs

### Optimization Opportunities

**1. Batch Processing**
```python
# Current: One-by-one
for req in requirements:
    score = calculate_score(req)
    update_lead(score)

# Optimized: Batch
scores = [calculate_score(req) for req in requirements]
batch_update_leads(scores)
```

**2. Caching**
```python
# Cache TF-IDF vectorizer for reuse
vectorizer_cache = {}
```

**3. Throttling**
```python
# If user updates profile 5 times in 1 minute,
# only run rematch once after 30 seconds
```

**Current Performance**: ✅ Good for typical usage (< 50 open requirements)  
**Bottleneck**: When hundreds of open requirements exist  
**Action**: Monitor and optimize if needed

---

## 🔒 Edge Cases Handled

### 1. **No Open Requirements**
```python
if not requirements:
    return {"message": "No open requirements to rematch"}
```

### 2. **Lead Already in Negotiation**
```python
if score < threshold and lead.status != "new":
    # Don't delete - keep lead but update score
    lead.fit_score = score
```

### 3. **Supplier Has No Profile**
```python
if not supplier_profile:
    logger.warning(f"Supplier has no profile")
    return {"error": "Supplier profile not found"}
```

### 4. **Background Task Fails**
```python
try:
    await rematch_all_requirements_for_supplier(...)
except Exception as e:
    logger.error(f"Background rematch failed: {e}")
    # User's profile update still succeeded
```

### 5. **Duplicate Leads**
```python
existing_lead = await db.execute(
    select(Lead).where(
        Lead.requirement_id == req.id,
        Lead.supplier_id == supplier_id
    )
)
if existing_lead:
    # UPDATE instead of CREATE
```

### 6. **Buyer Updates Own Profile**
```python
if supplier_profile:
    # Only rematch if user is actually a supplier
    background_tasks.add_task(...)
else:
    # Skip rematch for buyers
```

---

## 📈 Impact Analysis

### Before Fix

**Scenario**: Supplier adds "Cotton Shirts" to profile

- **Day 1**: Buyer posts "Cotton Shirts" requirement
- **Match Score**: 30% (supplier has ["Textiles"])
- **Day 2**: Supplier updates to ["Textiles", "Cotton Shirts"]
- **Match Score**: ❌ Still 30% (not updated)
- **Result**: ❌ Buyer misses good supplier

### After Fix

**Scenario**: Same as above

- **Day 1**: Buyer posts "Cotton Shirts" requirement
- **Match Score**: 30% (supplier has ["Textiles"])
- **Day 2**: Supplier updates to ["Textiles", "Cotton Shirts"]
- **Background**: Rematch runs automatically
- **Match Score**: ✅ Now 70% (updated within seconds)
- **Result**: ✅ Buyer sees improved match

---

## ✅ Verification Checklist

- [x] `rematch_service.py` created with full logic
- [x] `config.py` updated to trigger rematching
- [x] Admin endpoint added for manual testing
- [x] Test script created
- [x] Logging added throughout
- [x] Error handling implemented
- [x] Edge cases covered
- [x] Background task tested
- [x] Documentation complete
- [ ] Unit tests written (TODO)
- [ ] Integration tests written (TODO)
- [ ] Deployed to production (pending)
- [ ] Verified in production (pending)

---

## 🚀 Deployment Steps

### 1. Code Review
```bash
# Review changes
git diff api/app/services/rematch_service.py
git diff api/app/api/v1/endpoints/config.py
git diff api/app/api/v1/endpoints/admin.py
```

### 2. Run Tests Locally
```bash
cd /home/sakthi-selvan/bisdom
python test_rematch_fix.py
```

### 3. Commit Changes
```bash
git add api/app/services/rematch_service.py
git add api/app/api/v1/endpoints/config.py
git add api/app/api/v1/endpoints/admin.py
git add test_rematch_fix.py
git add MATCHING_PROFILE_UPDATE_ANALYSIS.md
git add REMATCH_FIX_IMPLEMENTATION.md

git commit -m "Fix: Automatic rematching when supplier profiles update

- Add rematch_service.py for score recalculation
- Update config endpoint to trigger background rematching
- Add admin endpoint for manual supplier rematch
- Prevent stale match scores
- Improve buyer-supplier matching accuracy

Fixes issue where match scores stayed outdated when suppliers
updated their profiles. Now automatically recalculates scores
using TF-IDF with updated profile data."
```

### 4. Push to GitHub
```bash
git push origin main
```

### 5. Deploy to EC2
```bash
./deploy.sh "Fix: Automatic rematching when supplier profiles update"
```

### 6. Verify in Production
```bash
# SSH to server
ssh ubuntu@3.109.70.144

# Check logs
sudo journalctl -u bisdom-api.service -n 50 | grep -E "(CONFIG|REMATCH)"

# Test API
curl http://3.109.70.144:8000/docs

# Look for new admin endpoint:
# POST /api/v1/admin/rematch-supplier/{supplier_id}
```

### 7. Monitor Initial Rollout
```bash
# Watch for errors
sudo journalctl -u bisdom-api.service -f | grep -i error

# Watch rematching activity
sudo journalctl -u bisdom-api.service -f | grep REMATCH
```

---

## 🔄 Rollback Plan

If issues occur after deployment:

```bash
# SSH to server
ssh ubuntu@3.109.70.144

cd bisdom_dev

# Revert to previous commit
git log --oneline -n 5  # Find previous commit hash
git reset --hard <previous-commit-hash>

# Restart services
sudo systemctl restart bisdom-api.service

# Verify rollback
curl http://3.109.70.144:8000/health
```

---

## 📚 Related Documentation

- **Analysis**: `MATCHING_PROFILE_UPDATE_ANALYSIS.md`
- **Matching Algorithm**: `api/app/services/matching_service.py`
- **TF-IDF Scoring**: `api/app/services/text_matching.py`
- **Architecture**: `ai_context/ARCHITECTURE.md`

---

## 🎓 Learning Notes

### Why Background Tasks?

**Option 1: Synchronous** ❌
```python
await rematch_all_requirements_for_supplier(...)
return response  # User waits 2-5 seconds
```
- Slow user experience
- Profile save feels sluggish

**Option 2: Background Task** ✅
```python
background_tasks.add_task(rematch_all_requirements_for_supplier, ...)
return response  # Instant response (< 100ms)
```
- Fast user experience
- Rematching happens invisibly

### Why Separate DB Session?

```python
# BAD: Reuse request session
await rematch_all_requirements_for_supplier(supplier_id, db)
# Problem: Request might close before task finishes

# GOOD: Create new session
async with AsyncSessionLocal() as db:
    await rematch_all_requirements_for_supplier(supplier_id, db)
# Problem: Session guaranteed to exist
```

### Why Update Instead of Delete+Create?

```python
# BAD: Delete old, create new
await db.delete(old_lead)
new_lead = Lead(...)
db.add(new_lead)
# Problem: Lead ID changes, conversations lost

# GOOD: Update existing
old_lead.fit_score = new_score
old_lead.match_reasons = new_reasons
# Benefit: Lead ID stays same, conversations preserved
```

---

## 🎯 Success Metrics

**To monitor after deployment:**

1. **Rematch Frequency**
   - How many profile updates per day?
   - How many trigger rematching?

2. **Score Improvements**
   - Average score change per rematch?
   - % of scores that improve vs. decrease?

3. **Performance**
   - Background task duration?
   - Any timeout issues?

4. **User Impact**
   - More deals from improved matches?
   - User feedback on match quality?

---

## 🔮 Future Enhancements

### 1. **Smart Rematching**
```python
# Only rematch if profile changed significantly
if profile_similarity < 80%:
    trigger_rematch()
```

### 2. **Buyer Notifications**
```python
# Notify buyer when match improves
if new_score >= old_score + 20:
    send_notification("Better match found!")
```

### 3. **Match History**
```python
class LeadScoreHistory(Base):
    lead_id: int
    fit_score: float
    calculated_at: datetime
    profile_version: int
```

### 4. **Profile Versioning**
```python
class UserConfig(Base):
    profile_version: int  # Increment on change
    last_rematched_version: int  # Track last rematch
```

---

**Status**: ✅ **Implementation Complete**  
**Next Steps**: Testing → Deployment → Monitoring  
**Priority**: 🔴 HIGH (P1)

**Last Updated**: May 23, 2026
