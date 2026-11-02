import React, { useState } from 'react';
import { SeatConfig } from '../types';
import { AVATARS_CATALOG } from '../utils/avatars';

interface EditSeatModalProps {
  seat: SeatConfig;
  isMyCurrentSeat: boolean;
  onSaveSeat: (updated: Partial<SeatConfig>) => void;
  onVacateSeat: () => void;
  onClose: () => void;
}

const DEFAULT_BOT_NAMES = ['أنت', 'عبود (بوت)', 'مشاري (بوت)', 'طارق (بوت)', 'بندر (بوت)', 'سعود (بوت)'];

export const EditSeatModal: React.FC<EditSeatModalProps> = ({
  seat,
  isMyCurrentSeat,
  onSaveSeat,
  onVacateSeat,
  onClose,
}) => {
  const [name, setName] = useState(seat.name || (seat.isVacant ? '' : seat.isHuman ? `لاعب ${seat.id + 1}` : DEFAULT_BOT_NAMES[seat.id] || 'بوت ذكي'));
  const [isHuman, setIsHuman] = useState(seat.isVacant ? true : seat.isHuman);
  const [selectedAvatarId, setSelectedAvatarId] = useState(seat.avatarId || 'kuwaiti_ghutra_white');
  const [customPhoto, setCustomPhoto] = useState<string | null>(seat.customPhoto);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setCustomPhoto(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalName = name.trim() || (isHuman ? `لاعب ${seat.id + 1}` : (DEFAULT_BOT_NAMES[seat.id] || 'بوت ذكي'));
    onSaveSeat({
      name: finalName,
      isHuman,
      avatarId: selectedAvatarId,
      customPhoto,
      isVacant: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl sm:rounded-3xl w-full max-w-sm p-3 xs:p-4 text-right shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
          <h3 className="text-xs sm:text-sm font-black text-amber-400">
            تعديل بيانات المقعد #{seat.id} ({seat.team === 'A' ? 'الفريق الأول 🔵' : 'الفريق الثاني 🔴'})
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2.5 mb-3">
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">
              نوع وشاغل المقعد:
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsHuman(true);
                  if (name.includes('بوت')) setName('');
                }}
                className={`py-1 px-2 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                  isHuman ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                حجز للاعب حقيقي 👤
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHuman(false);
                  setName(DEFAULT_BOT_NAMES[seat.id] || 'بوت ذكي');
                }}
                className={`py-1 px-2 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                  !isHuman ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                تحويل إلى بوت 🤖
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">
              {isHuman ? 'اسم اللاعب (لحجز المقعد):' : 'اسم البوت:'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 px-2.5 py-1.5 rounded-xl text-white text-xs font-bold outline-none"
              placeholder={isHuman ? 'اكتب اسم اللاعب لحجز المقعد' : 'اسم البوت الذكي'}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 font-bold">الشخصية أو الصورة:</span>
            <label className="cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-400/40 transition flex items-center gap-1">
              <span>📷 رفع صورة</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-6 gap-1 pt-1">
            {AVATARS_CATALOG.map((av) => {
              const isSelected = selectedAvatarId === av.id && !customPhoto;
              return (
                <div
                  key={av.id}
                  onClick={() => {
                    setSelectedAvatarId(av.id);
                    setCustomPhoto(null);
                  }}
                  className={`cursor-pointer w-8 h-8 rounded-full overflow-hidden border-2 transition active:scale-90 ${
                    isSelected ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-700'
                  }`}
                >
                  {av.render()}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSave}
            className="py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow active:scale-95 transition cursor-pointer"
          >
            {seat.isVacant ? 'حجز وحفظ المقعد ✅' : 'حفظ المقعد ✅'}
          </button>
          {!isMyCurrentSeat && (
            <button
              onClick={onVacateSeat}
              className="py-2 bg-rose-900/40 hover:bg-rose-800 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              إفراغ المقعد
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
