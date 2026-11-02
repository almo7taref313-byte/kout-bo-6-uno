import React from 'react';
import { YellowDoorIcon } from './YellowDoorIcon';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-sm p-3.5 sm:p-5 text-center shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex justify-center mb-2.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/60 flex items-center justify-center shadow-lg">
            <YellowDoorIcon className="w-7 h-7" />
          </div>
        </div>
        <h3 className="text-base sm:text-lg font-black text-white mb-1">هل تود الخروج؟</h3>
        <p className="text-xs text-slate-400 mb-4">سيتم العودة إلى القائمة الرئيسية للعبة.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <YellowDoorIcon className="w-4 h-4" />
            <span>نعم، خروج</span>
          </button>
          <button
            onClick={onCancel}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 transition active:scale-95 cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
