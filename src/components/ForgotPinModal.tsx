import React, { useState } from 'react';
import { X, AlertCircle, KeyRound, Check, RefreshCw } from 'lucide-react';
import * as api from '../api';

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPin: string) => void;
}

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const submitReset = async () => {
    setErrorMessage(null);

    if (!password.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setErrorMessage('PIN must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage("The PINs don't match. Try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetNotesPinWithPassword(password, newPin);
      onSuccess(newPin);
      onClose();
    } catch (err) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('ForgotPinModal.resetNotesPinWithPassword failed:', err);
      }
      setErrorMessage(api.getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[24px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)]">
                Reset Notes PIN
              </h3>
              <p className="text-xs text-[var(--color-muted)]">
                Your diary entries will be kept safe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
              Account Password
            </label>
            <input
              type="password"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="chest-input w-full px-3.5 py-2.5 text-sm"
              autoFocus
            />
            <p className="text-[11px] text-[var(--color-muted)] mt-1">
              Enter your Chestlist account password to verify.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                New 4-digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4 digits"
                value={newPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewPin(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="chest-input w-full px-3.5 py-2.5 text-center text-base tracking-widest tabular-numbers font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase mb-1">
                Confirm New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4 digits"
                value={confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setConfirmPin(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="chest-input w-full px-3.5 py-2.5 text-center text-base tracking-widest tabular-numbers font-medium"
              />
            </div>
          </div>

          {/* Custom inline validation error */}
          {errorMessage && (
            <div
              className="p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
              role="alert"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              {errorMessage === api.GENERIC_USER_ERROR && (
                <button
                  type="button"
                  onClick={() => {
                    void submitReset();
                  }}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 rounded-[8px] bg-white border border-rose-200 text-[#A84255] font-semibold hover:bg-rose-100/60 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
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
              className="chest-button-primary px-5 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Save new PIN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
