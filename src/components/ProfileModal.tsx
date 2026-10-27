import React, { useState } from 'react';
import { AVATARS_CATALOG } from '../utils/avatars';

interface ProfileModalProps {
  currentName: string;
  currentAvatarId: string;
  onSaveName: (name: string) => void;
  onSelectAvatar: (avatarId: string) => void;
  onUploadCustomPhoto: (dataUrl: string) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentName,
  currentAvatarId,
  onSaveName,
  onSelectAvatar,
  onUploadCustomPhoto,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(currentName);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        onUploadCustomPhoto(evt.target.result);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (nameInput.trim()) {
      onSaveName(nameInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl w-full max-w-lg p-3 xs:p-4 sm:p-5 text-right shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">👤</span>
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              الملف الشخصي واختيار الشخصية
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">اسم اللاعب:</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={14}
              placeholder="أدخل اسمك"
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 px-3 py-1.5 rounded-xl text-white font-bold text-xs outline-none"
            />
            <button
              onClick={handleSave}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer"
            >
              حفظ ✅
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-extrabold text-amber-300">اختر شخصيتك:</h4>
            <label className="cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-400/50 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-lg transition flex items-center gap-1 shadow">
              <span>📷 صورة خاصة</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {AVATARS_CATALOG.map((av) => (
              <div
                key={av.id}
                onClick={() => {
                  onSelectAvatar(av.id);
                  onClose();
                }}
                className={`cursor-pointer bg-slate-800 hover:bg-slate-700 border rounded-xl p-1.5 flex flex-col items-center gap-1 transition active:scale-95 shadow ${
                  currentAvatarId === av.id
                    ? 'border-amber-400 ring-2 ring-amber-400/40'
                    : 'border-slate-700 hover:border-amber-400'
                }`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-600 bg-slate-950">
                  {av.render()}
                </div>
                <span className="text-[9px] text-center font-bold text-slate-300 leading-tight">
                  {av.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
