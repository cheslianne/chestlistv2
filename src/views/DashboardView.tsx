import React, { useState } from 'react';
import {
  AccountWallet,
  ChecklistItem,
  DebtItem,
  Expense,
  ExpenseCategory,
  FinancialHealthOverview,
  LifeNote,
  SavingsGoal,
} from '../types';
import { CountUpNumber } from '../components/CountUpNumber';
import { DonutChart } from '../components/DonutChart';
import {
  AlertTriangle,
  X,
  PlusCircle,
  PiggyBank,
  CreditCard,
  StickyNote,
  Wallet,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  formatPHP,
  formatPrettyDate,
  computeChecklistProgress,
  resolveExpenseCategory,
} from '../api';
import { ChecklistMascot } from '../components/ChecklistMascot';

interface DashboardViewProps {
  userName?: string;
  financialHealth: FinancialHealthOverview;
  expenses: Expense[];
  categories?: ExpenseCategory[];
  savingsGoals: SavingsGoal[];
  debts: DebtItem[];
  accounts: AccountWallet[];
  checklist: ChecklistItem[];
  notes: LifeNote[];
  onOpenWallet: () => void;
  onQuickAction: (action: 'addExpense' | 'addSavings' | 'logPayment' | 'newNote') => void;
  onToggleChecklist: (id: string) => Promise<void>;
  onNavigateTab: (tab: 'budget' | 'savings' | 'debt' | 'notes') => void;
  onNavigateToChecklist?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userName,
  financialHealth,
  expenses,
  categories = DEFAULT_CATEGORIES,
  savingsGoals,
  debts,
  accounts,
  checklist,
  notes,
  onOpenWallet,
  onQuickAction,
  onToggleChecklist,
  onNavigateTab,
  onNavigateToChecklist,
}) => {
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);

  // Stagger index for cards
  const staggerStyle = (index: number) => ({
    animationDelay: `${index * 60}ms`,
  });

  // Checklist computed progress & mascot state
  const checklistProgress = computeChecklistProgress(checklist);

  // Nearest savings goal
  const nearestGoal = savingsGoals[0] || null;
  const goalPercent = nearestGoal
    ? (nearestGoal.percentage ??
      (nearestGoal.targetCentavos > 0
        ? Math.min(100, Math.round((nearestGoal.savedCentavos / nearestGoal.targetCentavos) * 100))
        : 0))
    : 0;

  // Donut data summary for mini widget using dynamic categories
  const totalSpentCentavos = financialHealth.budgetSpentCentavos;
  const categoryBuckets = new Map<
    string,
    { label: string; icon: string; color: string; amountCentavos: number }
  >();
  expenses.forEach((e) => {
    const matched =
      categories.find(
        (c) =>
          (e.categoryId && c.id === e.categoryId) ||
          c.label.toLowerCase() === e.category.toLowerCase() ||
          c.key.toLowerCase() === e.category.toLowerCase()
      ) || resolveExpenseCategory(e.category, e.categoryId);

    const existing = categoryBuckets.get(matched.id);
    if (existing) {
      existing.amountCentavos += e.amountCentavos;
    } else {
      categoryBuckets.set(matched.id, {
        label: matched.label,
        icon: matched.icon || '📦',
        color: matched.color || '#D3D3D8',
        amountCentavos: e.amountCentavos,
      });
    }
  });

  const donutSlices = Array.from(categoryBuckets.values()).map((bucket) => ({
    category: bucket.label,
    icon: bucket.icon,
    amountCentavos: bucket.amountCentavos,
    percentage:
      totalSpentCentavos > 0 ? Math.round((bucket.amountCentavos / totalSpentCentavos) * 100) : 0,
    color: bucket.color,
  }));

  const topSpendingSlice = [...donutSlices].sort((a, b) => b.amountCentavos - a.amountCentavos)[0] || null;

  const budgetProgressPercent =
    financialHealth.weeklyBudgetCentavos > 0
      ? Math.min(
          100,
          Math.round((financialHealth.budgetSpentCentavos / financialHealth.weeklyBudgetCentavos) * 100)
        )
      : 0;

  const primaryReminder = (financialHealth.activeReminders && financialHealth.activeReminders.length > 0)
    ? financialHealth.activeReminders[0]
    : (financialHealth.dueSoonDebt
      ? {
          debt: financialHealth.dueSoonDebt,
          type: (financialHealth.dueSoonDebt.daysLeft === 0 ? 'due_today' : 'due_soon') as 'due_today' | 'due_soon',
          message: financialHealth.dueSoonDebt.daysLeft === 0
            ? `Due today: ${financialHealth.dueSoonDebt.title}.`
            : `Reminder: ${financialHealth.dueSoonDebt.title} (${formatPHP(financialHealth.dueSoonDebt.remainingCentavos)}) is due in ${financialHealth.dueSoonDebt.daysLeft} days.`,
        }
      : null);

  const firstName = userName?.trim() ? userName.trim().split(' ')[0] : 'there';

  return (
    <div className="space-y-6 pb-20 md:pb-12 animate-in fade-in duration-300">
      {/* 1. Header greeting & week range */}
      <div
        className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 animate-in fade-up duration-300"
        style={staggerStyle(0)}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
            Good day, {firstName}.
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
            Week of <span className="font-semibold text-[var(--color-text)]">{financialHealth.weekRangeLabel}</span>
          </p>
        </div>
      </div>

      {/* 2. Dismissible warning / due banner */}
      {!isWarningDismissed && primaryReminder && (
        <div
          className={`p-4 rounded-[18px] flex items-center justify-between gap-3 shadow-xs animate-in fade-up duration-300 ${
            primaryReminder.type === 'due_today'
              ? 'bg-rose-50/90 border border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border border-amber-200/90 text-amber-950'
          }`}
          style={staggerStyle(1)}
          role="region"
          aria-label="Debt reminder banner"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                primaryReminder.type === 'due_today'
                  ? 'bg-rose-100 text-[#A84255]'
                  : 'bg-amber-100 text-[#C26910]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold">
                {primaryReminder.message}
              </p>
              <p className="text-[11px] opacity-80 hidden sm:block">
                {primaryReminder.type === 'due_today'
                  ? 'Due today. Settle early to maintain an active zero-fee student balance rating.'
                  : 'Pay early to maintain an active zero-fee student balance rating.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onQuickAction('logPayment')}
              className={`px-3 py-1.5 rounded-[10px] text-white text-xs font-semibold transition-colors cursor-pointer ${
                primaryReminder.type === 'due_today'
                  ? 'bg-[#A84255] hover:bg-[#8e3244]'
                  : 'bg-[#C26910] hover:bg-[#a75708]'
              }`}
            >
              Log payment
            </button>
            <button
              onClick={() => setIsWarningDismissed(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Dismiss reminder banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Large Financial Health Card */}
      <div
        className="chest-card p-6 sm:p-7 animate-in fade-up duration-300 relative overflow-hidden"
        style={staggerStyle(2)}
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] shadow-xs" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
              Financial Health Overview
            </h2>
          </div>
          <span className="text-xs text-[var(--color-muted)] font-medium">
            Active Week Plan
          </span>
        </div>

        {/* 3 Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat 1: Budget left ₱2,350 with a progress bar, "of ₱5,000" */}
          <div className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block">
                Budget left
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] mt-1 tracking-tight">
                <CountUpNumber centavos={financialHealth.budgetLeftCentavos} />
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                of <span className="font-semibold text-[var(--color-text)]">{formatPHP(financialHealth.weeklyBudgetCentavos)}</span> weekly allowance
              </p>
            </div>

            <div className="mt-4">
              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700"
                  style={{ width: `${budgetProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] mt-1.5">
                <span>{formatPHP(financialHealth.budgetSpentCentavos)} spent</span>
                <span>{budgetProgressPercent}% used</span>
              </div>
            </div>
          </div>

          {/* Stat 2: Total saved */}
          <div className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block">
                Total saved
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#3D7950] mt-1 tracking-tight">
                <CountUpNumber centavos={financialHealth.totalSavedCentavos} />
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                across <span className="font-semibold text-[var(--color-text)]">{financialHealth.savingsGoalsCount} goals</span>
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">Nearest goal:</span>
              <span className="font-semibold text-[var(--color-text)]">
                {nearestGoal ? `${nearestGoal.emoji || '✨'} ${goalPercent}% ready` : 'No goals yet'}
              </span>
            </div>
          </div>

          {/* Stat 3: Total debt remaining ₱3,200, "2 active debts" */}
          <div className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block">
                Total debt remaining
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#A84255] mt-1 tracking-tight">
                <CountUpNumber centavos={financialHealth.totalDebtCentavos} />
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                <span className="font-semibold text-[var(--color-text)]">{financialHealth.activeDebtsCount} active debts</span> (PayLater & credit)
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">Upcoming due:</span>
              <span className="font-semibold text-amber-700">
                {financialHealth.dueSoonDebt
                  ? `In ${financialHealth.dueSoonDebt.daysLeft} days (${formatPHP(financialHealth.dueSoonDebt.remainingCentavos)})`
                  : 'All settled'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with "All accounts: ₱15,820" and an "Open wallet" button */}
        <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[var(--color-muted)] block">Liquid balances</span>
              <span className="text-base font-bold text-[var(--color-text)]">
                All accounts: <CountUpNumber centavos={financialHealth.allAccountsTotalCentavos} />
              </span>
            </div>
          </div>

          <button
            onClick={onOpenWallet}
            className="chest-button-secondary px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Wallet className="w-4 h-4 text-[var(--color-primary)]" strokeWidth={1.75} />
            <span>Open wallet</span>
          </button>
        </div>
      </div>

      {/* 4. Quick Actions (2x2 Grid) */}
      <div className="space-y-2.5 animate-in fade-up duration-300" style={staggerStyle(3)}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Add expense */}
          <button
            onClick={() => onQuickAction('addExpense')}
            className="chest-card p-4 text-left hover:border-[var(--color-primary)] hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[var(--color-container)] text-[var(--color-primary)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">Add expense</p>
              <p className="text-[11px] text-[var(--color-muted)]">Log snack, fare, or load</p>
            </div>
          </button>

          {/* Add savings */}
          <button
            onClick={() => onQuickAction('addSavings')}
            className="chest-card p-4 text-left hover:border-[#3D7950] hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="w-9 h-9 rounded-[12px] bg-emerald-50 text-[#3D7950] flex items-center justify-center group-hover:scale-105 transition-transform">
              <PiggyBank className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">Add savings</p>
              <p className="text-[11px] text-[var(--color-muted)]">Deposit to fund goal</p>
            </div>
          </button>

          {/* Log payment */}
          <button
            onClick={() => onQuickAction('logPayment')}
            className="chest-card p-4 text-left hover:border-[#4772B2] hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="w-9 h-9 rounded-[12px] bg-sky-50 text-[#4772B2] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">Log payment</p>
              <p className="text-[11px] text-[var(--color-muted)]">Settle PayLater bill</p>
            </div>
          </button>

          {/* New note */}
          <button
            onClick={() => onQuickAction('newNote')}
            className="chest-card p-4 text-left hover:border-[#8B5CF6] hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="w-9 h-9 rounded-[12px] bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <StickyNote className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">New note</p>
              <p className="text-[11px] text-[var(--color-muted)]">Reflection or tip</p>
            </div>
          </button>
        </div>
      </div>

      {/* 5. Mini Widgets Grid: Spending donut, Nearest savings goal, Today's checklist progress */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-up duration-300"
        style={staggerStyle(4)}
      >
        {/* Widget 1: Spending Donut mini preview */}
        <div className="chest-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Spending Breakdown
            </span>
            <button
              onClick={() => onNavigateTab('budget')}
              className="text-xs text-[var(--color-primary)] font-semibold hover:underline flex items-center cursor-pointer"
            >
              Budget view <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2 flex items-center justify-center scale-90 -my-4">
            <DonutChart slices={donutSlices} totalCentavos={totalSpentCentavos} />
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]/60 text-xs text-center text-[var(--color-muted)]">
            {topSpendingSlice ? (
              <>
                Top spending:{' '}
                <span className="font-semibold text-[var(--color-text)]">
                  {topSpendingSlice.category} ({formatPHP(topSpendingSlice.amountCentavos)})
                </span>
              </>
            ) : (
              <span>No expenses logged this week</span>
            )}
          </div>
        </div>

        {/* Widget 2: Nearest Savings Goal */}
        <div className="chest-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Nearest Savings Goal
            </span>
            <button
              onClick={() => onNavigateTab('savings')}
              className="text-xs text-[var(--color-primary)] font-semibold hover:underline flex items-center cursor-pointer"
            >
              All goals <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {nearestGoal ? (
            <>
              <div className="py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 rounded-[14px] bg-[var(--color-container)]/40">
                    {nearestGoal.emoji || '✨'}
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-[var(--color-text)]">{nearestGoal.title}</h4>
                    <p className="text-xs text-[var(--color-muted)]">
                      Deadline: {nearestGoal.deadline ? formatPrettyDate(nearestGoal.deadline) : 'Not set'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#3D7950] tabular-numbers">
                      {formatPHP(nearestGoal.savedCentavos)}
                    </span>
                    <span className="text-[var(--color-muted)] tabular-numbers">
                      of {formatPHP(nearestGoal.targetCentavos)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#3D7950] transition-all duration-500"
                      style={{ width: `${goalPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1.5 text-right font-medium">
                    {goalPercent}% saved
                  </p>
                </div>
              </div>

              <button
                onClick={() => onQuickAction('addSavings')}
                className="w-full py-2 px-3 rounded-[12px] bg-[var(--color-container)] text-[var(--color-text)] hover:brightness-95 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Deposit to this goal
              </button>
            </>
          ) : (
            <div className="py-6 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-container)]/50 text-[var(--color-primary)] flex items-center justify-center mx-auto">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">No savings goals yet</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Start an Alkansya or target fund to track your pace.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('savings')}
                className="w-full py-2 px-3 rounded-[12px] bg-[var(--color-container)] text-[var(--color-text)] hover:brightness-95 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Create a savings goal
              </button>
            </div>
          )}
        </div>

        {/* Widget 3: Today's Checklist Progress & Mascot Link */}
        <div
          className="chest-card p-5 flex flex-col justify-between hover:border-[var(--color-primary)]/40 transition-all cursor-pointer group"
          onClick={() => {
            if (onNavigateToChecklist) onNavigateToChecklist();
            else onNavigateTab('notes');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onNavigateToChecklist) onNavigateToChecklist();
              else onNavigateTab('notes');
            }
          }}
          aria-label="Open Checklist in Notes"
        >
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Today's Checklist
                </span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-primary)] tabular-numbers">
                {checklistProgress.label}
              </span>
            </div>

            {/* Mini Mascot Preview with state mapping & caption */}
            <div className="py-3 px-2 bg-slate-50/60 rounded-[14px] mt-2.5 flex items-center gap-3 border border-[var(--color-border)]/50">
              <div className="shrink-0 pointer-events-none">
                <ChecklistMascot
                  progress={checklistProgress}
                  size="sm"
                  showProgressBar={false}
                />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                    Chest Mascot
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--color-muted)]">
                    State {checklistProgress.mascotState}/5
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[var(--color-muted)] line-clamp-2 leading-tight">
                  "{checklistProgress.mascotCaption}"
                </p>
                {/* Mini progress bar */}
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                    style={{ width: `${checklistProgress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Preview of top items */}
            <div className="py-2.5 space-y-1.5">
              {checklist.slice(0, 3).map((item) => {
                const isDone = item.status === 'Done' || !!item.completed;
                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleChecklist(item.id);
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-[8px] hover:bg-slate-100/70 transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        isDone
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                          : 'border-[var(--color-muted)]'
                      }`}
                    >
                      {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs truncate flex-1 ${
                        isDone
                          ? 'line-through text-[var(--color-muted)]'
                          : 'text-[var(--color-text)] font-medium'
                      }`}
                    >
                      {item.title || item.text}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-semibold"
                      style={{
                        backgroundColor:
                          item.category === 'School Activity' ? '#C9B8EA' : '#EFECE6',
                        color: '#3A2E33',
                      }}
                    >
                      {item.category === 'School Activity' ? 'School' : 'General'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] text-[var(--color-primary)] font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Open checklist in Notes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
