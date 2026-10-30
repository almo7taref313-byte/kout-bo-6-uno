import React, { useState, useEffect } from 'react';
import { BidRecord, CalloutMessage, Player, SuitColor, TrickPlay } from '../types';
import { TURN_TIMER_DURATION } from '../utils/gameLogic';
import { AvatarView } from '../utils/avatars';
import { UnoCard } from './UnoCard';
import { ComicBidBubble } from './ComicBidBubble';

interface TableArenaProps {
  players: Player[];
  currentTrick: TrickPlay[];
  trumpColor: SuitColor | null;
  highestBid: number;
  bidWinner: number | null;
  isForcedBid: boolean;
  biddingHistory: BidRecord[];
  currentTurn: number;
  timerRemaining: number;
  phase: string;
  callout: CalloutMessage | null;
  humanSeatIndex?: number;
  collectingWinnerId?: number | null;
  dealerIdx?: number;
  isBaoonPendingTrump?: boolean;
  isTimerDisabled?: boolean;
}

interface CardCoord {
  x: number;
  y: number;
  rotate: number;
}

// إحداثيات الورق الواسعة في الوضع الرأسي (Portrait)
const PORTRAIT_CARD_RESTING_SLOTS: Record<number, CardCoord> = {
  0: { x: 0, y: 76, rotate: 0 },
  1: { x: 88, y: 42, rotate: -8 },
  2: { x: 88, y: -42, rotate: -8 },
  3: { x: 0, y: -72, rotate: 0 },
  4: { x: -88, y: -42, rotate: 8 },
  5: { x: -88, y: 42, rotate: 8 },
};

// إحداثيات الورق في الوضع الأفقي (Landscape) - متباعدة جداً بين طارق ومشاري وبندر
const LANDSCAPE_CARD_RESTING_SLOTS: Record<number, CardCoord> = {
  0: { x: 0, y: 55, rotate: 0 },        // أنت
  1: { x: 195, y: 35, rotate: -10 },    // عبود
  2: { x: 155, y: -42, rotate: -6 },    // مشاري (متباعد تماماً عن طارق بـ 155px)
  3: { x: 0, y: -50, rotate: 0 },       // طارق
  4: { x: -155, y: -42, rotate: 6 },    // بندر (متباعد تماماً عن طارق بـ 155px)
  5: { x: -195, y: 35, rotate: 10 },    // سعود
};

// إحداثيات وصول الأكلة إلى مقاعد اللاعبين في الوضع الرأسي بالضبط
const PORTRAIT_WINNER_TARGETS: Record<number, CardCoord> = {
  0: { x: 0, y: 220, rotate: 0 },
  1: { x: 190, y: 130, rotate: 10 },
  2: { x: 190, y: -130, rotate: 10 },
  3: { x: 0, y: -220, rotate: 0 },
  4: { x: -190, y: -130, rotate: -10 },
  5: { x: -190, y: 130, rotate: -10 },
};

// إحداثيات وصول الأكلة مباشرة إلى صور اللاعبين في الوضع الأفقي
const LANDSCAPE_WINNER_TARGETS: Record<number, CardCoord> = {
  0: { x: 0, y: 230, rotate: 0 },       // إلى صورتك بالأسفل
  1: { x: 440, y: 55, rotate: 12 },     // إلى صورة عبود بالطرف الأيمن
  2: { x: 330, y: -140, rotate: 10 },   // إلى صورة مشاري في أعلى اليمين
  3: { x: 0, y: -145, rotate: 0 },      // إلى صورة طارق في أعلى المنتصف
  4: { x: -330, y: -140, rotate: -10 }, // إلى صورة بندر في أعلى اليسار
  5: { x: -440, y: 55, rotate: -12 },   // إلى صورة سعود بالطرف الأيسر
};

export const TableArena: React.FC<TableArenaProps> = ({
  players,
  humanSeatIndex = 0,
  currentTrick,
  trumpColor,
  highestBid,
  bidWinner,
  isForcedBid,
  biddingHistory,
  currentTurn,
  timerRemaining,
  phase,
  callout,
  collectingWinnerId = null,
  dealerIdx = 0,
  isBaoonPendingTrump,
  isTimerDisabled = false,
}) => {
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const isBaoonActive = isBaoonPendingTrump !== undefined ? isBaoonPendingTrump : (highestBid === 9 && trumpColor === null);
  const botSeatIndices = [0, 1, 2, 3, 4, 5].filter((idx) => idx !== humanSeatIndex);
  const humanLatestBid = biddingHistory.filter((b) => b.playerId === humanSeatIndex).pop();

  const TIMER_RADIUS = 24;
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
  const timerRatio = Math.max(0, Math.min(1, timerRemaining / TURN_TIMER_DURATION));
  const timerOffset = TIMER_CIRCUMFERENCE * (1 - timerRatio);

  const activeCardSlots = isLandscape ? LANDSCAPE_CARD_RESTING_SLOTS : PORTRAIT_CARD_RESTING_SLOTS;
  const activeWinnerTargets = isLandscape ? LANDSCAPE_WINNER_TARGETS : PORTRAIT_WINNER_TARGETS;

  return (
    <main className="arena-center-stage flex-1 min-h-0 min-w-0 flex items-center justify-center w-full px-2 py-0.5 relative overflow-hidden">
      
      <div 
        style={isLandscape ? { width: '94vw', maxWidth: '880px', height: '94%', maxHeight: '340px' } : { width: '88%', maxWidth: '420px', height: '92%', maxHeight: '480px' }}
        className={`jawaker-table-felt rounded-[42px] xs:rounded-[50px] sm:rounded-[64px] relative flex items-center justify-center select-none shadow-2xl transition-all duration-300 ${
          isBaoonActive ? 'table-baoon-festive-lights ring-4 ring-yellow-400/80 ring-offset-2 ring-offset-slate-900' : ''
        }`}
      >

        {/* أضواء الباون */}
        {isBaoonActive && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-slate-950 font-black px-3 py-0.5 rounded-full text-[10px] sm:text-xs shadow-2xl border border-yellow-200 animate-bounce flex items-center gap-1 z-40 whitespace-nowrap">
            <span>👑</span>
            <span>باون كاسح! تحديد الحكم...</span>
          </div>
        )}

        {/* علامة الطاولة المائية */}
        <div className="table-felt-watermark">
          <span className="text-base sm:text-2xl font-black tracking-widest opacity-80">
            كوت بو ٦ أونو
          </span>
        </div>

        {/* رسائل وسط الطاولة */}
        {callout && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none select-none animate-bounce">
            <div className="bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 border-2 border-amber-400 text-amber-200 px-4 py-2 rounded-2xl shadow-2xl shadow-amber-950/80 flex items-center gap-2 backdrop-blur-md ring-4 ring-yellow-400/30">
              <span className="text-2xl filter drop-shadow">{callout.emoji}</span>
              <span className="text-sm sm:text-base font-black text-white whitespace-nowrap drop-shadow tracking-wide">
                {callout.text}
              </span>
            </div>
          </div>
        )}

        {/* ساحة الأوراق المرمية - مكبرة وواضحة (scale-0.96 في الأفقي و scale-1.05 في الرأسي) */}
        <div className={`relative w-full h-full flex items-center justify-center pointer-events-none z-20 ${
          isLandscape ? 'scale-[0.96] xs:scale-[1.0]' : 'scale-[0.95] xs:scale-[1.0] sm:scale-105'
        }`}>
          {currentTrick.map((play, index) => {
            const isCollecting = collectingWinnerId !== null && currentTrick.length === 6;
            const relPlaySlot = (play.playerId - humanSeatIndex + 6) % 6;
            const rest = activeCardSlots[relPlaySlot] || { x: 0, y: 0, rotate: 0 };
            const relWinnerSlot = collectingWinnerId !== null ? (collectingWinnerId - humanSeatIndex + 6) % 6 : 0;
            const winnerTarget = isCollecting ? activeWinnerTargets[relWinnerSlot] : null;

            const targetX = isCollecting && winnerTarget ? winnerTarget.x : rest.x;
            const targetY = isCollecting && winnerTarget ? winnerTarget.y : rest.y;
            const targetRotate = isCollecting && winnerTarget ? winnerTarget.rotate : rest.rotate;
            const targetScale = isCollecting ? 0.15 : 1;

            return (
              <div
                key={`${play.playerId}-${play.card.id}`}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate3d(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px), 0) rotate(${targetRotate}deg) scale(${targetScale})`,
                  transition: isCollecting
                    ? 'transform 1450ms cubic-bezier(0.22, 1, 0.36, 1), opacity 1150ms ease-in'
                    : 'transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: isCollecting ? 0 : 1,
                  zIndex: isCollecting ? 40 + index : 20 + index,
                  willChange: 'transform, opacity',
                  transformOrigin: 'center center',
                }}
                className="pointer-events-none flex flex-col items-center"
              >
                <UnoCard
                  card={play.card}
                  isClickable={false}
                  size="table"
                  trumpColor={trumpColor}
                />
              </div>
            );
          })}
        </div>

        {/* فقاعة مزاد اللاعب البشري */}
        {phase === 'BIDDING' && humanLatestBid && players[humanSeatIndex] && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-35 pointer-events-none">
            <ComicBidBubble
              val={humanLatestBid.val}
              team={players[humanSeatIndex].team}
              seatPosition="bottom-center"
            />
          </div>
        )}

        {/* مقاعد اللاعبين الخمسة */}
        {botSeatIndices.map((idx) => {
          const player = players[idx] || {
            id: idx,
            name: `بوت ${idx + 1}`,
            team: idx % 2 === 0 ? 'A' : 'B',
            isHuman: false,
            hand: [],
            tricksWon: 0,
            avatarId: 'kuwaiti_shemagh_red',
            customPhoto: null,
          };

          const isTeamA = player.team === 'A';
          const isTurn = currentTurn === idx && phase !== 'ROUND_END' && phase !== 'MATCH_OVER';
          const isBuyer = bidWinner === idx && highestBid > 4;
          const latestBid = biddingHistory.filter((b) => b.playerId === idx).pop();

          const relPos = (idx - humanSeatIndex + 6) % 6;
          let posClass = '';

          if (!isLandscape) {
            // التوزيع الرأسي (Portrait)
            if (relPos === 1) posClass = 'bottom-[16%] right-[-14px] xs:right-[-18px] sm:right-[-22px]';
            else if (relPos === 2) posClass = 'top-[16%] right-[-14px] xs:right-[-18px] sm:right-[-22px]';
            else if (relPos === 3) posClass = 'top-[-20px] left-1/2 -translate-x-1/2';
            else if (relPos === 4) posClass = 'top-[16%] left-[-14px] xs:left-[-18px] sm:left-[-22px]';
            else if (relPos === 5) posClass = 'bottom-[16%] left-[-14px] xs:left-[-18px] sm:left-[-22px]';
          } else {
            // التوزيع الأفقي المنضبط (Landscape)
            // تم إنزال طارق إلى top-[22px] ليظهر رقم الشارة كاملاً برؤية مريحة
            if (relPos === 1) {
              posClass = 'top-[66%] -translate-y-1/2 right-[-26px]';
            } else if (relPos === 2) {
              posClass = 'top-[18px] right-[10%]';
            } else if (relPos === 3) {
              posClass = 'top-[22px] left-1/2 -translate-x-1/2';
            } else if (relPos === 4) {
              posClass = 'top-[18px] left-[10%]';
            } else if (relPos === 5) {
              posClass = 'top-[66%] -translate-y-1/2 left-[-26px]';
            }
          }

          let targetBadgePosClass = '';
          if (relPos === 1 || relPos === 2 || relPos === 3) {
            targetBadgePosClass = '-right-7 top-1/2 -translate-y-1/2';
          } else {
            targetBadgePosClass = '-left-7 top-1/2 -translate-y-1/2';
          }

          const isCritical = isTurn && timerRemaining <= 4;
          const isDealer = dealerIdx === idx;

          const activeTimerColor = isCritical
            ? '#ff003b'
            : isTeamA
            ? '#00e5ff'
            : '#ff2a5f';

          const timerGlowStyle = isTurn
            ? { filter: `drop-shadow(0 0 5px ${activeTimerColor})` }
            : {};

          return (
            <div key={idx} className={`absolute ${posClass} z-30 transition-all duration-300`}>
              <div className="relative flex flex-col items-center">

                {/* فقاعة المزاد للبوت */}
                {phase === 'BIDDING' && latestBid && (
                  <div
                    className={`absolute z-35 pointer-events-none ${
                      relPos === 1 || relPos === 2
                        ? '-left-[64px] top-1/2 -translate-y-1/2'
                        : relPos === 3
                        ? 'top-[44px] left-1/2 -translate-x-1/2'
                        : '-right-[64px] top-1/2 -translate-y-1/2'
                    }`}
                  >
                    <ComicBidBubble
                      val={latestBid.val}
                      team={player.team}
                      seatPosition={
                        relPos === 1 ? 'bottom-right' : relPos === 2 ? 'top-right' : relPos === 3 ? 'top-center' : relPos === 4 ? 'top-left' : 'bottom-left'
                      }
                    />
                  </div>
                )}

                {/* الحاوية الدائرية للأفاتار */}
                <div className={`relative flex items-center justify-center ${
                  isLandscape ? 'w-9 h-9' : 'w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13'
                }`}>
                  
                  {isBuyer && (
                    <div className={`absolute ${targetBadgePosClass} z-40 pointer-events-none select-none animate-bounce`}>
                      {isForcedBid ? (
                        <div
                          className={`px-2 py-0.5 rounded-full bg-white flex items-center justify-center shadow-xl whitespace-nowrap ${
                            player.team === 'A'
                              ? 'border-2 border-[#0063B0] ring-1 ring-blue-500/40'
                              : 'border-2 border-[#EA1D2D] ring-1 ring-red-500/40'
                          }`}
                        >
                          <span className="font-black text-black text-[8px] xs:text-[9px] leading-none">
                            ملزوم ⚡
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 xs:w-7 xs:h-7 rounded-full bg-white flex items-center justify-center shadow-xl ${
                            player.team === 'A'
                              ? 'border-2 border-[#0063B0] ring-1 ring-blue-500/40'
                              : 'border-2 border-[#EA1D2D] ring-1 ring-red-500/40'
                          }`}
                        >
                          <span className="font-mono font-black text-black text-[11px] leading-none">
                            {highestBid === 9 ? '👑' : highestBid}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isDealer && (
                    <span
                      className="absolute -bottom-1 -left-1 z-40 text-white font-black text-xs xs:text-sm leading-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                      title="الموزع (Dealer)"
                    >
                      D
                    </span>
                  )}

                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-20 transform -rotate-90"
                    viewBox="0 0 52 52"
                    style={timerGlowStyle}
                  >
                    <circle
                      cx="26"
                      cy="26"
                      r={TIMER_RADIUS}
                      stroke="rgba(0, 0, 0, 0.45)"
                      strokeWidth="3.5"
                      fill="none"
                    />

                    <circle
                      cx="26"
                      cy="26"
                      r={TIMER_RADIUS}
                      stroke={isTeamA ? 'rgba(0, 160, 255, 0.3)' : 'rgba(255, 40, 80, 0.3)'}
                      strokeWidth="2"
                      fill="none"
                    />

                    {isTurn && !isTimerDisabled && (
                      <circle
                        cx="26"
                        cy="26"
                        r={TIMER_RADIUS}
                        stroke={activeTimerColor}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        fill="none"
                        style={{
                          strokeDasharray: `${TIMER_CIRCUMFERENCE}px`,
                          strokeDashoffset: `${timerOffset}px`,
                          transition: 'stroke-dashoffset 200ms linear, stroke 300ms ease',
                        }}
                      />
                    )}

                    {isTurn && isTimerDisabled && (
                      <circle
                        cx="26"
                        cy="26"
                        r={TIMER_RADIUS}
                        stroke={activeTimerColor}
                        strokeWidth="3.8"
                        fill="none"
                        className="animate-pulse"
                      />
                    )}
                  </svg>

                  <div
                    className={`rounded-full overflow-hidden border border-slate-700 bg-slate-950 shadow-inner relative transition-all duration-300 ${
                      isLandscape ? 'w-8 h-8' : 'w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-11 sm:h-11'
                    } ${isTurn && isCritical ? 'animate-pulse' : ''}`}
                  >
                    <AvatarView avatarId={player.avatarId} customPhoto={player.customPhoto} />
                  </div>
                </div>

                <div
                  className={`px-1.5 xs:px-2 py-0.5 mt-0.5 rounded-full text-center flex items-center justify-center max-w-[65px] xs:max-w-[75px] shadow-md border ${
                    isTeamA
                      ? 'bg-blue-950/90 border-cyan-500/50 text-cyan-200'
                      : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                  }`}
                >
                  <span className="text-[7.5px] xs:text-[8px] font-black truncate leading-none">
                    {player.name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};
