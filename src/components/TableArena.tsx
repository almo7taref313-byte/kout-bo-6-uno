import React from 'react';
import { BidRecord, CalloutMessage, Player, SuitColor, TrickPlay } from '../types';
import { SUIT_COLORS, TURN_TIMER_DURATION } from '../utils/gameLogic';
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

// 1. مواقع استقرار الكروت أثناء الرمي (معدلة لمنع انقلاب الكروت وفصل كروت الأطراف تماماً)
const TABLE_CARD_RESTING_SLOTS: Record<number, CardCoord> = {
  0: { x: 0, y: 78, rotate: 0 },        // أنت (الأسفل) - زاوية 0 مستقيمة تماماً ومعتدلة للقراءة
  1: { x: 96, y: 48, rotate: -8 },      // يمين أسفل (عبود) - مفصولة للأسفل
  2: { x: 96, y: -48, rotate: -8 },     // يمين أعلى (مشاري) - مفصولة للأعلى لمنع التداخل
  3: { x: 0, y: -74, rotate: 0 },       // أعلى وسط (طارق) - معتدلة غير مقلوبة
  4: { x: -96, y: -48, rotate: 8 },     // يسار أعلى (بندر) - مفصولة للأعلى
  5: { x: -96, y: 48, rotate: 8 },      // يسار أسفل (سعود) - مفصولة للأسفل لمنع التداخل
};

// 2. إحداثيات انزلاق الأوراق نحو مقعد الفائز
const WINNER_SEAT_TARGETS: Record<number, CardCoord> = {
  0: { x: 0, y: 230, rotate: 0 },
  1: { x: 195, y: 115, rotate: 12 },
  2: { x: 195, y: -115, rotate: 15 },
  3: { x: 0, y: -220, rotate: 0 },
  4: { x: -195, y: -115, rotate: -15 },
  5: { x: -195, y: 115, rotate: -12 },
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
  const isBaoonActive = isBaoonPendingTrump !== undefined ? isBaoonPendingTrump : (highestBid === 9 && trumpColor === null);
  const botSeatIndices = [0, 1, 2, 3, 4, 5].filter((idx) => idx !== humanSeatIndex);
  const humanLatestBid = biddingHistory.filter((b) => b.playerId === humanSeatIndex).pop();
  const isHumanBuyer = bidWinner === humanSeatIndex && highestBid > 4;
  const humanPlayer = players[humanSeatIndex];

  return (
    <main className="arena-center-stage flex-1 min-h-0 min-w-0 flex items-center justify-center w-full px-1 xs:px-2 py-0.5 sm:py-2 relative overflow-hidden">
      
      {/* Jawaker Vertical Stadium Table */}
      <div className={`jawaker-table-felt rounded-[36px] xs:rounded-[44px] sm:rounded-[56px] md:rounded-[64px] w-[80%] xs:w-[82%] sm:w-[85%] md:w-[88%] max-w-[420px] sm:max-w-[480px] md:max-w-[540px] h-[94%] max-h-[460px] sm:max-h-[520px] relative flex items-center justify-center p-1.5 xs:p-2 select-none shadow-2xl transition-all duration-300 ${
        isBaoonActive ? 'table-baoon-festive-lights ring-4 ring-yellow-400/80 ring-offset-2 ring-offset-slate-900' : ''
      }`}>
        
        {/* أضواء الباون الاحتفالية */}
        {isBaoonActive && (
          <>
            <div className="baoon-lights-frame" />
            <div className="absolute inset-1 pointer-events-none z-30 rounded-[34px] xs:rounded-[42px] sm:rounded-[54px] md:rounded-[62px] overflow-hidden">
              <div className="absolute top-1.5 left-6 right-6 flex justify-around">
                {['#ea1d2d', '#fed000', '#2eb844', '#0063b0', '#e11d48', '#a855f7', '#f97316', '#38bdf8'].map((col, i) => (
                  <div
                    key={`top-${i}`}
                    className="w-2.5 h-2.5 rounded-full festive-bulb border border-white/60 shadow-md"
                    style={{ backgroundColor: col, color: col, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="absolute bottom-1.5 left-6 right-6 flex justify-around">
                {['#38bdf8', '#f97316', '#a855f7', '#e11d48', '#0063b0', '#2eb844', '#fed000', '#ea1d2d'].map((col, i) => (
                  <div
                    key={`bottom-${i}`}
                    className="w-2.5 h-2.5 rounded-full festive-bulb border border-white/60 shadow-md"
                    style={{ backgroundColor: col, color: col, animationDelay: `${i * 0.12 + 0.06}s` }}
                  />
                ))}
              </div>
              <div className="absolute top-10 bottom-10 left-1.5 flex flex-col justify-around">
                {['#ea1d2d', '#2eb844', '#fed000', '#a855f7'].map((col, i) => (
                  <div
                    key={`left-${i}`}
                    className="w-2.5 h-2.5 rounded-full festive-bulb border border-white/60 shadow-md"
                    style={{ backgroundColor: col, color: col, animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
              <div className="absolute top-10 bottom-10 right-1.5 flex flex-col justify-around">
                {['#0063b0', '#e11d48', '#38bdf8', '#f97316'].map((col, i) => (
                  <div
                    key={`right-${i}`}
                    className="w-2.5 h-2.5 rounded-full festive-bulb border border-white/60 shadow-md"
                    style={{ backgroundColor: col, color: col, animationDelay: `${i * 0.18 + 0.08}s` }}
                  />
                ))}
              </div>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-slate-950 font-black px-3.5 py-1 rounded-full text-[11px] sm:text-xs shadow-2xl border border-yellow-200 animate-bounce flex items-center gap-1.5 z-40">
                <span>👑</span>
                <span>باون كاسح! تحديد الحكم...</span>
                <span>✨</span>
              </div>
            </div>
          </>
        )}

        {/* علامة الطاولة المائية */}
        <div className="table-felt-watermark">
          <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest">
            كوت بو ٦ أونو
          </span>
        </div>

        {/* تحذير الجيكر أو الميكر */}
        {currentTrick.length > 0 && highestBid !== 9 && (currentTrick[0].card.isJoker || currentTrick[0].card.isMaker) && (
          <div className="absolute top-1/2 -translate-y-1/2 left-2 xs:left-3 sm:left-4 z-40 pointer-events-none animate-pulse">
            <div className="bg-gradient-to-r from-red-950/95 via-rose-900/95 to-red-950/95 border-2 border-red-500/90 text-amber-200 px-2.5 xs:px-3 py-1.5 sm:py-2 rounded-xl xs:rounded-2xl shadow-2xl flex items-center gap-1.5 xs:gap-2 shadow-red-950/90 ring-2 ring-red-400/40 backdrop-blur-sm">
              <span className="text-base xs:text-lg sm:text-xl animate-bounce">⚠️</span>
              <div className="text-right">
                <div className="text-[10px] xs:text-[11.5px] sm:text-xs font-black text-yellow-300 whitespace-nowrap drop-shadow">
                  {currentTrick[0].card.isJoker ? 'الجيكر خاس يالردي!' : 'الميكر خاس يالردي!'}
                </div>
                <div className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] text-slate-200 font-bold whitespace-nowrap">
                  الكرت التالي يحدد لون اللعب المطلوب
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الأوراق المرمية في ساحة اللعب مع ضبط التباعد وزوايا الرؤية المعتدلة */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-20 scale-[0.82] xs:scale-90 sm:scale-100">
          {currentTrick.map((play, index) => {
            const isCollecting = collectingWinnerId !== null && currentTrick.length === 6;
            
            const relPlaySlot = (play.playerId - humanSeatIndex + 6) % 6;
            const rest = TABLE_CARD_RESTING_SLOTS[relPlaySlot] || { x: 0, y: 0, rotate: 0 };
            
            const relWinnerSlot = collectingWinnerId !== null ? (collectingWinnerId - humanSeatIndex + 6) % 6 : 0;
            const winnerTarget = isCollecting ? WINNER_SEAT_TARGETS[relWinnerSlot] : null;

            const stackOffsetX = (index - 2.5) * 2;
            const stackOffsetY = (index - 2.5) * 1.5;
            const stackRotate = (index - 2.5) * 2.5;

            const targetX = isCollecting && winnerTarget ? winnerTarget.x + stackOffsetX : rest.x;
            const targetY = isCollecting && winnerTarget ? winnerTarget.y + stackOffsetY : rest.y;
            const targetRotate = isCollecting && winnerTarget ? winnerTarget.rotate + stackRotate : rest.rotate;
            const targetScale = isCollecting ? 0.22 : 1;

            const cardStyle: React.CSSProperties = {
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate3d(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px), 0) rotate(${targetRotate}deg) scale(${targetScale})`,
              transition: isCollecting
                ? 'transform 1000ms cubic-bezier(0.22, 1, 0.36, 1), opacity 850ms ease-in'
                : 'transform 450ms cubic-bezier(0.25, 1, 0.5, 1)',
              opacity: isCollecting ? 0 : 1,
              zIndex: isCollecting ? 40 + index : 20 + index,
              willChange: 'transform, opacity',
              transformOrigin: 'center center',
            };

            return (
              <div
                key={`${play.playerId}-${play.card.id}`}
                style={cardStyle}
                className="pointer-events-none flex flex-col items-center"
              >
                <div className={!isCollecting ? 'card-played-anim' : ''}>
                  <UnoCard
                    card={play.card}
                    isClickable={false}
                    size="table"
                    trumpColor={trumpColor}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* فقاعة مزاد اللاعب البشري */}
        {phase === 'BIDDING' && humanLatestBid && players[humanSeatIndex] && (
          <div className="absolute bottom-2 xs:bottom-3 left-1/2 -translate-x-1/2 z-35 pointer-events-none">
            <ComicBidBubble
              val={humanLatestBid.val}
              team={players[humanSeatIndex].team}
              seatPosition="bottom-center"
            />
          </div>
        )}

        {/* شارة اللاعب البشري (أنت) بالأسفل خارج الطاولة */}
        {isHumanBuyer && humanPlayer && (
          <div className="absolute bottom-1 right-3 xs:right-5 z-40 pointer-events-none select-none animate-bounce">
            {isForcedBid ? (
              <div
                className={`px-3 py-1 rounded-full bg-white flex items-center justify-center select-none shadow-2xl transition-all ${
                  humanPlayer.team === 'A'
                    ? 'border-[2.5px] border-[#0063B0] ring-2 ring-blue-500/40 shadow-blue-600/40'
                    : 'border-[2.5px] border-[#EA1D2D] ring-2 ring-red-500/40 shadow-red-600/40'
                }`}
                title="أنت ملزوم بـ 5"
              >
                <span className="font-black text-black text-xs xs:text-sm leading-none whitespace-nowrap">
                  ملزوم ⚡
                </span>
              </div>
            ) : (
              <div
                className={`w-8 h-8 xs:w-9 xs:h-9 rounded-full bg-white flex items-center justify-center select-none shadow-2xl ${
                  humanPlayer.team === 'A'
                    ? 'border-[3px] border-[#0063B0] ring-2 ring-blue-500/40 shadow-blue-600/50'
                    : 'border-[3px] border-[#EA1D2D] ring-2 ring-red-500/40 shadow-red-600/50'
                }`}
                title={`أنت المشتري بـ ${highestBid}`}
              >
                <span className="font-mono font-black text-black text-sm xs:text-base leading-none">
                  {highestBid === 9 ? '👑' : highestBid}
                </span>
              </div>
            )}
          </div>
        )}

        {/* مقاعد اللاعبين الخمسة الأخرى حول حافة الطاولة */}
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

          const isPartner = player.team === 'A';
          const isTurn = currentTurn === idx && phase !== 'ROUND_END' && phase !== 'MATCH_OVER';
          const isBuyer = bidWinner === idx && highestBid > 4;
          const latestBid = biddingHistory.filter((b) => b.playerId === idx).pop();

          const relPos = (idx - humanSeatIndex + 6) % 6;
          let posClass = '';
          if (relPos === 1) posClass = 'bottom-[20%] right-[-14px] xs:right-[-18px] sm:right-[-22px]';
          else if (relPos === 2) posClass = 'top-[20%] right-[-14px] xs:right-[-18px] sm:right-[-22px]';
          else if (relPos === 3) posClass = 'top-[-20px] xs:top-[-22px] left-1/2 -translate-x-1/2';
          else if (relPos === 4) posClass = 'top-[20%] left-[-14px] xs:left-[-18px] sm:left-[-22px]';
          else if (relPos === 5) posClass = 'bottom-[20%] left-[-14px] xs:left-[-18px] sm:left-[-22px]';

          // تحديد موقع الشارة إلى جانب صورة اللاعب خارج الطاولة تماماً
          let targetBadgePosClass = '';
          if (relPos === 1 || relPos === 2) {
            targetBadgePosClass = '-right-8 xs:-right-9 top-1/2 -translate-y-1/2';
          } else if (relPos === 4 || relPos === 5) {
            targetBadgePosClass = '-left-8 xs:-left-9 top-1/2 -translate-y-1/2';
          } else if (relPos === 3) {
            targetBadgePosClass = '-top-8 left-1/2 -translate-x-1/2';
          }

          const circumference = 150.8;
          const offset = isTurn ? circumference * (1 - timerRemaining / TURN_TIMER_DURATION) : 0;
          const isCritical = isTurn && timerRemaining <= 4;
          const isDealer = dealerIdx === idx;

          return (
            <div key={idx} className={`absolute ${posClass} z-30`}>
              <div className="relative flex flex-col items-center">

                {/* فقاعة المزاد */}
                {phase === 'BIDDING' && latestBid && (
                  <div
                    className={`absolute z-35 pointer-events-none ${
                      relPos === 1 || relPos === 2
                        ? '-left-[68px] xs:-left-[78px] sm:-left-[88px] top-1/2 -translate-y-1/2'
                        : relPos === 3
                        ? 'top-[48px] xs:top-[54px] sm:top-[60px] left-1/2 -translate-x-1/2'
                        : '-right-[68px] xs:-right-[78px] sm:-right-[88px] top-1/2 -translate-y-1/2'
                    }`}
                  >
                    <ComicBidBubble
                      val={latestBid.val}
                      team={player.team}
                      seatPosition={
                        relPos === 1
                          ? 'bottom-right'
                          : relPos === 2
                          ? 'top-right'
                          : relPos === 3
                          ? 'top-center'
                          : relPos === 4
                          ? 'top-left'
                          : 'bottom-left'
                      }
                    />
                  </div>
                )}

                {/* الحاوية المكبرة للأفاتار */}
                <div className="relative w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                  
                  {/* شارة المشتري / الملزوم بجانب صورة اللاعب خارج الطاولة */}
                  {isBuyer && (
                    <div className={`absolute ${targetBadgePosClass} z-40 pointer-events-none select-none animate-bounce`}>
                      {isForcedBid ? (
                        <div
                          className={`px-2.5 py-0.5 rounded-full bg-white flex items-center justify-center shadow-2xl transition-all whitespace-nowrap ${
                            player.team === 'A'
                              ? 'border-[2.5px] border-[#0063B0] ring-2 ring-blue-500/40 shadow-blue-600/40'
                              : 'border-[2.5px] border-[#EA1D2D] ring-2 ring-red-500/40 shadow-red-600/40'
                          }`}
                          title="الموزع ملزوم بـ 5"
                        >
                          <span className="font-black text-black text-[9px] xs:text-[10px] leading-none">
                            ملزوم ⚡
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-white flex items-center justify-center shadow-2xl ${
                            player.team === 'A'
                              ? 'border-[2.5px] border-[#0063B0] ring-2 ring-blue-500/40 shadow-blue-600/40'
                              : 'border-[2.5px] border-[#EA1D2D] ring-2 ring-red-500/40 shadow-red-600/40'
                          }`}
                          title={`المشتري بـ ${highestBid}`}
                        >
                          <span className="font-mono font-black text-black text-xs xs:text-sm sm:text-base leading-none">
                            {highestBid === 9 ? '👑' : highestBid}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* علامة الموزع */}
                  {isDealer && (
                    <div
                      className="absolute -bottom-2 -left-2 z-35 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-slate-950 text-slate-950 rounded-full w-6 h-6 xs:w-6.5 xs:h-6.5 flex items-center justify-center font-black shadow-lg shadow-amber-500/50 ring-1 ring-amber-300 select-none animate-pulse"
                      title="الموزع"
                    >
                      <div className="flex items-center justify-center leading-none text-slate-950 font-black text-[9px] xs:text-[10px]">
                        <span className="font-extrabold tracking-tighter">D</span>
                        <span className="text-[8px] -mr-0.5">🃏</span>
                      </div>
                    </div>
                  )}

                  {/* حلقة مؤقت النيون */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="24" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
                    {isTurn && !isTimerDisabled && (
                      <circle
                        className="timer-ring-neon"
                        cx="26"
                        cy="26"
                        r="24"
                        stroke={isCritical ? '#ef4444' : '#f59e0b'}
                        strokeWidth="3.5"
                        fill="none"
                        style={{ strokeDashoffset: offset }}
                      />
                    )}
                    {isTurn && isTimerDisabled && (
                      <circle
                        cx="26"
                        cy="26"
                        r="24"
                        stroke="#f59e0b"
                        strokeWidth="3.5"
                        fill="none"
                        className="animate-pulse"
                      />
                    )}
                  </svg>

                  {/* دائرة الأفاتار */}
                  <div
                    className={`w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden border-2 ${
                      isPartner ? 'border-blue-400' : 'border-rose-400'
                    } bg-slate-950 shadow-md relative transition-all duration-300 ${
                      isTurn ? (isCritical ? 'glow-turn-critical-red' : 'glow-turn-phosphor') : ''
                    }`}
                  >
                    <AvatarView avatarId={player.avatarId} customPhoto={player.customPhoto} />
                  </div>
                </div>

                {/* كبسولة اسم اللاعب */}
                <div className="jawaker-pill-badge px-1.5 xs:px-2 py-0.5 mt-0.5 max-w-[76px] xs:max-w-[86px] sm:max-w-[96px] truncate flex items-center justify-center">
                  <span className="text-[8.5px] xs:text-[9.5px] font-bold text-white truncate">
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
