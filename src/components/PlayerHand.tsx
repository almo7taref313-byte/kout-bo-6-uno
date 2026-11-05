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
  isLandscapeMode?: boolean;
  onTableTap?: () => void;
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
  isLandscapeMode,
  onTableTap,
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

  const [handGapPx, setHandGapPx] = React.useState<number>(3);
  const handRowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateSpacing = () => {
      const count = Math.max(1, sortedHand.length);
      if (count <= 1) {
        setHandGapPx(0);
        return;
      }

      const rowEl = handRowRef.current;
      const measuredRowW = rowEl ? rowEl.clientWidth || rowEl.offsetWidth : 0;
      const firstCardEl = rowEl?.querySelector('.uno-card-hand') as HTMLElement | null;
      const measuredCardW = firstCardEl ? firstCardEl.offsetWidth || firstCardEl.clientWidth : 0;

      const isForcedLandscape =
        typeof document !== 'undefined' &&
        document.body.classList.contains('forced-landscape-mode');
      const isForcedPortrait =
        typeof document !== 'undefined' &&
        document.body.classList.contains('forced-portrait-mode');
      const isLandscape =
        isLandscapeMode !== undefined
          ? isLandscapeMode
          : isForcedLandscape || (!isForcedPortrait && window.innerWidth > window.innerHeight);

      const fallbackViewportW = isLandscape
        ? Math.max(window.innerWidth, window.innerHeight)
        : window.innerWidth;
      const effectiveWidth = measuredRowW > 120 ? measuredRowW : fallbackViewportW;

      const cardW =
        measuredCardW > 20
          ? measuredCardW
          : effectiveWidth >= 820
          ? 84
          : effectiveWidth >= 740
          ? 80
          : effectiveWidth >= 600
          ? 74
          : effectiveWidth >= 480
          ? 64
          : effectiveWidth >= 410
          ? 50
          : effectiveWidth >= 360
          ? 48
          : 45;

      const sideMargin = effectiveWidth >= 600 ? 32 : effectiveWidth >= 380 ? 44 : 32;
      const availW = Math.max(200, effectiveWidth - sideMargin);
      const totalCardsW = count * cardW;
      const maxPreferredGap = effectiveWidth >= 700 ? (count >= 8 ? 5 : 8) : 4;

      if (totalCardsW + (count - 1) * maxPreferredGap <= availW) {
        setHandGapPx(maxPreferredGap);
      } else {
        const calculatedGap = Math.floor((availW - totalCardsW) / (count - 1));
        setHandGapPx(Math.max(-14, Math.min(maxPreferredGap, calculatedGap)));
      }
    };

    updateSpacing();
    const t1 = setTimeout(updateSpacing, 60);
    const t2 = setTimeout(updateSpacing, 220);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && handRowRef.current) {
      ro = new ResizeObserver(updateSpacing);
      ro.observe(handRowRef.current);
    }

    window.addEventListener('resize', updateSpacing);
    window.addEventListener('orientationchange', updateSpacing);
    window.addEventListener('kout-layout-refresh', updateSpacing);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSpacing);
      window.removeEventListener('orientationchange', updateSpacing);
      window.removeEventListener('kout-layout-refresh', updateSpacing);
    };
  }, [sortedHand.length, isLandscapeMode]);

  return (
    <footer
      onClick={() => onTableTap?.()}
      className={`player-hand-footer relative w-full bg-[#181a1f]/95 border-t border-[#2a2f3a] pt-1 sm:pt-1.5 pb-1.5 sm:pb-2 px-2 xs:px-3 sm:px-3 select-none flex-shrink-0 overflow-visible ${
        isBiddingPhase ? 'z-50 ring-2 ring-emerald-500/50 shadow-2xl bg-[#14161b]' : 'z-40'
      }`}
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center overflow-visible">
        {/* ترتيب أوراق اليد من اليسار لليمين بمسافات متوازنة وهوامش جانبية مريحة */}
        <div
          ref={handRowRef}
          dir="ltr"
          style={{ direction: 'ltr' }}
          className="player-hand-row w-full flex flex-row items-end justify-center min-h-[74px] xs:min-h-[80px] sm:min-h-[114px] md:min-h-[124px] overflow-x-visible overflow-y-visible px-2 sm:px-4 pt-1.5 sm:pt-2 pb-1 no-scrollbar"
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
                  marginLeft: idx === 0 ? '0px' : `${handGapPx}px`,
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
