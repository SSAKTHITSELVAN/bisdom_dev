# Admin Panel Implementation

## Overview
Complete admin interface with time-based password protection for monitoring and managing the Bisdom B2B Commerce Platform.

## Security - Time-Based Password

### How It Works
- Password is **current time in HHMM format** (24-hour format without colon)
- Example: If current time is **14:30** → Password is **1430**
- If current time is **09:05** → Password is **0905**
- Password changes every minute automatically
- System accepts current minute and previous minute (60-second grace period for transitions)

### Access Flow
1. Navigate to `/admin/login`
2. Enter current time in HHMM format (e.g., 1430)
3. System verifies against server time
4. If correct, grants access and stores token in session storage
5. Token is used for all subsequent API requests

### Example Usage
```
Current Time: 14:30
Password: 1430

Current Time: 09:05
Password: 0905

Current Time: 23:59
Password: 2359
```

## Backend Endpoints

### Authentication
- **POST `/admin/login`** - Login with time-based password
  - Body: `{ "password": "1430" }`
  - Returns: `{ "success": true, "token": "1430" }`

### Protected Endpoints (require Authorization header)
All endpoints require: `Authorization: Bearer {password}`

#### Dashboard
- **GET `/admin/stats`** - Get platform statistics
  - Total users, requirements, leads, deals
  - Active negotiations
  - Suppliers/buyers count
  - Recent activity metrics

#### Requirements
- **GET `/admin/requirements`** - List all requirements
  - Query params: `skip`, `limit`, `status`
  - Returns requirements with buyer info and lead counts

- **GET `/admin/requirements/{id}/matches`** - Get supplier matches for a requirement
  - Returns tabular data with:
    - Supplier name, phone, location
    - Match score (0-100)
    - Reliability score
    - Current status
    - Offer price
    - Negotiation round

#### Users
- **GET `/admin/users`** - List all users
  - Query params: `skip`, `limit`, `role` (buyer/supplier)
  - Returns users with profiles, stats

#### Map
- **GET `/admin/map-data`** - Get supplier locations
  - Returns suppliers grouped by location
  - City, state, product categories
  - Lead counts, reliability scores

#### Utilities
- **GET `/admin/overview`** - Full system overview
- **POST `/admin/fix-profiles`** - Dev utility to fix profiles
- **POST `/admin/rematch/{id}`** - Manually rematch requirement
- **GET `/admin/conversations/{leadId}`** - View conversation details

## Frontend Pages

### 1. Admin Login (`/admin/login`)
**File**: `ui/src/components/admin/AdminLogin.jsx`

**Features**:
- Time-based password input
- Real-time clock display
- 4-digit password field
- Auto-focus on input
- Helper text explaining format
- Session storage for token
- Redirect to dashboard on success

**UI Elements**:
- Large lock icon
- Current time display in HH:MM format
- Monospace password input
- Instruction card with examples

### 2. Dashboard (`/admin/dashboard`)
**File**: `ui/src/components/admin/AdminDashboard.jsx`

**Features**:
- 8 key metrics in card grid:
  - Total Users
  - Total Suppliers
  - Total Buyers
  - Total Requirements (with active count)
  - Total Leads (with negotiating count)
  - Completed Deals
  - Active Negotiations
  - Recent Requirements (last 7 days)

- System Health section:
  - Active Rate percentage
  - Avg. matches per requirement
  - Conversion rate (deals/leads)
  - Supplier/Buyer ratio

**UI Design**:
- Grid layout (auto-fit, min 280px)
- Icon-coded stat cards
- Color-coded metrics
- Hover animations
- Responsive layout

### 3. Requirements (`/admin/requirements`)
**File**: `ui/src/components/admin/AdminRequirements.jsx`

**Features**:
- List all posted requirements
- Expandable cards showing matches
- Match details in table format
- Filterable by status
- Real-time lead counts

**Table Columns**:
1. Supplier (name + phone)
2. Location (city, state)
3. Match Score (visual progress bar + number)
4. Reliability (score/100)
5. Status (badge)
6. Offer (price if available)
7. Round (negotiation round number)

**UI Elements**:
- Collapsible requirement cards
- Status badges (color-coded)
- Icon indicators for product, location, budget
- Match score visualization
- Loading states

### 4. Users (`/admin/users`)
**File**: `ui/src/components/admin/AdminUsers.jsx`

**Features**:
- Grid of user cards
- Filter by role (all/buyer/supplier)
- User stats (requirements, leads)
- Profile information
- Contact details

**Card Contains**:
- Trade name
- Phone number
- GSTIN
- Location (city, state)
- Reliability score
- Role badges (supplier/buyer)
- Activity counts
- Onboarding status

**Filters**:
- All Users
- Suppliers only
- Buyers only

### 5. Supplier Map (`/admin/map`)
**File**: `ui/src/components/admin/AdminMap.jsx`

**Features**:
- State-wise supplier distribution
- Interactive state cards
- Supplier details panel
- Geographic insights
- Summary statistics

**Layout**:
- Left: State grid (2/3 width)
  - Each state shows supplier count
  - Click to filter suppliers
  - Visual summary stats at bottom

- Right: Supplier list (1/3 width)
  - Detailed supplier cards
  - Filterable by state
  - Product categories
  - Contact information

**Stats Displayed**:
- Total suppliers
- States covered
- Average per state
- Per-supplier: reliability, leads, categories

### 6. Layout Wrapper (`/admin`)
**File**: `ui/src/components/admin/AdminLayout.jsx`

**Features**:
- Persistent sidebar navigation
- Auto-redirect if not authenticated
- Active route highlighting
- Logout functionality
- Sticky sidebar

**Sidebar Items**:
- Dashboard (home icon)
- Requirements (file icon)
- Users (users icon)
- Supplier Map (map icon)
- Logout button (bottom)

## API Client

**File**: `ui/src/api/admin.js`

**Functions**:
- `adminLogin(password)` - Authenticate
- `setAdminToken(token)` - Store token
- `getAdminToken()` - Retrieve token
- `clearAdminToken()` - Remove token
- `getAdminStats()` - Dashboard stats
- `getAllRequirements(params)` - Requirements list
- `getRequirementMatches(id)` - Requirement matches
- `getAllUsers(params)` - Users list
- `getMapData()` - Map locations
- Plus: overview, fix-profiles, rematch, conversations

**Token Management**:
- Stored in sessionStorage
- Sent as Bearer token in Authorization header
- Auto-cleared on logout
- Checked on page load

## Routes Structure

```
/admin/login          → AdminLogin (public)
/admin/               → AdminLayout (protected)
  ├─ dashboard        → AdminDashboard
  ├─ requirements     → AdminRequirements
  ├─ users            → AdminUsers
  └─ map              → AdminMap
```

## Color Scheme

### Status Colors
- **Capturing**: Blue (#60a5fa)
- **Enriched**: Purple (#a78bfa)
- **Matching**: Amber (#fbbf24)
- **Matched**: Green (#34d399)
- **Confirmed**: Teal (#5eead4)

### Role Colors
- **Supplier**: Green (#34d399)
- **Buyer**: Amber (#fbbf24)
- **Admin**: Blue (#60a5fa)

### Metric Colors
- **Users**: Blue (#60a5fa)
- **Suppliers**: Green (#10b981)
- **Buyers**: Amber (#f59e0b)
- **Requirements**: Purple (#8b5cf6)
- **Leads**: Pink (#ec4899)
- **Deals**: Teal (#14b8a6)
- **Activity**: Orange (#f97316)

## Security Considerations

### Current Implementation
✅ Time-based password (changes every minute)
✅ Token-based authentication
✅ Session storage (cleared on logout)
✅ Authorization header on all requests
✅ Auto-redirect if not authenticated

### Production Recommendations
⚠️ Add rate limiting on login endpoint
⚠️ Add IP whitelisting
⚠️ Add audit logging for all admin actions
⚠️ Consider 2FA for sensitive operations
⚠️ Use HTTPS only
⚠️ Add session timeout (auto-logout after inactivity)
⚠️ Consider replacing time-based auth with proper admin accounts

## Error Handling

### Backend
- 401: Authorization required
- 403: Invalid password
- 404: Resource not found
- 500: Server error

### Frontend
- Toast notifications for errors
- Loading states during API calls
- Graceful fallbacks for missing data
- Retry mechanisms for failed requests

## Performance Optimizations

1. **Pagination**: All list endpoints support skip/limit
2. **Lazy Loading**: Matches loaded only when expanded
3. **Session Storage**: Token cached locally
4. **Memoization**: Stats calculations optimized
5. **Responsive Design**: Mobile-friendly layouts

## Testing Checklist

### Backend
- [ ] Login with correct password
- [ ] Login with wrong password
- [ ] Login during minute transition
- [ ] All protected endpoints with token
- [ ] All protected endpoints without token
- [ ] Requirements list and matches
- [ ] Users list with filters
- [ ] Map data with locations

### Frontend
- [ ] Login flow
- [ ] Auto-redirect when not authenticated
- [ ] Dashboard loads correctly
- [ ] Requirements expand/collapse
- [ ] Match scores display properly
- [ ] Users filter by role
- [ ] Map state selection
- [ ] Logout clears session
- [ ] Navigation between pages
- [ ] Mobile responsiveness

## Future Enhancements

1. **Advanced Filtering**
   - Date range filters
   - Multi-select filters
   - Search functionality
   - Sort options

2. **Export Features**
   - Export to CSV/Excel
   - Generate reports
   - Download conversation logs
   - Backup database

3. **Real-time Updates**
   - WebSocket for live data
   - Auto-refresh stats
   - Notification system
   - Live chat monitoring

4. **Analytics**
   - Trend charts
   - Performance metrics
   - User behavior analysis
   - Conversion funnels

5. **Management Tools**
   - User management (suspend/activate)
   - Manual lead assignment
   - Bulk operations
   - Configuration editor

6. **Better Authentication**
   - Admin user accounts
   - Role-based permissions
   - 2FA authentication
   - API key management

## Deployment Notes

### Environment Variables
No additional env vars needed. Uses existing backend API base URL.

### Build
```bash
cd ui
npm run build
```

### Serve
Backend automatically serves admin routes through existing FastAPI setup.

### First-Time Setup
1. Start backend server
2. Note current time
3. Navigate to http://localhost:5173/admin/login
4. Enter time in HHMM format
5. Access admin panel

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Confirm system time is correct
4. Check session storage for token
5. Review backend logs for auth failures

## Summary

✅ Complete admin panel implemented
✅ Time-based password protection (HHMM format)
✅ 4 main pages: Dashboard, Requirements, Users, Map
✅ Full API integration
✅ Secure token-based authentication
✅ Responsive, professional UI
✅ No external dependencies added
✅ Fully integrated with existing app

**Access**: Navigate to `/admin/login` and enter current time (e.g., 1430 for 14:30)
