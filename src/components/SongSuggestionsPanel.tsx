import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Sparkles,
  Plus,
  Check,
  Disc3,
  AlertCircle,
  RefreshCw,
  Music,
} from 'lucide-react';
import {
  CatalogSong,
  DiaryMood,
  AttachedSong,
  SongEnergy,
  DiaryDetectedLanguage,
} from '../types';
import * as api from '../api';

interface SongSuggestionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  noteContent: string;
  noteMood: DiaryMood;
  noteEnergy?: SongEnergy;
  noteThemes?: string[];
  noteLanguage?: DiaryDetectedLanguage;
  noteSummary?: string;
  onSelectSong: (song: AttachedSong) => void;
}

export const SongSuggestionsPanel: React.FC<SongSuggestionsPanelProps> = ({
  isOpen,
  onClose,
  noteId,
  noteContent,
  noteMood,
  noteEnergy,
  noteThemes,
  noteLanguage,
  noteSummary,
  onSelectSong,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [suggestedSongs, setSuggestedSongs] = useState<CatalogSong[]>([]);
  const [summary, setSummary] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogSong[] | null>(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      // 1-second loading skeleton as specified
      const [res] = await Promise.all([
        api.suggestSongs({
          noteId,
          content: noteContent,
          mood: noteMood,
          energy: noteEnergy,
          themes: noteThemes,
          language: noteLanguage,
          summary: noteSummary,
        }),
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);
      setSuggestedSongs(res.songs);
      setSummary(res.summary);
    } catch (err) {
      console.error('SongSuggestionsPanel.fetchSuggestions failed:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [noteId, noteContent, noteMood, noteEnergy, noteThemes, noteLanguage, noteSummary]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults(null);
      fetchSuggestions();
    }
  }, [isOpen, fetchSuggestions]);

  // Handle Search input
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const matches = await api.searchSongCatalog(query);
      setSearchResults(matches);
    } catch (err) {
      console.error('SongSuggestionsPanel.searchSongCatalog failed:', err);
      setHasError(true);
    }
  };

  // Close without selecting: records "skipped" for the suggested songs
  const handleDismiss = () => {
    if (suggestedSongs.length > 0 && !searchResults) {
      suggestedSongs.forEach((song) => {
        api.recordSongFeedback(song.id, 'skipped', noteMood);
      });
    }
    onClose();
  };

  // Select song: records "picked" and notifies parent
  const handlePick = (song: CatalogSong) => {
    api.recordSongFeedback(song.id, 'picked', noteMood);
    onSelectSong({
      provider: 'mock',
      trackId: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      durationMs: song.durationMs,
      externalUrl: null,
      coverColor: song.coverColor,
    });
    onClose();
  };

  if (!isOpen) return null;

  const displayedSongs = searchResults !== null ? searchResults : suggestedSongs;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/35 backdrop-blur-xs flex justify-end transition-opacity duration-250">
      {/* Desktop Slide-in Panel (~420px) / Mobile Bottom Sheet */}
      <div
        className="w-full sm:max-w-md h-auto max-h-[85vh] sm:max-h-full sm:h-full bg-white rounded-t-[24px] sm:rounded-t-none sm:rounded-l-[24px] shadow-2xl border-t sm:border-t-0 sm:border-l border-[var(--color-border)] flex flex-col justify-between self-end sm:self-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-250"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-panel-title"
      >
        {/* Panel Header */}
        <div className="p-5 pb-3 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[var(--color-primary)]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Attached Song Recommender
                </span>
              </div>
              <h3
                id="song-panel-title"
                className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans'] mt-0.5"
              >
                Songs that fit this entry
              </h3>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-text)] transition-colors cursor-pointer"
              aria-label="Close song suggestions"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* One-line summary of what was understood */}
          {!isLoading && !hasError && summary && (
            <p className="text-xs text-[var(--color-muted)] mt-1.5 font-medium leading-relaxed">
              "{summary}"
            </p>
          )}

          {/* Search field at the top */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-[var(--color-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search catalog by title or artist..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="chest-input w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Panel Body: Loading / Error / Empty / List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            /* Loading Skeleton (approx 1 second) */
            <div className="space-y-3 py-2 animate-pulse">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-[16px] border border-[var(--color-border)]/60 flex items-center gap-3 bg-slate-50/60"
                >
                  <div className="w-12 h-12 rounded-[12px] bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-3.5 bg-slate-200 rounded" />
                    <div className="w-1/2 h-2.5 bg-slate-200 rounded" />
                    <div className="w-4/5 h-2 bg-slate-100 rounded" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                </div>
              ))}
            </div>
          ) : hasError ? (
            /* Error State with Retry */
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-text)]">
                {api.GENERIC_USER_ERROR}
              </h4>
              <button
                type="button"
                onClick={fetchSuggestions}
                className="chest-button-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : displayedSongs.length === 0 ? (
            /* Empty Search State */
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--color-container)]/40 text-[var(--color-muted)] flex items-center justify-center mx-auto">
                <Disc3 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-text)]">
                No matching songs found.
              </h4>
              <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">
                Try searching manually or clear the search query to see recommendations.
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="chest-button-secondary px-3.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            /* List of Song Rows */
            <div className="space-y-2.5">
              {displayedSongs.map((song) => (
                <div
                  key={song.id}
                  className="p-3 rounded-[16px] bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)]/60 hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 48px rounded square cover placeholder */}
                    <div
                      style={{ backgroundColor: song.coverColor }}
                      className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0 border border-black/5 shadow-xs text-slate-700"
                    >
                      <Music className="w-5 h-5 opacity-70" />
                    </div>

                    {/* Title, Artist, & "Why it fits" line */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs sm:text-sm font-bold text-[var(--color-text)] truncate font-['Plus_Jakarta_Sans']">
                          {song.title}
                        </h5>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {song.language}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] truncate font-medium">
                        {song.artist} <span className="opacity-60">·</span> {song.album}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)]/90 truncate italic mt-0.5">
                        {song.whyItFits}
                      </p>
                    </div>
                  </div>

                  {/* Round Select Button (>= 44px touch target) */}
                  <button
                    type="button"
                    onClick={() => handlePick(song)}
                    aria-label={`Select ${song.title} by ${song.artist}`}
                    className="w-11 h-11 rounded-full bg-[var(--color-container)] hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-95"
                    title="Attach to note"
                  >
                    <Plus className="w-5 h-5 stroke-[2.2]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-slate-50/60 rounded-b-[24px] sm:rounded-b-none text-center shrink-0">
          <p className="text-[11px] text-[var(--color-muted)]">
            Chestlist adapts to songs you pick or skip to personalize recommendations.
          </p>
        </div>
      </div>
    </div>
  );
};
