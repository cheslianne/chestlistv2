import React from 'react';
import { ThemeName } from '../types';
import { ChestIcon } from '../components/Navbar';
import {
  PieChart,
  PiggyBank,
  CreditCard,
  BookOpen,
  Palette,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface LandingViewProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onGoToLogin: () => void;
  onGoToSignUp: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  currentTheme,
  onThemeChange,
  onGoToLogin,
  onGoToSignUp,
}) => {
  const themes: { name: ThemeName; label: string; primary: string; container: string }[] = [
    { name: 'blush', label: 'Blush', primary: '#945366', container: '#FFD9E1' },
    { name: 'sage', label: 'Sage', primary: '#52795D', container: '#D9EDD8' },
    { name: 'sky', label: 'Sky', primary: '#3B82F6', container: '#DBEAFE' },
    { name: 'lavender', label: 'Lavender', primary: '#8B5CF6', container: '#EDE9FE' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-400">
      <style>{`
        @keyframes heroFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-hero-float {
          animation: heroFloat 6s ease-in-out infinite;
        }
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-gentle-pulse {
          animation: gentlePulse 4s ease-in-out infinite;
        }
      `}</style>

      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-8 py-3.5 transition-colors duration-400">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Left */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-xs">
              <ChestIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight font-['Plus_Jakarta_Sans'] text-[var(--color-text)]">
              Chestlist
            </span>
          </div>

          {/* Right Controls: Palette switcher, Log in, Sign up */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Theme switcher button */}
            <div className="flex items-center p-1 rounded-full bg-white border border-[var(--color-border)] shadow-xs">
              {themes.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onThemeChange(t.name)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    currentTheme === t.name
                      ? 'ring-2 ring-[var(--color-primary)] scale-110'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: t.primary }}
                  title={`Switch to ${t.label} theme`}
                  aria-label={`Preview ${t.label} theme`}
                />
              ))}
            </div>

            {/* Log in Ghost button */}
            <button
              type="button"
              onClick={onGoToLogin}
              className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              Log in
            </button>

            {/* Sign up Primary button */}
            <button
              type="button"
              onClick={onGoToSignUp}
              className="min-h-[44px] px-4 sm:px-5 py-2 chest-button-primary text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <span>Sign up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-16 space-y-16 sm:space-y-24">
        {/* HERO SECTION (Two Columns) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, subtext, actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-container)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-primary)]">
              <span>Keepsake finance & life tracker</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15] font-['Plus_Jakarta_Sans']">
              Your money and thoughts, kept in one chest.
            </h1>

            <p className="text-base sm:text-lg text-[var(--color-muted)] leading-relaxed max-w-xl mx-auto lg:mx-0">
              Budget, savings, debts, and a private diary. Simple, calm, and yours.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={onGoToSignUp}
                className="w-full sm:w-auto min-h-[44px] chest-button-primary px-7 py-3 text-sm font-semibold cursor-pointer shadow-md inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full sm:w-auto min-h-[44px] chest-button-secondary px-6 py-3 text-sm font-semibold cursor-pointer border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                I already have an account
              </button>
            </div>
          </div>

          {/* Right Column: Original soft illustration of slightly open treasure chest */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              {/* Large rounded blob in the theme's container color */}
              <div
                className="absolute inset-4 rounded-[48px] bg-[var(--color-container)] transition-colors duration-400 opacity-80"
                style={{
                  clipPath: 'polygon(20% 0%, 80% 5%, 100% 30%, 95% 85%, 75% 100%, 15% 95%, 0% 70%, 5% 20%)',
                }}
              />

              {/* Gently floating illustration group (6s infinite loop) */}
              <div className="relative z-10 w-72 h-72 animate-hero-float select-none">
                <svg
                  viewBox="0 0 280 280"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <filter id="hero-shadow" x="-10%" y="-10%" width="120%" height="130%">
                      <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.14" />
                    </filter>
                    <linearGradient id="chestBody" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F9DB8F" />
                      <stop offset="100%" stopColor="#E5B252" />
                    </linearGradient>
                    <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FCE4A2" />
                      <stop offset="100%" stopColor="#EDB95C" />
                    </linearGradient>
                    <linearGradient id="goldCoin" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFF199" />
                      <stop offset="100%" stopColor="#F2C744" />
                    </linearGradient>
                  </defs>

                  {/* Ground Shadow */}
                  <ellipse cx="140" cy="240" rx="65" ry="12" fill="#3A2E33" opacity="0.12" />

                  {/* Slightly Open Treasure Chest */}
                  <g filter="url(#hero-shadow)">
                    {/* Chest Box Base */}
                    <rect
                      x="70"
                      y="140"
                      width="140"
                      height="85"
                      rx="20"
                      fill="url(#chestBody)"
                      stroke="#8C6326"
                      strokeWidth="1.8"
                    />

                    {/* Dark Interior showing slightly open gap */}
                    <path
                      d="M 75 140 Q 140 128 205 140 L 205 152 Q 140 144 75 152 Z"
                      fill="#4A3416"
                    />

                    {/* Slightly Ajar / Angled Lid */}
                    <g transform="rotate(-9 75 140)">
                      <path
                        d="M 66 138 C 66 105, 90 88, 140 88 C 190 88, 214 105, 214 138 Z"
                        fill="url(#chestLid)"
                        stroke="#8C6326"
                        strokeWidth="1.8"
                      />
                      <rect
                        x="62"
                        y="134"
                        width="156"
                        height="10"
                        rx="5"
                        fill="#D9A141"
                        stroke="#8C6326"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 88 98 C 88 98, 89 116, 89 135"
                        stroke="#B37C2C"
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity="0.5"
                      />
                      <path
                        d="M 191 98 C 191 98, 190 116, 190 135"
                        stroke="#B37C2C"
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity="0.5"
                      />
                    </g>

                    {/* Straps on chest body */}
                    <path
                      d="M 88 152 L 88 223"
                      stroke="#B37C2C"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                    <path
                      d="M 192 152 L 192 223"
                      stroke="#B37C2C"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.5"
                    />

                    {/* Golden Heart Lock Clasp */}
                    <g transform="translate(140, 150)">
                      <rect
                        x="-14"
                        y="-8"
                        width="28"
                        height="22"
                        rx="7"
                        fill="#FFF4AF"
                        stroke="#8C6326"
                        strokeWidth="1.4"
                      />
                      <circle cx="0" cy="2" r="2.5" fill="#4A3416" />
                      <polygon points="-1.5,2 1.5,2 1,7 -1,7" fill="#4A3416" />
                    </g>
                  </g>

                  {/* FLOATING ARTIFACT 1: Floating Golden Peso Coin */}
                  <g transform="translate(195, 80) rotate(12)">
                    <circle cx="0" cy="0" r="19" fill="url(#goldCoin)" stroke="#C49429" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="15" fill="none" stroke="#FFF" strokeWidth="1.2" opacity="0.6" />
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      fill="#785312"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      ₱
                    </text>
                  </g>

                  {/* FLOATING ARTIFACT 2: Small Checklist Card */}
                  <g transform="translate(42, 85) rotate(-10)">
                    <rect
                      x="0"
                      y="0"
                      width="54"
                      height="64"
                      rx="10"
                      fill="#FFFFFF"
                      stroke="var(--color-border)"
                      strokeWidth="1.5"
                      filter="url(#hero-shadow)"
                    />
                    <rect x="8" y="10" width="16" height="3" rx="1.5" fill="var(--color-primary)" />
                    {/* Item 1 check */}
                    <circle cx="12" cy="24" r="4" fill="#3D7950" />
                    <polyline points="10,24 11.5,25.5 14,22.5" stroke="#FFF" strokeWidth="1.2" />
                    <line x1="20" y1="24" x2="44" y2="24" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Item 2 check */}
                    <circle cx="12" cy="38" r="4" fill="#3D7950" />
                    <polyline points="10,38 11.5,39.5 14,36.5" stroke="#FFF" strokeWidth="1.2" />
                    <line x1="20" y1="38" x2="40" y2="38" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Item 3 circle */}
                    <circle cx="12" cy="52" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
                    <line x1="20" y1="52" x2="36" y2="52" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                  </g>

                  {/* FLOATING ARTIFACT 3: Tiny Vinyl Record */}
                  <g transform="translate(138, 48) rotate(15)">
                    <circle cx="0" cy="0" r="18" fill="#2B2628" stroke="#1A1517" strokeWidth="1.2" />
                    {/* Vinyl grooves */}
                    <circle cx="0" cy="0" r="14" fill="none" stroke="#3D373A" strokeWidth="0.8" />
                    <circle cx="0" cy="0" r="10" fill="none" stroke="#3D373A" strokeWidth="0.8" />
                    {/* Center label */}
                    <circle cx="0" cy="0" r="6" fill="var(--color-container)" />
                    <circle cx="0" cy="0" r="1.5" fill="#2B2628" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* FOUR FEATURE CARDS (Fade up in sequence) */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
              Four tools in one quiet space
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              No spreadsheets, no financial noise. Just what matters for daily life.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Budget Card */}
            <div className="chest-card p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Budget
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Set a weekly budget. Every expense subtracts automatically.
              </p>
            </div>

            {/* 2. Savings Card */}
            <div className="chest-card p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <PiggyBank className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Savings
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Fill your own alkansya, one deposit at a time.
              </p>
            </div>

            {/* 3. Debt Card */}
            <div className="chest-card p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Debt
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Never miss a due date. Gentle reminders, 3 days before.
              </p>
            </div>

            {/* 4. Notes Card */}
            <div className="chest-card p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Notes
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                A private diary with songs that fit your mood, plus a checklist.
              </p>
            </div>
          </div>
        </section>

        {/* "HOW IT FEELS" STRIP */}
        <section className="chest-card p-6 sm:p-8 border border-[var(--color-border)] bg-white/70 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left max-w-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                How it feels
              </span>
              <h3 className="text-xl font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                See where your money goes, in percentages.
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Visual donuts replace cluttered numbers. Quickly see which parts of your student or personal budget need breathing room this week.
              </p>
            </div>

            {/* Miniature Preview of the Budget Donut Chart */}
            <div className="flex items-center gap-6 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background track */}
                  <circle cx="50" cy="50" r="38" stroke="#E2E8F0" strokeWidth="12" fill="none" />
                  {/* Segment 1: Food 45% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F4B6A6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="107 238"
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: Transport 25% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#C8D5E5"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="60 238"
                    strokeDashoffset="-107"
                  />
                  {/* Segment 3: School 18% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#C9B8EA"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="43 238"
                    strokeDashoffset="-167"
                  />
                  {/* Segment 4: Bills 12% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F6CF7A"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="28 238"
                    strokeDashoffset="-210"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                    Spent
                  </span>
                  <span className="text-sm font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                    68%
                  </span>
                </div>
              </div>

              {/* Mini Legend */}
              <div className="space-y-1.5 text-[11px] font-semibold text-[var(--color-text)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F4B6A6]" />
                  <span>Food • 45%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8D5E5]" />
                  <span>Transport • 25%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C9B8EA]" />
                  <span>School • 18%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F6CF7A]" />
                  <span>Bills • 12%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THEME PREVIEW ROW */}
        <section className="text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
              Choose your atmosphere
            </h3>
            <p className="text-xs text-[var(--color-muted)]">
              Soft colors that keep your eyes calm. Click to re-tint the whole app in real time.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {themes.map((t) => {
              const isSelected = currentTheme === t.name;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onThemeChange(t.name)}
                  className={`min-h-[44px] px-4 py-2 rounded-full border flex items-center gap-2.5 transition-all duration-400 cursor-pointer ${
                    isSelected
                      ? 'bg-white shadow-md border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 font-bold'
                      : 'bg-white/70 hover:bg-white border-[var(--color-border)] text-[var(--color-muted)]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/50 shadow-2xs"
                    style={{ backgroundColor: t.primary }}
                  />
                  <span className="text-xs">{t.label}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[var(--color-border)] py-8 px-4 sm:px-8 bg-[var(--color-surface)] transition-colors duration-400 text-center text-xs text-[var(--color-muted)] space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--color-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
            <ChestIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
            Chestlist
          </span>
          <span>•</span>
          <span>Made with care by Chestlist</span>
        </div>

        <p className="max-w-md mx-auto leading-relaxed text-[11px]">
          Your data is encrypted in transit and at rest. Export or delete it anytime.
        </p>
      </footer>
    </div>
  );
};
