# Conversation Initiation Fix - Testing Guide

## Problem Identified
The conversation was not initiating after matching because the autonomous negotiation loop was trying to create a new asyncio task using `loop.create_task()` within a FastAPI background task context, which has event loop management issues.

## Fix Applied
Changed the approach to run the autonomous negotiation loop **directly** as part of the background task by using `await` instead of creating a separate task. This ensures:
1. The event loop context is properly maintained
2. The database session doesn't conflict with the negotiation loop
3. The autonomous loop starts immediately after initial messages are exchanged

## Changes Made
**File**: `api/app/api/v1/endpoints/requirements.py`

**Before**:
```python
# Inside db session
await db.commit()
try:
    loop = asyncio.get_event_loop()
    loop.create_task(_run_autonomous_negotiation_round(lead_id))
except Exception as e:
    logger.error(...)
```

**After**:
```python
# Inside db session - commit and close
await db.commit()

# Outside db session - run autonomous loop directly
from app.api.v1.endpoints.conversations import _run_autonomous_negotiation_round
try:
    await _run_autonomous_negotiation_round(lead_id)
except Exception as e:
    logger.error(...)
```

## Testing Steps

### 1. Check Current System Status
```bash
# SSH to server
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144

# Check API is running
sudo systemctl status bisdom-api.service

# Check recent logs for CONV messages
sudo journalctl -u bisdom-api.service --since "5 minutes ago" | grep "\[CONV\]"
```

### 2. Create New Requirement
1. Log in to the UI: http://3.109.70.144:5173
2. Create a new requirement (e.g., "Cotton T-Shirts, 100 pieces")
3. Complete enrichment conversation
4. Confirm requirement

### 3. Verify Conversation Initiation
Check logs immediately after confirmation:
```bash
sudo journalctl -u bisdom-api.service -f | grep -E "\[MATCH\]|\[CONV\]"
```

**Expected log sequence**:
```
[MATCH] Starting efficient matching for requirement #X
[MATCH] Found N supplier matches
[MATCH] Created lead #Y → supplier #Z
[MATCH] Requirement #X: N leads created — initiating seller agents
[CONV] Starting conversation initiation for lead #Y
[CONV] Lead #Y: Found lead (buyer=A, supplier=B, status=new)
[CONV] Lead #Y: Calling supplier AI to generate opening message...
[CONV] Lead #Y: Supplier AI generated message (XXX chars)
[CONV] Lead #Y: Calling buyer AI to respond to seller's opening...
[CONV] Lead #Y: Buyer AI generated response (XXX chars)
[CONV] Lead #Y: seller opened, buyer responded ✓
[CONV] Lead #Y: Starting autonomous negotiation loop
[AUTO] Lead #Y round 1: last_role=ai_buyer
```

### 4. Verify in Database
```bash
# Connect to database and check
psql -h <db-host> -U <user> -d bisdom -c "
SELECT 
    l.id as lead_id,
    l.status,
    l.negotiation_round,
    EXISTS(SELECT 1 FROM conversations WHERE lead_id = l.id) as has_conversation,
    (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.lead_id = l.id) as message_count
FROM leads l
WHERE l.id >= (SELECT MAX(id) - 5 FROM leads)
ORDER BY l.id DESC;
"
```

### 5. Check in UI
1. Go to Requirements tab
2. Click on the new requirement
3. Should see matched suppliers with conversation status
4. Click on a supplier to open conversation
5. **Should see messages from both buyer and supplier AI**

## Success Criteria
✅ Logs show complete conversation initiation sequence  
✅ `_run_autonomous_negotiation_round` starts without errors  
✅ Conversation record created in database  
✅ At least 2 messages (supplier opening + buyer response)  
✅ Lead status changes from "new" to "negotiating"  
✅ UI shows active conversation with messages  

## If Still Not Working

### Additional Debugging
1. **Check for Python errors**:
   ```bash
   sudo journalctl -u bisdom-api.service --since "5 minutes ago" | grep -i "error\|traceback"
   ```

2. **Check AI agent responses**:
   - Verify AWS Bedrock API is accessible
   - Check if supplier_agent and buyer_agent are returning messages

3. **Check database connection**:
   ```bash
   # Verify database connectivity
   python3 -c "
   import asyncio
   from app.db.base import AsyncSessionLocal
   async def test():
       async with AsyncSessionLocal() as db:
           print('DB connection OK')
   asyncio.run(test())
   "
   ```

4. **Enable debug logging**:
   Edit `api/app/main.py` to set log level to DEBUG:
   ```python
   logging.basicConfig(level=logging.DEBUG)
   ```

## Root Cause Analysis

The original issue was caused by:
1. **Event Loop Mismatch**: FastAPI's background tasks run in a specific event loop context
2. **Task Creation Timing**: Creating a new task with `loop.create_task()` after the database session committed but before the function returned caused the task to potentially run before the context was ready
3. **Database Session Conflicts**: The autonomous loop creates its own database sessions, which could conflict with the parent session if not properly separated

The fix ensures:
- Database session is committed and closed before starting the loop
- Autonomous loop runs in the same async context (using `await`)
- No event loop management issues since we're not creating detached tasks

## Deployment
```bash
git add api/app/api/v1/endpoints/requirements.py
git commit -m "Fix: Conversation initiation - run autonomous negotiation loop directly in background task"
git push origin main
./deploy.sh "Fix: Conversation initiation bug"
```

## Next Steps if Fix Works
1. Monitor production for 24 hours
2. Check conversation completion rates
3. Verify no memory leaks from long-running loops
4. Consider adding timeout safeguards to autonomous loop
