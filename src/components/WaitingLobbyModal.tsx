import React, { useState, useEffect, useCallback } from 'react';
import { OnlinePlayer, SeatConfig, WaitingPlayer } from '../types';
import { AvatarView } from '../utils/avatars';
import { roomSync } from '../utils/roomSync';
import { soundEngine } from '../utils/soundEngine';
import { YellowDoorIcon } from './YellowDoorIcon';

interface WaitingLobbyModalProps {
  roomCode: string;
  seats: SeatConfig[];
  waitingPlayers: WaitingPlayer[];
  onlinePlayers?: OnlinePlayer[];
  isLandscapeMode?: boolean;
  myClientId: string;
  myName: string;
  myAvatarId: string;
  myCustomPhoto: string | null;
  onToggleScreenOrientation?: () => void;
  onLeaveRoom: () => void;
}

export const WaitingLobbyModal: React.FC<WaitingLobbyModalProps> = ({
  roomCode,
  seats,
  waitingPlayers,
  onlinePlayers = [],
  isLandscapeMode = false,
  myClientId,
  myName,
  myAvatarId,
  myCustomPhoto,
  onToggleScreenOrientation,
  onLeaveRoom,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(roomSync.isConnected);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    roomSync.requestOnlinePlayersDiscovery();
    return roomSync.subscribeConnection((conn) => setIsConnected(conn));
  }, []);

  const handleSendJoinRequest = useCallback(() => {
    if (!roomCode) return;
    const cleanRoomCode = String(roomCode).trim();
    const activeClientId = myClientId || roomSync.myClientId;

    roomSync.publish({
      type: 'JOIN_REQUEST',
      roomCode: cleanRoomCode,
      senderId: activeClientId,
      player: {
        name: myName || 'لاعب جديد',
        team: 'A',
        avatarId: myAvatarId,
        customPhoto: myCustomPhoto,
        isHuman: true,
        clientId: activeClientId,
      },
      timestamp: Date.now(),
    });

    roomSync.publish({
      type: 'SYNC_REQUEST',
      roomCode: cleanRoomCode,
      senderId: activeClientId,
      timestamp: Date.now(),
    });
  }, [roomCode, myClientId, myName, myAvatarId, myCustomPhoto]);

  useEffect(() => {
    handleSendJoinRequest();
    const announceTimer = setInterval(() => {
      handleSendJoinRequest();
    }, 2500);
    return () => clearInterval(announceTimer);
  }, [handleSendJoinRequest]);

  // مقعد اللاعب الحالي إذا كان مسكّناً
  const assignedSeatIdx = seats.findIndex(
    (s) => !s.isVacant && s.clientId && (s.clientId === myClientId || s.clientId === roomSync.myClientId)
  );
  const isAssigned = assignedSeatIdx >= 0;

  const hostSeat = seats[0];
  const hostName = hostSeat?.name || 'المضيف';

  const shareLink =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?room=${roomCode}` : '';
  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `حياك طاولتنا الخاصة في كوت بو ستة أونو 🃏🇰🇼\nرقم الطاولة: ${roomCode}\nأو ادخل مباشرة من الرابط:\n${shareLink}`
  )}`;

  const handleCopyCode = () => {
    soundEngine.playCardSlide();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${roomCode}`).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClaimSeat = (targetSeatIdx: number) => {
    if (targetSeatIdx === 0 || targetSeatIdx === assignedSeatIdx) return;
    soundEngine.playCardSlide();
    const activeClientId = myClientId || roomSync.myClientId;
    roomSync.publish({
      type: 'CLAIM_SEAT',
      roomCode: String(roomCode).trim(),
      senderId: activeClientId,
      seatIndex: targetSeatIdx,
      player: {
        name: myName || 'لاعب',
        team: targetSeatIdx % 2 === 0 ? 'A' : 'B',
        avatarId: myAvatarId,
        customPhoto: myCustomPhoto,
        isHuman: true,
        clientId: activeClientId,
      },
      timestamp: Date.now(),
    });
  };

  const handleInviteOnlinePlayer = (player: OnlinePlayer) => {
    soundEngine.playBidTone(false);
    roomSync.sendTableInvite({
      roomCode,
      hostClientId: myClientId || roomSync.myClientId,
      hostName: myName,
      hostAvatarId: myAvatarId,
      hostCustomPhoto: myCustomPhoto,
      targetClientId: player.clientId,
    });
    setInvitedMap((prev) => ({ ...prev, [player.clientId]: true }));
    setTimeout(() => {
      setInvitedMap((prev) => ({ ...prev, [player.clientId]: false }));
    }, 6000);
  };

  const renderSeatCard = (idx: number, teamType: 'blue' | 'red') => {
    const seat = seats[idx];
    const isMe = idx === assignedSeatIdx;
    const isHostSeat = idx === 0;
    const isVacant = !seat || seat.isVacant || !seat.name || seat.name.trim() === '';
    const canSitHere = !isHostSeat && !isMe && (isVacant || !seat.isHuman);

    const cardBorder = isMe
      ? teamType === 'blue'
        ? 'bg-blue-950/90 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
        : 'bg-rose-950/90 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
      : canSitHere
      ? 'bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-emerald-400 cursor-pointer'
      : 'bg-slate-950/90 border border-slate-800';

    return (
      <div
        key={idx}
        onClick={() => {
          if (canSitHere) handleClaimSeat(idx);
        }}
        className={`rounded-xl flex flex-col items-center justify-between transition-all ${
          isLandscapeMode ? 'p-1.5 gap-1' : 'p-1.5 xs:p-2 gap-1.5'
        } ${cardBorder}`}
      >
        <div className="w-full flex items-center justify-between px-0.5 leading-none">
          <span className="text-[9px] xs:text-[10px] font-black text-slate-400 font-mono">
            مقعد {idx + 1}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              teamType === 'blue' ? 'bg-blue-500 shadow-[0_0_6px_#3b82f6]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
            }`}
          />
        </div>

        <div
          className={`rounded-full overflow-hidden border-2 flex items-center justify-center transition shrink-0 ${
            isLandscapeMode
              ? 'w-9 h-9 sm:w-10 sm:h-10'
              : 'w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12'
          } ${
            isMe
              ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-900'
              : isHostSeat
              ? 'border-amber-400/80 bg-slate-900'
              : isVacant
              ? 'border-dashed border-slate-600 bg-slate-900/60'
              : seat.isHuman
              ? 'border-emerald-400 bg-slate-900'
              : 'border-cyan-500/50 bg-slate-900'
          }`}
        >
          {isVacant ? (
            <span className="text-slate-400 text-xs xs:text-sm font-black">+</span>
          ) : (
            <AvatarView avatarId={seat.avatarId} customPhoto={seat.customPhoto} />
          )}
        </div>

        <div className="text-center w-full px-0.5 min-h-[26px] flex flex-col items-center justify-center leading-tight">
          {!isVacant ? (
            <>
              <span className="text-[10px] xs:text-[11px] font-black text-white truncate max-w-full block">
                {seat.name}
              </span>
              <span
                className={`text-[8px] font-bold mt-0.5 ${
                  isMe
                    ? 'text-amber-300'
                    : isHostSeat
                    ? 'text-amber-300'
                    : seat.isHuman
                    ? 'text-emerald-300'
                    : 'text-cyan-300'
                }`}
              >
                {isMe ? 'أنت ✓' : isHostSeat ? 'المضيف 👑' : seat.isHuman ? 'لاعب 👤' : 'بوت 🤖'}
              </span>
            </>
          ) : (
            <span className="text-[9px] text-slate-400 font-bold">مقعد فارغ</span>
          )}
        </div>

        <div className="w-full pt-1 border-t border-slate-800/80">
          {isMe ? (
            <div className="w-full py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[8.5px] font-black text-center">
              مقعدك الحالي ✓
            </div>
          ) : canSitHere ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClaimSeat(idx);
              }}
              className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[8.5px] font-black active:scale-95 transition cursor-pointer shadow"
            >
              اجلس هنا 💺
            </button>
          ) : (
            <div className="w-full py-1 bg-slate-900 text-slate-500 rounded-lg text-[8px] font-bold text-center">
              {isHostSeat ? 'مقعد المضيف 👑' : 'محجوز 👤'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-1.5 xs:p-2 sm:p-3 select-none overflow-hidden">
      <div
        className={`bg-slate-900 border-2 border-indigo-500/70 rounded-2xl sm:rounded-3xl w-full text-center shadow-2xl max-h-full overflow-y-auto no-scrollbar flex flex-col ${
          isLandscapeMode ? 'max-w-4xl p-2 sm:p-3 gap-1.5' : 'max-w-xl p-2.5 xs:p-3 sm:p-4 gap-2'
        }`}
      >
        {/* 1. Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🃏</span>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs xs:text-sm sm:text-base font-black text-white">
                  طاولة ({hostName}) الخاصة
                </h3>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleScreenOrientation && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCardSlide();
                  onToggleScreenOrientation();
                }}
                className={`px-2 py-1 rounded-xl flex items-center gap-1 text-[10px] font-bold border transition active:scale-95 cursor-pointer ${
                  isLandscapeMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                    : 'bg-slate-800 text-amber-300 border-slate-700'
                }`}
              >
                <span>🔄</span>
                <span>{isLandscapeMode ? 'أفقي' : 'رأسي'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundEngine.playPassTone();
                onLeaveRoom();
              }}
              className="text-amber-400 hover:text-amber-300 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer font-bold flex items-center gap-1"
            >
              <YellowDoorIcon className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* 2. Top Info & Invite Bar */}
        <div
          className={`grid gap-1.5 ${
            isLandscapeMode ? 'grid-cols-12 items-stretch' : 'grid-cols-1'
          }`}
        >
          <div
            className={`bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 ${
              isLandscapeMode ? 'col-span-5' : ''
            }`}
          >
            <div className="text-right">
              <span className="text-[8.5px] text-slate-400 block font-bold">رقم الطاولة:</span>
              <span className="font-mono font-black text-lg xs:text-xl text-amber-400 tracking-widest leading-none">
                {roomCode}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyCode}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition active:scale-95 cursor-pointer ${
                  copiedCode
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                }`}
              >
                {copiedCode ? 'تم النسخ ✅' : '📋 نسخ الرقم'}
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundEngine.playCardSlide()}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black transition active:scale-95 cursor-pointer flex items-center gap-1 no-underline shadow"
              >
                <span>واتساب</span>
                <span>💬</span>
              </a>
            </div>
          </div>

          <div
            className={`bg-slate-950 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 flex flex-col justify-center text-right ${
              isLandscapeMode ? 'col-span-7' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] xs:text-[11px] font-black text-emerald-300">
                  المتواجدون في اللعبة ({onlinePlayers.length})
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold">
                {isAssigned
                  ? `مقعدك: #${assignedSeatIdx + 1} (${assignedSeatIdx % 2 === 0 ? 'الأزرق 🔵' : 'الأحمر 🔴'})`
                  : 'اضغط على أي مقعد فارغ للجلوس 💺'}
              </span>
            </div>

            {onlinePlayers.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {onlinePlayers.map((op) => {
                  const isInMyRoom =
                    seats.some((s) => !s.isVacant && s.clientId === op.clientId) ||
                    waitingPlayers.some((w) => w.clientId === op.clientId) ||
                    op.roomCode === roomCode;
                  const isInvited = invitedMap[op.clientId];

                  return (
                    <div
                      key={op.clientId}
                      className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 shrink-0"
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-emerald-400/60 bg-slate-950 shrink-0">
                        <AvatarView avatarId={op.avatarId} customPhoto={op.customPhoto} />
                      </div>
                      <span className="text-[9.5px] font-black text-white max-w-[70px] truncate">
                        {op.name}
                      </span>
                      {isInMyRoom ? (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-lg font-bold">
                          بالطاولة ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isInvited}
                          onClick={() => handleInviteOnlinePlayer(op)}
                          className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black transition active:scale-95 cursor-pointer ${
                            isInvited ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isInvited ? 'تمت الدعوة ✅' : '+ دعوة'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[9.5px] text-slate-400 py-0.5">
                اختر مقعدك وفريقك بالضغط على أي كرسي متاح بالأسفل
              </div>
            )}
          </div>
        </div>

        {/* 3. Visual 6-Seat Selection (Blue Team 🔵 vs Red Team 🔴) */}
        <div
          className={`grid gap-2 ${
            isLandscapeMode ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Team Blue */}
          <div className="p-2 rounded-2xl bg-blue-950/35 border-2 border-blue-500/40 text-right">
            <div className="flex items-center justify-between text-xs font-black text-blue-400 mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_#3b82f6]" />
                <span>الفريق الأزرق</span>
              </span>
              <span className="text-[9.5px] text-blue-300/80 font-bold">
                {[0, 2, 4].filter((i) => !seats[i]?.isVacant).length} / 3
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 2, 4].map((idx) => renderSeatCard(idx, 'blue'))}
            </div>
          </div>

          {/* Team Red */}
          <div className="p-2 rounded-2xl bg-rose-950/35 border-2 border-rose-500/40 text-right">
            <div className="flex items-center justify-between text-xs font-black text-rose-400 mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_#f43f5e]" />
                <span>الفريق الأحمر</span>
              </span>
              <span className="text-[9.5px] text-rose-300/80 font-bold">
                {[1, 3, 5].filter((i) => !seats[i]?.isVacant).length} / 3
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 3, 5].map((idx) => renderSeatCard(idx, 'red'))}
            </div>
          </div>
        </div>

        {/* 4. Status Footer */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-right">
            <span className="text-base animate-pulse">{isAssigned ? '✅' : '💺'}</span>
            <span className="text-[11px] font-black text-slate-200">
              {isAssigned
                ? `أنت جالس في مقعد #${assignedSeatIdx + 1} — بانتظار ضغط (${hostName}) على ابدأ اللعب`
                : 'اضغط "اجلس هنا 💺" على أي مقعد فارغ لاختيار مكانك وفريقك'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
