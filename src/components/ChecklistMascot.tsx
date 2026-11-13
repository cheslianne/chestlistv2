import React, { useEffect, useState, useRef } from 'react';
import { ChecklistProgressInfo } from '../types';

interface ChecklistMascotProps {
  progress: ChecklistProgressInfo;
  size?: 'sm' | 'md' | 'lg';
  showProgressBar?: boolean;
  className?: string;
}

export const ChecklistMascot: React.FC<ChecklistMascotProps> = ({
  progress,
  size = 'lg',
  showProgressBar = true,
  className = '',
}) => {
  const [prevState, setPrevState] = useState<number>(progress.mascotState);
  const [isBouncing, setIsBouncing] = useState(false);
  const prevMascotStateRef = useRef(progress.mascotState);

  // Trigger 450ms spring bounce when mascot state changes
  useEffect(() => {
    if (progress.mascotState !== prevMascotStateRef.current) {
      setPrevState(prevMascotStateRef.current);
      prevMascotStateRef.current = progress.mascotState;
      setIsBouncing(true);
      const timer = setTimeout(() => {
        setIsBouncing(false);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [progress.mascotState]);

  const state = progress.mascotState;

  // Render original Chest Mascot SVG based on state (1-5)
  const renderMascotSvg = (stateNum: 1 | 2 | 3 | 4 | 5) => {
    return (
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.12" />
          </filter>
          <linearGradient id="chestWoodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F9DA8B" />
            <stop offset="100%" stopColor="#E5B252" />
          </linearGradient>
          <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCE5A4" />
            <stop offset="100%" stopColor="#EDB95C" />
          </linearGradient>
          <linearGradient id="lockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF7C2" />
            <stop offset="100%" stopColor="#F3CF60" />
          </linearGradient>
          <linearGradient id="flagGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF7A85" />
            <stop offset="100%" stopColor="#E25563" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="100"
          cy={stateNum === 5 ? '180' : '172'}
          rx={stateNum === 5 ? '32' : '46'}
          ry={stateNum === 5 ? '6' : '9'}
          fill="#3A2E33"
          opacity={stateNum === 5 ? '0.08' : '0.12'}
          className="transition-all duration-300"
        />

        {/* Mascot Root Group with dynamic pose offset */}
        <g
          transform={
            stateNum === 5
              ? 'translate(0, -14)'
              : stateNum === 4
              ? 'translate(2, -4) rotate(3 100 120)'
              : 'translate(0, 0)'
          }
        >
          {/* Feet / Feet Poses */}
          {stateNum === 1 && (
            // Droopy resting feet
            <g>
              <ellipse cx="78" cy="164" rx="10" ry="6" fill="#C9943B" />
              <ellipse cx="122" cy="164" rx="10" ry="6" fill="#C9943B" />
            </g>
          )}

          {stateNum === 2 && (
            // Little standing feet
            <g>
              <ellipse cx="80" cy="163" rx="11" ry="6.5" fill="#C9943B" />
              <ellipse cx="120" cy="163" rx="11" ry="6.5" fill="#C9943B" />
            </g>
          )}

          {stateNum === 3 && (
            // Walking feet (one forward, one back)
            <g>
              <ellipse cx="74" cy="161" rx="11" ry="7" fill="#C9943B" transform="rotate(-6 74 161)" />
              <ellipse cx="126" cy="164" rx="11" ry="6" fill="#C9943B" transform="rotate(8 126 164)" />
            </g>
          )}

          {stateNum === 4 && (
            // Running feet
            <g>
              <ellipse cx="70" cy="166" rx="12" ry="6" fill="#C9943B" transform="rotate(-15 70 166)" />
              <ellipse cx="132" cy="158" rx="12" ry="6" fill="#C9943B" transform="rotate(18 132 158)" />
            </g>
          )}

          {stateNum === 5 && (
            // Jumping feet tucked up
            <g>
              <ellipse cx="76" cy="158" rx="10" ry="7" fill="#C9943B" transform="rotate(-20 76 158)" />
              <ellipse cx="124" cy="158" rx="10" ry="7" fill="#C9943B" transform="rotate(20 124 158)" />
            </g>
          )}

          {/* Main Chest Body (Round soft box with gentle curves) */}
          <g filter="url(#soft-shadow)">
            {/* Lower Body Box */}
            <rect
              x="52"
              y="90"
              width="96"
              height="70"
              rx="18"
              fill="url(#chestWoodGrad)"
              stroke="#8C6326"
              strokeWidth="1.5"
            />

            {/* Domed Lid */}
            <path
              d="M 50 92 C 50 68, 68 56, 100 56 C 132 56, 150 68, 150 92 Z"
              fill="url(#lidGrad)"
              stroke="#8C6326"
              strokeWidth="1.5"
            />

            {/* Lid Trim / Edge Rim */}
            <rect
              x="47"
              y="88"
              width="106"
              height="8"
              rx="4"
              fill="#D9A141"
              stroke="#8C6326"
              strokeWidth="1.2"
            />

            {/* Decorative Corner Straps (Soft brown gold metal bands) */}
            <path
              d="M 64 62 C 64 62, 65 88, 65 158"
              stroke="#B37C2C"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M 136 62 C 136 62, 135 88, 135 158"
              stroke="#B37C2C"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Rosy Peach Cheeks */}
            <ellipse cx="72" cy="118" rx="7" ry="4.5" fill="#FFA5A5" opacity="0.65" />
            <ellipse cx="128" cy="118" rx="7" ry="4.5" fill="#FFA5A5" opacity="0.65" />

            {/* Golden Heart Lock Clasp on the Front */}
            <g transform="translate(100, 96)">
              <rect
                x="-11"
                y="-6"
                width="22"
                height="18"
                rx="6"
                fill="url(#lockGrad)"
                stroke="#8C6326"
                strokeWidth="1.2"
              />
              {/* Keyhole */}
              <circle cx="0" cy="1" r="2.2" fill="#4A3416" />
              <polygon points="-1.5,1 1.5,1 1,5 -1,5" fill="#4A3416" />
            </g>
          </g>

          {/* FACIAL EXPRESSIONS & ARMS PER STATE */}

          {/* STATE 1: Tired (droopy eyes, downward mouth, sweat drop, low arms) */}
          {stateNum === 1 && (
            <g>
              {/* Arms drooped down */}
              <path
                d="M 52 110 Q 42 124 45 140"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 148 110 Q 158 124 155 140"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Droopy tired eyes */}
              <path
                d="M 72 106 Q 80 110 88 107"
                stroke="#3A2E33"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 112 107 Q 120 110 128 106"
                stroke="#3A2E33"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Heavy eyelids */}
              <path
                d="M 74 103 Q 80 101 86 103"
                stroke="#8C6326"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 114 103 Q 120 101 126 103"
                stroke="#8C6326"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Tired small wavy mouth */}
              <path
                d="M 94 125 Q 100 122 106 125"
                stroke="#3A2E33"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Sweat drop on forehead/temple */}
              <g transform="translate(138, 72) rotate(15)">
                <path
                  d="M 0 0 C -4 6, -4 11, 0 13 C 4 11, 4 6, 0 0 Z"
                  fill="#78C6E6"
                  stroke="#479BC2"
                  strokeWidth="0.8"
                />
                <circle cx="-1" cy="9" r="1" fill="#FFFFFF" opacity="0.8" />
              </g>
            </g>
          )}

          {/* STATE 2: Perking up (bright eyes, gentle smile, one arm raised waving) */}
          {stateNum === 2 && (
            <g>
              {/* Left arm resting */}
              <path
                d="M 52 112 Q 44 122 47 134"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right arm raised waving */}
              <path
                d="M 148 112 Q 160 102 165 88"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Little wave lines near hand */}
              <path
                d="M 168 80 Q 172 84 168 88"
                stroke="#EDB95C"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 172 77 Q 177 84 172 91"
                stroke="#EDB95C"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Bright, perked eyes */}
              <circle cx="80" cy="107" r="3.2" fill="#3A2E33" />
              <circle cx="81.2" cy="105.8" r="1.1" fill="#FFFFFF" />
              <circle cx="120" cy="107" r="3.2" fill="#3A2E33" />
              <circle cx="121.2" cy="105.8" r="1.1" fill="#FFFFFF" />
              {/* Cute little smile */}
              <path
                d="M 94 122 Q 100 128 106 122"
                stroke="#3A2E33"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* STATE 3: Happy and walking (sparkles, open joyful smile, walking arms) */}
          {stateNum === 3 && (
            <g>
              {/* Left arm swinging back */}
              <path
                d="M 52 110 Q 42 118 40 128"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right arm swinging forward */}
              <path
                d="M 148 110 Q 158 118 160 128"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Joyful crescent eyes (^^) */}
              <path
                d="M 74 108 Q 80 102 86 108"
                stroke="#3A2E33"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 114 108 Q 120 102 126 108"
                stroke="#3A2E33"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Joyful open mouth */}
              <path
                d="M 94 122 Q 100 131 106 122 Z"
                fill="#8C3844"
                stroke="#3A2E33"
                strokeWidth="1.5"
              />
              <path
                d="M 97 125 Q 100 129 103 125"
                fill="#FFA5A5"
              />
              {/* Sparkles floating around */}
              {/* Top left sparkle */}
              <g transform="translate(42, 60) scale(0.9)">
                <path d="M 0 -8 Q 1 -1 8 0 Q 1 1 0 8 Q -1 1 -8 0 Q -1 -1 0 -8 Z" fill="#F5C036" />
                <circle cx="0" cy="0" r="1.5" fill="#FFF" />
              </g>
              {/* Top right sparkle */}
              <g transform="translate(162, 68) scale(0.8)">
                <path d="M 0 -7 Q 1 -1 7 0 Q 1 1 0 7 Q -1 1 -7 0 Q -1 -1 0 -7 Z" fill="#F5C036" />
                <circle cx="0" cy="0" r="1.2" fill="#FFF" />
              </g>
              {/* Tiny bottom sparkle */}
              <g transform="translate(154, 142) scale(0.6)">
                <path d="M 0 -6 Q 1 -1 6 0 Q 1 1 0 6 Q -1 1 -6 0 Q -1 -1 0 -6 Z" fill="#F5C036" />
              </g>
            </g>
          )}

          {/* STATE 4: Excited, running pose, holding a small flag */}
          {stateNum === 4 && (
            <g>
              {/* Left arm pumping back */}
              <path
                d="M 52 114 Q 38 116 35 128"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Motion streaks behind running chest */}
              <path
                d="M 28 100 L 40 100"
                stroke="#EDB95C"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M 22 116 L 36 116"
                stroke="#EDB95C"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M 26 132 L 42 132"
                stroke="#EDB95C"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* Right arm holding flagpole */}
              <path
                d="M 148 110 Q 160 106 166 94"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Flagpole */}
              <line
                x1="168"
                y1="50"
                x2="162"
                y2="135"
                stroke="#704B1E"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Flag finial ball */}
              <circle cx="168" cy="49" r="3.2" fill="#F5C036" stroke="#8C6326" strokeWidth="1" />
              {/* Pennant Flag */}
              <path
                d="M 168 53 L 200 68 L 166 84 Z"
                fill="url(#flagGrad)"
                stroke="#A82B38"
                strokeWidth="1.2"
              />
              {/* Star on flag */}
              <path
                d="M 178 68 Q 179 66 182 68 Q 179 70 178 72 Q 177 70 174 68 Q 177 66 178 68 Z"
                fill="#FFF"
              />
              {/* Excited big shining eyes */}
              <circle cx="79" cy="106" r="4" fill="#3A2E33" />
              <circle cx="80.5" cy="104.5" r="1.5" fill="#FFFFFF" />
              <circle cx="78" cy="108" r="0.8" fill="#FFFFFF" />
              <circle cx="121" cy="106" r="4" fill="#3A2E33" />
              <circle cx="122.5" cy="104.5" r="1.5" fill="#FFFFFF" />
              <circle cx="120" cy="108" r="0.8" fill="#FFFFFF" />
              {/* Beaming excited open smile */}
              <path
                d="M 93 120 Q 100 133 107 120 Z"
                fill="#8C3844"
                stroke="#3A2E33"
                strokeWidth="1.5"
              />
              <path
                d="M 96 124 Q 100 130 104 124"
                fill="#FFA5A5"
              />
            </g>
          )}

          {/* STATE 5: Jumping with confetti & tiny golden crown (100% complete) */}
          {stateNum === 5 && (
            <g>
              {/* Both arms raised up high celebrating */}
              <path
                d="M 52 102 Q 36 86 38 70"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 148 102 Q 164 86 162 70"
                stroke="#C9943B"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Golden Crown on lid */}
              <g transform="translate(100, 56)">
                <path
                  d="M -16 0 L -20 -18 L -9 -9 L 0 -22 L 9 -9 L 20 -18 L 16 0 Z"
                  fill="#FFD23F"
                  stroke="#A87515"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                {/* Crown jewel dots */}
                <circle cx="-20" cy="-18" r="2.2" fill="#FF5E7E" />
                <circle cx="0" cy="-22" r="2.5" fill="#4BC5EC" />
                <circle cx="20" cy="-18" r="2.2" fill="#75D973" />
                <rect x="-14" y="-3" width="28" height="3" rx="1.5" fill="#FFE58F" />
              </g>
              {/* Beaming upward crescent eyes */}
              <path
                d="M 72 107 Q 80 99 88 107"
                stroke="#3A2E33"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 112 107 Q 120 99 128 107"
                stroke="#3A2E33"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
              {/* Big happy open laughing smile */}
              <path
                d="M 91 119 Q 100 135 109 119 Z"
                fill="#9E2A3B"
                stroke="#3A2E33"
                strokeWidth="1.6"
              />
              <path
                d="M 94 125 Q 100 133 106 125"
                fill="#FFA5A5"
              />
              {/* Confetti pieces around the crowned jumping chest */}
              {/* Left side confetti */}
              <rect x="24" y="52" width="6" height="6" rx="1.5" fill="#FF708F" transform="rotate(25 24 52)" />
              <rect x="36" y="90" width="7" height="4" rx="1" fill="#7AD3FF" transform="rotate(-18 36 90)" />
              <polygon points="30,130 36,134 32,140 26,136" fill="#FED854" />
              <circle cx="48" cy="40" r="3" fill="#B388FF" />
              <circle cx="20" cy="80" r="2.5" fill="#69F0AE" />
              {/* Right side confetti */}
              <rect x="168" y="48" width="6" height="6" rx="1.5" fill="#FED854" transform="rotate(40 168 48)" />
              <rect x="160" y="86" width="7" height="4" rx="1" fill="#FF708F" transform="rotate(15 160 86)" />
              <polygon points="172,126 178,130 174,136 168,132" fill="#7AD3FF" />
              <circle cx="152" cy="38" r="3" fill="#69F0AE" />
              <circle cx="180" cy="74" r="2.5" fill="#B388FF" />
            </g>
          )}
        </g>
      </svg>
    );
  };

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
  };

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Mascot visual container with 450ms spring bounce / crossfade transition */}
      <div className="relative flex items-center justify-center p-2">
        <div
          className={`${sizeClasses[size]} transition-all duration-450 motion-reduce:transition-none ${
            isBouncing ? 'scale-110 -translate-y-2' : 'scale-100 translate-y-0'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {renderMascotSvg(state)}
        </div>
      </div>

      {/* Mascot Text Caption (ALWAYS paired with mascot) */}
      <p
        className="mt-3 text-sm font-semibold text-[var(--color-text)] transition-colors duration-300 font-['Plus_Jakarta_Sans'] px-3"
        aria-live="polite"
      >
        {progress.mascotCaption}
      </p>

      {/* Progress Bar & Subtext */}
      {showProgressBar && (
        <div className="w-full mt-4 space-y-2">
          {/* Progress bar pill */}
          <div
            className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-[var(--color-border)]"
            role="progressbar"
            aria-valuenow={progress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Checklist completion progress"
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, progress.percentage))}%`,
                background:
                  progress.percentage >= 100
                    ? 'linear-gradient(90deg, #3D7950 0%, #52A36B 100%)'
                    : 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
              }}
            />
          </div>

          {/* Formatted count text */}
          <p className="text-xs font-medium text-[var(--color-muted)] tabular-numbers">
            {progress.label}
          </p>
        </div>
      )}
    </div>
  );
};
