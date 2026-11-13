import React, { useEffect, useState } from 'react';
import { DebtItem } from '../types';
import { formatPHP, getUserSafeErrorMessage } from '../api';
import { Sparkles, CheckCircle2, Archive, X, AlertCircle } from 'lucide-react';

interface DebtCompletionModalProps {
  debt: DebtItem | null;
  isOpen: boolean;
  onClose: () => void;
  onArchive: (debtId: string) => Promise<void>;
}

export const DebtCompletionModal: React.FC<DebtCompletionModalProps> = ({
  debt,
  isOpen,
  onClose,
  onArchive,
}) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowSparkles(true);
      const timer = setTimeout(() => {
        setShowSparkles(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !debt) return null;

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      setArchiveError(null);
      await onArchive(debt.id);
      onClose();
    } catch (err) {
      console.error('[Chestlist][DebtCompletionModal][archive]', err);
      setArchiveError(getUserSafeErrorMessage(err));
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-modal-title"
    >
      <div className="bg-white rounded-[24px] max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
        {/* Soft celebratory background shimmer */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-100/60 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-[var(--color-container)]/50 blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {/* Celebration Donut / Badge */}
        <div className="mx-auto w-24 h-24 relative flex items-center justify-center mt-2 mb-4">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100" role="img" aria-label="100% paid progress">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#E5E7EB"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#3D7950"
              strokeWidth="8"
              strokeDasharray="251.2"
              strokeDashoffset="0"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#3D7950]" strokeWidth={2} />
          </div>

          {showSparkles && (
            <div className="absolute -top-1 -right-1 text-amber-500 animate-bounce">
              <Sparkles className="w-5 h-5 fill-amber-300 text-amber-500" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3D7950] mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Milestone Reached</span>
        </div>

        <h3 id="completion-modal-title" className="text-xl font-extrabold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
          Debt fully paid. Well done!
        </h3>

        <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
          You have completely settled <strong className="text-[var(--color-text)]">{debt.title}</strong>{' '}
          ({formatPHP(debt.totalCentavos)}). One step closer to financial peace of mind.
        </p>

        {archiveError && (
          <div
            role="alert"
            className="mt-4 p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{archiveError}</span>
            </div>
            <button
              type="button"
              onClick={handleArchive}
              disabled={isArchiving}
              className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className="w-full py-2.5 px-4 rounded-[12px] bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Archive className="w-4 h-4" strokeWidth={1.75} />
            <span>{isArchiving ? 'Archiving...' : 'Archive this debt'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
