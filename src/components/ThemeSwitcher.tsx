import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { ThemeName } from '../types';

interface ThemeSwitcherProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export const THEMES_LIST: Array<{
  id: ThemeName;
  label: string;
  primary: string;
  container: string;
  surface: string;
  textColor: string;
}> = [
  {
    id: 'blush',
    label: 'Blush',
    primary: '#945366',
    container: '#FFD9E1',
    surface: '#FFF8F8',
    textColor: '#2B1C20',
  },
  {
    id: 'sage',
    label: 'Sage',
    primary: '#52795D',
    container: '#D9EDD8',
    surface: '#EFFDF1',
    textColor: '#1D3323',
  },
  {
    id: 'sky',
    label: 'Sky',
    primary: '#3B82F6',
    container: '#DBEAFE',
    surface: '#F0F7FF',
    textColor: '#1E3A5F',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    primary: '#8B5CF6',
    container: '#EDE9FE',
    surface: '#FAF7FF',
    textColor: '#37285B',
  },
];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-container)]/60 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer"
        aria-label="Switch pastel color theme"
        title="Switch theme"
        aria-expanded={isOpen}
      >
        <Palette className="w-5 h-5 text-[var(--color-text)]" strokeWidth={1.75} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Select color theme"
          className="absolute right-0 mt-2 w-56 p-3 bg-white rounded-[20px] shadow-lg border border-[var(--color-border)] z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] px-1 mb-2.5">
            Pastel Palette
          </div>

          <div className="grid grid-cols-2 gap-2">
            {THEMES_LIST.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-[12px] border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-container)]/30'
                      : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border border-black/10 shadow-xs"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-text)] truncate">
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-muted)] text-center">
            Smooth 400ms transition
          </p>
        </div>
      )}
    </div>
  );
};
