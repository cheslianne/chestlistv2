import React, { useState } from 'react';
import { formatPHP, getCurrentWeekRange } from '../api';
import { Expense } from '../types';

interface WeeklyBarChartProps {
  expenses: Expense[];
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ expenses }) => {
  const [hoveredDay, setHoveredDay] = useState<{ day: string; amount: number } | null>(null);

  const weekInfo = getCurrentWeekRange();
  const weekDays = weekInfo.days;

  // Aggregate spending by exact date in the current week
  const dayTotals: Record<string, number> = {};
  weekDays.forEach((d) => {
    dayTotals[d.dateStr] = 0;
  });

  expenses.forEach((e) => {
    if (dayTotals[e.date] !== undefined) {
      dayTotals[e.date] += e.amountCentavos;
    }
  });

  const maxSpend = Math.max(...Object.values(dayTotals), 100000); // at least ₱1,000 for scale

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Daily Cadence (Mon–Sun)
        </span>
        {hoveredDay ? (
          <span className="text-xs font-semibold text-[var(--color-primary)] tabular-numbers">
            {hoveredDay.day}: {formatPHP(hoveredDay.amount)}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-muted)]">Hover bars for details</span>
        )}
      </div>

      <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1 border-b border-[var(--color-border)]">
        {weekDays.map((d) => {
          const amount = dayTotals[d.dateStr] || 0;
          const heightPercent = Math.max(8, Math.round((amount / maxSpend) * 100));
          const isHighest = amount > 0 && amount === Math.max(...Object.values(dayTotals));

          return (
            <div
              key={d.dateStr}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredDay({ day: d.formatted, amount })}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Tooltip on bar hover */}
              <div
                className="w-full rounded-t-[8px] transition-all duration-300 relative"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: isHighest
                    ? 'var(--color-primary)'
                    : amount > 0
                    ? 'var(--color-soft-accent)'
                    : 'var(--color-border)',
                }}
              >
                {amount > 0 && (
                  <span className="sr-only">
                    {d.shortLabel}: {formatPHP(amount)}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-medium mt-2 transition-colors whitespace-nowrap text-center ${
                  amount > 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'
                }`}
              >
                {d.shortLabel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5 text-[11px] text-[var(--color-muted)]">
        <span>Min: ₱0</span>
        <span>Peak day: {formatPHP(Math.max(...Object.values(dayTotals)))}</span>
      </div>
    </div>
  );
};
