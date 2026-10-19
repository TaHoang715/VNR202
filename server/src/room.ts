/**
 * Room manager: room lifecycle, token generation, TTL cleanup.
 *
 * - Unpredictable room codes (6 chars, no ambiguous chars)
 * - Cryptographic host/player tokens (32 hex chars)
 * - Room isolation: each room is independent state
 * - TTL cleanup: rooms expire after 30 min inactivity
 * - Safe player lists, duplicate nickname protection, lobby locking
 */

import * as crypto from 'crypto';
import {
  RoomState,
  RoomCode,
  HostToken,
  PlayerToken,
  Player,
  PlayerSnapshot,
  RoomSnapshot,
  TeamIndex,
  GAME_CONSTANTS,
  Vote,
} from './types';
import {
  createInitialTeams,
  getDefaultScenarios,
  teamToSnapshot,
  roundResultToSnapshot,
} from './engine';

// ─── Token generation ───────────────────────────────────────────────

/** Characters that avoid ambiguity (no 0/O/I/l/1) */
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): RoomCode {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[bytes[i] % ROOM_CODE_CHARS.length];
  }
  return code;
}

export function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ─── Rate limiter ───────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private maxPerWindow: number;
  private windowMs: number;

  constructor(
    maxPerWindow: number = GAME_CONSTANTS.RATE_LIMIT_MAX,
    windowMs: number = GAME_CONSTANTS.RATE_LIMIT_WINDOW_MS
  ) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): boolean {
    const entry = this.entries.get(key);
    if (!entry || now - entry.windowStart > this.windowMs) {
      this.entries.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= this.maxPerWindow) return false;
    entry.count++;
    return true;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

// ─── Room Manager ───────────────────────────────────────────────────

export class RoomManager {
  private rooms = new Map<RoomCode, RoomState>();
  /** Map socketId -> { roomCode, playerToken } for disconnect handling */
  private socketMap = new Map<string, { roomCode: RoomCode; playerToken: PlayerToken }>();
  /** Map socketId -> roomCode for host sockets */
  private hostSockets = new Map<string, RoomCode>();
  private ttlInterval: ReturnType<typeof setInterval> | null = null;
  /** Votes stored per room per team for current round */
  private roundVotes = new Map<RoomCode, Map<TeamIndex, Vote[]>>();

  constructor() {
    // Start TTL cleanup every 60s
    this.ttlInterval = setInterval(() => this.cleanupExpired(), 60_000);
  }

  destroy(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
      this.ttlInterval = null;
    }
    // Clear all room timers and tick intervals
    for (const room of this.rooms.values()) {
      if (room.roundTimer) clearTimeout(room.roundTimer);
      if (room.tickInterval) clearInterval(room.tickInterval);
      room.roundTimer = null;
      room.tickInterval = null;
    }
    this.rooms.clear();
    this.socketMap.clear();
    this.hostSockets.clear();
    this.roundVotes.clear();
  }

  // ─── Room CRUD ──────────────────────────────────────────────────

  createRoom(numTeams: number, classSize: number | null = null): {
    room: RoomState;
    hostToken: HostToken;
  } {
    if (numTeams < GAME_CONSTANTS.MIN_TEAMS || numTeams > GAME_CONSTANTS.MAX_TEAMS) {
      throw new Error(`numTeams must be ${GAME_CONSTANTS.MIN_TEAMS}-${GAME_CONSTANTS.MAX_TEAMS}`);
    }

    let code: RoomCode;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const hostToken = generateToken();
    const now = Date.now();

    const room: RoomState = {
      code,
      hostToken,
      phase: 'lobby',
      numTeams,
      teams: createInitialTeams(numTeams),
      players: new Map(),
      currentRound: 0,
      roundStartedAt: null,
      pausedRemainingMs: null,
      roundResults: [],
      aidThisRound: new Set(),
      currentAidRecords: [],
      roundTimer: null,
      tickInterval: null,
      lastActivity: now,
      scenarios: getDefaultScenarios(),
      classSize,
      createdAt: now,
      lobbyLocked: false,
      nicknameSet: new Set(),
    };

    this.rooms.set(code, room);
    this.roundVotes.set(code, new Map());
    return { room, hostToken };
  }

  getRoom(code: RoomCode): RoomState | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: RoomCode): void {
    const room = this.rooms.get(code);
    if (room) {
      if (room.roundTimer) clearTimeout(room.roundTimer);
      if (room.tickInterval) clearInterval(room.tickInterval);
      room.roundTimer = null;
      room.tickInterval = null;
    }
    this.rooms.delete(code);
    this.roundVotes.delete(code);

    // Clean up socket mappings
    for (const [sid, info] of this.socketMap.entries()) {
      if (info.roomCode === code) this.socketMap.delete(sid);
    }
    for (const [sid, rc] of this.hostSockets.entries()) {
      if (rc === code) this.hostSockets.delete(sid);
    }
  }

  getAllRoomCodes(): RoomCode[] {
    return [...this.rooms.keys()];
  }

  setLobbyLock(code: RoomCode, locked: boolean): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    room.lobbyLocked = locked;
    room.lastActivity = Date.now();
    return true;
  }

  // ─── Player management ─────────────────────────────────────────

  addPlayer(
    code: RoomCode,
    nickname: string,
    team: TeamIndex,
    socketId: string
  ): { player: Player; playerToken: PlayerToken; playerId: string } | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.phase !== 'lobby') return null;
    if (room.lobbyLocked) return null;
    if (team < 0 || team >= room.numTeams) return null;
    if (room.players.size >= GAME_CONSTANTS.MAX_PLAYERS) return null;

    // Disallow if this socket is already registered to a player
    if (this.socketMap.has(socketId)) {
      return null;
    }

    // Validate nickname
    const trimmed = nickname.trim().substring(0, GAME_CONSTANTS.MAX_NICKNAME_LENGTH);
    if (trimmed.length === 0) return null;

    // Check duplicate nickname (case-insensitive)
    const lowerName = trimmed.toLowerCase();
    if (room.nicknameSet.has(lowerName)) {
      return null;
    }

    const playerToken = generateToken();
    const playerId = 'p_' + crypto.randomBytes(6).toString('hex');
    const player: Player = {
      id: playerId,
      token: playerToken,
      nickname: trimmed,
      team,
      connected: true,
      socketId,
      hasVotedThisRound: false,
      hasInteracted: false,
    };

    room.nicknameSet.add(lowerName);
    room.players.set(playerToken, player);
    room.teams[team].members.push(playerToken);
    room.lastActivity = Date.now();

    this.socketMap.set(socketId, { roomCode: code, playerToken });

    return { player, playerToken, playerId };
  }

  reconnectPlayer(
    code: RoomCode,
    playerToken: PlayerToken,
    socketId: string
  ): Player | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const player = room.players.get(playerToken);
    if (!player) return null;

    // Remove old socket mapping if exists
    if (player.socketId && player.socketId !== socketId) {
      this.socketMap.delete(player.socketId);
    }

    player.connected = true;
    player.socketId = socketId;
    room.lastActivity = Date.now();

    this.socketMap.set(socketId, { roomCode: code, playerToken });

    return player;
  }

  disconnectSocket(socketId: string): {
    roomCode: RoomCode;
    playerToken: PlayerToken;
  } | null {
    const info = this.socketMap.get(socketId);
    if (!info) {
      // Check if host socket
      this.hostSockets.delete(socketId);
      return null;
    }

    this.socketMap.delete(socketId);
    const room = this.rooms.get(info.roomCode);
    if (room) {
      const player = room.players.get(info.playerToken);
      if (player) {
        player.connected = false;
        player.socketId = null;
      }
    }

    return info;
  }

  registerHostSocket(socketId: string, roomCode: RoomCode): void {
    this.hostSockets.set(socketId, roomCode);
  }

  getSocketInfo(socketId: string): { roomCode: RoomCode; playerToken: PlayerToken } | null {
    return this.socketMap.get(socketId) ?? null;
  }

  // ─── Voting ─────────────────────────────────────────────────────

  getVotes(code: RoomCode): Map<TeamIndex, Vote[]> {
    return this.roundVotes.get(code) ?? new Map();
  }

  addVote(code: RoomCode, team: TeamIndex, vote: Vote): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;

    let roomVotes = this.roundVotes.get(code);
    if (!roomVotes) {
      roomVotes = new Map();
      this.roundVotes.set(code, roomVotes);
    }

    let teamVotes = roomVotes.get(team);
    if (!teamVotes) {
      teamVotes = [];
      roomVotes.set(team, teamVotes);
    }

    // Check duplicate vote
    if (teamVotes.some((v) => v.playerToken === vote.playerToken)) {
      return false;
    }

    teamVotes.push(vote);
    room.lastActivity = Date.now();
    return true;
  }

  clearRoundVotes(code: RoomCode): void {
    this.roundVotes.set(code, new Map());
  }

  // ─── Host auth ──────────────────────────────────────────────────

  verifyHost(code: RoomCode, hostToken: HostToken): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    if (typeof hostToken !== 'string' || hostToken.length !== 32) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(room.hostToken, 'hex'),
        Buffer.from(hostToken, 'hex')
      );
    } catch {
      return false;
    }
  }

  // ─── TTL ────────────────────────────────────────────────────────

  cleanupExpired(now = Date.now()): RoomCode[] {
    const expired: RoomCode[] = [];
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivity > GAME_CONSTANTS.ROOM_TTL_MS) {
        expired.push(code);
      }
    }
    for (const code of expired) {
      this.deleteRoom(code);
    }
    return expired;
  }

  // ─── Snapshot (never includes hostToken) ────────────────────────

  buildSnapshot(room: RoomState): RoomSnapshot {
    const now = Date.now();
    let roundTimeRemainingMs: number | null = null;

    if (room.phase === 'playing' && room.roundStartedAt !== null) {
      const elapsed = now - room.roundStartedAt;
      const totalMs = GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000;
      roundTimeRemainingMs = Math.max(0, totalMs - elapsed);
    } else if (room.phase === 'paused' && room.pausedRemainingMs !== null) {
      roundTimeRemainingMs = room.pausedRemainingMs;
    }

    const currentScenario =
      room.phase === 'playing' || room.phase === 'paused'
        ? (() => {
            const s = room.scenarios[room.currentRound - 1];
            if (!s) return null;
            return {
              title: s.title,
              description: s.description,
              options: s.options,
              defaultOptionIndex: s.defaultOptionIndex,
            };
          })()
        : null;

    const players: PlayerSnapshot[] = [];
    let totalJoined = 0;
    let totalInteracted = 0;
    for (const [, p] of room.players) {
      players.push({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        connected: p.connected,
        hasVotedThisRound: p.hasVotedThisRound,
      });
      totalJoined++;
      if (p.hasInteracted) totalInteracted++;
    }

    return {
      code: room.code,
      phase: room.phase,
      numTeams: room.numTeams,
      teams: room.teams.map(teamToSnapshot),
      players,
      currentRound: room.currentRound,
      roundTimeRemainingMs,
      roundResults: room.roundResults.map(roundResultToSnapshot),
      currentScenario,
      lobbyLocked: room.lobbyLocked,
      stats: {
        totalJoined,
        totalInteracted,
        classSize: room.classSize,
      },
    };
  }

  // ─── Reset ──────────────────────────────────────────────────────

  resetRoom(code: RoomCode): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;

    if (room.roundTimer) clearTimeout(room.roundTimer);
    if (room.tickInterval) clearInterval(room.tickInterval);
    room.roundTimer = null;
    room.tickInterval = null;

    room.phase = 'lobby';
    room.currentRound = 0;
    room.roundStartedAt = null;
    room.pausedRemainingMs = null;
    room.roundResults = [];
    room.aidThisRound = new Set();
    room.currentAidRecords = [];
    room.lobbyLocked = false;
    room.lastActivity = Date.now();

    // Reset team resources but keep members
    for (const team of room.teams) {
      team.resources = {
        food: GAME_CONSTANTS.INITIAL_FOOD,
        strength: GAME_CONSTANTS.INITIAL_STRENGTH,
        trust: GAME_CONSTANTS.INITIAL_TRUST,
      };
      team.contributionScore = 0;
    }

    // Reset player vote flags
    for (const [, player] of room.players) {
      player.hasVotedThisRound = false;
    }

    this.clearRoundVotes(code);
    return true;
  }
}
