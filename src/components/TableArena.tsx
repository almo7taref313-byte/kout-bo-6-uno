import React from 'react';
import { BidRecord, CalloutMessage, Player, SuitColor, TrickPlay } from '../types';
import { SUIT_COLORS, TURN_TIMER_DURATION } from '../utils/gameLogic';
import { AvatarView } from '../utils/avatars';
import { UnoCard } from './UnoCard';
import { ComicBidBubble } from './ComicBidBubble';
import { soundEngine } from '../utils/soundEngine';

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
  isLandscapeMode?: boolean;
  tableColor?: 'snow' | 'green';
  onTableTap?: () => void;
}

interface CardCoord {
  x: number;
  y: number;
  rotate: number;
}

interface TableGridLayout {
  slots: Record<number, CardCoord>;
  cardW: number;
  cardH: number;
}

// حساب حجم الكرت وإحداثيات الشبكة (3×2) رياضياً من أبعاد الطاولة الفعلية لضمان عدم التداخل نهائياً على الموبايل والتابلت والكمبيوتر
const getResponsiveTableCardLayout = (tableW: number, tableH: number): TableGridLayout => {
  const isCompactLandscape = tableH < 360 && tableW > tableH;
  const isCompactPortrait = !isCompactLandscape && tableH < 395;
  const isWideTable = tableW >= 560;

  // المساحة المحجوزة للأفاتارات العلوية والسفلية والجانبية مع هامش أمان مريح يمنع ملامسة الكروت لأسماء أو صور اللاعبين
  const verticalAvatarClearance = isCompactLandscape
    ? 132
    : isCompactPortrait
    ? 142
    : isWideTable
    ? 190
    : 164;
  const horizontalAvatarClearance = isCompactLandscape ? 160 : isWideTable ? 190 : 146;

  const availH = Math.max(76, tableH - verticalAvatarClearance);
  const availW = Math.max(140, tableW - horizontalAvatarClearance);

  // المسافات الفاصلة بين الصفين وبين الأعمدة الثلاثة
  const vGap = isCompactLandscape ? 6 : tableH < 410 ? 8 : 14;
  const hGap = isCompactLandscape ? 12 : tableW < 400 ? 10 : tableW < 560 ? 14 : 22;

  const maxH = Math.floor((availH - vGap) / 2);
  const maxW = Math.floor((availW - 2 * hGap) / 3);

  const targetW = isCompactLandscape
    ? 44
    : tableW >= 740
    ? 70
    : tableW >= 560
    ? 64
    : tableW >= 420
    ? 56
    : 52;

  const minCardW = isCompactLandscape ? 32 : 38;
  const cardW = Math.max(minCardW, Math.min(targetW, maxW, Math.floor(maxH * (2 / 3))));
  const cardH = Math.round(cardW * 1.5);

  const colX = cardW + hGap;
  const rowY = Math.round((cardH + vGap) / 2);

  return {
    cardW,
    cardH,
    slots: {
      0: { x: 0, y: rowY, rotate: 0 },        // ورقة اللاعب (أنت - وسط الصف السفلي)
      1: { x: colX, y: rowY, rotate: 0 },     // ورقة المقعد 1 (يمين الصف السفلي)
      2: { x: colX, y: -rowY, rotate: 0 },    // ورقة المقعد 2 (يمين الصف العلوي)
      3: { x: 0, y: -rowY, rotate: 0 },       // ورقة المقعد 3 (وسط الصف العلوي)
      4: { x: -colX, y: -rowY, rotate: 0 },   // ورقة المقعد 4 (يسار الصف العلوي)
      5: { x: -colX, y: rowY, rotate: 0 },    // ورقة المقعد 5 (يسار الصف السفلي)
    },
  };
};

// حساب إحداثيات مركز صورة اللاعب الفائز بالأكلة في الفضاء المحلي للطاولة بدقة رياضية 100%
// بغض النظر عن وضع الشاشة (رأسي/أفقي/آيباد/تابلت/موبايل) أو وجود تدوير CSS على الحاوية الرئيسية
const computeAvatarOffsetInTableSpace = (
  tableEl: HTMLElement | null,
  winnerId: number | null
): { x: number; y: number } | null => {
  if (!tableEl || winnerId === null || typeof document === 'undefined') return null;
  const avatarEl = document.getElementById(`avatar-player-${winnerId}`);
  if (!avatarEl) return null;

  const tableRect = tableEl.getBoundingClientRect();
  const avatarRect = avatarEl.getBoundingClientRect();
  if (tableRect.width === 0 || tableRect.height === 0) return null;

  const screenDX = avatarRect.left + avatarRect.width / 2 - (tableRect.left + tableRect.width / 2);
  const screenDY = avatarRect.top + avatarRect.height / 2 - (tableRect.top + tableRect.height / 2);

  const wrapperEl = document.getElementById('gameMainWrapper');
  if (wrapperEl && typeof window !== 'undefined') {
    const transformStr = window.getComputedStyle(wrapperEl).transform;
    if (transformStr && transformStr !== 'none') {
      const match = transformStr.match(/matrix\(([^)]+)\)/);
      if (match && match[1]) {
        const parts = match[1].split(',').map((v) => parseFloat(v.trim()));
        if (parts.length >= 4 && parts.every((n) => Number.isFinite(n))) {
          const [a, b, c, d] = parts;
          const det = a * d - b * c;
          if (Math.abs(det) > 1e-6) {
            const localDX = (d * screenDX - c * screenDY) / det;
            const localDY = (-b * screenDX + a * screenDY) / det;
            return {
              x: Math.round(localDX),
              y: Math.round(localDY),
            };
          }
        }
      }
    }
  }

  return {
    x: Math.round(screenDX),
    y: Math.round(screenDY),
  };
};

// إحداثيات مركز صور اللاعبين كمرجع احتياطي متجاوب مع أبعاد الطاولة الفعلية
const getFallbackAvatarTarget = (relSlot: number, tableW: number, tableH: number): CardCoord => {
  const halfW = Math.round(tableW * 0.43);
  const halfH = Math.round(tableH * 0.42);
  const sideY = Math.round(tableH * 0.24);
  switch (relSlot) {
    case 0:
      return { x: 0, y: halfH, rotate: 0 };
    case 1:
      return { x: halfW, y: sideY, rotate: 10 };
    case 2:
      return { x: halfW, y: -sideY, rotate: 10 };
    case 3:
      return { x: 0, y: -halfH, rotate: 0 };
    case 4:
      return { x: -halfW, y: -sideY, rotate: -10 };
    case 5:
      return { x: -halfW, y: sideY, rotate: -10 };
    default:
      return { x: 0, y: 0, rotate: 0 };
  }
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
  isLandscapeMode,
  tableColor = 'snow',
  onTableTap,
}) => {
  const isBaoonActive = isBaoonPendingTrump !== undefined ? isBaoonPendingTrump : (highestBid === 9 && trumpColor === null);
  const allSeatIndices = [0, 1, 2, 3, 4, 5];

  const TIMER_RADIUS = 24;
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
  const timerRatio = Math.max(0, Math.min(1, timerRemaining / TURN_TIMER_DURATION));
  const timerOffset = TIMER_CIRCUMFERENCE * (1 - timerRatio);

  const tableFeltRef = React.useRef<HTMLDivElement>(null);
  const [tableSize, setTableSize] = React.useState<{ w: number; h: number }>({ w: 380, h: 410 });
  const [collectOffset, setCollectOffset] = React.useState<{ x: number; y: number } | null>(null);
  const announcedJokerKeysRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const el = tableFeltRef.current;
    if (!el) return;
    const updateDimensions = () => {
      const localW = el.offsetWidth || el.clientWidth;
      const localH = el.offsetHeight || el.clientHeight;
      if (localW > 0 && localH > 0) {
        setTableSize({ w: Math.round(localW), h: Math.round(localH) });
      }
    };
    updateDimensions();
    const t1 = setTimeout(updateDimensions, 60);
    const t2 = setTimeout(updateDimensions, 200);
    const t3 = setTimeout(updateDimensions, 420);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateDimensions);
      ro.observe(el);
    }
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    window.addEventListener('kout-layout-refresh', updateDimensions);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      window.removeEventListener('kout-layout-refresh', updateDimensions);
    };
  }, [isLandscapeMode]);

  const dynamicCardLayout = React.useMemo(
    () => getResponsiveTableCardLayout(tableSize.w, tableSize.h),
    [tableSize.w, tableSize.h]
  );
  const dynamicCardSlots = dynamicCardLayout.slots;

  React.useEffect(() => {
    if (!currentTrick || currentTrick.length === 0) {
      announcedJokerKeysRef.current.clear();
      return;
    }
    currentTrick.forEach((play) => {
      const c = play.card;
      const isJokerCard = Boolean(
        c && (c.isJoker || c.rank === 'wild_draw4' || c.label === '+4' || c.roleTitle === 'الجيكر')
      );
      const isMakerCard = Boolean(
        c && (c.isMaker || c.rank === 'wild_color' || c.roleTitle === 'الميكر')
      );
      if (isJokerCard) {
        const key = `${play.playerId}-${c.id}`;
        if (!announcedJokerKeysRef.current.has(key)) {
          announcedJokerKeysRef.current.add(key);
          soundEngine.playJokerVoice();
        }
      } else if (isMakerCard) {
        const key = `${play.playerId}-${c.id}`;
        if (!announcedJokerKeysRef.current.has(key)) {
          announcedJokerKeysRef.current.add(key);
          soundEngine.playMakerVoice();
        }
      }
    });
  }, [currentTrick]);

  React.useEffect(() => {
    if (collectingWinnerId !== null) {
      const measureTarget = () => {
        const offset = computeAvatarOffsetInTableSpace(tableFeltRef.current, collectingWinnerId);
        if (offset) {
          setCollectOffset(offset);
        }
      };

      measureTarget();
      const raf = requestAnimationFrame(measureTarget);
      window.addEventListener('resize', measureTarget);
      window.addEventListener('kout-layout-refresh', measureTarget);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', measureTarget);
        window.removeEventListener('kout-layout-refresh', measureTarget);
      };
    } else {
      setCollectOffset(null);
    }
  }, [collectingWinnerId, tableSize.w, tableSize.h, isLandscapeMode]);

  return (
    <main
      onClick={() => onTableTap?.()}
      className="arena-center-stage flex-1 min-h-0 min-w-0 flex items-center justify-center w-full px-2 py-1 relative overflow-visible"
    >
      
      {/* 
        طاولة الكوت الفسيحة والمطورة لجميع الأجهزة (الموبايل، التابلت، والكمبيوتر):
        - تتمدد بالعرض والارتفاع على التابلت والآيباد في الوضعين الرأسي والأفقي لمنع أي فراغ زائد
      */}
      <div 
        ref={tableFeltRef}
        style={
          {
            '--table-card-w': `${dynamicCardLayout.cardW}px`,
            '--table-card-h': `${dynamicCardLayout.cardH}px`,
          } as React.CSSProperties
        }
        className={`jawaker-table-felt ${
          tableColor === 'green' ? 'table-theme-green' : 'table-theme-snow'
        } rounded-[44px] sm:rounded-[64px] md:rounded-[76px]
          w-[96%] max-w-[440px] sm:max-w-[820px] md:max-w-[920px] lg:max-w-[980px]
          h-[96%] max-h-[450px] xs:max-h-[480px] sm:max-h-[760px] md:max-h-[820px]
          relative flex items-center justify-center select-none shadow-2xl ${
          isBaoonActive ? 'table-baoon-festive-lights ring-4 ring-yellow-400/80 ring-offset-2 ring-offset-slate-900' : ''
        }`}
      >

        {/* تنبيه الباون */}
        {isBaoonActive && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-slate-950 font-black px-3 py-0.5 rounded-full text-[10px] sm:text-xs shadow-2xl border border-yellow-200 animate-bounce flex items-center gap-1 z-40 whitespace-nowrap">
            <span>👑</span>
            <span>باون كاسح! تحديد الحكم...</span>
          </div>
        )}

        {/* علامة الطاولة المائية في منتصف اللباد الأخضر */}
        <div className="table-felt-watermark">
          <span className="text-xs xs:text-sm sm:text-xl font-black tracking-widest opacity-60">
            كوت بو ٦ أونو
          </span>
        </div>

        {/* وسام دائري ثلاثي الأبعاد لرسائل نهاية الجولة (كفوووو / خسرتوا) بلون الفريق الحاكم */}
        {callout && (() => {
          const isWinCallout = callout.text.includes('كفو');
          const cleanLabel = isWinCallout ? 'كفوووو' : 'خسرتوا';
          const buyerPlayer = bidWinner !== null ? players[bidWinner] : null;
          const buyerTeam = buyerPlayer
            ? buyerPlayer.team
            : bidWinner !== null && bidWinner % 2 === 1
            ? 'B'
            : 'A';
          const isBlueTeam = buyerTeam === 'A';

          return (
            <div className="medallion-3d-enter absolute top-1/2 left-1/2 z-50 pointer-events-none select-none">
              <div className="relative flex items-center justify-center">
                {/* توهج خلفي دائري بلون الفريق الحاكم */}
                <div
                  className={`absolute -inset-3 rounded-full blur-xl opacity-80 ${
                    isBlueTeam ? 'bg-sky-500/60' : 'bg-rose-500/60'
                  }`}
                />

                {/* الحلقة الخارجية المعدنية للدائرة */}
                <div
                  className={`relative w-[108px] h-[108px] xs:w-[118px] xs:h-[118px] sm:w-[134px] sm:h-[134px] rounded-full p-[4px] shadow-[0_14px_32px_rgba(0,0,0,0.75)] flex items-center justify-center ${
                    isBlueTeam
                      ? 'bg-gradient-to-b from-sky-200 via-sky-400 to-blue-900'
                      : 'bg-gradient-to-b from-rose-200 via-rose-400 to-rose-950'
                  }`}
                >
                  {/* جسم الدائرة الداخلي بلون الفريق الحاكم مع لمعة ثلاثية الأبعاد */}
                  <div
                    className={`medallion-shine-sweep relative w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 ${
                      isBlueTeam
                        ? 'bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] border-sky-100/80 shadow-[inset_0_3px_8px_rgba(255,255,255,0.45),inset_0_-6px_12px_rgba(0,0,0,0.45)]'
                        : 'bg-gradient-to-b from-[#fb7185] via-[#e11d48] to-[#9f1239] border-rose-100/80 shadow-[inset_0_3px_8px_rgba(255,255,255,0.45),inset_0_-6px_12px_rgba(0,0,0,0.45)]'
                    }`}
                  >
                    {/* الكلمة في وسط الدائرة فقط */}
                    <span className="font-callout font-black text-[22px] xs:text-[24px] sm:text-[28px] text-white tracking-normal leading-none text-center whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]">
                      {cleanLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ساحة الأوراق المرمية */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-20">
          {currentTrick.map((play, index) => {
            const isCollecting = collectingWinnerId !== null && currentTrick.length > 0;
            const relPlaySlot = (play.playerId - humanSeatIndex + 6) % 6;
            const rest = dynamicCardSlots[relPlaySlot] || { x: 0, y: 0, rotate: 0 };
            const relWinnerSlot = collectingWinnerId !== null ? (collectingWinnerId - humanSeatIndex + 6) % 6 : 0;
            const fallbackTarget = getFallbackAvatarTarget(relWinnerSlot, tableSize.w, tableSize.h);

            let targetX = rest.x;
            let targetY = rest.y;
            let targetRotate = rest.rotate;
            let targetScale = 1;

            if (isCollecting) {
              const liveOffset =
                computeAvatarOffsetInTableSpace(tableFeltRef.current, collectingWinnerId) || collectOffset;

              targetX = liveOffset ? liveOffset.x : fallbackTarget.x;
              targetY = liveOffset ? liveOffset.y : fallbackTarget.y;
              targetRotate = 0;
              targetScale = 0.22;
            }

            const throwOriginBySlot: Record<number, { x: string; y: string; rot: string }> = {
              0: { x: '0px', y: '105px', rot: '-6deg' },
              1: { x: '72px', y: '42px', rot: '8deg' },
              2: { x: '72px', y: '-42px', rot: '-8deg' },
              3: { x: '0px', y: '-78px', rot: '6deg' },
              4: { x: '-72px', y: '-42px', rot: '8deg' },
              5: { x: '-72px', y: '42px', rot: '-8deg' },
            };
            const throwOrigin = throwOriginBySlot[relPlaySlot] || throwOriginBySlot[0];

            return (
              <div
                key={`${play.playerId}-${play.card.id}`}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate3d(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px), 0) rotate(${targetRotate}deg) scale(${targetScale})`,
                  transition: isCollecting
                    ? 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-out 750ms'
                    : 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: isCollecting ? 0 : 1,
                  zIndex: isCollecting ? 85 + index : 20 + index,
                  willChange: 'transform, opacity',
                  transformOrigin: 'center center',
                }}
                className="pointer-events-none flex flex-col items-center"
              >
                <div
                  className="card-played-anim"
                  style={
                    {
                      '--throw-from-x': throwOrigin.x,
                      '--throw-from-y': throwOrigin.y,
                      '--throw-from-rot': throwOrigin.rot,
                    } as React.CSSProperties
                  }
                >
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

        {/* مقاعد اللاعبين الستة على محيط الطاولة لإفساح كامل الوسط للكروت المكبرة */}
        {allSeatIndices.map((idx) => {
          const player = players[idx] || {
            id: idx,
            name: idx === humanSeatIndex ? 'أنت' : `بوت ${idx + 1}`,
            team: idx % 2 === 0 ? 'A' : 'B',
            isHuman: idx === humanSeatIndex,
            hand: [],
            tricksWon: 0,
            avatarId: 'kuwaiti_ghutra_white',
            customPhoto: null,
          };

          const isTeamA = player.team === 'A';
          const isTurn = currentTurn === idx && phase !== 'ROUND_END' && phase !== 'MATCH_OVER';
          const isBuyer = bidWinner === idx && highestBid > 4;
          const latestBid = biddingHistory.filter((b) => b.playerId === idx).pop();

          const relPos = (idx - humanSeatIndex + 6) % 6;
          let posClass = '';

          if (relPos === 0) {
            // اللاعب (أنت): أسفل المنتصف على حافة الطاولة
            posClass = 'bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2';
          } else if (relPos === 1) {
            // المقعد 1: يمين أسفل
            posClass = 'bottom-[22%] right-1.5 xs:right-2.5 sm:right-4';
          } else if (relPos === 2) {
            // المقعد 2: يمين أعلى
            posClass = 'top-[18%] right-1.5 xs:right-2.5 sm:right-4';
          } else if (relPos === 3) {
            // المقعد 3: أعلى المنتصف
            posClass = 'top-1 sm:top-2 left-1/2 -translate-x-1/2';
          } else if (relPos === 4) {
            // المقعد 4: يسار أعلى
            posClass = 'top-[18%] left-1.5 xs:left-2.5 sm:left-4';
          } else if (relPos === 5) {
            // المقعد 5: يسار أسفل
            posClass = 'bottom-[22%] left-1.5 xs:left-2.5 sm:left-4';
          }

          let bubblePosClass = '';
          let bubbleSeatPos: 'bottom-center' | 'bottom-right' | 'top-right' | 'top-center' | 'top-left' | 'bottom-left' = 'bottom-center';

          if (relPos === 0) {
            bubblePosClass = '-top-8 left-1/2 -translate-x-1/2';
            bubbleSeatPos = 'bottom-center';
          } else if (relPos === 1) {
            bubblePosClass = '-left-[46px] xs:-left-[50px] top-1/2 -translate-y-1/2';
            bubbleSeatPos = 'bottom-right';
          } else if (relPos === 2) {
            bubblePosClass = '-left-[46px] xs:-left-[50px] top-1/2 -translate-y-1/2';
            bubbleSeatPos = 'top-right';
          } else if (relPos === 3) {
            bubblePosClass = '-right-[48px] xs:-right-[52px] top-1/2 -translate-y-1/2';
            bubbleSeatPos = 'top-center';
          } else if (relPos === 4) {
            bubblePosClass = '-right-[46px] xs:-right-[50px] top-1/2 -translate-y-1/2';
            bubbleSeatPos = 'top-left';
          } else if (relPos === 5) {
            bubblePosClass = '-right-[46px] xs:-right-[50px] top-1/2 -translate-y-1/2';
            bubbleSeatPos = 'bottom-left';
          }

          // موقع شارة الحكم البيضاوية (الرقم أو كلمة "ملزوم"):
          // - للاعبين يمين ويسار الطاولة (1, 2, 4, 5): فوق رأس اللاعب مباشرة
          // - للاعبين فوق وتحت الطاولة (0, 3): بجانب صورة اللاعب (يسار الصورة)
          const targetBadgePosClass =
            relPos === 0 || relPos === 3
              ? isForcedBid
                ? '-left-[56px] sm:-left-[66px] top-1/2 -translate-y-1/2'
                : '-left-[48px] sm:-left-[58px] top-1/2 -translate-y-1/2'
              : '-top-[31px] sm:-top-[36px] left-1/2 -translate-x-1/2';

          const isDealer = dealerIdx === idx;

          const isCritical = isTurn && !isTimerDisabled && timerRemaining <= 5 && timerRemaining > 0;
          const isCriticalFlash = isCritical && Math.floor(timerRemaining * 2.5) % 2 === 0;
          const activeTimerColor = isCritical
            ? isTeamA
              ? isCriticalFlash
                ? '#ff1744'
                : '#ffbe0b'
              : isCriticalFlash
              ? '#ffbe0b'
              : '#ff6d00'
            : isTeamA
            ? '#00e5ff'
            : '#ff2a5f';

          const timerGlowStyle = isTurn
            ? {
                filter: isCritical
                  ? `drop-shadow(0 0 7px ${activeTimerColor}) drop-shadow(0 0 14px rgba(255, 190, 11, 0.85))`
                  : `drop-shadow(0 0 5px ${activeTimerColor})`,
              }
            : {};

          const buyerTrumpInfo = trumpColor && SUIT_COLORS[trumpColor] ? SUIT_COLORS[trumpColor] : null;
          const buyerOvalGradient =
            trumpColor === 'red'
              ? 'linear-gradient(180deg, #ff3b4b 0%, #ea1d2d 55%, #b9101e 100%)'
              : trumpColor === 'blue'
              ? 'linear-gradient(180deg, #1d8cf8 0%, #0063b0 55%, #00447c 100%)'
              : trumpColor === 'green'
              ? 'linear-gradient(180deg, #4ade80 0%, #2eb844 55%, #1b7a2b 100%)'
              : trumpColor === 'yellow'
              ? 'linear-gradient(180deg, #ffe34d 0%, #fed000 55%, #eab308 100%)'
              : 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)';

          return (
            <div key={idx} className={`absolute ${posClass} z-30 transition-all duration-300`}>
              <div className="relative flex flex-col items-center">

                {/* فقاعة المزاد - موضوعة بجانب أو فوق الأفاتار لمنع حجب وسط الطاولة */}
                {phase === 'BIDDING' && latestBid && (
                  <div className={`absolute z-35 pointer-events-none ${bubblePosClass}`}>
                    <ComicBidBubble
                      val={latestBid.val}
                      forced={latestBid.forced}
                      team={player.team}
                      seatPosition={bubbleSeatPos}
                    />
                  </div>
                )}

                {/* الحاوية الدائرية للأفاتار مع المعرّف الخاص بحساب مسار الأكلة بدقة متناهية */}
                <div 
                  id={`avatar-player-${idx}`}
                  className="seat-avatar-ring relative w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 flex items-center justify-center"
                >
                  
                  {isBuyer && (
                    <div
                      dir={isForcedBid ? 'rtl' : 'ltr'}
                      className={`absolute ${targetBadgePosClass} z-40 pointer-events-none select-none transition-all duration-300`}
                    >
                      <div
                        className={`${
                          isForcedBid
                            ? 'w-[52px] h-[28px] sm:w-[60px] sm:h-[33px]'
                            : 'w-[44px] h-[28px] sm:w-[52px] sm:h-[33px]'
                        } p-0 rounded-full grid place-items-center tabular-nums ${
                          buyerTrumpInfo
                            ? 'border-2 border-white/95'
                            : 'border-2 border-amber-400/95'
                        }`}
                        style={{
                          background: buyerOvalGradient,
                          color: buyerTrumpInfo
                            ? trumpColor === 'yellow'
                              ? '#111827'
                              : '#ffffff'
                            : '#fde047',
                          boxShadow: buyerTrumpInfo
                            ? `0 4px 12px rgba(0,0,0,0.85), inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.35), 0 0 14px ${buyerTrumpInfo.hex}aa`
                            : '0 4px 12px rgba(0,0,0,0.85), inset 0 1.5px 2px rgba(255,255,255,0.2)',
                        }}
                        title={
                          buyerTrumpInfo
                            ? `الحكم: ${buyerTrumpInfo.name} (${isForcedBid ? 'ملزوم' : highestBid})`
                            : `الحكم: ${isForcedBid ? 'ملزوم' : highestBid}`
                        }
                      >
                        <span
                          style={
                            isForcedBid
                              ? ({
                                  lineHeight: 1,
                                } as React.CSSProperties)
                              : ({
                                  fontFamily: "'Fredoka', Arial, Helvetica, sans-serif",
                                  lineHeight: 1,
                                  textBoxTrim: 'trim-both',
                                  textBoxEdge: 'cap alphabetic',
                                } as React.CSSProperties)
                          }
                          className={`block font-black ${
                            isForcedBid
                              ? 'text-[12.5px] sm:text-[14.5px] tracking-tight'
                              : 'text-[17px] sm:text-[20px]'
                          } text-center m-0 p-0 whitespace-nowrap ${
                            buyerTrumpInfo && trumpColor === 'yellow'
                              ? 'drop-shadow-[0_1px_0px_rgba(255,255,255,0.65)]'
                              : 'drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]'
                          }`}
                        >
                          {isForcedBid ? 'ملزوم' : highestBid}
                        </span>
                      </div>
                    </div>
                  )}

                  {isDealer && (
                    <div
                      dir="ltr"
                      className="absolute -bottom-1 -right-1.5 z-40 w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] p-0 rounded-full bg-slate-950/95 border border-amber-400/90 grid place-items-center text-amber-300 select-none shadow-md"
                      title="الموزع (Dealer)"
                    >
                      <span
                        style={{
                          fontFamily: "'Fredoka', Arial, Helvetica, sans-serif",
                          lineHeight: 1,
                          textBoxTrim: 'trim-both',
                          textBoxEdge: 'cap alphabetic',
                        } as React.CSSProperties}
                        className="block font-black text-[10.5px] sm:text-[11.5px] text-center m-0 p-0"
                      >
                        D
                      </span>
                    </div>
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
                      stroke={
                        isCritical
                          ? 'rgba(255, 190, 11, 0.45)'
                          : isTeamA
                          ? 'rgba(0, 160, 255, 0.3)'
                          : 'rgba(255, 40, 80, 0.3)'
                      }
                      strokeWidth="2"
                      fill="none"
                    />

                    {isTurn && !isTimerDisabled && (
                      <circle
                        cx="26"
                        cy="26"
                        r={TIMER_RADIUS}
                        stroke={activeTimerColor}
                        strokeWidth={isCritical ? '4.4' : '3.8'}
                        strokeLinecap="round"
                        fill="none"
                        style={{
                          strokeDasharray: `${TIMER_CIRCUMFERENCE}px`,
                          strokeDashoffset: `${timerOffset}px`,
                          transition: 'stroke-dashoffset 200ms linear, stroke 180ms ease',
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
                    className={`seat-avatar-inner rounded-full overflow-hidden border bg-slate-950 shadow-inner relative transition-all duration-300 w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-11 sm:h-11 ${
                      isCritical
                        ? 'border-amber-400 ring-2 ring-red-500/80 scale-105'
                        : 'border-slate-700'
                    }`}
                  >
                    <AvatarView avatarId={player.avatarId} customPhoto={player.customPhoto} />
                  </div>
                </div>

                <div
                  className={`seat-name-pill px-2 py-0.5 mt-0.5 rounded-full text-center flex items-center justify-center min-w-[54px] max-w-[85px] xs:max-w-[95px] shadow-lg border backdrop-blur-sm ${
                    isTeamA
                      ? 'bg-blue-950/95 border-cyan-400/60 text-cyan-100 shadow-blue-900/30'
                      : 'bg-rose-950/95 border-rose-400/60 text-rose-100 shadow-rose-900/30'
                  }`}
                >
                  <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-black font-sans tracking-wide truncate leading-tight drop-shadow-sm">
                    {idx === humanSeatIndex ? (player.name || 'أنت') : player.name}
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
