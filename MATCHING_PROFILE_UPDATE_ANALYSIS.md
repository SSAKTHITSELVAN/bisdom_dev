# Matching Algorithm & Profile Updates - Analysis

**Date**: May 23, 2026  
**Issue**: What happens to TF-IDF matching scores when a supplier updates their profile?  
**Status**: ⚠️ **POTENTIAL ISSUE IDENTIFIED**

---

## 🔍 Current Behavior

### When Does Matching Happen?

**Matching is triggered ONLY when a buyer confirms a requirement**, not when suppliers update their profiles.

**Flow:**
```
Buyer confirms requirement
    ↓
POST /api/v1/requirements/confirm
    ↓
Background task: run_matching_task(requirement_id)
    ↓
match_requirement_to_suppliers(requirement, db)
    ↓
For each supplier profile:
    - Fetch profile_md from UserConfig
    - Calculate TF-IDF score
    - Create Lead if score >= 20%
```

**Location**: `api/app/api/v1/endpoints/requirements.py` (lines 164-211)

---

## 📊 How TF-IDF Scoring Works

### Data Sources for Matching

**From Requirement:**
```python
requirement_text = build_requirement_text({
    "product": req.product,
    "quantity": req.quantity,
    "specifications": req.specifications,
    "delivery_location": req.delivery_location,
    "budget_max": req.budget_max,
    "order_type": req.order_type
})
```

**From Supplier Profile:**
```python
profile_text = build_profile_text(
    profile_md=user_config.profile_md,      # ← FROM DATABASE
    location=f"{city}, {state}",
    categories=profile.product_categories
)
```

### Score Calculation

**Location**: `api/app/services/text_matching.py`

```python
score = calculate_enhanced_match_score(
    requirement=requirement_dict,
    profile_md=profile_md,              # ← FETCHED FROM DB
    location=location,
    categories=supplier_profile.product_categories,
    pricing_available=bool(supplier_profile.pricing_bands)
)

# Formula:
# score = text_similarity * 0.7   (TF-IDF cosine similarity)
#       + location_match * 15%
#       + pricing_bonus * 5%
#       + categories_bonus * 5%
#       + product_match_bonus * 5%
```

**TF-IDF Method:**
```python
vectorizer = TfidfVectorizer(
    max_features=100,
    ngram_range=(1, 2),      # unigrams + bigrams
    min_df=1,
    stop_words='english'
)
tfidf_matrix = vectorizer.fit_transform([req_clean, profile_clean])
similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
```

---

## ⚠️ **THE PROBLEM**

### When Supplier Updates Profile

**Current Flow:**
```
1. Supplier updates profile
    ↓
   PUT /api/v1/config/
    ↓
2. Backend updates UserConfig table:
   - cfg.profile_json = new_profile_data
   - cfg.profile_md = json_to_markdown(new_profile_data)
   - await db.commit()
    ↓
3. ✅ Profile saved to database
    ↓
4. ❌ NO REMATCHING TRIGGERED
    ↓
5. ❌ Existing leads keep OLD match scores
```

**Location**: `api/app/api/v1/endpoints/config.py` (lines 75-108)

### Impact on Existing Leads

**Scenario 1: Supplier Adds Products**
```
Initial profile:
  - Products: [T-Shirts]
  - Match with "Cotton Shirts" requirement → 30% score

Supplier updates profile:
  - Products: [T-Shirts, Cotton Shirts, Polo Shirts]
  
❌ Old requirement still shows 30% match
✅ Should be recalculated to ~70% match
```

**Scenario 2: Supplier Changes Location**
```
Initial profile:
  - Location: Mumbai, Maharashtra
  - Match with "Delhi delivery" requirement → 40% score

Supplier updates profile:
  - Location: Delhi, NCR
  
❌ Old requirement still shows 40% match
✅ Should be recalculated to ~85% match
```

**Scenario 3: Supplier Adds Pricing**
```
Initial profile:
  - No pricing_bands → Missing 5% bonus

Supplier updates profile:
  - pricing_bands: {"basic": "$10-20", "premium": "$20-40"}
  
❌ Old leads still scored without pricing bonus
✅ Should get +5% score boost
```

---

## 🔄 What Happens to Existing Leads?

### Database Schema

**Lead Table:**
```python
class Lead(Base):
    id: int
    requirement_id: int
    supplier_id: int
    buyer_id: int
    fit_score: float              # ← STORED ONCE, NEVER UPDATED
    match_reasons: List[str]      # ← STORED ONCE, NEVER UPDATED
    status: str
    created_at: datetime
```

### Current Behavior

**✅ NEW requirements (posted AFTER profile update):**
- Uses updated `profile_md` from database
- Calculates fresh TF-IDF scores
- Creates leads with accurate scores

**❌ OLD requirements (posted BEFORE profile update):**
- Lead records already exist with old scores
- `fit_score` field is **static** (not recalculated)
- `match_reasons` field is **static** (not updated)
- Matching algorithm **never runs again** for old requirements

---

## 🏗️ Architecture Issues

### 1. **No Profile Change Hooks**

**Missing:**
```python
# What SHOULD happen in config.py:
@router.put("/")
async def update_config(...):
    # ... update profile ...
    
    # ❌ MISSING: Trigger rematching
    await trigger_profile_rematching(user_id, db)
```

### 2. **Static Lead Scores**

**Current Design:**
```
Lead.fit_score = calculated_once_at_creation_time
```

**Problem:**
- Scores become stale when profiles change
- No mechanism to refresh scores
- UI shows outdated match quality

### 3. **No Background Rematching Service**

**Missing Components:**
- Profile change event system
- Background job to recalculate scores
- Logic to update existing leads vs. create new ones

---

## 📋 Manual Workaround (Admin Only)

### Admin Rematch Endpoint

**Location**: `api/app/api/v1/endpoints/admin.py` (lines 469-540)

```python
POST /api/v1/admin/rematch/{requirement_id}
```

**What it does:**
1. Admin manually triggers rematching for a specific requirement
2. Re-runs `match_requirement_to_suppliers()`
3. Creates NEW leads with updated scores
4. **BUT**: Does NOT delete old leads

**Limitations:**
- ❌ Requires manual admin intervention
- ❌ Only works per-requirement, not per-supplier
- ❌ Creates duplicate leads if not careful
- ❌ No automatic cleanup of old leads

---

## 🎯 Recommended Solutions

### Solution 1: **Automatic Rematching on Profile Update** (Recommended)

**Implementation:**

```python
# In api/app/api/v1/endpoints/config.py

@router.put("/")
async def update_config(
    request: UpdateConfigRequest,
    background_tasks: BackgroundTasks,  # ← ADD THIS
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cfg = await get_or_create_config(current_user.id, db)
    
    # Track if profile changed
    profile_changed = False
    
    if request.profile is not None:
        logger.info(f"[CONFIG] User #{current_user.id}: updating profile_json")
        cfg.profile_json = request.profile
        cfg.profile_md = json_to_markdown(request.profile)
        profile_changed = True  # ← DETECT CHANGE
    
    # ... rest of update logic ...
    
    await db.commit()
    
    # ✅ TRIGGER REMATCHING IF PROFILE CHANGED
    if profile_changed:
        background_tasks.add_task(
            rematch_all_requirements_for_supplier,
            supplier_id=current_user.id,
            db_session_factory=AsyncSessionLocal
        )
        logger.info(f"[CONFIG] Queued rematching for supplier #{current_user.id}")
    
    return ConfigResponse(...)


async def rematch_all_requirements_for_supplier(
    supplier_id: int,
    db_session_factory
):
    """
    Find all open requirements and recalculate match scores for this supplier.
    Updates existing leads or creates new ones.
    """
    async with db_session_factory() as db:
        # Get all requirements in "matched" status (still open)
        result = await db.execute(
            select(Requirement).where(
                Requirement.enrichment_status.in_(["matched", "matching"])
            )
        )
        requirements = result.scalars().all()
        
        for req in requirements:
            # Check if lead exists
            lead_result = await db.execute(
                select(Lead).where(
                    Lead.requirement_id == req.id,
                    Lead.supplier_id == supplier_id
                )
            )
            existing_lead = lead_result.scalar_one_or_none()
            
            # Recalculate score
            supplier_profile = await db.get(AgenticProfile, supplier_id)
            user_config = await db.execute(
                select(UserConfig).where(UserConfig.user_id == supplier_id)
            )
            config = user_config.scalar_one_or_none()
            
            fit_score, match_reasons = calculate_enhanced_match_score(
                requirement=_requirement_to_dict(req),
                profile_md=config.profile_md if config else "",
                location=f"{supplier_profile.city}, {supplier_profile.state}",
                categories=supplier_profile.product_categories,
                pricing_available=bool(supplier_profile.pricing_bands)
            )
            
            if fit_score >= MINIMUM_FIT_SCORE:
                if existing_lead:
                    # ✅ UPDATE existing lead
                    existing_lead.fit_score = fit_score
                    existing_lead.match_reasons = match_reasons
                    logger.info(f"[REMATCH] Updated lead #{existing_lead.id}: "
                               f"{existing_lead.fit_score:.0f}% → {fit_score:.0f}%")
                else:
                    # ✅ CREATE new lead
                    new_lead = Lead(
                        requirement_id=req.id,
                        buyer_id=req.buyer_id,
                        supplier_id=supplier_id,
                        fit_score=fit_score,
                        match_reasons=match_reasons,
                        status="new"
                    )
                    db.add(new_lead)
                    logger.info(f"[REMATCH] Created new lead for requirement #{req.id}: "
                               f"{fit_score:.0f}%")
            else:
                if existing_lead and existing_lead.status == "new":
                    # ❌ DELETE lead if score dropped below threshold
                    await db.delete(existing_lead)
                    logger.info(f"[REMATCH] Deleted lead #{existing_lead.id}: "
                               f"score dropped to {fit_score:.0f}%")
        
        await db.commit()
```

**Pros:**
- ✅ Automatic - no admin intervention needed
- ✅ Keeps scores up-to-date
- ✅ Updates existing leads (no duplicates)
- ✅ Background task (doesn't slow down profile updates)

**Cons:**
- ⚠️ Could create many DB queries if many open requirements exist
- ⚠️ Needs proper error handling
- ⚠️ May trigger new AI conversations if new leads created

---

### Solution 2: **Scheduled Batch Rematching**

**Implementation:**

```python
# New file: api/app/services/rematch_scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('interval', hours=6)  # Run every 6 hours
async def scheduled_rematch_all():
    """
    Recalculate all match scores for open requirements.
    Useful for catching profile updates that happened recently.
    """
    async with AsyncSessionLocal() as db:
        # Get all open requirements
        result = await db.execute(
            select(Requirement).where(
                Requirement.enrichment_status == "matched",
                Requirement.created_at > datetime.utcnow() - timedelta(days=30)
            )
        )
        requirements = result.scalars().all()
        
        for req in requirements:
            await match_requirement_to_suppliers(req, db)
        
        await db.commit()
        logger.info(f"[SCHEDULER] Rematched {len(requirements)} requirements")

# Start scheduler in main.py
scheduler.start()
```

**Pros:**
- ✅ Catches all profile changes
- ✅ Simple implementation
- ✅ Runs in background

**Cons:**
- ❌ Delayed updates (up to 6 hours)
- ❌ Wastes resources on unchanged profiles
- ❌ May recalculate unnecessarily

---

### Solution 3: **Real-time Dynamic Scoring** (Complex)

**Concept:** Don't store `fit_score` in database - calculate on-demand

**Implementation:**

```python
# Change Lead model:
class Lead(Base):
    # ... other fields ...
    # REMOVE: fit_score field
    
    @property
    async def fit_score(self) -> float:
        """Calculate score dynamically from current profile data."""
        # Fetch current profile
        # Calculate TF-IDF score
        # Return fresh score
        pass
```

**Pros:**
- ✅ Always 100% accurate
- ✅ No stale data possible
- ✅ No rematching jobs needed

**Cons:**
- ❌ Performance hit on every lead fetch
- ❌ Can't sort leads by score in database queries
- ❌ High CPU usage for TF-IDF calculations
- ❌ Complex to implement with async code

---

## 🎯 **Recommended Approach**

**Use Solution 1: Automatic Rematching on Profile Update**

**Reasoning:**
1. ✅ Best balance of accuracy and performance
2. ✅ No user-facing delays
3. ✅ Updates existing leads (prevents duplicates)
4. ✅ Only runs when needed (profile changes)
5. ✅ Background task (non-blocking)

**Implementation Priority:** 🔴 **HIGH** (P1)

---

## 📝 Additional Considerations

### 1. **Notification System**

When match scores improve significantly, notify buyers:

```python
# After rematching
if new_score >= old_score + 20:  # 20% improvement
    await send_notification_to_buyer(
        buyer_id=lead.buyer_id,
        message=f"Match quality improved for {supplier_name}: "
                f"{old_score}% → {new_score}%"
    )
```

### 2. **Match Score History**

Track score changes over time:

```python
class LeadScoreHistory(Base):
    id: int
    lead_id: int
    fit_score: float
    match_reasons: List[str]
    calculated_at: datetime
```

### 3. **Profile Version Tracking**

Detect meaningful profile changes:

```python
class UserConfig(Base):
    # ... existing fields ...
    profile_version: int  # Increment on each change
    last_rematched_version: int  # Track last rematch
```

---

## 🧪 Testing Requirements

### Test Cases

**1. Profile Update → Rematch Trigger**
- Update supplier profile
- Verify background task queued
- Check logs for rematch execution

**2. Score Recalculation Accuracy**
- Create requirement
- Create lead with 30% score
- Update supplier profile to match better
- Verify lead score updated to ~70%

**3. New Lead Creation**
- Supplier initially doesn't match (score < 20%)
- Supplier updates profile to match
- Verify new lead created

**4. Lead Deletion**
- Lead exists with 50% score
- Supplier removes matching products
- Verify lead score updated or deleted

**5. No Duplicate Leads**
- Multiple profile updates
- Verify only ONE lead per requirement-supplier pair

---

## 📊 Database Migration

If implementing Solution 1, consider:

```sql
-- Add timestamp to track last rematch
ALTER TABLE leads 
ADD COLUMN last_rematched_at TIMESTAMP;

-- Add profile version tracking
ALTER TABLE user_configs 
ADD COLUMN profile_version INTEGER DEFAULT 1,
ADD COLUMN last_modified_at TIMESTAMP DEFAULT NOW();
```

---

## 🔗 Related Files

**Matching Logic:**
- `api/app/services/matching_service.py` (main matching)
- `api/app/services/text_matching.py` (TF-IDF scoring)

**Profile Updates:**
- `api/app/api/v1/endpoints/config.py` (profile update endpoint)
- `api/app/models/user_config.py` (profile storage)

**Lead Management:**
- `api/app/models/lead.py` (lead model)
- `api/app/api/v1/endpoints/requirements.py` (matching trigger)

**Admin Tools:**
- `api/app/api/v1/endpoints/admin.py` (manual rematch)

---

## ✅ Action Items

**Immediate (This Week):**
1. [ ] Implement automatic rematching on profile update (Solution 1)
2. [ ] Add logging for rematch operations
3. [ ] Test with real profile updates

**Short Term (Next 2 Weeks):**
4. [ ] Add notification system for score improvements
5. [ ] Implement score history tracking
6. [ ] Add admin dashboard view for rematch status

**Medium Term (Next Month):**
7. [ ] Performance optimization for large-scale rematching
8. [ ] Add profile version tracking
9. [ ] Write comprehensive tests

---

## 📚 Documentation Updates Needed

**After implementing fix:**
1. Update `ARCHITECTURE.md` with rematch flow
2. Update `TECH_STACK.md` with background task system
3. Add `MATCHING_ALGORITHM.md` with detailed explanation
4. Update API documentation with rematch behavior
5. Add FAQ: "What happens when I update my profile?"

---

**Status**: 🔴 **Issue Identified - Fix Needed**  
**Priority**: P1 (High)  
**Effort**: Medium (2-3 days)  
**Risk**: Low (backward compatible)

**Last Updated**: May 23, 2026
