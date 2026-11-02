import React, { useState } from 'react';

interface RoomsModalProps {
  currentRoomCode: string;
  onGenerateNewRoom: () => void;
  onJoinRoom: (code: string) => void;
  onClose: () => void;
}

export const RoomsModal: React.FC<RoomsModalProps> = ({
  currentRoomCode,
  onGenerateNewRoom,
  onJoinRoom,
  onClose,
}) => {
  const [inputCode, setInputCode] = useState('');

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`;
    navigator.clipboard.writeText(shareLink).catch(() => {});
  };

  const handleShareWhatsApp = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`;
    const msg = encodeURIComponent(
      `تعال العب معي كوت بو ستة أونو!\nرمز الغرفة: #${currentRoomCode}\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length === 4) {
      onJoinRoom(inputCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-2xl sm:rounded-3xl w-full max-w-sm p-3 xs:p-4 text-center shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
          <h3 className="text-sm font-black text-indigo-400 flex items-center gap-1">
            <span>🌐</span>
            <span>غرف اللعب برمز (4 أرقام)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 mb-2.5">
          <span className="text-[10px] text-slate-400 block mb-0.5">رمز غرفتك الحالية:</span>
          <div className="font-mono font-black text-2xl text-amber-400 tracking-widest">
            {currentRoomCode}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              📋 نسخ الرابط
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer"
            >
              واتساب 💬
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-2.5">
          <button
            onClick={onGenerateNewRoom}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer"
          >
            🎲 إنشاء غرفة برمز جديد
          </button>
        </div>

        <div className="border-t border-slate-800 pt-2">
          <span className="text-[10px] text-slate-400 block mb-1 font-bold">الدخول لغرفة صديق:</span>
          <form onSubmit={handleJoin} className="flex gap-1.5">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              placeholder="الـ 4 أرقام"
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-400 px-2 py-1.5 rounded-xl text-white font-mono text-center font-bold text-xs tracking-wider uppercase outline-none"
            />
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-black px-3 py-1.5 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer"
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
