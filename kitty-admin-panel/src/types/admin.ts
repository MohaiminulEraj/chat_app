export const UserTypes = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  MODERATOR: 'MODERATOR',
} as const;

export type UserTypes = typeof UserTypes[keyof typeof UserTypes];

export const CurrencyType = {
  BINS: 'BINS',
  DIAMONDS: 'DIAMONDS',
} as const;

export type CurrencyType = typeof CurrencyType[keyof typeof CurrencyType];

export const AdminTransactionType = {
  GIFT_CURRENCY: 'GIFT_CURRENCY',
  ADJUST_CURRENCY_ADD: 'ADJUST_CURRENCY_ADD',
  ADJUST_CURRENCY_DEDUCT: 'ADJUST_CURRENCY_DEDUCT',
  UPDATE_CONVERSION_RATE: 'UPDATE_CONVERSION_RATE',
  MANUAL_BALANCE_CORRECTION: 'MANUAL_BALANCE_CORRECTION',
} as const;

export type AdminTransactionType = typeof AdminTransactionType[keyof typeof AdminTransactionType];

export const ConversionType = {
  BINS_TO_DIAMONDS: 'BINS_TO_DIAMONDS',
  DIAMONDS_TO_BINS: 'DIAMONDS_TO_BINS',
} as const;

export type ConversionType = typeof ConversionType[keyof typeof ConversionType];

export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phoneNumber?: string;
  userType: UserTypes;
  authProvider: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  binsBalance: number;
  diamondBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTransaction {
  id: number;
  transactionType: AdminTransactionType;
  adminId: string;
  affectedUserId: string;
  currencyType?: CurrencyType;
  amount?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  reason: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ConversionConfig {
  id: number;
  conversionType: ConversionType;
  sourceValue: number;
  targetValue: number;
  commissionPercent: number;
  isActive: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalBinsDistributed: number;
  totalDiamondsDistributed: number;
  totalTransactions: number;
  activeConversions: number;
  recentTransactions: AdminTransaction[];
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  data: {
    id: number;
    uuid: string;
    name: string;
    email: string;
    phoneNumber?: string;
    token: string;
    userType: UserTypes;
    authProvider: string;
    avatarUrl?: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    binsBalance: number;
    diamondBalance: number;
  };
}

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
}

export interface GiftCurrencyRequest {
  affectedUserId: string;
  currencyType: CurrencyType;
  amount: number;
  reason: string;
  notes?: string;
}

export interface AdjustCurrencyRequest {
  affectedUserId: string;
  currencyType: CurrencyType;
  amount: number;
  transactionType: AdminTransactionType;
  reason: string;
  notes?: string;
}

export interface UpdateConversionRateRequest {
  sourceValue: number;
  targetValue: number;
  commissionPercent?: number;
  reason?: string;
}
