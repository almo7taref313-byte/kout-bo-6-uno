import mqtt, { MqttClient } from 'mqtt';
import { SeatConfig } from '../types';

export interface RoomSyncMessage {
  type: 'JOIN_REQUEST' | 'SEAT_RESERVED' | 'ROOM_STATE' | 'START_GAME' | 'HEARTBEAT';
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
  vacantCount?: number;
  timestamp: number;
}

export type RoomMessageCallback = (msg: RoomSyncMessage) => void;

class RoomSyncManager {
  private client: MqttClient | null = null;
  private currentRoomCode: string | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners: Set<RoomMessageCallback> = new Set();
  public myClientId: string = 'kout_' + Math.random().toString(36).substring(2, 9);

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

  private connect(roomCode: string) {
    const topic = `kout_bo6/room_${roomCode}`;

    // 1. Setup local BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel(`kout_bc_${roomCode}`);
        this.bc.onmessage = (evt) => {
          if (evt.data && evt.data.senderId !== this.myClientId) {
            this.notifyListeners(evt.data);
          }
        };
      }
    } catch {}

    // 2. Setup MQTT over WebSocket (Public Broker with fallback)
    try {
      const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
      const client = mqtt.connect(brokerUrl, {
        clientId: this.myClientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
        keepalive: 30,
      });

      this.client = client;

      client.on('connect', () => {
        client.subscribe(topic, { qos: 1 }, () => {
          // Send request for current room state
          this.publish({
            type: 'HEARTBEAT',
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
        // Fallback silently if MQTT broker unreachable
      });
    } catch {
      // Ignore if WebSocket fails
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
