import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BidRecord,
  CalloutMessage,
  Card,
  GamePhase,
  Player,
  SeatConfig,
  SuitColor,
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
import { roomSync, RoomSyncMessage } from './utils/roomSync';

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
  { name: 'أنت', avatarId: 'kuwaiti_ghutra_white' },
  { name: 'عبود (بوت)', avatarId: 'kuwaiti_shemagh_red' },
  { name: 'مشاري (بوت)', avatarId: 'kuwaiti_gahfiya' },
  { name: 'طارق (بوت)', avatarId: 'kuwaiti_dishdasha_plain' },
  { name: 'بندر (بوت)', avatarId: 'kuwaiti_gahfiya_glasses' },
  { name: 'سعود (بوت)', avatarId: 'kuwaiti_winter_ghutra' },
];

const DEFAULT_SEATS: SeatConfig[] = [
  { id: 0, name: 'أنت', team: 'A', avatarId: 'kuwaiti_ghutra_white', customPhoto: null, isHuman: true, isVacant: false },
  { id: 1, name: 'عبود (بوت)', team: 'B', avatarId: 'kuwaiti_shemagh_red', customPhoto: null, isHuman: false, isVacant: false },
  { id: 2, name: 'مشاري (بوت)', team: 'A', avatarId: 'kuwaiti_gahfiya', customPhoto: null, isHuman: false, isVacant: false },
  { id: 3, name: 'طارق (بوت)', team: 'B', avatarId: 'kuwaiti_dishdasha_plain', customPhoto: null, isHuman: false, isVacant: false },
  { id: 4, name: 'بندر (بوت)', team: 'A', avatarId: 'kuwaiti_gahfiya_glasses', customPhoto: null, isHuman: false, isVacant: false },
  { id: 5, name: 'سعود (بوت)', team: 'B', avatarId: 'kuwaiti_winter_ghutra', customPhoto: null, isHuman: false, isVacant: false },
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
    return {
      id: idx,
      name: '',
      team: idx % 2 === 0 ? 'A' : 'B',
      avatarId: DEFAULT_BOT_PROFILES[idx]?.avatarId || 'kuwaiti_shemagh_red',
      customPhoto: null,
      isHuman: false,
      isVacant: true,
    };
  });
};

export default function App() {
  const [deviceId] = useState<string>(getOrCreateDeviceId);

  // User profile
  const [userName, setUserName] = useState<string>(
    () => localStorage.getItem('kout_user_name') || 'أنت (اللاعب)'
  );
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
  const [lastSeatReserved, setLastSeatReserved] = useState<{
    seatIndex: number;
    name: string;
    team: string;
    avatarId?: string;
    customPhoto?: string | null;
  } | null>(null);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Seats & Players
  const [seats, setSeats] = useState<SeatConfig[]>(() => {
    const s = JSON.parse(JSON.stringify(DEFAULT_SEATS));
    s[0].name = localStorage.getItem('kout_user_name') || 'أنت';
    s[0].avatarId = localStorage.getItem('kout_user_avatar') || 'kuwaiti_ghutra_white';
    s[0].customPhoto = localStorage.getItem('kout_custom_photo') || null;
    s[0].clientId = getOrCreateDeviceId();
    return s;
  });
  const [currentHumanSeatIndex, setCurrentHumanSeatIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>(() => {
    return [0, 1, 2, 3, 4, 5].map((idx) => {
      const isUser = idx === 0;
      const defBot = DEFAULT_BOT_PROFILES[idx];
      return {
        id: idx,
        name: isUser ? (localStorage.getItem('kout_user_name') || 'أنت') : (defBot?.name || `بوت ${idx + 1}`),
        team: idx % 2 === 0 ? 'A' : 'B',
        isHuman: isUser,
        isVacant: false,
        hand: [],
        avatarId: isUser ? (localStorage.getItem('kout_user_avatar') || 'kuwaiti_ghutra_white') : (defBot?.avatarId || 'kuwaiti_shemagh_red'),
        customPhoto: isUser ? (localStorage.getItem('kout_custom_photo') || null) : null,
      };
    });
  });

  // Game Engine State
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [dealerIdx, setDealerIdx] = useState<number>(0);
  const [matchScoreTeamA, setMatchScoreTeamA] = useState<number>(0);
  const [matchScoreTeamB, setMatchScoreTeamB] = useState<number>(0);
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
      const accepted = await triggerPWAInstall();
      if (accepted) {
        showCallout('تم تثبيت اللعبة بنجاح! 🎉', '🎉');
        return;
      }
    }
    setShowInstallModal(true);
  };

  // Timer Ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAllHumanGame =
    isMultiplayerActive &&
    ((seats.length === 6 && seats.every((s) => s.isHuman && !s.isVacant)) ||
      (players.length === 6 && players.every((p) => p.isHuman)));

  const showCallout = useCallback((text: string, emoji = '📢') => {
    setCallout({ text, emoji, timestamp: Date.now() });
    setTimeout(() => {
      setCallout((prev) => (prev && Date.now() - prev.timestamp >= 1800 ? null : prev));
    }, 1900);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
    if (next) showCallout('المؤثرات مفعّلة 🔊', '🔊');
  };

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const allHumans =
      (seats.length === 6 && seats.every((s) => s.isHuman && !s.isVacant)) ||
      (players.length === 6 && players.every((p) => p.isHuman));
    if (isMultiplayerActive && allHumans) {
      setTimerRemaining(0);
      return;
    }

    setTimerRemaining(TURN_TIMER_DURATION);

    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 0.25) {
          stopTimer();
          return 0;
        }
        return prev - 0.2;
      });
    }, 200);
  }, [isMultiplayerActive, players, seats, stopTimer]);

  const startNewRound = useCallback(
    (deckOverride?: Card[], forcedDealerIdx?: number, seatsOverride?: SeatConfig[], humanSeatOverride?: number) => {
      stopTimer();
      setIsActionPending(false);

      const activeDealer = forcedDealerIdx !== undefined ? forcedDealerIdx : dealerIdx;
      setDealerIdx(activeDealer);

      const activeSeats = seatsOverride || seats;
      const activeHumanSeat = humanSeatOverride !== undefined ? humanSeatOverride : currentHumanSeatIndex;
      const deck = deckOverride || buildDeck();
      const freshPlayers: Player[] = activeSeats.map((seatCfg, idx) => {
        const isMe = idx === activeHumanSeat;
        const isHumanPlayer = Boolean(seatCfg.isHuman || isMe);
        return {
          ...seatCfg,
          name: isMe ? userName : (seatCfg.name && seatCfg.name.trim() !== '' ? seatCfg.name : DEFAULT_BOT_PROFILES[idx].name),
          avatarId: isMe ? userAvatar : (seatCfg.avatarId || DEFAULT_BOT_PROFILES[idx].avatarId),
          customPhoto: isMe ? userCustomPhoto : seatCfg.customPhoto,
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

      const dealerPlayer = freshPlayers[activeDealer];
      const dealerName = dealerPlayer ? dealerPlayer.name : `لاعب ${activeDealer + 1}`;
      const dealerTeamName = activeDealer % 2 === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
      showCallout(`الموزع ${dealerName} (${dealerTeamName}) وزّع الورق! المزاد يبدأ 🃏`, '🃏');
      startTimer();
    },
    [currentHumanSeatIndex, dealerIdx, seats, showCallout, startTimer, stopTimer, userAvatar, userCustomPhoto, userName]
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
      showCallout(`دخلت غرفة الطاولة #${code}! أنت في قائمة الانتظار ⏳`, '⏳');
    },
    [showCallout, userAvatar, userCustomPhoto, userName]
  );

  const handleLeaveRoom = useCallback(() => {
    roomSync.publish({
      type: 'LEAVE_ROOM',
      roomCode,
      senderId: deviceId,
      timestamp: Date.now(),
    });
    setIsMultiplayerActive(false);
    setIsRoomHost(true);
    setWaitingPlayers([]);
    setCurrentHumanSeatIndex(0);
    showCallout('غادرت الغرفة وعدت للرئيسية 🚪', '🚪');
  }, [deviceId, roomCode, showCallout]);

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
      showCallout(`الحكم ${SUIT_COLORS[color].name}! العب يا بطل`, '♠️');

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
    [bidWinner, currentHumanSeatIndex, deviceId, isMultiplayerActive, roomCode, showCallout, startTimer, stopTimer]
  );

  // Bidding resolution
  const submitBid = useCallback(
    (playerId: number, val: number, forced = false, isFromRemote = false) => {
      stopTimer();
      const player = players[playerId];
      const pName = player ? player.name : `لاعب ${playerId + 1}`;

      let effectiveVal = val;
      const isDealerForced = forced || (playerId === dealerIdx && highestBid <= 4 && val === 0);
      if (isDealerForced) {
        effectiveVal = 5;
        setIsForcedBid(true);
      } else if (effectiveVal > highestBid) {
        setIsForcedBid(false);
      }

      if (effectiveVal === 0) {
        soundEngine.playPassTone();
        showCallout(`${pName}: طـوف!`, '✋');
      } else if (effectiveVal === 9) {
        soundEngine.playBidTone(true);
        showCallout(`بااااون من ${pName}! 👑`, '👑');
      } else if (isDealerForced) {
        soundEngine.playBidTone(false);
        showCallout(`الموزع ${pName} ملزوم بـ 5! ⚡`, '⚡');
      } else {
        soundEngine.playBidTone(false);
        showCallout(`${pName} شرا بـ ${effectiveVal}!`, '🔥');
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
          setTimeout(() => {
            const bestCol = selectBotBestTrump(buyer.hand);
            chooseTrumpColor(bestCol, playerId);
          }, 900);
        }
        return;
      }

      const historyLength = nextBids.length;
      if (historyLength === 6) {
        setTimeout(() => {
          if (newWinner === null) {
            setIsForcedBid(true);
            setHighestBid(5);
            setBidWinner(dealerIdx);
            const dealer = players[dealerIdx];
            showCallout(`الموزع ${dealer?.name || ''} ملزوم بـ 5 وتحديد الحكم ⚡`, '⚡');

            setPhase('CHOOSE_TRUMP');
            if (dealer && !dealer.isHuman && (!isMultiplayerActive || isRoomHost)) {
              const bestCol = selectBotBestTrump(dealer.hand);
              chooseTrumpColor(bestCol, dealerIdx);
            }
          } else {
            const buyer = players[newWinner];
            setPhase('CHOOSE_TRUMP');
            showCallout(`رسا المزاد على ${buyer?.name || ''} بـ ${newHighest}! تحديد الحكم... 🎯`, '🎯');
            if (buyer && !buyer.isHuman && (!isMultiplayerActive || isRoomHost)) {
              const bestCol = selectBotBestTrump(buyer.hand);
              chooseTrumpColor(bestCol, newWinner);
            }
          }
        }, 1400);
      } else {
        const nextTurn = (currentTurn + 1) % 6;
        setCurrentTurn(nextTurn);
        startTimer();
      }
    },
    [biddingHistory, bidWinner, chooseTrumpColor, currentTurn, dealerIdx, deviceId, highestBid, isMultiplayerActive, isRoomHost, players, roomCode, showCallout, startTimer, stopTimer]
  );

  // Bot bidding automation
  useEffect(() => {
    if (phase !== 'BIDDING') return;
    if (highestBid >= 9) return;

    const bot = players[currentTurn];
    if (!bot) return;

    if (bot.isHuman) return;
    if (isMultiplayerActive && !isRoomHost) return;

    const botTimer = setTimeout(() => {
      let bidVal = 0;
      let isForced = false;
      const isFirstBidder = bot.id === (dealerIdx + 1) % 6;
      if (bot.id === dealerIdx && highestBid <= 4) {
        const estBid = calculateBotBid(bot.hand, 4, false, roundNumber);
        if (estBid >= 5) {
          bidVal = estBid;
          isForced = false;
        } else {
          bidVal = 5;
          isForced = true;
        }
      } else {
        bidVal = calculateBotBid(bot.hand, highestBid, isFirstBidder, roundNumber);
      }
      submitBid(bot.id, bidVal, isForced);
    }, 1700);

    return () => clearTimeout(botTimer);
  }, [currentTurn, dealerIdx, highestBid, isMultiplayerActive, isRoomHost, phase, players, roundNumber, submitBid]);

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
    const matchStatus = getMatchTargetAndStatus(curScoreA, curScoreB);
    const isMatchOver = matchStatus.isMatchOver || isAsamFirstRound;

    if (isMultiplayerActive && !isRoomHost) {
      showCallout('في انتظار المضيف لبدء الجولة القادمة ⏳', '⏳');
      return;
    }

    if (isMatchOver) {
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
          timestamp: Date.now(),
        });

        startNewRound(sharedDeck, randDealer);
      } else {
        startNewMatch();
      }
    } else {
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
  }, [bidWinner, currentDealingTeam, dealerIdx, deviceId, highestBid, isMultiplayerActive, isRoomHost, lastDealerTeamA, lastDealerTeamB, matchScoreTeamA, matchScoreTeamB, players, roomCode, roundNumber, seats, showCallout, startNewMatch, startNewRound, tricksTeamA, tricksTeamB]);

  // Round Completion logic
  const handleRoundFinish = useCallback(
    (buyerIsWinner: boolean, curTricksA: number, curTricksB: number) => {
      stopTimer();
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

      // الأصوات والرسائل في وسط الطاولة حسب فوز أو خسارة الفريق الحاكم
      if (buyerIsWinner) {
        // فوز الفريق الحاكم: تصفيق وتصفير تشويقي مع رسالة (كفو شباب)
        soundEngine.playCheeringAndWhistle();
        showCallout('كفو شباب! 👏🎉', '👑');
        nativeBridge.hapticVictory();
      } else {
        // خسارة الفريق الحاكم: نغمة استهزائية حزينة مع رسالة (راحت عليكم)
        soundEngine.playSadTromboneMock();
        showCallout('راحت عليكم! 😅👎', '💔');
        nativeBridge.hapticTrickWin();
      }

      // الانتقال التلقائي السلس للجولة القادمة بعد 2.5 ثانية دون أي شاشات منبثقة
      setTimeout(() => {
        handleNextRoundOrMatch(nextScore
