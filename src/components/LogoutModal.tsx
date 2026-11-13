import React, { useEffect } from 'react';
import { ChestIcon } from './Navbar';
import { LogOut, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-6 md:p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close icon button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          aria-label="Close logout modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Chest Icon in tinted badge */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mx-auto mb-4 shadow-xs">
          <ChestIcon className="w-7 h-7" />
        </div>

        {/* Title & Message */}
        <h3
          id="logout-modal-title"
          className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
        >
          Log out of Chestlist?
        </h3>
        <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed max-w-xs mx-auto">
          Your data stays saved in your account. You can log back in anytime with your email or demo credentials.
        </p>

        {/* Buttons (Stay / Log out) */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] chest-button-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-border)]"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirmLogout}
            className="flex-1 min-h-[44px] chest-button-primary py-2.5 px-4 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
