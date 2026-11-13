import React from 'react';
import { SavingsGoal } from '../types';
import { ContainerIllustration } from './ContainerIllustration';
import { formatPHP } from '../api';
import { Sparkles, Trophy, Check, X } from 'lucide-react';

interface GoalReachedModalProps {
  goal: SavingsGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkDone: (goalId: string) => void;
}

export const GoalReachedModal: React.FC<GoalReachedModalProps> = ({
  goal,
  isOpen,
  onClose,
  onMarkDone,
}) => {
  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[var(--color-border)] text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Soft sparkle particles decoration */}
        <div className="absolute top-3 right-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close celebration modal"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)] mb-2 shadow-xs">
            <Trophy className="w-6 h-6" strokeWidth={1.75} />
          </div>

          <span className="text-xs uppercase tracking-wider font-bold text-[var(--color-primary)] inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Milestone Unlocked!
          </span>

          <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] mt-1 font-['Plus_Jakarta_Sans']">
            You reached your {goal.title} goal. Congratulations!
          </h3>

          <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">
            You successfully saved {formatPHP(goal.savedCentavos)} of {formatPHP(goal.targetCentavos)} in {goal.backingAccount}.
          </p>

          {/* Full Container Display */}
          <div className="my-5 p-4 rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center w-full">
            <div className="scale-90">
              <ContainerIllustration skin={goal.containerSkin} percentage={100} size="small" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full pt-1">
            <button
              onClick={onClose}
              className="chest-button-secondary flex-1 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onMarkDone(goal.id);
                onClose();
              }}
              className="chest-button-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Mark as done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
