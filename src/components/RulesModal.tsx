import React, { useState } from 'react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'ICONS' | 'RULES'>('ICONS');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl w-full max-w-lg p-3 xs:p-4 text-right shadow-2xl max-h-[94dvh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📖</span>
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-amber-400">
                تعليمات ودليل كوت بو ستة أونو 🇰🇼
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                شرح الأيقونات والقواعد بالتفصيل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl mb-3 border border-slate-800">
          <button
            onClick={() => setActiveTab('ICONS')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ICONS'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🎯</span>
            <span>دليل الأيقونات والرموز</span>
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'RULES'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🃏</span>
            <span>قواعد وترتيب الأوراق</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-2.5 text-[11px] leading-relaxed text-slate-300 flex-1 overflow-y-auto pr-0.5">
          {activeTab === 'ICONS' ? (
            <>
              {/* 1. علامة الموزع */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-slate-950 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 flex-shrink-0">
                    <span className="font-extrabold text-xs">D</span>
                    <span className="text-[10px] -mr-0.5">🃏</span>
                  </div>
                  <div>
                    <h4 className="font-black text-amber-300 text-xs sm:text-sm">
                      علامة الموزع (Dealer Badge)
                    </h4>
                    <span className="text-[9.5px] text-amber-400/80 font-bold">
                      أول واحد يوزع الورق وآخر من يزايد
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> تظهر هذه العلامة الذهبية البارزة عند صورة اللاعب الذي وزّع الأوراق في هذه الجولة. يبدأ المزاد دائماً من اللاعب الذي يليه مباشرة (عكس عقارب الساعة)، ويكون الموزع هو آخر من يزايد.
                </p>
                <p className="text-amber-200 text-[10.5px] mt-1 bg-amber-950/40 p-1.5 rounded-lg border border-amber-500/30 font-bold">
                  ⚡ <b>قاعدة الموزع الملزوم:</b> إذا طوّف جميع اللاعبين الستة (Pass)، يصبح الموزع ملزوماً تلقائياً بالشراء بـ 5 وتحديد لون الحكم دون خيار الطوف.
                </p>
              </div>

              {/* 2. عداد الأكلات */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-blue-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  {/* Real visual representation of the tricks counter */}
                  <div className="flex items-center bg-[#0d1017] border border-slate-700 rounded-xl p-1 gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-blue-950 border border-blue-500/50 rounded-lg px-1.5 py-0.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      <div className="bg-[#f8fafc] text-[#0063B0] font-black font-mono text-xs px-1 rounded">
                        4
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-amber-300 px-0.5">الأكلات</span>
                    <div className="flex items-center gap-1 bg-red-950 border border-red-500/50 rounded-lg px-1.5 py-0.5">
                      <div className="bg-[#f8fafc] text-[#EA1D2D] font-black font-mono text-xs px-1 rounded">
                        2
                      </div>
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-sky-300 text-xs sm:text-sm">
                      عداد الأكلات (Tricks Counter)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      أرقام واضحة بخلفية بيضاء ثلجية
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> يعرض عدد الأكلات (Tricks) المكتسبة حالياً لكل من الفريق الأزرق (🔵) والفريق الأحمر (🔴) خلال الجولة الحالية من أصل 9 أكلات. يقتصر على عدد الأكلات المكتسبة فقط دون تشتيت، بلون أبيض ثلجي ولون الفريق لمتابعة سير الجولة بدقة.
                </p>
              </div>

              {/* 3. أيقونة لون الحكم */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1 bg-[#121622] border-2 border-amber-400/90 px-2 py-1 rounded-xl shadow-md flex-shrink-0">
                    <span className="text-[9px] font-black text-amber-300">الحكم:</span>
                    <span className="px-2 py-0.5 rounded font-black text-[10px] bg-[#EA1D2D] text-white shadow">
                      أحمر
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-300 text-xs sm:text-sm">
                      أيقونة لون الحكم (Trump Suit)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      لون الكروت الأقوى في الجولة
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> توضح لون كروت الحكم (أحمر، أزرق، أخضر، أو أصفر) التي اختارها المشتري لهذه الجولة. أوراق هذا اللون تمتلك أفضلية مطلقة على باقي الألوان العادية، ويحق للاعب "القص بالحكم" (التشريق) لربح الأكلة إذا لم يمتلك لون الافتتاح (الليد).
                </p>
              </div>

              {/* 4. أيقونة إجمالي النتيجة */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-purple-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center bg-[#0d1017] border border-slate-700 rounded-xl px-2 py-0.5 gap-1.5 flex-shrink-0 font-mono font-black text-xs">
                    <span className="text-blue-400">18</span>
                    <div className="text-[8px] text-amber-300 border-x border-slate-700 px-1 font-sans">
                      الهدف 101
                    </div>
                    <span className="text-red-400">12</span>
                  </div>
                  <div>
                    <h4 className="font-black text-purple-300 text-xs sm:text-sm">
                      أيقونة إجمالي النتيجة (Match Score)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      مجموع نقاط المباراة وهدف الفوز
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> تعرض إجمالي النقاط التراكمية للمباراة للفريقين (🔵 و 🔴). هدف الفوز الافتراضي هو <b>101 نقطة</b> إذا حاز كلا الفريقين على 5 نقاط فأكثر، أو <b>51 نقطة (العسم)</b> إذا فاز فريق دون أن يحقق الفريق الآخر 5 نقاط.
                </p>
              </div>

              {/* 5. علامة الأكلات عند صورة الحاكم */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-white border-[2.5px] border-[#0063B0] ring-1 ring-blue-500/50 shadow-md flex items-center justify-center text-black font-black text-xs font-mono">
                      7
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white border-[2.5px] border-[#EA1D2D] ring-1 ring-red-500/50 shadow-md flex items-center justify-center text-black font-black text-xs font-mono">
                      👑
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-rose-300 text-xs sm:text-sm">
                      علامة الأكلات عند صورة الحاكم
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      دائرة بيضاء ثلجية برقم أسود محاطة بدائرة بلون الفريق
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> علامة دائرية باللون الأبيض الثلجي ورقم الأكلة باللون الأسود الواضح بحجم يتناسب مع جميع مقاسات الشاشات، محاطة بدائرة بلون الفريق (أزرق للفريق الأزرق 🔵 أو أحمر للفريق الأحمر 🔴)، تظهر عند صورة الحاكم لتحديد عدد الأكلات المطلوبة لتحقيق العقد.
                </p>
              </div>

              {/* 6. أيقونة الخروج: باب أصفر مفتوح */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-400/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/80 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 21V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17" />
                      <path d="M15 4l5 2.5v12.5l-5 2V4z" fill="#facc15" fillOpacity="0.85" stroke="#eab308" />
                      <circle cx="17.5" cy="12.5" r="1" fill="#78350f" stroke="none" />
                      <path d="M2 12h7m-4-3.5L2 12l3 3.5" stroke="#fde047" strokeWidth="2.4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-black text-yellow-300 text-xs sm:text-sm">
                      أيقونة الخروج (باب أصفر مفتوح)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      دلالة واضحة للخروج
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> أيقونة الباب الأصفر المفتوح الموجودة في أعلى شريط اللعبة تدل بوضوح على الخروج لمغادرة الطاولة والعودة إلى القائمة الرئيسية للعبة.
                </p>
              </div>

              {/* 7. حلقة توقيت اللاعب */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-yellow-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-full border-2 border-yellow-400 relative flex items-center justify-center flex-shrink-0 animate-pulse">
                    <span className="text-xs">⏱️</span>
                  </div>
                  <div>
                    <h4 className="font-black text-yellow-300 text-xs sm:text-sm">
                      حلقة توقيت اللاعب (Turn Timer Ring)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      تظهر حول صورة اللاعب صاحب الدور فقط
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> حلقة إضاءة نيونية تدور حصراً حول صورة اللاعب الذي عليه الدور (وليس على الطاولة)، لتنبيهه بالوقت المتبقي لرمي الكرت. في الطاولات الخاصة التي يكتمل فيها 6 لاعبين حقيقيين، يتوقف المؤقت تماماً للعب بأريحية.
                </p>
              </div>

              {/* 8. شارة البوت والدخول مكان البوت */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-cyan-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center flex-shrink-0 text-base">
                    🤖
                  </div>
                  <div>
                    <h4 className="font-black text-cyan-300 text-xs sm:text-sm">
                      شارة البوت والدخول المباشر (Bot Takeover)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      تبديل فوري في أي جولة جارية
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> تدل على المقعد الذي يديره الكمبيوتر (بوت ذكي). تتيح اللعبة لأي لاعب حقيقي ينضم عبر رمز الـ 4 أرقام النقر على مقعد البوت ليدخل مكانه فوراً ويستلم يده وكروته ودوره ويواصل اللعب مع فريقه مباشرة.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* ترتيب قوة الأوراق */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30">
                <h4 className="font-black text-amber-300 text-xs mb-1">🃏 ترتيب قوة الأوراق:</h4>
                <p>1. <b>الجيكر (+4):</b> أقوى كرت مطلقاً ويأكل أي ورقة على الإطلاق.</p>
                <p>2. <b>خال الحكم (1 الحكم):</b> ثاني أقوى ورقة ولا ينكسر بالميكر أبداً! ينكسر فقط بالجيكر.</p>
                <p>3. <b>الميكر (Rainbow 🌈):</b> ثالث أقوى ورقة، يكسر باقي كروت الحكم.</p>
                <p>4. <b>كروت الحكم العادية:</b> الباش (+2)، الميم (⊘)، الغلام (⇄)، 10 (العشرة 0)، ثم 9 إلى 2.</p>
                <p>5. <b>أوراق الليد العادية:</b> نفس الترتيب التنازلي للأرقام.</p>
              </div>

              {/* شروط الافتتاح واتجاه اللعب */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-sky-500/30">
                <h4 className="font-black text-sky-300 text-xs mb-1">⚡ شروط الافتتاح واتجاه اللعب:</h4>
                <p>• <b>اتجاه اللعب بالترتيب:</b> يتم اللعب والمزايدة دائماً <b>عكس عقارب الساعة (لليمين ↺)</b> بالتسلسل من لاعب إلى اللاعب الذي يليه على يمينه.</p>
                <p>• <b>ممنوع الافتتاح بالجيكر أو الميكر</b> إذا كان لديك أي كرت عادي من الألوان الأربعة في يدك.</p>
                <p>• <b>ممنوع رمي الميكر على الجيكر</b> إذا كان لديك بديل في يدك.</p>
                <p>• <b>إلزامية اتباع اللون (Following suit):</b> إذا افتُتحت الأكلة بلون، يجب رمي نفس اللون إن وُجد في يدك، وإلا يحق لك التشريق (القص بالحكم) أو التخلص.</p>
              </div>

              {/* المزايدة وحساب النقاط والعسم */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-yellow-400/40 text-[11px]">
                <h4 className="font-black text-yellow-400 text-xs mb-0.5">🏆 المزايدة وحساب نقاط الفوز والعسم:</h4>
                <p>• يبدأ المزاد بـ <b>5 أكلات</b> وحتى 8، أو <b>الباون (9 أكلات 👑)</b>.</p>
                <p>• <b>الهدف 101 نقطة:</b> في حال حاز الفريقين على 5 نقاط أو أكثر، يصبح مجموع نقاط الفوز بالمباراة <b>101 نقطة</b>.</p>
                <p>• <b>العسم (51 نقطة):</b> في حال لم يكسب أحد الفريقين 5 نقاط أو أكثر، يصبح الفوز بـ <b>51 نقطة</b> للفريق الآخر ويسمى عسم.</p>
                <p>• <b>فوز 51 مقابل 0:</b> يظهر للفريق الفائز <b>"كفو عطيتهم عسم"</b>، وللفريق الخاسر <b>"عطاكم عسم"</b> في لوحة النتيجة.</p>
              </div>
            </>
          )}
        </div>

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl transition active:scale-95 text-xs sm:text-sm shadow-lg cursor-pointer"
        >
          فهمت التعليمات 👍
        </button>
      </div>
    </div>
  );
};
