import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AccountType,
  AccountWallet,
  CategoryName,
  ExpenseCategory,
  ParsedMessageResult,
  SavingsGoal,
} from '../types';
import {
  formatPHP,
  getToday,
  formatPrettyDate,
  fromDbAccountType,
  formatTransactionTypeLabel,
  getUserSafeErrorMessage,
} from '../api';
import { AddAccountModal } from '../components/AddAccountModal';
import { UpdateBalanceModal } from '../components/UpdateBalanceModal';
import { PasteImportModal } from '../components/PasteImportModal';
import {
  ArrowLeft,
  Plus,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';

interface WalletViewProps {
  accounts: AccountWallet[];
  savingsGoals: SavingsGoal[];
  categories?: ExpenseCategory[];
  onBack: () => void;
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
  onUpdateBalance: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  onImportMessage: (params: {
    amountCentavos: number;
    merchant: string;
    direction: 'debit' | 'credit';
    category: CategoryName;
    accountId: string;
    accountName: string;
    referenceNumber?: string;
    allowOverdraft?: boolean;
  }) => Promise<void>;
  onLinkGoalBackingAccount: (goalId: string, accountName: string) => Promise<void>;
}

// Minimalist Empty Chest Illustration for Empty State
const EmptyChestSvg = () => (
  <svg
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-24 h-20 mx-auto opacity-75"
  >
    <rect x="20" y="38" width="80" height="48" rx="10" fill="#F0D5DD" stroke="#945366" strokeWidth="2" />
    <path
      d="M20 44C20 32.9543 28.9543 24 40 24H80C91.0457 24 100 32.9543 100 44V44H20V44Z"
      fill="#FFD9E1"
      stroke="#945366"
      strokeWidth="2"
    />
    <line x1="20" y1="44" x2="100" y2="44" stroke="#945366" strokeWidth="2" />
    <rect x="54" y="40" width="12" height="14" rx="3" fill="#FFF8F8" stroke="#945366" strokeWidth="2" />
    <circle cx="60" cy="46" r="1.75" fill="#945366" />
    <path d="M12 56H20" stroke="#945366" strokeWidth="2" strokeLinecap="round" />
    <path d="M100 56H108" stroke="#945366" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const WalletView: React.FC<WalletViewProps> = ({
  accounts,
  savingsGoals,
  categories,
  onBack,
  onAddAccount,
  onUpdateBalance,
  onImportMessage,
  onLinkGoalBackingAccount,
}) => {
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [balanceModalAccount, setBalanceModalAccount] = useState<AccountWallet | null>(null);

  // Expanded card in stack
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(
    accounts[0]?.id || null
  );

  // Stack vs Grid layout toggle
  const [isSpreadView, setIsSpreadView] = useState(false);

  // Eye reveal state for account numbers with 10-second auto-hide
  const [revealedAccountIds, setRevealedAccountIds] = useState<Record<string, boolean>>({});
  const hideTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(hideTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleToggleRevealNumber = (accId: string) => {
    setRevealedAccountIds((prev) => {
      const isCurrentlyRevealed = Boolean(prev[accId]);
      if (isCurrentlyRevealed) {
        if (hideTimersRef.current[accId]) {
          clearTimeout(hideTimersRef.current[accId]);
          delete hideTimersRef.current[accId];
        }
        return { ...prev, [accId]: false };
      } else {
        // Schedule auto-hide in 10 seconds
        if (hideTimersRef.current[accId]) {
          clearTimeout(hideTimersRef.current[accId]);
        }
        hideTimersRef.current[accId] = setTimeout(() => {
          setRevealedAccountIds((latest) => ({ ...latest, [accId]: false }));
          delete hideTimersRef.current[accId];
        }, 10000);
        return { ...prev, [accId]: true };
      }
    });
  };

  // Dismissed state for overdrawn account banners (automatically clears if balance returns >= 0)
  const [dismissedOverdrawnKeys, setDismissedOverdrawnKeys] = useState<Record<string, boolean>>({});

  // Compute total of active accounts
  const activeAccounts = useMemo(() => accounts.filter((a) => !a.isArchived), [accounts]);
  const overdrawnAccounts = useMemo(
    () => activeAccounts.filter((a) => a.balanceCentavos < 0),
    [activeAccounts]
  );
  const visibleOverdrawnAccounts = useMemo(
    () =>
      overdrawnAccounts.filter(
        (acc) => !dismissedOverdrawnKeys[`${acc.id}:${acc.balanceCentavos}`]
      ),
    [overdrawnAccounts, dismissedOverdrawnKeys]
  );
  const allAccountsTotalCentavos = useMemo(() => {
    return activeAccounts.reduce((sum, a) => sum + a.balanceCentavos, 0);
  }, [activeAccounts]);

  // Latest updated date among accounts
  const lastUpdatedDateLabel = useMemo(() => {
    if (activeAccounts.length === 0) return 'Just now';
    const sorted = [...activeAccounts].sort((a, b) =>
      b.lastConfirmedDate.localeCompare(a.lastConfirmedDate)
    );
    return formatPrettyDate(sorted[0].lastConfirmedDate);
  }, [activeAccounts]);

  // Check if any account is stale (> 7 days without confirmation) or if today is Monday
  const today = getToday();
  const isMonday = today.getDay() === 1;
  const staleAccounts = useMemo(() => activeAccounts.filter((a) => a.isStale), [activeAccounts]);
  const showWeeklyPrompt = isMonday || staleAccounts.length > 0;

  // Selected goal to link
  const [selectedGoalToLink, setSelectedGoalToLink] = useState<string>('');
  const [linkError, setLinkError] = useState<{ goalId: string; accountName: string; message: string } | null>(null);
  const [isLinkingGoal, setIsLinkingGoal] = useState(false);

  const performLinkGoal = async (goalId: string, accountName: string) => {
    try {
      setIsLinkingGoal(true);
      setLinkError(null);
      await onLinkGoalBackingAccount(goalId, accountName);
      setSelectedGoalToLink('');
    } catch (err) {
      console.error('[Chestlist][WalletView][linkGoal]', err);
      setLinkError({
        goalId,
        accountName,
        message: getUserSafeErrorMessage(err),
      });
    } finally {
      setIsLinkingGoal(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 animate-in fade-in duration-300">
      {/* 1. Top Header with Back Arrow and Title "Wallet" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] bg-white hover:bg-[var(--color-container)]/40 transition-colors cursor-pointer text-[var(--color-text)]"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
              Wallet
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
              Manual balance ledger for all your Philippine bank accounts & e-wallets
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="chest-button-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <FileText className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.75} />
            <span>Paste a message</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="chest-button-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Add account</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Card: "All accounts" total & "Last updated: [date]" */}
      <div className="chest-card p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] block">
            All accounts total
          </span>
          <div
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-numbers font-['Plus_Jakarta_Sans'] mt-1 ${
              allAccountsTotalCentavos < 0 ? 'text-[#A84255]' : 'text-[var(--color-text)]'
            }`}
          >
            {formatPHP(allAccountsTotalCentavos)}
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Last updated: <span className="font-semibold text-[var(--color-text)]">{lastUpdatedDateLabel}</span> · {activeAccounts.length} active sources
          </p>
        </div>

        {activeAccounts.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsSpreadView(!isSpreadView)}
              className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSpreadView
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isSpreadView ? 'Spread view' : 'Stack view'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Overdrawn account dismissible banners */}
      {visibleOverdrawnAccounts.map((acc) => {
        const dismissKey = `${acc.id}:${acc.balanceCentavos}`;
        return (
          <div
            key={dismissKey}
            role="status"
            className="p-4 rounded-[18px] bg-rose-50/90 border border-rose-200 text-[#842637] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 text-[#A84255] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" strokeWidth={2} />
              </div>
              <p className="text-sm font-bold">
                {acc.name} is below zero. Update its balance when you can.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setBalanceModalAccount(acc);
                  setExpandedAccountId(acc.id);
                }}
                className="px-3.5 py-2 rounded-[12px] bg-[#A84255] hover:bg-[#933446] text-white text-xs font-semibold transition-colors cursor-pointer min-h-[38px]"
              >
                Update balance
              </button>
              <button
                type="button"
                onClick={() =>
                  setDismissedOverdrawnKeys((prev) => ({
                    ...prev,
                    [dismissKey]: true,
                  }))
                }
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#A84255] hover:bg-rose-100 transition-colors cursor-pointer"
                aria-label={`Dismiss ${acc.name} overdrawn notice`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* 3. Weekly Prompt: on Mondays or when any account is stale */}
      {showWeeklyPrompt && (
        <div className="p-4 rounded-[18px] bg-amber-50/90 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-up duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-[#C26910] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold">New week! Update your balances?</p>
              <p className="text-xs text-amber-900/80 mt-0.5">
                {staleAccounts.length > 0
                  ? `${staleAccounts.map((a) => a.name).join(', ')} hasn't been confirmed in over 7 days.`
                  : 'A quick 1-minute check-in keeps your Chestlist weekly budget accurate.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (staleAccounts[0]) {
                setBalanceModalAccount(staleAccounts[0]);
                setExpandedAccountId(staleAccounts[0].id);
              } else if (activeAccounts[0]) {
                setBalanceModalAccount(activeAccounts[0]);
              }
            }}
            className="px-4 py-2 rounded-[12px] bg-[#C26910] hover:bg-[#a75708] text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto min-h-[40px]"
          >
            Update now
          </button>
        </div>
      )}

      {/* 4. Empty State if no accounts */}
      {activeAccounts.length === 0 ? (
        <div className="chest-card p-12 text-center max-w-md mx-auto space-y-4 my-8">
          <EmptyChestSvg />
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
              No accounts yet. Add your first one.
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs mx-auto leading-relaxed">
              Track your bank savings, GCash, Maya, and physical cash stash in one calming place.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="chest-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Add an account</span>
          </button>
        </div>
      ) : (
        /* 5. Phone Wallet Card Stack (Centered Column, max 420px) */
        <div className="max-w-[420px] mx-auto py-2">
          <div className={isSpreadView ? 'space-y-4' : 'relative pb-10'}>
            {activeAccounts.map((acc, index) => {
              const isExpanded = expandedAccountId === acc.id;
              const isStale = acc.isStale;
              const isRevealed = Boolean(revealedAccountIds[acc.id]);

              // Masked display: •••• 4821 or full account number when revealed
              const maskedNumber = isRevealed
                ? acc.accountNumber || `•••• ${acc.last4 || '0000'}`
                : acc.last4
                ? `•••• ${acc.last4}`
                : '••••';

              // Text color paired with background for 4.5:1 contrast
              const cardBg = acc.color || '#EFECE6';
              const cardText = acc.textColor || '#2B1C20';

              // Find backing savings goals for this account
              const linkedGoals = savingsGoals.filter(
                (g) => g.backingAccount === acc.name
              );

              // Stack overlap calculation
              const stackStyle: React.CSSProperties = isSpreadView
                ? {}
                : {
                    marginTop: index === 0 ? 0 : isExpanded ? 16 : -72,
                    zIndex: isExpanded ? 30 : index + 1,
                  };

              return (
                <div
                  key={acc.id}
                  className={`rounded-[20px] p-5 border border-black/10 shadow-[0_8px_24px_rgba(148,83,102,0.08)] transition-all duration-300 ease-out cursor-pointer relative ${
                    isExpanded ? 'ring-2 ring-slate-800/20 scale-[1.01]' : 'hover:-translate-y-1'
                  }`}
                  style={{
                    backgroundColor: cardBg,
                    color: cardText,
                    ...stackStyle,
                  }}
                  onClick={() => {
                    if (!isExpanded) {
                      setExpandedAccountId(acc.id);
                    }
                  }}
                  role="region"
                  aria-label={`${acc.name} card`}
                >
                  {/* Top Row: Account Name & Nickname + Type Chip */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
                          {acc.name}
                        </span>
                        {acc.nickname && (
                          <span className="text-xs opacity-75 font-medium">
                            · {acc.nickname}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] opacity-70 block mt-0.5">
                        {fromDbAccountType(acc.type)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {acc.balanceCentavos < 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A84255] text-white shadow-xs">
                          Overdrawn
                        </span>
                      )}
                      {isStale && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A84255] text-white flex items-center gap-1 shadow-xs animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Needs update</span>
                        </span>
                      )}

                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-current/20 opacity-90"
                      >
                        {fromDbAccountType(acc.type)}
                      </span>
                    </div>
                  </div>

                  {/* Mid Row: Account Number with Eye Toggle */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tracking-wider opacity-90 font-medium">
                        {maskedNumber}
                      </span>

                      {acc.accountNumber && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRevealNumber(acc.id);
                          }}
                          className="w-6 h-6 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors cursor-pointer"
                          aria-label={isRevealed ? 'Hide account number' : 'Show account number for 10 seconds'}
                          title={isRevealed ? 'Hide number' : 'Show number (auto-hides after 10s)'}
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] opacity-70 tabular-numbers">
                      Updated {formatPrettyDate(acc.lastConfirmedDate)}
                    </span>
                  </div>

                  {/* Balance Display: Large tabular numerals */}
                  <div className="mt-3 flex items-baseline justify-between border-t border-current/10 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                      Balance
                    </span>
                    <span
                      className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-numbers font-['Plus_Jakarta_Sans'] ${
                        acc.balanceCentavos < 0 ? 'text-[#A84255]' : ''
                      }`}
                    >
                      {formatPHP(acc.balanceCentavos)}
                    </span>
                  </div>

                  {/* EXPANDED SECTION (Revealed on card tap with spring ease) */}
                  {isExpanded && (
                    <div
                      className="mt-5 pt-4 border-t border-current/15 space-y-4 animate-in fade-in duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Action buttons: Update Balance */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setBalanceModalAccount(acc)}
                          className="px-4 py-2 rounded-[12px] bg-black/10 hover:bg-black/15 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[40px]"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Update balance</span>
                        </button>

                        <button
                          onClick={() => setExpandedAccountId(null)}
                          className="text-xs opacity-75 hover:opacity-100 underline cursor-pointer px-2 py-1"
                        >
                          Collapse card
                        </button>
                      </div>

                      {/* Recent Transactions List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 block">
                          Recent Activity
                        </span>

                        {acc.transactions && acc.transactions.length > 0 ? (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {acc.transactions.slice(0, 4).map((tx) => {
                              const isInflow = tx.direction === 'inflow';
                              return (
                                <div
                                  key={tx.id}
                                  className="p-2.5 rounded-[12px] bg-black/5 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center shrink-0">
                                      {isInflow ? (
                                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#3D7950]" strokeWidth={2.5} />
                                      ) : (
                                        <ArrowUpRight className="w-3.5 h-3.5 text-[#A84255]" strokeWidth={2.5} />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold leading-tight truncate max-w-[170px]">
                                        {tx.description}
                                      </p>
                                      <p className="text-[10px] opacity-70">
                                        {tx.date} · {formatTransactionTypeLabel(tx.type)}
                                      </p>
                                    </div>
                                  </div>

                                  <span className="font-bold tabular-numbers text-xs">
                                    {isInflow ? '+' : '-'}{formatPHP(tx.amountCentavos)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs opacity-70 italic py-1">
                            No recent transactions recorded for this account.
                          </p>
                        )}
                      </div>

                      {/* Link to a Savings Goal Dropdown */}
                      <div className="pt-2 border-t border-current/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                            <PiggyBank className="w-3.5 h-3.5" />
                            <span>Backed Savings Goals ({linkedGoals.length})</span>
                          </span>
                        </div>

                        {linkedGoals.length > 0 ? (
                          <div className="space-y-1">
                            {linkedGoals.map((g) => (
                              <div
                                key={g.id}
                                className="px-2.5 py-1.5 rounded-[10px] bg-black/5 text-xs flex items-center justify-between font-medium"
                              >
                                <span>
                                  {g.emoji} {g.title}
                                </span>
                                <span className="tabular-numbers opacity-80 text-[11px]">
                                  {formatPHP(g.savedCentavos)} saved
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs opacity-70 italic">
                            No savings goals are currently earmarked to this account.
                          </p>
                        )}

                        {/* Link another goal */}
                        {savingsGoals.length > 0 && (
                          <div className="pt-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedGoalToLink}
                                onChange={(e) => {
                                  setSelectedGoalToLink(e.target.value);
                                  if (linkError) setLinkError(null);
                                }}
                                className="chest-input py-1.5 px-2.5 text-xs flex-1 bg-white text-slate-800"
                                aria-label="Select savings goal to back"
                              >
                                <option value="">Link a goal to this account...</option>
                                {savingsGoals.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.emoji} {g.title} (Currently: {g.backingAccount})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!selectedGoalToLink || isLinkingGoal}
                                onClick={() => {
                                  if (selectedGoalToLink) {
                                    performLinkGoal(selectedGoalToLink, acc.name);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-[10px] bg-slate-900 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer min-h-[36px]"
                              >
                                {isLinkingGoal ? 'Linking...' : 'Link'}
                              </button>
                            </div>
                            {linkError && (
                              <div
                                role="alert"
                                className="p-2.5 rounded-[10px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="font-medium">{linkError.message}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => performLinkGoal(linkError.goalId, linkError.accountName)}
                                  disabled={isLinkingGoal}
                                  className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0"
                                >
                                  Retry
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAccount={onAddAccount}
      />

      <UpdateBalanceModal
        account={balanceModalAccount}
        isOpen={Boolean(balanceModalAccount)}
        onClose={() => setBalanceModalAccount(null)}
        onUpdateBalance={onUpdateBalance}
      />

      <PasteImportModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        accounts={activeAccounts}
        categories={categories}
        onConfirmImport={onImportMessage}
        onUpdateBalance={onUpdateBalance}
      />
    </div>
  );
};
