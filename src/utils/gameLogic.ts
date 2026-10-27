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
  if (trick[0].card.isJoker) {
    const next = trick.find((p) => !p.card.isJoker);
    return next ? next.card.color : null;
  }
  return trick[0].card.color;
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

  // خال الحكم (1 of Trump suit) is stronger than Maker and never breaks to Maker!
  if (trumpColor && card.color === trumpColor && card.rank === '1') return 950;
  if (card.isMaker) return 850;

  const base = SUIT_RANKS.indexOf(card.rank);
  if (trumpColor && card.color === trumpColor) return 100 + base;
  if (lead && card.color === lead) return 10 + base;
  return 0;
}

export function evaluateTrickWinner(trick: TrickPlay[], trumpColor: SuitColor | null): number {
  if (!trick || trick.length === 0) return 0;
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

export function calculateBotBid(hand: Card[], currentHighestBid: number): number {
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

export function selectBotMove(bot: Player, trick: TrickPlay[], trumpColor: SuitColor | null): Card {
  const legalMoves = bot.hand.filter((c) => isLegalMove(bot.hand, c, trick));
  if (legalMoves.length === 0) return bot.hand[0];

  const isLead = trick.length === 0;
  const isPartnerWinning = () => {
    if (trick.length === 0) return false;
    const currentWinnerId = evaluateTrickWinner(trick, trumpColor);
    // Partner is on same team
    return currentWinnerId % 2 === bot.id % 2;
  };

  if (isLead) {
    const trumps = legalMoves.filter((c) => c.color === trumpColor && !c.isJoker && !c.isMaker);
    const nonTrumps = legalMoves.filter((c) => c.color !== trumpColor && !c.isJoker && !c.isMaker);

    if (trumps.length > 0 && Math.random() < 0.6) {
      trumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
      return trumps[0];
    } else if (nonTrumps.length > 0) {
      nonTrumps.sort((a, b) => SUIT_RANKS.indexOf(b.rank) - SUIT_RANKS.indexOf(a.rank));
      return nonTrumps[0];
    }
    return legalMoves[0];
  } else {
    if (isPartnerWinning()) {
      // Partner is winning: play lowest power legal card to save power
      legalMoves.sort((a, b) => {
        const pA = getCardPower(a, trick, trumpColor, trick.length);
        const pB = getCardPower(b, trick, trumpColor, trick.length);
        return pA - pB;
      });
      return legalMoves[0];
    } else {
      // Enemy is winning: check if we can win with least power
      const winningMoves = legalMoves.filter((c) => {
        const simulated = [...trick, { playerId: bot.id, card: c }];
        return evaluateTrickWinner(simulated, trumpColor) === bot.id;
      });

      if (winningMoves.length > 0) {
        winningMoves.sort((a, b) => {
          const pA = getCardPower(a, trick, trumpColor, trick.length);
          const pB = getCardPower(b, trick, trumpColor, trick.length);
          return pA - pB;
        });
        return winningMoves[0];
      }

      // Can't win: dump lowest value
      legalMoves.sort((a, b) => {
        const pA = getCardPower(a, trick, trumpColor, trick.length);
        const pB = getCardPower(b, trick, trumpColor, trick.length);
        return pA - pB;
      });
      return legalMoves[0];
    }
  }
}

/**
 * Returns rank hierarchy value for sorting cards from High to Low
 */
export function getCardRankValue(card: Card, trumpColor: SuitColor | null): number {
  if (card.isJoker) return 1000;
  if (card.isMaker) return 900;

  const isTrump = trumpColor && card.color === trumpColor;
  if (isTrump && card.rank === '1') return 500; // خال الحكم

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

