import React from 'react';
import { formatPHP } from '../api';
import { X, Sparkles, Calendar, ArrowRight } from 'lucide-react';

interface WeeklyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalSpentCentavos: number;
  allAccountsTotalCentavos: number;
  weeklyBudgetCentavos: number;
  weekRangeLabel: string;
}

export const WeeklyRecapModal: React.FC<WeeklyRecapModalProps> = ({
  isOpen,
  onClose,
  totalSpentCentavos,
  allAccountsTotalCentavos,
  weeklyBudgetCentavos,
  weekRangeLabel,
}) => {
  if (!isOpen) return null;

  const budgetLeftCentavos = Math.max(0, weeklyBudgetCentavos - totalSpentCentavos);
  const spentPercent =
    weeklyBudgetCentavos > 0
      ? Math.round((totalSpentCentavos / weeklyBudgetCentavos) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Soft pastel decorative header banner */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <Sparkles className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text)]">Weekly Recap & Past Weeks</h3>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{weekRangeLabel}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Exact required prompt statements */}
          <div className="p-4 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Weekly Spending
              </span>
              <span className="text-xs font-medium text-[var(--color-muted)]">
                {spentPercent}% of {formatPHP(weeklyBudgetCentavos)} budget
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-text)]">
              The total you have spent is{' '}
              <span className="text-[#A84255] tabular-numbers">{formatPHP(totalSpentCentavos)}</span>
            </p>
          </div>

          <div className="p-4 rounded-[18px] bg-[var(--color-container)]/30 border border-[var(--color-border)] space-y-2">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Total Liquid Funds
            </span>
            <p className="text-xl font-bold text-[var(--color-text)]">
              The total of your money now is{' '}
              <span className="text-[#3D7950] tabular-numbers">{formatPHP(allAccountsTotalCentavos)}</span>
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Across your e-wallets, savings accounts, and cash on hand.
            </p>
          </div>

          {/* Prompt specified note */}
          <div className="p-4 rounded-[18px] bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
            <span className="font-bold block mb-1">Gentle Reminder:</span>
            A new week means a fresh start. Leftover budget does not carry over.
          </div>

          {/* Past weeks archive records */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2.5">
              Archive & Historical Weeks
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-[12px] border border-[var(--color-border)] flex items-center justify-between bg-white">
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Mon Nov 2 – Sun Nov 8, 2026</span>
                  <p className="text-[11px] text-[var(--color-muted)]">Spent ₱4,120 · Leftover ₱880</p>
                </div>
                <span className="font-semibold text-emerald-700">Under budget</span>
              </div>
              <div className="p-2.5 rounded-[12px] border border-[var(--color-border)] flex items-center justify-between bg-white">
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Mon Oct 26 – Sun Nov 1, 2026</span>
                  <p className="text-[11px] text-[var(--color-muted)]">Spent ₱4,940 · Leftover ₱60</p>
                </div>
                <span className="font-semibold text-emerald-700">On target</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-end">
          <button
            onClick={onClose}
            className="chest-button-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <span>Close recap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
