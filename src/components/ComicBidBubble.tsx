import React from 'react';
import { Team } from '../types';

interface ComicBidBubbleProps {
  val: number; // 0 for طاف, 9 for باون, 5-8 for number
  team: Team;
  seatPosition: 'bottom-right' | 'top-right' | 'top-center' | 'top-left' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export const ComicBidBubble: React.FC<ComicBidBubbleProps> = ({
  val,
  team,
  seatPosition,
  className = '',
}) => {
  const isTeamA = team === 'A';

  // Tail points towards the player's avatar from inside the table
  let graphicTransform = '';
  let contentOffset = { x: 0, y: -3 };

  switch (seatPosition) {
    case 'bottom-right':
      // Avatar is on right rim; bubble is to its left inside table. Tail points down-right.
      graphicTransform = '';
      contentOffset = { x: -2, y: -4 };
      break;
    case 'top-right':
      // Avatar is on top-right rim; bubble is to its left inside table. Tail points up-right.
      graphicTransform = 'scaleY(-1)';
      contentOffset = { x: -2, y: 4 };
      break;
    case 'top-center':
      // Avatar is on top rim; bubble is below avatar inside table. Tail points up.
      graphicTransform = 'scaleY(-1) rotate(-15deg)';
      contentOffset = { x: 0, y: 5 };
      break;
    case 'top-left':
      // Avatar is on top-left rim; bubble is to its right inside table. Tail points up-left.
      graphicTransform = 'scaleX(-1) scaleY(-1)';
      contentOffset = { x: 2, y: 4 };
      break;
    case 'bottom-left':
      // Avatar is on bottom-left rim; bubble is to its right inside table. Tail points down-left.
      graphicTransform = 'scaleX(-1)';
      contentOffset = { x: 2, y: -4 };
      break;
    case 'bottom-center':
      // Human avatar is at bottom; bubble is above inside table. Tail points down.
      graphicTransform = 'rotate(10deg)';
      contentOffset = { x: 0, y: -4 };
      break;
  }

  const isPass = val === 0;
  const isBaoon = val === 9;

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none drop-shadow-2xl animate-in zoom-in-75 duration-200 w-[68px] h-[54px] xs:w-[78px] xs:h-[62px] sm:w-[88px] sm:h-[70px] ${className}`}
    >
      {/* Background comic shape matching the comic speech bubble interior + comic outline */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{ transform: graphicTransform }}
      >
        <svg
          viewBox="0 0 100 82"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={`comic-grad-${team}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isTeamA ? '#3b82f6' : '#ef4444'} />
              <stop offset="100%" stopColor={isTeamA ? '#1d4ed8' : '#b91c1c'} />
            </linearGradient>
            <filter id={`comic-shadow-${team}`} x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Filled comic bubble body & pointer tail */}
          <path
            d="M 12,38 C 12,18 28,8 50,8 C 72,8 88,18 88,38 C 88,54 75,65 57,67 L 70,80 L 46,68 C 26,67 12,55 12,38 Z"
            fill={`url(#comic-grad-${team})`}
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinejoin="round"
            filter={`url(#comic-shadow-${team})`}
          />
          {/* Subtle inner gloss highlight */}
          <ellipse
            cx="48"
            cy="20"
            rx="28"
            ry="6"
            fill="rgba(255,255,255,0.22)"
          />
        </svg>

        {/* User-provided comic speech bubble asset texture */}
        <img
          src="/assets/aistudio/_Pngtree_blank_comic_speech_bubble_message_9024960_69b699d1.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-85 mix-blend-multiply"
        />
      </div>

      {/* Bubble Content: Large, bold and clear inside the bubble */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
        style={{
          transform: `translate(${contentOffset.x}px, ${contentOffset.y}px)`,
        }}
      >
        {isPass ? (
          <span className="text-lg xs:text-xl sm:text-2xl font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-tight">
            طاف
          </span>
        ) : isBaoon ? (
          <span className="text-xs xs:text-sm sm:text-base font-black text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-tight">
            باون 👑
          </span>
        ) : (
          <span className="text-2xl xs:text-3xl sm:text-4xl font-black text-white font-mono leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {val}
          </span>
        )}
      </div>
    </div>
  );
};
