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
  BotStrategyContext,
} from './utils/gameLogic';
import { soundEngine } from './utils/soundEngine';
import { usePWAInstall } from './utils/usePWAInstall';

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
import { roomSync, RoomSyncMessage } from './utils/roomSync';

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

// Helper to create starting table for private room with 5 vacant seats
const createVacantPrivateSeats = (hostName: string, hostAvatar: string, hostPhoto: string | null): SeatConfig[] => {
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
  const [isRoomHost, setIsRoomHost] = useState<boolean>(true);
  const [isMultiplayerActive, setIsMultiplayerActive] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    return Boolean(r && r.length === 4);
  });
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
    return s;
  });
  const [currentHumanSeatIndex, setCurrentHumanSeatIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);

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
  const [timerRemaining, setTimerRemaining] = useState<number>(12);

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

  // Check if private room has all real human players (no bots)
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

  // Sync Audio Engine
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
    if (next) showCallout('المؤثرات مفعّلة 🔊', '🔊');
  };

  // Timer runner
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

    setTimerRemaining(12);

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

  // Initial Deal & Start Round
  const startNewRound = useCallback(
    (deckOverride?: Card[], forcedDealerIdx?: number, seatsOverride?: SeatConfig[]) => {
      stopTimer();
      setIsActionPending(false);

      const activeDealer = forcedDealerIdx !== undefined ? forcedDealerIdx : dealerIdx;
      setDealerIdx(activeDealer);

      const activeSeats = seatsOverride || seats;
      const deck = deckOverride || buildDeck();
      const freshPlayers: Player[] = activeSeats.map((seatCfg, idx) => {
        const isMe = idx === currentHumanSeatIndex;
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

      // In Kout Bo 6: Dealing and bidding go Counter-Clockwise (عكس عقارب الساعة).
      // First bidder is the player immediately to the dealer's right: (activeDealer + 1) % 6.
      // Bidding proceeds: (activeDealer + 1) % 6 -> ... -> activeDealer is the 6th and LAST bidder.
      const firstBidder = (activeDealer + 1) % 6;
      setCurrentTurn(firstBidder);
      setPhase('BIDDING');

      const dealerPlayer = freshPlayers[activeDealer];
      const dealerName = dealerPlayer ? dealerPlayer.name : `لاعب ${activeDealer + 1}`;
      showCallout(`الموزع ${dealerName} وزّع الورق! المزاد يبدأ والموزع آخر من يزايد 🃏`, '🃏');
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
    startNewRound(undefined, randDealer);
  }, [startNewRound]);

  // Seat Reservation when joining via room code or link
  const handleJoinRoomWithSeatReservation = useCallback(
    (code: string) => {
      setRoomCode(code);
      setIsRoomHost(false);
      setIsMultiplayerActive(true);

      // Check for saved seats for this room or generate starting table with vacant seats
      const storedSeats = localStorage.getItem(`kout_room_seats_${code}`);
      let currentSeats: SeatConfig[] = storedSeats
        ? JSON.parse(storedSeats)
        : createVacantPrivateSeats('منشئ الغرفة 👑', 'kuwaiti_ghutra_white', null);

      // Prefer seat 1 (Team Red 🔴) or next vacant seat
      const targetSeat = [1, 3, 5, 2, 4].find((idx) => currentSeats[idx]?.isVacant) ?? 1;

      currentSeats = currentSeats.map((s, idx) => {
        if (idx === targetSeat) {
          return {
            id: idx,
            name: userName,
            team: idx % 2 === 0 ? 'A' : 'B',
            avatarId: userAvatar,
            customPhoto: userCustomPhoto,
            isHuman: true,
            isVacant: false,
          };
        }
        return s;
      });

      const vacantCount = currentSeats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;

      setSeats(currentSeats);
      setCurrentHumanSeatIndex(targetSeat);
      setShowHostModal(true);

      const teamName = targetSeat % 2 === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
      const seatInfo = {
        seatIndex: targetSeat,
        name: userName,
        team: targetSeat % 2 === 0 ? 'A' : 'B',
        avatarId: userAvatar,
        customPhoto: userCustomPhoto,
      };
      setLastSeatReserved(seatInfo);

      try {
        localStorage.setItem(`kout_room_seats_${code}`, JSON.stringify(currentSeats));
      } catch {}

      // Broadcast to host and all participants across devices and tabs
      roomSync.publish({
        type: 'SEAT_RESERVED',
        roomCode: code,
        senderId: roomSync.myClientId,
        seatIndex: targetSeat,
        player: {
          name: userName,
          team: targetSeat % 2 === 0 ? 'A' : 'B',
          avatarId: userAvatar,
          customPhoto: userCustomPhoto,
          isHuman: true,
        },
        seats: currentSeats,
        vacantCount,
        timestamp: Date.now(),
      });

      // Request immediate room state and match sync from host
      roomSync.publish({
        type: 'JOIN_REQUEST',
        roomCode: code,
        senderId: roomSync.myClientId,
        timestamp: Date.now(),
      });
      roomSync.publish({
        type: 'SYNC_REQUEST',
        roomCode: code,
        senderId: roomSync.myClientId,
        timestamp: Date.now(),
      });

      soundEngine.playCardSlide();
      showCallout(`انضممت للغرفة #${code}! حجزت المقعد #${targetSeat} في ${teamName} (المقاعد الشاغرة: ${vacantCount}) 💺`, '💺');
    },
    [showCallout, userAvatar, userCustomPhoto, userName]
  );

  // Handle URL Room query parameter on mount: join room and wait for host
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    if (r && r.length === 4) {
      handleJoinRoomWithSeatReservation(r);
    }
  }, [handleJoinRoomWithSeatReservation]);

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
          senderId: roomSync.myClientId,
          color,
          playerId: winner,
          timestamp: Date.now(),
        });
      }

      startTimer();
    },
    [bidWinner, currentHumanSeatIndex, isMultiplayerActive, roomCode, showCallout, startTimer, stopTimer]
  );

  // Bidding resolution
  const submitBid = useCallback(
    (playerId: number, val: number, forced = false, isFromRemote = false) => {
      stopTimer();
      const player = players[playerId];
      const pName = player ? player.name : `لاعب ${playerId + 1}`;

      // In Kout Bo 6:
      // If forced is true, OR if dealer is bidding and all 5 previous players passed and val === 0:
      // The dealer is forced ("ملزوم") to buy at 5 (penalty is only 5 upon loss).
      // If dealer voluntarily chose a bid (forced is false and val >= 5):
      // Penalty doubles upon loss (e.g. chosen 5 -> 10 points).
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

      // Broadcast bid action to other devices
      if (isMultiplayerActive && !isFromRemote) {
        roomSync.publish({
          type: 'PLAYER_BID',
          roomCode,
          senderId: roomSync.myClientId,
          playerId,
          val: effectiveVal,
          forced: isDealerForced,
          timestamp: Date.now(),
        });
      }

      // If Baoon (9), finish bidding immediately
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

      // Check if all 6 players finished bidding
      const historyLength = nextBids.length;
      if (historyLength === 6) {
        setTimeout(() => {
          if (newWinner === null) {
            // Dealer forced to bid 5 ("ملزوم")
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
    [biddingHistory, bidWinner, chooseTrumpColor, currentTurn, dealerIdx, highestBid, isMultiplayerActive, isRoomHost, players, roomCode, showCallout, startTimer, stopTimer]
  );

  // Bot bidding automation
  useEffect(() => {
    if (phase !== 'BIDDING') return;
    if (highestBid >= 9) return;

    const bot = players[currentTurn];
    if (!bot) return;

    // Never automate human players, and in multiplayer ONLY the host automates bots!
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
      const penaltyMultiplier = isBaoon ? 1 : isForcedBid ? 1 : 2;
      const defensePts = isBaoon ? 18 : pts * penaltyMultiplier;

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
      const isAsamFirstRound = isBaoon && buyerIsWinner && roundNumber === 1;
      const isZeroAsam = matchStatus.isZeroAsam;

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
      const winnerId = precomputedWinnerId !== undefined ? precomputedWinnerId : evaluateTrickWinner(trick, trumpColor);
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

      setCurrentTrick([]);
      setPlayedTricksInRound((prev) => [...prev, trick]);
      setCollectingWinnerId(null);

      // Early victory check
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

      // Check if 9 tricks completed
      if (nextA + nextB === 9) {
        handleRoundFinish(buyerTricks >= target, nextA, nextB);
        return;
      }

      // Next trick leader
      setCurrentTurn(winnerId);
      if (winnerId === currentHumanSeatIndex) {
        setIsActionPending(false);
      }
      startTimer();
    },
    [bidWinner, currentHumanSeatIndex, handleRoundFinish, highestBid, players, startTimer, tricksTeamA, tricksTeamB, trumpColor]
  );

  // Card play action
  const handlePlayCard = useCallback(
    (playerId: number, card: Card, isFromRemote = false) => {
      stopTimer();

      if (card.isJoker) {
        soundEngine.playJokerSlam();
        showCallout('يا سلام على الجيكر!!', '🃏');
      } else if (card.isMaker) {
        soundEngine.playJokerSlam();
        showCallout('الميكر نزل وقصها!', '🌈');
      } else {
        soundEngine.playCardSlide();
      }

      // Remove from player's hand
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === playerId) {
            return {
              ...p,
              hand: p.hand.filter((c) => c.id !== card.id),
            };
          }
          return p;
        })
      );

      const nextTrick = [...currentTrick, { playerId, card }];
      setCurrentTrick(nextTrick);

      // Broadcast card play to other devices if played locally
      if (isMultiplayerActive && !isFromRemote) {
        roomSync.publish({
          type: 'CARD_PLAYED',
          roomCode,
          senderId: roomSync.myClientId,
          playerId,
          card,
          timestamp: Date.now(),
        });
      }

      if (nextTrick.length === 6) {
        setIsActionPending(true);
        const winnerId = evaluateTrickWinner(nextTrick, trumpColor);

        // Step 1: Wait 600ms so players see the last played card
        setTimeout(() => {
          // Step 2: Play sweep sound and start grouped card flight to winning player's seat
          soundEngine.playTrickSweep();
          setCollectingWinnerId(winnerId);

          // Step 3: When cards arrive at winner's seat (1250ms), resolve scores and transition
          setTimeout(() => {
            resolveTrick(nextTrick, winnerId);
          }, 1250);
        }, 600);
      } else {
        const nextTurn = (currentTurn + 1) % 6;
        setCurrentTurn(nextTurn);
        if (nextTurn === currentHumanSeatIndex) {
          setIsActionPending(false);
        }
        startTimer();
      }
    },
    [currentHumanSeatIndex, currentTrick, currentTurn, isMultiplayerActive, resolveTrick, roomCode, showCallout, startTimer, stopTimer, trumpColor]
  );

  // Human card click
  const handleHumanCardClick = (card: Card) => {
    if (phase === 'BIDDING') {
      showCallout(card.roleTitle || card.label, '👁️');
      return;
    }

    if (phase === 'PLAYING' && currentTurn !== currentHumanSeatIndex) {
      const cur = players[currentTurn];
      showCallout(`اصبر يا معود! الدور عند ${cur ? cur.name : 'الخصم'} ⏳`, '✋');
      return;
    }

    if (phase !== 'PLAYING' || currentTurn !== currentHumanSeatIndex || isActionPending) return;

    const me = players[currentHumanSeatIndex];
    if (!me) return;

    // Opening rule check
    if (currentTrick.length === 0 && (card.isJoker || card.isMaker)) {
      const hasOther = me.hand.some((c) => !c.isJoker && !c.isMaker);
      if (hasOther) {
        showCallout('ممنوع تفتتح بالجيكر أو الميكر!', '⚠️');
        return;
      }
    }

    // Maker onto Joker check
    if (currentTrick.some((p) => p.card.isJoker) && card.isMaker && me.hand.some((c) => !c.isMaker)) {
      showCallout('ما تنزل الميكر على الجيكر!', '🚫');
      return;
    }

    // Following suit rule
    if (!isLegalMove(me.hand, card, currentTrick)) {
      showCallout('لازم تنزل نفس لون الأكلة!', '⚠️');
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

    // Never automate human player seats
    if (bot.isHuman) return;
    // In multiplayer, ONLY the room host automates bot moves to prevent duplicate turns
    if (isMultiplayerActive && !isRoomHost) return;

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
    }, 850);

    return () => clearTimeout(botTimer);
  }, [bidWinner, currentTrick, currentTurn, dealerIdx, handlePlayCard, highestBid, isMultiplayerActive, isRoomHost, phase, playedTricksInRound, players, roundNumber, trumpColor]);

  // Timeout handler for active turn
  useEffect(() => {
    if (timerRemaining > 0) return;

    // In private room with all humans, turn timer is completely disabled
    if (isAllHumanGame) {
      return;
    }

    const cur = players[currentTurn];
    if (!cur) return;

    // In multiplayer, remote human players manage their own timeout, and only host handles bots
    if (isMultiplayerActive) {
      if (cur.isHuman && currentTurn !== currentHumanSeatIndex) {
        return;
      }
      if (!cur.isHuman && !isRoomHost) {
        return;
      }
    }

    if (phase === 'BIDDING') {
      submitBid(currentTurn, 0); // Force pass
    } else if (phase === 'PLAYING') {
      if (cur.hand.length > 0) {
        const chosen = getTimeoutFallbackMove(cur.hand, currentTrick, trumpColor);
        handlePlayCard(cur.id, chosen);
      }
    }
  }, [currentHumanSeatIndex, currentTrick, currentTurn, handlePlayCard, isAllHumanGame, isMultiplayerActive, isRoomHost, phase, players, submitBid, timerRemaining, trumpColor]);

  // Next round / Next match
  const handleNextRoundOrMatch = () => {
    const isBaoon = highestBid === 9;
    const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
    const buyerTricks = buyerPlayer ? (buyerPlayer.team === 'A' ? tricksTeamA : tricksTeamB) : 0;
    const isAsamFirstRound = isBaoon && buyerTricks >= 9 && roundNumber === 1;
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

        roomSync.publish({
          type: 'START_GAME',
          roomCode,
          senderId: roomSync.myClientId,
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
      const nextDealer = (dealerIdx + 1) % 6;
      setRoundNumber(nextR);
      setDealerIdx(nextDealer);

      if (isMultiplayerActive) {
        const sharedDeck = buildDeck();
        roomSync.publish({
          type: 'NEW_ROUND',
          roomCode,
          senderId: roomSync.myClientId,
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

  // Room synchronization subscription for multiplayer actions & room state
  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = roomSync.subscribeRoom(roomCode, (msg: RoomSyncMessage) => {
      if (msg.senderId === roomSync.myClientId) return;

      switch (msg.type) {
        case 'JOIN_REQUEST': {
          // If this client is host, broadcast current seats table back
          if (isRoomHost) {
            const vCount = seats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
            roomSync.publish({
              type: 'ROOM_STATE',
              roomCode,
              senderId: roomSync.myClientId,
              seats,
              vacantCount: vCount,
              timestamp: Date.now(),
            });

            // If game is active, broadcast full table snapshot so joining player immediately catches up
            if (phase !== 'LOBBY') {
              roomSync.publish({
                type: 'SYNC_STATE',
                roomCode,
                senderId: roomSync.myClientId,
                phase,
                currentTurn,
                currentTrick,
                trumpColor,
                highestBid,
                bidWinner,
                isForcedBid,
                biddingHistory,
                roundNumber,
                dealerIdx,
                scores: { a: matchScoreTeamA, b: matchScoreTeamB },
                nextA: tricksTeamA,
                nextB: tricksTeamB,
                seats,
                allHands: players.map((p) => ({
                  playerId: p.id,
                  hand: p.hand,
                  isHuman: p.isHuman,
                  name: p.name,
                })),
                timestamp: Date.now(),
              });
            }
          }
          break;
        }

        case 'SEAT_RESERVED': {
          if (msg.seats) {
            setSeats(msg.seats);
          } else if (msg.seatIndex !== undefined && msg.player) {
            setSeats((prev) => {
              const next = [...prev];
              next[msg.seatIndex!] = {
                id: msg.seatIndex!,
                name: msg.player!.name,
                team: msg.player!.team,
                avatarId: msg.player!.avatarId || 'kuwaiti_shemagh_red',
                customPhoto: msg.player!.customPhoto || null,
                isHuman: true,
                isVacant: false,
              };
              if (msg.oldSeatIndex !== undefined && msg.oldSeatIndex !== msg.seatIndex) {
                next[msg.oldSeatIndex] = {
                  ...next[msg.oldSeatIndex],
                  name: '',
                  customPhoto: null,
                  isHuman: false,
                  isVacant: true,
                };
              }
              return next;
            });
          }

          if (msg.player && msg.seatIndex !== undefined) {
            setLastSeatReserved({
              seatIndex: msg.seatIndex,
              name: msg.player.name,
              team: msg.player.team,
              avatarId: msg.player.avatarId,
              customPhoto: msg.player.customPhoto,
            });
            const teamName = msg.player.team === 'A' ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
            showCallout(`انضم ${msg.player.name} إلى المقعد #${msg.seatIndex} (${teamName}) 💺`, '💺');
            soundEngine.playCardSlide();
          }

          // If host, sync state to all devices
          if (isRoomHost && msg.seats) {
            const vCount = msg.seats.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
            roomSync.publish({
              type: 'ROOM_STATE',
              roomCode,
              senderId: roomSync.myClientId,
              seats: msg.seats,
              vacantCount: vCount,
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'ROOM_STATE': {
          if (msg.seats) {
            setSeats((prev) => {
              return msg.seats!.map((s, idx) => {
                if (idx === currentHumanSeatIndex && prev[idx]?.isHuman) {
                  return prev[idx];
                }
                return s;
              });
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

          if (msg.seats) {
            setSeats(msg.seats);
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
            startNewRound(msg.deck, msg.dealerIdx, msg.seats);
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
            if (msg.scores) {
              setMatchScoreTeamA(msg.scores.a);
              setMatchScoreTeamB(msg.scores.b);
            }
            startNewRound(msg.deck, msg.dealerIdx);
            showCallout(`بدأت الجولة ${msg.roundNumber ?? ''}! 🃏`, '🔄');
          }
          break;
        }

        case 'BOT_TAKEOVER': {
          if (msg.seatIndex !== undefined && msg.player) {
            const seatIdx = msg.seatIndex;
            setSeats((prev) => {
              const next = [...prev];
              next[seatIdx] = {
                id: seatIdx,
                name: msg.player!.name,
                team: msg.player!.team,
                avatarId: msg.player!.avatarId || 'kuwaiti_shemagh_red',
                customPhoto: msg.player!.customPhoto || null,
                isHuman: true,
                isVacant: false,
              };
              return next;
            });

            setPlayers((prev) => {
              const next = [...prev];
              if (next[seatIdx]) {
                next[seatIdx] = {
                  ...next[seatIdx],
                  name: msg.player!.name,
                  avatarId: msg.player!.avatarId || 'kuwaiti_shemagh_red',
                  customPhoto: msg.player!.customPhoto || null,
                  isHuman: true,
                  isVacant: false,
                };
              }
              return next;
            });

            // If this is the Host, broadcast back the takeover confirmation along with the bot's current hand
            if (isRoomHost) {
              const botHand = players[seatIdx]?.hand || [];
              roomSync.publish({
                type: 'BOT_TAKEOVER',
                roomCode,
                senderId: roomSync.myClientId,
                seatIndex: seatIdx,
                player: msg.player,
                hand: botHand,
                scores: { a: matchScoreTeamA, b: matchScoreTeamB },
                dealerIdx,
                roundNumber,
                color: trumpColor || undefined,
                val: highestBid,
                playerId: bidWinner !== null ? bidWinner : undefined,
                timestamp: Date.now(),
              });
            }

            showCallout(`دخل ${msg.player.name} مكان البوت في المقعد #${seatIdx} مباشرة! ⚡`, '⚡');
            soundEngine.playCardSlide();
          } else if (msg.hand && msg.seatIndex === currentHumanSeatIndex) {
            // Player who took over receives their hand from host!
            setPlayers((prev) => {
              const next = [...prev];
              if (next[currentHumanSeatIndex]) {
                next[currentHumanSeatIndex] = {
                  ...next[currentHumanSeatIndex],
                  hand: msg.hand!,
                  isHuman: true,
                };
              }
              return next;
            });
            if (msg.color) setTrumpColor(msg.color);
            if (msg.val) setHighestBid(msg.val);
            if (msg.playerId !== undefined) setBidWinner(msg.playerId);
            setPhase('PLAYING');
            setShowHostModal(false);
            setShowRoomsModal(false);
          }
          break;
        }

        case 'SYNC_REQUEST': {
          if (isRoomHost) {
            roomSync.publish({
              type: 'SYNC_STATE',
              roomCode,
              senderId: roomSync.myClientId,
              phase,
              currentTurn,
              currentTrick,
              trumpColor,
              highestBid,
              bidWinner,
              isForcedBid,
              biddingHistory,
              roundNumber,
              dealerIdx,
              scores: { a: matchScoreTeamA, b: matchScoreTeamB },
              nextA: tricksTeamA,
              nextB: tricksTeamB,
              seats,
              allHands: players.map((p) => ({
                playerId: p.id,
                hand: p.hand,
                isHuman: p.isHuman,
                name: p.name,
              })),
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'SYNC_STATE': {
          if (msg.phase) {
            setPhase(msg.phase as GamePhase);
            if (msg.phase !== 'LOBBY') {
              setIsMultiplayerActive(true);
            }
          }
          if (msg.currentTurn !== undefined) {
            setCurrentTurn(msg.currentTurn);
            if (msg.currentTurn === currentHumanSeatIndex) {
              setIsActionPending(false);
            }
          }
          if (msg.currentTrick) {
            setCurrentTrick(msg.currentTrick);
          }
          if (msg.trumpColor !== undefined) {
            setTrumpColor(msg.trumpColor);
          }
          if (msg.highestBid !== undefined) {
            setHighestBid(msg.highestBid);
          }
          if (msg.bidWinner !== undefined) {
            setBidWinner(msg.bidWinner);
          }
          if (msg.isForcedBid !== undefined) {
            setIsForcedBid(msg.isForcedBid);
          }
          if (msg.biddingHistory) {
            setBiddingHistory(msg.biddingHistory);
          }
          if (msg.roundNumber !== undefined) {
            setRoundNumber(msg.roundNumber);
          }
          if (msg.dealerIdx !== undefined) {
            setDealerIdx(msg.dealerIdx);
          }
          if (msg.scores) {
            setMatchScoreTeamA(msg.scores.a);
            setMatchScoreTeamB(msg.scores.b);
          }
          if (msg.nextA !== undefined) {
            setTricksTeamA(msg.nextA);
          }
          if (msg.nextB !== undefined) {
            setTricksTeamB(msg.nextB);
          }
          if (msg.seats) {
            setSeats(msg.seats);
          }
          if (msg.allHands && msg.allHands.length > 0) {
            setPlayers((prev) => {
              return prev.map((p, pIdx) => {
                const synced = msg.allHands?.find((h) => h.playerId === pIdx);
                if (synced) {
                  const isMe = pIdx === currentHumanSeatIndex;
                  return {
                    ...p,
                    hand: synced.hand && synced.hand.length > 0 ? synced.hand : p.hand,
                    isHuman: isMe ? true : synced.isHuman,
                    name: isMe ? userName : synced.name,
                    avatarId: isMe ? userAvatar : p.avatarId,
                    customPhoto: isMe ? userCustomPhoto : p.customPhoto,
                  };
                }
                return p;
              });
            });
          }
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bidWinner, chooseTrumpColor, currentHumanSeatIndex, dealerIdx, handlePlayCard, highestBid, isRoomHost, matchScoreTeamA, matchScoreTeamB, players, roomCode, roundNumber, seats, showCallout, startNewRound, submitBid, trumpColor]);

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

  // Open Private Table: Initialize non-human seats as VACANT
  const handleOpenPrivateTable = () => {
    setIsRoomHost(true);
    setCurrentHumanSeatIndex(0);
    const freshVacantSeats = createVacantPrivateSeats(userName, userAvatar, userCustomPhoto);
    setSeats(freshVacantSeats);
    setLastSeatReserved(null);
    try {
      localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(freshVacantSeats));
    } catch {}
    roomSync.publish({
      type: 'ROOM_STATE',
      roomCode,
      senderId: roomSync.myClientId,
      seats: freshVacantSeats,
      vacantCount: 5,
      timestamp: Date.now(),
    });
    setShowHostModal(true);
    showCallout(`طاولتك الخاصة #${roomCode} (5 مقاعد شاغرة للدخول) 🚪`, '👥');
  };

  // Seat Configuration Actions: moving human into seat / taking over bot
  const handleSitInSeat = (targetIdx: number) => {
    if (targetIdx === currentHumanSeatIndex) return;
    const oldIdx = currentHumanSeatIndex;
    const isMatchOngoing = phase !== 'LOBBY';

    setSeats((prev) => {
      const next = [...prev];
      next[targetIdx] = {
        ...next[targetIdx],
        name: userName,
        avatarId: userAvatar,
        customPhoto: userCustomPhoto,
        isHuman: true,
        isVacant: false,
        team: targetIdx % 2 === 0 ? 'A' : 'B',
      };
      if (!isMatchOngoing) {
        next[oldIdx] = {
          ...next[oldIdx],
          name: '',
          avatarId: DEFAULT_BOT_PROFILES[oldIdx]?.avatarId || 'kuwaiti_ghutra_white',
          customPhoto: null,
          isHuman: false,
          isVacant: true,
          team: oldIdx % 2 === 0 ? 'A' : 'B',
        };
      }

      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;

      try {
        localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
      } catch {}

      if (isMatchOngoing) {
        roomSync.publish({
          type: 'BOT_TAKEOVER',
          roomCode,
          senderId: roomSync.myClientId,
          seatIndex: targetIdx,
          player: {
            name: userName,
            avatarId: userAvatar,
            customPhoto: userCustomPhoto,
            team: targetIdx % 2 === 0 ? 'A' : 'B',
            isHuman: true,
          },
          timestamp: Date.now(),
        });
      } else {
        roomSync.publish({
          type: 'SEAT_RESERVED',
          roomCode,
          senderId: roomSync.myClientId,
          seatIndex: targetIdx,
          oldSeatIndex: oldIdx,
          player: {
            name: userName,
            avatarId: userAvatar,
            customPhoto: userCustomPhoto,
            team: targetIdx % 2 === 0 ? 'A' : 'B',
            isHuman: true,
          },
          seats: next,
          vacantCount: vCount,
          timestamp: Date.now(),
        });
      }

      return next;
    });

    setPlayers((prev) => {
      const next = [...prev];
      if (next[targetIdx]) {
        next[targetIdx] = {
          ...next[targetIdx],
          name: userName,
          avatarId: userAvatar,
          customPhoto: userCustomPhoto,
          isHuman: true,
          isVacant: false,
        };
      }
      return next;
    });

    setCurrentHumanSeatIndex(targetIdx);
    setLastSeatReserved({
      seatIndex: targetIdx,
      name: userName,
      team: targetIdx % 2 === 0 ? 'A' : 'B',
      avatarId: userAvatar,
      customPhoto: userCustomPhoto,
    });

    const teamName = targetIdx % 2 === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
    if (isMatchOngoing) {
      showCallout(`اخترت المقعد #${targetIdx + 1} (${teamName}) - اضغط زر الدخول بالأسفل 💺`, '💺');
    } else {
      showCallout(`انتقلت للمقعد #${targetIdx + 1} في ${teamName} 💺`, '💺');
    }
  };

  // Enter ongoing match as the selected seat (human or replacement of bot/player)
  const handleEnterOngoingMatch = () => {
    setShowHostModal(false);
    setShowRoomsModal(false);
    setIsMultiplayerActive(true);
    setIsActionPending(false);

    // Make sure current seat is marked human in both seats and players
    setSeats((prev) => {
      const next = [...prev];
      if (next[currentHumanSeatIndex]) {
        next[currentHumanSeatIndex] = {
          ...next[currentHumanSeatIndex],
          name: userName,
          avatarId: userAvatar,
          customPhoto: userCustomPhoto,
          isHuman: true,
          isVacant: false,
          team: currentHumanSeatIndex % 2 === 0 ? 'A' : 'B',
        };
        try {
          localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    setPlayers((prev) => {
      const next = [...prev];
      if (next[currentHumanSeatIndex]) {
        next[currentHumanSeatIndex] = {
          ...next[currentHumanSeatIndex],
          name: userName,
          avatarId: userAvatar,
          customPhoto: userCustomPhoto,
          isHuman: true,
          isVacant: false,
        };
      }
      return next;
    });

    // Broadcast takeover to all participants
    roomSync.publish({
      type: 'BOT_TAKEOVER',
      roomCode,
      senderId: roomSync.myClientId,
      seatIndex: currentHumanSeatIndex,
      player: {
        name: userName,
        avatarId: userAvatar,
        customPhoto: userCustomPhoto,
        team: currentHumanSeatIndex % 2 === 0 ? 'A' : 'B',
        isHuman: true,
      },
      timestamp: Date.now(),
    });

    // Request immediate full sync from host
    roomSync.publish({
      type: 'SYNC_REQUEST',
      roomCode,
      senderId: roomSync.myClientId,
      timestamp: Date.now(),
    });

    soundEngine.init();
    soundEngine.playCardSlide();
    const teamName = currentHumanSeatIndex % 2 === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
    showCallout(`دخلت الطاولة وبدأت اللعب مع ${teamName}! ⚡`, '🚀');
  };

  // Mobile visibility, tab reactivation, and ongoing match heartbeat sync
  useEffect(() => {
    if (!roomCode || !isMultiplayerActive) return;

    const requestSync = () => {
      roomSync.publish({
        type: 'SYNC_REQUEST',
        roomCode,
        senderId: roomSync.myClientId,
        timestamp: Date.now(),
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        roomSync.handleWakeup();
        requestSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', requestSync);
    window.addEventListener('focus', requestSync);

    // Periodic heartbeat to prevent mobile cellular disconnects
    const syncInterval = setInterval(() => {
      if (!isRoomHost && phase !== 'LOBBY') {
        requestSync();
      }
    }, 6000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', requestSync);
      window.removeEventListener('focus', requestSync);
      clearInterval(syncInterval);
    };
  }, [isMultiplayerActive, isRoomHost, phase, roomCode]);

  // Convert seat to bot
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
      };
      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
      try {
        localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
      } catch {}
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: roomSync.myClientId,
        seats: next,
        vacantCount: vCount,
        timestamp: Date.now(),
      });
      return next;
    });
    soundEngine.playCardSlide();
    showCallout(`تم تحويل المقعد #${idx} إلى بوت 🤖`, '🤖');
  };

  // Direct Vacate seat
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
      };
      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
      try {
        localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
      } catch {}
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: roomSync.myClientId,
        seats: next,
        vacantCount: vCount,
        timestamp: Date.now(),
      });
      return next;
    });
    showCallout(`أصبح المقعد #${idx} شاغراً ⏳`, '⏳');
  };

  // Fill all vacant seats with bots
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
          };
        }
        return seat;
      });
      try {
        localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
      } catch {}
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: roomSync.myClientId,
        seats: next,
        vacantCount: 0,
        timestamp: Date.now(),
      });
      return next;
    });
    soundEngine.playCardSlide();
    showCallout('تم ملء الشواغر ببوتات ذكية 🤖', '🤖');
  };

  // Vacate all non-human seats
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
        };
      });
      const vCount = next.filter((s) => s.isVacant || !s.name || s.name.trim() === '').length;
      try {
        localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
      } catch {}
      roomSync.publish({
        type: 'ROOM_STATE',
        roomCode,
        senderId: roomSync.myClientId,
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
      };
      return next;
    });
    setEditingSeatIndex(null);
    showCallout('تم جعل المقعد شاغراً', '🔄');
  };

  // Screen orientation & fullscreen controls
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
            // Reset to default standard match seats
            const stdSeats = JSON.parse(JSON.stringify(DEFAULT_SEATS));
            stdSeats[0].name = userName;
            stdSeats[0].avatarId = userAvatar;
            stdSeats[0].customPhoto = userCustomPhoto;
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
            handleJoinRoomWithSeatReservation(code);
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

      {/* Round Result Modal */}
      {phase === 'ROUND_END' && roundResult && (
        <RoundResultModal
          buyerWinner={roundResult.buyerWinner}
          bidWinner={roundResult.bidWinner}
          highestBid={roundResult.highestBid}
          isForcedBid={roundResult.isForcedBid}
          tricksTeamA={tricksTeamA}
          tricksTeamB={tricksTeamB}
          matchScoreTeamA={matchScoreTeamA}
          matchScoreTeamB={matchScoreTeamB}
          roundNumber={roundNumber}
          players={players}
          humanSeatIndex={currentHumanSeatIndex}
          onNextRound={handleNextRoundOrMatch}
          onReturnToLobby={() => {
            stopTimer();
            setPhase('LOBBY');
          }}
        />
      )}

      {/* Host Friends & Custom Table Modal */}
      {showHostModal && (
        <HostTableModal
          roomCode={roomCode}
          seats={seats}
          currentHumanSeatIndex={currentHumanSeatIndex}
          isHost={isRoomHost}
          lastSeatReserved={lastSeatReserved}
          isMatchOngoing={phase !== 'LOBBY'}
          onRegenerateCode={() => {
            const nextCode = String(Math.floor(1000 + Math.random() * 9000));
            setRoomCode(nextCode);
            setIsRoomHost(true);
            setLastSeatReserved(null);
            setCurrentHumanSeatIndex(0);
            const freshVacant = createVacantPrivateSeats(userName, userAvatar, userCustomPhoto);
            setSeats(freshVacant);
            try {
              localStorage.setItem(`kout_room_seats_${nextCode}`, JSON.stringify(freshVacant));
            } catch {}
            roomSync.publish({
              type: 'ROOM_STATE',
              roomCode: nextCode,
              senderId: roomSync.myClientId,
              seats: freshVacant,
              vacantCount: 5,
              timestamp: Date.now(),
            });
            showCallout(`غرفة جديدة #${nextCode} (5 مقاعد شاغرة) 🔄`, '🔄');
          }}
          onSitInSeat={handleSitInSeat}
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

            try {
              localStorage.setItem(`kout_room_start_${roomCode}`, String(Date.now()));
              localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(finalFilledSeats));
            } catch {}

            const sharedDeck = buildDeck();
            const randDealer = Math.floor(Math.random() * 6);

            setIsMultiplayerActive(true);
            setMatchScoreTeamA(0);
            setMatchScoreTeamB(0);
            setRoundNumber(1);

            roomSync.publish({
              type: 'START_GAME',
              roomCode,
              senderId: roomSync.myClientId,
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
          onEnterOngoingMatch={handleEnterOngoingMatch}
          onClose={() => setShowHostModal(false)}
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
            setShowRoomsModal(false);
            setShowHostModal(true);
            showCallout(`غرفة جديدة #${nextCode}`, '🚪');
          }}
          onJoinRoom={(code) => {
            setShowRoomsModal(false);
            handleJoinRoomWithSeatReservation(code);
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
