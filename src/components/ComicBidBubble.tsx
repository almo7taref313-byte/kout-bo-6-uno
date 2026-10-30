import React from 'react';
import { Team } from '../types';

interface ComicBidBubbleProps {
  val: number; // 0 for طاف, 9 for باون, 5-8 for number
  team: Team;
  seatPosition: 'bottom-right' | 'top-right' | 'top-center' | 'top-left' | 'bottom-left' | 'bottom-center';
  className?: string;
}

/**
 * فقاعة المزاد المصغرة - المقترح (ب) المعتمد
 * فقاعة محادثة كلاسيكية بيضاء عاجية مصغرة وأنيقة تتناسب تماماً مع مقاسات الطاولة
 */
export const ComicBidBubble: React.FC<ComicBidBubbleProps> = ({
  val,
  team: _team,
  seatPosition,
  className = '',
}) => {
  // Tail points towards the player avatar:
  // If player is on the right rim, bubble sits to the left -> tail points right.
  // Otherwise bubble sits to the right -> tail points left.
  const pointsRight = seatPosition === 'bottom-right' || seatPosition === 'top-right';

  const isPass = val === 0;
  const isBaoon = val === 9;

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none drop-shadow-md animate-in zoom-in-75 duration-150 w-[44px] h-[28px] xs:w-[48px] xs:h-[30px] sm:w-[52px] sm:h-[32px] ${className}`}
    >
      <svg
        viewBox="0 0 62 36"
        className="absolute inset-0 w-full h-full overflow-visible"
      >
        <filter id="bubble-subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
        </filter>

        {pointsRight ? (
          // ذيل موجه لليمين نحو اللاعب
          <path
            d="M 6,2 H 48 C 51.5,2 54,4.5 54,8 V 13 L 60,18 L 54,23 V 28 C 54,31.5 51.5,34 48,34 H 6 C 2.5,34 0,31.5 0,28 V 8 C 0,4.5 2.5,2 6,2 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="2.2"
            strokeLinejoin="round"
            filter="url(#bubble-subtle-shadow)"
          />
        ) : (
          // ذيل موجه لليسار نحو اللاعب
          <path
            d="M 14,2 H 56 C 59.5,2 62,4.5 62,8 V 28 C 62,31.5 59.5,34 56,34 H 14 C 10.5,34 8,31.5 8,28 V 23 L 2,18 L 8,13 V 8 C 8,4.5 10.5,2 14,2 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="2.2"
            strokeLinejoin="round"
            filter="url(#bubble-subtle-shadow)"
          />
        )}
      </svg>

      {/* Bubble Content: كلمة طاف أو رقم المزايدة أو باون */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center text-center pointer-events-none leading-none ${
          pointsRight ? '-translate-x-0.5' : 'translate-x-0.5'
        }`}
      >
        {isPass ? (
          <span className="text-[11px] xs:text-xs sm:text-[13px] font-black text-slate-900 font-sans tracking-tight">
            طاف
          </span>
        ) : isBaoon ? (
          <span className="text-[8.5px] xs:text-[9.5px] sm:text-[10px] font-black text-amber-700 font-sans whitespace-nowrap">
            باون 👑
          </span>
        ) : (
          <span className="text-xs xs:text-sm sm:text-base font-black text-slate-950 font-mono">
            {val}
          </span>
        )}
      </div>
    </div>
  );
};
