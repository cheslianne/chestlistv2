import React, { useEffect, useState } from 'react';
import {
  CATEGORY_PASTEL_SWATCHES,
  CATEGORY_PRIVACY_TEXT,
  createCategory,
  createSubcategory,
  deleteLearnedRule,
  getCategories,
  getCategoryExpenseCount,
  getLearnedRules,
  getSubcategoryExpenseCount,
  getUseSubcategoriesSetting,
  removeOrHideCategory,
  removeSubcategory,
  reorderCategories,
  reorderSubcategories,
  restoreCategory,
  restoreSubcategory,
  setUseSubcategoriesSetting,
  updateCategory,
  updateSubcategory,
  getUserSafeErrorMessage,
} from '../api';
import {
  CategoryDeleteConfirmPayload,
  CategoryDeleteModal,
  PendingCategoryRemoval,
} from './CategoryDeleteModal';
import { ExpenseCategory, LearnedCategoryRule } from '../types';
import {
  X,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  EyeOff,
  RotateCcw,
  Check,
  AlertCircle,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => Promise<void>;
  showToast?: (message: string) => void;
}

const EMOJI_PRESETS = [
  '🍽️', '☕', '🎉', '🐾', '🚌', '🎬', '🏠', '👕', '✨', '💊',
  '📚', '💡', '🎁', '📦', '🛍️', '🎮', '🏋️', '✈️', '🎵', '🧾',
];

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
  showToast,
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [useSubcategories, setUseSubcategories] = useState(true);
  const [learnedRules, setLearnedRules] = useState<LearnedCategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add primary category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_PASTEL_SWATCHES[0]);
  const [isSavingNewCat, setIsSavingNewCat] = useState(false);

  // Edit category modal/panel state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatEmoji, setEditCatEmoji] = useState('');
  const [editCatColor, setEditCatColor] = useState('');
  const [newSubLabel, setNewSubLabel] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubLabel, setEditingSubLabel] = useState('');

  // Delete / hide confirmation modal state
  const [pendingRemoval, setPendingRemoval] = useState<PendingCategoryRemoval | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeErrorMsg, setRemoveErrorMsg] = useState<string | null>(null);

  // Dragging state
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [draggedSubId, setDraggedSubId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [allCats, subEnabled, rules] = await Promise.all([
        getCategories(true),
        getUseSubcategoriesSetting(),
        getLearnedRules(),
      ]);
      setCategories(allCats);
      setUseSubcategories(subEnabled);
      setLearnedRules(rules);
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadData();
      setIsAddingCategory(false);
      setEditingCatId(null);
      setPendingRemoval(null);
      setRemoveErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCategories = categories.filter((c) => !c.isArchived);
  const archivedDefaults = categories.filter((c) => c.isArchived && c.userId === null);
  const archivedDefaultSubcategories = categories.flatMap((cat) =>
    cat.subcategories
      .filter((s) => s.isArchived && s.userId === null)
      .map((sub) => ({ category: cat, sub }))
  );
  const editingCategory = activeCategories.find((c) => c.id === editingCatId) || null;

  const handleToggleSubcategories = async () => {
    const next = !useSubcategories;
    setUseSubcategories(next);
    try {
      await setUseSubcategoriesSetting(next);
      await onCategoriesChanged();
      showToast?.(next ? 'Subcategories enabled.' : 'Using primary categories only.');
    } catch (err) {
      setUseSubcategories(!next);
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg('Enter a category name.');
      return;
    }
    setIsSavingNewCat(true);
    setErrorMsg(null);
    try {
      await createCategory({
        label: newCatName.trim(),
        icon: newCatEmoji.trim() || '🏷️',
        color: newCatColor,
      });
      setNewCatName('');
      setNewCatEmoji('🏷️');
      setIsAddingCategory(false);
      await loadData();
      await onCategoriesChanged();
      showToast?.('Category added.');
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    } finally {
      setIsSavingNewCat(false);
    }
  };

  const startEditingCategory = (cat: ExpenseCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.label);
    setEditCatEmoji(cat.icon);
    setEditCatColor(cat.color);
    setNewSubLabel('');
    setEditingSubId(null);
    setErrorMsg(null);
  };

  const handleSaveCategoryDetails = async () => {
    if (!editingCategory) return;
    if (!editCatName.trim()) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }
    try {
      setErrorMsg(null);
      await updateCategory(editingCategory.id, {
        label: editCatName.trim(),
        icon: editCatEmoji.trim() || '🏷️',
        color: editCatColor,
      });
      await loadData();
      await onCategoriesChanged();
      showToast?.('Category updated.');
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  const handleAddSubcategoryInEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !newSubLabel.trim()) return;
    try {
      setErrorMsg(null);
      await createSubcategory(editingCategory.id, newSubLabel.trim());
      setNewSubLabel('');
      await loadData();
      await onCategoriesChanged();
      showToast?.('Subcategory added.');
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  const handleSaveSubEdit = async (subId: string) => {
    if (!editingSubLabel.trim()) return;
    try {
      setErrorMsg(null);
      await updateSubcategory(subId, { label: editingSubLabel.trim() });
      setEditingSubId(null);
      setEditingSubLabel('');
      await loadData();
      await onCategoriesChanged();
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  const handleInitiateRemoveCategory = async (cat: ExpenseCategory) => {
    if (cat.key === 'others') return;
    setErrorMsg(null);
    setRemoveErrorMsg(null);
    try {
      const count = await getCategoryExpenseCount(cat.id);
      const learnedRuleCount = learnedRules.filter((r) => r.categoryId === cat.id).length;
      setPendingRemoval({
        kind: 'category',
        category: cat,
        expenseCount: count,
        learnedRuleCount,
      });
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  const handleInitiateRemoveSubcategory = async (
    category: ExpenseCategory,
    subId: string,
    subLabel: string,
    isSystemDefault: boolean
  ) => {
    setErrorMsg(null);
    setRemoveErrorMsg(null);
    try {
      const count = await getSubcategoryExpenseCount(subId);
      const learnedRuleCount = learnedRules.filter((r) => r.subcategoryId === subId).length;
      setPendingRemoval({
        kind: 'subcategory',
        parentCategory: category,
        subId,
        subLabel,
        isSystemDefault,
        expenseCount: count,
        learnedRuleCount,
      });
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  const handleConfirmRemoval = async (payload: CategoryDeleteConfirmPayload) => {
    if (!pendingRemoval) return;
    setIsRemoving(true);
    setRemoveErrorMsg(null);
    try {
      const movedExpenses = pendingRemoval.expenseCount > 0 && !payload.keepExistingOnExpenses;

      if (pendingRemoval.kind === 'category') {
        await removeOrHideCategory(pendingRemoval.category.id, payload.moveToTargetId || undefined, {
          keepExistingOnExpenses: payload.keepExistingOnExpenses,
          learnedRuleAction: payload.learnedRuleAction,
        });
        if (editingCatId === pendingRemoval.category.id) {
          setEditingCatId(null);
        }
        const wasSystem = pendingRemoval.category.userId === null;
        setPendingRemoval(null);
        await loadData();
        await onCategoriesChanged();
        if (movedExpenses) {
          showToast?.('Expenses moved.');
        } else {
          showToast?.(wasSystem ? 'Category hidden.' : 'Category deleted.');
        }
      } else {
        await removeSubcategory(pendingRemoval.subId, payload.moveToTargetId, {
          keepExistingOnExpenses: payload.keepExistingOnExpenses,
          learnedRuleAction: payload.learnedRuleAction,
        });
        const wasSystem = pendingRemoval.isSystemDefault;
        setPendingRemoval(null);
        await loadData();
        await onCategoriesChanged();
        if (movedExpenses) {
          showToast?.('Expenses moved.');
        } else {
          showToast?.(wasSystem ? 'Subcategory hidden.' : 'Subcategory deleted.');
        }
      }
    } catch (err) {
      setRemoveErrorMsg(getUserSafeErrorMessage(err));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDropCategory = async (targetCatId: string) => {
    if (!draggedCatId || draggedCatId === targetCatId) return;
    const ids = activeCategories.map((c) => c.id);
    const fromIdx = ids.indexOf(draggedCatId);
    const toIdx = ids.indexOf(targetCatId);
    if (fromIdx === -1 || toIdx === -1) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(fromIdx, 1);
    nextIds.splice(toIdx, 0, moved);
    const archivedIds = categories.filter((c) => c.isArchived).map((c) => c.id);
    await reorderCategories([...nextIds, ...archivedIds]);
    setDraggedCatId(null);
    await loadData();
    await onCategoriesChanged();
  };

  const handleMoveCategoryStep = async (catId: string, dir: -1 | 1) => {
    const ids = activeCategories.map((c) => c.id);
    const idx = ids.indexOf(catId);
    const targetIdx = idx + dir;
    if (idx === -1 || targetIdx < 0 || targetIdx >= ids.length) return;
    const nextIds = [...ids];
    [nextIds[idx], nextIds[targetIdx]] = [nextIds[targetIdx], nextIds[idx]];
    const archivedIds = categories.filter((c) => c.isArchived).map((c) => c.id);
    await reorderCategories([...nextIds, ...archivedIds]);
    await loadData();
    await onCategoriesChanged();
  };

  const handleDropSubcategory = async (category: ExpenseCategory, targetSubId: string) => {
    if (!draggedSubId || draggedSubId === targetSubId) return;
    const activeSubs = category.subcategories.filter((s) => !s.isArchived);
    const ids = activeSubs.map((s) => s.id);
    const fromIdx = ids.indexOf(draggedSubId);
    const toIdx = ids.indexOf(targetSubId);
    if (fromIdx === -1 || toIdx === -1) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(fromIdx, 1);
    nextIds.splice(toIdx, 0, moved);
    const archivedSubIds = category.subcategories.filter((s) => s.isArchived).map((s) => s.id);
    await reorderSubcategories(category.id, [...nextIds, ...archivedSubIds]);
    setDraggedSubId(null);
    await loadData();
    await onCategoriesChanged();
  };

  const handleMoveSubcategoryStep = async (
    category: ExpenseCategory,
    subId: string,
    dir: -1 | 1
  ) => {
    const activeSubs = category.subcategories.filter((s) => !s.isArchived);
    const ids = activeSubs.map((s) => s.id);
    const idx = ids.indexOf(subId);
    const targetIdx = idx + dir;
    if (idx === -1 || targetIdx < 0 || targetIdx >= ids.length) return;
    const nextIds = [...ids];
    [nextIds[idx], nextIds[targetIdx]] = [nextIds[targetIdx], nextIds[idx]];
    const archivedSubIds = category.subcategories.filter((s) => s.isArchived).map((s) => s.id);
    await reorderSubcategories(category.id, [...nextIds, ...archivedSubIds]);
    await loadData();
    await onCategoriesChanged();
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteLearnedRule(ruleId);
      setLearnedRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast?.('Learned rule removed.');
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-[24px] max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-categories-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 bg-[var(--color-surface)]/50">
          <div>
            <h2
              id="manage-categories-title"
              className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
            >
              Settings · Categories
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Customize primary categories, subcategories, and learned AI rules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingCategory(!isAddingCategory);
                setEditingCatId(null);
              }}
              className="chest-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              aria-label="Add primary category"
            >
              <Plus className="w-4 h-4" />
              <span>Add category</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close categories settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subcategory Toggle & Privacy Bar */}
        <div className="px-5 sm:px-6 py-3 bg-[var(--color-container)]/25 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text)]">Subcategory</span>
              <span className="text-[11px] text-[var(--color-muted)]">
                {useSubcategories
                  ? 'Show & suggest subcategories (e.g. Food › Lunch)'
                  : 'Primary categories only'}
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-muted)] mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
              <span>{CATEGORY_PRIVACY_TEXT}</span>
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={useSubcategories}
            aria-label="Toggle Subcategories"
            onClick={handleToggleSubcategories}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
              useSubcategories ? 'bg-[var(--color-primary)]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                useSubcategories ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Add New Primary Category Inline Card */}
          {isAddingCategory && (
            <form
              onSubmit={handleCreateCategory}
              className="p-4 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text)]">
                  New primary category
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="text-[11px] text-[var(--color-muted)] hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--color-muted)] mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={newCatEmoji}
                    onChange={(e) => setNewCatEmoji(e.target.value)}
                    maxLength={4}
                    className="chest-input w-full px-3 py-2 text-center text-base"
                  />
                </div>
                <div className="sm:col-span-9">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--color-muted)] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coffee, Hobbies, Allowances"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    maxLength={32}
                    className="chest-input w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.slice(0, 12).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewCatEmoji(em)}
                    className={`w-7 h-7 rounded-[8px] text-sm flex items-center justify-center cursor-pointer transition-transform ${
                      newCatEmoji === em
                        ? 'bg-[var(--color-container)] ring-2 ring-[var(--color-primary)] scale-105'
                        : 'bg-white border border-[var(--color-border)] hover:scale-105'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase text-[var(--color-muted)] mb-1.5">
                  Pastel Color
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORY_PASTEL_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setNewCatColor(swatch)}
                      className={`w-7 h-7 rounded-full border border-black/15 cursor-pointer transition-transform ${
                        newCatColor === swatch
                          ? 'ring-2 ring-[var(--color-primary)] scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch }}
                      aria-label={`Select color ${swatch}`}
                    />
                  ))}
                  <span
                    className="ml-auto px-3 py-1 rounded-full text-xs font-semibold border border-black/10"
                    style={{ backgroundColor: newCatColor, color: '#3A2E33' }}
                  >
                    {newCatEmoji || '🏷️'} {newCatName.trim() || 'Preview'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingNewCat || !newCatName.trim()}
                  className="chest-button-primary px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSavingNewCat ? 'Saving...' : 'Create category'}
                </button>
              </div>
            </form>
          )}

          {/* Edit Category Drawer / Inline Panel */}
          {editingCategory && (
            <div className="p-4 rounded-[18px] bg-[var(--color-surface)] border-2 border-[var(--color-primary)]/40 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text)]">
                  Editing: {editingCategory.icon} {editingCategory.label}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingCatId(null)}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  Done editing
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--color-muted)] mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={editCatEmoji}
                    onChange={(e) => setEditCatEmoji(e.target.value)}
                    maxLength={4}
                    className="chest-input w-full px-2.5 py-2 text-center text-base"
                  />
                </div>
                <div className="sm:col-span-7">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--color-muted)] mb-1">
                    Category name
                  </label>
                  <input
                    type="text"
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    maxLength={32}
                    className="chest-input w-full px-3 py-2 text-xs"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleSaveCategoryDetails}
                    className="chest-button-primary w-full py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORY_PASTEL_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setEditCatColor(swatch)}
                    className={`w-6 h-6 rounded-full border border-black/15 cursor-pointer ${
                      editCatColor === swatch ? 'ring-2 ring-[var(--color-primary)] scale-110' : ''
                    }`}
                    style={{ backgroundColor: swatch }}
                    aria-label={`Color ${swatch}`}
                  />
                ))}
              </div>

              {/* Subcategories editor inside edit panel */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Subcategories ({editingCategory.subcategories.filter((s) => !s.isArchived).length})
                  </span>
                </div>

                <form onSubmit={handleAddSubcategoryInEdit} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubLabel}
                    onChange={(e) => setNewSubLabel(e.target.value)}
                    maxLength={24}
                    placeholder="Add subcategory (max 24 chars)..."
                    className="chest-input flex-1 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!newSubLabel.trim()}
                    className="chest-button-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                <div className="space-y-1.5">
                  {(() => {
                    const activeSubs = editingCategory.subcategories.filter((s) => !s.isArchived);
                    return activeSubs.map((sub, subIdx) => (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={() => setDraggedSubId(sub.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => void handleDropSubcategory(editingCategory, sub.id)}
                        className="flex items-center justify-between gap-2 p-2 rounded-[10px] bg-white border border-[var(--color-border)] text-xs"
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-[var(--color-muted)] cursor-grab shrink-0" />
                          <div className="flex items-center shrink-0">
                            <button
                              type="button"
                              disabled={subIdx === 0}
                              onClick={() =>
                                void handleMoveSubcategoryStep(editingCategory, sub.id, -1)
                              }
                              className="p-0.5 text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-25 cursor-pointer"
                              aria-label={`Move ${sub.label} up`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={subIdx === activeSubs.length - 1}
                              onClick={() =>
                                void handleMoveSubcategoryStep(editingCategory, sub.id, 1)
                              }
                              className="p-0.5 text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-25 cursor-pointer"
                              aria-label={`Move ${sub.label} down`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          {editingSubId === sub.id ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingSubLabel}
                                onChange={(e) => setEditingSubLabel(e.target.value)}
                                maxLength={24}
                                className="chest-input flex-1 px-2 py-1 text-xs"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveSubEdit(sub.id)}
                                className="px-2 py-1 rounded-[8px] bg-[var(--color-primary)] text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span className="truncate font-medium text-[var(--color-text)]">
                              {sub.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setEditingSubLabel(sub.label);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-[var(--color-muted)] cursor-pointer"
                            aria-label={`Rename ${sub.label}`}
                            title="Rename subcategory"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleInitiateRemoveSubcategory(
                                editingCategory,
                                sub.id,
                                sub.label,
                                sub.userId === null
                              )
                            }
                            className={
                              sub.userId === null
                                ? 'inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 text-[var(--color-muted)] hover:text-[var(--color-text)] text-[11px] font-semibold cursor-pointer'
                                : 'p-1 rounded hover:bg-rose-50 text-[#A84255] cursor-pointer'
                            }
                            aria-label={sub.userId === null ? `Hide ${sub.label}` : `Delete ${sub.label}`}
                            title={sub.userId === null ? 'Hide default subcategory' : 'Delete subcategory'}
                          >
                            {sub.userId === null ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Primary Categories List */}
          {isLoading ? (
            <p className="text-xs text-[var(--color-muted)] text-center py-6">
              Loading categories...
            </p>
          ) : (
            <div className="space-y-2">
              {activeCategories.map((cat, idx) => {
                const activeSubs = cat.subcategories.filter((s) => !s.isArchived);
                const isOthers = cat.key === 'others';
                return (
                  <div
                    key={cat.id}
                    draggable
                    onDragStart={() => setDraggedCatId(cat.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => void handleDropCategory(cat.id)}
                    className="p-3 rounded-[16px] border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
                        <GripVertical
                          className="w-4 h-4 text-[var(--color-muted)] cursor-grab"
                          aria-label="Drag to reorder"
                        />
                        <div className="flex items-center">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => void handleMoveCategoryStep(cat.id, -1)}
                            className="p-0.5 text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-25 cursor-pointer"
                            aria-label={`Move ${cat.label} up`}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeCategories.length - 1}
                            onClick={() => void handleMoveCategoryStep(cat.id, 1)}
                            className="p-0.5 text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-25 cursor-pointer"
                            aria-label={`Move ${cat.label} down`}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-black/10"
                            style={{ backgroundColor: cat.color, color: '#3A2E33' }}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <span className="text-xs font-semibold text-[var(--color-muted)] tabular-numbers">
                            ({activeSubs.length})
                          </span>
                          {cat.userId === null && (
                            <span className="text-[10px] text-[var(--color-muted)]">Default</span>
                          )}
                        </div>

                        <p className="text-[11px] text-[var(--color-muted)] mt-1 leading-relaxed">
                          {activeSubs.length > 0
                            ? activeSubs.map((s) => s.label).join(', ')
                            : 'No subcategories'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditingCategory(cat)}
                        className="p-1.5 rounded-[10px] bg-[var(--color-container)]/35 hover:bg-[var(--color-container)]/70 text-[var(--color-text)] transition-colors cursor-pointer"
                        aria-label={`Edit ${cat.label}`}
                        title="Edit category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {!isOthers && (
                        <button
                          type="button"
                          onClick={() => void handleInitiateRemoveCategory(cat)}
                          className={
                            cat.userId === null
                              ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-[var(--color-muted)] hover:text-[var(--color-text)] text-xs font-semibold transition-colors cursor-pointer'
                              : 'p-1.5 rounded-[10px] bg-rose-50/70 hover:bg-rose-100 text-[#A84255] transition-colors cursor-pointer'
                          }
                          aria-label={cat.userId === null ? `Hide ${cat.label}` : `Delete ${cat.label}`}
                          title={cat.userId === null ? 'Hide default category' : 'Delete category'}
                        >
                          {cat.userId === null ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide</span>
                            </>
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hidden Categories & Subcategories */}
          {(archivedDefaults.length > 0 || archivedDefaultSubcategories.length > 0) && (
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Hidden categories ({archivedDefaults.length + archivedDefaultSubcategories.length})
              </h3>
              <div className="space-y-1.5">
                {archivedDefaults.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] border border-[var(--color-border)] bg-slate-50/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border border-black/10"
                        style={{ backgroundColor: cat.color, color: '#3A2E33' }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)]">Category</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await restoreCategory(cat.id);
                        await loadData();
                        await onCategoriesChanged();
                        showToast?.(`${cat.label} restored.`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] border border-[var(--color-border)] bg-white hover:bg-slate-100 text-xs font-semibold text-[var(--color-text)] cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-[var(--color-primary)]" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}

                {archivedDefaultSubcategories.map(({ category, sub }) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] border border-[var(--color-border)] bg-slate-50/70 text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-xs">{category.icon}</span>
                      <span className="font-medium text-[var(--color-muted)]">
                        {category.label} ›
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">{sub.label}</span>
                      <span className="text-[11px] text-[var(--color-muted)]">Subcategory</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await restoreSubcategory(sub.id);
                        await loadData();
                        await onCategoriesChanged();
                        showToast?.(`${sub.label} restored.`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] border border-[var(--color-border)] bg-white hover:bg-slate-100 text-xs font-semibold text-[var(--color-text)] cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-[var(--color-primary)]" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learned Rules Section */}
          <div className="pt-4 border-t border-[var(--color-border)] space-y-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Learned rules ({learnedRules.length})
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">
                Saved automatically when you pick or change a category on an expense
              </p>
            </div>

            {learnedRules.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] italic py-2">
                No learned rules yet. Change a suggested category on the Add Expense form to teach Chestlist.
              </p>
            ) : (
              <div className="space-y-1.5">
                {learnedRules.map((rule) => {
                  const cat = categories.find((c) => c.id === rule.categoryId);
                  const sub =
                    cat && rule.subcategoryId
                      ? cat.subcategories.find((s) => s.id === rule.subcategoryId)
                      : null;
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-mono font-semibold text-[var(--color-text)] bg-white px-2 py-0.5 rounded-[6px] border border-[var(--color-border)]">
                          {rule.keyword}
                        </span>
                        <span className="text-[var(--color-muted)]">→</span>
                        {cat ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-black/10"
                            style={{ backgroundColor: cat.color, color: '#3A2E33' }}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                            {sub && <span>› {sub.label}</span>}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">Unknown category</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-[8px] hover:bg-rose-50 text-[#A84255] cursor-pointer shrink-0"
                        aria-label={`Remove rule for ${rule.keyword}`}
                        title="Remove rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <CategoryDeleteModal
        pending={pendingRemoval}
        activeCategories={activeCategories}
        isSubmitting={isRemoving}
        errorMsg={removeErrorMsg}
        onCancel={() => {
          if (!isRemoving) {
            setPendingRemoval(null);
            setRemoveErrorMsg(null);
          }
        }}
        onConfirm={handleConfirmRemoval}
      />
    </div>
  );
};
