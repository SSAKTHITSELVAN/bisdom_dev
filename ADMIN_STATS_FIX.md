# Admin Dashboard Stats Fix - May 19, 2026

## Problem

The admin dashboard showed confusing statistics that didn't reflect the peer-to-peer model:

```
Total Users: 15
Total Suppliers: 9
Total Buyers: 9
```

This made it look like there were 9+9=18 users, when there were actually only 15 users total. The confusion arose because in the peer-to-peer model, **the same user can be BOTH a buyer AND a supplier simultaneously**.

## Root Cause

The old stats counted:
- `total_suppliers`: Count of profiles where `is_supplier == True`
- `total_buyers`: Count of profiles where `is_buyer == True`

After running `/admin/fix-profiles`, all 9 profiles were set to:
- `is_buyer = True`
- `is_supplier = True`

So the same 9 users were counted as both buyers AND suppliers, making the numbers overlap.

## Solution

Changed the stats to reflect **actual behavior** rather than boolean flags:

### Old Stats (Confusing)
```json
{
  "total_users": 15,
  "total_suppliers": 9,    // is_supplier == True
  "total_buyers": 9,       // is_buyer == True (same 9 users!)
  ...
}
```

### New Stats (Clear)
```json
{
  "total_users": 15,
  "users_with_profiles": 9,            // Complete profiles
  "users_posted_requirements": 4,      // Actually acted as buyers
  "users_received_leads": 9,           // Actually acted as suppliers
  ...
}
```

## Changes Made

### Backend (`api/app/api/v1/endpoints/admin.py`)

**Before:**
```python
# Total suppliers
suppliers_result = await db.execute(
    select(func.count(AgenticProfile.id)).where(AgenticProfile.is_supplier == True)
)
total_suppliers = suppliers_result.scalar() or 0

# Total buyers
buyers_result = await db.execute(
    select(func.count(AgenticProfile.id)).where(AgenticProfile.is_buyer == True)
)
total_buyers = buyers_result.scalar() or 0
```

**After:**
```python
# Users with complete profiles
profiles_result = await db.execute(
    select(func.count(AgenticProfile.id)).where(
        AgenticProfile.profile_build_status == "complete"
    )
)
total_profiles = profiles_result.scalar() or 0

# Users who have posted requirements (acted as buyers)
users_with_reqs = await db.execute(
    select(func.count(func.distinct(Requirement.buyer_id)))
)
users_posted_requirements = users_with_reqs.scalar() or 0

# Users who have received leads (acted as suppliers)
users_with_leads = await db.execute(
    select(func.count(func.distinct(Lead.supplier_id)))
)
users_received_leads = users_with_leads.scalar() or 0
```

### Frontend (`ui/src/components/admin/AdminDashboard.jsx`)

**Before:**
- "Total Users" (15)
- "Total Suppliers" (9)
- "Total Buyers" (9)

**After:**
- "Total Registered Users" (15) - with sublabel "9 with complete profiles"
- "Posted Requirements" (4) - sublabel "Users who acted as buyers"
- "Received Leads" (9) - sublabel "Users who acted as suppliers"

### System Health Section

**Before:**
- Active Rate
- Avg. Matches per Requirement
- Conversion Rate
- **Supplier/Buyer Ratio** ❌ (doesn't make sense in peer-to-peer)

**After:**
- **Profile Completion Rate** ✅ (9/15 = 60%)
- Avg. Matches per Requirement
- Lead → Deal Conversion
- Active Requirement Rate

## Current Dashboard Stats (Live)

```
Total Registered Users:    15
  └─ With Complete Profiles: 9

Posted Requirements:        4 users
  └─ Users who acted as buyers

Received Leads:             9 users
  └─ Users who acted as suppliers

Total Requirements:         14
  └─ 7 active

Total Leads:               25
  └─ 2 negotiating

Completed Deals:           0

Active Negotiations:       2

Recent Requirements:       11
  └─ Last 7 days
```

### System Health Metrics
- **Profile Completion Rate**: 60% (9/15 users)
- **Avg. Matches per Requirement**: 1.8 leads
- **Lead → Deal Conversion**: 0%
- **Active Requirement Rate**: 50%

## Key Insights from Real Data

1. **15 total users, but only 9 have complete profiles** → 6 users abandoned onboarding
2. **Only 4 users posted requirements** → Most users haven't posted yet
3. **All 9 profiled users received leads** → Matching algorithm is working
4. **25 leads created** → Good coverage (1.8 leads per requirement)
5. **2 active negotiations** → Agents are initiating conversations
6. **0 completed deals** → No one has closed a deal yet (new platform)

## Why This Matters

### Confusing Model (Old)
- Made it look like there were separate buyer and supplier populations
- Implied 18 users when there were only 15
- Didn't reflect actual platform behavior

### Clear Model (New)
- Shows that users play multiple roles
- Reflects actual behavior (posting requirements vs. receiving leads)
- Makes it clear that 4 users are actively buying, 9 are potential suppliers
- Admin can see engagement levels clearly

## Peer-to-Peer Model Explained

In Bisdom's model:
1. User registers (1 of 15 users)
2. User completes profile (1 of 9 with profiles)
3. User posts requirement → **Acts as buyer** (1 of 4)
4. User receives lead for someone else's requirement → **Acts as supplier** (1 of 9)

**Same user can do both!** That's why the numbers overlap.

## Example User Journey

**User #2 (BIZZAP)**:
- Registered: ✅
- Profile Complete: ✅
- Posted Requirements: ✅ (acted as buyer for cotton t-shirts)
- Received Leads: ✅ (acts as supplier for others' requirements)

This single user is counted in:
- Total Users (1)
- Users with Profiles (1)
- Posted Requirements (1)
- Received Leads (1)

## Testing

```bash
# Before fix
curl .../admin/stats
{
  "total_users": 15,
  "total_suppliers": 9,
  "total_buyers": 9
}
# Confusing! 9+9 ≠ 15

# After fix
curl .../admin/stats
{
  "total_users": 15,
  "users_with_profiles": 9,
  "users_posted_requirements": 4,
  "users_received_leads": 9
}
# Clear! Same 9 users, but only 4 posted requirements
```

## Deployment

```bash
git add -A
git commit -m "Fix admin dashboard stats to reflect peer-to-peer model correctly"
git push origin main

# On EC2
cd bisdom_dev
git pull origin main
sudo systemctl restart bisdom-api.service bisdom-ui.service
```

## Future Improvements

1. **User Engagement Tracking**: Track how many users are active buyers vs. passive suppliers
2. **Dual Role Badge**: Show which users are both buyers AND suppliers actively
3. **Activity Timeline**: Show when users last posted requirements or responded to leads
4. **Growth Metrics**: Track new registrations, profile completions over time
5. **Cohort Analysis**: Compare users who joined in different weeks
