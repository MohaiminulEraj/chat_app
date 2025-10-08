import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, RefreshCcw, CheckCircle, Plus, Minus } from 'lucide-react';
import { adminService } from '../services/adminService';
import { CurrencyType, AdminTransactionType, type AdjustCurrencyRequest, type User } from '../types/admin';

interface AdjustForm {
  affectedUserId: string;
  currencyType: CurrencyType;
  amount: number;
  transactionType: AdminTransactionType;
  reason: string;
  notes?: string;
}

export function AdjustCurrency() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [success, setSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AdjustForm>();

  const transactionType = watch('transactionType');

  const { data: searchResults, refetch: searchUsers } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: () => adminService.searchUsers(searchQuery),
    enabled: false,
  });

  const adjustMutation = useMutation({
    mutationFn: (data: AdjustCurrencyRequest) => adminService.adjustCurrency(data),
    onSuccess: () => {
      setSuccess(true);
      reset();
      setSelectedUser(null);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchUsers();
    }
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setValue('affectedUserId', user.uuid);
  };

  const onSubmit = (data: AdjustForm) => {
    adjustMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Adjust Currency</h1>
        <p className="mt-1 text-gray-600">Add or deduct bins/diamonds from user accounts</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>Currency adjusted successfully!</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Search */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Search User</h2>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, email, or UUID..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700"
            >
              Search
            </button>
          </div>

          {searchResults?.data && searchResults.data.length > 0 && (
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {searchResults.data.map((user) => (
                <div
                  key={user.uuid}
                  onClick={() => selectUser(user)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    selectedUser?.uuid === user.uuid
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">
                        Bins: <span className="font-semibold">{user.binsBalance}</span>
                      </p>
                      <p className="text-gray-600">
                        Diamonds: <span className="font-semibold">{user.diamondBalance}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">Selected User</p>
              <p className="mt-1 text-lg font-semibold text-green-900">{selectedUser.name}</p>
              <div className="mt-2 flex gap-4 text-sm">
                <span>Bins: <strong>{selectedUser.binsBalance}</strong></span>
                <span>Diamonds: <strong>{selectedUser.diamondBalance}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Adjust Form */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Adjustment Details</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register('affectedUserId', { required: true })} />

            <div>
              <label className="block text-sm font-medium text-gray-700">Operation</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-gray-300 p-4 transition-colors hover:border-green-500 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                  <input
                    type="radio"
                    value={AdminTransactionType.ADJUST_CURRENCY_ADD}
                    {...register('transactionType', { required: 'Operation is required' })}
                    className="sr-only"
                  />
                  <Plus className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Add</span>
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-gray-300 p-4 transition-colors hover:border-red-500 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                  <input
                    type="radio"
                    value={AdminTransactionType.ADJUST_CURRENCY_DEDUCT}
                    {...register('transactionType', { required: 'Operation is required' })}
                    className="sr-only"
                  />
                  <Minus className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Deduct</span>
                </label>
              </div>
              {errors.transactionType && (
                <p className="mt-1 text-sm text-red-600">{errors.transactionType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Currency Type</label>
              <select
                {...register('currencyType', { required: 'Currency type is required' })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select currency</option>
                <option value={CurrencyType.BINS}>Bins</option>
                <option value={CurrencyType.DIAMONDS}>Diamonds</option>
              </select>
              {errors.currencyType && (
                <p className="mt-1 text-sm text-red-600">{errors.currencyType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { required: 'Amount is required', min: 0.01 })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                {...register('reason', { required: 'Reason is required' })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Balance correction, Refund"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Additional notes..."
              />
            </div>

            <button
              type="submit"
              disabled={!selectedUser || !transactionType || adjustMutation.isPending}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                transactionType === AdminTransactionType.ADJUST_CURRENCY_ADD
                  ? 'bg-green-600 hover:bg-green-700'
                  : transactionType === AdminTransactionType.ADJUST_CURRENCY_DEDUCT
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              <RefreshCcw className="h-5 w-5" />
              {adjustMutation.isPending ? 'Processing...' : 'Adjust Currency'}
            </button>

            {adjustMutation.error && (
              <p className="text-sm text-red-600">
                {(adjustMutation.error as any)?.response?.data?.message || 'Failed to adjust currency'}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
