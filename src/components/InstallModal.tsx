import React, { useState } from 'react';

interface InstallModalProps {
  onClose: () => void;
  isInstallable?: boolean;
  onNativeInstall?: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  onClose,
  isInstallable = false,
  onNativeInstall,
}) => {
  const [activeOs, setActiveOs] = useState<'android' | 'ios' | 'windows' | 'mac' | 'tablet'>('android');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl sm:rounded-3xl w-full max-w-md p-3 xs:p-4 sm:p-5 text-right shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">📥</span>
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              تثبيت اللعبة على جهازك
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Direct Native Install Quick Banner if supported */}
        {isInstallable && onNativeInstall && (
          <div className="mb-2.5 p-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/60 rounded-xl flex items-center justify-between gap-2 shadow-lg">
            <div className="flex flex-col text-right">
              <span className="text-xs font-black text-emerald-400">تثبيت فوري مدعوم ⚡</span>
              <span className="text-[10px] text-slate-300">متصفحك يدعم التثبيت المباشر بضغطة زر</span>
            </div>
            <button
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow cursor-pointer whitespace-nowrap"
            >
              تثبيت الآن 📲
            </button>
          </div>
        )}

        {/* OS Switcher Tabs */}
        <div className="flex items-center justify-between bg-slate-950 p-1 rounded-xl mb-2.5 text-[10px] font-bold overflow-x-auto gap-1">
          <button
            onClick={() => setActiveOs('android')}
            className={`flex-1 py-1 px-1.5 rounded-lg text-center transition whitespace-nowrap cursor-pointer ${
              activeOs === 'android' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Android 🤖
          </button>
          <button
            onClick={() => setActiveOs('ios')}
            className={`flex-1 py-1 px-1.5 rounded-lg text-center transition whitespace-nowrap cursor-pointer ${
              activeOs === 'ios' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone / iPad 🍏
          </button>
          <button
            onClick={() => setActiveOs('windows')}
            className={`flex-1 py-1 px-1.5 rounded-lg text-center transition whitespace-nowrap cursor-pointer ${
              activeOs === 'windows' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            ويندوز 💻
          </button>
          <button
            onClick={() => setActiveOs('mac')}
            className={`flex-1 py-1 px-1.5 rounded-lg text-center transition whitespace-nowrap cursor-pointer ${
              activeOs === 'mac' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            ماك 🖥️
          </button>
          <button
            onClick={() => setActiveOs('tablet')}
            className={`flex-1 py-1 px-1.5 rounded-lg text-center transition whitespace-nowrap cursor-pointer ${
              activeOs === 'tablet' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            تابلت 📟
          </button>
        </div>

        {/* Android Panel */}
        {activeOs === 'android' && (
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="font-bold text-amber-300 text-xs">خطوات أندرويد (Chrome / سامسونج):</p>
            <ol className="list-decimal list-inside space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed text-[11px]">
              <li>افتح اللعبة في متصفح Chrome أو متصفح الجهاز.</li>
              <li>اضغط على زر القائمة (الثلاث نقاط ⋮) في أعلى الزاوية.</li>
              <li>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.</li>
              <li>ستعمل اللعبة مباشرة كتطبيق مستقل على هاتفك بأعلى سرعة وسلاسة.</li>
            </ol>
          </div>
        )}

        {/* iOS Panel */}
        {activeOs === 'ios' && (
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="font-bold text-amber-300 text-xs">خطوات الآيفون والآيباد (Safari):</p>
            <ol className="list-decimal list-inside space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed text-[11px]">
              <li>افتح الرابط في متصفح <b>Safari</b>.</li>
              <li>اضغط زر المشاركة بالأسفل (أيقونة المربع بسهم لأعلى ⬆️).</li>
              <li>اسحب واختر <b>«إضافة إلى الصفحة الرئيسية (Add to Home Screen)»</b>.</li>
              <li>اضغط <b>«إضافة»</b>، وستعمل اللعبة بملء الشاشة بدون شريط سفلي تماماً كالتطبيقات الرسمية.</li>
            </ol>
          </div>
        )}

        {/* Windows Panel */}
        {activeOs === 'windows' && (
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="font-bold text-amber-300 text-xs">خطوات ويندوز (Edge / Chrome):</p>
            <ol className="list-decimal list-inside space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed text-[11px]">
              <li>في متصفح Chrome أو Edge، اضغط أيقونة التثبيت في شريط العنوان أعلى الشاشة.</li>
              <li>أو من القائمة (⋮) اختر تطبيقات (Apps) ثم تثبيت هذا الموقع كتطبيق نافذة.</li>
            </ol>
          </div>
        )}

        {/* Mac Panel */}
        {activeOs === 'mac' && (
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="font-bold text-amber-300 text-xs">خطوات ماك (macOS):</p>
            <ol className="list-decimal list-inside space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed text-[11px]">
              <li>في Safari: من شريط القوائم العلوي اضغط ملف (File) ثم اختر إضافة إلى الـ Dock.</li>
              <li>أو في Chrome: من القائمة (⋮) ثم حفظ ومشاركة ثم تثبيت كوت بو ستة.</li>
            </ol>
          </div>
        )}

        {/* Tablet Panel */}
        {activeOs === 'tablet' && (
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="font-bold text-amber-300 text-xs">للأجهزة اللوحية (Tablets & iPads):</p>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed text-[11px]">
              <p>• يُفضل تدوير الجهاز إلى <b>الوضع العرضي (Landscape)</b> واستخدام زر <b>«⛶ ملء الشاشة»</b> للحصول على طاولة لعب واسعة وواضحة جداً.</p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-xl transition active:scale-95 text-xs shadow-lg cursor-pointer"
        >
          حسناً، فهمت الطريقة 👍
        </button>
      </div>
    </div>
  );
};
