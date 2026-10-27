export type SuitColor = 'red' | 'blue' | 'green' | 'yellow' | 'special';

export type SuitRank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '0'
  | 'reverse'
  | 'skip'
  | 'draw2'
  | '1'
  | 'wild_draw4'
  | 'wild_color';

export interface Card {
  id: string;
  color: SuitColor;
  rank: SuitRank;
  label: string;
  roleTitle: string;
  isJoker: boolean;
  isMaker: boolean;
}

export type Team = 'A' | 'B';

export interface SeatConfig {
  id: number;
  name: string;
  team: Team;
  avatarId: string;
  customPhoto: string | null;
  isHuman: boolean;
  isVacant: boolean;
  clientId?: string;
}

export interface WaitingPlayer {
  clientId: string;
  name: string;
  avatarId?: string;
  customPhoto?: string | null;
  joinedAt?: number;
}

export interface Player extends SeatConfig {
  hand: Card[];
}

export interface TrickPlay {
  playerId: number;
  card: Card;
}

export interface BidRecord {
  playerId: number;
  val: number; // 0 for Pass, 5-8, 9 for Baoon
}

export type GamePhase = 'LOBBY' | 'BIDDING' | 'CHOOSE_TRUMP' | 'PLAYING' | 'ROUND_END' | 'MATCH_OVER';

export interface ColorInfo {
  name: string;
  hex: string;
  english: string;
}

export interface CalloutMessage {
  text: string;
  emoji: string;
  timestamp: number;
}
