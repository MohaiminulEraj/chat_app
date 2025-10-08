import { api } from './api';
import type {
  ApiResponse,
  AuthResponse,
  DashboardStats,
  GiftCurrencyRequest,
  AdjustCurrencyRequest,
  UpdateConversionRateRequest,
  AdminTransaction,
  ConversionConfig,
  User,
  ConversionType,
} from '../types/admin';

export const adminService = {
  // Authentication
  login: async (emailOrPhone: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/auth/login',
      {
        emailOrPhone,
        password,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );
    return response.data;
  },

  // Dashboard
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard');
    return response.data;
  },

  // Currency Management
  giftCurrency: async (data: GiftCurrencyRequest): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/admin/gift-currency', data);
    return response.data;
  },

  adjustCurrency: async (data: AdjustCurrencyRequest): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/admin/adjust-currency', data);
    return response.data;
  },

  // Conversion Rates
  getConversionRates: async (): Promise<ApiResponse<ConversionConfig[]>> => {
    const response = await api.get<ApiResponse<ConversionConfig[]>>('/admin/conversion-rates');
    return response.data;
  },

  updateConversionRate: async (
    type: ConversionType,
    data: UpdateConversionRateRequest
  ): Promise<ApiResponse<ConversionConfig>> => {
    const response = await api.put<ApiResponse<ConversionConfig>>(
      `/admin/conversion-rates/${type}`,
      data
    );
    return response.data;
  },

  // Transactions
  getTransactions: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      transactionType?: string;
      currencyType?: string;
      adminId?: string;
      affectedUserId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<{ transactions: AdminTransaction[]; total: number }>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const response = await api.get<ApiResponse<{ transactions: AdminTransaction[]; total: number }>>(
      `/admin/transactions?${params}`
    );
    return response.data;
  },

  // User Management
  searchUsers: async (query: string): Promise<ApiResponse<User[]>> => {
    const response = await api.get<ApiResponse<User[]>>(`/users/search?q=${query}`);
    return response.data;
  },

  getUser: async (userId: string): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/users/${userId}`);
    return response.data;
  },
};
