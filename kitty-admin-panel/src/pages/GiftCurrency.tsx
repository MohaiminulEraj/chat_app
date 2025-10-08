import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, Gift, CheckCircle } from 'lucide-react';
import { adminService } from '../services/adminService';
import { CurrencyType, type GiftCurrencyRequest, type User } from '../types/admin';

interface GiftForm {
  affectedUserId: string;
  currencyType: CurrencyType;
  amount: number;
  reason: string;
  notes?: string;
}

export function GiftCurrency() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [success, setSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<GiftForm>();

  const { data: searchResults, refetch: searchUsers } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: () => adminService.searchUsers(searchQuery),
    enabled: false,
  });

  const giftMutation = useMutation({
    mutationFn: (data: GiftCurrencyRequest) => adminService.giftCurrency(data),
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

  const onSubmit = (data: GiftForm) => {
    giftMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gift Currency</h1>
        <p className="mt-1 text-gray-600">Distribute bins or diamonds to users</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>Currency gifted successfully!</span>
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
            </div>
          )}
        </div>

        {/* Gift Form */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Gift Details</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register('affectedUserId', { required: true })} />

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
                placeholder="e.g., Welcome bonus, Promotion reward"
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
              disabled={!selectedUser || giftMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Gift className="h-5 w-5" />
              {giftMutation.isPending ? 'Processing...' : 'Gift Currency'}
            </button>

            {giftMutation.error && (
              <p className="text-sm text-red-600">
                {(giftMutation.error as any)?.response?.data?.message || 'Failed to gift currency'}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
