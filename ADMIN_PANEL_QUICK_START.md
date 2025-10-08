# 🚀 Kitty Admin Panel - Quick Start Guide

## 📋 Prerequisites Checklist

- ✅ Node.js 18+ installed
- ✅ Backend API running on `http://localhost:3000`
- ✅ PostgreSQL database with admin_transactions table
- ✅ At least one admin user in database

---

## ⚡ Quick Start (3 Steps)

### Step 1: Navigate to Admin Panel

```bash
cd /home/eraj/Documents/work/per/kitty_backend/kitty-admin-panel
```

### Step 2: Install Dependencies (if not done)

```bash
npm install
```

### Step 3: Start Development Server

```bash
npm run dev
```

✅ **Admin panel is now running at: `http://localhost:5173`**

---

## 🔐 Login

### Default Admin Credentials

Create an admin user in your database if you don't have one:

```sql
-- Create admin user
INSERT INTO users (
  uuid,
  email,
  password,
  "userType",
  name,
  "phoneNumber",
  "binsBalance",
  "diamondBalance",
  "isEmailVerified"
) VALUES (
  gen_random_uuid(),
  'admin@kitty.com',
  '$2a$10$YourHashedPasswordHere',
  'ADMIN',
  'Admin User',
  '+1234567890',
  0,
  0,
  true
);
```

**Note:** Hash your password using bcrypt before inserting.

### Login to Admin Panel

1. Open `http://localhost:5173`
2. Enter email: `admin@kitty.com`
3. Enter password: `your_password`
4. Click "Sign In"

---

## 🎯 Quick Feature Tour

### 1. Dashboard

- View total users and transactions
- See recent activity
- Monitor conversion rates
- View growth charts

### 2. User Management

- Search users by name/email/phone
- View user balances (Bins & Diamonds)
- Check user types and roles

### 3. Currency Management

**Gift Currency:**

- Select currency type (Bins or Diamonds)
- Enter user UUID
- Enter amount and reason
- Click "Gift Currency"

**Adjust Balance:**

- Choose Add or Deduct
- Select currency type
- Enter amount and reason
- Click "Adjust Balance"

### 4. Conversion Rates

- Update Bins to Diamonds rate
- Update Diamonds to Bins rate
- Set commission percentage
- View rate history

### 5. Transaction History

- View all admin transactions
- Filter by type and currency
- Search by user or admin
- View transaction details

---

## 🛠️ Common Commands

### Development

```bash
npm run dev          # Start dev server
```

### Build

```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

### Linting

```bash
npm run lint         # Check code quality
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Issue:** Port 5173 is already in use

**Solution:**

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or specify different port
npm run dev -- --port 3001
```

### API Connection Error

**Issue:** Cannot connect to backend API

**Solution:**

1. Check backend is running: `curl http://localhost:3000`
2. Verify `.env` file has correct `VITE_API_BASE_URL`
3. Check CORS is enabled in backend

### Login Fails

**Issue:** "Invalid credentials" error

**Solution:**

1. Verify admin user exists in database
2. Check password is correctly hashed
3. Ensure userType is 'ADMIN'
4. Check backend logs for errors

### TypeScript Errors

**Issue:** Build fails with TypeScript errors

**Solution:**

```bash
# Clean and rebuild
rm -rf node_modules/.tmp
npm run build
```

### Tailwind Styles Not Applying

**Issue:** CSS styles not working

**Solution:**

1. Check `src/index.css` is imported in `main.tsx`
2. Verify Tailwind directives in `index.css`
3. Restart dev server

---

## 📱 API Endpoints Reference

### Authentication

```typescript
POST /auth/login
Body: { emailOrPhone: string, password: string }
```

### Dashboard

```typescript
GET / admin / dashboard
```

### Users

```typescript
GET / users
```

### Currency Operations

```typescript
POST / admin / gift - currency
POST / admin / adjust - currency
```

### Conversion Rates

```typescript
PUT /admin/conversion-rates/:type
GET /admin/conversion-rates
```

### Transactions

```typescript
GET / admin / transactions
```

---

## 🎨 Customization

### Change Primary Color

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#0ea5e9', // Change this color
        // ... other shades
      }
    }
  }
}
```

### Change API URL

Edit `.env`:

```env
VITE_API_BASE_URL=https://your-api-url.com
```

---

## ✅ Verification Checklist

After starting the admin panel, verify:

- [ ] Login page loads at `http://localhost:5173`
- [ ] Can login with admin credentials
- [ ] Redirects to dashboard after login
- [ ] Dashboard shows statistics
- [ ] Users page displays user list
- [ ] Currency management forms work
- [ ] Conversion rates page loads
- [ ] Transaction history displays
- [ ] Can logout successfully
- [ ] Protected routes require authentication

---

## 📞 Support

### Check Logs

**Frontend Logs:**

- Browser console (F12)
- Terminal where `npm run dev` is running

**Backend Logs:**

- Backend terminal output
- Check for JWT validation errors
- Verify admin guard logs

### Common Issues

**"User not authenticated"**

- Token expired or invalid
- Logout and login again

**"Access denied"**

- User is not admin type
- Check database: `SELECT "userType" FROM users WHERE email = 'your@email.com'`

**"Cannot find user"**

- Invalid UUID in forms
- Copy UUID from Users page

---

## 🎉 You're Ready!

The admin panel is now running and ready to use. Start by:

1. ✅ Logging in with admin credentials
2. ✅ Exploring the dashboard
3. ✅ Managing users and currency
4. ✅ Viewing transaction history

**Have fun managing your Kitty platform! 🐱**

---

_For detailed documentation, see ADMIN_PANEL_IMPLEMENTATION.md_
_For README, see kitty-admin-panel/README.md_
