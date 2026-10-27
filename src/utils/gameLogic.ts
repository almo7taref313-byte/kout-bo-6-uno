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

export function getEffectiveLeadColor(trick: TrickPlay[]): SuitColor | null {
  if (!trick || trick.length === 0) return null;
  // If led with Joker or Maker, the first suited card determines the lead color
  const suited = trick.find((p) => !p.card.isJoker && !p.card.isMaker);
  return suited ? suited.card.color : null;
}

export function getCardPower(
  card: Card,
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  playIndex: number
): number {
  if (card.isJoker && playIndex === 0) return 0;
  if (card.isJoker) return 1000;

  const lead = getEffectiveLeadColor(trick);

  // خال الحكم (1 of Trump suit) is strictly higher than Maker, Maker NEVER eats خال الحكم!
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

export function evaluateTrickWinner(trick: TrickPlay[], trumpColor: SuitColor | null): number {
  if (!trick || trick.length === 0) return 0;

  // 1. If Joker (+4) was played (and not as opening when other cards held), Joker ALWAYS wins!
  const validJokerPlay = trick.find((t, idx) => t.card.isJoker && (idx > 0 || trick.length === 1));
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

  // 3. If Maker (Rainbow 🌈) is in the trick:
  // Maker beats all other trumps and suited cards (except Joker and خال الحكم)!
  const makerPlay = trick.find((t) => t.card.isMaker);
  if (makerPlay) {
    return makerPlay.playerId;
  }

  // 4. Regular trick resolution by card power
  let winning = trick[0];
  let maxP = getCardPower(winning.card, trick, trumpColor, 0);

  for (let i = 1; i < trick.length; i++) {
    const p = getCardPower(trick[i].card, trick, trumpColor, i);
    if (p > maxP) {
      maxP = p;
      winning = trick[i];
    }
  }
  return winning.playerId;
}

export function isLegalMove(hand: Card[], card: Card, trick: TrickPlay[]): boolean {
  if (trick.length === 0) {
    // Opening rule: Cannot lead Joker or Maker if you have another suit card
    if ((card.isJoker || card.isMaker) && hand.length > 1) {
      const hasAlternative = hand.some((c) => !c.isJoker && !c.isMaker);
      if (hasAlternative) return false;
    }
    return true;
  }

  // Cannot play Maker onto Joker if an alternative card exists in hand
  const hasJokerInTrick = trick.some((t) => t.card.isJoker);
  if (hasJokerInTrick && card.isMaker && hand.some((c) => !c.isMaker)) {
    return false;
  }

  if (card.isJoker || card.isMaker) return true;

  const leadColor = getEffectiveLeadColor(trick);
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
  trumpColor: SuitColor | null
): Card {
  const legal = hand.filter((c) => isLegalMove(hand, c, trick));
  if (legal.length === 0) return hand[0];
  if (legal.length === 1) return legal[0];

  const lead = getEffectiveLeadColor(trick);

  // If responding to an existing trick:
  if (trick.length > 0 && lead) {
    const hasLeadSuit = lead !== 'special' && hand.some((c) => c.color === lead);

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
  return selectSmartDiscard(legal, trick, trumpColor);
}

export function selectBotMove(
  bot: Player,
  trick: TrickPlay[],
  trumpColor: SuitColor | null,
  context?: BotStrategyContext
): Card {
  const legalMoves = bot.hand.filter((c) => isLegalMove(bot.hand, c, trick));
  if (legalMoves.length === 0) return bot.hand[0];
  if (legalMoves.length === 1) return legalMoves[0];

  const buyerId = context?.buyerId;
  const highestBid = context?.highestBid ?? 0;
  const buyerPlayer = buyerId !== null && buyerId !== undefined && context?.players ? context.players[buyerId] : null;
  const buyerTeam = buyerPlayer?.team;
  const isBuyerOpponent = buyerTeam && buyerTeam !== bot.team;
  const playedTricks = context?.playedTricks || [];

  // Check past fallen supreme cards in this round
  const hasTrumpKingFallen = playedTricks.some((t) =>
    t.some((p) => trumpColor && p.card.color === trumpColor && p.card.rank === '1')
  );
  const hasJokerFallen = playedTricks.some((t) => t.some((p) => p.card.isJoker));

  const isLead = trick.length === 0;

  // 1. TACTICAL RULES WHEN BUYER PLAYS SMALL TRUMP (BID >= 6):
  if (!isLead) {
    const buyerPlayInTrick = buyerId !== null && buyerId !== undefined
      ? trick.find((p) => p.playerId === buyerId)
      : null;

    const isSmallTrumpPlayedByBuyer =
      buyerPlayInTrick &&
      trumpColor &&
      buyerPlayInTrick.card.color === trumpColor &&
      ['2', '3', '4', '5', '6', '7', '8', '9'].includes(buyerPlayInTrick.card.rank);

    if (highestBid >= 6 && isSmallTrumpPlayedByBuyer) {
      // User Rule: إذا لعب الحاكم (المشتري بـ 6 أكلات فأكثر من الفريق) حكماً صغيراً (2 إلى 9)،
      // يقوم البوت من نفس الفريق الذي يملك الجيكر (+4) برميه فوراً لكسب الأكلة.
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
  if (isLead) {
    // If bot's team is buyer:
    if (buyerTeam === bot.team && trumpColor) {
      // Lead with highest trump to pull out opponents' trumps
      const trumps = legalMoves.filter((c) => c.color === trumpColor || c.isJoker || c.isMaker);
      if (trumps.length > 0) {
        trumps.sort((a, b) => getCardRankValue(b, trumpColor) - getCardRankValue(a, trumpColor));
        return trumps[0];
      }
    }

    // If opponent's team is buyer:
    if (isBuyerOpponent) {
      // Bot in the other team does NOT lead with trump initially!
      const nonTrumps = legalMoves.filter((c) => c.color !== trumpColor && !c.isJoker && !c.isMaker);

      if (nonTrumps.length > 0) {
        // Track suits that opponents are known to be void in (avoid leading that suit to prevent cross-cut!)
        const opponentVoidSuits = new Set<SuitColor>();
        // Track suits partner is void in (feed partner so they can cut with trump!)
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

    // Default leading: non-trump if available, else best card
    const nonTrumps = legalMoves.filter((c) => c.color !== trumpColor && !c.isJoker && !c.isMaker);
    if (nonTrumps.length > 0) {
      nonTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
      return nonTrumps[0];
    }
    return legalMoves[0];
  }

  // 3. FOLLOWING / RESPONDING STRATEGY (!isLead):
  const isPartnerWinning = () => {
    const currentWinnerId = evaluateTrickWinner(trick, trumpColor);
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

