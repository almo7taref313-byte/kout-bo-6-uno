import React from 'react';
import { Card, SuitColor } from '../types';

interface UnoCardProps {
  card: Card;
  isClickable?: boolean;
  isPlayable?: boolean;
  size?: 'hand' | 'table' | 'mini';
  trumpColor?: SuitColor | null;
  onClick?: () => void;
  className?: string;
}

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  isClickable = false,
  isPlayable = true,
  size = 'hand',
  trumpColor = null,
  onClick,
  className = '',
}) => {
  const isTrump1 = Boolean(trumpColor && card.color === trumpColor && card.rank === '1');

  // Card background class
  let bgClass = 'uno-bg-black';
  if (card.color === 'red') bgClass = 'uno-bg-red';
  else if (card.color === 'yellow') bgClass = 'uno-bg-yellow';
  else if (card.color === 'green') bgClass = 'uno-bg-green';
  else if (card.color === 'blue') bgClass = 'uno-bg-blue';

  // Rich, vivid text colors for high contrast on the center white oval
  let textColor = '#ffffff';
  if (card.color === 'red') textColor = '#e11d2a';
  else if (card.color === 'yellow') textColor = '#d97706';
  else if (card.color === 'green') textColor = '#009142';
  else if (card.color === 'blue') textColor = '#0273b5';

  const glowClass = card.isJoker
    ? 'card-joker-glow'
    : isTrump1
    ? 'card-trump1-glow'
    : '';

  const sizeClass =
    size === 'table' ? 'uno-card-table' : size === 'mini' ? 'w-8 h-12' : 'uno-card-hand';

  // Render SVG symbol for Skip, Reverse, Draw2, Wild, Wild+4
  const renderSpecialSymbol = (isCorner = false) => {
    const scale = isCorner ? 0.42 : size === 'table' ? 0.86 : 1.08;

    if (card.rank === 'skip') {
      return (
        <svg
          width={40 * scale}
          height={40 * scale}
          viewBox="0 0 40 40"
          className="select-none drop-shadow-sm"
        >
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#000"
            strokeWidth="5.5"
          />
          <circle
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke={isCorner ? (card.color === 'yellow' ? '#000' : '#fff') : textColor}
            strokeWidth="4"
          />
          <line
            x1="8"
            y1="32"
            x2="32"
            y2="8"
            stroke="#000"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="32"
            x2="32"
            y2="8"
            stroke={isCorner ? (card.color === 'yellow' ? '#000' : '#fff') : textColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    if (card.rank === 'reverse') {
      const symbolFill = isCorner ? (card.color === 'yellow' ? '#000' : '#fff') : textColor;
      return (
        <svg
          width={40 * scale}
          height={40 * scale}
          viewBox="0 0 40 40"
          className="select-none drop-shadow-sm"
        >
          {/* Top arrow pointing left */}
          <path
            d="M26 10 C20 10 12 12 10 18 L6 14 L8 24 L18 22 L14 18 C16 14 22 14 26 14 Z"
            fill={symbolFill}
            stroke="#000"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Bottom arrow pointing right */}
          <path
            d="M14 30 C20 30 28 28 30 22 L34 26 L32 16 L22 18 L26 22 C24 26 18 26 14 26 Z"
            fill={symbolFill}
            stroke="#000"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (card.rank === 'draw2') {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-6.5 h-7.5 sm:w-8.5 sm:h-9.5">
            {/* Back card */}
            <div
              className="absolute left-0 top-0 w-4.5 h-6.5 sm:w-5.5 sm:h-7.5 rounded border-[1.5px] border-black transform -rotate-12 shadow-sm"
              style={{ backgroundColor: textColor }}
            />
            {/* Front card */}
            <div
              className="absolute right-0 bottom-0 w-4.5 h-6.5 sm:w-5.5 sm:h-7.5 rounded border-[1.5px] border-black transform rotate-6 shadow-md"
              style={{ backgroundColor: textColor }}
            />
          </div>
        </div>
      );
    }

    if (card.isMaker) {
      // Crisp 4-quadrant oval matching UNO Wild card without any blue external badge or text
      return (
        <div className="w-8 h-10.5 sm:w-10 sm:h-13 rounded-full overflow-hidden border-2 border-black grid grid-cols-2 shadow-md transform -rotate-12">
          <div className="bg-[#ff2636]"></div>
          <div className="bg-[#0088d6]"></div>
          <div className="bg-[#ffda00]"></div>
          <div className="bg-[#00a84f]"></div>
        </div>
      );
    }

    if (card.isJoker) {
      return null;
    }

    return null;
  };

  // Center & Corner display
  let centerContent: React.ReactNode = null;
  let cornerTopLeft: React.ReactNode = null;
  let cornerBottomRight: React.ReactNode = null;

  if (card.isJoker) {
    centerContent = (
      <div className="flex flex-col items-center justify-center">
        <span
          className={`uno-number-text ${
            size === 'mini'
              ? 'text-sm'
              : size === 'table'
              ? 'text-2xl xs:text-3xl sm:text-4xl'
              : 'text-3xl xs:text-4xl sm:text-5xl md:text-6xl'
          } font-black select-none text-slate-950 leading-none`}
          style={{ fontStyle: 'italic', letterSpacing: '-0.04em' }}
        >
          +4
        </span>
      </div>
    );
    cornerTopLeft = (
      <span className="uno-corner-text text-white text-[11px] xs:text-xs sm:text-sm font-black leading-none">
        +4
      </span>
    );
    cornerBottomRight = (
      <span className="uno-corner-text text-white text-[11px] xs:text-xs sm:text-sm font-black leading-none transform rotate-180">
        +4
      </span>
    );
  } else if (card.isMaker) {
    centerContent = renderSpecialSymbol(false);
    cornerTopLeft = (
      <div className="w-3 h-4 rounded-full overflow-hidden border border-black grid grid-cols-2 shadow-sm">
        <div className="bg-[#ff2636]"></div>
        <div className="bg-[#0088d6]"></div>
        <div className="bg-[#ffda00]"></div>
        <div className="bg-[#00a84f]"></div>
      </div>
    );
    cornerBottomRight = (
      <div className="w-3 h-4 rounded-full overflow-hidden border border-black grid grid-cols-2 transform rotate-180 shadow-sm">
        <div className="bg-[#ff2636]"></div>
        <div className="bg-[#0088d6]"></div>
        <div className="bg-[#ffda00]"></div>
        <div className="bg-[#00a84f]"></div>
      </div>
    );
  } else if (card.rank === 'skip' || card.rank === 'reverse' || card.rank === 'draw2') {
    centerContent = renderSpecialSymbol(false);
    const cornerSymbol =
      card.rank === 'draw2' ? (
        <span
          className="uno-corner-text text-[10px] xs:text-[11px] sm:text-xs font-black"
          style={{ color: card.color === 'yellow' ? '#000000' : '#ffffff' }}
        >
          +2
        </span>
      ) : (
        renderSpecialSymbol(true)
      );
    cornerTopLeft = cornerSymbol;
    cornerBottomRight = (
      <div className="transform rotate-180 flex items-center justify-center">
        {cornerSymbol}
      </div>
    );
  } else {
    // Numeral with underline ONLY for 6 (no underline for 9)
    const hasUnderline = card.rank === '6';
    centerContent = (
      <div className="flex flex-col items-center justify-center relative">
        <span
          className={`uno-number-text ${
            size === 'mini'
              ? 'text-sm'
              : size === 'table'
              ? 'text-2xl xs:text-3xl sm:text-4xl'
              : 'text-3xl xs:text-4xl sm:text-5xl md:text-6xl'
          } font-black select-none`}
          style={{ color: textColor }}
        >
          {card.label}
        </span>
        {hasUnderline && (
          <span
            className="w-3.5 xs:w-4.5 sm:w-6 h-0.5 sm:h-1 bg-black rounded-full -mt-0.5 sm:-mt-1"
            style={{ boxShadow: `0 0 0 1px ${textColor}` }}
          />
        )}
      </div>
    );

    const cornerNum = (
      <div className="flex flex-col items-center justify-center">
        <span
          className="uno-corner-text text-[10px] xs:text-[11px] sm:text-xs font-black"
          style={{ color: card.color === 'yellow' ? '#000000' : '#ffffff' }}
        >
          {card.label}
        </span>
        {hasUnderline && <span className="w-2 xs:w-2.5 h-0.5 bg-black rounded-full -mt-0.5" />}
      </div>
    );

    cornerTopLeft = cornerNum;
    cornerBottomRight = <div className="transform rotate-180">{cornerNum}</div>;
  }

  // Kuwaiti Diwaniya badge for special status (Trump 1 'خال' and Joker 'الجيكر' only; no blue Maker badge)
  let koutRoleBadge: React.ReactNode = null;
  if (isTrump1) {
    koutRoleBadge = (
      <div className="absolute -top-1.5 -right-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 font-black text-[8.5px] px-1.5 py-0.2 rounded-full border border-white shadow-md z-30 flex items-center gap-0.5">
        <span>👑</span>
        <span>خال</span>
      </div>
    );
  } else if (card.isJoker) {
    koutRoleBadge = (
      <div className="absolute -top-1.5 -right-1 bg-slate-950 text-white font-black text-[8.5px] px-1.5 py-0.2 rounded-full border border-white shadow-md z-30">
        الجيكر
      </div>
    );
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      className={`uno-card-ref ${sizeClass} ${glowClass} ${
        isClickable ? 'player-card' : ''
      } ${isClickable && isPlayable ? 'active-playable' : ''} ${
        isClickable && !isPlayable ? 'card-unplayable-dimmed' : ''
      } ${className}`}
    >
      <div className={`uno-card-inner ${bgClass}`}>
        {/* Tilted White Oval */}
        <div className="uno-center-oval"></div>

        {/* Corner top-left */}
        <div className="absolute top-1 left-1.5 z-20 pointer-events-none">
          {cornerTopLeft}
        </div>

        {/* Corner bottom-right */}
        <div className="absolute bottom-1 right-1.5 z-20 pointer-events-none">
          {cornerBottomRight}
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          {centerContent}
        </div>

        {/* Role badge */}
        {koutRoleBadge}
      </div>
    </div>
  );
};
