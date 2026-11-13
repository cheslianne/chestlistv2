import React, { useState } from 'react';
import { AccountWallet, ContainerSkin } from '../types';
import { pesosToCentavos, getManilaDateString, fromDbAccountType, getUserSafeErrorMessage } from '../api';
import { ContainerIllustration } from './ContainerIllustration';
import { X, Target, AlertCircle } from 'lucide-react';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountWallet[];
  onCreateGoal: (data: {
    title: string;
    targetCentavos: number;
    deadline: string;
    backingAccount: string;
    containerSkin: ContainerSkin;
    note?: string;
    emoji?: string;
  }) => Promise<void>;
}

const CONTAINER_SKINS: Array<{
  id: ContainerSkin;
  label: string;
  description: string;
}> = [
  { id: 'glass jar', label: 'Glass Jar', description: 'See your coins stack up' },
  { id: 'piggy bank', label: 'Piggy Bank', description: 'Classic porcelain saver' },
  { id: 'treasure chest', label: 'Treasure Chest', description: 'Keepsake vault' },
  { id: 'tin can', label: 'Tin Can', description: 'Vintage pantry coin box' },
];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onCreateGoal,
}) => {
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [backingAccount, setBackingAccount] = useState(activeAccounts[0]?.name || accounts[0]?.name || 'GCash');
  const [containerSkin, setContainerSkin] = useState<ContainerSkin>('glass jar');
  const [note, setNote] = useState('');

  // Inline validation errors
  const [errors, setErrors] = useState<{
    title?: string;
    targetAmount?: string;
    deadline?: string;
    backingAccount?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Tomorrow as minimum date for future deadlines
  const todayStr = getManilaDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const tomorrowDate = new Date(y, m - 1, d + 1);
  const minDateStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  const validate = () => {
    const errs: typeof errors = {};

    if (!title.trim()) {
      errs.title = 'Please enter a goal name.';
    }

    const numTarget = parseFloat(targetAmount);
    if (!targetAmount || isNaN(numTarget) || numTarget <= 0) {
      errs.targetAmount = 'Enter an amount greater than ₱0.';
    }

    if (!deadline) {
      errs.deadline = 'Please choose a target deadline.';
    } else if (deadline <= todayStr) {
      errs.deadline = 'Deadline must be a future date.';
    }

    if (!backingAccount) {
      errs.backingAccount = 'Please select a backing account.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const performCreateGoal = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onCreateGoal({
        title: title.trim(),
        targetCentavos: pesosToCentavos(parseFloat(targetAmount)),
        deadline,
        backingAccount,
        containerSkin,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('[Chestlist][CreateGoalModal]', err);
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;
    await performCreateGoal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[var(--color-border)] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <Target className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)]">Create Savings Goal</h3>
              <p className="text-xs text-[var(--color-muted)]">Set a target with an earmarked backing account</p>
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

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {/* Goal Name */}
          <div>
            <label
              htmlFor="goal-title-input"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
            >
              Goal Name
            </label>
            <input
              id="goal-title-input"
              type="text"
              placeholder="e.g. Siargao Trip, Laptop Fund, Emergency Buffer"
              value={title}
              aria-invalid={errors.title ? 'true' : 'false'}
              onChange={(e) => {
                const val = e.target.value;
                setTitle(val);
                if (val.trim()) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={`chest-input w-full px-3.5 py-2.5 text-sm ${
                errors.title ? 'border-[#A84255] focus:border-[#A84255]' : ''
              }`}
            />
            {errors.title && (
              <p className="text-xs text-[#A84255] mt-1.5 flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Target Amount & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="goal-target-input"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
              >
                Target Amount (PHP)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                  ₱
                </span>
                <input
                  id="goal-target-input"
                  type="number"
                  step="any"
                  min="1"
                  placeholder="5,000"
                  value={targetAmount}
                  aria-invalid={errors.targetAmount ? 'true' : 'false'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetAmount(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 0) {
                      setErrors((prev) => ({ ...prev, targetAmount: undefined }));
                    }
                  }}
                  className={`chest-input w-full pl-8 pr-3.5 py-2.5 text-sm tabular-numbers font-medium ${
                    errors.targetAmount ? 'border-[#A84255] focus:border-[#A84255]' : ''
                  }`}
                />
              </div>
              {errors.targetAmount && (
                <p className="text-xs text-[#A84255] mt-1.5 flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.targetAmount}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="goal-deadline-input"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
              >
                Deadline
              </label>
              <input
                id="goal-deadline-input"
                type="date"
                min={minDateStr}
                value={deadline}
                aria-invalid={errors.deadline ? 'true' : 'false'}
                onChange={(e) => {
                  const val = e.target.value;
                  setDeadline(val);
                  if (val && val > todayStr) {
                    setErrors((prev) => ({ ...prev, deadline: undefined }));
                  }
                }}
                className={`chest-input w-full px-3.5 py-2.5 text-sm ${
                  errors.deadline ? 'border-[#A84255] focus:border-[#A84255]' : ''
                }`}
              />
              {errors.deadline && (
                <p className="text-xs text-[#A84255] mt-1.5 flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.deadline}</span>
                </p>
              )}
            </div>
          </div>

          {/* Backing Account */}
          <div>
            <label
              htmlFor="goal-backing-account"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
            >
              Backing Account
            </label>
            <select
              id="goal-backing-account"
              value={backingAccount}
              onChange={(e) => setBackingAccount(e.target.value)}
              className="chest-input w-full px-3.5 py-2.5 text-sm cursor-pointer"
            >
              {(activeAccounts.length > 0 ? activeAccounts : accounts).map((acc) => (
                <option key={acc.id} value={acc.name}>
                  {acc.name} ({fromDbAccountType(acc.type)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--color-muted)] mt-1">
              Goals are earmarks: deposits increase the goal's saved figure while remaining in this account.
            </p>
          </div>

          {/* Choose Your Container (4 skins) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">
              Choose your container
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CONTAINER_SKINS.map((s) => {
                const isSelected = containerSkin === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setContainerSkin(s.id)}
                    className={`p-2.5 rounded-[16px] border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                      isSelected
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-container)]/30'
                        : 'border-[var(--color-border)] hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-16 h-16 flex items-center justify-center my-1 pointer-events-none">
                      <ContainerIllustration skin={s.id} percentage={45} size="small" />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-text)] capitalize mt-1">
                      {s.label}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)] line-clamp-1">
                      {s.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label
              htmlFor="goal-note-input"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
            >
              Inspiration Note (optional)
            </label>
            <input
              id="goal-note-input"
              type="text"
              placeholder="e.g. For barkada graduation celebration"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="chest-input w-full px-3.5 py-2.5 text-sm"
            />
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
                onClick={performCreateGoal}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="chest-button-secondary px-4 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="chest-button-primary px-5 py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
