import React, { useState } from 'react';
import { ThemeName, SpendingStyle, AccountType, SignUpInput } from '../types';
import { ChestIcon } from '../components/Navbar';
import * as api from '../api';
import {
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Lock,
  PiggyBank,
  Mail,
} from 'lucide-react';

interface SignUpViewProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onSuccess: (theme: ThemeName) => void;
  onGoToLogin: () => void;
  onBackToLanding: () => void;
  showToast: (msg: string) => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  currentTheme,
  onThemeChange,
  onSuccess,
  onGoToLogin,
  onBackToLanding,
  showToast,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State: Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{ name?: string; email?: string; password?: string }>({});

  // Form State: Step 2
  const [spendingStyle, setSpendingStyle] = useState<SpendingStyle>('I plan ahead');
  const [alkansyaName, setAlkansyaName] = useState('Emergency Baon');
  const [hasFirstAccount, setHasFirstAccount] = useState(false);
  const [accountName, setAccountName] = useState('GCash Main');
  const [accountType, setAccountType] = useState<AccountType>('E-wallet');
  const [startingBalanceStr, setStartingBalanceStr] = useState('500');
  const [step2Errors, setStep2Errors] = useState<{ alkansyaName?: string }>({});

  // Form State: Step 3
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(currentTheme);
  const [notesPin, setNotesPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  // Theme palettes preview configs for 2x2 grid
  const themePreviews: {
    name: ThemeName;
    title: string;
    primary: string;
    container: string;
    bg: string;
    text: string;
  }[] = [
    { name: 'blush', title: 'Blush Rose', primary: '#945366', container: '#FFD9E1', bg: '#FFF8F8', text: '#2B1C20' },
    { name: 'sage', title: 'Sage Garden', primary: '#52795D', container: '#D9EDD8', bg: '#EFFDF1', text: '#1D3323' },
    { name: 'sky', title: 'Sky Breeze', primary: '#3B82F6', container: '#DBEAFE', bg: '#F0F7FF', text: '#1E3A5F' },
    { name: 'lavender', title: 'Lavender Fog', primary: '#8B5CF6', container: '#EDE9FE', bg: '#FAF7FF', text: '#37285B' },
  ];

  // Spending style choices
  const spendingOptions: SpendingStyle[] = [
    'I plan ahead',
    'I spend as I go',
    'I save first',
    "I'm still figuring it out",
  ];

  // Step 1 Validation
  const validateStep1 = () => {
    const errors: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) {
      errors.name = 'Please enter your name.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Please enter your email.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    // Password rules: at least 8 characters, one letter and one number
    const hasMinLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!password) {
      errors.password = 'Please create a password.';
    } else if (!hasMinLength || !hasLetter || !hasNumber) {
      errors.password = 'Password must be at least 8 characters with at least one letter and one number.';
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Step 2 Validation & Next
  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alkansyaName.trim()) {
      setStep2Errors({ alkansyaName: 'Please name your first Alkansya jar.' });
      return;
    }
    setStep2Errors({});
    setCurrentStep(3);
  };

  // Step 3 Theme Selection
  const handleThemePick = (theme: ThemeName) => {
    setSelectedTheme(theme);
    onThemeChange(theme);
  };

  const performFinalSubmit = async () => {
    if (notesPin && (notesPin.length !== 4 || !/^\d{4}$/.test(notesPin))) {
      setPinError('Notes PIN must be exactly 4 digits, or leave it blank.');
      return;
    }
    setPinError(null);
    setGeneralError(null);
    setRetryAction(null);
    setIsSubmitting(true);

    try {
      const startingCentavos = hasFirstAccount && startingBalanceStr
        ? Math.round(parseFloat(startingBalanceStr) * 100) || 0
        : 0;

      const input: SignUpInput = {
        name: name.trim(),
        email: email.trim(),
        password,
        spendingStyle,
        alkansyaName: alkansyaName.trim(),
        firstAccount: hasFirstAccount && accountName.trim()
          ? {
              name: accountName.trim(),
              type: accountType,
              startingBalanceCentavos: startingCentavos,
            }
          : undefined,
        theme: selectedTheme,
        notesPin: notesPin || undefined,
      };

      const result = await api.signUp(input);
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(input.email);
        showToast('Account created! Please check your email to confirm.');
        return;
      }
      showToast('Welcome to Chestlist!');
      onSuccess(selectedTheme);
    } catch (err: unknown) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('[Chestlist][SignUpView][signUp]', err);
      }
      const safeMsg = api.getUserSafeErrorMessage(err);
      setGeneralError(safeMsg);
      if (safeMsg === api.GENERIC_USER_ERROR) {
        setRetryAction(() => performFinalSubmit);
      }
      if (safeMsg.includes('already in use')) {
        setCurrentStep(1);
        setStep1Errors((prev) => ({ ...prev, email: 'That email is already in use.' }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performFinalSubmit();
  };

  // Social Sign-in via Supabase OAuth
  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    try {
      setGeneralError(null);
      setRetryAction(null);
      setIsSubmitting(true);
      await api.signInWithOAuth(provider);
    } catch (err: unknown) {
      if (!(err instanceof api.UserSafeError)) {
        console.error('[Chestlist][SignUpView][OAuth]', err);
      }
      const safeMsg = api.getUserSafeErrorMessage(err);
      setGeneralError(safeMsg);
      if (safeMsg === api.GENERIC_USER_ERROR) {
        setRetryAction(() => () => handleSocialSignIn(provider));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-400">
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
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
      </button>

      {/* Centered 480px Card */}
      <div className="w-full max-w-[480px] chest-card p-6 sm:p-8 bg-white border border-[var(--color-border)] shadow-xl relative overflow-hidden">
        {confirmationEmail ? (
          <div className="text-center py-6 space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] mx-auto">
              <Mail className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Check your inbox
              </h2>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-xs mx-auto">
                We sent a confirmation link to{' '}
                <span className="font-semibold text-[var(--color-text)]">{confirmationEmail}</span>.
                Confirm your email, then log in to open your Chestlist.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full min-h-[44px] chest-button-primary py-2.5 px-6 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>Go to Log in</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Step Dots at Top */}
        <div className="flex items-center justify-between pb-5 border-b border-[var(--color-border)] mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((stepNum) => {
              const isActive = currentStep === stepNum;
              const isPast = currentStep > stepNum;
              return (
                <div key={stepNum} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-xs scale-105'
                        : isPast
                        ? 'bg-[#3D7950] text-white'
                        : 'bg-slate-100 text-[var(--color-muted)]'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div
                      className={`w-8 sm:w-12 h-1 rounded-full transition-colors ${
                        currentStep > stepNum ? 'bg-[#3D7950]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Step {currentStep} of 3
          </span>
        </div>

        {generalError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#A84255] text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{generalError}</span>
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

        {/* STEP 1: ACCOUNT */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Create your account
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Start your calm finance and bullet-journal sanctuary.
              </p>
            </div>

            {!api.isLocalAuthMode && (
              <>
                {/* Google and Apple Fast-Sign-In Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialSignIn('google')}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.62-.75 1.04-1.8 0.92-2.87-.9.04-1.99.6-2.63 1.35-.58.67-1.09 1.74-.96 2.78 1 .08 2.05-.51 2.67-1.26z" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[var(--color-border)] w-full" />
                  <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-[var(--color-muted)] absolute">
                    or sign up with email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={handleNextStep1} noValidate className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ches Miranda"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (step1Errors.name) setStep1Errors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`chest-input w-full text-sm py-2.5 px-3.5 ${
                    step1Errors.name ? 'border-[#A84255]' : ''
                  }`}
                  aria-invalid={step1Errors.name ? 'true' : 'false'}
                />
                {step1Errors.name && (
                  <p className="mt-1 text-xs text-[#A84255] font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{step1Errors.name}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (step1Errors.email) setStep1Errors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`chest-input w-full text-sm py-2.5 px-3.5 ${
                    step1Errors.email ? 'border-[#A84255]' : ''
                  }`}
                  aria-invalid={step1Errors.email ? 'true' : 'false'}
                />
                {step1Errors.email && (
                  <p className="mt-1 text-xs text-[#A84255] font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{step1Errors.email}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (step1Errors.password) setStep1Errors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`chest-input w-full text-sm py-2.5 px-3.5 pr-10 ${
                      step1Errors.password ? 'border-[#A84255]' : ''
                    }`}
                    aria-invalid={step1Errors.password ? 'true' : 'false'}
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
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  At least 8 characters, with at least one letter and one number.
                </p>
                {step1Errors.password && (
                  <p className="mt-1 text-xs text-[#A84255] font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{step1Errors.password}</span>
                  </p>
                )}
              </div>

              {/* Next Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[44px] chest-button-primary py-2.5 px-6 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  <span>Next: About you</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: ABOUT YOU */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                About you
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Help us shape your initial containers and jars.
              </p>
            </div>

            <form onSubmit={handleNextStep2} noValidate className="space-y-4">
              {/* Spending Style Question */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-2">
                  How do you usually spend?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup">
                  {spendingOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={spendingStyle === opt}
                      onClick={() => setSpendingStyle(opt)}
                      className={`min-h-[44px] p-2.5 rounded-[14px] text-xs font-semibold text-left border transition-all cursor-pointer flex items-center justify-between ${
                        spendingStyle === opt
                          ? 'bg-[var(--color-container)] border-[var(--color-primary)] text-[var(--color-text)] shadow-xs'
                          : 'bg-slate-50/70 border-[var(--color-border)] text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-text)]'
                      }`}
                    >
                      <span>{opt}</span>
                      {spendingStyle === opt && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name your first Alkansya jar */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Name your first Alkansya jar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={alkansyaName}
                    onChange={(e) => {
                      setAlkansyaName(e.target.value);
                      if (step2Errors.alkansyaName) setStep2Errors({});
                    }}
                    placeholder="e.g. Emergency Baon, Beach Trip"
                    className="chest-input w-full text-sm py-2 px-3 pl-8.5"
                  />
                  <PiggyBank className="w-4 h-4 text-[var(--color-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  Creates a Cash stash account in your Wallet with a ₱0 starting balance.
                </p>
                {step2Errors.alkansyaName && (
                  <p className="mt-1 text-xs text-[#A84255] font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{step2Errors.alkansyaName}</span>
                  </p>
                )}
              </div>

              {/* Optional First Account */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text)]">
                    Add an optional starting account?
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasFirstAccount(!hasFirstAccount)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                      hasFirstAccount
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white text-[var(--color-muted)] border-[var(--color-border)]'
                    }`}
                  >
                    {hasFirstAccount ? 'Included' : 'Skip for now'}
                  </button>
                </div>

                {hasFirstAccount && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-[var(--color-border)] space-y-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--color-muted)] mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="e.g. GCash Main, BPI Savings"
                        className="chest-input w-full text-xs py-2 px-3"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-muted)] mb-1">
                          Account Type
                        </label>
                        <select
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value as AccountType)}
                          className="chest-input w-full text-xs py-2 px-2.5"
                        >
                          {api.ACCOUNT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.dbValue} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--color-muted)] mb-1">
                          Starting Balance (₱)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={startingBalanceStr}
                          onChange={(e) => setStartingBalanceStr(e.target.value)}
                          placeholder="0.00"
                          className="chest-input w-full text-xs py-2 px-3"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="min-h-[44px] chest-button-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] chest-button-primary py-2.5 px-6 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  <span>Next: Look and lock</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: LOOK AND LOCK */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Look and lock
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Pick your aesthetic and protect your personal diary.
              </p>
            </div>

            <form onSubmit={handleFinalSubmit} noValidate className="space-y-4">
              {/* Pick your look: 2x2 grid of theme cards with mini preview */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-2">
                  Pick your look
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {themePreviews.map((t) => {
                    const isSelected = selectedTheme === t.name;
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleThemePick(t.name)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-white shadow-md border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                            : 'bg-slate-50/60 border-[var(--color-border)] hover:bg-slate-100/60'
                        }`}
                      >
                        {/* Mini Dashboard Preview in theme colors */}
                        <div
                          className="h-12 rounded-xl p-1.5 mb-2 flex flex-col justify-between"
                          style={{ backgroundColor: t.bg, border: `1px solid ${t.container}` }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="w-4 h-2 rounded-xs"
                              style={{ backgroundColor: t.primary }}
                            />
                            <span
                              className="w-6 h-1.5 rounded-full"
                              style={{ backgroundColor: t.container }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className="w-8 h-2 rounded-xs"
                              style={{ backgroundColor: t.container }}
                            />
                            <span
                              className="w-3 h-2 rounded-xs"
                              style={{ backgroundColor: t.primary, opacity: 0.7 }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-text)]">
                            {t.title}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px]">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Notes PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[var(--color-text)]">
                    Set a Notes PIN (Optional)
                  </label>
                  <span className="text-[11px] text-[var(--color-muted)]">4 digits</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="e.g. 1234"
                    value={notesPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNotesPin(val);
                      if (pinError) setPinError(null);
                    }}
                    className={`chest-input w-full text-sm py-2 px-3 pl-8 tracking-widest ${
                      pinError ? 'border-[#A84255]' : ''
                    }`}
                  />
                  <Lock className="w-4 h-4 text-[var(--color-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-muted)] leading-tight">
                  You can also set or change this PIN later when you first open your diary.
                </p>
                {pinError && (
                  <p className="mt-1 text-xs text-[#A84255] font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              {/* Actions: Back & Create my Chestlist */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="min-h-[44px] chest-button-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] chest-button-primary py-2.5 px-6 text-xs font-semibold cursor-pointer shadow-md inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isSubmitting ? 'Creating...' : 'Create my Chestlist'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
          </>
        )}

        {/* Footer Link: Already have an account */}
        <div className="pt-5 mt-5 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-muted)]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-[var(--color-primary)] font-bold hover:underline cursor-pointer focus:outline-none"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
