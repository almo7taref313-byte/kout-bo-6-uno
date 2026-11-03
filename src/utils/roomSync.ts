import mqtt, { MqttClient } from 'mqtt';
import {
  BidRecord,
  Card,
  OnlinePlayer,
  Player,
  SeatConfig,
  SuitColor,
  TableInvite,
  TrickPlay,
  WaitingPlayer,
} from '../types';
import { sealRoomMessage, unsealRoomMessage } from './securityShield';

export interface RoomSyncMessage {
  type:
    | 'JOIN_REQUEST'
    | 'CLAIM_SEAT'
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
  targetScore?: 26 | 51 | 101;
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

export interface GlobalLobbyMessage {
  type: 'PRESENCE_PING' | 'PRESENCE_DISCOVER' | 'PRESENCE_LEAVE' | 'TABLE_INVITE' | 'INVITE_RESPONSE';
  senderId: string;
  player?: OnlinePlayer;
  invite?: TableInvite;
  response?: {
    roomCode: string;
    targetHostId: string;
    senderId: string;
    senderName: string;
    accepted: boolean;
  };
  timestamp: number;
}

export type RoomMessageCallback = (msg: RoomSyncMessage) => void;

const GLOBAL_LOBBY_TOPIC = 'kout_bo6/global_lobby';
const GLOBAL_LOBBY_KEY = 'GLOBAL_LOBBY';

// 1. رابط خادمك السحابي المخصص على EMQX Cloud
const PRIMARY_BROKER = 'wss://ca867d88.ala.eu-central-1.emqxsl.com:8084/mqtt';
const FALLBACK_BROKER = 'wss://broker.emqx.io:8084/mqtt';

// 2. بيانات الدخول لخادمك
const BROKER_AUTH = {
  username: 'kout',
  password: 'Mousawi@313',
};

class RoomSyncManager {
  private client: MqttClient | null = null;
  private currentRoomCode: string | null = null;
  private bc: BroadcastChannel | null = null;
  private globalBc: BroadcastChannel | null = null;
  private listeners: Set<RoomMessageCallback> = new Set();
  private isConnecting: boolean = false;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private outboundQueue: RoomSyncMessage[] = [];
  private globalOutboundQueue: GlobalLobbyMessage[] = [];
  private seenMessageHashes: Set<string> = new Set();
  private seenInviteIds: Set<string> = new Set();
  private hasFallenBack: boolean = false;
  private failCount: number = 0;
  private connStatusListeners: Set<(connected: boolean) => void> = new Set();
  public isConnected: boolean = false;
  public myClientId: string = 'kout_' + Math.random().toString(36).substring(2, 9);

  // Global Presence & Direct Invites State
  private myProfile: OnlinePlayer | null = null;
  private onlinePlayersMap: Map<string, OnlinePlayer> = new Map();
  private onlinePlayersListeners: Set<(players: OnlinePlayer[]) => void> = new Set();
  private inviteListeners: Set<(invite: TableInvite) => void> = new Set();
  private inviteResponseListeners: Set<
    (res: { roomCode: string; targetHostId: string; senderId: string; senderName: string; accepted: boolean }) => void
  > = new Set();
  private presenceInterval: ReturnType<typeof setInterval> | null = null;

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
      // إعداد قناة البث المحلية العامة (للتبويبات المتعددة على نفس الجهاز)
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          this.globalBc = new BroadcastChannel('kout_bc_global_lobby');
          this.globalBc.onmessage = (evt) => {
            if (evt.data) {
              this.handleGlobalLobbyMessage(evt.data as GlobalLobbyMessage);
            }
          };
        }
      } catch {}

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.handleWakeup();
          this.broadcastMyPresence();
        }
      });
      window.addEventListener('online', () => {
        this.handleWakeup();
        this.broadcastMyPresence();
      });
      window.addEventListener('focus', () => {
        this.handleWakeup();
        this.broadcastMyPresence();
      });
      window.addEventListener('beforeunload', () => {
        if (this.myProfile) {
          this.publishGlobal({
            type: 'PRESENCE_LEAVE',
            senderId: this.myProfile.clientId,
            timestamp: Date.now(),
          });
        }
      });

      window.addEventListener('storage', (evt) => {
        if (evt.key && this.currentRoomCode && evt.key.startsWith(`kout_room_event_${this.currentRoomCode}`)) {
          try {
            if (evt.newValue) {
              const data = unsealRoomMessage<RoomSyncMessage>(evt.newValue, this.currentRoomCode);
              if (data && data.senderId !== this.myClientId && data.senderId !== this.myProfile?.clientId) {
                this.notifyListeners(data);
              }
            }
          } catch {}
        } else if (evt.key === 'kout_global_lobby_event' && evt.newValue) {
          try {
            const data = unsealRoomMessage<GlobalLobbyMessage>(evt.newValue, GLOBAL_LOBBY_KEY);
            if (data) {
              this.handleGlobalLobbyMessage(data);
            }
          } catch {}
        }
      });

      // دورة تحديث المتواجدين أونلاين وتنظيف غير النشطين كل 4 ثوانٍ
      this.presenceInterval = setInterval(() => {
        this.pruneStaleOnlinePlayers();
        this.broadcastMyPresence();
      }, 4500);
    }
  }

  public updateMyPresence(profile: {
    clientId: string;
    name: string;
    avatarId: string;
    customPhoto: string | null;
    status: 'lobby' | 'private_table' | 'playing';
    roomCode?: string;
  }) {
    this.myProfile = {
      ...profile,
      lastSeen: Date.now(),
    };
    this.broadcastMyPresence();
  }

  public broadcastMyPresence() {
    if (!this.myProfile) return;
    this.myProfile.lastSeen = Date.now();
    this.publishGlobal({
      type: 'PRESENCE_PING',
      senderId: this.myProfile.clientId,
      player: { ...this.myProfile },
      timestamp: Date.now(),
    });
  }

  public requestOnlinePlayersDiscovery() {
    const senderId = this.myProfile?.clientId || this.myClientId;
    this.broadcastMyPresence();
    this.publishGlobal({
      type: 'PRESENCE_DISCOVER',
      senderId,
      timestamp: Date.now(),
    });
  }

  public subscribeOnlinePlayers(cb: (players: OnlinePlayer[]) => void): () => void {
    this.onlinePlayersListeners.add(cb);
    cb(this.getActiveOnlinePlayersList());
    this.requestOnlinePlayersDiscovery();
    return () => {
      this.onlinePlayersListeners.delete(cb);
    };
  }

  public subscribeInvites(
    onInvite: (invite: TableInvite) => void,
    onResponse?: (res: {
      roomCode: string;
      targetHostId: string;
      senderId: string;
      senderName: string;
      accepted: boolean;
    }) => void
  ): () => void {
    this.inviteListeners.add(onInvite);
    if (onResponse) {
      this.inviteResponseListeners.add(onResponse);
    }
    return () => {
      this.inviteListeners.delete(onInvite);
      if (onResponse) {
        this.inviteResponseListeners.delete(onResponse);
      }
    };
  }

  public sendTableInvite(inviteData: Omit<TableInvite, 'id' | 'timestamp'>) {
    const invite: TableInvite = {
      ...inviteData,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    this.publishGlobal({
      type: 'TABLE_INVITE',
      senderId: invite.hostClientId,
      invite,
      timestamp: invite.timestamp,
    });
  }

  public sendInviteResponse(roomCode: string, targetHostId: string, senderName: string, accepted: boolean) {
    const senderId = this.myProfile?.clientId || this.myClientId;
    this.publishGlobal({
      type: 'INVITE_RESPONSE',
      senderId,
      response: {
        roomCode,
        targetHostId,
        senderId,
        senderName,
        accepted,
      },
      timestamp: Date.now(),
    });
  }

  private getActiveOnlinePlayersList(): OnlinePlayer[] {
    const myId = this.myProfile?.clientId || this.myClientId;
    const now = Date.now();
    const list: OnlinePlayer[] = [];
    this.onlinePlayersMap.forEach((p, id) => {
      if (id !== myId && id !== this.myClientId && now - p.lastSeen < 18000) {
        list.push(p);
      }
    });
    return list.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  private pruneStaleOnlinePlayers() {
    const now = Date.now();
    let changed = false;
    this.onlinePlayersMap.forEach((p, id) => {
      if (now - p.lastSeen >= 18000) {
        this.onlinePlayersMap.delete(id);
        changed = true;
      }
    });
    if (changed) {
      this.notifyOnlinePlayersListeners();
    }
  }

  private notifyOnlinePlayersListeners() {
    const list = this.getActiveOnlinePlayersList();
    this.onlinePlayersListeners.forEach((cb) => {
      try {
        cb(list);
      } catch {}
    });
  }

  private handleGlobalLobbyMessage(msg: GlobalLobbyMessage) {
    const myId = this.myProfile?.clientId || this.myClientId;
    if (!msg || msg.senderId === myId || msg.senderId === this.myClientId) return;

    switch (msg.type) {
      case 'PRESENCE_PING': {
        if (msg.player && msg.player.clientId) {
          this.onlinePlayersMap.set(msg.player.clientId, {
            ...msg.player,
            lastSeen: Date.now(),
          });
          this.notifyOnlinePlayersListeners();
        }
        break;
      }
      case 'PRESENCE_DISCOVER': {
        this.broadcastMyPresence();
        break;
      }
      case 'PRESENCE_LEAVE': {
        if (msg.senderId && this.onlinePlayersMap.has(msg.senderId)) {
          this.onlinePlayersMap.delete(msg.senderId);
          this.notifyOnlinePlayersListeners();
        }
        break;
      }
      case 'TABLE_INVITE': {
        if (
          msg.invite &&
          (msg.invite.targetClientId === myId || msg.invite.targetClientId === this.myClientId)
        ) {
          if (this.seenInviteIds.has(msg.invite.id)) return;
          this.seenInviteIds.add(msg.invite.id);
          this.inviteListeners.forEach((cb) => {
            try {
              cb(msg.invite!);
            } catch {}
          });
        }
        break;
      }
      case 'INVITE_RESPONSE': {
        if (
          msg.response &&
          (msg.response.targetHostId === myId || msg.response.targetHostId === this.myClientId)
        ) {
          this.inviteResponseListeners.forEach((cb) => {
            try {
              cb(msg.response!);
            } catch {}
          });
        }
        break;
      }
    }
  }

  private publishGlobal(msg: GlobalLobbyMessage) {
    try {
      if (this.globalBc) {
        this.globalBc.postMessage(msg);
      }
    } catch {}

    try {
      localStorage.setItem('kout_global_lobby_event', sealRoomMessage(msg, GLOBAL_LOBBY_KEY));
    } catch {}

    this.globalOutboundQueue.push(msg);
    this.flushGlobalQueue();
  }

  private flushGlobalQueue() {
    if (!this.client || !this.client.connected) {
      return;
    }
    while (this.globalOutboundQueue.length > 0) {
      const msg = this.globalOutboundQueue[0];
      try {
        const sealed = sealRoomMessage(msg, GLOBAL_LOBBY_KEY);
        this.client.publish(GLOBAL_LOBBY_TOPIC, sealed, { qos: 0 });
        this.globalOutboundQueue.shift();
      } catch {
        break;
      }
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
          if (evt.data && evt.data.senderId !== this.myClientId && evt.data.senderId !== this.myProfile?.clientId) {
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

        // الاشتراك في غرفة الطاولة الحالية + القناة العامة للمتواجدين أونلاين والدعوات المباشرة
        client.subscribe([topic, GLOBAL_LOBBY_TOPIC], { qos: 1 }, (err) => {
          if (!err) {
            this.flushQueue();
            this.flushGlobalQueue();
            this.broadcastMyPresence();
            this.requestOnlinePlayersDiscovery();
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
        let rawStr = '';
        try {
          if (typeof payload === 'string') {
            rawStr = payload;
          } else if (typeof TextDecoder !== 'undefined') {
            rawStr = new TextDecoder('utf-8').decode(payload);
          } else {
            rawStr = payload.toString();
          }
        } catch {
          return;
        }

        if (receivedTopic === topic) {
          try {
            const data = unsealRoomMessage<RoomSyncMessage>(rawStr, roomCode);
            if (data && data.senderId !== this.myClientId && data.senderId !== this.myProfile?.clientId) {
              this.notifyListeners(data);
            }
          } catch {}
        } else if (receivedTopic === GLOBAL_LOBBY_TOPIC) {
          try {
            const globalData = unsealRoomMessage<GlobalLobbyMessage>(rawStr, GLOBAL_LOBBY_KEY);
            if (globalData) {
              this.handleGlobalLobbyMessage(globalData);
            }
          } catch {}
        }
      });

      const handleError = () => {
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
      senderId: msg.senderId || this.myProfile?.clientId || this.myClientId,
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
      if (targetRoom) {
        localStorage.setItem(`kout_room_event_${targetRoom}`, sealRoomMessage(fullMsg, targetRoom));
      }
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
        const sealedPayload = sealRoomMessage(msg, targetRoom);
        this.client.publish(topic, sealedPayload, { qos: 1 });
        this.outboundQueue.shift();
      } catch {
        break;
      }
    }
  }

  private notifyListeners(msg: RoomSyncMessage) {
    const seatsSummary = msg.seats ? msg.seats.map((s) => `${s.id}:${s.name}:${s.isHuman ? 1 : 0}:${s.clientId ?? ''}`).join(',') : '';
    const waitingSummary = msg.waitingPlayers ? msg.waitingPlayers.map((w) => w.clientId).join(',') : '';
    const hash = `${msg.senderId}_${msg.type}_${msg.timestamp}_${msg.seatIndex ?? ''}_${msg.playerId ?? ''}_${msg.card?.id ?? ''}_${msg.roundNumber ?? ''}_${seatsSummary}_${waitingSummary}`;

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
