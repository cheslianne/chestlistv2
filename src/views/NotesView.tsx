import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Lock,
  Search,
  Plus,
  MapPin,
  Calendar,
  Sparkles,
  Smile,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  X,
  FileText,
  AlertCircle,
  Disc3,
  Loader2,
  Languages,
} from 'lucide-react';
import {
  AttachedSong,
  DiaryEntry,
  DiaryMood,
  DiaryMoodSource,
  DiaryDetectedLanguage,
  SongEnergy,
  DiarySticker,
  ChecklistItem,
} from '../types';
import * as api from '../api';
import { AttachedSongPlayer } from '../components/AttachedSongPlayer';
import { SongSuggestionsPanel } from '../components/SongSuggestionsPanel';
import { ChecklistTab } from '../components/ChecklistTab';
import { NotesPinGate } from '../components/NotesPinGate';

function createDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const AVAILABLE_STICKERS = [
  '🌸', '☕', '🌿', '🌟', '🎀', '✨', '🧸', '🐱', '📖', '☁️', '🥪', '🎨',
];

const EMOJI_PALETTE = [
  '😊', '😌', '🥰', '🎉', '✨', '😴', '😰', '😢', '😠', '🥺', '💭', '🌿',
  '☕', '🍵', '🥪', '🍛', '🧋', '🍰', '🌸', '🌻', '📚', '🎒', '🎧', '🌙',
];

interface NotesViewProps {
  entries: DiaryEntry[];
  checklistItems?: ChecklistItem[];
  activeTab: 'diary' | 'checklist';
  onTabChange: (tab: 'diary' | 'checklist') => void;
  isDiaryUnlocked: boolean;
  onUnlockDiary: () => void;
  onBackToDashboard: () => void;
  onSaveEntry: (
    data: Parameters<typeof api.saveDiaryEntry>[0],
    options?: { silent?: boolean }
  ) => Promise<DiaryEntry>;
  onDeleteEntry: (id: string) => Promise<boolean>;
  onLockNow: () => void;
  onRefreshChecklist?: () => Promise<void>;
  autoReadMoodOnSave?: boolean;
  showToast?: (message: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  entries,
  checklistItems,
  activeTab,
  onTabChange,
  isDiaryUnlocked,
  onUnlockDiary,
  onBackToDashboard,
  onSaveEntry,
  onDeleteEntry,
  onLockNow,
  onRefreshChecklist,
  autoReadMoodOnSave = true,
  showToast,
}) => {
  // Local checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(checklistItems || []);
  const [notesError, setNotesError] = useState<{ message: string; retry: () => void } | null>(null);

  const fetchChecklistSafe = () => {
    setNotesError(null);
    api.getChecklist().then(setChecklist).catch((err) => {
      console.error('[Chestlist][NotesView][getChecklist]', err);
      setNotesError({
        message: api.getUserSafeErrorMessage(err),
        retry: fetchChecklistSafe,
      });
    });
  };

  useEffect(() => {
    if (checklistItems) {
      setChecklist(checklistItems);
    } else {
      fetchChecklistSafe();
    }
  }, [checklistItems]);

  const reloadChecklist = async () => {
    try {
      setNotesError(null);
      const latest = await api.getChecklist();
      setChecklist(latest);
      if (onRefreshChecklist) {
        await onRefreshChecklist();
      }
    } catch (err) {
      console.error('[Chestlist][NotesView][reloadChecklist]', err);
      setNotesError({
        message: api.getUserSafeErrorMessage(err),
        retry: reloadChecklist,
      });
    }
  };

  // Search & Mood Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');

  // Selected Entry for Editor (null = new draft) & per-draft ID
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string>(() => createDraftId());

  // Editor form state
  const [editorDate, setEditorDate] = useState<string>(() => api.getManilaDateString());
  const [editorContent, setEditorContent] = useState<string>('');
  const [editorMood, setEditorMood] = useState<DiaryMood>('Calm');
  const [moodSource, setMoodSource] = useState<DiaryMoodSource>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<DiaryDetectedLanguage | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
  const [aiEnergy, setAiEnergy] = useState<SongEnergy | undefined>(undefined);
  const [aiThemes, setAiThemes] = useState<string[] | undefined>(undefined);
  const [analyzedHash, setAnalyzedHash] = useState<string | undefined>(undefined);
  const [isPlaceLabelEnabled, setIsPlaceLabelEnabled] = useState(false);
  const [editorLocation, setEditorLocation] = useState('');
  const [editorStickers, setEditorStickers] = useState<DiarySticker[]>([]);
  const [editorAttachedSong, setEditorAttachedSong] = useState<AttachedSong | null>(null);

  // Popovers & UI helpers
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [isSongPanelOpen, setIsSongPanelOpen] = useState(false);
  const [isPreparingSongs, setIsPreparingSongs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [readingEntryId, setReadingEntryId] = useState<string | null>(null);
  const [readingNotice, setReadingNotice] = useState<{
    type: 'limit' | 'error';
    message: string;
    retryPayload?: {
      entryId: string;
      content: string;
      snapshot?: DiaryEntry;
    };
  } | null>(null);

  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);
  const readingEntryIdsRef = useRef<Set<string>>(new Set());
  const readingPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  const currentEditorEntryId = selectedEntryId || draftId;
  const activeEntryIdRef = useRef<string>(currentEditorEntryId);
  activeEntryIdRef.current = currentEditorEntryId;
  const moodSourceRef = useRef<DiaryMoodSource>(moodSource);
  moodSourceRef.current = moodSource;
  const editorContentRef = useRef<string>(editorContent);
  editorContentRef.current = editorContent;

  // Weekly mood summary week offset (0 = current week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Dragging sticker state
  const paperRef = useRef<HTMLDivElement>(null);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);

  const handleStartNewDraft = () => {
    setSelectedEntryId(null);
    setDraftId(createDraftId());
    setEditorDate(api.getManilaDateString());
    setEditorContent('');
    setEditorMood('Calm');
    setMoodSource('auto');
    setDetectedLanguage(undefined);
    setAiSummary(undefined);
    setAiEnergy(undefined);
    setAiThemes(undefined);
    setAnalyzedHash(undefined);
    setReadingNotice(null);
    setIsPlaceLabelEnabled(false);
    setEditorLocation('');
    setEditorStickers([]);
    setEditorAttachedSong(null);
    setIsMoodPickerOpen(false);
    setIsEmojiPickerOpen(false);
    setIsStickerPickerOpen(false);
  };

  const handleSelectEntry = (entry: DiaryEntry) => {
    setSelectedEntryId(entry.id);
    setEditorDate(entry.date);
    setEditorContent(entry.content);
    setEditorMood(entry.mood);
    setMoodSource(entry.moodSource);
    setDetectedLanguage(entry.detectedLanguage);
    setAiSummary(entry.aiSummary);
    setAiEnergy(entry.aiEnergy);
    setAiThemes(entry.aiThemes);
    setAnalyzedHash(entry.analyzedHash);
    setReadingNotice(null);
    setIsPlaceLabelEnabled(Boolean(entry.location));
    setEditorLocation(entry.location || '');
    setEditorStickers(entry.stickers || []);
    setEditorAttachedSong(entry.attachedSong || null);
    setIsMoodPickerOpen(false);
    setIsEmojiPickerOpen(false);
    setIsStickerPickerOpen(false);
  };

  // Clear transient editor/modal state whenever diary becomes locked
  useEffect(() => {
    if (!isDiaryUnlocked) {
      handleStartNewDraft();
      setDeletingEntryId(null);
      setIsSongPanelOpen(false);
    }
  }, [isDiaryUnlocked]);

  // Focus Cancel by default and handle Escape on delete confirmation modal
  useEffect(() => {
    if (!deletingEntryId) return;
    cancelDeleteBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeletingRef.current) {
        setDeletingEntryId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingEntryId]);

  const handleContentChange = (val: string) => {
    setEditorContent(val);
    if (readingNotice && readingNotice.type === 'error') {
      setReadingNotice(null);
    }
  };

  const runAiMoodReading = async (params: {
    entryId: string;
    content: string;
    currentMoodSource: DiaryMoodSource;
    currentAnalyzedHash?: string;
    entrySnapshot?: DiaryEntry;
    forceFresh?: boolean;
  }): Promise<void> => {
    const trimmed = params.content.trim();
    if (api.countDiaryWords(trimmed) < 3) return;
    if (params.currentMoodSource === 'user') return;

    const textHash = api.hashDiaryText(trimmed);
    if (
      !params.forceFresh &&
      params.currentMoodSource === 'ai' &&
      params.currentAnalyzedHash === textHash
    ) {
      return;
    }

    if (readingEntryIdsRef.current.has(params.entryId)) {
      const existingPromise = readingPromisesRef.current.get(params.entryId);
      if (existingPromise) {
        await existingPromise;
      }
      return;
    }

    readingEntryIdsRef.current.add(params.entryId);
    setReadingEntryId(params.entryId);
    if (activeEntryIdRef.current === params.entryId) {
      setReadingNotice(null);
    }

    const promise = (async () => {
      try {
        const result = await api.analyzeDiaryNote({
          entryId: params.entryId,
          content: trimmed,
        });

        const userOverrodeCurrent =
          activeEntryIdRef.current === params.entryId && moodSourceRef.current === 'user';
        if (userOverrodeCurrent) return;

        if (
          activeEntryIdRef.current === params.entryId &&
          editorContentRef.current.trim() === trimmed
        ) {
          setEditorMood(result.mood);
          setMoodSource('ai');
          setDetectedLanguage(result.language);
          setAiSummary(result.summary);
          setAiEnergy(result.energy);
          setAiThemes(result.themes);
          setAnalyzedHash(result.analyzedHash);
          setReadingNotice(null);
        }

        const snapshot =
          params.entrySnapshot || entries.find((e) => e.id === params.entryId);
        if (snapshot) {
          await onSaveEntry(
            {
              id: params.entryId,
              date: snapshot.date,
              content: trimmed,
              mood: result.mood,
              moodSource: 'ai',
              detectedLanguage: result.language,
              aiSummary: result.summary,
              aiEnergy: result.energy,
              aiThemes: result.themes,
              analyzedHash: result.analyzedHash,
              location: snapshot.location,
              stickers: snapshot.stickers,
              attachedSong: snapshot.attachedSong ?? null,
            },
            { silent: true }
          );
        }
      } catch (err) {
        if (err instanceof api.DailyReadingLimitError) {
          if (activeEntryIdRef.current === params.entryId) {
            setReadingNotice({
              type: 'limit',
              message: 'Daily reading limit reached. You can still pick a mood yourself.',
            });
          }
          return;
        }

        const userOverrodeCurrent =
          activeEntryIdRef.current === params.entryId && moodSourceRef.current === 'user';
        if (userOverrodeCurrent) return;

        const estimate = api.detectMoodFromText(trimmed);
        if (
          activeEntryIdRef.current === params.entryId &&
          editorContentRef.current.trim() === trimmed
        ) {
          setEditorMood(estimate.mood);
          setMoodSource('estimate');
          setDetectedLanguage(undefined);
          setAiSummary(undefined);
          setAiEnergy(undefined);
          setAiThemes(undefined);
          setAnalyzedHash(undefined);
          setReadingNotice({
            type: 'error',
            message: "Couldn't read your entry. Using a simple estimate instead.",
            retryPayload: {
              entryId: params.entryId,
              content: trimmed,
              snapshot: params.entrySnapshot,
            },
          });
        }

        const snapshot =
          params.entrySnapshot || entries.find((e) => e.id === params.entryId);
        if (snapshot) {
          try {
            await onSaveEntry(
              {
                id: params.entryId,
                date: snapshot.date,
                content: trimmed,
                mood: estimate.mood,
                moodSource: 'estimate',
                location: snapshot.location,
                stickers: snapshot.stickers,
                attachedSong: snapshot.attachedSong ?? null,
              },
              { silent: true }
            );
          } catch (saveErr) {
            console.warn('[Chestlist][NotesView][saveEstimateFallback]', saveErr);
          }
        }
      } finally {
        readingEntryIdsRef.current.delete(params.entryId);
        readingPromisesRef.current.delete(params.entryId);
        setReadingEntryId((prev) => (prev === params.entryId ? null : prev));
      }
    })();

    readingPromisesRef.current.set(params.entryId, promise);
    await promise;
  };

  // Word count
  const wordCount = useMemo(() => {
    return editorContent.trim() ? editorContent.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [editorContent]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesMood =
        selectedMoodFilter === 'all' || e.mood === selectedMoodFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.content.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.formattedDate && e.formattedDate.toLowerCase().includes(q));
      return matchesMood && matchesSearch;
    });
  }, [entries, selectedMoodFilter, searchQuery]);

  // Weekly Mood Summary computation
  const { currentWeekLabel, weekMoodSlices, totalWeekEntries } = useMemo(() => {
    const today = api.getToday();
    // Shift date by weekOffset * 7 days
    const targetDate = new Date(today.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
    const dayOfWeek = targetDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const formatShort = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekLabel = `${formatShort(monday)} – ${formatShort(sunday)}, ${monday.getFullYear()}`;

    const weekEntries = entries.filter((e) => {
      const [y, m, d] = e.date.split('-').map(Number);
      const entryDt = new Date(y, m - 1, d, 12, 0, 0);
      return entryDt >= monday && entryDt <= sunday;
    });

    const counts: Record<string, number> = {};
    for (const entry of weekEntries) {
      counts[entry.mood] = (counts[entry.mood] || 0) + 1;
    }

    const total = weekEntries.length;
    const slices = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([moodKey, count]) => {
        const exact = total > 0 ? (count / total) * 100 : 0;
        const floor = Math.floor(exact);
        return {
          moodKey,
          count,
          pct: floor,
          remainder: exact - floor,
        };
      });

    if (total > 0 && slices.length > 0) {
      const remainingPct = 100 - slices.reduce((sum, s) => sum + s.pct, 0);
      const byRemainder = [...slices].sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < remainingPct && i < byRemainder.length; i++) {
        byRemainder[i].pct += 1;
      }
    }

    return {
      currentWeekLabel: weekLabel,
      weekMoodSlices: slices,
      totalWeekEntries: total,
    };
  }, [entries, weekOffset]);

  // Save handler with idempotent upsert & double-tap protection
  const handleSave = async () => {
    const trimmed = editorContent.trim();
    if (!trimmed || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);

    const contentHash = api.hashDiaryText(trimmed);
    const aiReadingMatches = Boolean(
      moodSource === 'ai' && analyzedHash && analyzedHash === contentHash
    );

    try {
      setNotesError(null);
      const saved = await onSaveEntry({
        id: selectedEntryId || draftId,
        date: editorDate,
        content: trimmed,
        mood: editorMood,
        moodSource,
        detectedLanguage: aiReadingMatches ? detectedLanguage : undefined,
        aiSummary: aiReadingMatches ? aiSummary : undefined,
        aiEnergy: aiReadingMatches ? aiEnergy : undefined,
        aiThemes: aiReadingMatches ? aiThemes : undefined,
        analyzedHash: aiReadingMatches ? analyzedHash : undefined,
        location: isPlaceLabelEnabled ? editorLocation.trim() : undefined,
        stickers: editorStickers,
        attachedSong: editorAttachedSong,
      });

      activeEntryIdRef.current = saved.id;
      setSelectedEntryId(saved.id);
      setDraftId(createDraftId());

      if (autoReadMoodOnSave && saved.moodSource !== 'user') {
        void runAiMoodReading({
          entryId: saved.id,
          content: saved.content,
          currentMoodSource: saved.moodSource,
          currentAnalyzedHash: saved.analyzedHash,
          entrySnapshot: saved,
        });
      }
    } catch (err) {
      console.error('[Chestlist][NotesView][saveEntry]', err);
      setNotesError({
        message: api.getUserSafeErrorMessage(err),
        retry: handleSave,
      });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleOpenSongSuggestions = async () => {
    const trimmed = editorContent.trim();
    if (!trimmed || isPreparingSongs) return;

    const entryId = selectedEntryId || draftId;
    const currentHash = api.hashDiaryText(trimmed);
    const hasUpToDateReading = moodSource === 'ai' && analyzedHash === currentHash;

    if (
      !hasUpToDateReading &&
      moodSource !== 'user' &&
      api.countDiaryWords(trimmed) >= 3
    ) {
      setIsPreparingSongs(true);
      try {
        const snapshot = selectedEntryId
          ? entries.find((e) => e.id === selectedEntryId)
          : undefined;
        await runAiMoodReading({
          entryId,
          content: trimmed,
          currentMoodSource: moodSource,
          currentAnalyzedHash: analyzedHash,
          entrySnapshot: snapshot,
        });
      } finally {
        setIsPreparingSongs(false);
      }
    }

    setIsSongPanelOpen(true);
  };

  const handleManualReadEntry = () => {
    const entryId = selectedEntryId || draftId;
    const snapshot = selectedEntryId
      ? entries.find((e) => e.id === selectedEntryId)
      : undefined;
    void runAiMoodReading({
      entryId,
      content: editorContent,
      currentMoodSource: moodSource,
      currentAnalyzedHash: analyzedHash,
      entrySnapshot: snapshot,
      forceFresh: true,
    });
  };

  // Sticker actions
  const addSticker = (key: string) => {
    const newSticker: DiarySticker = {
      id: `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      key,
      x: 30 + Math.floor(Math.random() * 40),
      y: 20 + Math.floor(Math.random() * 50),
      rotation: Math.floor(Math.random() * 30) - 15, // -15 to +15 deg
    };
    setEditorStickers((prev) => [...prev, newSticker]);
    setIsStickerPickerOpen(false);
  };

  const removeSticker = (id: string) => {
    setEditorStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const rotateSticker = (id: string, deltaDeg: number) => {
    setEditorStickers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        let nextRot = s.rotation + deltaDeg;
        if (nextRot > 15) nextRot = -15;
        if (nextRot < -15) nextRot = 15;
        return { ...s, rotation: nextRot };
      })
    );
  };

  // Dragging sticker over paper
  const handlePaperMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingStickerId || !paperRef.current) return;
    const rect = paperRef.current.getBoundingClientRect();
    const xPct = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(5, Math.min(95, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    setEditorStickers((prev) =>
      prev.map((s) => (s.id === draggingStickerId ? { ...s, x: xPct, y: yPct } : s))
    );
  };

  const handlePaperMouseUp = () => {
    if (draggingStickerId) {
      setDraggingStickerId(null);
    }
  };

  // Insert emoji into textarea
  const insertEmoji = (emoji: string) => {
    const nextContent = editorContent + emoji;
    setEditorContent(nextContent);
    setIsEmojiPickerOpen(false);
  };

  return (
    <div
      className="space-y-6 pb-20 md:pb-12 animate-in fade-in duration-300"
      onMouseMove={handlePaperMouseMove}
      onMouseUp={handlePaperMouseUp}
    >
      {/* SCREEN 2: NOTES HUB HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[var(--color-container)] flex items-center justify-center text-[var(--color-primary)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight font-['Plus_Jakarta_Sans']">
              Notes
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted)]">
              Your safe pastel diary & daily bullet checklists
            </p>
          </div>
        </div>

        {/* Tab Switcher & Lock Now */}
        <div className="flex items-center gap-3">
          {/* Pill Tabs: Diary and Checklist */}
          <div className="p-1 rounded-full bg-white border border-[var(--color-border)] flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => onTabChange('diary')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'diary'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Diary
            </button>
            <button
              type="button"
              onClick={() => onTabChange('checklist')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Checklist
            </button>
          </div>

          {/* Small "Lock now" button: shown only on Diary tab while unlocked */}
          {activeTab === 'diary' && isDiaryUnlocked && (
            <button
              type="button"
              onClick={onLockNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/50 text-xs font-medium shadow-xs transition-colors cursor-pointer"
              title="Lock your diary"
            >
              <Lock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span className="hidden sm:inline">Lock now</span>
            </button>
          )}
        </div>
      </div>

      {notesError && (
        <div
          role="alert"
          className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-[#A84255] text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{notesError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const fn = notesError.retry;
              setNotesError(null);
              fn();
            }}
            className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* CHECKLIST TAB */}
      {activeTab === 'checklist' && (
        <ChecklistTab
          items={checklist}
          onRefresh={reloadChecklist}
          showToast={showToast}
        />
      )}

      {/* SCREEN 3: DIARY TAB */}
      {activeTab === 'diary' && !isDiaryUnlocked && (
        <NotesPinGate
          onUnlock={onUnlockDiary}
          onBackToDashboard={onBackToDashboard}
        />
      )}

      {activeTab === 'diary' && isDiaryUnlocked && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: ~35% (lg:col-span-4 or 5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Weekly Mood Summary Card */}
            <div className="chest-card p-4 sm:p-5 bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/60">
                <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Weekly Mood Summary
                </span>
                {/* Week switcher */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    className="p-1 rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors"
                    title="Previous week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-medium text-[var(--color-muted)] px-1">
                    {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${weekOffset}w`}
                  </span>
                  <button
                    onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                    disabled={weekOffset >= 0}
                    className="p-1 rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors disabled:opacity-30"
                    title="Next week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[var(--color-muted)]">
                {currentWeekLabel}
              </div>

              {totalWeekEntries === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--color-muted)]">
                  No reflections recorded for this week.
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {/* Segmented bar */}
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 border border-[var(--color-border)]">
                    {weekMoodSlices.map(({ moodKey, count, pct }) => {
                      const cfg = api.MOOD_CONFIGS[moodKey as DiaryMood] || api.MOOD_CONFIGS.Calm;
                      return (
                        <div
                          key={moodKey}
                          style={{ width: `${pct}%`, backgroundColor: cfg.bg }}
                          className="h-full border-r border-white/50 first:rounded-l-full last:rounded-r-full transition-all"
                          title={`${cfg.label}: ${count} (${pct}%)`}
                          aria-label={`${cfg.label} ${pct}%`}
                        />
                      );
                    })}
                  </div>

                  {/* Mood breakdown chips legend */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {weekMoodSlices.map(({ moodKey, pct }) => {
                      const cfg = api.MOOD_CONFIGS[moodKey as DiaryMood] || api.MOOD_CONFIGS.Calm;
                      return (
                        <span
                          key={moodKey}
                          style={{
                            backgroundColor: cfg.bg,
                            color: cfg.text,
                            borderColor: cfg.border,
                          }}
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1"
                        >
                          <span>{cfg.emoji}</span>
                          <span>{cfg.label}</span>
                          <span className="opacity-80">· {pct}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Search & Mood Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--color-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search diary entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="chest-input w-full pl-9 pr-3 py-2 text-xs"
                />
              </div>

              {/* Mood Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-[var(--color-muted)] shrink-0 font-medium">
                  Mood:
                </label>
                <select
                  value={selectedMoodFilter}
                  onChange={(e) => setSelectedMoodFilter(e.target.value)}
                  className="chest-input flex-1 px-2.5 py-1.5 text-xs bg-white cursor-pointer"
                >
                  <option value="all">All moods</option>
                  {(Object.keys(api.MOOD_CONFIGS) as DiaryMood[]).map((m) => (
                    <option key={m} value={m}>
                      {api.MOOD_CONFIGS[m].emoji} {api.MOOD_CONFIGS[m].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. "New Note" Card that expands on hover/tap */}
            <div
              onClick={handleStartNewDraft}
              className="chest-card p-4 bg-[var(--color-container)]/30 border-dashed border-2 border-[var(--color-primary)]/40 hover:border-[var(--color-primary)] hover:bg-[var(--color-container)]/50 transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-text)]">
                    Write a new entry
                  </h4>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Reflect on your day, campus thoughts, or small wins
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--color-primary)] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>

            {/* 4. Entries List */}
            {filteredEntries.length === 0 ? (
              <div className="chest-card p-8 text-center bg-white">
                <Smile className="w-7 h-7 text-[var(--color-muted)] mx-auto mb-2 opacity-50" />
                <h5 className="text-sm font-bold text-[var(--color-text)]">
                  No entries yet. Write your first one.
                </h5>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Documenting your days brings peace and clarity.
                </p>
                <button
                  type="button"
                  onClick={handleStartNewDraft}
                  className="chest-button-primary mt-3 px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Write first entry
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {filteredEntries.map((entry) => {
                  const isSelected = selectedEntryId === entry.id;
                  const cfg = api.MOOD_CONFIGS[entry.mood] || api.MOOD_CONFIGS.Calm;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleSelectEntry(entry)}
                      className={`chest-card p-4 bg-white transition-all cursor-pointer hover:border-[var(--color-primary)]/60 ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--ring-focus)] shadow-md'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans']">
                          {entry.formattedDate}
                        </span>

                        {/* Mood & Language Pills */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {entry.detectedLanguage && entry.moodSource === 'ai' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[var(--color-muted)] border border-slate-200">
                              {entry.detectedLanguage}
                            </span>
                          )}
                          <span
                            style={{
                              backgroundColor: cfg.bg,
                              color: cfg.text,
                              borderColor: cfg.border,
                            }}
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 shrink-0"
                          >
                            <span>{cfg.emoji}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Line clamp 2 of content */}
                      <p className="text-xs text-[var(--color-text)]/80 line-clamp-2 leading-relaxed">
                        {entry.content}
                      </p>

                      {/* Footer: location, song, stickers & always-visible edit/delete actions */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-[var(--color-border)]/40 text-[11px] text-[var(--color-muted)]">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {entry.location && (
                            <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-[10px] text-[var(--color-muted)] border border-slate-200">
                              <MapPin className="w-2.5 h-2.5 text-[var(--color-primary)]" />
                              <span>{entry.location}</span>
                            </span>
                          )}
                          {entry.attachedSong && (
                            <span
                              className="flex items-center gap-1 bg-[var(--color-container)]/70 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--color-border)]"
                              title={`Attached song: ${entry.attachedSong.title} by ${entry.attachedSong.artist}`}
                            >
                              <Disc3 className="w-3 h-3 spin-vinyl shrink-0" />
                              <span className="max-w-[70px] truncate">{entry.attachedSong.title}</span>
                            </span>
                          )}
                          <span>{entry.wordCount} words</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {entry.stickers && entry.stickers.length > 0 && (
                            <div className="flex items-center gap-0.5 text-xs mr-1">
                              {entry.stickers.slice(0, 3).map((st) => (
                                <span key={st.id}>{st.key}</span>
                              ))}
                              {entry.stickers.length > 3 && (
                                <span className="text-[10px] text-[var(--color-muted)]">
                                  +{entry.stickers.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEntry(entry);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-container)]/50 transition-colors cursor-pointer"
                            aria-label="Edit entry"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingEntryId(entry.id);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[#A84255] hover:bg-rose-50 transition-colors cursor-pointer"
                            aria-label="Delete entry"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ~65% (lg:col-span-7) Soft Paper-Textured Card */}
          <div className="lg:col-span-7">
            <div
              ref={paperRef}
              className="chest-card p-6 sm:p-8 bg-[#FCFAF7] border border-[var(--color-border)] shadow-md relative min-h-[580px] flex flex-col justify-between overflow-hidden"
              style={{
                backgroundImage:
                  'radial-gradient(#E8E0D5 0.75px, transparent 0.75px)',
                backgroundSize: '20px 20px',
              }}
            >
              {/* Floating Stickers on Paper */}
              {editorStickers.map((sticker) => (
                <div
                  key={sticker.id}
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingStickerId(sticker.id);
                  }}
                  className={`absolute z-10 select-none group cursor-grab active:cursor-grabbing text-3xl animate-sticker-bounce transition-transform duration-75`}
                  title="Drag to reposition or click icons to rotate/delete"
                >
                  <span className="drop-shadow-sm">{sticker.key}</span>

                  {/* Hover controls for rotate & delete */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs rounded-full px-1.5 py-0.5 shadow-sm border border-[var(--color-border)] flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotateSticker(sticker.id, 5);
                      }}
                      className="p-0.5 hover:text-[var(--color-primary)] cursor-pointer"
                      title="Rotate sticker"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSticker(sticker.id);
                      }}
                      className="p-0.5 hover:text-rose-600 cursor-pointer"
                      title="Remove sticker"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Editor Header: Date, Mood Tag, Location Toggle */}
              <div className="space-y-4 relative z-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]/60">
                  {/* Date line input */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                    <input
                      type="date"
                      value={editorDate}
                      onChange={(e) => setEditorDate(e.target.value)}
                      className="text-sm font-bold text-[var(--color-text)] bg-transparent border-none outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded px-1 font-['Plus_Jakarta_Sans']"
                    />
                  </div>

                  {/* Mood Tag Pill + Language Chip with picker toggle */}
                  <div className="relative flex items-center gap-2 flex-wrap">
                    {detectedLanguage &&
                      moodSource === 'ai' &&
                      readingEntryId !== currentEditorEntryId && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-[var(--color-border)] text-[var(--color-muted)] flex items-center gap-1 shadow-xs">
                          <Languages className="w-3 h-3 text-[var(--color-primary)]" />
                          <span>{detectedLanguage}</span>
                        </span>
                      )}

                    {(() => {
                      const isReadingCurrent = readingEntryId === currentEditorEntryId;
                      const cfg =
                        api.MOOD_CONFIGS[editorMood] || api.MOOD_CONFIGS.Calm;
                      const moodBadgeLabel =
                        moodSource === 'estimate'
                          ? 'estimate'
                          : moodSource === 'auto'
                          ? 'default'
                          : null;
                      return (
                        <button
                          type="button"
                          onClick={() => setIsMoodPickerOpen((prev) => !prev)}
                          style={{
                            backgroundColor: cfg.bg,
                            color: cfg.text,
                            borderColor: cfg.border,
                          }}
                          className="px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-xs cursor-pointer hover:brightness-95 transition-all"
                          title="Change mood"
                        >
                          {isReadingCurrent ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Reading your entry…</span>
                            </>
                          ) : (
                            <>
                              <span>{cfg.emoji}</span>
                              <span>{cfg.label}</span>
                              {moodBadgeLabel && (
                                <span className="text-[10px] opacity-70 underline">
                                  ({moodBadgeLabel})
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })()}

                    {/* Mood Picker Dropdown */}
                    {isMoodPickerOpen && (
                      <div className="absolute right-0 top-9 z-30 p-2 bg-white rounded-[16px] shadow-xl border border-[var(--color-border)] w-48 space-y-1 animate-in zoom-in-95 duration-100">
                        <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase px-2">
                          Select Mood
                        </span>
                        {(Object.keys(api.MOOD_CONFIGS) as DiaryMood[]).map((m) => {
                          const cfg = api.MOOD_CONFIGS[m];
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setEditorMood(m);
                                setMoodSource('user');
                                setIsMoodPickerOpen(false);
                              }}
                              className="w-full px-2 py-1.5 rounded-[8px] text-xs font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                            >
                              <span>{cfg.emoji}</span>
                              <span className="text-[var(--color-text)]">
                                {cfg.label}
                              </span>
                            </button>
                          );
                        })}
                        {moodSource === 'user' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMoodSource('auto');
                              setAnalyzedHash(undefined);
                              setIsMoodPickerOpen(false);
                            }}
                            className="w-full mt-1 pt-1.5 border-t border-[var(--color-border)]/60 px-2 py-1.5 rounded-[8px] text-[11px] font-semibold text-[var(--color-primary)] hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            Switch back to AI reading
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* One-line AI summary & Reading Notice (limit or fallback) */}
                {aiSummary && moodSource === 'ai' && (
                  <p className="text-xs italic text-[var(--color-muted)] bg-white/75 border border-[var(--color-border)]/70 rounded-[12px] px-3 py-2 leading-relaxed">
                    “{aiSummary}”
                  </p>
                )}

                {readingNotice && (
                  <div
                    role="status"
                    className={`p-2.5 px-3 rounded-[12px] text-xs flex items-center justify-between gap-2 border ${
                      readingNotice.type === 'limit'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-[#A84255]'
                    }`}
                  >
                    <span className="font-medium">{readingNotice.message}</span>
                    {readingNotice.type === 'error' && readingNotice.retryPayload && (
                      <button
                        type="button"
                        onClick={() => {
                          const payload = readingNotice.retryPayload;
                          if (!payload) return;
                          void runAiMoodReading({
                            entryId: payload.entryId,
                            content: payload.content,
                            currentMoodSource: 'estimate',
                            entrySnapshot: payload.snapshot,
                          });
                        }}
                        className="px-2.5 py-1 rounded-[8px] bg-[#A84255] text-white font-semibold hover:bg-[#933446] transition-colors cursor-pointer shrink-0"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {/* Optional Place Label Toggle */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={isPlaceLabelEnabled}
                      onChange={(e) => setIsPlaceLabelEnabled(e.target.checked)}
                      className="accent-[var(--color-primary)] w-3.5 h-3.5 rounded"
                    />
                    <span className="font-medium">Add a place label</span>
                  </label>

                  {isPlaceLabelEnabled && (
                    <div className="flex items-center gap-1.5 bg-white border border-[var(--color-border)] rounded-full px-2.5 py-1 shadow-xs animate-in fade-in duration-150">
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. Campus library, Home..."
                        value={editorLocation}
                        onChange={(e) => setEditorLocation(e.target.value)}
                        className="text-xs bg-transparent border-none outline-none text-[var(--color-text)] w-44"
                      />
                    </div>
                  )}
                </div>

                {/* Attached Song Player OR Find songs & Read my entry controls */}
                <div className="pt-1 space-y-2">
                  {editorAttachedSong ? (
                    <div className="space-y-2">
                      <AttachedSongPlayer
                        song={editorAttachedSong}
                        onChangeSong={handleOpenSongSuggestions}
                        onRemoveSong={() => setEditorAttachedSong(null)}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleManualReadEntry}
                          disabled={
                            readingEntryId === currentEditorEntryId ||
                            !editorContent.trim()
                          }
                          className="chest-button-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>Read my entry</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenSongSuggestions}
                        disabled={!editorContent.trim() || isPreparingSongs}
                        className="chest-button-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        title={
                          !editorContent.trim()
                            ? 'Write something in your note first'
                            : 'Find songs that fit this entry'
                        }
                      >
                        {isPreparingSongs ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-200" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        )}
                        <span>Find songs for this note</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleManualReadEntry}
                        disabled={
                          readingEntryId === currentEditorEntryId ||
                          !editorContent.trim()
                        }
                        className="chest-button-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <span>Read my entry</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                    {api.MOOD_ANALYSIS_PRIVACY_TEXT}
                  </p>
                </div>

                {/* Main Large Text Area (Inter 17px, line height 1.7) */}
                <div className="pt-2">
                  <textarea
                    rows={12}
                    value={editorContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="What happened today?"
                    className="w-full bg-transparent border-none outline-none resize-none text-[17px] leading-[1.7] text-[var(--color-text)] placeholder:text-[var(--color-muted)]/50 focus:ring-0"
                  />
                </div>
              </div>

              {/* Editor Bottom Toolbar: Decoration, Word Count, Actions */}
              <div className="pt-4 border-t border-[var(--color-border)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 bg-[#FCFAF7]/90 backdrop-blur-xs">
                {/* Left: Decoration Toolbar (Emoji & Stickers) */}
                <div className="flex items-center gap-2">
                  {/* Emoji Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>😊</span>
                      <span className="hidden sm:inline">Emoji</span>
                    </button>

                    {isEmojiPickerOpen && (
                      <div className="absolute left-0 bottom-10 z-30 p-2.5 bg-white rounded-[16px] shadow-xl border border-[var(--color-border)] w-56 grid grid-cols-6 gap-1 animate-in zoom-in-95 duration-100">
                        {EMOJI_PALETTE.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-base cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sticker Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsStickerPickerOpen((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-full bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">Sticker</span>
                    </button>

                    {isStickerPickerOpen && (
                      <div className="absolute left-0 bottom-10 z-30 p-3 bg-white rounded-[16px] shadow-xl border border-[var(--color-border)] w-60 animate-in zoom-in-95 duration-100">
                        <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase block mb-1.5">
                          Drop a Sticker on Paper
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {AVAILABLE_STICKERS.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => addSticker(st)}
                              className="h-10 rounded-[10px] bg-slate-50 hover:bg-[var(--color-container)]/40 flex items-center justify-center text-xl cursor-pointer transition-transform hover:scale-110"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Word Count */}
                  <span className="text-xs text-[var(--color-muted)] tabular-numbers pl-2">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </span>
                </div>

                {/* Right: Save & Delete Actions */}
                <div className="flex items-center gap-2">
                  {selectedEntryId && (
                    <button
                      type="button"
                      onClick={() => setDeletingEntryId(selectedEntryId)}
                      className="p-2 rounded-full text-[var(--color-muted)] hover:text-[#A84255] hover:bg-rose-50 transition-colors cursor-pointer"
                      aria-label="Delete entry"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !editorContent.trim()}
                    className="chest-button-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>
                      {isSaving
                        ? 'Saving…'
                        : selectedEntryId
                        ? 'Update entry'
                        : 'Save entry'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entry Confirmation Modal */}
      {isDiaryUnlocked && deletingEntryId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-diary-modal-title"
          onClick={() => {
            if (!isDeleting) setDeletingEntryId(null);
          }}
        >
          <div
            className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[var(--color-border)] animate-in zoom-in-95 duration-150 text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-[#A84255] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3
              id="delete-diary-modal-title"
              className="text-base font-bold text-[var(--color-text)]"
            >
              Delete this entry?
            </h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              This can&apos;t be undone.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                ref={cancelDeleteBtnRef}
                type="button"
                autoFocus
                disabled={isDeleting}
                onClick={() => setDeletingEntryId(null)}
                className="chest-button-secondary px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  const idToDelete = deletingEntryId;
                  if (!idToDelete || isDeletingRef.current) return;
                  isDeletingRef.current = true;
                  setIsDeleting(true);
                  try {
                    setNotesError(null);
                    await onDeleteEntry(idToDelete);
                    if (selectedEntryId === idToDelete) {
                      handleStartNewDraft();
                    }
                    setDeletingEntryId(null);
                  } catch (err) {
                    console.error('[Chestlist][NotesView][deleteEntry]', err);
                    setDeletingEntryId(null);
                    setNotesError({
                      message: api.getUserSafeErrorMessage(err),
                      retry: async () => {
                        try {
                          await onDeleteEntry(idToDelete);
                          if (selectedEntryId === idToDelete) {
                            handleStartNewDraft();
                          }
                        } catch (retryErr) {
                          console.error('[Chestlist][NotesView][deleteEntryRetry]', retryErr);
                        }
                      },
                    });
                  } finally {
                    isDeletingRef.current = false;
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-[12px] bg-[#A84255] hover:bg-[#933446] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Song Suggestions Panel / Bottom Sheet */}
      {isDiaryUnlocked && (
        <SongSuggestionsPanel
          isOpen={isSongPanelOpen}
          onClose={() => setIsSongPanelOpen(false)}
          noteId={selectedEntryId || draftId}
          noteContent={editorContent}
          noteMood={editorMood}
          noteEnergy={aiEnergy}
          noteThemes={aiThemes}
          noteLanguage={detectedLanguage}
          noteSummary={aiSummary}
          onSelectSong={(song) => setEditorAttachedSong(song)}
        />
      )}
    </div>
  );
};
