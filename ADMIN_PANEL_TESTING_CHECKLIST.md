# ✅ Kitty Admin Panel - Testing Checklist

## 🎯 Pre-Testing Requirements

### Backend Setup

- [ ] NestJS backend running on `http://localhost:3000`
- [ ] PostgreSQL database connected
- [ ] Admin transactions table created (`create-admin-transactions-table.sql` executed)
- [ ] JWT authentication configured
- [ ] Admin guard implemented
- [ ] CORS enabled for `http://localhost:5173`

### Database Setup

- [ ] At least one admin user exists:

```sql
SELECT uuid, email, "userType", name
FROM users
WHERE "userType" = 'ADMIN';
```

- [ ] ConversionConfig table has rates:

```sql
SELECT * FROM conversion_configs;
```

- [ ] Sample users exist for testing:

```sql
SELECT COUNT(*) FROM users;
```

### Frontend Setup

- [ ] Admin panel installed: `cd kitty-admin-panel && npm install`
- [ ] .env file created with `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Development server can start: `npm run dev`

---

## 🧪 Test Cases

### 1. Authentication Tests

#### Test 1.1: Login with Valid Admin Credentials

**Steps:**

1. Navigate to `http://localhost:5173`
2. Enter valid admin email
3. Enter correct password
4. Click "Sign In"

**Expected Result:**

- [ ] Loading indicator appears
- [ ] Redirects to `/dashboard`
- [ ] Sidebar shows admin name
- [ ] Token stored in state
- [ ] No console errors

**Actual Result:** ****\_\_\_****

---

#### Test 1.2: Login with Invalid Credentials

**Steps:**

1. Navigate to login page
2. Enter email: `admin@kitty.com`
3. Enter password: `wrongpassword`
4. Click "Sign In"

**Expected Result:**

- [ ] Error message displayed: "Invalid credentials"
- [ ] Stays on login page
- [ ] No token stored
- [ ] Form fields remain populated

**Actual Result:** ****\_\_\_****

---

#### Test 1.3: Login with Non-Admin User

**Steps:**

1. Navigate to login page
2. Login with regular user credentials (userType = 'USER')
3. Click "Sign In"

**Expected Result:**

- [ ] Login succeeds
- [ ] Dashboard loads
- [ ] Protected admin routes show "Access Denied"

**Actual Result:** ****\_\_\_****

---

#### Test 1.4: Protected Route Access Without Login

**Steps:**

1. Clear browser state (logout if logged in)
2. Navigate directly to `http://localhost:5173/dashboard`

**Expected Result:**

- [ ] Redirects to `/login`
- [ ] Login page displays

**Actual Result:** ****\_\_\_****

---

#### Test 1.5: Logout Functionality

**Steps:**

1. Login as admin
2. Click "Logout" button in sidebar
3. Check redirect

**Expected Result:**

- [ ] Token cleared from state
- [ ] Redirects to `/login`
- [ ] Cannot access protected routes
- [ ] Sidebar no longer visible

**Actual Result:** ****\_\_\_****

---

### 2. Dashboard Tests

#### Test 2.1: Dashboard Statistics Display

**Steps:**

1. Login as admin
2. View dashboard

**Expected Result:**

- [ ] Total users count displays
- [ ] Total transactions count displays
- [ ] Bins to Diamonds rate displays
- [ ] Diamonds to Bins rate displays
- [ ] Last updated timestamps show

**Actual Result:**

- Total Users: ****\_\_\_****
- Total Transactions: ****\_\_\_****
- Bins→Diamonds Rate: ****\_\_\_****
- Diamonds→Bins Rate: ****\_\_\_****

---

#### Test 2.2: Recent Transactions List

**Steps:**

1. View dashboard
2. Check "Recent Transactions" section

**Expected Result:**

- [ ] Shows last 5 transactions
- [ ] Displays transaction type
- [ ] Shows affected user name
- [ ] Shows amount and currency
- [ ] Displays timestamp
- [ ] "View All" link works

**Actual Result:** ****\_\_\_****

---

#### Test 2.3: User Growth Chart

**Steps:**

1. View dashboard
2. Check "User Growth" chart

**Expected Result:**

- [ ] Chart displays with data
- [ ] Shows last 7 days
- [ ] X-axis shows dates
- [ ] Y-axis shows user counts
- [ ] Tooltip shows details on hover

**Actual Result:** ****\_\_\_****

---

#### Test 2.4: Transaction Trends Chart

**Steps:**

1. View dashboard
2. Check "Transaction Trends" chart

**Expected Result:**

- [ ] Chart displays with data
- [ ] Shows last 7 days
- [ ] Data points visible
- [ ] Proper axis labels

**Actual Result:** ****\_\_\_****

---

### 3. User Management Tests

#### Test 3.1: View All Users

**Steps:**

1. Click "Users" in sidebar
2. View user list

**Expected Result:**

- [ ] User table displays
- [ ] Shows avatar or initials
- [ ] Displays name and UUID
- [ ] Shows email and phone
- [ ] Displays user type badge
- [ ] Shows Bins balance
- [ ] Shows Diamond balance
- [ ] Shows registration date

**Actual Result:** ****\_\_\_****

---

#### Test 3.2: Search Users

**Steps:**

1. Go to Users page
2. Enter search term in search box
3. Observe results

**Test Cases:**

- [ ] Search by name: ****\_\_\_****
- [ ] Search by email: ****\_\_\_****
- [ ] Search by phone: ****\_\_\_****
- [ ] Search with no results: Shows "No users found"
- [ ] Clear search: Shows all users again

**Actual Result:** ****\_\_\_****

---

#### Test 3.3: User List Responsiveness

**Steps:**

1. Open Users page
2. Resize browser window
3. Check mobile view

**Expected Result:**

- [ ] Table adapts to mobile screen
- [ ] All information still accessible
- [ ] Scrollable on small screens
- [ ] No horizontal overflow

**Actual Result:** ****\_\_\_****

---

### 4. Currency Management Tests

#### Test 4.1: Gift Currency - Valid Request

**Steps:**

1. Go to "Currency Management"
2. Select "Gift Currency" tab
3. Enter user UUID (copy from Users page)
4. Select currency type: BINS
5. Enter amount: 1000
6. Enter reason: "Welcome bonus"
7. Add optional notes
8. Click "Gift Currency"

**Expected Result:**

- [ ] Success message displays
- [ ] Form resets after submission
- [ ] Transaction appears in history
- [ ] User balance increased by 1000 bins

**Verify in Database:**

```sql
SELECT * FROM admin_transactions
WHERE "affectedUserId" = 'user-uuid'
ORDER BY "createdAt" DESC LIMIT 1;
```

**Actual Result:** ****\_\_\_****

---

#### Test 4.2: Gift Currency - Invalid UUID

**Steps:**

1. Go to Currency Management
2. Enter invalid UUID: "invalid-uuid"
3. Fill other fields
4. Submit

**Expected Result:**

- [ ] Error message: "Invalid UUID format" or "User not found"
- [ ] Form doesn't reset
- [ ] No transaction created

**Actual Result:** ****\_\_\_****

---

#### Test 4.3: Gift Currency - Negative Amount

**Steps:**

1. Enter valid user UUID
2. Enter amount: -100
3. Try to submit

**Expected Result:**

- [ ] Validation error
- [ ] "Amount must be positive" message
- [ ] Cannot submit form

**Actual Result:** ****\_\_\_****

---

#### Test 4.4: Gift Currency - Missing Required Fields

**Steps:**

1. Leave user ID empty
2. Try to submit

**Expected Result:**

- [ ] Validation errors display
- [ ] Required fields highlighted
- [ ] Form doesn't submit

**Actual Result:** ****\_\_\_****

---

#### Test 4.5: Adjust Currency - Add

**Steps:**

1. Select "Adjust Currency" tab
2. Choose "Add"
3. Enter user UUID
4. Select DIAMONDS
5. Enter amount: 500
6. Enter reason: "Compensation"
7. Submit

**Expected Result:**

- [ ] Success message
- [ ] Balance increased by 500 diamonds
- [ ] Transaction logged with type "ADJUST_CURRENCY"
- [ ] adjustmentType shows "ADD"

**Actual Result:** ****\_\_\_****

---

#### Test 4.6: Adjust Currency - Deduct

**Steps:**

1. Select "Adjust Currency" tab
2. Choose "Deduct"
3. Enter user UUID (user with sufficient balance)
4. Select BINS
5. Enter amount: 100
6. Enter reason: "Penalty"
7. Submit

**Expected Result:**

- [ ] Success message
- [ ] Balance decreased by 100 bins
- [ ] Transaction logged
- [ ] adjustmentType shows "DEDUCT"

**Actual Result:** ****\_\_\_****

---

#### Test 4.7: Adjust Currency - Insufficient Balance

**Steps:**

1. Choose "Deduct"
2. Select user with 0 balance
3. Try to deduct 100 bins
4. Submit

**Expected Result:**

- [ ] Error message: "Insufficient balance"
- [ ] No transaction created
- [ ] Balance unchanged

**Actual Result:** ****\_\_\_****

---

### 5. Conversion Rate Tests

#### Test 5.1: Update Bins to Diamonds Rate

**Steps:**

1. Go to "Conversion Rates"
2. Select "Bins to Diamonds"
3. View current rate
4. Enter source value: 100
5. Enter target value: 1
6. Enter commission: 5
7. Click "Update Rate"

**Expected Result:**

- [ ] Success message
- [ ] Rate updated in database
- [ ] Dashboard shows new rate
- [ ] Transaction logged in history
- [ ] Old rate value saved in metadata

**Calculated Rate:** 100 bins = 1 diamond (100:1)

**Verify:**

```sql
SELECT * FROM conversion_configs
WHERE "conversionType" = 'BINS_TO_DIAMONDS';
```

**Actual Result:** ****\_\_\_****

---

#### Test 5.2: Update Diamonds to Bins Rate

**Steps:**

1. Select "Diamonds to Bins"
2. Enter source value: 1
3. Enter target value: 95
4. Enter commission: 5
5. Submit

**Expected Result:**

- [ ] Success message
- [ ] Rate updated
- [ ] 1 diamond = 95 bins (after 5% commission)

**Actual Result:** ****\_\_\_****

---

#### Test 5.3: Invalid Rate Values - Zero

**Steps:**

1. Enter source value: 0
2. Enter target value: 100
3. Try to submit

**Expected Result:**

- [ ] Validation error
- [ ] "Values must be greater than zero"
- [ ] Form doesn't submit

**Actual Result:** ****\_\_\_****

---

#### Test 5.4: Invalid Rate Values - Negative

**Steps:**

1. Enter source value: -100
2. Try to submit

**Expected Result:**

- [ ] Validation error
- [ ] Cannot submit

**Actual Result:** ****\_\_\_****

---

#### Test 5.5: Rate Display and Calculation

**Steps:**

1. Enter source: 100, target: 2
2. Observe displayed rate

**Expected Result:**

- [ ] Shows "50:1" or "50 bins per 1 diamond"
- [ ] Calculation is correct

**Actual Result:** ****\_\_\_****

---

### 6. Transaction History Tests

#### Test 6.1: View All Transactions

**Steps:**

1. Go to "Transaction History"
2. View transaction list

**Expected Result:**

- [ ] All transactions display
- [ ] Columns: Date, Admin, User, Type, Currency, Amount
- [ ] Sorted by most recent first
- [ ] Pagination if > 50 transactions

**Actual Result:** ****\_\_\_****

---

#### Test 6.2: Filter by Transaction Type

**Steps:**

1. Open "Transaction History"
2. Select filter: "Gift Currency"
3. Apply filter

**Expected Result:**

- [ ] Only GIFT_CURRENCY transactions show
- [ ] Other types hidden
- [ ] Count updates

**Actual Result:** ****\_\_\_****

---

#### Test 6.3: Filter by Currency Type

**Steps:**

1. Select filter: "Bins"
2. Apply

**Expected Result:**

- [ ] Only transactions with BINS currency show
- [ ] Diamonds transactions hidden

**Actual Result:** ****\_\_\_****

---

#### Test 6.4: Date Range Filter

**Steps:**

1. Select start date: Last week
2. Select end date: Today
3. Apply filter

**Expected Result:**

- [ ] Only transactions in date range show
- [ ] Older transactions filtered out

**Actual Result:** ****\_\_\_****

---

#### Test 6.5: Search Transactions

**Steps:**

1. Enter user name in search
2. Search

**Expected Result:**

- [ ] Shows transactions for that user
- [ ] Other transactions hidden

**Actual Result:** ****\_\_\_****

---

#### Test 6.6: View Transaction Details

**Steps:**

1. Click on a transaction row
2. View details modal/panel

**Expected Result:**

- [ ] Shows full transaction details
- [ ] Displays metadata (JSON)
- [ ] Shows before/after balances
- [ ] Admin and user information visible

**Actual Result:** ****\_\_\_****

---

### 7. UI/UX Tests

#### Test 7.1: Responsive Design - Mobile

**Steps:**

1. Open admin panel
2. Resize to mobile width (375px)
3. Test all pages

**Expected Result:**

- [ ] Sidebar collapses to hamburger menu
- [ ] Tables scroll horizontally
- [ ] Forms stack vertically
- [ ] Buttons are touch-friendly
- [ ] No horizontal overflow
- [ ] All features accessible

**Actual Result:** ****\_\_\_****

---

#### Test 7.2: Responsive Design - Tablet

**Steps:**

1. Resize to tablet width (768px)
2. Test navigation

**Expected Result:**

- [ ] Layout adapts properly
- [ ] Sidebar may collapse
- [ ] Content readable

**Actual Result:** ****\_\_\_****

---

#### Test 7.3: Loading States

**Steps:**

1. Throttle network in DevTools
2. Navigate between pages
3. Submit forms

**Expected Result:**

- [ ] Loading indicators appear
- [ ] Skeleton loaders or spinners show
- [ ] Buttons disabled during loading
- [ ] User knows system is working

**Actual Result:** ****\_\_\_****

---

#### Test 7.4: Error States

**Steps:**

1. Turn off backend server
2. Try to load dashboard
3. Try to submit a form

**Expected Result:**

- [ ] Error messages display
- [ ] User-friendly error text
- [ ] Retry option available
- [ ] No console errors break UI

**Actual Result:** ****\_\_\_****

---

#### Test 7.5: Form Validation

**Steps:**

1. Try submitting empty forms
2. Enter invalid data
3. Check validation messages

**Expected Result:**

- [ ] Inline validation errors
- [ ] Error messages clear and helpful
- [ ] Fields highlighted in red
- [ ] Validation on blur and submit

**Actual Result:** ****\_\_\_****

---

### 8. Browser Compatibility Tests

#### Test 8.1: Chrome/Chromium

- [ ] All features work
- [ ] No console errors
- [ ] UI renders correctly

**Version:** ****\_\_\_****
**Issues:** ****\_\_\_****

---

#### Test 8.2: Firefox

- [ ] All features work
- [ ] No console errors
- [ ] UI renders correctly

**Version:** ****\_\_\_****
**Issues:** ****\_\_\_****

---

#### Test 8.3: Safari

- [ ] All features work
- [ ] No console errors
- [ ] UI renders correctly

**Version:** ****\_\_\_****
**Issues:** ****\_\_\_****

---

### 9. Performance Tests

#### Test 9.1: Page Load Time

**Steps:**

1. Open DevTools Network tab
2. Load dashboard
3. Record load time

**Expected Result:**

- [ ] Dashboard loads in < 2 seconds
- [ ] First contentful paint < 1 second

**Actual Result:** ****\_\_\_****

---

#### Test 9.2: API Response Time

**Steps:**

1. Monitor Network tab
2. Trigger API calls
3. Record response times

**Expected Result:**

- [ ] Login: < 500ms
- [ ] Dashboard data: < 1000ms
- [ ] User list: < 1000ms
- [ ] Transaction history: < 1500ms

**Actual Result:**

- Login: ****\_\_\_****
- Dashboard: ****\_\_\_****
- Users: ****\_\_\_****
- Transactions: ****\_\_\_****

---

#### Test 9.3: Bundle Size

**Steps:**

1. Run `npm run build`
2. Check dist/assets sizes

**Expected Result:**

- [ ] Main JS bundle < 500KB (gzipped < 150KB)
- [ ] CSS < 50KB
- [ ] Total page weight < 600KB

**Actual Result:** ****\_\_\_****

---

### 10. Security Tests

#### Test 10.1: XSS Protection

**Steps:**

1. Try to inject `<script>alert('xss')</script>` in:
    - Search fields
    - Reason/notes fields
    - User input fields

**Expected Result:**

- [ ] Script doesn't execute
- [ ] Text displayed as plain text
- [ ] No security vulnerabilities

**Actual Result:** ****\_\_\_****

---

#### Test 10.2: JWT Token Handling

**Steps:**

1. Login and get token
2. Check browser storage (localStorage, sessionStorage, cookies)

**Expected Result:**

- [ ] Token NOT in localStorage
- [ ] Token NOT in sessionStorage
- [ ] Token in memory only (Zustand)
- [ ] Clears on logout
- [ ] Clears on page refresh (for security)

**Actual Result:** ****\_\_\_****

---

#### Test 10.3: Authorization Checks

**Steps:**

1. Manually modify API request
2. Try to call admin endpoint without token
3. Try with invalid token

**Expected Result:**

- [ ] 401 Unauthorized without token
- [ ] 403 Forbidden with invalid token
- [ ] 403 Forbidden for non-admin users

**Actual Result:** ****\_\_\_****

---

## 📊 Test Summary

### Statistics

- Total Test Cases: 53
- Passed: ****\_\_\_****
- Failed: ****\_\_\_****
- Skipped: ****\_\_\_****
- Pass Rate: ****\_\_\_****%

### Critical Issues Found

1. ***
2. ***
3. ***

### Minor Issues Found

1. ***
2. ***
3. ***

### Recommendations

1. ***
2. ***
3. ***

---

## ✅ Sign-Off

**Tested By:** ****\_\_\_****
**Date:** ****\_\_\_****
**Environment:** ****\_\_\_****
**Backend Version:** ****\_\_\_****
**Frontend Version:** ****\_\_\_****

**Status:** [ ] Ready for Production [ ] Needs Work

**Notes:**

---

---

---

---

**Next Steps:**

1. Fix critical issues
2. Re-test failed cases
3. Document any workarounds
4. Get approval for production deployment
