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

export interface OnlinePlayer {
  clientId: string;
  name: string;
  avatarId: string;
  customPhoto: string | null;
  status: 'lobby' | 'private_table' | 'playing';
  roomCode?: string;
  lastSeen: number;
}

export interface TableInvite {
  id: string;
  roomCode: string;
  hostClientId: string;
  hostName: string;
  hostAvatarId: string;
  hostCustomPhoto: string | null;
  targetClientId: string;
  timestamp: number;
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
  forced?: boolean; // true when Dealer chose ملزوم
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

