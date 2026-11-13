import React, { useState, useEffect } from 'react';
import { AccountWallet } from '../types';
import { formatPHP, pesosToCentavos, getUserSafeErrorMessage, GENERIC_USER_ERROR } from '../api';
import { X, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

interface UpdateBalanceModalProps {
  account: AccountWallet | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBalance: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  zIndexClass?: string;
}

export const UpdateBalanceModal: React.FC<UpdateBalanceModalProps> = ({
  account,
  isOpen,
  onClose,
  onUpdateBalance,
  zIndexClass = 'z-50',
}) => {
  const [balanceStr, setBalanceStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account && isOpen) {
      setBalanceStr((account.balanceCentavos / 100).toString());
      setError(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const currentPesos = account.balanceCentavos / 100;
  const inputNum = parseFloat(balanceStr);
  const isValidNum = !isNaN(inputNum) && inputNum >= 0;
  const inputCentavos = isValidNum ? pesosToCentavos(inputNum) : 0;
  const differenceCentavos = isValidNum ? inputCentavos - account.balanceCentavos : 0;

  const performUpdate = async () => {
    if (!balanceStr.trim() || isNaN(inputNum) || inputNum < 0) {
      setError('Enter a valid amount greater than or equal to ₱0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdateBalance(account.id, inputCentavos);
      onClose();
    } catch (err) {
      console.error('[Chestlist][UpdateBalanceModal]', err);
      setError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performUpdate();
  };

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150`}>
      <div
        className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="update-balance-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="update-balance-title" className="text-base font-bold text-[var(--color-text)]">
                Update Balance
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">{account.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div className="p-3 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted)] font-medium">Currently recorded</span>
            <span className="text-sm font-bold text-[var(--color-text)] tabular-numbers">
              {formatPHP(account.balanceCentavos)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Actual Current Balance (PHP)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={balanceStr}
                aria-invalid={error ? 'true' : 'false'}
                onChange={(e) => {
                  setBalanceStr(e.target.value);
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num) && num >= 0) setError(null);
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
                    onClick={performUpdate}
                    disabled={isSubmitting}
                    className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Real-time difference explanation */}
          {isValidNum && (
            <div className="p-3 rounded-[14px] bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-600">Adjustment entry:</span>
                <span
                  className={`tabular-numbers flex items-center gap-1 ${
                    differenceCentavos > 0
                      ? 'text-[#3D7950]'
                      : differenceCentavos < 0
                      ? 'text-[#A84255]'
                      : 'text-slate-700'
                  }`}
                >
                  {differenceCentavos > 0 ? (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+{formatPHP(differenceCentavos)}</span>
                    </>
                  ) : differenceCentavos < 0 ? (
                    <>
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>-{formatPHP(Math.abs(differenceCentavos))}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>₱0 (Confirmed exact match)</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {differenceCentavos !== 0
                  ? 'An adjustment transaction will be saved for this difference without overwriting past history.'
                  : 'Your account balance will be marked confirmed as of today.'}
              </p>
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
              disabled={isSubmitting}
              className="chest-button-primary px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Confirm balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
