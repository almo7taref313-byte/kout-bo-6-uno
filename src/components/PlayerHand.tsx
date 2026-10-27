import React from 'react';
import { Card, Player, SuitColor, TrickPlay } from '../types';
import { isLegalMove, sortHandCards, SUIT_COLORS } from '../utils/gameLogic';
import { AvatarView } from '../utils/avatars';
import { UnoCard } from './UnoCard';

interface PlayerHandProps {
  player: Player | undefined;
  currentTurn: number;
  phase: string;
  isActionPending: boolean;
  currentTrick: TrickPlay[];
  trumpColor: SuitColor | null;
  highestBid: number;
  bidWinner: number | null;
  isForcedBid: boolean;
  timerRemaining: number;
  onCardClick: (card: Card) => void;
  onSendPhrase?: (phrase: string, emoji?: string) => void;
  dealerIdx?: number;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  currentTurn,
  phase,
  isActionPending,
  currentTrick,
  trumpColor,
  highestBid,
  bidWinner,
  isForcedBid: _isForcedBid,
  timerRemaining,
  onCardClick,
  onSendPhrase: _onSendPhrase,
  dealerIdx = 0,
}) => {
  if (!player) return null;

  const isMyTurn = currentTurn === player.id && phase === 'PLAYING' && !isActionPending;
  const isHumanBuyer = bidWinner === player.id && highestBid > 4;

  const circumference = 125.6;
  const offset = isMyTurn ? circumference * (1 - timerRemaining / 12) : 0;
  const isCritical = timerRemaining <= 3;

  return (
    <footer className="relative w-full bg-[#181a1f]/95 border-t border-[#2a2f3a] pt-1 pb-1.5 sm:pb-2.5 px-1.5 sm:px-3 z-30 safe-bottom select-none flex-shrink-0">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        
        {/* Cards Row sorted by colors, and high-to-low from left to right */}
        <div className="w-full flex items-center justify-center -space-x-3 xs:-space-x-3.5 sm:-space-x-4 md:-space-x-5 overflow-x-auto px-1 sm:px-2 py-0.5 sm:py-1 min-h-[72px] xs:min-h-[82px] sm:min-h-[105px] md:min-h-[120px] no-scrollbar">
          {sortHandCards(player.hand, trumpColor).map((card, idx) => {
            const playable = isMyTurn ? isLegalMove(player.hand, card, currentTrick) : false;
            return (
              <div
                key={card.id}
                style={{ zIndex: 10 + idx }}
                className="transition-transform duration-150"
              >
                <UnoCard
                  card={card}
                  isClickable={true}
                  isPlayable={playable && isMyTurn}
                  size="hand"
                  trumpColor={trumpColor}
                  onClick={() => onCardClick(card)}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom HUD: Player Avatar with Buyer & Dealer Badges */}
        <div className="w-full flex items-center justify-center px-1.5 xs:px-3 sm:px-8 mt-0.5 sm:mt-1">
          {/* Bottom Center: Player Circular Avatar with Buyer & Dealer Badges */}
          <div className="relative flex flex-col items-center">

            {/* Circular Avatar with Neon Turn Ring */}
            <div className="relative w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 flex items-center justify-center">

              {/* Fixed Circular Buyer Badge with Bid Number in Team Color (المشتري يظهر عند صورته رقم المشترى بدائرة بلون فريقه) */}
              {isHumanBuyer && (
                <div
                  className={`absolute -top-2.5 -right-2.5 z-40 w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-black text-white text-xs xs:text-sm sm:text-base select-none ${
                    player.team === 'A'
                      ? 'bg-[#0063B0] shadow-blue-600/60 ring-1 ring-blue-300'
                      : 'bg-[#EA1D2D] shadow-red-600/60 ring-1 ring-red-300'
                  }`}
                  title={`المشتري بـ ${highestBid}`}
                >
                  <span className="font-mono font-black drop-shadow-md leading-none">
                    {highestBid === 9 ? '👑' : highestBid}
                  </span>
                </div>
              )}

              {/* Dealer Badge: علامة الموزع أكبر قليلاً وواضحة جداً (أنت الموزع وزّعت الورق وآخر من يزايد) */}
              {dealerIdx === player.id && (
                <div
                  className="absolute -bottom-2 -left-2 z-35 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-slate-950 text-slate-950 rounded-full w-7 h-7 xs:w-8 xs:h-8 flex items-center justify-center font-black shadow-lg shadow-amber-500/50 ring-2 ring-amber-300 select-none animate-pulse"
                  title="أنت الموزع (وزّعت الورق وآخر من يزايد - ملزوم بـ 5)"
                >
                  <div className="flex items-center justify-center leading-none text-slate-950 font-black text-[10px] xs:text-xs">
                    <span className="font-extrabold tracking-tighter">D</span>
                    <span className="text-[9px] -mr-0.5">🃏</span>
                  </div>
                </div>
              )}

              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
                {isMyTurn && (
                  <circle
                    className="timer-ring-neon"
                    cx="22"
                    cy="22"
                    r="20"
                    stroke={isCritical ? '#ef4444' : '#f59e0b'}
                    strokeWidth="3.5"
                    fill="none"
                    style={{ strokeDashoffset: offset }}
                  />
                )}
              </svg>
              <div
                className={`w-9 h-9 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-950 shadow-lg relative transition-all duration-300 ${
                  isMyTurn ? (isCritical ? 'glow-turn-critical-red' : 'glow-turn-phosphor') : ''
                }`}
              >
                <AvatarView avatarId={player.avatarId} customPhoto={player.customPhoto} />
              </div>
            </div>

            {/* Yellow Capsule Badge matching Jawaker's "Jacob-90" */}
            <div className="bg-[#f59e0b] text-slate-950 font-black text-[9px] xs:text-[10px] sm:text-xs px-2.5 xs:px-3 py-0.5 rounded-full shadow-md -mt-1.5 z-20 border border-yellow-300 max-w-[85px] xs:max-w-[110px] truncate">
              {player.name}
            </div>

            {/* My Turn Banner */}
            {isMyTurn && (
              <span className="text-[8px] xs:text-[9px] text-amber-300 font-black mt-0.5 animate-pulse">
                دورك الآن! اختر كرتك
              </span>
            )}
          </div>

          {/* Bottom Right: Symmetric spacer to keep player avatar centered */}
          <div className="w-[75px] xs:w-[85px] pointer-events-none" />
        </div>
      </div>
    </footer>
  );
};
