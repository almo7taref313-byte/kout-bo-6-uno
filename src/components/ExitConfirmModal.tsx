import React from 'react';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-sm p-3.5 sm:p-5 text-center shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="text-3xl mb-2">🚪</div>
        <h3 className="text-base sm:text-lg font-black text-white mb-1">هل تود الخروج؟</h3>
        <p className="text-xs text-slate-400 mb-4">سيتم العودة إلى القائمة الرئيسية للعبة.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition active:scale-95 shadow cursor-pointer"
          >
            نعم، خروج
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
