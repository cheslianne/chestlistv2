import React, { useState, useRef } from 'react';
import { AccountWallet, CategoryName, ExpenseCategory, ParsedMessageResult } from '../types';
import {
  DEFAULT_CATEGORIES,
  InsufficientFundsError,
  formatPHP,
  fromDbAccountType,
  parseBankOrWalletMessage,
  pesosToCentavos,
  getUserSafeErrorMessage,
  updateAccountBalance as apiUpdateAccountBalance,
} from '../api';
import { InsufficientBalanceModal } from './InsufficientBalanceModal';
import { UpdateBalanceModal } from './UpdateBalanceModal';
import {
  X,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Edit2,
  Check,
} from 'lucide-react';

interface PasteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountWallet[];
  categories?: ExpenseCategory[];
  onConfirmImport: (params: {
    amountCentavos: number;
    merchant: string;
    direction: 'debit' | 'credit';
    category: CategoryName;
    accountId: string;
    accountName: string;
    referenceNumber?: string;
    allowOverdraft?: boolean;
  }) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
}

export const PasteImportModal: React.FC<PasteImportModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories = DEFAULT_CATEGORIES,
  onConfirmImport,
  onUpdateBalance,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedMessageResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable fields
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editCategory, setEditCategory] = useState<CategoryName>('Food');
  const [editAccountName, setEditAccountName] = useState('');
  const [editDirection, setEditDirection] = useState<'debit' | 'credit'>('debit');

  const [insufficientCheck, setInsufficientCheck] = useState<{
    account: AccountWallet;
    availableCentavos: number;
    requiredCentavos: number;
  } | null>(null);
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState<AccountWallet | null>(null);
  const accountSelectRef = useRef<HTMLSelectElement>(null);

  if (!isOpen) return null;

  const targetAccount =
    accounts.find((a) => a.name === editAccountName) || accounts[0];
  const parsedEditAmount = parseFloat(editAmountStr);
  const currentAmountCentavos =
    !isNaN(parsedEditAmount) && parsedEditAmount > 0 ? pesosToCentavos(parsedEditAmount) : 0;
  const exceedsTargetBalance = Boolean(
    parsedResult &&
      editDirection === 'debit' &&
      targetAccount &&
      currentAmountCentavos > targetAccount.balanceCentavos
  );

  const handleReadMessage = () => {
    setParseError(null);
    setParsedResult(null);
    setIsEditing(false);

    if (!pastedText.trim()) {
      setParseError('Please paste your message text.');
      return;
    }

    const { parsed, error } = parseBankOrWalletMessage(pastedText, accounts);
    if (error || !parsed) {
      setParseError(error || 'No transaction found in this message.');
      return;
    }

    setParsedResult(parsed);
    setEditMerchant(parsed.merchant);
    setEditAmountStr((parsed.amountCentavos / 100).toString());
    setEditCategory(parsed.category);
    setEditAccountName(parsed.suggestedAccountName);
    setEditDirection(parsed.direction);
  };

  const performConfirm = async (allowOverdraft = false) => {
    if (!parsedResult) return;
    if (parsedResult.isDuplicate) {
      setParseError('This transaction was already added.');
      return;
    }

    const finalAmount = parseFloat(editAmountStr);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setParseError('Enter a valid amount greater than ₱0.');
      return;
    }

    if (!targetAccount) {
      setImportError('Please add an account to your Wallet first.');
      return;
    }

    try {
      setIsSubmitting(true);
      setImportError(null);
      await onConfirmImport({
        amountCentavos: pesosToCentavos(finalAmount),
        merchant: editMerchant.trim() || parsedResult.merchant,
        direction: editDirection,
        category: editCategory,
        accountId: targetAccount.id,
        accountName: targetAccount.name,
        referenceNumber: parsedResult.referenceNumber || undefined,
        ...(allowOverdraft ? { allowOverdraft: true } : {}),
      });

      setInsufficientCheck(null);
      // Clear & close
      setPastedText('');
      setParsedResult(null);
      setParseError(null);
      setImportError(null);
      onClose();
    } catch (err) {
      if (err instanceof InsufficientFundsError && targetAccount && !allowOverdraft) {
        setInsufficientCheck({
          account: targetAccount,
          availableCentavos: err.details.available,
          requiredCentavos: err.details.required,
        });
        return;
      }
      console.error('[Chestlist][PasteImportModal]', err);
      setInsufficientCheck(null);
      setImportError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;
    if (parsedResult.isDuplicate) {
      setParseError('This transaction was already added.');
      return;
    }

    const finalAmount = parseFloat(editAmountStr);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setParseError('Enter a valid amount greater than ₱0.');
      return;
    }

    if (!targetAccount) {
      setImportError('Please add an account to your Wallet first.');
      return;
    }

    const centavos = pesosToCentavos(finalAmount);
    if (editDirection === 'debit' && centavos > targetAccount.balanceCentavos) {
      setInsufficientCheck({
        account: targetAccount,
        availableCentavos: targetAccount.balanceCentavos,
        requiredCentavos: centavos,
      });
      return;
    }

    await performConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="paste-import-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 id="paste-import-title" className="text-base font-bold text-[var(--color-text)]">
                Paste SMS or Notification
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">
                Local parsing only. Codes and OTPs are stripped.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Paste your bank or e-wallet message here
            </label>
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                if (parseError) setParseError(null);
              }}
              placeholder="e.g. You have paid PHP 150.00 of GCash to Jollibee on 11-10-2026. Ref. No. 102938491."
              className="chest-input w-full px-3 py-2 text-xs font-mono resize-none leading-relaxed"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-muted)]">
                OTPs and long card numbers are discarded immediately.
              </span>
              <button
                type="button"
                onClick={handleReadMessage}
                className="chest-button-primary px-4 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Read message
              </button>
            </div>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center gap-2 animate-in fade-in" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{parseError}</span>
            </div>
          )}

          {/* Parsed Result Preview Card */}
          {parsedResult && (
            <div className="p-4 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3D7950]" />
                  <span>Parsed Transaction</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditing ? 'Done editing' : 'Edit details'}</span>
                </button>
              </div>

              {parsedResult.isDuplicate && (
                <div className="p-2.5 rounded-[12px] bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>This transaction was already added.</span>
                </div>
              )}

              {isEditing ? (
                /* Editable form */
                <div className="space-y-3 pt-1 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-muted)] uppercase mb-0.5">
                        Merchant / Sender
                      </label>
                      <input
                        type="text"
                        value={editMerchant}
                        onChange={(e) => setEditMerchant(e.target.value)}
                        className="chest-input w-full px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-muted)] uppercase mb-0.5">
                        Amount (PHP)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editAmountStr}
                        onChange={(e) => setEditAmountStr(e.target.value)}
                        className="chest-input w-full px-2.5 py-1.5 text-xs tabular-numbers"
                      />
                      {exceedsTargetBalance && targetAccount && (
                        <p className="mt-1 text-[11px] text-[#C26910] flex items-center gap-1 font-medium" role="status">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>
                            This is more than the {formatPHP(targetAccount.balanceCentavos)} in {targetAccount.name}.
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-muted)] uppercase mb-0.5">
                        Category
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as CategoryName)}
                        className="chest-input w-full px-2.5 py-1.5 text-xs"
                      >
                        {categories
                          .filter((c) => !c.isArchived)
                          .map((cat) => (
                            <option key={cat.id} value={cat.label}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-muted)] uppercase mb-0.5">
                        Account
                      </label>
                      <select
                        ref={accountSelectRef}
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        className="chest-input w-full px-2.5 py-1.5 text-xs"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name} ({fromDbAccountType(a.type)}) · {formatPHP(a.balanceCentavos)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Readonly summary view */
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text)]">
                        {editMerchant}
                      </h4>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                        Account: <span className="font-semibold text-[var(--color-text)]">{editAccountName}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold tabular-numbers flex items-center justify-end gap-1 ${
                          editDirection === 'credit' ? 'text-[#3D7950]' : 'text-[#A84255]'
                        }`}
                      >
                        {editDirection === 'credit' ? (
                          <>
                            <ArrowDownLeft className="w-4 h-4" />
                            <span>+{formatPHP(Math.round(parseFloat(editAmountStr || '0') * 100))}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-4 h-4" />
                            <span>-{formatPHP(Math.round(parseFloat(editAmountStr || '0') * 100))}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--color-muted)] uppercase font-semibold">
                        {editDirection === 'credit' ? 'Credit / Deposit' : 'Debit / Expense'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-container)] font-semibold text-[var(--color-primary)]">
                      {editCategory}
                    </span>
                    {parsedResult.referenceNumber && (
                      <span className="text-[var(--color-muted)] font-mono">
                        Ref: {parsedResult.referenceNumber}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-[var(--color-muted)] italic pt-1">
                Nothing is saved until you click the confirm button below.
              </p>

              {importError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{importError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void performConfirm(false)}
                    disabled={isSubmitting}
                    className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isEditing && exceedsTargetBalance && targetAccount && (
                <p className="text-xs text-[#C26910] flex items-center gap-1 font-medium" role="status">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    This is more than the {formatPHP(targetAccount.balanceCentavos)} in {targetAccount.name}.
                  </span>
                </p>
              )}

              {/* Confirm Action Button */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setParsedResult(null)}
                  className="chest-button-secondary px-3 py-1.5 text-xs font-medium cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || parsedResult.isDuplicate}
                  onClick={handleConfirm}
                  className="chest-button-primary px-4 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {editDirection === 'credit' ? 'Add as deposit' : 'Add as expense'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
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
          setIsEditing(true);
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
          void performConfirm(true);
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
