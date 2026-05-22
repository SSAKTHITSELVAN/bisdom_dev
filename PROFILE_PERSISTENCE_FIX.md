# Profile Persistence Fix - May 22, 2026

## 🐛 Problem

**User Report:** Profile data was not persisting after JSON import. When importing a profile via JSON:
1. Changes appeared in UI immediately ✅
2. But after refreshing the page, profile reverted to default/empty state ❌

**Root Cause:** The `handleImportJSON` function in `ProfileEditorV4.jsx` was only updating local React state (`setProfile(imported)`) but **never calling the backend API** to save the data to the database.

---

## ✅ Solution

### Frontend Changes (`ui/src/components/workspace/ProfileEditorV4.jsx`)

**Before:**
```javascript
const handleImportJSON = () => {
  try {
    const imported = JSON.parse(jsonInput)
    setProfile(imported)              // Only updates local state
    setShowImportModal(false)
    toast.success('Profile imported')
  } catch (error) {
    toast.error('Invalid JSON')
  }
}
```

**After:**
```javascript
const handleImportJSON = async () => {
  try {
    const imported = JSON.parse(jsonInput)

    // Save to backend first
    const success = await saveProfile(imported)

    if (success) {
      // Update local state after successful save
      setProfile(imported)
      setShowImportModal(false)
      setJsonInput('') // Clear input after successful import
      toast.success('Profile imported and saved')
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      toast.error('Invalid JSON format')
    } else {
      toast.error('Failed to import profile')
    }
    console.error('Import error:', error)
  }
}
```

**Key Changes:**
- ✅ Made function `async` to await backend save
- ✅ Call `saveProfile(imported)` before updating UI
- ✅ Only update local state if backend save succeeds
- ✅ Clear `jsonInput` after successful import
- ✅ Better error handling with specific messages
- ✅ Console logging for debugging

---

### Backend Changes (`api/app/api/v1/endpoints/config.py`)

**Problem:** The backend was using unreliable `hasattr()` checks that could fail silently.

**Changes:**

1. **Removed `hasattr()` checks** (lines 54, 77, 94)
   ```python
   # Before:
   profile_json = cfg.profile_json if hasattr(cfg, 'profile_json') and cfg.profile_json else {}
   
   # After:
   profile_json = cfg.profile_json if cfg.profile_json else {}
   ```

2. **Added logging for debugging** (lines 79, 82, 97)
   ```python
   logger.info(f"[CONFIG] User #{current_user.id}: updating profile_json")
   logger.info(f"[CONFIG] User #{current_user.id}: profile_json saved with {len(request.profile.get('product_categories', []))} categories")
   logger.info(f"[CONFIG] User #{current_user.id}: config committed to database")
   ```

3. **Improved error visibility**
   - Log when legacy profile_md endpoint is used
   - Log category count for validation

---

## 🚀 Deployment

### Steps Executed

```bash
# 1. Commit changes
git add ui/src/components/workspace/ProfileEditorV4.jsx api/app/api/v1/endpoints/config.py
git commit -m "Fix profile data persistence issue on JSON import"
git push origin main

# 2. Deploy to EC2
ssh ubuntu@3.109.70.144 'cd bisdom_dev && git pull origin main'

# 3. Restart services
ssh ubuntu@3.109.70.144 'sudo systemctl restart bisdom-api.service bisdom-ui.service'

# 4. Verify deployment
curl http://3.109.70.144:8000/health
curl -I http://3.109.70.144:5173
```

### Deployment Status

✅ **Deployed:** May 22, 2026 16:27 UTC  
✅ **API Status:** Active (running) - http://3.109.70.144:8000  
✅ **UI Status:** Active (running) - http://3.109.70.144:5173  
✅ **Commit:** `dafd837` - "Fix profile data persistence issue on JSON import"

---

## 🧪 Testing the Fix

### Test Steps

1. **Login to the application**
   - Go to http://3.109.70.144:5173
   - Login with your supplier account

2. **Navigate to Profile**
   - Click **Workspace** → **Profile** tab

3. **Import JSON Profile**
   - Click **"Import JSON"** button
   - Click **"Copy to Input"** to load example
   - Click **"Import"** button
   - ✅ Should see: **"Profile imported and saved"** toast

4. **Verify Immediate Display**
   - ✅ Profile should display with all imported data
   - ✅ Categories, products, infrastructure should all be visible

5. **Test Persistence (Critical!)**
   - Press **F5** or manually refresh the page
   - ✅ Profile data should **still be there** (not revert to empty)
   - ✅ All imported data persists across refresh

6. **Test with Custom JSON**
   - Import your own JSON profile
   - Refresh page
   - ✅ Custom data should persist

### Expected Behavior

**Before Fix:**
- Import JSON → Shows in UI → Refresh page → **Data lost** ❌

**After Fix:**
- Import JSON → Shows in UI → Refresh page → **Data persists** ✅

---

## 🔍 Backend Logs to Monitor

After deployment, you can monitor the logs to see profile saves:

```bash
ssh ubuntu@3.109.70.144 'sudo journalctl -u bisdom-api.service -f | grep CONFIG'
```

**Expected log output when importing profile:**
```
[CONFIG] User #123: updating profile_json
[CONFIG] User #123: profile_json saved with 3 categories
[CONFIG] User #123: config committed to database
```

---

## 📊 Technical Details

### Data Flow (Fixed)

```
User clicks "Import" in UI
    ↓
handleImportJSON() called
    ↓
JSON.parse(jsonInput) → Parse JSON
    ↓
await saveProfile(imported) → Call backend API
    ↓
PUT /config/ with { profile: imported }
    ↓
Backend: cfg.profile_json = request.profile
    ↓
Backend: cfg.profile_md = json_to_markdown(request.profile)
    ↓
Backend: await db.commit() → SAVE TO DATABASE
    ↓
Frontend: setProfile(imported) → Update UI
    ↓
✅ Data persisted in database AND displayed in UI
```

### Database Schema

**Table:** `user_configs`

**Relevant Fields:**
- `profile_json` (JSON) - Source of truth for UI (now properly saved!)
- `profile_md` (TEXT) - Auto-generated markdown for AI agents
- `updated_at` (TIMESTAMP) - Tracks last update

**Before Fix:** `profile_json` was NULL in database after import  
**After Fix:** `profile_json` contains full imported profile data

---

## 🔄 Related Files

### Modified Files
1. `ui/src/components/workspace/ProfileEditorV4.jsx` (lines 192-214)
2. `api/app/api/v1/endpoints/config.py` (lines 54, 76-82, 94, 97)

### Related Components
- `ui/src/api/config.js` - API client (updateConfig function)
- `api/app/models/user_config.py` - Database model
- `api/app/agents/profile_converter.py` - JSON → Markdown converter

---

## ✅ Verification Checklist

- [x] Frontend: `handleImportJSON` now calls `saveProfile()`
- [x] Backend: `hasattr()` checks removed
- [x] Backend: Logging added for debugging
- [x] Changes committed to git
- [x] Changes pushed to GitHub
- [x] Code pulled on EC2
- [x] API service restarted
- [x] UI service restarted
- [x] API health check passing
- [x] UI accessible
- [x] Manual test: Import JSON works
- [x] Manual test: Data persists after refresh

---

## 🎯 Impact

### Before Fix
- ❌ Profile imports were temporary (lost on refresh)
- ❌ Users couldn't persist bulk profile data via JSON
- ❌ Only manual field editing saved properly
- ❌ Frustrating user experience

### After Fix
- ✅ Profile imports save to database immediately
- ✅ Data persists across page refreshes
- ✅ Consistent with other save operations
- ✅ Better error messages for debugging
- ✅ Backend logging for troubleshooting

---

## 📚 Additional Notes

### Why This Bug Existed

The bug was introduced as part of an earlier optimization to prevent modal remounting issues (see lines 76-91 in ProfileEditorV4.jsx). The developers correctly identified that calling `setProfile()` immediately after save causes modals to remount, but they forgot to update the import function to actually save to the backend.

### Design Pattern

All other save operations in ProfileEditorV4 follow this pattern:
1. Call `saveProfile(updatedData)` → Backend API
2. Wait for success response
3. Call `setProfile()` → Update UI

The import function was the **only** place that skipped step 1, which caused the persistence issue.

---

## 🔗 References

- Commit: https://github.com/SSAKTHITSELVAN/bisdom_dev/commit/dafd837
- Profile Schema: `PROFILE_JSON_SCHEMA_UPDATE.md`
- Validation Tool: `validate_profile_schema.py`
- API Docs: http://3.109.70.144:8000/docs#/User%20Config/update_config_config__put

---

**Status:** ✅ **FIXED & DEPLOYED**  
**Tested:** ✅ **Confirmed working**  
**Risk:** 🟢 **Low** - Backward compatible, no breaking changes

**Last Updated:** May 22, 2026 16:27 UTC
