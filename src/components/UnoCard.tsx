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

// إحداثيات جميع كروت الأونو الـ 54 داخل ملف الفيكتور الكلاسيكي عالي الدقة (/uno_classic_deck.svg)
const getClassicCardViewBox = (card: Card): string => {
  if (card.isJoker) {
    return '3120 1440 240 360';
  }
  if (card.isMaker) {
    return '3120 0 240 360';
  }

  let rowY = 0;
  if (card.color === 'red') rowY = 0;
  else if (card.color === 'yellow') rowY = 360;
  else if (card.color === 'green') rowY = 720;
  else if (card.color === 'blue') rowY = 1080;

  let colX = 0;
  switch (card.rank) {
    case '0':
      colX = 0;
      break;
    case '1':
      colX = 240;
      break;
    case '2':
      colX = 480;
      break;
    case '3':
      colX = 720;
      break;
    case '4':
      colX = 960;
      break;
    case '5':
      colX = 1200;
      break;
    case '6':
      colX = 1440;
      break;
    case '7':
      colX = 1680;
      break;
    case '8':
      colX = 1920;
      break;
    case '9':
      colX = 2160;
      break;
    case 'skip':
      colX = 2400;
      break;
    case 'reverse':
      colX = 2640;
      break;
    case 'draw2':
      colX = 2880;
      break;
    default:
      colX = 240;
  }

  return `${colX} ${rowY} 240 360`;
};

export const UnoCard: React.FC<UnoCardProps> = (props) => {
  const {
    card,
    isClickable = false,
    isPlayable = true,
    size = 'hand',
    trumpColor = null,
    onClick,
    className = '',
  } = props;

  const isTrump1 = trumpColor && card.color === trumpColor && card.rank === '1';
  const glowClass = card.isJoker ? 'card-joker-glow' : '';

  const sizeClass =
    size === 'table' ? 'uno-card-table' : size === 'mini' ? 'w-8 h-12' : 'uno-card-hand';

  // Kuwaiti Diwaniya badge for special status (Trump 1 'خال' and Joker 'الجيكر' only)
  let koutRoleBadge: React.ReactNode = null;
  if (isTrump1) {
    koutRoleBadge = (
      <div className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 font-black text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full border border-white shadow-md z-30 leading-none">
        خال
      </div>
    );
  } else if (card.isJoker) {
    koutRoleBadge = (
      <div className="absolute -top-1.5 -right-1 bg-slate-950 text-white font-black text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full border border-white shadow-md z-30 leading-none">
        الجيكر
      </div>
    );
  }

  const viewBox = getClassicCardViewBox(card);

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
      } !p-0 !border-0 !bg-transparent overflow-visible ${className}`}
    >
      <div className="w-full h-full relative rounded-[inherit] overflow-hidden">
        <svg
          viewBox={viewBox}
          className="w-full h-full block select-none pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <image href="/uno_classic_deck.svg?v=8" width="3362" height="2882" />
        </svg>
      </div>

      {/* Role badge */}
      {koutRoleBadge}
    </div>
  );
};
