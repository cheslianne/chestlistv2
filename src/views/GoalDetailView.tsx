import React, { useState, useRef } from 'react';
import { AccountWallet, ContainerSkin, SavingsGoal } from '../types';
import {
  formatPHP,
  pesosToCentavos,
  formatPrettyDate,
  fromDbAccountType,
  getUserSafeErrorMessage,
  GENERIC_USER_ERROR,
  InsufficientFundsError,
  updateAccountBalance as apiUpdateAccountBalance,
} from '../api';
import { ContainerIllustration } from '../components/ContainerIllustration';
import { CountUpNumber } from '../components/CountUpNumber';
import { InsufficientBalanceModal } from '../components/InsufficientBalanceModal';
import { UpdateBalanceModal } from '../components/UpdateBalanceModal';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Coins,
  Calendar,
  Wallet,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  History,
  X,
} from 'lucide-react';

interface GoalDetailViewProps {
  goal: SavingsGoal;
  accounts: AccountWallet[];
  onBack: () => void;
  onAddDeposit: (
    goalId: string,
    amountCentavos: number,
    date?: string,
    fromAccount?: string,
    allowOverdraft?: boolean
  ) => Promise<boolean>; // returns whether goal was newly completed
  onUpdateSkin: (goalId: string, skin: ContainerSkin) => Promise<void>;
  onUpdateGoal: (
    goalId: string,
    updates: Partial<{ title: string; targetCentavos: number; deadline: string }>
  ) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
}

const CONTAINER_SKIN_OPTIONS: Array<{
  id: ContainerSkin;
  label: string;
  emoji: string;
}> = [
  { id: 'glass jar', label: 'Jar', emoji: '🫙' },
  { id: 'piggy bank', label: 'Piggy', emoji: '🐷' },
  { id: 'treasure chest', label: 'Chest', emoji: '🪙' },
  { id: 'tin can', label: 'Can', emoji: '🥫' },
];

export const GoalDetailView: React.FC<GoalDetailViewProps> = ({
  goal,
  accounts,
  onBack,
  onAddDeposit,
  onUpdateSkin,
  onUpdateGoal,
  onUpdateBalance,
}) => {
  // Form states
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isTransferChecked, setIsTransferChecked] = useState(false);
  const [transferFromAccount, setTransferFromAccount] = useState(
    accounts.find((a) => a.name !== goal.backingAccount)?.name || accounts[0]?.name || 'Maya'
  );

  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [isDroppingCoin, setIsDroppingCoin] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [skinError, setSkinError] = useState<{ skin: ContainerSkin; message: string } | null>(null);
  const [insufficientCheck, setInsufficientCheck] = useState<{
    account: AccountWallet;
    availableCentavos: number;
    requiredCentavos: number;
  } | null>(null);
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState<AccountWallet | null>(null);
  const transferAccountSelectRef = useRef<HTMLSelectElement>(null);

  // Edit Goal Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editTargetStr, setEditTargetStr] = useState((goal.targetCentavos / 100).toString());
  const [editDeadline, setEditDeadline] = useState(goal.deadline);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const selectedTransferAccount = isTransferChecked
    ? accounts.find((a) => a.name === transferFromAccount)
    : undefined;
  const isCrossAccountTransfer = Boolean(
    isTransferChecked &&
      selectedTransferAccount &&
      selectedTransferAccount.name.trim().toLowerCase() !== goal.backingAccount.trim().toLowerCase()
  );
  const parsedDepositAmount = parseFloat(depositAmountStr);
  const depositAmountCentavos =
    !isNaN(parsedDepositAmount) && parsedDepositAmount > 0
      ? pesosToCentavos(parsedDepositAmount)
      : 0;
  const exceedsTransferAccountBalance = Boolean(
    isCrossAccountTransfer &&
      selectedTransferAccount &&
      depositAmountCentavos > selectedTransferAccount.balanceCentavos
  );

  const performDeposit = async (allowOverdraft = false) => {
    const numericAmount = parseFloat(depositAmountStr);

    // Reject deposits of zero or less
    if (!depositAmountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setDepositError('Enter an amount greater than ₱0.');
      return;
    }

    try {
      setIsSubmittingDeposit(true);
      setDepositError(null);

      // Trigger coin drop animation in the large jar
      setIsDroppingCoin(true);

      const centavos = pesosToCentavos(numericAmount);
      await onAddDeposit(
        goal.id,
        centavos,
        depositDate,
        isTransferChecked ? transferFromAccount : undefined,
        allowOverdraft ? true : undefined
      );

      setInsufficientCheck(null);
      // Reset form fields
      setDepositAmountStr('');
      setIsTransferChecked(false);
    } catch (err) {
      if (
        err instanceof InsufficientFundsError &&
        selectedTransferAccount &&
        !allowOverdraft
      ) {
        setInsufficientCheck({
          account: selectedTransferAccount,
          availableCentavos: err.details.available,
          requiredCentavos: err.details.required,
        });
        return;
      }
      console.error('[Chestlist][GoalDetailView][deposit]', err);
      setInsufficientCheck(null);
      setDepositError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(depositAmountStr);
    if (!depositAmountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setDepositError('Enter an amount greater than ₱0.');
      return;
    }

    const centavos = pesosToCentavos(numericAmount);
    if (
      isCrossAccountTransfer &&
      selectedTransferAccount &&
      centavos > selectedTransferAccount.balanceCentavos
    ) {
      setInsufficientCheck({
        account: selectedTransferAccount,
        availableCentavos: selectedTransferAccount.balanceCentavos,
        requiredCentavos: centavos,
      });
      return;
    }

    await performDeposit(false);
  };

  const performSkinUpdate = async (skin: ContainerSkin) => {
    try {
      setSkinError(null);
      await onUpdateSkin(goal.id, skin);
    } catch (err) {
      console.error('[Chestlist][GoalDetailView][updateSkin]', err);
      setSkinError({
        skin,
        message: getUserSafeErrorMessage(err),
      });
    }
  };

  const performEditGoal = async () => {
    const newTarget = parseFloat(editTargetStr);
    if (!editTitle.trim() || isNaN(newTarget) || newTarget <= 0 || !editDeadline) {
      setEditError('Please fill in all fields with valid values.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError(null);
      await onUpdateGoal(goal.id, {
        title: editTitle.trim(),
        targetCentavos: pesosToCentavos(newTarget),
        deadline: editDeadline,
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('[Chestlist][GoalDetailView][updateGoal]', err);
      setEditError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performEditGoal();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 animate-in fade-in duration-300">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to savings</span>
        </button>

        <span className="text-xs text-[var(--color-muted)]">
          Backing account: <strong className="text-[var(--color-text)]">{goal.backingAccount}</strong>
        </span>
      </div>

      {/* Main 2-Column Split: Left (Details & Form) and Right (Large Container Illustration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Goal Title, Summary Lines, Suggested Deposit, Deposit Form, Deposit History */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Card: Title + Summary lines */}
          <div className="chest-card p-6 bg-white space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{goal.emoji || '✨'}</span>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
                    {goal.title}
                  </h1>
                  <button
                    onClick={() => {
                      setEditTitle(goal.title);
                      setEditTargetStr((goal.targetCentavos / 100).toString());
                      setEditDeadline(goal.deadline);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                    aria-label="Edit goal details"
                    title="Edit goal"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>

                {goal.note && (
                  <p className="text-xs text-[var(--color-muted)] mt-1 italic">
                    "{goal.note}"
                  </p>
                )}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  goal.isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : goal.isOffPace
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-[var(--color-container)] text-[var(--color-primary)] border-[var(--color-border)]'
                }`}
              >
                {goal.isCompleted ? 'Target Reached' : `${goal.percentage}% saved`}
              </span>
            </div>

            {/* Summary Lines: Target, Saved, Remaining, Deadline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--color-border)]/60 text-xs">
              <div>
                <span className="text-[11px] text-[var(--color-muted)] uppercase block">Target</span>
                <span className="font-extrabold text-sm text-[var(--color-text)] tabular-numbers">
                  {formatPHP(goal.targetCentavos)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-muted)] uppercase block">Saved</span>
                <span className="font-extrabold text-sm text-[#3D7950] tabular-numbers">
                  {formatPHP(goal.savedCentavos)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-muted)] uppercase block">Remaining</span>
                <span className="font-extrabold text-sm text-[#A84255] tabular-numbers">
                  {formatPHP(goal.remainingCentavos)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--color-muted)] uppercase block">Deadline</span>
                <span className="font-semibold text-xs text-[var(--color-text)] block truncate">
                  {formatPrettyDate(goal.deadline)}
                </span>
                <span className="text-[10px] text-[var(--color-muted)]">
                  {goal.daysLeft} days left
                </span>
              </div>
            </div>
          </div>

          {/* Suggested Deposit Card */}
          <div className="p-4 rounded-[18px] bg-[var(--color-container)]/30 border border-[var(--color-border)] flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-[var(--color-text)] block">
                Suggested deposit pace
              </span>
              <p className="text-[var(--color-muted)] leading-relaxed">
                To reach your goal on time, deposit about{' '}
                <strong className="text-[var(--color-text)] tabular-numbers">{formatPHP(goal.requiredPerDayCentavos)} a day</strong>{' '}
                ({formatPHP(goal.requiredPerWeekCentavos)} a week).
              </p>
            </div>
          </div>

          {/* Deposit Form */}
          <div className="chest-card p-6 bg-white space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
              <Coins className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Add to this Goal</span>
            </h3>

            <form onSubmit={handleDepositSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="deposit-amount-field"
                  className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
                >
                  How much are you adding? (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-muted)]">
                    ₱
                  </span>
                  <input
                    id="deposit-amount-field"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 500"
                    value={depositAmountStr}
                    aria-invalid={depositError ? 'true' : 'false'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDepositAmountStr(val);
                      const num = parseFloat(val);
                      if (!isNaN(num) && num > 0) {
                        setDepositError(null);
                      }
                    }}
                    className={`chest-input w-full pl-8 pr-3.5 py-2.5 text-sm tabular-numbers font-medium ${
                      depositError ? 'border-[#A84255] focus:border-[#A84255]' : ''
                    }`}
                  />
                </div>
                {depositError && (
                  <p className="mt-1.5 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{depositError}</span>
                  </p>
                )}
                {exceedsTransferAccountBalance && selectedTransferAccount && !depositError && (
                  <p className="mt-1.5 text-xs text-[#C26910] flex items-center gap-1 font-medium animate-in fade-in" role="status">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      This is more than the {formatPHP(selectedTransferAccount.balanceCentavos)} in {selectedTransferAccount.name}.
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="deposit-date-field"
                  className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
                >
                  Deposit Date
                </label>
                <input
                  id="deposit-date-field"
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  required
                  className="chest-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              {/* Optional "Also record a transfer from [account]" checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-[var(--color-text)] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTransferChecked}
                    onChange={(e) => setIsTransferChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span>Also record a transfer from an account</span>
                </label>

                {isTransferChecked && (
                  <div className="mt-2.5 pl-6 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-semibold text-[var(--color-muted)] uppercase mb-1">
                      Transfer source account
                    </label>
                    <select
                      ref={transferAccountSelectRef}
                      value={transferFromAccount}
                      onChange={(e) => setTransferFromAccount(e.target.value)}
                      className="chest-input w-full px-3 py-2 text-xs cursor-pointer"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name} ({fromDbAccountType(a.type)}) · {formatPHP(a.balanceCentavos)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">
                      Moves funds to {goal.backingAccount} while keeping all-accounts total identical.
                    </p>
                  </div>
                )}
              </div>

              {/* Error microcopy */}
              {depositError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{depositError}</span>
                  </div>
                  {depositError === GENERIC_USER_ERROR && (
                    <button
                      type="button"
                      onClick={() => void performDeposit(false)}
                      disabled={isSubmittingDeposit}
                      className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Submit button (disabled while saving to avoid double-submit) */}
              <button
                type="submit"
                disabled={isSubmittingDeposit || !depositAmountStr}
                className="chest-button-primary w-full py-3 px-4 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                <span>{isSubmittingDeposit ? 'Adding deposit...' : 'Add to savings'}</span>
              </button>
            </form>
          </div>

          {/* Deposit History List (date, amount) */}
          <div className="chest-card p-6 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.75} />
                <h3 className="text-sm font-bold text-[var(--color-text)]">Deposit History</h3>
              </div>
              <span className="text-xs text-[var(--color-muted)]">
                {goal.deposits.length} {goal.deposits.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {goal.deposits.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] py-4 text-center">
                No deposits logged for this goal yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]/50">
                {goal.deposits.map((dep) => (
                  <div key={dep.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#3D7950] flex items-center justify-center font-bold text-[11px]">
                        +
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--color-text)]">
                          Deposit to {goal.title}
                        </span>
                        <p className="text-[11px] text-[var(--color-muted)]">
                          {formatPrettyDate(dep.date)} {dep.fromAccount && `via ${dep.fromAccount}`}
                        </p>
                      </div>
                    </div>

                    <span className="font-bold text-[#3D7950] tabular-numbers text-sm">
                      +{formatPHP(dep.amountCentavos)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Large Jar Illustration (~360px) + Coin Slot + Side Ticks + Skin Switcher */}
        <div className="lg:col-span-5 flex flex-col items-center sticky top-24">
          <div className="chest-card p-6 w-full flex flex-col items-center bg-white">
            {/* Title & Saved Label: "₱3,200 saved (64%)" */}
            <div className="text-center mb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                Goal Progress
              </span>
              <div className="text-2xl font-extrabold text-[var(--color-text)] tabular-numbers mt-0.5">
                <CountUpNumber centavos={goal.savedCentavos} />{' '}
                <span className="text-sm font-normal text-[var(--color-muted)]">
                  saved ({goal.percentage}%)
                </span>
              </div>
            </div>

            {/* Large Jar Illustration (~360px tall) with coin slot on top and side ticks at 25, 50, 75, 100% */}
            <div className="my-2 flex items-center justify-center">
              <ContainerIllustration
                skin={goal.containerSkin}
                percentage={goal.percentage}
                size="large"
                isDroppingCoin={isDroppingCoin}
                onCoinDropComplete={() => setIsDroppingCoin(false)}
                showTicks={true}
              />
            </div>

            {/* Small Skin Switcher under the jar (circular thumbnails) */}
            <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 w-full flex flex-col items-center">
              <span className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-2">
                Container Skin
              </span>
              <div className="flex items-center gap-2">
                {CONTAINER_SKIN_OPTIONS.map((skinOpt) => {
                  const isSelected = goal.containerSkin === skinOpt.id;
                  return (
                    <button
                      key={skinOpt.id}
                      onClick={() => performSkinUpdate(skinOpt.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs scale-105'
                          : 'bg-slate-50 text-[var(--color-muted)] border-slate-200 hover:text-[var(--color-text)] hover:bg-slate-100'
                      }`}
                      title={`Switch skin to ${skinOpt.label}`}
                    >
                      <span>{skinOpt.emoji}</span>
                      <span>{skinOpt.label}</span>
                    </button>
                  );
                })}
              </div>
              {skinError && (
                <div
                  role="alert"
                  className="mt-3 w-full p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{skinError.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => performSkinUpdate(skinError.skin)}
                    className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Edit Goal Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-bold text-[var(--color-text)]">Edit Goal</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} noValidate className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="chest-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                  Target (PHP)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={editTargetStr}
                  onChange={(e) => setEditTargetStr(e.target.value)}
                  required
                  className="chest-input w-full px-3 py-2 text-sm tabular-numbers font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  required
                  className="chest-input w-full px-3 py-2 text-sm"
                />
              </div>

              {editError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{editError}</span>
                  </div>
                  {editError === GENERIC_USER_ERROR && (
                    <button
                      type="button"
                      onClick={performEditGoal}
                      disabled={isSubmittingEdit}
                      className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="chest-button-primary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <InsufficientBalanceModal
        isOpen={Boolean(insufficientCheck)}
        account={insufficientCheck?.account || null}
        availableCentavos={insufficientCheck?.availableCentavos || 0}
        requiredCentavos={insufficientCheck?.requiredCentavos || 0}
        kindLabel="transfer"
        isSubmitting={isSubmittingDeposit}
        onChooseAnotherAccount={() => {
          setInsufficientCheck(null);
          setTimeout(() => {
            transferAccountSelectRef.current?.focus();
          }, 0);
        }}
        onUpdateBalanceFirst={() => {
          if (!insufficientCheck) return;
          const accToUpdate = insufficientCheck.account;
          setInsufficientCheck(null);
          setUpdateBalanceAccount(accToUpdate);
        }}
        onAddAnyway={() => {
          void performDeposit(true);
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
