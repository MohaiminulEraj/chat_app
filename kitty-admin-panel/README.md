# 🎯 Kitty Admin Panel

A modern, responsive admin panel built with React, TypeScript, Vite, and Tailwind CSS for managing the Kitty platform.

## ✨ Features

- **🔐 Authentication** - Secure admin login with JWT tokens
- **📊 Dashboard** - Real-time statistics and recent activity overview
- **👥 User Management** - Search and view user information
- **💰 Currency Management**
  - Gift currency to users (Bins/Diamonds)
  - Adjust user balances (Add/Deduct)
- **🔄 Conversion Rates** - Manage Bins ↔ Diamonds conversion rates
- **📜 Transaction History** - Complete audit trail of all admin actions
- **🎨 Modern UI** - Clean, responsive design with Tailwind CSS
- **⚡ Fast Performance** - Built with Vite and SWC for blazing-fast builds

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite with SWC
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Formatting**: date-fns
- **HTTP Client**: Axios

## 📦 Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd kitty-admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your API base URL:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

## 🚀 Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Top navigation bar
│   │   ├── Sidebar.tsx         # Left sidebar navigation
│   │   └── MainLayout.tsx      # Main layout wrapper
│   ├── auth/
│   ├── dashboard/
│   ├── users/
│   ├── currency/
│   └── transactions/
├── pages/
│   ├── Login.tsx               # Login page
│   ├── Dashboard.tsx           # Dashboard with stats
│   ├── Users.tsx               # User management
│   ├── GiftCurrency.tsx        # Gift currency to users
│   ├── AdjustCurrency.tsx      # Adjust user balances
│   ├── ConversionRates.tsx     # Manage conversion rates
│   └── Transactions.tsx        # Transaction history
├── services/
│   ├── api.ts                  # Axios configuration
│   └── adminService.ts         # API service methods
├── store/
│   └── authStore.ts            # Zustand auth store
├── types/
│   └── admin.ts                # TypeScript types/interfaces
├── utils/
│   └── format.ts               # Utility functions
├── hooks/
├── App.tsx                     # Main app component
├── main.tsx                    # App entry point
└── index.css                   # Global styles

```

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |

## 🎨 Key Features Explained

### Authentication
- Admin-only access with JWT tokens
- Persistent sessions using localStorage
- Auto-redirect to login on 401 errors

### Dashboard
- Total users count
- Total currency distributed (Bins/Diamonds)
- Transaction statistics
- Recent transactions table

### Currency Management

#### Gift Currency
- Search users by name, email, or UUID
- Select currency type (Bins/Diamonds)
- Specify amount and reason
- Complete audit trail

#### Adjust Currency
- Add or deduct currency
- Balance before/after tracking
- Reason required for compliance

### Conversion Rates
- Update Bins → Diamonds rate
- Update Diamonds → Bins rate
- Commission percentage settings
- Change reason tracking

### Transaction History
- Filterable by transaction type
- Filterable by currency type
- Pagination support
- Detailed transaction information
- Export functionality (coming soon)

## 🔐 API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login |
| GET | `/admin/dashboard` | Dashboard statistics |
| POST | `/admin/gift-currency` | Gift currency to user |
| POST | `/admin/adjust-currency` | Adjust user balance |
| GET | `/admin/conversion-rates` | Get conversion rates |
| PUT | `/admin/conversion-rates/:type` | Update conversion rate |
| GET | `/admin/transactions` | Get transaction history |
| GET | `/users/search` | Search users |

## 🎯 Usage

### Login
1. Navigate to the login page
2. Enter admin credentials (email/phone and password)
3. Only users with `userType: ADMIN` can access

### Gift Currency
1. Go to "Gift Currency" from sidebar
2. Search for the target user
3. Select user from results
4. Choose currency type (Bins/Diamonds)
5. Enter amount and reason
6. Submit the form

### Adjust Currency
1. Go to "Adjust Currency" from sidebar
2. Search for the target user
3. Select user from results
4. Choose operation (Add/Deduct)
5. Select currency type
6. Enter amount and reason
7. Submit the form

### Update Conversion Rates
1. Go to "Conversion Rates" from sidebar
2. Click edit icon on the rate you want to update
3. Enter new source and target values
4. Set commission percentage
5. Provide reason for change
6. Submit the update

## �� Development

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

### Lint code
```bash
npm run lint
```

## 📝 Notes

- All admin actions are logged in the `admin_transactions` table
- JWT tokens are stored in localStorage
- Tokens automatically included in API requests
- 401 errors trigger automatic logout and redirect to login

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License

---

**Built with ❤️ for Kitty Platform**
