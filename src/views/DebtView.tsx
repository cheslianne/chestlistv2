import React, { useState, useId, useMemo, useEffect, useRef } from 'react';
import { AccountWallet, DebtItem, DebtPayment, DebtType } from '../types';
import {
  formatPHP,
  fromDbAccountType,
  pesosToCentavos,
  getManilaDateString,
  getUserSafeErrorMessage,
  GENERIC_USER_ERROR,
  InsufficientFundsError,
  getMatchingChannelForAccount,
  validatePaymentChannelAccountMatch,
  doesAccountMatchChannel,
  filterAccountsByChannel,
  getChannelDisplayLabel,
  updateAccountBalance as apiUpdateAccountBalance,
} from '../api';
import { AddDebtModal } from '../components/AddDebtModal';
import { DebtCompletionModal } from '../components/DebtCompletionModal';
import { InsufficientBalanceModal } from '../components/InsufficientBalanceModal';
import { UpdateBalanceModal } from '../components/UpdateBalanceModal';
import {
  CreditCard,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Calendar,
  Wallet,
  X,
  Check,
  Sparkles,
  ChevronDown,
  History,
  Archive,
  ArrowRight,
  TrendingUp,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface DebtViewProps {
  debts: DebtItem[];
  accounts: AccountWallet[];
  targetFreeDateLabel?: string;
  onLogPayment: (
    debtId: string,
    amountCentavos: number,
    options?: {
      date?: string;
      time?: string;
      channel?: 'GCash' | 'Maya' | 'Bank' | 'Cash' | 'Other';
      paidFromAccount?: string;
      allowOverdraft?: boolean;
    }
  ) => Promise<{ debt: DebtItem; isNewlyCompleted: boolean }>;
  onCreateDebt: (data: {
    title: string;
    creditor?: string;
    totalCentavos: number;
    type: DebtType;
    dueDate: string;
    dueTime?: string;
    remindersEnabled?: boolean;
    notes?: string;
  }) => Promise<void>;
  onArchiveDebt: (debtId: string) => Promise<void>;
  onUnarchiveDebt: (debtId: string) => Promise<void>;
  onDeletePayment: (debtId: string, paymentId: string) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
}

export const DebtView: React.FC<DebtViewProps> = ({
  debts,
  accounts,
  targetFreeDateLabel,
  onLogPayment,
  onCreateDebt,
  onArchiveDebt,
  onUnarchiveDebt,
  onDeletePayment,
  onUpdateBalance,
}) => {
  // Currently selected debt for the payment form and row highlighting
  const [selectedDebtId, setSelectedDebtId] = useState<string>(
    () => debts.find((d) => !d.isArchived)?.id || ''
  );

  // Scope filter for the right column Donut & History: 'all' or specific debt ID
  const [donutScopeId, setDonutScopeId] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [completionDebt, setCompletionDebt] = useState<DebtItem | null>(null);

  // Top banner dismiss state
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);

  // Success toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Payment Form State
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payDate, setPayDate] = useState(() => getManilaDateString());
  const [payTime, setPayTime] = useState('12:00');
  const [payChannel, setPayChannel] = useState<'GCash' | 'Maya' | 'Bank' | 'Cash' | 'Other'>('GCash');
  const [paidFromAccount, setPaidFromAccount] = useState<string>('');
  const [accountClearedNote, setAccountClearedNote] = useState<string | null>(null);
  const [isNoAccountConfirmOpen, setIsNoAccountConfirmOpen] = useState(false);
  const goBackNoAccountBtnRef = useRef<HTMLButtonElement>(null);
  const accountSelectRef = useRef<HTMLSelectElement>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [insufficientCheck, setInsufficientCheck] = useState<{
    account: AccountWallet;
    availableCentavos: number;
    requiredCentavos: number;
  } | null>(null);
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState<AccountWallet | null>(null);

  // Delete payment modal & error state
  const [deletingPayment, setDeletingPayment] = useState<(DebtPayment & { debtTitle: string }) | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [deletePaymentError, setDeletePaymentError] = useState<{
    debtId: string;
    paymentId: string;
    message: string;
  } | null>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!deletingPayment) return;
    cancelDeleteBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeletingPayment) {
        setDeletingPayment(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingPayment, isDeletingPayment]);

  useEffect(() => {
    if (!isNoAccountConfirmOpen) return;
    goBackNoAccountBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmittingPay) {
        setIsNoAccountConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNoAccountConfirmOpen, isSubmittingPay]);

  // Archived debts section state
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [unarchivingDebtId, setUnarchivingDebtId] = useState<string | null>(null);
  const [unarchiveError, setUnarchiveError] = useState<{
    debtId: string;
    message: string;
  } | null>(null);

  // Filter out archived debts for the active tracker list
  const activeDebts = useMemo(() => debts.filter((d) => !d.isArchived), [debts]);
  const archivedDebts = useMemo(() => debts.filter((d) => d.isArchived), [debts]);

  const selectedPaidFromAccount = useMemo(
    () =>
      paidFromAccount
        ? accounts.find((acc) => acc.name === paidFromAccount)
        : undefined,
    [accounts, paidFromAccount]
  );

  const parsedPayAmount = parseFloat(payAmountStr);
  const payAmountCentavos =
    !isNaN(parsedPayAmount) && parsedPayAmount > 0
      ? pesosToCentavos(parsedPayAmount)
      : 0;
  const exceedsPaidFromAccountBalance = Boolean(
    selectedPaidFromAccount && payAmountCentavos > selectedPaidFromAccount.balanceCentavos
  );

  const channelMismatchError = useMemo(
    () => validatePaymentChannelAccountMatch(payChannel, selectedPaidFromAccount),
    [payChannel, selectedPaidFromAccount]
  );

  const filteredAccounts = useMemo(
    () => filterAccountsByChannel(accounts, payChannel),
    [accounts, payChannel]
  );

  // Keep selectedDebt synchronized
  useEffect(() => {
    if (activeDebts.length > 0) {
      const exists = activeDebts.some((d) => d.id === selectedDebtId);
      if (!exists) {
        setSelectedDebtId(activeDebts[0].id);
      }
    }
  }, [activeDebts, selectedDebtId]);

  const selectedDebt = useMemo(() => {
    return activeDebts.find((d) => d.id === selectedDebtId) || activeDebts[0] || null;
  }, [activeDebts, selectedDebtId]);

  // Active reminder banner logic: 3 days before (warning) or due today (danger). Overdue nudges OFF.
  const activeReminder = useMemo(() => {
    if (isReminderDismissed) return null;
    // Find first debt due today or due in 3 days with remindersEnabled
    for (const d of activeDebts) {
      if (d.remindersEnabled && d.remainingCentavos > 0) {
        if (d.daysLeft === 0) {
          return {
            debt: d,
            type: 'due_today' as const,
            message: `Due today: ${d.title}.`,
          };
        }
        if (d.daysLeft === 3) {
          return {
            debt: d,
            type: 'due_soon' as const,
            message: `Reminder: ${d.title} (${formatPHP(d.remainingCentavos)}) is due in 3 days.`,
          };
        }
      }
    }
    return null;
  }, [activeDebts, isReminderDismissed]);

  // Totals for 'All debts' scope
  const allDebtsTotalCentavos = useMemo(() => {
    return activeDebts.reduce((sum, d) => sum + d.totalCentavos, 0);
  }, [activeDebts]);

  const allDebtsPaidCentavos = useMemo(() => {
    return activeDebts.reduce((sum, d) => sum + d.paidCentavos, 0);
  }, [activeDebts]);

  const allDebtsRemainingCentavos = useMemo(() => {
    return Math.max(0, allDebtsTotalCentavos - allDebtsPaidCentavos);
  }, [allDebtsTotalCentavos, allDebtsPaidCentavos]);

  const allDebtsPercentage = useMemo(() => {
    return allDebtsTotalCentavos > 0
      ? Math.round((allDebtsPaidCentavos / allDebtsTotalCentavos) * 100)
      : 100;
  }, [allDebtsTotalCentavos, allDebtsPaidCentavos]);

  // Stats for the active donut view (All or Specific)
  const donutData = useMemo(() => {
    if (donutScopeId === 'all' || !selectedDebt) {
      return {
        title: 'All debts',
        total: allDebtsTotalCentavos,
        paid: allDebtsPaidCentavos,
        remaining: allDebtsRemainingCentavos,
        percent: allDebtsPercentage,
      };
    }
    const current = activeDebts.find((d) => d.id === donutScopeId) || selectedDebt;
    return {
      title: current.title,
      total: current.totalCentavos,
      paid: current.paidCentavos,
      remaining: current.remainingCentavos,
      percent: current.percentagePaid,
    };
  }, [donutScopeId, selectedDebt, activeDebts, allDebtsTotalCentavos, allDebtsPaidCentavos, allDebtsRemainingCentavos, allDebtsPercentage]);

  // Target free date: latest due date among active debts
  const computedTargetFreeDate = useMemo(() => {
    if (targetFreeDateLabel) return targetFreeDateLabel;
    const unpaid = activeDebts.filter((d) => d.remainingCentavos > 0);
    if (unpaid.length === 0) return 'All settled';
    const sorted = [...unpaid].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const latest = sorted[0].dueDate;
    const [y, m, d] = latest.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1]} ${d}`;
  }, [targetFreeDateLabel, activeDebts]);

  // Payment history for right column (all or filtered by scope)
  const paymentHistory = useMemo(() => {
    if (donutScopeId === 'all') {
      const allPayments: Array<DebtPayment & { debtTitle: string }> = [];
      activeDebts.forEach((d) => {
        (d.payments || []).forEach((p) => {
          allPayments.push({ ...p, debtTitle: d.title });
        });
      });
      return allPayments.sort((a, b) => b.createdAt - a.createdAt);
    }
    const target = activeDebts.find((d) => d.id === donutScopeId) || selectedDebt;
    if (!target) return [];
    return (target.payments || []).map((p) => ({ ...p, debtTitle: target.title }));
  }, [donutScopeId, activeDebts, selectedDebt]);

  // Handle Pay Full button click: fills exact remaining centavos
  const handlePayFull = () => {
    if (!selectedDebt) return;
    const remainingPesos = (selectedDebt.remainingCentavos / 100).toString();
    setPayAmountStr(remainingPesos);
    setPayError(null);
  };

  const validatePaymentForm = (): number | null => {
    if (!selectedDebt || channelMismatchError) return null;

    const numericAmount = parseFloat(payAmountStr);
    if (!payAmountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setPayError('Enter an amount greater than ₱0.');
      return null;
    }

    const centavos = pesosToCentavos(numericAmount);
    if (centavos > selectedDebt.remainingCentavos) {
      setPayError("That's more than what's left on this debt.");
      return null;
    }

    return centavos;
  };

  const performSavePayment = async (allowOverdraft = false) => {
    if (!selectedDebt) return;
    const centavos = validatePaymentForm();
    if (centavos === null) return;

    const willOverdrawAccount = Boolean(
      allowOverdraft &&
        selectedPaidFromAccount &&
        selectedPaidFromAccount.balanceCentavos - centavos < 0
    );

    try {
      setIsSubmittingPay(true);
      setPayError(null);

      const result = await onLogPayment(selectedDebt.id, centavos, {
        date: payDate,
        time: payTime,
        channel: payChannel,
        paidFromAccount: paidFromAccount || undefined,
        ...(allowOverdraft ? { allowOverdraft: true } : {}),
      });

      setInsufficientCheck(null);
      setIsNoAccountConfirmOpen(false);
      setAccountClearedNote(null);

      // Show local success toast only when App-level overdraft toast won't be shown
      if (!willOverdrawAccount) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }

      // Reset payment input
      setPayAmountStr('');

      // If debt reached remaining 0, open completion modal
      if (result.isNewlyCompleted) {
        setCompletionDebt(result.debt);
      }
    } catch (err) {
      if (
        err instanceof InsufficientFundsError &&
        selectedPaidFromAccount &&
        !allowOverdraft
      ) {
        setInsufficientCheck({
          account: selectedPaidFromAccount,
          availableCentavos: err.details.available,
          requiredCentavos: err.details.required,
        });
        return;
      }
      console.error('[Chestlist][DebtView][logPayment]', err);
      setInsufficientCheck(null);
      setIsNoAccountConfirmOpen(false);
      setPayError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Submit payment handler
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const centavos = validatePaymentForm();
    if (centavos === null) return;
    if (!paidFromAccount) {
      setIsNoAccountConfirmOpen(true);
      return;
    }
    if (selectedPaidFromAccount && centavos > selectedPaidFromAccount.balanceCentavos) {
      setInsufficientCheck({
        account: selectedPaidFromAccount,
        availableCentavos: selectedPaidFromAccount.balanceCentavos,
        requiredCentavos: centavos,
      });
      return;
    }
    await performSavePayment(false);
  };

  // Delete payment handler
  const performDeletePayment = async (debtId: string, paymentId: string) => {
    try {
      setIsDeletingPayment(true);
      setDeletePaymentError(null);
      await onDeletePayment(debtId, paymentId);
      setDeletingPayment(null);
    } catch (err) {
      console.error('[Chestlist][DebtView][deletePayment]', err);
      setDeletingPayment(null);
      setDeletePaymentError({
        debtId,
        paymentId,
        message: getUserSafeErrorMessage(err),
      });
    } finally {
      setIsDeletingPayment(false);
    }
  };

  // Unarchive debt handler
  const performUnarchiveDebt = async (debtId: string) => {
    try {
      setUnarchivingDebtId(debtId);
      setUnarchiveError(null);
      await onUnarchiveDebt(debtId);
    } catch (err) {
      console.error('[Chestlist][DebtView][unarchiveDebt]', err);
      setUnarchiveError({
        debtId,
        message: getUserSafeErrorMessage(err),
      });
    } finally {
      setUnarchivingDebtId(null);
    }
  };

  // Render status chip with mandatory text and line icon
  const renderStatusChip = (debt: DebtItem) => {
    switch (debt.status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3D7950]" strokeWidth={2} />
            <span>Paid (100%)</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#842637] border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-[#A84255]" strokeWidth={2} />
            <span>Overdue ({Math.abs(debt.daysLeft)}d ago)</span>
          </span>
        );
      case 'due soon':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-[#C26910]" strokeWidth={2} />
            <span>{debt.daysLeft === 0 ? 'Due today' : `Due in ${debt.daysLeft}d`}</span>
          </span>
        );
      case 'active':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
            <span>Active ({debt.daysLeft}d left)</span>
          </span>
        );
    }
  };

  // SVG Donut math for 800ms animated circle
  const radius = 46;
  const circumference = 2 * Math.PI * radius; // ~289.02
  const strokeDashoffset = circumference - (donutData.percent / 100) * circumference;

  return (
    <div className="space-y-6 pb-20 md:pb-12 animate-in fade-in duration-300">
      {/* 1. Conditional Reminder Banner (Warning 3 days before; Danger on due date) */}
      {activeReminder && (
        <div
          className={`p-4 rounded-[18px] flex items-center justify-between gap-3 shadow-xs animate-in fade-up duration-300 ${
            activeReminder.type === 'due_today'
              ? 'bg-rose-50/90 border border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border border-amber-200/90 text-amber-950'
          }`}
          role="region"
          aria-label="Debt Reminder"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                activeReminder.type === 'due_today'
                  ? 'bg-rose-100 text-[#A84255]'
                  : 'bg-amber-100 text-[#C26910]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">{activeReminder.message}</p>
              <p className="text-[11px] opacity-80 hidden sm:block">
                {activeReminder.type === 'due_today'
                  ? 'Payment is scheduled for today. Settle before 11:59 PM.'
                  : 'Settle in advance to avoid late payment charges and preserve your score.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedDebtId(activeReminder.debt.id);
                setPayAmountStr((activeReminder.debt.remainingCentavos / 100).toString());
              }}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold text-white transition-all cursor-pointer ${
                activeReminder.type === 'due_today'
                  ? 'bg-[#A84255] hover:bg-[#8e3244]'
                  : 'bg-[#C26910] hover:bg-[#a75708]'
              }`}
            >
              Log payment
            </button>
            <button
              onClick={() => setIsReminderDismissed(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Header & Add Debt action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
            Debt & Installment Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
            Keep clear tabs on student loans, PayLater balances, and friends' splits
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="chest-button-secondary px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[var(--color-primary)]" strokeWidth={2} />
          <span>Add debt</span>
        </button>
      </div>

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div
          className="fixed bottom-20 sm:bottom-8 right-6 z-50 p-3.5 px-4 rounded-[14px] bg-emerald-800 text-white shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200"
          role="status"
        >
          <Check className="w-4 h-4 text-emerald-300" strokeWidth={2.5} />
          <span>Payment saved.</span>
        </div>
      )}

      {/* Empty State if no active debts */}
      {activeDebts.length === 0 ? (
        <div className="chest-card p-12 text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#3D7950]">
            <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
              You have no debts. Great job!
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
              All your student dues, PayLater installments, and borrowed amounts are completely settled.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="chest-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Add a debt obligation</span>
          </button>
        </div>
      ) : (
        /* 3. Main 2-Column Split: Left (List + Log Payment Card) & Right (Donut + History + Free Date) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* ================= LEFT COLUMN (Cards list + Log payment card) ================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Debts List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Obligations ({activeDebts.length})
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  Click a row to select & log payments
                </span>
              </div>

              <div className="space-y-3">
                {activeDebts.map((item) => {
                  const isSelected = selectedDebt?.id === item.id;
                  const isOverdue = item.status === 'overdue';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedDebtId(item.id);
                        setDonutScopeId(item.id);
                      }}
                      className={`chest-card p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-md bg-white'
                          : 'hover:border-slate-300 hover:shadow-xs bg-white'
                      } ${isOverdue ? 'border-l-4 border-l-[#A84255]' : ''}`}
                    >
                      {/* Top Row: Title, Creditor, Status Chip */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-[var(--color-text)] tracking-tight">
                              {item.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-container)]/60 text-[var(--color-text)]">
                              {item.type}
                            </span>
                          </div>
                          {item.creditor && item.creditor !== item.title && (
                            <p className="text-xs text-[var(--color-muted)] mt-0.5">
                              Creditor: {item.creditor}
                            </p>
                          )}
                        </div>

                        {renderStatusChip(item)}
                      </div>

                      {/* Amounts Grid */}
                      <div className="mt-3.5 grid grid-cols-3 gap-2 p-3 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[var(--color-muted)] block">
                            Total
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-[var(--color-text)] tabular-numbers">
                            {formatPHP(item.totalCentavos)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[var(--color-muted)] block">
                            Paid
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-[#3D7950] tabular-numbers">
                            {formatPHP(item.paidCentavos)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[var(--color-muted)] block">
                            Remaining
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold text-[#A84255] tabular-numbers">
                            {formatPHP(item.remainingCentavos)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar & Percentage */}
                      <div className="mt-3 space-y-1.5">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#3D7950] transition-all duration-700"
                            style={{ width: `${item.percentagePaid}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              Due: {item.dueDate}
                              {item.dueTime ? ` at ${item.dueTime}` : ''}
                            </span>
                          </div>
                          <span className="font-semibold tabular-numbers text-[var(--color-text)]">
                            {item.percentagePaid}% paid
                          </span>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="mt-2 text-[11px] text-[var(--color-muted)] italic truncate">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Log Payment Card for the Selected Debt */}
            {selectedDebt && (
              <div className="chest-card p-6 bg-white space-y-4 border-t-2 border-t-[var(--color-primary)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
                      <span>Log Payment for {selectedDebt.title}</span>
                    </h3>
                    <p className="text-xs text-[var(--color-muted)]">
                      Record a partial or full payment with optional account deduction
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-[#A84255] border border-rose-200 tabular-numbers self-start sm:self-auto">
                    {formatPHP(selectedDebt.remainingCentavos)} left
                  </span>
                </div>

                <form onSubmit={handleSavePayment} noValidate className="space-y-4">
                  {/* Amount Input with Pay Full button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="debt-pay-amount"
                        className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider"
                      >
                        Amount Paid (PHP)
                      </label>
                      <button
                        type="button"
                        onClick={handlePayFull}
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        Pay full ({formatPHP(selectedDebt.remainingCentavos)})
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-muted)]">
                        ₱
                      </span>
                      <input
                        id="debt-pay-amount"
                        type="number"
                        step="any"
                        min="1"
                        placeholder="e.g. 1500"
                        value={payAmountStr}
                        aria-invalid={payError ? 'true' : 'false'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPayAmountStr(val);
                          const num = parseFloat(val);
                          if (!isNaN(num) && num > 0 && num <= selectedDebt.remainingCentavos / 100) {
                            setPayError(null);
                          }
                        }}
                        className={`chest-input w-full pl-8 pr-3.5 py-2.5 text-sm tabular-numbers font-medium ${
                          payError ? 'border-[#A84255] focus:border-[#A84255]' : ''
                        }`}
                      />
                    </div>

                    {payError && (
                      <div className="mt-1.5 text-xs text-[#A84255] flex items-center justify-between gap-2 font-medium animate-in fade-in" role="alert">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{payError}</span>
                        </div>
                        {payError === GENERIC_USER_ERROR && (
                          <button
                            type="button"
                            onClick={() => void performSavePayment(false)}
                            disabled={isSubmittingPay}
                            className="px-2.5 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                    {exceedsPaidFromAccountBalance && selectedPaidFromAccount && !payError && (
                      <p className="mt-1.5 text-xs text-[#C26910] flex items-center gap-1 font-medium animate-in fade-in" role="status">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          This is more than the {formatPHP(selectedPaidFromAccount.balanceCentavos)} in {selectedPaidFromAccount.name}.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Date & Time Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="debt-pay-date"
                        className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
                      >
                        Payment Date
                      </label>
                      <input
                        id="debt-pay-date"
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="chest-input w-full px-3.5 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="debt-pay-time"
                        className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
                      >
                        Time
                      </label>
                      <input
                        id="debt-pay-time"
                        type="time"
                        value={payTime}
                        onChange={(e) => setPayTime(e.target.value)}
                        className="chest-input w-full px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {/* Channel & Account Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="debt-pay-channel"
                        className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
                      >
                        Payment Channel
                      </label>
                      <select
                        id="debt-pay-channel"
                        value={payChannel}
                        aria-invalid={channelMismatchError ? 'true' : 'false'}
                        onChange={(e) => {
                          const nextChannel = e.target.value as DebtPayment['channel'];
                          setPayChannel(nextChannel);
                          if (paidFromAccount) {
                            const currentAcc = accounts.find((acc) => acc.name === paidFromAccount);
                            if (!currentAcc || !doesAccountMatchChannel(currentAcc, nextChannel)) {
                              setPaidFromAccount('');
                              setAccountClearedNote(
                                `Account cleared because it doesn't match ${getChannelDisplayLabel(nextChannel)}.`
                              );
                            } else {
                              setAccountClearedNote(null);
                            }
                          } else {
                            setAccountClearedNote(null);
                          }
                        }}
                        className={`chest-input w-full px-3.5 py-2 text-sm cursor-pointer ${
                          channelMismatchError ? 'border-[#A84255] focus:border-[#A84255]' : ''
                        }`}
                      >
                        <option value="GCash">GCash</option>
                        <option value="Maya">Maya</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="Cash">Cash on Hand</option>
                        <option value="Other">Other</option>
                      </select>
                      {channelMismatchError && (
                        <div
                          className="mt-1.5 text-xs text-[#A84255] flex items-start gap-1 font-medium animate-in fade-in"
                          role="alert"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{channelMismatchError}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="debt-pay-from-account"
                        className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
                      >
                        Paid from Account (Optional)
                      </label>
                      <select
                        ref={accountSelectRef}
                        id="debt-pay-from-account"
                        value={paidFromAccount}
                        onChange={(e) => {
                          const nextAccount = e.target.value;
                          setPaidFromAccount(nextAccount);
                          setAccountClearedNote(null);
                          if (nextAccount) {
                            const matchedAcc = accounts.find((acc) => acc.name === nextAccount);
                            if (matchedAcc) {
                              setPayChannel(getMatchingChannelForAccount(matchedAcc));
                            }
                          }
                        }}
                        className="chest-input w-full px-3.5 py-2 text-sm cursor-pointer"
                      >
                        <option value="">None / External wallet</option>
                        {filteredAccounts.map((acc) => (
                          <option key={acc.id} value={acc.name}>
                            {acc.name} ({fromDbAccountType(acc.type)}) · {formatPHP(acc.balanceCentavos)}
                          </option>
                        ))}
                      </select>
                      {accountClearedNote && (
                        <p className="mt-1.5 text-xs text-[var(--color-muted)]" role="status">
                          {accountClearedNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        isSubmittingPay ||
                        Boolean(channelMismatchError) ||
                        Boolean(payError && payError !== GENERIC_USER_ERROR)
                      }
                      className="chest-button-primary px-6 py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      {isSubmittingPay ? 'Saving payment...' : 'Save payment'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN (Donut + Scope Dropdown + Free Date + History) ================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* Progress Donut Card */}
            <div className="chest-card p-6 bg-white space-y-5">
              {/* Scope Switcher Dropdown */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Progress Donut
                </span>

                <div className="relative">
                  <select
                    value={donutScopeId}
                    onChange={(e) => {
                      setDonutScopeId(e.target.value);
                      if (e.target.value !== 'all') {
                        setSelectedDebtId(e.target.value);
                      }
                    }}
                    className="chest-input py-1.5 pl-3 pr-7 text-xs font-semibold cursor-pointer appearance-none bg-white"
                    aria-label="Select donut scope"
                  >
                    <option value="all">
                      All debts ({allDebtsPercentage}% paid)
                    </option>
                    {activeDebts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.percentagePaid}% paid)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* SVG Donut Illustration (800ms Clockwise Draw-in Animation) */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg
                    className="w-44 h-44 -rotate-90 transform"
                    viewBox="0 0 120 120"
                    role="img"
                    aria-label={`Debt payment progress: ${donutData.percent}% paid`}
                  >
                    {/* Background ring */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#E5E7EB"
                      strokeWidth="11"
                    />
                    {/* Paid arc (income green #3D7950) */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#3D7950"
                      strokeWidth="11"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 800ms ease-out',
                      }}
                    />
                  </svg>

                  {/* Center Label: "62% paid" & "₱5,200 of ₱8,400" */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <span className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans'] tabular-numbers">
                      {donutData.percent}%
                    </span>
                    <span className="text-[11px] font-bold text-[#3D7950] uppercase tracking-wider mt-0.5">
                      paid
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-muted)] tabular-numbers mt-1">
                      {formatPHP(donutData.paid)} of {formatPHP(donutData.total)}
                    </span>
                  </div>
                </div>

                {/* Caption: "₱3,200 to go." */}
                <p className="text-xs font-bold text-[var(--color-text)] mt-3">
                  <span className="text-[#A84255] tabular-numbers">{formatPHP(donutData.remaining)}</span> to go.
                </p>
              </div>

              {/* Target Free Date Stat */}
              <div className="p-3.5 rounded-[16px] bg-[var(--color-container)]/30 border border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
                    <Calendar className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider block">
                      Target Free Date
                    </span>
                    <span className="text-sm font-bold text-[var(--color-text)]">
                      {computedTargetFreeDate}
                    </span>
                  </div>
                </div>

                <span className="text-xs text-[var(--color-muted)] font-medium">
                  Latest active due date
                </span>
              </div>
            </div>

            {/* Payment History Card */}
            <div className="chest-card p-5 sm:p-6 bg-white space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--color-primary)]" strokeWidth={1.75} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Payment History
                  </h3>
                </div>

                <span className="text-xs text-[var(--color-muted)]">
                  {paymentHistory.length} {paymentHistory.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {deletePaymentError && (
                <div
                  role="alert"
                  className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{deletePaymentError.message}</span>
                  </div>
                  <button
                    type="button"
                    disabled={isDeletingPayment}
                    onClick={() =>
                      performDeletePayment(deletePaymentError.debtId, deletePaymentError.paymentId)
                    }
                    className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              )}

              {paymentHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--color-muted)]">
                  No payments recorded for this selection yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {paymentHistory.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--color-text)] block truncate">
                          {pay.debtTitle}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] mt-0.5 flex-wrap">
                          <span>{pay.date}</span>
                          {pay.time && <span>· {pay.time}</span>}
                          <span>· via {pay.channel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-[#3D7950] tabular-numbers block">
                            +{formatPHP(pay.amountCentavos)}
                          </span>
                          {pay.paidFromAccount && (
                            <span className="text-[10px] text-[var(--color-muted)]">
                              from {pay.paidFromAccount}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setDeletingPayment(pay)}
                          className="p-1.5 rounded-[8px] bg-rose-50/70 hover:bg-rose-100 text-[#A84255] transition-colors cursor-pointer shrink-0"
                          aria-label={`Delete payment of ${formatPHP(pay.amountCentavos)} for ${pay.debtTitle}`}
                          title="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.9} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Collapsed Archived Debts Section at the bottom (hidden when there are none) */}
      {archivedDebts.length > 0 && (
        <div className="chest-card bg-white overflow-hidden">
          <button
            type="button"
            aria-expanded={isArchivedExpanded}
            onClick={() => setIsArchivedExpanded((prev) => !prev)}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-surface)]/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-container)]/60 flex items-center justify-center text-[var(--color-primary)]">
                <Archive className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                  Archived debts ({archivedDebts.length})
                </h3>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Settled or archived obligations and their payment records
                </p>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-[var(--color-muted)] transition-transform duration-200 ${
                isArchivedExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isArchivedExpanded && (
            <div className="px-5 pb-5 pt-2 border-t border-[var(--color-border)] space-y-4 animate-in fade-in duration-150">
              {unarchiveError && (
                <div
                  role="alert"
                  className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{unarchiveError.message}</span>
                  </div>
                  <button
                    type="button"
                    disabled={unarchivingDebtId === unarchiveError.debtId}
                    onClick={() => performUnarchiveDebt(unarchiveError.debtId)}
                    className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              )}

              {deletePaymentError &&
                archivedDebts.some((d) => d.id === deletePaymentError.debtId) && (
                  <div
                    role="alert"
                    className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="font-semibold">{deletePaymentError.message}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isDeletingPayment}
                      onClick={() =>
                        performDeletePayment(
                          deletePaymentError.debtId,
                          deletePaymentError.paymentId
                        )
                      }
                      className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  </div>
                )}

              <div className="space-y-3">
                {archivedDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[var(--color-text)]">
                            {debt.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-container)]/60 text-[var(--color-text)]">
                            {debt.type}
                          </span>
                          {renderStatusChip(debt)}
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-xs text-[var(--color-muted)] flex-wrap">
                          <span>
                            Total:{' '}
                            <strong className="text-[var(--color-text)] tabular-numbers">
                              {formatPHP(debt.totalCentavos)}
                            </strong>
                          </span>
                          <span>
                            Paid:{' '}
                            <strong className="text-[#3D7950] tabular-numbers">
                              {formatPHP(debt.paidCentavos)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={unarchivingDebtId === debt.id}
                        onClick={() => performUnarchiveDebt(debt.id)}
                        className="chest-button-secondary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--color-primary)]" strokeWidth={1.9} />
                        <span>
                          {unarchivingDebtId === debt.id ? 'Unarchiving...' : 'Unarchive'}
                        </span>
                      </button>
                    </div>

                    {/* Payments inside archived debt */}
                    <div className="pt-2.5 border-t border-[var(--color-border)]/70 space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] block">
                        Payments ({debt.payments.length})
                      </span>

                      {debt.payments.length === 0 ? (
                        <p className="text-xs text-[var(--color-muted)]">
                          No payments recorded.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {debt.payments.map((pay) => (
                            <div
                              key={pay.id}
                              className="p-2.5 rounded-[12px] bg-white border border-[var(--color-border)] flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] flex-wrap">
                                  <span className="font-medium text-[var(--color-text)]">
                                    {pay.date}
                                  </span>
                                  {pay.time && <span>· {pay.time}</span>}
                                  <span>· via {pay.channel}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <div className="text-right">
                                  <span className="text-xs font-bold text-[#3D7950] tabular-numbers block">
                                    +{formatPHP(pay.amountCentavos)}
                                  </span>
                                  {pay.paidFromAccount && (
                                    <span className="text-[10px] text-[var(--color-muted)]">
                                      from {pay.paidFromAccount}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeletingPayment({ ...pay, debtTitle: debt.title })
                                  }
                                  className="p-1.5 rounded-[8px] bg-rose-50/70 hover:bg-rose-100 text-[#A84255] transition-colors cursor-pointer shrink-0"
                                  aria-label={`Delete payment of ${formatPHP(pay.amountCentavos)} for ${debt.title}`}
                                  title="Delete payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.9} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Debt Modal */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateDebt={onCreateDebt}
      />

      {/* Debt Completion Celebration Modal */}
      <DebtCompletionModal
        debt={completionDebt}
        isOpen={Boolean(completionDebt)}
        onClose={() => setCompletionDebt(null)}
        onArchive={onArchiveDebt}
      />

      {/* Delete Payment Confirmation Modal */}
      {deletingPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-debt-payment-title"
          onClick={() => {
            if (!isDeletingPayment) setDeletingPayment(null);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={isDeletingPayment}
              onClick={() => setDeletingPayment(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close delete payment confirmation modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3
              id="delete-debt-payment-title"
              className="text-base font-bold text-[var(--color-text)] pr-6"
            >
              Delete this payment?
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
              {deletingPayment.paidFromAccount
                ? `This will add ${formatPHP(deletingPayment.amountCentavos)} back to ${deletingPayment.paidFromAccount} and restore the debt balance.`
                : 'This will restore the debt balance.'}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                ref={cancelDeleteBtnRef}
                type="button"
                autoFocus
                disabled={isDeletingPayment}
                onClick={() => setDeletingPayment(null)}
                className="min-h-[40px] chest-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPayment}
                onClick={() => performDeletePayment(deletingPayment.debtId, deletingPayment.id)}
                className="min-h-[40px] rounded-[12px] bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2"
              >
                {isDeletingPayment ? 'Deleting...' : 'Delete payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Recording Payment Without an Account Modal */}
      {isNoAccountConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-account-confirm-title"
          onClick={() => {
            if (!isSubmittingPay) setIsNoAccountConfirmOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={isSubmittingPay}
              onClick={() => setIsNoAccountConfirmOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close confirmation modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3
              id="no-account-confirm-title"
              className="text-base font-bold text-[var(--color-text)] pr-6"
            >
              Record without an account?
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
              No account is selected, so this payment won't change any account balance in Chestlist. Record it anyway?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                ref={goBackNoAccountBtnRef}
                type="button"
                autoFocus
                disabled={isSubmittingPay}
                onClick={() => setIsNoAccountConfirmOpen(false)}
                className="min-h-[40px] chest-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={isSubmittingPay}
                onClick={() => void performSavePayment(false)}
                className="min-h-[40px] chest-button-primary px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                {isSubmittingPay ? 'Recording...' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <InsufficientBalanceModal
        isOpen={Boolean(insufficientCheck)}
        account={insufficientCheck?.account || null}
        availableCentavos={insufficientCheck?.availableCentavos || 0}
        requiredCentavos={insufficientCheck?.requiredCentavos || 0}
        kindLabel="debt payment"
        isSubmitting={isSubmittingPay}
        onChooseAnotherAccount={() => {
          setInsufficientCheck(null);
          setTimeout(() => {
            accountSelectRef.current?.focus();
          }, 0);
        }}
        onUpdateBalanceFirst={() => {
          if (!insufficientCheck) return;
          const accToUpdate = insufficientCheck.account;
          setInsufficientCheck(null);
          setUpdateBalanceAccount(accToUpdate);
        }}
        onAddAnyway={() => {
          void performSavePayment(true);
        }}
        onCancel={() => setInsufficientCheck(null)}
      />

      <UpdateBalanceModal
        account={updateBalanceAccount}
        isOpen={Boolean(updateBalanceAccount)}
        onClose={() => setUpdateBalanceAccount(null)}
        onUpdateBalance={onUpdateBalance || apiUpdateAccountBalance}
        zIndexClass="z-[60]"
      />
    </div>
  );
};
