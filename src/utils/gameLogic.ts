import { Card, ColorInfo, Player, SuitColor, SuitRank, TrickPlay } from '../types';
import { getTacticalMemory } from './tacticalLearning';

export const SUIT_RANKS: SuitRank[] = [
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

export const SUIT_COLORS: Record<string, ColorInfo> = {
  red: { name: 'أحمر', english: 'Red', hex: '#EA1D2D' },
  blue: { name: 'أزرق', english: 'Blue', hex: '#0063B0' },
  green: { name: 'أخضر', english: 'Green', hex: '#2EB844' },
  yellow: { name: 'أصفر', english: 'Yellow', hex: '#FED000' },
};

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  (['red', 'blue', 'green', 'yellow'] as SuitColor[]).forEach((color) => {
    SUIT_RANKS.forEach((rank) => {
      let label: string = rank;
      let roleTitle: string = rank;
      if (rank === 'reverse') {
        label = '⇄';
        roleTitle = 'الغلام';
      } else if (rank === 'skip') {
        label = '⊘';
        roleTitle = 'الميم';
      } else if (rank === 'draw2') {
        label = '+2';
        roleTitle = 'الباش';
      } else if (rank === '0') {
        label = '0';
        roleTitle = 'العشرة';
      } else if (rank === '1') {
        label = '1';
        roleTitle = 'الواحد (الخال)';
      }

      deck.push({
        id: `c_${idCounter++}`,
        color,
        rank,
        label,
        roleTitle,
        isJoker: false,
        isMaker: false,
      });
    });
  });

  // Wild Draw 4 (+4) -> الجيكر (The supreme Joker)
  deck.push({
    id: `c_${idCounter++}`,
    color: 'special',
    rank: 'wild_draw4',
    label: '+4',
    roleTitle: 'الجيكر',
    isJoker: true,
    isMaker: false,
  });

  // Wild Card -> الميكر (The Maker)
  deck.push({
    id: `c_${idCounter++}`,
    color: 'special',
    rank: 'wild_color',
    label: '🌈',
    roleTitle: 'الميكر',
    isJoker: false,
    isMaker: true,
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function getEffectiveLeadColor(
  trick: TrickPlay[],
  highestBid?: number,
  trumpColor?: SuitColor | null
): SuitColor | null {
  if (!trick || trick.length === 0) return null;
  // User Rule:
  // "في حال الباون:يلعب اللاعب ١،باش،ميم،غلام،وبعدها يستطيع لعب الجيكر/الميكر ويعتبران حكما لا يوقفهما شي"
  // In Baoon, if led with Joker or Maker, they count as Trump!
  if (highestBid === 9 && (trick[0].card.isJoker || trick[0].card.isMaker)) {
    return trumpColor || null;
  }
  // In non-Baoon play, if led with Joker or Maker (خاس يالردي), the first suited card determines the lead color
  const suited = trick.find((p) => !p.card.isJoker && !p.card.isMaker);
  return suited ? suited.card.color : null;
}

export function getCardPower(
  card: Card,
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  playIndex: number,
  highestBid?: number
): number {
  const isBaoon = highestBid === 9;
  // Opening rule: If Joker or Maker is led at playIndex 0:
  // In NON-BAOON play, it spoils ("خاس يالردي") and becomes 0 power!
  // In BAOON play: "يعتبران حكما لا يوقفهما شي في حال امتلاكه لهما" -> retain full supreme power!
  if ((card.isJoker || card.isMaker) && playIndex === 0) {
    if (!isBaoon) return 0;
  }
  if (card.isJoker) return 1000;

  const lead = getEffectiveLeadColor(trick, highestBid, trumpColor);

  // خال الحكم (1 of Trump suit) is strictly higher than Maker in ALL modes (including Baoon) — Maker NEVER eats خال الحكم!
  if (trumpColor && card.color === trumpColor && card.rank === '1') return 950;

  if (card.isMaker) {
    // If خال الحكم is in the trick, Maker NEVER beats خال الحكم (even in Baoon)
    const hasTrumpKing = trick.some(
      (t) => trumpColor && t.card.color === trumpColor && t.card.rank === '1'
    );
    if (hasTrumpKing) return 50;
    return 850;
  }

  const base = SUIT_RANKS.indexOf(card.rank);
  if (trumpColor && card.color === trumpColor) return 100 + base;
  if (lead && card.color === lead) return 10 + base;
  return 0;
}

export function evaluateTrickWinner(
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  highestBid?: number
): number {
  if (!trick || trick.length === 0) return 0;
  const isBaoon = highestBid === 9;

  // 1. If Joker was played (at index > 0 in normal play, or at any index in Baoon), it ALWAYS wins!
  // (If Joker was led at index 0 in non-Baoon, it is "خاس يالردي" and cannot win if other cards are played!)
  if (trick.length === 1 && trick[0].card.isJoker) {
    return trick[0].playerId;
  }
  const validJokerPlay = trick.find((t, idx) => t.card.isJoker && (isBaoon || idx > 0));
  if (validJokerPlay) {
    return validJokerPlay.playerId;
  }

  // 2. If خال الحكم (1 of trumpColor) is in the trick:
  // "الميكر لا يأكل خال الحكم أبداً!" (في جميع الحالات بما فيها الباون)
  // خال الحكم ALWAYS wins against the Maker and all other trumps / suited cards!
  if (trumpColor) {
    const trumpKingPlay = trick.find(
      (t) => t.card.color === trumpColor && t.card.rank === '1'
    );
    if (trumpKingPlay) {
      return trumpKingPlay.playerId;
    }
  }

  // 3. If Maker was played (at index > 0 in normal play, or at any index in Baoon), Maker wins!
  // (If Maker was led at index 0 in non-Baoon, it is "خاس يالردي" and cannot win if other cards are played!)
  if (trick.length === 1 && trick[0].card.isMaker) {
    return trick[0].playerId;
  }
  const validMakerPlay = trick.find((t, idx) => t.card.isMaker && (isBaoon || idx > 0));
  if (validMakerPlay) {
    return validMakerPlay.playerId;
  }

  // 4. Regular trick resolution by card power:
  // If index 0 was spoiled in non-Baoon (Joker or Maker led) and other cards were played, start evaluation from index 1!
  const isSpoiledOpening = !isBaoon && (trick[0].card.isJoker || trick[0].card.isMaker) && trick.length > 1;
  const startIdx = isSpoiledOpening ? 1 : 0;

  let winning = trick[startIdx];
  let maxP = getCardPower(winning.card, trick, trumpColor, startIdx, highestBid);

  for (let i = startIdx + 1; i < trick.length; i++) {
    const p = getCardPower(trick[i].card, trick, trumpColor, i, highestBid);
    if (p > maxP) {
      maxP = p;
      winning = trick[i];
    }
  }
  return winning.playerId;
}

export const TURN_TIMER_DURATION = 20;

export function isLegalMove(
  hand: Card[],
  card: Card,
  trick: TrickPlay[],
  highestBid?: number,
  trumpColor?: SuitColor | null,
  _isTrumpBuyer?: boolean
): boolean {
  // الجيكر والميكر لا يمنعون من اللعب أبداً
  if (card.isJoker || card.isMaker) return true;

  if (trick.length === 0) {
    return true;
  }

  const leadColor = getEffectiveLeadColor(trick, highestBid, trumpColor);
  if (!leadColor || leadColor === 'special') return true;

  const hasLead = hand.some((c) => c.color === leadColor);
  if (hasLead) {
    return card.color === leadColor;
  }
  return true;
}

function filterBotWildMoves(
  moves: Card[],
  hand: Card[],
  trick: TrickPlay[],
  highestBid?: number,
  trumpColor?: SuitColor | null,
  isTrumpBuyer?: boolean,
  playedTricks: TrickPlay[][] = []
): Card[] {
  let filtered = [...moves];

  // أولاً: لا يبدأ البوت بلعب الجيكر أو الميكر كأول كرت في الأكلة أبداً طالما يملك أي ورقة عادية أخرى
  if (trick.length === 0) {
    const nonWild = filtered.filter((c) => !c.isJoker && !c.isMaker);
    if (nonWild.length > 0) return nonWild;
    const anyNonWildInHand = hand.filter((c) => !c.isJoker && !c.isMaker);
    if (anyNonWildInHand.length > 0) return anyNonWildInHand;
    return filtered;
  }

  if (highestBid === 9 && isTrumpBuyer) {
    const hasAnyTrumpSuitCard = Boolean(trumpColor && hand.some((c) => c.color === trumpColor));
    if (hasAnyTrumpSuitCard) {
      const nonWild = filtered.filter((c) => !c.isJoker && !c.isMaker);
      if (nonWild.length > 0) {
        filtered = nonWild;
      }
    }
  }

  // في حال البوت: لا يمكنه رمي الميكر على خال الحكم أو على الجيكر أبداً في الباون أو غيره طالما يملك أي ورقة أخرى
  const hasJokerInTrick = trick.some(
    (t, idx) => (t.card.isJoker || t.card.rank === 'wild_draw4') && (highestBid === 9 || idx > 0)
  );
  const hasTrumpKingInTrick = Boolean(
    trumpColor && trick.some((t) => t.card.color === trumpColor && t.card.rank === '1')
  );
  if (hasJokerInTrick || hasTrumpKingInTrick) {
    const withoutMaker = filtered.filter((c) => !c.isMaker && c.rank !== 'wild_color');
    if (withoutMaker.length > 0) {
      filtered = withoutMaker;
    } else {
      const anyNonMakerInHand = hand.filter((c) => !c.isMaker && c.rank !== 'wild_color');
      if (anyNonMakerInHand.length > 0) {
        filtered = anyNonMakerInHand;
      }
    }
  }

  // في حال الباون: لا يرمي البوت الميكر إلا في إحدى الحالات الثلاث (بشرط عدم وجود خال الحكم أو الجيكر في الأكلة):
  // 1) بعد نزول الجيكر وخال الحكم
  // 2) أو أن يكون آخر لاعب قبل مبتدئ اللعب (trick.length === 5) ولا يكون خال الحكم موجوداً بالأكلة
  // 3) أو أن ينتظر إلى الكرت السابع (playedTricks.length >= 6 أو hand.length <= 3) ويرمي الميكر
  if (highestBid === 9) {
    const hasJokerFallen = playedTricks.some((t) =>
      t.some((p) => p.card.isJoker || p.card.rank === 'wild_draw4')
    );
    const hasTrumpKingFallen = Boolean(
      trumpColor && playedTricks.some((t) => t.some((p) => p.card.color === trumpColor && p.card.rank === '1'))
    );
    const bothJokerAndTrumpKingFallen = hasJokerFallen && hasTrumpKingFallen;
    const isLastPlayerBeforeLeader = trick.length === 5 && !hasTrumpKingInTrick && !hasJokerInTrick;
    const isSeventhCardOrLater =
      (playedTricks.length >= 6 || hand.length <= 3) && !hasTrumpKingInTrick && !hasJokerInTrick;

    const canPlayMakerInBaoon =
      !hasTrumpKingInTrick &&
      !hasJokerInTrick &&
      (bothJokerAndTrumpKingFallen || isLastPlayerBeforeLeader || isSeventhCardOrLater);

    if (!canPlayMakerInBaoon) {
      const withoutMaker = filtered.filter((c) => !c.isMaker && c.rank !== 'wild_color');
      if (withoutMaker.length > 0) {
        filtered = withoutMaker;
      } else {
        const anyNonMakerInHand = hand.filter((c) => !c.isMaker && c.rank !== 'wild_color');
        if (anyNonMakerInHand.length > 0) {
          filtered = anyNonMakerInHand;
        }
      }
    }
  }

  return filtered;
}

const HIGH_CARD_RANKS: Set<SuitRank> = new Set(['1', 'draw2', 'skip', 'reverse', '0']);
const MEDIUM_OR_HIGH_CARD_RANKS: Set<SuitRank> = new Set([
  '1',
  'draw2',
  'skip',
  'reverse',
  '0',
  '9',
  '8',
  '7',
  '6',
  '5',
]);

export interface BotBidContext {
  botId?: number;
  botTeam?: 'A' | 'B';
  bidWinner?: number | null;
  dealerIdx?: number;
  players?: Player[];
  myTeamScore?: number;
  biddingHistory?: { playerId: number; val: number }[];
}

export function calculateBotBid(
  hand: Card[],
  currentHighestBid: number,
  isFirstBidder: boolean = false,
  roundNumber: number = 1,
  opponentScore: number = 0,
  bidContext?: BotBidContext
): number {
  const suitGroups: Record<SuitColor, Card[]> = {
    red: [],
    blue: [],
    green: [],
    yellow: [],
    special: [],
  };
  hand.forEach((c) => {
    if (suitGroups[c.color]) {
      suitGroups[c.color].push(c);
    }
  });

  const normalSuits: SuitColor[] = ['red', 'blue', 'green', 'yellow'];
  const topFourHonors: Set<SuitRank> = new Set(['1', 'draw2', 'skip', 'reverse']);

  // ============================================================================
  // قاعدة المزايدة بعد شراء الزميل (اللاعب الحقيقي) 8 -> تحويل إلى باون (9):
  // - إذا اشترى اللاعب الحقيقي (أو الزميل في الفريق) 8 فهذا يعني أن لديه الجيكر والميكر.
  // - البوت الذي يليه مباشرة من فريقه: إذا كان يملك (خال، باش، ميم، غلام) أو أحدهم مع 4 حكام من نفس الزات + خال من زات آخر -> يشتري باون (9).
  // - إذا لم يملك البوت الأول هذه الأوراق -> يطوّف (0) ويعطي الفرصة للبوت الآخر (آخر لاعب في الفريق).
  // - بكل الأحوال اللاعب الأخير في الفريق يجب أن يشتري باون (9).
  // ============================================================================
  if (
    currentHighestBid === 8 &&
    bidContext &&
    bidContext.bidWinner !== null &&
    bidContext.bidWinner !== undefined
  ) {
    const eightBidderId = bidContext.bidWinner;
    const eightBidderPlayer =
      bidContext.players?.find((p) => p.id === eightBidderId) ||
      bidContext.players?.[eightBidderId];
    const botId = bidContext.botId ?? -1;
    const botTeam =
      bidContext.botTeam ||
      (botId >= 0 ? (botId % 2 === 0 ? 'A' : 'B') : undefined);
    const eightBidderTeam =
      eightBidderPlayer?.team || (eightBidderId % 2 === 0 ? 'A' : 'B');

    if (botTeam && eightBidderTeam === botTeam && botId >= 0 && botId !== eightBidderId) {
      const dIdx = bidContext.dealerIdx ?? 0;
      const biddingOrder = [1, 2, 3, 4, 5, 6].map((offset) => (dIdx + offset) % 6);
      const eightPos = biddingOrder.indexOf(eightBidderId);
      const teammatesAfterEight =
        eightPos >= 0
          ? biddingOrder.slice(eightPos + 1).filter((pid) => {
              const p =
                bidContext.players?.find((pl) => pl.id === pid) ||
                bidContext.players?.[pid];
              const t = p?.team || (pid % 2 === 0 ? 'A' : 'B');
              return t === botTeam;
            })
          : [];

      const isLastTeammateInBidding =
        teammatesAfterEight.length === 0 ||
        teammatesAfterEight[teammatesAfterEight.length - 1] === botId;

      // "بكل الاحوال اللاعب الاخير يجب ان يشتري باون"
      if (isLastTeammateInBidding) {
        return 9;
      }

      // البوت الأول الذي يلي المشتري بـ 8 من نفس الفريق: يفحص إن كان يملك الشروط المطلوبة
      const hasQualifiedBaoonHand = normalSuits.some((col) => {
        const suitCards = suitGroups[col];
        if (suitCards.length < 4) return false;
        const hasTopFourHonor = suitCards.some((c) => topFourHonors.has(c.rank));
        if (!hasTopFourHonor) return false;
        const hasOtherSuitKhale = normalSuits
          .filter((s) => s !== col)
          .some((s) => suitGroups[s].some((c) => c.rank === '1'));
        return hasOtherSuitKhale;
      });

      if (hasQualifiedBaoonHand) {
        return 9;
      }

      // يعطي الفرصة للبوت الآخر (آخر لاعب في الفريق) ليشتري هو باون
      return 0;
    }
  }

  const hasJoker = hand.some((c) => c.isJoker);
  const hasMaker = hand.some((c) => c.isMaker);

  // رابعاً: يجب على البوت أن يشتري 5 في أول دورة بما أن الفريق الخصم لم يحقق نقاط (opponentScore === 0)
  // بشرط أن يمتلك 4 أوراق من زات (خال و3 كروت/أرقام) + (خال من زات آخر أو ميكر أو جيكر أو باش من زات آخر)
  if ((roundNumber === 1 || opponentScore === 0) && opponentScore === 0 && currentHighestBid <= 4) {
    for (const col of normalSuits) {
      const cards = suitGroups[col];
      if (cards.length >= 4) {
        const hasSuitKhale = cards.some((c) => c.rank === '1');
        if (hasSuitKhale) {
          const otherSuits = normalSuits.filter((s) => s !== col);
          const hasOtherSuitKhale = otherSuits.some((s) =>
            suitGroups[s].some((c) => c.rank === '1')
          );
          const hasOtherSuitBasha = otherSuits.some((s) =>
            suitGroups[s].some((c) => c.rank === 'draw2')
          );
          if (hasOtherSuitKhale || hasMaker || hasJoker || hasOtherSuitBasha) {
            return 5;
          }
        }
      }
    }
  }

  // First Bot Bidder Rule in Round 1:
  if (isFirstBidder && roundNumber === 1 && currentHighestBid <= 4 && opponentScore === 0) {
    for (const col of normalSuits) {
      const cards = suitGroups[col];
      if (cards.length >= 4) {
        const hasKing = cards.some((c) => c.rank === '1');
        const hasBasha = cards.some((c) => c.rank === 'draw2');
        const hasMeem = cards.some((c) => c.rank === 'skip');
        if (hasKing && hasBasha && hasMeem) {
          return 5;
        }
      }
    }
  }

  // ============================================================================
  // قاعدة عدم ترك مجال للخصم (الشراء بـ 5 مباشرة):
  // "البوت لا يترك مجال للخصم من اول دورة في اللعب يشتري 5 اذا كان يملك ٥ حكام من زات
  //  (خال او باش او ميم او غلام او عشر مع ارقام لا تقل عن ٤ كروت) وقاص زات او جيكر او ميكر او خال من زات."
  // ============================================================================
  let qualifiesForFiveTrumpRule = false;

  for (const col of normalSuits) {
    const cards = suitGroups[col];
    if (cards.length >= 5) {
      const hasHighHonorOrTen = cards.some((c) => HIGH_CARD_RANKS.has(c.rank));
      if (hasHighHonorOrTen) {
        const otherSuits = normalSuits.filter((s) => s !== col);
        const hasVoidSuit = otherSuits.some((s) => suitGroups[s].length === 0);
        const hasOtherSuitKhale = otherSuits.some((s) =>
          suitGroups[s].some((c) => c.rank === '1')
        );
        if (hasVoidSuit || hasJoker || hasMaker || hasOtherSuitKhale) {
          qualifiesForFiveTrumpRule = true;
          break;
        }
      }
    }
  }

  let est = 0;
  const colCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };

  hand.forEach((c) => {
    if (c.isJoker) est += 2.0;
    else if (c.isMaker) est += 1.3;
    else if (c.rank === '1') est += 1.2;
    else if (c.rank === 'draw2') est += 0.8;
    else if (c.rank === 'skip') est += 0.35;
    else if (c.rank === 'reverse') est += 0.2;

    if (c.color !== 'special') {
      colCounts[c.color] = (colCounts[c.color] || 0) + 1;
    }
  });

  const maxColCount = Math.max(...Object.values(colCounts));
  const bestSuitForVoidCheck = normalSuits.reduce((best, col) =>
    suitGroups[col].length > suitGroups[best].length ? col : best
  , 'red' as SuitColor);
  const hasAnyVoidOutsideBestSuit = normalSuits
    .filter((s) => s !== bestSuitForVoidCheck)
    .some((s) => suitGroups[s].length === 0);

  const lengthBonus =
    maxColCount >= 6
      ? 3.0
      : maxColCount === 5
      ? 2.4
      : maxColCount === 4
      ? 2.0
      : 1.0;
  const voidBonus = maxColCount >= 4 && hasAnyVoidOutsideBestSuit ? 0.6 : 0;
  const tacticalMem = getTacticalMemory();
  const rawTricksScore = est + lengthBonus + voidBonus + (tacticalMem.tacticalSixSevenBidBoost || 0);
  const totalTricksEst = Math.floor(rawTricksScore);

  if (totalTricksEst >= 9 && currentHighestBid < 9) {
    return 9; // Baoon
  } else if (totalTricksEst > currentHighestBid && totalTricksEst >= 5) {
    return currentHighestBid + 1;
  }

  // مزايدة احترافية حسب السكور وموقع التوزيع لمنع الخصم من الشراء الرخيص بـ 5:
  if (currentHighestBid === 5 && bidContext?.bidWinner !== null && bidContext?.bidWinner !== undefined) {
    const fiveBidderId = bidContext.bidWinner;
    const fiveBidder =
      bidContext.players?.find((p) => p.id === fiveBidderId) ||
      bidContext.players?.[fiveBidderId];
    const botId = bidContext.botId ?? -1;
    const botTeam =
      bidContext.botTeam ||
      (botId >= 0 ? (botId % 2 === 0 ? 'A' : 'B') : undefined);
    const fiveBidderTeam =
      fiveBidder?.team || (fiveBidderId % 2 === 0 ? 'A' : 'B');
    const isOpponentHoldingFive = Boolean(botTeam && fiveBidderTeam !== botTeam);
    const isScoreCritical = opponentScore >= 35 || (opponentScore > 0 && (bidContext.myTeamScore ?? 0) === 0);

    if (
      isOpponentHoldingFive &&
      isScoreCritical &&
      qualifiesForFiveTrumpRule &&
      est + lengthBonus + voidBonus >= 5.5
    ) {
      return 6;
    }
  }

  if (qualifiesForFiveTrumpRule && currentHighestBid <= 4) {
    return 5;
  }

  // قاعدة الشراء التكتيكي بـ (5) في أول دورة أو طالما لم يحرز الفريق الخصم أي نقاط (opponentScore === 0):
  // إذا كان البوت يملك 4 أوراق (أو أكثر) من زات واحد من الأرقام الكبيرة أو المتوسطة،
  // وقاص زات (0 أوراق في أحد الزاتات الأخرى)، ويمتلك رقماً كبيراً من زات آخر -> يشتري 5 ليصعّب الشراء على الخصم.
  // أما في حال كسب الفريق الثاني نقاطاً (opponentScore > 0) فلا يعتمد هذه الإعدادات.
  const canUseZeroScoreTacticalFive = (roundNumber === 1 || opponentScore === 0) && opponentScore === 0;
  if (canUseZeroScoreTacticalFive && currentHighestBid <= 4) {
    for (const candidateSuit of normalSuits) {
      const candidateCards = suitGroups[candidateSuit];
      if (candidateCards.length < 4) continue;

      const mediumOrHighCount = candidateCards.filter((c) =>
        MEDIUM_OR_HIGH_CARD_RANKS.has(c.rank)
      ).length;
      if (mediumOrHighCount < 4) continue;

      const otherSuits = normalSuits.filter((s) => s !== candidateSuit);
      // شرط "قاص زات": خلو اليد تماماً من أحد الزاتات الثلاثة الأخرى
      const hasVoidSuit = otherSuits.some((s) => suitGroups[s].length === 0);
      if (!hasVoidSuit) continue;

      // شرط "يمتلك رقماً كبيراً من زات آخر": وجود كرت كبير في زات آخر غير زات الحكم المرشح
      const hasHighCardInOtherSuit = otherSuits.some((s) =>
        suitGroups[s].some((c) => HIGH_CARD_RANKS.has(c.rank))
      );
      if (!hasHighCardInOtherSuit) continue;

      return 5;
    }
  }

  return 0; // Pass ("طوف")
}

export function selectBotBestTrump(hand: Card[]): SuitColor {
  const normalSuits: SuitColor[] = ['red', 'blue', 'green', 'yellow'];
  let bestColor: SuitColor = 'red';
  let bestCount = -1;
  let bestStrength = -1;

  for (const col of normalSuits) {
    const suitCards = hand.filter((c) => c.color === col);
    const count = suitCards.length;
    const strength = suitCards.reduce((sum, c) => {
      const idx = Math.max(0, SUIT_RANKS.indexOf(c.rank));
      const honorBonus = HIGH_CARD_RANKS.has(c.rank) ? 6 : 0;
      // إعطاء أولوية ووزن كبير لوجود الخال (1) عند تساوي عدد أوراق الحكم
      const khaleBonus = c.rank === '1' ? 100 : 0;
      return sum + idx + honorBonus + khaleBonus;
    }, 0);

    if (count > bestCount || (count === bestCount && strength > bestStrength)) {
      bestCount = count;
      bestStrength = strength;
      bestColor = col;
    }
  }
  return bestColor;
}

export interface BotStrategyContext {
  buyerId?: number | null;
  highestBid?: number;
  playedTricks?: TrickPlay[][];
  players?: Player[];
  dealerIdx?: number;
  roundNumber?: number;
}

/**
 * Smart Discard:
 * - NEVER discards a King ('1') or a Master Card (highest remaining card in suit) if other legal cards exist!
 * - In Baoon when void in trump: avoids repeating the same discard suit in consecutive tricks unless signaling a Khale ('1')
 * - Discards the smallest numbers first (2, 3, 4, 5, 6, 7, 8, 9, 0...)
 * - Protects Trumps, Maker, and Joker
 */
export function selectSmartDiscard(
  legalMoves: Card[],
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  options?: {
    avoidSuit?: SuitColor | null;
    preferSignalSuit?: SuitColor | null;
    masterCardIds?: Set<string>;
    avoidDefendingSuits?: Set<SuitColor>;
    highestBid?: number;
  }
): Card {
  if (legalMoves.length === 1) return legalMoves[0];

  const lead = getEffectiveLeadColor(trick, options?.highestBid, trumpColor);

  // Strictly prefer non-trump, non-Joker, non-Maker cards when discarding so a bot never cuts with a trump unnecessarily
  const nonTrumpNonWild = legalMoves.filter(
    (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
  );
  const basePool =
    nonTrumpNonWild.length > 0
      ? nonTrumpNonWild
      : legalMoves.filter((c) => !c.isJoker && !c.isMaker);

  // Exclude Kings ('1') and Master Cards of non-lead suits if other non-trump cards exist
  const nonKings = basePool.filter((c) => {
    if (c.rank === '1' && c.color !== lead) return false;
    if (options?.masterCardIds?.has(c.id) && c.color !== lead) return false;
    return true;
  });

  let pool =
    nonKings.length > 0
      ? nonKings
      : basePool.length > 0
      ? basePool
      : [...legalMoves];

  // حماية العشر والصور (0، غلام، ميم، باش) في الأكلات المشكوك فيها أو الخاسرة:
  // يتجنب البوت رمي الكروت المتوسطة/العالية التي قد تترقى لاحقاً لتصبح Master Card طالما يملك أرقاماً ميتة صغيرة (2..9)
  const deadLowNumbers = pool.filter((c) => !HIGH_CARD_RANKS.has(c.rank));
  if (deadLowNumbers.length > 0) {
    pool = deadLowNumbers;
  }

  // If signaling a specific suit (e.g. repeating a suit in Baoon because bot holds its Khale '1'):
  if (options?.preferSignalSuit) {
    const signalPool = pool.filter(
      (c) => c.color === options.preferSignalSuit && c.rank !== '1'
    );
    if (signalPool.length > 0) {
      pool = signalPool;
    }
  } else if (options?.avoidSuit) {
    // In Baoon when bot does NOT hold trump or Khale: do not repeat the same suit in consecutive tricks
    const differentSuitPool = pool.filter((c) => c.color !== options.avoidSuit);
    if (differentSuitPool.length > 0) {
      pool = differentSuitPool;
    }
  }

  // تنسيق الدفاع ضد الباون: عدم رمي نفس الزات الذي يرميه الزميل في الدفاع حتى يحتفظ كل مدافع بزات مختلف لكسر الباون
  if (options?.avoidDefendingSuits && options.avoidDefendingSuits.size > 0) {
    const coordinatedPool = pool.filter(
      (c) => c.color === 'special' || !options.avoidDefendingSuits!.has(c.color)
    );
    if (coordinatedPool.length > 0) {
      pool = coordinatedPool;
    }
  }

  // Sort ascending by value (smallest numbers first)
  pool.sort((a, b) => {
    const aIsTrump = trumpColor && a.color === trumpColor;
    const bIsTrump = trumpColor && b.color === trumpColor;
    if (aIsTrump !== bIsTrump) return aIsTrump ? 1 : -1;

    return getCardRankValue(a, trumpColor) - getCardRankValue(b, trumpColor);
  });

  return pool[0];
}

/**
 * Smart Timeout Fallback Move:
 * عند انتهاء الوقت يختار الكمبيوتر أفضل كرت ويلعبه حسب جميع أوامر وقواعد البوتات المعتمدة (selectBotMove).
 */
export function getTimeoutFallbackMove(
  hand: Card[],
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  playerId?: number,
  players?: Player[],
  highestBid?: number,
  buyerId?: number | null,
  playedTricks: TrickPlay[][] = [],
  dealerIdx?: number,
  roundNumber?: number
): Card {
  const pid = playerId ?? 0;
  const existingPlayer = players
    ? players.find((pl) => pl.id === pid) || players[pid]
    : undefined;

  const virtualBotPlayer: Player = existingPlayer
    ? { ...existingPlayer, hand }
    : {
        id: pid,
        name: `Player ${pid}`,
        team: pid % 2 === 0 ? 'A' : 'B',
        isHuman: false,
        isVacant: false,
        hand,
        avatarId: 'kuwaiti_ghutra_white',
        customPhoto: null,
      };

  return selectBotMove(virtualBotPlayer, trick, trumpColor, {
    buyerId,
    highestBid,
    playedTricks,
    players,
    dealerIdx,
    roundNumber,
  });
}

export function selectBotMove(
  bot: Player,
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  context?: BotStrategyContext
): Card {
  const buyerId = context?.buyerId;
  const highestBid = context?.highestBid ?? 0;
  const buyerPlayer = buyerId !== null && buyerId !== undefined && context?.players ? context.players[buyerId] : null;
  const buyerTeam = buyerPlayer?.team;
  const isBuyerOpponent = Boolean(buyerTeam && buyerTeam !== bot.team);
  const playedTricks = context?.playedTricks || [];

  const isBotBuyer = buyerId !== null && buyerId !== undefined && bot.id === buyerId;
  const rawLegalMoves = bot.hand.filter((c) => isLegalMove(bot.hand, c, trick, highestBid, trumpColor, isBotBuyer));
  let legalMoves = filterBotWildMoves(rawLegalMoves, bot.hand, trick, highestBid, trumpColor, isBotBuyer, playedTricks);
  if (legalMoves.length === 0) return rawLegalMoves[0] || bot.hand[0];
  if (rawLegalMoves.length === 1) return rawLegalMoves[0];

  // Check past fallen supreme cards in this round
  const hasTrumpKingFallen = playedTricks.some((t) =>
    t.some((p) => trumpColor && p.card.color === trumpColor && p.card.rank === '1')
  );
  const hasTrumpKingInCurrentTrick = Boolean(
    trumpColor && trick.some((p) => p.card.color === trumpColor && p.card.rank === '1')
  );
  const hasJokerFallen = playedTricks.some((t) => t.some((p) => p.card.isJoker));

  // Track which suits (زات) have been voided or cut with trump (قاص بالحكم) by opponents vs by teammates
  const opponentVoidSuits = new Set<SuitColor>();
  const partnerVoidSuits = new Set<SuitColor>();
  const suitsPlayedBefore = new Set<SuitColor>();

  playedTricks.forEach((t) => {
    const tLead = getEffectiveLeadColor(t, highestBid, trumpColor);
    if (tLead && tLead !== 'special') {
      suitsPlayedBefore.add(tLead);
      t.forEach((p) => {
        const pPlayer = context?.players
          ? context.players.find((pl) => pl.id === p.playerId) || context.players[p.playerId]
          : null;
        const isSameTeam = pPlayer
          ? pPlayer.team === bot.team
          : p.playerId % 2 === bot.id % 2;

        // If a player did not follow the lead suit, or cut a non-trump lead suit with trump / Joker / Maker
        const didNotFollowSuit = p.card.color !== tLead && !p.card.isJoker && !p.card.isMaker;
        const didCutNonTrumpWithTrump =
          tLead !== trumpColor &&
          ((trumpColor && p.card.color === trumpColor) || p.card.isJoker || p.card.isMaker);

        if (didNotFollowSuit || didCutNonTrumpWithTrump) {
          if (!isSameTeam) {
            opponentVoidSuits.add(tLead);
          } else if (p.playerId !== bot.id) {
            partnerVoidSuits.add(tLead);
          }
        }
      });
    }
  });

  // انتباه البوت لزملائه في الفريق:
  // إذا لُعب زات غير الحكم وكان أحد زملاء البوت في الفريق قاصاً لهذا الزات (لا يملك منه أوراقاً في يده الآن، سواء رمى غيره أو لعب آخر ورقة منه في الأكلة التي أكلها البوت)
  // ويملك الزميل حكماً في يده ليضرب به، يضيف هذا الزات إلى partnerVoidSuits؛ وإذا لم يعد لدى الزميل القاص أي حكم يُستبعد الزات.
  if (trumpColor && context?.players && context.players.length > 0) {
    (['red', 'blue', 'green', 'yellow'] as SuitColor[]).forEach((col) => {
      if (col === trumpColor || !suitsPlayedBefore.has(col)) return;
      const hasVoidTeammateWithTrump = context.players!.some((pl) => {
        const isSameTeam = pl.team ? pl.team === bot.team : pl.id % 2 === bot.id % 2;
        if (!isSameTeam || pl.id === bot.id) return false;
        const isVoidInCol = !pl.hand.some(
          (c) => c.color === col && !c.isJoker && !c.isMaker
        );
        const hasTrumpToStrike = pl.hand.some(
          (c) => c.color === trumpColor || c.isJoker || c.isMaker
        );
        return isVoidInCol && hasTrumpToStrike;
      });
      if (hasVoidTeammateWithTrump) {
        partnerVoidSuits.add(col);
      } else {
        partnerVoidSuits.delete(col);
      }
    });
  }

  const isLead = trick.length === 0;

  const isTeammate = (pid: number): boolean => {
    if (pid === bot.id) return false;
    const p = context?.players?.find((pl) => pl.id === pid) || context?.players?.[pid];
    if (p && bot.team) {
      return p.team === bot.team;
    }
    return pid % 2 === bot.id % 2;
  };

  const initialTrickWinnerId = !isLead ? evaluateTrickWinner(trick, trumpColor, highestBid) : -1;
  const isTeamCurrentlyWinning = !isLead && isTeammate(initialTrickWinnerId);
  const isLastPlayerInTrick = trick.length === 5;

  // تتبع دقيق لعدد الحكام الملعوبة وهل كروت الحكم محصورة فقط عند فريق البوت (الخصم لا يملك أي كرت حكم)
  const playedSuitedTrumpCount = trumpColor
    ? playedTricks.reduce(
        (acc, t) =>
          acc +
          t.filter((p) => p.card.color === trumpColor && !p.card.isJoker && !p.card.isMaker).length,
        0
      )
    : 0;
  const currentTrickSuitedTrumpCount = trumpColor
    ? trick.filter((p) => p.card.color === trumpColor && !p.card.isJoker && !p.card.isMaker).length
    : 0;
  const mySuitedTrumpCount = trumpColor
    ? bot.hand.filter((c) => c.color === trumpColor && !c.isJoker && !c.isMaker).length
    : 0;

  const opponentsVoidInTrump = new Set<number>();
  if (trumpColor) {
    playedTricks.forEach((t) => {
      const tLead = getEffectiveLeadColor(t, highestBid, trumpColor);
      if (tLead === trumpColor) {
        t.forEach((p) => {
          const pPlayer = context?.players
            ? context.players.find((pl) => pl.id === p.playerId) || context.players[p.playerId]
            : null;
          const isSameTeam = pPlayer
            ? pPlayer.team === bot.team
            : p.playerId % 2 === bot.id % 2;
          if (!isSameTeam && p.card.color !== trumpColor && !p.card.isJoker && !p.card.isMaker) {
            opponentsVoidInTrump.add(p.playerId);
          }
        });
      }
    });

    // أيضاً فحص الأكلة الحالية إذا كانت النزلة حكماً ولم يتبع الخصم الحكم
    const currentTrickLead = getEffectiveLeadColor(trick, highestBid, trumpColor);
    if (currentTrickLead === trumpColor) {
      trick.forEach((p) => {
        const pPlayer = context?.players
          ? context.players.find((pl) => pl.id === p.playerId) || context.players[p.playerId]
          : null;
        const isSameTeam = pPlayer
          ? pPlayer.team === bot.team
          : p.playerId % 2 === bot.id % 2;
        if (!isSameTeam && p.card.color !== trumpColor && !p.card.isJoker && !p.card.isMaker) {
          opponentsVoidInTrump.add(p.playerId);
        }
      });
    }
  }

  const opponentSeatIds = [0, 1, 2, 3, 4, 5].filter((pid) => {
    const pPlayer = context?.players
      ? context.players.find((pl) => pl.id === pid) || context.players[pid]
      : null;
    return pPlayer ? pPlayer.team !== bot.team : pid % 2 !== bot.id % 2;
  });

  const opponentsHoldAnySuitedTrump = Boolean(
    trumpColor &&
      context?.players &&
      context.players.length > 0 &&
      context.players.some(
        (pl) =>
          pl.team !== bot.team &&
          pl.hand.some((c) => c.color === trumpColor && !c.isJoker && !c.isMaker)
      )
  );

  const opponentPlayedSuitedTrumpInCurrentTrick = Boolean(
    trumpColor &&
      trick.some(
        (p) =>
          !isTeammate(p.playerId) &&
          p.playerId !== bot.id &&
          p.card.color === trumpColor &&
          !p.card.isJoker &&
          !p.card.isMaker
      )
  );

  // هل كروت الحكم محصورة فقط عند فريق البوت (الخصم لا يملك أي حكم في يده)؟
  const opponentsExhaustedTrumps = Boolean(
    trumpColor &&
      !opponentPlayedSuitedTrumpInCurrentTrick &&
      ((context?.players && context.players.length > 0 && !opponentsHoldAnySuitedTrump) ||
        playedSuitedTrumpCount + currentTrickSuitedTrumpCount + mySuitedTrumpCount >= 13 ||
        (opponentSeatIds.length > 0 && opponentSeatIds.every((id) => opponentsVoidInTrump.has(id))))
  );

  // حساب عدد الأكلات التي كسبها الفريق الخصم حتى الآن في هذه الجولة
  const opponentWonTricksCount = playedTricks.reduce((count, t) => {
    const wId = evaluateTrickWinner(t, trumpColor, highestBid);
    return !isTeammate(wId) && wId !== bot.id ? count + 1 : count;
  }, 0);

  // ============================================================================
  // 1. عدّ الأوراق الكامل (Full 54-Card Counting — Master Card Detection):
  // يتتبع البوت جميع الأوراق التي نزلت في الأكلات السابقة والأكلة الحالية،
  // فيعرف تلقائياً متى يصبح الباش أو الميم أو الغلام أو الـ 10 أو الـ 9 هو أعلى كرت متبقٍ في الزات (Master Card)
  // ============================================================================
  const isCardRankFallen = (suit: SuitColor, rank: SuitRank, includeCurrentTrick = true): boolean => {
    const inPast = playedTricks.some((t) =>
      t.some((p) => p.card.color === suit && !p.card.isJoker && !p.card.isMaker && p.card.rank === rank)
    );
    if (inPast) return true;
    if (includeCurrentTrick) {
      return trick.some(
        (p) => p.card.color === suit && !p.card.isJoker && !p.card.isMaker && p.card.rank === rank
      );
    }
    return false;
  };

  const isMasterCardInSuit = (card: Card, includeCurrentTrick = true): boolean => {
    if (card.color === 'special' || card.isJoker || card.isMaker) return false;
    const rankIdx = SUIT_RANKS.indexOf(card.rank);
    if (rankIdx < 0) return false;
    const higherRanks = SUIT_RANKS.slice(rankIdx + 1);
    return higherRanks.every((r) => {
      if (isCardRankFallen(card.color, r, includeCurrentTrick)) return true;
      return bot.hand.some(
        (c) => c.color === card.color && !c.isJoker && !c.isMaker && c.rank === r
      );
    });
  };

  const masterCardIds = new Set<string>(
    bot.hand.filter((c) => isMasterCardInSuit(c, true)).map((c) => c.id)
  );

  // ============================================================================
  // 2. إشارات اللعب الجماعي بين الزملاء (Partner Signaling) وتنويع الزات في الباون:
  // - في الباون: إذا لعب زميل البوت في كل دورة زاتاً معيناً مرتين متتاليتين أو أكثر فهذه إشارة أنه يملك خال هذا الزات.
  // - في اللعب العام: يركز البوت على الكروت التي يلعبها زميله فإذا كرر زاتاً في دورتين أو أكثر فهذه إشارة أن لديه خال هذا الزات.
  // - إذا كان البوت لا يملك حكماً في الباون فلا يكرر زاتاً واحداً في كل دورة بل يلعب كل دورة كرتاً صغيراً من زات مختلف (إلا إذا كان يملك خال الزات ويرسل إشارة).
  // ============================================================================
  const teammateSignaledKhaleSuits = new Set<SuitColor>();
  const teammateIds = [0, 1, 2, 3, 4, 5].filter((pid) => isTeammate(pid));

  teammateIds.forEach((tid) => {
    const suitSequence: SuitColor[] = [];
    const voluntarySuitCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };

    playedTricks.forEach((t) => {
      const tLead = getEffectiveLeadColor(t, highestBid, trumpColor);
      const play = t.find((p) => p.playerId === tid);
      if (!play || play.card.isJoker || play.card.isMaker || play.card.color === 'special') return;
      const col = play.card.color;
      suitSequence.push(col);

      // إذا بدأ الزميل بهذا الزات أو رماه تخلصاً (على حكم أو زات آخر)
      const isLeaderPlay = t[0]?.playerId === tid;
      const isOffSuitDiscard = tLead !== col;
      if (isLeaderPlay || isOffSuitDiscard || highestBid === 9) {
        voluntarySuitCounts[col] = (voluntarySuitCounts[col] || 0) + 1;
      }
    });

    // فحص التكرار المتتالي (مرتين متتاليتين أو أكثر) في الباون أو اللعب العام
    for (let i = 1; i < suitSequence.length; i++) {
      const col = suitSequence[i];
      if (
        col === suitSequence[i - 1] &&
        col !== trumpColor &&
        !isCardRankFallen(col, '1', true) &&
        !bot.hand.some((c) => c.color === col && c.rank === '1')
      ) {
        teammateSignaledKhaleSuits.add(col);
      }
    }

    // في اللعب العام: إذا كرر الزميل الزات في دورتين أو أكثر (مبادرةً أو رمياً) ولم ينزل خال الزات بعد
    (['red', 'blue', 'green', 'yellow'] as SuitColor[]).forEach((col) => {
      if (
        col !== trumpColor &&
        voluntarySuitCounts[col] >= 2 &&
        !isCardRankFallen(col, '1', true) &&
        !bot.hand.some((c) => c.color === col && c.rank === '1')
      ) {
        teammateSignaledKhaleSuits.add(col);
      }
    });
  });

  // تتبع آخر زات رماه البوت نفسه في الدورة السابقة لمنع تكرار نفس الزات في الباون بدون خال
  const lastCompletedTrick =
    playedTricks.length > 0 ? playedTricks[playedTricks.length - 1] : null;
  const myLastPlayInPrevTrick = lastCompletedTrick?.find((p) => p.playerId === bot.id);
  const myLastPlayedSuit: SuitColor | null =
    myLastPlayInPrevTrick &&
    !myLastPlayInPrevTrick.card.isJoker &&
    !myLastPlayInPrevTrick.card.isMaker &&
    myLastPlayInPrevTrick.card.color !== 'special'
      ? myLastPlayInPrevTrick.card.color
      : null;

  let preferSignalSuitForBaoon: SuitColor | null = null;
  let avoidRepeatSuitForBaoon: SuitColor | null = null;

  if (highestBid === 9 && !isLead && mySuitedTrumpCount === 0) {
    // هل يملك البوت خال زات آخر ومعه كرت صغير في نفس الزات يريد الإشارة به مرتين متتاليتين؟
    const normalSuitsList: SuitColor[] = ['red', 'blue', 'green', 'yellow'];
    const signallableSuits = normalSuitsList.filter((col) => {
      if (col === trumpColor) return false;
      const cardsOfCol = bot.hand.filter((c) => c.color === col && !c.isJoker && !c.isMaker);
      const hasKhale = cardsOfCol.some((c) => c.rank === '1');
      const hasSmallCard = cardsOfCol.some((c) => c.rank !== '1');
      if (!hasKhale || !hasSmallCard) return false;
      // كم مرة رمى البوت هذا الزات سابقاً؟ إذا رماه أقل من مرتين، يكمل الإشارة إلى مرتين متتاليتين
      const myPastCountInCol = playedTricks.reduce(
        (cnt, t) =>
          cnt + (t.some((p) => p.playerId === bot.id && p.card.color === col) ? 1 : 0),
        0
      );
      return myPastCountInCol < 2;
    });

    if (signallableSuits.length > 0) {
      // إذا بدأ الإشارة في الأكلة السابقة بنفس الزات، يكرره الآن لإتمام الإشارة (مرتين متتاليتين)
      if (myLastPlayedSuit && signallableSuits.includes(myLastPlayedSuit)) {
        preferSignalSuitForBaoon = myLastPlayedSuit;
      } else {
        preferSignalSuitForBaoon = signallableSuits[0];
      }
    } else if (myLastPlayedSuit && myLastPlayedSuit !== trumpColor) {
      // البوت لا يملك حكماً في الباون ولا يرسل إشارة خال -> لا يكرر زاتاً واحداً في كل دورة بل يلعب كرتاً صغيراً من زات مختلف
      avoidRepeatSuitForBaoon = myLastPlayedSuit;
    }
  }

  // تنسيق الدفاع ضد الباون (كشف الباون المكسور مبكراً):
  // إذا اشترى الفريق المنافس باون (9)، يتعاون البوتان في فريق الدفاع بعدم رمي نفس الزات الذي يرميه زميله في الدفاع،
  // حتى يحتفظ كل بوت بزات مختلف يحمي فيه الخال أو الباش لإسقاط الباون في آخر أكلتين
  const avoidDefendingSuits = new Set<SuitColor>();
  if (highestBid === 9 && isBuyerOpponent && !isLead) {
    playedTricks.forEach((t) => {
      const tLead = getEffectiveLeadColor(t, highestBid, trumpColor);
      t.forEach((p) => {
        if (
          isTeammate(p.playerId) &&
          p.card.color !== 'special' &&
          !p.card.isJoker &&
          !p.card.isMaker &&
          p.card.color !== tLead &&
          p.card.color !== trumpColor
        ) {
          avoidDefendingSuits.add(p.card.color);
        }
      });
    });
    const curLead = getEffectiveLeadColor(trick, highestBid, trumpColor);
    trick.forEach((p) => {
      if (
        isTeammate(p.playerId) &&
        p.card.color !== 'special' &&
        !p.card.isJoker &&
        !p.card.isMaker &&
        p.card.color !== curLead &&
        p.card.color !== trumpColor
      ) {
        avoidDefendingSuits.add(p.card.color);
      }
    });
  }

  const smartDiscardOptions = {
    avoidSuit: avoidRepeatSuitForBaoon,
    preferSignalSuit: preferSignalSuitForBaoon,
    masterCardIds,
    avoidDefendingSuits,
    highestBid,
  };

  const buyerPlayInTrick =
    buyerId !== null && buyerId !== undefined
      ? trick.find((p) => p.playerId === buyerId)
      : null;

  const isSmallTrumpPlayedByBuyer = Boolean(
    buyerPlayInTrick &&
      trumpColor &&
      buyerPlayInTrick.card.color === trumpColor &&
      !buyerPlayInTrick.card.isJoker &&
      !buyerPlayInTrick.card.isMaker &&
      ['2', '3', '4', '5', '6', '7', '8', '9'].includes(buyerPlayInTrick.card.rank)
  );

  // ثانياً: "اذا لعب البوت ميكر على اي زات دون وجود خال الحكم في الاكلة لا يلعب البوت في نفس الفريق الجيكر على ميكر صاحبه"
  const teammatePlayedMakerWithoutTrumpKing = Boolean(
    !isLead &&
      !hasTrumpKingInCurrentTrick &&
      trick.some((p) => isTeammate(p.playerId) && (p.card.isMaker || p.card.rank === 'wild_color'))
  );

  // ثالثاً: "في حال لعب البوت او اللاعب الحقيقي حكما (باش،ميم،غلام) لا يضرب بميكر او جيكر من زملائه البوتات
  //         الا في حال الباون وخال الحكم لم ينزل فيضرب بالجيكر تحسبا ان يكون خال الحكم عند الخصم وحيدا"
  const teammatePlayedTrumpHonorInTrick = Boolean(
    !isLead &&
      trumpColor &&
      trick.some(
        (p) =>
          isTeammate(p.playerId) &&
          p.card.color === trumpColor &&
          !p.card.isJoker &&
          !p.card.isMaker &&
          ['draw2', 'skip', 'reverse'].includes(p.card.rank)
      )
  );

  const botHoldsTrumpKing = Boolean(
    trumpColor && bot.hand.some((c) => c.color === trumpColor && c.rank === '1')
  );

  // في حال الباون ولعب الزميل حكماً (باش، ميم، غلام) وخال الحكم لم ينزل بعد وليس في يد البوت والخصم لم يستنفد حكامه:
  // يضرب البوت بالجيكر فوراً تحسباً لأن يكون خال الحكم عند الخصم وحيداً
  if (
    teammatePlayedTrumpHonorInTrick &&
    highestBid === 9 &&
    !hasTrumpKingFallen &&
    !botHoldsTrumpKing &&
    !opponentsExhaustedTrumps &&
    !teammatePlayedMakerWithoutTrumpKing
  ) {
    const jokerInHand =
      rawLegalMoves.find((c) => c.isJoker || c.rank === 'wild_draw4') ||
      bot.hand.find((c) => c.isJoker || c.rank === 'wild_draw4');
    if (jokerInHand) {
      return jokerInHand;
    }
  }

  // منع ضرب حكم الزميل (باش، ميم، غلام) بالميكر أو الجيكر في غير حالة الباون الاستثنائية أعلاه (طالما لم يأكلها الخصم بخال الحكم)
  const shouldForbidWildOnTeammateTrumpHonor = Boolean(
    teammatePlayedTrumpHonorInTrick &&
      !hasTrumpKingInCurrentTrick &&
      isTeamCurrentlyWinning &&
      !(highestBid === 9 && !hasTrumpKingFallen && !botHoldsTrumpKing && !opponentsExhaustedTrumps)
  );

  // البند الجديد:
  // "اذا كان فريق الخصم لا يملك حكم وخال الحكم لم ينزل بعد ولعب الحاكم حكما صغيرا لا يلعب البوت الجيكر لان الحكام عند زملائه في الفريق"
  const shouldForbidJokerOnBuyerSmallTrump = Boolean(
    (!isLead &&
      trumpColor &&
      buyerTeam &&
      bot.team === buyerTeam &&
      isSmallTrumpPlayedByBuyer &&
      opponentsExhaustedTrumps &&
      !hasTrumpKingFallen &&
      !hasTrumpKingInCurrentTrick) ||
      teammatePlayedMakerWithoutTrumpKing ||
      shouldForbidWildOnTeammateTrumpHonor
  );

  if (shouldForbidJokerOnBuyerSmallTrump) {
    const nonJokerLegal = legalMoves.filter((c) => !c.isJoker && c.rank !== 'wild_draw4');
    if (nonJokerLegal.length > 0) {
      legalMoves = nonJokerLegal;
    } else {
      const nonJokerRaw = rawLegalMoves.filter((c) => !c.isJoker && c.rank !== 'wild_draw4');
      if (nonJokerRaw.length > 0) {
        legalMoves = nonJokerRaw;
      }
    }
  }

  if (shouldForbidWildOnTeammateTrumpHonor) {
    const nonWildLegal = legalMoves.filter(
      (c) => !c.isJoker && !c.isMaker && c.rank !== 'wild_draw4' && c.rank !== 'wild_color'
    );
    if (nonWildLegal.length > 0) {
      legalMoves = nonWildLegal;
    } else {
      const nonWildRaw = rawLegalMoves.filter(
        (c) => !c.isJoker && !c.isMaker && c.rank !== 'wild_draw4' && c.rank !== 'wild_color'
      );
      if (nonWildRaw.length > 0) {
        legalMoves = nonWildRaw;
      }
    }
  }

  // قاعدة فورية ملزمة:
  // 1) "اذا لعبت حكما صغيرا ولعب الخصم خال الحكم فيجب على البوت في الفريق ان يلعب الجيكر فورا."
  // 2) "في حال كان الفريق حاكما والحاكم لعب حكما صغيرا وخال الحكم لعب من قبل الخصم يجب لعب الجيكر من فريق الحاكم مباشرة."
  // 3) "في حال لعب الحاكم خال الحكم يضربه البوت بالجيكر حتى ان كانت اول دورة."
  if (!isLead && trumpColor && !shouldForbidJokerOnBuyerSmallTrump) {
    const teammatePlayedSmallTrump = trick.some(
      (p) =>
        isTeammate(p.playerId) &&
        p.card.color === trumpColor &&
        !p.card.isJoker &&
        !p.card.isMaker &&
        p.card.rank !== '1'
    );
    const opponentPlayedTrumpKhaleInCurrentTrick = trick.some(
      (p) =>
        !isTeammate(p.playerId) &&
        p.playerId !== bot.id &&
        p.card.color === trumpColor &&
        p.card.rank === '1'
    );
    const opponentBuyerPlayedTrumpKhaleInCurrentTrick = Boolean(
      isBuyerOpponent &&
        buyerPlayInTrick &&
        buyerPlayInTrick.card.color === trumpColor &&
        buyerPlayInTrick.card.rank === '1'
    );
    const opponentPlayedTrumpKhaleInPast = playedTricks.some((t) =>
      t.some(
        (p) =>
          !isTeammate(p.playerId) &&
          p.playerId !== bot.id &&
          p.card.color === trumpColor &&
          p.card.rank === '1'
      )
    );
    const opponentPlayedTrumpKhale =
      opponentPlayedTrumpKhaleInCurrentTrick || opponentPlayedTrumpKhaleInPast;

    const isBuyerTeamBotRespondingToBuyerSmallTrump = Boolean(
      buyerTeam &&
        bot.team === buyerTeam &&
        bot.id !== buyerId &&
        isSmallTrumpPlayedByBuyer &&
        opponentPlayedTrumpKhale
    );

    if (
      opponentBuyerPlayedTrumpKhaleInCurrentTrick ||
      (teammatePlayedSmallTrump && opponentPlayedTrumpKhaleInCurrentTrick) ||
      isBuyerTeamBotRespondingToBuyerSmallTrump
    ) {
      const jokerInHand =
        rawLegalMoves.find((c) => c.isJoker || c.rank === 'wild_draw4') ||
        bot.hand.find((c) => c.isJoker || c.rank === 'wild_draw4');
      if (jokerInHand) {
        return jokerInHand;
      }
    }
  }

  // في حال الشراء (5، 6، 7) وفي أول دورة:
  // إذا لعب الحاكم زاتاً ليس حكماً والبوت لديه جيكر أو ميكر (وليس هو البوت الأخير قبل الحاكم) لا يلعبه ويعطي فرصة لزملائه
  const currentTrickEffectiveLead = !isLead
    ? getEffectiveLeadColor(trick, highestBid, trumpColor)
    : null;
  const isLastBotBeforeBuyerInTrick = Boolean(
    !isLead &&
      isBuyerOpponent &&
      (trick.length === 5 ||
        (buyerId !== null &&
          buyerId !== undefined &&
          (bot.id + 1) % 6 === buyerId &&
          trick.some((p) => p.playerId === buyerId)))
  );
  const canWinFirstRoundWithNaturalMasterCard = Boolean(
    !isLead &&
      playedTricks.length === 0 &&
      currentTrickEffectiveLead &&
      currentTrickEffectiveLead !== 'special' &&
      legalMoves.some(
        (c) =>
          !c.isJoker &&
          !c.isMaker &&
          c.color === currentTrickEffectiveLead &&
          isMasterCardInSuit(c, false) &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
            bot.id
      )
  );
  const shouldHoldWildInFirstRoundForTeammates = Boolean(
    !isLead &&
      playedTricks.length === 0 &&
      isBuyerOpponent &&
      highestBid >= 5 &&
      highestBid <= 7 &&
      currentTrickEffectiveLead &&
      currentTrickEffectiveLead !== 'special' &&
      (!trumpColor || currentTrickEffectiveLead !== trumpColor || isSmallTrumpPlayedByBuyer) &&
      !hasTrumpKingInCurrentTrick &&
      !isLastBotBeforeBuyerInTrick
  );

  if (shouldHoldWildInFirstRoundForTeammates) {
    const nonWildFirstRound = legalMoves.filter(
      (c) => !c.isJoker && !c.isMaker && c.rank !== 'wild_draw4' && c.rank !== 'wild_color'
    );
    if (nonWildFirstRound.length > 0) {
      legalMoves = nonWildFirstRound;
    }
  }

  if (legalMoves.length === 1) return legalMoves[0];

  // ============================================================================
  // TERMINOLOGY & CRITICAL RULE (مفردات معتمدة):
  // "الجيكر/الميكر يخيس = أن يبدأ اللاعب به اللعب (في بداية الأكلة فيفقد قوته)"
  // "لا يسمح للبوت أن يجعل الجيكر أو الميكر يخيس، ويُسمح ببقائه آخر كرت للأكلة الثامنة فقط إذا ضمن 100% ألا يبدأ به اللعب"
  // "البوت لا يضرب بالميكر والأكلة لنا خصوصاً أنه اللاعب الأخير"
  // ============================================================================
  const wildCardsInHand = bot.hand.filter(
    (c) =>
      (c.isJoker || c.isMaker) &&
      !(shouldForbidJokerOnBuyerSmallTrump && c.isJoker) &&
      !(shouldForbidWildOnTeammateTrumpHonor && (c.isJoker || c.isMaker)) &&
      !shouldHoldWildInFirstRoundForTeammates
  );
  const nonWildCardsInHand = bot.hand.filter((c) => !c.isJoker && !c.isMaker);
  const legalWildMoves = legalMoves.filter(
    (c) =>
      (c.isJoker || c.isMaker) &&
      !(shouldForbidJokerOnBuyerSmallTrump && c.isJoker) &&
      !(shouldForbidWildOnTeammateTrumpHonor && (c.isJoker || c.isMaker)) &&
      !shouldHoldWildInFirstRoundForTeammates
  );

  if (!isLead && legalWildMoves.length > 0) {
    // 1. في حال الباون: إذا كان الجيكر عند الخصم يرميه فوراً وتنتهي الجولة من أول دورة
    if (highestBid === 9 && isBuyerOpponent) {
      const jokerMove = legalWildMoves.find((c) => c.isJoker);
      if (jokerMove) return jokerMove;
    }

    // 1b. في حال الباون: لا يرمي البوت الميكر إلا بعد نزول الجيكر وخال الحكم، أو إذا كان آخر لاعب قبل مبتدئ اللعب ولا يوجد خال الحكم بالأكلة، أو عند الكرت السابع فما بعده
    // وبشرط ألا تكون الأكلة محسومة لفريق البوت أصلاً
    if (highestBid === 9 && !isTeamCurrentlyWinning) {
      const makerMove = legalWildMoves.find((c) => c.isMaker);
      if (
        makerMove &&
        evaluateTrickWinner([...trick, { playerId: bot.id, card: makerMove }], trumpColor, highestBid) ===
          bot.id
      ) {
        return makerMove;
      }
    }

    // 2. إذا كان البوت الأخير قبل الحاكم الخصم لديه جيكر أو ميكر في أول دورة:
    // يضرب به وإن كانت أول دورة سواء كان الزات عادياً أو حكماً (بشرط ألا تكون الأكلة محسومة لفريقه وألا يملك خال الزات الملعوب ليكسبها طبيعياً):
    // - فإن كان في الأكلة خال الحكم يضرب بالجيكر حصراً
    // - وإن لم يكن في الأكلة خال الحكم يضرب بالميكر إن وُجد أو الجيكر
    if (
      playedTricks.length === 0 &&
      isBuyerOpponent &&
      isLastBotBeforeBuyerInTrick &&
      !isTeamCurrentlyWinning &&
      !canWinFirstRoundWithNaturalMasterCard
    ) {
      if (hasTrumpKingInCurrentTrick) {
        const jokerMove = legalWildMoves.find((c) => c.isJoker);
        if (
          jokerMove &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: jokerMove }], trumpColor, highestBid) ===
            bot.id
        ) {
          return jokerMove;
        }
      } else {
        const makerMove = legalWildMoves.find((c) => c.isMaker);
        if (
          makerMove &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: makerMove }], trumpColor, highestBid) ===
            bot.id
        ) {
          return makerMove;
        }
        const jokerMove = legalWildMoves.find((c) => c.isJoker);
        if (
          jokerMove &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: jokerMove }], trumpColor, highestBid) ===
            bot.id
        ) {
          return jokerMove;
        }
      }
    }

    const pickWildCard = (): Card => {
      if (legalWildMoves.length === 1) return legalWildMoves[0];
      const maker = legalWildMoves.find((c) => c.isMaker);
      const joker = legalWildMoves.find((c) => c.isJoker);
      if (maker && joker) {
        const makerWins =
          evaluateTrickWinner([...trick, { playerId: bot.id, card: maker }], trumpColor, highestBid) ===
          bot.id;
        const jokerWins =
          evaluateTrickWinner([...trick, { playerId: bot.id, card: joker }], trumpColor, highestBid) ===
          bot.id;
        if (!makerWins && jokerWins) return joker;
        return maker;
      }
      return legalWildMoves[0];
    };

    const canAnyWildWinCurrentTrick = legalWildMoves.some(
      (c) =>
        evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
        bot.id
    );

    const holdsMakerWithUnfallenJoker =
      wildCardsInHand.some((c) => c.isMaker) &&
      (!hasJokerFallen || !hasTrumpKingFallen) &&
      !wildCardsInHand.some((c) => c.isJoker);

    // 1. Holding multiple wild cards in the endgame (e.g., 1 normal + 2 wilds on Trick 6, or 2 normals + 2 wilds on Trick 5,
    // or 0 normals + 1/2 wilds): playing a normal card would leave 2 wild cards for the final tricks,
    // where winning Trick 7 with one wild card forces leading Trick 8 with the second wild card (فيخيس)!
    if (
      nonWildCardsInHand.length < wildCardsInHand.length ||
      (wildCardsInHand.length >= 2 && nonWildCardsInHand.length <= wildCardsInHand.length)
    ) {
      return pickWildCard();
    }

    // 2. Penultimate Trick (Trick 7: 1 normal card + 1 wild card):
    // Keeping the Joker/Maker as the last card for Trick 8 does NOT spoil it (لا يخيس) IF AND ONLY IF
    // the bot plays a normal card that is 100% guaranteed to LOSE Trick 7 (because a higher card is already on the table),
    // ensuring another player wins Trick 7 and leads Trick 8!
    if (nonWildCardsInHand.length === 1 && wildCardsInHand.length === 1) {
      const safeLosingNonWildMoves = legalMoves.filter(
        (c) =>
          !c.isJoker &&
          !c.isMaker &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) !==
            bot.id
      );

      // If the normal card would win Trick 7, playing it would force the bot to lead Trick 8 with the wild card (فيخيس)!
      if (safeLosingNonWildMoves.length === 0) {
        return pickWildCard();
      }

      // If the bot holds Maker and the Joker hasn't fallen yet (and Maker can win Trick 7 now),
      // cash Maker on Trick 7 ONLY if the trick is NOT already won by our teammate!
      if (holdsMakerWithUnfallenJoker && canAnyWildWinCurrentTrick && !isTeamCurrentlyWinning) {
        return pickWildCard();
      }

      // Otherwise, safeLosingNonWildMoves are 100% guaranteed to lose Trick 7 (another player will lead Trick 8).
      // Restrict legalMoves so no downstream rule can ever pick a winning normal card on Trick 7!
      legalMoves = isTeamCurrentlyWinning
        ? [...safeLosingNonWildMoves]
        : [...safeLosingNonWildMoves, ...legalWildMoves];
    }

    // 3. Trick 6 Lookahead (e.g., 2 normal cards + 1 wild card):
    // A normal card is safe to play on Trick 6 if either:
    //   (a) It loses Trick 6 (so another player leads Trick 7), OR
    //   (b) It wins Trick 6, AND the remaining normal card for Trick 7 is a low non-trump card that can lose Trick 7.
    if (nonWildCardsInHand.length === wildCardsInHand.length + 1) {
      const safeNonWildMovesForTrick6 = legalMoves.filter((c) => {
        if (c.isJoker || c.isMaker) return false;
        const winsCurrentTrick =
          evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
          bot.id;
        if (!winsCurrentTrick) return true;

        // If this card wins Trick 6, check if we have a low non-trump exit card left to lead on Trick 7
        const remainingNormals = nonWildCardsInHand.filter((other) => other.id !== c.id);
        const hasLowExitForNextTrick = remainingNormals.some(
          (other) =>
            (!trumpColor || other.color !== trumpColor) &&
            other.rank !== '1' &&
            other.rank !== 'draw2'
        );
        return hasLowExitForNextTrick;
      });

      if (safeNonWildMovesForTrick6.length === 0 && canAnyWildWinCurrentTrick && !isTeamCurrentlyWinning) {
        return pickWildCard();
      }

      if (safeNonWildMovesForTrick6.length > 0) {
        legalMoves = isTeamCurrentlyWinning
          ? [...safeNonWildMovesForTrick6]
          : [...safeNonWildMovesForTrick6, ...legalWildMoves];
      }
    }

    // 4. Lead-lock prevention in late round (hand.length <= 5):
    // If all non-wild cards in the bot's hand are trumps or top honors ('1', 'draw2'),
    // taking the lead with a normal card could keep the bot leading every remaining trick until Trick 8!
    // Never trigger this to steal a teammate's winning trick!
    if (bot.hand.length <= 5 && nonWildCardsInHand.length > 1 && !isTeamCurrentlyWinning) {
      const lowNonTrumpExitCards = nonWildCardsInHand.filter(
        (c) => (!trumpColor || c.color !== trumpColor) && c.rank !== '1' && c.rank !== 'draw2'
      );
      if (lowNonTrumpExitCards.length === 0 && canAnyWildWinCurrentTrick) {
        return pickWildCard();
      }
    }

    // قاعدة حاسمة: البوت لا يضرب بالميكر والأكلة لنا (فريقه متقدم في الأكلة الحالية)، خصوصاً إذا كان اللاعب الأخير
    if (isTeamCurrentlyWinning) {
      const withoutMakerWhenTeamWinning = legalMoves.filter((c) => {
        if (c.isMaker || c.rank === 'wild_color') return false;
        if (isLastPlayerInTrick && (c.isJoker || c.rank === 'wild_draw4')) return false;
        return true;
      });
      if (withoutMakerWhenTeamWinning.length > 0) {
        legalMoves = withoutMakerWhenTeamWinning;
        if (legalMoves.length === 1) return legalMoves[0];
      }
    }
  }

  // إذا كان البوت هو اللاعب الأخير في الأكلة (trick.length === 5) والأكلة محسومة لفريقه (isTeamCurrentlyWinning):
  // لا يضرب بالميكر ولا يقطع على زميله، بل يرمي أصغر ورقة متاحة لا تسحب الأكلة من زميله إن أمكن
  if (!isLead && isLastPlayerInTrick && isTeamCurrentlyWinning) {
    const nonWildMoves = legalMoves.filter((c) => !c.isMaker && !c.isJoker);
    const pool = nonWildMoves.length > 0 ? nonWildMoves : legalMoves;
    const movesKeepingPartnerLead = pool.filter(
      (c) =>
        evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) !==
        bot.id
    );
    if (movesKeepingPartnerLead.length > 0) {
      return selectSmartDiscard(movesKeepingPartnerLead, trick, trumpColor, smartDiscardOptions);
    }
    return selectSmartDiscard(pool, trick, trumpColor, smartDiscardOptions);
  }

  // Check if the teammate buyer (الحاكم صاحبه) played a high card (خال=1, باش=draw2, ميم=skip, غلام=reverse, عشرة=0) in this trick
  // and is currently winning the trick:
  // Rule: "الجيكر والمكر لا يستعملهم البوت في حال لعب الحاكم (خال،باش،ميم،غلام،عشره=٠)"
  const isBuyerHighCardPlayed = Boolean(
    buyerPlayInTrick &&
      buyerTeam === bot.team &&
      evaluateTrickWinner(trick, trumpColor, highestBid) === buyerId &&
      !buyerPlayInTrick.card.isJoker &&
      !buyerPlayInTrick.card.isMaker &&
      ['1', 'draw2', 'skip', 'reverse', '0'].includes(buyerPlayInTrick.card.rank)
  );

  if (isBuyerHighCardPlayed) {
    const withoutJokerMaker = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
    if (withoutJokerMaker.length > 0) {
      legalMoves = withoutJokerMaker;
      if (legalMoves.length === 1) return legalMoves[0];
    }
  }

  // التحقق من قاعدة:
  // "إذا كان البوت آخر لاعب قبل الحاكم (من فريق الخصم) وعنده حكام وعند الحاكم حكام وكانت النزلة زات غير الحكم وقد قصه البوت قبل الحاكم:
  // يلعب زات آخر غير الحكم بما أن عدد أكلات الفريق الآخر لم تصل 3 أكلات في عدد 5 أكلات وبنفس المقياس عند 6 أكلات إذا لم يصل الخصم إلى 4 أكلات وهكذا باقي أعداد الأكلات، خصوصاً إذا كانت الأكلة لفريق البوت"
  const isBotDirectlyBeforeOpponentBuyer = Boolean(
    !isLead &&
      isBuyerOpponent &&
      buyerId !== null &&
      buyerId !== undefined &&
      (bot.id + 1) % 6 === buyerId &&
      !trick.some((p) => p.playerId === buyerId)
  );

  const botHasSuitedTrumps = Boolean(
    trumpColor && bot.hand.some((c) => c.color === trumpColor && !c.isJoker && !c.isMaker)
  );

  const opponentBuyerHasSuitedTrumps = Boolean(
    trumpColor &&
      buyerId !== null &&
      buyerId !== undefined &&
      (buyerPlayer && buyerPlayer.hand && buyerPlayer.hand.length > 0
        ? buyerPlayer.hand.some((c) => c.color === trumpColor && !c.isJoker && !c.isMaker)
        : !opponentsVoidInTrump.has(buyerId) && !opponentsExhaustedTrumps)
  );

  const dangerTrickThreshold = Math.max(1, (highestBid || 5) - 2);
  const isOpponentBelowDangerTricks = opponentWonTricksCount < dangerTrickThreshold;

  // 1. TACTICAL RULES WHEN RESPONDING (!isLead):
  if (!isLead) {
    const leadSuit = getEffectiveLeadColor(trick, highestBid, trumpColor);
    const isLeadOtherColor = Boolean(
      leadSuit &&
        leadSuit !== 'special' &&
        (!trumpColor || leadSuit !== trumpColor)
    );

    const isBotVoidInLead = Boolean(
      isLeadOtherColor && leadSuit && !bot.hand.some((c) => c.color === leadSuit)
    );

    // تطبيق قاعدة: البوت آخر لاعب قبل الحاكم الخصم وقاصّ للزات الملعوب وعنده حكام وعند الحاكم حكام
    if (
      isBotDirectlyBeforeOpponentBuyer &&
      isLeadOtherColor &&
      isBotVoidInLead &&
      botHasSuitedTrumps &&
      opponentBuyerHasSuitedTrumps &&
      isOpponentBelowDangerTricks
    ) {
      const nonTrumpDiscardMoves = legalMoves.filter(
        (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
      );
      if (nonTrumpDiscardMoves.length > 0) {
        return selectSmartDiscard(nonTrumpDiscardMoves, trick, trumpColor, smartDiscardOptions);
      }
    }

    // تطبيق قاعدة: إذا كانت كروت الحكم فقط عند فريق البوت والأكلة الحالية لفريق البوت، لا يقطع بالحكم بل يلعب زاتاً آخر غير الحكم
    if (opponentsExhaustedTrumps && isLeadOtherColor && isBotVoidInLead && isTeamCurrentlyWinning) {
      const nonTrumpDiscardMoves = legalMoves.filter(
        (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
      );
      if (nonTrumpDiscardMoves.length > 0) {
        return selectSmartDiscard(nonTrumpDiscardMoves, trick, trumpColor, smartDiscardOptions);
      }
    }

    // ============================================================================
    // User Rule:
    // 1) "اذا كان الزات يلعب اول مره ولعب الخال وليس حكما فلا يجب ان يلعب البوت من نفس الفريق حكما ابدا
    //     الا في حالة واحدة اذا رمى الخصم حكما على خال الزات الاخر من قبل الفريق فيرمي البوت حكما اكبر من حكم الخصم لكسب الاكلة او يرمي جيكر او ميكر"
    // 2) "في حال لعب اللاعب زات غير الحكم وكان اكبر كرت مثال:(باش) وخال الزات نازل من قبل والفريق الاخر لا يملك حكم
    //     او من لديه حكم من الفريق الاخر لم يلعب حكما فيجب على البوت ان لا يلعب حكما ويخسر حكم والاكلة لصالح فريقه."
    // ============================================================================
    const isFirstTimeSuitPlayed = Boolean(
      leadSuit && leadSuit !== 'special' && !suitsPlayedBefore.has(leadSuit)
    );
    const teammatePlayedKhaleOfLead = Boolean(
      isLeadOtherColor &&
        trick.some(
          (p) =>
            isTeammate(p.playerId) &&
            p.card.color === leadSuit &&
            p.card.rank === '1'
        )
    );

    // هل لعب زميل البوت أكبر كرت متبقٍ في هذا الزات غير الحكم (مثلاً: الخال، أو الباش بعد نزول الخال من قبل، أو الميم بعد نزول الخال والباش)؟
    const teammatePlayedMasterOfLead = Boolean(
      isLeadOtherColor &&
        leadSuit &&
        trick.some(
          (p) =>
            isTeammate(p.playerId) &&
            p.card.color === leadSuit &&
            !p.card.isJoker &&
            !p.card.isMaker &&
            isMasterCardInSuit(p.card, true)
        )
    );

    // هل يوجد خصم لم يلعب بعد في هذه الأكلة ويملك حكماً وقاصّ لهذا الزات (يمكنه فعلياً قطع ورقة الزميل بالحكم)؟
    const playedIdsInTrickNow = new Set(trick.map((t) => t.playerId));
    const remainingOpponentsInTrick = [0, 1, 2, 3, 4, 5].filter(
      (pid) => !playedIdsInTrickNow.has(pid) && !isTeammate(pid) && pid !== bot.id
    );
    const canAnyRemainingOpponentCutLeadWithTrump = Boolean(
      trumpColor &&
        !opponentsExhaustedTrumps &&
        leadSuit &&
        remainingOpponentsInTrick.some((pid) => {
          if (opponentsVoidInTrump.has(pid)) return false;
          const oppPlayer =
            context?.players?.find((pl) => pl.id === pid) || context?.players?.[pid];
          if (oppPlayer && oppPlayer.hand && oppPlayer.hand.length > 0) {
            const oppHasTrump = oppPlayer.hand.some(
              (c) => c.color === trumpColor && !c.isJoker && !c.isMaker
            );
            const oppHasLeadSuit = oppPlayer.hand.some(
              (c) => c.color === leadSuit && !c.isJoker && !c.isMaker
            );
            // لا يستطيع الخصم المتبقي لعب حكم إلا إذا كان يملك حكماً ولا يملك من الزات الملعوب
            return oppHasTrump && !oppHasLeadSuit;
          }
          return opponentVoidSuits.has(leadSuit);
        })
    );

    if (
      (isFirstTimeSuitPlayed && teammatePlayedKhaleOfLead) ||
      (teammatePlayedMasterOfLead && !canAnyRemainingOpponentCutLeadWithTrump)
    ) {
      const opponentPlayedTrumpOnKhale = trick.some(
        (p) =>
          !isTeammate(p.playerId) &&
          p.playerId !== bot.id &&
          ((trumpColor && p.card.color === trumpColor) || p.card.isJoker || p.card.isMaker)
      );

      const currentWinnerId = evaluateTrickWinner(trick, trumpColor, highestBid);
      const isOpponentWinningWithTrump =
        opponentPlayedTrumpOnKhale &&
        !isTeammate(currentWinnerId) &&
        currentWinnerId !== bot.id;

      if (isOpponentWinningWithTrump) {
        // Exception: Opponent cut teammate's Master/Khale with a trump -> Bot plays a higher trump, or Joker/Maker to win the trick
        const winningSuitedTrumps = legalMoves.filter(
          (c) =>
            trumpColor &&
            c.color === trumpColor &&
            !c.isJoker &&
            !c.isMaker &&
            evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
              bot.id
        );
        if (winningSuitedTrumps.length > 0) {
          winningSuitedTrumps.sort(
            (a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank)
          );
          return winningSuitedTrumps[0];
        }

        const winningMaker = legalMoves.find(
          (c) =>
            c.isMaker &&
            evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
              bot.id
        );
        if (winningMaker) return winningMaker;

        const winningJoker = legalMoves.find(
          (c) =>
            c.isJoker &&
            evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
              bot.id
        );
        if (winningJoker) return winningJoker;
      }

      // Otherwise (the trick is ours and opponents either have no trumps or did not/cannot trump):
      // Bot from the same team must NEVER play a trump card and waste it!
      const nonTrumpMoves = legalMoves.filter(
        (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
      );
      if (nonTrumpMoves.length > 0) {
        return selectSmartDiscard(nonTrumpMoves, trick, trumpColor, smartDiscardOptions);
      }
    }

    // ============================================================================
    // User Rules for Non-Trump Lead Suit Response:
    // 1) "اذا لعب الحاكم زات اخر والبوت لديه خال هذا الزات يلعبه اذا كان كرت الحاكم اصغر من الباش ويبتدئ باكبر كرت عنده"
    // 2) نصب الكمائن خلف الحاكم (Trap & Finesse):
    //    "إذا كان البوت جالساً بعد الحاكم ويملك مثلاً (خال + ميم) في زات معين، لا يحرق الخال بدون داعٍ
    //     إذا كان بإمكانه أكل ورقة الحاكم بالميم والاحتفاظ بالخال للأكلة التالية."
    // 3) عدّ الأوراق الكامل (Master Card): إذا سقط الخال سابقاً وأصبح الباش/الميم هو الأعلى، يعامله معاملة الخال.
    // 4) "اذ كان اللون الذي لعب ليس حكما ولديه الخال فليلعبه لا يؤجل الا اذا كان الباش قد لعب من فريق البوت"
    // ============================================================================
    if (leadSuit && leadSuit !== 'special' && leadSuit !== trumpColor) {
      const leadSuitMoves = legalMoves.filter(
        (c) => c.color === leadSuit && !c.isJoker && !c.isMaker
      );
      const khaleCard = leadSuitMoves.find((c) => c.rank === '1');
      const masterLeadCard =
        khaleCard || leadSuitMoves.find((c) => isMasterCardInSuit(c, true));

      // إذا لعب الحاكم (زميل البوت) زاتاً آخر غير الحكم وكان كرت الحاكم أصغر من الباش ولدينا خال هذا الزات -> يلعبه البوت فوراً
      const buyerPlayedSmallerThanBasha = Boolean(
        buyerPlayInTrick &&
          buyerPlayInTrick.card.color === leadSuit &&
          !buyerPlayInTrick.card.isJoker &&
          !buyerPlayInTrick.card.isMaker &&
          SUIT_RANKS.indexOf(buyerPlayInTrick.card.rank) < SUIT_RANKS.indexOf('draw2')
      );

      // فحص ما إذا كان الخال أو الكرت الأعلى يستطيع فعلاً كسب الأكلة الحالية (لم تُقص الأكلة بحكم أو جيكر أو ميكر)
      const canMasterLeadWinTrick = Boolean(
        masterLeadCard &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: masterLeadCard }], trumpColor, highestBid) ===
            bot.id
      );

      if (buyerPlayedSmallerThanBasha && khaleCard && !isBuyerOpponent && canMasterLeadWinTrick) {
        return khaleCard;
      }

      if (masterLeadCard) {
        // إذا كانت الأكلة قد قُطعت بحكم (أو جيكر/ميكر) فلن يكسب الخال/الباش الأكلة -> لا يحرقه البوت تحت الحكم بل يرمي أصغر ورقة من الزات!
        if (!canMasterLeadWinTrick) {
          const smallerLeadCards = leadSuitMoves.filter((c) => c.id !== masterLeadCard.id);
          if (smallerLeadCards.length > 0) {
            smallerLeadCards.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
            return smallerLeadCards[0];
          }
        } else {
          const teammatePlayedBashaOrSecondMaster = trick.some(
            (p) =>
              isTeammate(p.playerId) &&
              p.card.color === leadSuit &&
              (p.card.rank === 'draw2' ||
                (masterLeadCard.rank !== '1' &&
                  SUIT_RANKS.indexOf(p.card.rank) === SUIT_RANKS.indexOf(masterLeadCard.rank) - 1)) &&
              evaluateTrickWinner(trick, trumpColor, highestBid) === p.playerId
          );

          // نصب الكمائن خلف الحاكم الخصم (Trap & Finesse):
          // إذا كان الحاكم خصماً وقد لعب في هذه الأكلة (البوت جالس بعد الحاكم) وبيد البوت (خال + كرت آخر كالميم أو الباش يأكل ورقة الحاكم ويكسب الأكلة):
          // يأكل ورقة الحاكم بالكرت الأصغر الضامن للأكلة ويحتفظ بالخال للأكلة التالية!
          if (isBuyerOpponent && buyerPlayInTrick && leadSuitMoves.length >= 2) {
            const lowerWinningLeadCards = leadSuitMoves
              .filter(
                (c) =>
                  c.id !== masterLeadCard.id &&
                  SUIT_RANKS.indexOf(c.rank) < SUIT_RANKS.indexOf(masterLeadCard.rank) &&
                  evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
                    bot.id
              )
              .sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));

            if (lowerWinningLeadCards.length > 0) {
              const candidateFinesseCard = lowerWinningLeadCards[0];
              const playedIdsInTrick = new Set(trick.map((t) => t.playerId));
              const remainingOpponentsAfterBot = [0, 1, 2, 3, 4, 5].filter(
                (pid) => !playedIdsInTrick.has(pid) && !isTeammate(pid) && pid !== bot.id
              );

              // الكمين آمن إذا لم يبقَ خصم بعد البوت، أو كان الكرت من الصور/العشرات التي تكسر كرت الحاكم ولا يوجد كرت وسطي غير معروف عند الخصم المتبقي
              const candidateIdx = SUIT_RANKS.indexOf(candidateFinesseCard.rank);
              const masterIdx = SUIT_RANKS.indexOf(masterLeadCard.rank);
              const intermediateRanks = SUIT_RANKS.slice(candidateIdx + 1, masterIdx);
              const allIntermediateAccountedFor = intermediateRanks.every(
                (r) =>
                  isCardRankFallen(leadSuit, r, true) ||
                  bot.hand.some((c) => c.color === leadSuit && c.rank === r)
              );

              if (
                remainingOpponentsAfterBot.length === 0 ||
                allIntermediateAccountedFor ||
                HIGH_CARD_RANKS.has(candidateFinesseCard.rank)
              ) {
                return candidateFinesseCard;
              }
            }
          }

          if (!teammatePlayedBashaOrSecondMaster) {
            return masterLeadCard;
          } else {
            const otherLeadCards = leadSuitMoves.filter((c) => c.id !== masterLeadCard.id);
            if (otherLeadCards.length > 0) {
              otherLeadCards.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
              return otherLeadCards[0];
            }
          }
        }
      }
    }

    // User Rule:
    // 1) "اذا لعب احد اعضاء الفريق حكما على لون اخر فالبوت في نفس الفريق لا يلعب جيكر/ميكر لان الاكلة ستصبح للفريق بوجود حكم"
    // 2) "اذا كان الزميل ضرب بحكم لا يجب ان يضرب فوقه الحاكم حكما اكبر الا اذا كان لا يملك زاتا اخر
    //     وفي حال لا يملك الا حكاما لا يضرب بحكم صورة كبير بل يضرب بحكم اما اصغر من حكم زميله او اكبر منه بقليل ليستطيع ان يحكم بالكبير ليضمن الاكلة لاحقا"
    const currentTrickWinnerId = evaluateTrickWinner(trick, trumpColor, highestBid);
    const teammateCutWithTrump =
      isLeadOtherColor &&
      isTeammate(currentTrickWinnerId) &&
      trick.some((p) => {
        if (!isTeammate(p.playerId)) return false;
        return (trumpColor && p.card.color === trumpColor) || p.card.isJoker || p.card.isMaker;
      });

    if (teammateCutWithTrump) {
      const nonSupremeMoves = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
      const safePool = nonSupremeMoves.length > 0 ? nonSupremeMoves : legalMoves;

      // 1. إذا كان يملك من نفس الزات الملعوب يتبع الزات بأصغر ورقة
      const leadCards = safePool.filter((c) => c.color === leadSuit);
      if (leadCards.length > 0) {
        leadCards.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
        return leadCards[0];
      }

      // 2. إذا كان قاصاً للزات الملعوب ويملك زاتاً آخر غير الحكم: لا يضرب فوق زميله بحكم أبداً بل يرمي من الزات الآخر
      const nonTrumpOtherSuitMoves = safePool.filter(
        (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
      );
      if (nonTrumpOtherSuitMoves.length > 0) {
        return selectSmartDiscard(nonTrumpOtherSuitMoves, trick, trumpColor, smartDiscardOptions);
      }

      // 3. في حال لا يملك إلا حكاماً: لا يضرب بحكم صورة كبير، بل يضرب بحكم إما أصغر من حكم زميله أو أكبر منه بقليل ليحتفظ بالكبير ليحكم به لاحقاً
      const suitedTrumpMoves = safePool.filter(
        (c) => trumpColor && c.color === trumpColor && !c.isJoker && !c.isMaker
      );
      if (suitedTrumpMoves.length > 0) {
        const teammateSuitedTrumpsInTrick = trick
          .filter(
            (p) =>
              isTeammate(p.playerId) &&
              trumpColor &&
              p.card.color === trumpColor &&
              !p.card.isJoker &&
              !p.card.isMaker
          )
          .sort((a, b) => SUIT_RANKS.indexOf(b.card.rank) - SUIT_RANKS.indexOf(a.card.rank));

        if (teammateSuitedTrumpsInTrick.length > 0) {
          const teammateTrumpCard = teammateSuitedTrumpsInTrick[0].card;
          const teammateRankIdx = SUIT_RANKS.indexOf(teammateTrumpCard.rank);

          // إذا كان البوت لا يملك إلا حكاماً وهناك خصم بعده قاصّ لنفس الزات ويملك حكماً وكان حكم الزميل صغيراً:
          // يرفع سقف الحكم بورقة متوسطة/قوية (غير الخال/الأعلى) لمنع الخصم القاصّ من سرقة الأكلة بحكم رخيص
          if (
            canAnyRemainingOpponentCutLeadWithTrump &&
            !HIGH_CARD_RANKS.has(teammateTrumpCard.rank)
          ) {
            const protectiveTrumps = suitedTrumpMoves
              .filter(
                (c) =>
                  SUIT_RANKS.indexOf(c.rank) > teammateRankIdx &&
                  c.rank !== '1' &&
                  !isMasterCardInSuit(c, true)
              )
              .sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
            if (protectiveTrumps.length > 0) {
              return protectiveTrumps[0];
            }
          }

          // أ) حكم أصغر من حكم زميله إن وُجد
          const smallerTrumps = suitedTrumpMoves.filter(
            (c) => SUIT_RANKS.indexOf(c.rank) < teammateRankIdx
          );
          if (smallerTrumps.length > 0) {
            smallerTrumps.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
            return smallerTrumps[0];
          }

          // ب) إن لم يملك أصغر منه: يلعب حكماً أكبر منه بقليل (أصغر حكم فوق حكم زميله مع تجنب الصور الكبيرة)
          const higherTrumps = [...suitedTrumpMoves].sort(
            (a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank)
          );
          const nonPictureHigherTrumps = higherTrumps.filter(
            (c) => !HIGH_CARD_RANKS.has(c.rank)
          );
          if (nonPictureHigherTrumps.length > 0) {
            return nonPictureHigherTrumps[0];
          }
          return higherTrumps[0];
        }

        suitedTrumpMoves.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
        return suitedTrumpMoves[0];
      }

      return selectSmartDiscard(safePool, trick, trumpColor, smartDiscardOptions);
    }

    // User Rule (عندما تكون النزلة حكماً أصلاً والخصم المتبقي في الأكلة قد يملك حكماً أكبر):
    // "اذا كان البوت حاكم وانا في فريقه لعبت حكما صغيرا وهو بعدي وعنده حكما كبيرا ويوجد من الحكام ما هو اكبر من حكمي واصغر من حكم البوت الحاكم فيجب ان يلعب البوت الحاكم الحكم الكبير لديه"
    if (isBotBuyer && trumpColor && leadSuit === trumpColor && !opponentsExhaustedTrumps) {
      const canRemainingOpponentPlayTrump = remainingOpponentsInTrick.some(
        (pid) => !opponentsVoidInTrump.has(pid)
      );
      const teammateTrumpPlays = canRemainingOpponentPlayTrump
        ? trick.filter(
            (p) =>
              isTeammate(p.playerId) &&
              p.card.color === trumpColor &&
              !p.card.isJoker &&
              !p.card.isMaker
          )
        : [];

      if (teammateTrumpPlays.length > 0) {
        teammateTrumpPlays.sort(
          (a, b) => SUIT_RANKS.indexOf(b.card.rank) - SUIT_RANKS.indexOf(a.card.rank)
        );
        const highestTeammateTrump = teammateTrumpPlays[0].card;
        const teammateRankIdx = SUIT_RANKS.indexOf(highestTeammateTrump.rank);

        const myHigherSuitedTrumps = legalMoves.filter(
          (c) =>
            c.color === trumpColor &&
            !c.isJoker &&
            !c.isMaker &&
            SUIT_RANKS.indexOf(c.rank) > teammateRankIdx
        );

        if (myHigherSuitedTrumps.length > 0) {
          myHigherSuitedTrumps.sort(
            (a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank)
          );
          const myHighestTrump = myHigherSuitedTrumps[0];
          const botMaxRankIdx = SUIT_RANKS.indexOf(myHighestTrump.rank);

          // Check if there exist any trumps strictly greater than teammate's trump and strictly smaller than caller bot's large trump
          // that have not fallen in previous tricks and are not held by the caller bot (nor played by a teammate in this trick)
          const intermediateRanks = SUIT_RANKS.slice(teammateRankIdx + 1, botMaxRankIdx);
          const hasUnaccountedIntermediateTrump = intermediateRanks.some((rank) => {
            const playedInPast = playedTricks.some((t) =>
              t.some(
                (p) =>
                  p.card.color === trumpColor &&
                  !p.card.isJoker &&
                  !p.card.isMaker &&
                  p.card.rank === rank
              )
            );
            if (playedInPast) return false;

            const inMyHand = bot.hand.some(
              (c) => c.color === trumpColor && !c.isJoker && !c.isMaker && c.rank === rank
            );
            if (inMyHand) return false;

            const playedByTeammateInCurrentTrick = trick.some(
              (p) =>
                isTeammate(p.playerId) &&
                p.card.color === trumpColor &&
                !p.card.isJoker &&
                !p.card.isMaker &&
                p.card.rank === rank
            );
            if (playedByTeammateInCurrentTrick) return false;

            return true;
          });

          if (hasUnaccountedIntermediateTrump) {
            const canWinCurrentTrick =
              evaluateTrickWinner(
                [...trick, { playerId: bot.id, card: myHighestTrump }],
                trumpColor,
                highestBid
              ) === bot.id;

            if (canWinCurrentTrick) {
              return myHighestTrump;
            }
          }
        }
      }
    }

    // User Rule:
    // "يلعب الحكم الكبير اذا الحاكم صاحبه ولعب حكم صغير والفريق الاخر ممكن يملك حكم اكبر"
    // "الجيكر والمكر لا يستعملهم البوت في حال لعب الحاكم (خال،باش،ميم،غلام،عشره=٠)"
    if (
      leadSuit === trumpColor &&
      isSmallTrumpPlayedByBuyer &&
      buyerPlayInTrick &&
      buyerTeam &&
      bot.team === buyerTeam &&
      bot.id !== buyerId
    ) {
      // Check if an opponent still hasn't played in this trick OR already over-trumped the buyer
      const playedIds = new Set(trick.map((t) => t.playerId));
      const opponentYetToPlay = [0, 1, 2, 3, 4, 5].some(
        (pid) => !playedIds.has(pid) && !isTeammate(pid) && pid !== bot.id
      );
      const currentWinnerId = evaluateTrickWinner(trick, trumpColor, highestBid);
      const opponentCurrentlyWinning = !isTeammate(currentWinnerId) && currentWinnerId !== bot.id;

      if ((opponentYetToPlay && !opponentsExhaustedTrumps) || opponentCurrentlyWinning) {
        // Play the highest suited trump (خال الحكم، باش، ميم، غلام، عشرة...) to protect partner buyer's small trump!
        const myStrongSuitedTrumps = legalMoves.filter(
          (c) =>
            c.color === trumpColor &&
            getCardPower(c, trick, trumpColor, trick.length, highestBid) >
              getCardPower(buyerPlayInTrick.card, trick, trumpColor, 0, highestBid)
        );
        if (myStrongSuitedTrumps.length > 0) {
          myStrongSuitedTrumps.sort(
            (a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor)
          );
          return myStrongSuitedTrumps[0];
        }

        // Only use Joker/Maker if an opponent actually over-trumped our buyer (never strike with Maker when the trick is still ours!)
        if (highestBid >= 6 && opponentCurrentlyWinning) {
          if (!shouldForbidJokerOnBuyerSmallTrump) {
            const jokerMove = legalMoves.find((c) => c.isJoker);
            if (jokerMove) return jokerMove;
          }
          const makerMove = legalMoves.find((c) => c.isMaker);
          if (makerMove) return makerMove;
        }
      }
    }

    // User Rule:
    // "اذا كان البوت حاكما ولعبت زات غير الحكم وهو قاص يجب ان يلعب حكما خصوصا اذا الكرت الذي لعبته هناك اكبر منه ولم يلعب او ان الزات لعب مرة اخرى"
    // مع مراعاة: إذا لعب الزميل أكبر كرت متبقٍ في الزات (مثلاً الباش وخال الزات نازل من قبل) والخصم لا يملك حكماً أو من لديه حكم لم يلعب حكماً/لا يستطيع القَصّ، فلا يلعب البوت حكماً!
    if (isBotVoidInLead && trumpColor && !teammateCutWithTrump) {
      const isSuitPlayedAgain = Boolean(leadSuit && suitsPlayedBefore.has(leadSuit));
      const teammateLeadPlays = trick.filter(
        (p) =>
          isTeammate(p.playerId) &&
          p.card.color === leadSuit &&
          !p.card.isJoker &&
          !p.card.isMaker
      );

      let hasHigherUnplayedInLeadSuit = false;
      if (teammateLeadPlays.length > 0 && leadSuit) {
        const maxTeammateRankIdx = Math.max(
          ...teammateLeadPlays.map((p) => SUIT_RANKS.indexOf(p.card.rank))
        );
        const higherRanksInLeadSuit = SUIT_RANKS.slice(maxTeammateRankIdx + 1);
        hasHigherUnplayedInLeadSuit = higherRanksInLeadSuit.some((rank) => {
          const playedInPast = playedTricks.some((t) =>
            t.some(
              (p) =>
                p.card.color === leadSuit &&
                !p.card.isJoker &&
                !p.card.isMaker &&
                p.card.rank === rank
            )
          );
          if (playedInPast) return false;

          const playedInCurrentTrick = trick.some(
            (p) =>
              p.card.color === leadSuit &&
              !p.card.isJoker &&
              !p.card.isMaker &&
              p.card.rank === rank
          );
          if (playedInCurrentTrick) return false;

          const inBotHand = bot.hand.some(
            (c) =>
              c.color === leadSuit &&
              !c.isJoker &&
              !c.isMaker &&
              c.rank === rank
          );
          if (inBotHand) return false;

          return true;
        });
      }

      const playedIds = new Set(trick.map((t) => t.playerId));
      const opponentYetToPlay = [0, 1, 2, 3, 4, 5].some(
        (pid) => !playedIds.has(pid) && !isTeammate(pid) && pid !== bot.id
      );
      const currentWinnerId = evaluateTrickWinner(trick, trumpColor, highestBid);
      const isOpponentCurrentlyWinning =
        !isTeammate(currentWinnerId) && currentWinnerId !== bot.id;
      const isBotOnBuyerTeam = isBotBuyer || Boolean(buyerTeam && bot.team === buyerTeam);

      // إذا كان الزميل متقدماً في الأكلة ولم يبقَ أي خصم بعد البوت في الأكلة (!opponentYetToPlay)،
      // أو كان الزميل متقدماً بأكبر كرت متبقٍ في الزات ولا يوجد خصم متبقٍ يستطيع قطع الزات بالحكم، لا يضرب البوت بالحكم أبداً
      const isPartnerMasterSafeFromTrump =
        !isOpponentCurrentlyWinning &&
        (!opponentYetToPlay ||
          (teammatePlayedMasterOfLead && !canAnyRemainingOpponentCutLeadWithTrump));

      const shouldCutWithTrump =
        !isPartnerMasterSafeFromTrump &&
        (isOpponentCurrentlyWinning ||
          (opponentYetToPlay &&
            !opponentsExhaustedTrumps &&
            (hasHigherUnplayedInLeadSuit ||
              (isSuitPlayedAgain && canAnyRemainingOpponentCutLeadWithTrump) ||
              (leadSuit ? opponentVoidSuits.has(leadSuit) && canAnyRemainingOpponentCutLeadWithTrump : false) ||
              (isBotBuyer &&
                !(isFirstTimeSuitPlayed && teammatePlayedKhaleOfLead) &&
                (hasHigherUnplayedInLeadSuit || canAnyRemainingOpponentCutLeadWithTrump)))));

      if (shouldCutWithTrump) {
        const winningSuitedTrumps = legalMoves.filter(
          (c) =>
            c.color === trumpColor &&
            !c.isJoker &&
            !c.isMaker &&
            evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) ===
              bot.id
        );
        if (winningSuitedTrumps.length > 0) {
          winningSuitedTrumps.sort(
            (a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank)
          );
          // إذا كان هناك خصم بعد البوت في نفس الأكلة قاصّ لهذا الزات أيضاً ويملك حكماً:
          // لا يضرب بأصغر حكم (مثل 2 حكم) فيسرقها الخصم بسهولة، بل يضرب بحكم متوسط/قوي (دون حرق خال الحكم)
          if (canAnyRemainingOpponentCutLeadWithTrump && winningSuitedTrumps.length >= 2) {
            const strongNonMasterCutTrumps = winningSuitedTrumps
              .filter((c) => c.rank !== '1' && !isMasterCardInSuit(c, true))
              .sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
            if (strongNonMasterCutTrumps.length > 0) {
              return strongNonMasterCutTrumps[0];
            }
          }
          return winningSuitedTrumps[0];
        }
      } else if (!isOpponentCurrentlyWinning) {
        const nonTrumpDiscardMoves = legalMoves.filter(
          (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
        );
        if (nonTrumpDiscardMoves.length > 0) {
          return selectSmartDiscard(nonTrumpDiscardMoves, trick, trumpColor, smartDiscardOptions);
        }
      }
    }

    // If opponent is the buyer and played a small trump (2..9) in contracts (5, 6, 7+), counter with Maker/Joker:
    // في أول دورة في المشتريات (5، 6، 7): إذا بدأ الحاكم الخصم بحكم صغير (2..9)، يترك البوت غير الأخير الفرصة لزملائه
    // ولا يضرب الأكلة إلا إذا كان هو البوت الأخير قبل الحاكم (مع تقديم الميكر على الجيكر عند عدم وجود خال الحكم في الأكلة)
    const isTrumpLead = leadSuit === trumpColor;
    if (
      highestBid >= 5 &&
      isTrumpLead &&
      isSmallTrumpPlayedByBuyer &&
      isBuyerOpponent &&
      !isTeamCurrentlyWinning &&
      (playedTricks.length > 0 ? highestBid >= 6 : isLastBotBeforeBuyerInTrick || highestBid >= 8)
    ) {
      if (hasTrumpKingFallen || (playedTricks.length === 0 && !hasTrumpKingInCurrentTrick)) {
        const makerMove = legalMoves.find((c) => c.isMaker);
        if (makerMove) return makerMove;
      }

      const jokerMove = legalMoves.find((c) => c.isJoker);
      if (jokerMove) return jokerMove;
    }
  }

  // 2. LEADING STRATEGY (isLead === true):
  if (isLead) {
    const lastTrick = playedTricks.length > 0 ? playedTricks[playedTricks.length - 1] : null;
    const lastTrickLeadSuit = lastTrick ? getEffectiveLeadColor(lastTrick, highestBid, trumpColor) : null;

    // ترتيب احترافي للكروت عند المبادرة: يقدّم الكرت الذي أصبح بمثابة الخال (Master Card بعد عدّ الأوراق) ثم الأعلى رتبةً ("ويبتدئ بأكبر كرت عنده")
    const sortByMasterThenRankDesc = (cards: Card[]): Card[] => {
      return [...cards].sort((a, b) => {
        const aMaster = isMasterCardInSuit(a, false) ? 1 : 0;
        const bMaster = isMasterCardInSuit(b, false) ? 1 : 0;
        if (aMaster !== bMaster) return bMaster - aMaster;
        return SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank);
      });
    };

    // In Baoon (highestBid === 9):
    if (highestBid === 9 && trumpColor) {
      const isBuyerTeamMember = isBotBuyer || Boolean(buyerTeam && bot.team === buyerTeam);
      if (isBuyerTeamMember) {
        // ============================================================================
        // خطة لعب الباون الاحترافية لفريق الحاكم:
        // 1) "اما ان كان خال الحكم عند البوت فيلعب من اول الدورة ويعد الحكام ويرى ما بقي من الصور(باش،ميم،غلام،عشر) ومن ثم يلعب حكمه الاكبر اما من الصور او من الارقام"
        // 2) "ويلعب رقما صغيرا فان كان الخال عند زملائه كان بها اما ان كان عند الخصم فيلعب الجيكر اللاعب الحقيقي ويرجع يلعب حكما"
        // ============================================================================
        const remainingColorTrumps = legalMoves.filter(
          (c) => c.color === trumpColor && !c.isJoker && !c.isMaker
        );

        if (remainingColorTrumps.length > 0) {
          const trumpKing = remainingColorTrumps.find((c) => c.rank === '1');
          if (trumpKing) {
            return trumpKing;
          }

          // إذا لم يكن خال الحكم عند البوت ولم ينزل خال الحكم بعد:
          // يلعب البوت الحاكم رقماً صغيراً من الحكم (فإن كان الخال عند زملائه أكلوه، وإن كان عند الخصم ضربه الزميل بالجيكر ورجع حكم)
          if (isBotBuyer && !hasTrumpKingFallen) {
            const sortedAsc = [...remainingColorTrumps].sort(
              (a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank)
            );
            return sortedAsc[0];
          }

          // أما بعد نزول خال الحكم (أو إذا كان البوت زميل الحاكم ويرجع للحكم):
          // يعدّ الحكام وما بقي من الصور (باش، ميم، غلام، عشرة) ويلعب حكمه الأكبر المتبقي إما من الصور أو من الأرقام
          const masterTrumps = remainingColorTrumps.filter((c) => isMasterCardInSuit(c, false));
          if (masterTrumps.length > 0) {
            masterTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
            return masterTrumps[0];
          }

          remainingColorTrumps.sort(
            (a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank)
          );
          return remainingColorTrumps[0];
        }

        const nonTrumps = legalMoves.filter((c) => c.color !== trumpColor && !c.isJoker && !c.isMaker);
        if (nonTrumps.length > 0) {
          // أولاً: إذا كان لدى البوت خال (أو Master Card بعد عدّ الأوراق) في زات آخر، يبتدئ بأكبر كرت عنده
          const myMasterNonTrumps = nonTrumps.filter((c) => isMasterCardInSuit(c, false));
          if (myMasterNonTrumps.length > 0) {
            myMasterNonTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
            return myMasterNonTrumps[0];
          }

          // ثانياً: إذا أشار زميله في الباون بتكرار زات معين مرتين متتاليتين أو أكثر (إشارة امتلاك خال ذلك الزات)، يمرر له هذا الزات فوراً
          const signaledPartnerMoves = nonTrumps.filter((c) =>
            teammateSignaledKhaleSuits.has(c.color)
          );
          if (signaledPartnerMoves.length > 0) {
            signaledPartnerMoves.sort(
              (a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank)
            );
            return signaledPartnerMoves[0];
          }

          const freshNonTrumps = nonTrumps.filter((c) => !suitsPlayedBefore.has(c.color));
          const diffSuitNonTrumps = nonTrumps.filter((c) => c.color !== lastTrickLeadSuit);
          const preferredNonTrumps =
            freshNonTrumps.length > 0
              ? freshNonTrumps
              : diffSuitNonTrumps.length > 0
              ? diffSuitNonTrumps
              : nonTrumps;

          if (!isBotBuyer && wildCardsInHand.length > 0 && nonWildCardsInHand.length <= wildCardsInHand.length + 1) {
            return selectSmartDiscard(preferredNonTrumps, trick, trumpColor, smartDiscardOptions);
          }
          return sortByMasterThenRankDesc(preferredNonTrumps)[0];
        }
      } else {
        const nonWilds = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
        if (nonWilds.length > 0) {
          const nonTrumps = nonWilds.filter((c) => c.color !== trumpColor && c.color !== 'special');
          const freshNonTrumps = nonTrumps.filter((c) => !suitsPlayedBefore.has(c.color));
          const diffSuitNonTrumps = nonTrumps.filter((c) => c.color !== lastTrickLeadSuit);
          const preferredPool =
            freshNonTrumps.length > 0
              ? freshNonTrumps
              : diffSuitNonTrumps.length > 0
              ? diffSuitNonTrumps
              : nonWilds;

          // If non-buyer in Baoon still holds a wild card and has <= wildCardsInHand.length + 1 non-wilds,
          // lead the smallest card to avoid winning the lead and trapping the wild card as the last card
          if (wildCardsInHand.length > 0 && nonWildCardsInHand.length <= wildCardsInHand.length + 1) {
            return selectSmartDiscard(preferredPool, trick, trumpColor, smartDiscardOptions);
          }
          return sortByMasterThenRankDesc(preferredPool)[0];
        }
      }
    }

    // In regular play (highestBid !== 9):
    // Bot NEVER leads with Joker or Maker ("لا يبدأ اللعب بهما ابدا ابدا ابدا")
    const regularNonWilds = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
    const baseLeadPool = regularNonWilds.length > 0 ? regularNonWilds : legalMoves;

    const uncutNonTrumps = baseLeadPool.filter(
      (c) => c.color !== trumpColor && c.color !== 'special' && !opponentVoidSuits.has(c.color)
    );
    // الزات الذي لم يُلعب من قبل نهائياً في هذه الجولة
    const unplayedUncutNonTrumps = uncutNonTrumps.filter((c) => !suitsPlayedBefore.has(c.color));
    // الزات غير المقصوص الذي يختلف عن الزات الذي لُعب في الأكلة السابقة مباشرةً
    const notJustPlayedUncutNonTrumps = uncutNonTrumps.filter((c) => c.color !== lastTrickLeadSuit);

    const cutNonTrumps = baseLeadPool.filter(
      (c) => c.color !== trumpColor && c.color !== 'special' && opponentVoidSuits.has(c.color)
    );
    const notJustPlayedCutNonTrumps = cutNonTrumps.filter((c) => c.color !== lastTrickLeadSuit);

    const suitedTrumps = baseLeadPool.filter(
      (c) => trumpColor && c.color === trumpColor && !c.isJoker && !c.isMaker
    );

    const allNonTrumpLeadMoves = baseLeadPool.filter(
      (c) => c.color !== trumpColor && c.color !== 'special'
    );

    // قاعدة أساسية: "في حال كانت كروت الحكم فقط عند فريقه لا يحكم ويلعب زات آخر حتى لا يقلل عدد كروت الحكم عند فريقه"
    if (opponentsExhaustedTrumps && allNonTrumpLeadMoves.length > 0) {
      const feedableToPartnerWhenNoEnemyTrumps = allNonTrumpLeadMoves.filter(
        (c) => partnerVoidSuits.has(c.color) && !isMasterCardInSuit(c, false)
      );
      if (feedableToPartnerWhenNoEnemyTrumps.length > 0) {
        const sameSuitAsLast = feedableToPartnerWhenNoEnemyTrumps.filter(
          (c) => c.color === lastTrickLeadSuit
        );
        const poolToFeed =
          sameSuitAsLast.length > 0 ? sameSuitAsLast : feedableToPartnerWhenNoEnemyTrumps;
        poolToFeed.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
        return poolToFeed[0];
      }

      // إذا أشار الزميل إلى امتلاك خال زات معين (عبر تكراره في دورتين أو أكثر)، يمرر له البوت هذا الزات
      const signaledByPartnerPool = allNonTrumpLeadMoves.filter(
        (c) =>
          teammateSignaledKhaleSuits.has(c.color) &&
          c.color !== lastTrickLeadSuit &&
          !isMasterCardInSuit(c, false)
      );
      if (signaledByPartnerPool.length > 0) {
        signaledByPartnerPool.sort(
          (a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank)
        );
        return signaledByPartnerPool[0];
      }

      const preferredNonTrumpPool =
        unplayedUncutNonTrumps.length > 0
          ? unplayedUncutNonTrumps
          : notJustPlayedUncutNonTrumps.length > 0
          ? notJustPlayedUncutNonTrumps
          : notJustPlayedCutNonTrumps.length > 0
          ? notJustPlayedCutNonTrumps
          : uncutNonTrumps.length > 0
          ? uncutNonTrumps
          : allNonTrumpLeadMoves;

      if (wildCardsInHand.length > 0 && nonWildCardsInHand.length <= wildCardsInHand.length + 1) {
        return selectSmartDiscard(preferredNonTrumpPool, trick, trumpColor, smartDiscardOptions);
      }

      return sortByMasterThenRankDesc(preferredNonTrumpPool)[0];
    }

    // هل لُعب زات (ليس حكماً) في دورة سابقة وأكلها اللاعب؟
    const hasNonTrumpTrickBeenPlayed = playedTricks.some((t) => {
      const tLead = getEffectiveLeadColor(t, highestBid, trumpColor);
      return Boolean(tLead && tLead !== 'special' && (!trumpColor || tLead !== trumpColor));
    });

    const isHighestRemainingTrump = (card: Card): boolean => {
      if (!trumpColor || card.color !== trumpColor || card.isJoker || card.isMaker) return false;
      return isMasterCardInSuit(card, false);
    };

    // هل يسمح للحاكم (أو زميله) بسحب الحكم الآن؟
    // - يشترط ألا يكون الخصم قد استنفد حكامه (!opponentsExhaustedTrumps)
    // - عند الحاكم: يبقي حكماً بيده (suitedTrumps.length >= 2) ويملك أعلى حكم متبقٍ أو صورة حكم أو 3 حكام فأكثر
    // - عند زميل الحاكم: لا يسحب الحكم بكرت حكم صغير وحيد فيهدر حكمه، بل يسحب إذا كان يملك خال الحكم/الأعلى أو حكمين فأكثر أو صورة حكم
    const canBuyerTeamPullTrumps =
      buyerTeam === bot.team &&
      Boolean(trumpColor) &&
      suitedTrumps.length > 0 &&
      !opponentsExhaustedTrumps &&
      (isBotBuyer
        ? suitedTrumps.length >= 2 &&
          (suitedTrumps.some(isHighestRemainingTrump) ||
            suitedTrumps.length >= 3 ||
            suitedTrumps.some((c) => HIGH_CARD_RANKS.has(c.rank)))
        : suitedTrumps.some(isHighestRemainingTrump) ||
          suitedTrumps.length >= 2 ||
          suitedTrumps.some((c) => HIGH_CARD_RANKS.has(c.rank)));

    const allNonTrumpSuits = (['red', 'blue', 'green', 'yellow'] as SuitColor[]).filter(
      (col) => col !== trumpColor
    );
    const canStrikeWithTrumpNextTrick = allNonTrumpSuits.some((col) => {
      const isVoidInSuit = !bot.hand.some((c) => c.color === col);
      if (!isVoidInSuit) return false;
      const playedCountInSuit = playedTricks.reduce(
        (acc, t) => acc + t.filter((p) => p.card.color === col).length,
        0
      );
      return playedCountInSuit < 13;
    });

    // CRITICAL ANTI-SPOIL WHEN LEADING:
    // If the bot still holds a wild card (Joker/Maker) and has <= wildCardsInHand.length + 1 non-wild cards
    // (e.g., Trick 7 with 1 wild + 2 normals), leading a winning card would force the bot to lead Trick 8
    // and trap the wild card as the last card in hand on Trick 9!
    if (wildCardsInHand.length > 0 && nonWildCardsInHand.length <= wildCardsInHand.length + 1) {
      if (uncutNonTrumps.length > 0) {
        const safeUncutPool =
          unplayedUncutNonTrumps.length > 0
            ? unplayedUncutNonTrumps
            : notJustPlayedUncutNonTrumps.length > 0
            ? notJustPlayedUncutNonTrumps
            : uncutNonTrumps;
        return selectSmartDiscard(safeUncutPool, trick, trumpColor, smartDiscardOptions);
      }
      if (suitedTrumps.length > 0 && cutNonTrumps.length > 0) {
        if (buyerTeam === bot.team && (!isBotBuyer || suitedTrumps.length >= 2) && !opponentsExhaustedTrumps) {
          return selectSmartDiscard(suitedTrumps, trick, trumpColor, smartDiscardOptions);
        }
        const safeCutPool = notJustPlayedCutNonTrumps.length > 0 ? notJustPlayedCutNonTrumps : cutNonTrumps;
        if (canStrikeWithTrumpNextTrick || opponentsExhaustedTrumps || (isBotBuyer && suitedTrumps.length <= 1)) {
          return selectSmartDiscard(safeCutPool, trick, trumpColor, smartDiscardOptions);
        }
      }
      return selectSmartDiscard(baseLeadPool, trick, trumpColor, smartDiscardOptions);
    }

    // RULE A (Highest Priority Feed to Void Teammate):
    // "يجب ان ينتبه البوت لزملائه بالفريق اذا لُعِبَ زات غير الحكم وكان الزميل قاص هذا الزات واكل البوت الاكلة يعيد الزات نفسه برقم صغير ليضرب الزميل بحكمه"
    const canFeedSuitToPartner = (col: SuitColor): boolean => {
      if (!partnerVoidSuits.has(col)) return false;
      if (!opponentVoidSuits.has(col) || opponentsExhaustedTrumps) return true;
      // حتى لو كان أحد الخصوم قاصاً، إذا كان الزميل القاص يلعب قبل الخصم القاص في ترتيب الأكلة القادمة نمرر له الزات
      if (context?.players && context.players.length > 0 && trumpColor) {
        const upcomingOrder = [1, 2, 3, 4, 5].map((offset) => (bot.id + offset) % 6);
        const firstVoidPlayerInOrder = upcomingOrder.find((pid) => {
          const pl = context.players!.find((p) => p.id === pid) || context.players![pid];
          if (!pl) return false;
          const isVoidCol = !pl.hand.some((c) => c.color === col && !c.isJoker && !c.isMaker);
          const hasTrump = pl.hand.some((c) => c.color === trumpColor || c.isJoker || c.isMaker);
          return isVoidCol && hasTrump;
        });
        if (firstVoidPlayerInOrder !== undefined && isTeammate(firstVoidPlayerInOrder)) {
          return true;
        }
      }
      return false;
    };

    // اختيار ذكي لورقة الحكم عند المبادرة بسحب الحكام:
    // إذا كان البوت يملك أعلى حكم متبقٍ (مثل خال الحكم، أو الباش بعد سقوط الخال) يلعب الأعلى؛
    // أما إذا لم ينزل خال الحكم بعد وليس بيد البوت، فلا يحرق الباش أو الميم أو الغلام بل يلعب حكماً صغيراً لاستدراج خال الحكم أولاً
    const pickSmartTrumpToLead = (trumps: Card[]): Card => {
      const masterTrumps = trumps.filter(isHighestRemainingTrump);
      if (masterTrumps.length > 0) {
        masterTrumps.sort((a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor));
        return masterTrumps[0];
      }
      if (!hasTrumpKingFallen && !botHoldsTrumpKing) {
        const smallTrumps = trumps.filter((c) => !HIGH_CARD_RANKS.has(c.rank));
        if (smallTrumps.length > 0) {
          smallTrumps.sort((a, b) => getCardRankValue(a, trumpColor) - getCardRankValue(b, trumpColor));
          return smallTrumps[0];
        }
        const sortedAsc = [...trumps].sort(
          (a, b) => getCardRankValue(a, trumpColor) - getCardRankValue(b, trumpColor)
        );
        return sortedAsc[0];
      }
      const sortedDesc = [...trumps].sort(
        (a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor)
      );
      return sortedDesc[0];
    };

    const feedableToPartner = allNonTrumpLeadMoves.filter(
      (c) => canFeedSuitToPartner(c.color) && !isMasterCardInSuit(c, false)
    );
    if (feedableToPartner.length > 0) {
      const sameSuitAsLastTrick = feedableToPartner.filter(
        (c) => c.color === lastTrickLeadSuit
      );
      const targetFeedPool =
        sameSuitAsLastTrick.length > 0 ? sameSuitAsLastTrick : feedableToPartner;
      targetFeedPool.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
      return targetFeedPool[0];
    }

    // 1. إذا كان يوجد زات آخر غير مقصوص (uncutNonTrumps.length > 0) يتم استبعاد الزات المقصوص نهائياً:
    if (uncutNonTrumps.length > 0) {
      // قاعدة سحب الحكام:
      // في حال لُعب زات ليس حكماً وأكلها اللاعب (hasNonTrumpTrickBeenPlayed)، أو إذا كان العقد >= 6 أو قص الخصم زاتاً أو كان البوت زميل الحاكم:
      // يبدأ بسحب الحكم لتقليل فرص الخصم من الأكل بحكمه حتى يستنفد حكام الخصم، مع مراعاة إبقاء حكم واحد على الأقل بيد الحاكم وعدم حرق الباش قبل نزول خال الحكم!
      if (
        canBuyerTeamPullTrumps &&
        (hasNonTrumpTrickBeenPlayed || !isBotBuyer || highestBid >= 6 || opponentVoidSuits.size > 0)
      ) {
        return pickSmartTrumpToLead(suitedTrumps);
      }

      // RULE B (قبل تكرار أي زات ملعوب):
      // "يبدأ اللعب اذا كان هو الحاكم بخمس اكلات بكرت بلون ليس لديه منه كرت اخر لكي يستطيع ان يضرب بالحكم اذا لعب اللون مرة اخرى"
      // مع حماية الصور غير المترقية (لا يحرق الباش أو الميم أو الغلام أو العشرة ككرت مفرد قبل سقوط الخال)
      if (isBotBuyer && highestBid === 5) {
        const candidatePoolForSingleton =
          unplayedUncutNonTrumps.length > 0
            ? unplayedUncutNonTrumps
            : notJustPlayedUncutNonTrumps.length > 0
            ? notJustPlayedUncutNonTrumps
            : uncutNonTrumps;

        const suitCounts: Record<string, Card[]> = { red: [], blue: [], green: [], yellow: [] };
        candidatePoolForSingleton.forEach((c) => {
          if (suitCounts[c.color]) {
            suitCounts[c.color].push(c);
          }
        });

        const singletonCards = Object.values(suitCounts)
          .filter(
            (cards) =>
              cards.length === 1 &&
              !opponentVoidSuits.has(cards[0].color) &&
              (!HIGH_CARD_RANKS.has(cards[0].rank) || isMasterCardInSuit(cards[0], false))
          )
          .map((cards) => cards[0]);

        if (singletonCards.length > 0) {
          singletonCards.sort((a, b) => getCardRankValue(a, trumpColor) - getCardRankValue(b, trumpColor));
          return singletonCards[0];
        }
      }

      // إذا كان البوت يملك كرتاً في زات غير مقصوص أشار زميله إلى امتلاك خاله (عبر تكراره في دورتين أو أكثر)،
      // ولم يكن لدى البوت نفسه Master Card في الزاتات غير الملعوبة، يمرر اللعب لزميله في ذلك الزات!
      const hasOwnMasterUncut = uncutNonTrumps.some(
        (c) => c.color !== lastTrickLeadSuit && isMasterCardInSuit(c, false)
      );
      if (!hasOwnMasterUncut && teammateSignaledKhaleSuits.size > 0) {
        const partnerKhaleFeed = uncutNonTrumps.filter(
          (c) => teammateSignaledKhaleSuits.has(c.color) && c.color !== lastTrickLeadSuit
        );
        if (partnerKhaleFeed.length > 0) {
          partnerKhaleFeed.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
          return partnerKhaleFeed[0];
        }
      }

      // قاعدة عدم تكرار الزات الملعوب:
      // "اذا لعب الزات مرة لا يجب ان يلعبه البوت مرة اخرى مباشرة بعدما اكل الاكلة خصوصا اذا كان الحاكم خصما."
      // أ) إذا وُجد زات لم يُلعب من قبل إطلاقاً (unplayedUncutNonTrumps)، يبدأ به البوت وجوباً ولا يعيد لعب الزات الملعوب سابقاً ("ويبتدئ بأكبر كرت عنده")
      if (unplayedUncutNonTrumps.length > 0) {
        return sortByMasterThenRankDesc(unplayedUncutNonTrumps)[0];
      }

      const myTeamWonTricksCount = playedTricks.length - opponentWonTricksCount;
      const tricksNeededToBreakOpponentBid = Math.max(1, 10 - (highestBid || 5));
      const canDefendingBotSafelyPullBuyerTrump = Boolean(
        isBuyerOpponent &&
          suitedTrumps.some(isHighestRemainingTrump) &&
          (opponentBuyerHasSuitedTrumps ||
            myTeamWonTricksCount + 1 >= tricksNeededToBreakOpponentBid)
      );

      // ب) إذا كانت جميع ألوان الزات في يد البوت قد لُعبت سابقاً، يمنع تكرار الزات الذي لُعب في الأكلة السابقة مباشرةً (lastTrickLeadSuit):
      // وإذا كان الحاكم خصماً ولديه حكم أعلى من حكام الخصم صاحب الطلبة ويقلل حكامه (أو يكسب الجولة) يلعبه بدلاً من تكرار الزات الملعوب
      if (isBuyerOpponent && suitedTrumps.length > 0 && !opponentsExhaustedTrumps && canDefendingBotSafelyPullBuyerTrump) {
        const masterTrumps = suitedTrumps.filter(isHighestRemainingTrump);
        if (masterTrumps.length > 0) {
          masterTrumps.sort((a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor));
          return masterTrumps[0];
        }
      }

      if (notJustPlayedUncutNonTrumps.length > 0) {
        return sortByMasterThenRankDesc(notJustPlayedUncutNonTrumps)[0];
      }

      // ج) إذا لم يبقَ في الزات غير المقصوص سوى نفس الزات الذي أكل به الأكلة للتو (lastTrickLeadSuit):
      // إذا كان البوت في فريق الحاكم يملك حكماً يغير اللعب ولا يعيد نفس الزات مباشرةً؛
      // أما إذا كان الخصم هو صاحب الطلبة والحكم، فلا يحكم البوت المدافع إلا إذا ضمن أن حكمه أكبر من حكام الخصم ويقلل حكامه ويكسب الجولة!
      if (
        suitedTrumps.length > 0 &&
        !opponentsExhaustedTrumps &&
        (!isBuyerOpponent || (canDefendingBotSafelyPullBuyerTrump && !canStrikeWithTrumpNextTrick))
      ) {
        const candidateTrumps = isBuyerOpponent
          ? suitedTrumps.filter(isHighestRemainingTrump)
          : suitedTrumps;
        if (candidateTrumps.length > 0) {
          return pickSmartTrumpToLead(candidateTrumps);
        }
      }

      if (notJustPlayedCutNonTrumps.length > 0 && !isBuyerOpponent && opponentsExhaustedTrumps) {
        return sortByMasterThenRankDesc(notJustPlayedCutNonTrumps)[0];
      }

      // في حال انحصار اليد بالكامل في هذا الزات وحده، يلعب أصغر ورقة إذا كان الحاكم خصماً لتجنب قطع ورقته الكبيرة بالحكم (إلا إذا كان الكرت Master Card والخصم لا يملك حكام)
      if (isBuyerOpponent && !opponentsExhaustedTrumps) {
        return selectSmartDiscard(uncutNonTrumps, trick, trumpColor, smartDiscardOptions);
      }

      return sortByMasterThenRankDesc(uncutNonTrumps)[0];
    }

    // 2. لا يوجد في اليد زات غير مقصوص (تبقى في اليد فقط: الحكم suitedTrumps و/أو الزات المقصوص cutNonTrumps):
    if (suitedTrumps.length > 0 && cutNonTrumps.length > 0) {
      const preferredCutPool = notJustPlayedCutNonTrumps.length > 0 ? notJustPlayedCutNonTrumps : cutNonTrumps;
      if (buyerTeam === bot.team) {
        // إذا كان الفريق هو صاحب الحكم:
        // إذا استنفد الخصم جميع حكامه (فلم يعد بإمكان الخصم قص الزات بالحكم!) يحافظ البوت على حكام فريقه ويلعب الزات الآخر
        if (opponentsExhaustedTrumps) {
          return sortByMasterThenRankDesc(preferredCutPool)[0];
        }
        // خلاف ذلك، يلعب الفريق صاحب الحكم ورقة الحكم (مع عدم حرق الباش قبل نزول خال الحكم) ولا يلعب الزات المقصوص
        return pickSmartTrumpToLead(suitedTrumps);
      } else {
        // إذا كان الخصم هو صاحب الطلبة والحكم:
        if (opponentsExhaustedTrumps) {
          return sortByMasterThenRankDesc(preferredCutPool)[0];
        }

        const myTeamWonTricksCount = playedTricks.length - opponentWonTricksCount;
        const tricksNeededToBreakOpponentBid = Math.max(1, 10 - (highestBid || 5));
        const canDefendingBotSafelyPullBuyerTrump = Boolean(
          suitedTrumps.some(isHighestRemainingTrump) &&
            (opponentBuyerHasSuitedTrumps ||
              myTeamWonTricksCount + 1 >= tricksNeededToBreakOpponentBid)
        );

        // أ) لا يحكم البوت المدافع إلا بضمان أن حكمه أكبر من حكام الخصم صاحب الطلبة وأنه سيقلل حكامه ويكسب الجولة
        if (canDefendingBotSafelyPullBuyerTrump) {
          const masterTrumps = suitedTrumps.filter(isHighestRemainingTrump);
          if (masterTrumps.length > 0) {
            masterTrumps.sort((a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor));
            return masterTrumps[0];
          }
        }

        // ب) خلاف ذلك (حكمه أصغر من حكام الخصم صاحب الطلبة أو لا يقلل حكامه): لا يحكم أبداً بل يلعب من الزات الآخر ويحتفظ بحكمه
        return selectSmartDiscard(preferredCutPool, trick, trumpColor, smartDiscardOptions);
      }
    }

    if (suitedTrumps.length > 0) {
      return pickSmartTrumpToLead(suitedTrumps);
    }

    if (cutNonTrumps.length > 0) {
      const preferredCutPool = notJustPlayedCutNonTrumps.length > 0 ? notJustPlayedCutNonTrumps : cutNonTrumps;
      return selectSmartDiscard(preferredCutPool, trick, trumpColor, smartDiscardOptions);
    }

    const sortedRemaining = [...baseLeadPool].sort(
      (a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor)
    );
    return sortedRemaining[0];
  }

  // 3. FOLLOWING / RESPONDING STRATEGY (!isLead):
  const isPartnerWinning = () => {
    const currentWinnerId = evaluateTrickWinner(trick, trumpColor, highestBid);
    const winnerPlayer = context?.players ? context.players[currentWinnerId] : null;
    if (winnerPlayer && bot.team) {
      return winnerPlayer.team === bot.team;
    }
    return currentWinnerId % 2 === bot.id % 2;
  };

  const partnerIsWinning = isPartnerWinning();

  if (partnerIsWinning) {
    // إدارة "الليد" (من يبدأ الأكلة التالية) بين الزملاء:
    // إذا كان الزميل الفائز حالياً بالأكلة هو الحاكم (buyerId)، يتعمّد البوت ألا يأخذ الأكلة من زميله الحاكم
    // حتى لا يسحب منه المبادرة فيضطر للعب زات لا يناسب يد الحاكم!
    const currentWinnerId = evaluateTrickWinner(trick, trumpColor, highestBid);
    if (buyerId !== null && buyerId !== undefined && currentWinnerId === buyerId && !isBuyerOpponent) {
      const nonOvertakingMoves = legalMoves.filter(
        (c) =>
          !c.isJoker &&
          !c.isMaker &&
          evaluateTrickWinner([...trick, { playerId: bot.id, card: c }], trumpColor, highestBid) !==
            bot.id
      );
      if (nonOvertakingMoves.length > 0) {
        return selectSmartDiscard(nonOvertakingMoves, trick, trumpColor, smartDiscardOptions);
      }
    }

    // Partner is winning: discard lowest power legal card to save strength.
    return selectSmartDiscard(legalMoves, trick, trumpColor, smartDiscardOptions);
  } else {
    // Enemy is currently winning: check if we can win the trick!
    const buyerStillToPlay =
      buyerId !== null && buyerId !== undefined && !trick.some((p) => p.playerId === buyerId);

    const leadSuit = getEffectiveLeadColor(trick, highestBid, trumpColor);
    const isLeadOtherColor = Boolean(
      leadSuit && leadSuit !== 'special' && (!trumpColor || leadSuit !== trumpColor)
    );
    const isBotVoidInLead = Boolean(
      isLeadOtherColor && leadSuit && !bot.hand.some((c) => c.color === leadSuit)
    );

    // إذا كان البوت آخر لاعب قبل الحاكم الخصم وقاصّ للزات وعند الحاكم حكام ولم يصل الخصم لعدد الخطر: لا يقطع بالحكم بل يرمي زاتاً آخر غير الحكم
    if (
      isBotDirectlyBeforeOpponentBuyer &&
      isLeadOtherColor &&
      isBotVoidInLead &&
      botHasSuitedTrumps &&
      opponentBuyerHasSuitedTrumps &&
      isOpponentBelowDangerTricks
    ) {
      const nonTrumpDiscardMoves = legalMoves.filter(
        (c) => (!trumpColor || c.color !== trumpColor) && !c.isJoker && !c.isMaker
      );
      if (nonTrumpDiscardMoves.length > 0) {
        return selectSmartDiscard(nonTrumpDiscardMoves, trick, trumpColor, smartDiscardOptions);
      }
    }

    const hasNormalLegalMoves = legalMoves.some((c) => !c.isJoker && !c.isMaker);
    const hasLeadSuitInHand = Boolean(
      leadSuit &&
        leadSuit !== 'special' &&
        bot.hand.some((c) => c.color === leadSuit && !c.isJoker && !c.isMaker)
    );
    const opponentPlayedHighTrumpHonorInTrick = Boolean(
      trumpColor &&
        trick.some(
          (p) =>
            !isTeammate(p.playerId) &&
            p.playerId !== bot.id &&
            p.card.color === trumpColor &&
            ['1', 'draw2', 'skip'].includes(p.card.rank)
        )
    );
    const allowWildInGenericWinningMoves =
      !hasNormalLegalMoves ||
      highestBid === 9 ||
      opponentWonTricksCount >= dangerTrickThreshold ||
      bot.hand.length <= 3 ||
      opponentPlayedHighTrumpHonorInTrick ||
      (!hasLeadSuitInHand && isLastPlayerInTrick);

    const winningMoves = legalMoves.filter((c) => {
      if ((c.isJoker || c.isMaker) && !allowWildInGenericWinningMoves) {
        return false;
      }
      // Maker protection in early/mid round (only when hand.length > 4):
      // Do not hold back Maker late in the round (hand.length <= 4) so it never gets trapped as the last card!
      if (c.isMaker && bot.hand.length > 4 && isBuyerOpponent) {
        if (buyerStillToPlay && !hasTrumpKingFallen) {
          return false;
        }
      }

      const simulated = [...trick, { playerId: bot.id, card: c }];
      return evaluateTrickWinner(simulated, trumpColor, highestBid) === bot.id;
    });

    if (winningMoves.length > 0) {
      // Win with the lowest winning power to conserve cards (Trap & Finesse)
      winningMoves.sort((a, b) => {
        const pA = getCardPower(a, trick, trumpColor, trick.length, highestBid);
        const pB = getCardPower(b, trick, trumpColor, trick.length, highestBid);
        return pA - pB;
      });
      return winningMoves[0];
    }

    // Cannot win: discard lowest value card safely
    return selectSmartDiscard(legalMoves, trick, trumpColor, smartDiscardOptions);
  }
}

/**
 * Returns rank hierarchy value for sorting cards from High to Low
 */
export function getCardRankValue(card: Card, trumpColor: SuitColor | null): number {
  if (card.isJoker) return 1000;

  const isTrump = trumpColor && card.color === trumpColor;
  if (isTrump && card.rank === '1') return 950; // خال الحكم أعلى من الميكر ولا يأكله الميكر أبداً
  if (card.isMaker) return 900;

  switch (card.rank) {
    case '1': return 100; // الواحد (الخال) - أعلى قيمة لكل لون
    case 'draw2': return 90; // الباش (+2)
    case 'skip': return 80;  // الميم (⊘)
    case 'reverse': return 70; // الغلام (⇄)
    case '0': return 60; // العشرة (0)
    case '9': return 50;
    case '8': return 45;
    case '7': return 40;
    case '6': return 35;
    case '5': return 30;
    case '4': return 25;
    case '3': return 20;
    case '2': return 15;
    default: return 0;
  }
}

/**
 * Sorts cards in player's hand by color groups, and within each color from
 * Highest to Lowest (من الكبير إلى الصغير من اليسار إلى اليمين).
 */
export function sortHandCards(hand: Card[], trumpColor: SuitColor | null): Card[] {
  const colorOrder: Record<string, number> = {
    special: 0,
    red: 1,
    blue: 2,
    green: 3,
    yellow: 4,
  };

  const getColorPriority = (col: SuitColor): number => {
    if (col === 'special') return 0;
    if (trumpColor && col === trumpColor) return 1;
    const base = colorOrder[col] ?? 5;
    return trumpColor ? base + 2 : base;
  };

  return [...hand].sort((a, b) => {
    const colA = getColorPriority(a.color);
    const colB = getColorPriority(b.color);

    if (colA !== colB) {
      return colA - colB; // Group by color
    }

    // Within same color: from HIGH to LOW (from left to right)
    const valA = getCardRankValue(a, trumpColor);
    const valB = getCardRankValue(b, trumpColor);
    return valB - valA;
  });
}

/**
 * Calculates current match target and Asam status according to Kuwaiti Kout rules:
 * - If both teams have 5 or more points (scoreTeamA >= 5 && scoreTeamB >= 5), target is 101.
 * - If either team has less than 5 points (< 5), the target is 51 for the other team (called "عسم" Asam).
 * - If a team wins with >= 51 while the loser has 0 points, it is a Zero-Asam:
 *   - Winner displays: "كفو عطيتهم عسم"
 *   - Loser displays: "عطاكم عسم"
 */
export type MatchTargetScore = 26 | 51 | 101;

export function getMatchTargetAndStatus(
  scoreA: number,
  scoreB: number,
  configuredTarget: MatchTargetScore = 101
): {
  targetScore: number;
  isAsamActive: boolean;
  bothHaveFiveOrMore: boolean;
  isMatchOver: boolean;
  winnerTeam: 'A' | 'B' | null;
  isZeroAsam: boolean;
  statusTextA?: string;
  statusTextB?: string;
} {
  const bothHaveNonZero = scoreA > 0 && scoreB > 0;
  const bothHaveFiveOrMore = scoreA >= 5 && scoreB >= 5;
  const targetScore = configuredTarget;
  const isAsamActive = !bothHaveNonZero;

  let isMatchOver = false;
  let winnerTeam: 'A' | 'B' | null = null;
  let isZeroAsam = false;

  if (configuredTarget === 26) {
    if (scoreA >= 26) {
      isMatchOver = true;
      winnerTeam = 'A';
      if (scoreB === 0) isZeroAsam = true;
    } else if (scoreB >= 26) {
      isMatchOver = true;
      winnerTeam = 'B';
      if (scoreA === 0) isZeroAsam = true;
    }
  } else if (configuredTarget === 51) {
    if (scoreA >= 51) {
      isMatchOver = true;
      winnerTeam = 'A';
      if (scoreB === 0) isZeroAsam = true;
    } else if (scoreB >= 51) {
      isMatchOver = true;
      winnerTeam = 'B';
      if (scoreA === 0) isZeroAsam = true;
    }
  } else {
    // configuredTarget === 101
    if (scoreA >= 101) {
      isMatchOver = true;
      winnerTeam = 'A';
    } else if (scoreB >= 101) {
      isMatchOver = true;
      winnerTeam = 'B';
    } else if (scoreA >= 51 && scoreB === 0) {
      isMatchOver = true;
      winnerTeam = 'A';
      isZeroAsam = true;
    } else if (scoreB >= 51 && scoreA === 0) {
      isMatchOver = true;
      winnerTeam = 'B';
      isZeroAsam = true;
    }
  }

  let statusTextA: string | undefined;
  let statusTextB: string | undefined;

  if (isZeroAsam) {
    if (winnerTeam === 'A') {
      statusTextA = 'كفو عطيتهم عسم';
      statusTextB = 'عطاكم عسم';
    } else if (winnerTeam === 'B') {
      statusTextB = 'كفو عطيتهم عسم';
      statusTextA = 'عطاكم عسم';
    }
  }

  return {
    targetScore,
    isAsamActive,
    bothHaveFiveOrMore,
    isMatchOver,
    winnerTeam,
    isZeroAsam,
    statusTextA,
    statusTextB,
  };
}

/**
 * User Rule:
 * "التوزيع على الفريق الخسران في السكور ( الفريق الذي مجموع نقاطه اقل من الفريق الاخر)
 *  ولا يتحول التوزيع للفريق الاخر الا اذا قلت مجموع نقاطه عن الفريق الخسران"
 *
 * 1. الجولة الأولى: التوزيع عشوائي على أي لاعب من الفريقين (0..5).
 * 2. الجولات التالية:
 *    - إذا كانت نقاط الفريق الأزرق أ (scoreTeamA) أقل من ب (scoreTeamB) -> التوزيع على الفريق أ.
 *    - إذا كانت نقاط الفريق الأحمر ب (scoreTeamB) أقل من أ (scoreTeamA) -> التوزيع على الفريق ب.
 *    - في حال تعادل مجموع النقاط (scoreTeamA === scoreTeamB): لا يتحول التوزيع للفريق الآخر، بل يستمر التوزيع مع نفس الفريق السابق.
 * 3. داخل الفريق الموزع:
 *    - يكون التوزيع بالترتيب الدوري بين لاعبي ذلك الفريق (0 -> 2 -> 4 -> 0 للفريق أ، و 1 -> 3 -> 5 -> 1 للفريق ب).
 */
export interface NextRoundDealerResult {
  nextDealingTeam: 'A' | 'B';
  nextDealer: number;
  newLastDealerTeamA: number;
  newLastDealerTeamB: number;
}

export function computeNextRoundDealer(
  scoreTeamA: number,
  scoreTeamB: number,
  currentDealingTeam: 'A' | 'B',
  lastDealerTeamA: number,
  lastDealerTeamB: number
): NextRoundDealerResult {
  let nextDealingTeam: 'A' | 'B';

  if (scoreTeamA < scoreTeamB) {
    nextDealingTeam = 'A';
  } else if (scoreTeamB < scoreTeamA) {
    nextDealingTeam = 'B';
  } else {
    // التعادل بالسكور: لا يتحول التوزيع للفريق الآخر، ويبقى على الفريق الحالي
    nextDealingTeam = currentDealingTeam;
  }

  let nextDealer: number;
  let newLastDealerTeamA = lastDealerTeamA;
  let newLastDealerTeamB = lastDealerTeamB;

  if (nextDealingTeam === 'A') {
    nextDealer = (lastDealerTeamA + 2) % 6;
    newLastDealerTeamA = nextDealer;
  } else {
    nextDealer = (lastDealerTeamB + 2) % 6;
    newLastDealerTeamB = nextDealer;
  }

  return {
    nextDealingTeam,
    nextDealer,
    newLastDealerTeamA,
    newLastDealerTeamB,
  };
}


