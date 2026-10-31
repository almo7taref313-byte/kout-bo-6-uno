import React, { useState } from 'react';
import {
  CardTheme,
  getStoredCardTheme,
  preloadWhiteCardAssets,
  setStoredCardTheme,
} from '../utils/cardAssets';

interface SettingsModalProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenProfile: () => void;
  onOpenRules: () => void;
  onOpenScreenModal: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  soundEnabled,
  onToggleSound,
  onOpenProfile,
  onOpenRules,
  onOpenScreenModal,
  onClose,
}) => {
  const [cardTheme, setCardTheme] = useState<CardTheme>(() => getStoredCardTheme());

  const handleSelectCardTheme = (theme: CardTheme) => {
    if (theme === 'white') {
      preloadWhiteCardAssets();
    }
    setCardTheme(theme);
    setStoredCardTheme(theme);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl w-full max-w-sm p-3 xs:p-4 text-right shadow-2xl max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">⚙️</span>
            <h3 className="text-sm sm:text-base font-black text-amber-400">الإعدادات</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Settings List */}
        <div className="space-y-2.5 mb-4">
          {/* Card Style Switcher: Colored vs White */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🃏</span>
                <div>
                  <span className="text-xs font-bold text-white block">شكل أوراق اللعب (الكروت)</span>
                  <span className="text-[10px] text-slate-400">
                    {cardTheme === 'white'
                      ? 'الكروت البيضاء (واضحة ومريحة للعين)'
                      : 'الكروت الملونة (أونو الكلاسيكية)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectCardTheme('colored')}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                  cardTheme === 'colored'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>🎨</span>
                <span>الكروت الملونة</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCardTheme('white')}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                  cardTheme === 'white'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>🃏</span>
                <span>الكروت البيضاء</span>
              </button>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
              <div>
                <span className="text-xs font-bold text-white block">المؤثرات الصوتية</span>
                <span className="text-[10px] text-slate-400">
                  {soundEnabled ? 'مفعّلة' : 'صامت'}
                </span>
              </div>
            </div>
            <button
              onClick={onToggleSound}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {soundEnabled ? 'تشغيل ✅' : 'كتم 🔇'}
            </button>
          </div>

          {/* Profile & Avatar */}
          <button
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="w-full flex items-center justify-between bg-slate-950 hover:bg-slate-800/80 p-2.5 rounded-xl border border-slate-800 transition active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <div className="text-right">
                <span className="text-xs font-bold text-white block">الملف الشخصي والشخصيات</span>
                <span className="text-[10px] text-slate-400">تعديل الاسم واختيار الصورة</span>
              </div>
            </div>
            <span className="text-slate-400 text-sm">‹</span>
          </button>

          {/* Rules */}
          <button
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="w-full flex items-center justify-between bg-slate-950 hover:bg-slate-800/80 p-2.5 rounded-xl border border-slate-800 transition active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📜</span>
              <div className="text-right">
                <span className="text-xs font-bold text-white block">قواعد وطريقة اللعب</span>
                <span className="text-[10px] text-slate-400">شرح كوت بو ستة أونو ونظام النقاط</span>
              </div>
            </div>
            <span className="text-slate-400 text-sm">‹</span>
          </button>

          {/* Screen Rotation / Fullscreen */}
          <button
            onClick={() => {
              onClose();
              onOpenScreenModal();
            }}
            className="w-full flex items-center justify-between bg-slate-950 hover:bg-slate-800/80 p-2.5 rounded-xl border border-slate-800 transition active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <div className="text-right">
                <span className="text-xs font-bold text-white block">وضع الشاشة والتدوير</span>
                <span className="text-[10px] text-slate-400">ملء الشاشة، أفقي، تلقائي</span>
              </div>
            </div>
            <span className="text-slate-400 text-sm">‹</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
