import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, AlertCircle, ArrowLeft, KeyRound, ShieldAlert, RefreshCw } from 'lucide-react';
import { NotesPinState } from '../types';
import * as api from '../api';
import { ForgotPinModal } from './ForgotPinModal';

interface NotesPinGateProps {
  onUnlock: () => void;
  onBackToDashboard: () => void;
}

export const NotesPinGate: React.FC<NotesPinGateProps> = ({
  onUnlock,
  onBackToDashboard,
}) => {
  const [pinState, setPinState] = useState<NotesPinState | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
  const [isUnlockedSuccess, setIsUnlockedSuccess] = useState(false);

  // Setup / First-time state
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');

  // Lockout countdown
  const [remainingLockoutSec, setRemainingLockoutSec] = useState<number>(0);

  // Forgot PIN modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Load initial pin state
  const refreshPinState = useCallback(async () => {
    try {
      const state = await api.getNotesPinState();
      setPinState(state);
      setRetryAction(null);
      setErrorMessage((prev) => (prev === api.GENERIC_USER_ERROR ? null : prev));

      const now = Date.now();
      if (state.lockedUntil && now < state.lockedUntil) {
        setRemainingLockoutSec(Math.ceil((state.lockedUntil - now) / 1000));
      } else {
        setRemainingLockoutSec(0);
      }
    } catch (err) {
      console.error('NotesPinGate.refreshPinState failed:', err);
      setErrorMessage(api.getUserSafeErrorMessage(err));
      setRetryAction(() => () => {
        void refreshPinState();
      });
    }
  }, []);

  useEffect(() => {
    refreshPinState();
  }, [refreshPinState]);

  // Lockout live countdown timer
  useEffect(() => {
    if (remainingLockoutSec <= 0) return;

    const timer = setInterval(() => {
      setRemainingLockoutSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          refreshPinState();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingLockoutSec, refreshPinState]);

  const isLocked = remainingLockoutSec > 0;
  const isFirstTime = pinState && !pinState.isConfigured;

  // Process completed 4 digits
  const handlePinComplete = useCallback(
    async (enteredDigits: string[]) => {
      const pinStr = enteredDigits.join('');

      if (isFirstTime) {
        if (setupStep === 'create') {
          setFirstPin(pinStr);
          setDigits([]);
          setSetupStep('confirm');
          setErrorMessage(null);
        } else {
          // Confirm step
          if (pinStr === firstPin) {
            try {
              await api.setNotesPin(pinStr);
              setRetryAction(null);
              setIsUnlockedSuccess(true);
              setTimeout(() => {
                onUnlock();
              }, 350);
            } catch (err) {
              console.error('NotesPinGate.setNotesPin failed:', err);
              setErrorMessage(api.getUserSafeErrorMessage(err));
              setDigits([]);
              setRetryAction(() => () => {
                void handlePinComplete(enteredDigits);
              });
            }
          } else {
            setIsShaking(true);
            setRetryAction(null);
            setErrorMessage("The PINs don't match. Try again.");
            setTimeout(() => {
              setIsShaking(false);
              setDigits([]);
              setSetupStep('create');
              setFirstPin('');
            }, 600);
          }
        }
        return;
      }

      // Normal verification
      try {
        const result = await api.verifyNotesPin(pinStr);
        setRetryAction(null);
        if (result.success) {
          setIsUnlockedSuccess(true);
          setTimeout(() => {
            onUnlock();
          }, 350);
        } else {
          setIsShaking(true);
          if (result.isLocked) {
            setRemainingLockoutSec(result.remainingLockoutSeconds);
            setErrorMessage(
              `Too many failed attempts. Locked for ${result.remainingLockoutSeconds}s.`
            );
          } else {
            setErrorMessage('Incorrect PIN. Try again.');
          }

          setTimeout(() => {
            setIsShaking(false);
            setDigits([]);
          }, 500);
        }
      } catch (err) {
        console.error('NotesPinGate.verifyNotesPin failed:', err);
        setErrorMessage(api.getUserSafeErrorMessage(err));
        setDigits([]);
        setRetryAction(() => () => {
          void handlePinComplete(enteredDigits);
        });
      }
    },
    [isFirstTime, setupStep, firstPin, onUnlock]
  );

  // Keypad press handler
  const handleDigitPress = useCallback(
    (digit: string) => {
      if (isLocked || isUnlockedSuccess) return;
      if (digits.length >= 4) return;

      const newDigits = [...digits, digit];
      setDigits(newDigits);
      if (errorMessage && !isLocked) {
        setErrorMessage(null);
        setRetryAction(null);
      }

      if (newDigits.length === 4) {
        handlePinComplete(newDigits);
      }
    },
    [digits, isLocked, isUnlockedSuccess, errorMessage, handlePinComplete]
  );

  const handleBackspace = useCallback(() => {
    if (isLocked || isUnlockedSuccess) return;
    setDigits((prev) => prev.slice(0, -1));
    if (errorMessage && !isLocked) {
      setErrorMessage(null);
      setRetryAction(null);
    }
  }, [isLocked, isUnlockedSuccess, errorMessage]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isForgotModalOpen) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigitPress, handleBackspace, isForgotModalOpen]);

  // Title & subtitle copy
  let headerTitle = 'Private space';
  let headerSubtitle = 'Enter your PIN to open your diary.';

  if (isFirstTime) {
    if (setupStep === 'create') {
      headerSubtitle = 'Create your Notes PIN';
    } else {
      headerSubtitle = 'Confirm your PIN';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[620px] py-10 px-4 animate-in fade-in duration-300">
      <div className="max-w-sm w-full mx-auto flex flex-col items-center text-center">
        {/* Soft Circle with Lock / Unlock Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xs mb-4 ${
            isUnlockedSuccess
              ? 'bg-emerald-100 text-emerald-600 scale-110'
              : isLocked
              ? 'bg-amber-100 text-amber-700'
              : isShaking
              ? 'bg-rose-100 text-[#A84255]'
              : 'bg-[var(--color-container)] text-[var(--color-primary)]'
          }`}
        >
          {isUnlockedSuccess ? (
            <Unlock className="w-7 h-7 animate-in zoom-in-75 duration-200" />
          ) : isLocked ? (
            <ShieldAlert className="w-7 h-7" />
          ) : (
            <Lock className="w-7 h-7" />
          )}
        </div>

        {/* Headings */}
        <span className="text-xs font-bold tracking-wider uppercase text-[var(--color-primary)] mb-1">
          {headerTitle}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
          {headerSubtitle}
        </h2>
        <p className="text-xs text-[var(--color-muted)] mt-1 max-w-[260px]">
          {isLocked
            ? 'Keypad disabled until countdown finishes.'
            : isFirstTime
            ? 'Set a 4-digit PIN to keep your diary entries private.'
            : 'Your diary reflections are protected on this device.'}
        </p>

        {/* 4 PIN Fill Circles */}
        <div
          className={`flex items-center justify-center gap-4 my-7 ${
            isShaking ? 'animate-pin-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < digits.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isShaking
                    ? 'border-[#A84255] bg-[#A84255]'
                    : isUnlockedSuccess
                    ? 'border-emerald-500 bg-emerald-500 scale-110'
                    : isFilled
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] scale-110 shadow-xs'
                    : 'border-[var(--color-border)] bg-white'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Lockout Message banner (never rely on color alone) */}
        {errorMessage && (
          <div
            className={`w-full mb-4 p-3 rounded-[12px] text-xs flex items-center justify-between gap-2 font-medium ${
              isLocked
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-rose-50 text-[#A84255] border border-rose-200'
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {isLocked
                  ? `Locked out: wait ${remainingLockoutSec}s before retrying.`
                  : errorMessage}
              </span>
            </div>
            {!isLocked && retryAction && (
              <button
                type="button"
                onClick={retryAction}
                className="px-2.5 py-1 rounded-[8px] bg-white border border-rose-200 text-[#A84255] font-semibold hover:bg-rose-100/60 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Numeric Keypad (3x4) with large touch targets >= 44px */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isLocked || isUnlockedSuccess}
              onClick={() => handleDigitPress(num.toString())}
              className="h-14 sm:h-16 rounded-[16px] bg-white border border-[var(--color-border)] text-[var(--color-text)] font-semibold text-xl sm:text-2xl hover:bg-[var(--color-container)]/40 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center font-['Plus_Jakarta_Sans']"
            >
              {num}
            </button>
          ))}

          {/* Row 4: Empty space / Forgot, 0, Backspace */}
          <div className="flex items-center justify-center">
            {/* blank spacing */}
          </div>

          <button
            type="button"
            disabled={isLocked || isUnlockedSuccess}
            onClick={() => handleDigitPress('0')}
            className="h-14 sm:h-16 rounded-[16px] bg-white border border-[var(--color-border)] text-[var(--color-text)] font-semibold text-xl sm:text-2xl hover:bg-[var(--color-container)]/40 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center font-['Plus_Jakarta_Sans']"
          >
            0
          </button>

          <button
            type="button"
            disabled={isLocked || digits.length === 0}
            onClick={handleBackspace}
            aria-label="Delete digit"
            className="h-14 sm:h-16 rounded-[16px] bg-white border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-container)]/30 active:scale-95 transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center text-xs font-semibold"
          >
            Delete
          </button>
        </div>

        {/* Bottom Actions: Back to dashboard & Forgot PIN */}
        <div className="mt-8 flex flex-col items-center gap-3 w-full">
          {!isFirstTime && (
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] font-medium transition-colors cursor-pointer underline underline-offset-4"
            >
              Forgot PIN?
            </button>
          )}

          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] font-medium py-2 px-3 rounded-full hover:bg-[var(--color-container)]/40 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to dashboard</span>
          </button>
        </div>
      </div>

      {/* Forgot PIN Modal */}
      <ForgotPinModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={() => {
          refreshPinState();
          setErrorMessage(null);
          setDigits([]);
        }}
      />
    </div>
  );
};
