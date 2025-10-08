import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Coins,
  RefreshCcw,
  History,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Gift Currency', href: '/currency/gift', icon: Coins },
  { name: 'Adjust Currency', href: '/currency/adjust', icon: RefreshCcw },
  { name: 'Conversion Rates', href: '/conversion-rates', icon: RefreshCcw },
  { name: 'Transactions', href: '/transactions', icon: History },
];

export function Sidebar() {
  const { logout, user } = useAuthStore();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold">Kitty Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="mb-3 rounded-lg bg-gray-800 p-3">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-gray-400">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
