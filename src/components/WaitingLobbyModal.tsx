import React, { useState, useEffect } from 'react';
import { SeatConfig, WaitingPlayer } from '../types';
import { AvatarView } from '../utils/avatars';
import { roomSync } from '../utils/roomSync';

interface WaitingLobbyModalProps {
  roomCode: string;
  seats: SeatConfig[];
  waitingPlayers: WaitingPlayer[];
  myClientId: string;
  myName: string;
  myAvatarId: string;
  myCustomPhoto: string | null;
  onLeaveRoom: () => void;
}

export const WaitingLobbyModal: React.FC<WaitingLobbyModalProps> = ({
  roomCode,
  seats,
  waitingPlayers,
  myClientId,
  myName,
  myAvatarId,
  myCustomPhoto,
  onLeaveRoom,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(roomSync.isConnected);
  const [pingSent, setPingSent] = useState<boolean>(false);

  useEffect(() => {
    return roomSync.subscribeConnection((conn) => setIsConnected(conn));
  }, []);

  // وظيفة إرسال إعلان الانضمام وطلب المزامنة
  const sendJoinAnnouncement = () => {
    const activeClientId = myClientId || roomSync.myClientId;
    
    // 1. إرسال طلب الانضمام إلى قائمة الانتظار
    roomSync.publish({
      type: 'JOIN_REQUEST',
      roomCode,
      senderId: activeClientId,
      player: {
        name: myName,
        team: 'A',
        avatarId: myAvatarId,
        customPhoto: myCustomPhoto,
        isHuman: true,
        clientId: activeClientId,
      },
      timestamp: Date.now(),
    });

    // 2. طلب آخر حالة للغرفة من المضيف فوراً
    roomSync.publish({
      type: 'SYNC_REQUEST',
      roomCode,
      senderId: activeClientId,
      timestamp: Date.now(),
    });
  };

  // إرسال طلب الانضمام تلقائياً فور فتح النافذة + تكراره دورياً للتأكد من وصوله
  useEffect(() => {
    sendJoinAnnouncement();

    // إرسال نبضة خفيفة كل 2.5 ثانية لطمأنة المضيف بوجود اللاعب حتى يتم تسكينه
    const announceTimer = setInterval(() => {
      sendJoinAnnouncement();
    }, 2500);

    return () => clearInterval(announceTimer);
  }, [roomCode, myClientId, myName]);

  // التحقق هل قام المضيف بتسكين اللاعب في مقعد
  // الاعتماد الصارم على clientId فقط حتى لا يحصل تشابه إذا تساوت الأسماء
  const assignedSeatIdx = seats.findIndex(
    (s) => !s.isVacant && s.clientId && (s.clientId === myClientId || s.clientId === roomSync.myClientId)
  );
  const isAssigned = assignedSeatIdx >= 0;

  const hostSeat = seats[0];
  const hostName = hostSeat?.name || 'منشئ الطاولة';

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(shareLink).catch(() => {});
  };

  const handleShareWhatsApp = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const msg = encodeURIComponent(
      `تعال العب معي كوت بو ستة أونو!\nرمز الطاولة: #${roomCode}\nالرابط:\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const teamASitterCount = [0, 2, 4].filter((idx) => !seats[idx]?.isVacant).length;
  const teamBSitterCount = [1, 3, 5].filter((idx) => !seats[idx]?.isVacant).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-2xl sm:rounded-3xl w-full max-w-lg p-3 xs:p-4 text-center shadow-2xl max-h-[95dvh] overflow-y-auto flex flex-col gap-3">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚪</span>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm xs:text-base font-black text-white">
                  غرفة انتظار الطاولة الخاصة
                </h3>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-black">
                  v2.6 ⚡
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                منشئ الطاولة ({hostName}) يتحكم بتوزيع المقاعد
              </p>
            </div>
          </div>
          <button
            onClick={onLeaveRoom}
            className="text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 rounded-xl transition cursor-pointer font-bold"
          >
            مغادرة 🚪
          </button>
        </div>

        {/* Room Code Badge */}
        <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">رمز الطاولة الخاص:</span>
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-bold border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                📋 نسخ
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition active:scale-95 cursor-pointer"
              >
                واتساب 💬
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400">
              // 1. وظيفة صريحة لإرسال طلب الانضمام بالرمز المكتوب على الشاشة
  const handleSendJoinRequest = () => {
    if (!roomCode) return;

    roomSync.publish({
      type: 'JOIN_REQUEST',
      roomCode: String(roomCode).trim(), // الرمز الصريح المكتوب على الشاشة
      senderId: myClientId || roomSync.myClientId,
      player: {
        name: myName || 'لاعب جديد',
        team: 'A',
        avatarId: _myAvatarId,
        customPhoto: _myCustomPhoto,
        isHuman: true,
        clientId: myClientId || roomSync.myClientId,
      },
      timestamp: Date.now(),
    });

    roomSync.publish({
      type: 'SYNC_REQUEST',
      roomCode: String(roomCode).trim(),
      senderId: myClientId || roomSync.myClientId,
      timestamp: Date.now(),
    });
  };

  // 2. مؤقت دوري يرسل النداء كل ثانية ونصف تلقائياً فور فتح الشاشة
  useEffect(() => {
    handleSendJoinRequest();

    const interval = setInterval(() => {
      if (roomSync.isConnected && roomCode) {
        handleSendJoinRequest();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [roomCode, myClientId, myName]);

        {/* Player Current Status Alert Banner */}
        {isAssigned ? (
          <div className="bg-emerald-950/60 border-2 border-emerald-500/60 rounded-2xl p-3 text-right flex items-center gap-3 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center text-xl shrink-0">
              💺
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs xs:text-sm font-black text-emerald-300">
                  تم تسكينك في المقعد #{assignedSeatIdx + 1}!
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                  {assignedSeatIdx % 2 === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-medium mt-0.5">
                بانتظار ضغط منشئ الطاولة ({hostName}) على زر <strong>"العب"</strong> لتبدأ المباراة للجميع تلقائياً.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-950/50 border-2 border-amber-500/50 rounded-2xl p-3 text-right flex items-center gap-3 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center text-xl shrink-0 animate-pulse">
              ⏳
            </div>
            <div className="flex-1">
              <span className="text-xs xs:text-sm font-black text-amber-300 block">
                أنت في قائمة الانتظار الآن ⏳
              </span>
              <p className="text-[11px] text-amber-100/80 font-medium mt-0.5">
                أنت متصل بالطاولة بنجاح! سيقوم منشئ الطاولة ({hostName}) بتسكينك في أحد مقاعد الفريقين قريباً.
              </p>
            </div>
          </div>
        )}

        {/* 6 Seats Table Overview */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
            <span className="text-xs font-black text-slate-300">توزيع المقاعد الحالي</span>
            <span className="text-[10px] text-slate-400 font-bold">
              الأزرق ({teamASitterCount}/3) | الأحمر ({teamBSitterCount}/3)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-right">
            {/* Team A (Blue) */}
            <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2 flex flex-col gap-1.5">
              <div className="text-[11px] font-black text-blue-400 flex items-center justify-between">
                <span>🔵 الفريق الأزرق</span>
                <span className="text-[9px] text-blue-300/70 font-mono">مقاعد 1، 3، 5</span>
              </div>
              {[0, 2, 4].map((idx) => {
                const s = seats[idx];
                const isMe = idx === assignedSeatIdx;
                const isVacant = !s || s.isVacant || !s.name || s.name.trim() === '';
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition ${
                      isMe
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : isVacant
                        ? 'bg-slate-900/40 border-dashed border-slate-800 text-slate-500'
                        : 'bg-slate-900/80 border-slate-800 text-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0 text-xs">
                      {isVacant ? '⏳' : <AvatarView avatarId={s.avatarId} customPhoto={s.customPhoto} />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate">
                        {isVacant ? `المقعد #${idx + 1} (شاغر)` : s.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full font-black shrink-0">
                          أنت 👑
                        </span>
                      )}
                      {!isMe && !isVacant && (
                        <span className="text-[8px] text-slate-400 shrink-0">
                          {s.isHuman ? '👤 لاعب' : '🤖 بوت'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team B (Red) */}
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2 flex flex-col gap-1.5">
              <div className="text-[11px] font-black text-rose-400 flex items-center justify-between">
                <span>🔴 الفريق الأحمر</span>
                <span className="text-[9px] text-rose-300/70 font-mono">مقاعد 2، 4، 6</span>
              </div>
              {[1, 3, 5].map((idx) => {
                const s = seats[idx];
                const isMe = idx === assignedSeatIdx;
                const isVacant = !s || s.isVacant || !s.name || s.name.trim() === '';
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition ${
                      isMe
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : isVacant
                        ? 'bg-slate-900/40 border-dashed border-slate-800 text-slate-500'
                        : 'bg-slate-900/80 border-slate-800 text-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0 text-xs">
                      {isVacant ? '⏳' : <AvatarView avatarId={s.avatarId} customPhoto={s.customPhoto} />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate">
                        {isVacant ? `المقعد #${idx + 1} (شاغر)` : s.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full font-black shrink-0">
                          أنت 👑
                        </span>
                      )}
                      {!isMe && !isVacant && (
                        <span className="text-[8px] text-slate-400 shrink-0">
                          {s.isHuman ? '👤 لاعب' : '🤖 بوت'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Waiting Players List */}
        {waitingPlayers.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-2.5 text-right">
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
              لاعبون في قائمة الانتظار ({waitingPlayers.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {waitingPlayers.map((p) => {
                const isCurrent = p.clientId === myClientId || p.name === myName;
                return (
                  <div
                    key={p.clientId}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs border ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                      <AvatarView avatarId={p.avatarId} customPhoto={p.customPhoto} />
                    </div>
                    <span className="text-[11px] font-medium">{p.name}</span>
                    {isCurrent && <span className="text-[9px]">(أنت)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info & leave button */}
        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={onLeaveRoom}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black transition active:scale-95 cursor-pointer border border-slate-700"
          >
            مغادرة الغرفة والعودة للرئيسية 🚪
          </button>
        </div>

      </div>
    </div>
  );
};
