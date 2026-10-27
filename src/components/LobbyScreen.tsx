import React, { useState } from 'react';
import { Card } from '../types';
import { AvatarView } from '../utils/avatars';
import { UnoCard } from './UnoCard';

interface LobbyScreenProps {
  userName: string;
  avatarId: string;
  customPhoto: string | null;
  soundEnabled: boolean;
  onFastPlay: () => void;
  onOpenHostTable: () => void;
  onJoinRoomCode: (code: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
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

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  userName,
  avatarId,
  customPhoto,
  soundEnabled: _soundEnabled,
  onFastPlay,
  onOpenHostTable,
  onJoinRoomCode,
  onOpenProfile,
  onOpenSettings,
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

  return (
    <div className="fixed inset-0 z-50 lobby-bg flex flex-col justify-between items-center p-3 xs:p-4 sm:p-6 overflow-y-auto max-h-[100dvh] safe-top safe-bottom select-none">
      
      {/* Top Header: الملف الشخصي وعلامة الترس */}
      <header className="w-full max-w-sm sm:max-w-md flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl px-3 py-2 shadow-xl">
        {/* الملف الشخصي */}
        <button
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

        {/* علامة الترس */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700/90 rounded-xl border border-slate-700/80 text-amber-400 hover:text-amber-300 text-xl transition active:scale-90 shadow-md cursor-pointer"
          title="الإعدادات"
        >
          ⚙️
        </button>
      </header>

      {/* Center Hero: ورقة أونو خضراء رقم 1 مع العنوان المميز المريح للعين */}
      <main className="flex flex-col items-center justify-center text-center my-auto py-3 sm:py-5">
        {/* ورقة الأونو الخضراء رقم 1 مع إضاءة خافتة أنيقة */}
        <div className="relative mb-3 group">
          {/* هالة خضراء ناعمة خلف الورقة */}
          <div className="absolute inset-0 bg-emerald-500/25 rounded-3xl blur-2xl transform scale-125 pointer-events-none" />

          {/* الورقة بلمسة 3D خفيفة وظلال ناعمة */}
          <div className="relative drop-shadow-[0_16px_28px_rgba(0,0,0,0.7)] transform rotate-[-4deg] group-hover:rotate-0 group-hover:scale-105 transition-all duration-300">
            <UnoCard
              card={GREEN_UNO_CARD_1}
              isClickable={false}
              size="hand"
              className="!w-20 !h-32 xs:!w-24 xs:!h-36 sm:!w-28 sm:!h-42 !rounded-2xl border-2 border-white shadow-2xl"
            />
          </div>
        </div>

        {/* عنوان اللعبة فقط - نقي وواضح ومريح للعين بدون أي جمل زائدة */}
        <h1 className="text-xl xs:text-2xl sm:text-4xl font-black text-white tracking-wide drop-shadow-md">
          كوت بو ستة أونو
        </h1>
      </main>

      {/* Action Buttons Section */}
      <footer className="w-full max-w-xs sm:max-w-sm space-y-2 pb-1">
        {/* زر العب (الأخضر المتوهج الأساسي) */}
        <button
          onClick={onFastPlay}
          className="w-full py-3 sm:py-3.5 px-4 rounded-2xl btn-glow-green text-white font-black text-base sm:text-lg shadow-xl transition active:scale-95 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-lg sm:text-xl">⚡</span>
          <span>العب</span>
        </button>

        {/* زر طاولة خاصة */}
        <button
          onClick={onOpenHostTable}
          className="w-full py-2.5 sm:py-3 px-4 rounded-2xl btn-glow-blue text-white font-extrabold text-xs sm:text-sm shadow-md transition active:scale-95 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-sm sm:text-base">👥</span>
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
            دخول 🚪
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
            className="text-rose-400/90 hover:text-rose-300 font-bold text-xs px-3 py-1 rounded-lg hover:bg-rose-950/20 active:scale-95 transition cursor-pointer"
          >
            خروج 🚪
          </button>
        </div>
      </footer>
    </div>
  );
};
