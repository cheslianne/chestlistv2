import React, { useState, useRef, useEffect } from 'react';
import {
  CategoryConfig,
  DebtReminder,
  ThemeName,
  SongLanguage,
  UserProfile,
} from '../types';
import * as api from '../api';
import { formatPHP } from '../api';
import { ThemeSwitcher } from './ThemeSwitcher';
import {
  Home,
  PieChart,
  PiggyBank,
  CreditCard,
  StickyNote,
  Bell,
  Download,
  LogOut,
  Sparkles,
  Check,
  AlertTriangle,
  AlertCircle,
  Music,
  Tags,
} from 'lucide-react';

export type NavTab = 'home' | 'budget' | 'savings' | 'debt' | 'notes';

interface CategoryWithUsage extends CategoryConfig {
  spentCentavos: number;
  percent: number;
}

interface NavbarProps {
  currentTab: NavTab | 'wallet';
  onSelectTab: (tab: NavTab) => void;
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onExportData: () => void;
  onResetData: () => void;
  activeReminders?: DebtReminder[];
  categoryLimits?: CategoryWithUsage[];
  onLogPaymentReminder?: (debtId: string) => void;
  notificationCount?: number;
  user?: UserProfile | null;
  onOpenLogoutModal?: () => void;
  onError?: (retry: () => void) => void;
  autoReadMoodOnSave?: boolean;
  onToggleAutoReadMoodOnSave?: (enabled: boolean) => void;
  onOpenCategoriesModal?: () => void;
}

// Minimalist Chest icon SVG (bullet-journal keepsake chest)
export const ChestIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Chest Lid curve */}
    <path d="M4 10V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" />
    <path d="M2 10h20" />
    {/* Chest Box Base */}
    <rect x="3" y="10" width="18" height="10" rx="2" />
    {/* Front Lock latch */}
    <path d="M10 10v2a2 2 0 0 0 4 0v-2" />
    {/* Side handles */}
    <path d="M2 14h1" />
    <path d="M21 14h1" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentTheme,
  onThemeChange,
  onExportData,
  onResetData,
  activeReminders = [],
  categoryLimits = [],
  onLogPaymentReminder,
  notificationCount = 0,
  user,
  onOpenLogoutModal,
  onError,
  autoReadMoodOnSave = true,
  onToggleAutoReadMoodOnSave,
  onOpenCategoriesModal,
}) => {
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasDismissedNotif, setHasDismissedNotif] = useState(false);
  const [songLanguage, setSongLanguage] = useState<SongLanguage>('Mixed');

  const avatarRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const lang = await api.getSongLanguageSetting();
        setSongLanguage(lang);
      } catch (err) {
        console.error('Navbar.getSongLanguageSetting failed:', err);
        onErrorRef.current?.(() => {
          void loadLanguage();
        });
      }
    };
    void loadLanguage();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setIsAvatarOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nearOrOverLimits = categoryLimits.filter(
    (c) => c.limitCentavos > 0 && c.percent >= 90
  );
  const totalNotifications = Math.max(
    activeReminders.length + nearOrOverLimits.length,
    notificationCount
  );
  const unreadCount = hasDismissedNotif ? 0 : totalNotifications;

  return (
    <>
      {/* Fixed 72px Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] z-40 transition-colors">
        <div className="max-w-[1440px] h-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo (small chest icon + "Chestlist") */}
          <div
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-[14px] bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)] border border-[var(--color-border)] group-hover:scale-105 transition-transform">
              <ChestIcon className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                Chestlist
              </span>
              <span className="text-[10px] text-[var(--color-muted)] -mt-1 hidden sm:inline">
                Pastel life & finance
              </span>
            </div>
          </div>

          {/* Center Pill Tabs (Desktop): Home icon + Budget, Savings, Debt, Notes */}
          <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-white border border-[var(--color-border)] shadow-xs">
            {/* Icon-only Home button */}
            <button
              onClick={() => onSelectTab('home')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-50'
              }`}
              aria-label="Home Dashboard"
              title="Home"
            >
              <Home className="w-4 h-4" strokeWidth={1.75} />
            </button>

            {/* Budget */}
            <button
              onClick={() => onSelectTab('budget')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                currentTab === 'budget'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-50'
              }`}
            >
              Budget
            </button>

            {/* Savings */}
            <button
              onClick={() => onSelectTab('savings')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                currentTab === 'savings'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-50'
              }`}
            >
              Savings
            </button>

            {/* Debt */}
            <button
              onClick={() => onSelectTab('debt')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                currentTab === 'debt'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-50'
              }`}
            >
              Debt
            </button>

            {/* Notes */}
            <button
              onClick={() => onSelectTab('notes')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                currentTab === 'notes'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-50'
              }`}
            >
              Notes
            </button>
          </nav>

          {/* Right Side: Theme switcher, Notification bell with badge, Avatar menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Switcher Popover */}
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-container)]/60 transition-colors relative cursor-pointer"
                aria-label="Notifications"
                aria-expanded={isNotifOpen}
              >
                <Bell className="w-5 h-5 text-[var(--color-text)]" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              {/* Notification Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 p-3 bg-white rounded-[20px] shadow-xl border border-[var(--color-border)] z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setHasDismissedNotif(true)}
                        className="text-[11px] text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                    {/* Active debt reminders */}
                    {activeReminders.map((reminder) => {
                      const isDanger = reminder.type === 'due_today';
                      return (
                        <div
                          key={reminder.debt.id}
                          className={`p-2.5 rounded-[14px] text-xs transition-colors ${
                            isDanger
                              ? 'bg-rose-50/90 border border-rose-200 text-rose-950'
                              : 'bg-amber-50/80 border border-amber-200/80 text-amber-950'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 shrink-0">
                              {isDanger ? (
                                <AlertCircle className="w-4 h-4 text-[#A84255]" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-[#C26910]" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{reminder.message}</p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[10px] opacity-75">
                                  {isDanger ? 'Due today' : `Due in ${reminder.debt.daysLeft} days`}
                                </span>
                                <button
                                  onClick={() => {
                                    setIsNotifOpen(false);
                                    if (onLogPaymentReminder) {
                                      onLogPaymentReminder(reminder.debt.id);
                                    } else {
                                      onSelectTab('debt');
                                    }
                                  }}
                                  className="text-[11px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
                                >
                                  Log payment →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Dynamic Category Budget Notices */}
                    {nearOrOverLimits.map((cat) => (
                      <div
                        key={cat.name}
                        className="p-2.5 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-[var(--color-text)]">
                              {cat.name} Budget Notice
                            </p>
                            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                              You've reached {cat.percent}% of your {cat.name} limit ({formatPHP(cat.limitCentavos)}).
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {activeReminders.length === 0 && nearOrOverLimits.length === 0 && (
                      <div className="p-4 text-center text-xs text-[var(--color-muted)]">
                        You're all caught up! No urgent reminders right now.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Menu (Export my data, Theme, Log out) */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                className="w-10 h-10 rounded-full bg-[var(--color-container)] border-2 border-white shadow-xs flex items-center justify-center font-bold text-xs text-[var(--color-primary)] hover:ring-2 hover:ring-[var(--color-primary)]/40 transition-all cursor-pointer"
                aria-label="User profile menu"
                aria-expanded={isAvatarOpen}
              >
                {user?.name ? user.name[0].toUpperCase() : 'C'}
              </button>

              {isAvatarOpen && (
                <div className="absolute right-0 mt-2 w-72 p-2 bg-white rounded-[20px] shadow-xl border border-[var(--color-border)] z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2.5 pb-2 border-b border-[var(--color-border)]">
                    <p className="text-xs font-bold text-[var(--color-text)]">
                      {user?.name || 'Chestlist User'}
                    </p>
                    {user?.email && (
                      <p className="text-[11px] text-[var(--color-muted)] truncate">
                        {user.email}
                      </p>
                    )}
                  </div>

                  <div className="py-1 space-y-0.5 text-xs">
                    {onOpenCategoriesModal && (
                      <button
                        onClick={() => {
                          onOpenCategoriesModal();
                          setIsAvatarOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-[10px] text-left text-[var(--color-text)] hover:bg-[var(--color-container)]/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Tags className="w-4 h-4 text-[var(--color-muted)]" />
                        <span>Categories</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onExportData();
                        setIsAvatarOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-[10px] text-left text-[var(--color-text)] hover:bg-[var(--color-container)]/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[var(--color-muted)]" />
                      <span>Export my data (JSON)</span>
                    </button>

                    {/* Song Language Setting */}
                    <div className="px-3 py-2 border-t border-[var(--color-border)]/60 my-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>Song language</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-[10px]">
                        {api.SONG_LANGUAGE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const prevLanguage = songLanguage;
                              const nextLanguage = opt.value;
                              const applyLanguage = async () => {
                                setSongLanguage(nextLanguage);
                                try {
                                  await api.setSongLanguageSetting(nextLanguage);
                                } catch (err) {
                                  console.error('Navbar.setSongLanguageSetting failed:', err);
                                  setSongLanguage(prevLanguage);
                                  onErrorRef.current?.(() => {
                                    void applyLanguage();
                                  });
                                }
                              };
                              void applyLanguage();
                            }}
                            className={`py-1 text-[10px] font-semibold rounded-[8px] transition-colors cursor-pointer text-center ${
                              songLanguage === opt.value
                                ? 'bg-white text-[var(--color-primary)] shadow-xs'
                                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Automatic Diary Mood Reading Setting */}
                    <div className="px-3 py-2 border-t border-[var(--color-border)]/60 my-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <label
                          htmlFor="auto-read-mood-toggle"
                          className="text-[11px] font-semibold text-[var(--color-text)] leading-snug cursor-pointer select-none"
                        >
                          Read my mood automatically when I save
                        </label>
                        <button
                          id="auto-read-mood-toggle"
                          type="button"
                          role="switch"
                          aria-checked={autoReadMoodOnSave}
                          onClick={() => onToggleAutoReadMoodOnSave?.(!autoReadMoodOnSave)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                            autoReadMoodOnSave ? 'bg-[var(--color-primary)]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                              autoReadMoodOnSave ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
                        {api.MOOD_ANALYSIS_PRIVACY_TEXT}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        if (onOpenLogoutModal) {
                          onOpenLogoutModal();
                        }
                      }}
                      className="w-full px-3 py-2 rounded-[10px] text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log out</span>
                    </button>

                    <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                        Developer tools
                      </p>
                      <button
                        onClick={() => {
                          onResetData();
                          setIsAvatarOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-[10px] text-left text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-700" />
                        <span>Reset to sample data</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar: Exactly 4 menu items (Budget, Savings, Debt, Notes) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] z-40 px-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => onSelectTab('budget')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-[12px] transition-colors cursor-pointer ${
            currentTab === 'budget'
              ? 'text-[var(--color-primary)] font-bold'
              : 'text-[var(--color-muted)] font-medium'
          }`}
        >
          <PieChart className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span className="text-[11px]">Budget</span>
        </button>

        <button
          onClick={() => onSelectTab('savings')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-[12px] transition-colors cursor-pointer ${
            currentTab === 'savings'
              ? 'text-[var(--color-primary)] font-bold'
              : 'text-[var(--color-muted)] font-medium'
          }`}
        >
          <PiggyBank className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span className="text-[11px]">Savings</span>
        </button>

        <button
          onClick={() => onSelectTab('debt')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-[12px] transition-colors cursor-pointer ${
            currentTab === 'debt'
              ? 'text-[var(--color-primary)] font-bold'
              : 'text-[var(--color-muted)] font-medium'
          }`}
        >
          <CreditCard className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span className="text-[11px]">Debt</span>
        </button>

        <button
          onClick={() => onSelectTab('notes')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-[12px] transition-colors cursor-pointer ${
            currentTab === 'notes'
              ? 'text-[var(--color-primary)] font-bold'
              : 'text-[var(--color-muted)] font-medium'
          }`}
        >
          <StickyNote className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span className="text-[11px]">Notes</span>
        </button>
      </nav>
    </>
  );
};
