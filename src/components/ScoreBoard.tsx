import React from 'react';
import { Player, SuitColor } from '../types';
import { SUIT_COLORS, getMatchTargetAndStatus } from '../utils/gameLogic';

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

  // Helper Renderer: Match Total Score (إجمالي النتيجة) - strictly with Team Colors, no "لنا" / "لهم"
  const renderScorePanel = () => (
    <div className="flex items-center bg-[#0d1017] border-2 border-slate-700/90 rounded-2xl px-2 xs:px-2.5 py-0.5 xs:py-1 shadow-2xl gap-1.5 xs:gap-2 flex-shrink-0">
      {/* Blue Team Score 🔵 */}
      <div className="flex flex-col items-center leading-none min-w-[32px] xs:min-w-[38px]">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] border border-blue-300/80" />
        </div>
        <span className="text-sm xs:text-base sm:text-lg font-black text-blue-400 font-mono mt-0.5 drop-shadow leading-none">
          {scoreTeamA}
        </span>
        {statusTextA && (
          <span className="text-[6.5px] xs:text-[7.5px] font-black text-amber-300 bg-black/80 border border-amber-400 px-1 py-0.2 rounded mt-0.5 whitespace-nowrap animate-pulse">
            {statusTextA}
          </span>
        )}
      </div>

      {/* Target Score (101 if both >= 5, or 51 Asam) */}
      <div className="flex flex-col items-center justify-center px-1.5 text-center leading-none border-x border-slate-700/80">
        <span className="text-[6.5px] xs:text-[7.5px] font-bold text-amber-300 whitespace-nowrap">
          {bothHaveFiveOrMore ? 'الهدف' : 'عسم'}
        </span>
        <span className="text-[11px] xs:text-xs sm:text-sm font-black text-amber-400 font-mono mt-0.5">
          {targetScore}
        </span>
      </div>

      {/* Red Team Score 🔴 */}
      <div className="flex flex-col items-center leading-none min-w-[32px] xs:min-w-[38px]">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] border border-red-300/80" />
        </div>
        <span className="text-sm xs:text-base sm:text-lg font-black text-red-400 font-mono mt-0.5 drop-shadow leading-none">
          {scoreTeamB}
        </span>
        {statusTextB && (
          <span className="text-[6.5px] xs:text-[7.5px] font-black text-amber-300 bg-black/80 border border-amber-400 px-1 py-0.2 rounded mt-0.5 whitespace-nowrap animate-pulse">
            {statusTextB}
          </span>
        )}
      </div>
    </div>
  );

  // Helper Renderer: Round Tricks Panel (عداد الأكلات) - يقتصر على عدد الأكلات فقط دون ذكر عدد المزايدة بخلفية بيضاء ثلجية ولون الفريق
  const renderTricksPanel = () => (
    <div className="flex items-center bg-[#0d1017] border-2 border-slate-700/90 rounded-2xl p-1 xs:p-1.5 shadow-2xl gap-1.5 xs:gap-2 flex-shrink-0">
      {/* Blue Tricks 🔵 */}
      <div className="flex items-center gap-1.5 bg-blue-950/80 border border-blue-500/50 rounded-xl px-1.5 xs:px-2 py-0.5 xs:py-1">
        <span className="w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] border border-blue-200 flex-shrink-0" />
        {/* Snow-white background badge for trick count */}
        <div className="bg-[#f8fafc] border border-slate-200/90 shadow-sm rounded-lg min-w-[28px] xs:min-w-[34px] h-6 xs:h-7 flex items-center justify-center px-1">
          <span className="text-base xs:text-lg sm:text-xl font-black font-mono text-[#0063B0] leading-none">
            {tricksTeamA}
          </span>
        </div>
      </div>

      {/* Middle Label: الأكلات (دون ذكر عدد المزايدة) */}
      <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 leading-none text-center">
        <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-black text-amber-300 whitespace-nowrap">
          الأكلات
        </span>
      </div>

      {/* Red Tricks 🔴 */}
      <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500/50 rounded-xl px-1.5 xs:px-2 py-0.5 xs:py-1">
        {/* Snow-white background badge for trick count */}
        <div className="bg-[#f8fafc] border border-slate-200/90 shadow-sm rounded-lg min-w-[28px] xs:min-w-[34px] h-6 xs:h-7 flex items-center justify-center px-1">
          <span className="text-base xs:text-lg sm:text-xl font-black font-mono text-[#EA1D2D] leading-none">
            {tricksTeamB}
          </span>
        </div>
        <span className="w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] border border-red-200 flex-shrink-0" />
      </div>
    </div>
  );

  // Helper Renderer: Trump Indicator Badge (شعار الحكم ولونه البارز)
  const renderTrumpBadge = () => {
    if (trumpInfo && trumpColor) {
      return (
        <div className="flex items-center gap-1.5 bg-[#121622] border-2 border-amber-400/90 px-2 py-0.5 rounded-xl shadow-md flex-shrink-0 animate-pulse">
          <span className="text-[8.5px] xs:text-[9.5px] font-black text-amber-300 whitespace-nowrap">
            الحكم:
          </span>
          <div
            className="px-2 py-0.5 rounded-lg font-black text-[10px] xs:text-xs shadow-sm flex items-center gap-1 border border-white/60"
            style={{
              backgroundColor: trumpInfo.hex,
              color: trumpColor === 'yellow' ? '#111827' : '#ffffff',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm inline-block border border-black/20" />
            <span className="drop-shadow">{trumpInfo.name}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 bg-[#121622]/70 border border-slate-700/60 px-2 py-0.5 rounded-xl flex-shrink-0">
        <span className="text-[8px] xs:text-[9px] text-slate-400 font-medium whitespace-nowrap">
          الحكم: لم يُحدد
        </span>
      </div>
    );
  };

  return (
    <header className="w-full bg-[#171a22]/98 backdrop-blur-md z-30 select-none flex-shrink-0 border-b border-[#2d323b] shadow-md flex flex-col">
      {/* 1. Main Top Row (Contains Rooms, Score in Center, and Controls on Left) */}
      <div className="w-full px-1.5 xs:px-2.5 sm:px-4 py-1 flex items-center justify-between min-h-[44px] xs:min-h-[48px] sm:min-h-[52px] gap-1">
        
        {/* Right Section (in RTL): Rooms button + Widescreen (Tricks & Trump) */}
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Room / Room Number Button */}
          <button
            onClick={onOpenRooms}
            className="h-7 xs:h-8 sm:h-9 px-1.5 xs:px-2 rounded-xl bg-[#252a36] hover:bg-[#343a49] flex items-center justify-center gap-1 text-amber-400 transition active:scale-95 cursor-pointer shadow border border-slate-700/80 flex-shrink-0"
            title={`غرفة اللعب #${roomCode || ''}`}
          >
            <span className="text-sm xs:text-base leading-none">🏠</span>
            {roomCode && (
              <span className="font-mono text-[9px] xs:text-[10px] font-black text-amber-300 leading-none">
                #{roomCode}
              </span>
            )}
          </button>

          {/* On Widescreen / Landscape: Display Tricks & Trump right here on the right */}
          <div className="hud-widescreen-only items-center gap-2">
            {renderTricksPanel()}
            {renderTrumpBadge()}
          </div>
        </div>

        {/* Center: Total Match Score (إجمالي النتيجة) - Completely unobstructed, centered, zero overlap */}
        <div className="flex items-center justify-center flex-1 min-w-0 px-1 pointer-events-auto">
          {renderScorePanel()}
        </div>

        {/* Left Section (in RTL): Action Buttons */}
        <div className="flex items-center gap-1 xs:gap-1.5 flex-shrink-0">
          {/* Rules button (Visible on widescreen, accessible via settings on mobile) */}
          <button
            onClick={onOpenRules}
            className="hidden md:flex w-7 h-7 xs:w-8 xs:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] items-center justify-center text-amber-400 font-bold text-xs xs:text-sm transition active:scale-95 shadow cursor-pointer border border-slate-700/60"
            title="القوانين"
          >
            📖
          </button>

          {/* Screen orientation button (Visible on widescreen, accessible via settings on mobile) */}
          <button
            onClick={onOpenScreenModal}
            className="hidden md:flex w-7 h-7 xs:w-8 xs:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] items-center justify-center text-slate-200 text-xs xs:text-sm transition active:scale-95 shadow cursor-pointer border border-slate-700/60"
            title="أوضاع الشاشة"
          >
            🖥️
          </button>

          {/* Sound toggle button */}
          <button
            onClick={onToggleSound}
            className="w-7 h-7 xs:w-8 xs:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] flex items-center justify-center text-slate-200 text-xs xs:text-sm transition active:scale-95 shadow cursor-pointer border border-slate-700/60"
            title="الصوت"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Settings button (opens rules, sound, screen, profile) */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-7 h-7 xs:w-8 xs:h-8 rounded-lg bg-[#2b303c] hover:bg-[#343a49] flex items-center justify-center text-amber-400 text-xs xs:text-sm transition active:scale-95 shadow cursor-pointer border border-slate-700/60"
              title="الإعدادات"
            >
              ⚙️
            </button>
          )}

          {/* Exit game button: أيقونة باب أصفر مفتوح دالة وواضحة جداً على الخروج */}
          <button
            onClick={onExitGame}
            className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-400/70 hover:border-amber-300 flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer group"
            title="خروج من اللعبة"
          >
            {/* Open Yellow Door Icon: إطار الباب، والدرفة المفتوحة باللون الأصفر وسهم الخروج */}
            <svg
              className="w-4 h-4 xs:w-4.5 xs:h-4.5 text-yellow-400 group-hover:text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)] transition"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Door Frame (Yellow) */}
              <path d="M4 21V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17" />
              {/* Swung Open Door leaf in Perspective (Vibrant Yellow fill + outline) */}
              <path d="M15 4l5 2.5v12.5l-5 2V4z" fill="#facc15" fillOpacity="0.85" stroke="#eab308" />
              {/* Door Handle / Knob */}
              <circle cx="17.5" cy="12.5" r="1" fill="#78350f" stroke="none" />
              {/* Exit Directional Arrow heading outside through the open door */}
              <path d="M2 12h7m-4-3.5L2 12l3 3.5" stroke="#fde047" strokeWidth="2.4" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Mobile Portrait Sub-Bar (Displays Round Tricks on Right, Trump Badge on Left - NEVER overlaps score) */}
      <div className="hud-sub-bar w-full px-2 xs:px-3 py-1 items-center justify-between border-t border-slate-800/80 bg-[#10131b]/95 shadow-inner">
        <div className="flex items-center gap-1.5">
          {renderTricksPanel()}
        </div>
        <div className="flex items-center gap-1.5">
          {renderTrumpBadge()}
        </div>
      </div>
    </header>
  );
};
