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
  isForcedBid: _isForcedBid,
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
        
        {/* أوراقك أثناء المزاد */}
        {isBiddingPhase && (
          <div className="text-[10px] xs:text-[11px] font-black text-amber-300 bg-black/80 border border-amber-400/60 px-3 py-0.5 rounded-full mb-1 flex items-center gap-1.5 shadow-lg animate-pulse">
            <span>🃏 أوراقك (9 كروت): تفحص ألوانك وقوتك لتحديد طلبك</span>
          </div>
        )}

        {/* صف أوراق اليد */}
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

        {/* شريط معلومات اللاعب بالأسفل */}
        <div className="w-full flex items-center justify-center px-1.5 xs:px-3 sm:px-8 mt-0.5 sm:mt-1">
          <div className="relative flex flex-col items-center">

            {/* الحاوية الدائرية للأفاتار مع المؤقت الأزرق */}
            <div className="relative w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 flex items-center justify-center">

              {/* أيقونة الديلر: حرف D باللون الأبيض الناصع بإطار أبيض وخلفية داكنة محايدة تمنع أي تعارض مع الصورة */}
              {dealerIdx === activePlayer.id && (
                <div
                  className="absolute -bottom-1 -left-1 z-40 bg-slate-900 border-2 border-white text-white rounded-full w-6 h-6 xs:w-6.5 xs:h-6.5 flex items-center justify-center font-black shadow-lg shadow-black/80 select-none ring-1 ring-slate-950"
                  title="أنت الموزع (Dealer)"
                >
                  <span className="font-black text-white text-[11px] leading-none tracking-tight">D</span>
                </div>
              )}

              {/* حلقة المؤقت: أزرق ناصع متناسق مع الفريق الأزرق بدلاً من الأصفر */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
                {isMyTurn && !isTimerDisabled && (
                  <circle
                    className="timer-ring-neon"
                    cx="22"
                    cy="22"
                    r="20"
                    stroke={isCritical ? '#ef4444' : '#3b82f6'}
                    strokeWidth="3.5"
                    fill="none"
                    style={{ strokeDashoffset: offset }}
                  />
                )}
                {isMyTurn && isTimerDisabled && (
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                    fill="none"
                    className="animate-pulse"
                  />
                )}
              </svg>

              {/* دائرة صورتك الشخصية: إطار أزرق ملكي بدلاً من الأصفر */}
              <div
                className={`w-9 h-9 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-blue-500 ring-2 ring-blue-500/50 bg-slate-950 shadow-lg relative transition-all duration-300 ${
                  isMyTurn ? (isCritical ? 'shadow-red-500/50 shadow-md ring-red-500/70' : 'shadow-blue-500/50 shadow-md') : ''
                }`}
              >
                <AvatarView avatarId={activePlayer.avatarId} customPhoto={activePlayer.customPhoto} />
              </div>
            </div>

            {/* شارة اسم اللاعب باللون الأزرق الملكي */}
            <div className="bg-blue-600 text-white font-black text-[9px] xs:text-[10px] sm:text-xs px-2.5 xs:px-3 py-0.5 rounded-full shadow-md -mt-1.5 z-20 border border-blue-300 max-w-[85px] xs:max-w-[110px] truncate">
              {activePlayer.name}
            </div>

            {/* تنبيه دورك للعب */}
            {isMyTurn && (
              <span className="text-[8px] xs:text-[9px] text-blue-300 font-black mt-0.5 animate-pulse">
                دورك الآن! اختر كرتك
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
