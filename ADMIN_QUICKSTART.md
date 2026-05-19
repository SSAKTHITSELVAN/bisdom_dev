# Admin Panel Quick Start Guide

## Access the Admin Panel

### Step 1: Start the Application
```bash
# Terminal 1: Start Backend
cd api
source ../venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Frontend
cd ui
npm run dev
```

### Step 2: Get Current Time Password
The admin password is the **current time in HHMM format** (24-hour format).

**Examples**:
- If it's **2:30 PM** → Password is **1430**
- If it's **9:05 AM** → Password is **0905**
- If it's **11:59 PM** → Password is **2359**
- If it's **12:00 AM** → Password is **0000**

### Step 3: Login
1. Open browser and go to: **http://localhost:5173/admin/login**
2. Look at the current time display on the page
3. Enter the time in HHMM format (without colon)
4. Click "Access Admin Panel"

### Step 4: Explore Admin Features

Once logged in, you'll see:

#### 📊 Dashboard (`/admin/dashboard`)
- Total users, suppliers, buyers
- Requirements and leads statistics
- Active negotiations count
- Completed deals
- System health metrics

#### 📄 Requirements (`/admin/requirements`)
- List of all posted requirements
- Click any requirement to see matching suppliers
- View match scores in table format
- See negotiation status and offers

#### 👥 Users (`/admin/users`)
- All registered users
- Filter by role (All/Supplier/Buyer)
- View user profiles and stats
- Contact information

#### 🗺️ Supplier Map (`/admin/map`)
- Suppliers grouped by state
- Click state to filter suppliers
- View supplier details
- Product categories and stats

## Password Tips

### Quick Reference
```
Current Time → Password
10:30 AM     → 1030
02:45 PM     → 1445
08:00 AM     → 0800
06:15 PM     → 1815
11:59 PM     → 2359
12:00 AM     → 0000
```

### Important Notes
- Password changes **every minute**
- System accepts current minute + previous minute (60-second grace)
- Leading zeros required (0905 not 905)
- 24-hour format only
- No colon or spaces

## Common Issues

### ❌ "Invalid admin password"
**Solution**: Check the current time and make sure you're entering it in HHMM format

### ❌ Redirected to login after accessing admin page
**Solution**: Your session expired. Login again with current time.

### ❌ "Admin authorization required"
**Solution**: You're not logged in. Go to /admin/login first.

### ❌ Can't see any data
**Solution**: Make sure backend is running and database has data.

## Testing with Sample Data

If you need to test with sample data:

1. Access `/admin/fix-profiles` endpoint (need to be logged in)
2. This will mark all profiles as complete for matching
3. Create requirements through the main app
4. Check admin panel for data

## Logout

Click the **Logout** button in the sidebar (red button at bottom)

This will:
- Clear your session token
- Redirect to login page
- Require re-authentication

## Security Notes

⚠️ **This is a time-based password system**
- Password changes automatically every minute
- Anyone with access to current time can login
- Suitable for development/demo environments
- For production, implement proper admin accounts with 2FA

## API Testing (Optional)

You can also test admin API endpoints directly:

```bash
# Get current time password (example: 1430)
PASSWORD="1430"

# Login
curl -X POST "http://localhost:8000/api/v1/admin/login?password=$PASSWORD"

# Get stats (use token from login)
curl -X GET "http://localhost:8000/api/v1/admin/stats" \
  -H "Authorization: Bearer $PASSWORD"

# Get requirements
curl -X GET "http://localhost:8000/api/v1/admin/requirements" \
  -H "Authorization: Bearer $PASSWORD"

# Get requirement matches
curl -X GET "http://localhost:8000/api/v1/admin/requirements/1/matches" \
  -H "Authorization: Bearer $PASSWORD"

# Get users
curl -X GET "http://localhost:8000/api/v1/admin/users" \
  -H "Authorization: Bearer $PASSWORD"

# Get map data
curl -X GET "http://localhost:8000/api/v1/admin/map-data" \
  -H "Authorization: Bearer $PASSWORD"
```

## Browser DevTools

To debug issues, open browser DevTools (F12) and check:

1. **Console**: Look for JavaScript errors
2. **Network**: Check API request/response
3. **Application → Session Storage**: Verify `adminToken` is stored
4. **Network → Headers**: Verify Authorization header is sent

## URLs Quick Reference

```
Login:        http://localhost:5173/admin/login
Dashboard:    http://localhost:5173/admin/dashboard
Requirements: http://localhost:5173/admin/requirements
Users:        http://localhost:5173/admin/users
Map:          http://localhost:5173/admin/map
```

## Navigation

Use the sidebar on the left to navigate between:
- 🏠 Dashboard
- 📄 Requirements
- 👥 Users
- 🗺️ Map

Active page is highlighted in blue.

## Next Steps

After logging in successfully:

1. ✅ Check dashboard metrics
2. ✅ View posted requirements
3. ✅ Expand a requirement to see matches
4. ✅ Review match scores in table
5. ✅ Check users list
6. ✅ Filter users by role
7. ✅ Explore supplier map
8. ✅ Click on states to filter suppliers

## Need Help?

1. Check the main README.md for setup instructions
2. Review ADMIN_IMPLEMENTATION.md for detailed documentation
3. Check browser console for errors
4. Verify backend is running on port 8000
5. Verify frontend is running on port 5173

## Screenshot Guide

### Login Page
- Large lock icon at top
- Current time displayed prominently
- 4-digit password input (centered, monospace)
- Blue "Access Admin Panel" button
- Helper note explaining format

### Dashboard
- Grid of 8 stat cards with icons
- System health section below
- Color-coded metrics
- Hover effects on cards

### Requirements
- List of expandable requirement cards
- Status badges (blue/purple/green)
- Click to expand and see matches table
- Match scores with visual progress bars

### Users
- Grid of user cards
- Filter buttons at top (All/Supplier/Buyer)
- Role badges (green/amber)
- Stats per user

### Map
- Left: State grid with supplier counts
- Right: Supplier details list
- Click state to filter
- Summary stats at bottom

---

**Ready to start?** Go to http://localhost:5173/admin/login and enter the current time! 🚀
