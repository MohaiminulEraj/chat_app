import { useQuery } from '@tanstack/react-query';
import { Users, Coins, TrendingUp } from 'lucide-react';
import { adminService } from '../services/adminService';
import { formatCurrency, formatRelativeTime } from '../utils/format';
import { AdminTransactionType } from '../types/admin';

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  const dashboardData = stats?.data;

  const statCards = [
    {
      title: 'Total Users',
      value: dashboardData?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Bins Distributed',
      value: formatCurrency(dashboardData?.totalBinsDistributed || 0),
      icon: Coins,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Diamonds Distributed',
      value: formatCurrency(dashboardData?.totalDiamondsDistributed || 0),
      icon: Coins,
      color: 'bg-purple-500',
      change: '+15%',
    },
    {
      title: 'Total Transactions',
      value: dashboardData?.totalTransactions || 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+23%',
    },
  ];

  const getTransactionTypeBadge = (type: AdminTransactionType) => {
    const styles: Record<string, string> = {
      [AdminTransactionType.GIFT_CURRENCY]: 'bg-green-100 text-green-800',
      [AdminTransactionType.ADJUST_CURRENCY_ADD]: 'bg-blue-100 text-blue-800',
      [AdminTransactionType.ADJUST_CURRENCY_DEDUCT]: 'bg-red-100 text-red-800',
      [AdminTransactionType.UPDATE_CONVERSION_RATE]: 'bg-purple-100 text-purple-800',
      [AdminTransactionType.MANUAL_BALANCE_CORRECTION]: 'bg-yellow-100 text-yellow-800',
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Overview of platform statistics and recent activities</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.title} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="mt-2 text-sm text-green-600">{stat.change} from last month</p>
              </div>
              <div className={`rounded-full ${stat.color} p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {dashboardData?.recentTransactions?.slice(0, 10).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTransactionTypeBadge(
                        transaction.transactionType
                      )}`}
                    >
                      {transaction.transactionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {transaction.currencyType || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {transaction.amount ? formatCurrency(transaction.amount) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {transaction.reason}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatRelativeTime(transaction.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
