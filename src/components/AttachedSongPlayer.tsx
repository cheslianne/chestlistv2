import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Disc3, RefreshCw, Trash2, Music2 } from 'lucide-react';
import { AttachedSong } from '../types';

interface AttachedSongPlayerProps {
  song: AttachedSong;
  onChangeSong: () => void;
  onRemoveSong: () => void;
}

export const AttachedSongPlayer: React.FC<AttachedSongPlayerProps> = ({
  song,
  onChangeSong,
  onRemoveSong,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSeconds, setPreviewSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Simulated 30-second preview (strictly silent UI timer, NO audio files)
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setPreviewSeconds((prev) => {
          if (prev >= 30) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying]);

  // Reset preview when song changes
  useEffect(() => {
    setIsPlaying(false);
    setPreviewSeconds(0);
  }, [song.trackId]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const progressPercent = Math.min(100, Math.round((previewSeconds / 30) * 100));

  return (
    <div className="chest-card p-4 sm:p-5 bg-white/95 border border-[var(--color-border)] shadow-xs rounded-[20px] transition-all">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Spinning Vinyl Record Visual with Tonearm */}
        <div className="relative shrink-0 flex items-center justify-center w-[120px] h-[120px]">
          {/* Black Vinyl Disc */}
          <div
            className={`w-[110px] h-[110px] rounded-full bg-[#1A1A1A] relative shadow-md flex items-center justify-center select-none overflow-hidden ${
              isPlaying ? 'spin-vinyl' : 'spin-vinyl-paused'
            }`}
            style={{
              boxShadow:
                '0 4px 12px rgba(0,0,0,0.18), inset 0 0 0 2px #2A2A2A, inset 0 0 0 10px #1E1E1E, inset 0 0 0 18px #262626, inset 0 0 0 26px #1A1A1A',
            }}
          >
            {/* Concentric subtle grooving circles */}
            <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />

            {/* Pastel Center Label */}
            <div
              style={{ backgroundColor: song.coverColor || 'var(--color-container)' }}
              className="w-10 h-10 rounded-full border-2 border-white/80 shadow-xs flex items-center justify-center relative z-10"
            >
              {/* Spindle hole */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-white/30" />
            </div>
          </div>

          {/* Tiny Tonearm with Needle */}
          <div
            className="absolute top-1 right-2 w-8 h-12 origin-top-right transition-transform duration-500 ease-out pointer-events-none z-20"
            style={{
              transform: isPlaying ? 'rotate(18deg)' : 'rotate(-12deg)',
            }}
            aria-hidden="true"
          >
            {/* Pivot base */}
            <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-slate-400 absolute top-0 right-0 shadow-xs" />
            {/* Arm rod */}
            <div className="w-0.5 h-9 bg-slate-400 absolute top-2 right-1.5 rounded-full" />
            {/* Cartridge & Needle */}
            <div className="w-2 h-3.5 bg-slate-700 absolute bottom-0 right-1 rounded-xs shadow-xs" />
          </div>
        </div>

        {/* Song Info, Controls & Progress */}
        <div className="flex-1 w-full space-y-2.5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans'] line-clamp-1">
                  {song.title}
                </h4>
              </div>
              <p className="text-xs text-[var(--color-muted)] font-medium">
                {song.artist} <span className="opacity-60">·</span> {song.album}
              </p>
            </div>

            {/* Action buttons: Change & Remove */}
            <div className="flex items-center justify-center sm:justify-end gap-1.5 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={onChangeSong}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                title="Choose another song"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change</span>
              </button>
              <button
                type="button"
                onClick={onRemoveSong}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[var(--color-muted)] hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                title="Remove attached song"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Player Progress Bar & Play/Pause Button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
              className="w-11 h-11 rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Progress Slider / Scrub Bar */}
            <div className="flex-1 space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-[var(--color-border)]/50">
                <div
                  className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] tabular-numbers">
                <span>0:{String(previewSeconds).padStart(2, '0')}</span>
                <span className="font-medium text-[10px] uppercase tracking-wider text-[var(--color-primary)]">
                  {isPlaying ? 'Simulated Preview' : 'Paused'}
                </span>
                <span>0:30</span>
              </div>
            </div>
          </div>

          {/* Informational Muted Note */}
          <p className="text-[11px] text-[var(--color-muted)] pt-0.5 text-center sm:text-left">
            Preview plays here. Full songs will open in your music app once real songs are connected.
          </p>
        </div>
      </div>
    </div>
  );
};
