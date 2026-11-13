import React, { useState, useEffect } from 'react';
import { ThemeName } from '../types';
import { ChestIcon } from '../components/Navbar';
import * as api from '../api';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Lock,
  X,
  Mail,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LoginViewProps {
  currentTheme: ThemeName;
  onSuccess: (theme: ThemeName) => void;
  onGoToSignUp: () => void;
  onBackToLanding: () => void;
  showToast: (msg: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  currentTheme,
  onSuccess,
  onGoToSignUp,
  onBackToLanding,
  showToast,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lockout countdown timer
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Check lockout on mount and interval
  useEffect(() => {
    const checkLockout = () => {
      const remaining = api.getLoginLockoutRemaining();
      setLockoutSeconds(remaining);
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const performLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      triggerShake();
      return;
    }

    setErrorMessage(null);
    setRetryAction(null);
    setIsSubmitting(true);

    try {
      const user = await api.logIn({
        email: email.trim(),
        password,
        keepSignedIn,
      });
      showToast(`Welcome back, ${user.name}!`);
      onSuccess(user.theme);
    } catch (err: unknown) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('[Chestlist][LoginView][logIn]', err);
      }
      const safeMsg = api.getUserSafeErrorMessage(err);
      setErrorMessage(safeMsg);
      if (safeMsg === api.GENERIC_USER_ERROR) {
        setRetryAction(() => performLogin);
      }
      triggerShake();
      const remaining = api.getLoginLockoutRemaining();
      if (remaining > 0) {
        setLockoutSeconds(remaining);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin();
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setRetryAction(null);
    setIsSubmitting(true);
    try {
      const user = await api.logInDemoUser();
      showToast(`Welcome, ${user.name}! Sample budget & notes loaded.`);
      onSuccess(user.theme);
    } catch (err: unknown) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('[Chestlist][LoginView][demoLogin]', err);
      }
      setErrorMessage(api.getUserSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };

  // Social sign-in via Supabase OAuth
  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    try {
      setErrorMessage(null);
      setRetryAction(null);
      setIsSubmitting(true);
      await api.signInWithOAuth(provider);
    } catch (err: unknown) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('[Chestlist][LoginView][OAuth]', err);
      }
      const safeMsg = api.getUserSafeErrorMessage(err);
      setErrorMessage(safeMsg);
      if (safeMsg === api.GENERIC_USER_ERROR) {
        setRetryAction(() => () => handleSocialSignIn(provider));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot password submit via Supabase Auth
  const performSendResetLink = async () => {
    if (!forgotEmail.trim()) return;
    setForgotError(null);
    setIsSendingReset(true);
    try {
      await api.sendPasswordReset(forgotEmail.trim());
      setForgotSubmitted(true);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotSubmitted(false);
        setForgotEmail('');
        showToast('Password reset instructions sent to your email.');
      }, 1800);
    } catch (err: unknown) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('[Chestlist][LoginView][sendPasswordReset]', err);
      }
      setForgotError(api.getUserSafeErrorMessage(err));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSendResetLink();
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-400">
      <style>{`
        @keyframes shakeCard {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shakeCard 300ms ease-in-out;
        }
      `}</style>

      {/* Top Header Logo */}
      <button
        type="button"
        onClick={onBackToLanding}
        className="flex items-center gap-2 mb-6 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded-full px-3 py-1.5"
        title="Back to Landing page"
      >
        <div className="w-8 h-8 rounded-xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-xs group-hover:scale-105 transition-transform">
          <ChestIcon className="w-4.5 h-4.5" />
        </div>
        <span className="font-bold text-base tracking-tight font-['Plus_Jakarta_Sans'] text-[var(--color-text)]">
          Chestlist
        </span>
      </button>

      {/* Centered 440px Card */}
      <div
        className={`w-full max-w-[440px] chest-card p-6 sm:p-8 bg-white border border-[var(--color-border)] shadow-xl relative transition-all ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
            Welcome back.
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Open your keepsake chest and continue your quiet rhythm.
          </p>
        </div>

        {/* Lockout Warning Alert */}
        {isLocked && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <p>Too many failed attempts.</p>
              <p className="text-[11px] font-normal text-amber-800">
                Please wait <span className="font-bold tabular-numbers">{lockoutSeconds}</span> seconds before trying again.
              </p>
            </div>
          </div>
        )}

        {/* Generic Error Message */}
        {errorMessage && !isLocked && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#A84255] text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {retryAction && (
              <button
                type="button"
                onClick={() => retryAction()}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
              Email
            </label>
            <input
              type="email"
              disabled={isLocked}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="chest-input w-full text-sm py-2.5 px-3.5"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--color-text)]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] text-[var(--color-primary)] font-semibold hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={isLocked}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="chest-input w-full text-sm py-2.5 px-3.5 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Keep me signed in */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="keep-signed-in"
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="w-4 h-4 rounded-xs border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
            />
            <label htmlFor="keep-signed-in" className="text-xs text-[var(--color-muted)] cursor-pointer select-none">
              Keep me signed in
            </label>
          </div>

          {/* Log In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="w-full min-h-[44px] chest-button-primary py-2.5 px-6 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Logging in...' : 'Log in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {api.isLocalAuthMode ? (
          <div className="mt-5 space-y-2.5">
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[var(--color-border)] w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-[var(--color-muted)] absolute">
                quick preview
              </span>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting || isLocked}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-container)]/50 hover:bg-[var(--color-container)] transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Try Demo Account</span>
            </button>
            <p className="text-[11px] text-center text-[var(--color-muted)] leading-relaxed">
              Sample pesos data &amp; diary preloaded ({api.DEMO_ACCOUNT_EMAIL} · Notes PIN 1234). Stored locally in your browser.
            </p>
          </div>
        ) : (
          <>
            {/* Social Fast Sign In */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-[var(--color-border)] w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-[var(--color-muted)] absolute">
                or continue with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn('google')}
                disabled={isLocked}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialSignIn('apple')}
                disabled={isLocked}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.62-.75 1.04-1.8 0.92-2.87-.9.04-1.99.6-2.63 1.35-.58.67-1.09 1.74-.96 2.78 1 .08 2.05-.51 2.67-1.26z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </>
        )}

        {/* Create account button */}
        <div className="pt-5 mt-5 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-muted)]">
            New to Chestlist?{' '}
            <button
              type="button"
              onClick={onGoToSignUp}
              className="text-[var(--color-primary)] font-bold hover:underline cursor-pointer focus:outline-none"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          <div className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>

            <h3
              id="forgot-modal-title"
              className="text-base font-bold text-center text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
            >
              Reset your password
            </h3>
            <p className="text-xs text-[var(--color-muted)] text-center mt-1 mb-4 leading-relaxed">
              Enter your email and we'll send a reset link to help you get back into your account.
            </p>

            {forgotSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reset link sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleSendResetLink} className="space-y-4">
                {forgotError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[#A84255] text-xs font-medium flex items-center justify-between gap-2" role="alert">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                    {forgotError === api.GENERIC_USER_ERROR && (
                      <button
                        type="button"
                        onClick={performSendResetLink}
                        disabled={isSendingReset}
                        className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <div>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError(null);
                    }}
                    className="chest-input w-full text-sm py-2 px-3"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="chest-button-secondary py-2 px-4 text-xs font-semibold cursor-pointer flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="chest-button-primary py-2 px-4 text-xs font-semibold cursor-pointer flex-1 disabled:opacity-50"
                  >
                    {isSendingReset ? 'Sending...' : 'Send link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
