import React, { useState } from 'react';
import { formatPHP } from '../api';
import { CategoryName } from '../types';

export interface DonutSlice {
  category: CategoryName;
  categoryId?: string;
  icon?: string;
  amountCentavos: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  totalCentavos: number;
  viewMode?: 'category' | 'subcategory';
  onViewModeChange?: (mode: 'category' | 'subcategory') => void;
  breakdownCategories?: Array<{ id: string; label: string; icon: string }>;
  selectedBreakdownCategoryId?: string;
  onSelectBreakdownCategory?: (catId: string) => void;
  emptyText?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  slices,
  totalCentavos,
  viewMode,
  onViewModeChange,
  breakdownCategories,
  selectedBreakdownCategoryId,
  onSelectBreakdownCategory,
  emptyText,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const size = 320;
  const strokeWidth = 38;
  const radius = (size - strokeWidth - 20) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // All active slices sorted descending (legend shows all)
  const activeSlices = [...slices]
    .filter((s) => s.amountCentavos > 0)
    .sort((a, b) => b.amountCentavos - a.amountCentavos);

  // Chart SVG limits slices to top 6, grouping the rest into one 'Others' slice
  const chartSlices: Array<DonutSlice & { chartKey: string }> = (() => {
    if (activeSlices.length <= 6) {
      return activeSlices.map((s) => ({ ...s, chartKey: s.category }));
    }
    const topFive = activeSlices.slice(0, 5).map((s) => ({ ...s, chartKey: s.category }));
    const rest = activeSlices.slice(5);
    const restAmount = rest.reduce((sum, s) => sum + s.amountCentavos, 0);
    const restPercentage =
      totalCentavos > 0
        ? Math.max(1, Math.round((restAmount / totalCentavos) * 100))
        : rest.reduce((sum, s) => sum + s.percentage, 0);
    return [
      ...topFive,
      {
        chartKey: '__chart_grouped_others__',
        category: 'Others',
        icon: '📦',
        amountCentavos: restAmount,
        percentage: restPercentage,
        color: '#D3D3D8',
      },
    ];
  })();

  const hoveredSlice =
    chartSlices.find((s) => s.chartKey === hoveredCategory) ||
    activeSlices.find((s) => s.category === hoveredCategory) ||
    null;

  // Slices draw clockwise starting from top (-90 deg)
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-[320px] h-[320px] flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <g className="transform -rotate-90 origin-center">
            {/* Base empty ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--color-border)"
              strokeWidth={strokeWidth}
              className="opacity-40"
            />

            {/* Slices drawn clockwise */}
            {chartSlices.length > 0 ? (
              chartSlices.map((slice) => {
                const exactFraction =
                  totalCentavos > 0
                    ? (slice.amountCentavos / totalCentavos) * 100
                    : slice.percentage;
                const strokeDasharray = `${(exactFraction / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);

                const isHovered = hoveredCategory === slice.chartKey || hoveredCategory === slice.category;

                accumulatedPercent += exactFraction;

                return (
                  <circle
                    key={slice.chartKey}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    style={{ strokeLinecap: 'butt' }}
                    onMouseEnter={() => setHoveredCategory(slice.chartKey)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })
            ) : (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="var(--color-border)"
                strokeWidth={strokeWidth}
              />
            )}
          </g>

          {/* Numeric % labels directly on sufficiently wide slices */}
          {(() => {
            let labelAccPercent = 0;
            return chartSlices.map((slice) => {
              const exactFraction =
                totalCentavos > 0
                  ? (slice.amountCentavos / totalCentavos) * 100
                  : slice.percentage;
              const midPercent = labelAccPercent + exactFraction / 2;
              labelAccPercent += exactFraction;
              if (slice.percentage < 8) return null;

              // Convert clockwise-from-top percentage to radians
              const angleRad = ((midPercent / 100) * 360 - 90) * (Math.PI / 180);
              const x = center + radius * Math.cos(angleRad);
              const y = center + radius * Math.sin(angleRad);

              return (
                <text
                  key={`${slice.chartKey}-label`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#3A2E33"
                  fontSize="11"
                  fontWeight="700"
                  className="pointer-events-none select-none tabular-numbers"
                >
                  {slice.percentage}%
                </text>
              );
            });
          })()}
        </svg>

        {/* Center Total Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-10">
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)] font-medium truncate max-w-full">
            {hoveredSlice
              ? `${hoveredSlice.icon ? `${hoveredSlice.icon} ` : ''}${hoveredSlice.category}`
              : 'Total Spent'}
          </span>
          <span className="text-2xl font-bold tracking-tight text-[var(--color-text)] tabular-numbers mt-0.5">
            {hoveredSlice ? formatPHP(hoveredSlice.amountCentavos) : formatPHP(totalCentavos)}
          </span>
          <span className="text-xs text-[var(--color-muted)] mt-0.5">
            {hoveredSlice
              ? `${hoveredSlice.percentage}% of total`
              : viewMode === 'subcategory'
              ? `${activeSlices.length} ${activeSlices.length === 1 ? 'subcategory' : 'subcategories'}`
              : `${activeSlices.length} active ${activeSlices.length === 1 ? 'category' : 'categories'}`}
          </span>
        </div>
      </div>

      {/* Optional By category / By subcategory toggle above legend */}
      {onViewModeChange && viewMode && (
        <div className="w-full mt-3 mb-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-[10px] bg-slate-100 p-0.5 border border-[var(--color-border)]/70">
              <button
                type="button"
                onClick={() => onViewModeChange('category')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                  viewMode === 'category'
                    ? 'bg-white text-[var(--color-primary)] shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                By category
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('subcategory')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                  viewMode === 'subcategory'
                    ? 'bg-white text-[var(--color-primary)] shadow-xs'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                By subcategory
              </button>
            </div>

            {viewMode === 'subcategory' &&
              breakdownCategories &&
              breakdownCategories.length > 0 &&
              onSelectBreakdownCategory && (
                <select
                  value={selectedBreakdownCategoryId || breakdownCategories[0].id}
                  onChange={(e) => onSelectBreakdownCategory(e.target.value)}
                  aria-label="Select primary category for subcategory breakdown"
                  className="chest-input py-1 px-2.5 text-[11px] font-semibold max-w-[160px]"
                >
                  {breakdownCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              )}
          </div>
        </div>
      )}

      {/* Legend with percentages and amounts (shows all categories/subcategories) */}
      {activeSlices.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)] mt-3 text-center">
          {emptyText || 'No expenses recorded yet.'}
        </p>
      ) : (
        <div className="w-full mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {activeSlices.map((slice) => {
            const isHovered = hoveredCategory === slice.category;
            return (
              <div
                key={slice.category}
                onMouseEnter={() => setHoveredCategory(slice.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`flex items-center justify-between p-1.5 rounded-[10px] transition-colors cursor-pointer ${
                  isHovered ? 'bg-[var(--color-container)]/50' : 'hover:bg-black/[0.02]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-black/10"
                    style={{ backgroundColor: slice.color }}
                  />
                  {slice.icon && <span className="shrink-0">{slice.icon}</span>}
                  <span className="truncate text-[var(--color-text)] font-medium">
                    {slice.category}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <span className="font-semibold text-[var(--color-text)] tabular-numbers">
                    {slice.percentage}%
                  </span>
                  <span className="text-[var(--color-muted)] tabular-numbers text-[11px]">
                    ({formatPHP(slice.amountCentavos)})
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
