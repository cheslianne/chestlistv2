import React, { useEffect, useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { ChecklistMascot } from './ChecklistMascot';
import { ChecklistProgressInfo } from '../types';

interface ChecklistCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ChecklistProgressInfo;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

export const ChecklistCelebrationModal: React.FC<ChecklistCelebrationModalProps> = ({
  isOpen,
  onClose,
  progress,
}) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  // Generate 1.5s confetti burst when modal opens
  useEffect(() => {
    if (isOpen) {
      const colors = ['#F5C036', '#FF708F', '#7AD3FF', '#B388FF', '#69F0AE', '#FF9F43'];
      const pieces: ConfettiPiece[] = Array.from({ length: 42 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage across modal
        y: -10 - Math.random() * 20, // starts above modal
        color: colors[i % colors.length],
        size: Math.floor(Math.random() * 8) + 6,
        rotation: Math.floor(Math.random() * 360),
        delay: Math.random() * 0.4,
      }));
      setConfetti(pieces);

      // Clean up / stop confetti after 1.5s
      const timer = setTimeout(() => {
        setConfetti([]);
      }, 1800);
      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-modal-title"
    >
      {/* Falling Confetti Pieces */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10" aria-hidden="true">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute rounded-xs motion-reduce:opacity-0"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: `${c.size}px`,
              height: `${c.size * 0.6}px`,
              backgroundColor: c.color,
              transform: `rotate(${c.rotation}deg)`,
              animation: `confettiFall 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${c.delay}s forwards`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(0.8);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(420px) rotate(720deg) scale(1);
            opacity: 0;
          }
        }
      `}</style>

      {/* Modal Card */}
      <div className="relative w-full max-w-sm rounded-[24px] bg-white border border-[var(--color-border)] p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200 z-20">
        {/* Close icon button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          aria-label="Close celebration modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mini badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#3D7950] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>All Tasks Completed!</span>
        </div>

        {/* Mascot in crowned jumping State 5 */}
        <div className="py-2">
          <ChecklistMascot
            progress={{
              ...progress,
              mascotState: 5,
              mascotCaption: 'Congratulations, you completed your tasks!',
            }}
            size="md"
            showProgressBar={false}
          />
        </div>

        <h3
          id="celebration-modal-title"
          className="text-lg font-bold text-[var(--color-text)] font-['Plus_Jakarta_Sans'] mt-2"
        >
          Congratulations!
        </h3>
        <p className="text-xs text-[var(--color-muted)] mt-1.5 max-w-xs mx-auto leading-relaxed">
          You finished every task on your checklist. Take a breath, celebrate your momentum, and enjoy your day!
        </p>

        {/* Close button with 44px touch target */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] chest-button-primary py-2.5 px-6 text-sm font-semibold cursor-pointer shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
