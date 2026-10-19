import { io, Socket as SocketIOSocket } from 'socket.io-client';
import { ConvexClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type {
  RoomSnapshot,
  PollSnapshot,
  TeamSnapshot,
  RoundResultSnapshot,
} from './types';

// Socket-style GameConnection interface
export interface GameConnection {
  readonly connected: boolean;
  readonly id: string;
  on(event: string, fn: (...args: any[]) => void): this;
  once(event: string, fn: (...args: any[]) => void): this;
  off(event: string, fn?: (...args: any[]) => void): this;
  removeAllListeners(event?: string): this;
  emit(event: string, payload?: any, callback?: (resp: any) => void): this;
  disconnect(): this;
  connect?(): this;
}

export interface SubscribeEnvelope {
  snapshot: RoomSnapshot;
  poll: PollSnapshot | null;
  serverNow: number;
  deadlineMs: number | null;
  epoch: number;
  finished: null | {
    victory: boolean;
    teams: TeamSnapshot[];
    roundResults: RoundResultSnapshot[];
    stats: {
      totalJoined: number;
      totalInteracted: number;
      classSize: number | null;
    };
  };
}

// Function references to fixed public backend API
export const gameCommandRef = makeFunctionReference<'mutation', { event: string; payload: any }, any>('game:command');
export const gameSubscribeRef = makeFunctionReference<
  'query',
  { roomCode: string; token: string; connectionId: string },
  SubscribeEnvelope | null
>('game:subscribe');

/**
 * Generates a cryptographically random hex token via Web Crypto (defaults to 32 bytes = 64 hex characters).
 * Fails closed if Web Crypto is unavailable.
 */
export function generateSecureToken(bytes: number = 32): string {
  const cryptoObj =
    typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : typeof crypto !== 'undefined'
      ? crypto
      : null;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const array = new Uint8Array(bytes);
    cryptoObj.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error(
    'Web Crypto API (crypto.getRandomValues) không khả dụng. Không thể tạo mã xác thực an toàn.'
  );
}

/**
 * Returns Convex deployment URL if set in environment (never window.origin).
 */
export function getConvexUrl(): string | undefined {
  const url = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_CONVEX_URL : undefined;
  if (url && typeof url === 'string' && url.trim().length > 0) {
    return url.trim();
  }
  return undefined;
}

export function isConvexMode(): boolean {
  return Boolean(getConvexUrl());
}

/**
 * Socket.IO URL configuration helpers for legacy fallback.
 */
const isLocalhostHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const DEFAULT_SERVER_URL =
  typeof window !== 'undefined' && !isLocalhostHost
    ? window.location.origin
    : 'http://localhost:3001';

export function getServerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;
  const saved = localStorage.getItem('vnr202_server_url');
  if (saved) {
    if (!isLocalhostHost && (saved.includes('localhost') || saved.includes('127.0.0.1'))) {
      return window.location.origin;
    }
    return saved;
  }
  return DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vnr202_server_url', url);
  }
}

/**
 * Constructs default join URL taking into account base path (e.g. GitHub Pages /VNR202/)
 */
export function getDefaultJoinBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const rawBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  const base = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const originWithBase = `${window.location.origin}${base.endsWith('/') ? base : base + '/'}`;

  const saved = localStorage.getItem('vnr202_public_join_url');
  if (saved) {
    if (!isLocalhost && (saved.includes('localhost') || saved.includes('127.0.0.1'))) {
      return originWithBase;
    }
    return saved;
  }
  return originWithBase;
}

export function buildRoomJoinUrl(baseUrl: string, roomCode: string): string {
  if (!roomCode) return baseUrl;
  try {
    const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const url = new URL(baseUrl, defaultOrigin);
    url.searchParams.set('room', roomCode);
    return url.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}room=${encodeURIComponent(roomCode)}`;
  }
}

/**
 * Convex implementation of GameConnection facade.
 */
export class ConvexGameConnection implements GameConnection {
  private _client: ConvexClient;
  private _connectionId: string = generateSecureToken(32);
  private _connected: boolean = false;
  private _disposed: boolean = false;
  private _listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private _boundRoom: { roomCode: string; token: string } | null = null;
  private _subscriptionUnsubscribe: (() => void) | null = null;
  private _subscriptionGeneration: number = 0;
  private _unsubConnState: (() => void) | null = null;
  private _heartbeatInterval: any = null;
  private _tickInterval: any = null;

  // Pending waits and in-flight emit cleanups
  private _pendingConnectionWaits: Set<{
    resolve: (connected: boolean) => void;
    timer: any;
    onConnect: () => void;
  }> = new Set();
  private _pendingEmitCleanups: Set<() => void> = new Set();

  // State deduplication and timer sync
  private _lastFinishedEpoch: number | null = null;
  private _lastEpoch: number | null = null;
  private _lastEmittedRoundResolved: number = 0;
  private _serverClockOffset: number = 0;
  private _deadlineMs: number | null = null;
  private _currentPhase: string = 'lobby';
  private _roundTimeRemainingMs: number | null = null;

  constructor(convexUrl?: string, customClient?: ConvexClient) {
    const url = convexUrl || getConvexUrl();
    if (!url && !customClient) {
      throw new Error('VITE_CONVEX_URL không được thiết lập. Hãy kiểm tra biến môi trường.');
    }
    this._client = customClient || new ConvexClient(url!);

    // Subscribe to SDK WebSocket connection state
    this._unsubConnState = this._client.subscribeToConnectionState((state) => {
      if (this._disposed) return;
      const isWsConnected = Boolean(state.isWebSocketConnected);
      if (isWsConnected && !this._connected) {
        this._connected = true;
        this.emitLocal('connect');
        if (this._boundRoom) {
          this.resubscribeBoundRoom();
          this.startHeartbeat();
        }
      } else if (!isWsConnected && this._connected) {
        this._connected = false;
        this.stopHeartbeat();
        this.emitLocal('disconnect', 'transport close');
      }
    });

    try {
      const initial = this._client.connectionState();
      if (initial.isWebSocketConnected) {
        this._connected = true;
      }
    } catch {}

    this.startLocalTick();
  }

  get connected(): boolean {
    return this._connected;
  }

  get id(): string {
    return this._connectionId;
  }

  on(event: string, fn: (...args: any[]) => void): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(fn);
    return this;
  }

  once(event: string, fn: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      fn(...args);
    };
    (wrapper as any)._original = fn;
    return this.on(event, wrapper);
  }

  off(event: string, fn?: (...args: any[]) => void): this {
    if (!fn) {
      this._listeners.delete(event);
      return this;
    }
    const set = this._listeners.get(event);
    if (set) {
      for (const listener of Array.from(set)) {
        if (listener === fn || (listener as any)._original === fn) {
          set.delete(listener);
        }
      }
      if (set.size === 0) {
        this._listeners.delete(event);
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  private emitLocal(event: string, ...args: any[]): void {
    const set = this._listeners.get(event);
    if (!set) return;
    const listeners = Array.from(set);
    for (const fn of listeners) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Error in listener for ${event}:`, err);
      }
    }
  }

  private waitForConnection(timeoutMs: number = 8000): Promise<boolean> {
    if (this._connected) return Promise.resolve(true);
    if (this._disposed) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      const waitEntry: any = {
        resolve,
        timer: null,
        onConnect: () => {
          this.cleanupWait(waitEntry);
          resolve(true);
        },
      };

      waitEntry.timer = setTimeout(() => {
        this.cleanupWait(waitEntry);
        resolve(this._connected);
      }, timeoutMs);

      this._pendingConnectionWaits.add(waitEntry);
      this.once('connect', waitEntry.onConnect);
    });
  }

  private cleanupWait(entry: { resolve: (c: boolean) => void; timer: any; onConnect: () => void }): void {
    clearTimeout(entry.timer);
    this.off('connect', entry.onConnect);
    this._pendingConnectionWaits.delete(entry);
  }

  private settleAllPendingWaits(connected: boolean): void {
    for (const entry of Array.from(this._pendingConnectionWaits)) {
      clearTimeout(entry.timer);
      this.off('connect', entry.onConnect);
      entry.resolve(connected);
    }
    this._pendingConnectionWaits.clear();
  }

  emit(event: string, payload: any = {}, callback?: (resp: any) => void): this {
    if (this._disposed) {
      if (callback) callback({ ok: false, error: 'Kết nối đã đóng' });
      return this;
    }

    let callbackFired = false;
    let emitTimedOut = false;
    let emitTimer: any = null;

    const fireCallbackOnce = (resp: any) => {
      if (callbackFired) return;
      callbackFired = true;
      if (emitTimer) {
        clearTimeout(emitTimer);
        emitTimer = null;
      }
      this._pendingEmitCleanups.delete(abortEmit);
      if (callback) {
        try {
          callback(resp);
        } catch (err) {
          console.error(`Error in emit callback for ${event}:`, err);
        }
      }
    };

    const abortEmit = () => {
      emitTimedOut = true;
      fireCallbackOnce({ ok: false, error: 'Kết nối đã đóng trước khi nhận phản hồi' });
    };

    this._pendingEmitCleanups.add(abortEmit);

    // Bounded timeout guard (8000ms)
    emitTimer = setTimeout(() => {
      emitTimedOut = true;
      fireCallbackOnce({
        ok: false,
        error: `Hết thời gian chờ phản hồi từ máy chủ (${event}). Lưu ý: thao tác có thể vẫn đang được xử lý trên máy chủ.`,
      });
    }, 8000);

    (async () => {
      try {
        const ready = await this.waitForConnection(8000);
        if (this._disposed || emitTimedOut) return;

        if (!ready && !this._connected) {
          fireCallbackOnce({ ok: false, error: 'Không thể kết nối đến máy chủ Convex (hết thời gian chờ)' });
          return;
        }

        const enrichedPayload: any = { ...payload, connectionId: this._connectionId };

        // Auto-generate 64-hex cryptographic tokens if not present
        if (event === 'room:create' && !enrichedPayload.hostToken) {
          enrichedPayload.hostToken = generateSecureToken(32);
        }
        if (event === 'room:join' && !enrichedPayload.playerToken) {
          enrichedPayload.playerToken = generateSecureToken(32);
        }

        const resp = await this._client.mutation(gameCommandRef, {
          event,
          payload: enrichedPayload,
        });

        // Guard against late ack after dispose or timeout
        if (this._disposed || emitTimedOut) {
          // Late room:create response cleanup: close orphan room on server so cancelled demo does not leak
          if (event === 'room:create' && resp && resp.ok && resp.roomCode && enrichedPayload.hostToken) {
            try {
              this._client.mutation(gameCommandRef, {
                event: 'host:close',
                payload: {
                  roomCode: resp.roomCode,
                  hostToken: enrichedPayload.hostToken,
                  connectionId: this._connectionId,
                },
              }).catch(() => {});
            } catch {}
          }
          return;
        }

        if (resp && resp.ok) {
          if (event === 'room:create' && resp.roomCode && enrichedPayload.hostToken) {
            this.bindRoom(resp.roomCode, enrichedPayload.hostToken);
          } else if (event === 'room:join' && enrichedPayload.roomCode && enrichedPayload.playerToken) {
            this.bindRoom(enrichedPayload.roomCode, enrichedPayload.playerToken);
          } else if (event === 'room:reconnect' && enrichedPayload.roomCode && enrichedPayload.playerToken) {
            this.bindRoom(enrichedPayload.roomCode, enrichedPayload.playerToken);
          } else if (event === 'host:reconnect' && enrichedPayload.roomCode && enrichedPayload.hostToken) {
            this.bindRoom(enrichedPayload.roomCode, enrichedPayload.hostToken);
          } else if (event === 'host:close') {
            this.unbindRoom();
          } else if (event === 'session:disconnect') {
            this.unbindRoom();
          }
        }

        fireCallbackOnce(resp);
      } catch (err: any) {
        if (!this._disposed && !emitTimedOut) {
          fireCallbackOnce({ ok: false, error: err?.message || String(err) });
        }
      }
    })();

    return this;
  }

  private bindRoom(roomCode: string, token: string): void {
    if (this._disposed) return;
    if (
      this._boundRoom &&
      this._boundRoom.roomCode === roomCode &&
      this._boundRoom.token === token &&
      this._subscriptionUnsubscribe
    ) {
      return;
    }

    // Reset deduplication state on new room binding even if both rooms use equal epoch
    this._lastEpoch = null;
    this._lastEmittedRoundResolved = 0;
    this._lastFinishedEpoch = null;

    this._boundRoom = { roomCode, token };
    this.resubscribeBoundRoom();
    this.startHeartbeat();
  }

  private unbindRoom(): void {
    this._subscriptionGeneration++;
    this._boundRoom = null;
    this._lastEpoch = null;
    this._lastEmittedRoundResolved = 0;
    this._lastFinishedEpoch = null;
    this.stopHeartbeat();
    if (this._subscriptionUnsubscribe) {
      try {
        this._subscriptionUnsubscribe();
      } catch {}
      this._subscriptionUnsubscribe = null;
    }
  }

  private resubscribeBoundRoom(): void {
    if (this._disposed || !this._boundRoom) return;
    if (this._subscriptionUnsubscribe) {
      try {
        this._subscriptionUnsubscribe();
      } catch {}
      this._subscriptionUnsubscribe = null;
    }

    const currentGeneration = ++this._subscriptionGeneration;
    const { roomCode, token } = this._boundRoom;

    this._subscriptionUnsubscribe = this._client.onUpdate(
      gameSubscribeRef,
      { roomCode, token, connectionId: this._connectionId },
      (envelope) => {
        if (this._disposed || this._subscriptionGeneration !== currentGeneration) {
          return;
        }

        if (envelope === null) {
          this.emitLocal('room:kicked', 'Phiên làm việc đã kết thúc hoặc bị thay thế bởi kết nối khác.');
          this.unbindRoom();
          return;
        }

        this.handleEnvelopeUpdate(envelope);
      },
      () => {
        // Query error handler
      }
    );
  }

  private handleEnvelopeUpdate(envelope: SubscribeEnvelope): void {
    const { snapshot, poll, serverNow, deadlineMs, epoch, finished } = envelope;

    const isNewEpoch = this._lastEpoch === null || this._lastEpoch !== epoch;
    if (isNewEpoch) {
      this._lastEpoch = epoch;
      this._lastEmittedRoundResolved = 0;
      this._lastFinishedEpoch = null;
    }

    this._serverClockOffset = serverNow - Date.now();
    this._deadlineMs = deadlineMs;
    this._currentPhase = snapshot.phase;
    this._roundTimeRemainingMs = snapshot.roundTimeRemainingMs;

    this.emitLocal('room:snapshot', snapshot);

    if (poll !== undefined) {
      this.emitLocal('poll:update', poll);
    }

    if (snapshot.roundResults && snapshot.roundResults.length > this._lastEmittedRoundResolved) {
      for (let i = this._lastEmittedRoundResolved; i < snapshot.roundResults.length; i++) {
        this.emitLocal('round:resolved', snapshot.roundResults[i]);
      }
      this._lastEmittedRoundResolved = snapshot.roundResults.length;
    }

    if (finished) {
      if (this._lastFinishedEpoch !== epoch) {
        this._lastFinishedEpoch = epoch;
        this.emitLocal('game:finished', finished);
      }
    } else {
      this._lastFinishedEpoch = null;
    }

    this.emitTick();
  }

  private emitTick(): void {
    if (this._currentPhase === 'playing' && this._deadlineMs !== null) {
      const nowOnServer = Date.now() + this._serverClockOffset;
      const remaining = Math.max(0, this._deadlineMs - nowOnServer);
      this.emitLocal('round:tick', remaining);
    } else if (this._currentPhase === 'paused') {
      if (this._roundTimeRemainingMs !== null) {
        this.emitLocal('round:tick', this._roundTimeRemainingMs);
      }
    } else {
      this.emitLocal('round:tick', null);
    }
  }

  private startLocalTick(): void {
    if (this._tickInterval) clearInterval(this._tickInterval);
    this._tickInterval = setInterval(() => {
      if (this._disposed) return;
      this.emitTick();
    }, 1000);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (this._disposed || !this._boundRoom) return;

    this._heartbeatInterval = setInterval(async () => {
      if (this._disposed || !this._boundRoom || !this._connected) return;
      try {
        await this._client.mutation(gameCommandRef, {
          event: 'session:heartbeat',
          payload: {
            roomCode: this._boundRoom.roomCode,
            token: this._boundRoom.token,
            connectionId: this._connectionId,
          },
        });
      } catch {}
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  disconnect(): this {
    if (this._disposed) return this;
    this._disposed = true;

    // Settle pending connection waits and pending emit acks promptly
    this.settleAllPendingWaits(false);
    for (const abort of Array.from(this._pendingEmitCleanups)) {
      abort();
    }
    this._pendingEmitCleanups.clear();

    this.stopHeartbeat();
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
    if (this._unsubConnState) {
      try {
        this._unsubConnState();
      } catch {}
      this._unsubConnState = null;
    }

    // Invalidate subscription generation so in-flight queries drop
    this._subscriptionGeneration++;

    const bound = this._boundRoom;
    this._boundRoom = null;

    const performDisconnect = async () => {
      if (bound && this._connected) {
        try {
          await Promise.race([
            this._client.mutation(gameCommandRef, {
              event: 'session:disconnect',
              payload: {
                roomCode: bound.roomCode,
                token: bound.token,
                connectionId: this._connectionId,
              },
            }),
            new Promise((resolve) => setTimeout(resolve, 800)),
          ]);
        } catch {}
      }

      if (this._subscriptionUnsubscribe) {
        try {
          this._subscriptionUnsubscribe();
        } catch {}
        this._subscriptionUnsubscribe = null;
      }

      try {
        await this._client.close();
      } catch {}

      this._connected = false;
      this.emitLocal('disconnect', 'client disconnected');
    };

    performDisconnect();
    return this;
  }

  connect(): this {
    return this;
  }
}

/**
 * Socket.IO implementation of GameConnection facade.
 */
class SocketIOGameConnection implements GameConnection {
  private _socket: SocketIOSocket;

  constructor(socket: SocketIOSocket) {
    this._socket = socket;
  }

  get connected(): boolean {
    return this._socket.connected;
  }

  get id(): string {
    return this._socket.id || '';
  }

  on(event: string, fn: (...args: any[]) => void): this {
    this._socket.on(event, fn);
    return this;
  }

  once(event: string, fn: (...args: any[]) => void): this {
    this._socket.once(event, fn);
    return this;
  }

  off(event: string, fn?: (...args: any[]) => void): this {
    if (fn) {
      this._socket.off(event, fn);
    } else {
      this._socket.off(event);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    this._socket.removeAllListeners(event);
    return this;
  }

  emit(event: string, payload?: any, callback?: (resp: any) => void): this {
    if (callback) {
      this._socket.emit(event, payload, callback);
    } else {
      this._socket.emit(event, payload);
    }
    return this;
  }

  disconnect(): this {
    this._socket.disconnect();
    return this;
  }

  connect(): this {
    this._socket.connect();
    return this;
  }
}

// Global singleton instance
let globalGameConnection: GameConnection | null = null;

/**
 * Creates an independent connection (used for 10-bot simulation and factory creation).
 */
export function createGameConnection(): GameConnection {
  if (isConvexMode()) {
    return new ConvexGameConnection();
  }
  const url = getServerUrl();
  const rawSocket = io(url, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return new SocketIOGameConnection(rawSocket);
}

/**
 * Returns global reusable singleton connection.
 */
export function getSocket(): GameConnection {
  if (!globalGameConnection) {
    globalGameConnection = createGameConnection();
  }
  return globalGameConnection;
}

export function reconnectSocketWithNewServer(url: string): GameConnection {
  if (globalGameConnection) {
    globalGameConnection.disconnect();
    globalGameConnection = null;
  }
  setServerUrl(url);
  return getSocket();
}

// Page unload cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (globalGameConnection) {
      globalGameConnection.disconnect();
    }
  });
}

// Local storage session helpers
export const SessionStorage = {
  saveHostSession(roomCode: string, hostToken: string) {
    localStorage.setItem('vnr202_host_room', roomCode);
    localStorage.setItem('vnr202_host_token', hostToken);
  },
  getHostSession(): { roomCode: string | null; hostToken: string | null } {
    return {
      roomCode: localStorage.getItem('vnr202_host_room'),
      hostToken: localStorage.getItem('vnr202_host_token'),
    };
  },
  clearHostSession() {
    localStorage.removeItem('vnr202_host_room');
    localStorage.removeItem('vnr202_host_token');
  },
  savePlayerSession(roomCode: string, playerToken: string, nickname: string, team: number) {
    localStorage.setItem('vnr202_player_room', roomCode);
    localStorage.setItem('vnr202_player_token', playerToken);
    localStorage.setItem('vnr202_player_nickname', nickname);
    localStorage.setItem('vnr202_player_team', String(team));
  },
  getPlayerSession(): {
    roomCode: string | null;
    playerToken: string | null;
    nickname: string | null;
    team: number | null;
  } {
    const teamStr = localStorage.getItem('vnr202_player_team');
    return {
      roomCode: localStorage.getItem('vnr202_player_room'),
      playerToken: localStorage.getItem('vnr202_player_token'),
      nickname: localStorage.getItem('vnr202_player_nickname'),
      team: teamStr !== null ? parseInt(teamStr, 10) : null,
    };
  },
  clearPlayerSession() {
    localStorage.removeItem('vnr202_player_room');
    localStorage.removeItem('vnr202_player_token');
    localStorage.removeItem('vnr202_player_nickname');
    localStorage.removeItem('vnr202_player_team');
  },
};
