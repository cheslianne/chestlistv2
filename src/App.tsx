/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccountType,
  AccountWallet,
  CategoryConfig,
  CategoryName,
  ChecklistItem,
  ContainerSkin,
  DebtItem,
  DebtType,
  Expense,
  ExpenseCategory,
  FinancialHealthOverview,
  LifeNote,
  SavingsGoal,
  ThemeName,
  DiaryEntry,
  UserProfile,
} from './types';
import * as api from './api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { BudgetView } from './views/BudgetView';
import { SavingsView } from './views/SavingsView';
import { DebtView } from './views/DebtView';
import { NotesView } from './views/NotesView';
import { WalletView } from './views/WalletView';
import { LandingView } from './views/LandingView';
import { SignUpView } from './views/SignUpView';
import { LoginView } from './views/LoginView';
import { LogoutModal } from './components/LogoutModal';
import {
  AddSavingsModal,
  LogPaymentModal,
  AddNoteModal,
} from './components/QuickActionModals';
import { EditExpenseModal } from './components/EditExpenseModal';
import { ManageCategoriesModal } from './components/ManageCategoriesModal';
import { RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface CategoryWithUsage extends CategoryConfig {
  spentCentavos: number;
  percent: number;
}

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('blush');
  const [currentTab, setCurrentTab] = useState<NavTab | 'wallet'>('home');
  const [previousTab, setPreviousTab] = useState<NavTab>('home');

  // App data states
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthOverview | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(api.DEFAULT_CATEGORIES);
  const [useSubcategories, setUseSubcategories] = useState<boolean>(true);
  const [categoryLimits, setCategoryLimits] = useState<CategoryWithUsage[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [accounts, setAccounts] = useState<AccountWallet[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState<LifeNote[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  // Diary PIN Session State (10-minute inactivity timeout) & session Notes tab memory
  const [isNotesUnlocked, setIsNotesUnlocked] = useState(false);
  const [lastNotesActivity, setLastNotesActivity] = useState<number>(Date.now());
  const [notesActiveTab, setNotesActiveTab] = useState<'diary' | 'checklist'>('diary');
  const [autoReadMoodOnSave, setAutoReadMoodOnSave] = useState<boolean>(() =>
    api.getAutoReadMoodOnSaveSetting()
  );

  // Auth State (Mock data layer session)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authView, setAuthView] = useState<'landing' | 'signup' | 'login'>('landing');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<{ message: string; retry: () => void } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddSavingsModalOpen, setIsAddSavingsModalOpen] = useState(false);
  const [isLogPaymentModalOpen, setIsLogPaymentModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const cancelResetBtnRef = useRef<HTMLButtonElement>(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Session activity listener: track clicks, keys, touch
  useEffect(() => {
    const handleUserActivity = () => {
      setLastNotesActivity(Date.now());
    };

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  // 10-minute inactivity timer check for Notes
  useEffect(() => {
    if (!isNotesUnlocked) return;

    const interval = setInterval(() => {
      if (Date.now() - lastNotesActivity > 10 * 60 * 1000) {
        setIsNotesUnlocked(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isNotesUnlocked, lastNotesActivity]);

  // Load all initial data from data layer
  const reloadData = useCallback(async (): Promise<{ accounts: AccountWallet[] } | null> => {
    setLoadError(false);
    try {
      const [
        healthData,
        expensesData,
        categoriesData,
        useSubData,
        limitsData,
        savingsData,
        debtsData,
        accountsData,
        checklistData,
        notesData,
        diaryData,
      ] = await Promise.all([
        api.getFinancialHealth(),
        api.getExpenses(),
        api.getCategories(false),
        api.getUseSubcategoriesSetting(),
        api.getCategoryLimits(),
        api.getSavingsGoals(),
        api.getDebts(true),
        api.getAccounts(),
        api.getChecklist(),
        api.getLifeNotes(),
        api.getDiaryEntries(),
      ]);

      setFinancialHealth(healthData);
      setExpenses(expensesData);
      setCategories(categoriesData);
      setUseSubcategories(useSubData);
      setCategoryLimits(limitsData);
      setSavingsGoals(savingsData);
      setDebts(debtsData);
      setAccounts(accountsData);
      setChecklist(checklistData);
      setNotes(notesData);
      setDiaryEntries(diaryData);
      setAutoReadMoodOnSave(api.getAutoReadMoodOnSaveSetting());
      return { accounts: accountsData };
    } catch (err) {
      console.error('[Chestlist][reloadData]', err);
      setLoadError(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth session on startup and subscribe to Supabase auth changes
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const session = await api.getSession();
        if (!mounted) return;
        if (session.isAuthenticated && session.user) {
          setIsAuthenticated(true);
          setCurrentUser(session.user);
          if (session.user.theme) {
            setCurrentTheme(session.user.theme);
          }
          await reloadData();
        } else {
          setIsAuthenticated(false);
          setAuthView('landing');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Chestlist][initSession]', err);
        if (!mounted) return;
        setIsAuthenticated(false);
        setAuthView('landing');
        setIsLoading(false);
      }
    }

    initSession();

    const authSubscription = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange((event) => {
          if (!mounted) return;
          if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setIsNotesUnlocked(false);
            setNotesActiveTab('diary');
            setLoadError(false);
            setActionError(null);
            setAuthView('landing');
            setIsLoading(false);
          } else if (event === 'SIGNED_IN') {
            // Defer outside lock callback to avoid deadlocks during signIn/signUp
            setTimeout(() => {
              if (mounted) initSession();
            }, 0);
          }
        }).data.subscription
      : null;

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, [reloadData]);

  const handleAuthSuccess = async (theme?: ThemeName) => {
    if (theme) setCurrentTheme(theme);
    try {
      const session = await api.getSession();
      if (session.user) {
        setCurrentUser(session.user);
      }
    } catch (err) {
      console.error('[Chestlist][handleAuthSuccess]', err);
    }
    setIsAuthenticated(true);
    setNotesActiveTab('diary');
    setCurrentTab('home');
    setIsLoading(true);
    await reloadData();
  };

  const handleConfirmLogout = async () => {
    try {
      await api.logOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsNotesUnlocked(false);
      setNotesActiveTab('diary');
      setIsLogoutModalOpen(false);
      setLoadError(false);
      setActionError(null);
      setAuthView('landing');
      showToast("You've been logged out. See you soon!");
    } catch (err) {
      console.error('[Chestlist][handleConfirmLogout]', err);
      setActionError({
        message: api.GENERIC_USER_ERROR,
        retry: handleConfirmLogout,
      });
    }
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const findMatchedOverdrawnAccount = (
    freshAccounts: AccountWallet[] | undefined,
    accountRef?: string
  ): AccountWallet | undefined => {
    if (!freshAccounts || !accountRef) return undefined;
    const key = accountRef.trim().toLowerCase();
    const acc = freshAccounts.find(
      (a) => a.id === accountRef || a.name.trim().toLowerCase() === key
    );
    return acc && acc.balanceCentavos < 0 ? acc : undefined;
  };

  // Quick deposit pre-selected goal
  const [quickDepositGoalId, setQuickDepositGoalId] = useState<string | undefined>(undefined);

  // Expense Handlers
  const handleAddExpense = async (expenseData: {
    title: string;
    amountCentavos: number;
    category: CategoryName;
    categoryId?: string;
    subcategoryId?: string | null;
    subcategoryLabel?: string | null;
    categoryConfidence?: number | null;
    subcategoryConfidence?: number | null;
    categoryUserConfirmed?: boolean;
    date: string;
    account?: string;
    allowOverdraft?: boolean;
  }) => {
    await api.addExpense(expenseData);
    const fresh = await reloadData();
    const overdrawnAcc = expenseData.allowOverdraft
      ? findMatchedOverdrawnAccount(fresh?.accounts, expenseData.account)
      : undefined;
    if (overdrawnAcc) {
      showToast(`Saved. ${overdrawnAcc.name} is now at ${api.formatPHP(overdrawnAcc.balanceCentavos)}.`);
    } else {
      showToast('Expense added.');
    }
  };

  const handleUpdateExpense = async (
    id: string,
    updates: Partial<Expense> & { allowOverdraft?: boolean }
  ) => {
    const updated = await api.updateExpense(id, updates);
    const fresh = await reloadData();
    const overdrawnAcc = updates.allowOverdraft
      ? findMatchedOverdrawnAccount(fresh?.accounts, updated.account || updates.account)
      : undefined;
    if (overdrawnAcc) {
      showToast(`Saved. ${overdrawnAcc.name} is now at ${api.formatPHP(overdrawnAcc.balanceCentavos)}.`);
    } else {
      showToast('Expense updated.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    await reloadData();
    showToast('Expense removed.');
  };

  const handleSetCategoryLimit = async (categoryIdOrKey: string, limitCentavos: number) => {
    await api.setCategoryLimit(categoryIdOrKey, limitCentavos);
    await reloadData();
    showToast('Category limit saved.');
  };

  const handleRemoveCategoryLimit = async (categoryIdOrKey: string) => {
    await api.removeCategoryLimit(categoryIdOrKey);
    await reloadData();
    showToast('Category limit removed.');
  };

  // Savings Handlers
  const handleAddDeposit = async (
    goalId: string,
    amountCentavos: number,
    date?: string,
    fromAccount?: string,
    allowOverdraft?: boolean
  ) => {
    const res = await api.addSavingsDeposit(
      goalId,
      amountCentavos,
      date,
      fromAccount,
      allowOverdraft
    );
    const fresh = await reloadData();
    const overdrawnAcc = allowOverdraft
      ? findMatchedOverdrawnAccount(fresh?.accounts, fromAccount)
      : undefined;
    if (overdrawnAcc) {
      showToast(`Saved. ${overdrawnAcc.name} is now at ${api.formatPHP(overdrawnAcc.balanceCentavos)}.`);
    } else {
      showToast('Deposit added. Nice work!');
    }
    return res;
  };

  const handleCreateGoal = async (data: {
    title: string;
    targetCentavos: number;
    deadline: string;
    backingAccount: string;
    containerSkin: ContainerSkin;
    note?: string;
    emoji?: string;
  }) => {
    await api.createSavingsGoal(data);
    await reloadData();
    showToast('New savings goal created.');
  };

  const handleUpdateSkin = async (goalId: string, skin: ContainerSkin) => {
    await api.updateSavingsGoal(goalId, { containerSkin: skin });
    await reloadData();
    showToast('Container skin updated.');
  };

  const handleUpdateGoal = async (
    goalId: string,
    updates: Partial<{ title: string; targetCentavos: number; deadline: string }>
  ) => {
    await api.updateSavingsGoal(goalId, updates);
    await reloadData();
    showToast('Savings goal updated.');
  };

  const handleMarkGoalCompleted = async (goalId: string) => {
    await api.updateSavingsGoal(goalId, { isCompleted: true });
    await reloadData();
    showToast('Goal marked as completed!');
  };

  // Debt Handlers
  const handleLogDebtPayment = async (
    debtId: string,
    amountCentavos: number,
    options?: {
      date?: string;
      time?: string;
      channel?: 'GCash' | 'Maya' | 'Bank' | 'Cash' | 'Other';
      paidFromAccount?: string;
      allowOverdraft?: boolean;
    }
  ) => {
    const res = await api.logDebtPayment(debtId, amountCentavos, options);
    const fresh = await reloadData();
    const overdrawnAcc = options?.allowOverdraft
      ? findMatchedOverdrawnAccount(fresh?.accounts, options?.paidFromAccount)
      : undefined;
    if (overdrawnAcc) {
      showToast(`Saved. ${overdrawnAcc.name} is now at ${api.formatPHP(overdrawnAcc.balanceCentavos)}.`);
    } else {
      showToast('Debt payment logged.');
    }
    return res;
  };

  const handleCreateDebt = async (data: {
    title: string;
    creditor?: string;
    totalCentavos: number;
    type: DebtType;
    dueDate: string;
    dueTime?: string;
    remindersEnabled?: boolean;
    notes?: string;
  }) => {
    await api.createDebt(data);
    await reloadData();
    showToast('New debt added.');
  };

  const handleArchiveDebt = async (debtId: string) => {
    await api.archiveDebt(debtId);
    await reloadData();
    showToast('Debt archived.');
  };

  const handleUnarchiveDebt = async (debtId: string) => {
    await api.unarchiveDebt(debtId);
    await reloadData();
    showToast('Debt unarchived.');
  };

  const handleDeleteDebtPayment = async (debtId: string, paymentId: string) => {
    await api.deleteDebtPayment(debtId, paymentId);
    await reloadData();
    showToast('Payment deleted.');
  };

  // Checklist Handlers
  const handleToggleChecklist = async (id: string) => {
    try {
      setActionError(null);
      const res = await api.toggleChecklistTask(id);
      setChecklist(res.items);
      if (res.isNewlyCompletedAll) {
        showToast('All tasks completed! Great job! 🎉');
      }
    } catch (err) {
      console.error('[Chestlist][handleToggleChecklist]', err);
      setActionError({
        message: api.GENERIC_USER_ERROR,
        retry: () => handleToggleChecklist(id),
      });
    }
  };

  const handleNavigateToChecklist = () => {
    setNotesActiveTab('checklist');
    setCurrentTab('notes');
  };

  // Notes & Diary Handlers
  const handleSaveDiaryEntry = async (
    data: Parameters<typeof api.saveDiaryEntry>[0],
    options?: { silent?: boolean }
  ) => {
    const entry = await api.saveDiaryEntry(data);
    await reloadData();
    if (!options?.silent) {
      showToast('Entry saved.');
    }
    return entry;
  };

  const handleToggleAutoReadMoodOnSave = (enabled: boolean) => {
    setAutoReadMoodOnSave(enabled);
    api.setAutoReadMoodOnSaveSetting(enabled);
  };

  const handleDeleteDiaryEntry = async (id: string) => {
    const res = await api.deleteDiaryEntry(id);
    await reloadData();
    showToast('Diary entry removed.');
    return res;
  };

  const handleAddNote = async (noteData: {
    title: string;
    body: string;
    category?: any;
    date?: string;
  }) => {
    await api.addLifeNote(noteData as any);
    await reloadData();
    showToast('Note saved.');
  };

  const handleDeleteNote = async (id: string) => {
    await api.deleteLifeNote(id);
    await reloadData();
    showToast('Note deleted.');
  };

  // Wallet Navigation
  const handleOpenWallet = () => {
    if (currentTab !== 'wallet') {
      setPreviousTab(currentTab);
    }
    setCurrentTab('wallet');
  };

  // Account & Wallet Handlers
  const handleAddAccount = async (data: {
    name: string;
    nickname?: string;
    type: AccountType;
    last4?: string;
    accountNumber?: string;
    startingBalanceCentavos: number;
    color: string;
    textColor?: string;
  }) => {
    await api.addAccount(data);
    await reloadData();
    showToast('Account added to your wallet.');
  };

  const handleUpdateAccountBalance = async (
    accountId: string,
    newBalanceCentavos: number
  ) => {
    const res = await api.updateAccountBalance(accountId, newBalanceCentavos);
    await reloadData();
    showToast(
      res.adjustment
        ? 'Balance updated with adjustment record.'
        : 'Balance confirmed as up to date.'
    );
    return res;
  };

  const handleImportMessage = async (params: {
    amountCentavos: number;
    merchant: string;
    direction: 'debit' | 'credit';
    category: CategoryName;
    accountId: string;
    accountName: string;
    referenceNumber?: string;
    allowOverdraft?: boolean;
  }) => {
    await api.confirmImportedTransaction(params);
    const fresh = await reloadData();
    const overdrawnAcc =
      params.direction === 'debit' && params.allowOverdraft
        ? findMatchedOverdrawnAccount(fresh?.accounts, params.accountId || params.accountName)
        : undefined;
    if (overdrawnAcc) {
      showToast(`Saved. ${overdrawnAcc.name} is now at ${api.formatPHP(overdrawnAcc.balanceCentavos)}.`);
    } else {
      showToast(
        params.direction === 'debit'
          ? 'Imported transaction saved as expense.'
          : 'Imported transaction saved as deposit.'
      );
    }
  };

  const handleLinkGoalBackingAccount = async (
    goalId: string,
    backingAccountName: string
  ) => {
    await api.updateGoalBackingAccount(goalId, backingAccountName);
    await reloadData();
    showToast(`Savings goal backed by ${backingAccountName}.`);
  };

  // Quick Action Router
  const handleQuickAction = (action: 'addExpense' | 'addSavings' | 'logPayment' | 'newNote') => {
    switch (action) {
      case 'addExpense':
        setCurrentTab('budget');
        break;
      case 'addSavings':
        setIsAddSavingsModalOpen(true);
        break;
      case 'logPayment':
        setIsLogPaymentModalOpen(true);
        break;
      case 'newNote':
        setNotesActiveTab('diary');
        setCurrentTab('notes');
        break;
    }
  };

  // Export Data JSON
  const handleExportData = async () => {
    try {
      setActionError(null);
      const jsonStr = await api.exportAllDataJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chestlist_data_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Export file downloaded.');
    } catch (err) {
      console.error('[Chestlist][handleExportData]', err);
      setActionError({
        message: api.GENERIC_USER_ERROR,
        retry: handleExportData,
      });
    }
  };

  // Focus Cancel by default and close reset confirmation modal on Escape
  useEffect(() => {
    if (!isResetConfirmModalOpen) return;
    cancelResetBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResettingData) {
        setIsResetConfirmModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isResetConfirmModalOpen, isResettingData]);

  // Reset to default sample data
  const runResetData = async () => {
    setIsResettingData(true);
    try {
      setActionError(null);
      await api.resetToSampleData();
      await reloadData();
      showToast('Data reset to sample.');
      setIsResetConfirmModalOpen(false);
    } catch (err) {
      console.error('[Chestlist][handleResetData]', err);
      setIsResetConfirmModalOpen(false);
      setActionError({
        message: api.GENERIC_USER_ERROR,
        retry: runResetData,
      });
    } finally {
      setIsResettingData(false);
    }
  };

  const handleResetData = () => {
    setIsResetConfirmModalOpen(true);
  };

  // Signed-out visitors see only Landing, Sign-up, and Login
  if (!isAuthenticated) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] flex flex-col items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[var(--color-primary)]" />
          <p className="text-xs font-medium text-[var(--color-muted)]">Opening Chestlist...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] flex flex-col font-['Inter'] selection:bg-[var(--color-container)] selection:text-[var(--color-primary)]">
        {authView === 'landing' && (
          <LandingView
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            onGoToLogin={() => setAuthView('login')}
            onGoToSignUp={() => setAuthView('signup')}
          />
        )}

        {authView === 'signup' && (
          <SignUpView
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            onSuccess={handleAuthSuccess}
            onGoToLogin={() => setAuthView('login')}
            onBackToLanding={() => setAuthView('landing')}
            showToast={showToast}
          />
        )}

        {authView === 'login' && (
          <LoginView
            currentTheme={currentTheme}
            onSuccess={handleAuthSuccess}
            onGoToSignUp={() => setAuthView('signup')}
            onBackToLanding={() => setAuthView('landing')}
            showToast={showToast}
          />
        )}

        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-3.5 px-4 rounded-[14px] bg-slate-900 text-white shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] flex flex-col font-['Inter'] selection:bg-[var(--color-container)] selection:text-[var(--color-primary)]">
      {/* 1. Top Navbar (Fixed 72px) */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentTheme={currentTheme}
        onThemeChange={(theme) => {
          setCurrentTheme(theme);
          api.updateUserTheme(theme).catch((err) => {
            console.error('[Chestlist][updateUserTheme]', err);
            setActionError({
              message: api.GENERIC_USER_ERROR,
              retry: () => {
                setActionError(null);
                api.updateUserTheme(theme).catch((retryErr) => {
                  console.error('[Chestlist][updateUserThemeRetry]', retryErr);
                });
              },
            });
          });
        }}
        onError={(retry) =>
          setActionError({
            message: api.GENERIC_USER_ERROR,
            retry,
          })
        }
        onExportData={handleExportData}
        onResetData={handleResetData}
        notificationCount={financialHealth?.activeReminders?.length || 0}
        activeReminders={financialHealth?.activeReminders || []}
        categoryLimits={categoryLimits}
        onLogPaymentReminder={() => {
          setCurrentTab('debt');
        }}
        user={currentUser}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        autoReadMoodOnSave={autoReadMoodOnSave}
        onToggleAutoReadMoodOnSave={handleToggleAutoReadMoodOnSave}
        onOpenCategoriesModal={() => setIsManageCategoriesOpen(true)}
      />

      {/* 2. Main Page Content Viewport with 250ms fade + 12px upward slide transition */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-[92px] pb-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-[var(--color-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[var(--color-primary)]" />
            <p className="text-xs font-medium">Opening Chestlist...</p>
          </div>
        ) : loadError || !financialHealth ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
            <div className="chest-card p-8 max-w-sm w-full bg-white space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-[#A84255] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {api.GENERIC_USER_ERROR}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  reloadData();
                }}
                className="chest-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            key={currentTab}
            className="animate-in fade-in slide-in-from-bottom-3 duration-250 fill-mode-both"
          >
            {currentTab === 'home' && (
              <DashboardView
                userName={currentUser?.name}
                financialHealth={financialHealth}
                expenses={expenses}
                categories={categories}
                savingsGoals={savingsGoals}
                debts={debts}
                accounts={accounts}
                checklist={checklist}
                notes={notes}
                onOpenWallet={handleOpenWallet}
                onQuickAction={handleQuickAction}
                onToggleChecklist={handleToggleChecklist}
                onNavigateTab={setCurrentTab}
                onNavigateToChecklist={handleNavigateToChecklist}
              />
            )}

            {currentTab === 'budget' && (
              <BudgetView
                financialHealth={financialHealth}
                expenses={expenses}
                categories={categories}
                useSubcategories={useSubcategories}
                categoryLimits={categoryLimits}
                accounts={accounts}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                onUpdateBalance={handleUpdateAccountBalance}
                onSetCategoryLimit={handleSetCategoryLimit}
                onRemoveCategoryLimit={handleRemoveCategoryLimit}
                onSubcategoryCreated={async () => { await reloadData(); }}
                onOpenManageCategories={() => setIsManageCategoriesOpen(true)}
                showToast={showToast}
              />
            )}

            {currentTab === 'savings' && (
              <SavingsView
                savingsGoals={savingsGoals}
                accounts={accounts}
                totalSavedCentavos={financialHealth.totalSavedCentavos}
                onAddDeposit={handleAddDeposit}
                onCreateGoal={handleCreateGoal}
                onUpdateSkin={handleUpdateSkin}
                onUpdateGoal={handleUpdateGoal}
                onMarkGoalCompleted={handleMarkGoalCompleted}
                onUpdateBalance={handleUpdateAccountBalance}
                onOpenWallet={handleOpenWallet}
                onOpenQuickDeposit={(goalId) => {
                  setQuickDepositGoalId(goalId);
                  setIsAddSavingsModalOpen(true);
                }}
              />
            )}

            {currentTab === 'debt' && (
              <DebtView
                debts={debts}
                accounts={accounts}
                targetFreeDateLabel={financialHealth.targetFreeDateLabel}
                onLogPayment={handleLogDebtPayment}
                onCreateDebt={handleCreateDebt}
                onArchiveDebt={handleArchiveDebt}
                onUnarchiveDebt={handleUnarchiveDebt}
                onDeletePayment={handleDeleteDebtPayment}
                onUpdateBalance={handleUpdateAccountBalance}
              />
            )}

            {currentTab === 'notes' && (
              <NotesView
                entries={isNotesUnlocked ? diaryEntries : []}
                checklistItems={checklist}
                activeTab={notesActiveTab}
                onTabChange={setNotesActiveTab}
                isDiaryUnlocked={isNotesUnlocked}
                onUnlockDiary={() => {
                  setIsNotesUnlocked(true);
                  setLastNotesActivity(Date.now());
                }}
                onLockNow={() => setIsNotesUnlocked(false)}
                onBackToDashboard={() => setCurrentTab('home')}
                onSaveEntry={handleSaveDiaryEntry}
                onDeleteEntry={handleDeleteDiaryEntry}
                onRefreshChecklist={async () => { await reloadData(); }}
                autoReadMoodOnSave={autoReadMoodOnSave}
                showToast={showToast}
              />
            )}

            {currentTab === 'wallet' && (
              <WalletView
                accounts={accounts}
                savingsGoals={savingsGoals}
                categories={categories}
                onBack={() => setCurrentTab(previousTab)}
                onAddAccount={handleAddAccount}
                onUpdateBalance={handleUpdateAccountBalance}
                onImportMessage={handleImportMessage}
                onLinkGoalBackingAccount={handleLinkGoalBackingAccount}
              />
            )}
          </div>
        )}
      </main>

      {/* 3. Global Floating Toast with coin icon for savings */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 p-3.5 px-4 rounded-[14px] bg-slate-900 text-white shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Global Safe Error Banner with Retry */}
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-20 md:bottom-6 left-6 z-50 p-3.5 px-4 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] shadow-xl text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{actionError.message}</span>
          <button
            type="button"
            onClick={() => {
              const fn = actionError.retry;
              setActionError(null);
              fn();
            }}
            className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-0.5 rounded hover:bg-rose-100 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Global Modals */}

      <AddSavingsModal
        isOpen={isAddSavingsModalOpen}
        onClose={() => {
          setIsAddSavingsModalOpen(false);
          setQuickDepositGoalId(undefined);
        }}
        goals={savingsGoals}
        targetGoalId={quickDepositGoalId}
        onAddDeposit={async (goalId, amt) => {
          await handleAddDeposit(goalId, amt);
        }}
      />

      <LogPaymentModal
        isOpen={isLogPaymentModalOpen}
        onClose={() => setIsLogPaymentModalOpen(false)}
        debts={debts}
        accounts={accounts}
        onLogPayment={handleLogDebtPayment}
        onUpdateBalance={handleUpdateAccountBalance}
      />

      <AddNoteModal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        onAddNote={handleAddNote}
      />

      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onCategoriesChanged={async () => { await reloadData(); }}
        showToast={showToast}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmLogout={handleConfirmLogout}
      />

      {isResetConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-sample-data-title"
          onClick={() => {
            if (!isResettingData) setIsResetConfirmModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-[24px] bg-white border border-[var(--color-border)] p-6 md:p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={isResettingData}
              onClick={() => setIsResetConfirmModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              aria-label="Close reset confirmation modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4 shadow-xs">
              <RefreshCw className={`w-6 h-6 ${isResettingData ? 'animate-spin' : ''}`} />
            </div>

            <h3
              id="reset-sample-data-title"
              className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
            >
              Replace all your data with sample data?
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
              This permanently deletes all your accounts, expenses, savings, debts, notes, and tasks, and replaces them with sample data. This cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                ref={cancelResetBtnRef}
                type="button"
                autoFocus
                disabled={isResettingData}
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="min-h-[44px] sm:min-w-[110px] chest-button-secondary py-2.5 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingData}
                onClick={runResetData}
                className="min-h-[44px] flex-1 rounded-[12px] bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-5 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2"
              >
                {isResettingData ? 'Resetting...' : 'Delete and load sample data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
