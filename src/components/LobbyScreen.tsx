import React, { useState } from 'react';
import { Card } from '../types';
import { MatchTargetScore } from '../utils/gameLogic';
import { AvatarView } from '../utils/avatars';
import { UnoCard } from './UnoCard';
import { YellowDoorIcon } from './YellowDoorIcon';

interface LobbyScreenProps {
  userName: string;
  avatarId: string;
  customPhoto: string | null;
  soundEnabled: boolean;
  isLandscapeMode?: boolean;
  targetScore: MatchTargetScore;
  onSelectTargetScore: (score: MatchTargetScore) => void;
  onFastPlay: (score?: MatchTargetScore) => void;
  onOpenHostTable: () => void;
  onJoinRoomCode: (code: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onToggleScreenOrientation?: () => void;
  onOpenInstallModal: () => void;
  onExitApp: () => void;
}

const GREEN_UNO_CARD_1: Card = {
  id: 'lobby-green-1',
  color: 'green',
  rank: '1',
  label: '1',
  roleTitle: '1 أخضر',
  isMaker: false,
  isJoker: false,
};

const TARGET_SCORE_OPTIONS: MatchTargetScore[] = [26, 51, 101];

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  userName,
  avatarId,
  customPhoto,
  soundEnabled: _soundEnabled,
  isLandscapeMode = false,
  targetScore,
  onSelectTargetScore,
  onFastPlay,
  onOpenHostTable,
  onJoinRoomCode,
  onOpenProfile,
  onOpenSettings,
  onToggleScreenOrientation,
  onOpenInstallModal,
  onExitApp,
}) => {
  const [quickCode, setQuickCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim().length === 4) {
      onJoinRoomCode(quickCode.trim());
    }
  };

  const handlePickTargetScore = (score: MatchTargetScore) => {
    onSelectTargetScore(score);
    onFastPlay(score);
  };

  return (
    <div className="fixed inset-0 z-50 lobby-bg flex flex-col justify-between items-center p-3 xs:p-4 sm:p-6 overflow-y-auto h-full max-h-full safe-top safe-bottom select-none">
      {/* Top Header: الملف الشخصي وزر تدوير الشاشة وعلامة الترس */}
      <header className="w-full max-w-sm sm:max-w-md flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl px-3 py-2 shadow-xl">
        {/* الملف الشخصي */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 px-1 py-0.5 rounded-xl hover:bg-slate-800/50 active:scale-95 transition cursor-pointer text-right group"
          title="الملف الشخصي"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-950 shadow-md shrink-0">
            <AvatarView avatarId={avatarId} customPhoto={customPhoto} />
          </div>
          <div className="flex flex-col text-right">
            <span className="font-black text-xs xs:text-sm text-white group-hover:text-amber-300 transition truncate max-w-[140px] xs:max-w-[170px]">
              {userName || 'الملف الشخصي'}
            </span>
            <span className="text-[10px] text-amber-400/90 font-bold">
              الملف الشخصي
            </span>
          </div>
        </button>

        {/* زر تدوير الشاشة والإعدادات */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          {onToggleScreenOrientation && (
            <button
              type="button"
              onClick={onToggleScreenOrientation}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition active:scale-90 shadow-md cursor-pointer touch-manipulation ${
                isLandscapeMode
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/80 text-emerald-300'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-amber-400 hover:text-amber-300'
              }`}
              title={isLandscapeMode ? 'تغيير الشاشة للوضع الرأسي' : 'تغيير الشاشة للوضع الأفقي'}
              aria-label="تبديل وضعية الشاشة"
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${
                  isLandscapeMode ? 'rotate-90 text-emerald-300' : 'text-amber-400'
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
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-10 h-10 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700/90 rounded-xl border border-slate-700/80 text-amber-400 hover:text-amber-300 text-xl transition active:scale-90 shadow-md cursor-pointer touch-manipulation"
            title="الإعدادات"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Center Hero: ورقة أونو خضراء رقم 1 مع العنوان المميز المريح للعين */}
      <main className="flex flex-col items-center justify-center text-center my-auto py-2 sm:py-4 w-full max-w-sm">
        {/* ورقة الأونو الخضراء رقم 1 مع إضاءة خافتة أنيقة */}
        <div className="relative mb-2.5 group">
          {/* هالة خضراء ناعمة خلف الورقة */}
          <div className="absolute inset-0 bg-emerald-500/25 rounded-3xl blur-2xl transform scale-125 pointer-events-none" />

          {/* الورقة بلمسة 3D خفيفة وظلال ناعمة بدون أي إطار مزدوج */}
          <div className="relative drop-shadow-[0_14px_24px_rgba(0,0,0,0.65)] transform rotate-[-4deg] group-hover:rotate-0 transition-transform duration-300">
            <UnoCard
              card={GREEN_UNO_CARD_1}
              isClickable={false}
              size="hand"
              className="!w-20 !h-[120px] xs:!w-24 xs:!h-36 sm:!w-28 sm:!h-[168px] !rounded-[10px] !border-0 !bg-transparent !shadow-none"
            />
          </div>
        </div>

        {/* عنوان اللعبة */}
        <h1 className="text-xl xs:text-2xl sm:text-4xl font-black text-white tracking-wide drop-shadow-md">
          كوت بو ستة أونو
        </h1>
      </main>

      {/* Action Buttons Section */}
      <footer className="w-full max-w-xs sm:max-w-sm space-y-2 pb-1">
        {/* شريط اختيار نقاط الفوز فوق زر العب: 3 مربعات (26، 51، 101) */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/90 rounded-2xl p-1.5 shadow-lg">
          <div className="grid grid-cols-3 gap-2" dir="ltr">
            {TARGET_SCORE_OPTIONS.map((score) => {
              const isSelected = targetScore === score;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => handlePickTargetScore(score)}
                  className={`py-2 sm:py-2.5 rounded-xl font-mono font-black text-sm sm:text-base transition active:scale-95 cursor-pointer flex items-center justify-center border-2 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.55)]'
                      : 'bg-slate-950/90 text-white border-slate-700 hover:border-amber-400/70 hover:text-amber-300'
                  }`}
                  title={`ابدأ اللعب من ${score}`}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>

        {/* زر العب (الأخضر المتوهج الأساسي) */}
        <button
          onClick={() => onFastPlay(targetScore)}
          className="w-full py-3 sm:py-3.5 px-4 rounded-2xl btn-glow-green text-white font-black text-base sm:text-lg shadow-xl transition active:scale-95 hover:brightness-110 flex items-center justify-center cursor-pointer"
        >
          <span>العب</span>
        </button>

        {/* زر طاولة خاصة */}
        <button
          onClick={onOpenHostTable}
          className="w-full py-2.5 sm:py-3 px-4 rounded-2xl btn-glow-blue text-white font-extrabold text-xs sm:text-sm shadow-md transition active:scale-95 hover:brightness-110 flex items-center justify-center cursor-pointer"
        >
          <span>طاولة خاصة</span>
        </button>

        {/* إدخال رمز الغرفة */}
        <form onSubmit={handleJoin} className="flex gap-1.5 pt-0.5">
          <input
            type="text"
            value={quickCode}
            onChange={(e) => setQuickCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            placeholder="رمز الغرفة (4 أرقام)"
            className="flex-1 bg-slate-900/90 border border-slate-700/90 focus:border-amber-400 px-3 py-2 rounded-xl text-white font-mono text-center font-bold text-xs tracking-wider uppercase outline-none shadow-inner"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer whitespace-nowrap"
          >
            دخول
          </button>
        </form>

        {/* زر تثبيت التطبيق */}
        <button
          onClick={onOpenInstallModal}
          className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>📥</span>
          <span>تثبيت وتحميل اللعبة على جهازك</span>
        </button>

        {/* زر خروج فقط في الأسفل بنعومة وهدوء */}
        <div className="pt-1.5 flex items-center justify-center">
          <button
            onClick={onExitApp}
            className="text-amber-400/90 hover:text-amber-300 font-bold text-xs px-3 py-1 rounded-lg hover:bg-amber-950/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <YellowDoorIcon className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
