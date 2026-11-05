import React from 'react';

interface SettingsModalProps {
  soundEnabled: boolean;
  tableColor?: 'snow' | 'green';
  onChangeTableColor?: (color: 'snow' | 'green') => void;
  onToggleSound: () => void;
  onOpenProfile: () => void;
  onOpenRules: () => void;
  onOpenScreenModal: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  soundEnabled,
  tableColor = 'snow',
  onChangeTableColor,
  onToggleSound,
  onOpenProfile,
  onOpenRules,
  onOpenScreenModal,
  onClose,
}) => {
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
          {/* Table Color Selector (Snowy Gray vs Classic Green) */}
          {onChangeTableColor && (
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎨</span>
                <div>
                  <span className="text-xs font-bold text-white block">لون طاولة اللعب</span>
                  <span className="text-[10px] text-slate-400">
                    اختر لون سطح الطاولة المفضل لديك
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeTableColor('snow')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition active:scale-95 cursor-pointer ${
                    tableColor === 'snow'
                      ? 'bg-slate-100 text-slate-900 border-amber-400 ring-2 ring-amber-400/50 shadow'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] border border-slate-400 shrink-0" />
                  <span>ثلجي رمادي</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTableColor('green')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition active:scale-95 cursor-pointer ${
                    tableColor === 'green'
                      ? 'bg-emerald-600 text-white border-amber-400 ring-2 ring-amber-400/50 shadow'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#2fa53e] to-[#1e7529] border border-emerald-200 shrink-0" />
                  <span>أخضر كلاسيكي</span>
                </button>
              </div>
            </div>
          )}

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
