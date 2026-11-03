import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BidRecord,
  CalloutMessage,
  Card,
  GamePhase,
  OnlinePlayer,
  Player,
  SeatConfig,
  SuitColor,
  TableInvite,
  TrickPlay,
  WaitingPlayer,
} from './types';
import {
  buildDeck,
  calculateBotBid,
  evaluateTrickWinner,
  getTimeoutFallbackMove,
  isLegalMove,
  selectBotBestTrump,
  selectBotMove,
  sortHandCards,
  SUIT_COLORS,
  getMatchTargetAndStatus,
  MatchTargetScore,
  getEffectiveLeadColor,
  BotStrategyContext,
  TURN_TIMER_DURATION,
  computeNextRoundDealer,
} from './utils/gameLogic';
import { soundEngine } from './utils/soundEngine';
import { usePWAInstall } from './utils/usePWAInstall';
import { nativeBridge } from './utils/nativeBridge';

// Components
import { ScoreBoard } from './components/ScoreBoard';
import { TableArena } from './components/TableArena';
import { PlayerHand } from './components/PlayerHand';
import { LobbyScreen } from './components/LobbyScreen';
import { BiddingModal } from './components/BiddingModal';
import { HostTableModal } from './components/HostTableModal';
import { EditSeatModal } from './components/EditSeatModal';
import { ProfileModal } from './components/ProfileModal';
import { RulesModal } from './components/RulesModal';
import { InstallModal } from './components/InstallModal';
import { ScreenModeModal } from './components/ScreenModeModal';
import { RoomsModal } from './components/RoomsModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { WaitingLobbyModal } from './components/WaitingLobbyModal';
import { MatchOverModal } from './components/MatchOverModal';
import { roomSync, RoomSyncMessage } from './utils/roomSync';
import { AvatarView, getBotNameForAvatar } from './utils/avatars';

const getOrCreateDeviceId = (): string => {
  try {
    let id = localStorage.getItem('kout_persistent_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('kout_persistent_device_id', id);
    }
    return id;
  } catch {
    return roomSync.myClientId;
  }
};

const DEFAULT_BOT_PROFILES = [
  { name: 'بواحمد', avatarId: 'kuwaiti_ghutra_white' },
  { name: 'السلم', avatarId: 'kuwaiti_shemagh_red' },
  { name: 'جابر', avatarId: 'kuwaiti_gahfiya' },
  { name: 'عبود', avatarId: 'kuwaiti_dishdasha_plain' },
  { name: 'بدر', avatarId: 'kuwaiti_gahfiya_glasses' },
  { name: 'بوسكندر', avatarId: 'kuwaiti_winter_ghutra' },
];

const getBotProfileForSeat = (seatIdx: number, humanAvatarId?: string, humanCustomPhoto?: string | null) => {
  const baseProfile = DEFAULT_BOT_PROFILES[seatIdx] || DEFAULT_BOT_PROFILES[1];
  if (!humanCustomPhoto && humanAvatarId && baseProfile.avatarId === humanAvatarId && seatIdx !== 0) {
    return {
      avatarId: 'kuwaiti_ghutra_white',
      name: getBotNameForAvatar('kuwaiti_ghutra_white'),
    };
  }
  return {
    avatarId: baseProfile.avatarId,
    name: getBotNameForAvatar(baseProfile.avatarId),
  };
};

const DEFAULT_SEATS: SeatConfig[] = [
  { id: 0, name: 'أنت', team: 'A', avatarId: 'kuwaiti_ghutra_white', customPhoto: null, isHuman: true, isVacant: false },
  { id: 1, name: 'السلم', team: 'B', avatarId: 'kuwaiti_shemagh_red', customPhoto: null, isHuman: false, isVacant: false },
  { id: 2, name: 'جابر', team: 'A', avatarId: 'kuwaiti_gahfiya', customPhoto: null, isHuman: false, isVacant: false },
  { id: 3, name: 'عبود', team: 'B', avatarId: 'kuwaiti_dishdasha_plain', customPhoto: null, isHuman: false, isVacant: false },
  { id: 4, name: 'بدر', team: 'A', avatarId: 'kuwaiti_gahfiya_glasses', customPhoto: null, isHuman: false, isVacant: false },
  { id: 5, name: 'بوسكندر', team: 'B', avatarId: 'kuwaiti_winter_ghutra', customPhoto: null, isHuman: false, isVacant: false },
];

const createVacantPrivateSeats = (hostName: string, hostAvatar: string, hostPhoto: string | null, hostDeviceId: string): SeatConfig[] => {
  return [0, 1, 2, 3, 4, 5].map((idx) => {
    if (idx === 0) {
      return {
        id: 0,
        name: hostName || 'منشئ الغرفة 👑',
        team: 'A',
        avatarId: hostAvatar || 'kuwaiti_ghutra_white',
        customPhoto: hostPhoto || null,
        isHuman: true,
        isVacant: false,
        clientId: hostDeviceId,
      };
    }
    const botProf = getBotProfileForSeat(idx, hostAvatar, hostPhoto);
    return {
      id: idx,
      name: '',
      team: idx % 2 === 0 ? 'A' : 'B',
      avatarId: botProf.avatarId,
      customPhoto: null,
      isHuman: false,
      isVacant: true,
    };
  });
};

export default function App() {
  const [deviceId] = useState<string>(getOrCreateDeviceId);

  // User profile (persisted permanently in localStorage)
  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem('kout_user_name');
    if (saved === 'بدور') {
      localStorage.setItem('kout_user_name', 'بدر');
      return 'بدر';
    }
    return saved || 'أنت (اللاعب)';
  });
  const [userAvatar, setUserAvatar] = useState<string>(
    () => localStorage.getItem('kout_user_avatar') || 'kuwaiti_ghutra_white'
  );
  const [userCustomPhoto, setUserCustomPhoto] = useState<string | null>(
    () => localStorage.getItem('kout_custom_photo') || null
  );

  // Room
  const [roomCode, setRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    return r && r.length === 4 ? r : String(Math.floor(1000 + Math.random() * 9000));
  });
  const [isRoomHost, setIsRoomHost] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return !Boolean(params.get('room'));
  });
  const [isMultiplayerActive, setIsMultiplayerActive] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    return Boolean(r && r.length === 4);
  });
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<TableInvite | null>(null);
  const [roomLeaveNotice, setRoomLeaveNotice] = useState<string | null>(null);
  const roomLeaveNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSeatReserved, setLastSeatReserved] = useState<{
    seatIndex: number;
    name: string;
    team: string;
    avatarId?: string;
    customPhoto?: string | null;
  } | null>(null);

  const showRoomLeaveNotice = useCallback((text: string) => {
    if (roomLeaveNoticeTimerRef.current) {
      clearTimeout(roomLeaveNoticeTimerRef.current);
    }
    setRoomLeaveNotice(text);
    roomLeaveNoticeTimerRef.current = setTimeout(() => {
      setRoomLeaveNotice(null);
      roomLeaveNoticeTimerRef.current = null;
    }, 4200);
  }, []);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Seats & Players
  const [seats, setSeats] = useState<SeatConfig[]>(() => {
    const savedAv = localStorage.getItem('kout_user_avatar') || 'kuwaiti_ghutra_white';
    const savedPh = localStorage.getItem('kout_custom_photo') || null;
    const rawSavedName = localStorage.getItem('kout_user_name');
    const savedName = rawSavedName === 'بدور' ? 'بدر' : (rawSavedName || 'أنت');
    const s: SeatConfig[] = JSON.parse(JSON.stringify(DEFAULT_SEATS));
    s[0].name = savedName;
    s[0].avatarId = savedAv;
    s[0].customPhoto = savedPh;
    s[0].clientId = getOrCreateDeviceId();
    for (let i = 1; i < 6; i++) {
      const botProf = getBotProfileForSeat(i, savedAv, savedPh);
      s[i].avatarId = botProf.avatarId;
      s[i].name = botProf.name === 'بدور' ? 'بدر' : botProf.name;
    }
    return s;
  });
  const [currentHumanSeatIndex, setCurrentHumanSeatIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>(() => {
    const savedAv = localStorage.getItem('kout_user_avatar') || 'kuwaiti_ghutra_white';
    const savedPh = localStorage.getItem('kout_custom_photo') || null;
    const rawSavedName = localStorage.getItem('kout_user_name');
    const savedName = rawSavedName === 'بدور' ? 'بدر' : (rawSavedName || 'أنت');
    return [0, 1, 2, 3, 4, 5].map((idx) => {
      const isUser = idx === 0;
      const defBot = getBotProfileForSeat(idx, savedAv, savedPh);
      const botName = defBot.name === 'بدور' ? 'بدر' : defBot.name;
      return {
        id: idx,
        name: isUser ? savedName : botName,
        team: idx % 2 === 0 ? 'A' : 'B',
        isHuman: isUser,
        isVacant: false,
        hand: [],
        avatarId: isUser ? savedAv : defBot.avatarId,
        customPhoto: isUser ? savedPh : null,
      };
    });
  });

  // Game Engine State
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [dealerIdx, setDealerIdx] = useState<number>(0);
  const [matchScoreTeamA, setMatchScoreTeamA] = useState<number>(0);
  const [matchScoreTeamB, setMatchScoreTeamB] = useState<number>(0);
  const [matchTargetScore, setMatchTargetScore] = useState<MatchTargetScore>(() => {
    const saved = Number(localStorage.getItem('kout_match_target_score'));
    if (saved === 26 || saved === 51 || saved === 101) return saved;
    return 101;
  });
  const [tricksTeamA, setTricksTeamA] = useState<number>(0);
  const [tricksTeamB, setTricksTeamB] = useState<number>(0);

  // Bidding & Trump
  const [highestBid, setHighestBid] = useState<number>(4);
  const [bidWinner, setBidWinner] = useState<number | null>(null);
  const [isForcedBid, setIsForcedBid] = useState<boolean>(false);
  const [biddingHistory, setBiddingHistory] = useState<BidRecord[]>([]);
  const [trumpColor, setTrumpColor] = useState<SuitColor | null>(null);

  // Turn & Trick
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [currentTrick, setCurrentTrick] = useState<TrickPlay[]>([]);
  const [playedTricksInRound, setPlayedTricksInRound] = useState<TrickPlay[][]>([]);
  const [collectingWinnerId, setCollectingWinnerId] = useState<number | null>(null);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [timerRemaining, setTimerRemaining] = useState<number>(TURN_TIMER_DURATION);
  const [currentDealingTeam, setCurrentDealingTeam] = useState<'A' | 'B'>('A');
  const [lastDealerTeamA, setLastDealerTeamA] = useState<number>(4);
  const [lastDealerTeamB, setLastDealerTeamB] = useState<number>(5);

  // Kuwaiti Callouts Banner
  const [callout, setCallout] = useState<CalloutMessage | null>(null);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showRoomsModal, setShowRoomsModal] = useState<boolean>(false);
  const [showHostModal, setShowHostModal] = useState<boolean>(false);
  const [editingSeatIndex, setEditingSeatIndex] = useState<number | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [showScreenModal, setShowScreenModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // PWA Install Hook
  const { isInstallable, install: triggerPWAInstall } = usePWAInstall();

  const handleOpenInstall = async () => {
    if (isInstallable) {
      await triggerPWAInstall();
    } else {
      setShowInstallModal(true);
    }
  };

  // Timer Ref & Active Game Timeouts Registry (to prevent background callbacks from re-entering the table after Exit)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;
  const currentTrickRef = useRef<TrickPlay[]>(currentTrick);
  currentTrickRef.current = currentTrick;
  const isTrickResolvingRef = useRef<boolean>(false);
  const lastPlayedTurnKeyRef = useRef<string>('');
  const lastTimeoutTurnKeyRef = useRef<string>('');
  const lastTickSecondRef = useRef<number>(-1);

  const scheduleGameTimeout = useCallback((fn: () => void, delayMs: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      gameTimeoutsRef.current = gameTimeoutsRef.current.filter((t) => t !== id);
      if (phaseRef.current === 'LOBBY') return;
      fn();
    }, delayMs);
    gameTimeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllGameTimeouts = useCallback(() => {
    gameTimeoutsRef.current.forEach((id) => clearTimeout(id));
    gameTimeoutsRef.current = [];
  }, []);

  const isAllHumanGame =
    isMultiplayerActive &&
    ((seats.length === 6 && seats.every((s) => s.isHuman && !s.isVacant)) ||
      (players.length === 6 && players.every((p) => p.isHuman)));

  // دالة عرض الرسائل: محصورة فقط بالرسائل المحددة (كفو شباب / راحت عليكم) ومتزامنة بالميلي ثانية مع بداية ونهاية صوت الاحتفال
  const calloutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showCallout = useCallback((text: string, emoji = '📢', durationMs = 2400) => {
    const isAllowedMessage = text.includes('كفو شباب') || text.includes('راحت عليكم');
    if (!isAllowedMessage) return;

    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }

    setCallout({ text, emoji, timestamp: Date.now() });
    calloutTimerRef.current = setTimeout(() => {
      setCallout(null);
      if (text.includes('كفو شباب')) {
        soundEngine.stopApplause();
      }
      calloutTimerRef.current = null;
    }, durationMs);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
  };

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    lastTickSecondRef.current = -1;
  }, []);

  const exitToLobbyCleanly = useCallback(() => {
    if (isMultiplayerActive && roomCode) {
      roomSync.publish({
        type: 'LEAVE_ROOM',
        roomCode,
        senderId: deviceId,
        playerName: userName,
        timestamp: Date.now(),
      });
    }
    phaseRef.current = 'LOBBY';
    isTrickResolvingRef.current = false;
    currentTrickRef.current = [];
    lastPlayedTurnKeyRef.current = '';
    lastTimeoutTurnKeyRef.current = '';
    stopTimer();
    clearAllGameTimeouts();
    soundEngine.stopApplause();
    setIsActionPending(false);
    setCollectingWinnerId(null);
    setCurrentTrick([]);
    setShowExitConfirm(false);
    setIsMultiplayerActive(false);
    setIsRoomHost(true);
    setWaitingPlayers([]);
    setCurrentHumanSeatIndex(0);
    setPhase('LOBBY');
  }, [clearAllGameTimeouts, deviceId, isMultiplayerActive, roomCode, stopTimer, userName]);

  const startTimer = useCallback(() => {
    stopTimer();
    const allHumans =
      (seats.length === 6 && seats.every((s) => s.isHuman && !s.isVacant)) ||
      (players.length === 6 && players.every((p) => p.isHuman));
    if (isMultiplayerActive && allHumans) {
      setTimerRemaining(0);
      return;
    }

    lastTickSecondRef.current = TURN_TIMER_DURATION + 1;
    setTimerRemaining(TURN_TIMER_DURATION);

    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 0.25) {
          stopTimer();
          return 0;
        }
        const nextVal = Math.max(0, Number((prev - 0.2).toFixed(2)));
        const wholeSec = Math.ceil(nextVal);
        if (wholeSec < lastTickSecondRef.current && wholeSec >= 1 && wholeSec <= TURN_TIMER_DURATION) {
          lastTickSecondRef.current = wholeSec;
          if (wholeSec <= 5) {
            soundEngine.playTimerTick(wholeSec);
          }
        }
        return nextVal;
      });
    }, 200);
  }, [isMultiplayerActive, players, seats, stopTimer]);

  const startNewRound = useCallback(
    (deckOverride?: Card[], forcedDealerIdx?: number, seatsOverride?: SeatConfig[], humanSeatOverride?: number) => {
      stopTimer();
      soundEngine.stopApplause();
      isTrickResolvingRef.current = false;
      currentTrickRef.current = [];
      lastPlayedTurnKeyRef.current = '';
      lastTimeoutTurnKeyRef.current = '';
      setIsActionPending(false);

      const activeDealer = forcedDealerIdx !== undefined ? forcedDealerIdx : dealerIdx;
      setDealerIdx(activeDealer);

      const activeSeats = seatsOverride || seats;
      const activeHumanSeat = humanSeatOverride !== undefined ? humanSeatOverride : currentHumanSeatIndex;
      const deck = deckOverride || buildDeck();
      const savedName = localStorage.getItem('kout_user_name') || userName;
      const savedAvatar = localStorage.getItem('kout_user_avatar') || userAvatar;
      const savedPhoto = localStorage.getItem('kout_custom_photo') || userCustomPhoto;

      const freshPlayers: Player[] = activeSeats.map((seatCfg, idx) => {
        const isMe = idx === activeHumanSeat;
        const isHumanPlayer = Boolean(seatCfg.isHuman || isMe);
        const defBot = getBotProfileForSeat(idx, savedAvatar, savedPhoto);
        const resolvedAvatarId = isMe
          ? savedAvatar
          : isHumanPlayer
          ? (seatCfg.avatarId || defBot.avatarId)
          : (seatCfg.avatarId || defBot.avatarId);
        const resolvedName = isMe
          ? savedName
          : isHumanPlayer
          ? (seatCfg.name && seatCfg.name.trim() !== '' ? seatCfg.name : `لاعب ${idx + 1}`)
          : (seatCfg.name && seatCfg.name.trim() !== '' ? seatCfg.name : getBotNameForAvatar(resolvedAvatarId));
        return {
          ...seatCfg,
          name: resolvedName,
          avatarId: resolvedAvatarId,
          customPhoto: isMe ? savedPhoto : seatCfg.customPhoto,
          isHuman: isHumanPlayer,
          isVacant: false,
          hand: sortHandCards(deck.slice(idx * 9, (idx + 1) * 9), null),
        };
      });

      setPlayers(freshPlayers);
      setTrumpColor(null);
      setBidWinner(null);
      setHighestBid(4);
      setIsForcedBid(false);
      setBiddingHistory([]);
      setCurrentTrick([]);
      setPlayedTricksInRound([]);
      setCollectingWinnerId(null);
      setTricksTeamA(0);
      setTricksTeamB(0);

      const firstBidder = (activeDealer + 1) % 6;
      setCurrentTurn(firstBidder);
      setPhase('BIDDING');
      startTimer();
    },
    [currentHumanSeatIndex, dealerIdx, seats, startTimer, stopTimer, userAvatar, userCustomPhoto, userName]
  );

  const startNewMatch = useCallback(() => {
    setMatchScoreTeamA(0);
    setMatchScoreTeamB(0);
    setRoundNumber(1);
    const randDealer = Math.floor(Math.random() * 6);
    setDealerIdx(randDealer);
    const initialDealingTeam = randDealer % 2 === 0 ? 'A' : 'B';
    setCurrentDealingTeam(initialDealingTeam);
    if (randDealer % 2 === 0) {
      setLastDealerTeamA(randDealer);
      setLastDealerTeamB(5);
    } else {
      setLastDealerTeamB(randDealer);
      setLastDealerTeamA(4);
    }
    startNewRound(undefined, randDealer);
  }, [startNewRound]);

  const messageHandlerRef = useRef<(msg: RoomSyncMessage) => void>(() => {});

  const handleJoinRoomWaiting = useCallback(
    (code: string) => {
      setRoomCode(code);
      setIsRoomHost(false);
      setIsMultiplayerActive(true);
      setShowHostModal(false);
      setCurrentHumanSeatIndex(-1);

      roomSync.subscribeRoom(code, (msg) => {
        messageHandlerRef.current(msg);
      });

      const myActiveId = getOrCreateDeviceId();

      roomSync.publish({
        type: 'JOIN_REQUEST',
        roomCode: code,
        senderId: myActiveId,
        player: {
          name: userName,
          team: 'A',
          avatarId: userAvatar,
          customPhoto: userCustomPhoto,
          isHuman: true,
          clientId: myActiveId,
        },
        timestamp: Date.now(),
      });

      roomSync.publish({
        type: 'SYNC_REQUEST',
        roomCode: code,
        senderId: myActiveId,
        timestamp: Date.now(),
      });

      soundEngine.playCardSlide();
    },
    [userAvatar, userCustomPhoto, userName]
  );

  const handleLeaveRoom = useCallback(() => {
    roomSync.publish({
      type: 'LEAVE_ROOM',
      roomCode,
      senderId: deviceId,
      playerName: userName,
      timestamp: Date.now(),
    });
    setIsMultiplayerActive(false);
    setIsRoomHost(true);
    setWaitingPlayers([]);
    setCurrentHumanSeatIndex(0);
  }, [deviceId, roomCode, userName]);

  // Choose Trump Color
  const chooseTrumpColor = useCallback(
    (color: SuitColor, winnerId?: number, isFromRemote = false) => {
      stopTimer();
      setTrumpColor(color);
      setPhase('PLAYING');

      const winner = winnerId !== undefined ? winnerId : bidWinner !== null ? bidWinner : currentHumanSeatIndex;
      setCurrentTurn(winner);
      setIsActionPending(false);

      soundEngine.playCardSlide();

      if (isMultiplayerActive && !isFromRemote) {
        roomSync.publish({
          type: 'TRUMP_CHOSEN',
          roomCode,
          senderId: deviceId,
          color,
          playerId: winner,
          timestamp: Date.now(),
        });
      }

      startTimer();
    },
    [bidWinner, currentHumanSeatIndex, deviceId, isMultiplayerActive, roomCode, startTimer, stopTimer]
  );

  // Bidding resolution
  const submitBid = useCallback(
    (playerId: number, val: number, forced = false, isFromRemote = false) => {
      stopTimer();
      setTimerRemaining(TURN_TIMER_DURATION);

      let effectiveVal = val;
      const isDealerForced = forced || (playerId === dealerIdx && highestBid <= 4 && val === 0);
      if (isDealerForced) {
        effectiveVal = 5;
        setIsForcedBid(true);
      } else if (effectiveVal > highestBid) {
        setIsForcedBid(false);
      }

      if (effectiveVal === 0) {
        soundEngine.playRandomSkipVoice();
      } else if (effectiveVal === 9) {
        soundEngine.playBidTone(true);
      } else {
        soundEngine.playBidTone(false);
      }

      const nextBids = [...biddingHistory, { playerId, val: effectiveVal }];
      setBiddingHistory(nextBids);

      let newHighest = highestBid;
      let newWinner = bidWinner;

      if (effectiveVal > highestBid) {
        newHighest = effectiveVal;
        newWinner = playerId;
        setHighestBid(effectiveVal);
        setBidWinner(playerId);
      }

      if (isMultiplayerActive && !isFromRemote) {
        roomSync.publish({
          type: 'PLAYER_BID',
          roomCode,
          senderId: deviceId,
          playerId,
          val: effectiveVal,
          forced: isDealerForced,
          timestamp: Date.now(),
        });
      }

      if (effectiveVal === 9) {
        stopTimer();
        setBidWinner(playerId);
        setHighestBid(9);
        setCurrentTurn(playerId);
        setPhase('CHOOSE_TRUMP');

        const buyer = players[playerId];
        if (buyer && !buyer.isHuman && (!isMultiplayerActive || isRoomHost)) {
          scheduleGameTimeout(() => {
            const bestCol = selectBotBestTrump(buyer.hand);
            chooseTrumpColor(bestCol, playerId);
          }, 900);
        } else {
          startTimer();
        }
        return;
      }

      const historyLength = nextBids.length;
      if (historyLength === 6) {
        scheduleGameTimeout(() => {
          if (newWinner === null) {
            setIsForcedBid(true);
            setHighestBid(5);
            setBidWinner(dealerIdx);
            setCurrentTurn(dealerIdx);
            const dealer = players[dealerIdx];

            setPhase('CHOOSE_TRUMP');
            if (dealer && !dealer.isHuman && (!isMultiplayerActive || isRoomHost)) {
              const bestCol = selectBotBestTrump(dealer.hand);
              chooseTrumpColor(bestCol, dealerIdx);
            } else {
              startTimer();
            }
          } else {
            const buyer = players[newWinner];
            setCurrentTurn(newWinner);
            setPhase('CHOOSE_TRUMP');
            if (buyer && !buyer.isHuman && (!isMultiplayerActive || isRoomHost)) {
              const bestCol = selectBotBestTrump(buyer.hand);
              chooseTrumpColor(bestCol, newWinner);
            } else {
              startTimer();
            }
          }
        }, 1400);
      } else {
        const nextTurn = (currentTurn + 1) % 6;
        setCurrentTurn(nextTurn);
        startTimer();
      }
    },
    [biddingHistory, bidWinner, chooseTrumpColor, currentTurn, dealerIdx, deviceId, highestBid, isMultiplayerActive, isRoomHost, matchScoreTeamA, matchScoreTeamB, players, roomCode, scheduleGameTimeout, startTimer, stopTimer]
  );

  // Bot bidding automation
  useEffect(() => {
    if (phase !== 'BIDDING') return;
    if (highestBid >= 9) return;

    const bot = players[currentTurn];
    if (!bot) return;

    if (bot.isHuman) return;
    if (isMultiplayerActive && !isRoomHost) return;

    const botTimer = scheduleGameTimeout(() => {
      let bidVal = 0;
      let isForced = false;
      const isFirstBidder = bot.id === (dealerIdx + 1) % 6;
      if (bot.id === dealerIdx && highestBid <= 4) {
        // User Rule:
        // "اذا كان هو الديلر(الموزع)والكل طاف وكان يريد ان يختار ٥ التي خسارتها ١٠ نقاط فليختار ملزوم لان خسارتها ٥ نقاط"
        const estBid = calculateBotBid(bot.hand, 4, false, roundNumber);
        if (estBid >= 6) {
          bidVal = estBid;
          isForced = false;
        } else {
          // If estBid is 5 (or <= 5), choose الملزوم (forced 5) because its loss penalty is only 5 points instead of 10!
          bidVal = 5;
          isForced = true;
        }
      } else {
        bidVal = calculateBotBid(bot.hand, highestBid, isFirstBidder, roundNumber);
      }
      submitBid(bot.id, bidVal, isForced);
    }, 1700);

    return () => clearTimeout(botTimer);
  }, [currentTurn, dealerIdx, highestBid, isMultiplayerActive, isRoomHost, phase, players, roundNumber, scheduleGameTimeout, submitBid]);

  // Bot trump selection automation (handles bots & human players replaced by bots mid-turn)
  useEffect(() => {
    if (phase !== 'CHOOSE_TRUMP') return;
    if (trumpColor !== null) return;

    const targetId = bidWinner !== null ? bidWinner : currentTurn;
    const selector = players[targetId];
    if (!selector || selector.isHuman) return;
    if (isMultiplayerActive && !isRoomHost) return;

    const trumpTimer = scheduleGameTimeout(() => {
      if (phaseRef.current !== 'CHOOSE_TRUMP') return;
      const bestCol = selectBotBestTrump(selector.hand);
      chooseTrumpColor(bestCol, targetId);
    }, 850);

    return () => clearTimeout(trumpTimer);
  }, [bidWinner, chooseTrumpColor, currentTurn, isMultiplayerActive, isRoomHost, phase, players, scheduleGameTimeout, trumpColor]);

  // Next Round / Next Match Handler
  const handleNextRoundOrMatch = useCallback((scoreA?: number, scoreB?: number) => {
    const curScoreA = scoreA !== undefined ? scoreA : matchScoreTeamA;
    const curScoreB = scoreB !== undefined ? scoreB : matchScoreTeamB;

    const isBaoon = highestBid === 9;
    const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
    const buyerTricks = buyerPlayer ? (buyerPlayer.team === 'A' ? tricksTeamA : tricksTeamB) : 0;
    const prevBothHadFiveOrMore = curScoreA >= 5 && curScoreB >= 5;
    const isAsamFirstRound =
      !prevBothHadFiveOrMore &&
      isBaoon &&
      buyerTricks >= 9 &&
      roundNumber === 1 &&
      (buyerPlayer ? (buyerPlayer.team === 'A' ? curScoreB === 0 : curScoreA === 0) : false);
    const matchStatus = getMatchTargetAndStatus(curScoreA, curScoreB, matchTargetScore);
    const isMatchOver = matchStatus.isMatchOver || isAsamFirstRound;

    if (isMatchOver) {
      stopTimer();
      setPhase('MATCH_OVER');
      soundEngine.playMatchWinCelebration();
      nativeBridge.hapticVictory();
      return;
    }

    if (isMultiplayerActive && !isRoomHost) {
      return;
    }

    {
      const nextR = roundNumber + 1;
      const curDealingTeam = currentDealingTeam || (dealerIdx % 2 === 0 ? 'A' : 'B');
      const { nextDealingTeam, nextDealer, newLastDealerTeamA, newLastDealerTeamB } = computeNextRoundDealer(
        curScoreA,
        curScoreB,
        curDealingTeam,
        lastDealerTeamA,
        lastDealerTeamB
      );

      setCurrentDealingTeam(nextDealingTeam);
      setLastDealerTeamA(newLastDealerTeamA);
      setLastDealerTeamB(newLastDealerTeamB);
      setRoundNumber(nextR);
      setDealerIdx(nextDealer);

      if (isMultiplayerActive) {
        const sharedDeck = buildDeck();
        roomSync.publish({
          type: 'NEW_ROUND',
          roomCode,
          senderId: deviceId,
          roundNumber: nextR,
          dealerIdx: nextDealer,
          deck: sharedDeck,
          scores: { a: curScoreA, b: curScoreB },
          timestamp: Date.now(),
        });
        startNewRound(sharedDeck, nextDealer);
      } else {
        startNewRound(undefined, nextDealer);
      }
    }
  }, [bidWinner, currentDealingTeam, dealerIdx, deviceId, highestBid, isMultiplayerActive, isRoomHost, lastDealerTeamA, lastDealerTeamB, matchScoreTeamA, matchScoreTeamB, matchTargetScore, players, roomCode, roundNumber, seats, startNewMatch, startNewRound, stopTimer, tricksTeamA, tricksTeamB]);

  // Round Completion logic
  const handleRoundFinish = useCallback(
    (buyerIsWinner: boolean, curTricksA: number, curTricksB: number) => {
      stopTimer();
      isTrickResolvingRef.current = false;
      currentTrickRef.current = [];
      setPhase('ROUND_END');

      const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
      const buyerTeam = buyerPlayer.team;
      const isBaoon = highestBid === 9;
      const pts = isBaoon ? 36 : highestBid;

      let defensePts = 0;
      if (isBaoon) {
        defensePts = 18;
      } else if (isForcedBid) {
        defensePts = 5;
      } else {
        defensePts = highestBid * 2;
      }

      let nextScoreA = matchScoreTeamA;
      let nextScoreB = matchScoreTeamB;

      if (buyerIsWinner) {
        if (buyerTeam === 'A') nextScoreA += pts;
        else nextScoreB += pts;
      } else {
        if (buyerTeam === 'A') nextScoreB += defensePts;
        else nextScoreA += defensePts;
      }

      setMatchScoreTeamA(nextScoreA);
      setMatchScoreTeamB(nextScoreB);

      const isFirstRoundBaoonWin = isBaoon && buyerIsWinner && roundNumber === 1;
      const matchStatus = getMatchTargetAndStatus(nextScoreA, nextScoreB, matchTargetScore);
      if (matchStatus.isMatchOver || isFirstRoundBaoonWin) {
        if (!buyerIsWinner && isBaoon) {
          soundEngine.playBaoonLossVoice();
          showCallout('راحت عليكم! 😅👎', '💔');
          nativeBridge.hapticTrickWin();
          scheduleGameTimeout(() => {
            setPhase('MATCH_OVER');
            soundEngine.playMatchWinCelebration();
            nativeBridge.hapticVictory();
          }, 2900);
          return;
        }
        setPhase('MATCH_OVER');
        soundEngine.playMatchWinCelebration();
        nativeBridge.hapticVictory();
        return;
      }

      // تشغيل رسالة التشويق وصوت التصفيق حين يفوز الفريق الحاكم بالجولة، وحين يخسر تظهر الرسالة الأخرى
      if (buyerIsWinner) {
        soundEngine.playCheeringAndWhistle(2400);
        showCallout('كفو شباب! 👏🎉', '👑');
        nativeBridge.hapticVictory();
      } else {
        if (isBaoon) {
          soundEngine.playBaoonLossVoice();
        } else {
          soundEngine.playSadTromboneMock();
        }
        showCallout('راحت عليكم! 😅👎', '💔');
        nativeBridge.hapticTrickWin();
      }

      // الانتقال للجولة الجديدة بعد 2.9 ثانية (بعد توقف صوت التصفيق والرسالة بـ 500ms تماماً وقبل ظهور أوراق المزايدة)
      scheduleGameTimeout(() => {
        handleNextRoundOrMatch(nextScoreA, nextScoreB);
      }, 2900);
    },
    [bidWinner, currentHumanSeatIndex, handleNextRoundOrMatch, highestBid, isForcedBid, matchScoreTeamA, matchScoreTeamB, matchTargetScore, players, roundNumber, scheduleGameTimeout, showCallout, stopTimer]
  );

  // Trick Resolution
  const resolveTrick = useCallback(
    (trick: TrickPlay[], precomputedWinnerId?: number, finalTricksA?: number, finalTricksB?: number) => {
      const winnerId = precomputedWinnerId !== undefined ? precomputedWinnerId : evaluateTrickWinner(trick, trumpColor, highestBid);
      const winnerPlayer = players[winnerId];

      const nextA = finalTricksA !== undefined ? finalTricksA : (winnerPlayer && winnerPlayer.team === 'A' ? tricksTeamA + 1 : tricksTeamA);
      const nextB = finalTricksB !== undefined ? finalTricksB : (winnerPlayer && winnerPlayer.team === 'B' ? tricksTeamB + 1 : tricksTeamB);

      setTricksTeamA(nextA);
      setTricksTeamB(nextB);

      currentTrickRef.current = [];
      isTrickResolvingRef.current = false;
      setCurrentTrick([]);
      setPlayedTricksInRound((prev) => [...prev, trick]);
      setCollectingWinnerId(null);

      const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
      const buyerTeam = buyerPlayer ? buyerPlayer.team : 'A';
      const target = highestBid;
      const buyerTricks = buyerTeam === 'A' ? nextA : nextB;
      const oppTricks = buyerTeam === 'A' ? nextB : nextA;

      if (buyerTricks >= target) {
        handleRoundFinish(true, nextA, nextB);
        return;
      }
      if (9 - oppTricks < target) {
        handleRoundFinish(false, nextA, nextB);
        return;
      }

      if (nextA + nextB === 9) {
        handleRoundFinish(buyerTricks >= target, nextA, nextB);
        return;
      }

      setCurrentTurn(winnerId);
      setIsActionPending(false);
      startTimer();
    },
    [bidWinner, currentHumanSeatIndex, handleRoundFinish, highestBid, players, startTimer, tricksTeamA, tricksTeamB, trumpColor]
  );

  // Card play action
  const handlePlayCard = useCallback(
    (playerId: number, card: Card, isFromRemote = false) => {
      if (phaseRef.current !== 'PLAYING') return;
      if (isTrickResolvingRef.current) return;
      if (collectingWinnerId !== null) return;

      const activeTrick = currentTrickRef.current;
      if (activeTrick.length >= 6) {
        return;
      }

      if (activeTrick.some((tp) => tp.playerId === playerId)) {
        return;
      }

      const expectedTrickIndex = playedTricksInRound.length;
      const playTurnKey = `${roundNumber}-${expectedTrickIndex}-${playerId}`;
      if (lastPlayedTurnKeyRef.current === playTurnKey) {
        return;
      }

      const playingPlayer = players[playerId];
      // حماية صارمة: منع رمي أكثر من ورقة واحدة للاعب في نفس الأكلة تحت أي ظرف (يجب أن يمتلك اللاعب 9 - expectedTrickIndex أوراق قبل الرمي)
      if (!isFromRemote && playingPlayer && playingPlayer.hand.length <= 8 - expectedTrickIndex) {
        return;
      }

      lastPlayedTurnKeyRef.current = playTurnKey;
      stopTimer();
      setTimerRemaining(TURN_TIMER_DURATION);

      if (card.isJoker || card.rank === 'wild_draw4') {
        soundEngine.playCardThrow();
        soundEngine.playJokerVoice();
      } else if (card.isMaker || card.rank === 'wild_color') {
        soundEngine.playCardThrow();
        soundEngine.playMakerVoice();
      } else {
        soundEngine.playCardThrow();
      }

      if (playerId === currentHumanSeatIndex) {
        nativeBridge.hapticCardPlay();
      }

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === playerId) {
            if (!isFromRemote && p.hand.length <= 8 - expectedTrickIndex) {
              return p;
            }
            let removed = false;
            return {
              ...p,
              hand: p.hand.filter((c) => {
                if (!removed && (c.id === card.id || (c.color === card.color && c.rank === card.rank))) {
                  removed = true;
                  return false;
                }
                return true;
              }),
            };
          }
          return p;
        })
      );

      const nextTrick = [...activeTrick, { playerId, card }];
      currentTrickRef.current = nextTrick;
      setCurrentTrick(nextTrick);

      if (isMultiplayerActive && !isFromRemote) {
        roomSync.publish({
          type: 'CARD_PLAYED',
          roomCode,
          senderId: deviceId,
          playerId,
          card,
          timestamp: Date.now(),
        });
      }

      const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
      const buyerTeam = buyerPlayer ? buyerPlayer.team : 'A';
      const isOpponentJokerInBaoon =
        highestBid === 9 &&
        Boolean(card.isJoker || card.rank === 'wild_draw4') &&
        Boolean(playingPlayer && playingPlayer.team !== buyerTeam);

      // في حال الباون: بمجرد أن يرمي الخصم الجيكر تتوقف الجولة فوراً ولا يكمل باقي اللاعبين رمي الأوراق، وتبدأ جولة جديدة
      if (isOpponentJokerInBaoon) {
        isTrickResolvingRef.current = true;
        setIsActionPending(true);
        const winnerId = playerId;
        const winnerPlayer = playingPlayer;

        scheduleGameTimeout(() => {
          soundEngine.playTrickSweep();
          setCollectingWinnerId(winnerId);

          let updatedTricksA = tricksTeamA;
          let updatedTricksB = tricksTeamB;
          if (winnerPlayer && winnerPlayer.team === 'A') {
            updatedTricksA = tricksTeamA + 1;
            setTricksTeamA(updatedTricksA);
          } else {
            updatedTricksB = tricksTeamB + 1;
            setTricksTeamB(updatedTricksB);
          }

          if (winnerPlayer && winnerPlayer.team === (players[currentHumanSeatIndex]?.team || 'A')) {
            nativeBridge.hapticTrickWin();
          }

          scheduleGameTimeout(() => {
            resolveTrick(nextTrick, winnerId, updatedTricksA, updatedTricksB);
          }, 950);
        }, 1150);
        return;
      }

      // عند اكتمال الأوراق الست للأكلة
      if (nextTrick.length === 6) {
        isTrickResolvingRef.current = true;
        setIsActionPending(true);
        const winnerId = evaluateTrickWinner(nextTrick, trumpColor, highestBid);
        const winnerPlayer = players[winnerId];

        scheduleGameTimeout(() => {
          soundEngine.playTrickSweep();
          setCollectingWinnerId(winnerId);

          // مع بدء تحرك الأكلة: يتغير عداد الأكلات مباشرة بالتزامن لحظة انطلاق حركة الكروت
          let updatedTricksA = tricksTeamA;
          let updatedTricksB = tricksTeamB;
          if (winnerPlayer && winnerPlayer.team === 'A') {
            updatedTricksA = tricksTeamA + 1;
            setTricksTeamA(updatedTricksA);
          } else {
            updatedTricksB = tricksTeamB + 1;
            setTricksTeamB(updatedTricksB);
          }

          if (winnerPlayer && winnerPlayer.team === (players[currentHumanSeatIndex]?.team || 'A')) {
            nativeBridge.hapticTrickWin();
          }

          scheduleGameTimeout(() => {
            resolveTrick(nextTrick, winnerId, updatedTricksA, updatedTricksB);
          }, 1400);
        }, 1600);
      } else {
        const nextTurn = (playerId + 1) % 6;
        setCurrentTurn(nextTurn);
        setIsActionPending(false);
        startTimer();
      }
    },
    [bidWinner, collectingWinnerId, currentHumanSeatIndex, deviceId, highestBid, isMultiplayerActive, playedTricksInRound.length, players, resolveTrick, roomCode, roundNumber, scheduleGameTimeout, startTimer, stopTimer, tricksTeamA, tricksTeamB, trumpColor]
  );

  // Human card click
  const handleHumanCardClick = (card: Card) => {
    if (phase !== 'PLAYING') return;
    if (isActionPending || isTrickResolvingRef.current || collectingWinnerId !== null) return;
    if (currentTurn !== currentHumanSeatIndex) return;
    if (currentTrick.length >= 6 || currentTrickRef.current.length >= 6) return;
    if (currentTrickRef.current.some((tp) => tp.playerId === currentHumanSeatIndex)) return;

    if (highestBid === 9 && currentTrick.length > 0) {
      const buyerTeam = bidWinner !== null ? players[bidWinner]?.team : 'A';
      const hasOpponentJoker = currentTrick.some(
        (tp) =>
          (tp.card.isJoker || tp.card.rank === 'wild_draw4') &&
          players[tp.playerId]?.team !== buyerTeam
      );
      if (hasOpponentJoker) return;
    }

    const me = players[currentHumanSeatIndex];
    if (!me) return;

    const isMeBuyer = bidWinner === currentHumanSeatIndex;
    const legalCards = me.hand.filter((c) =>
      isLegalMove(me.hand, c, currentTrick, highestBid, trumpColor, isMeBuyer)
    );

    // إذا كان بيد اللاعب كرت وحيد مسموح بلعبه، فإن لمس أي كرت في اليد يلعب ذلك الكرت الوحيد فوراً
    const targetCard =
      legalCards.length === 1
        ? legalCards[0]
        : isLegalMove(me.hand, card, currentTrick, highestBid, trumpColor, isMeBuyer)
        ? card
        : null;

    if (!targetCard) return;

    setIsActionPending(true);
    handlePlayCard(currentHumanSeatIndex, targetCard);
  };

  // لمس أي مكان في الطاولة أو منطقة اليد عندما يكون لدى اللاعب كرت وحيد قابل للعب
  const handleTableSingleCardTap = () => {
    if (phase !== 'PLAYING') return;
    if (isActionPending || isTrickResolvingRef.current || collectingWinnerId !== null) return;
    if (currentTurn !== currentHumanSeatIndex) return;
    if (currentTrick.length >= 6 || currentTrickRef.current.length >= 6) return;
    if (currentTrickRef.current.some((tp) => tp.playerId === currentHumanSeatIndex)) return;

    if (highestBid === 9 && currentTrick.length > 0) {
      const buyerTeam = bidWinner !== null ? players[bidWinner]?.team : 'A';
      const hasOpponentJoker = currentTrick.some(
        (tp) =>
          (tp.card.isJoker || tp.card.rank === 'wild_draw4') &&
          players[tp.playerId]?.team !== buyerTeam
      );
      if (hasOpponentJoker) return;
    }

    const me = players[currentHumanSeatIndex];
    if (!me || me.hand.length === 0) return;

    const isMeBuyer = bidWinner === currentHumanSeatIndex;
    const legalCards = me.hand.filter((c) =>
      isLegalMove(me.hand, c, currentTrick, highestBid, trumpColor, isMeBuyer)
    );

    if (legalCards.length === 1) {
      setIsActionPending(true);
      handlePlayCard(currentHumanSeatIndex, legalCards[0]);
    }
  };

  // اللعب التلقائي الذكي إذا كان بيد اللاعب البشري كرت وحيد فقط مسموح بلعبه قانونياً
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    if (isActionPending || isTrickResolvingRef.current || collectingWinnerId !== null) return;
    if (currentTurn !== currentHumanSeatIndex) return;
    if (currentTrick.length >= 6 || currentTrickRef.current.length >= 6) return;
    if (currentTrickRef.current.some((tp) => tp.playerId === currentHumanSeatIndex)) return;

    if (highestBid === 9 && currentTrick.length > 0) {
      const buyerTeam = bidWinner !== null ? players[bidWinner]?.team : 'A';
      const hasOpponentJoker = currentTrick.some(
        (tp) =>
          (tp.card.isJoker || tp.card.rank === 'wild_draw4') &&
          players[tp.playerId]?.team !== buyerTeam
      );
      if (hasOpponentJoker) return;
    }

    const me = players[currentHumanSeatIndex];
    if (!me || !me.isHuman || me.hand.length === 0) return;

    const isMeBuyer = bidWinner === currentHumanSeatIndex;
    const legalCards = me.hand.filter((c) =>
      isLegalMove(me.hand, c, currentTrick, highestBid, trumpColor, isMeBuyer)
    );

    if (legalCards.length !== 1) return;

    const singleCard = legalCards[0];
    const autoPlayTimer = scheduleGameTimeout(() => {
      if (isTrickResolvingRef.current) return;
      if (currentTrickRef.current.some((tp) => tp.playerId === currentHumanSeatIndex)) return;
      setIsActionPending(true);
      handlePlayCard(currentHumanSeatIndex, singleCard);
    }, 850);

    return () => clearTimeout(autoPlayTimer);
  }, [
    bidWinner,
    collectingWinnerId,
    currentHumanSeatIndex,
    currentTrick,
    currentTurn,
    handlePlayCard,
    highestBid,
    isActionPending,
    phase,
    players,
    scheduleGameTimeout,
    trumpColor,
  ]);

  // Bot card play automation
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    if (isActionPending || isTrickResolvingRef.current || collectingWinnerId !== null) return;
    if (currentTrick.length >= 6 || currentTrickRef.current.length >= 6) return;

    // إذا كان اللعب باون ورمى الخصم الجيكر، يتوقف اللعب فوراً ولا يرمي أي بوت ورقة إضافية
    if (highestBid === 9 && currentTrick.length > 0) {
      const buyerTeam = bidWinner !== null ? players[bidWinner]?.team : 'A';
      const hasOpponentJoker = currentTrick.some(
        (tp) =>
          (tp.card.isJoker || tp.card.rank === 'wild_draw4') &&
          players[tp.playerId]?.team !== buyerTeam
      );
      if (hasOpponentJoker) return;
    }

    const bot = players[currentTurn];
    if (!bot || bot.hand.length === 0) return;

    if (bot.isHuman) return;
    if (isMultiplayerActive && !isRoomHost) return;

    const botTimer = scheduleGameTimeout(() => {
      const context: BotStrategyContext = {
        buyerId: bidWinner,
        highestBid,
        playedTricks: playedTricksInRound,
        players,
        dealerIdx,
        roundNumber,
      };
      const move = selectBotMove(bot, currentTrick, trumpColor, context);
      handlePlayCard(bot.id, move);
    }, 1400);

    return () => clearTimeout(botTimer);
  }, [bidWinner, collectingWinnerId, currentTrick, currentTurn, dealerIdx, handlePlayCard, highestBid, isActionPending, isMultiplayerActive, isRoomHost, phase, playedTricksInRound, players, roundNumber, scheduleGameTimeout, trumpColor]);

  // Timeout handler for active turn
  useEffect(() => {
    if (phase === 'LOBBY' || phase === 'ROUND_END' || phase === 'MATCH_OVER') return;
    if (timerRemaining > 0) return;
    if (isActionPending || isTrickResolvingRef.current || collectingWinnerId !== null) return;

    if (isAllHumanGame) {
      return;
    }

    if (phase === 'PLAYING') {
      if (currentTrick.length >= 6 || currentTrickRef.current.length >= 6) return;
      if (currentTrickRef.current.some((tp) => tp.playerId === currentTurn)) return;

      if (highestBid === 9 && currentTrick.length > 0) {
        const buyerTeam = bidWinner !== null ? players[bidWinner]?.team : 'A';
        const hasOpponentJoker = currentTrick.some(
          (tp) =>
            (tp.card.isJoker || tp.card.rank === 'wild_draw4') &&
            players[tp.playerId]?.team !== buyerTeam
        );
        if (hasOpponentJoker) return;
      }
    }

    const cur = players[currentTurn];
    if (!cur) return;

    if (isMultiplayerActive) {
      if (cur.isHuman && currentTurn !== currentHumanSeatIndex) {
        return;
      }
      if (!cur.isHuman && !isRoomHost) {
        return;
      }
    }

    const timeoutTurnKey = `${roundNumber}-${phase}-${biddingHistory.length}-${playedTricksInRound.length}-${currentTrick.length}-${currentTurn}`;
    if (lastTimeoutTurnKeyRef.current === timeoutTurnKey) {
      return;
    }
    lastTimeoutTurnKeyRef.current = timeoutTurnKey;

    if (phase === 'BIDDING') {
      submitBid(currentTurn, 0);
    } else if (phase === 'CHOOSE_TRUMP') {
      const bestCol = selectBotBestTrump(cur.hand);
      chooseTrumpColor(bestCol, cur.id);
    } else if (phase === 'PLAYING') {
      if (cur.hand.length > 0 && cur.hand.length > 8 - playedTricksInRound.length) {
        // عند انتهاء الوقت يختار الكمبيوتر أفضل كرت حسب كامل أوامر وقواعد البوتات المعتمدة (selectBotMove)
        const context: BotStrategyContext = {
          buyerId: bidWinner,
          highestBid,
          playedTricks: playedTricksInRound,
          players,
          dealerIdx,
          roundNumber,
        };
        const chosen = selectBotMove(cur, currentTrick, trumpColor, context);
        handlePlayCard(cur.id, chosen);
      }
    }
  }, [biddingHistory.length, bidWinner, chooseTrumpColor, collectingWinnerId, currentHumanSeatIndex, currentTrick, currentTurn, dealerIdx, handlePlayCard, highestBid, isActionPending, isAllHumanGame, isMultiplayerActive, isRoomHost, phase, playedTricksInRound, players, roundNumber, submitBid, timerRemaining, trumpColor]);

  // معالج رسائل المزامنة
  messageHandlerRef.current = (msg: RoomSyncMessage) => {
    if (msg.senderId === deviceId || msg.senderId === roomSync.myClientId) return;

    switch (msg.type) {
      case 'JOIN_REQUEST': {
        const amIHost = isRoomHost || seats[0]?.clientId === deviceId;
        if (amIHost) {
          const joinerId = msg.player?.clientId || msg.senderId;
          if (!joinerId) return;

          const isSeated = seats.some((s) => !s.isVacant && s.clientId === joinerId);

          if (!isSeated) {
            let joinerName = msg.player?.name?.trim() || 'لاعب جديد';
            if (joinerName === userName) {
              joinerName = `${joinerName} (ضيف)`;
            }
            const joinerAvatar = msg.player?.avatarId || 'kuwaiti_shemagh_red';
            const joinerPhoto = msg.player?.customPhoto || null;

            // إذا كان هناك مقعد شاغر على الطاولة، يتم تسكين الصديق المنضم مباشرة في أول مقعد شاغر لراحته (مع قدرته على تغيير مقعده وفريقه بضغطة زر)
            const firstVacantIdx = seats.findIndex(
              (s, i) => i !== currentHumanSeatIndex && (s.isVacant || !s.name || s.name.trim() === '')
            );

            if (firstVacantIdx !== -1 && phase === 'LOBBY') {
              const nextSeats = [...seats];
              nextSeats[firstVacantIdx] = {
                id: firstVacantIdx,
                name: joinerName,
                team: firstVacantIdx % 2 === 0 ? 'A' : 'B',
                avatarId: joinerAvatar,
                customPhoto: joinerPhoto,
                isHuman: true,
                isVacant: false,
                clientId: joinerId,
              };
              const nextWaiting = waitingPlayers.filter((w) => w.clientId !== joinerId);
              setSeats(nextSeats);
              setWaitingPlayers(nextWaiting);
              soundEngine.playBidTone(false);

              const vCount = nextSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
              roomSync.publish({
                type: 'ROOM_STATE',
                roomCode,
                senderId: deviceId,
                seats: nextSeats,
                waitingPlayers: nextWaiting,
                vacantCount: vCount,
                timestamp: Date.now(),
              });
            } else {
              const newPlayer: WaitingPlayer = {
                clientId: joinerId,
                name: joinerName,
                avatarId: joinerAvatar,
                customPhoto: joinerPhoto,
                joinedAt: Date.now(),
              };

              setWaitingPlayers((prev) => {
                const idx = prev.findIndex((w) => w.clientId === joinerId);
                let nextList: WaitingPlayer[];
                if (idx !== -1) {
                  nextList = [...prev];
                  nextList[idx] = newPlayer;
                } else {
                  nextList = [...prev, newPlayer];
                  soundEngine.playBidTone(false);
                }

                const vCount = seats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;

                roomSync.publish({
                  type: 'ROOM_STATE',
                  roomCode,
                  senderId: deviceId,
                  seats,
                  waitingPlayers: nextList,
                  vacantCount: vCount,
                  timestamp: Date.now(),
                });

                return nextList;
              });
            }
          }
        }
        break;
      }

      case 'CLAIM_SEAT': {
        const amIHost = isRoomHost || seats[0]?.clientId === deviceId;
        if (amIHost && phase === 'LOBBY' && msg.seatIndex !== undefined) {
          const targetIdx = msg.seatIndex;
          const joinerId = msg.player?.clientId || msg.senderId;
          if (!joinerId || targetIdx < 0 || targetIdx > 5 || targetIdx === currentHumanSeatIndex) break;

          const targetSeat = seats[targetIdx];
          const isTargetAvailable =
            !targetSeat ||
            targetSeat.isVacant ||
            !targetSeat.name ||
            targetSeat.name.trim() === '' ||
            !targetSeat.isHuman;

          if (!isTargetAvailable) break;

          let joinerName = msg.player?.name?.trim() || 'لاعب';
          if (joinerName === userName) {
            joinerName = `${joinerName} (ضيف)`;
          }
          const joinerAvatar = msg.player?.avatarId || 'kuwaiti_shemagh_red';
          const joinerPhoto = msg.player?.customPhoto || null;

          const nextSeats = seats.map((s, idx) => {
            if (idx === targetIdx) {
              return {
                id: idx,
                name: joinerName,
                team: (idx % 2 === 0 ? 'A' : 'B') as 'A' | 'B',
                avatarId: joinerAvatar,
                customPhoto: joinerPhoto,
                isHuman: true,
                isVacant: false,
                clientId: joinerId,
              };
            }
            if (s.clientId === joinerId && idx !== currentHumanSeatIndex) {
              return {
                ...s,
                name: '',
                customPhoto: null,
                isHuman: false,
                isVacant: true,
                clientId: undefined,
              };
            }
            return s;
          });

          const nextWaiting = waitingPlayers.filter((w) => w.clientId !== joinerId);
          setSeats(nextSeats);
          setWaitingPlayers(nextWaiting);
          soundEngine.playCardSlide();

          const vCount = nextSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
          roomSync.publish({
            type: 'ROOM_STATE',
            roomCode,
            senderId: deviceId,
            seats: nextSeats,
            waitingPlayers: nextWaiting,
            vacantCount: vCount,
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'ROOM_STATE': {
        if (msg.waitingPlayers) {
          setWaitingPlayers(msg.waitingPlayers);
        }
        if (msg.seats) {
          setSeats(msg.seats);

          if (!isRoomHost) {
            const myAssignedIdx = msg.seats.findIndex(
              (s) => !s.isVacant && s.clientId && (s.clientId === deviceId || s.clientId === roomSync.myClientId)
            );

            if (myAssignedIdx !== -1) {
              if (currentHumanSeatIndex !== myAssignedIdx) {
                setCurrentHumanSeatIndex(myAssignedIdx);
                soundEngine.playCardSlide();
              }
            } else {
              setCurrentHumanSeatIndex(-1);
            }
          }
        }
        break;
      }

      case 'SYNC_REQUEST': {
        const amIHost = isRoomHost || seats[0]?.clientId === deviceId;
        if (amIHost) {
          const vCount = seats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
          roomSync.publish({
            type: 'ROOM_STATE',
            roomCode,
            senderId: deviceId,
            seats,
            waitingPlayers,
            vacantCount: vCount,
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'START_GAME': {
        setShowHostModal(false);
        setShowRoomsModal(false);
        setIsMultiplayerActive(true);
        soundEngine.init();
        soundEngine.playBidTone(true);
        soundEngine.playCardSlide();

        let activeSeats = msg.seats || seats;
        let myAssignedIdx = currentHumanSeatIndex >= 0 ? currentHumanSeatIndex : 0;

        if (msg.seats) {
          const foundIdx = msg.seats.findIndex(
            (s) => !s.isVacant && s.clientId && (s.clientId === deviceId || s.clientId === roomSync.myClientId)
          );
          if (foundIdx !== -1) {
            myAssignedIdx = foundIdx;
          }
          setCurrentHumanSeatIndex(myAssignedIdx);
          activeSeats = msg.seats.map((s, i) =>
            i === myAssignedIdx ? { ...s, isHuman: true, isVacant: false } : s
          );
          setSeats(activeSeats);
        }

        if (msg.targetScore === 26 || msg.targetScore === 51 || msg.targetScore === 101) {
          setMatchTargetScore(msg.targetScore);
        }
        if (msg.scores) {
          setMatchScoreTeamA(msg.scores.a);
          setMatchScoreTeamB(msg.scores.b);
        } else {
          setMatchScoreTeamA(0);
          setMatchScoreTeamB(0);
        }
        setRoundNumber(msg.roundNumber ?? 1);

        if (msg.deck && msg.dealerIdx !== undefined) {
          setDealerIdx(msg.dealerIdx);
          const incTeam = msg.dealerIdx % 2 === 0 ? 'A' : 'B';
          setCurrentDealingTeam(incTeam);
          if (msg.dealerIdx % 2 === 0) {
            setLastDealerTeamA(msg.dealerIdx);
            setLastDealerTeamB(5);
          } else {
            setLastDealerTeamB(msg.dealerIdx);
            setLastDealerTeamA(4);
          }
          startNewRound(msg.deck, msg.dealerIdx, activeSeats, myAssignedIdx);
        }
        break;
      }

      case 'PLAYER_BID': {
        if (msg.playerId !== undefined && msg.val !== undefined) {
          if (phase !== 'BIDDING' || msg.playerId !== currentTurn) break;
          submitBid(msg.playerId, msg.val, msg.forced ?? false, true);
        }
        break;
      }

      case 'TRUMP_CHOSEN': {
        if (msg.color) {
          if (phase !== 'CHOOSE_TRUMP') break;
          if (msg.playerId !== undefined && bidWinner !== null && msg.playerId !== bidWinner) break;
          chooseTrumpColor(msg.color, msg.playerId, true);
        }
        break;
      }

      case 'CARD_PLAYED': {
        if (msg.playerId !== undefined && msg.card) {
          if (phase !== 'PLAYING' || msg.playerId !== currentTurn) break;
          const remotePlayer = players[msg.playerId];
          if (remotePlayer && remotePlayer.hand.length > 0) {
            const actualCard = remotePlayer.hand.find((c) => c.id === msg.card!.id);
            if (!actualCard) break;
            const isRemoteBuyer = bidWinner === msg.playerId;
            if (!isLegalMove(remotePlayer.hand, actualCard, currentTrick, highestBid, trumpColor, isRemoteBuyer)) {
              break;
            }
            handlePlayCard(msg.playerId, actualCard, true);
          } else {
            handlePlayCard(msg.playerId, msg.card, true);
          }
        }
        break;
      }

      case 'NEW_ROUND': {
        if (msg.deck && msg.dealerIdx !== undefined) {
          setRoundNumber(msg.roundNumber ?? (roundNumber + 1));
          setDealerIdx(msg.dealerIdx);
          const incTeam = msg.dealerIdx % 2 === 0 ? 'A' : 'B';
          setCurrentDealingTeam(incTeam);
          if (msg.dealerIdx % 2 === 0) {
            setLastDealerTeamA(msg.dealerIdx);
          } else {
            setLastDealerTeamB(msg.dealerIdx);
          }
          if (msg.scores) {
            setMatchScoreTeamA(msg.scores.a);
            setMatchScoreTeamB(msg.scores.b);
          }
          startNewRound(msg.deck, msg.dealerIdx, seats, currentHumanSeatIndex);
        }
        break;
      }

      case 'BOT_TAKEOVER': {
        const targetIdx = msg.seatIndex;
        if (targetIdx !== undefined && targetIdx >= 0 && targetIdx < 6 && targetIdx !== currentHumanSeatIndex) {
          const botProf = getBotProfileForSeat(targetIdx, userAvatar, userCustomPhoto);
          const resolvedBotName = msg.botName || botProf.name;
          const resolvedBotAvatar = msg.botAvatarId || botProf.avatarId;
          const departedName = msg.playerName || players[targetIdx]?.name || seats[targetIdx]?.name || 'لاعب';

          setSeats((prev) =>
            prev.map((s, idx) =>
              idx === targetIdx
                ? {
                    ...s,
                    name: resolvedBotName,
                    avatarId: resolvedBotAvatar,
                    customPhoto: null,
                    isHuman: false,
                    isVacant: false,
                    clientId: undefined,
                  }
                : s
            )
          );

          setPlayers((prev) =>
            prev.map((p, idx) =>
              idx === targetIdx
                ? {
                    ...p,
                    name: resolvedBotName,
                    avatarId: resolvedBotAvatar,
                    customPhoto: null,
                    isHuman: false,
                    isVacant: false,
                  }
                : p
            )
          );

          soundEngine.playPassTone();
          showRoomLeaveNotice(`🤖 غادر "${departedName}" — حلّ البوت (${resolvedBotName}) مكانه لإكمال اللعب فوراً`);
          startTimer();
        }
        break;
      }

      case 'LEAVE_ROOM': {
        handleRemotePlayerExitRef.current(msg.senderId, msg.playerName);
        break;
      }

      default:
        break;
    }
  };

  const handleRemotePlayerExitRef = useRef<(leavingId: string, leavingNameHint?: string) => void>(() => {});
  handleRemotePlayerExitRef.current = (leavingId: string, leavingNameHint?: string) => {
    if (!leavingId || leavingId === deviceId || leavingId === roomSync.myClientId) return;

    const waitingMatch = waitingPlayers.find((w) => w.clientId === leavingId);
    const seatedIdx = seats.findIndex((s) => !s.isVacant && s.clientId === leavingId);

    if (!waitingMatch && seatedIdx === -1) return;

    const departedName =
      leavingNameHint ||
      (seatedIdx !== -1 ? seats[seatedIdx]?.name : undefined) ||
      waitingMatch?.name ||
      'لاعب';

    // الحالة الأولى: اللاعب خرج أثناء التواجد في صفحة الطاولة الخاصة / صالة الانتظار (قبل بدء اللعب)
    if (phaseRef.current === 'LOBBY') {
      const updatedWaiting = waitingPlayers.filter((w) => w.clientId !== leavingId);
      setWaitingPlayers(updatedWaiting);

      let seatChanged = false;
      const updatedSeats = seats.map((s, idx) => {
        if (s.clientId === leavingId && idx !== currentHumanSeatIndex) {
          seatChanged = true;
          return {
            ...s,
            name: '',
            customPhoto: null,
            isHuman: false,
            isVacant: true,
            clientId: undefined,
          };
        }
        return s;
      });

      if (seatChanged) {
        setSeats(updatedSeats);
      }

      soundEngine.playPassTone();
      showRoomLeaveNotice(`غادر اللاعب "${departedName}" الطاولة — تناقص العدد فوراً`);

      if (isRoomHost || seats[0]?.clientId === deviceId) {
        const vCount = updatedSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
        roomSync.publish({
          type: 'ROOM_STATE',
          roomCode,
          senderId: deviceId,
          seats: updatedSeats,
          waitingPlayers: updatedWaiting,
          vacantCount: vCount,
          timestamp: Date.now(),
        });
      }
      return;
    }

    // الحالة الثانية: اللاعب غادر أثناء سير اللعب الفعلي في الطاولة الخاصة -> يحل محله بوت فوراً دون انقطاع أو تأخير
    if (seatedIdx !== -1 && seatedIdx !== currentHumanSeatIndex) {
      const alreadyBot = !seats[seatedIdx]?.isHuman && !players[seatedIdx]?.isHuman;
      if (alreadyBot) return;

      const botProf = getBotProfileForSeat(seatedIdx, userAvatar, userCustomPhoto);
      const updatedSeats = seats.map((s, idx) =>
        idx === seatedIdx
          ? {
              ...s,
              name: botProf.name,
              avatarId: botProf.avatarId,
              customPhoto: null,
              isHuman: false,
              isVacant: false,
              clientId: undefined,
            }
          : s
      );

      setSeats(updatedSeats);
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === seatedIdx
            ? {
                ...p,
                name: botProf.name,
                avatarId: botProf.avatarId,
                customPhoto: null,
                isHuman: false,
                isVacant: false,
              }
            : p
        )
      );

      // إذا كان المغادر هو المضيف الأصلي، ينتقل التحكم بالبوتات تلقائياً لأول لاعب بشري متبقٍ في الطاولة لضمان عدم توقف اللعب
      let amINowHost = isRoomHost;
      if (!isRoomHost) {
        const firstRemainingHumanIdx = updatedSeats.findIndex((s) => s.isHuman && !s.isVacant);
        if (firstRemainingHumanIdx === currentHumanSeatIndex) {
          amINowHost = true;
          setIsRoomHost(true);
        }
      }

      soundEngine.playPassTone();
      showRoomLeaveNotice(`🤖 غادر "${departedName}" — حلّ البوت (${botProf.name}) مكانه لإكمال اللعب فوراً`);

      if (amINowHost) {
        roomSync.publish({
          type: 'BOT_TAKEOVER',
          roomCode,
          senderId: deviceId,
          seatIndex: seatedIdx,
          playerName: departedName,
          botName: botProf.name,
          botAvatarId: botProf.avatarId,
          seats: updatedSeats,
          timestamp: Date.now(),
        });
      }

      startTimer();
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = roomSync.subscribeRoom(roomCode, (msg: RoomSyncMessage) => {
      messageHandlerRef.current(msg);
    });

    return () => {
      unsubscribe();
    };
  }, [roomCode]);

  // تحديث تواجد اللاعب أونلاين والاستماع لقائمة المتواجدين والدعوات المباشرة ومغادرة اللاعبين اللحظية
  useEffect(() => {
    const status: 'lobby' | 'private_table' | 'playing' =
      phase !== 'LOBBY'
        ? 'playing'
        : showHostModal || (isMultiplayerActive && !isRoomHost)
        ? 'private_table'
        : 'lobby';

    roomSync.updateMyPresence({
      clientId: deviceId,
      name: userName,
      avatarId: userAvatar,
      customPhoto: userCustomPhoto,
      status,
      roomCode: showHostModal || isMultiplayerActive ? roomCode : undefined,
    });
  }, [deviceId, userName, userAvatar, userCustomPhoto, phase, showHostModal, isMultiplayerActive, isRoomHost, roomCode]);

  useEffect(() => {
    const unsubOnline = roomSync.subscribeOnlinePlayers((list) => {
      setOnlinePlayers(list);
    });

    const unsubLeave = roomSync.subscribePlayerLeave((leavingClientId, leavingPlayerName) => {
      handleRemotePlayerExitRef.current(leavingClientId, leavingPlayerName);
    });

    const unsubInvites = roomSync.subscribeInvites((invite) => {
      // إذا كان اللاعب أصلاً داخل نفس الطاولة المدعو إليها لا نظهر إشعاراً مكرراً
      if (isMultiplayerActive && roomCode === invite.roomCode && (showHostModal || !isRoomHost)) {
        return;
      }
      soundEngine.init();
      soundEngine.playBidTone(false);
      setIncomingInvite(invite);
    });

    return () => {
      unsubOnline();
      unsubLeave();
      unsubInvites();
    };
  }, [isMultiplayerActive, isRoomHost, roomCode, showHostModal]);

  // Profile Save (permanently persisted and synced across seats & active players)
  const handleSaveProfileName = (newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    setUserName(cleanName);
    try {
      localStorage.setItem('kout_user_name', cleanName);
    } catch {
      // ignore storage quota errors
    }
    const targetIdx = currentHumanSeatIndex >= 0 ? currentHumanSeatIndex : 0;
    setSeats((prev) =>
      prev.map((s, idx) => (idx === targetIdx ? { ...s, name: cleanName } : s))
    );
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === targetIdx ? { ...p, name: cleanName } : p))
    );
  };

  const handleSelectAvatar = (avId: string) => {
    setUserAvatar(avId);
    setUserCustomPhoto(null);
    try {
      localStorage.setItem('kout_user_avatar', avId);
      localStorage.removeItem('kout_custom_photo');
    } catch {
      // ignore storage errors
    }
    const targetIdx = currentHumanSeatIndex >= 0 ? currentHumanSeatIndex : 0;
    setSeats((prev) =>
      prev.map((s, idx) => {
        if (idx === targetIdx) {
          return { ...s, avatarId: avId, customPhoto: null };
        }
        if (!s.isHuman && !s.isVacant) {
          const botProf = getBotProfileForSeat(idx, avId, null);
          return { ...s, avatarId: botProf.avatarId, name: botProf.name };
        }
        return s;
      })
    );
    setPlayers((prev) =>
      prev.map((p, idx) => {
        if (idx === targetIdx) {
          return { ...p, avatarId: avId, customPhoto: null };
        }
        if (!p.isHuman) {
          const botProf = getBotProfileForSeat(idx, avId, null);
          return { ...p, avatarId: botProf.avatarId, name: botProf.name };
        }
        return p;
      })
    );
  };

  const handleUploadPhoto = (dataUrl: string) => {
    setUserCustomPhoto(dataUrl);
    try {
      localStorage.setItem('kout_custom_photo', dataUrl);
    } catch {
      // ignore storage errors
    }
    const targetIdx = currentHumanSeatIndex >= 0 ? currentHumanSeatIndex : 0;
    setSeats((prev) =>
      prev.map((s, idx) =>
        idx === targetIdx ? { ...s, customPhoto: dataUrl } : s
      )
    );
    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === targetIdx ? { ...p, customPhoto: dataUrl } : p
      )
    );
  };

  const handleOpenPrivateTable = () => {
    setIsRoomHost(true);
    setIsMultiplayerActive(true);
    setCurrentHumanSeatIndex(0);
    const freshVacantSeats = createVacantPrivateSeats(userName, userAvatar, userCustomPhoto, deviceId);
    setSeats(freshVacantSeats);
    setWaitingPlayers([]);
    setLastSeatReserved(null);

    roomSync.subscribeRoom(roomCode, (msg) => {
      messageHandlerRef.current(msg);
    });

    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: deviceId,
      seats: freshVacantSeats,
      waitingPlayers: [],
      vacantCount: 5,
      timestamp: Date.now(),
    });
    setShowHostModal(true);
  };

  const handleAssignWaitingPlayerToSeat = (player: WaitingPlayer, seatIdx: number) => {
    if (!isRoomHost) return;
    const team: 'A' | 'B' = seatIdx % 2 === 0 ? 'A' : 'B';

    let nextWaiting = waitingPlayers.filter((w) => w.clientId !== player.clientId);
    const existingOccupant = seats[seatIdx];
    if (existingOccupant && existingOccupant.isHuman && existingOccupant.name && seatIdx !== 0) {
      nextWaiting.push({
        clientId: existingOccupant.clientId || `seat_${seatIdx}_${Date.now()}`,
        name: existingOccupant.name,
        avatarId: existingOccupant.avatarId,
        customPhoto: existingOccupant.customPhoto,
        joinedAt: Date.now(),
      });
    }

    const nextSeats = [...seats];
    nextSeats[seatIdx] = {
      id: seatIdx,
      name: player.name,
      team,
      avatarId: player.avatarId || 'kuwaiti_shemagh_red',
      customPhoto: player.customPhoto || null,
      isHuman: true,
      isVacant: false,
      clientId: player.clientId,
    };

    setSeats(nextSeats);
    setWaitingPlayers(nextWaiting);

    const vCount = nextSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: deviceId,
      seats: nextSeats,
      waitingPlayers: nextWaiting,
      vacantCount: vCount,
      timestamp: Date.now(),
    });

    soundEngine.playCardSlide();
  };

  const handleMovePlayerToWaiting = (seatIdx: number) => {
    if (!isRoomHost) return;
    if (seatIdx === 0) return;
    const occupant = seats[seatIdx];
    if (!occupant || occupant.isVacant) return;

    let nextWaiting = [...waitingPlayers];
    if (occupant.isHuman && occupant.name) {
      if (!nextWaiting.some((w) => w.clientId === occupant.clientId)) {
        nextWaiting.push({
          clientId: occupant.clientId || `seat_${seatIdx}_${Date.now()}`,
          name: occupant.name,
          avatarId: occupant.avatarId,
          customPhoto: occupant.customPhoto,
          joinedAt: Date.now(),
        });
      }
    }

    const nextSeats = [...seats];
    nextSeats[seatIdx] = {
      ...nextSeats[seatIdx],
      name: '',
      customPhoto: null,
      isHuman: false,
      isVacant: true,
      clientId: undefined,
    };

    setSeats(nextSeats);
    setWaitingPlayers(nextWaiting);

    const vCount = nextSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: deviceId,
      seats: nextSeats,
      waitingPlayers: nextWaiting,
      vacantCount: vCount,
      timestamp: Date.now(),
    });
  };

  const handleSwapSeats = (idxA: number, idxB: number) => {
    if (!isRoomHost) return;
    if (idxA === idxB) return;

    const nextSeats = [...seats];
    const seatA = { ...nextSeats[idxA] };
    const seatB = { ...nextSeats[idxB] };

    nextSeats[idxA] = {
      ...seatB,
      id: idxA,
      team: idxA % 2 === 0 ? 'A' : 'B',
    };
    nextSeats[idxB] = {
      ...seatA,
      id: idxB,
      team: idxB % 2 === 0 ? 'A' : 'B',
    };

    if (currentHumanSeatIndex === idxA) {
      setCurrentHumanSeatIndex(idxB);
    } else if (currentHumanSeatIndex === idxB) {
      setCurrentHumanSeatIndex(idxA);
    }

    setSeats(nextSeats);

    const vCount = nextSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: deviceId,
      seats: nextSeats,
      waitingPlayers,
      vacantCount: vCount,
      timestamp: Date.now(),
    });

    soundEngine.playCardSlide();
  };

  const handleSitInSeat = (targetIdx: number) => {
    if (targetIdx === currentHumanSeatIndex) return;
    const oldIdx = currentHumanSeatIndex;

    setSeats((prev) => {
      const next = [...prev];
      next[targetIdx] = {
        ...next[targetIdx],
        name: userName,
        avatarId: userAvatar,
        customPhoto: userCustomPhoto,
        isHuman: true,
        isVacant: false,
        clientId: deviceId,
        team: targetIdx % 2 === 0 ? 'A' : 'B',
      };
      if (oldIdx >= 0) {
        next[oldIdx] = {
          ...next[oldIdx],
          name: '',
          avatarId: DEFAULT_BOT_PROFILES[oldIdx]?.avatarId || 'kuwaiti_ghutra_white',
          customPhoto: null,
          isHuman: false,
          isVacant: true,
          clientId: undefined,
          team: oldIdx % 2 === 0 ? 'A' : 'B',
        };
      }

      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;

      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: deviceId,
        seats: next,
        waitingPlayers,
        vacantCount: vCount,
        timestamp: Date.now(),
      });

      return next;
    });

    setCurrentHumanSeatIndex(targetIdx);
  };

  const handleConvertToBot = (idx: number) => {
    if (idx === currentHumanSeatIndex) return;
    setSeats((prev) => {
      const next = [...prev];
      const botProf = getBotProfileForSeat(idx, userAvatar, userCustomPhoto);
      next[idx] = {
        ...next[idx],
        name: botProf.name,
        avatarId: botProf.avatarId,
        customPhoto: null,
        isHuman: false,
        isVacant: false,
        clientId: undefined,
      };
      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: deviceId,
        seats: next,
        vacantCount: vCount,
        timestamp: Date.now(),
      });
      return next;
    });
    soundEngine.playCardSlide();
  };

  const handleVacateSeatDirect = (idx: number) => {
    if (idx === currentHumanSeatIndex) return;
    setSeats((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        name: '',
        customPhoto: null,
        isHuman: false,
        isVacant: true,
        clientId: undefined,
      };
      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: deviceId,
        seats: next,
        vacantCount: vCount,
        timestamp: Date.now(),
      });
      return next;
    });
  };

  const handleFillAllWithBots = () => {
    setSeats((prev) => {
      const next = prev.map((seat, idx) => {
        if (idx === currentHumanSeatIndex) return seat;
        if (seat.isVacant || !seat.name || seat.name.trim() === '') {
          const botProf = getBotProfileForSeat(idx, userAvatar, userCustomPhoto);
          return {
            ...seat,
            name: botProf.name,
            avatarId: botProf.avatarId,
            customPhoto: null,
            isHuman: false,
            isVacant: false,
            clientId: undefined,
          };
        }
        return seat;
      });
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: deviceId,
        seats: next,
        vacantCount: 0,
        timestamp: Date.now(),
      });
      return next;
    });
    soundEngine.playCardSlide();
  };

  const handleVacateAllSeats = () => {
    setSeats((prev) => {
      const next = prev.map((seat, idx) => {
        if (idx === currentHumanSeatIndex) return seat;
        return {
          ...seat,
          name: '',
          customPhoto: null,
          isHuman: false,
          isVacant: true,
          clientId: undefined,
        };
      });
      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: deviceId,
        seats: next,
        vacantCount: vCount,
        timestamp: Date.now(),
      });
      return next;
    });
  };

  const handleSaveSeatDetails = (updated: Partial<SeatConfig>) => {
    if (editingSeatIndex === null) return;
    setSeats((prev) => {
      const next = [...prev];
      next[editingSeatIndex] = {
        ...next[editingSeatIndex],
        ...updated,
      };
      return next;
    });
    setEditingSeatIndex(null);
  };

  const handleVacateSeat = () => {
    if (editingSeatIndex === null) return;
    if (editingSeatIndex === currentHumanSeatIndex) return;
    setSeats((prev) => {
      const next = [...prev];
      next[editingSeatIndex] = {
        ...next[editingSeatIndex],
        isVacant: true,
        name: '',
        customPhoto: null,
        isHuman: false,
        clientId: undefined,
      };
      return next;
    });
    setEditingSeatIndex(null);
  };

  const isNearSquareViewport = () => {
    if (typeof window === 'undefined') return false;
    const minD = Math.min(window.innerWidth, window.innerHeight);
    const maxD = Math.max(window.innerWidth, window.innerHeight);
    return maxD > 0 && minD / maxD > 0.72;
  };

  const [isLandscapeMode, setIsLandscapeMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (document.body.classList.contains('forced-landscape-mode')) return true;
    if (document.body.classList.contains('forced-portrait-mode')) return false;
    return window.innerWidth > window.innerHeight && !isNearSquareViewport();
  });
  const isLandscapeModeRef = useRef<boolean>(isLandscapeMode);
  const manualScreenModeRef = useRef<'auto' | 'landscape' | 'portrait'>('auto');

  const applyOrientationMode = useCallback((mode: 'auto' | 'landscape' | 'portrait') => {
    manualScreenModeRef.current = mode;
    const nearSquare = isNearSquareViewport();

    if (mode === 'auto') {
      document.body.classList.remove('forced-landscape-mode', 'forced-portrait-mode');
      const nativeLand = window.innerWidth > window.innerHeight && !nearSquare;
      isLandscapeModeRef.current = nativeLand;
      setIsLandscapeMode(nativeLand);
    } else if (mode === 'landscape') {
      document.body.classList.remove('forced-portrait-mode');
      if (!nearSquare) {
        document.body.classList.add('forced-landscape-mode');
      } else {
        document.body.classList.remove('forced-landscape-mode');
      }
      isLandscapeModeRef.current = true;
      setIsLandscapeMode(true);
    } else {
      document.body.classList.remove('forced-landscape-mode');
      document.body.classList.add('forced-portrait-mode');
      isLandscapeModeRef.current = false;
      setIsLandscapeMode(false);
    }

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('kout-layout-refresh'));
    });
    setTimeout(() => {
      window.dispatchEvent(new Event('kout-layout-refresh'));
    }, 60);
    setTimeout(() => {
      window.dispatchEvent(new Event('kout-layout-refresh'));
    }, 280);
  }, []);

  useEffect(() => {
    // البدء بالوضع الطبيعي التلقائي بدون أي تدوير قسري يقلب شاشة هواتف الفولد
    applyOrientationMode('auto');

    const handleNativeViewportChange = () => {
      if (manualScreenModeRef.current === 'auto') {
        applyOrientationMode('auto');
      } else if (isNearSquareViewport()) {
        // عند فتح شاشة الفولد الداخلية المربعية نلغي أي تدوير CSS قسري لتبقى الشاشة معتدلة دائماً
        document.body.classList.remove('forced-landscape-mode');
        window.dispatchEvent(new Event('kout-layout-refresh'));
      } else {
        window.dispatchEvent(new Event('kout-layout-refresh'));
      }
    };

    window.addEventListener('resize', handleNativeViewportChange);
    window.addEventListener('orientationchange', handleNativeViewportChange);

    const screenOrient = (window.screen as Screen & { orientation?: ScreenOrientation })?.orientation;
    screenOrient?.addEventListener?.('change', handleNativeViewportChange);

    return () => {
      window.removeEventListener('resize', handleNativeViewportChange);
      window.removeEventListener('orientationchange', handleNativeViewportChange);
      screenOrient?.removeEventListener?.('change', handleNativeViewportChange);
    };
  }, [applyOrientationMode]);

  const handleToggleScreenOrientation = useCallback(() => {
    const nextLandscape = !isLandscapeModeRef.current;
    applyOrientationMode(nextLandscape ? 'landscape' : 'portrait');
  }, [applyOrientationMode]);

  const handleSetAutoScreen = useCallback(() => {
    setShowScreenModal(false);
    applyOrientationMode('auto');
  }, [applyOrientationMode]);

  const handleSetLandscapeScreen = useCallback(() => {
    setShowScreenModal(false);
    applyOrientationMode('landscape');
  }, [applyOrientationMode]);

  const handleSetPortraitScreen = useCallback(() => {
    setShowScreenModal(false);
    applyOrientationMode('portrait');
  }, [applyOrientationMode]);

  const handleToggleFullscreen = () => {
    setShowScreenModal(false);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div id="gameMainWrapper" className="h-[100dvh] max-h-[100dvh] w-screen max-w-none flex flex-col justify-between select-none overflow-hidden relative bg-[#22252a]">
      
      {/* 0. Main Lobby Screen */}
      {phase === 'LOBBY' && (
        <LobbyScreen
          userName={userName}
          avatarId={userAvatar}
          customPhoto={userCustomPhoto}
          soundEnabled={soundEnabled}
          isLandscapeMode={isLandscapeMode}
          targetScore={matchTargetScore}
          onSelectTargetScore={(score) => {
            setMatchTargetScore(score);
            try {
              localStorage.setItem('kout_match_target_score', String(score));
            } catch {}
          }}
          onFastPlay={(chosenScore) => {
            if (chosenScore === 26 || chosenScore === 51 || chosenScore === 101) {
              setMatchTargetScore(chosenScore);
              try {
                localStorage.setItem('kout_match_target_score', String(chosenScore));
              } catch {}
            }
            soundEngine.init();
            soundEngine.playCardSlide();
            const stdSeats: SeatConfig[] = JSON.parse(JSON.stringify(DEFAULT_SEATS));
            stdSeats[0].name = userName;
            stdSeats[0].avatarId = userAvatar;
            stdSeats[0].customPhoto = userCustomPhoto;
            stdSeats[0].clientId = deviceId;
            for (let i = 1; i < 6; i++) {
              const botProf = getBotProfileForSeat(i, userAvatar, userCustomPhoto);
              stdSeats[i].avatarId = botProf.avatarId;
              stdSeats[i].name = botProf.name;
            }
            setSeats(stdSeats);
            setCurrentHumanSeatIndex(0);
            setIsRoomHost(true);
            startNewMatch();
          }}
          onOpenHostTable={() => {
            setIsRoomHost(true);
            handleOpenPrivateTable();
          }}
          onJoinRoomCode={(code) => {
            handleJoinRoomWaiting(code);
          }}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onToggleScreenOrientation={handleToggleScreenOrientation}
          onOpenInstallModal={handleOpenInstall}
          onExitApp={() => setShowExitConfirm(true)}
        />
      )}

      {/* 1. Main Game Table Screen */}
      {phase !== 'LOBBY' && (
        <>
          <ScoreBoard
            scoreTeamA={matchScoreTeamA}
            scoreTeamB={matchScoreTeamB}
            tricksTeamA={tricksTeamA}
            tricksTeamB={tricksTeamB}
            highestBid={highestBid}
            bidWinner={bidWinner}
            isForcedBid={isForcedBid}
            trumpColor={trumpColor}
            players={players}
            roomCode={roomCode}
            soundEnabled={soundEnabled}
            isLandscapeMode={isLandscapeMode}
            matchTargetScore={matchTargetScore}
            onToggleSound={toggleSound}
            onToggleScreenOrientation={handleToggleScreenOrientation}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenRooms={() => setShowRoomsModal(true)}
            onOpenRules={() => setShowRulesModal(true)}
            onOpenScreenModal={() => setShowScreenModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onReturnToLobby={exitToLobbyCleanly}
            onExitGame={() => setShowExitConfirm(true)}
          />

          <TableArena
            players={players}
            humanSeatIndex={currentHumanSeatIndex}
            currentTrick={currentTrick}
            trumpColor={trumpColor}
            highestBid={highestBid}
            bidWinner={bidWinner}
            isForcedBid={isForcedBid}
            biddingHistory={biddingHistory}
            currentTurn={currentTurn}
            timerRemaining={timerRemaining}
            phase={phase}
            callout={callout}
            collectingWinnerId={collectingWinnerId}
            dealerIdx={dealerIdx}
            isBaoonPendingTrump={highestBid === 9 && trumpColor === null}
            isTimerDisabled={isAllHumanGame}
            isLandscapeMode={isLandscapeMode}
            onTableTap={handleTableSingleCardTap}
          />

          <PlayerHand
            player={players[currentHumanSeatIndex] || players[0]}
            currentTurn={currentTurn}
            phase={phase}
            isActionPending={isActionPending}
            currentTrick={currentTrick}
            trumpColor={trumpColor}
            highestBid={highestBid}
            bidWinner={bidWinner}
            isForcedBid={isForcedBid}
            timerRemaining={timerRemaining}
            onCardClick={handleHumanCardClick}
            onSendPhrase={showCallout}
            dealerIdx={dealerIdx}
            isTimerDisabled={isAllHumanGame}
            isLandscapeMode={isLandscapeMode}
            onTableTap={handleTableSingleCardTap}
          />
        </>
      )}

      {/* Bidding Modal for Human player */}
      {phase === 'BIDDING' && currentTurn === currentHumanSeatIndex && (
        <BiddingModal
          step="BID"
          highestBid={highestBid}
          bidWinner={bidWinner}
          players={players}
          onBid={(val, forced) => submitBid(currentHumanSeatIndex, val, forced)}
          onPass={() => submitBid(currentHumanSeatIndex, 0, false)}
          onPickTrump={(col) => chooseTrumpColor(col, currentHumanSeatIndex)}
          isDealer={currentHumanSeatIndex === dealerIdx}
          noBidsYet={highestBid <= 4 && biddingHistory.every((b) => b.val === 0)}
        />
      )}

      {/* Trump Selection for Human winner */}
      {phase === 'CHOOSE_TRUMP' && ((bidWinner === currentHumanSeatIndex) || (isForcedBid && dealerIdx === currentHumanSeatIndex)) && (
        <BiddingModal
          step="TRUMP"
          highestBid={highestBid}
          bidWinner={bidWinner}
          players={players}
          onBid={() => {}}
          onPass={() => {}}
          onPickTrump={(col) => chooseTrumpColor(col, currentHumanSeatIndex)}
        />
      )}

      {/* Incoming Private Table Invite Notification Banner */}
      {incomingInvite && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[120] w-[94%] max-w-md pointer-events-auto select-none">
          <div className="bg-slate-900/98 border-2 border-amber-400 rounded-2xl p-2.5 xs:p-3 shadow-2xl flex items-center justify-between gap-2.5 ring-4 ring-amber-500/20">
            <div className="flex items-center gap-2.5 text-right min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-950 shrink-0">
                <AvatarView
                  avatarId={incomingInvite.hostAvatarId}
                  customPhoto={incomingInvite.hostCustomPhoto}
                />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-xs">🔔</span>
                  <span className="text-xs xs:text-sm font-black text-amber-300 truncate block">
                    {incomingInvite.hostName}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold text-slate-200 block mt-0.5">
                  يدعوك لطاولته الخاصة <strong className="text-amber-400 font-mono">#{incomingInvite.roomCode}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const inv = incomingInvite;
                  setIncomingInvite(null);
                  soundEngine.playCardSlide();
                  roomSync.sendInviteResponse(inv.roomCode, inv.hostClientId, userName, true);
                  if (phase !== 'LOBBY') {
                    exitToLobbyCleanly();
                  }
                  handleJoinRoomWaiting(inv.roomCode);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-lg"
              >
                دخول ✅
              </button>
              <button
                type="button"
                onClick={() => {
                  const inv = incomingInvite;
                  setIncomingInvite(null);
                  soundEngine.playPassTone();
                  roomSync.sendInviteResponse(inv.roomCode, inv.hostClientId, userName, false);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-700"
              >
                لاحقاً ❌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Game / Lobby Player Exit & Bot Replacement Toast Banner */}
      {roomLeaveNotice && !showHostModal && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[115] w-[92%] max-w-md pointer-events-none select-none">
          <div className="bg-slate-900/95 border-2 border-amber-400/90 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center justify-center gap-2 text-amber-200 text-xs sm:text-sm font-black text-center">
            <span>{roomLeaveNotice}</span>
          </div>
        </div>
      )}

      {/* Host Friends & Custom Table Modal */}
      {showHostModal && (
        <HostTableModal
          roomCode={roomCode}
          seats={seats}
          currentHumanSeatIndex={currentHumanSeatIndex}
          isHost={isRoomHost}
          waitingPlayers={waitingPlayers}
          onlinePlayers={onlinePlayers}
          isLandscapeMode={isLandscapeMode}
          hostClientId={deviceId}
          hostName={userName}
          hostAvatarId={userAvatar}
          hostCustomPhoto={userCustomPhoto}
          leaveAlert={roomLeaveNotice}
          lastSeatReserved={lastSeatReserved}
          isMatchOngoing={phase !== 'LOBBY'}
          onToggleScreenOrientation={handleToggleScreenOrientation}
          onRegenerateCode={() => {
            const nextCode = String(Math.floor(1000 + Math.random() * 9000));
            setRoomCode(nextCode);
            setIsRoomHost(true);
            setIsMultiplayerActive(true);
            setLastSeatReserved(null);
            setCurrentHumanSeatIndex(0);
            const freshVacant = createVacantPrivateSeats(userName, userAvatar, userCustomPhoto, deviceId);
            setSeats(freshVacant);
            setWaitingPlayers([]);

            roomSync.subscribeRoom(nextCode, (msg) => {
              messageHandlerRef.current(msg);
            });

            roomSync.publish({
              type: 'ROOM_STATE',
              roomCode: nextCode,
              senderId: deviceId,
              seats: freshVacant,
              waitingPlayers: [],
              vacantCount: 5,
              timestamp: Date.now(),
            });
          }}
          onSitInSeat={handleSitInSeat}
          onAssignWaitingPlayerToSeat={handleAssignWaitingPlayerToSeat}
          onMovePlayerToWaiting={handleMovePlayerToWaiting}
          onSwapSeats={handleSwapSeats}
          onConvertToBot={handleConvertToBot}
          onVacateSeat={handleVacateSeatDirect}
          onFillAllWithBots={handleFillAllWithBots}
          onVacateAllSeats={handleVacateAllSeats}
          onEditSeat={(idx) => setEditingSeatIndex(idx)}
          onStartGame={() => {
            // 1. تسكين أي لاعبين متبقين في قائمة الانتظار في المقاعد الشاغرة أولاً
            const queue = [...waitingPlayers];
            const finalFilledSeats = seats.map((seat, idx) => {
              if (idx === currentHumanSeatIndex) return seat;
              const isVac = seat.isVacant || !seat.name || seat.name.trim() === '';
              if (isVac && queue.length > 0) {
                const nextGuest = queue.shift()!;
                return {
                  id: idx,
                  name: nextGuest.name,
                  team: (idx % 2 === 0 ? 'A' : 'B') as 'A' | 'B',
                  avatarId: nextGuest.avatarId || 'kuwaiti_shemagh_red',
                  customPhoto: nextGuest.customPhoto || null,
                  isHuman: true,
                  isVacant: false,
                  clientId: nextGuest.clientId,
                };
              }
              if (isVac) {
                const botProf = getBotProfileForSeat(idx, userAvatar, userCustomPhoto);
                return {
                  ...seat,
                  name: botProf.name || DEFAULT_BOT_PROFILES[idx]?.name || `بوت ${idx + 1}`,
                  avatarId: botProf.avatarId || DEFAULT_BOT_PROFILES[idx]?.avatarId || 'kuwaiti_shemagh_red',
                  customPhoto: null,
                  isHuman: false,
                  isVacant: false,
                };
              }
              return seat;
            });
            setSeats(finalFilledSeats);
            setWaitingPlayers(queue);
            setShowHostModal(false);
            soundEngine.init();
            soundEngine.playCardSlide();

            const sharedDeck = buildDeck();
            const randDealer = Math.floor(Math.random() * 6);

            setIsMultiplayerActive(true);
            setMatchScoreTeamA(0);
            setMatchScoreTeamB(0);
            setRoundNumber(1);
            setDealerIdx(randDealer);
            const initialDealingTeam = randDealer % 2 === 0 ? 'A' : 'B';
            setCurrentDealingTeam(initialDealingTeam);
            if (randDealer % 2 === 0) {
              setLastDealerTeamA(randDealer);
              setLastDealerTeamB(5);
            } else {
              setLastDealerTeamB(randDealer);
              setLastDealerTeamA(4);
            }

            roomSync.publish({
              type: 'START_GAME',
              roomCode,
              senderId: deviceId,
              seats: finalFilledSeats,
              deck: sharedDeck,
              dealerIdx: randDealer,
              roundNumber: 1,
              scores: { a: 0, b: 0 },
              targetScore: matchTargetScore,
              timestamp: Date.now(),
            });

            startNewRound(sharedDeck, randDealer, finalFilledSeats);
          }}
          onClose={() => setShowHostModal(false)}
        />
      )}

      {/* Waiting Lobby for players who joined via 4-digit code, WhatsApp link, or in-game invite */}
      {isMultiplayerActive && !isRoomHost && phase === 'LOBBY' && (
        <WaitingLobbyModal
          roomCode={roomCode}
          seats={seats}
          waitingPlayers={waitingPlayers}
          onlinePlayers={onlinePlayers}
          isLandscapeMode={isLandscapeMode}
          myClientId={deviceId}
          myName={userName}
          myAvatarId={userAvatar}
          myCustomPhoto={userCustomPhoto}
          onToggleScreenOrientation={handleToggleScreenOrientation}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {/* Edit Seat Modal */}
      {editingSeatIndex !== null && seats[editingSeatIndex] && (
        <EditSeatModal
          seat={seats[editingSeatIndex]}
          isMyCurrentSeat={editingSeatIndex === currentHumanSeatIndex}
          onSaveSeat={handleSaveSeatDetails}
          onVacateSeat={handleVacateSeat}
          onClose={() => setEditingSeatIndex(null)}
        />
      )}

      {/* Profile & Avatar Modal */}
      {showProfileModal && (
        <ProfileModal
          currentName={userName}
          currentAvatarId={userAvatar}
          onSaveName={handleSaveProfileName}
          onSelectAvatar={handleSelectAvatar}
          onUploadCustomPhoto={handleUploadPhoto}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Rules Guide Modal */}
      {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}

      {/* Install App Modal */}
      {showInstallModal && (
        <InstallModal
          isInstallable={isInstallable}
          onNativeInstall={triggerPWAInstall}
          onClose={() => setShowInstallModal(false)}
        />
      )}

      {/* Screen Orientation / Fullscreen Modal */}
      {showScreenModal && (
        <ScreenModeModal
          isLandscapeMode={isLandscapeMode}
          onSetAuto={handleSetAutoScreen}
          onSetLandscape={handleSetLandscapeScreen}
          onSetPortrait={handleSetPortraitScreen}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={() => setShowScreenModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenRules={() => setShowRulesModal(true)}
          onOpenScreenModal={() => setShowScreenModal(true)}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Rooms Modal */}
      {showRoomsModal && (
        <RoomsModal
          currentRoomCode={roomCode}
          onGenerateNewRoom={() => {
            const nextCode = String(Math.floor(1000 + Math.random() * 9000));
            setRoomCode(nextCode);
            setIsRoomHost(true);
            setIsMultiplayerActive(true);
            setCurrentHumanSeatIndex(0);
            const freshVacant = createVacantPrivateSeats(userName, userAvatar, userCustomPhoto, deviceId);
            setSeats(freshVacant);
            setWaitingPlayers([]);
            roomSync.subscribeRoom(nextCode, (msg) => {
              messageHandlerRef.current(msg);
            });
            setShowRoomsModal(false);
            setShowHostModal(true);
          }}
          onJoinRoom={(code) => {
            setShowRoomsModal(false);
            handleJoinRoomWaiting(code);
          }}
          onClose={() => setShowRoomsModal(false)}
        />
      )}

      {/* Match Over Celebration Modal */}
      {phase === 'MATCH_OVER' && (() => {
        const matchStatus = getMatchTargetAndStatus(matchScoreTeamA, matchScoreTeamB, matchTargetScore);
        const winningTeam = matchStatus.winnerTeam || (matchScoreTeamA >= matchScoreTeamB ? 'A' : 'B');
        const isFirstRoundBaoonWin =
          roundNumber === 1 &&
          highestBid === 9 &&
          ((matchScoreTeamA === 36 && matchScoreTeamB === 0) ||
            (matchScoreTeamB === 36 && matchScoreTeamA === 0));
        return (
          <MatchOverModal
            scoreTeamA={matchScoreTeamA}
            scoreTeamB={matchScoreTeamB}
            winnerTeam={winningTeam}
            isZeroAsam={matchStatus.isZeroAsam || isFirstRoundBaoonWin}
            onNewGame={() => {
              soundEngine.stopApplause();
              soundEngine.init();
              soundEngine.playCardSlide();
              if (isMultiplayerActive) {
                const sharedDeck = buildDeck();
                const randDealer = Math.floor(Math.random() * 6);
                setMatchScoreTeamA(0);
                setMatchScoreTeamB(0);
                setRoundNumber(1);
                setDealerIdx(randDealer);
                const initialDealingTeam = randDealer % 2 === 0 ? 'A' : 'B';
                setCurrentDealingTeam(initialDealingTeam);
                if (randDealer % 2 === 0) {
                  setLastDealerTeamA(randDealer);
                  setLastDealerTeamB(5);
                } else {
                  setLastDealerTeamB(randDealer);
                  setLastDealerTeamA(4);
                }

                roomSync.publish({
                  type: 'START_GAME',
                  roomCode,
                  senderId: deviceId,
                  seats,
                  deck: sharedDeck,
                  dealerIdx: randDealer,
                  roundNumber: 1,
                  scores: { a: 0, b: 0 },
                  targetScore: matchTargetScore,
                  timestamp: Date.now(),
                });

                startNewRound(sharedDeck, randDealer);
              } else {
                startNewMatch();
              }
            }}
            onExit={exitToLobbyCleanly}
          />
        );
      })()}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <ExitConfirmModal
          onConfirm={exitToLobbyCleanly}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
    </div>
  );
}
