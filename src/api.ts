/**
 * DATA LAYER for Chestlist (Supabase Auth + Postgres)
 * All monetary amounts are stored as integer centavos.
 * Formatted only in the UI using formatCentavos / formatPHP.
 */

import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  AccountTransaction,
  AccountType,
  AccountWallet,
  CategoryConfig,
  CategoryName,
  ChecklistItem,
  ChecklistCategory,
  ChecklistStatus,
  ChecklistProgressInfo,
  ContainerSkin,
  DebtItem,
  DebtPayment,
  DebtReminder,
  DebtStatus,
  DebtType,
  DiaryDetectedLanguage,
  DiaryEntry,
  DiaryMood,
  DiaryMoodSource,
  DiarySticker,
  Expense,
  ExpenseCategorizationResult,
  ExpenseCategory,
  ExpenseSubcategory,
  FinancialHealthOverview,
  GoalDeposit,
  LearnedCategoryRule,
  LifeNote,
  NotesPinState,
  ParsedMessageResult,
  SavingsGoal,
  AttachedSong,
  CatalogSong,
  SongEnergy,
  SongFeedbackRecord,
  SongLanguage,
  UserProfile,
  AuthSession,
  SignUpInput,
  SignUpResult,
  LoginInput,
  SpendingStyle,
  ThemeName,
  TransactionSource,
} from './types';

export const CATEGORY_PRIVACY_TEXT =
  'Your expense description is sent to our AI service only to suggest a category.';

export const CATEGORY_PASTEL_SWATCHES = [
  '#F4B6A6',
  '#F7C99B',
  '#D7E8BA',
  '#A9CDE8',
  '#BFE3E0',
  '#E7D8C9',
  '#B8DDB5',
  '#FAD2E1',
  '#F0A9C0',
  '#C9B8EA',
  '#F2D48F',
  '#E8C5DF',
  '#D3D3D8',
];

interface DefaultCategorySeed {
  id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  subcategories: Array<{ id: string; key: string; label: string }>;
}

const DEFAULT_CATEGORY_SEEDS: DefaultCategorySeed[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    key: 'food',
    label: 'Food',
    icon: '🍽️',
    color: '#F4B6A6',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010101', key: 'breakfast', label: 'Breakfast' },
      { id: '00000000-0000-4000-8000-000000010102', key: 'lunch', label: 'Lunch' },
      { id: '00000000-0000-4000-8000-000000010103', key: 'dinner', label: 'Dinner' },
      { id: '00000000-0000-4000-8000-000000010104', key: 'merienda', label: 'Merienda' },
      { id: '00000000-0000-4000-8000-000000010105', key: 'eating_out', label: 'Eating out' },
      { id: '00000000-0000-4000-8000-000000010106', key: 'beverages', label: 'Beverages' },
      { id: '00000000-0000-4000-8000-000000010107', key: 'cravings', label: 'Cravings' },
      { id: '00000000-0000-4000-8000-000000010108', key: 'groceries', label: 'Groceries' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    key: 'social_life',
    label: 'Social Life',
    icon: '🎉',
    color: '#F7C99B',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010201', key: 'friends', label: 'Friends' },
      { id: '00000000-0000-4000-8000-000000010202', key: 'family', label: 'Family' },
      { id: '00000000-0000-4000-8000-000000010203', key: 'org_fellowship', label: 'Org / Fellowship' },
      { id: '00000000-0000-4000-8000-000000010204', key: 'dates', label: 'Dates' },
      { id: '00000000-0000-4000-8000-000000010205', key: 'treats', label: 'Treats (libre)' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    key: 'pets',
    label: 'Pets',
    icon: '🐾',
    color: '#D7E8BA',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010301', key: 'pet_food', label: 'Pet food' },
      { id: '00000000-0000-4000-8000-000000010302', key: 'vet', label: 'Vet' },
      { id: '00000000-0000-4000-8000-000000010303', key: 'grooming', label: 'Grooming' },
      { id: '00000000-0000-4000-8000-000000010304', key: 'supplies', label: 'Supplies' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    key: 'transport',
    label: 'Transport',
    icon: '🚌',
    color: '#A9CDE8',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010401', key: 'jeep', label: 'Jeep' },
      { id: '00000000-0000-4000-8000-000000010402', key: 'bus', label: 'Bus' },
      { id: '00000000-0000-4000-8000-000000010403', key: 'tricycle', label: 'Tricycle' },
      { id: '00000000-0000-4000-8000-000000010404', key: 'mrt_lrt', label: 'MRT / LRT' },
      { id: '00000000-0000-4000-8000-000000010405', key: 'grab_taxi', label: 'Grab / Taxi' },
      { id: '00000000-0000-4000-8000-000000010406', key: 'motor_taxi', label: 'Motor taxi' },
      { id: '00000000-0000-4000-8000-000000010407', key: 'e_trike', label: 'E-trike' },
      { id: '00000000-0000-4000-8000-000000010408', key: 'gas', label: 'Gas' },
      { id: '00000000-0000-4000-8000-000000010409', key: 'parking', label: 'Parking' },
      { id: '00000000-0000-4000-8000-000000010410', key: 'beep_card', label: 'Beep card' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    key: 'culture',
    label: 'Culture',
    icon: '🎬',
    color: '#BFE3E0',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010501', key: 'movies', label: 'Movies' },
      { id: '00000000-0000-4000-8000-000000010502', key: 'music', label: 'Music' },
      { id: '00000000-0000-4000-8000-000000010503', key: 'books', label: 'Books' },
      { id: '00000000-0000-4000-8000-000000010504', key: 'games', label: 'Games' },
      { id: '00000000-0000-4000-8000-000000010505', key: 'apps_subscriptions', label: 'Apps & subscriptions' },
      { id: '00000000-0000-4000-8000-000000010506', key: 'events', label: 'Events' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    key: 'household',
    label: 'Household',
    icon: '🏠',
    color: '#E7D8C9',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010601', key: 'appliances', label: 'Appliances' },
      { id: '00000000-0000-4000-8000-000000010602', key: 'furniture', label: 'Furniture' },
      { id: '00000000-0000-4000-8000-000000010603', key: 'kitchen', label: 'Kitchen' },
      { id: '00000000-0000-4000-8000-000000010604', key: 'toiletries', label: 'Toiletries' },
      { id: '00000000-0000-4000-8000-000000010605', key: 'laundry', label: 'Laundry' },
      { id: '00000000-0000-4000-8000-000000010606', key: 'dues', label: 'Dues' },
      { id: '00000000-0000-4000-8000-000000010607', key: 'repairs', label: 'Repairs' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000107',
    key: 'apparel',
    label: 'Apparel',
    icon: '👕',
    color: '#B8DDB5',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010701', key: 'clothing', label: 'Clothing' },
      { id: '00000000-0000-4000-8000-000000010702', key: 'shoes', label: 'Shoes' },
      { id: '00000000-0000-4000-8000-000000010703', key: 'accessories', label: 'Accessories' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000108',
    key: 'beauty',
    label: 'Beauty',
    icon: '✨',
    color: '#FAD2E1',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010801', key: 'cosmetics', label: 'Cosmetics' },
      { id: '00000000-0000-4000-8000-000000010802', key: 'skincare', label: 'Skincare' },
      { id: '00000000-0000-4000-8000-000000010803', key: 'salon', label: 'Salon' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000109',
    key: 'health',
    label: 'Health',
    icon: '💊',
    color: '#F0A9C0',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000010901', key: 'medicine', label: 'Medicine' },
      { id: '00000000-0000-4000-8000-000000010902', key: 'vitamins', label: 'Vitamins' },
      { id: '00000000-0000-4000-8000-000000010903', key: 'hygiene', label: 'Hygiene' },
      { id: '00000000-0000-4000-8000-000000010904', key: 'clinic_hospital', label: 'Clinic / Hospital' },
      { id: '00000000-0000-4000-8000-000000010905', key: 'dental', label: 'Dental' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000110',
    key: 'education',
    label: 'Education',
    icon: '📚',
    color: '#C9B8EA',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000011001', key: 'tuition', label: 'Tuition' },
      { id: '00000000-0000-4000-8000-000000011002', key: 'school_supplies', label: 'School supplies' },
      { id: '00000000-0000-4000-8000-000000011003', key: 'printing', label: 'Printing' },
      { id: '00000000-0000-4000-8000-000000011004', key: 'textbooks', label: 'Textbooks' },
      { id: '00000000-0000-4000-8000-000000011005', key: 'projects', label: 'Projects' },
      { id: '00000000-0000-4000-8000-000000011006', key: 'thesis', label: 'Thesis' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000111',
    key: 'bills',
    label: 'Bills',
    icon: '💡',
    color: '#F2D48F',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000011101', key: 'load', label: 'Load' },
      { id: '00000000-0000-4000-8000-000000011102', key: 'internet', label: 'Internet' },
      { id: '00000000-0000-4000-8000-000000011103', key: 'electricity', label: 'Electricity' },
      { id: '00000000-0000-4000-8000-000000011104', key: 'water', label: 'Water' },
      { id: '00000000-0000-4000-8000-000000011105', key: 'rent', label: 'Rent' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000112',
    key: 'gift',
    label: 'Gift',
    icon: '🎁',
    color: '#E8C5DF',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000011201', key: 'birthday', label: 'Birthday' },
      { id: '00000000-0000-4000-8000-000000011202', key: 'holiday', label: 'Holiday' },
      { id: '00000000-0000-4000-8000-000000011203', key: 'other_gifts', label: 'Other gifts' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000113',
    key: 'others',
    label: 'Others',
    icon: '📦',
    color: '#D3D3D8',
    subcategories: [],
  },
];

export function buildDefaultCategories(): ExpenseCategory[] {
  return DEFAULT_CATEGORY_SEEDS.map((seed, idx) => ({
    id: seed.id,
    userId: null,
    key: seed.key,
    label: seed.label,
    icon: seed.icon,
    color: seed.color,
    textColor: '#3A2E33',
    sortOrder: idx,
    isArchived: false,
    subcategories: seed.subcategories.map((sub, subIdx) => ({
      id: sub.id,
      categoryId: seed.id,
      userId: null,
      key: sub.key,
      label: sub.label,
      sortOrder: subIdx,
      isArchived: false,
    })),
  }));
}

export const DEFAULT_CATEGORIES = buildDefaultCategories();

// Legacy & default palette fallback map with dark #3A2E33 text
export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  Food: { id: DEFAULT_CATEGORY_SEEDS[0].id, key: 'food', name: 'Food', icon: '🍽️', color: '#F4B6A6', textColor: '#3A2E33', limitCentavos: 120000 },
  'Social Life': { id: DEFAULT_CATEGORY_SEEDS[1].id, key: 'social_life', name: 'Social Life', icon: '🎉', color: '#F7C99B', textColor: '#3A2E33', limitCentavos: 0 },
  Pets: { id: DEFAULT_CATEGORY_SEEDS[2].id, key: 'pets', name: 'Pets', icon: '🐾', color: '#D7E8BA', textColor: '#3A2E33', limitCentavos: 0 },
  Transport: { id: DEFAULT_CATEGORY_SEEDS[3].id, key: 'transport', name: 'Transport', icon: '🚌', color: '#A9CDE8', textColor: '#3A2E33', limitCentavos: 60000 },
  Culture: { id: DEFAULT_CATEGORY_SEEDS[4].id, key: 'culture', name: 'Culture', icon: '🎬', color: '#BFE3E0', textColor: '#3A2E33', limitCentavos: 30000 },
  Household: { id: DEFAULT_CATEGORY_SEEDS[5].id, key: 'household', name: 'Household', icon: '🏠', color: '#E7D8C9', textColor: '#3A2E33', limitCentavos: 0 },
  Apparel: { id: DEFAULT_CATEGORY_SEEDS[6].id, key: 'apparel', name: 'Apparel', icon: '👕', color: '#B8DDB5', textColor: '#3A2E33', limitCentavos: 40000 },
  Beauty: { id: DEFAULT_CATEGORY_SEEDS[7].id, key: 'beauty', name: 'Beauty', icon: '✨', color: '#FAD2E1', textColor: '#3A2E33', limitCentavos: 0 },
  Health: { id: DEFAULT_CATEGORY_SEEDS[8].id, key: 'health', name: 'Health', icon: '💊', color: '#F0A9C0', textColor: '#3A2E33', limitCentavos: 50000 },
  Education: { id: DEFAULT_CATEGORY_SEEDS[9].id, key: 'education', name: 'Education', icon: '📚', color: '#C9B8EA', textColor: '#3A2E33', limitCentavos: 50000 },
  Bills: { id: DEFAULT_CATEGORY_SEEDS[10].id, key: 'bills', name: 'Bills', icon: '💡', color: '#F2D48F', textColor: '#3A2E33', limitCentavos: 50000 },
  Gift: { id: DEFAULT_CATEGORY_SEEDS[11].id, key: 'gift', name: 'Gift', icon: '🎁', color: '#E8C5DF', textColor: '#3A2E33', limitCentavos: 0 },
  Others: { id: DEFAULT_CATEGORY_SEEDS[12].id, key: 'others', name: 'Others', icon: '📦', color: '#D3D3D8', textColor: '#3A2E33', limitCentavos: 50000 },
  // Legacy aliases
  School: { id: DEFAULT_CATEGORY_SEEDS[9].id, key: 'education', name: 'Education', icon: '📚', color: '#C9B8EA', textColor: '#3A2E33', limitCentavos: 50000 },
  Shopping: { id: DEFAULT_CATEGORY_SEEDS[6].id, key: 'apparel', name: 'Apparel', icon: '👕', color: '#B8DDB5', textColor: '#3A2E33', limitCentavos: 40000 },
  Entertainment: { id: DEFAULT_CATEGORY_SEEDS[4].id, key: 'culture', name: 'Culture', icon: '🎬', color: '#BFE3E0', textColor: '#3A2E33', limitCentavos: 30000 },
};

export const GENERIC_USER_ERROR = 'Something went wrong. Please try again.';

export class UserSafeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserSafeError';
  }
}

export class InsufficientFundsError extends UserSafeError {
  code = 'insufficient_funds' as const;
  status = 409;
  details: { available: number; required: number };

  constructor(available: number, required: number, message = 'Not enough balance') {
    super(message);
    this.name = 'InsufficientFundsError';
    this.details = {
      available: Math.round(available),
      required: Math.round(required),
    };
  }
}

export function getUserSafeErrorMessage(err: unknown): string {
  if (err instanceof UserSafeError && err.message) {
    return err.message;
  }
  return GENERIC_USER_ERROR;
}

function logSupabaseError(context: string, err: unknown) {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    console.error(`[Chestlist][${context}]`, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      error: err,
    });
  } else {
    console.error(`[Chestlist][${context}]`, err);
  }
}

function throwUserSafeError(context: string, err: unknown): never {
  logSupabaseError(context, err);
  throw new UserSafeError(GENERIC_USER_ERROR);
}

// ======================== DB <-> UI VALUE MAPPINGS ========================

// 1. accounts.type
export type DbAccountType = 'bank' | 'ewallet' | 'digital_bank' | 'cash_stash';

export const ACCOUNT_TYPE_TO_DB: Record<AccountType, DbAccountType> = {
  Bank: 'bank',
  'E-wallet': 'ewallet',
  'Digital bank': 'digital_bank',
  'Cash stash': 'cash_stash',
};

export const DB_TO_ACCOUNT_TYPE: Record<DbAccountType, AccountType> = {
  bank: 'Bank',
  ewallet: 'E-wallet',
  digital_bank: 'Digital bank',
  cash_stash: 'Cash stash',
};

export const ACCOUNT_TYPE_OPTIONS: Array<{
  value: AccountType;
  label: string;
  dbValue: DbAccountType;
}> = [
  { value: 'Bank', label: 'Bank', dbValue: 'bank' },
  { value: 'E-wallet', label: 'E-wallet', dbValue: 'ewallet' },
  { value: 'Digital bank', label: 'Digital bank', dbValue: 'digital_bank' },
  { value: 'Cash stash', label: 'Cash stash', dbValue: 'cash_stash' },
];

export function accountTypeToDb(type: string | null | undefined): DbAccountType {
  const normalized = (type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'bank':
      return 'bank';
    case 'ewallet':
    case 'e_wallet':
      return 'ewallet';
    case 'digital_bank':
      return 'digital_bank';
    case 'cash_stash':
    case 'cash':
      return 'cash_stash';
    default:
      return 'bank';
  }
}

export function fromDbAccountType(dbType: string | null | undefined): AccountType {
  return DB_TO_ACCOUNT_TYPE[accountTypeToDb(dbType)];
}

// 2. transactions.type
export type DbTransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'savings_deposit'
  | 'debt_payment'
  | 'adjustment';

export const TRANSACTION_TYPE_TO_DB: Record<AccountTransaction['type'], DbTransactionType> = {
  expense: 'expense',
  income: 'income',
  transfer_in: 'transfer',
  transfer_out: 'transfer',
  savings_deposit: 'savings_deposit',
  debt_payment: 'debt_payment',
  adjustment: 'adjustment',
};

export const TRANSACTION_TYPE_LABELS: Record<AccountTransaction['type'] | 'transfer', string> = {
  expense: 'Expense',
  savings_deposit: 'Savings deposit',
  debt_payment: 'Debt payment',
  adjustment: 'Balance adjustment',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  transfer: 'Transfer',
  income: 'Deposit / Income',
};

export function transactionTypeToDb(type: string | null | undefined): DbTransactionType {
  const normalized = (type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'expense':
      return 'expense';
    case 'income':
      return 'income';
    case 'transfer':
    case 'transfer_in':
    case 'transfer_out':
      return 'transfer';
    case 'savings_deposit':
      return 'savings_deposit';
    case 'debt_payment':
      return 'debt_payment';
    case 'adjustment':
    default:
      return 'adjustment';
  }
}

export function fromDbTransactionType(
  dbType: string | null | undefined,
  direction?: AccountTransaction['direction'] | string | null,
  description?: string | null
): AccountTransaction['type'] {
  const normalized = (dbType || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'expense':
      return 'expense';
    case 'income':
      return 'income';
    case 'savings_deposit':
      return 'savings_deposit';
    case 'debt_payment':
      return 'debt_payment';
    case 'transfer_in':
      return 'transfer_in';
    case 'transfer_out':
      return 'transfer_out';
    case 'transfer': {
      const dir = (direction || '').trim().toLowerCase();
      if (dir === 'out' || dir === 'outflow') return 'transfer_out';
      if (dir === 'in' || dir === 'inflow') return 'transfer_in';
      return /^transfer to\b/i.test((description || '').trim())
        ? 'transfer_out'
        : 'transfer_in';
    }
    case 'adjustment':
    default:
      return 'adjustment';
  }
}

export function formatTransactionTypeLabel(type: string | null | undefined): string {
  const normalized = (type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized in TRANSACTION_TYPE_LABELS) {
    return TRANSACTION_TYPE_LABELS[normalized as keyof typeof TRANSACTION_TYPE_LABELS];
  }
  return 'Transaction';
}

// 2b. transactions.direction ('in' | 'out' for adjustments; null/omitted for non-adjustments)
export type DbTransactionDirection = 'in' | 'out';

export const TRANSACTION_DIRECTION_TO_DB: Record<
  AccountTransaction['direction'],
  DbTransactionDirection
> = {
  inflow: 'in',
  outflow: 'out',
};

export const DB_TO_TRANSACTION_DIRECTION: Record<
  DbTransactionDirection,
  AccountTransaction['direction']
> = {
  in: 'inflow',
  out: 'outflow',
};

export function transactionDirectionToDb(
  direction: string | null | undefined
): DbTransactionDirection {
  const normalized = (direction || '').trim().toLowerCase();
  if (normalized === 'in' || normalized === 'inflow') {
    return 'in';
  }
  return 'out';
}

export function fromDbTransactionDirection(
  dbDirection: string | null | undefined,
  dbType?: string | null,
  description?: string | null
): AccountTransaction['direction'] {
  const normalized = (dbDirection || '').trim().toLowerCase();
  if (normalized === 'in' || normalized === 'inflow') return 'inflow';
  if (normalized === 'out' || normalized === 'outflow') return 'outflow';

  const normalizedType = (dbType || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalizedType === 'income' || normalizedType === 'transfer_in') {
    return 'inflow';
  }
  if (normalizedType === 'transfer') {
    return /^transfer to\b/i.test((description || '').trim()) ? 'outflow' : 'inflow';
  }
  return 'outflow';
}

// 3. transactions.category (dynamic + legacy compatibility)
export type DbTransactionCategory = string;

const LEGACY_CATEGORY_KEY_MAP: Record<string, string> = {
  school: 'education',
  shopping: 'apparel',
  entertainment: 'culture',
};

function getAllCategoriesPool(): ExpenseCategory[] {
  return state?.categories && state.categories.length > 0
    ? state.categories
    : DEFAULT_CATEGORIES;
}

export function resolveExpenseCategory(
  value?: string | null,
  categoryId?: string | null
): ExpenseCategory {
  const pool = getAllCategoriesPool();
  if (categoryId) {
    const byId = pool.find((c) => c.id === categoryId);
    if (byId) return byId;
  }
  const normalized = (value || '').trim().toLowerCase();
  if (normalized) {
    const direct =
      pool.find((c) => c.id.toLowerCase() === normalized) ||
      pool.find((c) => c.key.toLowerCase() === normalized) ||
      pool.find((c) => c.label.toLowerCase() === normalized);
    if (direct) return direct;

    const mappedLegacyKey = LEGACY_CATEGORY_KEY_MAP[normalized];
    if (mappedLegacyKey) {
      const legacyMatch = pool.find((c) => c.key.toLowerCase() === mappedLegacyKey);
      if (legacyMatch) return legacyMatch;
    }
  }
  return (
    pool.find((c) => c.key === 'others') ||
    pool[pool.length - 1] ||
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}

export function resolveExpenseSubcategory(
  category: ExpenseCategory,
  subValue?: string | null,
  subcategoryId?: string | null
): ExpenseSubcategory | null {
  if (!category || !category.subcategories || category.subcategories.length === 0) {
    return null;
  }
  if (subcategoryId) {
    const byId = category.subcategories.find((s) => s.id === subcategoryId);
    if (byId) return byId;
  }
  const normalized = (subValue || '').trim().toLowerCase();
  if (normalized) {
    const match =
      category.subcategories.find((s) => s.id.toLowerCase() === normalized) ||
      category.subcategories.find((s) => s.key.toLowerCase() === normalized) ||
      category.subcategories.find((s) => s.label.toLowerCase() === normalized);
    if (match) return match;
  }
  return null;
}

export function transactionCategoryToDb(category: string | null | undefined): DbTransactionCategory {
  const resolved = resolveExpenseCategory(category);
  return resolved.key || 'others';
}

export function fromDbTransactionCategory(dbCategory: string | null | undefined): CategoryName {
  return resolveExpenseCategory(dbCategory).label;
}

// 4. transactions.source
export type DbTransactionSource = 'manual' | 'sms_paste' | 'csv' | 'system';

export const TRANSACTION_SOURCE_TO_DB: Record<TransactionSource, DbTransactionSource> = {
  Manual: 'manual',
  'Paste import': 'sms_paste',
  CSV: 'csv',
  System: 'system',
};

export const DB_TO_TRANSACTION_SOURCE: Record<DbTransactionSource, TransactionSource> = {
  manual: 'Manual',
  sms_paste: 'Paste import',
  csv: 'CSV',
  system: 'System',
};

export function transactionSourceToDb(source: string | null | undefined): DbTransactionSource {
  const normalized = (source || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'sms_paste' || normalized === 'paste_import') return 'sms_paste';
  if (normalized === 'csv') return 'csv';
  if (normalized === 'system') return 'system';
  return 'manual';
}

export function fromDbTransactionSource(dbSource: string | null | undefined): TransactionSource {
  return DB_TO_TRANSACTION_SOURCE[transactionSourceToDb(dbSource)];
}

// 5. profiles.theme
export type DbThemeName = 'blush' | 'sage' | 'sky' | 'lavender';

export const THEME_TO_DB: Record<ThemeName, DbThemeName> = {
  blush: 'blush',
  sage: 'sage',
  sky: 'sky',
  lavender: 'lavender',
};

export const THEME_LABELS: Record<ThemeName, string> = {
  blush: 'Blush Rose',
  sage: 'Sage Garden',
  sky: 'Sky Breeze',
  lavender: 'Lavender Fog',
};

export function themeToDb(theme: string | null | undefined): DbThemeName {
  const normalized = (theme || '').trim().toLowerCase();
  if (normalized === 'sage' || normalized === 'sage garden') return 'sage';
  if (normalized === 'sky' || normalized === 'sky breeze') return 'sky';
  if (normalized === 'lavender' || normalized === 'lavender fog') return 'lavender';
  return 'blush';
}

export function fromDbTheme(dbTheme: string | null | undefined): ThemeName {
  return themeToDb(dbTheme);
}

// 6. profiles.song_language
export type DbSongLanguage = 'opm' | 'western' | 'mixed';

export const SONG_LANGUAGE_TO_DB: Record<SongLanguage, DbSongLanguage> = {
  OPM: 'opm',
  Western: 'western',
  Mixed: 'mixed',
};

export const DB_TO_SONG_LANGUAGE: Record<DbSongLanguage, SongLanguage> = {
  opm: 'OPM',
  western: 'Western',
  mixed: 'Mixed',
};

export const SONG_LANGUAGE_OPTIONS: Array<{
  value: SongLanguage;
  label: string;
  dbValue: DbSongLanguage;
}> = [
  { value: 'OPM', label: 'OPM', dbValue: 'opm' },
  { value: 'Western', label: 'Western', dbValue: 'western' },
  { value: 'Mixed', label: 'Mixed', dbValue: 'mixed' },
];

export function songLanguageToDb(lang: string | null | undefined): DbSongLanguage {
  const normalized = (lang || '').trim().toLowerCase();
  if (normalized === 'opm') return 'opm';
  if (normalized === 'western') return 'western';
  return 'mixed';
}

export function fromDbSongLanguage(dbLang: string | null | undefined): SongLanguage {
  return DB_TO_SONG_LANGUAGE[songLanguageToDb(dbLang)];
}

const INITIAL_BUDGET_CENTAVOS = 500000; // ₱5,000

const DEFAULT_SAMPLE_LIMITS: Record<string, number> = {
  food: 120000,
  transport: 60000,
  education: 50000,
  bills: 50000,
  beauty: 50000,
  health: 50000,
  culture: 30000,
};

const ZERO_LIMITS: Record<string, number> = {};

/**
 * Shared Asia/Manila (UTC+8) Timezone helpers
 */
export function getManilaDateString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

export function getToday(): Date {
  const dateStr = getManilaDateString();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function formatManilaDateOffset(offsetDays: number = 0): string {
  const d = getToday();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface WeekRangeInfo {
  startMondayDate: string; // YYYY-MM-DD
  endSundayDate: string; // YYYY-MM-DD
  label: string; // "Mon Nov 9 – Sun Nov 15, 2026"
  days: Array<{
    dateStr: string;
    dayLabel: string;
    dayNumber: number;
    shortLabel: string;
    formatted: string;
  }>;
}

export function getCurrentWeekRange(): WeekRangeInfo {
  const today = getToday();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const label = `Mon ${months[monday.getMonth()]} ${monday.getDate()} – Sun ${months[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;

  const days: WeekRangeInfo['days'] = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      dateStr: toIso(cur),
      dayLabel: dayLabels[i],
      dayNumber: cur.getDate(),
      shortLabel: `${dayLabels[i]} ${cur.getDate()}`,
      formatted: `${dayLabels[i]} ${months[cur.getMonth()]} ${cur.getDate()}`,
    });
  }

  return {
    startMondayDate: toIso(monday),
    endSundayDate: toIso(sunday),
    label,
    days,
  };
}

export interface RawAccount {
  id: string;
  name: string;
  nickname?: string;
  type: AccountType;
  openingBalanceCentavos: number;
  last4?: string;
  lastConfirmedDate: string;
  color: string;
  textColor?: string;
  icon?: string;
  isArchived?: boolean;
  sortOrder?: number;
  transactions: AccountTransaction[];
}

interface RawSavingsGoal {
  id: string;
  title: string;
  targetCentavos: number;
  startDate: string;
  deadline: string;
  backingAccount: string;
  containerSkin: ContainerSkin;
  deposits: GoalDeposit[];
  isCompleted?: boolean;
  note?: string;
  emoji?: string;
  createdAt?: number;
}

export interface RawDebtItem {
  id: string;
  title: string;
  creditor?: string;
  type: DebtType;
  totalCentavos: number;
  dueDate: string;
  dueTime?: string;
  remindersEnabled: boolean;
  notes?: string;
  payments: DebtPayment[];
  isArchived?: boolean;
  wasCompleted?: boolean;
  createdAt?: number;
}

export function hashPin(pin: string): string {
  let hash = 0x811c9dc5;
  const str = `chestlist_salt_${pin.trim()}_secure`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const DEFAULT_UNCONFIGURED_PIN: NotesPinState = {
  pinHash: '',
  isConfigured: false,
  failedAttempts: 0,
  lockedUntil: 0,
  lockoutDurationLevel: 0,
};

export const MOCK_SONG_CATALOG: CatalogSong[] = [
  {
    id: 'song-1',
    title: 'Balcony Breeze',
    artist: 'Tala & The Clouds',
    album: 'Sunspots Over Diliman',
    durationMs: 194000,
    energy: 'low',
    moods: ['Calm', 'Grateful'],
    language: 'OPM',
    whyItFits: 'Gentle acoustic plucks for tranquil balcony mornings',
    coverColor: '#E6D7C3',
  },
  {
    id: 'song-2',
    title: 'Rain on Katipunan',
    artist: 'Mayari Sound',
    album: 'Late Jeepney Chronicles',
    durationMs: 228000,
    energy: 'low',
    moods: ['Tired', 'Sad', 'Calm', 'Yearning'],
    language: 'OPM',
    whyItFits: 'Mellow lo-fi piano matching rain-slicked afternoon commutes',
    coverColor: '#C8D5E5',
  },
  {
    id: 'song-3',
    title: 'Pastel Horizon',
    artist: 'Sinta Project',
    album: 'Island Dreams',
    durationMs: 182000,
    energy: 'high',
    moods: ['Excited', 'Happy'],
    language: 'OPM',
    whyItFits: 'Sunny indie-pop rhythm for celebrated achievements',
    coverColor: '#FAD2B8',
  },
  {
    id: 'song-4',
    title: 'Taho in the Morning',
    artist: 'Bamboo & String',
    album: 'Morning Bells',
    durationMs: 165000,
    energy: 'low',
    moods: ['Calm', 'Happy', 'Grateful'],
    language: 'OPM',
    whyItFits: 'Cozy fingerpicked ukulele for fresh beginnings',
    coverColor: '#F7E4BE',
  },
  {
    id: 'song-5',
    title: 'Thesis Blues & Milk Tea',
    artist: 'The Night Owls PH',
    album: 'Midterm Solitude',
    durationMs: 215000,
    energy: 'medium',
    moods: ['Anxious', 'Tired'],
    language: 'OPM',
    whyItFits: 'Slow reassuring guitar ballad for winding down study stress',
    coverColor: '#DFD8EB',
  },
  {
    id: 'song-6',
    title: 'Bangka to Elyu',
    artist: 'Harana Collective',
    album: 'Northbound Road',
    durationMs: 240000,
    energy: 'high',
    moods: ['Inspired', 'Excited'],
    language: 'OPM',
    whyItFits: 'Upbeat coastal strums and uplifting harmonies',
    coverColor: '#BEE7D8',
  },
  {
    id: 'song-7',
    title: 'Midnight Sari-Sari',
    artist: 'Kalye Lullaby',
    album: 'Corner Stories',
    durationMs: 205000,
    energy: 'low',
    moods: ['Tired', 'Calm', 'Yearning'],
    language: 'OPM',
    whyItFits: 'Quiet ambient electric guitar for resting after a long day',
    coverColor: '#DDD4CB',
  },
  {
    id: 'song-8',
    title: 'Pag-Asa Avenue',
    artist: 'Cielo Luna',
    album: 'City Glow',
    durationMs: 198000,
    energy: 'medium',
    moods: ['Inspired', 'Grateful'],
    language: 'OPM',
    whyItFits: 'Hopeful warm indie-folk for finding clarity in decisions',
    coverColor: '#E8D2E0',
  },
  {
    id: 'song-9',
    title: 'Traffic Light Confessions',
    artist: 'Cubao Sessions',
    album: 'Yellow Cab Notes',
    durationMs: 210000,
    energy: 'medium',
    moods: ['Frustrated', 'Sad', 'Yearning'],
    language: 'OPM',
    whyItFits: 'Soulful brass and mellow chords for venting commuter fatigue',
    coverColor: '#F1CCD0',
  },
  {
    id: 'song-10',
    title: 'Sampaguita Smiles',
    artist: 'Maria Clara Beat',
    album: 'Pueblo Sun',
    durationMs: 172000,
    energy: 'high',
    moods: ['Happy', 'Excited'],
    language: 'OPM',
    whyItFits: 'Playful cheerful synth-pop for sharing good news',
    coverColor: '#FCEBC5',
  },
  {
    id: 'song-11',
    title: 'Quiet Jeepney Ride',
    artist: 'Dan & Isla',
    album: 'Pasay Sunset',
    durationMs: 220000,
    energy: 'low',
    moods: ['Calm', 'Tired', 'Yearning'],
    language: 'OPM',
    whyItFits: 'Subtle brushed snare and whispery acoustic chords',
    coverColor: '#CCD9D0',
  },
  {
    id: 'song-12',
    title: 'Piso Dreamer',
    artist: 'Alon & Luntian',
    album: 'Pocket Coins',
    durationMs: 190000,
    energy: 'medium',
    moods: ['Inspired', 'Grateful'],
    language: 'OPM',
    whyItFits: 'Uplifting rhythms for celebrating small savings milestones',
    coverColor: '#D2EAD6',
  },
  {
    id: 'song-13',
    title: 'Under the Mango Canopy',
    artist: 'Likha Quartet',
    album: 'Green Spaces',
    durationMs: 185000,
    energy: 'low',
    moods: ['Calm', 'Grateful'],
    language: 'OPM',
    whyItFits: 'Gentle classical guitar cadence for meditative moments',
    coverColor: '#E1E9D7',
  },
  {
    id: 'song-14',
    title: 'Paperback Skylines',
    artist: 'Amber & The Atlas',
    album: 'Pocket Notebook',
    durationMs: 214000,
    energy: 'low',
    moods: ['Calm', 'Inspired'],
    language: 'Western',
    whyItFits: 'Airy indie-folk fingerpicking for reading in libraries',
    coverColor: '#EAD9C9',
  },
  {
    id: 'song-15',
    title: 'Golden Hour Coffee',
    artist: 'The Velveteen Sun',
    album: 'Subtle Radiance',
    durationMs: 178000,
    energy: 'medium',
    moods: ['Happy', 'Calm'],
    language: 'Western',
    whyItFits: 'Warm analog keys and honeyed bassline for cozy cafes',
    coverColor: '#F7DEB4',
  },
  {
    id: 'song-16',
    title: 'Midnight Neon Rain',
    artist: 'Glass Harbor',
    album: 'Nightwalks',
    durationMs: 232000,
    energy: 'low',
    moods: ['Sad', 'Tired', 'Anxious', 'Yearning'],
    language: 'Western',
    whyItFits: 'Atmospheric synth pads that offer solace during late hours',
    coverColor: '#D0DAE9',
  },
  {
    id: 'song-17',
    title: 'Electric Confetti',
    artist: 'Starlight Arcade',
    album: 'Neon Saturdays',
    durationMs: 168000,
    energy: 'high',
    moods: ['Excited', 'Happy'],
    language: 'Western',
    whyItFits: 'Bubbly upbeat electro-pop for celebrating big wins',
    coverColor: '#FAD4E2',
  },
  {
    id: 'song-18',
    title: 'Breathe In, Breathe Out',
    artist: 'Quiet Meadow',
    album: 'Inner Garden',
    durationMs: 245000,
    energy: 'low',
    moods: ['Anxious', 'Calm'],
    language: 'Western',
    whyItFits: 'Minimalist soft piano for steadying heart rates and calming nerves',
    coverColor: '#D2E8E4',
  },
  {
    id: 'song-19',
    title: 'Stardust on the Floorboards',
    artist: 'Luna Finch',
    album: 'Attic Secrets',
    durationMs: 202000,
    energy: 'medium',
    moods: ['Inspired', 'Grateful', 'Yearning'],
    language: 'Western',
    whyItFits: 'Dreamy indie-acoustic melody for late-night journaling',
    coverColor: '#E4DBF0',
  },
  {
    id: 'song-20',
    title: 'Reset the Clock',
    artist: 'Northern Drift',
    album: 'Fresh Pages',
    durationMs: 195000,
    energy: 'high',
    moods: ['Inspired', 'Excited'],
    language: 'Western',
    whyItFits: 'Driving drum beat and bright electric guitar for fresh starts',
    coverColor: '#CCE0F5',
  },
  {
    id: 'song-21',
    title: 'Overcast Afternoon',
    artist: 'The Slow Season',
    album: 'Tea & Wool',
    durationMs: 226000,
    energy: 'low',
    moods: ['Tired', 'Sad', 'Yearning'],
    language: 'Western',
    whyItFits: 'Gentle melancholy cello and muted acoustic strums',
    coverColor: '#D7D6D8',
  },
  {
    id: 'song-22',
    title: 'Clear Skies Tomorrow',
    artist: 'Sunny Vale Collective',
    album: 'Daylight Hours',
    durationMs: 188000,
    energy: 'medium',
    moods: ['Happy', 'Grateful'],
    language: 'Western',
    whyItFits: 'Breezy optimism with melodic acoustic bass and chime bells',
    coverColor: '#FEF0CE',
  },
  {
    id: 'song-23',
    title: 'Deep Sigh of Relief',
    artist: 'Solace Strings',
    album: 'Peaceful Days',
    durationMs: 210000,
    energy: 'low',
    moods: ['Grateful', 'Calm'],
    language: 'Western',
    whyItFits: 'Tender harp and muted guitar for moments of quiet gratitude',
    coverColor: '#EBDCD8',
  },
  {
    id: 'song-24',
    title: 'Turn the Page',
    artist: 'Cedar & Pine',
    album: 'Timber Hollow',
    durationMs: 199000,
    energy: 'medium',
    moods: ['Inspired', 'Happy'],
    language: 'Western',
    whyItFits: 'Warm roots-folk for turning over a new chapter in life',
    coverColor: '#DFE8D1',
  },
  {
    id: 'song-25',
    title: 'Static & Sparks',
    artist: 'Rush Hour Echo',
    album: 'City Frequencies',
    durationMs: 184000,
    energy: 'medium',
    moods: ['Frustrated', 'Anxious'],
    language: 'Western',
    whyItFits: 'Edgy rhythmic percussion that helps channel restless energy',
    coverColor: '#F5D3D0',
  },
  {
    id: 'song-26',
    title: 'Sunday Sunbeam',
    artist: 'Bloom & Burrow',
    album: 'Kitchen Table',
    durationMs: 175000,
    energy: 'low',
    moods: ['Happy', 'Calm'],
    language: 'Western',
    whyItFits: 'Softly hummed lullaby with nylon guitar chords',
    coverColor: '#FBF0DD',
  },
];

// ======================== STATE CACHE & FALLBACK STORAGE ========================

interface ExpenseCategoryMetaRecord {
  categoryId: string;
  categoryLabel: string;
  subcategoryId: string | null;
  subcategoryLabel: string | null;
  categoryConfidence?: number | null;
  subcategoryConfidence?: number | null;
  categoryUserConfirmed?: boolean;
  merchant?: string | null;
  overdraftConfirmed?: boolean;
}

interface AppState {
  weeklyBudgetCentavos: number;
  expenses: Expense[];
  savingsGoals: RawSavingsGoal[];
  debts: RawDebtItem[];
  accounts: RawAccount[];
  checklist: ChecklistItem[];
  notes: LifeNote[];
  diaryEntries: DiaryEntry[];
  pinState: NotesPinState;
  categories: ExpenseCategory[];
  useSubcategories: boolean;
  learnedRules: LearnedCategoryRule[];
  categoryLimits: Record<string, number>;
  expenseCategoryMeta: Record<string, ExpenseCategoryMetaRecord>;
  recordedReferenceNumbers: string[];
  songLanguageSetting: SongLanguage;
  songFeedback: SongFeedbackRecord[];
}

function createEmptyState(): AppState {
  return {
    weeklyBudgetCentavos: 0,
    expenses: [],
    savingsGoals: [],
    debts: [],
    accounts: [],
    checklist: [],
    notes: [],
    diaryEntries: [],
    pinState: { ...DEFAULT_UNCONFIGURED_PIN },
    categories: buildDefaultCategories(),
    useSubcategories: true,
    learnedRules: [],
    categoryLimits: { ...ZERO_LIMITS },
    expenseCategoryMeta: {},
    recordedReferenceNumbers: [],
    songLanguageSetting: 'Mixed',
    songFeedback: [],
  };
}

let activeUserId: string | null = null;
let state: AppState = createEmptyState();
let dataLoadPromise: Promise<void> | null = null;

function fallbackStorageKey(userId: string): string {
  return `chestlist_fb_${userId}`;
}

function readFallbackData(userId: string): Partial<AppState> {
  try {
    const raw = localStorage.getItem(fallbackStorageKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

function stripDiaryAiFields(entries: DiaryEntry[]): DiaryEntry[] {
  return entries.map(
    ({
      detectedLanguage: _detectedLanguage,
      aiSummary: _aiSummary,
      aiEnergy: _aiEnergy,
      aiThemes: _aiThemes,
      analyzedHash: _analyzedHash,
      ...rest
    }) => rest
  );
}

function syncLedgerToServer(userId: string, accounts: RawAccount[]) {
  if (typeof fetch !== 'function') return;
  try {
    void fetch('/api/ledger/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        accounts: (accounts || []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          openingBalanceCentavos: Math.round(a.openingBalanceCentavos || 0),
          transactions: (a.transactions || []).map((t) => ({
            id: t.id,
            accountId: t.accountId,
            toAccountId: t.toAccountId,
            type: t.type,
            direction: t.direction,
            amountCentavos: Math.abs(Math.round(t.amountCentavos || 0)),
            description: t.description,
            date: t.date,
            overdraftConfirmed: Boolean(t.overdraftConfirmed),
            createdAt: t.createdAt,
          })),
        })),
      }),
    }).catch(() => {});
  } catch {
    // ignore background sync failures
  }
}

function writeFallbackData(userId: string) {
  try {
    const cleanDiaryEntries = stripDiaryAiFields(state.diaryEntries || []);
    const serializedState: AppState = {
      ...state,
      diaryEntries: cleanDiaryEntries,
      notes: cleanDiaryEntries,
    };
    localStorage.setItem(fallbackStorageKey(userId), JSON.stringify(serializedState));
  } catch {
    // ignore
  }
  syncLedgerToServer(userId, state.accounts || []);
}

function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('Could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

function isNetworkFetchError(err: any): boolean {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const msg = String(err.message || '').toLowerCase();
  const details = String(err.details || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    details.includes('failed to fetch') ||
    details.includes('networkerror')
  );
}

async function retryOnNetworkError<T extends { error: any }>(
  op: () => Promise<T>,
  retries = 1
): Promise<T> {
  try {
    let result = await op();
    for (let i = 0; i < retries && result?.error && isNetworkFetchError(result.error); i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      result = await op();
    }
    return result;
  } catch (err) {
    if (retries > 0 && isNetworkFetchError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return retryOnNetworkError(op, retries - 1);
    }
    return { data: null, error: err } as unknown as T;
  }
}

function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('Could not find the') ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

function isTimestampTypeError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '22007' ||
    code === '22008' ||
    msg.includes('date/time field value out of range') ||
    msg.includes('invalid input syntax for type timestamp')
  );
}

function withIsoTimestamps<T extends Record<string, any>>(
  payload: T,
  keys: Array<'created_at' | 'updated_at' | 'completed_at'> = [
    'created_at',
    'updated_at',
    'completed_at',
  ]
): T {
  const copy: Record<string, any> = { ...payload };
  for (const key of keys) {
    if (typeof copy[key] === 'number' && Number.isFinite(copy[key])) {
      copy[key] = new Date(copy[key]).toISOString();
    }
  }
  return copy as T;
}

async function requireUserId(): Promise<string> {
  if (activeUserId) return activeUserId;
  if (!isSupabaseConfigured) {
    const localUid = readLocalSessionUserId();
    if (localUid) {
      activeUserId = localUid;
      return localUid;
    }
    throw new UserSafeError('Please log in to continue.');
  }
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) {
    activeUserId = data.session.user.id;
    return activeUserId;
  }
  throw new UserSafeError('Please log in to continue.');
}

async function ensureStateLoaded(): Promise<string> {
  const userId = await requireUserId();
  if (dataLoadPromise) {
    await dataLoadPromise;
  }
  return userId;
}

function buildOccurredAtIso(dateStr: string, timeStr?: string): string {
  const safeDate = dateStr || getManilaDateString();
  const safeTime = timeStr && /^\d{2}:\d{2}/.test(timeStr) ? timeStr.slice(0, 5) : '12:00';
  return `${safeDate}T${safeTime}:00+08:00`;
}

function parseTimestampMs(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    const asNum = Number(val);
    if (Number.isFinite(asNum)) return asNum;
    const parsed = new Date(val).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function mapTransactionRow(row: any, fallbackTx?: AccountTransaction): AccountTransaction {
  const occurred = row.occurred_at || row.created_at;
  const dateStr = occurred ? getManilaDateString(occurred) : getManilaDateString();
  const createdMs = parseTimestampMs(row.created_at);
  const direction = fromDbTransactionDirection(
    row.direction ?? fallbackTx?.direction,
    row.type,
    row.description
  );
  const resolvedCat =
    row.category_id || row.category || fallbackTx?.categoryId || fallbackTx?.category
      ? resolveExpenseCategory(
          row.category ?? fallbackTx?.category,
          row.category_id ?? fallbackTx?.categoryId
        )
      : undefined;
  const resolvedSub =
    resolvedCat && (row.subcategory_id || fallbackTx?.subcategoryId)
      ? resolveExpenseSubcategory(resolvedCat, null, row.subcategory_id ?? fallbackTx?.subcategoryId)
      : null;

  return {
    id: row.id,
    accountId: row.account_id || '',
    toAccountId: row.to_account_id || undefined,
    type: fromDbTransactionType(row.type, direction, row.description),
    direction,
    amountCentavos: Number(row.amount_centavos || 0),
    description: row.description || '',
    note: row.notes || undefined,
    category: resolvedCat ? resolvedCat.label : undefined,
    categoryId: row.category_id || fallbackTx?.categoryId || resolvedCat?.id,
    subcategoryId: row.subcategory_id ?? fallbackTx?.subcategoryId ?? resolvedSub?.id ?? null,
    categoryConfidence:
      typeof row.category_confidence === 'number'
        ? row.category_confidence
        : fallbackTx?.categoryConfidence ?? null,
    subcategoryConfidence:
      typeof row.subcategory_confidence === 'number'
        ? row.subcategory_confidence
        : fallbackTx?.subcategoryConfidence ?? null,
    categoryUserConfirmed:
      typeof row.category_user_confirmed === 'boolean'
        ? row.category_user_confirmed
        : fallbackTx?.categoryUserConfirmed,
    merchant: row.merchant ?? fallbackTx?.merchant ?? null,
    source: row.source ? fromDbTransactionSource(row.source) : undefined,
    date: dateStr,
    referenceNumber: row.external_ref || undefined,
    overdraftConfirmed: Boolean(row.overdraft_confirmed ?? fallbackTx?.overdraftConfirmed),
    createdAt: createdMs,
  };
}

async function insertTransactionRow(
  userId: string,
  tx: AccountTransaction,
  throwOnError = false
): Promise<void> {
  const dbType = transactionTypeToDb(tx.type);
  const absAmount = Math.abs(Math.round(tx.amountCentavos || 0));

  // For adjustments, amount_centavos must be strictly positive (never zero or negative).
  if (dbType === 'adjustment' && absAmount <= 0) {
    return;
  }

  const resolvedCat =
    tx.category || tx.categoryId ? resolveExpenseCategory(tx.category, tx.categoryId) : null;

  const basePayload: Record<string, any> = {
    id: tx.id,
    user_id: userId,
    account_id: tx.accountId || null,
    type: dbType,
    amount_centavos: absAmount,
    description: tx.description,
    category: resolvedCat ? resolvedCat.key : null,
    external_ref: tx.referenceNumber || null,
    source: transactionSourceToDb(tx.source || 'Manual'),
    occurred_at: buildOccurredAtIso(tx.date, tx.time),
  };

  if (tx.toAccountId) {
    basePayload.to_account_id = tx.toAccountId;
  }

  if (tx.note !== undefined) {
    basePayload.notes = tx.note || null;
  }

  if (dbType === 'adjustment') {
    // Only adjustments send direction ('in' or 'out'); omit for all other types so DB stores NULL.
    basePayload.direction = transactionDirectionToDb(tx.direction);
  }

  const extendedPayload: Record<string, any> = {
    ...basePayload,
    ...(resolvedCat ? { category_id: resolvedCat.id } : {}),
    ...(tx.subcategoryId !== undefined ? { subcategory_id: tx.subcategoryId } : {}),
    ...(tx.categoryConfidence !== undefined ? { category_confidence: tx.categoryConfidence } : {}),
    ...(tx.subcategoryConfidence !== undefined
      ? { subcategory_confidence: tx.subcategoryConfidence }
      : {}),
    ...(tx.categoryUserConfirmed !== undefined
      ? { category_user_confirmed: tx.categoryUserConfirmed }
      : {}),
    ...(tx.merchant !== undefined ? { merchant: tx.merchant } : {}),
    ...(tx.overdraftConfirmed ? { overdraft_confirmed: true } : {}),
  };

  if (!isSupabaseConfigured) {
    return;
  }

  let { error } = await supabase.from('transactions').insert(extendedPayload);
  if (error && isMissingColumnError(error)) {
    ({ error } = await supabase.from('transactions').insert(basePayload));
  }
  if (error) {
    console.error('[Chestlist][insertTransactionRow]', error);
    if (throwOnError) {
      throw new UserSafeError(GENERIC_USER_ERROR);
    }
  }
}

async function insertAccountRow(
  userId: string,
  acc: RawAccount,
  sortOrder: number
): Promise<void> {
  const dbType = accountTypeToDb(acc.type);
  const confirmedAtIso = acc.lastConfirmedDate
    ? buildOccurredAtIso(acc.lastConfirmedDate)
    : new Date().toISOString();

  const fullPayload = {
    id: acc.id,
    user_id: userId,
    name: acc.name,
    nickname: acc.nickname || null,
    type: dbType,
    opening_balance_centavos: acc.openingBalanceCentavos,
    last4: acc.last4 || null,
    card_color: acc.color || '#EFECE6',
    is_archived: Boolean(acc.isArchived),
    sort_order: sortOrder,
    balance_confirmed_at: confirmedAtIso,
    last_confirmed_date: acc.lastConfirmedDate || getManilaDateString(),
    text_color: acc.textColor || null,
    icon: acc.icon || null,
  };

  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.from('accounts').insert(fullPayload);
  if (error && isMissingColumnError(error)) {
    const basePayload = {
      id: acc.id,
      user_id: userId,
      name: acc.name,
      nickname: acc.nickname || null,
      type: dbType,
      opening_balance_centavos: acc.openingBalanceCentavos,
      last4: acc.last4 || null,
      card_color: acc.color || '#EFECE6',
      is_archived: Boolean(acc.isArchived),
      sort_order: sortOrder,
      balance_confirmed_at: confirmedAtIso,
    };
    const { error: baseErr } = await supabase.from('accounts').insert(basePayload);
    if (baseErr && isMissingColumnError(baseErr)) {
      const { balance_confirmed_at: _omit, ...minimalPayload } = basePayload;
      const { error: minErr } = await supabase.from('accounts').insert(minimalPayload);
      if (minErr) {
        throwUserSafeError('insertAccountRow.minimal', minErr);
      }
    } else if (baseErr) {
      throwUserSafeError('insertAccountRow.base', baseErr);
    }
  } else if (error) {
    throwUserSafeError('insertAccountRow', error);
  }
}

async function updateProfileFields(
  userId: string,
  updates: Record<string, any>
): Promise<void> {
  writeFallbackData(userId);
  if (!isSupabaseConfigured) {
    return;
  }

  const sanitizedUpdates: Record<string, any> = { ...updates };
  if ('theme' in sanitizedUpdates) {
    sanitizedUpdates.theme = themeToDb(sanitizedUpdates.theme);
  }
  if ('song_language' in sanitizedUpdates) {
    sanitizedUpdates.song_language = songLanguageToDb(sanitizedUpdates.song_language);
  }

  const { error } = await retryOnNetworkError(async () =>
    await supabase.from('profiles').update(sanitizedUpdates).eq('id', userId)
  );
  if (error && isMissingColumnError(error)) {
    // Retry with only base columns that exist prior to schema.sql migration
    const baseAllowed = ['email', 'display_name', 'theme', 'spending_style', 'song_language', 'timezone'];
    const filtered: Record<string, any> = {};
    for (const k of baseAllowed) {
      if (k in sanitizedUpdates) filtered[k] = sanitizedUpdates[k];
    }
    if (Object.keys(filtered).length > 0) {
      const { error: baseErr } = await retryOnNetworkError(async () =>
        await supabase.from('profiles').update(filtered).eq('id', userId)
      );
      if (baseErr) {
        if (isNetworkFetchError(baseErr)) {
          console.warn('[Chestlist][updateProfileFields.base] Offline/network fallback used.');
        } else {
          console.error('[Chestlist][updateProfileFields.base]', baseErr);
        }
      }
    }
  } else if (error) {
    if (isNetworkFetchError(error)) {
      console.warn('[Chestlist][updateProfileFields] Offline/network fallback used.');
    } else {
      console.error('[Chestlist][updateProfileFields]', error);
    }
  }
  writeFallbackData(userId);
}

function mapSupabaseAuthUserToProfile(
  authUser: SupabaseUser,
  dbProfile?: any
): UserProfile {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    name: dbProfile?.display_name || meta.display_name || meta.full_name || authUser.email?.split('@')[0] || 'Chestlist User',
    email: dbProfile?.email || authUser.email || '',
    theme: fromDbTheme(dbProfile?.theme || meta.theme),
    spendingStyle: (dbProfile?.spending_style || meta.spending_style) as SpendingStyle | undefined,
    createdAt: dbProfile?.created_at
      ? new Date(dbProfile.created_at).getTime()
      : new Date(authUser.created_at).getTime(),
  };
}

const inFlightProvisioning = new Map<string, Promise<{ profile: UserProfile; dbRow: any }>>();

function provisioningPendingKey(userId: string): string {
  return `chestlist_prov_pending_${userId}`;
}

function isProvisioningPending(userId: string): boolean {
  try {
    return localStorage.getItem(provisioningPendingKey(userId)) === '1';
  } catch {
    return false;
  }
}

function setProvisioningPending(userId: string, pending: boolean) {
  try {
    if (pending) {
      localStorage.setItem(provisioningPendingKey(userId), '1');
    } else {
      localStorage.removeItem(provisioningPendingKey(userId));
    }
  } catch {
    // ignore storage access issues
  }
}

async function ensureUserInitialized(
  authUser: SupabaseUser
): Promise<{ profile: UserProfile; dbRow: any }> {
  const existingPromise = inFlightProvisioning.get(authUser.id);
  if (existingPromise) {
    return existingPromise;
  }

  if (!isSupabaseConfigured) {
    return {
      profile: mapSupabaseAuthUserToProfile(authUser, null),
      dbRow: null,
    };
  }

  const runPromise = (async (): Promise<{ profile: UserProfile; dbRow: any }> => {
    const meta = authUser.user_metadata || {};
    let dbRow: any = null;

    try {
      // 1. Check / idempotently ensure profile row exists
      const { data: existingProfile, error: selErr } = await retryOnNetworkError(async () =>
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
      );

      if (selErr) {
        if (isNetworkFetchError(selErr)) {
          console.warn('[Chestlist][ensureUserInitialized.selectProfile] Offline/network fallback used.');
          setProvisioningPending(authUser.id, true);
          return {
            profile: mapSupabaseAuthUserToProfile(authUser, null),
            dbRow: null,
          };
        }
        console.error('[Chestlist][ensureUserInitialized.selectProfile]', selErr);
      }

      dbRow = existingProfile || null;

      if (!existingProfile && !selErr) {
        setProvisioningPending(authUser.id, true);
        const displayName =
          meta.display_name || meta.full_name || authUser.email?.split('@')[0] || 'Chestlist User';
        const theme = themeToDb(meta.theme);
        const spendingStyle = (meta.spending_style as SpendingStyle) || 'I plan ahead';

        const fullProfileInsert = {
          id: authUser.id,
          email: authUser.email || '',
          display_name: displayName,
          theme,
          spending_style: spendingStyle,
          song_language: songLanguageToDb('Mixed'),
          timezone: 'Asia/Manila',
          weekly_budget_centavos: 0,
          category_limits: ZERO_LIMITS,
          notes_pin_hash: meta.notes_pin_hash || '',
          notes_pin_configured: Boolean(meta.notes_pin_configured),
          notes_pin_failed_attempts: 0,
          notes_pin_locked_until: 0,
          notes_pin_lockout_level: 0,
          song_feedback: [],
          recorded_reference_numbers: [],
        };

        const { error: upsertErr } = await retryOnNetworkError(async () =>
          await supabase
            .from('profiles')
            .upsert(fullProfileInsert, { onConflict: 'id', ignoreDuplicates: true })
        );

        if (upsertErr && isMissingColumnError(upsertErr)) {
          const { error: baseUpsertErr } = await retryOnNetworkError(async () =>
            await supabase
              .from('profiles')
              .upsert(
                {
                  id: authUser.id,
                  email: authUser.email || '',
                  display_name: displayName,
                  theme,
                  spending_style: spendingStyle,
                  song_language: songLanguageToDb('Mixed'),
                  timezone: 'Asia/Manila',
                },
                { onConflict: 'id', ignoreDuplicates: true }
              )
          );
          if (baseUpsertErr && !isNetworkFetchError(baseUpsertErr)) {
            console.error('[Chestlist][ensureUserInitialized.upsertBaseProfile]', baseUpsertErr);
          }
        } else if (upsertErr && !isNetworkFetchError(upsertErr)) {
          console.error('[Chestlist][ensureUserInitialized.upsertProfile]', upsertErr);
        }

        const { data: reloadedProfile } = await retryOnNetworkError(async () =>
          await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()
        );
        dbRow = reloadedProfile || null;
      }

      // 2. Idempotently ensure initial onboarding accounts (Alkansya + optional first account)
      const { data: existingAccounts, error: accSelErr } = await retryOnNetworkError(async () =>
        await supabase
          .from('accounts')
          .select('id, name, nickname, type')
          .eq('user_id', authUser.id)
      );

      if (accSelErr) {
        if (isNetworkFetchError(accSelErr)) {
          console.warn('[Chestlist][ensureUserInitialized.selectAccounts] Offline/network fallback used.');
        } else {
          console.error('[Chestlist][ensureUserInitialized.selectAccounts]', accSelErr);
        }
        setProvisioningPending(authUser.id, true);
      } else {
        const accountsList = existingAccounts || [];
        const shouldProvisionAccounts =
          isProvisioningPending(authUser.id) || accountsList.length === 0;

        if (shouldProvisionAccounts) {
          setProvisioningPending(authUser.id, true);

          const alkansyaName =
            typeof meta.alkansya_name === 'string' && meta.alkansya_name.trim()
              ? meta.alkansya_name.trim()
              : 'My Alkansya';

          const hasAlkansya = accountsList.some(
            (a: any) =>
              a.nickname === 'Alkansya' ||
              (typeof a.name === 'string' &&
                a.name.trim().toLowerCase() === alkansyaName.toLowerCase() &&
                accountTypeToDb(a.type) === 'cash_stash')
          );

          if (!hasAlkansya) {
            const alkansyaAcc: RawAccount = {
              id: crypto.randomUUID(),
              name: alkansyaName,
              nickname: 'Alkansya',
              type: 'Cash stash',
              openingBalanceCentavos: 0,
              lastConfirmedDate: getManilaDateString(),
              color: '#FFD9E1',
              textColor: '#3A2E33',
              icon: 'piggy',
              transactions: [],
            };
            await insertAccountRow(authUser.id, alkansyaAcc, accountsList.length);
            accountsList.push({
              id: alkansyaAcc.id,
              name: alkansyaAcc.name,
              nickname: alkansyaAcc.nickname,
              type: accountTypeToDb(alkansyaAcc.type),
            });
          }

          if (meta.first_account && meta.first_account.name) {
            const firstAccName = String(meta.first_account.name).trim();
            const firstAccType = fromDbAccountType(meta.first_account.type || 'E-wallet');
            const firstAccDbType = accountTypeToDb(firstAccType);

            const hasFirstAcc = accountsList.some(
              (a: any) =>
                typeof a.name === 'string' &&
                a.name.trim().toLowerCase() === firstAccName.toLowerCase() &&
                accountTypeToDb(a.type) === firstAccDbType
            );

            if (!hasFirstAcc) {
              const firstAcc: RawAccount = {
                id: crypto.randomUUID(),
                name: firstAccName,
                type: firstAccType,
                openingBalanceCentavos: Number(meta.first_account.startingBalanceCentavos || 0),
                lastConfirmedDate: getManilaDateString(),
                color: '#D9EDD8',
                textColor: '#3A2E33',
                icon: 'wallet',
                transactions: [],
              };
              await insertAccountRow(authUser.id, firstAcc, accountsList.length);
            }
          }

          setProvisioningPending(authUser.id, false);
        }
      }

      // Persist initial PIN state in fallback in case extended profile columns aren't migrated yet
      if (meta.notes_pin_hash) {
        const fb = readFallbackData(authUser.id);
        if (!fb.pinState?.isConfigured) {
          fb.pinState = {
            pinHash: meta.notes_pin_hash,
            isConfigured: true,
            failedAttempts: 0,
            lockedUntil: 0,
            lockoutDurationLevel: 0,
          };
          localStorage.setItem(fallbackStorageKey(authUser.id), JSON.stringify(fb));
        }
      }
    } catch (err) {
      // Halfway failure: keep pending flag so next load retries,
      // and allow the user into the app instead of blocking access.
      if (isNetworkFetchError(err)) {
        console.warn('[Chestlist][ensureUserInitialized] Offline/network fallback used.');
      } else {
        console.error('[Chestlist][ensureUserInitialized]', err);
      }
      setProvisioningPending(authUser.id, true);
    }

    return {
      profile: mapSupabaseAuthUserToProfile(authUser, dbRow),
      dbRow,
    };
  })();

  inFlightProvisioning.set(authUser.id, runPromise);
  try {
    return await runPromise;
  } finally {
    if (inFlightProvisioning.get(authUser.id) === runPromise) {
      inFlightProvisioning.delete(authUser.id);
    }
  }
}

async function loadUserData(userId: string, dbProfile?: any): Promise<void> {
  if (dataLoadPromise && activeUserId === userId) {
    return dataLoadPromise;
  }

  activeUserId = userId;
  const loadPromise = (async () => {
    // If previous provisioning failed halfway, retry safely on load
    if (isSupabaseConfigured && isProvisioningPending(userId)) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user?.id === userId) {
        await ensureUserInitialized(sessionData.session.user);
      }
    }

    const fb = readFallbackData(userId);
    const nextState = createEmptyState();

    // 0. Restore category settings from fallback first so expense mapping can resolve custom & legacy categories
    if (Array.isArray(fb.categories) && fb.categories.length > 0) {
      nextState.categories = mergeWithDefaultCategories(fb.categories);
    }
    if (typeof fb.useSubcategories === 'boolean') {
      nextState.useSubcategories = fb.useSubcategories;
    }
    if (Array.isArray(fb.learnedRules)) {
      nextState.learnedRules = fb.learnedRules;
    }
    if (fb.expenseCategoryMeta && typeof fb.expenseCategoryMeta === 'object') {
      nextState.expenseCategoryMeta = fb.expenseCategoryMeta;
    }

    // Load categories, subcategories, learned rules from Supabase tables if present
    if (isSupabaseConfigured) {
      const [catsRes, subsRes, rulesRes] = await Promise.all([
        supabase.from('categories').select('*').or(`user_id.is.null,user_id.eq.${userId}`).order('sort_order', { ascending: true }),
        supabase.from('subcategories').select('*').or(`user_id.is.null,user_id.eq.${userId}`).order('sort_order', { ascending: true }),
        supabase.from('learned_category_rules').select('*').eq('user_id', userId),
      ]);

      if (!catsRes.error && Array.isArray(catsRes.data) && catsRes.data.length > 0) {
        const subsByCat = new Map<string, ExpenseSubcategory[]>();
        if (!subsRes.error && Array.isArray(subsRes.data)) {
          for (const s of subsRes.data) {
            const subObj: ExpenseSubcategory = {
              id: s.id,
              categoryId: s.category_id,
              userId: s.user_id || null,
              key: s.key,
              label: s.label,
              sortOrder: Number(s.sort_order || 0),
              isArchived: Boolean(s.is_archived),
            };
            const arr = subsByCat.get(subObj.categoryId) || [];
            arr.push(subObj);
            subsByCat.set(subObj.categoryId, arr);
          }
        }
        const dbCats: ExpenseCategory[] = catsRes.data.map((c: any, idx: number) => ({
          id: c.id,
          userId: c.user_id || null,
          key: c.key,
          label: c.label,
          icon: c.icon || '📦',
          color: c.color || '#D3D3D8',
          textColor: '#3A2E33',
          sortOrder: typeof c.sort_order === 'number' ? c.sort_order : idx,
          isArchived: Boolean(c.is_archived),
          subcategories: (subsByCat.get(c.id) || []).sort((a, b) => a.sortOrder - b.sortOrder),
        }));
        nextState.categories = mergeWithDefaultCategories(dbCats);
      }

      if (!rulesRes.error && Array.isArray(rulesRes.data)) {
        nextState.learnedRules = rulesRes.data.map((r: any) => ({
          id: r.id,
          keyword: String(r.keyword || '').trim().toLowerCase(),
          categoryId: r.category_id,
          subcategoryId: r.subcategory_id || null,
          createdAt: parseTimestampMs(r.created_at),
          updatedAt: parseTimestampMs(r.updated_at || r.created_at),
        }));
      }
    }

    // 1. Profile settings
    let prof = dbProfile;
    if (!prof && isSupabaseConfigured) {
      const { data, error: profErr } = await retryOnNetworkError(async () =>
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
      );
      if (profErr) {
        if (isNetworkFetchError(profErr)) {
          console.warn('[Chestlist][loadUserData.profiles] Offline/network fallback used.');
        } else {
          console.error('[Chestlist][loadUserData.profiles]', profErr);
        }
      }
      prof = data;
    }

    if (prof) {
      nextState.weeklyBudgetCentavos =
        typeof prof.weekly_budget_centavos === 'number'
          ? Number(prof.weekly_budget_centavos)
          : fb.weeklyBudgetCentavos ?? 0;

      nextState.categoryLimits =
        prof.category_limits && typeof prof.category_limits === 'object'
          ? normalizeCategoryLimitsMap(prof.category_limits, nextState.categories)
          : normalizeCategoryLimitsMap(fb.categoryLimits || {}, nextState.categories);

      if (typeof prof.use_subcategories === 'boolean') {
        nextState.useSubcategories = prof.use_subcategories;
      }

      nextState.songLanguageSetting = prof.song_language
        ? fromDbSongLanguage(prof.song_language)
        : fb.songLanguageSetting || 'Mixed';

      nextState.songFeedback = Array.isArray(prof.song_feedback)
        ? prof.song_feedback
        : fb.songFeedback || [];

      nextState.recordedReferenceNumbers = Array.isArray(prof.recorded_reference_numbers)
        ? prof.recorded_reference_numbers
        : fb.recordedReferenceNumbers || [];

      if (typeof prof.notes_pin_configured === 'boolean') {
        nextState.pinState = {
          pinHash: prof.notes_pin_hash || '',
          isConfigured: Boolean(prof.notes_pin_configured),
          failedAttempts: Number(prof.notes_pin_failed_attempts || 0),
          lockedUntil: Number(prof.notes_pin_locked_until || 0),
          lockoutDurationLevel: Number(prof.notes_pin_lockout_level || 0),
        };
      } else if (fb.pinState) {
        nextState.pinState = fb.pinState;
      }
    } else {
      if (typeof fb.weeklyBudgetCentavos === 'number') {
        nextState.weeklyBudgetCentavos = fb.weeklyBudgetCentavos;
      }
      if (fb.categoryLimits) {
        nextState.categoryLimits = normalizeCategoryLimitsMap(fb.categoryLimits, nextState.categories);
      }
      if (fb.songLanguageSetting) {
        nextState.songLanguageSetting = fb.songLanguageSetting;
      }
      if (Array.isArray(fb.songFeedback)) {
        nextState.songFeedback = fb.songFeedback;
      }
      if (Array.isArray(fb.recordedReferenceNumbers)) {
        nextState.recordedReferenceNumbers = fb.recordedReferenceNumbers;
      }
      if (fb.pinState) {
        nextState.pinState = fb.pinState;
      }
    }

    if (!isSupabaseConfigured) {
      if (Array.isArray(fb.expenses)) {
        nextState.expenses = fb.expenses.map((e) => {
          const resolvedCat = resolveExpenseCategoryWithPool(
            nextState.categories,
            e.category,
            e.categoryId
          );
          const resolvedSub = resolveExpenseSubcategory(
            resolvedCat,
            e.subcategoryLabel,
            e.subcategoryId
          );
          return {
            ...e,
            category: resolvedCat.label,
            categoryId: resolvedCat.id,
            subcategoryId: resolvedSub?.id || null,
            subcategoryLabel: resolvedSub?.label || null,
          };
        });
      }
      if (Array.isArray(fb.accounts)) {
        nextState.accounts = fb.accounts.map((a) => ({
          ...a,
          type: fromDbAccountType(a.type),
        }));
      }
      if (Array.isArray(fb.savingsGoals)) {
        nextState.savingsGoals = fb.savingsGoals;
      }
      if (Array.isArray(fb.debts)) {
        nextState.debts = fb.debts;
      }
      if (Array.isArray(fb.checklist)) {
        nextState.checklist = fb.checklist;
      }
      if (Array.isArray(fb.diaryEntries)) {
        nextState.diaryEntries = fb.diaryEntries;
        nextState.notes = fb.diaryEntries;
      }
    } else {
    // 2. Accounts & Transactions (including Expenses & single-row Savings Transfers)
    const [accRes, txRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);

    if (txRes.error && !isMissingTableError(txRes.error)) {
      throwUserSafeError('loadUserData.transactions', txRes.error);
    }
    if (accRes.error && !isMissingTableError(accRes.error)) {
      throwUserSafeError('loadUserData.accounts', accRes.error);
    }

    const accNameById = new Map<string, string>();
    if (!accRes.error && Array.isArray(accRes.data)) {
      for (const row of accRes.data) {
        if (row.id && row.name) {
          accNameById.set(row.id, row.name);
        }
      }
    } else if (fb.accounts) {
      for (const a of fb.accounts) {
        accNameById.set(a.id, a.name);
      }
    }

    const fbTxById = new Map<string, AccountTransaction>();
    for (const fbAcc of fb.accounts || []) {
      for (const fbTx of fbAcc.transactions || []) {
        fbTxById.set(fbTx.id, fbTx);
      }
    }

    const txByAccount: Record<string, AccountTransaction[]> = {};
    const loadedExpenses: Expense[] = [];

    if (!txRes.error && Array.isArray(txRes.data)) {
      for (const row of txRes.data) {
        if (row.deleted_at) continue;

        const dbType = transactionTypeToDb(row.type);

        // Single-row savings transfers: account_id = source (outflow), to_account_id = backing (inflow)
        if (dbType === 'transfer' && row.to_account_id) {
          const occurred = row.occurred_at || row.created_at;
          const dateStr = occurred ? getManilaDateString(occurred) : getManilaDateString();
          const createdMs = parseTimestampMs(row.created_at);
          const amountCentavos = Math.abs(Number(row.amount_centavos || 0));
          const srcName = (row.account_id && accNameById.get(row.account_id)) || 'account';
          const destName = accNameById.get(row.to_account_id) || 'account';
          const rawDesc = String(row.description || '');
          const forMatch = rawDesc.match(/^Transfer to .+? for (.+)$/i);
          const inDesc = forMatch
            ? `Transfer from ${srcName} for ${forMatch[1]}`
            : `Transfer from ${srcName}`;

          if (row.account_id) {
            const outTx: AccountTransaction = {
              id: row.id,
              accountId: row.account_id,
              toAccountId: row.to_account_id,
              type: 'transfer_out',
              direction: 'outflow',
              amountCentavos,
              description: rawDesc || `Transfer to ${destName}`,
              note: row.notes || undefined,
              source: row.source ? fromDbTransactionSource(row.source) : undefined,
              date: dateStr,
              referenceNumber: row.external_ref || undefined,
              overdraftConfirmed: Boolean(
                row.overdraft_confirmed ?? fbTxById.get(row.id)?.overdraftConfirmed
              ),
              createdAt: createdMs,
            };
            if (!txByAccount[row.account_id]) txByAccount[row.account_id] = [];
            txByAccount[row.account_id].push(outTx);
          }

          if (row.to_account_id !== row.account_id) {
            const inTx: AccountTransaction = {
              id: `${row.id}-in`,
              accountId: row.to_account_id,
              toAccountId: row.to_account_id,
              type: 'transfer_in',
              direction: 'inflow',
              amountCentavos,
              description: inDesc,
              note: row.notes || undefined,
              source: row.source ? fromDbTransactionSource(row.source) : undefined,
              date: dateStr,
              referenceNumber: row.external_ref || undefined,
              createdAt: createdMs,
            };
            if (!txByAccount[row.to_account_id]) txByAccount[row.to_account_id] = [];
            txByAccount[row.to_account_id].push(inTx);
          }

          if (row.external_ref && !nextState.recordedReferenceNumbers.includes(row.external_ref)) {
            nextState.recordedReferenceNumbers.push(row.external_ref);
          }
          continue;
        }

        const mapped = mapTransactionRow(row, fbTxById.get(row.id));
        if (mapped.accountId) {
          if (!txByAccount[mapped.accountId]) txByAccount[mapped.accountId] = [];
          txByAccount[mapped.accountId].push(mapped);
        }
        if (mapped.referenceNumber && !nextState.recordedReferenceNumbers.includes(mapped.referenceNumber)) {
          nextState.recordedReferenceNumbers.push(mapped.referenceNumber);
        }

        if (dbType === 'expense') {
          const meta = nextState.expenseCategoryMeta[mapped.id];
          const resolvedCat = resolveExpenseCategoryWithPool(
            nextState.categories,
            meta?.categoryLabel || row.category || mapped.category,
            row.category_id || meta?.categoryId || mapped.categoryId
          );
          const resolvedSub = resolveExpenseSubcategory(
            resolvedCat,
            meta?.subcategoryLabel,
            row.subcategory_id ?? meta?.subcategoryId ?? mapped.subcategoryId
          );

          loadedExpenses.push({
            id: mapped.id,
            title: mapped.description || 'Expense',
            amountCentavos: Math.abs(mapped.amountCentavos),
            category: resolvedCat.label,
            categoryId: resolvedCat.id,
            subcategoryId: resolvedSub?.id || null,
            subcategoryLabel: resolvedSub?.label || meta?.subcategoryLabel || null,
            categoryConfidence:
              typeof row.category_confidence === 'number'
                ? row.category_confidence
                : meta?.categoryConfidence ?? mapped.categoryConfidence ?? null,
            subcategoryConfidence:
              typeof row.subcategory_confidence === 'number'
                ? row.subcategory_confidence
                : meta?.subcategoryConfidence ?? mapped.subcategoryConfidence ?? null,
            categoryUserConfirmed:
              typeof row.category_user_confirmed === 'boolean'
                ? row.category_user_confirmed
                : meta?.categoryUserConfirmed ?? mapped.categoryUserConfirmed,
            merchant: row.merchant ?? meta?.merchant ?? mapped.merchant ?? null,
            date: mapped.date,
            account: mapped.accountId ? accNameById.get(mapped.accountId) : undefined,
            note: mapped.note || (mapped.referenceNumber ? `Ref: ${mapped.referenceNumber}` : undefined),
            overdraftConfirmed: Boolean(
              row.overdraft_confirmed ?? meta?.overdraftConfirmed ?? mapped.overdraftConfirmed
            ),
            createdAt: mapped.createdAt,
          });
        }
      }
      nextState.expenses = loadedExpenses;
    } else if (isMissingTableError(txRes.error) && Array.isArray(fb.expenses)) {
      nextState.expenses = fb.expenses.map((e) => {
        const resolvedCat = resolveExpenseCategoryWithPool(
          nextState.categories,
          e.category,
          e.categoryId
        );
        const resolvedSub = resolveExpenseSubcategory(
          resolvedCat,
          e.subcategoryLabel,
          e.subcategoryId
        );
        return {
          ...e,
          category: resolvedCat.label,
          categoryId: resolvedCat.id,
          subcategoryId: resolvedSub?.id || null,
          subcategoryLabel: resolvedSub?.label || null,
        };
      });
    }

    if (!accRes.error && Array.isArray(accRes.data)) {
      const fbAccMap = new Map((fb.accounts || []).map((a) => [a.id, a]));
      nextState.accounts = accRes.data.map((row: any) => {
        const txs = txByAccount[row.id] || [];
        const fbAcc = fbAccMap.get(row.id);
        const latestAdj = txs.find((t) => t.type === 'adjustment');
        const createdDay = row.created_at ? getManilaDateString(row.created_at) : getManilaDateString();
        const confirmedDay = row.balance_confirmed_at
          ? getManilaDateString(row.balance_confirmed_at)
          : row.last_confirmed_date;

        return {
          id: row.id,
          name: row.name,
          nickname: row.nickname || undefined,
          type: fromDbAccountType(row.type),
          openingBalanceCentavos: Number(row.opening_balance_centavos || 0),
          last4: row.last4 || fbAcc?.last4 || undefined,
          lastConfirmedDate:
            confirmedDay || fbAcc?.lastConfirmedDate || latestAdj?.date || createdDay,
          color: row.card_color || '#EFECE6',
          textColor: row.text_color ?? fbAcc?.textColor ?? undefined,
          icon: row.icon ?? fbAcc?.icon ?? undefined,
          isArchived: Boolean(row.is_archived),
          sortOrder: Number(row.sort_order || 0),
          transactions: txs,
        };
      });
    } else if (fb.accounts) {
      nextState.accounts = fb.accounts.map((a) => ({
        ...a,
        type: fromDbAccountType(a.type),
      }));
    }

    // 3. Savings Goals & Deposits
    const [goalsRes, depositsRes] = await Promise.all([
      supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('goal_deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (goalsRes.error && !isMissingTableError(goalsRes.error)) {
      throwUserSafeError('loadUserData.savingsGoals', goalsRes.error);
    }
    if (depositsRes.error && !isMissingTableError(depositsRes.error)) {
      throwUserSafeError('loadUserData.goalDeposits', depositsRes.error);
    }

    if (!goalsRes.error && Array.isArray(goalsRes.data)) {
      const depsByGoal: Record<string, GoalDeposit[]> = {};
      if (!depositsRes.error && Array.isArray(depositsRes.data)) {
        for (const d of depositsRes.data) {
          const dep: GoalDeposit = {
            id: d.id,
            goalId: d.goal_id,
            amountCentavos: Number(d.amount_centavos),
            date: d.date,
            fromAccount: d.from_account || undefined,
            createdAt: parseTimestampMs(d.created_at),
          };
          if (!depsByGoal[dep.goalId]) depsByGoal[dep.goalId] = [];
          depsByGoal[dep.goalId].push(dep);
        }
      }
      nextState.savingsGoals = goalsRes.data.map((g: any) => ({
        id: g.id,
        title: g.title,
        targetCentavos: Number(g.target_centavos),
        startDate: g.start_date,
        deadline: g.deadline,
        backingAccount: g.backing_account,
        containerSkin: g.container_skin as ContainerSkin,
        deposits: depsByGoal[g.id] || [],
        isCompleted: Boolean(g.is_completed),
        note: g.note || undefined,
        emoji: g.emoji || undefined,
        createdAt: parseTimestampMs(g.created_at),
      }));
    } else if (isMissingTableError(goalsRes.error) && Array.isArray(fb.savingsGoals)) {
      nextState.savingsGoals = fb.savingsGoals;
    }

    // 4. Debts & Debt Payments
    const [debtsRes, paymentsRes] = await Promise.all([
      supabase.from('debts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('debt_payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (debtsRes.error && !isMissingTableError(debtsRes.error)) {
      throwUserSafeError('loadUserData.debts', debtsRes.error);
    }
    if (paymentsRes.error && !isMissingTableError(paymentsRes.error)) {
      throwUserSafeError('loadUserData.debtPayments', paymentsRes.error);
    }

    if (!debtsRes.error && Array.isArray(debtsRes.data)) {
      const paysByDebt: Record<string, DebtPayment[]> = {};
      if (!paymentsRes.error && Array.isArray(paymentsRes.data)) {
        for (const p of paymentsRes.data) {
          const pay: DebtPayment = {
            id: p.id,
            debtId: p.debt_id,
            amountCentavos: Number(p.amount_centavos),
            date: p.date,
            time: p.time || undefined,
            channel: (p.channel || 'GCash') as DebtPayment['channel'],
            paidFromAccount: p.paid_from_account || undefined,
            notes: typeof p.notes === 'string' ? p.notes : undefined,
            transactionId: p.transaction_id || undefined,
            createdAt: parseTimestampMs(p.created_at),
          };
          if (!paysByDebt[pay.debtId]) paysByDebt[pay.debtId] = [];
          paysByDebt[pay.debtId].push(pay);
        }
      }
      nextState.debts = debtsRes.data.map((d: any) => ({
        id: d.id,
        title: d.title,
        creditor: d.creditor || undefined,
        type: d.type as DebtType,
        totalCentavos: Number(d.total_centavos),
        dueDate: d.due_date,
        dueTime: d.due_time || undefined,
        remindersEnabled: d.reminders_enabled !== false,
        notes: d.notes || undefined,
        payments: paysByDebt[d.id] || [],
        isArchived: Boolean(d.is_archived),
        wasCompleted: Boolean(d.was_completed),
        createdAt: parseTimestampMs(d.created_at),
      }));
    } else if (isMissingTableError(debtsRes.error) && Array.isArray(fb.debts)) {
      nextState.debts = fb.debts;
    }

    // 5. Checklist Items
    const chkRes = await supabase
      .from('checklist_items')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (chkRes.error && !isMissingTableError(chkRes.error)) {
      throwUserSafeError('loadUserData.checklist', chkRes.error);
    }

    if (!chkRes.error && Array.isArray(chkRes.data)) {
      nextState.checklist = chkRes.data.map((c: any, idx: number) => ({
        id: c.id,
        title: c.title,
        text: c.title,
        category: (c.category === 'School Activity' ? 'School Activity' : 'General') as ChecklistCategory,
        status: (c.status || (c.completed ? 'Done' : 'Not started')) as ChecklistStatus,
        wasStartedBefore: Boolean(c.was_started_before),
        completed: Boolean(c.completed || c.status === 'Done'),
        dueDate: c.due_date || undefined,
        completedAt: c.completed_at ? parseTimestampMs(c.completed_at) : undefined,
        sortOrder: typeof c.sort_order === 'number' ? c.sort_order : idx,
      }));
    } else if (isMissingTableError(chkRes.error) && Array.isArray(fb.checklist)) {
      nextState.checklist = fb.checklist;
    }

    // 6. Diary Entries
    const diaryRes = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (diaryRes.error && !isMissingTableError(diaryRes.error)) {
      throwUserSafeError('loadUserData.diaryEntries', diaryRes.error);
    }

    if (!diaryRes.error && Array.isArray(diaryRes.data)) {
      nextState.diaryEntries = diaryRes.data.map((e: any) => {
        const normalizedMoodSource: DiaryMoodSource =
          e.mood_source === 'user' ||
          e.mood_source === 'ai' ||
          e.mood_source === 'estimate'
            ? e.mood_source
            : 'auto';
        const detectedLanguage: DiaryDetectedLanguage | undefined =
          e.detected_language === 'English' ||
          e.detected_language === 'Tagalog' ||
          e.detected_language === 'Taglish'
            ? e.detected_language
            : undefined;
        const aiSummary: string | undefined =
          typeof e.ai_summary === 'string' && e.ai_summary.trim()
            ? e.ai_summary
            : undefined;
        const aiEnergy: SongEnergy | undefined =
          e.ai_energy === 'low' ||
          e.ai_energy === 'medium' ||
          e.ai_energy === 'high'
            ? e.ai_energy
            : undefined;
        const aiThemes: string[] | undefined = Array.isArray(e.ai_themes)
          ? e.ai_themes.filter((t: unknown): t is string => typeof t === 'string')
          : undefined;
        const analyzedHash: string | undefined =
          typeof e.analyzed_hash === 'string' && e.analyzed_hash.trim()
            ? e.analyzed_hash
            : undefined;
        return {
          id: e.id,
          title: e.title || undefined,
          date: e.date,
          formattedDate: e.formatted_date || undefined,
          content: e.content,
          wordCount: Number(e.word_count || 0),
          mood: (e.mood || 'Calm') as DiaryMood,
          moodSource: normalizedMoodSource,
          detectedLanguage,
          aiSummary,
          aiEnergy,
          aiThemes,
          analyzedHash,
          location: e.location || undefined,
          stickers: Array.isArray(e.stickers) ? e.stickers : [],
          attachedSong: e.attached_song || undefined,
          createdAt: parseTimestampMs(e.created_at),
          updatedAt: parseTimestampMs(e.updated_at),
          body: e.content,
        };
      });
      nextState.notes = nextState.diaryEntries;
    } else if (isMissingTableError(diaryRes.error) && Array.isArray(fb.diaryEntries)) {
      nextState.diaryEntries = fb.diaryEntries;
      nextState.notes = fb.diaryEntries;
    }
    }

    state = nextState;
    writeFallbackData(userId);
  })();

  dataLoadPromise = loadPromise;
  try {
    await loadPromise;
  } finally {
    if (dataLoadPromise === loadPromise) {
      dataLoadPromise = null;
    }
  }
}

/**
 * Currency Formatter
 * Formats integer centavos to Philippine Peso (PHP ₱)
 */
export function formatPHP(centavos: number): string {
  const safeCentavos = Number.isFinite(centavos) ? Math.round(centavos) : 0;
  const isNegative = safeCentavos < 0;
  const absPesos = Math.abs(safeCentavos) / 100;
  const formatted = absPesos.toLocaleString('en-PH', {
    minimumFractionDigits: absPesos % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-₱${formatted}` : `₱${formatted}`;
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function formatPrettyDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * SAVINGS RULES ENGINE (Strictly dynamic math, NEVER hard-coded)
 */
export function computeGoalMetrics(goal: RawSavingsGoal): SavingsGoal {
  const deposits = goal.deposits || [];
  const savedCentavos = deposits.reduce((sum, d) => sum + d.amountCentavos, 0);
  const remainingCentavos = Math.max(0, goal.targetCentavos - savedCentavos);

  const today = getToday();
  const todayMs = today.getTime();

  const parseDate = (str: string) => {
    if (!str) return getToday();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const startDt = parseDate(goal.startDate);
  const deadlineDt = parseDate(goal.deadline);

  const oneDayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(1, Math.round((deadlineDt.getTime() - todayMs) / oneDayMs));
  const totalDays = Math.max(1, Math.round((deadlineDt.getTime() - startDt.getTime()) / oneDayMs));
  const daysElapsed = Math.max(0, Math.round((todayMs - startDt.getTime()) / oneDayMs));

  const requiredPerDayCentavos = daysLeft > 0 ? Math.round(remainingCentavos / daysLeft) : 0;
  const requiredPerWeekCentavos = requiredPerDayCentavos * 7;

  const elapsedRatio = Math.min(1, Math.max(0, daysElapsed / totalDays));
  const expectedPaceCentavos = Math.round(goal.targetCentavos * elapsedRatio);
  const isOffPace = savedCentavos < expectedPaceCentavos && savedCentavos < goal.targetCentavos;

  const isDeadlinePassed = deadlineDt.getTime() < todayMs;
  const isCompleted = savedCentavos >= goal.targetCentavos;
  const percentage =
    goal.targetCentavos > 0 ? Math.round((savedCentavos / goal.targetCentavos) * 100) : 0;

  return {
    ...goal,
    deposits,
    savedCentavos,
    remainingCentavos,
    daysLeft,
    totalDays,
    daysElapsed,
    percentage,
    requiredPerDayCentavos,
    requiredPerWeekCentavos,
    isOffPace,
    isDeadlinePassed,
    isCompleted,
  };
}

export function computeDebtMetrics(debt: RawDebtItem): DebtItem {
  const payments = debt.payments || [];
  const paidCentavos = payments.reduce((sum, p) => sum + p.amountCentavos, 0);
  const remainingCentavos = Math.max(0, debt.totalCentavos - paidCentavos);
  const percentagePaid =
    debt.totalCentavos > 0
      ? Math.min(100, Math.round((paidCentavos / debt.totalCentavos) * 100))
      : 100;

  const today = getToday();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = debt.dueDate.split('-').map(Number);
  const dueDt = new Date(y, m - 1, d).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round((dueDt - todayMs) / oneDayMs);

  let status: DebtStatus;
  if (remainingCentavos === 0) {
    status = 'paid';
  } else if (daysLeft < 0) {
    status = 'overdue';
  } else if (daysLeft <= 3) {
    status = 'due soon';
  } else {
    status = 'active';
  }

  const isDueToday = daysLeft === 0 && remainingCentavos > 0 && debt.remindersEnabled !== false;
  const isDueSoon =
    daysLeft > 0 && daysLeft <= 3 && remainingCentavos > 0 && debt.remindersEnabled !== false;
  const isOverdue = daysLeft < 0 && remainingCentavos > 0;

  return {
    id: debt.id,
    title: debt.title,
    creditor: debt.creditor || debt.title,
    lender: debt.creditor || debt.title,
    type: debt.type,
    totalCentavos: debt.totalCentavos,
    amountCentavos: debt.totalCentavos,
    paidCentavos,
    remainingCentavos,
    percentagePaid,
    dueDate: debt.dueDate,
    dueTime: debt.dueTime,
    remindersEnabled: debt.remindersEnabled !== false,
    notes: debt.notes,
    payments: [...payments].sort((a, b) => b.createdAt - a.createdAt),
    status,
    daysLeft,
    isDueSoon,
    isDueToday,
    isOverdue,
    isArchived: Boolean(debt.isArchived),
  };
}

export const computeDebtDaysLeft = (debt: any) => computeDebtMetrics(debt);

/**
 * ACCOUNT RULES (Computed dynamically in data layer)
 */
export function computeAccountLedgerAvailableCentavos(
  raw: Pick<RawAccount, 'openingBalanceCentavos' | 'transactions'>,
  options?: { excludeTransactionId?: string }
): number {
  let balanceCentavos = Math.round(Number(raw.openingBalanceCentavos || 0));
  for (const t of raw.transactions || []) {
    if (options?.excludeTransactionId && t.id === options.excludeTransactionId) {
      continue;
    }
    const amt = Math.abs(Math.round(Number(t.amountCentavos || 0)));
    if (t.direction === 'inflow') {
      balanceCentavos += amt;
    } else if (t.direction === 'outflow') {
      balanceCentavos -= amt;
    }
  }
  return balanceCentavos;
}

async function validateOutflowServerAndLocal(params: {
  userId: string;
  account: RawAccount;
  requiredCentavos: number;
  allowOverdraft?: boolean;
  excludeTransactionId?: string;
  previousAmountCentavos?: number;
  sameAccount?: boolean;
  overdraftConfirmed?: boolean;
}): Promise<{ availableCentavos: number; overdraftConfirmed: boolean }> {
  const required = Math.abs(Math.round(params.requiredCentavos));
  const available = computeAccountLedgerAvailableCentavos(params.account, {
    excludeTransactionId: params.excludeTransactionId,
  });
  const isAlreadyConfirmedSameOrSmaller = Boolean(
    params.excludeTransactionId &&
      params.sameAccount &&
      params.overdraftConfirmed &&
      params.previousAmountCentavos !== undefined &&
      required <= Math.abs(Math.round(params.previousAmountCentavos))
  );
  const allowOverdraft = Boolean(params.allowOverdraft);

  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/transactions/validate-outflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          accountId: params.account.id,
          accountName: params.account.name,
          amountCentavos: required,
          allow_overdraft: allowOverdraft,
          excludeTransactionId: params.excludeTransactionId,
          previousAmountCentavos: params.previousAmountCentavos,
          sameAccount: params.sameAccount,
          overdraftConfirmed: params.overdraftConfirmed,
          accountSnapshot: {
            id: params.account.id,
            name: params.account.name,
            type: params.account.type,
            openingBalanceCentavos: params.account.openingBalanceCentavos,
            transactions: params.account.transactions || [],
          },
        }),
      });
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        const avail =
          typeof payload?.details?.available === 'number' ? payload.details.available : available;
        const req =
          typeof payload?.details?.required === 'number' ? payload.details.required : required;
        throw new InsufficientFundsError(avail, req, payload?.message || 'Not enough balance');
      }
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        throw err;
      }
      // Fall through to local ledger validation if server is unreachable
    }
  }

  if (!isAlreadyConfirmedSameOrSmaller && required > available && !allowOverdraft) {
    throw new InsufficientFundsError(available, required);
  }

  const resultingBalance = available - required;
  const nextOverdraftConfirmed =
    resultingBalance < 0 && (allowOverdraft || isAlreadyConfirmedSameOrSmaller);

  return {
    availableCentavos: available,
    overdraftConfirmed: nextOverdraftConfirmed,
  };
}

export function computeAccountMetrics(raw: RawAccount): AccountWallet {
  const transactions = raw.transactions || [];
  const balanceCentavos = computeAccountLedgerAvailableCentavos(raw);

  const today = getToday();
  const [y, m, d] = (raw.lastConfirmedDate || getManilaDateString()).split('-').map(Number);
  const confirmedDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - confirmedDate.getTime()) / (24 * 60 * 60 * 1000));
  const isStale = diffDays > 7;

  const last4 = raw.last4 || '';

  const backingGoalIds = (state.savingsGoals || [])
    .filter((g) => g.backingAccount === raw.name)
    .map((g) => g.id);

  return {
    id: raw.id,
    name: raw.name,
    nickname: raw.nickname,
    type: raw.type,
    openingBalanceCentavos: raw.openingBalanceCentavos,
    balanceCentavos,
    last4,
    lastConfirmedDate: raw.lastConfirmedDate || getManilaDateString(),
    isStale,
    color: raw.color || '#EFECE6',
    textColor: raw.textColor,
    icon: raw.icon,
    isArchived: Boolean(raw.isArchived),
    transactions: [...transactions].sort((a, b) => b.createdAt - a.createdAt),
    backingGoalIds,
  };
}

// ======================== CATEGORY & AI CATEGORIZATION HELPERS ========================

function resolveExpenseCategoryWithPool(
  pool: ExpenseCategory[],
  value?: string | null,
  categoryId?: string | null
): ExpenseCategory {
  if (categoryId) {
    const byId = pool.find((c) => c.id === categoryId);
    if (byId) return byId;
  }
  const normalized = (value || '').trim().toLowerCase();
  if (normalized) {
    const direct =
      pool.find((c) => c.id.toLowerCase() === normalized) ||
      pool.find((c) => c.key.toLowerCase() === normalized) ||
      pool.find((c) => c.label.toLowerCase() === normalized);
    if (direct) return direct;

    const mappedLegacyKey = LEGACY_CATEGORY_KEY_MAP[normalized];
    if (mappedLegacyKey) {
      const legacyMatch = pool.find((c) => c.key.toLowerCase() === mappedLegacyKey);
      if (legacyMatch) return legacyMatch;
    }
  }
  return (
    pool.find((c) => c.key === 'others') ||
    pool[pool.length - 1] ||
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}

function mergeWithDefaultCategories(stored: ExpenseCategory[]): ExpenseCategory[] {
  const defaults = buildDefaultCategories();
  const byId = new Map<string, ExpenseCategory>();
  const byKey = new Map<string, ExpenseCategory>();

  for (const item of stored) {
    if (!item || !item.id) continue;
    byId.set(item.id, {
      ...item,
      textColor: '#3A2E33',
      subcategories: Array.isArray(item.subcategories) ? item.subcategories : [],
    });
    if (item.key) byKey.set(item.key.toLowerCase(), item);
  }

  const merged: ExpenseCategory[] = [];
  for (const def of defaults) {
    const override = byId.get(def.id) || byKey.get(def.key.toLowerCase());
    if (override) {
      const subById = new Map<string, ExpenseSubcategory>();
      const subByKey = new Map<string, ExpenseSubcategory>();
      for (const s of override.subcategories || []) {
        if (!s || !s.id) continue;
        subById.set(s.id, s);
        if (s.key) subByKey.set(s.key.toLowerCase(), s);
      }
      const mergedSubs: ExpenseSubcategory[] = [];
      for (const defSub of def.subcategories) {
        const subOver = subById.get(defSub.id) || subByKey.get(defSub.key.toLowerCase());
        if (subOver) {
          mergedSubs.push({ ...defSub, ...subOver, categoryId: override.id });
          subById.delete(subOver.id);
        } else {
          mergedSubs.push({ ...defSub, categoryId: override.id });
        }
      }
      for (const customSub of override.subcategories || []) {
        if (customSub && subById.has(customSub.id)) {
          mergedSubs.push({ ...customSub, categoryId: override.id });
        }
      }
      mergedSubs.sort((a, b) => a.sortOrder - b.sortOrder);
      merged.push({
        ...def,
        ...override,
        textColor: '#3A2E33',
        subcategories: mergedSubs,
      });
      byId.delete(override.id);
    } else {
      merged.push(def);
    }
  }

  for (const custom of stored) {
    if (custom && byId.has(custom.id)) {
      merged.push({
        ...custom,
        textColor: '#3A2E33',
        subcategories: [...(custom.subcategories || [])].sort((a, b) => a.sortOrder - b.sortOrder),
      });
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeCategoryLimitsMap(
  rawLimits: Record<string, any>,
  pool: ExpenseCategory[]
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!rawLimits || typeof rawLimits !== 'object') return result;
  for (const [k, v] of Object.entries(rawLimits)) {
    const val = Number(v || 0);
    if (!Number.isFinite(val) || val <= 0) continue;
    const cat = resolveExpenseCategoryWithPool(pool, k, k);
    result[cat.key] = Math.round(val);
  }
  return result;
}

function slugifyCategoryKey(label: string, existingKeys: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'custom';
  let candidate = base;
  let counter = 2;
  while (existingKeys.has(candidate)) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }
  return candidate;
}

export function normalizeCategorizationText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

const AI_DAILY_CALL_CAP = 100;
const AI_DAILY_HIGH_HEDGE_THRESHOLD = 80;
const AI_PER_MINUTE_CALL_CAP = 10;
const AI_REQUEST_TIMEOUT_MS = 8000;
const AI_RETRY_TIMEOUT_MS = 12000;
let categoryListVersion = 1;
const aiCategorizationCache = new Map<string, ExpenseCategorizationResult>();
const aiTextCategorizationCache = new Map<string, ExpenseCategorizationResult>();
const inFlightCategorizationRequests = new Map<string, Promise<ExpenseCategorizationResult>>();
const inMemoryMinuteAiTimestamps = new Map<string, number[]>();

export function clearCategorizationCache(): void {
  categoryListVersion += 1;
  aiCategorizationCache.clear();
  aiTextCategorizationCache.clear();
}

function getDailyAiUsageCount(userId: string): number {
  try {
    const key = `chestlist_ai_cat_quota_${userId}_${getManilaDateString()}`;
    const raw = localStorage.getItem(key);
    const num = raw ? Number(raw) : 0;
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
}

function incrementDailyAiUsageCount(userId: string): void {
  try {
    const key = `chestlist_ai_cat_quota_${userId}_${getManilaDateString()}`;
    const current = getDailyAiUsageCount(userId);
    localStorage.setItem(key, String(current + 1));
  } catch {
    // ignore storage limits
  }
}

function getRecentMinuteAiTimestamps(userId: string): number[] {
  const cutoff = Date.now() - 60_000;
  let timestamps: number[] = [];
  try {
    const raw = localStorage.getItem(`chestlist_ai_cat_rpm_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
      }
    }
  } catch {
    timestamps = inMemoryMinuteAiTimestamps.get(userId) || [];
  }
  const active = timestamps.filter((t) => t > cutoff);
  inMemoryMinuteAiTimestamps.set(userId, active);
  return active;
}

function recordMinuteAiTimestamp(userId: string): number[] {
  const now = Date.now();
  const active = [...getRecentMinuteAiTimestamps(userId), now];
  inMemoryMinuteAiTimestamps.set(userId, active);
  try {
    localStorage.setItem(`chestlist_ai_cat_rpm_${userId}`, JSON.stringify(active));
  } catch {
    // ignore storage limits
  }
  return active;
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener('abort', onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

export function suggestCategoryFromTitle(_title: string): CategoryName {
  const pool = getAllCategoriesPool().filter((c) => !c.isArchived);
  return (pool.find((c) => c.key === 'others') || pool[0] || DEFAULT_CATEGORIES[0]).label;
}

export async function categorizeExpense(params: {
  description: string;
  merchant?: string | null;
  amountCentavos?: number | null;
  signal?: AbortSignal;
  isRetry?: boolean;
}): Promise<ExpenseCategorizationResult> {
  const userId = await ensureStateLoaded();
  const normalizedDesc = normalizeCategorizationText(params.description || '');
  const normalizedMerchant = normalizeCategorizationText(params.merchant || '');
  const useSubcategories = state.useSubcategories !== false;
  const activeCategories = state.categories.filter((c) => !c.isArchived);

  const emptyResult: ExpenseCategorizationResult = {
    categoryId: null,
    categoryKey: null,
    categoryLabel: null,
    subcategoryId: null,
    subcategoryKey: null,
    subcategoryLabel: null,
    categoryConfidence: 0,
    subcategoryConfidence: 0,
    newSubcategorySuggestion: null,
    source: 'none',
    needsManualPicker: true,
  };

  if (!normalizedDesc || activeCategories.length === 0) {
    return emptyResult;
  }

  // Step 1: User's saved rules (from corrections), exact normalized match
  for (const rule of state.learnedRules || []) {
    const ruleKw = normalizeCategorizationText(rule.keyword);
    if (!ruleKw) continue;
    const isExactMatch =
      normalizedDesc === ruleKw || (normalizedMerchant ? normalizedMerchant === ruleKw : false);

    if (isExactMatch) {
      const matchedCat = activeCategories.find((c) => c.id === rule.categoryId);
      if (matchedCat) {
        const matchedSub =
          useSubcategories && rule.subcategoryId
            ? matchedCat.subcategories.find((s) => !s.isArchived && s.id === rule.subcategoryId) ||
              null
            : null;
        return {
          categoryId: matchedCat.id,
          categoryKey: matchedCat.key,
          categoryLabel: matchedCat.label,
          subcategoryId: matchedSub?.id || null,
          subcategoryKey: matchedSub?.key || null,
          subcategoryLabel: matchedSub?.label || null,
          categoryConfidence: 1.0,
          subcategoryConfidence: matchedSub ? 1.0 : 0,
          newSubcategorySuggestion: null,
          source: 'rule',
          needsManualPicker: false,
        };
      }
    }
  }

  // Step 2: Cache of earlier results for the same normalized text and category-list version
  const amountKey =
    typeof params.amountCentavos === 'number' && params.amountCentavos > 0
      ? String(Math.round(params.amountCentavos))
      : 'none';
  const textKey = `${normalizedDesc}|${normalizedMerchant}|${useSubcategories}|${categoryListVersion}`;
  const cacheKey = `${textKey}|${amountKey}`;
  const cached =
    amountKey === 'none'
      ? aiCategorizationCache.get(cacheKey) || aiTextCategorizationCache.get(textKey)
      : aiCategorizationCache.get(cacheKey);
  if (cached) {
    return { ...cached };
  }

  // Step 3: Never send two concurrent requests for the same normalized text + amount key
  const existingInFlight = inFlightCategorizationRequests.get(cacheKey);
  if (existingInFlight) {
    return raceWithAbort(existingInFlight, params.signal);
  }

  if (params.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const dailyUsageCount = getDailyAiUsageCount(userId);
  if (dailyUsageCount >= AI_DAILY_CALL_CAP) {
    console.error('[Chestlist][categorizeExpense] API error:', {
      status: 429,
      code: 'quota_exceeded',
      message: 'Daily AI suggestion limit reached.',
    });
    return {
      ...emptyResult,
      aiFailed: true,
      errorCode: 'quota_exceeded',
      errorStatus: 429,
      errorMessage: 'Daily AI suggestion limit reached.',
    };
  }

  const recentMinuteCalls = getRecentMinuteAiTimestamps(userId);
  if (recentMinuteCalls.length >= AI_PER_MINUTE_CALL_CAP) {
    return {
      ...emptyResult,
      source: 'none',
      needsManualPicker: true,
    };
  }

  const disableHedge = dailyUsageCount >= AI_DAILY_HIGH_HEDGE_THRESHOLD;

  const singleAttempt = async (
    timeoutMs: number,
    isRetryAttempt: boolean
  ): Promise<
    | { ok: true; data: any }
    | { ok: false; status: number; code: string; message: string }
  > => {
    const timeoutController = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      timeoutController.abort();
    }, timeoutMs);

    const onCallerAbort = () => timeoutController.abort();
    if (params.signal) {
      if (params.signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('Aborted', 'AbortError');
      }
      params.signal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const res = await fetch('/api/categorize-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: timeoutController.signal,
        body: JSON.stringify({
          description: params.description.trim(),
          merchant: params.merchant?.trim() || null,
          amountCentavos: params.amountCentavos ?? null,
          useSubcategories,
          isRetry: Boolean(params.isRetry || isRetryAttempt),
          disableHedge,
          categories: activeCategories.map((c) => ({
            key: c.key,
            label: c.label,
            subcategories: useSubcategories
              ? c.subcategories
                  .filter((s) => !s.isArchived)
                  .map((s) => ({ key: s.key, label: s.label }))
              : [],
          })),
        }),
      });

      if (!res.ok) {
        let code = `http_${res.status}`;
        let message = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (typeof errBody?.error === 'string' && errBody.error.trim()) {
            code = errBody.error.trim();
          }
          if (typeof errBody?.message === 'string' && errBody.message.trim()) {
            message = errBody.message.trim();
          }
        } catch {
          // ignore JSON parse error
        }
        return { ok: false, status: res.status, code, message };
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err: any) {
      if (params.signal?.aborted && !didTimeout) {
        throw err;
      }
      if (didTimeout) {
        return {
          ok: false,
          status: 504,
          code: 'timeout',
          message: `Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
        };
      }
      return {
        ok: false,
        status: 0,
        code: 'server_unreachable',
        message: err?.message || 'Unable to reach AI server.',
      };
    } finally {
      clearTimeout(timeoutId);
      if (params.signal) {
        params.signal.removeEventListener('abort', onCallerAbort);
      }
    }
  };

  const requestPromise = (async (): Promise<ExpenseCategorizationResult> => {
    // Count one AI call per user request (even when hedged) and track 10/min limit
    incrementDailyAiUsageCount(userId);
    recordMinuteAiTimestamp(userId);

    const initialTimeoutMs = params.isRetry ? AI_RETRY_TIMEOUT_MS : AI_REQUEST_TIMEOUT_MS;
    const attempt = await singleAttempt(initialTimeoutMs, Boolean(params.isRetry));

    if (!attempt.ok) {
      console.error('[Chestlist][categorizeExpense] AI request failed:', {
        status: attempt.status,
        code: attempt.code,
        message: attempt.message,
      });
      return {
        ...emptyResult,
        aiFailed: true,
        errorCode: attempt.code,
        errorStatus: attempt.status,
        errorMessage: attempt.message,
      };
    }

    const data = attempt.data;
    const catKey = typeof data?.category === 'string' ? data.category.trim().toLowerCase() : '';
    const rawCatConf = typeof data?.category_confidence === 'number' ? data.category_confidence : 0;
    const catConf = Math.max(0, Math.min(0.95, rawCatConf));
    const subKey = typeof data?.subcategory === 'string' ? data.subcategory.trim().toLowerCase() : '';
    const rawSubConf =
      typeof data?.subcategory_confidence === 'number' ? data.subcategory_confidence : 0;
    const subConf = Math.max(0, Math.min(0.95, rawSubConf));

    const matchedCat = activeCategories.find(
      (c) => c.key.toLowerCase() === catKey || c.label.toLowerCase() === catKey
    );

    if (!matchedCat || catConf < 0.6) {
      const lowConfResult: ExpenseCategorizationResult = {
        ...emptyResult,
        categoryConfidence: catConf,
        subcategoryConfidence: subConf,
        source: 'ai',
        needsManualPicker: true,
      };
      aiCategorizationCache.set(cacheKey, lowConfResult);
      if (amountKey === 'none') {
        aiTextCategorizationCache.set(textKey, lowConfResult);
      }
      return lowConfResult;
    }

    let matchedSub: ExpenseSubcategory | null = null;
    if (useSubcategories && subKey && subConf >= 0.7) {
      matchedSub =
        matchedCat.subcategories.find(
          (s) =>
            !s.isArchived &&
            (s.key.toLowerCase() === subKey || s.label.toLowerCase() === subKey)
        ) || null;
    }

    const result: ExpenseCategorizationResult = {
      categoryId: matchedCat.id,
      categoryKey: matchedCat.key,
      categoryLabel: matchedCat.label,
      subcategoryId: matchedSub?.id || null,
      subcategoryKey: matchedSub?.key || null,
      subcategoryLabel: matchedSub?.label || null,
      categoryConfidence: catConf,
      subcategoryConfidence: matchedSub ? subConf : 0,
      newSubcategorySuggestion: null,
      source: 'ai',
      needsManualPicker: false,
    };

    aiCategorizationCache.set(cacheKey, result);
    if (amountKey === 'none') {
      aiTextCategorizationCache.set(textKey, result);
    }
    return result;
  })();

  inFlightCategorizationRequests.set(cacheKey, requestPromise);
  try {
    return await raceWithAbort(requestPromise, params.signal);
  } finally {
    if (inFlightCategorizationRequests.get(cacheKey) === requestPromise) {
      inFlightCategorizationRequests.delete(cacheKey);
    }
  }
}

async function persistCategoryChangesToDb(userId: string): Promise<void> {
  writeFallbackData(userId);
  clearCategorizationCache();
  if (!isSupabaseConfigured) return;

  // Try syncing to categories/subcategories tables if they exist; gracefully skip if unmigrated
  const userCats = state.categories.map((c, idx) => ({
    id: c.id,
    user_id: c.userId,
    key: c.key,
    label: c.label,
    icon: c.icon,
    color: c.color,
    sort_order: idx,
    is_archived: c.isArchived,
  }));

  const userOwnedCats = userCats.filter((c) => c.user_id === userId);
  if (userOwnedCats.length > 0) {
    const { error } = await supabase.from('categories').upsert(userOwnedCats, { onConflict: 'id' });
    if (error && !isMissingTableError(error)) {
      console.warn('[Chestlist][persistCategoryChangesToDb.categories]', error);
    }
  }
}

export async function getCategories(includeArchived = false): Promise<ExpenseCategory[]> {
  await ensureStateLoaded();
  const list = [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  if (includeArchived) return list;
  return list
    .filter((c) => !c.isArchived)
    .map((c) => ({
      ...c,
      subcategories: c.subcategories.filter((s) => !s.isArchived),
    }));
}

export async function getUseSubcategoriesSetting(): Promise<boolean> {
  await ensureStateLoaded();
  return state.useSubcategories !== false;
}

export async function setUseSubcategoriesSetting(enabled: boolean): Promise<boolean> {
  const userId = await ensureStateLoaded();
  state.useSubcategories = Boolean(enabled);
  clearCategorizationCache();
  await updateProfileFields(userId, { use_subcategories: state.useSubcategories });
  return state.useSubcategories;
}

export async function createCategory(input: {
  label: string;
  icon: string;
  color: string;
}): Promise<ExpenseCategory> {
  const userId = await ensureStateLoaded();
  const label = input.label.trim().slice(0, 32);
  if (!label) throw new UserSafeError('Category name is required.');

  const duplicate = state.categories.find(
    (c) => !c.isArchived && c.label.trim().toLowerCase() === label.toLowerCase()
  );
  if (duplicate) {
    throw new UserSafeError('A category with that name already exists.');
  }

  const existingKeys = new Set(state.categories.map((c) => c.key.toLowerCase()));
  const newCat: ExpenseCategory = {
    id: crypto.randomUUID(),
    userId,
    key: slugifyCategoryKey(label, existingKeys),
    label,
    icon: input.icon.trim() || '🏷️',
    color: input.color || CATEGORY_PASTEL_SWATCHES[0],
    textColor: '#3A2E33',
    sortOrder: state.categories.length,
    isArchived: false,
    subcategories: [],
  };

  state.categories = [...state.categories, newCat];
  await persistCategoryChangesToDb(userId);
  return newCat;
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<{ label: string; icon: string; color: string; isArchived: boolean }>
): Promise<ExpenseCategory> {
  const userId = await ensureStateLoaded();
  const idx = state.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) throw new UserSafeError(GENERIC_USER_ERROR);

  const prev = state.categories[idx];
  const nextLabel = updates.label !== undefined ? updates.label.trim().slice(0, 32) : prev.label;
  if (!nextLabel) throw new UserSafeError('Category name is required.');

  const updated: ExpenseCategory = {
    ...prev,
    ...(updates.label !== undefined ? { label: nextLabel } : {}),
    ...(updates.icon !== undefined ? { icon: updates.icon.trim() || prev.icon } : {}),
    ...(updates.color !== undefined ? { color: updates.color } : {}),
    ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
    textColor: '#3A2E33',
  };

  state.categories[idx] = updated;

  if (updates.label !== undefined && nextLabel !== prev.label) {
    state.expenses = state.expenses.map((exp) =>
      exp.categoryId === categoryId || exp.category.toLowerCase() === prev.label.toLowerCase()
        ? { ...exp, category: nextLabel, categoryId }
        : exp
    );
    for (const [expId, meta] of Object.entries(state.expenseCategoryMeta)) {
      if (meta.categoryId === categoryId) {
        state.expenseCategoryMeta[expId] = { ...meta, categoryLabel: nextLabel };
      }
    }
  }

  await persistCategoryChangesToDb(userId);
  return updated;
}

export async function reorderCategories(orderedIds: string[]): Promise<ExpenseCategory[]> {
  const userId = await ensureStateLoaded();
  const orderMap = new Map<string, number>();
  orderedIds.forEach((id, idx) => orderMap.set(id, idx));

  state.categories = state.categories
    .map((c, fallbackIdx) => ({
      ...c,
      sortOrder: orderMap.has(c.id) ? orderMap.get(c.id)! : orderedIds.length + fallbackIdx,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  await persistCategoryChangesToDb(userId);
  return state.categories;
}

export async function getCategoryExpenseCount(categoryId: string): Promise<number> {
  await ensureStateLoaded();
  const cat = state.categories.find((c) => c.id === categoryId);
  return state.expenses.filter(
    (e) =>
      e.categoryId === categoryId ||
      (cat && e.category.toLowerCase() === cat.label.toLowerCase())
  ).length;
}

export async function removeOrHideCategory(
  categoryId: string,
  moveExpensesToCategoryId?: string,
  options?: {
    keepExistingOnExpenses?: boolean;
    learnedRuleAction?: 'remove' | 'move';
  }
): Promise<void> {
  const userId = await ensureStateLoaded();
  const cat = state.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  if (cat.key === 'others') {
    throw new UserSafeError('The Others category cannot be removed.');
  }

  const keepExisting = Boolean(options?.keepExistingOnExpenses) && cat.userId === null;
  const targetCat = keepExisting
    ? undefined
    : state.categories.find(
        (c) => c.id === moveExpensesToCategoryId && c.id !== categoryId && !c.isArchived
      ) ||
      state.categories.find((c) => c.key === 'others') ||
      state.categories.find((c) => c.id !== categoryId && !c.isArchived);

  if (targetCat && !keepExisting) {
    const affectedExpenses = state.expenses.filter(
      (e) =>
        e.categoryId === categoryId ||
        e.category.toLowerCase() === cat.label.toLowerCase()
    );

    if (affectedExpenses.length > 0) {
      const affectedIds = affectedExpenses.map((e) => e.id);
      if (isSupabaseConfigured) {
        const { error: txUpErr } = await supabase
          .from('transactions')
          .update({ category: targetCat.key, category_id: targetCat.id, subcategory_id: null })
          .in('id', affectedIds)
          .eq('user_id', userId);
        if (txUpErr && isMissingColumnError(txUpErr)) {
          await supabase
            .from('transactions')
            .update({ category: targetCat.key })
            .in('id', affectedIds)
            .eq('user_id', userId);
        }
      }

      state.expenses = state.expenses.map((e) =>
        affectedIds.includes(e.id)
          ? {
              ...e,
              category: targetCat.label,
              categoryId: targetCat.id,
              subcategoryId: null,
              subcategoryLabel: null,
            }
          : e
      );
      for (const id of affectedIds) {
        state.expenseCategoryMeta[id] = {
          ...(state.expenseCategoryMeta[id] || {}),
          categoryId: targetCat.id,
          categoryLabel: targetCat.label,
          subcategoryId: null,
          subcategoryLabel: null,
        };
      }
    }
  }

  if (cat.userId === null) {
    // System defaults are archived/hidden rather than deleted
    state.categories = state.categories.map((c) =>
      c.id === categoryId ? { ...c, isArchived: true } : c
    );
  } else {
    // User-created categories and their subcategories are deleted permanently
    state.categories = state.categories.filter((c) => c.id !== categoryId);
    if (isSupabaseConfigured) {
      const { error: subDelErr } = await supabase
        .from('subcategories')
        .delete()
        .eq('category_id', categoryId)
        .eq('user_id', userId);
      if (subDelErr && !isMissingTableError(subDelErr)) {
        console.warn('[Chestlist][removeOrHideCategory.deleteSubcategories]', subDelErr);
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);
      if (error && !isMissingTableError(error)) {
        console.warn('[Chestlist][removeOrHideCategory.delete]', error);
      }
    }
  }

  const ruleAction = options?.learnedRuleAction === 'move' && targetCat && !keepExisting ? 'move' : 'remove';
  const matchingRules = state.learnedRules.filter((r) => r.categoryId === categoryId);
  if (matchingRules.length > 0) {
    if (ruleAction === 'move' && targetCat) {
      const now = Date.now();
      state.learnedRules = state.learnedRules.map((r) =>
        r.categoryId === categoryId
          ? { ...r, categoryId: targetCat.id, subcategoryId: null, updatedAt: now }
          : r
      );
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('learned_category_rules')
          .update({ category_id: targetCat.id, subcategory_id: null, updated_at: now })
          .eq('category_id', categoryId)
          .eq('user_id', userId);
        if (error && !isMissingTableError(error)) {
          console.warn('[Chestlist][removeOrHideCategory.moveRules]', error);
        }
      }
    } else {
      state.learnedRules = state.learnedRules.filter((r) => r.categoryId !== categoryId);
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('learned_category_rules')
          .delete()
          .eq('category_id', categoryId)
          .eq('user_id', userId);
        if (error && !isMissingTableError(error)) {
          console.warn('[Chestlist][removeOrHideCategory.deleteRules]', error);
        }
      }
    }
  }

  await persistCategoryChangesToDb(userId);
}

export async function restoreCategory(categoryId: string): Promise<void> {
  const userId = await ensureStateLoaded();
  state.categories = state.categories.map((c) =>
    c.id === categoryId ? { ...c, isArchived: false } : c
  );
  await persistCategoryChangesToDb(userId);
}

export async function restoreSubcategory(subcategoryId: string): Promise<void> {
  const userId = await ensureStateLoaded();
  state.categories = state.categories.map((c) => ({
    ...c,
    subcategories: c.subcategories.map((s) =>
      s.id === subcategoryId ? { ...s, isArchived: false } : s
    ),
  }));
  await persistCategoryChangesToDb(userId);
}

export async function createSubcategory(
  categoryId: string,
  label: string
): Promise<ExpenseSubcategory> {
  const userId = await ensureStateLoaded();
  const cleaned = label.trim().replace(/\s+/g, ' ').slice(0, 24).trim();
  if (!cleaned) {
    throw new UserSafeError('Subcategory name is required.');
  }

  const catIdx = state.categories.findIndex((c) => c.id === categoryId);
  if (catIdx === -1) {
    throw new UserSafeError(GENERIC_USER_ERROR);
  }
  const cat = state.categories[catIdx];

  const existing = cat.subcategories.find(
    (s) => s.label.trim().toLowerCase() === cleaned.toLowerCase()
  );
  if (existing) {
    if (existing.isArchived) {
      existing.isArchived = false;
      existing.label = cleaned;
      await persistCategoryChangesToDb(userId);
    }
    return existing;
  }

  const existingKeys = new Set(cat.subcategories.map((s) => s.key.toLowerCase()));
  const newSub: ExpenseSubcategory = {
    id: crypto.randomUUID(),
    categoryId,
    userId,
    key: slugifyCategoryKey(cleaned, existingKeys),
    label: cleaned,
    sortOrder: cat.subcategories.length,
    isArchived: false,
  };

  state.categories[catIdx] = {
    ...cat,
    subcategories: [...cat.subcategories, newSub],
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('subcategories').upsert(
      {
        id: newSub.id,
        category_id: categoryId,
        user_id: userId,
        key: newSub.key,
        label: newSub.label,
        sort_order: newSub.sortOrder,
        is_archived: false,
      },
      { onConflict: 'id' }
    );
    if (error && !isMissingTableError(error)) {
      console.warn('[Chestlist][createSubcategory]', error);
    }
  }

  await persistCategoryChangesToDb(userId);
  return newSub;
}

export async function updateSubcategory(
  subcategoryId: string,
  updates: Partial<{ label: string; isArchived: boolean }>
): Promise<ExpenseSubcategory> {
  const userId = await ensureStateLoaded();
  let updatedSub: ExpenseSubcategory | null = null;

  state.categories = state.categories.map((cat) => {
    const subIdx = cat.subcategories.findIndex((s) => s.id === subcategoryId);
    if (subIdx === -1) return cat;
    const prev = cat.subcategories[subIdx];
    const nextLabel =
      updates.label !== undefined
        ? updates.label.trim().replace(/\s+/g, ' ').slice(0, 24).trim()
        : prev.label;
    if (!nextLabel) throw new UserSafeError('Subcategory name is required.');
    updatedSub = {
      ...prev,
      ...(updates.label !== undefined ? { label: nextLabel } : {}),
      ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
    };
    const nextSubs = [...cat.subcategories];
    nextSubs[subIdx] = updatedSub;
    return { ...cat, subcategories: nextSubs };
  });

  if (!updatedSub) throw new UserSafeError(GENERIC_USER_ERROR);

  if (updates.label !== undefined) {
    const finalLabel = (updatedSub as ExpenseSubcategory).label;
    state.expenses = state.expenses.map((e) =>
      e.subcategoryId === subcategoryId ? { ...e, subcategoryLabel: finalLabel } : e
    );
    for (const [expId, meta] of Object.entries(state.expenseCategoryMeta)) {
      if (meta.subcategoryId === subcategoryId) {
        state.expenseCategoryMeta[expId] = { ...meta, subcategoryLabel: finalLabel };
      }
    }
  }

  await persistCategoryChangesToDb(userId);
  return updatedSub;
}

export async function reorderSubcategories(
  categoryId: string,
  orderedSubIds: string[]
): Promise<void> {
  const userId = await ensureStateLoaded();
  const orderMap = new Map<string, number>();
  orderedSubIds.forEach((id, idx) => orderMap.set(id, idx));

  state.categories = state.categories.map((cat) => {
    if (cat.id !== categoryId) return cat;
    const sorted = [...cat.subcategories]
      .map((s, idx) => ({
        ...s,
        sortOrder: orderMap.has(s.id) ? orderMap.get(s.id)! : orderedSubIds.length + idx,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return { ...cat, subcategories: sorted };
  });

  await persistCategoryChangesToDb(userId);
}

export async function getSubcategoryExpenseCount(subcategoryId: string): Promise<number> {
  await ensureStateLoaded();
  return state.expenses.filter((e) => e.subcategoryId === subcategoryId).length;
}

export async function removeSubcategory(
  subcategoryId: string,
  moveExpensesToSubcategoryId: string | null = null,
  options?: {
    keepExistingOnExpenses?: boolean;
    learnedRuleAction?: 'remove' | 'move';
  }
): Promise<void> {
  const userId = await ensureStateLoaded();
  let targetSubLabel: string | null = null;
  let parentCatId: string | null = null;
  let isSystemSub = false;

  for (const cat of state.categories) {
    const found = cat.subcategories.find((s) => s.id === subcategoryId);
    if (found) {
      parentCatId = cat.id;
      isSystemSub = found.userId === null;
      if (moveExpensesToSubcategoryId) {
        const dest = cat.subcategories.find((s) => s.id === moveExpensesToSubcategoryId);
        targetSubLabel = dest?.label || null;
      }
      break;
    }
  }

  const keepExisting = Boolean(options?.keepExistingOnExpenses) && isSystemSub;
  const affected = state.expenses.filter((e) => e.subcategoryId === subcategoryId);
  if (affected.length > 0 && !keepExisting) {
    const affectedIds = affected.map((e) => e.id);
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('transactions')
        .update({ subcategory_id: moveExpensesToSubcategoryId })
        .in('id', affectedIds)
        .eq('user_id', userId);
      if (error && !isMissingColumnError(error)) {
        console.warn('[Chestlist][removeSubcategory.moveExpenses]', error);
      }
    }

    state.expenses = state.expenses.map((e) =>
      affectedIds.includes(e.id)
        ? {
            ...e,
            subcategoryId: moveExpensesToSubcategoryId,
            subcategoryLabel: targetSubLabel,
          }
        : e
    );
    for (const id of affectedIds) {
      if (state.expenseCategoryMeta[id]) {
        state.expenseCategoryMeta[id] = {
          ...state.expenseCategoryMeta[id],
          subcategoryId: moveExpensesToSubcategoryId,
          subcategoryLabel: targetSubLabel,
        };
      }
    }
  }

  if (parentCatId) {
    state.categories = state.categories.map((cat) => {
      if (cat.id !== parentCatId) return cat;
      if (isSystemSub) {
        return {
          ...cat,
          subcategories: cat.subcategories.map((s) =>
            s.id === subcategoryId ? { ...s, isArchived: true } : s
          ),
        };
      }
      return {
        ...cat,
        subcategories: cat.subcategories.filter((s) => s.id !== subcategoryId),
      };
    });
  }

  if (!isSystemSub && isSupabaseConfigured) {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      console.warn('[Chestlist][removeSubcategory.delete]', error);
    }
  }

  const ruleAction = options?.learnedRuleAction === 'remove' ? 'remove' : 'move';
  const matchingSubRules = state.learnedRules.filter((r) => r.subcategoryId === subcategoryId);
  if (matchingSubRules.length > 0) {
    if (ruleAction === 'remove' || keepExisting) {
      state.learnedRules = state.learnedRules.filter((r) => r.subcategoryId !== subcategoryId);
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('learned_category_rules')
          .delete()
          .eq('subcategory_id', subcategoryId)
          .eq('user_id', userId);
        if (error && !isMissingTableError(error)) {
          console.warn('[Chestlist][removeSubcategory.deleteRules]', error);
        }
      }
    } else {
      const now = Date.now();
      state.learnedRules = state.learnedRules.map((r) =>
        r.subcategoryId === subcategoryId
          ? { ...r, subcategoryId: moveExpensesToSubcategoryId, updatedAt: now }
          : r
      );
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('learned_category_rules')
          .update({ subcategory_id: moveExpensesToSubcategoryId, updated_at: now })
          .eq('subcategory_id', subcategoryId)
          .eq('user_id', userId);
        if (error && !isMissingTableError(error)) {
          console.warn('[Chestlist][removeSubcategory.moveRules]', error);
        }
      }
    }
  }

  await persistCategoryChangesToDb(userId);
}

export async function getLearnedRules(): Promise<LearnedCategoryRule[]> {
  await ensureStateLoaded();
  return [...state.learnedRules].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveLearnedRule(
  keyword: string,
  categoryId: string,
  subcategoryId: string | null = null
): Promise<LearnedCategoryRule | null> {
  const userId = await ensureStateLoaded();
  const normalized = normalizeCategorizationText(keyword);
  if (!normalized || normalized.length < 2) return null;

  const now = Date.now();
  const existingIdx = state.learnedRules.findIndex(
    (r) => normalizeCategorizationText(r.keyword) === normalized
  );

  let rule: LearnedCategoryRule;
  if (existingIdx !== -1) {
    rule = {
      ...state.learnedRules[existingIdx],
      keyword: normalized,
      categoryId,
      subcategoryId: subcategoryId || null,
      updatedAt: now,
    };
    state.learnedRules[existingIdx] = rule;
  } else {
    rule = {
      id: crypto.randomUUID(),
      keyword: normalized,
      categoryId,
      subcategoryId: subcategoryId || null,
      createdAt: now,
      updatedAt: now,
    };
    state.learnedRules = [rule, ...state.learnedRules];
  }

  clearCategorizationCache();
  writeFallbackData(userId);

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('learned_category_rules').upsert(
      {
        id: rule.id,
        user_id: userId,
        keyword: rule.keyword,
        category_id: rule.categoryId,
        subcategory_id: rule.subcategoryId,
        created_at: rule.createdAt,
        updated_at: rule.updatedAt,
      },
      { onConflict: 'id' }
    );
    if (error && !isMissingTableError(error)) {
      console.warn('[Chestlist][saveLearnedRule]', error);
    }
  }

  return rule;
}

export async function deleteLearnedRule(ruleId: string): Promise<void> {
  const userId = await ensureStateLoaded();
  state.learnedRules = state.learnedRules.filter((r) => r.id !== ruleId);
  clearCategorizationCache();
  writeFallbackData(userId);

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('learned_category_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      console.warn('[Chestlist][deleteLearnedRule]', error);
    }
  }
}

export async function setCategoryLimit(
  categoryIdOrKey: string,
  limitCentavos: number
): Promise<void> {
  const userId = await ensureStateLoaded();
  const cat = resolveExpenseCategoryWithPool(state.categories, categoryIdOrKey, categoryIdOrKey);
  const safeLimit = Math.max(0, Math.round(limitCentavos));

  const nextLimits = { ...(state.categoryLimits || {}) };
  if (safeLimit > 0) {
    nextLimits[cat.key] = safeLimit;
  } else {
    delete nextLimits[cat.key];
  }
  state.categoryLimits = nextLimits;
  await updateProfileFields(userId, { category_limits: state.categoryLimits });
}

export async function removeCategoryLimit(categoryIdOrKey: string): Promise<void> {
  await setCategoryLimit(categoryIdOrKey, 0);
}

// ======================== API EXPORTS ========================

export async function getFinancialHealth(): Promise<FinancialHealthOverview> {
  await ensureStateLoaded();
  // Only transactions of type "expense" (stored in state.expenses) count toward weekly budget
  const totalSpentCentavos = state.expenses.reduce((sum, e) => sum + e.amountCentavos, 0);
  const budgetLeftCentavos = Math.max(0, state.weeklyBudgetCentavos - totalSpentCentavos);

  const computedGoals = state.savingsGoals.map(computeGoalMetrics);
  const totalSavedCentavos = computedGoals.reduce((sum, g) => sum + g.savedCentavos, 0);

  const computedDebts = state.debts.map(computeDebtMetrics);
  const activeDebts = computedDebts.filter((d) => d.remainingCentavos > 0 && !d.isArchived);
  const totalDebtCentavos = activeDebts.reduce((sum, d) => sum + d.remainingCentavos, 0);
  const activeDebtsCount = activeDebts.length;

  const computedAccounts = state.accounts.map(computeAccountMetrics);
  const activeAccounts = computedAccounts.filter((a) => !a.isArchived);
  const allAccountsTotalCentavos = activeAccounts.reduce((sum, a) => sum + a.balanceCentavos, 0);
  const hasStaleAccounts = activeAccounts.some((a) => a.isStale);

  const sortedByConfirmed = [...activeAccounts].sort((a, b) =>
    b.lastConfirmedDate.localeCompare(a.lastConfirmedDate)
  );
  const latestConfirmedDate = sortedByConfirmed[0]?.lastConfirmedDate || getManilaDateString();
  const allAccountsLastUpdated = formatPrettyDate(latestConfirmedDate);

  const activeReminders: DebtReminder[] = [];
  for (const d of activeDebts) {
    if (d.remindersEnabled) {
      if (d.daysLeft === 0) {
        activeReminders.push({
          debt: d,
          type: 'due_today',
          message: `Due today: ${d.title}.`,
        });
      } else if (d.daysLeft === 3) {
        activeReminders.push({
          debt: d,
          type: 'due_soon',
          message: `Reminder: ${d.title} (${formatPHP(d.remainingCentavos)}) is due in 3 days.`,
        });
      } else if (d.daysLeft > 0 && d.daysLeft <= 3) {
        activeReminders.push({
          debt: d,
          type: 'due_soon',
          message: `Reminder: ${d.title} (${formatPHP(d.remainingCentavos)}) is due in ${d.daysLeft} days.`,
        });
      }
    }
  }

  let targetFreeDate: string | undefined = undefined;
  let targetFreeDateLabel: string | undefined = undefined;
  if (activeDebts.length > 0) {
    const sorted = [...activeDebts].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    targetFreeDate = sorted[0].dueDate;
    const [y, m, d] = targetFreeDate.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    targetFreeDateLabel = `${months[m - 1]} ${d}`;
  }

  const dueSoonDebt = activeReminders[0]?.debt || activeDebts.find((d) => d.isDueSoon || d.isDueToday);
  const weekInfo = getCurrentWeekRange();

  return {
    weeklyBudgetCentavos: state.weeklyBudgetCentavos,
    budgetLeftCentavos,
    budgetSpentCentavos: totalSpentCentavos,
    totalSavedCentavos,
    savingsGoalsCount: state.savingsGoals.length,
    totalDebtCentavos,
    activeDebtsCount,
    allAccountsTotalCentavos,
    weekRangeLabel: weekInfo.label,
    targetFreeDate,
    targetFreeDateLabel,
    activeReminders,
    dueSoonDebt,
    hasStaleAccounts,
    allAccountsLastUpdated,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  await ensureStateLoaded();
  return [...state.expenses].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addExpense(
  expenseData: Omit<Expense, 'id' | 'createdAt'> & { allowOverdraft?: boolean }
): Promise<Expense> {
  const userId = await ensureStateLoaded();
  const now = Date.now();
  const resolvedCat = resolveExpenseCategoryWithPool(
    state.categories,
    expenseData.category,
    expenseData.categoryId
  );
  const resolvedSub =
    state.useSubcategories !== false
      ? resolveExpenseSubcategory(
          resolvedCat,
          expenseData.subcategoryLabel,
          expenseData.subcategoryId
        )
      : null;
  const absAmount = Math.abs(Math.round(expenseData.amountCentavos));

  const acc = expenseData.account
    ? state.accounts.find(
        (a) =>
          a.id === expenseData.account ||
          a.name.trim().toLowerCase() === expenseData.account!.trim().toLowerCase()
      )
    : undefined;

  let overdraftConfirmed = false;
  if (acc) {
    const check = await validateOutflowServerAndLocal({
      userId,
      account: acc,
      requiredCentavos: absAmount,
      allowOverdraft: expenseData.allowOverdraft,
    });
    overdraftConfirmed = check.overdraftConfirmed;
  }

  const txId = crypto.randomUUID();
  const { allowOverdraft: _omitAllowOverdraft, ...cleanExpenseData } = expenseData;
  const newExpense: Expense = {
    ...cleanExpenseData,
    amountCentavos: absAmount,
    category: resolvedCat.label,
    categoryId: resolvedCat.id,
    subcategoryId: resolvedSub?.id || null,
    subcategoryLabel: resolvedSub?.label || null,
    categoryConfidence: expenseData.categoryConfidence ?? null,
    subcategoryConfidence: expenseData.subcategoryConfidence ?? null,
    categoryUserConfirmed: Boolean(expenseData.categoryUserConfirmed),
    merchant: expenseData.merchant || null,
    account: acc ? acc.name : expenseData.account,
    overdraftConfirmed,
    id: txId,
    createdAt: now,
  };

  const expenseTx: AccountTransaction = {
    id: txId,
    accountId: acc ? acc.id : '',
    type: 'expense',
    direction: 'outflow',
    amountCentavos: absAmount,
    description: newExpense.title,
    note: newExpense.note,
    category: resolvedCat.label,
    categoryId: resolvedCat.id,
    subcategoryId: resolvedSub?.id || null,
    categoryConfidence: newExpense.categoryConfidence,
    subcategoryConfidence: newExpense.subcategoryConfidence,
    categoryUserConfirmed: newExpense.categoryUserConfirmed,
    merchant: newExpense.merchant,
    source: 'Manual',
    date: newExpense.date,
    overdraftConfirmed,
    createdAt: now,
  };

  await insertTransactionRow(userId, expenseTx, true);

  state.expenseCategoryMeta[txId] = {
    categoryId: resolvedCat.id,
    categoryLabel: resolvedCat.label,
    subcategoryId: resolvedSub?.id || null,
    subcategoryLabel: resolvedSub?.label || null,
    categoryConfidence: newExpense.categoryConfidence,
    subcategoryConfidence: newExpense.subcategoryConfidence,
    categoryUserConfirmed: newExpense.categoryUserConfirmed,
    merchant: newExpense.merchant,
    overdraftConfirmed,
  };

  state.expenses = [newExpense, ...state.expenses];
  if (acc) {
    acc.transactions = [expenseTx, ...(acc.transactions || [])];
  }

  writeFallbackData(userId);
  return newExpense;
}

export async function updateExpense(
  id: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt'>> & { allowOverdraft?: boolean }
): Promise<Expense> {
  const userId = await ensureStateLoaded();
  const idx = state.expenses.findIndex((e) => e.id === id);
  if (idx === -1) {
    throw new UserSafeError(GENERIC_USER_ERROR);
  }

  const prevExpense = state.expenses[idx];

  const hasCatChange = updates.category !== undefined || updates.categoryId !== undefined;
  const resolvedCat = hasCatChange
    ? resolveExpenseCategoryWithPool(state.categories, updates.category, updates.categoryId)
    : resolveExpenseCategoryWithPool(state.categories, prevExpense.category, prevExpense.categoryId);

  let nextSubId: string | null = prevExpense.subcategoryId ?? null;
  let nextSubLabel: string | null = prevExpense.subcategoryLabel ?? null;

  if (updates.subcategoryId !== undefined || updates.subcategoryLabel !== undefined) {
    if (updates.subcategoryId === null && !updates.subcategoryLabel) {
      nextSubId = null;
      nextSubLabel = null;
    } else {
      const resolvedSub = resolveExpenseSubcategory(
        resolvedCat,
        updates.subcategoryLabel,
        updates.subcategoryId
      );
      nextSubId = resolvedSub?.id || null;
      nextSubLabel = resolvedSub?.label || null;
    }
  } else if (hasCatChange && resolvedCat.id !== prevExpense.categoryId) {
    nextSubId = null;
    nextSubLabel = null;
  }

  const { allowOverdraft, ...cleanUpdates } = updates;

  const normalizedUpdates: Partial<Omit<Expense, 'id' | 'createdAt'>> = {
    ...cleanUpdates,
    ...(hasCatChange
      ? {
          category: resolvedCat.label,
          categoryId: resolvedCat.id,
        }
      : {}),
    subcategoryId: nextSubId,
    subcategoryLabel: nextSubLabel,
    ...(cleanUpdates.amountCentavos !== undefined
      ? { amountCentavos: Math.abs(Math.round(cleanUpdates.amountCentavos)) }
      : {}),
  };

  const resolveAccount = (accountRef?: string) => {
    if (!accountRef) return undefined;
    const trimmed = accountRef.trim().toLowerCase();
    return state.accounts.find(
      (a) => a.id === accountRef || a.name.trim().toLowerCase() === trimmed
    );
  };

  const prevAcc = resolveAccount(prevExpense.account);
  const targetAcc =
    normalizedUpdates.account !== undefined
      ? resolveAccount(normalizedUpdates.account)
      : prevAcc;

  const nextAmountCentavos =
    normalizedUpdates.amountCentavos !== undefined
      ? normalizedUpdates.amountCentavos
      : prevExpense.amountCentavos;
  const isSameAccount = Boolean(targetAcc && prevAcc && targetAcc.id === prevAcc.id);

  let nextOverdraftConfirmed = Boolean(prevExpense.overdraftConfirmed);
  if (targetAcc) {
    const check = await validateOutflowServerAndLocal({
      userId,
      account: targetAcc,
      requiredCentavos: nextAmountCentavos,
      allowOverdraft,
      excludeTransactionId: isSameAccount ? id : undefined,
      previousAmountCentavos: prevExpense.amountCentavos,
      sameAccount: isSameAccount,
      overdraftConfirmed: Boolean(prevExpense.overdraftConfirmed),
    });
    nextOverdraftConfirmed = check.overdraftConfirmed;
  } else {
    nextOverdraftConfirmed = false;
  }

  const updated: Expense = {
    ...prevExpense,
    ...normalizedUpdates,
    overdraftConfirmed: nextOverdraftConfirmed,
    ...(normalizedUpdates.account !== undefined
      ? { account: targetAcc ? targetAcc.name : normalizedUpdates.account }
      : {}),
  };

  const baseDbUpdates: Record<string, any> = {};
  if (normalizedUpdates.title !== undefined) baseDbUpdates.description = normalizedUpdates.title;
  if (normalizedUpdates.amountCentavos !== undefined) {
    baseDbUpdates.amount_centavos = normalizedUpdates.amountCentavos;
  }
  if (hasCatChange) {
    baseDbUpdates.category = resolvedCat.key;
  }
  if (normalizedUpdates.date !== undefined) {
    baseDbUpdates.occurred_at = buildOccurredAtIso(normalizedUpdates.date);
  }
  if (normalizedUpdates.account !== undefined) {
    baseDbUpdates.account_id = targetAcc ? targetAcc.id : null;
  }
  if (normalizedUpdates.note !== undefined) {
    baseDbUpdates.notes = normalizedUpdates.note || null;
  }

  const extendedDbUpdates: Record<string, any> = {
    ...baseDbUpdates,
    ...(hasCatChange ? { category_id: resolvedCat.id } : {}),
    ...(cleanUpdates.subcategoryId !== undefined || cleanUpdates.subcategoryLabel !== undefined || hasCatChange
      ? { subcategory_id: nextSubId }
      : {}),
    ...(cleanUpdates.categoryUserConfirmed !== undefined
      ? { category_user_confirmed: cleanUpdates.categoryUserConfirmed }
      : {}),
    ...(nextOverdraftConfirmed !== Boolean(prevExpense.overdraftConfirmed)
      ? { overdraft_confirmed: nextOverdraftConfirmed }
      : {}),
  };

  if (isSupabaseConfigured && Object.keys(extendedDbUpdates).length > 0) {
    let { error } = await supabase
      .from('transactions')
      .update(extendedDbUpdates)
      .eq('id', id)
      .eq('user_id', userId);
    if (error && isMissingColumnError(error) && Object.keys(baseDbUpdates).length > 0) {
      ({ error } = await supabase
        .from('transactions')
        .update(baseDbUpdates)
        .eq('id', id)
        .eq('user_id', userId));
    } else if (error && isMissingColumnError(error)) {
      error = null;
    }
    if (error) {
      throwUserSafeError('updateExpense', error);
    }
  }

  state.expenseCategoryMeta[id] = {
    categoryId: resolvedCat.id,
    categoryLabel: resolvedCat.label,
    subcategoryId: nextSubId,
    subcategoryLabel: nextSubLabel,
    categoryConfidence: updated.categoryConfidence,
    subcategoryConfidence: updated.subcategoryConfidence,
    categoryUserConfirmed: updated.categoryUserConfirmed,
    merchant: updated.merchant,
    overdraftConfirmed: nextOverdraftConfirmed,
  };

  state.expenses[idx] = updated;

  // Keep account transactions in sync with updated expense
  let existingTx: AccountTransaction | undefined;
  for (const acc of state.accounts) {
    const found = (acc.transactions || []).find((t) => t.id === id);
    if (found) {
      existingTx = found;
      if (normalizedUpdates.account !== undefined && (!targetAcc || acc.id !== targetAcc.id)) {
        acc.transactions = acc.transactions.filter((t) => t.id !== id);
      }
      break;
    }
  }

  const syncedTx: AccountTransaction = {
    id: updated.id,
    accountId: targetAcc?.id || existingTx?.accountId || '',
    type: 'expense',
    direction: 'outflow',
    amountCentavos: updated.amountCentavos,
    description: updated.title,
    note: updated.note,
    category: updated.category,
    categoryId: updated.categoryId,
    subcategoryId: updated.subcategoryId,
    categoryConfidence: updated.categoryConfidence,
    subcategoryConfidence: updated.subcategoryConfidence,
    categoryUserConfirmed: updated.categoryUserConfirmed,
    merchant: updated.merchant,
    source: existingTx?.source || 'Manual',
    date: updated.date,
    referenceNumber: existingTx?.referenceNumber,
    overdraftConfirmed: nextOverdraftConfirmed,
    createdAt: updated.createdAt,
  };

  if (targetAcc) {
    const existsInTarget = (targetAcc.transactions || []).some((t) => t.id === id);
    if (existsInTarget) {
      targetAcc.transactions = targetAcc.transactions.map((t) => (t.id === id ? syncedTx : t));
    } else {
      targetAcc.transactions = [syncedTx, ...(targetAcc.transactions || [])];
    }
  }

  writeFallbackData(userId);
  return updated;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throwUserSafeError('deleteExpense', error);
    }
  }

  state.expenses = state.expenses.filter((e) => e.id !== id);
  delete state.expenseCategoryMeta[id];
  for (const acc of state.accounts) {
    if (acc.transactions?.some((t) => t.id === id)) {
      acc.transactions = acc.transactions.filter((t) => t.id !== id);
    }
  }
  writeFallbackData(userId);
  return true;
}

export async function getCategoryLimits(): Promise<
  Array<CategoryConfig & { spentCentavos: number; percent: number }>
> {
  await ensureStateLoaded();
  const spendingByKey: Record<string, number> = {};

  // Only transactions of type "expense" (stored in state.expenses) count toward category limits
  for (const exp of state.expenses) {
    const resolved = resolveExpenseCategoryWithPool(state.categories, exp.category, exp.categoryId);
    spendingByKey[resolved.key] = (spendingByKey[resolved.key] || 0) + exp.amountCentavos;
  }

  const activeCategories = state.categories
    .filter((c) => !c.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return activeCategories.map((cat) => {
    const limitCentavos = Number(state.categoryLimits?.[cat.key] || 0);
    const spentCentavos = spendingByKey[cat.key] || 0;
    const percent = limitCentavos > 0 ? Math.round((spentCentavos / limitCentavos) * 100) : 0;

    return {
      id: cat.id,
      key: cat.key,
      name: cat.label,
      icon: cat.icon,
      color: cat.color,
      textColor: cat.textColor || '#3A2E33',
      limitCentavos,
      spentCentavos,
      percent,
    };
  });
}

// ======================== SAVINGS GOALS API ========================

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  await ensureStateLoaded();
  return state.savingsGoals.map(computeGoalMetrics);
}

export async function getSavingsGoalById(id: string): Promise<SavingsGoal | undefined> {
  await ensureStateLoaded();
  const raw = state.savingsGoals.find((g) => g.id === id);
  return raw ? computeGoalMetrics(raw) : undefined;
}

export async function addSavingsDeposit(
  goalId: string,
  amountCentavos: number,
  date?: string,
  fromAccount?: string,
  allowOverdraft?: boolean
): Promise<{ goal: SavingsGoal; isNewlyCompleted: boolean }> {
  const userId = await ensureStateLoaded();
  if (amountCentavos <= 0) {
    throw new UserSafeError('Deposit amount must be greater than zero.');
  }

  const rawGoal = state.savingsGoals.find((g) => g.id === goalId);
  if (!rawGoal) throw new UserSafeError(GENERIC_USER_ERROR);

  let createdTransferOut: AccountTransaction | null = null;
  let createdTransferIn: AccountTransaction | null = null;
  let transferSrcAcc: RawAccount | undefined;
  let transferDestAcc: RawAccount | undefined;
  let transferOverdraftConfirmed = false;

  if (
    fromAccount &&
    fromAccount.trim().toLowerCase() !== rawGoal.backingAccount.trim().toLowerCase()
  ) {
    const fromKey = fromAccount.trim().toLowerCase();
    const backKey = rawGoal.backingAccount.trim().toLowerCase();
    transferSrcAcc = state.accounts.find(
      (a) => a.id === fromAccount || a.name.trim().toLowerCase() === fromKey
    );
    transferDestAcc = state.accounts.find(
      (a) => a.id === rawGoal.backingAccount || a.name.trim().toLowerCase() === backKey
    );
    if (transferSrcAcc && transferDestAcc && transferSrcAcc.id !== transferDestAcc.id) {
      const check = await validateOutflowServerAndLocal({
        userId,
        account: transferSrcAcc,
        requiredCentavos: Math.abs(Math.round(amountCentavos)),
        allowOverdraft,
      });
      transferOverdraftConfirmed = check.overdraftConfirmed;
    }
  }

  const beforeMetrics = computeGoalMetrics(rawGoal);
  const wasCompleted = beforeMetrics.isCompleted;
  const now = Date.now();
  const depDate = date || getManilaDateString();

  const newDeposit: GoalDeposit = {
    id: crypto.randomUUID(),
    goalId,
    amountCentavos,
    date: depDate,
    fromAccount: fromAccount || rawGoal.backingAccount,
    createdAt: now,
  };

  const depositPayload = {
    id: newDeposit.id,
    user_id: userId,
    goal_id: goalId,
    amount_centavos: amountCentavos,
    date: depDate,
    from_account: newDeposit.fromAccount || null,
    created_at: now,
  };

  if (isSupabaseConfigured) {
    let { error } = await supabase.from('goal_deposits').insert(depositPayload);
    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase.from('goal_deposits').insert(withIsoTimestamps(depositPayload)));
    }

    if (error && !isMissingTableError(error)) {
      throwUserSafeError('addSavingsDeposit', error);
    }
  }

  if (transferSrcAcc && transferDestAcc && transferSrcAcc.id !== transferDestAcc.id) {
    const txId = crypto.randomUUID();
    createdTransferOut = {
      id: txId,
      accountId: transferSrcAcc.id,
      toAccountId: transferDestAcc.id,
      type: 'transfer_out',
      direction: 'outflow',
      amountCentavos,
      description: `Transfer to ${transferDestAcc.name} for ${rawGoal.title}`,
      source: 'Manual',
      date: depDate,
      overdraftConfirmed: transferOverdraftConfirmed,
      createdAt: now,
    };
    createdTransferIn = {
      id: `${txId}-in`,
      accountId: transferDestAcc.id,
      toAccountId: transferDestAcc.id,
      type: 'transfer_in',
      direction: 'inflow',
      amountCentavos,
      description: `Transfer from ${transferSrcAcc.name} for ${rawGoal.title}`,
      source: 'Manual',
      date: depDate,
      createdAt: now,
    };

    await insertTransactionRow(userId, createdTransferOut, true);
  }

  rawGoal.deposits = [newDeposit, ...(rawGoal.deposits || [])];
  if (transferSrcAcc && transferDestAcc && createdTransferOut && createdTransferIn) {
    transferSrcAcc.transactions = [createdTransferOut, ...(transferSrcAcc.transactions || [])];
    transferDestAcc.transactions = [createdTransferIn, ...(transferDestAcc.transactions || [])];
  }

  const afterMetrics = computeGoalMetrics(rawGoal);
  const isNewlyCompleted = Boolean(!wasCompleted && afterMetrics.isCompleted);

  if (isNewlyCompleted) {
    rawGoal.isCompleted = true;
    if (isSupabaseConfigured) {
      const { error: upErr } = await supabase
        .from('savings_goals')
        .update({ is_completed: true })
        .eq('id', goalId)
        .eq('user_id', userId);
      if (upErr && !isMissingTableError(upErr)) {
        console.error('[Chestlist][addSavingsDeposit.markCompleted]', upErr);
      }
    }
  }

  writeFallbackData(userId);
  return { goal: afterMetrics, isNewlyCompleted };
}

export async function createSavingsGoal(data: {
  title: string;
  targetCentavos: number;
  deadline: string;
  backingAccount: string;
  containerSkin: ContainerSkin;
  note?: string;
  emoji?: string;
}): Promise<SavingsGoal> {
  const userId = await ensureStateLoaded();
  if (data.targetCentavos <= 0) {
    throw new UserSafeError('Target amount must be greater than zero.');
  }

  const todayStr = getManilaDateString();
  if (data.deadline <= todayStr) {
    throw new UserSafeError('Deadline must be a future date.');
  }

  const now = Date.now();
  const newRaw: RawSavingsGoal = {
    id: crypto.randomUUID(),
    title: data.title.trim(),
    targetCentavos: data.targetCentavos,
    startDate: todayStr,
    deadline: data.deadline,
    backingAccount: data.backingAccount,
    containerSkin: data.containerSkin,
    deposits: [],
    note: data.note?.trim(),
    emoji: data.emoji || (data.containerSkin === 'piggy bank' ? '🐷' : '✨'),
    createdAt: now,
  };

  const goalPayload = {
    id: newRaw.id,
    user_id: userId,
    title: newRaw.title,
    target_centavos: newRaw.targetCentavos,
    start_date: newRaw.startDate,
    deadline: newRaw.deadline,
    backing_account: newRaw.backingAccount,
    container_skin: newRaw.containerSkin,
    is_completed: false,
    note: newRaw.note || null,
    emoji: newRaw.emoji || null,
    created_at: now,
  };

  if (isSupabaseConfigured) {
    let { error } = await supabase.from('savings_goals').insert(goalPayload);
    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase.from('savings_goals').insert(withIsoTimestamps(goalPayload)));
    }

    if (error && !isMissingTableError(error)) {
      throwUserSafeError('createSavingsGoal', error);
    }
  }

  state.savingsGoals = [newRaw, ...state.savingsGoals];
  writeFallbackData(userId);
  return computeGoalMetrics(newRaw);
}

export async function updateSavingsGoal(
  id: string,
  updates: Partial<Omit<RawSavingsGoal, 'id' | 'deposits'>>
): Promise<SavingsGoal> {
  const userId = await ensureStateLoaded();
  const raw = state.savingsGoals.find((g) => g.id === id);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.targetCentavos !== undefined) dbUpdates.target_centavos = updates.targetCentavos;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.backingAccount !== undefined) dbUpdates.backing_account = updates.backingAccount;
  if (updates.containerSkin !== undefined) dbUpdates.container_skin = updates.containerSkin;
  if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
  if (updates.note !== undefined) dbUpdates.note = updates.note;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;

  if (isSupabaseConfigured && Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from('savings_goals')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('updateSavingsGoal', error);
    }
  }

  Object.assign(raw, updates);
  writeFallbackData(userId);
  return computeGoalMetrics(raw);
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('deleteSavingsGoal', error);
    }
  }

  state.savingsGoals = state.savingsGoals.filter((g) => g.id !== id);
  writeFallbackData(userId);
  return true;
}

export async function deleteSavingsDeposit(
  goalId: string,
  depositId: string
): Promise<SavingsGoal> {
  const userId = await ensureStateLoaded();
  const raw = state.savingsGoals.find((g) => g.id === goalId);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('goal_deposits')
      .delete()
      .eq('id', depositId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('deleteSavingsDeposit', error);
    }
  }

  raw.deposits = (raw.deposits || []).filter((d) => d.id !== depositId);
  writeFallbackData(userId);
  return computeGoalMetrics(raw);
}

// ======================== DEBT API ========================

export async function getDebts(includeArchived = false): Promise<DebtItem[]> {
  await ensureStateLoaded();
  const rawList = includeArchived ? state.debts : state.debts.filter((d) => !d.isArchived);
  return rawList.map(computeDebtMetrics);
}

export async function getDebtById(id: string): Promise<DebtItem | undefined> {
  await ensureStateLoaded();
  const raw = state.debts.find((d) => d.id === id);
  return raw ? computeDebtMetrics(raw) : undefined;
}

export async function createDebt(data: {
  title: string;
  creditor?: string;
  totalCentavos: number;
  type: DebtType;
  dueDate: string;
  dueTime?: string;
  remindersEnabled?: boolean;
  notes?: string;
}): Promise<DebtItem> {
  const userId = await ensureStateLoaded();
  if (data.totalCentavos <= 0) {
    throw new UserSafeError('Enter an amount greater than ₱0.');
  }

  const now = Date.now();
  const newRaw: RawDebtItem = {
    id: crypto.randomUUID(),
    title: data.title.trim(),
    creditor: data.creditor?.trim() || data.title.trim(),
    type: data.type,
    totalCentavos: data.totalCentavos,
    dueDate: data.dueDate,
    dueTime: data.dueTime || '09:00',
    remindersEnabled: data.remindersEnabled !== false,
    notes: data.notes?.trim(),
    payments: [],
    isArchived: false,
    wasCompleted: false,
    createdAt: now,
  };

  const debtPayload = {
    id: newRaw.id,
    user_id: userId,
    title: newRaw.title,
    creditor: newRaw.creditor || null,
    type: newRaw.type,
    total_centavos: newRaw.totalCentavos,
    due_date: newRaw.dueDate,
    due_time: newRaw.dueTime || null,
    reminders_enabled: newRaw.remindersEnabled,
    notes: newRaw.notes || null,
    is_archived: false,
    was_completed: false,
    created_at: now,
  };

  if (isSupabaseConfigured) {
    let { error } = await supabase.from('debts').insert(debtPayload);
    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase.from('debts').insert(withIsoTimestamps(debtPayload)));
    }

    if (error && !isMissingTableError(error)) {
      throwUserSafeError('createDebt', error);
    }
  }

  state.debts = [newRaw, ...state.debts];
  writeFallbackData(userId);
  return computeDebtMetrics(newRaw);
}

export function getChannelDisplayLabel(channel: DebtPayment['channel']): string {
  if (channel === 'Bank') return 'Bank Transfer';
  if (channel === 'Cash') return 'Cash on Hand';
  return channel;
}

export function getMatchingChannelForAccount(account: {
  name: string;
  type: AccountType | string;
}): DebtPayment['channel'] {
  const dbType = accountTypeToDb(account.type);
  if (dbType === 'cash_stash') return 'Cash';
  if (dbType === 'bank' || dbType === 'digital_bank') return 'Bank';

  const nameLower = (account.name || '').trim().toLowerCase();
  if (nameLower.includes('gcash')) return 'GCash';
  if (nameLower.includes('maya')) return 'Maya';
  return 'Other';
}

export function doesAccountMatchChannel(
  account: { name: string; type: AccountType | string },
  channel: DebtPayment['channel']
): boolean {
  if (channel === 'Other') return true;
  return getMatchingChannelForAccount(account) === channel;
}

export function filterAccountsByChannel<
  T extends { name: string; type: AccountType | string }
>(accounts: T[], channel: DebtPayment['channel']): T[] {
  return accounts.filter((acc) => doesAccountMatchChannel(acc, channel));
}

export function validatePaymentChannelAccountMatch(
  channel: DebtPayment['channel'],
  account?: { name: string; type: AccountType | string } | null
): string | null {
  if (!account) return null;
  if (channel === 'Other') return null;

  const expectedChannel = getMatchingChannelForAccount(account);
  if (channel === expectedChannel) return null;

  const dbType = accountTypeToDb(account.type);
  const accountTypeDesc =
    dbType === 'cash_stash'
      ? 'a cash account'
      : dbType === 'bank'
      ? 'a bank account'
      : dbType === 'digital_bank'
      ? 'a digital bank account'
      : 'an e-wallet';

  const channelLabel = channel === 'Bank' ? 'Bank Transfer' : channel;

  const channelRule =
    channel === 'Cash'
      ? 'Choose Cash only for a cash account, or change the account.'
      : channel === 'Bank'
      ? 'Choose Bank Transfer only for a bank or digital bank account, or change the account.'
      : channel === 'GCash'
      ? 'Choose GCash only for a GCash e-wallet, or change the account.'
      : 'Choose Maya only for a Maya e-wallet, or change the account.';

  return `${account.name} is ${accountTypeDesc}, so it can't be paid through ${channelLabel}. ${channelRule}`;
}

export async function logDebtPayment(
  debtId: string,
  amountCentavos: number,
  options?: {
    date?: string;
    time?: string;
    channel?: 'GCash' | 'Maya' | 'Bank' | 'Cash' | 'Other';
    paidFromAccount?: string;
    allowOverdraft?: boolean;
  }
): Promise<{ debt: DebtItem; isNewlyCompleted: boolean }> {
  const userId = await ensureStateLoaded();
  if (amountCentavos <= 0) {
    throw new UserSafeError('Enter an amount greater than ₱0.');
  }

  const raw = state.debts.find((d) => d.id === debtId);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  const beforeMetrics = computeDebtMetrics(raw);
  const remainingBefore = beforeMetrics.remainingCentavos;

  if (amountCentavos > remainingBefore) {
    throw new UserSafeError("That's more than what's left on this debt.");
  }

  const now = Date.now();
  const payDate = options?.date || getManilaDateString();
  const paidAcc = options?.paidFromAccount
    ? state.accounts.find(
        (a) =>
          a.id === options.paidFromAccount ||
          a.name.trim().toLowerCase() === options.paidFromAccount!.trim().toLowerCase()
      )
    : undefined;
  const resolvedChannel: DebtPayment['channel'] =
    options?.channel || (paidAcc ? getMatchingChannelForAccount(paidAcc) : 'GCash');

  const channelMismatchError = validatePaymentChannelAccountMatch(resolvedChannel, paidAcc);
  if (channelMismatchError) {
    throw new UserSafeError(channelMismatchError);
  }

  let overdraftConfirmed = false;
  if (paidAcc) {
    const check = await validateOutflowServerAndLocal({
      userId,
      account: paidAcc,
      requiredCentavos: Math.abs(Math.round(amountCentavos)),
      allowOverdraft: options?.allowOverdraft,
    });
    overdraftConfirmed = check.overdraftConfirmed;
  }

  const linkedTxId = paidAcc ? crypto.randomUUID() : undefined;

  let outflowTx: AccountTransaction | null = null;
  if (paidAcc && linkedTxId) {
    outflowTx = {
      id: linkedTxId,
      accountId: paidAcc.id,
      type: 'debt_payment',
      direction: 'outflow',
      amountCentavos: Math.abs(Math.round(amountCentavos)),
      description: `Payment for ${raw.title}`,
      source: 'Manual',
      date: payDate,
      time: options?.time,
      overdraftConfirmed,
      createdAt: now,
    };
    await insertTransactionRow(userId, outflowTx, true);
  }

  const newPayment: DebtPayment = {
    id: crypto.randomUUID(),
    debtId,
    amountCentavos,
    date: payDate,
    time: options?.time || '12:00',
    channel: resolvedChannel,
    paidFromAccount: paidAcc ? paidAcc.name : options?.paidFromAccount,
    transactionId: linkedTxId,
    createdAt: now,
  };

  const paymentInsertPayload = {
    id: newPayment.id,
    user_id: userId,
    debt_id: debtId,
    amount_centavos: amountCentavos,
    date: newPayment.date,
    time: newPayment.time || null,
    channel: newPayment.channel,
    paid_from_account: newPayment.paidFromAccount || null,
    transaction_id: linkedTxId || null,
    created_at: now,
  };

  if (isSupabaseConfigured) {
    let { error } = await supabase.from('debt_payments').insert(paymentInsertPayload);
    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase
        .from('debt_payments')
        .insert(withIsoTimestamps(paymentInsertPayload)));
    }
    if (error && !isMissingTableError(error)) {
      if (outflowTx) {
        await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', outflowTx.id)
          .eq('user_id', userId);
      }
      throwUserSafeError('logDebtPayment', error);
    }
  }

  raw.payments = [newPayment, ...(raw.payments || [])];
  if (paidAcc && outflowTx) {
    paidAcc.transactions = [outflowTx, ...(paidAcc.transactions || [])];
  }

  const afterMetrics = computeDebtMetrics(raw);
  const isNewlyCompleted = Boolean(!raw.wasCompleted && afterMetrics.remainingCentavos === 0);

  if (isNewlyCompleted) {
    raw.wasCompleted = true;
    if (isSupabaseConfigured) {
      const { error: upErr } = await supabase
        .from('debts')
        .update({ was_completed: true })
        .eq('id', debtId)
        .eq('user_id', userId);
      if (upErr && !isMissingTableError(upErr)) {
        console.error('[Chestlist][logDebtPayment.wasCompleted]', upErr);
      }
    }
  }

  writeFallbackData(userId);
  return { debt: afterMetrics, isNewlyCompleted };
}

export async function archiveDebt(debtId: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  const raw = state.debts.find((d) => d.id === debtId);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('debts')
      .update({ is_archived: true })
      .eq('id', debtId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('archiveDebt', error);
    }
  }

  raw.isArchived = true;
  writeFallbackData(userId);
  return true;
}

export async function unarchiveDebt(debtId: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  const raw = state.debts.find((d) => d.id === debtId);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  const metrics = computeDebtMetrics(raw);
  const hasRemaining = metrics.remainingCentavos > 0;
  const updatePayload = hasRemaining
    ? { is_archived: false, was_completed: false }
    : { is_archived: false };

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('debts')
      .update(updatePayload)
      .eq('id', debtId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('unarchiveDebt', error);
    }
  }

  raw.isArchived = false;
  if (hasRemaining) {
    raw.wasCompleted = false;
  }
  writeFallbackData(userId);
  return true;
}

export async function deleteDebt(debtId: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('deleteDebt', error);
    }
  }

  state.debts = state.debts.filter((d) => d.id !== debtId);
  writeFallbackData(userId);
  return true;
}

export async function deleteDebtPayment(debtId: string, paymentId: string): Promise<DebtItem> {
  const userId = await ensureStateLoaded();
  const raw = state.debts.find((d) => d.id === debtId);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  const payment = (raw.payments || []).find((p) => p.id === paymentId);

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', paymentId)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('deleteDebtPayment', error);
    }
  }

  if (payment?.transactionId) {
    if (isSupabaseConfigured) {
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', payment.transactionId)
        .eq('user_id', userId);
      if (txErr) {
        throwUserSafeError('deleteDebtPayment.transaction', txErr);
      }
    }
    for (const acc of state.accounts) {
      if (acc.transactions?.some((t) => t.id === payment.transactionId)) {
        acc.transactions = acc.transactions.filter((t) => t.id !== payment.transactionId);
      }
    }
  }

  const nextPayments = (raw.payments || []).filter((p) => p.id !== paymentId);
  const afterMetrics = computeDebtMetrics({ ...raw, payments: nextPayments });
  if (afterMetrics.remainingCentavos > 0 && (raw.wasCompleted || raw.isArchived)) {
    if (isSupabaseConfigured) {
      const { error: restoreErr } = await supabase
        .from('debts')
        .update({ was_completed: false, is_archived: false })
        .eq('id', debtId)
        .eq('user_id', userId);
      if (restoreErr && !isMissingTableError(restoreErr)) {
        throwUserSafeError('deleteDebtPayment.restoreActive', restoreErr);
      }
    }
    raw.wasCompleted = false;
    raw.isArchived = false;
  }

  raw.payments = nextPayments;
  writeFallbackData(userId);
  return computeDebtMetrics(raw);
}

// ======================== WALLET & ACCOUNTS API ========================

export async function getAccounts(includeArchived = false): Promise<AccountWallet[]> {
  await ensureStateLoaded();
  const rawList = includeArchived ? state.accounts : state.accounts.filter((a) => !a.isArchived);
  return rawList.map(computeAccountMetrics);
}

export async function getAccountById(id: string): Promise<AccountWallet | undefined> {
  await ensureStateLoaded();
  const raw = state.accounts.find((a) => a.id === id);
  return raw ? computeAccountMetrics(raw) : undefined;
}

export async function addAccount(data: {
  name: string;
  nickname?: string;
  type: AccountType;
  last4?: string;
  accountNumber?: string;
  startingBalanceCentavos: number;
  color: string;
  textColor?: string;
}): Promise<AccountWallet> {
  const userId = await ensureStateLoaded();
  if (!data.name.trim()) {
    throw new UserSafeError('Account name is required.');
  }
  if (data.startingBalanceCentavos < 0) {
    throw new UserSafeError('Enter an amount greater than or equal to ₱0.');
  }

  const digitsOnlyFromNumber = data.accountNumber
    ? data.accountNumber.replace(/\D/g, '')
    : '';
  let last4 = (data.last4 || '').replace(/\D/g, '').slice(-4);
  if (!last4 && digitsOnlyFromNumber.length >= 4) {
    last4 = digitsOnlyFromNumber.slice(-4);
  } else if (!last4 && data.accountNumber && data.accountNumber.trim().length >= 4) {
    last4 = data.accountNumber.trim().slice(-4);
  }

  const accId = crypto.randomUUID();
  const todayStr = getManilaDateString();
  const now = Date.now();
  const normalizedType = fromDbAccountType(data.type);

  const newRaw: RawAccount = {
    id: accId,
    name: data.name.trim(),
    nickname: data.nickname?.trim(),
    type: normalizedType,
    openingBalanceCentavos: data.startingBalanceCentavos,
    last4,
    lastConfirmedDate: todayStr,
    color: data.color || '#EFECE6',
    textColor: data.textColor,
    isArchived: false,
    sortOrder: state.accounts.length,
    transactions: [],
  };

  await insertAccountRow(userId, newRaw, state.accounts.length);

  state.accounts = [...state.accounts, newRaw];
  writeFallbackData(userId);
  return computeAccountMetrics(newRaw);
}

export async function updateAccountBalance(
  id: string,
  actualBalanceCentavos: number
): Promise<{ account: AccountWallet; adjustment: AccountTransaction | null }> {
  const userId = await ensureStateLoaded();
  const raw = state.accounts.find((a) => a.id === id);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  const currentMetrics = computeAccountMetrics(raw);
  const difference = actualBalanceCentavos - currentMetrics.balanceCentavos;
  const todayStr = getManilaDateString();
  const confirmedAtIso = new Date().toISOString();
  const now = Date.now();

  let adjustment: AccountTransaction | null = null;

  if (difference !== 0) {
    const absDifference = Math.abs(difference);
    adjustment = {
      id: crypto.randomUUID(),
      accountId: id,
      type: 'adjustment',
      direction: difference > 0 ? 'inflow' : 'outflow',
      amountCentavos: absDifference,
      description:
        difference > 0
          ? `Balance adjustment (+${formatPHP(absDifference)})`
          : `Balance adjustment (-${formatPHP(absDifference)})`,
      source: 'Manual',
      date: todayStr,
      time: '12:00',
      createdAt: now,
    };

    await insertTransactionRow(userId, adjustment, true);
  }

  if (isSupabaseConfigured) {
    const { error: accErr } = await supabase
      .from('accounts')
      .update({ balance_confirmed_at: confirmedAtIso })
      .eq('id', id)
      .eq('user_id', userId);
    if (accErr && !isMissingColumnError(accErr)) {
      throwUserSafeError('updateAccountBalance.balanceConfirmedAt', accErr);
    }
  }

  if (adjustment) {
    raw.transactions = [adjustment, ...(raw.transactions || [])];
  }
  raw.lastConfirmedDate = todayStr;
  writeFallbackData(userId);

  return {
    account: computeAccountMetrics(raw),
    adjustment,
  };
}

export async function addAccountTransaction(
  accountId: string,
  tx: Omit<AccountTransaction, 'id' | 'createdAt'>
): Promise<AccountWallet> {
  const userId = await ensureStateLoaded();
  const raw = state.accounts.find((a) => a.id === accountId);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  const newTx: AccountTransaction = {
    ...tx,
    source: tx.source || 'Manual',
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  await insertTransactionRow(userId, newTx, true);

  raw.transactions = [newTx, ...(raw.transactions || [])];
  writeFallbackData(userId);
  return computeAccountMetrics(raw);
}

export async function updateGoalBackingAccount(
  goalId: string,
  backingAccountName: string
): Promise<void> {
  const userId = await ensureStateLoaded();
  const goal = state.savingsGoals.find((g) => g.id === goalId);
  if (goal) {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('savings_goals')
        .update({ backing_account: backingAccountName })
        .eq('id', goalId)
        .eq('user_id', userId);
      if (error && !isMissingTableError(error)) {
        throwUserSafeError('updateGoalBackingAccount', error);
      }
    }
    goal.backingAccount = backingAccountName;
    writeFallbackData(userId);
  }
}

export async function archiveAccount(id: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  const raw = state.accounts.find((a) => a.id === id);
  if (!raw) throw new UserSafeError(GENERIC_USER_ERROR);

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('accounts')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      throwUserSafeError('archiveAccount', error);
    }
  }

  raw.isArchived = true;
  writeFallbackData(userId);
  return true;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      throwUserSafeError('deleteAccount', error);
    }
  }

  state.accounts = state.accounts.filter((a) => a.id !== id);
  writeFallbackData(userId);
  return true;
}

/**
 * PASTE IMPORT PARSER (Local rules, no raw message stored, OTPs stripped)
 */
export function parseBankOrWalletMessage(
  rawMessage: string,
  accounts: AccountWallet[],
  recordedReferences?: string[]
): { parsed: ParsedMessageResult | null; error?: string } {
  if (!rawMessage || !rawMessage.trim()) {
    return { parsed: null, error: 'Please paste a message.' };
  }

  let cleaned = rawMessage
    .replace(
      /(?:OTP|one-time\s*pin|verification\s*code|auth\s*code|pin\s*code|security\s*code|code)\s*[:is\-]*\s*([0-9]{4,8})/gi,
      ''
    )
    .replace(/\b(?:code|pin|otp)\s+is\s+([0-9]{4,8})/gi, '')
    .replace(/\b[0-9]{4,8}\s+is\s+your\s+(?:otp|code|verification|pin)/gi, '')
    .replace(/\b\d{12,19}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const amountMatch = cleaned.match(
    /(?:PHP|Php|php|₱|amount\s*(?:of)?|paid|received|sent|debited|credited|transferred)\s*[:\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i
  );

  if (!amountMatch) {
    return { parsed: null, error: 'No transaction found in this message.' };
  }

  const rawAmountStr = amountMatch[1].replace(/,/g, '');
  const numericPesos = parseFloat(rawAmountStr);
  if (isNaN(numericPesos) || numericPesos <= 0) {
    return { parsed: null, error: 'No transaction found in this message.' };
  }
  const amountCentavos = pesosToCentavos(numericPesos);

  const isCredit =
    /(?:received|credited|cash\s*in|incoming|deposit|refund|has\s+sent\s+you|transfer\s+from)/i.test(
      cleaned
    );
  const direction: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

  let merchant = '';
  const toMatch = cleaned.match(
    /(?:to|at|paid to)\s+([A-Za-z0-9\s.,&'-]+?)(?:\s+(?:on|via|ref|using|with|balance|amount|\.|\n)|$)/i
  );
  const fromMatch = cleaned.match(
    /(?:from|received from)\s+([A-Za-z0-9\s.,&'-]+?)(?:\s+(?:on|via|ref|using|with|balance|amount|\.|\n)|$)/i
  );

  if (direction === 'credit' && fromMatch) {
    merchant = fromMatch[1].trim();
  } else if (toMatch) {
    merchant = toMatch[1].trim();
  } else {
    merchant = direction === 'credit' ? 'Incoming transfer' : 'Store purchase';
  }

  merchant = merchant.replace(/^[.\s]+|[.\s]+$/g, '');
  if (merchant.length > 30) {
    merchant = merchant.slice(0, 30).trim();
  }

  let referenceNumber = '';
  const refMatch = cleaned.match(
    /(?:Ref\.?\s*(?:No\.?)?|Reference(?:\s*No\.?)?|Trace\s*ID|Txn\s*ID)[:\s#]*([A-Za-z0-9]{5,20})/i
  );
  if (refMatch) {
    referenceNumber = refMatch[1].trim();
  }

  const knownRefs = recordedReferences || state.recordedReferenceNumbers || [];
  const isDuplicate = Boolean(
    referenceNumber &&
      (knownRefs.includes(referenceNumber) ||
        (state.expenses || []).some((e) => e.note?.includes(referenceNumber)) ||
        (state.accounts || []).some((a) =>
          (a.transactions || []).some((t) => t.referenceNumber === referenceNumber)
        ))
  );

  let suggestedAccount = accounts[0];
  const lowerCleaned = cleaned.toLowerCase();
  if (lowerCleaned.includes('gcash')) {
    const match = accounts.find((a) => a.name.toLowerCase().includes('gcash'));
    if (match) suggestedAccount = match;
  } else if (lowerCleaned.includes('maya') || lowerCleaned.includes('paymaya')) {
    const match = accounts.find((a) => a.name.toLowerCase().includes('maya'));
    if (match) suggestedAccount = match;
  } else if (lowerCleaned.includes('bpi')) {
    const match = accounts.find((a) => a.name.toLowerCase().includes('bpi'));
    if (match) suggestedAccount = match;
  } else if (lowerCleaned.includes('gotyme')) {
    const match = accounts.find((a) => a.name.toLowerCase().includes('gotyme'));
    if (match) suggestedAccount = match;
  } else if (lowerCleaned.includes('unionbank') || lowerCleaned.includes('ubp')) {
    const match = accounts.find((a) => a.name.toLowerCase().includes('unionbank'));
    if (match) suggestedAccount = match;
  }

  const category = suggestCategoryFromTitle(merchant);

  return {
    parsed: {
      amountCentavos,
      merchant,
      direction,
      category,
      suggestedAccountId: suggestedAccount?.id,
      suggestedAccountName: suggestedAccount?.name || 'GCash',
      referenceNumber,
      isDuplicate,
    },
  };
}

export async function confirmImportedTransaction(params: {
  amountCentavos: number;
  merchant: string;
  direction: 'debit' | 'credit';
  category: CategoryName;
  accountId: string;
  accountName: string;
  referenceNumber?: string;
  date?: string;
  allowOverdraft?: boolean;
}): Promise<void> {
  const userId = await ensureStateLoaded();
  const txDate = params.date || getManilaDateString();
  const now = Date.now();
  const resolvedCat = resolveExpenseCategoryWithPool(state.categories, params.category);
  const rawAcc = state.accounts.find(
    (a) => a.id === params.accountId || a.name === params.accountName
  );

  const absAmount = Math.abs(Math.round(params.amountCentavos));

  if (params.direction === 'debit') {
    let overdraftConfirmed = false;
    if (rawAcc) {
      const check = await validateOutflowServerAndLocal({
        userId,
        account: rawAcc,
        requiredCentavos: absAmount,
        allowOverdraft: params.allowOverdraft,
      });
      overdraftConfirmed = check.overdraftConfirmed;
    }

    const txId = crypto.randomUUID();
    const noteText = params.referenceNumber ? `Ref: ${params.referenceNumber}` : undefined;
    const accTx: AccountTransaction = {
      id: txId,
      accountId: rawAcc ? rawAcc.id : '',
      type: 'expense',
      direction: 'outflow',
      amountCentavos: absAmount,
      description: params.merchant,
      note: noteText,
      category: resolvedCat.label,
      categoryId: resolvedCat.id,
      source: 'Paste import',
      date: txDate,
      referenceNumber: params.referenceNumber,
      overdraftConfirmed,
      createdAt: now,
    };

    await insertTransactionRow(userId, accTx, true);

    const newExpense: Expense = {
      id: txId,
      title: params.merchant,
      amountCentavos: absAmount,
      category: resolvedCat.label,
      categoryId: resolvedCat.id,
      date: txDate,
      account: rawAcc?.name || params.accountName,
      note: noteText,
      overdraftConfirmed,
      createdAt: now,
    };

    state.expenseCategoryMeta[txId] = {
      categoryId: resolvedCat.id,
      categoryLabel: resolvedCat.label,
      subcategoryId: null,
      subcategoryLabel: null,
      overdraftConfirmed,
    };
    state.expenses = [newExpense, ...state.expenses];
    if (rawAcc) {
      rawAcc.transactions = [accTx, ...(rawAcc.transactions || [])];
    }
  } else if (rawAcc) {
    const accTx: AccountTransaction = {
      id: crypto.randomUUID(),
      accountId: rawAcc.id,
      type: 'income',
      direction: 'inflow',
      amountCentavos: absAmount,
      description: `Deposit: ${params.merchant}`,
      category: resolvedCat.label,
      categoryId: resolvedCat.id,
      source: 'Paste import',
      date: txDate,
      referenceNumber: params.referenceNumber,
      createdAt: now,
    };
    await insertTransactionRow(userId, accTx, true);
    rawAcc.transactions = [accTx, ...(rawAcc.transactions || [])];
  }

  if (params.referenceNumber) {
    if (!state.recordedReferenceNumbers) state.recordedReferenceNumbers = [];
    if (!state.recordedReferenceNumbers.includes(params.referenceNumber)) {
      state.recordedReferenceNumbers.push(params.referenceNumber);
      await updateProfileFields(userId, {
        recorded_reference_numbers: state.recordedReferenceNumbers,
      });
    }
  }

  writeFallbackData(userId);
}

export function computeChecklistProgress(items: ChecklistItem[]): ChecklistProgressInfo {
  const total = items.length;
  const completed = items.filter((c) => c.status === 'Done' || c.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const label = total === 0 ? '0% (0 tasks)' : `${percentage}% (${completed} of ${total} tasks)`;

  let mascotState: 1 | 2 | 3 | 4 | 5 = 1;
  let mascotCaption = 'There is still much to do.';

  if (total > 0 && percentage >= 100) {
    mascotState = 5;
    mascotCaption = 'Congratulations, you completed your tasks!';
  } else if (percentage >= 75) {
    mascotState = 4;
    mascotCaption = 'Almost done!';
  } else if (percentage >= 50) {
    mascotState = 3;
    mascotCaption = 'Halfway there!';
  } else if (percentage >= 25) {
    mascotState = 2;
    mascotCaption = "You've started. Keep going!";
  } else {
    mascotState = 1;
    mascotCaption = 'There is still much to do.';
  }

  return {
    total,
    completed,
    percentage,
    label,
    mascotState,
    mascotCaption,
  };
}

export async function getChecklist(): Promise<ChecklistItem[]> {
  await ensureStateLoaded();
  return [...state.checklist].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getChecklistProgress(): Promise<ChecklistProgressInfo> {
  await ensureStateLoaded();
  return computeChecklistProgress(state.checklist);
}

export async function toggleChecklistTask(id: string): Promise<{
  items: ChecklistItem[];
  progress: ChecklistProgressInfo;
  isNewlyCompletedAll: boolean;
}> {
  const userId = await ensureStateLoaded();
  const prevProgress = computeChecklistProgress(state.checklist);
  const item = state.checklist.find((c) => c.id === id);

  if (item) {
    const isCurrentlyDone = item.status === 'Done' || !!item.completed;
    if (isCurrentlyDone) {
      item.status = item.wasStartedBefore ? 'In progress' : 'Not started';
      item.completed = false;
      item.completedAt = undefined;
    } else {
      item.status = 'Done';
      item.completed = true;
      item.completedAt = Date.now();
    }

    const updatePayload = {
      status: item.status,
      completed: item.completed,
      completed_at: item.completedAt || null,
    };
    if (isSupabaseConfigured) {
      let { error } = await supabase
        .from('checklist_items')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId);
      if (error && isTimestampTypeError(error)) {
        ({ error } = await supabase
          .from('checklist_items')
          .update(withIsoTimestamps(updatePayload))
          .eq('id', id)
          .eq('user_id', userId));
      }
      if (error && !isMissingTableError(error)) {
        throwUserSafeError('toggleChecklistTask', error);
      }
    }

    writeFallbackData(userId);
  }

  const newProgress = computeChecklistProgress(state.checklist);
  const isNewlyCompletedAll =
    prevProgress.percentage < 100 && newProgress.percentage === 100 && newProgress.total > 0;

  return {
    items: [...state.checklist].sort((a, b) => a.sortOrder - b.sortOrder),
    progress: newProgress,
    isNewlyCompletedAll,
  };
}

export async function cycleChecklistTaskStatus(id: string): Promise<{
  items: ChecklistItem[];
  progress: ChecklistProgressInfo;
  isNewlyCompletedAll: boolean;
}> {
  const userId = await ensureStateLoaded();
  const prevProgress = computeChecklistProgress(state.checklist);
  const item = state.checklist.find((c) => c.id === id);

  if (item) {
    if (item.status === 'Not started') {
      item.status = 'In progress';
      item.wasStartedBefore = true;
      item.completed = false;
      item.completedAt = undefined;
    } else if (item.status === 'In progress') {
      item.status = 'Done';
      item.completed = true;
      item.completedAt = Date.now();
    } else {
      item.status = 'Not started';
      item.wasStartedBefore = false;
      item.completed = false;
      item.completedAt = undefined;
    }

    const cyclePayload = {
      status: item.status,
      was_started_before: Boolean(item.wasStartedBefore),
      completed: Boolean(item.completed),
      completed_at: item.completedAt || null,
    };
    if (isSupabaseConfigured) {
      let { error } = await supabase
        .from('checklist_items')
        .update(cyclePayload)
        .eq('id', id)
        .eq('user_id', userId);
      if (error && isTimestampTypeError(error)) {
        ({ error } = await supabase
          .from('checklist_items')
          .update(withIsoTimestamps(cyclePayload))
          .eq('id', id)
          .eq('user_id', userId));
      }
      if (error && !isMissingTableError(error)) {
        throwUserSafeError('cycleChecklistTaskStatus', error);
      }
    }

    writeFallbackData(userId);
  }

  const newProgress = computeChecklistProgress(state.checklist);
  const isNewlyCompletedAll =
    prevProgress.percentage < 100 && newProgress.percentage === 100 && newProgress.total > 0;

  return {
    items: [...state.checklist].sort((a, b) => a.sortOrder - b.sortOrder),
    progress: newProgress,
    isNewlyCompletedAll,
  };
}

export async function addChecklistTask(data: {
  title: string;
  category: ChecklistCategory;
  dueDate?: string;
}): Promise<ChecklistItem> {
  const userId = await ensureStateLoaded();
  const trimmed = data.title.trim();
  const now = Date.now();
  const newItem: ChecklistItem = {
    id: crypto.randomUUID(),
    title: trimmed,
    text: trimmed,
    category: data.category,
    status: 'Not started',
    completed: false,
    wasStartedBefore: false,
    dueDate: data.dueDate || undefined,
    sortOrder: state.checklist.length,
  };

  const chkPayload = {
    id: newItem.id,
    user_id: userId,
    title: newItem.title,
    category: newItem.category,
    status: newItem.status,
    was_started_before: false,
    completed: false,
    due_date: newItem.dueDate || null,
    completed_at: null,
    sort_order: newItem.sortOrder,
    created_at: now,
  };

  if (isSupabaseConfigured) {
    let { error } = await supabase.from('checklist_items').insert(chkPayload);
    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase.from('checklist_items').insert(withIsoTimestamps(chkPayload)));
    }

    if (error && !isMissingTableError(error)) {
      throwUserSafeError('addChecklistTask', error);
    }
  }

  state.checklist = [...state.checklist, newItem];
  writeFallbackData(userId);
  return newItem;
}

export async function updateChecklistTask(
  id: string,
  updates: Partial<ChecklistItem>
): Promise<ChecklistItem> {
  const userId = await ensureStateLoaded();
  const item = state.checklist.find((c) => c.id === id);
  if (!item) {
    throw new UserSafeError(GENERIC_USER_ERROR);
  }

  if (updates.title !== undefined) {
    item.title = updates.title.trim();
    item.text = updates.title.trim();
  }
  if (updates.category !== undefined) {
    item.category = updates.category;
  }
  if (updates.dueDate !== undefined) {
    item.dueDate = updates.dueDate || undefined;
  }
  if (updates.status !== undefined) {
    item.status = updates.status;
    if (updates.status === 'Done') {
      item.completed = true;
      item.completedAt = item.completedAt || Date.now();
    } else {
      item.completed = false;
      item.completedAt = undefined;
      if (updates.status === 'In progress') {
        item.wasStartedBefore = true;
      }
    }
  }

  const chkUpdatePayload = {
    title: item.title,
    category: item.category,
    due_date: item.dueDate || null,
    status: item.status,
    completed: Boolean(item.completed),
    completed_at: item.completedAt || null,
    was_started_before: Boolean(item.wasStartedBefore),
  };

  if (isSupabaseConfigured) {
    let { error } = await supabase
      .from('checklist_items')
      .update(chkUpdatePayload)
      .eq('id', id)
      .eq('user_id', userId);

    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase
        .from('checklist_items')
        .update(withIsoTimestamps(chkUpdatePayload))
        .eq('id', id)
        .eq('user_id', userId));
    }

    if (error && !isMissingTableError(error)) {
      throwUserSafeError('updateChecklistTask', error);
    }
  }

  writeFallbackData(userId);
  return { ...item };
}

export async function deleteChecklistTask(id: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  const initialLength = state.checklist.length;

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('deleteChecklistTask', error);
    }
  }

  state.checklist = state.checklist.filter((c) => c.id !== id);
  if (state.checklist.length !== initialLength) {
    writeFallbackData(userId);
    return true;
  }
  return false;
}

export async function toggleChecklistItem(id: string): Promise<ChecklistItem[]> {
  const res = await toggleChecklistTask(id);
  return res.items;
}

export async function addChecklistItem(text: string): Promise<ChecklistItem> {
  return addChecklistTask({
    title: text,
    category: 'General',
  });
}

// ======================== NOTES PIN & DIARY API ========================

export const MOOD_CONFIGS: Record<
  DiaryMood,
  { emoji: string; label: string; bg: string; text: string; border: string }
> = {
  Happy: { emoji: '😊', label: 'Happy', bg: '#FEF3CF', text: '#5A450F', border: '#FCE59F' },
  Calm: { emoji: '😌', label: 'Calm', bg: '#D9F3E5', text: '#134D31', border: '#BBE8CE' },
  Excited: { emoji: '🎉', label: 'Excited', bg: '#FCE3D0', text: '#5C3110', border: '#F8C8A3' },
  Grateful: { emoji: '🥰', label: 'Grateful', bg: '#F7DFE2', text: '#531D28', border: '#F1C1C8' },
  Inspired: { emoji: '✨', label: 'Inspired', bg: '#EAE3F7', text: '#3D275E', border: '#D7C7F0' },
  Tired: { emoji: '😴', label: 'Tired', bg: '#EFECE6', text: '#423C35', border: '#DDD8CE' },
  Anxious: { emoji: '😰', label: 'Anxious', bg: '#D9E8FA', text: '#153C66', border: '#BED8F6' },
  Sad: { emoji: '😢', label: 'Sad', bg: '#E0E7FF', text: '#2A3568', border: '#C7D2FE' },
  Frustrated: { emoji: '😠', label: 'Frustrated', bg: '#FEE2E2', text: '#7F1D1D', border: '#FECACA' },
  Yearning: { emoji: '🥺', label: 'Yearning', bg: '#F2DCEB', text: '#3A2E33', border: '#E3BDD8' },
};

interface MoodRule {
  mood: DiaryMood;
  emojis: string[];
  patterns: RegExp[];
}

const MOOD_RULES: MoodRule[] = [
  {
    mood: 'Tired',
    emojis: ['😴', '🥱'],
    patterns: [
      /\b(?:tired|exhausted|heavy|sleepy|drained|weary|fatigue|fatigued|burnout|drowsy|boring|bored|pagod|napagod|nakakapagod|antok|inaantok|nakakabagot|mabigat|bigat)\b/gi,
      /\bburn(?:ed|t)\s+out\b/gi,
    ],
  },
  {
    mood: 'Happy',
    emojis: ['😊', '😄'],
    patterns: [
      /\b(?:happy|smile|smiling|joy|joyful|fun|love|loved|delight|delighted|wonderful|glad|cheerful|masaya|saya|yehey)\b/gi,
    ],
  },
  {
    mood: 'Sad',
    emojis: ['😢', '😭'],
    patterns: [
      /\b(?:sad|cry|crying|cried|tears|gloomy|lonely|heartbroken|hurt|unhappy|miserable|malungkot|lungkot|iyak|umiiyak|naiiyak)\b/gi,
    ],
  },
  {
    mood: 'Frustrated',
    emojis: ['😠', '😡'],
    patterns: [
      /\b(?:frustrated|frustrating|annoyed|annoying|angry|mad|furious|unfair|irritated|ugh|galit|nagagalit|inis|naiinis|nakakainis|badtrip|bwisit)\b/gi,
      /\bbad\s+trip\b/gi,
    ],
  },
  {
    mood: 'Anxious',
    emojis: ['😰', '😨'],
    patterns: [
      /\b(?:anxious|anxiety|nervous|worried|worry|stress|stressed|stressful|fear|scared|panic|panicking|uneasy|overwhelmed|kinakabahan|kaba|nag-aalala|takot|natatakot)\b/gi,
    ],
  },
  {
    mood: 'Grateful',
    emojis: ['🥰'],
    patterns: [
      /\b(?:grateful|thank|thanks|thankful|blessed|appreciate|appreciated|relief|relieved|salamat)\b/gi,
    ],
  },
  {
    mood: 'Excited',
    emojis: ['🎉'],
    patterns: [
      /\b(?:excited|hype|hyped|yay|celebrate|celebrating|won|party|thrilled|omg|pumped|eager)\b/gi,
      /\bcan'?t\s+wait\b/gi,
    ],
  },
  {
    mood: 'Inspired',
    emojis: ['✨'],
    patterns: [
      /\b(?:inspired|inspire|inspiring|motivated|motivate|proud|dream|creative|determined|ambitious|idea|ideas)\b/gi,
    ],
  },
  {
    mood: 'Calm',
    emojis: ['😌'],
    patterns: [
      /\b(?:calm|peaceful|quiet|peace|relax|relaxed|relaxing|breathe|chill|rest|resting|serene|gentle|kalma|payapa)\b/gi,
    ],
  },
  {
    mood: 'Yearning',
    emojis: ['🥺', '💭'],
    patterns: [
      /\b(?:miss\s+na\s+kita|sana\s+n?andito\s+ka|miss|missing|missed|namiss|hinahanap|longing|nostalgic|nostalgia|homesick|yearning|yearn)\b/gi,
    ],
  },
];

export function detectMoodFromText(text: string): { mood: DiaryMood; matched: boolean } {
  if (!text || !text.trim()) {
    return { mood: 'Calm', matched: false };
  }

  let bestMood: DiaryMood | null = null;
  let bestCount = 0;
  let bestLastIndex = -1;

  for (const rule of MOOD_RULES) {
    let count = 0;
    let lastIndex = -1;

    for (const emoji of rule.emojis) {
      let idx = text.indexOf(emoji);
      while (idx !== -1) {
        count += 1;
        if (idx > lastIndex) lastIndex = idx;
        idx = text.indexOf(emoji, idx + emoji.length);
      }
    }

    for (const pattern of rule.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        count += 1;
        if (match.index > lastIndex) {
          lastIndex = match.index;
        }
      }
    }

    if (count > 0) {
      if (count > bestCount || (count === bestCount && lastIndex > bestLastIndex)) {
        bestMood = rule.mood;
        bestCount = count;
        bestLastIndex = lastIndex;
      }
    }
  }

  if (!bestMood) {
    return { mood: 'Calm', matched: false };
  }

  return { mood: bestMood, matched: true };
}

export function suggestMoodFromText(text: string): DiaryMood {
  return detectMoodFromText(text).mood;
}

export async function getNotesPinState(): Promise<NotesPinState> {
  await ensureStateLoaded();
  if (!state.pinState) {
    state.pinState = { ...DEFAULT_UNCONFIGURED_PIN };
  }
  return { ...state.pinState };
}

export async function verifyNotesPin(enteredPin: string): Promise<{
  success: boolean;
  isLocked: boolean;
  remainingLockoutSeconds: number;
  attemptsLeft: number;
}> {
  const userId = await ensureStateLoaded();
  if (!state.pinState) {
    state.pinState = { ...DEFAULT_UNCONFIGURED_PIN };
  }

  const now = Date.now();
  if (state.pinState.lockedUntil && now < state.pinState.lockedUntil) {
    const remainingSeconds = Math.ceil((state.pinState.lockedUntil - now) / 1000);
    return {
      success: false,
      isLocked: true,
      remainingLockoutSeconds: remainingSeconds,
      attemptsLeft: 0,
    };
  }

  const hashed = hashPin(enteredPin);
  if (hashed === state.pinState.pinHash) {
    state.pinState.failedAttempts = 0;
    state.pinState.lockedUntil = 0;
    state.pinState.lockoutDurationLevel = 0;
    await updateProfileFields(userId, {
      notes_pin_failed_attempts: 0,
      notes_pin_locked_until: 0,
      notes_pin_lockout_level: 0,
    });
    return {
      success: true,
      isLocked: false,
      remainingLockoutSeconds: 0,
      attemptsLeft: 5,
    };
  } else {
    state.pinState.failedAttempts = (state.pinState.failedAttempts || 0) + 1;
    let isLocked = false;
    let remainingSeconds = 0;

    if (state.pinState.failedAttempts >= 5) {
      const nextLevel = (state.pinState.lockoutDurationLevel || 0) + 1;
      state.pinState.lockoutDurationLevel = nextLevel;

      let durationSec = 60;
      if (nextLevel === 2) durationSec = 300;
      if (nextLevel >= 3) durationSec = 900;

      state.pinState.lockedUntil = now + durationSec * 1000;
      isLocked = true;
      remainingSeconds = durationSec;
    }

    await updateProfileFields(userId, {
      notes_pin_failed_attempts: state.pinState.failedAttempts,
      notes_pin_locked_until: state.pinState.lockedUntil,
      notes_pin_lockout_level: state.pinState.lockoutDurationLevel,
    });

    return {
      success: false,
      isLocked,
      remainingLockoutSeconds: remainingSeconds,
      attemptsLeft: Math.max(0, 5 - state.pinState.failedAttempts),
    };
  }
}

export async function setNotesPin(newPin: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  if (!state.pinState) {
    state.pinState = { ...DEFAULT_UNCONFIGURED_PIN };
  }
  state.pinState.pinHash = hashPin(newPin);
  state.pinState.isConfigured = true;
  state.pinState.failedAttempts = 0;
  state.pinState.lockedUntil = 0;
  state.pinState.lockoutDurationLevel = 0;

  await updateProfileFields(userId, {
    notes_pin_hash: state.pinState.pinHash,
    notes_pin_configured: true,
    notes_pin_failed_attempts: 0,
    notes_pin_locked_until: 0,
    notes_pin_lockout_level: 0,
  });

  return true;
}

export async function resetNotesPinWithPassword(
  accountPassword: string,
  newPin: string
): Promise<boolean> {
  if (!accountPassword || !accountPassword.trim()) {
    throw new UserSafeError('Please enter your account password.');
  }

  if (!isSupabaseConfigured) {
    const uid = await requireUserId();
    const localUser = readLocalUsers().find((u) => u.id === uid);
    if (!localUser) {
      throw new UserSafeError('Please sign in again to reset your Notes PIN.');
    }
    if (localUser.passwordHash !== hashLocalPassword(localUser.email, accountPassword)) {
      throw new UserSafeError('Account password is incorrect.');
    }
    return setNotesPin(newPin);
  }

  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) {
    throw new UserSafeError('Please sign in again to reset your Notes PIN.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: accountPassword,
  });

  if (error) {
    console.error('[Chestlist][resetNotesPinWithPassword]', error);
    throw new UserSafeError('Account password is incorrect.');
  }

  return setNotesPin(newPin);
}

export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  await ensureStateLoaded();
  return [...(state.diaryEntries || [])].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getDiaryEntryById(id: string): Promise<DiaryEntry | undefined> {
  await ensureStateLoaded();
  return (state.diaryEntries || []).find((e) => e.id === id);
}

export const DAILY_MOOD_READING_LIMIT = 50;
export const MOOD_ANALYSIS_PRIVACY_TEXT =
  'When you save an entry or tap Find songs, your entry is sent to our AI service to read its mood. You can turn this off in settings.';

export class DailyReadingLimitError extends UserSafeError {
  constructor() {
    super('Daily reading limit reached. You can still pick a mood yourself.');
    this.name = 'DailyReadingLimitError';
  }
}

export function hashDiaryText(text: string): string {
  const normalized = text.trim();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function countDiaryWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

function autoReadSettingKey(): string {
  return `chestlist_auto_read_mood_${activeUserId || 'anon'}`;
}

export function getAutoReadMoodOnSaveSetting(): boolean {
  try {
    const val = localStorage.getItem(autoReadSettingKey());
    if (val === null) return true;
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setAutoReadMoodOnSaveSetting(enabled: boolean): void {
  try {
    localStorage.setItem(autoReadSettingKey(), enabled ? 'true' : 'false');
  } catch {
    // ignore storage access issues
  }
}

function dailyReadingCountKey(): string {
  return `chestlist_ai_reads_${activeUserId || 'anon'}_${getManilaDateString()}`;
}

export function getDailyMoodReadingCount(): number {
  try {
    const raw = localStorage.getItem(dailyReadingCountKey());
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

export function hasReachedDailyMoodReadingLimit(): boolean {
  return getDailyMoodReadingCount() >= DAILY_MOOD_READING_LIMIT;
}

function incrementDailyMoodReadingCount(): number {
  const next = getDailyMoodReadingCount() + 1;
  try {
    localStorage.setItem(dailyReadingCountKey(), String(next));
  } catch {
    // ignore storage access issues
  }
  return next;
}

function normalizeAiMood(rawMood: unknown, fallbackText: string): DiaryMood {
  const validMoods = Object.keys(MOOD_CONFIGS) as DiaryMood[];
  if (typeof rawMood === 'string') {
    const found = validMoods.find(
      (m) => m.toLowerCase() === rawMood.trim().toLowerCase()
    );
    if (found) return found;
  }
  return detectMoodFromText(fallbackText).mood;
}

function normalizeDetectedLanguage(rawLang: unknown): DiaryDetectedLanguage {
  if (typeof rawLang === 'string') {
    const lower = rawLang.trim().toLowerCase();
    if (lower.includes('taglish')) return 'Taglish';
    if (lower.includes('tagalog') || lower.includes('filipino') || lower === 'tl') {
      return 'Tagalog';
    }
    if (lower.includes('english') || lower === 'en') return 'English';
  }
  return 'English';
}

function normalizeAiEnergy(rawEnergy: unknown): SongEnergy {
  if (typeof rawEnergy === 'string') {
    const lower = rawEnergy.trim().toLowerCase();
    if (lower === 'low' || lower === 'medium' || lower === 'high') {
      return lower;
    }
  }
  return 'medium';
}

export interface AnalyzeNoteResult {
  mood: DiaryMood;
  language: DiaryDetectedLanguage;
  summary: string;
  energy: SongEnergy;
  themes: string[];
  analyzedHash: string;
}

export async function analyzeDiaryNote(params: {
  entryId?: string;
  content: string;
}): Promise<AnalyzeNoteResult> {
  const trimmed = params.content.trim();
  if (countDiaryWords(trimmed) < 3) {
    throw new UserSafeError("Couldn't read your entry. Using a simple estimate instead.");
  }

  if (hasReachedDailyMoodReadingLimit()) {
    throw new DailyReadingLimitError();
  }

  incrementDailyMoodReadingCount();

  let responseData: any = null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-note', {
        body: {
          content: trimmed,
          text: trimmed,
          entryId: params.entryId,
        },
      });
      if (!error && data && typeof data === 'object') {
        responseData = data;
      }
    } catch {
      // Fall through to local server /api/analyze-note
    }
  }

  if (!responseData) {
    try {
      const res = await fetch('/api/analyze-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        throw new UserSafeError("Couldn't read your entry. Using a simple estimate instead.");
      }
      const data = await res.json();
      if (!data || typeof data !== 'object') {
        throw new UserSafeError("Couldn't read your entry. Using a simple estimate instead.");
      }
      responseData = data;
    } catch (err) {
      if (err instanceof DailyReadingLimitError || err instanceof UserSafeError) {
        throw err;
      }
      throw new UserSafeError("Couldn't read your entry. Using a simple estimate instead.");
    }
  }

  const mood = normalizeAiMood(responseData.mood, trimmed);
  const language = normalizeDetectedLanguage(responseData.language);
  const summary =
    typeof responseData.summary === 'string' && responseData.summary.trim()
      ? responseData.summary.trim()
      : typeof responseData.oneLineSummary === 'string' && responseData.oneLineSummary.trim()
      ? responseData.oneLineSummary.trim()
      : typeof responseData.one_line_summary === 'string' && responseData.one_line_summary.trim()
      ? responseData.one_line_summary.trim()
      : '';
  const energy = normalizeAiEnergy(responseData.energy);
  const themes = Array.isArray(responseData.themes)
    ? responseData.themes
        .filter((t: unknown): t is string => typeof t === 'string' && Boolean(t.trim()))
        .map((t: string) => t.trim())
    : typeof responseData.theme === 'string' && responseData.theme.trim()
    ? [responseData.theme.trim()]
    : [];

  return {
    mood,
    language,
    summary,
    energy,
    themes,
    analyzedHash: hashDiaryText(trimmed),
  };
}

export async function saveDiaryEntry(data: {
  id?: string;
  date: string;
  content: string;
  mood?: DiaryMood;
  moodSource?: DiaryMoodSource;
  detectedLanguage?: DiaryDetectedLanguage;
  aiSummary?: string;
  aiEnergy?: SongEnergy;
  aiThemes?: string[];
  analyzedHash?: string;
  location?: string;
  stickers?: DiarySticker[];
  attachedSong?: AttachedSong | null;
}): Promise<DiaryEntry> {
  const userId = await ensureStateLoaded();
  const content = data.content.trim();
  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const moodSource: DiaryMoodSource = data.moodSource || (data.mood ? 'user' : 'auto');
  const mood: DiaryMood = data.mood || 'Calm';

  const entryDate = data.date || getManilaDateString();
  const [y, m, d] = entryDate.split('-').map(Number);
  const entryDateObj = new Date(y, m - 1, d);
  const formattedDate = entryDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const entryId = data.id || crypto.randomUUID();
  const existingIndex = state.diaryEntries.findIndex((e) => e.id === entryId);
  const existing = existingIndex >= 0 ? state.diaryEntries[existingIndex] : undefined;
  const now = Date.now();
  const contentHash = hashDiaryText(content);
  const existingHashMatches = Boolean(
    existing?.analyzedHash && existing.analyzedHash === contentHash
  );

  const savedEntry: DiaryEntry = {
    id: entryId,
    date: entryDate,
    formattedDate,
    content,
    wordCount,
    mood,
    moodSource,
    detectedLanguage:
      data.detectedLanguage !== undefined
        ? data.detectedLanguage
        : existingHashMatches
        ? existing?.detectedLanguage
        : undefined,
    aiSummary:
      data.aiSummary !== undefined
        ? data.aiSummary
        : existingHashMatches
        ? existing?.aiSummary
        : undefined,
    aiEnergy:
      data.aiEnergy !== undefined
        ? data.aiEnergy
        : existingHashMatches
        ? existing?.aiEnergy
        : undefined,
    aiThemes:
      data.aiThemes !== undefined
        ? data.aiThemes
        : existingHashMatches
        ? existing?.aiThemes
        : undefined,
    analyzedHash:
      data.analyzedHash !== undefined
        ? data.analyzedHash
        : existingHashMatches
        ? existing?.analyzedHash
        : undefined,
    location: data.location?.trim() || undefined,
    stickers: data.stickers !== undefined ? data.stickers : existing?.stickers || [],
    attachedSong:
      data.attachedSong === null
        ? undefined
        : data.attachedSong !== undefined
        ? data.attachedSong
        : existing?.attachedSong,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    body: content,
    title: content.slice(0, 30),
  };

  const diaryUpsertPayload: Record<string, any> = {
    id: savedEntry.id,
    user_id: userId,
    title: savedEntry.title || null,
    date: savedEntry.date,
    formatted_date: savedEntry.formattedDate || null,
    content: savedEntry.content,
    word_count: savedEntry.wordCount,
    mood: savedEntry.mood,
    mood_source: savedEntry.moodSource,
    location: savedEntry.location || null,
    stickers: savedEntry.stickers,
    attached_song: savedEntry.attachedSong || null,
    created_at: savedEntry.createdAt,
    updated_at: savedEntry.updatedAt,
  };

  const hasAiReading = Boolean(
    savedEntry.analyzedHash ||
      savedEntry.detectedLanguage ||
      savedEntry.aiSummary ||
      savedEntry.aiEnergy ||
      (savedEntry.aiThemes && savedEntry.aiThemes.length > 0)
  );

  if (hasAiReading) {
    if (savedEntry.detectedLanguage !== undefined) {
      diaryUpsertPayload.detected_language = savedEntry.detectedLanguage;
    }
    if (savedEntry.aiSummary !== undefined) {
      diaryUpsertPayload.ai_summary = savedEntry.aiSummary;
    }
    if (savedEntry.aiEnergy !== undefined) {
      diaryUpsertPayload.ai_energy = savedEntry.aiEnergy;
    }
    if (savedEntry.aiThemes !== undefined) {
      diaryUpsertPayload.ai_themes = savedEntry.aiThemes;
    }
    if (savedEntry.analyzedHash !== undefined) {
      diaryUpsertPayload.analyzed_hash = savedEntry.analyzedHash;
    }
  }

  if (isSupabaseConfigured) {
    let { error } = await supabase
      .from('diary_entries')
      .upsert(diaryUpsertPayload, { onConflict: 'id' });

    if (error && isTimestampTypeError(error)) {
      ({ error } = await supabase
        .from('diary_entries')
        .upsert(withIsoTimestamps(diaryUpsertPayload), { onConflict: 'id' }));
    }

    if (error && !isMissingTableError(error)) {
      throwUserSafeError('saveDiaryEntry.upsert', error);
    }
  }

  if (existingIndex >= 0) {
    state.diaryEntries = state.diaryEntries.map((e) =>
      e.id === entryId ? savedEntry : e
    );
  } else {
    state.diaryEntries = [savedEntry, ...state.diaryEntries];
  }
  state.notes = state.diaryEntries;
  writeFallbackData(userId);
  return { ...savedEntry };
}

export async function deleteDiaryEntry(id: string): Promise<boolean> {
  const userId = await ensureStateLoaded();
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error && !isMissingTableError(error)) {
      throwUserSafeError('deleteDiaryEntry', error);
    }
  }

  state.diaryEntries = state.diaryEntries.filter((e) => e.id !== id);
  state.notes = state.diaryEntries;
  writeFallbackData(userId);
  return true;
}

// ======================== SONG SUGGESTIONS & CATALOG API ========================

export async function getSongLanguageSetting(): Promise<SongLanguage> {
  await ensureStateLoaded();
  return fromDbSongLanguage(state.songLanguageSetting);
}

export async function setSongLanguageSetting(lang: SongLanguage): Promise<void> {
  const userId = await ensureStateLoaded();
  const normalized = fromDbSongLanguage(lang);
  state.songLanguageSetting = normalized;
  await updateProfileFields(userId, { song_language: songLanguageToDb(normalized) });
}

export async function recordSongFeedback(
  trackId: string,
  action: 'picked' | 'skipped',
  mood: DiaryMood
): Promise<void> {
  const userId = await ensureStateLoaded();
  if (!state.songFeedback) {
    state.songFeedback = [];
  }
  state.songFeedback.push({
    trackId,
    action,
    mood,
    timestamp: Date.now(),
  });
  await updateProfileFields(userId, { song_feedback: state.songFeedback });
}

export async function searchSongCatalog(query: string): Promise<CatalogSong[]> {
  const q = query.toLowerCase().trim();
  if (!q) {
    return MOCK_SONG_CATALOG.slice(0, 8);
  }
  return MOCK_SONG_CATALOG.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q)
  );
}

export async function suggestSongs(
  input:
    | string
    | {
        noteId?: string;
        content?: string;
        mood?: DiaryMood;
        energy?: SongEnergy;
        themes?: string[];
        language?: DiaryDetectedLanguage;
        summary?: string;
      }
): Promise<{ songs: CatalogSong[]; summary: string }> {
  await ensureStateLoaded();

  let content = '';
  let mood: DiaryMood = 'Calm';
  let inputEnergy: SongEnergy | undefined;
  let inputThemes: string[] = [];
  let inputLanguage: DiaryDetectedLanguage | undefined;
  let inputSummary: string | undefined;

  if (typeof input === 'string') {
    const entry = state.diaryEntries.find((e) => e.id === input);
    if (entry) {
      content = entry.content;
      mood = entry.mood;
      inputEnergy = entry.aiEnergy;
      inputThemes = entry.aiThemes || [];
      inputLanguage = entry.detectedLanguage;
      inputSummary = entry.aiSummary;
    }
  } else {
    if (input.noteId) {
      const entry = state.diaryEntries.find((e) => e.id === input.noteId);
      if (entry) {
        content = entry.content;
        mood = entry.mood;
        inputEnergy = entry.aiEnergy;
        inputThemes = entry.aiThemes || [];
        inputLanguage = entry.detectedLanguage;
        inputSummary = entry.aiSummary;
      }
    }
    if (input.content !== undefined) content = input.content;
    if (input.mood !== undefined) mood = input.mood;
    if (input.energy !== undefined) inputEnergy = input.energy;
    if (input.themes !== undefined) inputThemes = input.themes;
    if (input.language !== undefined) inputLanguage = input.language;
    if (input.summary !== undefined) inputSummary = input.summary;
  }

  const lower = content.toLowerCase();
  let estimatedEnergy: SongEnergy = inputEnergy || 'medium';
  if (!inputEnergy) {
    if (/tired|heavy|exhausted|sleepy|drained|weary|late|rain|sad|quiet|rest|nap|sleep|pagod|antok/i.test(lower)) {
      estimatedEnergy = 'low';
    } else if (
      /excited|party|won|yay|celebrate|thrilled|presentation|dance|high mark|omg|shout|hype/i.test(lower)
    ) {
      estimatedEnergy = 'high';
    }
  }

  let summary =
    inputSummary && inputSummary.trim()
      ? inputSummary.trim()
      : 'Gentle tunes curated to accompany your diary entry.';
  if (!inputSummary || !inputSummary.trim()) {
    if (estimatedEnergy === 'low' && (mood === 'Grateful' || mood === 'Calm' || mood === 'Happy')) {
      summary = 'You sound tired but happy and at peace today.';
    } else if (estimatedEnergy === 'low' && (mood === 'Tired' || mood === 'Sad')) {
      summary = 'A long, tiring day. Here are soft, comforting tracks to unwind.';
    } else if (estimatedEnergy === 'high' && (mood === 'Excited' || mood === 'Happy')) {
      summary = 'Celebratory and energetic vibes to match your happy milestone!';
    } else if (mood === 'Anxious' || mood === 'Frustrated') {
      summary = 'A bit overwhelmed today. Grounding rhythms to help you take a breather.';
    } else if (mood === 'Inspired') {
      summary = 'Creative spark in the air. Uplifting melodies to keep your momentum.';
    } else if (mood === 'Calm') {
      summary = 'Peaceful and steady vibes for your quiet reflections.';
    } else if (mood === 'Grateful') {
      summary = 'Heartfelt acoustic tunes matching your warm appreciation.';
    } else if (mood === 'Yearning') {
      summary = 'Tender, nostalgic tracks for missing someone or looking back.';
    }
  }

  const langSetting = state.songLanguageSetting || 'Mixed';
  const feedbackList = state.songFeedback || [];
  const normalizedThemes = inputThemes
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const scored = MOCK_SONG_CATALOG.map((song) => {
    let score = 0;

    if (song.moods.includes(mood)) {
      score += 15;
    } else if (
      mood === 'Yearning' &&
      (song.moods.includes('Sad') || song.moods.includes('Calm'))
    ) {
      score += 6;
    }

    if (song.energy === estimatedEnergy) {
      score += 8;
    } else if (
      (estimatedEnergy === 'medium' && (song.energy === 'low' || song.energy === 'high')) ||
      song.energy === 'medium'
    ) {
      score += 3;
    }

    if (normalizedThemes.length > 0) {
      const searchable = `${song.title} ${song.album} ${song.whyItFits}`.toLowerCase();
      for (const theme of normalizedThemes) {
        if (searchable.includes(theme)) {
          score += 5;
        }
      }
    }

    if (langSetting === 'OPM') {
      score += song.language === 'OPM' ? 10 : -15;
    } else if (langSetting === 'Western') {
      score += song.language === 'Western' ? 10 : -15;
    } else {
      if (inputLanguage === 'Tagalog') {
        score += song.language === 'OPM' ? 6 : 1;
      } else if (inputLanguage === 'English') {
        score += song.language === 'Western' ? 6 : 1;
      } else if (inputLanguage === 'Taglish') {
        score += song.language === 'OPM' ? 4 : 3;
      } else {
        score += 2;
      }
    }

    const pickedCount = feedbackList.filter(
      (f) => f.trackId === song.id && f.action === 'picked' && f.mood === mood
    ).length;
    const skippedCount = feedbackList.filter(
      (f) => f.trackId === song.id && f.action === 'skipped'
    ).length;

    score += pickedCount * 6;
    score -= skippedCount * 4;

    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    songs: scored.slice(0, 6).map((item) => item.song),
    summary,
  };
}

export async function getLifeNotes(): Promise<LifeNote[]> {
  return getDiaryEntries();
}

export async function addLifeNote(noteData: Omit<LifeNote, 'id'>): Promise<LifeNote> {
  return saveDiaryEntry({
    date: noteData.date || getManilaDateString(),
    content: noteData.body || noteData.title || '',
    mood: (noteData.category as any) || 'Calm',
  });
}

export async function deleteLifeNote(id: string): Promise<boolean> {
  return deleteDiaryEntry(id);
}

// ======================== SAMPLE DATA SEEDER & EXPORT ========================

function buildSampleAppState(): AppState {
  const week = getCurrentWeekRange();
  const mon = week.days[0].dateStr;
  const tue = week.days[1].dateStr;
  const wed = week.days[2].dateStr;

  const bpiId = crypto.randomUUID();
  const gcashId = crypto.randomUUID();
  const mayaId = crypto.randomUUID();
  const gotymeId = crypto.randomUUID();
  const ubId = crypto.randomUUID();
  const cashId = crypto.randomUUID();

  const elyuId = crypto.randomUUID();
  const gadgetId = crypto.randomUUID();

  const debtGcashId = crypto.randomUUID();
  const debtClassmateId = crypto.randomUUID();

  const baseTs = Date.now();

  const sampleAccounts: RawAccount[] = [
    {
      id: bpiId,
      name: 'BPI',
      nickname: 'Everyday Savings',
      type: 'Bank',
      openingBalanceCentavos: 715000,
      last4: '8421',
      lastConfirmedDate: formatManilaDateOffset(-2),
      color: '#F7DFE2',
      textColor: '#531D28',
      isArchived: false,
      sortOrder: 0,
      transactions: [
        {
          id: crypto.randomUUID(),
          accountId: bpiId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 90000,
          description: 'Groceries',
          note: 'Weekly essentials: rice, eggs, oatmilk, tofu, bananas',
          category: 'Food',
          categoryId: DEFAULT_CATEGORY_SEEDS[0].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[0].subcategories[7].id,
          source: 'Manual',
          date: mon,
          referenceNumber: 'BPI-98214',
          createdAt: baseTs - 70000,
        },
      ],
    },
    {
      id: gcashId,
      name: 'GCash',
      nickname: 'Main E-Wallet',
      type: 'E-wallet',
      openingBalanceCentavos: 372000,
      last4: '4920',
      lastConfirmedDate: formatManilaDateOffset(-1),
      color: '#D9E8FA',
      textColor: '#153C66',
      isArchived: false,
      sortOrder: 1,
      transactions: [
        {
          id: crypto.randomUUID(),
          accountId: gcashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 18000,
          description: 'Sisig',
          note: 'Dinner at Mang Tootz canteen',
          category: 'Food',
          categoryId: DEFAULT_CATEGORY_SEEDS[0].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[0].subcategories[6].id,
          source: 'Manual',
          date: wed,
          referenceNumber: 'GC-491028',
          createdAt: baseTs - 10000,
        },
        {
          id: crypto.randomUUID(),
          accountId: gcashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 42000,
          description: 'Jeepney and Grab',
          note: 'Commute to campus + rainy night Grab car share',
          category: 'Transport',
          categoryId: DEFAULT_CATEGORY_SEEDS[3].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[3].subcategories[0].id,
          source: 'Manual',
          date: tue,
          referenceNumber: 'GC-491001',
          createdAt: baseTs - 30000,
        },
      ],
    },
    {
      id: mayaId,
      name: 'Maya',
      nickname: 'Digital Payments',
      type: 'E-wallet',
      openingBalanceCentavos: 220000,
      last4: '7134',
      lastConfirmedDate: formatManilaDateOffset(-3),
      color: '#D9F3E5',
      textColor: '#134D31',
      isArchived: false,
      sortOrder: 2,
      transactions: [
        {
          id: crypto.randomUUID(),
          accountId: mayaId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 30000,
          description: 'Load',
          note: 'Mobile data promo for hotspot during power fluctuation',
          category: 'Bills',
          categoryId: DEFAULT_CATEGORY_SEEDS[10].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[10].subcategories[0].id,
          source: 'Manual',
          date: tue,
          referenceNumber: 'MY-77123',
          createdAt: baseTs - 50000,
        },
        {
          id: crypto.randomUUID(),
          accountId: mayaId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 45000,
          description: 'Lip tint',
          note: 'Local shade restock at Watsons',
          category: 'Beauty',
          categoryId: DEFAULT_CATEGORY_SEEDS[7].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[7].subcategories[0].id,
          source: 'Manual',
          date: mon,
          referenceNumber: 'MY-77002',
          createdAt: baseTs - 60000,
        },
      ],
    },
    {
      id: gotymeId,
      name: 'GoTyme',
      nickname: 'High-Interest Savings',
      type: 'Digital bank',
      openingBalanceCentavos: 300000,
      last4: '3389',
      lastConfirmedDate: formatManilaDateOffset(-4),
      color: '#D6EFEA',
      textColor: '#134B42',
      isArchived: false,
      sortOrder: 3,
      transactions: [
        {
          id: crypto.randomUUID(),
          accountId: gotymeId,
          type: 'transfer_in',
          direction: 'inflow',
          amountCentavos: 50000,
          description: 'Interest & Monthly Top-Up',
          source: 'Manual',
          date: formatManilaDateOffset(-4),
          referenceNumber: 'GT-338901',
          createdAt: baseTs - 300000,
        },
      ],
    },
    {
      id: ubId,
      name: 'UnionBank',
      nickname: 'Allowance Stash',
      type: 'Bank',
      openingBalanceCentavos: 200000,
      last4: '5812',
      lastConfirmedDate: formatManilaDateOffset(-9),
      color: '#FCE3D0',
      textColor: '#5C3110',
      isArchived: false,
      sortOrder: 4,
      transactions: [
        {
          id: crypto.randomUUID(),
          accountId: ubId,
          type: 'transfer_in',
          direction: 'inflow',
          amountCentavos: 200000,
          description: 'Monthly Allowance Transfer',
          source: 'Manual',
          date: formatManilaDateOffset(-9),
          referenceNumber: 'UB-58120',
          createdAt: baseTs - 800000,
        },
      ],
    },
    {
      id: cashId,
      name: 'Cash on hand',
      nickname: 'Physical Wallet',
      type: 'Cash stash',
      openingBalanceCentavos: 140000,
      last4: '',
      lastConfirmedDate: formatManilaDateOffset(-2),
      color: '#EFECE6',
      textColor: '#423C35',
      isArchived: false,
      sortOrder: 5,
      transactions: [
        {
          id: crypto.randomUUID(),
          accountId: cashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 12000,
          description: 'Milk tea',
          note: 'Okinawa milk tea 50% sugar',
          category: 'Food',
          categoryId: DEFAULT_CATEGORY_SEEDS[0].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[0].subcategories[5].id,
          source: 'Manual',
          date: wed,
          createdAt: baseTs - 20000,
        },
        {
          id: crypto.randomUUID(),
          accountId: cashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 26000,
          description: 'Photocopy',
          note: 'Readings for midterms review & thesis binding printout',
          category: 'Education',
          categoryId: DEFAULT_CATEGORY_SEEDS[9].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[9].subcategories[2].id,
          source: 'Manual',
          date: tue,
          createdAt: baseTs - 40000,
        },
        {
          id: crypto.randomUUID(),
          accountId: cashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 2000,
          description: 'Movie',
          note: 'Student cinema discount pass concession',
          category: 'Culture',
          categoryId: DEFAULT_CATEGORY_SEEDS[4].id,
          subcategoryId: DEFAULT_CATEGORY_SEEDS[4].subcategories[0].id,
          source: 'Manual',
          date: mon,
          createdAt: baseTs - 80000,
        },
      ],
    },
  ];

  const defaultCategories = buildDefaultCategories();
  const sampleExpenseCategoryMeta: Record<string, ExpenseCategoryMetaRecord> = {};
  const sampleExpenses: Expense[] = sampleAccounts
    .flatMap((acc) =>
      acc.transactions
        .filter((tx) => tx.type === 'expense')
        .map((tx) => {
          const cat = resolveExpenseCategoryWithPool(defaultCategories, tx.category, tx.categoryId);
          const sub = resolveExpenseSubcategory(cat, null, tx.subcategoryId);
          sampleExpenseCategoryMeta[tx.id] = {
            categoryId: cat.id,
            categoryLabel: cat.label,
            subcategoryId: sub?.id || null,
            subcategoryLabel: sub?.label || null,
          };
          return {
            id: tx.id,
            title: tx.description,
            amountCentavos: tx.amountCentavos,
            category: cat.label,
            categoryId: cat.id,
            subcategoryId: sub?.id || null,
            subcategoryLabel: sub?.label || null,
            date: tx.date,
            account: acc.name,
            note: tx.note,
            createdAt: tx.createdAt,
          };
        })
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const sampleGoals: RawSavingsGoal[] = [
    {
      id: elyuId,
      title: 'ELYU',
      targetCentavos: 500000,
      startDate: formatManilaDateOffset(-60),
      deadline: formatManilaDateOffset(40),
      backingAccount: 'GCash',
      containerSkin: 'glass jar',
      emoji: '🌊',
      note: 'Weekend surf trip and beach cafe budget in La Union with barkada',
      createdAt: baseTs - 20000,
      deposits: [
        {
          id: crypto.randomUUID(),
          goalId: elyuId,
          amountCentavos: 100000,
          date: formatManilaDateOffset(-45),
          fromAccount: 'GCash',
          createdAt: baseTs - 40000,
        },
        {
          id: crypto.randomUUID(),
          goalId: elyuId,
          amountCentavos: 100000,
          date: formatManilaDateOffset(-30),
          fromAccount: 'GCash',
          createdAt: baseTs - 30000,
        },
        {
          id: crypto.randomUUID(),
          goalId: elyuId,
          amountCentavos: 70000,
          date: formatManilaDateOffset(-15),
          fromAccount: 'GCash',
          createdAt: baseTs - 20000,
        },
        {
          id: crypto.randomUUID(),
          goalId: elyuId,
          amountCentavos: 50000,
          date: formatManilaDateOffset(-5),
          fromAccount: 'GCash',
          createdAt: baseTs - 10000,
        },
      ],
    },
    {
      id: gadgetId,
      title: 'Gadget fund',
      targetCentavos: 1200000,
      startDate: formatManilaDateOffset(-40),
      deadline: formatManilaDateOffset(120),
      backingAccount: 'BPI',
      containerSkin: 'piggy bank',
      emoji: '💻',
      note: 'Mechanical keyboard and second monitor for thesis station',
      createdAt: baseTs - 30000,
      deposits: [
        {
          id: crypto.randomUUID(),
          goalId: gadgetId,
          amountCentavos: 200000,
          date: formatManilaDateOffset(-35),
          fromAccount: 'BPI',
          createdAt: baseTs - 35000,
        },
        {
          id: crypto.randomUUID(),
          goalId: gadgetId,
          amountCentavos: 150000,
          date: formatManilaDateOffset(-20),
          fromAccount: 'BPI',
          createdAt: baseTs - 20000,
        },
        {
          id: crypto.randomUUID(),
          goalId: gadgetId,
          amountCentavos: 170000,
          date: formatManilaDateOffset(-8),
          fromAccount: 'BPI',
          createdAt: baseTs - 8000,
        },
      ],
    },
  ];

  const sampleDebts: RawDebtItem[] = [
    {
      id: debtGcashId,
      title: 'GCash PayLater',
      creditor: 'Fuse Lending / GCash',
      type: 'Pay later',
      totalCentavos: 300000,
      dueDate: formatManilaDateOffset(3),
      dueTime: '09:00',
      remindersEnabled: true,
      notes: 'Monthly installment for campus device peripherals',
      isArchived: false,
      wasCompleted: false,
      createdAt: baseTs - 10000,
      payments: [
        {
          id: crypto.randomUUID(),
          debtId: debtGcashId,
          amountCentavos: 150000,
          date: formatManilaDateOffset(-7),
          time: '10:30',
          channel: 'GCash',
          paidFromAccount: 'GCash',
          createdAt: baseTs - 10000,
        },
      ],
    },
    {
      id: debtClassmateId,
      title: 'Borrowed from a classmate',
      creditor: 'Sam (Classmate)',
      type: 'Personal',
      totalCentavos: 540000,
      dueDate: formatManilaDateOffset(20),
      dueTime: '17:00',
      remindersEnabled: true,
      notes: 'Group project camera rental & equipment split',
      isArchived: false,
      wasCompleted: false,
      createdAt: baseTs - 20000,
      payments: [
        {
          id: crypto.randomUUID(),
          debtId: debtClassmateId,
          amountCentavos: 200000,
          date: formatManilaDateOffset(-16),
          time: '14:00',
          channel: 'Bank',
          paidFromAccount: 'BPI',
          createdAt: baseTs - 25000,
        },
        {
          id: crypto.randomUUID(),
          debtId: debtClassmateId,
          amountCentavos: 170000,
          date: formatManilaDateOffset(-9),
          time: '16:15',
          channel: 'Cash',
          paidFromAccount: 'Cash on hand',
          createdAt: baseTs - 15000,
        },
      ],
    },
  ];

  const sampleChecklist: ChecklistItem[] = [
    {
      id: crypto.randomUUID(),
      title: 'Submit Capstone chapter',
      text: 'Submit Capstone chapter',
      category: 'School Activity',
      status: 'In progress',
      wasStartedBefore: true,
      completed: false,
      dueDate: formatManilaDateOffset(2),
      sortOrder: 0,
    },
    {
      id: crypto.randomUUID(),
      title: 'Group meeting',
      text: 'Group meeting',
      category: 'School Activity',
      status: 'Not started',
      wasStartedBefore: false,
      completed: false,
      dueDate: formatManilaDateOffset(1),
      sortOrder: 1,
    },
    {
      id: crypto.randomUUID(),
      title: 'Pay bills',
      text: 'Pay bills',
      category: 'General',
      status: 'Done',
      wasStartedBefore: true,
      completed: true,
      completedAt: baseTs - 30000,
      dueDate: formatManilaDateOffset(0),
      sortOrder: 2,
    },
    {
      id: crypto.randomUUID(),
      title: 'Buy groceries',
      text: 'Buy groceries',
      category: 'General',
      status: 'Done',
      wasStartedBefore: false,
      completed: true,
      completedAt: baseTs - 20000,
      dueDate: formatManilaDateOffset(0),
      sortOrder: 3,
    },
    {
      id: crypto.randomUUID(),
      title: 'Read assigned article',
      text: 'Read assigned article',
      category: 'School Activity',
      status: 'Not started',
      wasStartedBefore: false,
      completed: false,
      dueDate: formatManilaDateOffset(3),
      sortOrder: 4,
    },
    {
      id: crypto.randomUUID(),
      title: 'Clean room',
      text: 'Clean room',
      category: 'General',
      status: 'Not started',
      wasStartedBefore: false,
      completed: false,
      dueDate: formatManilaDateOffset(4),
      sortOrder: 5,
    },
  ];

  const sampleDiary: DiaryEntry[] = [
    {
      id: crypto.randomUUID(),
      date: formatManilaDateOffset(0),
      formattedDate: formatPrettyDate(formatManilaDateOffset(0)),
      content:
        'Tired but happy, I finished the requirements for midterms. Finally getting some real rest tonight.',
      wordCount: 16,
      mood: 'Grateful',
      moodSource: 'auto',
      location: 'Dorm room',
      stickers: [
        { id: 'st-1', key: '🌸', x: 78, y: 15, rotation: 8 },
        { id: 'st-2', key: '☕', x: 82, y: 72, rotation: -6 },
      ],
      attachedSong: {
        provider: 'mock',
        trackId: 'song-1',
        title: 'Balcony Breeze',
        artist: 'Tala & The Clouds',
        album: 'Sunspots Over Diliman',
        durationMs: 194000,
        externalUrl: null,
        coverColor: '#E6D7C3',
      },
      createdAt: baseTs - 10000,
      updatedAt: baseTs - 10000,
      body: 'Tired but happy, I finished the requirements for midterms. Finally getting some real rest tonight.',
      title: 'Midterms finished',
    },
    {
      id: crypto.randomUUID(),
      date: formatManilaDateOffset(-1),
      formattedDate: formatPrettyDate(formatManilaDateOffset(-1)),
      content:
        'Today felt heavy. Commute was delayed by rain and I spent more than planned on convenience store food.',
      wordCount: 19,
      mood: 'Tired',
      moodSource: 'auto',
      location: 'Katipunan station',
      stickers: [{ id: 'st-3', key: '🍃', x: 75, y: 20, rotation: -10 }],
      createdAt: baseTs - 100000,
      updatedAt: baseTs - 100000,
      body: 'Today felt heavy. Commute was delayed by rain and I spent more than planned on convenience store food.',
      title: 'Rainy commute',
    },
    {
      id: crypto.randomUUID(),
      date: formatManilaDateOffset(-2),
      formattedDate: formatPrettyDate(formatManilaDateOffset(-2)),
      content:
        'I fixed my budget and felt a little nervous about my PayLater installment, but seeing the numbers written down helped.',
      wordCount: 22,
      mood: 'Anxious',
      moodSource: 'user',
      location: 'Library',
      stickers: [],
      createdAt: baseTs - 200000,
      updatedAt: baseTs - 200000,
      body: 'I fixed my budget and felt a little nervous about my PayLater installment, but seeing the numbers written down helped.',
      title: 'Budget check-in',
    },
  ];

  return {
    weeklyBudgetCentavos: INITIAL_BUDGET_CENTAVOS,
    expenses: sampleExpenses,
    savingsGoals: sampleGoals,
    debts: sampleDebts,
    accounts: sampleAccounts,
    checklist: sampleChecklist,
    notes: sampleDiary,
    diaryEntries: sampleDiary,
    pinState: {
      pinHash: hashPin('1234'),
      isConfigured: true,
      failedAttempts: 0,
      lockedUntil: 0,
      lockoutDurationLevel: 0,
    },
    categories: defaultCategories,
    useSubcategories: true,
    learnedRules: [],
    categoryLimits: { ...DEFAULT_SAMPLE_LIMITS },
    expenseCategoryMeta: sampleExpenseCategoryMeta,
    songLanguageSetting: 'Mixed',
    songFeedback: [],
    recordedReferenceNumbers: [
      'BPI-98214',
      'GC-491028',
      'GC-491001',
      'MY-77123',
      'MY-77002',
      'GT-338901',
      'UB-58120',
    ],
  };
}

export async function resetToSampleData(): Promise<void> {
  const userId = await ensureStateLoaded();
  const sample = buildSampleAppState();

  if (isSupabaseConfigured) {
    // Clear existing user data across Supabase tables (ignoring unmigrated tables)
    const tablesToClear = [
      'transactions',
      'accounts',
      'goal_deposits',
      'savings_goals',
      'debt_payments',
      'debts',
      'checklist_items',
      'diary_entries',
    ];
    for (const tbl of tablesToClear) {
      const { error } = await supabase.from(tbl).delete().eq('user_id', userId);
      if (error && !isMissingTableError(error)) {
        throwUserSafeError(`resetToSampleData.clear.${tbl}`, error);
      }
    }

    // Insert sample accounts & transactions (including sample expenses) into Supabase
    for (let i = 0; i < sample.accounts.length; i++) {
      const acc = sample.accounts[i];
      await insertAccountRow(userId, acc, i);
      for (const tx of acc.transactions) {
        await insertTransactionRow(userId, tx, true);
      }
    }

    if (sample.savingsGoals.length > 0) {
      const { error: gErr } = await supabase.from('savings_goals').insert(
        sample.savingsGoals.map((g) => ({
          id: g.id,
          user_id: userId,
          title: g.title,
          target_centavos: g.targetCentavos,
          start_date: g.startDate,
          deadline: g.deadline,
          backing_account: g.backingAccount,
          container_skin: g.containerSkin,
          is_completed: Boolean(g.isCompleted),
          note: g.note || null,
          emoji: g.emoji || null,
          created_at: g.createdAt || Date.now(),
        }))
      );
      if (gErr && !isMissingTableError(gErr)) {
        console.error('[Chestlist][resetToSampleData.savingsGoals]', gErr);
      }
      if (!gErr) {
        const deps = sample.savingsGoals.flatMap((g) =>
          g.deposits.map((d) => ({
            id: d.id,
            user_id: userId,
            goal_id: g.id,
            amount_centavos: d.amountCentavos,
            date: d.date,
            from_account: d.fromAccount || null,
            created_at: d.createdAt,
          }))
        );
        if (deps.length > 0) {
          const { error: depErr } = await supabase.from('goal_deposits').insert(deps);
          if (depErr && !isMissingTableError(depErr)) {
            console.error('[Chestlist][resetToSampleData.goalDeposits]', depErr);
          }
        }
      }
    }

    if (sample.debts.length > 0) {
      const { error: dErr } = await supabase.from('debts').insert(
        sample.debts.map((d) => ({
          id: d.id,
          user_id: userId,
          title: d.title,
          creditor: d.creditor || null,
          type: d.type,
          total_centavos: d.totalCentavos,
          due_date: d.dueDate,
          due_time: d.dueTime || null,
          reminders_enabled: d.remindersEnabled,
          notes: d.notes || null,
          is_archived: false,
          was_completed: false,
          created_at: d.createdAt || Date.now(),
        }))
      );
      if (dErr && !isMissingTableError(dErr)) {
        console.error('[Chestlist][resetToSampleData.debts]', dErr);
      }
      if (!dErr) {
        const pays = sample.debts.flatMap((d) =>
          d.payments.map((p) => ({
            id: p.id,
            user_id: userId,
            debt_id: d.id,
            amount_centavos: p.amountCentavos,
            date: p.date,
            time: p.time || null,
            channel: p.channel,
            paid_from_account: p.paidFromAccount || null,
            transaction_id: p.transactionId || null,
            created_at: p.createdAt,
          }))
        );
        if (pays.length > 0) {
          const { error: payErr } = await supabase.from('debt_payments').insert(pays);
          if (payErr && !isMissingTableError(payErr)) {
            console.error('[Chestlist][resetToSampleData.debtPayments]', payErr);
          }
        }
      }
    }

    if (sample.checklist.length > 0) {
      const { error: chkErr } = await supabase.from('checklist_items').insert(
        sample.checklist.map((c) => ({
          id: c.id,
          user_id: userId,
          title: c.title,
          category: c.category,
          status: c.status,
          was_started_before: Boolean(c.wasStartedBefore),
          completed: Boolean(c.completed),
          due_date: c.dueDate || null,
          completed_at: c.completedAt || null,
          sort_order: c.sortOrder,
          created_at: Date.now(),
        }))
      );
      if (chkErr && !isMissingTableError(chkErr)) {
        console.error('[Chestlist][resetToSampleData.checklist]', chkErr);
      }
    }

    if (sample.diaryEntries.length > 0) {
      const { error: diaryErr } = await supabase.from('diary_entries').insert(
        sample.diaryEntries.map((e) => ({
          id: e.id,
          user_id: userId,
          title: e.title || null,
          date: e.date,
          formatted_date: e.formattedDate || null,
          content: e.content,
          word_count: e.wordCount,
          mood: e.mood,
          mood_source: e.moodSource,
          location: e.location || null,
          stickers: e.stickers,
          attached_song: e.attachedSong || null,
          created_at: e.createdAt,
          updated_at: e.updatedAt,
        }))
      );
      if (diaryErr && !isMissingTableError(diaryErr)) {
        console.error('[Chestlist][resetToSampleData.diaryEntries]', diaryErr);
      }
    }
  }

  state = sample;
  await updateProfileFields(userId, {
    weekly_budget_centavos: sample.weeklyBudgetCentavos,
    category_limits: sample.categoryLimits,
    song_language: songLanguageToDb(sample.songLanguageSetting),
    notes_pin_hash: sample.pinState.pinHash,
    notes_pin_configured: sample.pinState.isConfigured,
    notes_pin_failed_attempts: 0,
    notes_pin_locked_until: 0,
    notes_pin_lockout_level: 0,
    recorded_reference_numbers: sample.recordedReferenceNumbers,
  });
}

export async function exportAllDataJSON(): Promise<string> {
  await ensureStateLoaded();
  return JSON.stringify(state, null, 2);
}

// ======================== LOCAL AUTH FALLBACK (WHEN SUPABASE ENV VARS ARE UNSET) ========================

export const isLocalAuthMode = !isSupabaseConfigured;
export const DEMO_ACCOUNT_EMAIL = 'demo@chestlist.app';
const DEMO_ACCOUNT_ID = '00000000-0000-4000-8000-00000000d300';
const LOCAL_USERS_KEY = 'chestlist_local_users';
const LOCAL_SESSION_KEY = 'chestlist_local_session_uid';

interface LocalUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  theme: ThemeName;
  spendingStyle?: SpendingStyle;
  createdAt: number;
}

function hashLocalPassword(email: string, password: string): string {
  const input = `${email.trim().toLowerCase()}:${password}:chestlist_local_v1`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function readLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: LocalUserRecord[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

function readLocalSessionUserId(): string | null {
  try {
    return localStorage.getItem(LOCAL_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeLocalSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(LOCAL_SESSION_KEY, userId);
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

function toUserProfile(rec: LocalUserRecord): UserProfile {
  return {
    id: rec.id,
    name: rec.name,
    email: rec.email,
    theme: rec.theme,
    spendingStyle: rec.spendingStyle,
    createdAt: rec.createdAt,
  };
}

function ensureDemoLocalUser(): LocalUserRecord {
  const users = readLocalUsers();
  let demo = users.find((u) => u.id === DEMO_ACCOUNT_ID || u.email === DEMO_ACCOUNT_EMAIL);
  if (!demo) {
    demo = {
      id: DEMO_ACCOUNT_ID,
      name: 'Ches Miranda',
      email: DEMO_ACCOUNT_EMAIL,
      passwordHash: hashLocalPassword(DEMO_ACCOUNT_EMAIL, 'chestlist123'),
      theme: 'blush',
      spendingStyle: 'I plan ahead',
      createdAt: Date.now(),
    };
    writeLocalUsers([...users, demo]);
  }
  const existingFb = readFallbackData(demo.id);
  if (!existingFb || (!Array.isArray(existingFb.accounts) && !Array.isArray(existingFb.expenses))) {
    const sample = buildSampleAppState();
    try {
      localStorage.setItem(fallbackStorageKey(demo.id), JSON.stringify(sample));
    } catch {
      // ignore
    }
  }
  return demo;
}

export async function logInDemoUser(): Promise<UserProfile> {
  if (isSupabaseConfigured) {
    throw new UserSafeError('Demo login is only available in local preview mode.');
  }
  const demo = ensureDemoLocalUser();
  writeLocalSessionUserId(demo.id);
  await loadUserData(demo.id);
  return toUserProfile(demo);
}

// ======================== SUPABASE AUTHENTICATION API ========================

let loginLockoutUntil = 0;
let failedLoginCount = 0;

export function getLoginLockoutRemaining(): number {
  const now = Date.now();
  if (now < loginLockoutUntil) {
    return Math.ceil((loginLockoutUntil - now) / 1000);
  }
  return 0;
}

export async function getSession(): Promise<AuthSession> {
  if (!isSupabaseConfigured) {
    const localUid = readLocalSessionUserId();
    if (!localUid) {
      activeUserId = null;
      state = createEmptyState();
      return { isAuthenticated: false, user: null };
    }
    const localUser =
      readLocalUsers().find((u) => u.id === localUid) ||
      (localUid === DEMO_ACCOUNT_ID ? ensureDemoLocalUser() : null);
    if (!localUser) {
      writeLocalSessionUserId(null);
      activeUserId = null;
      state = createEmptyState();
      return { isAuthenticated: false, user: null };
    }
    await loadUserData(localUser.id);
    return {
      isAuthenticated: true,
      user: toUserProfile(localUser),
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Chestlist][getSession]', error);
  }
  if (error || !data.session?.user) {
    activeUserId = null;
    state = createEmptyState();
    return { isAuthenticated: false, user: null };
  }

  const { profile, dbRow } = await ensureUserInitialized(data.session.user);
  await loadUserData(data.session.user.id, dbRow);

  return {
    isAuthenticated: true,
    user: profile,
  };
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const notesPinHash = input.notesPin && input.notesPin.length === 4 ? hashPin(input.notesPin) : '';

  if (!isSupabaseConfigured) {
    const users = readLocalUsers();
    if (users.some((u) => u.email === normalizedEmail)) {
      throw new UserSafeError('That email is already in use.');
    }

    const userId = crypto.randomUUID();
    const newUser: LocalUserRecord = {
      id: userId,
      name: input.name.trim() || normalizedEmail.split('@')[0] || 'Chestlist User',
      email: normalizedEmail,
      passwordHash: hashLocalPassword(normalizedEmail, input.password),
      theme: themeToDb(input.theme),
      spendingStyle: input.spendingStyle || 'I plan ahead',
      createdAt: Date.now(),
    };

    const initialState = createEmptyState();
    initialState.weeklyBudgetCentavos = INITIAL_BUDGET_CENTAVOS;
    const alkansyaName = input.alkansyaName.trim() || 'My Alkansya';
    const initialAccounts: RawAccount[] = [
      {
        id: crypto.randomUUID(),
        name: alkansyaName,
        nickname: 'Alkansya',
        type: 'Cash stash',
        openingBalanceCentavos: 0,
        lastConfirmedDate: getManilaDateString(),
        color: '#FFD9E1',
        textColor: '#3A2E33',
        icon: 'piggy',
        transactions: [],
      },
    ];
    if (input.firstAccount?.name?.trim()) {
      initialAccounts.push({
        id: crypto.randomUUID(),
        name: input.firstAccount.name.trim(),
        type: fromDbAccountType(input.firstAccount.type),
        openingBalanceCentavos: Number(input.firstAccount.startingBalanceCentavos || 0),
        lastConfirmedDate: getManilaDateString(),
        color: '#D9EDD8',
        textColor: '#3A2E33',
        icon: 'wallet',
        transactions: [],
      });
    }
    initialState.accounts = initialAccounts;
    if (notesPinHash) {
      initialState.pinState = {
        pinHash: notesPinHash,
        isConfigured: true,
        failedAttempts: 0,
        lockedUntil: 0,
        lockoutDurationLevel: 0,
      };
    }

    writeLocalUsers([...users, newUser]);
    writeLocalSessionUserId(userId);
    activeUserId = userId;
    state = initialState;
    writeFallbackData(userId);

    return {
      user: toUserProfile(newUser),
      requiresEmailConfirmation: false,
    };
  }

  const sanitizedFirstAccount = input.firstAccount
    ? {
        name: input.firstAccount.name.trim(),
        type: accountTypeToDb(input.firstAccount.type),
        startingBalanceCentavos: Number(input.firstAccount.startingBalanceCentavos || 0),
      }
    : null;

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        display_name: input.name.trim(),
        theme: themeToDb(input.theme),
        spending_style: input.spendingStyle || 'I plan ahead',
        alkansya_name: input.alkansyaName.trim() || 'My Alkansya',
        first_account: sanitizedFirstAccount,
        notes_pin_hash: notesPinHash,
        notes_pin_configured: Boolean(notesPinHash),
      },
    },
  });

  if (error) {
    console.error('[Chestlist][signUp]', error);
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists')) {
      throw new UserSafeError('That email is already in use.');
    }
    throw new UserSafeError(GENERIC_USER_ERROR);
  }

  // Supabase returns identities = [] if email is already registered and email confirmations are enabled
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new UserSafeError('That email is already in use.');
  }

  if (data.session && data.user) {
    const { profile, dbRow } = await ensureUserInitialized(data.user);
    await loadUserData(data.user.id, dbRow);
    return {
      user: profile,
      requiresEmailConfirmation: false,
    };
  }

  return {
    user: null,
    requiresEmailConfirmation: true,
  };
}

export async function logIn(input: LoginInput): Promise<UserProfile> {
  const now = Date.now();
  if (now < loginLockoutUntil) {
    const secondsRemaining = Math.ceil((loginLockoutUntil - now) / 1000);
    throw new UserSafeError(`Too many failed attempts. Try again in ${secondsRemaining}s.`);
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    ensureDemoLocalUser();
    const users = readLocalUsers();
    const matched = users.find((u) => u.email === normalizedEmail);
    const expectedHash = hashLocalPassword(normalizedEmail, input.password);
    if (!matched || matched.passwordHash !== expectedHash) {
      failedLoginCount += 1;
      if (failedLoginCount >= 5) {
        loginLockoutUntil = Date.now() + 60000;
        failedLoginCount = 0;
        throw new UserSafeError('Too many failed attempts. Locked for 60 seconds.');
      }
      if (!matched) {
        throw new UserSafeError(
          'No local account found for that email. Create an account or use Try Demo Account below.'
        );
      }
      throw new UserSafeError('Email or password is incorrect. Try again.');
    }

    failedLoginCount = 0;
    loginLockoutUntil = 0;
    writeLocalSessionUserId(matched.id);
    await loadUserData(matched.id);
    return toUserProfile(matched);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: input.password,
  });

  if (error || !data.user) {
    if (error) {
      console.error('[Chestlist][logIn]', error);
    }
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('email not confirmed')) {
      throw new UserSafeError('Please confirm your email via the link in your inbox before logging in.');
    }

    failedLoginCount += 1;
    if (failedLoginCount >= 5) {
      loginLockoutUntil = Date.now() + 60000;
      failedLoginCount = 0;
      throw new UserSafeError('Too many failed attempts. Locked for 60 seconds.');
    }
    throw new UserSafeError('Email or password is incorrect. Try again.');
  }

  failedLoginCount = 0;
  loginLockoutUntil = 0;

  const { profile, dbRow } = await ensureUserInitialized(data.user);
  await loadUserData(data.user.id, dbRow);
  return profile;
}

export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<void> {
  if (!isSupabaseConfigured) {
    const label = provider === 'google' ? 'Google' : 'Apple';
    throw new UserSafeError(
      `${label} sign-in requires Supabase Auth configuration. Please create a local account or use Try Demo Account.`
    );
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('[Chestlist][signInWithOAuth]', error);
    const msg = error.message.toLowerCase();
    if (msg.includes('not enabled') || msg.includes('unsupported provider')) {
      const label = provider === 'google' ? 'Google' : 'Apple';
      throw new UserSafeError(
        `${label} sign-in is not enabled in your Supabase Auth settings yet. Use email & password or enable ${label} in Supabase Authentication -> Providers.`
      );
    }
    throw new UserSafeError(GENERIC_USER_ERROR);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new UserSafeError(
      'Password reset emails require Supabase Auth. In local mode, please create a new account or try the Demo Account.'
    );
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin,
  });
  if (error) {
    throwUserSafeError('sendPasswordReset', error);
  }
}

export async function updateUserTheme(theme: ThemeName): Promise<void> {
  if (!isSupabaseConfigured) {
    const localUid = activeUserId || readLocalSessionUserId();
    if (!localUid) return;
    const users = readLocalUsers();
    const updated = users.map((u) =>
      u.id === localUid ? { ...u, theme: themeToDb(theme) } : u
    );
    writeLocalUsers(updated);
    return;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    const dbTheme = themeToDb(theme);
    const { error } = await supabase.auth.updateUser({ data: { theme: dbTheme } });
    if (error) {
      if (isNetworkFetchError(error)) {
        console.warn('[Chestlist][updateUserTheme.auth] Offline/network fallback used.');
      } else {
        console.error('[Chestlist][updateUserTheme.auth]', error);
      }
    }
    await updateProfileFields(userId, { theme: dbTheme });
  } catch (err) {
    if (isNetworkFetchError(err)) {
      console.warn('[Chestlist][updateUserTheme] Offline/network fallback used.');
    } else {
      console.error('[Chestlist][updateUserTheme]', err);
    }
  }
}

export async function logOut(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !isNetworkFetchError(error)) {
        console.error('[Chestlist][logOut]', error);
      }
    } catch (err) {
      if (!isNetworkFetchError(err)) {
        console.error('[Chestlist][logOut]', err);
      }
    }
  } else {
    writeLocalSessionUserId(null);
  }
  activeUserId = null;
  state = createEmptyState();
}
