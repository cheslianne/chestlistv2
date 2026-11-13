import React, { useEffect, useMemo, useState } from 'react';
import { ExpenseCategory } from '../types';
import { AlertCircle, EyeOff, Trash2, X } from 'lucide-react';

export type PendingCategoryRemoval =
  | {
      kind: 'category';
      category: ExpenseCategory;
      expenseCount: number;
      learnedRuleCount: number;
    }
  | {
      kind: 'subcategory';
      parentCategory: ExpenseCategory;
      subId: string;
      subLabel: string;
      isSystemDefault: boolean;
      expenseCount: number;
      learnedRuleCount: number;
    };

export interface CategoryDeleteConfirmPayload {
  moveToTargetId: string | null; // For category: target category id (or null when keepExistingOnExpenses); for subcategory: target sub id or null (parent)
  keepExistingOnExpenses: boolean;
  learnedRuleAction: 'remove' | 'move';
}

interface CategoryDeleteModalProps {
  pending: PendingCategoryRemoval | null;
  activeCategories: ExpenseCategory[];
  isSubmitting?: boolean;
  errorMsg?: string | null;
  onCancel: () => void;
  onConfirm: (payload: CategoryDeleteConfirmPayload) => Promise<void> | void;
}

const KEEP_EXISTING_SENTINEL = '__KEEP__';

export const CategoryDeleteModal: React.FC<CategoryDeleteModalProps> = ({
  pending,
  activeCategories,
  isSubmitting = false,
  errorMsg = null,
  onCancel,
  onConfirm,
}) => {
  const isSystemDefault = pending
    ? pending.kind === 'category'
      ? pending.category.userId === null
      : pending.isSystemDefault
    : false;

  const otherCategories = useMemo(() => {
    if (!pending || pending.kind !== 'category') return [];
    const list = activeCategories.filter((c) => c.id !== pending.category.id);
    // Put Others first if present so it stands out as the default fallback
    return [...list].sort((a, b) => {
      if (a.key === 'others') return -1;
      if (b.key === 'others') return 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [pending, activeCategories]);

  const siblingSubcategories = useMemo(() => {
    if (!pending || pending.kind !== 'subcategory') return [];
    return pending.parentCategory.subcategories.filter(
      (s) => !s.isArchived && s.id !== pending.subId
    );
  }, [pending]);

  const [selectedDest, setSelectedDest] = useState<string>('');
  const [learnedRuleAction, setLearnedRuleAction] = useState<'remove' | 'move'>('move');

  useEffect(() => {
    if (!pending) return;
    if (pending.kind === 'category') {
      if (pending.category.userId === null && pending.expenseCount > 0) {
        setSelectedDest(KEEP_EXISTING_SENTINEL);
        setLearnedRuleAction('remove');
      } else {
        const defaultTarget =
          otherCategories.find((c) => c.key === 'others') || otherCategories[0];
        setSelectedDest(defaultTarget?.id || '');
        setLearnedRuleAction('move');
      }
    } else {
      if (pending.isSystemDefault && pending.expenseCount > 0) {
        setSelectedDest(KEEP_EXISTING_SENTINEL);
        setLearnedRuleAction('remove');
      } else {
        setSelectedDest(''); // '' = parent category (no subcategory)
        setLearnedRuleAction('move');
      }
    }
  }, [pending, otherCategories]);

  useEffect(() => {
    if (!pending) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pending, isSubmitting, onCancel]);

  if (!pending) return null;

  const itemName =
    pending.kind === 'category' ? pending.category.label : pending.subLabel;
  const activeSubCount =
    pending.kind === 'category'
      ? pending.category.subcategories.filter((s) => !s.isArchived).length
      : 0;

  const keepExisting = isSystemDefault && selectedDest === KEEP_EXISTING_SENTINEL;

  let chosenDestLabel = 'Others';
  if (pending.kind === 'category') {
    const destCat = otherCategories.find((c) => c.id === selectedDest);
    chosenDestLabel = destCat ? destCat.label : 'Others';
  } else {
    if (selectedDest === '') {
      chosenDestLabel = `${pending.parentCategory.label} (no subcategory)`;
    } else if (selectedDest !== KEEP_EXISTING_SENTINEL) {
      const destSub = siblingSubcategories.find((s) => s.id === selectedDest);
      chosenDestLabel = destSub
        ? `${pending.parentCategory.label} › ${destSub.label}`
        : pending.parentCategory.label;
    }
  }

  const effectiveRuleAction: 'remove' | 'move' =
    keepExisting || (pending.kind === 'category' && !selectedDest)
      ? 'remove'
      : learnedRuleAction;

  const handleConfirmClick = () => {
    void onConfirm({
      moveToTargetId: keepExisting ? null : selectedDest || null,
      keepExistingOnExpenses: keepExisting,
      learnedRuleAction: effectiveRuleAction,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <div
        className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-delete-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#A84255] shrink-0">
              {isSystemDefault ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </div>
            <h3
              id="category-delete-modal-title"
              className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
            >
              {isSystemDefault ? `Hide '${itemName}'?` : `Delete '${itemName}'?`}
            </h3>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close confirmation modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {pending.expenseCount > 0 ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="move-expenses-select"
                className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
              >
                Where should we move its expenses?
              </label>
              <select
                id="move-expenses-select"
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                className="chest-input w-full px-3 py-2 text-xs"
              >
                {isSystemDefault && (
                  <option value={KEEP_EXISTING_SENTINEL}>
                    Keep "{itemName}" on past expenses (recommended)
                  </option>
                )}
                {pending.kind === 'category' ? (
                  otherCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="">
                      {pending.parentCategory.icon} {pending.parentCategory.label} (no subcategory)
                    </option>
                    {siblingSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {pending.parentCategory.label} › {s.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              {keepExisting ? (
                <>
                  All{' '}
                  <span className="font-semibold text-[var(--color-text)]">
                    {pending.expenseCount}
                  </span>{' '}
                  {pending.expenseCount === 1 ? 'expense' : 'expenses'} will keep{' '}
                  <span className="font-semibold text-[var(--color-text)]">{itemName}</span> and
                  its color in your history. You can restore it anytime under Hidden categories.
                </>
              ) : (
                <>
                  <span className="font-semibold text-[var(--color-text)]">
                    {pending.expenseCount}
                  </span>{' '}
                  {pending.expenseCount === 1 ? 'expense' : 'expenses'} will be moved to{' '}
                  <span className="font-semibold text-[var(--color-text)]">
                    {chosenDestLabel}
                  </span>
                  .
                  {pending.kind === 'category' && !isSystemDefault && activeSubCount > 0
                    ? ` Its ${activeSubCount} ${
                        activeSubCount === 1 ? 'subcategory' : 'subcategories'
                      } will also be deleted.`
                    : ''}
                  {isSystemDefault
                    ? ' You can restore this anytime under Hidden categories.'
                    : ' This cannot be undone.'}
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            {isSystemDefault ? (
              <>
                Default {pending.kind === 'category' ? 'categories' : 'subcategories'} are hidden
                instead of permanently deleted. You can restore{' '}
                <span className="font-semibold text-[var(--color-text)]">{itemName}</span> anytime
                in Manage Categories.
              </>
            ) : (
              <>
                This will permanently remove{' '}
                <span className="font-semibold text-[var(--color-text)]">{itemName}</span>
                {pending.kind === 'category' && activeSubCount > 0
                  ? ` and its ${activeSubCount} ${
                      activeSubCount === 1 ? 'subcategory' : 'subcategories'
                    }`
                  : ''}
                . This cannot be undone.
              </>
            )}
          </p>
        )}

        {pending.learnedRuleCount > 0 && (
          <div className="p-3 rounded-[14px] bg-[var(--color-container)]/30 border border-[var(--color-border)] space-y-2">
            {!keepExisting && (pending.kind === 'subcategory' || Boolean(selectedDest)) ? (
              <>
                <label
                  htmlFor="learned-rules-action-select"
                  className="block text-[11px] font-semibold text-[var(--color-text)]"
                >
                  Saved learned {pending.learnedRuleCount === 1 ? 'rule' : 'rules'} (
                  {pending.learnedRuleCount}):
                </label>
                <select
                  id="learned-rules-action-select"
                  value={learnedRuleAction}
                  onChange={(e) =>
                    setLearnedRuleAction(e.target.value as 'remove' | 'move')
                  }
                  className="chest-input w-full px-2.5 py-1.5 text-xs"
                >
                  <option value="move">Move rules to {chosenDestLabel}</option>
                  <option value="remove">Remove these learned rules</option>
                </select>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {learnedRuleAction === 'move'
                    ? `${pending.learnedRuleCount} saved learned ${
                        pending.learnedRuleCount === 1 ? 'rule' : 'rules'
                      } will be moved to ${chosenDestLabel}.`
                    : `${pending.learnedRuleCount} saved learned ${
                        pending.learnedRuleCount === 1 ? 'rule' : 'rules'
                      } will be removed.`}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-[var(--color-muted)]">
                {pending.learnedRuleCount} saved learned{' '}
                {pending.learnedRuleCount === 1 ? 'rule' : 'rules'} for '{itemName}' will also be
                removed.
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmClick}
            className="px-4 py-2 rounded-[12px] bg-[#A84255] hover:bg-[#933446] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? isSystemDefault
                ? 'Hiding...'
                : 'Deleting...'
              : isSystemDefault
              ? 'Hide'
              : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
