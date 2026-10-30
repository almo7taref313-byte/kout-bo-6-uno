import mqtt, { MqttClient } from 'mqtt';
import { BidRecord, Card, Player, SeatConfig, SuitColor, TrickPlay, WaitingPlayer } from '../types';

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
    | 'SYNC_STATE'
    | 'LEAVE_ROOM';
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
    clientId?: string;
  };
  waitingPlayers?: WaitingPlayer[];
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

// 1. رابط خادمك السحابي المخصص على EMQX Cloud
const PRIMARY_BROKER = 'wss://ca867d88.ala.eu-central-1.emqxsl.com:8084/mqtt';
const FALLBACK_BROKER = 'wss://broker.emqx.io:8084/mqtt';

// 2. بيانات الدخول لخادمك (إذا فعلت خيار المصادقة في EMQX ضع البيانات هنا)
const BROKER_AUTH = {
  username: 'kout',
  password: 'Mousawi@313',
};

class RoomSyncManager {
  private client: MqttClient | null = null;
  private currentRoomCode: string | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners: Set<RoomMessageCallback> = new Set();
  private isConnecting: boolean = false;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private outboundQueue: RoomSyncMessage[] = [];
  private seenMessageHashes: Set<string> = new Set();
  private hasFallenBack: boolean = false;
  private failCount: number = 0;
  private connStatusListeners: Set<(connected: boolean) => void> = new Set();
  public isConnected: boolean = false;
  public myClientId: string = 'kout_' + Math.random().toString(36).substring(2, 9);

  public subscribeConnection(cb: (connected: boolean) => void): () => void {
    this.connStatusListeners.add(cb);
    cb(this.isConnected);
    return () => {
      this.connStatusListeners.delete(cb);
    };
  }

  private setConnection(val: boolean) {
    this.isConnected = val;
    this.connStatusListeners.forEach((cb) => {
      try {
        cb(val);
      } catch {}
    });
  }

  constructor() {
    if (typeof window !== 'undefined') {
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
    this.isConnecting = false;

    if (!this.client || !this.client.connected) {
      this.connect(this.currentRoomCode);
    }

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
    this.connectTimeoutTimer = setTimeout(() => {
      this.isConnecting = false;
    }, 6000);

    // 1. Local BroadcastChannel
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

      const activeBroker = this.hasFallenBack ? FALLBACK_BROKER : PRIMARY_BROKER;
      const opts: mqtt.IClientOptions = {
        clientId: this.myClientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 1500,
        keepalive: 30,
        rejectUnauthorized: false,
      };

      // إضافة بيانات المصادقة إذا كانت متوفرة
      if (BROKER_AUTH.username && !this.hasFallenBack) {
        opts.username = BROKER_AUTH.username;
        opts.password = BROKER_AUTH.password;
      }

      const client = mqtt.connect(activeBroker, opts);
      this.client = client;

      client.on('connect', () => {
        this.isConnecting = false;
        this.setConnection(true);
        this.failCount = 0;
        if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);

        // رفع مستوى الموثوقية لـ QoS 1 لضمان وصول الرسائل وعدم ضياعها
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (!err) {
            this.flushQueue();
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
            let rawStr = '';
            if (typeof payload === 'string') {
              rawStr = payload;
            } else if (typeof TextDecoder !== 'undefined') {
              rawStr = new TextDecoder('utf-8').decode(payload);
            } else {
              rawStr = payload.toString();
            }

            const data: RoomSyncMessage = JSON.parse(rawStr);
            if (data && data.senderId !== this.myClientId) {
              this.notifyListeners(data);
            }
          } catch (err) {
            console.error('[RoomSync] Payload parse error:', err);
          }
        }
      });

      const handleError = (err?: any) => {
        this.isConnecting = false;
        this.setConnection(false);
        this.failCount++;
        if (this.failCount >= 3 && !this.hasFallenBack) {
          this.hasFallenBack = true;
          if (this.currentRoomCode) {
            setTimeout(() => this.connect(this.currentRoomCode!), 500);
          }
        }
      };

      client.on('error', handleError);
      client.on('close', handleError);
      client.on('offline', handleError);
    } catch {
      this.isConnecting = false;
      this.isConnected = false;
    }
  }

  public publish(msg: RoomSyncMessage) {
    const targetRoom = msg.roomCode || this.currentRoomCode;
    const fullMsg: RoomSyncMessage = {
      ...msg,
      senderId: this.myClientId,
      timestamp: msg.timestamp || Date.now(),
    };

    if (targetRoom && (!this.currentRoomCode || this.currentRoomCode !== targetRoom)) {
      this.currentRoomCode = targetRoom;
      if (!this.client || !this.client.connected) {
        this.connect(targetRoom);
      }
    }

    try {
      if (this.bc) {
        this.bc.postMessage(fullMsg);
      }
    } catch {}

    try {
      localStorage.setItem(`kout_room_event_${targetRoom}`, JSON.stringify(fullMsg));
    } catch {}

    this.outboundQueue.push(fullMsg);
    this.flushQueue();
  }

  private flushQueue() {
    if (!this.client || !this.client.connected) {
      if (this.currentRoomCode && !this.isConnecting) {
        this.connect(this.currentRoomCode);
      }
      return;
    }

    while (this.outboundQueue.length > 0) {
      const msg = this.outboundQueue[0];
      const targetRoom = msg.roomCode || this.currentRoomCode;
      if (!targetRoom) {
        this.outboundQueue.shift();
        continue;
      }
      const topic = `kout_bo6/room_${targetRoom}`;
      try {
        // الإرسال بـ QoS 1 لضمان استلام الهواتف للأمر بدون فقدان
        this.client.publish(topic, JSON.stringify(msg), { qos: 1 });
        this.outboundQueue.shift();
      } catch {
        break;
      }
    }
  }

  private notifyListeners(msg: RoomSyncMessage) {
    const seatsSummary = msg.seats ? msg.seats.map((s) => `${s.id}:${s.name}:${s.isHuman ? 1 : 0}`).join(',') : '';
    const waitingSummary = msg.waitingPlayers ? msg.waitingPlayers.map((w) => w.clientId).join(',') : '';
    const hash = `${msg.senderId}_${msg.type}_${msg.timestamp}_${msg.playerId ?? ''}_${msg.card?.id ?? ''}_${msg.roundNumber ?? ''}_${seatsSummary}_${waitingSummary}`;
    
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
      } catch (err) {
        console.error('RoomSync listener error:', err);
      }
    });
  }

  public disconnect() {
    this.isConnecting = false;
    this.setConnection(false);
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
