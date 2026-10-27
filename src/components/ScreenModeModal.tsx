import React from 'react';

interface ScreenModeModalProps {
  onSetAuto: () => void;
  onSetLandscape: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const ScreenModeModal: React.FC<ScreenModeModalProps> = ({
  onSetAuto,
  onSetLandscape,
  onToggleFullscreen,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl sm:rounded-3xl w-full max-w-xs p-3 xs:p-4 text-center text-white shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
          <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
            <span>🖥️</span>
            <span>أوضاع عرض الشاشة</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <button
            type="button"
            onClick={onSetAuto}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 transition active:scale-95 border border-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>🔄</span>
              <span>تلقائي (Auto)</span>
            </span>
            <span className="text-[9px] text-slate-400 font-normal">الوضع الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={onSetLandscape}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 transition active:scale-95 border border-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>📱</span>
              <span>بالعرض (Landscape)</span>
            </span>
            <span className="text-[9px] text-amber-400 font-bold">تدوير الطاولة</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 transition active:scale-95 border border-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>⛶</span>
              <span>ملء الشاشة بالكامل</span>
            </span>
            <span className="text-[9px] text-emerald-400 font-bold">كامل الشاشة</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
        >
          إغلاق النافذة
        </button>
      </div>
    </div>
  );
};
