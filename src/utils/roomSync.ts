import mqtt, { MqttClient } from 'mqtt';
import { BidRecord, Card, Player, SeatConfig, SuitColor, TrickPlay } from '../types';

export interface RoomSyncMessage {
  type:
    | 'JOIN_REQUEST'
    | 'SEAT_RESERVED'
    | 'ROOM_STATE'
    | 'START_GAME'
    | 'HEARTBEAT'
    | 'PLAYER_BID'
    | 'TRUMP_CHOSEN'
    | 'CARD_PLAYED'
    | 'TRICK_RESOLVED'
    | 'NEW_ROUND'
    | 'BOT_TAKEOVER'
    | 'SYNC_REQUEST'
    | 'SYNC_STATE';
  roomCode: string;
  senderId: string;
  seatIndex?: number;
  oldSeatIndex?: number;
  player?: {
    name: string;
    team: 'A' | 'B';
    avatarId?: string;
    customPhoto?: string | null;
    isHuman: boolean;
  };
  seats?: SeatConfig[];
  hand?: Card[];
  vacantCount?: number;
  timestamp: number;

  // In-Game Multiplayer Action Fields
  deck?: Card[];
  dealerIdx?: number;
  roundNumber?: number;
  scores?: { a: number; b: number };
  playerId?: number;
  val?: number;
  forced?: boolean;
  color?: SuitColor;
  card?: Card;
  winnerId?: number;
  nextA?: number;
  nextB?: number;

  // Complete Game State Sync for Mobile Reconnections & Mid-Game Joiners
  phase?: string;
  currentTurn?: number;
  currentTrick?: TrickPlay[];
  trumpColor?: SuitColor | null;
  highestBid?: number;
  bidWinner?: number | null;
  isForcedBid?: boolean;
  biddingHistory?: BidRecord[];
  players?: Player[];
  allHands?: { playerId: number; hand: Card[]; isHuman: boolean; name: string }[];
}

export type RoomMessageCallback = (msg: RoomSyncMessage) => void;

// High-speed globally distributed MQTT broker
const PRIMARY_BROKER = 'wss://broker.emqx.io:8084/mqtt';

class RoomSyncManager {
  private client: MqttClient | null = null;
  private currentRoomCode: string | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners: Set<RoomMessageCallback> = new Set();
  private isConnecting: boolean = false;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private outboundQueue: RoomSyncMessage[] = [];
  private seenMessageHashes: Set<string> = new Set();
  public isConnected: boolean = false;
  public myClientId: string = 'kout_' + Math.random().toString(36).substring(2, 9);

  constructor() {
    if (typeof window !== 'undefined') {
      // Mobile visibility & online recovery listener
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.handleWakeup();
        }
      });
      window.addEventListener('online', () => {
        this.handleWakeup();
      });
      window.addEventListener('focus', () => {
        this.handleWakeup();
      });

      // Cross-tab storage event synchronization
      window.addEventListener('storage', (evt) => {
        if (evt.key && this.currentRoomCode && evt.key.startsWith(`kout_room_event_${this.currentRoomCode}`)) {
          try {
            if (evt.newValue) {
              const data: RoomSyncMessage = JSON.parse(evt.newValue);
              if (data && data.senderId !== this.myClientId) {
                this.notifyListeners(data);
              }
            }
          } catch {}
        }
      });
    }
  }

  public subscribeRoom(roomCode: string, onMessage: RoomMessageCallback): () => void {
    this.listeners.add(onMessage);

    if (this.currentRoomCode !== roomCode || !this.client || !this.client.connected) {
      this.disconnect();
      this.currentRoomCode = roomCode;
      this.connect(roomCode);
    }

    return () => {
      this.listeners.delete(onMessage);
    };
  }

  public handleWakeup() {
    if (!this.currentRoomCode) return;

    // Reset connecting lock if it got hung
    this.isConnecting = false;

    // If client is disconnected, reconnect immediately
    if (!this.client || !this.client.connected) {
      this.connect(this.currentRoomCode);
    }

    // Immediately queue full state sync request
    this.publish({
      type: 'SYNC_REQUEST',
      roomCode: this.currentRoomCode,
      senderId: this.myClientId,
      timestamp: Date.now(),
    });
  }

  private connect(roomCode: string) {
    if (this.client && this.client.connected && this.currentRoomCode === roomCode) {
      return;
    }

    this.isConnecting = true;
    const topic = `kout_bo6/room_${roomCode}`;

    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
    }
    // Safety watchdog: never let isConnecting stay stuck
    this.connectTimeoutTimer = setTimeout(() => {
      this.isConnecting = false;
    }, 4500);

    // 1. Setup local BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined' && !this.bc) {
        this.bc = new BroadcastChannel(`kout_bc_${roomCode}`);
        this.bc.onmessage = (evt) => {
          if (evt.data && evt.data.senderId !== this.myClientId) {
            this.notifyListeners(evt.data);
          }
        };
      }
    } catch {}

    // 2. Setup MQTT over WebSocket
    try {
      if (this.client) {
        try {
          this.client.end(true);
        } catch {}
        this.client = null;
      }

      const client = mqtt.connect(PRIMARY_BROKER, {
        clientId: this.myClientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 10, // 10s keepalive pings keep mobile cellular sockets alive
      });

      this.client = client;

      client.on('connect', () => {
        this.isConnecting = false;
        this.isConnected = true;
        if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);

        client.subscribe(topic, { qos: 0 }, (err) => {
          if (!err) {
            // Flush any actions that occurred while connecting
            this.flushQueue();

            // Request state sync
            this.publish({
              type: 'SYNC_REQUEST',
              roomCode,
              senderId: this.myClientId,
              timestamp: Date.now(),
            });
          }
        });
      });

      client.on('message', (receivedTopic, payload) => {
        if (receivedTopic === topic) {
          try {
            const data: RoomSyncMessage = JSON.parse(payload.toString());
            if (data && data.senderId !== this.myClientId) {
              this.notifyListeners(data);
            }
          } catch {}
        }
      });

      client.on('error', () => {
        this.isConnecting = false;
        this.isConnected = false;
      });

      client.on('close', () => {
        this.isConnecting = false;
        this.isConnected = false;
      });

      client.on('offline', () => {
        this.isConnecting = false;
        this.isConnected = false;
      });
    } catch {
      this.isConnecting = false;
      this.isConnected = false;
    }
  }

  public publish(msg: RoomSyncMessage) {
    const fullMsg: RoomSyncMessage = {
      ...msg,
      senderId: this.myClientId,
      timestamp: Date.now(),
    };

    // 1. BroadcastChannel
    try {
      if (this.bc) {
        this.bc.postMessage(fullMsg);
      }
    } catch {}

    // 2. LocalStorage for same-device cross-tab event
    try {
      localStorage.setItem(`kout_room_event_${msg.roomCode}`, JSON.stringify(fullMsg));
    } catch {}

    // 3. Queue and flush via MQTT
    this.outboundQueue.push(fullMsg);
    this.flushQueue();
  }

  private flushQueue() {
    if (!this.client || !this.client.connected || !this.currentRoomCode) {
      // If disconnected, trigger connect
      if (this.currentRoomCode && !this.isConnecting) {
        this.connect(this.currentRoomCode);
      }
      return;
    }

    const topic = `kout_bo6/room_${this.currentRoomCode}`;
    while (this.outboundQueue.length > 0) {
      const msg = this.outboundQueue[0];
      try {
        this.client.publish(topic, JSON.stringify(msg), { qos: 0 });
        this.outboundQueue.shift();
      } catch {
        break;
      }
    }
  }

  private notifyListeners(msg: RoomSyncMessage) {
    // Deduplicate identical packets
    const hash = `${msg.senderId}_${msg.type}_${msg.timestamp}_${msg.playerId ?? ''}_${msg.card?.id ?? ''}_${msg.roundNumber ?? ''}`;
    if (this.seenMessageHashes.has(hash)) {
      return;
    }
    this.seenMessageHashes.add(hash);
    if (this.seenMessageHashes.size > 200) {
      const it = this.seenMessageHashes.values();
      for (let i = 0; i < 50; i++) {
        const val = it.next().value;
        if (val) this.seenMessageHashes.delete(val);
      }
    }

    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch {}
    });
  }

  public disconnect() {
    this.isConnecting = false;
    this.isConnected = false;
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {}
      this.bc = null;
    }
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.currentRoomCode = null;
  }
}

export const roomSync = new RoomSyncManager();
