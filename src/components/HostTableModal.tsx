import React from 'react';
import { SeatConfig } from '../types';
import { AvatarView } from '../utils/avatars';

interface HostTableModalProps {
  roomCode: string;
  seats: SeatConfig[];
  currentHumanSeatIndex: number;
  isHost?: boolean;
  onRegenerateCode: () => void;
  onSitInSeat: (idx: number) => void;
  onConvertToBot: (idx: number) => void;
  onVacateSeat: (idx: number) => void;
  onFillAllWithBots: () => void;
  onVacateAllSeats: () => void;
  onEditSeat: (idx: number) => void;
  onStartGame: () => void;
  onClose: () => void;
}

export const HostTableModal: React.FC<HostTableModalProps> = ({
  roomCode,
  seats,
  currentHumanSeatIndex,
  isHost = true,
  onRegenerateCode,
  onSitInSeat,
  onConvertToBot,
  onVacateSeat,
  onFillAllWithBots,
  onVacateAllSeats,
  onEditSeat,
  onStartGame,
  onClose,
}) => {
  const filledSeats = seats.filter((s) => !s.isVacant && s.name && s.name.trim() !== '');
  const isComplete = filledSeats.length === 6;
  const vacantCount = 6 - filledSeats.length;
  const isUserInTeamA = [0, 2, 4].includes(currentHumanSeatIndex);
  const isUserInTeamB = [1, 3, 5].includes(currentHumanSeatIndex);

  const handleShareWhatsApp = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const msg = encodeURIComponent(
      `تعال العب معي كوت بو ستة أونو الكويتية!\nرمز الطاولة: #${roomCode}\nالرابط:\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(shareLink).catch(() => {});
  };

  const renderSeatCard = (idx: number, teamDot: '🔵' | '🔴') => {
    const seat = seats[idx];
    const isMySeat = idx === currentHumanSeatIndex;
    const isVacant = seat.isVacant || !seat.name || seat.name.trim() === '';

    const bgCol = isMySeat
      ? teamDot === '🔵'
        ? 'bg-blue-950/90 border-2 border-blue-400 shadow-blue-500/20'
        : 'bg-rose-950/90 border-2 border-rose-400 shadow-rose-500/20'
      : isVacant
      ? 'bg-slate-950/50 border-2 border-dashed border-slate-700/80 hover:border-slate-500'
      : 'bg-slate-950/90 border border-slate-800';

    return (
      <div
        key={idx}
        className={`p-1 xs:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl flex flex-col items-center justify-between gap-0.5 xs:gap-1 transition-all shadow-md ${bgCol}`}
      >
        {/* Top Header: Seat ID & Team Dot */}
        <div className="w-full flex items-center justify-between text-[7.5px] xs:text-[8px] sm:text-[9px] font-mono px-0.5">
          <span className="font-bold text-slate-400">#{idx}</span>
          <span className="text-[10px] xs:text-xs">{teamDot}</span>
        </div>

        {/* Avatar / Vacant Chair Display */}
        <div
          className={`w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 flex items-center justify-center transition ${
            isMySeat
              ? 'border-amber-400 ring-2 ring-amber-400/40'
              : isVacant
              ? 'border-dashed border-slate-600 bg-slate-900/60'
              : 'border-slate-700 bg-slate-900'
          }`}
        >
          {isVacant ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs xs:text-sm">
              ⏳
            </div>
          ) : (
            <AvatarView avatarId={seat.avatarId} customPhoto={seat.customPhoto} />
          )}
        </div>

        {/* Seat Name & Status */}
        <div className="text-center w-full px-0.5 min-h-[26px] xs:min-h-[30px] flex flex-col items-center justify-center">
          {!isVacant ? (
            <>
              <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-black block truncate text-white max-w-full">
                {seat.name}
              </span>
              {isMySeat ? (
                <span className="text-[7.5px] xs:text-[8px] bg-amber-500/25 text-amber-300 font-black px-1.5 py-0.2 rounded-full inline-block mt-0.5 border border-amber-400/40">
                  أنت 👑
                </span>
              ) : seat.isHuman ? (
                <span className="text-[7.5px] xs:text-[8px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 border border-emerald-500/30">
                  لاعب 👤
                </span>
              ) : (
                <span className="text-[7.5px] xs:text-[8px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 border border-cyan-500/30">
                  بوت 🤖
                </span>
              )}
            </>
          ) : null}
        </div>

        {/* Interactive Action Buttons */}
        <div className="w-full flex flex-col gap-0.5 xs:gap-1 pt-0.5 xs:pt-1 border-t border-slate-800/80">
          {isMySeat ? (
            <div className="w-full py-0.5 xs:py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[8px] xs:text-[9px] font-black text-center">
              مكانك الحالي 👑
            </div>
          ) : isVacant ? (
            <>
              <button
                onClick={() => onSitInSeat(idx)}
                className="w-full py-0.5 xs:py-1 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 rounded-lg text-[8px] xs:text-[9px] font-black active:scale-95 transition cursor-pointer"
                title="احجز هذا المقعد لنفسك"
              >
                احجز المقعد 💺
              </button>
              <div className="grid grid-cols-2 gap-0.5 xs:gap-1 w-full">
                <button
                  onClick={() => onConvertToBot(idx)}
                  className="py-0.5 xs:py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 rounded-lg text-[7.5px] xs:text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="تحويل المقعد إلى بوت ذكي"
                >
                  + بوت 🤖
                </button>
                <button
                  onClick={() => onEditSeat(idx)}
                  className="py-0.5 xs:py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[7.5px] xs:text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="حجز باسم لاعب أو تعديل"
                >
                  حجز 👤
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => onSitInSeat(idx)}
                className="w-full py-0.5 xs:py-1 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 rounded-lg text-[7.5px] xs:text-[8px] font-black active:scale-95 transition cursor-pointer"
                title="اجلس في هذا المقعد"
              >
                اجلس هنا 💺
              </button>
              <div className="grid grid-cols-3 gap-0.5 xs:gap-1 w-full">
                {seat.isHuman ? (
                  <button
                    onClick={() => onConvertToBot(idx)}
                    className="py-0.5 xs:py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 rounded-lg text-[7px] xs:text-[8px] font-bold active:scale-95 transition cursor-pointer"
                    title="تحويل المقعد إلى بوت"
                  >
                    بوت 🤖
                  </button>
                ) : (
                  <button
                    onClick={() => onEditSeat(idx)}
                    className="py-0.5 xs:py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[7px] xs:text-[8px] font-bold active:scale-95 transition cursor-pointer"
                    title="حجز باسم لاعب"
                  >
                    لاعب 👤
                  </button>
                )}
                <button
                  onClick={() => onVacateSeat(idx)}
                  className="py-0.5 xs:py-1 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 rounded-lg text-[7px] xs:text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="إفراغ المقعد وجعله شاغراً"
                >
                  إفراغ ⏳
                </button>
                <button
                  onClick={() => onEditSeat(idx)}
                  className="py-0.5 xs:py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[7px] xs:text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="تعديل"
                >
                  ✏️
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 xs:p-3 sm:p-4">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl w-full max-w-lg p-2.5 xs:p-3 sm:p-4 text-center shadow-2xl max-h-[94dvh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">👥</span>
            <div className="text-right">
              <h3 className="text-xs sm:text-base font-black text-amber-400">طاولة خاصة</h3>
              <p className="text-[10px] sm:text-xs font-bold text-amber-300">اختر مقعدك وفريقك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl sm:text-2xl font-bold active:scale-90 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Room Code & Share Header */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl p-1.5 xs:p-2 mb-2 flex items-center justify-between">
          <div className="text-right">
            <span className="text-[8px] xs:text-[9px] text-slate-400 block">رمز الطاولة الخاص:</span>
            <div className="font-mono font-black text-lg xs:text-xl sm:text-2xl text-amber-400 tracking-wider">
              {roomCode}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleShareWhatsApp}
              className="px-1.5 xs:px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg xs:rounded-xl text-[9px] xs:text-[10px] font-bold shadow transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>💬</span>
              <span>واتساب</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="px-1.5 xs:px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg xs:rounded-xl text-[9px] xs:text-[10px] font-bold transition active:scale-95 cursor-pointer"
            >
              📋 نسخ
            </button>
            <button
              onClick={onRegenerateCode}
              className="p-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg xs:rounded-xl border border-slate-700 transition cursor-pointer"
              title="رمز جديد"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Quick Batch Controls Bar */}
        <div className="flex items-center justify-between gap-1.5 xs:gap-2 bg-slate-950/80 border border-slate-800/90 px-2 xs:px-2.5 py-1 xs:py-1.5 rounded-xl mb-2">
          <div className="flex items-center gap-1.5 xs:gap-2 text-right">
            <span className="text-[9px] xs:text-[10px] text-slate-300 font-bold">المقاعد الشاغرة:</span>
            <span
              className="text-xs xs:text-sm font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 xs:px-2.5 py-0.5 rounded-lg min-w-[24px] xs:min-w-[28px] text-center"
              title="عدد المقاعد الشاغرة"
            >
              {vacantCount}
            </span>
          </div>
          <div className="flex items-center gap-1 xs:gap-1.5">
            <button
              onClick={onFillAllWithBots}
              className="px-2 xs:px-2.5 py-1 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-500/40 rounded-lg xs:rounded-xl text-[8px] xs:text-[9px] font-bold active:scale-95 transition cursor-pointer flex items-center gap-1"
              title="ملء جميع المقاعد ببوتات"
            >
              <span>🤖</span>
              <span>ملء ببوتات</span>
            </button>
            <button
              onClick={onVacateAllSeats}
              className="px-1.5 xs:px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg xs:rounded-xl text-[8px] xs:text-[9px] font-bold active:scale-95 transition cursor-pointer"
              title="إفراغ جميع المقاعد ما عدا مقعدك"
            >
              <span>إفراغ</span>
            </button>
          </div>
        </div>

        {/* Seats Grouped by Team */}
        <div className="mb-2.5 space-y-2">
          {/* 🔵 الفريق (#0, #2, #4) */}
          <div className={`p-2 rounded-xl transition ${isUserInTeamA ? 'bg-blue-950/70 border-2 border-blue-400/80 shadow-md shadow-blue-950/40' : 'bg-slate-900/60 border border-blue-500/25'}`}>
            <div className="flex items-center justify-between text-xs font-black text-blue-400 mb-1.5 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">🔵</span>
                {isUserInTeamA ? (
                  <span className="text-[9px] bg-blue-500/25 text-blue-300 border border-blue-400/40 px-2 py-0.5 rounded-full font-bold">
                    فريقك 👑
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">3 مقاعد</span>
                )}
              </div>
              {!isUserInTeamA && (
                <button
                  onClick={() => {
                    const target = [0, 2, 4].find((i) => seats[i].isVacant) ?? 0;
                    onSitInSeat(target);
                  }}
                  className="px-2.5 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/40 rounded-lg text-[9px] font-bold active:scale-95 transition cursor-pointer"
                >
                  انضم لهذا الفريق 🔵
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 2, 4].map((idx) => renderSeatCard(idx, '🔵'))}
            </div>
          </div>

          {/* 🔴 الفريق (#1, #3, #5) */}
          <div className={`p-2 rounded-xl transition ${isUserInTeamB ? 'bg-rose-950/70 border-2 border-rose-400/80 shadow-md shadow-rose-950/40' : 'bg-slate-900/60 border border-rose-500/25'}`}>
            <div className="flex items-center justify-between text-xs font-black text-rose-400 mb-1.5 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">🔴</span>
                {isUserInTeamB ? (
                  <span className="text-[9px] bg-rose-500/25 text-rose-300 border border-rose-400/40 px-2 py-0.5 rounded-full font-bold">
                    فريقك 👑
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">3 مقاعد</span>
                )}
              </div>
              {!isUserInTeamB && (
                <button
                  onClick={() => {
                    const target = [1, 3, 5].find((i) => seats[i].isVacant) ?? 1;
                    onSitInSeat(target);
                  }}
                  className="px-2.5 py-0.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-400/40 rounded-lg text-[9px] font-bold active:scale-95 transition cursor-pointer"
                >
                  انضم لهذا الفريق 🔴
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 3, 5].map((idx) => renderSeatCard(idx, '🔴'))}
            </div>
          </div>
        </div>

        {/* Start Game Gate: زر العب لمنشئ الغرفة أو شاشة انتظار للأعضاء الآخرين */}
        {isHost ? (
          <div className="space-y-1.5 pt-1">
            {!isComplete && (
              <div className="text-amber-300 text-[10px] font-bold text-center bg-amber-950/40 py-1.5 px-2 rounded-xl border border-amber-500/30 flex items-center justify-center gap-2">
                <span>⚠️ المقاعد الشاغرة سيتم ملؤها ببوتات تلقائياً عند الضغط على العب</span>
                <span className="font-mono font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded text-xs">
                  {vacantCount}
                </span>
              </div>
            )}
            {/* زر العب الأساسي لمنشئ الغرفة للدخول وبدء اللعب للجميع */}
            <button
              onClick={() => {
                if (!isComplete) {
                  onFillAllWithBots();
                }
                onStartGame();
              }}
              className="w-full py-3 sm:py-3.5 btn-glow-green text-white font-black rounded-2xl text-base sm:text-lg shadow-2xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
              title="بدء اللعبة ودخول الجميع إلى الطاولة"
            >
              <span className="text-xl sm:text-2xl">⚡</span>
              <span>العب</span>
            </button>
          </div>
        ) : (
          <div className="w-full py-3.5 px-3 bg-slate-950/95 border-2 border-amber-500/60 rounded-2xl text-center shadow-2xl space-y-1">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-xs sm:text-sm animate-pulse">
              <span className="text-base sm:text-lg">⏳</span>
              <span>في انتظار منشئ الغرفة للضغط على زر (العب)...</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400">
              بمجرد أن يضغط منشئ الغرفة على زر العب، سيدخل الجميع فوراً إلى الطاولة ويبدأ اللعب!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
