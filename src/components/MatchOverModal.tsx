import React from 'react';
import { Team } from '../types';

interface MatchOverModalProps {
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: Team;
  isZeroAsam: boolean;
  onNewGame: () => void;
  onExit: () => void;
}

const YellowDoorIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M13 4h3a2 2 0 0 1 2 2v14" />
    <path d="M2 20h3" />
    <path d="M13 20h9" />
    <path d="M10 12v.01" />
    <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
  </svg>
);

const NewGameRefreshIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const CONFETTI_PIECES = [
  { top: '6%', left: '12%', w: '11px', h: '20px', bg: '#fbbf24', rot: '25deg', delay: '0s' },
  { top: '10%', left: '82%', w: '13px', h: '13px', bg: '#3b82f6', round: true, delay: '0.2s' },
  { top: '16%', left: '24%', w: '16px', h: '9px', bg: '#10b981', rot: '-35deg', delay: '0.4s' },
  { top: '7%', left: '64%', w: '11px', h: '18px', bg: '#f43f5e', rot: '40deg', delay: '0.1s' },
  { top: '22%', left: '88%', w: '15px', h: '8px', bg: '#fde047', rot: '-15deg', delay: '0.3s' },
  { top: '24%', left: '9%', w: '12px', h: '12px', bg: '#a855f7', round: true, delay: '0.5s' },
  { top: '78%', left: '14%', w: '12px', h: '18px', bg: '#10b981', rot: '20deg', delay: '0.15s' },
  { top: '86%', left: '80%', w: '15px', h: '9px', bg: '#fbbf24', rot: '-28deg', delay: '0.35s' },
  { top: '74%', left: '87%', w: '11px', h: '11px', bg: '#3b82f6', round: true, delay: '0.25s' },
  { top: '82%', left: '28%', w: '13px', h: '8px', bg: '#f43f5e', rot: '18deg', delay: '0.45s' },
];

export const MatchOverModal: React.FC<MatchOverModalProps> = ({
  scoreTeamA,
  scoreTeamB,
  winnerTeam,
  isZeroAsam,
  onNewGame,
  onExit,
}) => {
  const isBlueWinner = winnerTeam === 'A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e17]/80 backdrop-blur-md select-none overflow-hidden animate-fadeIn">
      {/* قصاصات الاحتفال المتناثرة (Confetti & Sparkles) */}
      {CONFETTI_PIECES.map((piece, idx) => (
        <div
          key={idx}
          className="absolute pointer-events-none animate-bounce"
          style={{
            top: piece.top,
            left: piece.left,
            width: piece.w,
            height: piece.h,
            backgroundColor: piece.bg,
            borderRadius: piece.round ? '9999px' : '3px',
            transform: piece.rot ? `rotate(${piece.rot})` : undefined,
            animationDelay: piece.delay,
            animationDuration: '2.2s',
          }}
        />
      ))}

      <div className="absolute top-[11%] left-[46%] text-xl pointer-events-none animate-pulse">✨</div>
      <div className="absolute top-[17%] left-[16%] text-xl pointer-events-none animate-bounce">🎉</div>
      <div className="absolute top-[16%] left-[76%] text-xl pointer-events-none animate-bounce">🎊</div>

      {/* بطاقة الاحتفال الرئيسية */}
      <div className="relative z-10 w-full max-w-[368px] bg-gradient-to-b from-[#171d2b] to-[#0f131d] border-2 border-amber-400/75 rounded-[28px] px-5 pt-7 pb-6 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(251,191,36,0.25)] text-center mt-6">
        {/* شعار الكأس الذهبي البارز */}
        <div className="w-[84px] h-[84px] -mt-[62px] mx-auto mb-3 rounded-full bg-gradient-to-b from-yellow-200 via-amber-500 to-amber-700 border-4 border-amber-50 flex items-center justify-center text-[44px] shadow-[0_10px_30px_rgba(245,158,11,0.6)] animate-bounce">
          🏆
        </div>

        {/* العنوان الرئيسي والفريق البطل */}
        <h2
          className="text-2xl xs:text-[26px] font-black text-amber-400 mb-1 flex items-center justify-center gap-2"
          style={{ textShadow: '0 2px 12px rgba(251, 191, 36, 0.45)' }}
        >
          <span>🎉</span>
          <span>مبروك الفوز</span>
          <span>🎉</span>
        </h2>
        <p
          className={`text-sm font-extrabold mb-4 ${
            isBlueWinner ? 'text-blue-400' : 'text-red-400'
          }`}
        >
          {isBlueWinner ? 'الفريق الأزرق بطل الطاولة' : 'الفريق الأحمر بطل الطاولة'}
        </p>

        {/* صندوق النتيجة النهائية */}
        <div className="flex items-center justify-around bg-[#0b0e16] border border-slate-400/25 rounded-[18px] py-3.5 px-3 mb-5">
          {/* الفريق الأزرق */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-300">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span>الفريق الأزرق</span>
              {isBlueWinner && <span>👑</span>}
            </div>
            <span
              className={`text-3xl xs:text-[34px] font-black font-mono leading-none ${
                isBlueWinner ? 'text-yellow-300' : 'text-white'
              }`}
            >
              {scoreTeamA}
            </span>
          </div>

          <div className="flex flex-col items-center text-[11px] font-extrabold text-slate-400 px-2">
            <span>النتيجة</span>
            <span>النهائية</span>
          </div>

          {/* الفريق الأحمر */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-300">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span>الفريق الأحمر</span>
              {!isBlueWinner && <span>👑</span>}
            </div>
            <span
              className={`text-3xl xs:text-[34px] font-black font-mono leading-none ${
                !isBlueWinner ? 'text-yellow-300' : 'text-white'
              }`}
            >
              {scoreTeamB}
            </span>
          </div>
        </div>

        {/* الأيقونتان المتراصتان عمودياً: لعبة جديدة وتحتها خروج */}
        <div className="flex flex-col gap-3 w-full">
          {/* أيقونة لعبة جديدة */}
          <button
            onClick={onNewGame}
            className="w-full h-[52px] rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 border-2 border-emerald-300 text-white text-[17px] font-black flex items-center justify-center gap-2.5 shadow-[0_8px_24px_rgba(16,185,129,0.45)] transition active:scale-95 cursor-pointer"
          >
            <NewGameRefreshIcon className="w-[22px] h-[22px]" />
            <span>لعبة جديدة</span>
          </button>

          {/* أيقونة خروج تحتها مباشرة */}
          <button
            onClick={onExit}
            className="w-full h-[48px] rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-400/75 hover:border-amber-300 text-amber-400 text-[16px] font-black flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(245,158,11,0.18)] transition active:scale-95 cursor-pointer"
          >
            <YellowDoorIcon className="w-[22px] h-[22px]" />
            <span>خروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
