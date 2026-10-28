import React from 'react';
import { Card, Player, SuitColor, TrickPlay } from '../types';
import { isLegalMove, sortHandCards, SUIT_COLORS, TURN_TIMER_DURATION } from '../utils/gameLogic';
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
  isActionPending,
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
        
        {/* User Rule: "عند الشراء يجب ان يرى اللاعب اوراقه بوضوح" */}
        {isBiddingPhase && (
          <div className="text-[10px] xs:text-[11px] font-black text-amber-300 bg-black/80 border border-amber-400/60 px-3 py-0.5 rounded-full mb-1 flex items-center gap-1.5 shadow-lg animate-pulse">
            <span>🃏 أوراقك (9 كروت): تفحص ألوانك وقوتك لتحديد طلبك</span>
          </div>
        )}

        {/* Cards Row sorted by colors, and high-to-low from left to right */}
        <div
          className={`w-full flex items-center justify-center -space-x-3 xs:-space-x-3.5 sm:-space-x-4 md:-space-x-5 overflow-x-auto px-1 sm:px-2 py-0.5 sm:py-1 min-h-[72px] xs:min-h-[82px] sm:min-h-[105px] md:min-h-[120px] no-scrollbar ${
            isBiddingPhase ? 'py-1' : ''
          }`}
        >
          {sortHandCards(activePlayer.hand, trumpColor).map((card, idx) => {
            const playable = isMyTurn
              ? isLegalMove(activePlayer.hand, card, currentTrick, highestBid, trumpColor, isHumanBuyer)
              : false;
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

              {/* علامة الأكلات عند صورة الحاكم: دائرة باللون الأبيض الثلجي ورقم الأكلة بالأسود الواضح محاطة بدائرة بلون الفريق */}
              {isHumanBuyer && (
                <div
                  className={`absolute -top-2 -right-2 xs:-top-2.5 xs:-right-2.5 z-40 w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center select-none shadow-xl ${
                    activePlayer.team === 'A'
                      ? 'border-[2.5px] xs:border-[3px] border-[#0063B0] ring-1 xs:ring-2 ring-blue-500/50 shadow-blue-600/40'
                      : 'border-[2.5px] xs:border-[3px] border-[#EA1D2D] ring-1 xs:ring-2 ring-red-500/50 shadow-red-600/40'
                  }`}
                  title={`أنت المشتري بـ ${highestBid}`}
                >
                  <span className="font-mono font-black text-black text-xs xs:text-sm sm:text-base leading-none drop-shadow-none">
                    {highestBid === 9 ? '👑' : highestBid}
                  </span>
                </div>
              )}

              {/* كلمة "ملزوم" واضحة عند صورة اللاعب البشري إذا كان ملزوماً */}
              {isHumanBuyer && isForcedBid && (
                <div
                  className="absolute -top-5 left-1/2 -translate-x-1/2 z-45 whitespace-nowrap bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[8.5px] xs:text-[9.5px] px-2.5 py-0.2 rounded-full border border-yellow-200 shadow-xl shadow-amber-500/50 select-none animate-pulse flex items-center gap-0.5"
                  title="أنت الموزع الملزوم (تحتسب 5 نقاط فقط عند الخسارة ولا تتضاعف)"
                >
                  <span>ملزوم</span>
                  <span className="text-[8px]">⚡</span>
                </div>
              )}

              {/* Dealer Badge: علامة الموزع أكبر قليلاً وواضحة جداً (أنت الموزع وزّعت الورق وآخر من يزايد) */}
              {dealerIdx === activePlayer.id && (
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
                {isMyTurn && !isTimerDisabled && (
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
                {isMyTurn && isTimerDisabled && (
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    fill="none"
                    className="animate-pulse"
                  />
                )}
              </svg>
              <div
                className={`w-9 h-9 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-950 shadow-lg relative transition-all duration-300 ${
                  isMyTurn ? (isCritical ? 'glow-turn-critical-red' : 'glow-turn-phosphor') : ''
                }`}
              >
                <AvatarView avatarId={activePlayer.avatarId} customPhoto={activePlayer.customPhoto} />
              </div>
            </div>

            {/* Yellow Capsule Badge matching Jawaker's "Jacob-90" */}
            <div className="bg-[#f59e0b] text-slate-950 font-black text-[9px] xs:text-[10px] sm:text-xs px-2.5 xs:px-3 py-0.5 rounded-full shadow-md -mt-1.5 z-20 border border-yellow-300 max-w-[85px] xs:max-w-[110px] truncate">
              {activePlayer.name}
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
