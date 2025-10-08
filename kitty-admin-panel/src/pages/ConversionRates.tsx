import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { RefreshCcw, Edit2, CheckCircle, ArrowRight } from 'lucide-react';
import { adminService } from '../services/adminService';
import { ConversionType, type UpdateConversionRateRequest } from '../types/admin';
import { formatDate } from '../utils/format';

interface UpdateRateForm {
  sourceValue: number;
  targetValue: number;
  commissionPercent: number;
  reason: string;
}

export function ConversionRates() {
  const [editingType, setEditingType] = useState<ConversionType | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: rates, isLoading } = useQuery({
    queryKey: ['conversion-rates'],
    queryFn: () => adminService.getConversionRates(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UpdateRateForm>();

  const updateMutation = useMutation({
    mutationFn: ({ type, data }: { type: ConversionType; data: UpdateConversionRateRequest }) =>
      adminService.updateConversionRate(type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversion-rates'] });
      setSuccess(true);
      setEditingType(null);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const startEditing = (type: ConversionType) => {
    const config = rates?.data.find((r) => r.conversionType === type);
    if (config) {
      setValue('sourceValue', config.sourceValue);
      setValue('targetValue', config.targetValue);
      setValue('commissionPercent', config.commissionPercent);
      setEditingType(type);
    }
  };

  const onSubmit = (data: UpdateRateForm) => {
    if (editingType) {
      updateMutation.mutate({ type: editingType, data });
    }
  };

  const calculateRate = (sourceValue: number, targetValue: number) => {
    if (sourceValue === 0) return 0;
    return targetValue / sourceValue;
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
        <h1 className="text-3xl font-bold text-gray-900">Conversion Rates</h1>
        <p className="mt-1 text-gray-600">Manage currency conversion rates and commissions</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>Conversion rate updated successfully!</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Rates */}
        <div className="space-y-4">
          {rates?.data.map((config) => {
            const rate = calculateRate(config.sourceValue, config.targetValue);
            const isEditing = editingType === config.conversionType;

            return (
              <div
                key={config.id}
                className={`rounded-lg border-2 bg-white p-6 shadow transition-all ${
                  isEditing ? 'border-primary-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {config.conversionType === ConversionType.BINS_TO_DIAMONDS
                          ? 'Bins → Diamonds'
                          : 'Diamonds → Bins'}
                      </h3>
                      {config.isActive && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <span>{config.sourceValue}</span>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                        <span>{config.targetValue}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Rate: <span className="font-semibold">{rate.toFixed(6)}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Commission: <span className="font-semibold">{config.commissionPercent}%</span>
                      </p>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-gray-500">
                      <p>Last updated: {formatDate(config.lastUpdatedAt)}</p>
                      <p>Updated by: {config.lastUpdatedBy}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => startEditing(config.conversionType)}
                    disabled={isEditing}
                    className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Edit2 className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Form */}
        {editingType && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Update Rate: {editingType === ConversionType.BINS_TO_DIAMONDS ? 'Bins → Diamonds' : 'Diamonds → Bins'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Source Value ({editingType === ConversionType.BINS_TO_DIAMONDS ? 'Bins' : 'Diamonds'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('sourceValue', { required: 'Source value is required', min: 0.01 })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.sourceValue && (
                  <p className="mt-1 text-sm text-red-600">{errors.sourceValue.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Value ({editingType === ConversionType.BINS_TO_DIAMONDS ? 'Diamonds' : 'Bins'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('targetValue', { required: 'Target value is required', min: 0.01 })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.targetValue && (
                  <p className="mt-1 text-sm text-red-600">{errors.targetValue.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Commission Percent</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('commissionPercent', { required: 'Commission is required', min: 0, max: 100 })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.commissionPercent && (
                  <p className="mt-1 text-sm text-red-600">{errors.commissionPercent.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason for Change</label>
                <textarea
                  {...register('reason', { required: 'Reason is required' })}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Explain why this rate is being updated..."
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <RefreshCcw className="h-5 w-5" />
                  {updateMutation.isPending ? 'Updating...' : 'Update Rate'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingType(null);
                    reset();
                  }}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              {updateMutation.error && (
                <p className="text-sm text-red-600">
                  {(updateMutation.error as any)?.response?.data?.message || 'Failed to update rate'}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
