import React, { useState } from 'react';
import { YellowDoorIcon } from './YellowDoorIcon';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'SYMBOLS' | 'RULES'>('SYMBOLS');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-2 xs:p-3 sm:p-4 select-none">
      <div className="bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] border-2 border-slate-300 rounded-2xl sm:rounded-3xl w-full max-w-lg p-3 xs:p-4 text-right shadow-[0_20px_60px_rgba(15,23,42,0.45)] max-h-[92dvh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-300/90 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📖</span>
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-slate-800">
                دليل الرموز وقواعد اللعب
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold">
                شرح مبسط وسريع لرموز وقوانين كوت بو ستة أونو
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-white hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-300 flex items-center justify-center text-lg font-bold active:scale-90 cursor-pointer shadow-xs"
          >
            &times;
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-xl mb-3 border border-slate-300/80">
          <button
            type="button"
            onClick={() => setActiveTab('SYMBOLS')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'SYMBOLS'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-300/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎯</span>
            <span>دليل الرموز</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RULES')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'RULES'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-300/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🃏</span>
            <span>قواعد وترتيب الأوراق</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-2 text-[11px] leading-relaxed text-slate-700 flex-1 overflow-y-auto pr-0.5">
          {activeTab === 'SYMBOLS' ? (
            <>
              {/* 1. لوحة النتيجة والأكلات الموحدة */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-black text-slate-800 text-xs">
                    1. لوحة النتيجة والأكلات (أعلى الطاولة)
                  </h4>
                  {/* Mini Live Preview of Unified ScoreBoard */}
                  <div
                    dir="ltr"
                    className="w-36 rounded-lg overflow-hidden border border-slate-600 bg-[#090d16] shrink-0 shadow-xs"
                  >
                    <div className="bg-[#17223b] px-2 py-0.5 grid grid-cols-3 items-center text-[10px] font-black border-b border-black">
                      <span className="text-[#38bdf8] text-left">18</span>
                      <span className="text-white text-center">101</span>
                      <span className="text-[#fb7185] text-right">12</span>
                    </div>
                    <div className="bg-[#252b3b] px-1.5 py-0.5 flex items-center justify-between text-[9px] font-black">
                      <span className="text-[#38bdf8]">3/6</span>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" />
                      </div>
                      <span className="text-[#fb7185]">2/6</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 text-[10.5px] font-medium">
                  • <b>الشريط العلوي:</b> نقاط الفريق الأزرق (يسار)، هدف الفوز (وسط)، نقاط الفريق الأحمر (يمين).
                  <br />• <b>الشريط السفلي:</b> أكلات كل فريق من المطلوب، و9 دوائر للأكلات (الدائرة الخامسة بالوسط بيضاء فاصلة).
                </p>
              </div>

              {/* 2. شارة المشتري ولون الحكم */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-black text-slate-800 text-xs">
                    2. شارة المشتري ولون الحكم (عند صورة اللاعب)
                  </h4>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="min-w-[26px] h-[18px] px-1.5 rounded-full bg-[#ea1d2d] border-2 border-white shadow text-white font-black text-[10px] flex items-center justify-center font-mono">
                      6
                    </span>
                    <span className="min-w-[34px] h-[18px] px-1.5 rounded-full bg-[#0082c8] border-2 border-white shadow text-white font-black text-[8.5px] flex items-center justify-center">
                      ملزوم
                    </span>
                    <span className="min-w-[26px] h-[18px] px-1 rounded-full bg-[#009e49] border-2 border-white shadow text-white font-black text-[10px] flex items-center justify-center">
                      👑
                    </span>
                  </div>
                </div>
                <p className="text-slate-600 text-[10.5px] font-medium">
                  شارة بيضاوية <b>يتحول لونها إلى لون الحكم المختار</b>، وتظهر عند صورة المشتري وبداخلها <b>رقم الشراء (5–8)</b> أو كلمة <b>«ملزوم»</b> أو <b>التاج (👑)</b> للباون.
                </p>
              </div>

              {/* 3. علامة الموزع (D) وفقاعات المزاد */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-black text-slate-800 text-xs">
                    3. رمز الموزع (D) وفقاعات المزاد
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-400 text-amber-300 font-black text-xs flex items-center justify-center shadow-xs">
                      D
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-white text-slate-900 font-black text-[9.5px] border-2 border-slate-900 shadow-xs">
                      طوف
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-white text-blue-700 font-black text-[9.5px] border-2 border-slate-900 shadow-xs">
                      7
                    </span>
                  </div>
                </div>
                <p className="text-slate-600 text-[10.5px] font-medium">
                  • <b>حرف D:</b> يحدد موزع الورق (وآخر من يزايد)، وينتقل التوزيع للفريق الأقل نقاطاً.
                  <br />• <b>الفقاعات:</b> تعرض قرار كل لاعب أثناء المزايدة (طوف، 5–8، باون، ملزوم).
                </p>
              </div>

              {/* 4. رموز أوراق اللعب */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-black text-slate-800 text-xs">
                    4. رموز أوراق اللعب الخاصة
                  </h4>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-slate-900 text-white font-black text-[8.5px] px-1.5 py-0.5 rounded-md">
                      +4 الجيكر
                    </span>
                    <span className="bg-amber-400 text-slate-950 font-black text-[8.5px] px-1.5 py-0.5 rounded-md border border-amber-500">
                      1 الخال
                    </span>
                    <span className="bg-purple-700 text-white font-black text-[8.5px] px-1.5 py-0.5 rounded-md">
                      🌈 الميكر
                    </span>
                  </div>
                </div>
                <p className="text-slate-600 text-[10.5px] font-medium">
                  • <b>+4 (الجيكر):</b> أقوى ورقة مطلقاً. • <b>1 (الخال):</b> أقوى ورقة في لونها. • <b>🌈 (الميكر):</b> ثالث أقوى ورقة بالحكم.
                  <br />• <b>بقية الرموز:</b> <b>+2</b> (الباش) ← <b>⊘</b> (الميم) ← <b>⇄</b> (الغلام) ← <b>0</b> (العشرة) ← <b>9 إلى 2</b>.
                </p>
              </div>

              {/* 5. شريط أهداف المباراة ورموز التحكم */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-black text-slate-800 text-xs">
                    5. شريط النقاط ورموز التحكم
                  </h4>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[9px]">
                      26 / 51 / 101
                    </span>
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#f8fafc] to-[#94a3b8] border border-slate-400 inline-block" />
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2fa53e] to-[#1e7529] border border-emerald-600 inline-block" />
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center">
                      <YellowDoorIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
                <p className="text-slate-600 text-[10.5px] font-medium">
                  • <b>26 / 51 / 101:</b> لاختيار نقاط الفوز بالمباراة من الشاشة الرئيسية.
                  <br />• <b>الدائرة الملونة (⚪/🟢):</b> لتغيير لون الطاولة بين الثلجي والأخضر.
                  <br />• <b>تدوير الشاشة (📱) والصوت (🔊) والخروج (الباب الأصفر):</b> للتحكم الفوري أثناء اللعب.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* ترتيب قوة الأوراق */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs space-y-1">
                <h4 className="font-black text-slate-800 text-xs mb-1">
                  🃏 ترتيب قوة الأوراق (من الأقوى للأضعف):
                </h4>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  1. <b>الجيكر (+4):</b> أقوى ورقة في اللعبة ويأكل أي ورقة.
                </p>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  2. <b>خال الحكم (رقم 1 بلون الحكم):</b> ثاني أقوى ورقة، ولا يأكله الميكر أبداً.
                </p>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  3. <b>الميكر (🌈 الملون):</b> ثالث أقوى ورقة ويُحسب من أوراق الحكم.
                </p>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  4. <b>بقية أوراق الحكم ثم الألوان العادية:</b> الباش (<b>+2</b>) ← الميم (<b>⊘</b>) ← الغلام (<b>⇄</b>) ← العشرة (<b>0</b>) ← الأرقام من <b>9 إلى 2</b>.
                </p>
              </div>

              {/* المزايدة ونظام النقاط */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs space-y-1">
                <h4 className="font-black text-slate-800 text-xs mb-1">
                  🏆 المزايدة وحساب النقاط (26 / 51 / 101):
                </h4>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  • <b>المزاد:</b> يبدأ من <b>5 أكلات</b> حتى <b>8</b>، أو <b>باون (9 أكلات 👑)</b>، وإذا طوّف الجميع يلتزم الموزع بـ <b>«ملزوم»</b> (5 أكلات، وخسارتها 5 نقاط فقط).
                </p>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  • <b>هدف الفوز:</b> يحدد اللاعب هدف المباراة من الشاشة الرئيسية (<b>26</b> أو <b>51</b> أو <b>101</b> نقطة).
                </p>
                <p className="text-slate-700 text-[10.5px] font-medium">
                  • <b>العسم:</b> في مباراة الـ 101، إذا وصل فريق إلى <b>51 نقطة</b> والفريق الآخر <b>صفر</b> يفوز بالمباراة فوراً.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl transition active:scale-95 text-xs sm:text-sm shadow-md cursor-pointer"
        >
          إغلاق 👍
        </button>
      </div>
    </div>
  );
};
