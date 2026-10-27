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
  isLegalMove,
  selectBotBestTrump,
  selectBotMove,
  sortHandCards,
  SUIT_COLORS,
  getMatchTargetAndStatus,
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
  }, [stopTimer]);

  // Initial Deal & Start Round
  const startNewRound = useCallback(
    (deckOverride?: Card[], forcedDealerIdx?: number) => {
      stopTimer();
      setIsActionPending(false);

      const activeDealer = forcedDealerIdx !== undefined ? forcedDealerIdx : dealerIdx;
      setDealerIdx(activeDealer);

      const deck = deckOverride || buildDeck();
      const freshPlayers: Player[] = seats.map((seatCfg, idx) => {
        const isHuman = idx === currentHumanSeatIndex;
        return {
          ...seatCfg,
          name: isHuman ? userName : (seatCfg.name && seatCfg.name.trim() !== '' ? seatCfg.name : DEFAULT_BOT_PROFILES[idx].name),
          avatarId: isHuman ? userAvatar : (seatCfg.avatarId || DEFAULT_BOT_PROFILES[idx].avatarId),
          customPhoto: isHuman ? userCustomPhoto : seatCfg.customPhoto,
          isHuman,
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

      // Check for saved seats for this room or generate starting table
      const storedSeats = localStorage.getItem(`kout_room_seats_${code}`);
      let currentSeats: SeatConfig[] = storedSeats
        ? JSON.parse(storedSeats)
        : JSON.parse(JSON.stringify(DEFAULT_SEATS));

      // Prefer seat 1 (Team Red 🔴) or next vacant seat
      const targetSeat = [1, 3, 5, 2, 4, 0].find((idx) => currentSeats[idx]?.isVacant) ?? 1;

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

      const reservationPayload = {
        type: 'SEAT_RESERVED',
        roomCode: code,
        seatIndex: targetSeat,
        player: {
          name: userName,
          team: targetSeat % 2 === 0 ? 'A' : 'B',
          avatarId: userAvatar,
          customPhoto: userCustomPhoto,
          isHuman: true,
        },
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(`kout_room_seats_${code}`, JSON.stringify(currentSeats));
        localStorage.setItem(`kout_room_event_${code}`, JSON.stringify(reservationPayload));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel(`kout_room_${code}`);
          bc.postMessage(reservationPayload);
          bc.close();
        }
      } catch {}

      soundEngine.playCardSlide();
      showCallout(`حجزت المقعد #${targetSeat} في ${teamName}! 💺`, '💺');
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

  // Real-time listener for Room events (Start Game & Seat Reservations)
  useEffect(() => {
    if (!roomCode) return;

    const handleRoomMessage = (data: any) => {
      if (!data) return;

      if (data.type === 'START_GAME') {
        setShowHostModal(false);
        soundEngine.init();
        soundEngine.playCardSlide();
        startNewMatch();
        showCallout('بدأ منشئ الغرفة اللعبة! 🚀', '🚀');
      } else if (data.type === 'SEAT_RESERVED') {
        const { seatIndex, oldSeatIndex, player } = data;
        setSeats((prev) => {
          const next = [...prev];
          if (seatIndex !== undefined && player) {
            next[seatIndex] = {
              ...next[seatIndex],
              id: seatIndex,
              name: player.name,
              avatarId: player.avatarId,
              customPhoto: player.customPhoto,
              team: player.team || (seatIndex % 2 === 0 ? 'A' : 'B'),
              isHuman: true,
              isVacant: false,
            };
          }
          if (oldSeatIndex !== undefined && oldSeatIndex !== seatIndex && oldSeatIndex !== currentHumanSeatIndex) {
            next[oldSeatIndex] = {
              ...next[oldSeatIndex],
              name: '',
              isHuman: false,
              isVacant: true,
            };
          }
          return next;
        });

        if (player) {
          setLastSeatReserved({
            seatIndex,
            name: player.name,
            team: player.team,
            avatarId: player.avatarId,
            customPhoto: player.customPhoto,
          });
          const teamLabel = player.team === 'A' ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
          soundEngine.playCardSlide();
          showCallout(`💺 حجز مقعد: انضم "${player.name}" إلى المقعد #${seatIndex} (${teamLabel})`, '👥');
        }
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(`kout_room_${roomCode}`);
        bc.onmessage = (event) => {
          handleRoomMessage(event.data);
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `kout_room_start_${roomCode}`) {
        setShowHostModal(false);
        soundEngine.init();
        soundEngine.playCardSlide();
        startNewMatch();
        showCallout('بدأ منشئ الغرفة اللعبة! 🚀', '🚀');
      } else if (e.key === `kout_room_event_${roomCode}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handleRoomMessage(data);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [roomCode, showCallout, startNewMatch, currentHumanSeatIndex]);

  // Bidding resolution
  const submitBid = useCallback(
    (playerId: number, val: number, forced = false) => {
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

      setBiddingHistory((prev) => [...prev, { playerId, val: effectiveVal }]);

      let newHighest = highestBid;
      let newWinner = bidWinner;

      if (effectiveVal > highestBid) {
        newHighest = effectiveVal;
        newWinner = playerId;
        setHighestBid(effectiveVal);
        setBidWinner(playerId);
      }

      // If Baoon (9), finish bidding immediately
      if (effectiveVal === 9) {
        setBidWinner(playerId);
        setHighestBid(9);
        setTimeout(() => {
          if (playerId === currentHumanSeatIndex) {
            setPhase('CHOOSE_TRUMP');
          } else {
            // Bot picks best trump
            const bestCol = selectBotBestTrump(players[playerId].hand);
            chooseTrumpColor(bestCol, playerId);
          }
        }, 1400);
        return;
      }

      // Check if all 6 players finished bidding
      const historyLength = biddingHistory.length + 1;
      if (historyLength === 6) {
        setTimeout(() => {
          if (newWinner === null) {
            // Dealer forced to bid 5 ("ملزوم")
            setIsForcedBid(true);
            setHighestBid(5);
            setBidWinner(dealerIdx);
            const dealer = players[dealerIdx];
            showCallout(`الموزع ${dealer.name} ملزوم بـ 5 وتحديد الحكم ⚡`, '⚡');

            if (dealerIdx === currentHumanSeatIndex) {
              setPhase('CHOOSE_TRUMP');
            } else {
              const bestCol = selectBotBestTrump(dealer.hand);
              chooseTrumpColor(bestCol, dealerIdx);
            }
          } else {
            if (newWinner === currentHumanSeatIndex) {
              setPhase('CHOOSE_TRUMP');
            } else {
              const bestCol = selectBotBestTrump(players[newWinner].hand);
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
    [biddingHistory.length, bidWinner, currentHumanSeatIndex, currentTurn, dealerIdx, highestBid, players, showCallout, startTimer, stopTimer]
  );

  const chooseTrumpColor = (color: SuitColor, winnerId?: number) => {
    stopTimer();
    setTrumpColor(color);
    setPhase('PLAYING');

    const winner = winnerId !== undefined ? winnerId : bidWinner !== null ? bidWinner : currentHumanSeatIndex;
    setCurrentTurn(winner);
    setIsActionPending(false);

    soundEngine.playCardSlide();
    showCallout(`الحكم ${SUIT_COLORS[color].name}! العب يا بطل`, '♠️');

    startTimer();
  };

  // Bot bidding automation
  useEffect(() => {
    if (phase !== 'BIDDING') return;
    if (currentTurn === currentHumanSeatIndex) return; // Human turn

    const bot = players[currentTurn];
    if (!bot) return;

    const botTimer = setTimeout(() => {
      let bidVal = 0;
      let isForced = false;
      if (bot.id === dealerIdx && highestBid <= 4) {
        // If bot is dealer and all previous players passed:
        // If bot hand estimate is >= 5, bot voluntarily bids (doubles upon loss).
        // Otherwise, bot takes forced 5 (only 5 pts upon loss).
        const estBid = calculateBotBid(bot.hand, 4);
        if (estBid >= 5) {
          bidVal = estBid;
          isForced = false;
        } else {
          bidVal = 5;
          isForced = true;
        }
      } else {
        bidVal = calculateBotBid(bot.hand, highestBid);
      }
      submitBid(bot.id, bidVal, isForced);
    }, 1700);

    return () => clearTimeout(botTimer);
  }, [currentHumanSeatIndex, currentTurn, dealerIdx, highestBid, phase, players, submitBid]);

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
      const wName = winnerPlayer ? winnerPlayer.name : `لاعب ${winnerId + 1}`;

      let nextA = tricksTeamA;
      let nextB = tricksTeamB;

      if (winnerPlayer.team === 'A') {
        nextA++;
        setTricksTeamA(nextA);
      } else {
        nextB++;
        setTricksTeamB(nextB);
      }

      setCurrentTrick([]);
      setCollectingWinnerId(null);

      // Early victory check
      const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
      const buyerTeam = buyerPlayer.team;
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
      setIsActionPending(false);
      startTimer();
    },
    [bidWinner, handleRoundFinish, highestBid, players, showCallout, startTimer, tricksTeamA, tricksTeamB, trumpColor]
  );

  // Card play action
  const handlePlayCard = useCallback(
    (playerId: number, card: Card) => {
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

      if (nextTrick.length === 6) {
        setIsActionPending(true);
        const winnerId = evaluateTrickWinner(nextTrick, trumpColor);
        const winnerPlayer = players[winnerId];
        const wName = winnerPlayer ? winnerPlayer.name : `لاعب ${winnerId + 1}`;
        const isTeamA = winnerPlayer ? winnerPlayer.team === 'A' : false;

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
        if (nextTurn === 0) {
          setIsActionPending(false);
        }
        startTimer();
      }
    },
    [currentTrick, currentTurn, resolveTrick, showCallout, startTimer, stopTimer, trumpColor]
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
    if (currentTurn === currentHumanSeatIndex) return;
    if (currentTrick.length === 6) return;

    const bot = players[currentTurn];
    if (!bot || bot.hand.length === 0) return;

    const botTimer = setTimeout(() => {
      const move = selectBotMove(bot, currentTrick, trumpColor);
      handlePlayCard(bot.id, move);
    }, 850);

    return () => clearTimeout(botTimer);
  }, [currentTrick, currentTurn, handlePlayCard, phase, players, trumpColor]);

  // Timeout handler for active turn
  useEffect(() => {
    if (timerRemaining > 0) return;

    if (phase === 'BIDDING') {
      submitBid(currentTurn, 0); // Force pass
    } else if (phase === 'PLAYING') {
      const cur = players[currentTurn];
      if (cur && cur.hand.length > 0) {
        const legal = cur.hand.filter((c) => isLegalMove(cur.hand, c, currentTrick));
        const chosen = legal.length > 0 ? legal[0] : cur.hand[0];
        handlePlayCard(cur.id, chosen);
      }
    }
  }, [currentTrick, currentTurn, handlePlayCard, phase, players, submitBid, timerRemaining]);

  // Next round / Next match
  const handleNextRoundOrMatch = () => {
    const isBaoon = highestBid === 9;
    const buyerPlayer = bidWinner !== null ? players[bidWinner] : players[0];
    const buyerTricks = buyerPlayer.team === 'A' ? tricksTeamA : tricksTeamB;
    const isAsamFirstRound = isBaoon && buyerTricks >= 9 && roundNumber === 1;
    const matchStatus = getMatchTargetAndStatus(matchScoreTeamA, matchScoreTeamB);
    const isMatchOver = matchStatus.isMatchOver || isAsamFirstRound;

    if (isMatchOver) {
      startNewMatch();
    } else {
      setRoundNumber((prev) => prev + 1);
      // Move dealer counter-clockwise by 1 for the next round
      const nextDealer = (dealerIdx + 1) % 6;
      setDealerIdx(nextDealer);
      startNewRound(undefined, nextDealer);
    }
  };

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
    setSeats((prev) => {
      return [0, 1, 2, 3, 4, 5].map((idx) => {
        if (idx === currentHumanSeatIndex) {
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
        return {
          id: idx,
          name: '',
          team: idx % 2 === 0 ? 'A' : 'B',
          avatarId: DEFAULT_BOT_PROFILES[idx].avatarId,
          customPhoto: null,
          isHuman: false,
          isVacant: true,
        };
      });
    });
    setShowHostModal(true);
  };

  // Seat Configuration Actions: moving human into seat
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
        team: targetIdx % 2 === 0 ? 'A' : 'B',
      };
      next[oldIdx] = {
        ...next[oldIdx],
        name: '',
        avatarId: DEFAULT_BOT_PROFILES[oldIdx]?.avatarId || 'kuwaiti_ghutra_white',
        customPhoto: null,
        isHuman: false,
        isVacant: true,
        team: oldIdx % 2 === 0 ? 'A' : 'B',
      };

      try {
        localStorage.setItem(`kout_room_seats_${roomCode}`, JSON.stringify(next));
        const eventPayload = {
          type: 'SEAT_RESERVED',
          roomCode,
          seatIndex: targetIdx,
          oldSeatIndex: oldIdx,
          player: {
            name: userName,
            avatarId: userAvatar,
            customPhoto: userCustomPhoto,
            team: targetIdx % 2 === 0 ? 'A' : 'B',
            isHuman: true,
          },
          timestamp: Date.now(),
        };
        localStorage.setItem(`kout_room_event_${roomCode}`, JSON.stringify(eventPayload));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel(`kout_room_${roomCode}`);
          bc.postMessage(eventPayload);
          bc.close();
        }
      } catch {}

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
    showCallout(`انتقلت للمقعد #${targetIdx} في ${teamName} 💺`, '💺');
  };

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
      return next;
    });
    showCallout(`أصبح المقعد #${idx} شاغراً ⏳`, '⏳');
  };

  // Fill all vacant seats with bots
  const handleFillAllWithBots = () => {
    setSeats((prev) => {
      return prev.map((seat, idx) => {
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
    });
    soundEngine.playCardSlide();
    showCallout('تم ملء الشواغر ببوتات ذكية 🤖', '🤖');
  };

  // Vacate all non-human seats
  const handleVacateAllSeats = () => {
    setSeats((prev) => {
      return prev.map((seat, idx) => {
        if (idx === currentHumanSeatIndex) return seat;
        return {
          ...seat,
          name: '',
          customPhoto: null,
          isHuman: false,
          isVacant: true,
        };
      });
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
          onRegenerateCode={() => {
            const nextCode = String(Math.floor(1000 + Math.random() * 9000));
            setRoomCode(nextCode);
            setIsRoomHost(true);
            setLastSeatReserved(null);
            showCallout(`غرفة جديدة #${nextCode}`, '🔄');
          }}
          onSitInSeat={handleSitInSeat}
          onConvertToBot={handleConvertToBot}
          onVacateSeat={handleVacateSeatDirect}
          onFillAllWithBots={handleFillAllWithBots}
          onVacateAllSeats={handleVacateAllSeats}
          onEditSeat={(idx) => setEditingSeatIndex(idx)}
          onStartGame={() => {
            handleFillAllWithBots();
            setShowHostModal(false);
            soundEngine.init();
            soundEngine.playCardSlide();

            try {
              if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel(`kout_room_${roomCode}`);
                bc.postMessage({ type: 'START_GAME', roomCode });
                bc.close();
              }
              localStorage.setItem(`kout_room_start_${roomCode}`, String(Date.now()));
            } catch {
              // Ignore
            }

            startNewMatch();
            showCallout(`طاولتك برمز #${roomCode} - بدأ اللعب! 🚀`, '👥');
          }}
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
