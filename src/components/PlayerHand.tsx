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

  const sortedHand = sortHandCards(activePlayer.hand, trumpColor);
  const overlapPx =
    sortedHand.length >= 8 ? -15 : sortedHand.length >= 6 ? -11 : -7;

  return (
    <footer
      className={`player-hand-footer relative w-full bg-[#181a1f]/95 border-t border-[#2a2f3a] pt-1.5 sm:pt-2 pb-1.5 sm:pb-2.5 px-2 xs:px-3 select-none flex-shrink-0 transition-all duration-200 overflow-visible ${
        isBiddingPhase ? 'z-50 ring-2 ring-emerald-500/50 shadow-2xl bg-[#14161b]' : 'z-40'
      }`}
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center overflow-visible">
        {/* ترتيب أوراق اليد من اليسار لليمين فعلياً بحيث يركب الكرت الأيمن فوق الطرف الأيمن للكرت الأيسر ويبقى الرقم العلوي الأيسر مكشوفاً 100% */}
        <div
          dir="ltr"
          style={{ direction: 'ltr' }}
          className="player-hand-row w-full flex flex-row items-end justify-center min-h-[78px] xs:min-h-[84px] sm:min-h-[108px] md:min-h-[122px] overflow-x-visible overflow-y-visible px-2 sm:px-4 pt-2 sm:pt-3 pb-1 no-scrollbar"
        >
          {sortedHand.map((card, idx) => {
            const isLegal = isMyTurn
              ? isLegalMove(activePlayer.hand, card, currentTrick, highestBid, trumpColor, isHumanBuyer)
              : true;
            return (
              <div
                key={card.id}
                style={{
                  zIndex: 10 + idx,
                  marginLeft: idx === 0 ? '0px' : `${overlapPx}px`,
                }}
                className="transition-transform duration-200 hover:-translate-y-2.5"
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
