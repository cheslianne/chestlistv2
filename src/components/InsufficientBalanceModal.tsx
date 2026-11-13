import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AccountWallet } from '../types';
import { formatPHP, fromDbAccountType } from '../api';

export interface InsufficientBalanceModalProps {
  isOpen: boolean;
  account: AccountWallet | null;
  availableCentavos: number;
  requiredCentavos: number;
  kindLabel: 'expense' | 'transfer' | 'debt payment';
  isSubmitting?: boolean;
  onChooseAnotherAccount: () => void;
  onUpdateBalanceFirst: () => void;
  onAddAnyway: () => void;
  onCancel: () => void;
}

export const InsufficientBalanceModal: React.FC<InsufficientBalanceModalProps> = ({
  isOpen,
  account,
  availableCentavos,
  requiredCentavos,
  kindLabel,
  isSubmitting = false,
  onChooseAnotherAccount,
  onUpdateBalanceFirst,
  onAddAnyway,
  onCancel,
}) => {
  const chooseAnotherBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    chooseAnotherBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen || !account) return null;

  const afterBalanceCentavos = availableCentavos - requiredCentavos;
  const isCashStash = fromDbAccountType(account.type) === 'Cash stash';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insufficient-balance-title"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <div
        className="relative bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-[#C26910] flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div>
            <h3
              id="insufficient-balance-title"
              className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
            >
              Not enough balance
            </h3>
            <p className="text-xs text-[var(--color-text)] mt-1.5 leading-relaxed">
              {account.name} has <span className="font-semibold tabular-numbers">{formatPHP(availableCentavos)}</span>, but this {kindLabel} is{' '}
              <span className="font-semibold tabular-numbers">{formatPHP(requiredCentavos)}</span>. Saving it will leave the account at{' '}
              <span className="font-bold text-[#A84255] tabular-numbers">{formatPHP(afterBalanceCentavos)}</span>.
            </p>
            {isCashStash && (
              <p className="text-xs text-[#C26910] font-medium mt-2 leading-relaxed">
                Cash on hand can&apos;t really go below zero. Check your cash count or update the balance.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            ref={chooseAnotherBtnRef}
            type="button"
            disabled={isSubmitting}
            onClick={onChooseAnotherAccount}
            className="chest-button-primary w-full py-2.5 px-4 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Choose another account
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onUpdateBalanceFirst}
            className="chest-button-secondary w-full py-2.5 px-4 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Update balance first
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onAddAnyway}
            className="w-full py-2.5 px-4 rounded-[12px] text-xs font-semibold text-[#A84255] hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Add anyway'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-[12px] text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
