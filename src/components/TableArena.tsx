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

const TABLE_CARD_RESTING_SLOTS: Record<number, CardCoord> = {
  0: { x: 0, y: 78, rotate: 0 },
  1: { x: 92, y: 44, rotate: -8 },
  2: { x: 92, y: -44, rotate: -8 },
  3: { x: 0, y: -74, rotate: 0 },
  4: { x: -92, y: -44, rotate: 8 },
  5: { x: -92, y: 44, rotate: 8 },
};

const WINNER_SEAT_TARGETS: Record<number, CardCoord> = {
  0: { x: 0, y: 230, rotate: 0 },
  1: { x: 190, y: 88, rotate: 10 },
  2: { x: 190, y: -88, rotate: 10 },
  3: { x: 0, y: -220, rotate: 0 },
  4: { x: -190, y: -88, rotate: -10 },
  5: { x: -190, y: 88, rotate: -10 },
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

  // حساب دقيق هندسياً لمحيط دائرة المؤقت بنصف قطر r=24
  const TIMER_RADIUS = 24;
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS; // 150.796

  // نسبة الوقت المتبقي (من 1 إلى 0)
  const timerRatio = Math.max(0, Math.min(1, timerRemaining / TURN_TIMER_DURATION));
  const timerOffset = TIMER_CIRCUMFERENCE * (1 - timerRatio);

  return (
    <main className="arena-center-stage flex-1 min-h-0 min-w-0 flex items-center justify-center w-full px-1 xs:px-2 py-0.5 sm:py-2 relative overflow-hidden">
      
      {/* Jawaker Felt Stadium Table */}
      <div className={`jawaker-table-felt rounded-[36px] xs:rounded-[44px] sm:rounded-[56px] md:rounded-[64px] w-[80%] xs:w-[82%] sm:w-[85%] md:w-[88%] max-w-[420px] sm:max-w-[480px] md:max-w-[540px] h-[94%] max-h-[460px] sm:max-h-[520px] relative flex items-center justify-center p-1.5 xs:p-2 select-none shadow-2xl transition-all duration-300 ${
        isBaoonActive ? 'table-baoon-festive-lights ring-4 ring-yellow-400/80 ring-offset-2 ring-offset-slate-900' : ''
      }`}>

        {/* أضواء الباون */}
        {isBaoonActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-slate-950 font-black px-3.5 py-1 rounded-full text-[11px] sm:text-xs shadow-2xl border border-yellow-200 animate-bounce flex items-center gap-1.5 z-40">
            <span>👑</span>
            <span>باون كاسح! تحديد الحكم...</span>
            <span>✨</span>
          </div>
        )}

        {/* علامة الطاولة المائية */}
        <div className="table-felt-watermark">
          <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest">
            كوت بو ٦ أونو
          </span>
        </div>

        {/* بطاقة الرسائل في وسط الطاولة (كفو شباب / راحت عليكم) */}
        {callout && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none select-none animate-bounce">
            <div className="bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 border-2 border-amber-400 text-amber-200 px-4 xs:px-6 py-2 xs:py-2.5 rounded-2xl shadow-2xl shadow-amber-950/80 flex items-center gap-2.5 backdrop-blur-md ring-4 ring-yellow-400/30">
              <span className="text-2xl xs:text-3xl filter drop-shadow">{callout.emoji}</span>
              <span className="text-sm xs:text-base font-black text-white whitespace-nowrap drop-shadow tracking-wide">
                {callout.text}
              </span>
            </div>
          </div>
        )}

        {/* ساحة الأوراق المرمية */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-20 scale-[0.82] xs:scale-90 sm:scale-100">
          {currentTrick.map((play, index) => {
            const isCollecting = collectingWinnerId !== null && currentTrick.length === 6;
            const relPlaySlot = (play.playerId - humanSeatIndex + 6) % 6;
            const rest = TABLE_CARD_RESTING_SLOTS[relPlaySlot] || { x: 0, y: 0, rotate: 0 };
            const relWinnerSlot = collectingWinnerId !== null ? (collectingWinnerId - humanSeatIndex + 6) % 6 : 0;
            const winnerTarget = isCollecting ? WINNER_SEAT_TARGETS[relWinnerSlot] : null;

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
                    ? 'transform 1300ms cubic-bezier(0.25, 0.9, 0.3, 1), opacity 1050ms ease-in'
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
          <div className="absolute bottom-2 xs:bottom-3 left-1/2 -translate-x-1/2 z-35 pointer-events-none">
            <ComicBidBubble
              val={humanLatestBid.val}
              team={players[humanSeatIndex].team}
              seatPosition="bottom-center"
            />
          </div>
        )}

        {/* مقاعد اللاعبين الآخرين حول حافة الطاولة */}
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
          if (relPos === 1) posClass = 'bottom-[20%] right-[-14px] xs:right-[-18px] sm:right-[-22px]';
          else if (relPos === 2) posClass = 'top-[20%] right-[-14px] xs:right-[-18px] sm:right-[-22px]';
          else if (relPos === 3) posClass = 'top-[-16px] xs:top-[-18px] left-1/2 -translate-x-1/2';
          else if (relPos === 4) posClass = 'top-[20%] left-[-14px] xs:left-[-18px] sm:left-[-22px]';
          else if (relPos === 5) posClass = 'bottom-[20%] left-[-14px] xs:left-[-18px] sm:left-[-22px]';

          let targetBadgePosClass = '';
          if (relPos === 1 || relPos === 2 || relPos === 3) {
            targetBadgePosClass = '-right-8 xs:-right-9 top-1/2 -translate-y-1/2';
          } else {
            targetBadgePosClass = '-left-8 xs:-left-9 top-1/2 -translate-y-1/2';
          }

          const isCritical = isTurn && timerRemaining <= 4;
          const isDealer = dealerIdx === idx;

          // ألوان نيون ساطعة فائقة التباين والوضوح
          const activeTimerColor = isCritical
            ? '#ff003b' // وميض أحمر ناري عند اقتراب انتهاء الوقت
            : isTeamA
            ? '#00e5ff' // نيون سماوي ساطع جداً للفريق الأزرق يبرز بقوة
            : '#ff2a5f'; // نيون أحمر ليزري ناصع للفريق الأحمر

          const timerGlowStyle = isTurn
            ? { filter: `drop-shadow(0 0 5px ${activeTimerColor})` }
            : {};

          return (
            <div key={idx} className={`absolute ${posClass} z-30`}>
              <div className="relative flex flex-col items-center">

                {/* فقاعة المزاد للبوت */}
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

                {/* الحاوية الدائرية للأفاتار والمؤقت */}
                <div className="relative w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                  
                  {/* شارة المشتري / الملزوم */}
                  {isBuyer && (
                    <div className={`absolute ${targetBadgePosClass} z-40 pointer-events-none select-none animate-bounce`}>
                      {isForcedBid ? (
                        <div
                          className={`px-2.5 py-0.5 rounded-full bg-white flex items-center justify-center shadow-2xl transition-all whitespace-nowrap ${
                            player.team === 'A'
                              ? 'border-[2.5px] border-[#0063B0] ring-2 ring-blue-500/40 shadow-blue-600/40'
                              : 'border-[2.5px] border-[#EA1D2D] ring-2 ring-red-500/40 shadow-red-600/40'
                          }`}
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
                        >
                          <span className="font-mono font-black text-black text-xs xs:text-sm sm:text-base leading-none">
                            {highestBid === 9 ? '👑' : highestBid}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* أيقونة الديلر البيضاء */}
                  {isDealer && (
                    <div
                      className="absolute -bottom-1.5 -left-1.5 z-40 bg-slate-900 border-2 border-white text-white rounded-full w-6 h-6 flex items-center justify-center font-black shadow-lg shadow-black/80 select-none ring-1 ring-slate-950"
                      title="الموزع (Dealer)"
                    >
                      <span className="font-black text-white text-[11px] leading-none tracking-tight">D</span>
                    </div>
                  )}

                  {/* نظام مؤقت الـ SVG الاحترافي المنضبط هندسياً */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-20 transform -rotate-90"
                    viewBox="0 0 52 52"
                    style={timerGlowStyle}
                  >
                    {/* المسار الخلفي الداكن الهادئ */}
                    <circle
                      cx="26"
                      cy="26"
                      r={TIMER_RADIUS}
                      stroke="rgba(0, 0, 0, 0.45)"
                      strokeWidth="3.5"
                      fill="none"
                    />

                    {/* مسار خافت بلون الفريق يحدد إطار اللاعب دائماً */}
                    <circle
                      cx="26"
                      cy="26"
                      r={TIMER_RADIUS}
                      stroke={isTeamA ? 'rgba(0, 160, 255, 0.3)' : 'rgba(255, 40, 80, 0.3)'}
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* حلقة المؤقت المتحركة النشطة بكامل طولها دون أي نقص */}
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

                    {/* في حال إيقاف المؤقت في اللعب البشري الكامل */}
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

                  {/* صورة اللاعب داخل إطار داكن متباين ليبرز النيون فوقه */}
                  <div
                    className={`w-9.5 h-9.5 xs:w-10.5 xs:h-10.5 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-slate-700 bg-slate-950 shadow-inner relative transition-all duration-300 ${
                      isTurn && isCritical ? 'animate-pulse' : ''
                    }`}
                  >
                    <AvatarView avatarId={player.avatarId} customPhoto={player.customPhoto} />
                  </div>
                </div>

                {/* كبسولة اسم اللاعب */}
                <div
                  className={`px-2 py-0.5 mt-1 rounded-full text-center flex items-center justify-center max-w-[76px] xs:max-w-[86px] sm:max-w-[96px] shadow-md border ${
                    isTeamA
                      ? 'bg-blue-950/90 border-cyan-500/50 text-cyan-200'
                      : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                  }`}
                >
                  <span className="text-[8.5px] xs:text-[9.5px] font-black truncate leading-none">
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
