import React, { useState } from 'react';
import { DebtType } from '../types';
import { pesosToCentavos, getManilaDateString, getUserSafeErrorMessage } from '../api';
import { CreditCard, X, AlertCircle, Bell, Calendar, Clock } from 'lucide-react';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDebt: (data: {
    title: string;
    creditor?: string;
    totalCentavos: number;
    type: DebtType;
    dueDate: string;
    dueTime?: string;
    remindersEnabled?: boolean;
    notes?: string;
  }) => Promise<void>;
}

const DEBT_TYPES: Array<{ id: DebtType; label: string }> = [
  { id: 'Pay later', label: 'Pay later' },
  { id: 'Personal', label: 'Personal' },
  { id: 'Loan', label: 'Loan' },
  { id: 'Other', label: 'Other' },
];

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onCreateDebt,
}) => {
  const [title, setTitle] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [type, setType] = useState<DebtType>('Pay later');
  const [dueDate, setDueDate] = useState(() => getManilaDateString());
  const [dueTime, setDueTime] = useState('09:00');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{
    title?: string;
    totalAmount?: string;
    dueDate?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs: typeof errors = {};

    if (!title.trim()) {
      errs.title = 'Please enter a creditor or debt name.';
    }

    const num = parseFloat(totalAmountStr);
    if (!totalAmountStr.trim() || isNaN(num) || num <= 0) {
      errs.totalAmount = 'Enter an amount greater than ₱0.';
    }

    if (!dueDate) {
      errs.dueDate = 'Please select a due date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const performCreateDebt = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onCreateDebt({
        title: title.trim(),
        totalCentavos: pesosToCentavos(parseFloat(totalAmountStr)),
        type,
        dueDate,
        dueTime,
        remindersEnabled,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('[Chestlist][AddDebtModal]', err);
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;
    await performCreateDebt();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-debt-title"
    >
      <div className="bg-white rounded-[24px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[var(--color-border)] max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <CreditCard className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 id="add-debt-title" className="text-base font-bold text-[var(--color-text)]">
                Add Debt or Installment
              </h3>
              <p className="text-xs text-[var(--color-muted)]">Track obligations, installments, and splits</p>
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
          {/* Creditor or Name */}
          <div>
            <label
              htmlFor="debt-title-input"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
            >
              Creditor or Name
            </label>
            <input
              id="debt-title-input"
              type="text"
              placeholder="e.g. GCash PayLater, Borrowed from Maya, Sam (Classmate)"
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

          {/* Total Amount & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="debt-total-input"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
              >
                Total Amount (PHP)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                  ₱
                </span>
                <input
                  id="debt-total-input"
                  type="number"
                  step="any"
                  min="1"
                  placeholder="3,000"
                  value={totalAmountStr}
                  aria-invalid={errors.totalAmount ? 'true' : 'false'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTotalAmountStr(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 0) {
                      setErrors((prev) => ({ ...prev, totalAmount: undefined }));
                    }
                  }}
                  className={`chest-input w-full pl-8 pr-3.5 py-2.5 text-sm tabular-numbers font-medium ${
                    errors.totalAmount ? 'border-[#A84255] focus:border-[#A84255]' : ''
                  }`}
                />
              </div>
              {errors.totalAmount && (
                <p className="text-xs text-[#A84255] mt-1.5 flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.totalAmount}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="debt-type-select"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
              >
                Type
              </label>
              <select
                id="debt-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as DebtType)}
                className="chest-input w-full px-3.5 py-2.5 text-sm cursor-pointer"
              >
                {DEBT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="debt-duedate-input"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
              >
                Due Date
              </label>
              <div className="relative">
                <input
                  id="debt-duedate-input"
                  type="date"
                  value={dueDate}
                  aria-invalid={errors.dueDate ? 'true' : 'false'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDueDate(val);
                    if (val) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }}
                  className={`chest-input w-full px-3.5 py-2.5 text-sm ${
                    errors.dueDate ? 'border-[#A84255] focus:border-[#A84255]' : ''
                  }`}
                />
              </div>
              {errors.dueDate && (
                <p className="text-xs text-[#A84255] mt-1.5 flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.dueDate}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="debt-duetime-input"
                className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
              >
                Due Time
              </label>
              <input
                id="debt-duetime-input"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="chest-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Reminders Toggle (default on) */}
          <div className="p-3 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
                <Bell className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <div>
                <span className="text-xs font-semibold text-[var(--color-text)] block">
                  Due date reminders
                </span>
                <span className="text-[11px] text-[var(--color-muted)]">
                  Banner alert 3 days prior and on due date
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label
              htmlFor="debt-notes-input"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="debt-notes-input"
              rows={2}
              placeholder="e.g. Student interest tier, payment breakdown notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="chest-input w-full px-3.5 py-2.5 text-sm resize-none"
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
                onClick={performCreateDebt}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="chest-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="chest-button-primary px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
