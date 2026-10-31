import React from 'react';
import { Player, SuitColor } from '../types';
import { SUIT_COLORS, getMatchTargetAndStatus } from '../utils/gameLogic';
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
  onToggleSound: () => void;
  onOpenProfile: () => void;
  onOpenRooms: () => void;
  onOpenRules: () => void;
  onOpenScreenModal: () => void;
  onOpenSettings?: () => void;
  onReturnToLobby: () => void;
  onExitGame: () => void;
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
  onToggleSound,
  onOpenRooms,
  onOpenRules,
  onOpenScreenModal,
  onOpenSettings,
  onExitGame,
}) => {
  const trumpInfo = trumpColor && SUIT_COLORS[trumpColor] ? SUIT_COLORS[trumpColor] : null;
  const targetTricks = highestBid >= 5 ? highestBid : 5;

  // Identify bidder player and team
  const bidderPlayer = bidWinner !== null && players ? players[bidWinner] : null;
  const bidderTeam = bidderPlayer ? bidderPlayer.team : null;

  // Kuwaiti Kout scoring rule:
  // - Target is 101 if both teams have earned 5 or more points.
  // - Otherwise, winning score is 51 for the other team (called "عسم" Asam).
  // - If win is 51 vs 0: winning team gets "كفو عطيتهم عسم", losing team gets "عطاكم عسم".
  const { targetScore, bothHaveFiveOrMore, statusTextA, statusTextB } = getMatchTargetAndStatus(scoreTeamA, scoreTeamB);

  // Dynamic interactive contract status based on highestBid and tricks won
  let contractStatusBadge: { text: string; className: string } | null = null;
  if (bidderTeam === 'A') {
    if (tricksTeamA >= targetTricks) {
      contractStatusBadge = { text: 'تم الحكم 🏆', className: 'text-emerald-400 border-emerald-500/70 bg-emerald-950/80 shadow-[0_0_8px_rgba(52,211,153,0.3)]' };
    } else if (tricksTeamB > (9 - targetTricks)) {
      contractStatusBadge = { text: 'طاح الحكم ❌', className: 'text-rose-400 border-rose-500/70 bg-rose-950/80' };
    } else {
      const remaining = targetTricks - tricksTeamA;
      contractStatusBadge = { text: `باقي ${remaining}`, className: 'text-blue-300 border-blue-500/50 bg-blue-950/70' };
    }
  } else if (bidderTeam === 'B') {
    if (tricksTeamB >= targetTricks) {
      contractStatusBadge = { text: 'تم الحكم 🏆', className: 'text-emerald-400 border-emerald-500/70 bg-emerald-950/80 shadow-[0_0_8px_rgba(52,211,153,0.3)]' };
    } else if (tricksTeamA > (9 - targetTricks)) {
      contractStatusBadge = { text: 'طاح الحكم ❌', className: 'text-rose-400 border-rose-500/70 bg-rose-950/80' };
    } else {
      const remaining = targetTricks - tricksTeamB;
      contractStatusBadge = { text: `باقي ${remaining}`, className: 'text-red-300 border-red-500/50 bg-red-950/70' };
    }
  }

  // Helper Renderer: Match Total Score (إجمالي النتيجة) - أرقام بيضاء واضحة بدون هالة
  const renderScorePanel = () => (
    <div className="flex items-center bg-[#0d1017] border border-slate-700/80 rounded-xl px-2 xs:px-2.5 py-0.5 shadow-lg gap-1.5 xs:gap-2 flex-shrink-0">
      {/* Blue Team Score 🔵 */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
        <span className="text-sm xs:text-base sm:text-lg font-black text-white font-mono leading-none">
          {scoreTeamA}
        </span>
      </div>

      {/* Target Score (101 if both >= 5, or 51 Asam) */}
      <div className="flex flex-col items-center justify-center px-1.5 border-x border-slate-700/80 leading-none">
        <span className="text-[6.5px] xs:text-[7px] font-bold text-amber-300">الهدف</span>
        <span className="text-[10.5px] xs:text-xs font-black text-amber-400 font-mono mt-0.5">
          {targetScore}
        </span>
      </div>

      {/* Red Team Score 🔴 */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm xs:text-base sm:text-lg font-black text-white font-mono leading-none">
          {scoreTeamB}
        </span>
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
      </div>
    </div>
  );

  // Helper Renderer: Round Tricks Panel (عداد الأكلات) - كبسولتان أوسع بأرقام بيضاء أكبر وبدون هالة زرقاء أو حمراء
  const renderTricksPanel = () => (
    <div className="flex items-center bg-[#0d1017] border border-slate-700/80 rounded-xl px-1.5 py-0.5 shadow-lg gap-1.5 flex-shrink-0">
      {/* Blue Tricks 🔵 */}
      <div className="flex items-center justify-between gap-1.5 bg-[#161b26] border border-slate-600/60 rounded-lg px-2 xs:px-2.5 py-0.5 min-w-[38px] xs:min-w-[44px]">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
        <span className="text-sm xs:text-base sm:text-lg font-black font-mono text-white leading-none">
          {tricksTeamA}
        </span>
      </div>

      {/* Red Tricks 🔴 */}
      <div className="flex items-center justify-between gap-1.5 bg-[#161b26] border border-slate-600/60 rounded-lg px-2 xs:px-2.5 py-0.5 min-w-[38px] xs:min-w-[44px]">
        <span className="text-sm xs:text-base sm:text-lg font-black font-mono text-white leading-none">
          {tricksTeamB}
        </span>
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
      </div>
    </div>
  );

  // Helper Renderer: Trump Indicator Badge (شعار الحكم ولونه البارز)
  const renderTrumpBadge = () => {
    if (trumpInfo && trumpColor) {
      return (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-xl font-black text-[9px] xs:text-[10px] shadow-sm border border-white/40 flex-shrink-0 animate-pulse"
          style={{
            backgroundColor: trumpInfo.hex,
            color: trumpColor === 'yellow' ? '#111827' : '#ffffff',
          }}
          title={`الحكم: ${trumpInfo.name}`}
        >
          <span className="w-2 h-2 rounded-full bg-white shadow-sm inline-block" />
          <span className="drop-shadow">{trumpInfo.name}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 bg-[#121622]/80 border border-slate-700/60 px-1.5 py-0.5 rounded-xl flex-shrink-0">
        <span className="text-[7.5px] xs:text-[8px] text-slate-400 font-medium whitespace-nowrap">
          الحكم: -
        </span>
      </div>
    );
  };

  return (
    <header className="w-full bg-[#171a22]/98 backdrop-blur-md z-30 select-none flex-shrink-0 border-b border-[#2d323b] shadow-md">
      {/* Unified Single Row: Tricks on Right, Score in Center, Trump & Actions on Left */}
      <div className="w-full px-1 xs:px-2 sm:px-3 py-1 flex items-center justify-between min-h-[40px] xs:min-h-[44px] gap-1 overflow-x-hidden">
        
        {/* Right Section (in RTL): Tricks Panel (عداد الأكلات) */}
        <div className="flex items-center flex-shrink-0">
          {renderTricksPanel()}
        </div>

        {/* Center: Total Match Score (إجمالي النتيجة) */}
        <div className="flex items-center justify-center flex-shrink-0">
          {renderScorePanel()}
        </div>

        {/* Left Section (in RTL): Trump Badge + Sound + Exit */}
        <div className="flex items-center gap-1 xs:gap-1.5 flex-shrink-0">
          {renderTrumpBadge()}

          {/* Sound toggle button - مخفي مؤقتاً لاختبار التحديث المباشر */}
          {false && (
            <button
              onClick={onToggleSound}
              className="w-6.5 h-6.5 xs:w-7 xs:h-7 rounded-lg bg-[#2b303c] hover:bg-[#343a49] flex items-center justify-center text-slate-200 text-xs transition active:scale-95 shadow cursor-pointer border border-slate-700/60"
              title="الصوت"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          )}

          {/* Exit game button */}
          <button
            onClick={onExitGame}
            className="w-6.5 h-6.5 xs:w-7 xs:h-7 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-400/70 hover:border-amber-300 flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer group"
            title="خروج من اللعبة"
          >
            <YellowDoorIcon className="w-3.5 h-3.5 group-hover:scale-105 transition" />
          </button>
        </div>
      </div>
    </header>
  );
};
