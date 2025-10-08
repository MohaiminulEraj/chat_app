import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Download } from 'lucide-react';
import { adminService } from '../services/adminService';
import { AdminTransactionType, CurrencyType } from '../types/admin';
import { formatCurrency, formatDate } from '../utils/format';

export function Transactions() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    transactionType: '',
    currencyType: '',
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', page, filters],
    queryFn: () => adminService.getTransactions(page, 20, filters),
  });

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

  const totalPages = transactions?.data ? Math.ceil(transactions.data.total / 20) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="mt-1 text-gray-600">View all admin transactions and activities</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
          <Download className="h-5 w-5" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={filters.transactionType}
            onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Transaction Types</option>
            {Object.values(AdminTransactionType).map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            value={filters.currencyType}
            onChange={(e) => setFilters({ ...filters, currencyType: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Currency Types</option>
            <option value={CurrencyType.BINS}>Bins</option>
            <option value={CurrencyType.DIAMONDS}>Diamonds</option>
          </select>

          <button
            onClick={() => setFilters({ transactionType: '', currencyType: '' })}
            className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ID
                    </th>
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
                      Balance Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transactions?.data?.transactions?.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        #{transaction.id}
                      </td>
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
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {transaction.balanceBefore !== undefined && transaction.balanceAfter !== undefined ? (
                          <span>
                            {formatCurrency(transaction.balanceBefore)} →{' '}
                            {formatCurrency(transaction.balanceAfter)}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-600">
                        {transaction.reason}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <div className="text-sm text-gray-700">
                Showing page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
