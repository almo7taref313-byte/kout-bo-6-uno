import { Card, ColorInfo, Player, SuitColor, SuitRank, TrickPlay } from '../types';

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

  // In Baoon: Maker led or played has supreme winning power ("لا يوقفهما شيء")
  if (isBaoon && card.isMaker) return 990;

  // خال الحكم (1 of Trump suit) is strictly higher than Maker, Maker NEVER eats خال الحكم in normal play!
  if (trumpColor && card.color === trumpColor && card.rank === '1') return 950;

  if (card.isMaker) {
    // If خال الحكم is in the trick, Maker NEVER beats خال الحكم
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

  // In Baoon:
  // "ويعتبران حكما لا يوقفهما شي في حال امتلاكه لهما"
  // Joker and Maker cannot be stopped!
  if (isBaoon) {
    const jokerPlay = trick.find((t) => t.card.isJoker);
    if (jokerPlay) return jokerPlay.playerId;

    const makerPlay = trick.find((t) => t.card.isMaker);
    if (makerPlay) return makerPlay.playerId;
  }

  // 1. If Joker was played at index > 0, it ALWAYS wins!
  // (If Joker was led at index 0 in non-Baoon, it is "خاس يالردي" and cannot win if other cards are played!)
  if (trick.length === 1 && trick[0].card.isJoker) {
    return trick[0].playerId;
  }
  const validJokerPlay = trick.find((t, idx) => t.card.isJoker && (isBaoon || idx > 0));
  if (validJokerPlay) {
    return validJokerPlay.playerId;
  }

  // 2. If خال الحكم (1 of trumpColor) is in the trick:
  // "الميكر لا يأكل خال الحكم أبداً!"
  // خال الحكم ALWAYS wins against the Maker and all other trumps / suited cards!
  if (trumpColor) {
    const trumpKingPlay = trick.find(
      (t) => t.card.color === trumpColor && t.card.rank === '1'
    );
    if (trumpKingPlay) {
      return trumpKingPlay.playerId;
    }
  }

  // 3. If Maker was played at index > 0, Maker wins!
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

export const TURN_TIMER_DURATION = 18;

export function isLegalMove(
  hand: Card[],
  card: Card,
  trick: TrickPlay[],
  highestBid?: number,
  trumpColor?: SuitColor | null,
  isTrumpBuyer?: boolean
): boolean {
  // 1. Lead rule (trick.length === 0):
  // User Rule: "الميكر/الجيكر لا يبدأ اللعب بهما ابدا ابدا ابدا فيحال الباقون يسمح بلعب الجيكر/الميكر بعد الحكام للحاكم فقط"
  if (trick.length === 0) {
    if (card.isJoker || card.isMaker) {
      if (highestBid === 9) {
        // In Baoon (الباقون):
        // Only the bidder (الحاكم) can lead with Joker / Maker:
        if (!isTrumpBuyer) {
          const hasAlternative = hand.some((c) => !c.isJoker && !c.isMaker);
          if (hasAlternative) return false;
        }
        // And the bidder can only lead with Joker/Maker AFTER all trump suit cards in hand are exhausted:
        const hasTrumpSuitCard = Boolean(trumpColor && hand.some((c) => c.color === trumpColor));
        if (hasTrumpSuitCard) {
          return false;
        }
        return true;
      } else {
        // In all regular bids (5, 6, 7, 8):
        // Leading with Joker or Maker is strictly forbidden ("ابدا ابدا ابدا"):
        const hasAlternative = hand.some((c) => !c.isJoker && !c.isMaker);
        if (hasAlternative) return false;
      }
    }
    return true;
  }

  // 2. User Rule in Baoon when responding:
  // "في حال الباون (الجيكر والميكر يلعبون بعد الحكام جميعا عند الحاكم)"
  // In Baoon, if the bidder still holds ANY card of the trump suit in hand, Joker & Maker cannot be played yet:
  if (highestBid === 9 && isTrumpBuyer && (card.isJoker || card.isMaker)) {
    const hasAnyTrumpSuitCard = Boolean(
      trumpColor && hand.some((c) => c.color === trumpColor)
    );
    if (hasAnyTrumpSuitCard) {
      return false;
    }
  }

  // Cannot play Maker onto Joker if an alternative card exists in hand
  const hasJokerInTrick = trick.some((t, idx) => t.card.isJoker && (highestBid === 9 || idx > 0));
  if (hasJokerInTrick && card.isMaker && hand.some((c) => !c.isMaker)) {
    return false;
  }

  if (card.isJoker || card.isMaker) return true;

  const leadColor = getEffectiveLeadColor(trick, highestBid, trumpColor);
  if (!leadColor || leadColor === 'special') return true;

  const hasLead = hand.some((c) => c.color === leadColor);
  if (hasLead) {
    return card.color === leadColor;
  }
  return true;
}

export function calculateBotBid(
  hand: Card[],
  currentHighestBid: number,
  isFirstBidder: boolean = false,
  roundNumber: number = 1
): number {
  // First Bot Bidder Rule:
  // "اول لاعب بوت بعد الموزع اذا كان يمتلك اوراقا من لون واحد مثال:(خال،باش،ميم،ورقم) يختار ٥ اكلات في اول جولة في اللعبة لكي لا يعطي فرصة للفريق الخصم ليبدأ اللعب"
  if (isFirstBidder && roundNumber === 1 && currentHighestBid <= 4) {
    const suitGroups: Record<string, Card[]> = { red: [], blue: [], green: [], yellow: [] };
    hand.forEach((c) => {
      if (c.color !== 'special') suitGroups[c.color].push(c);
    });

    for (const cards of Object.values(suitGroups)) {
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

  let est = 0;
  const colCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };

  hand.forEach((c) => {
    if (c.isJoker) est += 2.0;
    else if (c.isMaker) est += 1.3;
    else if (c.rank === '1') est += 1.2;
    else if (c.rank === 'draw2') est += 0.8;

    if (c.color !== 'special') {
      colCounts[c.color] = (colCounts[c.color] || 0) + 1;
    }
  });

  const maxColCount = Math.max(...Object.values(colCounts));
  const totalTricksEst = Math.floor(est + (maxColCount >= 4 ? 2 : 1));

  if (totalTricksEst >= 9 && currentHighestBid < 9) {
    return 9; // Baoon
  } else if (totalTricksEst > currentHighestBid && totalTricksEst >= 5) {
    return currentHighestBid + 1;
  }
  return 0; // Pass ("طوف")
}

export function selectBotBestTrump(hand: Card[]): SuitColor {
  const counts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  hand.forEach((c) => {
    if (c.color !== 'special') counts[c.color]++;
  });

  let bestColor: SuitColor = 'red';
  let maxCount = -1;
  for (const [col, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestColor = col as SuitColor;
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
 * - NEVER discards a King ('1') of any suit if other legal cards exist!
 * - Discards the smallest numbers first (2, 3, 4, 5, 6, 7, 8, 9, 0...)
 * - Protects Trumps, Maker, and Joker
 */
export function selectSmartDiscard(
  legalMoves: Card[],
  trick: TrickPlay[],
  trumpColor: SuitColor | null
): Card {
  if (legalMoves.length === 1) return legalMoves[0];

  const lead = getEffectiveLeadColor(trick);

  // Exclude Kings of non-lead suits
  const nonKings = legalMoves.filter((c) => {
    if (c.rank === '1' && c.color !== lead) return false;
    if (c.isJoker || c.isMaker) return false;
    return true;
  });

  const candidates = nonKings.length > 0 ? nonKings : legalMoves.filter((c) => !c.isJoker && !c.isMaker);
  const pool = candidates.length > 0 ? candidates : legalMoves;

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
 * - User Rule: حين ينتهي الوقت المتاح للاعب لكي يلقي ورقته سواء كان بوتا او حقيقيا
 *   وكان اللون لا يملكه ويملك كرتا من الحكم يلعبه (يلعب الحكم لقص الأكلة وكسبها).
 * - وإذا كان يملك لون الأكلة ومعه الخال (1) يلعبه فوراً.
 * - وإذا كان لا يمكنه كسب الأكلة أو كروت الآخرين أعلى يرمي أصغر كرت متاح لحماية كروته.
 */
export function getTimeoutFallbackMove(
  hand: Card[],
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  playerId?: number,
  players?: Player[],
  highestBid?: number,
  buyerId?: number | null
): Card {
  const isTrumpBuyer = buyerId !== null && buyerId !== undefined && playerId === buyerId;
  const legal = hand.filter((c) => isLegalMove(hand, c, trick, highestBid, trumpColor, isTrumpBuyer));
  if (legal.length === 0) return hand[0];
  if (legal.length === 1) return legal[0];

  const lead = getEffectiveLeadColor(trick, highestBid, trumpColor);

  // If responding to an existing trick:
  if (trick.length > 0 && lead) {
    const me = playerId !== undefined && players ? players[playerId] : null;
    const buyerPlayer = buyerId !== null && buyerId !== undefined && players ? players[buyerId] : null;
    const buyerTeam = buyerPlayer?.team;

    // User Rule: إذا لعب الحاكم حكما صغيرا وعند زميله خال الحكم يجب ان يلعبه
    const buyerPlayInTrick = buyerId !== null && buyerId !== undefined
      ? trick.find((p) => p.playerId === buyerId)
      : null;
    const isSmallTrumpPlayedByBuyer =
      buyerPlayInTrick &&
      trumpColor &&
      buyerPlayInTrick.card.color === trumpColor &&
      buyerPlayInTrick.card.rank !== '1';

    if (isSmallTrumpPlayedByBuyer && buyerTeam && me && me.team === buyerTeam && me.id !== buyerId) {
      const trumpKing = legal.find((c) => c.color === trumpColor && c.rank === '1');
      if (trumpKing) return trumpKing;
    }

    const hasLeadSuit = lead !== 'special' && hand.some((c) => c.color === lead);

    // User Rule: إذا لعب أحد أعضاء الفريق حكماً على لون آخر فالبوت/اللاعب لا يلعب جيكر/ميكر لأن الأكلة أصبحت للفريق
    const isLeadOtherColor = Boolean(lead && lead !== 'special' && trumpColor && lead !== trumpColor);
    const teammateCutWithTrump = isLeadOtherColor && trick.some((p) => {
      const pPlayer = players ? players[p.playerId] : null;
      const isTeammate = playerId !== undefined && p.playerId !== playerId && (
        (pPlayer && me && pPlayer.team === me.team) ||
        (p.playerId % 2 === playerId % 2)
      );
      if (!isTeammate) return false;
      return (trumpColor && p.card.color === trumpColor) || p.card.isJoker || p.card.isMaker;
    });

    if (teammateCutWithTrump) {
      const nonSupreme = legal.filter((c) => !c.isJoker && !c.isMaker);
      const safePool = nonSupreme.length > 0 ? nonSupreme : legal;
      if (hasLeadSuit) {
        const leadCards = safePool.filter((c) => c.color === lead);
        if (leadCards.length > 0) {
          leadCards.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
          return leadCards[0];
        }
      }
      return selectSmartDiscard(safePool, trick, trumpColor);
    }

    // 1. User Rule: إذا كان اللون لا يملكه ويملك كرتاً من الحكم يلعبه!
    if (!hasLeadSuit) {
      const trumps = legal.filter(
        (c) => (trumpColor && c.color === trumpColor) || c.isJoker || c.isMaker
      );

      if (trumps.length > 0) {
        // Can any trump win the trick?
        const winningTrumps = trumps.filter((c) => {
          const simulated = [...trick, { playerId: -1, card: c }];
          return evaluateTrickWinner(simulated, trumpColor) === -1;
        });

        if (winningTrumps.length > 0) {
          // Play the lowest winning trump to win trick economically
          winningTrumps.sort((a, b) => {
            const pA = getCardPower(a, trick, trumpColor, trick.length);
            const pB = getCardPower(b, trick, trumpColor, trick.length);
            return pA - pB;
          });
          return winningTrumps[0];
        }

        // Even if trick cannot be won (e.g. higher trump already played), play the lowest trump
        trumps.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
        return trumps[0];
      }

      // No lead suit and no trumps: discard smallest card (2, 3, 4, 5...) protecting Kings
      return selectSmartDiscard(legal, trick, trumpColor);
    }

    // 2. Player HAS lead suit:
    // If player holds King ('1') of lead suit, play it!
    const kingOfLead = legal.find((c) => c.color === lead && c.rank === '1');
    if (kingOfLead) return kingOfLead;

    // Check if player can win with a lead card:
    const winningLeadMoves = legal.filter((c) => {
      const simulated = [...trick, { playerId: -1, card: c }];
      return evaluateTrickWinner(simulated, trumpColor) === -1;
    });

    if (winningLeadMoves.length > 0) {
      winningLeadMoves.sort((a, b) => {
        const pA = getCardPower(a, trick, trumpColor, trick.length);
        const pB = getCardPower(b, trick, trumpColor, trick.length);
        return pA - pB;
      });
      return winningLeadMoves[0];
    }

    // Cannot win: play smallest card of lead suit
    return selectSmartDiscard(legal, trick, trumpColor);
  }

  // Opening trick (trick.length === 0):
  // Strictly filter out Joker and Maker if other cards exist (unless Baoon + bidder + no trumps)
  const nonWilds = legal.filter((c) => !c.isJoker && !c.isMaker);
  const openPool = nonWilds.length > 0 ? nonWilds : legal;
  return selectSmartDiscard(openPool, trick, trumpColor);
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
  const isBuyerOpponent = buyerTeam && buyerTeam !== bot.team;
  const playedTricks = context?.playedTricks || [];

  const isBotBuyer = buyerId !== null && buyerId !== undefined && bot.id === buyerId;
  const legalMoves = bot.hand.filter((c) => isLegalMove(bot.hand, c, trick, highestBid, trumpColor, isBotBuyer));
  if (legalMoves.length === 0) return bot.hand[0];
  if (legalMoves.length === 1) return legalMoves[0];

  // Check past fallen supreme cards in this round
  const hasTrumpKingFallen = playedTricks.some((t) =>
    t.some((p) => trumpColor && p.card.color === trumpColor && p.card.rank === '1')
  );
  const hasJokerFallen = playedTricks.some((t) => t.some((p) => p.card.isJoker));

  const isLead = trick.length === 0;

  // 1. TACTICAL RULES:
  if (!isLead) {
    const leadSuit = getEffectiveLeadColor(trick, highestBid, trumpColor);
    const isLeadOtherColor = Boolean(
      leadSuit &&
      leadSuit !== 'special' &&
      trumpColor &&
      leadSuit !== trumpColor
    );

    // User Rule:
    // "اذا لعب احد اعضاء الفريق حكما على لون اخر فالبوت في نفس الفريق لا يلعب جيكر/ميكر لان الاكلة ستصبح للفريق بوجود حكم"
    const teammateCutWithTrump = isLeadOtherColor && trick.some((p) => {
      const isTeammate = p.playerId !== bot.id && (
        (context?.players && context.players[p.playerId]?.team === bot.team) ||
        (bot.team ? (context?.players?.[p.playerId]?.team === bot.team) : (p.playerId % 2 === bot.id % 2))
      );
      if (!isTeammate) return false;
      return (trumpColor && p.card.color === trumpColor) || p.card.isJoker || p.card.isMaker;
    });

    if (teammateCutWithTrump) {
      // The teammate already cut the trick with trump on another suit.
      // The trick is secured for the team with this trump ("لان الاكلة ستصبح للفريق بوجود حكم").
      // The bot in the same team MUST NOT play Joker or Maker!
      const nonSupremeMoves = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
      const safePool = nonSupremeMoves.length > 0 ? nonSupremeMoves : legalMoves;

      // If bot has the lead suit, play lowest card of lead suit (follow suit cleanly, no wasting honors)
      const leadCards = safePool.filter((c) => c.color === leadSuit);
      if (leadCards.length > 0) {
        leadCards.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
        return leadCards[0];
      }

      // If bot doesn't have lead suit, discard safely with smallest card (protecting kings and supreme cards)
      return selectSmartDiscard(safePool, trick, trumpColor);
    }

    // 1b. USER RULE: تطوير للبوت: اذا لعب الحاكم حكما صغيرا وعند زميله خال الحكم يجب ان يلعبه
    const buyerPlayInTrick = buyerId !== null && buyerId !== undefined
      ? trick.find((p) => p.playerId === buyerId)
      : null;

    const isSmallTrumpPlayedByBuyer =
      buyerPlayInTrick &&
      trumpColor &&
      buyerPlayInTrick.card.color === trumpColor &&
      buyerPlayInTrick.card.rank !== '1';

    if (isSmallTrumpPlayedByBuyer && buyerTeam && bot.team === buyerTeam && bot.id !== buyerId) {
      // If the bidder played a small trump and teammate holds خال الحكم (Trump Ace '1'), bot MUST play it!
      const trumpKingMove = legalMoves.find((c) => c.color === trumpColor && c.rank === '1');
      if (trumpKingMove) {
        return trumpKingMove;
      }
    }

    const isTrumpLead = leadSuit === trumpColor;
    const isVerySmallTrumpPlayedByBuyer =
      isTrumpLead &&
      buyerPlayInTrick &&
      trumpColor &&
      buyerPlayInTrick.card.color === trumpColor &&
      ['2', '3', '4', '5', '6', '7', '8', '9'].includes(buyerPlayInTrick.card.rank);

    if (highestBid >= 6 && isVerySmallTrumpPlayedByBuyer) {
      // إذا لعب الحاكم (المشتري بـ 6 أكلات فأكثر من الفريق) حكماً صغيراً،
      // وإذا لم يكن معه خال الحكم، يقوم البوت من نفس الفريق الذي يملك الجيكر برميه فوراً
      if (buyerTeam && bot.team === buyerTeam) {
        const jokerMove = legalMoves.find((c) => c.isJoker);
        if (jokerMove) {
          return jokerMove;
        }
      }

      // وأيضاً إذا كان البوت من الفريق الخصم: يرمي الجيكر ليمنع الحاكم من كسب الأكلة برقم صغير،
      // أو يرمي الميكر إذا كان خال الحكم قد سقط سابقاً.
      if (isBuyerOpponent) {
        const jokerMove = legalMoves.find((c) => c.isJoker);
        if (jokerMove) {
          return jokerMove;
        }

        if (hasTrumpKingFallen) {
          const makerMove = legalMoves.find((c) => c.isMaker);
          if (makerMove) {
            return makerMove;
          }
        }
      }
    }
  }

  // 2. LEADING STRATEGY (isLead === true):
  // User Rule: "الميكر/الجيكر لا يبدأ اللعب بهما ابدا ابدا ابدا فيحال الباقون يسمح بلعب الجيكر/الميكر بعد الحكام للحاكم فقط"
  if (isLead) {
    // In Baoon (highestBid === 9):
    if (highestBid === 9 && trumpColor) {
      const isBotBuyer = buyerId === bot.id;
      if (isBotBuyer) {
        // The buyer in Baoon plays trumps first in hierarchy:
        // 1. خال الحكم (1 of trumpColor)
        const trumpKing = legalMoves.find((c) => c.color === trumpColor && c.rank === '1');
        if (trumpKing) return trumpKing;

        // 2. باش (draw2 of trumpColor)
        const trumpBasha = legalMoves.find((c) => c.color === trumpColor && c.rank === 'draw2');
        if (trumpBasha) return trumpBasha;

        // 3. ميم (skip of trumpColor)
        const trumpMeem = legalMoves.find((c) => c.color === trumpColor && c.rank === 'skip');
        if (trumpMeem) return trumpMeem;

        // 4. غلام (reverse of trumpColor)
        const trumpGholam = legalMoves.find((c) => c.color === trumpColor && c.rank === 'reverse');
        if (trumpGholam) return trumpGholam;

        // 5. باقي كروت الحكم الملونة
        const remainingColorTrumps = legalMoves.filter((c) => c.color === trumpColor);
        if (remainingColorTrumps.length > 0) {
          remainingColorTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
          return remainingColorTrumps[0];
        }

        // 6. بعد انتهاء جميع كروت الحكم، يسمح للحاكم בלבד بلعب الجيكر والميكر:
        const jokerCard = legalMoves.find((c) => c.isJoker);
        if (jokerCard) return jokerCard;

        const makerCard = legalMoves.find((c) => c.isMaker);
        if (makerCard) return makerCard;

        // 7. الألوان الأخرى من الأقوى للأضعف
        const nonTrumps = legalMoves.filter((c) => c.color !== trumpColor);
        if (nonTrumps.length > 0) {
          nonTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
          return nonTrumps[0];
        }
      } else {
        // Non-buyer bot in Baoon: strictly NEVER lead with Joker or Maker
        const nonWilds = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
        if (nonWilds.length > 0) {
          nonWilds.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
          return nonWilds[0];
        }
      }
    }

    // In regular play (highestBid !== 9):
    // Bot NEVER leads with Joker or Maker ("لا يبدأ اللعب بهما ابدا ابدا ابدا")
    const regularNonWilds = legalMoves.filter((c) => !c.isJoker && !c.isMaker);
    const usablePool = regularNonWilds.length > 0 ? regularNonWilds : legalMoves;

    // If bot's team is buyer (in regular play):
    if (buyerTeam === bot.team && trumpColor) {
      // Lead with highest suited trump to pull out opponents' trumps (excluding Joker/Maker)
      const suitedTrumps = usablePool.filter((c) => c.color === trumpColor);
      if (suitedTrumps.length > 0) {
        suitedTrumps.sort((a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor));
        return suitedTrumps[0];
      }
    }

    // If opponent's team is buyer:
    if (isBuyerOpponent) {
      // Bot in the other team does NOT lead with trump initially!
      const nonTrumps = usablePool.filter((c) => c.color !== trumpColor);

      if (nonTrumps.length > 0) {
        const opponentVoidSuits = new Set<SuitColor>();
        const partnerVoidSuits = new Set<SuitColor>();

        playedTricks.forEach((t) => {
          const tLead = getEffectiveLeadColor(t);
          if (tLead && tLead !== 'special') {
            t.forEach((p) => {
              const pPlayer = context?.players ? context.players[p.playerId] : null;
              if (pPlayer && p.card.color !== tLead && !p.card.isJoker && !p.card.isMaker) {
                if (pPlayer.team !== bot.team) {
                  opponentVoidSuits.add(tLead);
                } else if (p.playerId !== bot.id) {
                  partnerVoidSuits.add(tLead);
                }
              }
            });
          }
        });

        // 2a. Partner feed: If partner is void in a non-trump suit, lead that suit so partner can cut with trump!
        const partnerFeedMoves = nonTrumps.filter((c) => partnerVoidSuits.has(c.color));
        if (partnerFeedMoves.length > 0) {
          partnerFeedMoves.sort((a, b) => SUIT_RANKS.indexOf(a.rank) - SUIT_RANKS.indexOf(b.rank));
          return partnerFeedMoves[0];
        }

        // 2b. Avoid opponent void suits!
        const safeNonTrumps = nonTrumps.filter((c) => !opponentVoidSuits.has(c.color));
        const leadCandidates = safeNonTrumps.length > 0 ? safeNonTrumps : nonTrumps;

        // Sort descending to lead with strong non-trump honors
        leadCandidates.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
        return leadCandidates[0];
      }
    }

    // Default leading: non-trump if available, else best card from pool
    const nonTrumps = usablePool.filter((c) => c.color !== trumpColor);
    if (nonTrumps.length > 0) {
      nonTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
      return nonTrumps[0];
    }
    return usablePool[0];
  }

  // 3. FOLLOWING / RESPONDING STRATEGY (!isLead):
  const isPartnerWinning = () => {
    const currentWinnerId = evaluateTrickWinner(trick, trumpColor);
    const winnerPlayer = context?.players ? context.players[currentWinnerId] : null;
    if (winnerPlayer && bot.team) {
      return winnerPlayer.team === bot.team;
    }
    return currentWinnerId % 2 === bot.id % 2;
  };

  const partnerIsWinning = isPartnerWinning();

  if (partnerIsWinning) {
    // Partner is winning: discard lowest power legal card to save strength.
    // User Rule: "عدم القاء الخال من اي لون في حال لم يكن الملعوب نفس لون الخال ورمي الارقام الصغيرة اولا"
    return selectSmartDiscard(legalMoves, trick, trumpColor);
  } else {
    // Enemy is currently winning: check if we can win the trick!
    const winningMoves = legalMoves.filter((c) => {
      // Maker protection:
      // If opposing team is buyer, don't throw Maker unless Joker and Trump King already fell!
      if (c.isMaker && isBuyerOpponent && (!hasTrumpKingFallen || !hasJokerFallen)) {
        return false;
      }
      // If bot is playing before buyer and buyer hasn't played yet in this trick:
      const buyerStillToPlay = buyerId !== null && buyerId !== undefined && !trick.some((p) => p.playerId === buyerId);
      if (c.isMaker && buyerStillToPlay && isBuyerOpponent && !hasTrumpKingFallen) {
        return false;
      }

      const simulated = [...trick, { playerId: bot.id, card: c }];
      return evaluateTrickWinner(simulated, trumpColor) === bot.id;
    });

    if (winningMoves.length > 0) {
      // Win with the lowest winning power to conserve cards
      winningMoves.sort((a, b) => {
        const pA = getCardPower(a, trick, trumpColor, trick.length);
        const pB = getCardPower(b, trick, trumpColor, trick.length);
        return pA - pB;
      });
      return winningMoves[0];
    }

    // Cannot win: discard lowest value card safely
    // "عدم القاء الخال من اي لون... ورمي الارقام الصغيرة اولا (٢،٣،٤،٥...)"
    return selectSmartDiscard(legalMoves, trick, trumpColor);
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
export function getMatchTargetAndStatus(scoreA: number, scoreB: number): {
  targetScore: number;
  isAsamActive: boolean;
  bothHaveFiveOrMore: boolean;
  isMatchOver: boolean;
  winnerTeam: 'A' | 'B' | null;
  isZeroAsam: boolean;
  statusTextA?: string;
  statusTextB?: string;
} {
  const bothHaveFiveOrMore = scoreA >= 5 && scoreB >= 5;
  const targetScore = bothHaveFiveOrMore ? 101 : 51;
  const isAsamActive = !bothHaveFiveOrMore;

  let isMatchOver = false;
  let winnerTeam: 'A' | 'B' | null = null;
  let isZeroAsam = false;

  if (bothHaveFiveOrMore) {
    if (scoreA >= 101) {
      isMatchOver = true;
      winnerTeam = 'A';
    } else if (scoreB >= 101) {
      isMatchOver = true;
      winnerTeam = 'B';
    }
  } else {
    // Either team has < 5 points, so reaching 51 wins by Asam!
    if (scoreA >= 51 && scoreB < 5) {
      isMatchOver = true;
      winnerTeam = 'A';
      isZeroAsam = scoreB === 0;
    } else if (scoreB >= 51 && scoreA < 5) {
      isMatchOver = true;
      winnerTeam = 'B';
      isZeroAsam = scoreA === 0;
    } else if (scoreA >= 101) {
      isMatchOver = true;
      winnerTeam = 'A';
    } else if (scoreB >= 101) {
      isMatchOver = true;
      winnerTeam = 'B';
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


