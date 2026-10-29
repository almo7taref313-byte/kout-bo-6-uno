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
import { RoundResultModal } from './components/RoundResultModal';
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

  // Round Result Modal State
  const [roundResult, setRoundResult] = useState<{
    buyerWinner: boolean;
    bidWinner: number | null;
    highestBid: number;
    isForcedBid: boolean;
  } | null>(null);

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
      setRoundResult(null);

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

      const humanTeam = players[currentHumanSeatIndex]?.team || 'A';
      const isMyTeamBuyer = buyerTeam === humanTeam;
      const isOpponentBuyer = !isMyTeamBuyer;
      const userWon = (buyerIsWinner && isMyTeamBuyer) || (!buyerIsWinner && !isMyTeamBuyer);
      const matchStatus = getMatchTargetAndStatus(nextScoreA, nextScoreB);
      const prevBothHadFiveOrMore = matchScoreTeamA >= 5 && matchScoreTeamB >= 5;
      const isAsamFirstRound =
        !prevBothHadFiveOrMore &&
        isBaoon &&
        buyerIsWinner &&
        roundNumber === 1 &&
        matchScoreTeamA === 0 &&
        matchScoreTeamB === 0 &&
        (buyerTeam === 'A' ? curTricksA : curTricksB) === 9;
      const isZeroAsam = !matchStatus.bothHaveFiveOrMore && (matchStatus.isZeroAsam || isAsamFirstRound);

      if (userWon) {
        nativeBridge.hapticVictory();
      }

      if (isZeroAsam) {
        if (userWon) {
          soundEngine.playVictoryFanfare(true);
          showCallout('كفو عطيتهم عسم! 👑', '👑');
        } else {
          soundEngine.playBustedSound();
          showCallout('عطاكم عسم! 🎯', '🎯');
        }
      } else if (matchStatus.isMatchOver) {
        if (userWon) {
          soundEngine.playVictoryFanfare(true);
          showCallout('فوز بالمباراة! كفووووو 🏆', '🏆');
        } else {
          soundEngine.playBustedSound();
          showCallout('خسرتوا المباراة! خيرها بغيرها 💔', '💔');
        }
      } else if (isOpponentBuyer && buyerIsWinner) {
        soundEngine.playBustedSound();
        showCallout('يابوها! 💥', '💥');
      } else if (userWon) {
        soundEngine.playVictoryFanfare(isBaoon);
        showCallout(isBaoon ? 'كفووووو! 👑' : 'فزت يا حلو! 🎉', isBaoon ? '👑' : '🎉');
      } else {
        soundEngine.playBustedSound();
        showCallout(isBaoon ? 'يالردي! 💔' : 'خسرت يا حلو! ❌', isBaoon ? '💔' : '❌');
      }

      setRoundResult({
        buyerWinner: buyerIsWinner,
        bidWinner,
        highestBid,
        isForcedBid,
      });
    },
    [bidWinner, currentHumanSeatIndex, highestBid, isForcedBid, matchScoreTeamA, matchScoreTeamB, players, roundNumber, showCallout, stopTimer]
  );

  // Trick Resolution
  const resolveTrick = useCallback(
    (trick: TrickPlay[], precomputedWinnerId?: number) => {
      const winnerId = precomputedWinnerId !== undefined ? precomputedWinnerId : evaluateTrickWinner(trick, trumpColor, highestBid);
      const winnerPlayer = players[winnerId];

      let nextA = tricksTeamA;
      let nextB = tricksTeamB;

      if (winnerPlayer && winnerPlayer.team === 'A') {
        nextA++;
        setTricksTeamA(nextA);
      } else {
        nextB++;
        setTricksTeamB(nextB);
      }

      if (winnerPlayer && winnerPlayer.team === (players[currentHumanSeatIndex]?.team || 'A')) {
        nativeBridge.hapticTrickWin();
      }

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
      let activeTrick = currentTrick;
      if (activeTrick.length >= 6) {
        activeTrick = [];
        setCollectingWinnerId(null);
      }

      if (activeTrick.some((tp) => tp.playerId === playerId)) {
        return;
      }

      stopTimer();

      if (card.isJoker) {
        soundEngine.playJokerSlam();
        if (activeTrick.length === 0) {
          if (highestBid !== 9) {
            showCallout('الجيكر خاس يالردي! ⚠️ الكرت التالي يحدد اللون المطلوب', '⚠️');
          }
        } else {
          showCallout('يا سلام على الجيكر!!', '🃏');
        }
      } else if (card.isMaker) {
        soundEngine.playJokerSlam();
        if (activeTrick.length === 0) {
          if (highestBid !== 9) {
            showCallout('الميكر خاس يالردي! ⚠️ الكرت التالي يحدد اللون المطلوب', '⚠️');
          }
        } else {
          showCallout('الميكر نزل وقصها!', '🌈');
        }
      } else {
        soundEngine.playCardSlide();
      }

      if (playerId === currentHumanSeatIndex) {
        nativeBridge.hapticCardPlay();
      }

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === playerId) {
            return {
              ...p,
              hand: p.hand.filter((c) => c.id !== card.id && !(c.color === card.color && c.rank === card.rank)),
            };
          }
          return p;
        })
      );

      const nextTrick = [...activeTrick, { playerId, card }];
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

     // عند اكتمال الأوراق الست للأكلة
      if (nextTrick.length === 6) {
        setIsActionPending(true);
        const winnerId = evaluateTrickWinner(nextTrick, trumpColor, highestBid);

        // مهلة 1600ms (ثانية ونصف كاملة) لتثبت كل الكروت الستة على الطاولة وتراها العين بوضوح
        setTimeout(() => {
          soundEngine.playTrickSweep();
          setCollectingWinnerId(winnerId); // تبدأ الأوراق الآن بالانزلاق نحو الفائز

          // مهلة 1400ms لانزلاق الأوراق واختفائها عند صورة اللاعب
          setTimeout(() => {
            resolveTrick(nextTrick, winnerId);
          }, 1400);
        }, 1600); // <-- تم تغييرها هنا من 600 إلى 1600
      } else {
        const nextTurn = (playerId + 1) % 6;
        setCurrentTurn(nextTurn);
        if (nextTurn === currentHumanSeatIndex) {
          setIsActionPending(false);
        }
        startTimer();
      }
    },
    [currentHumanSeatIndex, currentTrick, deviceId, highestBid, isMultiplayerActive, resolveTrick, roomCode, showCallout, startTimer, stopTimer, trumpColor]
  );

  // Human card click
  const handleHumanCardClick = (card: Card) => {
    if (phase === 'BIDDING') {
      showCallout(card.roleTitle || card.label, '👁️');
      return;
    }

    if (phase !== 'PLAYING') return;

    if (currentTurn !== currentHumanSeatIndex) {
      const cur = players[currentTurn];
      showCallout(`اصبر يا معود! الدور عند ${cur ? cur.name : 'الخصم'} ⏳`, '✋');
      return;
    }

    if (currentTrick.length >= 6) {
      showCallout('لحظة، جاري لمّ الأكلة... 🧹', '⏳');
      return;
    }

    const me = players[currentHumanSeatIndex];
    if (!me) return;

    const isMeBuyer = bidWinner === currentHumanSeatIndex;
    if (currentTrick.length === 0 && (card.isJoker || card.isMaker)) {
      if (highestBid === 9) {
        if (!isMeBuyer) {
          showCallout('في الباون: افتتاح الأكلة بالجيكر أو الميكر للحاكم فقط! 👑', '⚠️');
          return;
        }
        const hasTrumpsInHand = Boolean(
          trumpColor && me.hand.some((c) => c.color === trumpColor)
        );
        if (hasTrumpsInHand) {
          showCallout('في الباون: العب جميع أوراق الحكم أولاً ثم الجيكر/الميكر! 👑', '⚠️');
          return;
        }
      } else {
        const hasOther = me.hand.some((c) => !c.isJoker && !c.isMaker);
        if (hasOther) {
          showCallout('الميكر والجيكر لا يبدأ اللعب بهما أبداً! 🚫', '⚠️');
          return;
        }
      }
    }

    const hasJokerInTrick = currentTrick.some((p, idx) => p.card.isJoker && (highestBid === 9 || idx > 0));
    if (hasJokerInTrick && card.isMaker && me.hand.some((c) => !c.isMaker)) {
      showCallout('ما تنزل الميكر على الجيكر!', '🚫');
      return;
    }

    if (!isLegalMove(me.hand, card, currentTrick, highestBid, trumpColor, isMeBuyer)) {
      const leadColor = getEffectiveLeadColor(currentTrick, highestBid, trumpColor);
      if (leadColor && me.hand.some((c) => c.color === leadColor)) {
        const colName = SUIT_COLORS[leadColor]?.name || leadColor;
        showCallout(`لازم تنزل نفس لون الأكلة (${colName})! ⚠️`, '⚠️');
      } else {
        showCallout('الكرت غير مسموح بهذه الأكلة! ⚠️', '⚠️');
      }
      return;
    }

    setIsActionPending(true);
    handlePlayCard(currentHumanSeatIndex, card);
  };

 // Bot card play automation
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    if (currentTrick.length === 6) return;

    const bot = players[currentTurn];
    if (!bot || bot.hand.length === 0) return;

    if (bot.isHuman) return;
    if (isMultiplayerActive && !isRoomHost) return;

    // تم رفع وقت تفكير البوت إلى 1400ms لإعطاء ركادة واقعية بين كل لاعب وآخر
    const botTimer = setTimeout(() => {
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
  }, [bidWinner, currentTrick, currentTurn, dealerIdx, handlePlayCard, highestBid, isMultiplayerActive, isRoomHost, phase, playedTricksInRound, players, roundNumber, trumpColor]);
  // Timeout handler for active turn
  useEffect(() => {
    if (timerRemaining > 0) return;

    if (isAllHumanGame) {
      return;
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

    if (phase === 'BIDDING') {
      submitBid(currentTurn, 0);
    } else if (phase === 'PLAYING') {
      if (cur.hand.length > 0) {
        const chosen = getTimeoutFallbackMove(cur.hand, currentTrick, trumpColor, cur.id, players, highestBid, bidWinner);
        handlePlayCard(cur.id, chosen);
      }
    }
  }, [bidWinner, currentHumanSeatIndex, currentTrick, currentTurn, handlePlayCard, highestBid, isAllHumanGame, isMultiplayerActive, isRoomHost, phase, players, submitBid, timerRemaining, trumpColor]);

  const handleNextRoundOrMatch = () => {
    const isBaoon = highestBid === 9;
    const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
    const buyerTricks = buyerPlayer ? (buyerPlayer.team === 'A' ? tricksTeamA : tricksTeamB) : 0;
    const prevBothHadFiveOrMore = matchScoreTeamA >= 5 && matchScoreTeamB >= 5;
    const isAsamFirstRound =
      !prevBothHadFiveOrMore &&
      isBaoon &&
      buyerTricks >= 9 &&
      roundNumber === 1 &&
      (buyerPlayer ? (buyerPlayer.team === 'A' ? matchScoreTeamB === 0 : matchScoreTeamA === 0) : false);
    const matchStatus = getMatchTargetAndStatus(matchScoreTeamA, matchScoreTeamB);
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
        matchScoreTeamA,
        matchScoreTeamB,
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
          scores: { a: matchScoreTeamA, b: matchScoreTeamB },
          timestamp: Date.now(),
        });
        startNewRound(sharedDeck, nextDealer);
      } else {
        startNewRound(undefined, nextDealer);
      }
    }
  };

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
              joinerName = `لاعب (هاتف)`;
            }

            const newPlayer: WaitingPlayer = {
              clientId: joinerId,
              name: joinerName,
              avatarId: msg.player?.avatarId || 'kuwaiti_shemagh_red',
              customPhoto: msg.player?.customPhoto || null,
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
                showCallout(`انضم لاعب جديد: ${joinerName} ⏳`, '⏳');
                soundEngine.playCardSlide();
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
                const teamName = myAssignedIdx % 2 === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
                showCallout(`عيّنك المضيف في المقعد #${myAssignedIdx + 1} (${teamName}) 💺`, '💺');
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
        soundEngine.playCardSlide();

        let activeSeats = msg.seats || seats;
        let myAssignedIdx = currentHumanSeatIndex;

        if (msg.seats) {
          const foundIdx = msg.seats.findIndex(
            (s) => !s.isVacant && s.clientId && (s.clientId === deviceId || s.clientId === roomSync.myClientId)
          );
          if (foundIdx !== -1) {
            myAssignedIdx = foundIdx;
            setCurrentHumanSeatIndex(foundIdx);
          }
          activeSeats = msg.seats.map((s, i) =>
            i === myAssignedIdx ? { ...s, isHuman: true, isVacant: false } : s
          );
          setSeats(activeSeats);
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
        showCallout('بدأ اللعب للجميع! 🃏', '🚀');
        break;
      }

      case 'PLAYER_BID': {
        if (msg.playerId !== undefined && msg.val !== undefined) {
          submitBid(msg.playerId, msg.val, msg.forced ?? false, true);
        }
        break;
      }

      case 'TRUMP_CHOSEN': {
        if (msg.color) {
          chooseTrumpColor(msg.color, msg.playerId, true);
        }
        break;
      }

      case 'CARD_PLAYED': {
        if (msg.playerId !== undefined && msg.card) {
          handlePlayCard(msg.playerId, msg.card, true);
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
          showCallout(`بدأت الجولة ${msg.roundNumber ?? ''}! 🃏`, '🔄');
        }
        break;
      }

      case 'LEAVE_ROOM': {
        if (isRoomHost) {
          const leavingId = msg.senderId;
          const updatedWaiting = waitingPlayers.filter((w) => w.clientId !== leavingId);
          setWaitingPlayers(updatedWaiting);

          let seatChanged = false;
          const updatedSeats = seats.map((s) => {
            if (s.clientId === leavingId && s.id !== 0) {
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
        break;
      }

      default:
        break;
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

  // Profile Save
  const handleSaveProfileName = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('kout_user_name', newName);
    setSeats((prev) => {
      const copy = [...prev];
      if (copy[currentHumanSeatIndex]) copy[currentHumanSeatIndex].name = newName;
      return copy;
    });
    setPlayers((prev) => {
      const copy = [...prev];
      if (copy[currentHumanSeatIndex]) copy[currentHumanSeatIndex].name = newName;
      return copy;
    });
  };

  const handleSelectAvatar = (avId: string) => {
    setUserAvatar(avId);
    setUserCustomPhoto(null);
    localStorage.setItem('kout_user_avatar', avId);
    localStorage.removeItem('kout_custom_photo');
    setSeats((prev) => {
      const copy = [...prev];
      if (copy[currentHumanSeatIndex]) {
        copy[currentHumanSeatIndex].avatarId = avId;
        copy[currentHumanSeatIndex].customPhoto = null;
      }
      return copy;
    });
    setPlayers((prev) => {
      const copy = [...prev];
      if (copy[currentHumanSeatIndex]) {
        copy[currentHumanSeatIndex].avatarId = avId;
        copy[currentHumanSeatIndex].customPhoto = null;
      }
      return copy;
    });
    showCallout('تم اختيار الشخصية!', '👤');
  };

  const handleUploadPhoto = (dataUrl: string) => {
    setUserCustomPhoto(dataUrl);
    localStorage.setItem('kout_custom_photo', dataUrl);
    setSeats((prev) => {
      const copy = [...prev];
      if (copy[currentHumanSeatIndex]) copy[currentHumanSeatIndex].customPhoto = dataUrl;
      return copy;
    });
    setPlayers((prev) => {
      const copy = [...prev];
      if (copy[currentHumanSeatIndex]) copy[currentHumanSeatIndex].customPhoto = dataUrl;
      return copy;
    });
    showCallout('تم حفظ صورتك الشخصية!', '📷');
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
    showCallout(`طاولتك الخاصة #${roomCode} (تحكم باللاعبين والمقاعد) 🚪`, '👥');
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
    const teamLabel = team === 'A' ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
    showCallout(`تم تسكين ${player.name} في المقعد #${seatIdx + 1} (${teamLabel}) ✅`, '💺');
  };

  const handleMovePlayerToWaiting = (seatIdx: number) => {
    if (!isRoomHost) return;
    if (seatIdx === 0) {
      showCallout('أنت المضيف ورئيس الطاولة، لا يمكن نقلك للانتظار!', '⚠️');
      return;
    }
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

    showCallout(`تم نقل ${occupant.name || `المقعد #${seatIdx + 1}`} إلى قائمة الانتظار ⏳`, '⏳');
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
    showCallout(`تم تبديل المقعدين #${idxA + 1} و #${idxB + 1} 🔄`, '🔄');
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
    if (idx === currentHumanSeatIndex) {
      showCallout('لا يمكنك تحويل مقعدك إلى بوت!', '⚠️');
      return;
    }
    setSeats((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        name: DEFAULT_BOT_PROFILES[idx]?.name || `بوت ${idx + 1}`,
        avatarId: DEFAULT_BOT_PROFILES[idx]?.avatarId || 'kuwaiti_shemagh_red',
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
    showCallout(`تم تحويل المقعد #${idx} إلى بوت 🤖`, '🤖');
  };

  const handleVacateSeatDirect = (idx: number) => {
    if (idx === currentHumanSeatIndex) {
      showCallout('لا يمكنك تفريغ مقعدك الحالي!', '⚠️');
      return;
    }
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
    showCallout(`أصبح المقعد #${idx} شاغراً ⏳`, '⏳');
  };

  const handleFillAllWithBots = () => {
    setSeats((prev) => {
      const next = prev.map((seat, idx) => {
        if (idx === currentHumanSeatIndex) return seat;
        if (seat.isVacant || !seat.name || seat.name.trim() === '') {
          return {
            ...seat,
            name: DEFAULT_BOT_PROFILES[idx]?.name || `بوت ${idx + 1}`,
            avatarId: DEFAULT_BOT_PROFILES[idx]?.avatarId || 'kuwaiti_shemagh_red',
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
    showCallout('تم ملء الشواغر ببوتات ذكية 🤖', '🤖');
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
    showCallout('تم إفراغ جميع المقاعد ⏳', '⏳');
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
    showCallout('تم حفظ بيانات المقعد!', '✅');
  };

  const handleVacateSeat = () => {
    if (editingSeatIndex === null) return;
    if (editingSeatIndex === currentHumanSeatIndex) {
      showCallout('لا يمكنك تفريغ مقعدك الحالي!', '⚠️');
      return;
    }
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
    showCallout('تم جعل المقعد شاغراً', '🔄');
  };

  const handleSetAutoScreen = () => {
    document.body.classList.remove('forced-landscape-mode');
    setShowScreenModal(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    showCallout('وضع الشاشة: تلقائي 🔄', '🔄');
  };

  const handleSetLandscapeScreen = () => {
    setShowScreenModal(false);
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      document.body.classList.add('forced-landscape-mode');
    } else {
      document.body.classList.remove('forced-landscape-mode');
    }
    showCallout('تم تحويل العرض إلى الوضع الأفقي 📱', '🖥️');
  };

  const handleToggleFullscreen = () => {
    setShowScreenModal(false);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        showCallout('تثبيت التطبيق مطلوب لملء الشاشة', '📲');
      });
      showCallout('ملء الشاشة ⛶', '⛶');
    } else {
      document.exitFullscreen().catch(() => {});
      showCallout('إلغاء ملء الشاشة 🔲', '🔲');
    }
  };

  return (
    <div id="gameMainWrapper" className="h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col justify-between select-none overflow-hidden safe-top safe-bottom relative">
      
      {/* 0. Main Lobby Screen */}
      {phase === 'LOBBY' && (
        <LobbyScreen
          userName={userName}
          avatarId={userAvatar}
          customPhoto={userCustomPhoto}
          soundEnabled={soundEnabled}
          onFastPlay={() => {
            soundEngine.init();
            soundEngine.playCardSlide();
            const stdSeats = JSON.parse(JSON.stringify(DEFAULT_SEATS));
            stdSeats[0].name = userName;
            stdSeats[0].avatarId = userAvatar;
            stdSeats[0].customPhoto = userCustomPhoto;
            stdSeats[0].clientId = deviceId;
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
            onToggleSound={toggleSound}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenRooms={() => setShowRoomsModal(true)}
            onOpenRules={() => setShowRulesModal(true)}
            onOpenScreenModal={() => setShowScreenModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onReturnToLobby={() => {
              stopTimer();
              setPhase('LOBBY');
            }}
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

     {/* تم إلغاء ظهور شاشة نتيجة الجولة تماماً */}
      {/* {phase === 'ROUND_END' && roundResult && (
        <RoundResultModal
          ...
        />
      )} */}

      {/* Host Friends & Custom Table Modal */}
      {showHostModal && (
        <HostTableModal
          roomCode={roomCode}
          seats={seats}
          currentHumanSeatIndex={currentHumanSeatIndex}
          isHost={isRoomHost}
          waitingPlayers={waitingPlayers}
          lastSeatReserved={lastSeatReserved}
          isMatchOngoing={phase !== 'LOBBY'}
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
            showCallout(`غرفة جديدة #${nextCode} (5 مقاعد شاغرة) 🔄`, '🔄');
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
            const finalFilledSeats = seats.map((seat, idx) => {
              if (seat.isVacant || !seat.name || seat.name.trim() === '') {
                return {
                  ...seat,
                  name: DEFAULT_BOT_PROFILES[idx]?.name || `بوت ${idx + 1}`,
                  avatarId: DEFAULT_BOT_PROFILES[idx]?.avatarId || 'kuwaiti_shemagh_red',
                  customPhoto: null,
                  isHuman: false,
                  isVacant: false,
                };
              }
              return seat;
            });
            setSeats(finalFilledSeats);
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
              timestamp: Date.now(),
            });

            startNewRound(sharedDeck, randDealer, finalFilledSeats);
            showCallout(`طاولتك برمز #${roomCode} - بدأ اللعب للجميع! 🚀`, '👥');
          }}
          onClose={() => setShowHostModal(false)}
        />
      )}

      {/* Waiting Lobby for players who joined via 4-digit code */}
      {isMultiplayerActive && !isRoomHost && phase === 'LOBBY' && (
        <WaitingLobbyModal
          roomCode={roomCode}
          seats={seats}
          waitingPlayers={waitingPlayers}
          myClientId={deviceId}
          myName={userName}
          myAvatarId={userAvatar}
          myCustomPhoto={userCustomPhoto}
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
          onSetAuto={handleSetAutoScreen}
          onSetLandscape={handleSetLandscapeScreen}
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
            showCallout(`طاولتك برمز #${nextCode} (5 مقاعد شاغرة)`, '🚪');
          }}
          onJoinRoom={(code) => {
            setShowRoomsModal(false);
            handleJoinRoomWaiting(code);
          }}
          onClose={() => setShowRoomsModal(false)}
        />
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <ExitConfirmModal
          onConfirm={() => {
            setShowExitConfirm(false);
            stopTimer();
            setPhase('LOBBY');
            showCallout('القائمة الرئيسية', '👋');
          }}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
    </div>
  );
}
