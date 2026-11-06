import React from 'react';
import { Player, SuitColor } from '../types';
import { MatchTargetScore, SUIT_COLORS, getMatchTargetAndStatus } from '../utils/gameLogic';
import { YellowDoorIcon } from './YellowDoorIcon';

interface ScoreBoardProps {
  scoreTeamA: number;
  scoreTeamB: number;
  tricksTeamA: number;
  tricksTeamB: number;
  highestBid: number;
  bidWinner: number | null;
  isForcedBid: boolean;
  trumpColor: SuitColor | null;
  players: Player[];
  roomCode: string;
  soundEnabled: boolean;
  isLandscapeMode?: boolean;
  matchTargetScore?: MatchTargetScore;
  tableColor?: 'snow' | 'green';
  onToggleTableColor?: () => void;
  onToggleSound: () => void;
  onToggleScreenOrientation?: () => void;
  onOpenProfile: () => void;
  onOpenRooms: () => void;
  onOpenRules: () => void;
  onOpenScreenModal: () => void;
  onOpenSettings?: () => void;
  onReturnToLobby: () => void;
  onExitGame: () => void;
  hasLastTrick?: boolean;
  onOpenLastTrick?: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  scoreTeamA,
  scoreTeamB,
  tricksTeamA,
  tricksTeamB,
  highestBid,
  bidWinner,
  trumpColor,
  players,
  roomCode,
  soundEnabled,
  isLandscapeMode = false,
  matchTargetScore = 101,
  tableColor = 'snow',
  onToggleTableColor,
  onToggleSound,
  onToggleScreenOrientation,
  onOpenRooms,
  onOpenRules,
  onOpenScreenModal,
  onOpenSettings,
  onExitGame,
  hasLastTrick = false,
  onOpenLastTrick,
}) => {
  const trumpInfo = trumpColor && SUIT_COLORS[trumpColor] ? SUIT_COLORS[trumpColor] : null;
  const targetTricks = Math.min(9, Math.max(5, highestBid >= 5 ? highestBid : 5));
  const buyerPlayer =
    bidWinner !== null ? players.find((p) => p.id === bidWinner) || players[bidWinner] : null;
  const buyerTeam = buyerPlayer?.team || 'A';
  // Blue tricks (Team A) fill left-to-right (0 .. 8), so trick N is at index (N - 1)
  // Red tricks (Team B) fill right-to-left (8 .. 0), so trick N is at index (9 - N)
  const targetDotIdx = buyerTeam === 'B' ? 9 - targetTricks : targetTricks - 1;
  const defendingTricks = buyerTeam === 'A' ? tricksTeamB : tricksTeamA;
  const isBidBrokenKout = highestBid >= 5 && 9 - defendingTricks < targetTricks;
  const { targetScore } = getMatchTargetAndStatus(scoreTeamA, scoreTeamB, matchTargetScore);

  // Build the 9 trick circles:
  // Blue tricks (Team A) fill from left (0 .. tricksTeamA - 1)
  // Red tricks (Team B) fill from right (8 down to 9 - tricksTeamB)
  // White target dot moves dynamically to the bid target slot (5 -> middle slot 5, 6 -> slot 6, etc.)
  const renderNineDots = () => {
    const dotSize = isLandscapeMode
      ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0'
      : 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0';
    const gapSize = isLandscapeMode ? 'gap-[3px] sm:gap-1' : 'gap-1 sm:gap-1.5';

    return (
      <div className={`flex items-center justify-center ${gapSize}`} dir="ltr">
        {Array.from({ length: 9 }).map((_, idx) => {
          const isBlueWon = idx < tricksTeamA;
          const isRedWon = idx >= 9 - tricksTeamB;
          const isTargetDot = idx === targetDotIdx;

          if (isBlueWon) {
            return (
              <span
                key={idx}
                className={`${dotSize} rounded-full bg-[#090d16] p-[1.5px] sm:p-[2px] flex items-center justify-center shadow-inner transition-all duration-200 ${
                  isTargetDot && isBidBrokenKout ? 'ring-2 ring-amber-400 animate-pulse' : ''
                }`}
              >
                <span className="w-full h-full rounded-full bg-gradient-to-b from-[#38bdf8] to-[#0284c7] shadow-[0_0_6px_rgba(56,189,248,0.85)]" />
              </span>
            );
          }

          if (isRedWon) {
            return (
              <span
                key={idx}
                className={`${dotSize} rounded-full bg-[#090d16] p-[1.5px] sm:p-[2px] flex items-center justify-center shadow-inner transition-all duration-200 ${
                  isTargetDot && isBidBrokenKout ? 'ring-2 ring-amber-400 animate-pulse' : ''
                }`}
              >
                <span className="w-full h-full rounded-full bg-gradient-to-b from-[#fb7185] to-[#e11d48] shadow-[0_0_6px_rgba(244,63,94,0.85)]" />
              </span>
            );
          }

          if (isTargetDot) {
            return (
              <span
                key={idx}
                className={`${dotSize} rounded-full bg-white border border-amber-200/80 shadow-[0_0_7px_rgba(255,255,255,0.85)] transition-all duration-200`}
                title={`الأكلة المطلوبة للشراء (${targetTricks === 9 ? 'باون - 9' : targetTricks})`}
              />
            );
          }

          return (
            <span
              key={idx}
              className={`${dotSize} rounded-full bg-[#070a12] border border-slate-700/80 shadow-inner transition-all duration-200`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <header className="scoreboard-header w-full bg-[#171a22]/98 backdrop-blur-md z-30 select-none flex-shrink-0 border-b border-[#2d323b] shadow-md">
      <div className="scoreboard-inner w-full px-2 sm:px-3 py-1 flex items-center justify-between min-h-[42px] gap-2 sm:gap-3 overflow-x-hidden">
        {/* Adopted First Design: Unified Score & Tricks Box */}
        <div
          dir="ltr"
          className={`flex-1 max-w-[320px] sm:max-w-[380px] rounded-xl overflow-hidden border transition-all duration-300 shadow-[0_4px_14px_rgba(0,0,0,0.65)] bg-[#090d16] tabular-nums ${
            isBidBrokenKout
              ? 'border-amber-400/90 shadow-[0_0_14px_rgba(251,191,36,0.45)]'
              : 'border-slate-600/90'
          }`}
        >
          {/* Top Bar: Match Score (Blue Left | Target Center | Red Right) */}
          <div
            className={`w-full bg-gradient-to-b from-[#17223b] to-[#0e1526] px-3.5 sm:px-4 ${
              isLandscapeMode ? 'py-0.5' : 'py-1'
            } grid grid-cols-3 items-center border-b-[2.5px] border-black`}
          >
            <span
              className={`${
                isLandscapeMode ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'
              } font-black text-[#38bdf8] drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] leading-none text-left`}
            >
              {scoreTeamA}
            </span>

            <span
              className={`${
                isLandscapeMode ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'
              } font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-none tracking-tight text-center`}
            >
              {targetScore}
            </span>

            <span
              className={`${
                isLandscapeMode ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'
              } font-black text-[#fb7185] drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] leading-none text-right`}
            >
              {scoreTeamB}
            </span>
          </div>

          {/* Bottom Bar: Tricks & Target Tricks (0/5 | 9 Dots | 1/5) */}
          <div
            className={`w-full bg-gradient-to-b from-[#2c3344] to-[#1e2433] px-3 sm:px-3.5 ${
              isLandscapeMode ? 'py-0.5' : 'py-1'
            } grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-2 border-t border-white/10`}
          >
            <div className="flex items-baseline font-black leading-none shrink-0" dir="ltr">
              <span
                className={`${
                  isLandscapeMode ? 'text-sm sm:text-base' : 'text-base sm:text-xl'
                } text-[#38bdf8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
              >
                {tricksTeamA}
              </span>
              <span
                className={`${
                  isLandscapeMode ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                } text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
              >
                /{targetTricks}
              </span>
            </div>

            <div className="flex items-center justify-center min-w-0">
              {renderNineDots()}
            </div>

            <div className="flex items-baseline justify-end font-black leading-none shrink-0" dir="ltr">
              <span
                className={`${
                  isLandscapeMode ? 'text-sm sm:text-base' : 'text-base sm:text-xl'
                } text-[#fb7185] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
              >
                {tricksTeamB}
              </span>
              <span
                className={`${
                  isLandscapeMode ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                } text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
              >
                /{targetTricks}
              </span>
            </div>
          </div>
        </div>

        {/* Left Section (in RTL): Last Trick + Table Color Toggle + Orientation Toggle + Sound + Exit */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Last Trick viewer button */}
          {hasLastTrick && onOpenLastTrick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLastTrick();
              }}
              className="px-2 h-7 sm:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] text-amber-300 font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 transition active:scale-90 shadow cursor-pointer border border-amber-400/50 touch-manipulation"
              title="عرض أوراق آخر أكلة طُويت"
              aria-label="آخر أكلة"
            >
              <span>🃏</span>
              <span className="hidden xs:inline">آخر أكلة</span>
            </button>
          )}
          {/* Table Color toggle button (Snowy Gray vs Classic Green) */}
          {onToggleTableColor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleTableColor();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] flex items-center justify-center transition active:scale-90 shadow cursor-pointer border border-slate-600/80 touch-manipulation"
              title={
                tableColor === 'green'
                  ? 'تغيير لون الطاولة إلى الثلجي الرمادي'
                  : 'تغيير لون الطاولة إلى الأخضر الكلاسيكي'
              }
              aria-label="تغيير لون الطاولة"
            >
              <span
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  tableColor === 'green'
                    ? 'bg-gradient-to-br from-[#2fa53e] to-[#1e7529] border-emerald-200 shadow-[0_0_6px_rgba(47,165,62,0.8)]'
                    : 'bg-gradient-to-br from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] border-slate-400 shadow-[0_0_6px_rgba(226,232,240,0.7)]'
                }`}
              />
            </button>
          )}

          {/* Screen Orientation toggle button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleScreenOrientation) {
                onToggleScreenOrientation();
              } else {
                onOpenScreenModal();
              }
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition active:scale-90 shadow cursor-pointer border touch-manipulation ${
              isLandscapeMode
                ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-[#2b303c] hover:bg-[#343a49] text-amber-300 border-slate-600/80'
            }`}
            title={isLandscapeMode ? 'تغيير الشاشة للوضع الرأسي' : 'تغيير الشاشة للوضع الأفقي'}
            aria-label="تبديل وضعية الشاشة"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                isLandscapeMode ? 'rotate-90 text-emerald-300' : 'text-amber-300'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="6" y="3" width="12" height="18" rx="2.5" />
              <path d="M10 18h4" />
              <path d="M2.5 9.5a8.5 8.5 0 0 1 3-4.5" />
              <path d="M21.5 14.5a8.5 8.5 0 0 1-3 4.5" />
            </svg>
          </button>

          {/* Sound toggle button */}
          <button
            type="button"
            onClick={onToggleSound}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] flex items-center justify-center text-slate-200 text-xs transition active:scale-90 shadow cursor-pointer border border-slate-700/60 touch-manipulation"
            title="الصوت"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Exit game button */}
          <button
            type="button"
            onClick={onExitGame}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-400/70 hover:border-amber-300 flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer group touch-manipulation"
            title="خروج من اللعبة"
          >
            <YellowDoorIcon className="w-3.5 h-3.5 group-hover:scale-105 transition" />
          </button>
        </div>
      </div>
    </header>
  );
};
