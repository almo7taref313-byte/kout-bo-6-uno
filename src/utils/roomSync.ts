import mqtt, { MqttClient } from 'mqtt';
import { BidRecord, Card, SeatConfig, SuitColor, TrickPlay } from '../types';

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
  allHands?: { playerId: number; hand: Card[]; isHuman: boolean; name: string }[];
}

export type RoomMessageCallback = (msg: RoomSyncMessage) => void;

const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

class RoomSyncManager {
  private client: MqttClient | null = null;
  private currentRoomCode: string | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners: Set<RoomMessageCallback> = new Set();
  private brokerIndex: number = 0;
  private isConnecting: boolean = false;
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

    if (this.currentRoomCode !== roomCode) {
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

    // If client is dead, reconnect immediately
    if (!this.client || !this.client.connected) {
      this.connect(this.currentRoomCode);
    }

    // Immediately ask host for full state sync
    this.publish({
      type: 'SYNC_REQUEST',
      roomCode: this.currentRoomCode,
      senderId: this.myClientId,
      timestamp: Date.now(),
    });
  }

  private connect(roomCode: string) {
    if (this.isConnecting && this.client) return;
    this.isConnecting = true;
    const topic = `kout_bo6/room_${roomCode}`;

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

    // 2. Setup MQTT over WebSocket with broker fallback and fast keepalive for mobile
    try {
      const brokerUrl = BROKER_URLS[this.brokerIndex % BROKER_URLS.length];
      if (this.client) {
        try {
          this.client.end(true);
        } catch {}
      }

      const client = mqtt.connect(brokerUrl, {
        clientId: this.myClientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1500,
        keepalive: 15, // 15s keepalive pings prevent mobile cellular socket drops
      });

      this.client = client;

      client.on('connect', () => {
        this.isConnecting = false;
        client.subscribe(topic, { qos: 1 }, () => {
          // Send request for current room state
          this.publish({
            type: 'SYNC_REQUEST',
            roomCode,
            senderId: this.myClientId,
            timestamp: Date.now(),
          });
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
        // Rotate to fallback broker if available
        this.brokerIndex++;
      });

      client.on('close', () => {
        this.isConnecting = false;
      });
    } catch {
      this.isConnecting = false;
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

    // 3. MQTT
    try {
      if (this.client && this.client.connected && this.currentRoomCode) {
        const topic = `kout_bo6/room_${this.currentRoomCode}`;
        this.client.publish(topic, JSON.stringify(fullMsg), { qos: 1 });
      }
    } catch {}
  }

  private notifyListeners(msg: RoomSyncMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch {}
    });
  }

  public disconnect() {
    this.isConnecting = false;
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
