import React, { useState } from 'react';
import {
  DEFAULT_CATEGORIES,
  formatPHP,
  getUserSafeErrorMessage,
  resolveExpenseCategory,
} from '../api';
import { AccountWallet, Expense, ExpenseCategory } from '../types';
import { EditExpenseModal } from './EditExpenseModal';
import { Pencil, Trash2, Calendar, Coffee, AlertCircle } from 'lucide-react';

interface ExpensesListProps {
  expenses: Expense[];
  categories?: ExpenseCategory[];
  useSubcategories?: boolean;
  accounts?: AccountWallet[];
  onUpdateExpense: (id: string, updates: Partial<Expense> & { allowOverdraft?: boolean }) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  onSubcategoryCreated?: () => Promise<void>;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  categories = DEFAULT_CATEGORIES,
  useSubcategories = true,
  accounts = [],
  onUpdateExpense,
  onDeleteExpense,
  onUpdateBalance,
  onSubcategoryCreated,
}) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  const performDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDeleteExpense(id);
      setDeletingExpense(null);
    } catch (err) {
      console.error('[Chestlist][ExpensesList][deleteExpense]', err);
      setDeletingExpense(null);
      setDeleteError({
        id,
        message: getUserSafeErrorMessage(err),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Group expenses by friendly day
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const groups: { label: string; date: string; items: Expense[] }[] = [];

  expenses.forEach((item) => {
    let groupLabel = item.date;
    if (item.date === todayStr) {
      groupLabel = 'Today';
    } else if (item.date === yesterdayStr) {
      groupLabel = 'Yesterday';
    } else {
      try {
        const [y, m, d] = item.date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        groupLabel = dt.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        groupLabel = item.date;
      }
    }

    const existingGroup = groups.find((g) => g.label === groupLabel);
    if (existingGroup) {
      existingGroup.items.push(item);
    } else {
      groups.push({ label: groupLabel, date: item.date, items: [item] });
    }
  });

  if (expenses.length === 0) {
    return (
      <div className="chest-card p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)] mb-3">
          <Coffee className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <h4 className="text-base font-bold text-[var(--color-text)]">
          No expenses yet this week.
        </h4>
        <p className="text-xs text-[var(--color-muted)] max-w-sm mt-1">
          Nothing here yet. Let's get started by recording your first purchase or commute above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {deleteError && (
        <div
          role="alert"
          className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{deleteError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => performDelete(deleteError.id)}
            className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      {groups.map((group) => {
        const dayTotal = group.items.reduce((sum, item) => sum + item.amountCentavos, 0);

        return (
          <div key={group.label} className="chest-card p-5">
            {/* Day Header with subtotal */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.75} />
                <span className="text-sm font-bold text-[var(--color-text)]">
                  {group.label}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  · {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-text)] tabular-numbers">
                Day total: {formatPHP(dayTotal)}
              </span>
            </div>

            {/* Expense rows */}
            <div className="divide-y divide-[var(--color-border)]/60">
              {group.items.map((item) => {
                const matchedCat =
                  categories.find(
                    (c) =>
                      (item.categoryId && c.id === item.categoryId) ||
                      c.label.toLowerCase() === item.category.toLowerCase() ||
                      c.key.toLowerCase() === item.category.toLowerCase()
                  ) || resolveExpenseCategory(item.category, item.categoryId);

                const subLabel =
                  useSubcategories !== false ? item.subcategoryLabel || null : null;

                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 group hover:bg-black/[0.01] transition-colors rounded-[8px] px-1"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Pastel category tag with dark #3A2E33 text */}
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs border border-black/10 shrink-0 inline-flex items-center gap-1"
                        style={{
                          backgroundColor: matchedCat.color,
                          color: '#3A2E33',
                        }}
                      >
                        <span>{matchedCat.icon}</span>
                        <span>{matchedCat.label}</span>
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-muted)] mt-0.5">
                          {subLabel && (
                            <span className="font-medium text-[var(--color-muted)]">
                              {subLabel}
                            </span>
                          )}
                          {subLabel && item.account && <span aria-hidden="true">·</span>}
                          {item.account && <span>{item.account}</span>}
                          {item.note && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[200px] sm:max-w-xs">
                                {item.note}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-[#A84255] tabular-numbers">
                        -{formatPHP(item.amountCentavos)}
                      </span>

                      {/* Edit / Delete quick buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingExpense(item)}
                          className="p-1.5 rounded-[8px] bg-[var(--color-container)]/35 hover:bg-[var(--color-container)]/70 text-[var(--color-text)] transition-colors cursor-pointer"
                          aria-label={`Edit ${item.title}`}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.9} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(item)}
                          className="p-1.5 rounded-[8px] bg-rose-50/70 hover:bg-rose-100 text-[#A84255] transition-colors cursor-pointer"
                          aria-label={`Delete ${item.title}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.9} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          categories={categories}
          useSubcategories={useSubcategories}
          accounts={accounts}
          isOpen={true}
          onClose={() => setEditingExpense(null)}
          onSave={onUpdateExpense}
          onDelete={onDeleteExpense}
          onUpdateBalance={onUpdateBalance}
          onSubcategoryCreated={onSubcategoryCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-expense-confirm-title"
          >
            <h3
              id="delete-expense-confirm-title"
              className="text-base font-bold text-[var(--color-text)]"
            >
              Delete this expense?
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-1.5">
              "{deletingExpense.title}" ({formatPHP(deletingExpense.amountCentavos)}) will be removed from your budget and your account balance will be updated.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={isDeleting}
                className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDelete(deletingExpense.id)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-[12px] bg-[#A84255] hover:bg-[#933446] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
