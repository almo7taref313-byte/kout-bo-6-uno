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
      className={`relative w-full bg-[#181a1f]/95 border-t border-[#2a2f3a] pt-1 pb-1.5 sm:pb-2.5 px-1.5 sm:px-3 ${
        isBiddingPhase ? 'z-50 ring-2 ring-emerald-500/50 shadow-2xl bg-[#14161b]' : 'z-30'
      } safe-bottom select-none flex-shrink-0 transition-all duration-200`}
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        
        {/* تنبيه الأوراق أثناء المزاد */}
        {isBiddingPhase && (
          <div className="text-[10px] xs:text-[11px] font-black text-amber-300 bg-black/80 border border-amber-400/60 px-3 py-0.5 rounded-full mb-1 flex items-center gap-1.5 shadow-lg animate-pulse">
            <span>🃏 أوراقك (9 كروت): تفحص ألوانك وقوتك لتحديد طلبك</span>
          </div>
        )}

        {/* أوراق اليد */}
        <div
          className={`w-full flex items-center justify-center -space-x-3 xs:-space-x-3.5 sm:-space-x-4 md:-space-x-5 overflow-x-auto px-1 sm:px-2 py-0.5 sm:py-1 min-h-[72px] xs:min-h-[82px] sm:min-h-[105px] md:min-h-[120px] no-scrollbar ${
            isBiddingPhase ? 'py-1' : ''
          }`}
        >
          {sortHandCards(activePlayer.hand, trumpColor).map((card, idx) => {
            const isLegal = isMyTurn
              ? isLegalMove(activePlayer.hand, card, currentTrick, highestBid, trumpColor, isHumanBuyer)
              : true;
            return (
              <div
                key={card.id}
                style={{
                  zIndex: 10 + idx,
                  transform: isBiddingPhase ? 'translateY(-6px)' : undefined,
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

        {/* معلومات اللاعب بالأسفل */}
        <div className="w-full flex items-center justify-center px-1.5 xs:px-3 sm:px-8 mt-0.5 sm:mt-1">
          <div className="relative flex flex-col items-center">

            {/* الحاوية الدائرية للأفاتار مع رقم الحكم والمؤقت الأزرق وحرف D */}
            <div className="relative w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 flex items-center justify-center">

              {/* رقم الحكم يظهر هنا بوضوح فوق صورتك عند شرائك للمزاد */}
              {isHumanBuyer && (
                <div
                  className="absolute -top-2 -right-2 z-40 w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-white flex items-center justify-center select-none shadow-2xl border-2 border-[#0063B0] ring-2 ring-blue-500/60"
                  title={`أنت شاري بـ ${highestBid}`}
                >
                  <span className="font-mono font-black text-black text-xs xs:text-sm leading-none drop-shadow-none">
                    {highestBid === 9 ? '👑' : highestBid}
                  </span>
                </div>
              )}

              {/* شارة كلمة ملزوم إذا كنت الموزع الملزوم */}
              {isHumanBuyer && isForcedBid && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-45 whitespace-nowrap bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-yellow-200 shadow-lg select-none"
                  title="أنت الموزع الملزوم بـ 5"
                >
                  ملزوم ⚡
                </div>
              )}

              {/* حرف D أبيض عريض بدون دائرة وبلا أي لون تحته أو حوله */}
              {dealerIdx === activePlayer.id && (
                <span
                  className="absolute -bottom-1 -left-1 z-40 text-white font-black text-sm xs:text-base leading-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  title="أنت الموزع (Dealer)"
                >
                  D
                </span>
              )}

              {/* مؤقت الدور باللون الأزرق */}
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

              {/* دائرة صورتك الشخصية بإطار أزرق ناصع */}
              <div
                className={`w-9.5 h-9.5 xs:w-10.5 xs:h-10.5 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-blue-500 ring-2 ring-blue-500/50 bg-slate-950 shadow-lg relative transition-all duration-300 ${
                  isMyTurn ? (isCritical ? 'shadow-red-500/50 ring-red-500/70' : 'shadow-cyan-400/50') : ''
                }`}
              >
                <AvatarView avatarId={activePlayer.avatarId} customPhoto={activePlayer.customPhoto} />
              </div>
            </div>

            {/* شارة اسم اللاعب */}
            <div className="bg-blue-600 text-white font-black text-[9px] xs:text-[10px] sm:text-xs px-2.5 xs:px-3 py-0.5 rounded-full shadow-md -mt-1 z-20 border border-blue-300 max-w-[85px] xs:max-w-[110px] truncate">
              {activePlayer.name}
            </div>

            {/* تنبيه دورك للعب */}
            {isMyTurn && (
              <span className="text-[8px] xs:text-[9px] text-cyan-300 font-black mt-0.5 animate-pulse">
                دورك الآن! اختر كرتك
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
