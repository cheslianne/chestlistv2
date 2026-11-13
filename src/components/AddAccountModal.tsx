import React, { useState } from 'react';
import { AccountType } from '../types';
import { pesosToCentavos, ACCOUNT_TYPE_OPTIONS, getUserSafeErrorMessage } from '../api';
import { X, Landmark, AlertCircle, ShieldCheck } from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (data: {
    name: string;
    nickname?: string;
    type: AccountType;
    last4?: string;
    accountNumber?: string;
    startingBalanceCentavos: number;
    color: string;
    textColor?: string;
  }) => Promise<void>;
}

export const PASTEL_SWATCHES = [
  { name: 'Rose', bg: '#F7DFE2', text: '#531D28' },
  { name: 'Sky', bg: '#D9E8FA', text: '#153C66' },
  { name: 'Mint', bg: '#D9F3E5', text: '#134D31' },
  { name: 'Seafoam', bg: '#D6EFEA', text: '#134B42' },
  { name: 'Peach', bg: '#FCE3D0', text: '#5C3110' },
  { name: 'Lavender', bg: '#EAE3F7', text: '#3D275E' },
  { name: 'Butter', bg: '#FEF3CF', text: '#5A450F' },
  { name: 'Linen', bg: '#EFECE6', text: '#423C35' },
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAddAccount,
}) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [type, setType] = useState<AccountType>('Bank');
  const [last4, setLast4] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const [nameError, setNameError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const submitAccount = async () => {
    const num = parseFloat(balanceStr);
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const chosenColor = PASTEL_SWATCHES[selectedColorIndex] || PASTEL_SWATCHES[0];
      await onAddAccount({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        type,
        last4: last4.trim() ? last4.trim().slice(-4) : undefined,
        accountNumber: accountNumber.trim() || undefined,
        startingBalanceCentavos: pesosToCentavos(num),
        color: chosenColor.bg,
        textColor: chosenColor.text,
      });
      // Reset form
      setName('');
      setNickname('');
      setType('Bank');
      setLast4('');
      setAccountNumber('');
      setBalanceStr('');
      onClose();
    } catch (err) {
      console.error('[Chestlist][AddAccountModal]', err);
      setSubmitError(getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasErr = false;

    if (!name.trim()) {
      setNameError('Account name is required.');
      hasErr = true;
    } else {
      setNameError(null);
    }

    const num = parseFloat(balanceStr);
    if (!balanceStr.trim() || isNaN(num) || num < 0) {
      setBalanceError('Enter an amount greater than or equal to ₱0.');
      hasErr = true;
    } else {
      setBalanceError(null);
    }

    if (hasErr) return;
    await submitAccount();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="add-account-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <Landmark className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 id="add-account-modal-title" className="text-base font-bold text-[var(--color-text)]">
                Add Account
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">
                Track your PH e-wallets, bank savings, and cash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form with noValidate (no default browser bubbles) */}
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Account Name <span className="text-[#A84255]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BPI, GCash, Maya, Landbank"
              value={name}
              aria-invalid={nameError ? 'true' : 'false'}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setNameError(null);
              }}
              className={`chest-input w-full px-3 py-2 text-sm ${
                nameError ? 'border-[#A84255] focus:border-[#A84255]' : ''
              }`}
            />
            {nameError && (
              <p className="mt-1.5 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          {/* Nickname & Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                Nickname (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Allowance, Daily Stash"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="chest-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                Account Type <span className="text-[#A84255]">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="chest-input w-full px-3 py-2 text-sm cursor-pointer"
              >
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.dbValue} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Number & Last 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                Account or Mobile No.
              </label>
              <input
                type="text"
                placeholder="e.g. 0917... (masked)"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  if (e.target.value.length >= 4 && !last4) {
                    setLast4(e.target.value.slice(-4));
                  }
                }}
                className="chest-input w-full px-3 py-2 text-sm"
              />
              <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">
                Never enter card numbers or PINs
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 4821"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="chest-input w-full px-3 py-2 text-sm tabular-numbers"
              />
              <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">
                Shown as •••• 4821 on card
              </span>
            </div>
          </div>

          {/* Starting Balance */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Starting Balance (PHP) <span className="text-[#A84255]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={balanceStr}
                aria-invalid={balanceError ? 'true' : 'false'}
                onChange={(e) => {
                  setBalanceStr(e.target.value);
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num) && num >= 0) {
                    setBalanceError(null);
                  }
                }}
                className={`chest-input w-full pl-7 pr-3 py-2 text-sm tabular-numbers font-medium ${
                  balanceError ? 'border-[#A84255] focus:border-[#A84255]' : ''
                }`}
              />
            </div>
            {balanceError && (
              <p className="mt-1.5 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{balanceError}</span>
              </p>
            )}
          </div>

          {/* Card Color (Row of 8 Pastel Swatches) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1.5">
              Card Color
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PASTEL_SWATCHES.map((swatch, idx) => {
                const isSelected = selectedColorIndex === idx;
                return (
                  <button
                    key={swatch.name}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    className={`h-9 rounded-[10px] border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-slate-800 scale-105 border-slate-700'
                        : 'border-slate-300 hover:scale-102'
                    }`}
                    style={{ backgroundColor: swatch.bg }}
                    title={swatch.name}
                    aria-label={`Select ${swatch.name} color`}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: swatch.text }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-[14px] bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              We never ask for your bank login, OTP, or full card number. You add your accounts yourself, and Chestlist adds up your totals.
            </p>
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
                onClick={submitAccount}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}

          {/* Actions */}
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
              className="chest-button-primary px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
