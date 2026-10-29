import React, { useState, useEffect, useCallback } from 'react';
import { SeatConfig, WaitingPlayer } from '../types';
import { AvatarView } from '../utils/avatars';
import { roomSync, RoomSyncMessage } from '../utils/roomSync';

interface HostTableModalProps {
  roomCode: string;
  seats: SeatConfig[];
  currentHumanSeatIndex: number;
  isHost?: boolean;
  waitingPlayers: WaitingPlayer[];
  lastSeatReserved?: {
    seatIndex: number;
    name: string;
    team: string;
    avatarId?: string;
    customPhoto?: string | null;
  } | null;
  onRegenerateCode: () => void;
  onSitInSeat: (idx: number) => void;
  onAssignWaitingPlayerToSeat: (player: WaitingPlayer, seatIdx: number) => void;
  onMovePlayerToWaiting: (seatIdx: number) => void;
  onSwapSeats: (idxA: number, idxB: number) => void;
  onConvertToBot: (idx: number) => void;
  onVacateSeat: (idx: number) => void;
  onFillAllWithBots: () => void;
  onVacateAllSeats: () => void;
  onEditSeat: (idx: number) => void;
  onStartGame: () => void;
  onEnterOngoingMatch?: () => void;
  onClose: () => void;
  isMatchOngoing?: boolean;
}

export const HostTableModal: React.FC<HostTableModalProps> = ({
  roomCode,
  seats,
  currentHumanSeatIndex,
  isHost = true,
  waitingPlayers = [],
  lastSeatReserved = null,
  isMatchOngoing = false,
  onRegenerateCode,
  onSitInSeat,
  onAssignWaitingPlayerToSeat,
  onMovePlayerToWaiting,
  onSwapSeats,
  onConvertToBot,
  onVacateSeat,
  onFillAllWithBots,
  onVacateAllSeats,
  onEditSeat,
  onStartGame,
  onEnterOngoingMatch,
  onClose,
}) => {
  const [activeAssignPlayer, setActiveAssignPlayer] = useState<WaitingPlayer | null>(null);
  const [activeSwapSeatIdx, setActiveSwapSeatIdx] = useState<number | null>(null);
  const [activePickForSeatIdx, setActivePickForSeatIdx] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(roomSync.isConnected);

  useEffect(() => {
    return roomSync.subscribeConnection((conn) => setIsConnected(conn));
  }, []);

  // بث حالة الغرفة والمقاعد الحالية لجميع الأجهزة المتصلة
  const broadcastCurrentRoomState = useCallback(() => {
    if (!roomCode) return;
    const filledCount = seats.filter((s) => !s.isVacant && s.name && s.name.trim() !== '').length;
    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: roomSync.myClientId,
      seats,
      waitingPlayers,
      vacantCount: 6 - filledCount,
      timestamp: Date.now(),
    });
  }, [roomCode, seats, waitingPlayers]);

  // الرد الفوري على أي جهاز يطلب المزامنة (SYNC_REQUEST)
  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = roomSync.subscribeRoom(roomCode, (msg: RoomSyncMessage) => {
      if (msg.type === 'SYNC_REQUEST' && msg.senderId !== roomSync.myClientId) {
        broadcastCurrentRoomState();
      }
    });

    return () => unsubscribe();
  }, [roomCode, broadcastCurrentRoomState]);

  // بث دوري ومباشر لحالة المقاعد لتحديث شاشات الهواتف فوراً
  useEffect(() => {
    broadcastCurrentRoomState();

    const syncInterval = setInterval(() => {
      broadcastCurrentRoomState();
    }, 2000);

    return () => clearInterval(syncInterval);
  }, [broadcastCurrentRoomState]);

  const filledSeats = seats.filter((s) => !s.isVacant && s.name && s.name.trim() !== '');
  const isComplete = filledSeats.length === 6;
  const vacantCount = 6 - filledSeats.length;

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
    const isHostSeat = idx === 0 && isHost;
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
        className={`p-1 xs:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl flex flex-col items-center justify-between gap-1 transition-all shadow-md ${bgCol}`}
      >
        {/* Top Header: Seat ID & Team Dot */}
        <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] font-mono px-0.5">
          <span className="font-bold text-slate-400">المقعد #{idx + 1}</span>
          <span className="text-xs">{teamDot}</span>
        </div>

        {/* Avatar / Vacant Chair Display */}
        <div
          className={`w-9 h-9 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 flex items-center justify-center transition ${
            isHostSeat || isMySeat
              ? 'border-amber-400 ring-2 ring-amber-400/40'
              : isVacant
              ? 'border-dashed border-slate-600 bg-slate-900/60'
              : seat.isHuman
              ? 'border-emerald-400 ring-1 ring-emerald-400/40 bg-slate-900'
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
        <div className="text-center w-full px-0.5 min-h-[30px] flex flex-col items-center justify-center">
          {!isVacant ? (
            <>
              <span className="text-[10px] xs:text-[11px] sm:text-[12px] font-black block truncate text-white max-w-full">
                {seat.name}
              </span>
              {isHostSeat ? (
                <span className="text-[7.5px] xs:text-[8px] bg-amber-500/25 text-amber-300 font-black px-1.5 py-0.5 rounded-full inline-block mt-0.5 border border-amber-400/40">
                  منشئ الطاولة 👑
                </span>
              ) : seat.isHuman ? (
                <div className="flex flex-col items-center gap-0.5 mt-0.5">
                  <span className="text-[7.5px] bg-emerald-500/25 text-emerald-300 font-black px-1.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm inline-flex items-center gap-0.5">
                    <span>لاعب حقيقي 👤</span>
                  </span>
                </div>
              ) : (
                <span className="text-[7.5px] xs:text-[8px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 border border-cyan-500/30">
                  بوت ذكي 🤖
                </span>
              )}
            </>
          ) : (
            <span className="text-[8.5px] text-slate-500 font-bold">مقعد شاغر ⏳</span>
          )}
        </div>

        {/* Interactive Host Action Buttons */}
        <div className="w-full flex flex-col gap-1 pt-1 border-t border-slate-800/80">
          {isHostSeat ? (
            <div className="w-full py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[8.5px] font-black text-center">
              مكانك (المضيف 👑)
            </div>
          ) : isVacant ? (
            <>
              {waitingPlayers.length > 0 ? (
                <button
                  onClick={() => setActivePickForSeatIdx(activePickForSeatIdx === idx ? null : idx)}
                  className="w-full py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-400/50 rounded-lg text-[8.5px] font-black active:scale-95 transition cursor-pointer flex items-center justify-center gap-1"
                  title="تسكين لاعب من قائمة الانتظار"
                >
                  <span>👤</span>
                  <span>تسكين لاعب</span>
                </button>
              ) : null}

              <div className="grid grid-cols-2 gap-1 w-full">
                <button
                  onClick={() => onConvertToBot(idx)}
                  className="py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 rounded-lg text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="إضافة بوت ذكي لهذا المقعد"
                >
                  + بوت 🤖
                </button>
                <button
                  onClick={() => onEditSeat(idx)}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="تعديل اسم وصورة المقعد"
                >
                  تعديل ✏️
                </button>
              </div>

              {activePickForSeatIdx === idx && waitingPlayers.length > 0 && (
                <div className="bg-slate-900 border border-emerald-400 rounded-xl p-1.5 flex flex-col gap-1 text-right mt-1 shadow-xl">
                  <span className="text-[8px] font-black text-emerald-300">اختر لاعباً لتسكينه:</span>
                  {waitingPlayers.map((p) => (
                    <button
                      key={p.clientId}
                      onClick={() => {
                        onAssignWaitingPlayerToSeat(p, idx);
                        setActivePickForSeatIdx(null);
                      }}
                      className="flex items-center justify-between p-1 bg-slate-950 hover:bg-emerald-950/80 border border-slate-800 rounded-lg text-[9px] text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                          <AvatarView avatarId={p.avatarId} customPhoto={p.customPhoto} />
                        </div>
                        <span className="font-bold truncate max-w-[80px]">{p.name}</span>
                      </div>
                      <span className="text-[7.5px] bg-emerald-500/20 text-emerald-300 px-1 rounded">تسكين</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1 w-full">
                {seat.isHuman ? (
                  <div className="grid grid-cols-2 gap-1 w-full">
                    <button
                      onClick={() => onMovePlayerToWaiting(idx)}
                      className="py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 rounded-lg text-[7.5px] font-bold active:scale-95 transition cursor-pointer"
                      title="إعادة اللاعب إلى قائمة الانتظار"
                    >
                      للانتظار ⏳
                    </button>
                    <button
                      onClick={() => setActiveSwapSeatIdx(activeSwapSeatIdx === idx ? null : idx)}
                      className="py-1 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 rounded-lg text-[7.5px] font-bold active:scale-95 transition cursor-pointer"
                      title="تبديل هذا المقعد مع مقعد آخر"
                    >
                      تبديل 🔄
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1 w-full">
                    <button
                      onClick={() => setActivePickForSeatIdx(activePickForSeatIdx === idx ? null : idx)}
                      className="py-1 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 rounded-lg text-[7.5px] font-bold active:scale-95 transition cursor-pointer"
                      title="استبدال البوت بلاعب من الانتظار"
                    >
                      لاعب 👤
                    </button>
                    <button
                      onClick={() => onVacateSeat(idx)}
                      className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[7.5px] font-bold active:scale-95 transition cursor-pointer"
                      title="تفريغ هذا المقعد"
                    >
                      تفريغ 🗑️
                    </button>
                  </div>
                )}

                {activeSwapSeatIdx === idx && (
                  <div className="bg-slate-900 border border-indigo-400 rounded-xl p-1.5 flex flex-col gap-1 text-right mt-1 shadow-xl">
                    <span className="text-[8px] font-black text-indigo-300">انقل / بدّل مع:</span>
                    <div className="grid grid-cols-3 gap-0.5">
                      {[0, 1, 2, 3, 4, 5].map((targetIdx) => {
                        if (targetIdx === idx) return null;
                        return (
                          <button
                            key={targetIdx}
                            onClick={() => {
                              onSwapSeats(idx, targetIdx);
                              setActiveSwapSeatIdx(null);
                            }}
                            className="py-1 px-1 bg-slate-950 hover:bg-indigo-900/60 border border-slate-800 rounded text-[8px] text-white font-bold transition"
                          >
                            مقعد {targetIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activePickForSeatIdx === idx && waitingPlayers.length > 0 && (
                  <div className="bg-slate-900 border border-emerald-400 rounded-xl p-1.5 flex flex-col gap-1 text-right mt-1 shadow-xl">
                    <span className="text-[8px] font-black text-emerald-300">اختر لاعباً ليحل مكان البوت:</span>
                    {waitingPlayers.map((p) => (
                      <button
                        key={p.clientId}
                        onClick={() => {
                          onAssignWaitingPlayerToSeat(p, idx);
                          setActivePickForSeatIdx(null);
                        }}
                        className="flex items-center justify-between p-1 bg-slate-950 hover:bg-emerald-950/80 border border-slate-800 rounded-lg text-[9px] text-white transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                            <AvatarView avatarId={p.avatarId} customPhoto={p.customPhoto} />
                          </div>
                          <span className="font-bold truncate max-w-[80px]">{p.name}</span>
                        </div>
                        <span className="text-[7.5px] bg-emerald-500/20 text-emerald-300 px-1 rounded">تسكين</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 xs:p-2.5 sm:p-4 select-none">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl sm:rounded-3xl w-full max-w-xl p-2.5 xs:p-3 sm:p-4 text-center shadow-2xl max-h-[96dvh] overflow-y-auto flex flex-col gap-2">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs xs:text-sm sm:text-base font-black text-amber-400">
                  لوحة تحكم وتوزيع الطاولة الخاصة
                </h3>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-black">
                  v2.6 ⚡
                </span>
              </div>
              <p className="text-[9.5px] xs:text-[10px] text-slate-400">
                أنت منشئ الطاولة: تحكّم بتوزيع مقاعد اللاعبين وفِرقهم ثم اضغط "العب"
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

        {/* Room Code & Quick Sharing */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-[9px] text-slate-400 block font-bold">رمز الطاولة الخاص:</span>
              <span className="font-mono font-black text-xl xs:text-2xl text-amber-400 tracking-widest leading-none">
                #{roomCode}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[9px] font-bold text-slate-300">
                  {isConnected ? 'سيرفر اللعب: متصل 🟢' : 'جاري الاتصال... 🔴'}
                </span>
              </div>
            </div>
            <button
              onClick={onRegenerateCode}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold border border-slate-700 transition active:scale-95 cursor-pointer"
              title="توليد رمز طاولة جديد"
            >
              رمز جديد 🔄
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyLink}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold border border-slate-700 transition active:scale-95 cursor-pointer"
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

        {/* Waiting Players Queue Section */}
        <div className="bg-slate-950/90 border-2 border-indigo-500/40 rounded-2xl p-2.5 text-right shadow-inner">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏳</span>
              <span className="text-xs font-black text-indigo-300">
                اللاعبون في قائمة الانتظار ({waitingPlayers.length})
              </span>
            </div>
            <span className="text-[9.5px] text-slate-400">
              {waitingPlayers.length === 0
                ? 'في انتظار دخول أصدقائك بالرمز'
                : 'اضغط "تسكين" لاختيار مقعد وفريق للاعب'}
            </span>
          </div>

          {waitingPlayers.length === 0 ? (
            <div className="py-2 px-3 text-center text-[10.5px] text-slate-400 font-medium">
              لم يدخل أي لاعب بالرمز بعد. أرسل الرمز <strong className="text-amber-400 font-mono">#{roomCode}</strong> لأصدقائك، وسيظهرون هنا فور إدخالهم الرمز لتوزّعهم على المقاعد!
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {waitingPlayers.map((p) => {
                const isPicking = activeAssignPlayer?.clientId === p.clientId;
                return (
                  <div
                    key={p.clientId}
                    className="flex flex-col bg-slate-900 border border-slate-800 p-2 rounded-xl transition shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-400 bg-slate-950 shrink-0">
                          <AvatarView avatarId={p.avatarId} customPhoto={p.customPhoto} />
                        </div>
                        <div className="leading-tight">
                          <span className="text-xs font-black text-white block">{p.name}</span>
                          <span className="text-[9px] text-emerald-400 font-bold">متصل وبالانتظار ⏳</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveAssignPlayer(isPicking ? null : p)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow flex items-center gap-1"
                      >
                        <span>💺</span>
                        <span>{isPicking ? 'إلغاء' : 'تسكين في مقعد'}</span>
                      </button>
                    </div>

                    {/* Quick Seat Selector */}
                    {isPicking && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1.5 animate-fadeIn">
                        <span className="text-[10px] font-black text-amber-300">
                          اختر المقعد والفريق لـ ({p.name}):
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          {/* Team Blue Options */}
                          <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-1.5 flex flex-col gap-1">
                            <span className="text-[9.5px] font-black text-blue-300">🔵 الفريق الأزرق</span>
                            <div className="grid grid-cols-2 gap-1">
                              {[2, 4].map((seatIdx) => {
                                const s = seats[seatIdx];
                                const isVac = s.isVacant || !s.name || s.name.trim() === '';
                                return (
                                  <button
                                    key={seatIdx}
                                    onClick={() => {
                                      onAssignWaitingPlayerToSeat(p, seatIdx);
                                      setActiveAssignPlayer(null);
                                    }}
                                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition ${
                                      isVac
                                        ? 'bg-blue-600/30 hover:bg-blue-600/60 border-blue-400 text-white font-black'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    مقعد {seatIdx + 1} {isVac ? '(شاغر)' : `(${s.name})`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Team Red Options */}
                          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-1.5 flex flex-col gap-1">
                            <span className="text-[9.5px] font-black text-rose-300">🔴 الفريق الأحمر</span>
                            <div className="grid grid-cols-3 gap-1">
                              {[1, 3, 5].map((seatIdx) => {
                                const s = seats[seatIdx];
                                const isVac = s.isVacant || !s.name || s.name.trim() === '';
                                return (
                                  <button
                                    key={seatIdx}
                                    onClick={() => {
                                      onAssignWaitingPlayerToSeat(p, seatIdx);
                                      setActiveAssignPlayer(null);
                                    }}
                                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition ${
                                      isVac
                                        ? 'bg-rose-600/30 hover:bg-rose-600/60 border-rose-400 text-white font-black'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    مقعد {seatIdx + 1} {isVac ? '(شاغر)' : `(${s.name})`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Batch Tools Bar */}
        <div className="flex items-center justify-between gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-right">
            <span className="text-[10px] text-slate-300 font-bold">المقاعد الشاغرة:</span>
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg">
              {vacantCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onFillAllWithBots}
              className="px-2.5 py-1 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-500/40 rounded-xl text-[9px] font-bold active:scale-95 transition cursor-pointer flex items-center gap-1"
              title="ملء المقاعد الشاغرة ببوتات ذكية"
            >
              <span>🤖</span>
              <span>إكمال الشواغر ببوتات</span>
            </button>
            <button
              onClick={onVacateAllSeats}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[9px] font-bold active:scale-95 transition cursor-pointer"
              title="تفريغ جميع المقاعد ما عدا مقعدك"
            >
              تفريغ الشواغر 🗑️
            </button>
          </div>
        </div>

        {/* 6 Seats Table Display */}
        <div className="space-y-2">
          {/* Team Blue */}
          <div className="p-2 rounded-xl bg-blue-950/40 border-2 border-blue-500/40 text-right">
            <div className="flex items-center justify-between text-xs font-black text-blue-400 mb-1.5 px-1">
              <span className="flex items-center gap-1">
                <span>🔵</span>
                <span>الفريق الأزرق (مقاعد 1، 3، 5)</span>
              </span>
              <span className="text-[9.5px] text-blue-300/80 font-bold">
                {[0, 2, 4].filter((i) => !seats[i].isVacant).length} من 3 جاهزون
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 2, 4].map((idx) => renderSeatCard(idx, '🔵'))}
            </div>
          </div>

          {/* Team Red */}
          <div className="p-2 rounded-xl bg-rose-950/40 border-2 border-rose-500/40 text-right">
            <div className="flex items-center justify-between text-xs font-black text-rose-400 mb-1.5 px-1">
              <span className="flex items-center gap-1">
                <span>🔴</span>
                <span>الفريق الأحمر (مقاعد 2، 4، 6)</span>
              </span>
              <span className="text-[9.5px] text-rose-300/80 font-bold">
                {[1, 3, 5].filter((i) => !seats[i].isVacant).length} من 3 جاهزون
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 3, 5].map((idx) => renderSeatCard(idx, '🔴'))}
            </div>
          </div>
        </div>

        {/* Start Game Action Button */}
        <div className="pt-1">
          {!isComplete && (
            <div className="text-amber-300 text-[10px] font-bold text-center bg-amber-950/40 py-1.5 px-2 rounded-xl border border-amber-500/30 mb-2 flex items-center justify-center gap-2">
              <span>⚠️ المقاعد الشاغرة سيتم إكمالها ببوتات تلقائياً عند الضغط على العب</span>
            </div>
          )}

          <button
            onClick={() => {
              if (!isComplete) {
                onFillAllWithBots();
              }
              onStartGame();
            }}
            className="w-full py-3.5 sm:py-4 btn-glow-green text-white font-black rounded-2xl text-base sm:text-lg shadow-2xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
            title="بدء اللعبة وتوزيع الأوراق للجميع"
          >
            <span className="text-xl sm:text-2xl">⚡</span>
            <span>العب 🃏</span>
          </button>
        </div>

      </div>
    </div>
  );
};
