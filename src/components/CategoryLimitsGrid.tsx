import React, { useState } from 'react';
import { centavosToPesos, formatPHP, getUserSafeErrorMessage, pesosToCentavos } from '../api';
import { CategoryConfig } from '../types';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

interface CategoryWithUsage extends CategoryConfig {
  spentCentavos: number;
  percent: number;
}

interface CategoryLimitsGridProps {
  categories: CategoryWithUsage[];
  onSetLimit?: (categoryIdOrKey: string, limitCentavos: number) => Promise<void>;
  onRemoveLimit?: (categoryIdOrKey: string) => Promise<void>;
}

export const CategoryLimitsGrid: React.FC<CategoryLimitsGridProps> = ({
  categories,
  onSetLimit,
  onRemoveLimit,
}) => {
  const limitedCategories = categories.filter((c) => c.limitCentavos > 0);
  const unlimitedCategories = categories.filter((c) => c.limitCentavos <= 0);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedCatKey, setSelectedCatKey] = useState<string>('');
  const [limitPesosStr, setLimitPesosStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openAddForm = () => {
    const firstAvailable = unlimitedCategories[0] || categories[0];
    setSelectedCatKey(firstAvailable?.key || firstAvailable?.name || '');
    setLimitPesosStr(firstAvailable?.limitCentavos ? centavosToPesos(firstAvailable.limitCentavos).toString() : '');
    setErrorMsg(null);
    setIsAdding(true);
  };

  const openEditForCategory = (cat: CategoryWithUsage) => {
    setSelectedCatKey(cat.key || cat.id || cat.name);
    setLimitPesosStr(centavosToPesos(cat.limitCentavos).toString());
    setErrorMsg(null);
    setIsAdding(true);
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSetLimit || !selectedCatKey) return;
    const numeric = parseFloat(limitPesosStr);
    if (isNaN(numeric) || numeric <= 0) {
      setErrorMsg('Enter a weekly limit greater than ₱0.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onSetLimit(selectedCatKey, pesosToCentavos(numeric));
      setIsAdding(false);
      setLimitPesosStr('');
    } catch (err) {
      setErrorMsg(getUserSafeErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text)]">Weekly Category Limits</h3>
          <p className="text-xs text-[var(--color-muted)]">
            Showing categories where you set a weekly limit
          </p>
        </div>

        {onSetLimit && categories.length > 0 && (
          <button
            type="button"
            onClick={openAddForm}
            className="chest-button-secondary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Add limit</span>
          </button>
        )}
      </div>

      {isAdding && onSetLimit && (
        <form
          onSubmit={handleSaveLimit}
          className="mb-4 p-4 rounded-[18px] bg-white border border-[var(--color-border)] shadow-xs space-y-3 animate-in fade-in"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold uppercase text-[var(--color-muted)] mb-1">
                Primary category
              </label>
              <select
                value={selectedCatKey}
                onChange={(e) => {
                  const nextKey = e.target.value;
                  setSelectedCatKey(nextKey);
                  const found = categories.find(
                    (c) => (c.key || c.id || c.name) === nextKey
                  );
                  if (found && found.limitCentavos > 0) {
                    setLimitPesosStr(centavosToPesos(found.limitCentavos).toString());
                  }
                }}
                className="chest-input w-full px-3 py-2 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.key || c.id || c.name} value={c.key || c.id || c.name}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                    {c.limitCentavos > 0 ? ` (${formatPHP(c.limitCentavos)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold uppercase text-[var(--color-muted)] mb-1">
                Weekly limit (PHP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                  ₱
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={limitPesosStr}
                  onChange={(e) => {
                    setLimitPesosStr(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 1000"
                  className="chest-input w-full pl-7 pr-3 py-2 text-xs tabular-numbers"
                />
              </div>
            </div>

            <div className="sm:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="chest-button-primary flex-1 py-2 px-3 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save limit'}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="chest-button-secondary py-2 px-3 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-[#A84255] font-medium" role="alert">
              {errorMsg}
            </p>
          )}
        </form>
      )}

      {limitedCategories.length === 0 ? (
        <div className="chest-card p-6 text-center space-y-2">
          <p className="text-xs font-semibold text-[var(--color-text)]">
            No weekly category limits set yet.
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Only categories you set a limit on appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {limitedCategories.map((cat) => {
            const isOver = cat.percent >= 100;
            const isWarning = cat.percent >= 80 && !isOver;
            const isHealthy = cat.percent < 80;

            return (
              <div
                key={cat.key || cat.id || cat.name}
                className={`p-4 rounded-[18px] border transition-all duration-300 relative overflow-hidden ${
                  isOver
                    ? 'bg-rose-50/70 border-rose-300/80 shadow-xs ring-1 ring-rose-400/30'
                    : isWarning
                    ? 'bg-amber-50/60 border-amber-300/80 shadow-[0_0_15px_rgba(194,105,16,0.12)] ring-1 ring-amber-400/30'
                    : 'bg-white border-[var(--color-border)] hover:border-slate-300'
                }`}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs border border-black/10 inline-flex items-center gap-1"
                    style={{
                      backgroundColor: cat.color,
                      color: '#3A2E33',
                    }}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onSetLimit && (
                      <button
                        type="button"
                        onClick={() => openEditForCategory(cat)}
                        className="p-1 rounded hover:bg-black/5 text-[var(--color-muted)] cursor-pointer"
                        aria-label={`Edit limit for ${cat.name}`}
                        title="Edit limit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {onRemoveLimit && (
                      <button
                        type="button"
                        onClick={() => void onRemoveLimit(cat.key || cat.id || cat.name)}
                        className="p-1 rounded hover:bg-rose-100 text-[#A84255] cursor-pointer"
                        aria-label={`Remove limit for ${cat.name}`}
                        title="Remove limit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-1">
                  {isOver && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A84255]">
                      <AlertOctagon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                      <span>Over your limit</span>
                    </span>
                  )}
                  {isWarning && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C26910]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                      <span>Almost at your limit</span>
                    </span>
                  )}
                  {isHealthy && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-muted)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                      <span>On track</span>
                    </span>
                  )}
                </div>

                {/* Amounts */}
                <div className="mt-2 flex items-baseline justify-between text-xs">
                  <span className="font-bold text-[var(--color-text)] tabular-numbers text-sm">
                    {formatPHP(cat.spentCentavos)}
                  </span>
                  <span className="text-[var(--color-muted)] tabular-numbers">
                    limit {formatPHP(cat.limitCentavos)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver
                        ? 'bg-[#A84255]'
                        : isWarning
                        ? 'bg-[#C26910]'
                        : 'bg-[var(--color-primary)]'
                    }`}
                    style={{
                      width: `${Math.min(cat.percent, 100)}%`,
                    }}
                  />
                </div>

                {/* Percentage kicker */}
                <div className="mt-1.5 flex justify-between text-[11px] text-[var(--color-muted)]">
                  <span className="tabular-numbers font-medium">{cat.percent}% used</span>
                  <span className="tabular-numbers">
                    {isOver
                      ? `+${formatPHP(cat.spentCentavos - cat.limitCentavos)} over`
                      : `${formatPHP(Math.max(0, cat.limitCentavos - cat.spentCentavos))} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
