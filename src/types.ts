/**
 * Types for Chestlist - Minimalist pastel personal finance and life tracker
 * All monetary amounts are stored as integer centavos.
 */

export type ThemeName = 'blush' | 'sage' | 'sky' | 'lavender';

export type CategoryName = string;

export interface ExpenseSubcategory {
  id: string;
  categoryId: string;
  userId: string | null;
  key: string;
  label: string;
  sortOrder: number;
  isArchived: boolean;
}

export interface ExpenseCategory {
  id: string;
  userId: string | null;
  key: string;
  label: string;
  icon: string;
  color: string;
  textColor: string;
  sortOrder: number;
  isArchived: boolean;
  subcategories: ExpenseSubcategory[];
}

export interface LearnedCategoryRule {
  id: string;
  keyword: string;
  categoryId: string;
  subcategoryId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExpenseCategorizationResult {
  categoryId: string | null;
  categoryKey: string | null;
  categoryLabel: string | null;
  subcategoryId: string | null;
  subcategoryKey: string | null;
  subcategoryLabel: string | null;
  categoryConfidence: number;
  subcategoryConfidence: number;
  newSubcategorySuggestion: string | null;
  source: 'rule' | 'ai' | 'none';
  needsManualPicker: boolean;
  aiFailed?: boolean;
  errorCode?: string;
  errorStatus?: number;
  errorMessage?: string;
}

export interface CategoryConfig {
  id?: string;
  key?: string;
  name: CategoryName;
  icon?: string;
  color: string; // Pastel background
  textColor: string; // Always dark #3A2E33
  limitCentavos: number;
}

export interface Expense {
  id: string;
  title: string;
  amountCentavos: number;
  category: CategoryName;
  categoryId?: string;
  subcategoryId?: string | null;
  subcategoryLabel?: string | null;
  categoryConfidence?: number | null;
  subcategoryConfidence?: number | null;
  categoryUserConfirmed?: boolean;
  merchant?: string | null;
  date: string; // ISO date string YYYY-MM-DD
  account?: string;
  note?: string;
  overdraftConfirmed?: boolean;
  createdAt: number;
}

export type ContainerSkin = 'glass jar' | 'piggy bank' | 'treasure chest' | 'tin can';

export interface GoalDeposit {
  id: string;
  goalId: string;
  amountCentavos: number;
  date: string; // YYYY-MM-DD
  fromAccount?: string;
  createdAt: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetCentavos: number;
  startDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  backingAccount: string;
  containerSkin: ContainerSkin;
  deposits: GoalDeposit[];
  isCompleted?: boolean;
  note?: string;
  emoji?: string;

  // Dynamically computed in data layer (api.ts):
  savedCentavos: number;
  remainingCentavos: number;
  daysLeft: number;
  totalDays: number;
  daysElapsed: number;
  percentage: number;
  requiredPerDayCentavos: number;
  requiredPerWeekCentavos: number;
  isOffPace: boolean;
  isDeadlinePassed: boolean;
}

export type DebtType = 'Pay later' | 'Personal' | 'Loan' | 'Other';
export type DebtStatus = 'paid' | 'overdue' | 'due soon' | 'active';

export interface DebtPayment {
  id: string;
  debtId: string;
  amountCentavos: number;
  date: string;
  time?: string;
  channel: 'GCash' | 'Maya' | 'Bank' | 'Cash' | 'Other';
  paidFromAccount?: string;
  notes?: string;
  transactionId?: string;
  createdAt: number;
}

export interface DebtItem {
  id: string;
  title: string;
  creditor?: string;
  lender?: string; // backward compat alias
  type: DebtType;
  totalCentavos: number;
  amountCentavos: number; // backward compat alias
  paidCentavos: number;
  remainingCentavos: number;
  percentagePaid: number;
  dueDate: string;
  dueTime?: string;
  remindersEnabled: boolean;
  notes?: string;
  payments: DebtPayment[];
  status: DebtStatus;
  daysLeft: number;
  isDueSoon: boolean;
  isDueToday: boolean;
  isOverdue: boolean;
  isArchived?: boolean;
}

export type AccountType =
  | 'Bank'
  | 'E-wallet'
  | 'Digital bank'
  | 'Cash stash';

export type TransactionSource = 'Manual' | 'Paste import' | 'CSV' | 'System';

export interface AccountTransaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  type:
    | 'expense'
    | 'savings_deposit'
    | 'debt_payment'
    | 'adjustment'
    | 'transfer_in'
    | 'transfer_out'
    | 'income';
  direction: 'inflow' | 'outflow';
  amountCentavos: number;
  description: string;
  note?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category?: CategoryName;
  categoryId?: string;
  subcategoryId?: string | null;
  categoryConfidence?: number | null;
  subcategoryConfidence?: number | null;
  categoryUserConfirmed?: boolean;
  merchant?: string | null;
  source?: TransactionSource;
  referenceNumber?: string;
  overdraftConfirmed?: boolean;
  createdAt: number;
}

export interface InsufficientFundsDetails {
  available: number;
  required: number;
}

export interface InsufficientFundsPayload {
  code: 'insufficient_funds';
  message: 'Not enough balance';
  details: InsufficientFundsDetails;
}

export interface AccountWallet {
  id: string;
  name: string;
  nickname?: string;
  type: AccountType;
  openingBalanceCentavos: number;
  balanceCentavos: number;
  accountNumber?: string; // full number (fake sample, e.g. "09171234821")
  last4?: string; // e.g. "4821"
  lastConfirmedDate: string; // YYYY-MM-DD
  isStale: boolean; // confirmed > 7 days ago
  color: string; // pastel card swatch
  textColor?: string;
  icon?: string;
  isArchived?: boolean;
  transactions?: AccountTransaction[];
  backingGoalIds?: string[]; // goal ids backed by this account
}

export interface ParsedMessageResult {
  amountCentavos: number;
  merchant: string;
  direction: 'debit' | 'credit';
  category: CategoryName;
  suggestedAccountId?: string;
  suggestedAccountName: string;
  referenceNumber: string;
  isDuplicate: boolean;
}

export type ChecklistCategory = 'General' | 'School Activity';
export type ChecklistStatus = 'Not started' | 'In progress' | 'Done';

export interface ChecklistItem {
  id: string;
  title: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  dueDate?: string; // YYYY-MM-DD
  completedAt?: number;
  sortOrder: number;
  wasStartedBefore?: boolean;
  // Backward compatibility alias
  text?: string;
  completed?: boolean;
}

export interface ChecklistProgressInfo {
  total: number;
  completed: number;
  percentage: number;
  label: string; // e.g. "50% (3 of 6 tasks)"
  mascotState: 1 | 2 | 3 | 4 | 5;
  mascotCaption: string;
}

export type DiaryMood =
  | 'Happy'
  | 'Calm'
  | 'Excited'
  | 'Grateful'
  | 'Inspired'
  | 'Tired'
  | 'Anxious'
  | 'Sad'
  | 'Frustrated'
  | 'Yearning';

export interface DiarySticker {
  id: string;
  key: string;
  x: number; // percentage (0 to 90)
  y: number; // percentage (0 to 90)
  rotation: number; // degrees (-15 to 15)
}

export type SongLanguage = 'OPM' | 'Western' | 'Mixed';
export type SongEnergy = 'low' | 'medium' | 'high';

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  energy: SongEnergy;
  moods: DiaryMood[];
  language: 'OPM' | 'Western';
  whyItFits: string;
  coverColor: string;
}

export interface AttachedSong {
  provider: 'mock';
  trackId: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  externalUrl: string | null;
  coverColor?: string;
}

export interface SongFeedbackRecord {
  trackId: string;
  action: 'picked' | 'skipped';
  mood: DiaryMood;
  timestamp: number;
}

export type DiaryMoodSource = 'auto' | 'user' | 'ai' | 'estimate';
export type DiaryDetectedLanguage = 'English' | 'Tagalog' | 'Taglish';

export interface DiaryEntry {
  id: string;
  title?: string;
  date: string; // YYYY-MM-DD
  formattedDate?: string;
  content: string;
  wordCount: number;
  mood: DiaryMood;
  moodSource: DiaryMoodSource;
  detectedLanguage?: DiaryDetectedLanguage;
  aiSummary?: string;
  aiEnergy?: SongEnergy;
  aiThemes?: string[];
  analyzedHash?: string;
  location?: string;
  stickers: DiarySticker[];
  attachedSong?: AttachedSong;
  createdAt: number;
  updatedAt: number;
  // Backward compatibility fields
  body?: string;
  category?: string;
}

export interface NotesPinState {
  pinHash: string;
  isConfigured: boolean;
  failedAttempts: number;
  lockedUntil: number; // ms timestamp
  lockoutDurationLevel: number; // 0, 1 (60s), 2 (300s), 3 (900s)
}

// Backward-compat alias for existing references
export type LifeNote = DiaryEntry;

export interface DebtReminder {
  debt: DebtItem;
  type: 'due_soon' | 'due_today';
  message: string;
}

export interface FinancialHealthOverview {
  weeklyBudgetCentavos: number;
  budgetLeftCentavos: number;
  budgetSpentCentavos: number;
  totalSavedCentavos: number;
  savingsGoalsCount: number;
  totalDebtCentavos: number;
  activeDebtsCount: number;
  allAccountsTotalCentavos: number;
  weekRangeLabel: string;
  targetFreeDate?: string;
  targetFreeDateLabel?: string;
  activeReminders: DebtReminder[];
  dueSoonDebt?: DebtItem;
  hasStaleAccounts?: boolean;
  allAccountsLastUpdated?: string;
}

export type SpendingStyle =
  | 'I plan ahead'
  | 'I spend as I go'
  | 'I save first'
  | "I'm still figuring it out";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  theme: ThemeName;
  spendingStyle?: SpendingStyle;
  createdAt: number;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  spendingStyle: SpendingStyle;
  alkansyaName: string;
  firstAccount?: {
    name: string;
    type: AccountType;
    startingBalanceCentavos: number;
  };
  theme: ThemeName;
  notesPin?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  keepSignedIn?: boolean;
}

export interface SignUpResult {
  user: UserProfile | null;
  requiresEmailConfirmation: boolean;
}

