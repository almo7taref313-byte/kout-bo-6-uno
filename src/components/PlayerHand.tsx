import React from 'react';
import { Card, Player, SuitColor, TrickPlay } from '../types';
import { isLegalMove, sortHandCards, TURN_TIMER_DURATION } from '../utils/gameLogic';
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
  isTimerDisabled?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  currentTurn,
  phase,
  isActionPending: _isActionPending,
  currentTrick,
  trumpColor,
  highestBid,
  bidWinner,
  isForcedBid,
  timerRemaining,
  onCardClick,
  onSendPhrase: _onSendPhrase,
  dealerIdx = 0,
  isTimerDisabled = false,
}) => {
  const activePlayer: Player = player || {
    id: 0,
    name: 'أنت',
    team: 'A',
    isHuman: true,
    isVacant: false,
    hand: [],
    avatarId: 'kuwaiti_ghutra_white',
    customPhoto: null,
  };

  const isMyTurn = currentTurn === activePlayer.id && phase === 'PLAYING' && currentTrick.length < 6;
  const isHumanBuyer = bidWinner === activePlayer.id && highestBid > 4;
  const isBiddingPhase = phase === 'BIDDING' || phase === 'CHOOSE_TRUMP';

  const circumference = 125.6;
  const offset = isMyTurn ? circumference * (1 - timerRemaining / TURN_TIMER_DURATION) : 0;
  const isCritical = timerRemaining <= 4;

  return (
    <footer
      className={`relative w-full bg-[#181a1f]/95 border-t border-[#2a2f3a] pt-1 pb-1.5 sm:pb-2.5 px-2 safe-bottom select-none flex-shrink-0 transition-all duration-200 ${
        isBiddingPhase ? 'z-50 ring-2 ring-emerald-500/50 shadow-2xl bg-[#14161b]' : 'z-30'
      }`}
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        {/* أوراق اليد: متراصة ومتباعدة بنعومة وبدون تموج */}
        <div className="w-full flex items-center justify-center min-h-[72px] xs:min-h-[82px] sm:min-h-[105px] md:min-h-[120px] -space-x-3 xs:-space-x-3.5 sm:-space-x-4 md:-space-x-5 overflow-x-auto px-1 sm:px-2 py-0.5 no-scrollbar">
          {sortHandCards(activePlayer.hand, trumpColor).map((card, idx) => {
            const isLegal = isMyTurn
              ? isLegalMove(activePlayer.hand, card, currentTrick, highestBid, trumpColor, isHumanBuyer)
              : true;
            return (
              <div
                key={card.id}
                style={{
                  zIndex: 10 + idx,
                }}
                className="transition-transform duration-200 hover:-translate-y-2"
              >
                <UnoCard
                  card={card}
                  isClickable={true}
                  isPlayable={isMyTurn ? isLegal : true}
                  size="hand"
                  trumpColor={trumpColor}
                  onClick={() => onCardClick(card)}
                />
              </div>
            );
          })}
        </div>

        {/* صورة اللاعب وبياناته بالأسفل في المنتصف */}
        <div className="w-full flex items-center justify-center mt-0.5 sm:mt-1">
          <div className="relative flex flex-col items-center">
            <div 
              id={`avatar-player-${activePlayer.id}`}
              className="relative w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 flex items-center justify-center"
            >
              
              {isHumanBuyer && (
                <div
                  className="absolute -top-1.5 -right-1.5 z-40 w-6 h-6 xs:w-7 xs:h-7 rounded-full bg-white flex items-center justify-center select-none shadow-2xl border-2 border-[#0063B0] ring-2 ring-blue-500/60"
                  title={`أنت شاري بـ ${highestBid}`}
                >
                  <span className="font-mono font-black text-black text-[11px] xs:text-xs leading-none">
                    {highestBid === 9 ? '👑' : highestBid}
                  </span>
                </div>
              )}

              {isHumanBuyer && isForcedBid && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-45 whitespace-nowrap bg-amber-500 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full border border-yellow-200 shadow-lg select-none"
                  title="أنت الموزع الملزوم بـ 5"
                >
                  ملزوم ⚡
                </div>
              )}

              {dealerIdx === activePlayer.id && (
                <span
                  className="absolute -bottom-1 -left-1.5 z-40 text-amber-300 font-black text-sm xs:text-base sm:text-lg leading-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,1)] filter drop-shadow-[0_0_2px_#000]"
                  title="أنت الموزع (Dealer)"
                >
                  D
                </span>
              )}

              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 transform -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" fill="none" />
                {isMyTurn && !isTimerDisabled && (
                  <circle
                    className="timer-ring-neon"
                    cx="22"
                    cy="22"
                    r="20"
                    stroke={isCritical ? '#ef4444' : '#00e5ff'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    style={{ strokeDashoffset: offset, strokeDasharray: '125.6px' }}
                  />
                )}
              </svg>

              <div
                className={`w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-blue-500 ring-2 ring-blue-500/50 bg-slate-950 shadow-lg relative transition-all duration-300 ${
                  isMyTurn ? (isCritical ? 'shadow-red-500/50 ring-red-500/70' : 'shadow-cyan-400/50') : ''
                }`}
              >
                <AvatarView avatarId={activePlayer.avatarId} customPhoto={activePlayer.customPhoto} />
              </div>
            </div>

            <div className="bg-blue-600 text-white font-black font-sans text-[9px] xs:text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-md -mt-1 z-20 border border-blue-300 max-w-[85px] truncate leading-tight drop-shadow-sm">
              {activePlayer.name}
            </div>

            {isMyTurn && (
              <span className="text-[8px] text-cyan-300 font-black mt-0.5 animate-pulse">
                دورك الآن! اختر كرتك
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
