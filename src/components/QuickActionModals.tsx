import React, { useState, useRef } from 'react';
import {
  formatPHP,
  fromDbAccountType,
  pesosToCentavos,
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
import { AccountWallet, DebtItem, DebtPayment, LifeNote, SavingsGoal } from '../types';
import { InsufficientBalanceModal } from './InsufficientBalanceModal';
import { UpdateBalanceModal } from './UpdateBalanceModal';
import { X, Check, PiggyBank, CreditCard, StickyNote, AlertCircle, AlertTriangle } from 'lucide-react';

// Modal for adding savings deposit
export const AddSavingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  goals: SavingsGoal[];
  targetGoalId?: string;
  onAddDeposit: (goalId: string, amountCentavos: number) => Promise<void>;
}> = ({ isOpen, onClose, goals, targetGoalId, onAddDeposit }) => {
  const [selectedGoalId, setSelectedGoalId] = useState(targetGoalId || goals[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (targetGoalId) {
      setSelectedGoalId(targetGoalId);
    } else if (goals[0]) {
      setSelectedGoalId(goals[0].id);
    }
  }, [targetGoalId, goals]);

  if (!isOpen) return null;

  const performDeposit = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }

    if (!selectedGoalId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onAddDeposit(selectedGoalId, pesosToCentavos(amount));
      onClose();
    } catch (err) {
      console.error('[Chestlist][AddSavingsModal]', err);
      setError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performDeposit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <PiggyBank className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Add Savings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Select Goal
            </label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="chest-input w-full px-3 py-2 text-xs"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title} ({formatPHP(g.savedCentavos)} saved)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Deposit Amount (PHP)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="500"
                value={amountStr}
                aria-invalid={error ? 'true' : 'false'}
                onChange={(e) => {
                  const val = e.target.value;
                  setAmountStr(val);
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0) {
                    setError(null);
                  }
                }}
                className={`chest-input w-full pl-7 pr-3 py-2 text-sm tabular-numbers font-medium ${
                  error ? 'border-[#A84255] focus:border-[#A84255]' : ''
                }`}
              />
            </div>
            {error && (
              <div className="mt-1.5 text-xs text-[#A84255] flex items-center justify-between gap-2 font-medium animate-in fade-in" role="alert">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
                {error === GENERIC_USER_ERROR && (
                  <button
                    type="button"
                    onClick={performDeposit}
                    disabled={isSubmitting}
                    className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="chest-button-primary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              Deposit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal for logging a debt payment (e.g. GCash PayLater)
export const LogPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  debts: DebtItem[];
  accounts?: AccountWallet[];
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
  ) => Promise<any>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
}> = ({ isOpen, onClose, debts, accounts = [], onLogPayment, onUpdateBalance }) => {
  const activeDebts = debts.filter((d) => !d.isArchived && d.remainingCentavos > 0);
  const [selectedDebtId, setSelectedDebtId] = useState(activeDebts[0]?.id || debts[0]?.id || '');
  const [amountStr, setAmountStr] = useState(
    activeDebts[0] ? (activeDebts[0].remainingCentavos / 100).toString() : '1500'
  );
  const [channel, setChannel] = useState<DebtPayment['channel']>('GCash');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountClearedNote, setAccountClearedNote] = useState<string | null>(null);
  const [isNoAccountConfirmOpen, setIsNoAccountConfirmOpen] = useState(false);
  const goBackNoAccountBtnRef = useRef<HTMLButtonElement>(null);
  const accountSelectRef = useRef<HTMLSelectElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insufficientCheck, setInsufficientCheck] = useState<{
    account: AccountWallet;
    availableCentavos: number;
    requiredCentavos: number;
  } | null>(null);
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState<AccountWallet | null>(null);

  React.useEffect(() => {
    if (activeDebts.length > 0 && (!selectedDebtId || !activeDebts.some((d) => d.id === selectedDebtId))) {
      setSelectedDebtId(activeDebts[0].id);
      setAmountStr((activeDebts[0].remainingCentavos / 100).toString());
    }
  }, [activeDebts, selectedDebtId]);

  React.useEffect(() => {
    if (!isNoAccountConfirmOpen) return;
    goBackNoAccountBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setIsNoAccountConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNoAccountConfirmOpen, isSubmitting]);

  if (!isOpen) return null;

  const currentDebt = debts.find((d) => d.id === selectedDebtId) || activeDebts[0];
  const selectedAccountObj = selectedAccount
    ? accounts.find((acc) => acc.name === selectedAccount)
    : undefined;
  const parsedAmount = parseFloat(amountStr);
  const amountCentavos =
    !isNaN(parsedAmount) && parsedAmount > 0 ? pesosToCentavos(parsedAmount) : 0;
  const exceedsSelectedAccountBalance = Boolean(
    selectedAccountObj && amountCentavos > selectedAccountObj.balanceCentavos
  );
  const channelMismatchError = validatePaymentChannelAccountMatch(channel, selectedAccountObj);
  const filteredAccounts = filterAccountsByChannel(accounts, channel);

  const validatePaymentForm = (): number | null => {
    if (channelMismatchError) return null;

    const amount = parseFloat(amountStr);
    if (!amountStr.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter an amount greater than ₱0.');
      return null;
    }

    if (!selectedDebtId || !currentDebt) return null;

    const centavos = pesosToCentavos(amount);
    if (centavos > currentDebt.remainingCentavos) {
      setError("That's more than what's left on this debt.");
      return null;
    }

    return centavos;
  };

  const performPayment = async (allowOverdraft = false) => {
    const centavos = validatePaymentForm();
    if (centavos === null) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onLogPayment(selectedDebtId, centavos, {
        channel,
        paidFromAccount: selectedAccount || undefined,
        ...(allowOverdraft ? { allowOverdraft: true } : {}),
      });
      setInsufficientCheck(null);
      setIsNoAccountConfirmOpen(false);
      setAccountClearedNote(null);
      onClose();
    } catch (err) {
      if (err instanceof InsufficientFundsError && selectedAccountObj && !allowOverdraft) {
        setInsufficientCheck({
          account: selectedAccountObj,
          availableCentavos: err.details.available,
          requiredCentavos: err.details.required,
        });
        return;
      }
      console.error('[Chestlist][LogPaymentModal]', err);
      setInsufficientCheck(null);
      setIsNoAccountConfirmOpen(false);
      setError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const centavos = validatePaymentForm();
    if (centavos === null) return;
    if (!selectedAccount) {
      setIsNoAccountConfirmOpen(true);
      return;
    }
    if (selectedAccountObj && centavos > selectedAccountObj.balanceCentavos) {
      setInsufficientCheck({
        account: selectedAccountObj,
        availableCentavos: selectedAccountObj.balanceCentavos,
        requiredCentavos: centavos,
      });
      return;
    }
    await performPayment(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Log Debt Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Select Due Item
            </label>
            <select
              value={selectedDebtId}
              onChange={(e) => {
                setSelectedDebtId(e.target.value);
                const match = debts.find((d) => d.id === e.target.value);
                if (match) {
                  setAmountStr((match.remainingCentavos / 100).toString());
                  setError(null);
                }
              }}
              className="chest-input w-full px-3 py-2 text-xs"
            >
              {activeDebts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} (Remaining: {formatPHP(d.remainingCentavos)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase">
                Payment Amount (PHP)
              </label>
              {currentDebt && (
                <button
                  type="button"
                  onClick={() => {
                    setAmountStr((currentDebt.remainingCentavos / 100).toString());
                    setError(null);
                  }}
                  className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  Pay full
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="1"
                value={amountStr}
                aria-invalid={error ? 'true' : 'false'}
                onChange={(e) => {
                  const val = e.target.value;
                  setAmountStr(val);
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0) {
                    if (currentDebt && pesosToCentavos(num) > currentDebt.remainingCentavos) {
                      setError("That's more than what's left on this debt.");
                    } else {
                      setError(null);
                    }
                  }
                }}
                className={`chest-input w-full pl-7 pr-3 py-2 text-sm tabular-numbers font-medium ${
                  error ? 'border-[#A84255] focus:border-[#A84255]' : ''
                }`}
              />
            </div>
            {error && (
              <div className="mt-1.5 text-xs text-[#A84255] flex items-center justify-between gap-2 font-medium animate-in fade-in" role="alert">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
                {error === GENERIC_USER_ERROR && (
                  <button
                    type="button"
                    onClick={() => void performPayment(false)}
                    disabled={isSubmitting}
                    className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {exceedsSelectedAccountBalance && selectedAccountObj && !error && (
              <p className="mt-1.5 text-xs text-[#C26910] flex items-center gap-1 font-medium animate-in fade-in" role="status">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  This is more than the {formatPHP(selectedAccountObj.balanceCentavos)} in {selectedAccountObj.name}.
                </span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="modal-debt-pay-channel"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1"
            >
              Payment Channel
            </label>
            <select
              id="modal-debt-pay-channel"
              value={channel}
              aria-invalid={channelMismatchError ? 'true' : 'false'}
              onChange={(e) => {
                const nextChannel = e.target.value as DebtPayment['channel'];
                setChannel(nextChannel);
                if (selectedAccount) {
                  const currentAcc = accounts.find((acc) => acc.name === selectedAccount);
                  if (!currentAcc || !doesAccountMatchChannel(currentAcc, nextChannel)) {
                    setSelectedAccount('');
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
              className={`chest-input w-full px-3 py-2 text-xs ${
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

          {accounts.length > 0 && (
            <div>
              <label
                htmlFor="modal-debt-pay-account"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1"
              >
                Deduct from Account (Optional)
              </label>
              <select
                ref={accountSelectRef}
                id="modal-debt-pay-account"
                value={selectedAccount}
                onChange={(e) => {
                  const nextAccount = e.target.value;
                  setSelectedAccount(nextAccount);
                  setAccountClearedNote(null);
                  if (nextAccount) {
                    const matchedAcc = accounts.find((acc) => acc.name === nextAccount);
                    if (matchedAcc) {
                      setChannel(getMatchingChannelForAccount(matchedAcc));
                    }
                  }
                }}
                className="chest-input w-full px-3 py-2 text-xs"
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
          )}

          <p className="text-[11px] text-[var(--color-muted)]">
            Recorded payment will update remaining balance and your debt progress donut.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                Boolean(channelMismatchError) ||
                Boolean(error && error !== GENERIC_USER_ERROR)
              }
              className="chest-button-primary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Log Payment
            </button>
          </div>
        </form>
      </div>

      {/* Confirm Recording Payment Without an Account Modal */}
      {isNoAccountConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-no-account-confirm-title"
          onClick={() => {
            if (!isSubmitting) setIsNoAccountConfirmOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsNoAccountConfirmOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close confirmation modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3
              id="modal-no-account-confirm-title"
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
                disabled={isSubmitting}
                onClick={() => setIsNoAccountConfirmOpen(false)}
                className="min-h-[40px] chest-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void performPayment(false)}
                className="min-h-[40px] chest-button-primary px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                {isSubmitting ? 'Recording...' : 'Record payment'}
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
        isSubmitting={isSubmitting}
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
          void performPayment(true);
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

// Modal for adding a life note
export const AddNoteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (note: {
    title: string;
    body: string;
    category?: any;
    date?: string;
  }) => Promise<any>;
}> = ({ isOpen, onClose, onAddNote }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<LifeNote['category']>('Reflection');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const performAddNote = async () => {
    if (!title.trim() || !body.trim()) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onAddNote({
        title: title.trim(),
        body: body.trim(),
        category,
        date: new Date().toISOString().split('T')[0],
      });
      onClose();
    } catch (err) {
      console.error('[Chestlist][AddNoteModal]', err);
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performAddNote();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <StickyNote className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">New Journal Note</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Budget wins this week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="chest-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LifeNote['category'])}
              className="chest-input w-full px-3 py-2 text-xs"
            >
              <option value="Reflection">Reflection</option>
              <option value="Tip">Tip</option>
              <option value="Budget Wishlist">Budget Wishlist</option>
              <option value="Routine">Routine</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Notes & Thoughts
            </label>
            <textarea
              rows={4}
              placeholder="Write your bullet-journal thoughts, reflections or savings hack..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="chest-input w-full px-3 py-2 text-sm resize-none"
            />
          </div>

          {submitError && (
            <div
              role="alert"
              className="p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">{submitError}</span>
              </div>
              <button
                type="button"
                onClick={performAddNote}
                disabled={isSubmitting}
                className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="chest-button-primary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
