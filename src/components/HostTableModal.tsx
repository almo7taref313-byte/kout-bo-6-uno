import React, { useState, useEffect, useCallback } from 'react';
import { OnlinePlayer, SeatConfig, WaitingPlayer } from '../types';
import { AvatarView } from '../utils/avatars';
import { roomSync, RoomSyncMessage } from '../utils/roomSync';
import { soundEngine } from '../utils/soundEngine';

interface HostTableModalProps {
  roomCode: string;
  seats: SeatConfig[];
  currentHumanSeatIndex: number;
  isHost?: boolean;
  waitingPlayers: WaitingPlayer[];
  onlinePlayers?: OnlinePlayer[];
  isLandscapeMode?: boolean;
  hostClientId: string;
  hostName: string;
  hostAvatarId: string;
  hostCustomPhoto: string | null;
  leaveAlert?: string | null;
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
  onToggleScreenOrientation?: () => void;
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
  onlinePlayers = [],
  isLandscapeMode = false,
  hostClientId,
  hostName,
  hostAvatarId,
  hostCustomPhoto,
  leaveAlert,
  onRegenerateCode,
  onSitInSeat,
  onAssignWaitingPlayerToSeat,
  onSwapSeats,
  onConvertToBot,
  onVacateSeat,
  onFillAllWithBots,
  onVacateAllSeats,
  onToggleScreenOrientation,
  onStartGame,
  onClose,
}) => {
  const [selectedWaitingPlayer, setSelectedWaitingPlayer] = useState<WaitingPlayer | null>(null);
  const [swapSourceSeatIdx, setSwapSourceSeatIdx] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(roomSync.isConnected);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [invitedMap, setInvitedMap] = useState<Record<string, 'sent' | 'accepted' | 'declined'>>({});
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  useEffect(() => {
    roomSync.requestOnlinePlayersDiscovery();
    return roomSync.subscribeConnection((conn) => setIsConnected(conn));
  }, []);

  // تلقائياً حدد أول لاعب في الانتظار لتسهيل التسكين بضغطة واحدة على المقعد
  useEffect(() => {
    if (waitingPlayers.length > 0) {
      if (!selectedWaitingPlayer || !waitingPlayers.some((w) => w.clientId === selectedWaitingPlayer.clientId)) {
        setSelectedWaitingPlayer(waitingPlayers[0]);
      }
    } else {
      setSelectedWaitingPlayer(null);
    }
  }, [waitingPlayers, selectedWaitingPlayer]);

  // الاستماع لرد اللاعبين المدعوين (قبول أو رفض)
  useEffect(() => {
    return roomSync.subscribeInvites(
      () => {},
      (res) => {
        if (res.roomCode === roomCode) {
          setInvitedMap((prev) => ({
            ...prev,
            [res.senderId]: res.accepted ? 'accepted' : 'declined',
          }));
          if (res.accepted) {
            soundEngine.playBidTone(false);
            setInviteFeedback(`✅ ${res.senderName} قبل الدعوة وانضم للطاولة!`);
          } else {
            soundEngine.playPassTone();
            setInviteFeedback(`❌ ${res.senderName} اعتذر عن الانضمام حالياً`);
          }
          setTimeout(() => setInviteFeedback(null), 3500);
        }
      }
    );
  }, [roomCode]);

  // بث حالة الغرفة والمقاعد الحالية لجميع الأجهزة المتصلة
  const broadcastCurrentRoomState = useCallback(() => {
    if (!roomCode) return;
    const filledCount = seats.filter((s) => !s.isVacant && s.name && s.name.trim() !== '').length;
    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: hostClientId || roomSync.myClientId,
      seats,
      waitingPlayers,
      vacantCount: 6 - filledCount,
      timestamp: Date.now(),
    });
  }, [roomCode, seats, waitingPlayers, hostClientId]);

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = roomSync.subscribeRoom(roomCode, (msg: RoomSyncMessage) => {
      if (msg.type === 'SYNC_REQUEST' && msg.senderId !== roomSync.myClientId && msg.senderId !== hostClientId) {
        broadcastCurrentRoomState();
      }
    });
    return () => unsubscribe();
  }, [roomCode, broadcastCurrentRoomState, hostClientId]);

  useEffect(() => {
    broadcastCurrentRoomState();
  }, [seats, waitingPlayers, broadcastCurrentRoomState]);

  const filledSeats = seats.filter((s) => !s.isVacant && s.name && s.name.trim() !== '');
  const vacantCount = 6 - filledSeats.length;

  const shareLink =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?room=${roomCode}` : '';
  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `حياك طاولتي الخاصة في كوت بو ستة أونو 🃏🇰🇼\nرقم الطاولة: ${roomCode}\nأو ادخل مباشرة من الرابط:\n${shareLink}`
  )}`;

  const handleCopyCodeAndLink = () => {
    soundEngine.playCardSlide();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${roomCode}`).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInviteOnlinePlayer = (player: OnlinePlayer) => {
    soundEngine.playBidTone(false);
    roomSync.sendTableInvite({
      roomCode,
      hostClientId,
      hostName,
      hostAvatarId,
      hostCustomPhoto,
      targetClientId: player.clientId,
    });
    setInvitedMap((prev) => ({ ...prev, [player.clientId]: 'sent' }));
    setTimeout(() => {
      setInvitedMap((prev) => {
        if (prev[player.clientId] === 'sent') {
          const next = { ...prev };
          delete next[player.clientId];
          return next;
        }
        return prev;
      });
    }, 8000);
  };

  const handleSeatTap = (idx: number) => {
    // 1. إذا كان وضع التبديل مفعلاً، بدّل المقعدين فوراً
    if (swapSourceSeatIdx !== null) {
      if (swapSourceSeatIdx === idx) {
        setSwapSourceSeatIdx(null);
      } else {
        onSwapSeats(swapSourceSeatIdx, idx);
        setSwapSourceSeatIdx(null);
      }
      return;
    }

    // 2. إذا كان هناك لاعب محدد في قائمة الانتظار، سكّنه في هذا المقعد فوراً (ما عدا مقعد المضيف الحالي)
    if (selectedWaitingPlayer && idx !== currentHumanSeatIndex) {
      onAssignWaitingPlayerToSeat(selectedWaitingPlayer, idx);
      return;
    }

    // 3. إذا كان المقعد شاغراً وضغط عليه المضيف، ينتقل المضيف للجلوس فيه (تغيير فريقه/مكانه)
    const seat = seats[idx];
    const isVacant = seat.isVacant || !seat.name || seat.name.trim() === '';
    if (isVacant && idx !== currentHumanSeatIndex) {
      soundEngine.playCardSlide();
      onSitInSeat(idx);
    }
  };

  const renderSeatCard = (idx: number, teamType: 'blue' | 'red') => {
    const seat = seats[idx];
    const isMySeat = idx === currentHumanSeatIndex;
    const isVacant = seat.isVacant || !seat.name || seat.name.trim() === '';
    const isSwapSelected = swapSourceSeatIdx === idx;
    const isSwapTarget = swapSourceSeatIdx !== null && swapSourceSeatIdx !== idx;
    const canAssignWaiting = Boolean(selectedWaitingPlayer && idx !== currentHumanSeatIndex);

    const cardBorder = isSwapSelected
      ? 'border-2 border-amber-400 bg-amber-950/50 ring-2 ring-amber-400/50'
      : isSwapTarget
      ? 'border-2 border-dashed border-indigo-400 bg-indigo-950/40 cursor-pointer hover:bg-indigo-900/50'
      : canAssignWaiting && isVacant
      ? 'border-2 border-dashed border-emerald-400 bg-emerald-950/30 cursor-pointer hover:bg-emerald-900/40'
      : isMySeat
      ? teamType === 'blue'
        ? 'bg-blue-950/85 border-2 border-blue-400 shadow-md'
        : 'bg-rose-950/85 border-2 border-rose-400 shadow-md'
      : isVacant
      ? 'bg-slate-950/55 border-2 border-dashed border-slate-700/80 hover:border-slate-500'
      : 'bg-slate-950/90 border border-slate-700/90';

    return (
      <div
        key={idx}
        onClick={() => {
          if (isSwapTarget || (canAssignWaiting && isVacant)) {
            handleSeatTap(idx);
          }
        }}
        className={`rounded-xl flex flex-col items-center justify-between transition-all ${
          isLandscapeMode ? 'p-1.5 gap-1' : 'p-1.5 xs:p-2 gap-1.5'
        } ${cardBorder}`}
      >
        {/* Top Row: Seat Number & Team Badge */}
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

        {/* Avatar Circle (Matching TableArena sizes) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleSeatTap(idx);
          }}
          className={`rounded-full overflow-hidden border-2 flex items-center justify-center transition cursor-pointer shrink-0 ${
            isLandscapeMode
              ? 'w-9 h-9 sm:w-10 sm:h-10'
              : 'w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12'
          } ${
            isMySeat
              ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-900'
              : isVacant
              ? 'border-dashed border-slate-600 bg-slate-900/60 hover:border-amber-400/70'
              : seat.isHuman
              ? 'border-emerald-400 ring-1 ring-emerald-400/40 bg-slate-900'
              : 'border-cyan-500/50 bg-slate-900'
          }`}
        >
          {isVacant ? (
            <span className="text-slate-400 text-xs xs:text-sm font-black">+</span>
          ) : (
            <AvatarView avatarId={seat.avatarId} customPhoto={seat.customPhoto} />
          )}
        </div>

        {/* Player Name & Role Tag */}
        <div className="text-center w-full px-0.5 min-h-[26px] flex flex-col items-center justify-center leading-tight">
          {!isVacant ? (
            <>
              <span className="text-[10px] xs:text-[11px] font-black text-white truncate max-w-full block">
                {seat.name}
              </span>
              <span
                className={`text-[8px] font-bold mt-0.5 ${
                  isMySeat
                    ? 'text-amber-300'
                    : seat.isHuman
                    ? 'text-emerald-300'
                    : 'text-cyan-300'
                }`}
              >
                {isMySeat ? 'أنت (المضيف 👑)' : seat.isHuman ? 'لاعب 👤' : 'بوت 🤖'}
              </span>
            </>
          ) : (
            <span className="text-[9px] text-slate-400 font-bold">
              {canAssignWaiting ? `تسكين ${selectedWaitingPlayer?.name}` : 'مقعد فارغ'}
            </span>
          )}
        </div>

        {/* Simple 1-Tap Controls */}
        <div
          className="w-full flex flex-col gap-1 pt-1 border-t border-slate-800/80"
          onClick={(e) => e.stopPropagation()}
        >
          {isSwapTarget ? (
            <button
              type="button"
              onClick={() => handleSeatTap(idx)}
              className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black active:scale-95 transition cursor-pointer"
            >
              انقل هنا 🔄
            </button>
          ) : isMySeat ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCardSlide();
                setSwapSourceSeatIdx(isSwapSelected ? null : idx);
              }}
              className={`w-full py-1 rounded-lg text-[8.5px] font-black transition active:scale-95 cursor-pointer ${
                isSwapSelected
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isSwapSelected ? 'اختر مقعداً آخر...' : 'تغيير مكاني 🔄'}
            </button>
          ) : isVacant ? (
            canAssignWaiting ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedWaitingPlayer) {
                    onAssignWaitingPlayerToSeat(selectedWaitingPlayer, idx);
                  }
                }}
                className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[8.5px] font-black active:scale-95 transition cursor-pointer shadow"
              >
                تسكين {selectedWaitingPlayer?.name} ✓
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-1 w-full">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playCardSlide();
                    onSitInSeat(idx);
                  }}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="انتقل للجلوس في هذا المقعد"
                >
                  اجلس 💺
                </button>
                <button
                  type="button"
                  onClick={() => onConvertToBot(idx)}
                  className="py-1 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-[8px] font-bold active:scale-95 transition cursor-pointer"
                  title="إضافة بوت ذكي"
                >
                  + بوت 🤖
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-1 w-full">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCardSlide();
                  setSwapSourceSeatIdx(isSwapSelected ? null : idx);
                }}
                className={`py-1 rounded-lg text-[8px] font-bold active:scale-95 transition cursor-pointer border ${
                  isSwapSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-500/40'
                }`}
              >
                {isSwapSelected ? 'إلغاء' : 'تبديل 🔄'}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPassTone();
                  onVacateSeat(idx);
                }}
                className="py-1 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 rounded-lg text-[8px] font-bold active:scale-95 transition cursor-pointer"
              >
                إخلاء ✕
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-1.5 xs:p-2 sm:p-3 select-none overflow-hidden">
      <div
        className={`bg-slate-900 border-2 border-amber-500/70 rounded-2xl sm:rounded-3xl w-full text-center shadow-2xl max-h-full overflow-y-auto no-scrollbar flex flex-col ${
          isLandscapeMode ? 'max-w-4xl p-2 sm:p-3 gap-1.5' : 'max-w-xl p-2.5 xs:p-3 sm:p-4 gap-2'
        }`}
      >
        {/* 1. Compact Header Bar + Live Player Counter + Orientation Toggle */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">👑</span>
            <div className="text-right">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs xs:text-sm sm:text-base font-black text-amber-400">
                  طاولة خاصة مع الأصدقاء
                </h3>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                  title={isConnected ? 'متصل بالسيرفر' : 'جاري الاتصال'}
                />
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-amber-500/40 text-[10px] font-black text-amber-300 font-mono">
                  اللاعبون بالطاولة: {filledSeats.length + waitingPlayers.length} / 6
                </span>
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
                title="تغيير وضعية الشاشة (أفقي / رأسي)"
              >
                <span>🔄</span>
                <span>{isLandscapeMode ? 'أفقي' : 'رأسي'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundEngine.playPassTone();
                onClose();
              }}
              className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-lg font-bold active:scale-90 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Instant Player Leave Alert Banner */}
        {leaveAlert && (
          <div className="bg-rose-950/90 border-2 border-rose-500/80 rounded-xl px-3 py-1.5 flex items-center justify-center gap-2 text-rose-200 text-xs font-black shadow-lg animate-pulse">
            <span>🚪</span>
            <span>{leaveAlert}</span>
          </div>
        )}

        {/* 2. Three Invite Methods Bar: 4-Digit Code + Copy + WhatsApp + Online Players */}
        <div
          className={`grid gap-1.5 ${
            isLandscapeMode ? 'grid-cols-12 items-stretch' : 'grid-cols-1'
          }`}
        >
          {/* Method A & B: 4-Digit Code & WhatsApp Share */}
          <div
            className={`bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 ${
              isLandscapeMode ? 'col-span-5' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[8.5px] text-slate-400 block font-bold">رقم الطاولة (4 أرقام):</span>
                <span className="font-mono font-black text-lg xs:text-xl text-amber-400 tracking-widest leading-none">
                  {roomCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCardSlide();
                  onRegenerateCode();
                }}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[10px] border border-slate-800 transition active:scale-95 cursor-pointer"
                title="تغيير رقم الطاولة"
              >
                🔄
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyCodeAndLink}
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

          {/* Method C: Live Online Players in Game (قائمة المتواجدين أونلاين) */}
          <div
            className={`bg-slate-950 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 flex flex-col justify-center text-right ${
              isLandscapeMode ? 'col-span-7' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] xs:text-[11px] font-black text-emerald-300">
                  المتواجدون في اللعبة الآن ({onlinePlayers.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCardSlide();
                  roomSync.requestOnlinePlayersDiscovery();
                }}
                className="text-[9px] text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                تحديث 🔄
              </button>
            </div>

            {inviteFeedback && (
              <div className="mb-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-400/40 text-[10px] font-bold text-amber-300 text-center">
                {inviteFeedback}
              </div>
            )}

            {onlinePlayers.length === 0 ? (
              <div className="text-[9.5px] text-slate-400 py-1 text-center">
                أي لاعب يفتح اللعبة سيظهر اسمه هنا فوراً لدعوته بضغطة زر
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {onlinePlayers.map((op) => {
                  const isAlreadySeated = seats.some(
                    (s) => !s.isVacant && s.clientId === op.clientId
                  );
                  const isInWaiting = waitingPlayers.some((w) => w.clientId === op.clientId);
                  const isInMyRoom = isAlreadySeated || isInWaiting || op.roomCode === roomCode;
                  const invStatus = invitedMap[op.clientId];

                  return (
                    <div
                      key={op.clientId}
                      className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 shrink-0"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-emerald-400/60 bg-slate-950 shrink-0">
                        <AvatarView avatarId={op.avatarId} customPhoto={op.customPhoto} />
                      </div>
                      <span className="text-[10px] font-black text-white max-w-[75px] truncate">
                        {op.name}
                      </span>
                      {isInMyRoom ? (
                        <span className="text-[8.5px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-lg font-bold">
                          بالطاولة ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={invStatus === 'sent'}
                          onClick={() => handleInviteOnlinePlayer(op)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black transition active:scale-95 cursor-pointer ${
                            invStatus === 'sent'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : invStatus === 'accepted'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                          }`}
                        >
                          {invStatus === 'sent'
                            ? 'أُرسلت ⏳'
                            : invStatus === 'accepted'
                            ? 'انضم ✅'
                            : '+ دعوة'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Waiting Players Strip (Only visible when someone entered and hasn't picked a seat yet) */}
        {waitingPlayers.length > 0 && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">👋</span>
              <span className="text-[10.5px] font-black text-emerald-300">
                دخلوا الطاولة ({waitingPlayers.length}) — اضغط على أي مقعد لتسكينهم:
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {waitingPlayers.map((wp) => {
                const isSelected = selectedWaitingPlayer?.clientId === wp.clientId;
                return (
                  <button
                    key={wp.clientId}
                    type="button"
                    onClick={() => {
                      soundEngine.playCardSlide();
                      setSelectedWaitingPlayer(wp);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black transition cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/50'
                        : 'bg-slate-900 text-slate-200 border-slate-700'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                      <AvatarView avatarId={wp.avatarId} customPhoto={wp.customPhoto} />
                    </div>
                    <span>{wp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Visual 6-Seat Teams Grid (Blue Team 🔵 vs Red Team 🔴) */}
        <div
          className={`grid gap-2 ${
            isLandscapeMode ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Team Blue (Seats 1, 3, 5 -> indices 0, 2, 4) */}
          <div className="p-2 rounded-2xl bg-blue-950/35 border-2 border-blue-500/40 text-right">
            <div className="flex items-center justify-between text-xs font-black text-blue-400 mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_#3b82f6]" />
                <span>الفريق الأزرق</span>
              </span>
              <span className="text-[9.5px] text-blue-300/80 font-bold">
                {[0, 2, 4].filter((i) => !seats[i].isVacant).length} / 3
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 2, 4].map((idx) => renderSeatCard(idx, 'blue'))}
            </div>
          </div>

          {/* Team Red (Seats 2, 4, 6 -> indices 1, 3, 5) */}
          <div className="p-2 rounded-2xl bg-rose-950/35 border-2 border-rose-500/40 text-right">
            <div className="flex items-center justify-between text-xs font-black text-rose-400 mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_#f43f5e]" />
                <span>الفريق الأحمر</span>
              </span>
              <span className="text-[9.5px] text-rose-300/80 font-bold">
                {[1, 3, 5].filter((i) => !seats[i].isVacant).length} / 3
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 3, 5].map((idx) => renderSeatCard(idx, 'red'))}
            </div>
          </div>
        </div>

        {/* 5. Bottom Action Bar: Quick Bot Fill & Start Match */}
        <div className="flex items-center gap-2 pt-0.5">
          {vacantCount > 0 ? (
            <button
              type="button"
              onClick={onFillAllWithBots}
              className="px-3 py-3 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-2xl text-xs font-black active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>🤖</span>
              <span>إكمال ببوتات ({vacantCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playPassTone();
                onVacateAllSeats();
              }}
              className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl text-xs font-bold active:scale-95 transition cursor-pointer shrink-0"
            >
              تفريغ الطاولة 🗑️
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playBidTone(true);
              onStartGame();
            }}
            className="flex-1 py-3 sm:py-3.5 btn-glow-green text-white font-black rounded-2xl text-sm xs:text-base sm:text-lg shadow-2xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
          >
            <span>⚡</span>
            <span>ابدأ اللعب الآن 🃏</span>
          </button>
        </div>
      </div>
    </div>
  );
};
