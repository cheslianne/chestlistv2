import React, { useState } from 'react';
import { AccountWallet, SavingsGoal } from '../types';
import { formatPHP } from '../api';
import { ContainerIllustration } from '../components/ContainerIllustration';
import { ChestIcon } from '../components/Navbar';
import { Plus, Wallet, AlertTriangle, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SavingsOverviewProps {
  goals: SavingsGoal[];
  accounts: AccountWallet[];
  totalSavedCentavos: number;
  onSelectGoal: (goalId: string) => void;
  onOpenCreateModal: () => void;
  onOpenDepositModal: (goalId: string) => void;
  onOpenWallet: () => void;
}

export const SavingsOverview: React.FC<SavingsOverviewProps> = ({
  goals,
  accounts,
  totalSavedCentavos,
  onSelectGoal,
  onOpenCreateModal,
  onOpenDepositModal,
  onOpenWallet,
}) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const formatDeadline = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 animate-in fade-in duration-300">
      {/* Header: "Savings", a "View wallet" link, and the total saved across goals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
              Savings
            </h1>
            <button
              onClick={onOpenWallet}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--color-container)]/40 px-2.5 py-1 rounded-full border border-[var(--color-border)]"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>View wallet</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
            Total saved across goals: <span className="font-extrabold text-[#3D7950] tabular-numbers">{formatPHP(totalSavedCentavos)}</span>
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="chest-button-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New savings goal</span>
        </button>
      </div>

      {/* Empty State */}
      {goals.length === 0 ? (
        <div className="chest-card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-[20px] bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)] mb-3 border border-[var(--color-border)]">
            <ChestIcon className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text)]">
            No savings goals yet. Let's start your first one.
          </h3>
          <p className="text-xs text-[var(--color-muted)] max-w-sm mt-1">
            Create an earmarked goal for trips, gadgets, or emergency savings buffer.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="chest-button-primary mt-4 px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create your first goal</span>
          </button>
        </div>
      ) : (
        /* Goals Grid: 3 columns desktop, 2 tablet, 1 mobile */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const isHovered = hoveredCardId === goal.id;

            return (
              <div
                key={goal.id}
                onMouseEnter={() => setHoveredCardId(goal.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                onClick={() => onSelectGoal(goal.id)}
                className="chest-card p-5 sm:p-6 flex flex-col justify-between hover:border-[var(--color-primary)]/70 hover:shadow-md transition-all cursor-pointer group relative bg-white"
              >
                <div>
                  {/* Top: Jar illustration + Title & Target */}
                  <div className="flex items-center gap-4">
                    <div className="w-[120px] h-[120px] shrink-0 flex items-center justify-center bg-[var(--color-surface)] rounded-[18px] border border-[var(--color-border)] p-1 group-hover:scale-105 transition-transform">
                      <ContainerIllustration
                        skin={goal.containerSkin}
                        percentage={goal.percentage}
                        size="small"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{goal.emoji || '✨'}</span>
                        <h3 className="text-base font-bold text-[var(--color-text)] truncate">
                          {goal.title}
                        </h3>
                      </div>

                      {/* "₱3,200 of ₱5,000" */}
                      <p className="text-sm font-bold text-[var(--color-text)] tabular-numbers mt-1">
                        {formatPHP(goal.savedCentavos)}{' '}
                        <span className="text-xs font-normal text-[var(--color-muted)]">
                          of {formatPHP(goal.targetCentavos)}
                        </span>
                      </p>

                      {/* Backing Account */}
                      <p className="text-[11px] text-[var(--color-muted)] mt-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-[var(--color-muted)]" />
                        <span>Backed in: <strong className="text-[var(--color-text)]">{goal.backingAccount}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Progress bar with percentage */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-muted)]">Progress</span>
                      <span className="font-bold text-[var(--color-text)] tabular-numbers">
                        {goal.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700"
                        style={{ width: `${Math.min(100, goal.percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Deadline & days left info */}
                  <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-muted)]" />
                      <span>
                        Deadline: {formatDeadline(goal.deadline)} · {goal.daysLeft} {goal.daysLeft === 1 ? 'day' : 'days'} left
                      </span>
                    </div>
                  </div>

                  {/* Off-pace Warning Chip (pulses gently) */}
                  {goal.isOffPace && !goal.isCompleted && !goal.isDeadlinePassed && (
                    <div className="mt-3 p-2.5 rounded-[12px] bg-amber-50 border border-amber-300/80 text-amber-950 text-xs flex items-start gap-2 pulse-gentle">
                      <AlertTriangle className="w-4 h-4 text-[#C26910] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#C26910]">You're a bit behind.</p>
                        <p className="text-[11px] text-amber-900 mt-0.5">
                          You need about <strong className="tabular-numbers">{formatPHP(goal.requiredPerDayCentavos)}</strong> per day.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Deadline Passed Chip */}
                  {goal.isDeadlinePassed && !goal.isCompleted && (
                    <div className="mt-3 p-2 rounded-[12px] bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">Deadline has passed</span>
                    </div>
                  )}

                  {/* Completed Chip */}
                  {goal.isCompleted && (
                    <div className="mt-3 p-2 rounded-[12px] bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">Goal target reached!</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row / Hover + Deposit Button */}
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between">
                  <span className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 group-hover:underline">
                    <span>View details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>

                  {/* Small "+ Deposit" button visible on hover / active */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDepositModal(goal.id);
                    }}
                    className={`px-3 py-1.5 rounded-[10px] bg-[var(--color-container)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-text)] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      isHovered ? 'opacity-100 scale-100' : 'opacity-85 sm:opacity-0 sm:scale-95'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Deposit</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Final Dashed Card: "Add savings" */}
          <div
            onClick={onOpenCreateModal}
            className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-[20px] p-8 flex flex-col items-center justify-center text-center group cursor-pointer transition-all hover:scale-[1.02] bg-white/50 hover:bg-white min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-container)]/50 group-hover:bg-[var(--color-container)] text-[var(--color-primary)] flex items-center justify-center transition-transform group-hover:scale-110 mb-2">
              <Plus className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
              Add savings
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-[200px]">
              Add a new savings goal
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
