import { Card, Player, SuitColor, SuitRank, TrickPlay } from '../types';

const STORAGE_KEY = 'kout_pro_tactical_memory_v1';

const SUIT_RANKS_ORDER: SuitRank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
  'reverse',
  'skip',
  'draw2',
  '1',
];

const HONOR_AND_TEN_RANKS = new Set<SuitRank>(['1', 'draw2', 'skip', 'reverse', '0']);

export interface TacticalMemory {
  version: number;
  /** عدد التكتيكات الاحترافية المعتمدة التي تعلمها البوت من اللاعب الحقيقي */
  learnedProRoundsCount: number;
  /** عدد الجولات غير الاحترافية التي رفض البوت التعلم منها */
  rejectedAmateurRoundsCount: number;
  /** وزن تفضيل تأجيل سحب الحكم ولعب زات جانبي رابح أو مفرد لنصب كمين (0..1) */
  delayedTrumpTrapWeight: number;
  /** وزن تمرير المبادرة (الليد) للزميل الحاكم وعدم أخذ الأكلة منه (0..1) */
  yieldLeadToBuyerPartnerWeight: number;
  /** وزن حماية الصور والعشرات في الأكلات المشكوك فيها (0..1) */
  protectHonorsInUncertainTrickWeight: number;
  /** تعديل عتبة المزايدة التكتيكية بـ 6 أو 7 (-0.35 .. +0.2) */
  tacticalSixSevenBidBoost: number;
  /** وزن تنويع الزات المحمي في الدفاع ضد الباون (0..1) */
  antiBaoonSuitSplitWeight: number;
  /** آخر تكتيك احترافي تعلمه البوت لعرضه في ملخص الجولة */
  lastLearnedTacticTitle: string | null;
}

const DEFAULT_MEMORY: TacticalMemory = {
  version: 1,
  learnedProRoundsCount: 0,
  rejectedAmateurRoundsCount: 0,
  delayedTrumpTrapWeight: 0.5,
  yieldLeadToBuyerPartnerWeight: 0.75,
  protectHonorsInUncertainTrickWeight: 0.8,
  tacticalSixSevenBidBoost: 0,
  antiBaoonSuitSplitWeight: 0.85,
  lastLearnedTacticTitle: null,
};

let cachedMemory: TacticalMemory | null = null;

export function getTacticalMemory(): TacticalMemory {
  if (cachedMemory) return cachedMemory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TacticalMemory>;
      cachedMemory = {
        ...DEFAULT_MEMORY,
        ...parsed,
      };
      return cachedMemory;
    }
  } catch {
    // ignore storage errors
  }
  cachedMemory = { ...DEFAULT_MEMORY };
  return cachedMemory;
}

function saveTacticalMemory(mem: TacticalMemory): void {
  cachedMemory = mem;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch {
    // ignore storage errors
  }
}

interface RoundObservationState {
  initialHand: Card[];
  humanBid: number;
  hasAmateurMistake: boolean;
  amateurMistakeReason: string | null;
  usedDelayedTrumpTrap: boolean;
  usedPartnerLeadYield: boolean;
  usedHonorProtection: boolean;
  usedTacticalHighBid: boolean;
  usedAntiBaoonSplitDiscard: boolean;
}

let currentRoundObs: RoundObservationState = {
  initialHand: [],
  humanBid: 0,
  hasAmateurMistake: false,
  amateurMistakeReason: null,
  usedDelayedTrumpTrap: false,
  usedPartnerLeadYield: false,
  usedHonorProtection: false,
  usedTacticalHighBid: false,
  usedAntiBaoonSplitDiscard: false,
};

export function resetHumanRoundObservation(initialHand: Card[]): void {
  currentRoundObs = {
    initialHand: [...initialHand],
    humanBid: 0,
    hasAmateurMistake: false,
    amateurMistakeReason: null,
    usedDelayedTrumpTrap: false,
    usedPartnerLeadYield: false,
    usedHonorProtection: false,
    usedTacticalHighBid: false,
    usedAntiBaoonSplitDiscard: false,
  };
}

export function observeHumanBidDecision(
  bidVal: number,
  hand: Card[],
  isForced: boolean
): void {
  if (isForced || bidVal <= 0) return;
  currentRoundObs.humanBid = bidVal;
  if (currentRoundObs.initialHand.length === 0 && hand.length > 0) {
    currentRoundObs.initialHand = [...hand];
  }
  if (bidVal >= 6) {
    currentRoundObs.usedTacticalHighBid = true;
  }
}

/**
 * يراقب حركة اللاعب الحقيقي ويفحصها عبر فلتر الجودة الصارم:
 * - إذا كانت حركة غير احترافية (مثل قطع كرت الزميل الرابح بحكم، أو حرق جيكر/ميكر في بداية الأكلة، أو رمي صورة في أكلة خاسرة مع وجود كرت صغير)
 *   يتم وسم الجولة بأنها غير احترافية فلا يتعلم البوت منها.
 * - إذا كانت حركة تكتيكية ذكية، يسجلها كمرشحة للتعلم بشرط نجاح الجولة في النهاية.
 */
export function observeHumanCardPlay(params: {
  humanId: number;
  humanTeam: 'A' | 'B';
  handBeforePlay: Card[];
  playedCard: Card;
  trickBeforePlay: TrickPlay[];
  trumpColor: SuitColor | null;
  highestBid: number;
  buyerId: number | null;
  players: Player[];
  currentWinnerBeforePlay: number;
}): void {
  const {
    humanId,
    humanTeam,
    handBeforePlay,
    playedCard,
    trickBeforePlay,
    trumpColor,
    highestBid,
    buyerId,
    players,
    currentWinnerBeforePlay,
  } = params;

  const isLead = trickBeforePlay.length === 0;
  const isTeammate = (pid: number) => {
    if (pid < 0 || pid === humanId) return false;
    const p = players.find((pl) => pl.id === pid) || players[pid];
    return p ? p.team === humanTeam : pid % 2 === humanId % 2;
  };

  // 1. فحص الأخطاء غير الاحترافية (Amateur Filter):
  // أ) البدء بالجيكر أو الميكر في بداية الأكلة في اللعب العادي (يجعل الجيكر/الميكر يخيس)
  if (isLead && highestBid !== 9 && (playedCard.isJoker || playedCard.isMaker)) {
    const hadNonWild = handBeforePlay.some((c) => !c.isJoker && !c.isMaker);
    if (hadNonWild) {
      currentRoundObs.hasAmateurMistake = true;
      currentRoundObs.amateurMistakeReason = 'لعب الجيكر أو الميكر في بداية الأكلة';
      return;
    }
  }

  if (!isLead) {
    const leadCard = trickBeforePlay[0]?.card;
    const leadColor =
      leadCard && !leadCard.isJoker && !leadCard.isMaker && leadCard.color !== 'special'
        ? leadCard.color
        : null;
    const partnerWasWinning = isTeammate(currentWinnerBeforePlay);

    // ب) قطع أكلة الزميل الفائزة بخال الزات بحكم أو جيكر أو ميكر بدون داعٍ
    const partnerPlayedKhaleLead =
      leadColor &&
      leadColor !== trumpColor &&
      trickBeforePlay.some(
        (tp) => isTeammate(tp.playerId) && tp.card.color === leadColor && tp.card.rank === '1'
      );

    if (
      partnerWasWinning &&
      partnerPlayedKhaleLead &&
      ((trumpColor && playedCard.color === trumpColor) || playedCard.isJoker || playedCard.isMaker)
    ) {
      const hadNonTrumpNonWild = handBeforePlay.some(
        (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
      );
      if (hadNonTrumpNonWild) {
        currentRoundObs.hasAmateurMistake = true;
        currentRoundObs.amateurMistakeReason = 'قطع خال الزميل بالحكم والأكلة للفريق';
        return;
      }
    }

    // ج) حرق صورة عالية (باش أو ميم) في أكلة محسومة للخصم مع وجود رقم صغير من نفس الزات في اليد
    if (
      !partnerWasWinning &&
      leadColor &&
      playedCard.color === leadColor &&
      (playedCard.rank === 'draw2' || playedCard.rank === 'skip')
    ) {
      const highestInTrickRank = Math.max(
        ...trickBeforePlay
          .filter((tp) => tp.card.color === leadColor && !tp.card.isJoker && !tp.card.isMaker)
          .map((tp) => SUIT_RANKS_ORDER.indexOf(tp.card.rank))
      );
      const myRank = SUIT_RANKS_ORDER.indexOf(playedCard.rank);
      const hasOpponentTrumpCut = trickBeforePlay.some(
        (tp) =>
          !isTeammate(tp.playerId) &&
          ((trumpColor && tp.card.color === trumpColor && leadColor !== trumpColor) ||
            tp.card.isJoker ||
            tp.card.isMaker)
      );
      const hadSmallInLeadSuit = handBeforePlay.some(
        (c) =>
          c.color === leadColor &&
          !c.isJoker &&
          !c.isMaker &&
          !HONOR_AND_TEN_RANKS.has(c.rank)
      );

      if ((myRank < highestInTrickRank || hasOpponentTrumpCut) && hadSmallInLeadSuit) {
        currentRoundObs.hasAmateurMistake = true;
        currentRoundObs.amateurMistakeReason = 'حرق صورة كبيرة في أكلة خاسرة مع وجود رقم صغير';
        return;
      }
    }

    // 2. رصد التكتيكات الاحترافية المرشحة للتعلم:
    // أ) تمرير الليد للزميل الحاكم (لعب كرت صغير تحت كرت الزميل الحاكم الفائز مع امتلاك كرت أكبر)
    if (
      partnerWasWinning &&
      buyerId !== null &&
      currentWinnerBeforePlay === buyerId &&
      leadColor &&
      playedCard.color === leadColor &&
      !HONOR_AND_TEN_RANKS.has(playedCard.rank)
    ) {
      const winnerPlay = trickBeforePlay.find((tp) => tp.playerId === buyerId);
      if (winnerPlay) {
        const winnerRankIdx = SUIT_RANKS_ORDER.indexOf(winnerPlay.card.rank);
        const hadHigherCardToOvertake = handBeforePlay.some(
          (c) =>
            c.color === leadColor &&
            !c.isJoker &&
            !c.isMaker &&
            SUIT_RANKS_ORDER.indexOf(c.rank) > winnerRankIdx
        );
        if (hadHigherCardToOvertake) {
          currentRoundObs.usedPartnerLeadYield = true;
        }
      }
    }

    // ب) حماية العشر والصور في الأكلات المشكوك فيها (اختيار رقم صغير وتوفير الـ 10/الغلام/الميم/الباش)
    if (
      !HONOR_AND_TEN_RANKS.has(playedCard.rank) &&
      !playedCard.isJoker &&
      !playedCard.isMaker &&
      trickBeforePlay.length < 5
    ) {
      const hadHonorOrTenInSameColor = handBeforePlay.some(
        (c) =>
          c.color === playedCard.color &&
          c.id !== playedCard.id &&
          HONOR_AND_TEN_RANKS.has(c.rank) &&
          c.rank !== '1'
      );
      if (hadHonorOrTenInSameColor) {
        currentRoundObs.usedHonorProtection = true;
      }
    }

    // ج) تنويع الزات في الدفاع ضد الباون
    if (
      highestBid === 9 &&
      buyerId !== null &&
      !isTeammate(buyerId) &&
      buyerId !== humanId &&
      leadColor &&
      playedCard.color !== leadColor
    ) {
      currentRoundObs.usedAntiBaoonSplitDiscard = true;
    }
  } else {
    // في حالة المبادرة (isLead):
    // رصد تكتيك تأجيل سحب الحكم ولعب زات جانبي (خال أو كرت مفرد) لنصب كمين
    const isBuyerTeam = buyerId === humanId || (buyerId !== null && isTeammate(buyerId));
    const trumpCountInHand = trumpColor
      ? handBeforePlay.filter((c) => c.color === trumpColor && !c.isJoker && !c.isMaker).length
      : 0;
    if (
      isBuyerTeam &&
      trumpColor &&
      trumpCountInHand >= 2 &&
      playedCard.color !== trumpColor &&
      !playedCard.isJoker &&
      !playedCard.isMaker
    ) {
      currentRoundObs.usedDelayedTrumpTrap = true;
    }
  }
}

/**
 * يُستدعى عند انتهاء الجولة لتقييم النتيجة النهائية وتحديث ذاكرة البوت التكتيكية
 * إذا وفقط إذا اجتاز لعب اللاعب الحقيقي فلتر الاحترافية والنتيجة الرابحة.
 */
export function evaluateRoundAndLearn(params: {
  humanTeam: 'A' | 'B';
  buyerTeam: 'A' | 'B';
  buyerIsWinner: boolean;
  highestBid: number;
  tricksTeamA: number;
  tricksTeamB: number;
}): {
  learnedNewTactic: boolean;
  learnedTacticTitle: string | null;
  rejectedAmateur: boolean;
  totalLearnedCount: number;
} {
  const { humanTeam, buyerTeam, buyerIsWinner, highestBid, tricksTeamA, tricksTeamB } = params;
  const mem = getTacticalMemory();

  const humanTricks = humanTeam === 'A' ? tricksTeamA : tricksTeamB;
  const humanTeamWonRound =
    (humanTeam === buyerTeam && buyerIsWinner) ||
    (humanTeam !== buyerTeam && !buyerIsWinner);

  // إذا ارتكب اللاعب خطأ غير احترافي أو خسر فريقه الجولة -> يرفض البوت التعلم من هذه الجولة
  if (currentRoundObs.hasAmateurMistake || !humanTeamWonRound) {
    const updated: TacticalMemory = {
      ...mem,
      rejectedAmateurRoundsCount:
        mem.rejectedAmateurRoundsCount + (currentRoundObs.hasAmateurMistake ? 1 : 0),
    };
    saveTacticalMemory(updated);
    return {
      learnedNewTactic: false,
      learnedTacticTitle: null,
      rejectedAmateur: currentRoundObs.hasAmateurMistake,
      totalLearnedCount: updated.learnedProRoundsCount,
    };
  }

  // الجولة انتهت بفوز فريق اللاعب الحقيقي وبدون أي خطأ غير احترافي!
  let learnedTitle: string | null = null;
  const nextMem: TacticalMemory = { ...mem };

  if (currentRoundObs.usedTacticalHighBid && highestBid >= 6 && humanTeam === buyerTeam) {
    nextMem.tacticalSixSevenBidBoost = Math.min(0.25, nextMem.tacticalSixSevenBidBoost + 0.04);
    learnedTitle = `مزايدة هجومية ناجحة (${highestBid === 9 ? 'باون' : highestBid})`;
  } else if (currentRoundObs.usedAntiBaoonSplitDiscard && highestBid === 9 && humanTeam !== buyerTeam) {
    nextMem.antiBaoonSuitSplitWeight = Math.min(1.0, nextMem.antiBaoonSuitSplitWeight + 0.05);
    learnedTitle = 'تنسيق دفاعي احترافي لكسر الباون';
  } else if (currentRoundObs.usedPartnerLeadYield && humanTricks >= 5) {
    nextMem.yieldLeadToBuyerPartnerWeight = Math.min(
      1.0,
      nextMem.yieldLeadToBuyerPartnerWeight + 0.05
    );
    learnedTitle = 'تمرير الليد للزميل الحاكم في التوقيت الصحيح';
  } else if (currentRoundObs.usedDelayedTrumpTrap && humanTricks >= highestBid) {
    nextMem.delayedTrumpTrapWeight = Math.min(0.95, nextMem.delayedTrumpTrapWeight + 0.05);
    learnedTitle = 'تأجيل سحب الحكم ونصب كمين بالزات الجانبي';
  } else if (currentRoundObs.usedHonorProtection && humanTricks >= 5) {
    nextMem.protectHonorsInUncertainTrickWeight = Math.min(
      1.0,
      nextMem.protectHonorsInUncertainTrickWeight + 0.04
    );
    learnedTitle = 'حماية الصور والعشرات لترقيتها في آخر الأكلات';
  }

  if (learnedTitle) {
    nextMem.learnedProRoundsCount += 1;
    nextMem.lastLearnedTacticTitle = learnedTitle;
    saveTacticalMemory(nextMem);
    return {
      learnedNewTactic: true,
      learnedTacticTitle: learnedTitle,
      rejectedAmateur: false,
      totalLearnedCount: nextMem.learnedProRoundsCount,
    };
  }

  return {
    learnedNewTactic: false,
    learnedTacticTitle: null,
    rejectedAmateur: false,
    totalLearnedCount: nextMem.learnedProRoundsCount,
  };
}
