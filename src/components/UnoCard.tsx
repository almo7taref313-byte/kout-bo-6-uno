import React, { useEffect, useState } from 'react';
import { Card, SuitColor } from '../types';
import {
  CardTheme,
  getStoredCardTheme,
  getWhiteCardImageUrl,
  preloadWhiteCardAssets,
} from '../utils/cardAssets';

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
  const [cardTheme, setCardTheme] = useState<CardTheme>(() => getStoredCardTheme());

  useEffect(() => {
    if (cardTheme === 'white') {
      preloadWhiteCardAssets();
    }
  }, [cardTheme]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<CardTheme>;
      if (customEvent.detail === 'white' || customEvent.detail === 'colored') {
        setCardTheme(customEvent.detail);
      } else {
        setCardTheme(getStoredCardTheme());
      }
    };
    window.addEventListener('kout-card-theme-change', handleThemeChange);
    return () => window.removeEventListener('kout-card-theme-change', handleThemeChange);
  }, []);

  const isTrump1 = trumpColor && card.color === trumpColor && card.rank === '1';

  const holoClass = '';
  const glowClass = card.isJoker ? 'card-joker-glow' : '';

  const sizeClass =
    size === 'table' ? 'uno-card-table' : size === 'mini' ? 'w-8 h-12' : 'uno-card-hand';

  // Kuwaiti Diwaniya badge for special status
  let koutRoleBadge: React.ReactNode = null;
  if (isTrump1) {
    koutRoleBadge = (
      <div className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] px-1 py-0.2 rounded-full border border-white shadow-md z-30">
        خال
      </div>
    );
  } else if (card.isJoker && cardTheme === 'colored') {
    koutRoleBadge = (
      <div className="absolute -top-1.5 -right-1 bg-slate-950 text-white font-black text-[8px] px-1.5 py-0.2 rounded-full border border-white shadow-md z-30">
        الجيكر
      </div>
    );
  }

  // White Card Style (Using the 54 high-contrast uploaded cards)
  const whiteCardImgUrl = cardTheme === 'white' ? getWhiteCardImageUrl(card) : null;
  if (cardTheme === 'white' && whiteCardImgUrl) {
    return (
      <div
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? onClick : undefined}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          padding: 0,
          backgroundColor: 'transparent',
        }}
        className={`uno-card-ref ${sizeClass} ${glowClass} ${
          isClickable ? 'player-card' : ''
        } ${isClickable && isPlayable ? 'active-playable' : ''} ${
          isClickable && !isPlayable ? 'card-unplayable-dimmed' : ''
        } overflow-visible ${className}`}
      >
        <div className="w-full h-full rounded-[inherit] overflow-hidden bg-white shadow-[0_3px_8px_rgba(0,0,0,0.45)] relative">
          <img
            src={whiteCardImgUrl}
            alt={card.roleTitle || card.label}
            draggable={false}
            className="w-full h-full object-fill select-none pointer-events-none block"
          />
        </div>
        {koutRoleBadge}
      </div>
    );
  }

  // Card background class (Colored UNO Style)
  let bgClass = 'uno-bg-black';
  if (card.color === 'red') bgClass = 'uno-bg-red';
  else if (card.color === 'yellow') bgClass = 'uno-bg-yellow';
  else if (card.color === 'green') bgClass = 'uno-bg-green';
  else if (card.color === 'blue') bgClass = 'uno-bg-blue';

  // Number / text color (deep, rich tones for perfect contrast on white oval)
  let textColor = '#ffffff';
  if (card.color === 'red') textColor = '#dc2626';
  else if (card.color === 'yellow') textColor = '#b45309';
  else if (card.color === 'green') textColor = '#15803d';
  else if (card.color === 'blue') textColor = '#0369a1';

  // Render SVG symbol for Skip, Reverse, Draw2, Wild, Wild+4
  const renderSpecialSymbol = (isCorner = false) => {
    const scale = isCorner ? 0.38 : size === 'table' ? 0.8 : 1;

    if (card.rank === 'skip') {
      return (
        <svg
          width={40 * scale}
          height={40 * scale}
          viewBox="0 0 40 40"
          className="select-none"
        >
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#000"
            strokeWidth="5"
          />
          <circle
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke={textColor}
            strokeWidth="3.5"
          />
          <line
            x1="8"
            y1="32"
            x2="32"
            y2="8"
            stroke="#000"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="32"
            x2="32"
            y2="8"
            stroke={textColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    if (card.rank === 'reverse') {
      return (
        <svg
          width={40 * scale}
          height={40 * scale}
          viewBox="0 0 40 40"
          className="select-none"
        >
          <path
            d="M26 10 C20 10 12 12 10 18 L6 14 L8 24 L18 22 L14 18 C16 14 22 14 26 14 Z"
            fill={textColor}
            stroke="#000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M14 30 C20 30 28 28 30 22 L34 26 L32 16 L22 18 L26 22 C24 26 18 26 14 26 Z"
            fill={textColor}
            stroke="#000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (card.rank === 'draw2') {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-6 h-7 sm:w-8 sm:h-9">
            <div
              className="absolute left-0 top-0 w-4 h-6 sm:w-5 sm:h-7 rounded border border-black transform -rotate-12"
              style={{ backgroundColor: textColor }}
            />
            <div
              className="absolute right-0 bottom-0 w-4 h-6 sm:w-5 sm:h-7 rounded border border-black transform rotate-6 shadow-sm"
              style={{ backgroundColor: textColor }}
            />
          </div>
        </div>
      );
    }

    if (card.isMaker) {
      return (
        <div
          className="w-7 h-9 sm:w-9 sm:h-12 rounded-full overflow-hidden border-2 border-black grid grid-cols-2 shadow transform -rotate-12"
        >
          <div className="bg-[#ea1d2d]"></div>
          <div className="bg-[#0082c8]"></div>
          <div className="bg-[#ffd000]"></div>
          <div className="bg-[#009e49]"></div>
        </div>
      );
    }

    if (card.isJoker) {
      return null;
    }

    return null;
  };

  let centerContent: React.ReactNode = null;
  let cornerTopLeft: React.ReactNode = null;
  let cornerBottomRight: React.ReactNode = null;

  if (card.isJoker) {
    centerContent = (
      <div className="flex flex-col items-center justify-center">
        <span
          className={`uno-number-text ${
            size === 'mini'
              ? 'text-xs'
              : size === 'table'
              ? 'text-2xl xs:text-3xl sm:text-4xl'
              : 'text-3xl xs:text-4xl sm:text-5xl md:text-6xl'
          } font-black select-none text-black leading-none`}
          style={{ fontStyle: 'italic', letterSpacing: '-0.04em' }}
        >
          +4
        </span>
      </div>
    );
    cornerTopLeft = (
      <span className="uno-corner-text text-white text-[10px] sm:text-xs font-black leading-none">
        +4
      </span>
    );
    cornerBottomRight = (
      <span className="uno-corner-text text-white text-[10px] sm:text-xs font-black leading-none transform rotate-180">
        +4
      </span>
    );
  } else if (card.isMaker) {
    centerContent = renderSpecialSymbol(false);
    cornerTopLeft = (
      <div className="w-2.5 h-3.5 rounded-full overflow-hidden border border-black grid grid-cols-2">
        <div className="bg-[#ea1d2d]"></div>
        <div className="bg-[#0082c8]"></div>
        <div className="bg-[#ffd000]"></div>
        <div className="bg-[#009e49]"></div>
      </div>
    );
    cornerBottomRight = (
      <div className="w-2.5 h-3.5 rounded-full overflow-hidden border border-black grid grid-cols-2 transform rotate-180">
        <div className="bg-[#ea1d2d]"></div>
        <div className="bg-[#0082c8]"></div>
        <div className="bg-[#ffd000]"></div>
        <div className="bg-[#009e49]"></div>
      </div>
    );
  } else if (card.rank === 'skip' || card.rank === 'reverse' || card.rank === 'draw2') {
    centerContent = renderSpecialSymbol(false);
    const cornerSymbol =
      card.rank === 'draw2' ? (
        <span className="uno-corner-text text-white text-[9px] sm:text-[11px] font-black">
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
    const hasUnderline = card.rank === '6';
    centerContent = (
      <div className="flex flex-col items-center justify-center relative">
        <span
          className={`uno-number-text ${
            size === 'mini'
              ? 'text-xs'
              : size === 'table'
              ? 'text-2xl xs:text-3xl sm:text-4xl'
              : 'text-2xl xs:text-3xl sm:text-4xl md:text-5xl'
          } font-black select-none`}
          style={{ color: textColor }}
        >
          {card.label}
        </span>
        {hasUnderline && (
          <span
            className="w-3 xs:w-4 sm:w-6 h-0.5 sm:h-1 bg-black rounded-full -mt-0.5 sm:-mt-1.5"
            style={{ boxShadow: `0 0 0 1px ${textColor}` }}
          />
        )}
      </div>
    );

    const cornerNum = (
      <div className="flex flex-col items-center justify-center">
        <span
          className="uno-corner-text text-[9px] xs:text-[10px] sm:text-xs font-black"
          style={{ color: card.color === 'yellow' ? '#000000' : '#ffffff' }}
        >
          {card.label}
        </span>
        {hasUnderline && <span className="w-1.5 xs:w-2 h-0.5 bg-black rounded-full -mt-0.5" />}
      </div>
    );

    cornerTopLeft = cornerNum;
    cornerBottomRight = <div className="transform rotate-180">{cornerNum}</div>;
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
      className={`uno-card-ref ${sizeClass} ${holoClass} ${glowClass} ${
        isClickable ? 'player-card' : ''
      } ${isClickable && isPlayable ? 'active-playable' : ''} ${
        isClickable && !isPlayable ? 'card-unplayable-dimmed' : ''
      } ${className}`}
    >
      <div className={`uno-card-inner ${bgClass}`}>
        <div className="uno-center-oval"></div>

        <div className="absolute top-1 left-1.5 z-20 pointer-events-none">
          {cornerTopLeft}
        </div>

        <div className="absolute bottom-1 right-1.5 z-20 pointer-events-none">
          {cornerBottomRight}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          {centerContent}
        </div>

        {koutRoleBadge}
      </div>
    </div>
  );
};
