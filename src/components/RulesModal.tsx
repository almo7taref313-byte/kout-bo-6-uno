import React, { useState } from 'react';
import { YellowDoorIcon } from './YellowDoorIcon';

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
              {/* 1. شريط اختيار نقاط الفوز (26، 51، 101) وزر العب */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1 flex-shrink-0" dir="ltr">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-white font-mono font-black text-[10px] border border-slate-700">26</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-white font-mono font-black text-[10px] border border-slate-700">51</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[10px] border border-amber-300">101</span>
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-300 text-xs sm:text-sm">
                      شريط اختيار نقاط الفوز (26، 51، 101) وزر العب
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      فوق زر العب في الشاشة الرئيسية
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> شريط يضم 3 مربعات (<b>26</b>، <b>51</b>، <b>101</b>) فوق زر <b>«العب»</b> في الشاشة الرئيسية. يمكنك النقر على أي مربع منها لتحديد مجموع النقاط المطلوب للفوز بالمباراة وستفتح لك طاولة اللعب مباشرة بالهدف المختار.
                </p>
              </div>

              {/* 2. أيقونة الملف الشخصي وأيقونة الإعدادات (الترس) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-sm shadow">
                      👤
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-base text-amber-400 shadow">
                      ⚙️
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-amber-300 text-xs sm:text-sm">
                      أيقونة الملف الشخصي (👤) وأيقونة الإعدادات (⚙️)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      في الشريط العلوي للشاشة الرئيسية
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> أيقونة <b>الملف الشخصي</b> تتيح لك تغيير اسمك واختيار الشخصية الكويتية أو رفع صورتك الخاصة من جهازك. أما أيقونة <b>الترس (⚙️)</b> فتفتح قائمة الإعدادات للتحكم بالصوت، دليل القواعد والأيقونات، ووضع الشاشة والتدوير.
                </p>
              </div>

              {/* 3. علامة الموزع (D) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700 relative flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-amber-300 font-black text-lg leading-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,1)] filter drop-shadow-[0_0_2px_#000]">
                      D
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-amber-300 text-xs sm:text-sm">
                      علامة الموزع (Dealer Badge - D)
                    </h4>
                    <span className="text-[9.5px] text-amber-400/80 font-bold">
                      موزع الورق وآخر من يزايد
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> تظهر هذه العلامة الذهبية البارزة عند صورة اللاعب الذي وزّع الأوراق في هذه الجولة. يبدأ المزاد دائماً من اللاعب الذي يليه مباشرة (عكس عقارب الساعة)، ويكون الموزع هو آخر من يزايد.
                </p>
                <p className="text-sky-200 text-[10.5px] mt-1 bg-sky-950/40 p-1.5 rounded-lg border border-sky-500/30 font-medium">
                  🔄 <b>نظام التوزيع بالسكور:</b> في أول جولة يكون التوزيع عشوائياً، أما في الجولات التالية فيكون التوزيع دائماً على <b>الفريق الخاسر في السكور</b> (الذي مجموع نقاطه أقل من الفريق الآخر)، وبالتناوب الدوري بين لاعبي ذلك الفريق.
                </p>
                <p className="text-amber-200 text-[10.5px] mt-1 bg-amber-950/40 p-1.5 rounded-lg border border-amber-500/30 font-bold">
                  ⚡ <b>قاعدة الموزع الملزوم:</b> إذا طوّف اللاعبون قبله، يمكن للموزع اختيار «ملزوم» بـ 5 أكلات (خسارتها 5 نقاط فقط بدلاً من 10).
                </p>
              </div>

              {/* 4. عداد الأكلات */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-blue-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center bg-[#0d1017] border border-slate-700 rounded-xl p-1 gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-[#161b26] border border-slate-600/60 rounded-lg px-2 py-0.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      <span className="text-white font-black font-mono text-xs">4</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#161b26] border border-slate-600/60 rounded-lg px-2 py-0.5">
                      <span className="text-white font-black font-mono text-xs">2</span>
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-sky-300 text-xs sm:text-sm">
                      عداد الأكلات (Tricks Counter)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      أعلى يمين شريط الطاولة
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> يعرض عدد الأكلات المكتسبة حالياً لكل من الفريق الأزرق (🔵) والفريق الأحمر (🔴) خلال الجولة الحالية من أصل 9 أكلات، ويتحدث فور فوز أي لاعب بالأكلة.
                </p>
              </div>

              {/* 5. أيقونة إجمالي النتيجة والهدف */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-purple-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center bg-[#0d1017] border border-slate-700 rounded-xl px-2 py-0.5 gap-1.5 flex-shrink-0 font-mono font-black text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    <span className="text-white">18</span>
                    <div className="text-[8px] text-amber-300 border-x border-slate-700 px-1 font-sans">
                      الهدف 101
                    </div>
                    <span className="text-white">12</span>
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  </div>
                  <div>
                    <h4 className="font-black text-purple-300 text-xs sm:text-sm">
                      أيقونة إجمالي النتيجة والهدف (Match Score)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      أعلى منتصف شريط الطاولة
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> تعرض إجمالي النقاط التراكمية للمباراة للفريق الأزرق (🔵) والفريق الأحمر (🔴)، وفي المنتصف يظهر <b>الهدف</b> الذي اخترته من الشاشة الرئيسية (<b>26</b> أو <b>51</b> أو <b>101</b>).
                </p>
              </div>

              {/* 6. أيقونة لون الحكم */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1 bg-[#EA1D2D] border border-white/40 px-2 py-0.5 rounded-xl shadow-md flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-white inline-block" />
                    <span className="font-black text-[10px] text-white">أحمر</span>
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-300 text-xs sm:text-sm">
                      أيقونة لون الحكم (Trump Suit Badge)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      لون الكروت الأقوى في الجولة
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> توضح لون كروت الحكم (أحمر، أزرق، أخضر، أو أصفر) الذي اختاره المشتري لهذه الجولة. أوراق هذا اللون تمتلك أفضلية مطلقة على باقي الألوان العادية عند القص (التشريق).
                </p>
              </div>

              {/* 7. علامة المشتري وعدد الأكلات والملزوم والباون */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-[#0063B0] shadow flex items-center justify-center text-black font-black text-[11px] font-mono">
                      7
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-[#EA1D2D] shadow flex items-center justify-center text-black font-black text-[11px]">
                      👑
                    </div>
                    <div className="px-1.5 py-0.5 rounded-full bg-white border-2 border-[#0063B0] shadow flex items-center justify-center text-black font-black text-[8px]">
                      ملزوم ⚡
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-rose-300 text-xs sm:text-sm">
                      علامة المشتري (5-8 / الباون 👑 / ملزوم ⚡)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      تظهر عند صورة اللاعب الحاكم
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> شارة بيضاء بإطار بلون الفريق تظهر بجانب صورة اللاعب الذي رسا عليه المزاد لتوضح عقده: رقم من <b>5 إلى 8</b>، أو <b>التاج (👑)</b> في حال إعلان الباون (9 أكلات)، أو <b>ملزوم ⚡</b> إذا التزم الموزع بـ 5 أكلات.
                </p>
              </div>

              {/* 8. فقاعات المزاد التفاعلية */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-indigo-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-white text-slate-900 font-black text-[10px] border-2 border-slate-950 shadow">
                      طوف
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-white text-blue-700 font-black text-[10px] border-2 border-slate-950 shadow">
                      6
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-indigo-300 text-xs sm:text-sm">
                      فقاعات المزاد (Bidding Bubbles)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      تظهر بجانب كل لاعب أثناء المزايدة
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> فقاعات كرتونية تظهر بجانب صورة كل لاعب خلال مرحلة المزايدة لتبين قراره الفوري (<b>طوف</b> أو رقم المزايدة من <b>5 إلى 8</b> أو <b>باون 👑</b>).
                </p>
              </div>

              {/* 9. شارات ورموز الأوراق الخاصة */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-400/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex flex-wrap items-center gap-1 flex-shrink-0">
                    <span className="bg-slate-950 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full border border-white">الجيكر</span>
                    <span className="bg-amber-400 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded-full border border-white">خال</span>
                    <span className="bg-purple-900 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full border border-purple-300">🌈 الميكر</span>
                  </div>
                  <div>
                    <h4 className="font-black text-amber-300 text-xs sm:text-sm">
                      شارات ورموز أوراق اللعب
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      دلالات الأوراق على الطاولة وفي اليد
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b>
                  <br />• <b>شارة «الجيكر» (+4):</b> أقوى ورقة في اللعبة على الإطلاق.
                  <br />• <b>شارة «خال» (رقم 1 بلون الحكم):</b> ثاني أقوى ورقة ولا يأكلها الميكر أبداً.
                  <br />• <b>كرت الميكر (🌈 الجوكر الملون):</b> ثالث أقوى ورقة في اللعبة ويعتبر من الحكم.
                  <br />• <b>الرموز الخاصة في كل لون:</b> رقم <b>1 (الخال)</b> يليه <b>+2 (الباش)</b> ثم <b>⊘ (الميم)</b> ثم <b>⇄ (الغلام)</b> ثم <b>0 (العشرة)</b> ثم الأرقام من <b>9 إلى 2</b>.
                </p>
              </div>

              {/* 10. حلقة توقيت اللاعب (20 ثانية) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-yellow-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 relative flex items-center justify-center flex-shrink-0 animate-pulse">
                    <span className="text-[10px] font-mono font-black text-cyan-300">20s</span>
                  </div>
                  <div>
                    <h4 className="font-black text-yellow-300 text-xs sm:text-sm">
                      حلقة توقيت اللاعب (20 ثانية فقط)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      تظهر حول صورة اللاعب صاحب الدور فقط
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> حلقة إضاءة نيونية تدور حول صورة اللاعب الذي عليه الدور لمدة <b>20 ثانية فقط</b> (وتتحول للأحمر في آخر 4 ثوانٍ). عند انتهاء الوقت يلعب النظام تلقائياً ورقة نظامية لحماية أوراقك. وفي الطاولات الخاصة المكتملة بـ 6 لاعبين حقيقيين يتوقف المؤقت تماماً.
                </p>
              </div>

              {/* 11. أيقونة الصوت وأيقونة الخروج (الباب الأصفر) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-400/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-[#2b303c] border border-slate-700 flex items-center justify-center text-xs">
                      🔊
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/80 flex items-center justify-center">
                      <YellowDoorIcon className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-yellow-300 text-xs sm:text-sm">
                      أيقونة الصوت (🔊/🔇) وأيقونة الخروج (باب أصفر)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      أعلى يسار شريط الطاولة وفي الشاشة الرئيسية
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b> أيقونة <b>السماعة (🔊 / 🔇)</b> تتيح تشغيل أو كتم جميع الأصوات التفاعلية فوراً أثناء اللعب. أما أيقونة <b>الباب الأصفر المفتوح</b> فتدل على الخروج لمغادرة الطاولة والعودة إلى الشاشة الرئيسية.
                </p>
              </div>

              {/* 12. أيقونات الطاولة الخاصة ورمز الغرفة والبوت وتثبيت اللعبة ووضع الشاشة */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-cyan-500/40 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-400 flex items-center justify-center text-sm">🤖</span>
                    <span className="w-7 h-7 rounded-lg bg-slate-800 border border-amber-500/40 flex items-center justify-center text-sm">📥</span>
                    <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-sm">📱</span>
                  </div>
                  <div>
                    <h4 className="font-black text-cyan-300 text-xs sm:text-sm">
                      أيقونة البوت (🤖) والتثبيت (📥) ووضع الشاشة (📱)
                    </h4>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      إدارة المقاعد، تحميل التطبيق، وتدوير الشاشة
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-[10.5px]">
                  <b>التعريف:</b>
                  <br />• <b>أيقونة البوت (🤖):</b> ترمز لمقعد الكمبيوتر الذكي، ويمكن للاعبين المنضمين عبر رمز الـ 4 أرقام الحلول مكانه.
                  <br />• <b>أيقونة التثبيت (📥):</b> لتثبيت وتحميل اللعبة كتطبيق مستقل على هاتفك أو جهازك.
                  <br />• <b>أيقونة الشاشة (📱):</b> للتبديل بين الوضع التلقائي، الوضع الأفقي (Landscape)، أو ملء الشاشة الكامل.
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
                <p>3. <b>الميكر (Rainbow 🌈):</b> ثالث أقوى ورقة، يكسر باقي كروت الحكم ولا يأكل خال الحكم أبداً.</p>
                <p>4. <b>كروت الحكم العادية:</b> الباش (+2)، الميم (⊘)، الغلام (⇄)، 10 (العشرة 0)، ثم 9 إلى 2.</p>
                <p>5. <b>أوراق الليد العادية:</b> نفس الترتيب التنازلي للأرقام.</p>
              </div>

              {/* شروط الافتتاح واتجاه اللعب */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-sky-500/30">
                <h4 className="font-black text-sky-300 text-xs mb-1">⚡ شروط الافتتاح واتجاه اللعب:</h4>
                <p>• <b>اتجاه اللعب بالترتيب:</b> يتم اللعب والمزايدة دائماً <b>عكس عقارب الساعة (لليمين ↺)</b> بالتسلسل من لاعب إلى اللاعب الذي يليه على يمينه.</p>
                <p>• <b>عداد الوقت:</b> مدة التفكير لكل دور هي <b>20 ثانية فقط</b>.</p>
                <p>• <b>حرية الجيكر والميكر:</b> الجيكر والميكر متاحان دائماً للرمي، علماً أن الميكر لا يأكل خال الحكم أبداً، وفي اللعب غير الباون إذا بُدئت الأكلة بالجيكر أو الميكر فإنها تخيس («خاس يالردي»).</p>
                <p>• <b>إلزامية اتباع اللون (Following suit):</b> إذا افتُتحت الأكلة بلون، يجب رمي نفس اللون إن وُجد في يدك، وإلا يحق لك التشريق (القص بالحكم) أو التخلص.</p>
              </div>

              {/* المزايدة وحساب النقاط والعسم */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-yellow-400/40 text-[11px]">
                <h4 className="font-black text-yellow-400 text-xs mb-0.5">🏆 المزايدة ونظام نقاط الفوز (26 / 51 / 101):</h4>
                <p>• يبدأ المزاد بـ <b>5 أكلات</b> وحتى 8، أو <b>الباون (9 أكلات 👑)</b>.</p>
                <p>• <b>اختيار هدف المباراة:</b> من الشاشة الرئيسية فوق زر العب، يمكنك اختيار اللعب من <b>26 نقطة</b> أو <b>51 نقطة</b> أو <b>101 نقطة</b> وتفتح طاولة اللعب مباشرة.</p>
                <p>• <b>العسم (51 نقطة):</b> في مباريات الـ 101، إذا وصل أحد الفريقين إلى 51 نقطة والفريق الآخر صفر يفوز بالعسم.</p>
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
