import React, { useMemo, useState } from 'react';
import {
  AccountWallet,
  CategoryConfig,
  CategoryName,
  Expense,
  ExpenseCategory,
  FinancialHealthOverview,
} from '../types';
import { AddExpenseForm } from '../components/AddExpenseForm';
import { CategoryLimitsGrid } from '../components/CategoryLimitsGrid';
import { ExpensesList } from '../components/ExpensesList';
import { DonutChart, DonutSlice } from '../components/DonutChart';
import { WeeklyBarChart } from '../components/WeeklyBarChart';
import { WeeklyRecapModal } from '../components/WeeklyRecapModal';
import {
  CATEGORY_PASTEL_SWATCHES,
  DEFAULT_CATEGORIES,
  formatPHP,
  resolveExpenseCategory,
} from '../api';
import { Calendar, History, Sparkles } from 'lucide-react';

interface CategoryWithUsage extends CategoryConfig {
  spentCentavos: number;
  percent: number;
}

interface BudgetViewProps {
  financialHealth: FinancialHealthOverview;
  expenses: Expense[];
  categories?: ExpenseCategory[];
  useSubcategories?: boolean;
  categoryLimits: CategoryWithUsage[];
  accounts?: AccountWallet[];
  onAddExpense: (expense: {
    title: string;
    amountCentavos: number;
    category: CategoryName;
    categoryId?: string;
    subcategoryId?: string | null;
    subcategoryLabel?: string | null;
    categoryConfidence?: number | null;
    subcategoryConfidence?: number | null;
    categoryUserConfirmed?: boolean;
    date: string;
    account?: string;
    allowOverdraft?: boolean;
  }) => Promise<void>;
  onUpdateExpense: (id: string, updates: Partial<Expense> & { allowOverdraft?: boolean }) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  onSetCategoryLimit?: (categoryIdOrKey: string, limitCentavos: number) => Promise<void>;
  onRemoveCategoryLimit?: (categoryIdOrKey: string) => Promise<void>;
  onSubcategoryCreated?: () => Promise<void>;
  onOpenManageCategories?: () => void;
  showToast?: (message: string) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  financialHealth,
  expenses,
  categories = DEFAULT_CATEGORIES,
  useSubcategories = true,
  categoryLimits,
  accounts = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateBalance,
  onSetCategoryLimit,
  onRemoveCategoryLimit,
  onSubcategoryCreated,
  onOpenManageCategories,
  showToast,
}) => {
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'category' | 'subcategory'>('category');
  const [selectedBreakdownCatId, setSelectedBreakdownCatId] = useState<string>('');

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived),
    [categories]
  );

  const totalSpentCentavos = financialHealth.budgetSpentCentavos;

  // Group expenses by primary category using dynamic categories + fallback resolution
  const primaryCategoryTotals = useMemo(() => {
    const map = new Map<
      string,
      { cat: { id: string; label: string; icon: string; color: string }; amountCentavos: number }
    >();

    for (const e of expenses) {
      const matched =
        categories.find(
          (c) =>
            (e.categoryId && c.id === e.categoryId) ||
            c.label.toLowerCase() === e.category.toLowerCase() ||
            c.key.toLowerCase() === e.category.toLowerCase()
        ) || resolveExpenseCategory(e.category, e.categoryId);

      const key = matched.id;
      const existing = map.get(key);
      if (existing) {
        existing.amountCentavos += e.amountCentavos;
      } else {
        map.set(key, {
          cat: {
            id: matched.id,
            label: matched.label,
            icon: matched.icon || '📦',
            color: matched.color || '#D3D3D8',
          },
          amountCentavos: e.amountCentavos,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.amountCentavos - a.amountCentavos);
  }, [expenses, categories]);

  const effectiveBreakdownCatId = useMemo(() => {
    if (
      selectedBreakdownCatId &&
      activeCategories.some((c) => c.id === selectedBreakdownCatId)
    ) {
      return selectedBreakdownCatId;
    }
    if (primaryCategoryTotals.length > 0) {
      return primaryCategoryTotals[0].cat.id;
    }
    return activeCategories[0]?.id || '';
  }, [selectedBreakdownCatId, activeCategories, primaryCategoryTotals]);

  const effectiveChartMode = useSubcategories ? chartViewMode : 'category';

  const { donutSlices, chartTotalCentavos } = useMemo<{
    donutSlices: DonutSlice[];
    chartTotalCentavos: number;
  }>(() => {
    if (effectiveChartMode === 'category') {
      const slices: DonutSlice[] = primaryCategoryTotals.map(({ cat, amountCentavos }) => ({
        category: cat.label,
        categoryId: cat.id,
        icon: cat.icon,
        amountCentavos,
        percentage:
          totalSpentCentavos > 0 ? Math.round((amountCentavos / totalSpentCentavos) * 100) : 0,
        color: cat.color,
      }));
      return { donutSlices: slices, chartTotalCentavos: totalSpentCentavos };
    }

    // Subcategory breakdown for selected primary category
    const chosenCat =
      categories.find((c) => c.id === effectiveBreakdownCatId) ||
      activeCategories[0] ||
      DEFAULT_CATEGORIES[0];

    const matchingExpenses = expenses.filter((e) => {
      const matched =
        categories.find(
          (c) =>
            (e.categoryId && c.id === e.categoryId) ||
            c.label.toLowerCase() === e.category.toLowerCase() ||
            c.key.toLowerCase() === e.category.toLowerCase()
        ) || resolveExpenseCategory(e.category, e.categoryId);
      return matched.id === chosenCat.id;
    });

    const catTotal = matchingExpenses.reduce((sum, e) => sum + e.amountCentavos, 0);
    const subTotals = new Map<string, number>();
    for (const e of matchingExpenses) {
      const subName = e.subcategoryLabel?.trim() || 'No subcategory';
      subTotals.set(subName, (subTotals.get(subName) || 0) + e.amountCentavos);
    }

    const slices: DonutSlice[] = Array.from(subTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([subName, amountCentavos], idx) => ({
        category: subName,
        amountCentavos,
        percentage: catTotal > 0 ? Math.round((amountCentavos / catTotal) * 100) : 0,
        color:
          idx === 0
            ? chosenCat.color
            : CATEGORY_PASTEL_SWATCHES[(idx + 2) % CATEGORY_PASTEL_SWATCHES.length],
      }));

    return { donutSlices: slices, chartTotalCentavos: catTotal };
  }, [
    effectiveChartMode,
    primaryCategoryTotals,
    totalSpentCentavos,
    categories,
    activeCategories,
    effectiveBreakdownCatId,
    expenses,
  ]);

  const breakdownCategories = useMemo(() => {
    const withSpending = primaryCategoryTotals.map((p) => ({
      id: p.cat.id,
      label: p.cat.label,
      icon: p.cat.icon,
    }));
    const withSpendingIds = new Set(withSpending.map((c) => c.id));
    const remaining = activeCategories
      .filter((c) => !withSpendingIds.has(c.id))
      .map((c) => ({ id: c.id, label: c.label, icon: c.icon }));
    return [...withSpending, ...remaining];
  }, [primaryCategoryTotals, activeCategories]);

  const spentPercent =
    financialHealth.weeklyBudgetCentavos > 0
      ? Math.min(
          100,
          Math.round((financialHealth.budgetSpentCentavos / financialHealth.weeklyBudgetCentavos) * 100)
        )
      : 0;

  return (
    <div className="space-y-7 pb-20 md:pb-12 animate-in fade-in duration-300">
      {/* 1. Header with Week Range and "Past weeks" button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
              Weekly Budget
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-container)] text-[var(--color-primary)]">
              {formatPHP(financialHealth.weeklyBudgetCentavos)} allowance
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] mt-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-muted)]" />
            <span>{financialHealth.weekRangeLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRecapOpen(true)}
            className="chest-button-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <History className="w-4 h-4 text-[var(--color-primary)]" strokeWidth={1.75} />
            <span>Past weeks</span>
          </button>
        </div>
      </div>

      {/* 2. Weekly Budget Card */}
      <div className="chest-card p-6 sm:p-7 bg-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Remaining Allowance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tabular-numbers tracking-tight">
                {formatPHP(financialHealth.budgetLeftCentavos)}
              </span>
              <span className="text-sm text-[var(--color-muted)]">
                left of {formatPHP(financialHealth.weeklyBudgetCentavos)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Total spent so far:{' '}
              <span className="font-semibold text-[#A84255] tabular-numbers">
                {formatPHP(financialHealth.budgetSpentCentavos)}
              </span>{' '}
              ({spentPercent}%)
            </p>
          </div>

          <div className="md:w-80 w-full space-y-2">
            <div className="flex justify-between text-xs text-[var(--color-muted)]">
              <span>Budget consumption</span>
              <span className="font-semibold text-[var(--color-text)]">{spentPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700"
                style={{ width: `${spentPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--color-muted)] text-right">
              Fresh reset every Monday. Leftover does not carry over.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left (Form + Recent expenses) & Right (Donut chart + 7-bar chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Side (7 Cols on desktop): Add expense form + Recent expenses */}
        <div className="lg:col-span-7 space-y-7">
          <AddExpenseForm
            categories={categories}
            useSubcategories={useSubcategories}
            accounts={accounts}
            onExpenseAdded={onAddExpense}
            onUpdateBalance={onUpdateBalance}
            onSubcategoryCreated={onSubcategoryCreated}
            onCategoriesChanged={onSubcategoryCreated}
            onOpenManageCategories={onOpenManageCategories}
            showToast={showToast}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">Recent Expenses</h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Grouped by day with quick edit and delete
                </p>
              </div>
              <span className="text-xs text-[var(--color-muted)] font-medium">
                {expenses.length} records this week
              </span>
            </div>

            <ExpensesList
              expenses={expenses}
              categories={categories}
              useSubcategories={useSubcategories}
              accounts={accounts}
              onUpdateExpense={onUpdateExpense}
              onDeleteExpense={onDeleteExpense}
              onUpdateBalance={onUpdateBalance}
              onSubcategoryCreated={onSubcategoryCreated}
            />
          </div>
        </div>

        {/* Right Side (5 Cols on desktop): Donut chart + 7-bar Mon-Sun chart */}
        <div className="lg:col-span-5 space-y-6">
          <div className="chest-card p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)]" strokeWidth={1.75} />
                <h3 className="text-sm font-bold text-[var(--color-text)]">
                  {effectiveChartMode === 'subcategory'
                    ? 'Spending by Subcategory'
                    : 'Spending by Category'}
                </h3>
              </div>
              <span className="text-xs text-[var(--color-muted)]">Clockwise breakdown</span>
            </div>

            <DonutChart
              slices={donutSlices}
              totalCentavos={chartTotalCentavos}
              viewMode={useSubcategories ? effectiveChartMode : undefined}
              onViewModeChange={useSubcategories ? setChartViewMode : undefined}
              breakdownCategories={breakdownCategories}
              selectedBreakdownCategoryId={effectiveBreakdownCatId}
              onSelectBreakdownCategory={setSelectedBreakdownCatId}
              emptyText={
                effectiveChartMode === 'subcategory'
                  ? 'No expenses in this category yet this week.'
                  : 'No expenses logged this week.'
              }
            />
          </div>

          <div className="chest-card p-6">
            <WeeklyBarChart expenses={expenses} />
          </div>
        </div>
      </div>

      {/* 4. Category Limits Grid */}
      <div className="pt-2">
        <CategoryLimitsGrid
          categories={categoryLimits}
          onSetLimit={onSetCategoryLimit}
          onRemoveLimit={onRemoveCategoryLimit}
        />
      </div>

      {/* Weekly Recap Modal */}
      <WeeklyRecapModal
        isOpen={isRecapOpen}
        onClose={() => setIsRecapOpen(false)}
        totalSpentCentavos={financialHealth.budgetSpentCentavos}
        allAccountsTotalCentavos={financialHealth.allAccountsTotalCentavos}
        weeklyBudgetCentavos={financialHealth.weeklyBudgetCentavos}
        weekRangeLabel={financialHealth.weekRangeLabel}
      />
    </div>
  );
};
