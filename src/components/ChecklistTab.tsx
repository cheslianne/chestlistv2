import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Calendar,
  Check,
  Circle,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import * as api from '../api';
import { ChecklistItem, ChecklistCategory, ChecklistStatus, ChecklistProgressInfo } from '../types';
import { ChecklistMascot } from './ChecklistMascot';
import { ChecklistCelebrationModal } from './ChecklistCelebrationModal';

interface ChecklistTabProps {
  items: ChecklistItem[];
  onRefresh: () => Promise<void>;
  showToast?: (message: string) => void;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({ items, onRefresh, showToast }) => {
  // Filter state: 'All' | 'General' | 'School Activity'
  const [filterCategory, setFilterCategory] = useState<'All' | ChecklistCategory>('All');

  // Add Task Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistCategory>('General');
  const [newDueDate, setNewDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Task State
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<ChecklistCategory>('General');
  const [editDueDate, setEditDueDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);

  // Celebration Modal state
  const [showCelebration, setShowCelebration] = useState(false);

  // Action error banner with retry
  const [actionError, setActionError] = useState<{ message: string; retry: () => void } | null>(null);

  // Recent checked pop animation tracker
  const [poppedTaskId, setPoppedTaskId] = useState<string | null>(null);

  // Computed progress and mascot state from items
  const progress: ChecklistProgressInfo = useMemo(() => {
    return api.computeChecklistProgress(items);
  }, [items]);

  // Filtered task items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory === 'All') return true;
      return item.category === filterCategory;
    });
  }, [items, filterCategory]);

  const isSubmittingRef = useRef(false);
  const isEditSubmittingRef = useRef(false);

  const resetAddForm = () => {
    setNewTitle('');
    setNewDueDate('');
    setNewCategory('General');
    setFormError(null);
  };

  const performAddTask = async () => {
    if (isSubmittingRef.current) return;
    if (!newTitle.trim()) {
      setFormError('Enter a task name.');
      return;
    }
    isSubmittingRef.current = true;
    setFormError(null);
    setActionError(null);
    setIsSubmitting(true);
    try {
      await api.addChecklistTask({
        title: newTitle.trim(),
        category: newCategory,
        dueDate: newDueDate || undefined,
      });
      resetAddForm();
      await onRefresh();
      setFormError(null);
      if (showToast) showToast('Task added.');
    } catch (err) {
      console.error('[Chestlist][ChecklistTab][addTask]', err);
      setActionError({
        message: api.getUserSafeErrorMessage(err),
        retry: performAddTask,
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Handle Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await performAddTask();
  };

  // Handle Checkbox Toggle
  const handleToggle = async (id: string) => {
    setPoppedTaskId(id);
    setTimeout(() => setPoppedTaskId(null), 400);

    try {
      setActionError(null);
      const res = await api.toggleChecklistTask(id);
      await onRefresh();
      if (res.isNewlyCompletedAll) {
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('[Chestlist][ChecklistTab][toggle]', err);
      setActionError({
        message: api.getUserSafeErrorMessage(err),
        retry: () => handleToggle(id),
      });
    }
  };

  // Handle Clickable Status Pill Cycling
  const handleCycleStatus = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setActionError(null);
      const res = await api.cycleChecklistTaskStatus(id);
      await onRefresh();
      if (res.isNewlyCompletedAll) {
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('[Chestlist][ChecklistTab][cycleStatus]', err);
      setActionError({
        message: api.getUserSafeErrorMessage(err),
        retry: () => handleCycleStatus(id),
      });
    }
  };

  const performSaveEdit = async () => {
    if (!editingItem || isEditSubmittingRef.current) return;
    if (!editTitle.trim()) {
      setEditError('Enter a task name.');
      return;
    }
    isEditSubmittingRef.current = true;
    setEditError(null);
    try {
      await api.updateChecklistTask(editingItem.id, {
        title: editTitle.trim(),
        category: editCategory,
        dueDate: editDueDate || undefined,
      });
      setEditingItem(null);
      setEditError(null);
      await onRefresh();
      if (showToast) showToast('Task updated.');
    } catch (err) {
      console.error('[Chestlist][ChecklistTab][saveEdit]', err);
      setEditError(api.getUserSafeErrorMessage(err));
    } finally {
      isEditSubmittingRef.current = false;
    }
  };

  // Handle Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSaveEdit();
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const itemToDelete = deletingItem;
    try {
      setActionError(null);
      await api.deleteChecklistTask(itemToDelete.id);
      setDeletingItem(null);
      await onRefresh();
      if (showToast) showToast('Task removed.');
    } catch (err) {
      console.error('[Chestlist][ChecklistTab][delete]', err);
      setDeletingItem(null);
      setActionError({
        message: api.getUserSafeErrorMessage(err),
        retry: () => {
          setDeletingItem(itemToDelete);
        },
      });
    }
  };

  // Helper to compute humanized due date with accessible textual labels
  const getDueDateLabel = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    try {
      const today = api.getToday();
      const todayStr = api.getManilaDateString();

      // Check today
      if (dueDateStr === todayStr) {
        return {
          text: 'Due today',
          isOverdue: false,
          isDueToday: true,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      }

      const [y, m, d] = dueDateStr.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedDate = `${monthNames[m - 1]} ${d}`;

      if (diffDays < 0) {
        const daysPast = Math.abs(diffDays);
        return {
          text: daysPast === 1 ? `Overdue by 1 day (${formattedDate})` : `Overdue by ${daysPast} days (${formattedDate})`,
          isOverdue: true,
          isDueToday: false,
          badgeClass: 'bg-rose-50 text-[#A84255] border-rose-200',
        };
      } else if (diffDays === 1) {
        return {
          text: 'Due tomorrow',
          isOverdue: false,
          isDueToday: false,
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      } else {
        return {
          text: `Due ${formattedDate}`,
          isOverdue: false,
          isDueToday: false,
          badgeClass: 'bg-slate-50 text-[var(--color-muted)] border-slate-200',
        };
      }
    } catch {
      return {
        text: dueDateStr,
        isOverdue: false,
        isDueToday: false,
        badgeClass: 'bg-slate-50 text-[var(--color-muted)] border-slate-200',
      };
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes checkPop {
          0% { transform: scale(0.85); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .animate-check-pop {
          animation: checkPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {actionError && (
        <div
          role="alert"
          className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{actionError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const fn = actionError.retry;
              setActionError(null);
              fn();
            }}
            className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Two Column Layout on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Add Task Form, Filters & Task List (7 of 12 cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Add Task Form */}
          <div className="chest-card p-5 md:p-6 shadow-xs border border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans'] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Add New Task</span>
            </h3>

            <form onSubmit={handleAddTask} onReset={resetAddForm} noValidate className="space-y-4">
              {/* Task Title Input with custom inline validation */}
              <div>
                <label htmlFor="checklist-title-input" className="sr-only">
                  What do you need to do?
                </label>
                <input
                  id="checklist-title-input"
                  type="text"
                  placeholder="What do you need to do?"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className={`chest-input w-full text-sm py-2.5 px-3.5 ${
                    formError ? 'border-[#A84255] focus:ring-[#A84255]' : ''
                  }`}
                  aria-invalid={formError ? 'true' : 'false'}
                  aria-describedby={formError ? 'checklist-form-error' : undefined}
                />
                {formError && (
                  <p
                    id="checklist-form-error"
                    className="mt-1.5 text-xs text-[#A84255] font-semibold flex items-center gap-1.5"
                    role="alert"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formError}</span>
                  </p>
                )}
              </div>

              {/* Segmented Selector & Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Segmented Category Selector */}
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                    Category
                  </span>
                  <div
                    className="grid grid-cols-2 p-1 rounded-full bg-slate-100 border border-[var(--color-border)] text-xs font-semibold"
                    role="radiogroup"
                    aria-label="Task Category"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={newCategory === 'General'}
                      onClick={() => setNewCategory('General')}
                      className={`min-h-[36px] py-1.5 px-2 rounded-full transition-all cursor-pointer text-center ${
                        newCategory === 'General'
                          ? 'bg-white text-[var(--color-text)] shadow-xs font-bold'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      General
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={newCategory === 'School Activity'}
                      onClick={() => setNewCategory('School Activity')}
                      className={`min-h-[36px] py-1.5 px-2 rounded-full transition-all cursor-pointer text-center ${
                        newCategory === 'School Activity'
                          ? 'bg-[#C9B8EA] text-[#3A2E33] shadow-xs font-bold'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      School Activity
                    </button>
                  </div>
                </div>

                {/* Optional Due Date */}
                <div>
                  <label
                    htmlFor="checklist-due-input"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5"
                  >
                    Due Date (Optional)
                  </label>
                  <div className="relative">
                    <input
                      id="checklist-due-input"
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="chest-input w-full text-xs py-2 px-3 pl-8 min-h-[40px]"
                    />
                    <Calendar className="w-4 h-4 text-[var(--color-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Submit Button with 44px min touch target */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="chest-button-primary min-h-[44px] px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2. Filter Chips: All, General, School Activity */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2" role="tablist" aria-label="Filter tasks">
              {(['All', 'General', 'School Activity'] as const).map((cat) => {
                const isActive = filterCategory === cat;
                const count =
                  cat === 'All'
                    ? items.length
                    : items.filter((i) => i.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    role="tab"
                    aria-selected={isActive}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                      isActive
                        ? cat === 'School Activity'
                          ? 'bg-[#C9B8EA] border-[#B7A3DE] text-[#3A2E33] shadow-xs'
                          : 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-slate-300'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="ml-1.5 opacity-75 tabular-numbers font-medium text-[11px]">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Summary Pill */}
            <span className="text-xs font-semibold text-[var(--color-muted)] tabular-numbers">
              {progress.label}
            </span>
          </div>

          {/* 3. Task List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              /* Empty State */
              <div className="chest-card p-10 text-center space-y-3 border border-dashed border-[var(--color-border)] bg-slate-50/50">
                <div className="w-12 h-12 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] mx-auto shadow-xs">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                  Nothing here yet. Let's get started.
                </h4>
                <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">
                  {filterCategory === 'All'
                    ? 'Use the form above to add your coursework, daily student routines, or errands.'
                    : `No tasks found under ${filterCategory}. Add one above or switch filters.`}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isDone = item.status === 'Done' || !!item.completed;
                const isPopped = poppedTaskId === item.id;
                const dueInfo = getDueDateLabel(item.dueDate);

                return (
                  <div
                    key={item.id}
                    className={`chest-card p-4 transition-all duration-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                      isDone
                        ? 'bg-slate-50/70 border-slate-200/80'
                        : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:shadow-xs'
                    }`}
                  >
                    {/* Checkbox and Task Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox with pop animation and 44px min clickable area */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className="mt-0.5 min-w-[28px] min-h-[28px] w-7 h-7 rounded-[8px] border flex items-center justify-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1"
                        style={{
                          backgroundColor: isDone ? 'var(--color-primary)' : '#FFFFFF',
                          borderColor: isDone ? 'var(--color-primary)' : '#CBD5E1',
                        }}
                        aria-label={`Mark task ${item.title} as ${isDone ? 'incomplete' : 'done'}`}
                      >
                        <div className={isPopped ? 'animate-check-pop' : ''}>
                          {isDone ? (
                            <Check className="w-4 h-4 text-white stroke-[2.8]" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-xs bg-transparent group-hover:bg-slate-200 transition-colors" />
                          )}
                        </div>
                      </button>

                      {/* Title & Metadata chips */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p
                          className={`text-sm font-semibold transition-all break-words ${
                            isDone
                              ? 'line-through text-[var(--color-muted)]'
                              : 'text-[var(--color-text)]'
                          }`}
                        >
                          {item.title}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {/* Category Chip (School Activity: #C9B8EA with dark text #3A2E33) */}
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                            style={{
                              backgroundColor:
                                item.category === 'School Activity' ? '#C9B8EA' : '#EFECE6',
                              color: '#3A2E33',
                              borderColor:
                                item.category === 'School Activity' ? '#B8A4DC' : '#DDD8CE',
                            }}
                          >
                            {item.category}
                          </span>

                          {/* Due Date Badge with accessible textual indicators */}
                          {dueInfo && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${dueInfo.badgeClass}`}
                            >
                              {dueInfo.isOverdue ? (
                                <AlertCircle className="w-3 h-3 text-[#A84255]" />
                              ) : (
                                <Clock className="w-3 h-3 opacity-70" />
                              )}
                              <span>{dueInfo.text}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Clickable Status Pill: Cycles Not started -> In progress -> Done */}
                      <button
                        type="button"
                        onClick={(e) => handleCycleStatus(item.id, e)}
                        className={`min-h-[32px] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          item.status === 'Done'
                            ? 'bg-[#D9F3E5] text-[#166534] border-[#BBF7D0] hover:bg-[#cbf0dc]'
                            : item.status === 'In progress'
                            ? 'bg-[#FEF3CF] text-[#92400E] border-[#FDE68A] hover:bg-[#fdeea9]'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to cycle status: Not started → In progress → Done"
                        aria-label={`Current status: ${item.status}. Click to change.`}
                      >
                        {item.status === 'Done' && <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />}
                        {item.status === 'In progress' && <Clock className="w-3.5 h-3.5 text-[#92400E]" />}
                        {item.status === 'Not started' && <Circle className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{item.status}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditTitle(item.title);
                          setEditCategory(item.category);
                          setEditDueDate(item.dueDate || '');
                          setEditError(null);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        aria-label={`Edit task ${item.title}`}
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[#A84255] hover:bg-rose-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A84255]"
                        aria-label={`Delete task ${item.title}`}
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Progress Mascot Card (5 of 12 cols on desktop) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="chest-card p-6 border border-[var(--color-border)] shadow-xs flex flex-col items-center">
            {/* Header Badge */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Progress Mascot
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--color-text)] tabular-numbers">
                State {progress.mascotState} of 5
              </span>
            </div>

            {/* Mascot Character with Caption & Progress Bar */}
            <ChecklistMascot progress={progress} size="lg" showProgressBar={true} />
          </div>
        </div>
      </div>

      {/* EDIT TASK MODAL */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="relative w-full max-w-md rounded-[24px] bg-white border border-[var(--color-border)] p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setEditingItem(null);
                setEditError(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close edit modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h3
              id="edit-modal-title"
              className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans'] mb-4"
            >
              Edit Task
            </h3>

            <form onSubmit={handleSaveEdit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  className="chest-input w-full text-sm py-2 px-3"
                />
                {editError && (
                  <div className="mt-1.5 text-xs text-[#A84255] font-semibold flex items-center justify-between gap-2" role="alert">
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{editError}</span>
                    </div>
                    {editError === api.GENERIC_USER_ERROR && (
                      <button
                        type="button"
                        onClick={performSaveEdit}
                        className="px-2 py-0.5 rounded-[6px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] cursor-pointer shrink-0"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCategory('General')}
                    className={`py-2 px-3 rounded-[12px] text-xs font-semibold border cursor-pointer ${
                      editCategory === 'General'
                        ? 'bg-[var(--color-container)] border-[var(--color-primary)] text-[var(--color-text)] font-bold'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-muted)]'
                    }`}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('School Activity')}
                    className={`py-2 px-3 rounded-[12px] text-xs font-semibold border cursor-pointer ${
                      editCategory === 'School Activity'
                        ? 'bg-[#C9B8EA] border-[#B7A3DE] text-[#3A2E33] font-bold'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-muted)]'
                    }`}
                  >
                    School Activity
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="chest-input w-full text-xs py-2 px-3"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setEditError(null);
                  }}
                  className="chest-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="chest-button-primary px-5 py-2 text-xs font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-6 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#A84255] mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3
              id="delete-modal-title"
              className="text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']"
            >
              Delete Task?
            </h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[var(--color-text)]">"{deletingItem.title}"</span>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="chest-button-secondary min-h-[44px] px-5 py-2 text-xs font-semibold cursor-pointer flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[44px] px-5 py-2 rounded-full text-xs font-semibold bg-[#A84255] hover:bg-[#933446] text-white cursor-pointer shadow-xs flex-1 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100% CELEBRATION MODAL */}
      <ChecklistCelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        progress={progress}
      />
    </div>
  );
};
