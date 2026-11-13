import React, { useState, useRef } from 'react';
import {
  DEFAULT_CATEGORIES,
  InsufficientFundsError,
  centavosToPesos,
  createSubcategory,
  formatPHP,
  fromDbAccountType,
  getUserSafeErrorMessage,
  pesosToCentavos,
  resolveExpenseCategory,
  saveLearnedRule,
  updateAccountBalance as apiUpdateAccountBalance,
} from '../api';
import { AccountWallet, Expense, ExpenseCategory } from '../types';
import { InsufficientBalanceModal } from './InsufficientBalanceModal';
import { UpdateBalanceModal } from './UpdateBalanceModal';
import { X, Check, Trash2, AlertCircle, AlertTriangle, Plus } from 'lucide-react';

interface EditExpenseModalProps {
  expense: Expense;
  categories?: ExpenseCategory[];
  useSubcategories?: boolean;
  accounts?: AccountWallet[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Expense> & { allowOverdraft?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  onSubcategoryCreated?: () => Promise<void>;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  categories = DEFAULT_CATEGORIES,
  useSubcategories = true,
  accounts = [],
  isOpen,
  onClose,
  onSave,
  onDelete,
  onUpdateBalance,
  onSubcategoryCreated,
}) => {
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const activeCategories = categories.filter((c) => !c.isArchived);

  const initialCat = (() => {
    const directAll = categories.find(
      (c) =>
        (expense.categoryId && c.id === expense.categoryId) ||
        c.label.toLowerCase() === expense.category.toLowerCase() ||
        c.key.toLowerCase() === expense.category.toLowerCase()
    );
    if (directAll) return directAll;
    const resolved = resolveExpenseCategory(expense.category, expense.categoryId);
    return (
      categories.find((c) => c.key === resolved.key || c.id === resolved.id) ||
      activeCategories[0] ||
      DEFAULT_CATEGORIES[0]
    );
  })();

  const [title, setTitle] = useState(expense.title);
  const [amountStr, setAmountStr] = useState(centavosToPesos(expense.amountCentavos).toString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCat.id);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(
    expense.subcategoryId ?? null
  );
  const [date, setDate] = useState(expense.date);
  const [account, setAccount] = useState(expense.account || activeAccounts[0]?.name || 'GCash');
  const [note, setNote] = useState(expense.note || '');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<'save' | 'delete' | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubLabel, setNewSubLabel] = useState('');
  const [isCreatingSub, setIsCreatingSub] = useState(false);

  const [insufficientCheck, setInsufficientCheck] = useState<{
    account: AccountWallet;
    availableCentavos: number;
    requiredCentavos: number;
  } | null>(null);
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState<AccountWallet | null>(null);
  const accountSelectRef = useRef<HTMLSelectElement>(null);

  if (!isOpen) return null;

  const findAccountByName = (name?: string) => {
    if (!name) return undefined;
    const key = name.trim().toLowerCase();
    return activeAccounts.find((a) => a.name.trim().toLowerCase() === key) ||
      accounts.find((a) => a.name.trim().toLowerCase() === key);
  };

  const prevAccount = findAccountByName(expense.account);
  const selectedAccount = findAccountByName(account);
  const isSameAccount = Boolean(selectedAccount && prevAccount && selectedAccount.id === prevAccount.id);
  const availableCentavos = selectedAccount
    ? selectedAccount.balanceCentavos + (isSameAccount ? expense.amountCentavos : 0)
    : 0;
  const parsedAmt = parseFloat(amountStr);
  const currentAmountCentavos =
    !isNaN(parsedAmt) && parsedAmt > 0 ? pesosToCentavos(parsedAmt) : 0;
  const isAlreadyConfirmedSameOrSmaller = Boolean(
    expense.overdraftConfirmed &&
      isSameAccount &&
      currentAmountCentavos > 0 &&
      currentAmountCentavos <= expense.amountCentavos
  );
  const exceedsAvailableBalance = Boolean(
    selectedAccount &&
      currentAmountCentavos > availableCentavos &&
      !isAlreadyConfirmedSameOrSmaller
  );

  const currentCategory =
    activeCategories.find((c) => c.id === selectedCategoryId) || initialCat;
  const activeSubs = currentCategory.subcategories.filter((s) => !s.isArchived);
  const currentSubcategory =
    useSubcategories && selectedSubcategoryId
      ? activeSubs.find((s) => s.id === selectedSubcategoryId) || null
      : null;

  const handleCreateSub = async () => {
    const cleaned = newSubLabel.trim().replace(/\s+/g, ' ').slice(0, 24).trim();
    if (!cleaned) return;
    try {
      setIsCreatingSub(true);
      const created = await createSubcategory(currentCategory.id, cleaned);
      setSelectedSubcategoryId(created.id);
      setNewSubLabel('');
      setIsAddingSub(false);
      await onSubcategoryCreated?.();
    } catch (err) {
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsCreatingSub(false);
    }
  };

  const performSave = async (allowOverdraft = false) => {
    const numericAmount = parseFloat(amountStr);
    if (!amountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Enter an amount greater than ₱0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setLastFailedAction(null);

      const categoryChanged =
        currentCategory.id !== initialCat.id ||
        (currentSubcategory?.id || null) !== (expense.subcategoryId ?? null);

      await onSave(expense.id, {
        title: title.trim(),
        amountCentavos: pesosToCentavos(numericAmount),
        category: currentCategory.label,
        categoryId: currentCategory.id,
        subcategoryId: useSubcategories ? currentSubcategory?.id || null : null,
        subcategoryLabel: useSubcategories ? currentSubcategory?.label || null : null,
        categoryUserConfirmed: categoryChanged ? true : expense.categoryUserConfirmed,
        date,
        account,
        note: note.trim(),
        ...(allowOverdraft ? { allowOverdraft: true } : {}),
      });

      if (categoryChanged && title.trim().length >= 2) {
        await saveLearnedRule(
          title.trim(),
          currentCategory.id,
          useSubcategories ? currentSubcategory?.id || null : null
        );
      }

      setInsufficientCheck(null);
      onClose();
    } catch (err) {
      if (err instanceof InsufficientFundsError && selectedAccount && !allowOverdraft) {
        setInsufficientCheck({
          account: selectedAccount,
          availableCentavos: err.details.available,
          requiredCentavos: err.details.required,
        });
        return;
      }
      console.error('[Chestlist][EditExpenseModal][save]', err);
      setInsufficientCheck(null);
      setLastFailedAction('save');
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountStr);
    if (!amountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Enter an amount greater than ₱0.');
      return;
    }

    const centavos = pesosToCentavos(numericAmount);
    if (
      selectedAccount &&
      !isAlreadyConfirmedSameOrSmaller &&
      centavos > availableCentavos
    ) {
      setInsufficientCheck({
        account: selectedAccount,
        availableCentavos,
        requiredCentavos: centavos,
      });
      return;
    }

    await performSave(false);
  };

  const performDelete = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setLastFailedAction(null);
    try {
      await onDelete(expense.id);
      onClose();
    } catch (err) {
      console.error('[Chestlist][EditExpenseModal][delete]', err);
      setLastFailedAction('delete');
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-bold text-[var(--color-text)]">Edit Expense</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="chest-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1">
                Amount (PHP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                  ₱
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={amountStr}
                  aria-invalid={amountError ? 'true' : 'false'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmountStr(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 0) {
                      setAmountError(null);
                    }
                  }}
                  className={`chest-input w-full pl-7 pr-3 py-2 text-sm tabular-numbers font-medium ${
                    amountError ? 'border-[#A84255] focus:border-[#A84255]' : ''
                  }`}
                />
              </div>
              {amountError && (
                <p className="mt-1 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{amountError}</span>
                </p>
              )}
              {exceedsAvailableBalance && selectedAccount && !amountError && (
                <p className="mt-1 text-xs text-[#C26910] flex items-center gap-1 font-medium animate-in fade-in" role="status">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    This is more than the {formatPHP(availableCentavos)} in {selectedAccount.name}.
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="chest-input w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Primary Categories */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (cat.id !== selectedCategoryId) {
                      setSelectedCategoryId(cat.id);
                      setSelectedSubcategoryId(null);
                      setIsAddingSub(false);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 border ${
                    currentCategory.id === cat.id
                      ? 'ring-2 ring-[var(--color-primary)] shadow-xs scale-105 border-black/15'
                      : 'opacity-75 hover:opacity-100 border-black/5'
                  }`}
                  style={{
                    backgroundColor: cat.color,
                    color: '#3A2E33',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subcategories */}
          {useSubcategories && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider">
                  Subcategory ({currentCategory.label})
                </label>
                {selectedSubcategoryId && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategoryId(null)}
                    className="text-[11px] text-[var(--color-muted)] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeSubs.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      setSelectedSubcategoryId(
                        selectedSubcategoryId === sub.id ? null : sub.id
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                      selectedSubcategoryId === sub.id
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                        : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/60'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
                {!isAddingSub && (
                  <button
                    type="button"
                    onClick={() => setIsAddingSub(true)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-container)]/30 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add subcategory</span>
                  </button>
                )}
              </div>

              {isAddingSub && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newSubLabel}
                    onChange={(e) => setNewSubLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleCreateSub();
                      }
                    }}
                    maxLength={24}
                    placeholder="New subcategory (max 24 chars)..."
                    className="chest-input flex-1 px-2.5 py-1.5 text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={isCreatingSub || !newSubLabel.trim()}
                    onClick={() => void handleCreateSub()}
                    className="px-3 py-1.5 rounded-[10px] bg-[var(--color-primary)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingSub ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSub(false);
                      setNewSubLabel('');
                    }}
                    className="text-xs text-[var(--color-muted)] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1">
                Account
              </label>
              <select
                ref={accountSelectRef}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="chest-input w-full px-3 py-2 text-xs cursor-pointer"
              >
                {activeAccounts.length > 0 ? (
                  <>
                    {account && !activeAccounts.some((a) => a.name === account) && (
                      <option value={account}>{account}</option>
                    )}
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name} ({fromDbAccountType(acc.type)}) · {formatPHP(acc.balanceCentavos)}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    {account &&
                      !['GCash', 'Maya', 'BPI Savings', 'Cash'].includes(account) && (
                        <option value={account}>{account}</option>
                      )}
                    <option value="GCash">GCash</option>
                    <option value="Maya">Maya</option>
                    <option value="BPI Savings">BPI Savings</option>
                    <option value="Cash">Cash</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                placeholder="e.g. Mang Tootz"
                onChange={(e) => setNote(e.target.value)}
                className="chest-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>

          {submitError && (
            <div
              role="alert"
              className="p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => (lastFailedAction === 'delete' ? performDelete() : performSave())}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          {isConfirmingDelete ? (
            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#A84255]">
                Delete this expense?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isSubmitting}
                  className="chest-button-secondary px-3.5 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-[12px] bg-[#A84255] hover:bg-[#933446] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-[12px] text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
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
                  className="chest-button-primary px-4 py-2 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <InsufficientBalanceModal
        isOpen={Boolean(insufficientCheck)}
        account={insufficientCheck?.account || null}
        availableCentavos={insufficientCheck?.availableCentavos || 0}
        requiredCentavos={insufficientCheck?.requiredCentavos || 0}
        kindLabel="expense"
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
          void performSave(true);
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
