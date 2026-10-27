import React from 'react';
import { BidRecord, CalloutMessage, Player, SuitColor, TrickPlay } from '../types';
import { getEffectiveLeadColor, SUIT_COLORS } from '../utils/gameLogic';
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
}

interface CardCoord {
  x: number;
  y: number;
  rotate: number;
}

// Resting slots of played cards on the table, relative to center (0, 0)
const TABLE_CARD_RESTING_SLOTS: Record<number, CardCoord> = {
  0: { x: 0, y: 58, rotate: 0 },       // Bottom (Human)
  1: { x: 64, y: 28, rotate: -6 },     // Bottom Right (Player 1)
  2: { x: 64, y: -28, rotate: 6 },     // Top Right (Player 2)
  3: { x: 0, y: -52, rotate: 0 },      // Top Center (Player 3)
  4: { x: -64, y: -28, rotate: -6 },   // Top Left (Player 4)
  5: { x: -64, y: 28, rotate: 6 },     // Bottom Left (Player 5)
};

// Target coordinates of each player's avatar / seat relative to table center (0, 0)
const WINNER_SEAT_TARGETS: Record<number, CardCoord> = {
  0: { x: 0, y: 225, rotate: 0 },      // Glides directly down to human player HUD
  1: { x: 180, y: 80, rotate: 14 },    // Glides to Player 1 avatar (bottom right rim)
  2: { x: 180, y: -80, rotate: 14 },   // Glides to Player 2 avatar (top right rim)
  3: { x: 0, y: -205, rotate: 0 },     // Glides to Player 3 avatar (top center rim)
  4: { x: -180, y: -80, rotate: -14 }, // Glides to Player 4 avatar (top left rim)
  5: { x: -180, y: 80, rotate: -14 },  // Glides to Player 5 avatar (bottom left rim)
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
}) => {
  // Other seat indices around the table perimeter relative to human player
  const botSeatIndices = [0, 1, 2, 3, 4, 5].filter((idx) => idx !== humanSeatIndex);
  const humanLatestBid = biddingHistory.filter((b) => b.playerId === humanSeatIndex).pop();

  return (
    <main className="arena-center-stage flex-1 min-h-0 min-w-0 flex items-center justify-center w-full px-1 xs:px-2 py-0.5 sm:py-2 relative overflow-hidden">
      
      {/* Jawaker Vertical Stadium Table - Dynamically bounded for Fold, Flip, Landscape & Tablet */}
      <div className="jawaker-table-felt rounded-[36px] xs:rounded-[44px] sm:rounded-[56px] md:rounded-[64px] w-[80%] xs:w-[82%] sm:w-[85%] md:w-[88%] max-w-[420px] sm:max-w-[480px] md:max-w-[540px] h-[94%] max-h-[460px] sm:max-h-[520px] relative flex items-center justify-center p-1.5 xs:p-2 select-none shadow-2xl">
        
        {/* Subtle Felt Watermark: كوت بو ٦ أونو (باهتة ومنسقة لا تشتت اللاعبين) */}
        <div className="table-felt-watermark">
          <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest">
            كوت بو ٦ أونو
          </span>
        </div>

        {/* Thrown Trick Cards in Center with Smooth Grouped Sweep to Winner */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-20 scale-[0.82] xs:scale-90 sm:scale-100">
          {currentTrick.map((play, index) => {
            const playerObj = players[play.playerId];
            if (!playerObj) return null;

            const isCollecting = collectingWinnerId !== null && collectingWinnerId !== undefined;
            const relPlaySlot = (play.playerId - humanSeatIndex + 6) % 6;
            const rest = TABLE_CARD_RESTING_SLOTS[relPlaySlot] || { x: 0, y: 0, rotate: 0 };
            const relWinnerSlot = collectingWinnerId !== null ? (collectingWinnerId - humanSeatIndex + 6) % 6 : 0;
            const winnerTarget = isCollecting ? WINNER_SEAT_TARGETS[relWinnerSlot] : null;

            // When grouping towards the winner, stack cards with a neat slight stagger
            const stackOffsetX = (index - 2.5) * 3;
            const stackOffsetY = (index - 2.5) * 2;
            const stackRotate = (index - 2.5) * 3.5;

            const targetX = isCollecting && winnerTarget ? winnerTarget.x + stackOffsetX : rest.x;
            const targetY = isCollecting && winnerTarget ? winnerTarget.y + stackOffsetY : rest.y;
            const targetRotate = isCollecting && winnerTarget ? winnerTarget.rotate + stackRotate : rest.rotate;
            const targetScale = isCollecting ? 0.35 : 1;

            const cardStyle: React.CSSProperties = {
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate3d(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px), 0) rotate(${targetRotate}deg) scale(${targetScale})`,
              transition: isCollecting
                ? 'transform 1.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease 0.95s'
                : 'transform 0.22s ease-out',
              opacity: isCollecting ? 0 : 1,
              zIndex: isCollecting ? 40 + index : 20 + index,
              willChange: 'transform, opacity',
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



        {/* Human Player Comic Bid Bubble - Inside table felt near bottom player */}
        {phase === 'BIDDING' && humanLatestBid && players[humanSeatIndex] && (
          <div className="absolute bottom-2 xs:bottom-3 left-1/2 -translate-x-1/2 z-35 pointer-events-none">
            <ComicBidBubble
              val={humanLatestBid.val}
              team={players[humanSeatIndex].team}
              seatPosition="bottom-center"
            />
          </div>
        )}

        {/* 5 Bot Seats Layout around Stadium Table Rim */}
        {botSeatIndices.map((idx) => {
          const player = players[idx];
          if (!player) return null;

          const isPartner = player.team === 'A';
          const isTurn = currentTurn === idx && phase !== 'ROUND_END' && phase !== 'MATCH_OVER';
          const isBuyer = bidWinner === idx && highestBid > 4;

          const latestBid = biddingHistory.filter((b) => b.playerId === idx).pop();

          // Positions around the stadium rim strictly following Counter-Clockwise (عكس عقارب الساعة)
          // Offsets stay within screen margin to prevent clipping on Fold / narrow screens
          const relPos = (idx - humanSeatIndex + 6) % 6;
          let posClass = '';
          if (relPos === 1) posClass = 'bottom-[22%] right-[-10px] xs:right-[-14px] sm:right-[-18px]'; // 1: Bottom Right
          else if (relPos === 2) posClass = 'top-[22%] right-[-10px] xs:right-[-14px] sm:right-[-18px]'; // 2: Top Right
          else if (relPos === 3) posClass = 'top-[-16px] xs:top-[-18px] left-1/2 -translate-x-1/2';      // 3: Top Center
          else if (relPos === 4) posClass = 'top-[22%] left-[-10px] xs:left-[-14px] sm:left-[-18px]';   // 4: Top Left
          else if (relPos === 5) posClass = 'bottom-[22%] left-[-10px] xs:left-[-14px] sm:left-[-18px]'; // 5: Bottom Left

          const circumference = 125.6;
          const offset = isTurn ? circumference * (1 - timerRemaining / 12) : 0;
          const isCritical = isTurn && timerRemaining <= 3;
          const isDealer = dealerIdx === idx;

          return (
            <div key={idx} className={`absolute ${posClass} z-30`}>
              <div className="relative flex flex-col items-center">

                {/* Comic Bidding Speech Bubble - Displayed from inside table with team color */}
                {phase === 'BIDDING' && latestBid && (
                  <div
                    className={`absolute z-35 pointer-events-none ${
                      relPos === 1 || relPos === 2
                        ? '-left-[68px] xs:-left-[78px] sm:-left-[88px] top-1/2 -translate-y-1/2'
                        : relPos === 3
                        ? 'top-[44px] xs:top-[50px] sm:top-[56px] left-1/2 -translate-x-1/2'
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

                {/* Circular Avatar with Neon Turn Timer Ring */}
                <div className="relative w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                  
                  {/* Fixed Circular Buyer Badge with Bid Number in Team Color (المشتري يظهر عند صورته رقم المشترى بدائرة بلون فريقه) */}
                  {isBuyer && (
                    <div
                      className={`absolute -top-2.5 -right-2.5 z-40 w-7 h-7 xs:w-8 xs:h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-black text-white text-xs xs:text-sm select-none ${
                        player.team === 'A'
                          ? 'bg-[#0063B0] shadow-blue-600/60 ring-1 ring-blue-300'
                          : 'bg-[#EA1D2D] shadow-red-600/60 ring-1 ring-red-300'
                      }`}
                      title={`المشتري بـ ${highestBid}`}
                    >
                      <span className="font-mono font-black drop-shadow-md leading-none">
                        {highestBid === 9 ? '👑' : highestBid}
                      </span>
                    </div>
                  )}

                  {/* Dealer Badge: علامة الموزع أكبر قليلاً وواضحة جداً (أول واحد يوزع الورق وآخر من يزايد) */}
                  {isDealer && (
                    <div
                      className="absolute -bottom-2 -left-2 z-35 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-slate-950 text-slate-950 rounded-full w-6 h-6 xs:w-7 xs:h-7 flex items-center justify-center font-black shadow-lg shadow-amber-500/50 ring-1 ring-amber-300 select-none animate-pulse"
                      title="الموزع (أول واحد يوزع الورق وآخر من يزايد - ملزوم بـ 5)"
                    >
                      <div className="flex items-center justify-center leading-none text-slate-950 font-black text-[9px] xs:text-[10px]">
                        <span className="font-extrabold tracking-tighter">D</span>
                        <span className="text-[8px] -mr-0.5">🃏</span>
                      </div>
                    </div>
                  )}

                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
                    {isTurn && (
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
                  </svg>
                  <div
                    className={`w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 ${
                      isPartner ? 'border-blue-400' : 'border-rose-400'
                    } bg-slate-950 shadow-md relative transition-all duration-300 ${
                      isTurn ? (isCritical ? 'glow-turn-critical-red' : 'glow-turn-phosphor') : ''
                    }`}
                  >
                    <AvatarView avatarId={player.avatarId} customPhoto={player.customPhoto} />
                  </div>
                </div>

                {/* Jawaker Capsule Pill with Player Name */}
                <div className="jawaker-pill-badge px-1.5 xs:px-2 py-0.5 mt-0.5 max-w-[70px] xs:max-w-[80px] sm:max-w-[90px] truncate flex items-center justify-center">
                  <span className="text-[8px] xs:text-[9px] font-bold text-white truncate">
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
