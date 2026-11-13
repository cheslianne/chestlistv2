import React, { useEffect, useState } from 'react';
import { ContainerSkin } from '../types';

interface ContainerIllustrationProps {
  skin: ContainerSkin;
  percentage: number;
  size?: 'small' | 'large'; // small: ~120px, large: ~360px
  isDroppingCoin?: boolean;
  onCoinDropComplete?: () => void;
  className?: string;
  showTicks?: boolean;
}

export const ContainerIllustration: React.FC<ContainerIllustrationProps> = ({
  skin,
  percentage,
  size = 'small',
  isDroppingCoin = false,
  onCoinDropComplete,
  className = '',
  showTicks = false,
}) => {
  const [fillHeight, setFillHeight] = useState(percentage);
  const [animatingCoin, setAnimatingCoin] = useState(false);

  // Animate fill height smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      setFillHeight(Math.min(100, Math.max(0, percentage)));
    }, 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  // Handle coin drop animation trigger
  useEffect(() => {
    if (isDroppingCoin) {
      setAnimatingCoin(true);
      const timer = setTimeout(() => {
        setAnimatingCoin(false);
        if (onCoinDropComplete) onCoinDropComplete();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [isDroppingCoin, onCoinDropComplete]);

  const clampedPercent = Math.min(100, Math.max(0, fillHeight));
  const isLarge = size === 'large';
  const width = isLarge ? 280 : 120;
  const height = isLarge ? 360 : 120;

  // Primary pastel fill and coin colors
  const fillColor = '#F4B6C2'; // soft accent pastel
  const fillLiquidColor = 'var(--color-primary)';
  const goldCoinColor = '#F2C94C';
  const goldCoinBorder = '#D4A017';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 280 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Glass / Jar Gradients */}
          <linearGradient id="glassGloss" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
          </linearGradient>

          <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-soft-accent)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.75" />
          </linearGradient>

          {/* Mask for Glass Jar Fill */}
          <clipPath id="jarClip">
            <rect x="52" y="75" width="176" height="235" rx="22" />
          </clipPath>

          {/* Mask for Piggy Bank */}
          <clipPath id="piggyClip">
            <ellipse cx="140" cy="195" rx="88" ry="78" />
          </clipPath>

          {/* Mask for Treasure Chest */}
          <clipPath id="chestClip">
            <rect x="50" y="125" width="180" height="175" rx="14" />
          </clipPath>

          {/* Mask for Tin Can */}
          <clipPath id="canClip">
            <rect x="62" y="80" width="156" height="230" rx="14" />
          </clipPath>

          {/* Coin shadow */}
          <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* ================= SKIN 1: GLASS JAR ================= */}
        {skin === 'glass jar' && (
          <g>
            {/* Top Lid & Coin Slot */}
            <rect x="85" y="42" width="110" height="16" rx="6" fill="#EAD5DC" stroke="var(--color-border)" strokeWidth="2" />
            <rect x="100" y="58" width="80" height="14" rx="3" fill="#D9C2CB" stroke="var(--color-border)" strokeWidth="2" />
            {/* Coin Slot on Lid */}
            <rect x="120" y="47" width="40" height="5" rx="2.5" fill="#4A3B40" />

            {/* Jar Outer Glass Body */}
            <rect
              x="50"
              y="72"
              width="180"
              height="240"
              rx="24"
              fill="url(#glassGloss)"
              stroke="var(--color-border)"
              strokeWidth="2.5"
            />

            {/* Liquid / Coins Fill (rising with percentage) */}
            <g clipPath="url(#jarClip)">
              <rect
                x="50"
                y={72 + 240 * (1 - clampedPercent / 100)}
                width="180"
                height={240 * (clampedPercent / 100)}
                fill="url(#liquidGrad)"
                className="transition-all duration-900 ease-out"
                style={{
                  transitionProperty: 'y, height',
                  transitionDuration: '900ms',
                }}
              />
              {/* Floating coin sparkles on liquid top */}
              {clampedPercent > 4 && (
                <ellipse
                  cx="140"
                  cy={72 + 240 * (1 - clampedPercent / 100)}
                  rx="75"
                  ry="9"
                  fill="var(--color-soft-accent)"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
            </g>

            {/* Glass Jar Highlights */}
            <path
              d="M68 95V280"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <path
              d="M76 105V230"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />
          </g>
        )}

        {/* ================= SKIN 2: PIGGY BANK ================= */}
        {skin === 'piggy bank' && (
          <g>
            {/* Piggy Ears */}
            <polygon points="90,120 70,80 115,100" fill="#FFC5D1" stroke="var(--color-border)" strokeWidth="2" />
            <polygon points="190,120 210,80 165,100" fill="#FFC5D1" stroke="var(--color-border)" strokeWidth="2" />

            {/* Piggy Feet */}
            <rect x="80" y="260" width="30" height="30" rx="8" fill="#E8B4C0" stroke="var(--color-border)" strokeWidth="2" />
            <rect x="170" y="260" width="30" height="30" rx="8" fill="#E8B4C0" stroke="var(--color-border)" strokeWidth="2" />

            {/* Piggy Body */}
            <ellipse
              cx="140"
              cy="195"
              rx="90"
              ry="80"
              fill="#FFF0F3"
              stroke="var(--color-border)"
              strokeWidth="2.5"
            />

            {/* Fill inside piggy */}
            <g clipPath="url(#piggyClip)">
              <rect
                x="40"
                y={115 + 160 * (1 - clampedPercent / 100)}
                width="200"
                height={160 * (clampedPercent / 100)}
                fill="url(#liquidGrad)"
                className="transition-all duration-900 ease-out"
                style={{
                  transitionProperty: 'y, height',
                  transitionDuration: '900ms',
                }}
              />
            </g>

            {/* Coin Slot on Back */}
            <rect x="118" y="114" width="44" height="6" rx="3" fill="#4A3B40" />

            {/* Piggy Snout */}
            <ellipse cx="72" cy="195" rx="20" ry="16" fill="#FFAEC0" stroke="var(--color-border)" strokeWidth="2" />
            <ellipse cx="66" cy="195" rx="3" ry="5" fill="#5E3B46" />
            <ellipse cx="78" cy="195" rx="3" ry="5" fill="#5E3B46" />

            {/* Piggy Eye */}
            <circle cx="105" cy="165" r="4" fill="#3A2E33" />
            <circle cx="106.5" cy="163.5" r="1.5" fill="#FFFFFF" />

            {/* Curly Tail */}
            <path
              d="M230 195 C248 190, 248 175, 238 175 C230 175, 235 185, 245 185"
              stroke="#FFAEC0"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* ================= SKIN 3: TREASURE CHEST ================= */}
        {skin === 'treasure chest' && (
          <g>
            {/* Arched Lid */}
            <path
              d="M50 125 C50 75, 230 75, 230 125 Z"
              fill="#EAD0BE"
              stroke="var(--color-border)"
              strokeWidth="2.5"
            />
            {/* Lid Trim Bands */}
            <path d="M85 88 C100 80, 115 80, 125 125" stroke="#D3A78E" strokeWidth="3" fill="none" />
            <path d="M195 88 C180 80, 165 80, 155 125" stroke="#D3A78E" strokeWidth="3" fill="none" />
            {/* Coin slot in chest lid */}
            <rect x="120" y="88" width="40" height="6" rx="3" fill="#4A3B40" />

            {/* Chest Base Box */}
            <rect
              x="50"
              y="125"
              width="180"
              height="175"
              rx="14"
              fill="#FAF2ED"
              stroke="var(--color-border)"
              strokeWidth="2.5"
            />

            {/* Fill inside chest */}
            <g clipPath="url(#chestClip)">
              <rect
                x="50"
                y={125 + 175 * (1 - clampedPercent / 100)}
                width="180"
                height={175 * (clampedPercent / 100)}
                fill="url(#liquidGrad)"
                className="transition-all duration-900 ease-out"
                style={{
                  transitionProperty: 'y, height',
                  transitionDuration: '900ms',
                }}
              />
            </g>

            {/* Golden Lock & Latch Plate */}
            <rect x="125" y="118" width="30" height="24" rx="4" fill="#F2C94C" stroke="#B8860B" strokeWidth="2" />
            <circle cx="140" cy="128" r="3" fill="#4A3B40" />
            <path d="M140 131 V136" stroke="#4A3B40" strokeWidth="2" />

            {/* Side Carry Handles */}
            <path d="M42 180 C36 180, 36 210, 48 210" stroke="#B8860B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M238 180 C244 180, 244 210, 232 210" stroke="#B8860B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </g>
        )}

        {/* ================= SKIN 4: TIN CAN ================= */}
        {skin === 'tin can' && (
          <g>
            {/* Ribbed Cylindrical Tin Can Body */}
            <rect
              x="62"
              y="80"
              width="156"
              height="230"
              rx="16"
              fill="#F0F4F8"
              stroke="var(--color-border)"
              strokeWidth="2.5"
            />

            {/* Fill inside can */}
            <g clipPath="url(#canClip)">
              <rect
                x="62"
                y={80 + 230 * (1 - clampedPercent / 100)}
                width="156"
                height={230 * (clampedPercent / 100)}
                fill="url(#liquidGrad)"
                className="transition-all duration-900 ease-out"
                style={{
                  transitionProperty: 'y, height',
                  transitionDuration: '900ms',
                }}
              />
            </g>

            {/* Top Rim Lid with Coin Slot */}
            <ellipse cx="140" cy="80" rx="78" ry="15" fill="#E2E8F0" stroke="var(--color-border)" strokeWidth="2" />
            <rect x="120" y="77" width="40" height="5" rx="2.5" fill="#4A3B40" />

            {/* Tin Can Corrugated Ribs */}
            <line x1="64" y1="130" x2="216" y2="130" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
            <line x1="64" y1="180" x2="216" y2="180" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
            <line x1="64" y1="230" x2="216" y2="230" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          </g>
        )}

        {/* ================= SIDE TICK MARKS (25, 50, 75, 100%) ================= */}
        {showTicks && (
          <g className="text-[10px] font-mono tabular-nums fill-[var(--color-muted)]">
            {/* 100% */}
            <line x1="235" y1="80" x2="248" y2="80" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" />
            <text x="254" y="84" fontSize="11" fontWeight="600" fill="var(--color-muted)">100%</text>

            {/* 75% */}
            <line x1="235" y1="140" x2="245" y2="140" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" />
            <text x="252" y="144" fontSize="10" fill="var(--color-muted)">75%</text>

            {/* 50% */}
            <line x1="235" y1="200" x2="247" y2="200" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" />
            <text x="254" y="204" fontSize="10" fontWeight="600" fill="var(--color-muted)">50%</text>

            {/* 25% */}
            <line x1="235" y1="260" x2="245" y2="260" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" />
            <text x="252" y="264" fontSize="10" fill="var(--color-muted)">25%</text>
          </g>
        )}

        {/* ================= COIN DROP ANIMATION ================= */}
        {animatingCoin && (
          <g className="animate-coin-drop">
            <circle
              cx="140"
              cy="20"
              r="14"
              fill={goldCoinColor}
              stroke={goldCoinBorder}
              strokeWidth="2.5"
              filter="url(#coinShadow)"
            />
            {/* Coin Peso Symbol */}
            <text
              x="140"
              y="25"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
              fill="#855B00"
            >
              ₱
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
