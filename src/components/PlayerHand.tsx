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
      className={`relative w-full bg-[#181a1f]/95 border-t border-[#2a2f3a] pt-1 pb-3 sm:pb-4 px-2 safe-bottom select-none flex-shrink-0 transition-all duration-200 ${
        isBiddingPhase ? 'z-50 ring-2 ring-emerald-500/50 shadow-2xl bg-[#14161b]' : 'z-30'
      }`}
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        {/* تنبيه دورك الآن عند نزول الكروت للأسفل */}
        {isMyTurn && (
          <div className="text-[9px] xs:text-[10px] font-black text-cyan-300 bg-cyan-950/80 border border-cyan-400/50 px-2.5 py-0.2 rounded-full mb-0.5 shadow-md animate-pulse">
            <span>دورك الآن! اختر كرتك</span>
          </div>
        )}

        {/* أوراق اليد: متراصة ومتباعدة بنعومة وبدون تموج وبكامل ارتفاعها دون قص */}
        <div className="w-full flex items-center justify-center min-h-[90px] xs:min-h-[98px] sm:min-h-[110px] md:min-h-[125px] -space-x-3 xs:-space-x-3.5 sm:-space-x-4 md:-space-x-5 overflow-x-auto px-1 sm:px-2 py-1.5 no-scrollbar">
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
      </div>
    </footer>
  );
};
