import React from 'react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl w-full max-w-md p-3 xs:p-4 text-right shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">📖</span>
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              قواعد كوت بو ستة أونو 🇰🇼
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30">
            <h4 className="font-black text-amber-300 text-xs mb-1">🃏 ترتيب قوة الأوراق:</h4>
            <p>1. <b>الجيكر (+4):</b> أقوى كرت مطلقاً ويأكل أي ورقة على الإطلاق.</p>
            <p>2. <b>خال الحكم (1 الحكم):</b> ثاني أقوى ورقة ولا ينكسر بالميكر أبداً! ينكسر فقط بالجيكر.</p>
            <p>3. <b>الميكر (Rainbow 🌈):</b> ثالث أقوى ورقة، يكسر باقي كروت الحكم.</p>
            <p>4. <b>كروت الحكم العادية:</b> الباش (+2)، الميم (⊘)، الغلام (⇄)، 10 (العشرة 0)، ثم 9 إلى 2.</p>
            <p>5. <b>أوراق الليد العادية:</b> نفس الترتيب التنازلي للأرقام.</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-sky-500/30">
            <h4 className="font-black text-sky-300 text-xs mb-1">⚡ شروط الافتتاح واتجاه اللعب:</h4>
            <p>• <b>اتجاه اللعب بالترتيب:</b> يتم اللعب والمزايدة دائماً <b>عكس عقارب الساعة (لليمين ↺)</b> بالتسلسل من لاعب إلى اللاعب الذي يليه على يمينه.</p>
            <p>• <b>ممنوع الافتتاح بالجيكر أو الميكر</b> إذا كان لديك أي كرت عادي من الألوان الأربعة في يدك.</p>
            <p>• <b>ممنوع رمي الميكر على الجيكر</b> إذا كان لديك بديل في يدك.</p>
            <p>• <b>إلزامية اتباع اللون (Following suit):</b> إذا افتُتحت الأكلة بلون، يجب رمي نفس اللون إن وُجد في يدك، وإلا يحق لك التشريق (القص بالحكم) أو التخلص.</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-yellow-400/40 text-[11px]">
            <h4 className="font-black text-yellow-400 text-xs mb-0.5">🏆 المزايدة وحساب نقاط الفوز والعسم:</h4>
            <p>• يبدأ المزاد بـ <b>5 أكلات</b> وحتى 8، أو <b>الباون (9 أكلات)</b>.</p>
            <p>• <b>الهدف 101 نقطة:</b> في حال حاز الفريقين على 5 نقاط أو أكثر، يصبح مجموع نقاط الفوز بالمباراة <b>101 نقطة</b>.</p>
            <p>• <b>العسم (51 نقطة):</b> في حال لم يكسب أحد الفريقين 5 نقاط أو أكثر، يصبح الفوز بـ <b>51 نقطة</b> للفريق الآخر ويسمى عسم.</p>
            <p>• <b>فوز 51 مقابل 0:</b> يظهر للفريق الفائز <b>"كفو عطيتهم عسم"</b>، وللفريق الخاسر <b>"عطاكم عسم"</b> في مربع النتيجة.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-xl transition active:scale-95 text-xs shadow-lg cursor-pointer"
        >
          فهمت القواعد 👍
        </button>
      </div>
    </div>
  );
};
