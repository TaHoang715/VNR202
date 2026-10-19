/**
 * Room manager unit tests.
 *
 * Tests: token generation, room CRUD, player management, reconnect,
 * host auth, TTL cleanup, snapshot safety, rate limiting, reset.
 */

import { RoomManager, RateLimiter, generateRoomCode, generateToken } from '../room';
import { GAME_CONSTANTS } from '../types';

describe('token generation', () => {
  it('generates 6-char room codes with no ambiguous chars', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      codes.add(code);
    }
    // Should be mostly unique (collision possible but very unlikely)
    expect(codes.size).toBeGreaterThan(90);
  });

  it('generates 32-hex-char tokens', () => {
    const token = generateToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('RoomManager', () => {
  let mgr: RoomManager;

  beforeEach(() => {
    mgr = new RoomManager();
  });

  afterEach(() => {
    mgr.destroy();
  });

  // ─── Room creation ──────────────────────────────────────────

  it('creates a room with valid team count', () => {
    const { room, hostToken } = mgr.createRoom(4);
    expect(room.code).toHaveLength(6);
    expect(hostToken).toHaveLength(32);
    expect(room.phase).toBe('lobby');
    expect(room.teams).toHaveLength(4);
    expect(room.numTeams).toBe(4);
  });

  it('rejects invalid team counts', () => {
    expect(() => mgr.createRoom(2)).toThrow();
    expect(() => mgr.createRoom(7)).toThrow();
  });

  it('stores classSize', () => {
    const { room } = mgr.createRoom(4, 45);
    expect(room.classSize).toBe(45);
  });

  // ─── Player management ──────────────────────────────────────

  it('adds a player in lobby phase', () => {
    const { room } = mgr.createRoom(4);
    const result = mgr.addPlayer(room.code, 'Alice', 0, 'sock1');
    expect(result).not.toBeNull();
    expect(result!.player.nickname).toBe('Alice');
    expect(result!.player.team).toBe(0);
    expect(result!.playerToken).toHaveLength(32);
  });

  it('rejects player with empty nickname', () => {
    const { room } = mgr.createRoom(4);
    const result = mgr.addPlayer(room.code, '   ', 0, 'sock1');
    expect(result).toBeNull();
  });

  it('truncates long nickname', () => {
    const { room } = mgr.createRoom(4);
    const longName = 'A'.repeat(50);
    const result = mgr.addPlayer(room.code, longName, 0, 'sock1');
    expect(result).not.toBeNull();
    expect(result!.player.nickname.length).toBeLessThanOrEqual(
      GAME_CONSTANTS.MAX_NICKNAME_LENGTH
    );
  });

  it('rejects player join for invalid team index', () => {
    const { room } = mgr.createRoom(4);
    expect(mgr.addPlayer(room.code, 'Bob', -1, 'sock1')).toBeNull();
    expect(mgr.addPlayer(room.code, 'Bob', 4, 'sock1')).toBeNull();
  });

  it('rejects duplicate nickname case-insensitively', () => {
    const { room } = mgr.createRoom(4);
    const p1 = mgr.addPlayer(room.code, 'ThanhNien', 0, 'sock1');
    expect(p1).not.toBeNull();
    const p2 = mgr.addPlayer(room.code, 'thanhnien', 1, 'sock2');
    expect(p2).toBeNull();
  });

  it('rejects join when socket is already registered to a player', () => {
    const { room } = mgr.createRoom(4);
    const p1 = mgr.addPlayer(room.code, 'Player1', 0, 'sock1');
    expect(p1).not.toBeNull();
    const p2 = mgr.addPlayer(room.code, 'Player2', 1, 'sock1');
    expect(p2).toBeNull();
  });

  it('rejects player join when lobby is locked', () => {
    const { room } = mgr.createRoom(4);
    mgr.setLobbyLock(room.code, true);
    expect(mgr.addPlayer(room.code, 'LockedOut', 0, 'sock1')).toBeNull();
    mgr.setLobbyLock(room.code, false);
    expect(mgr.addPlayer(room.code, 'AllowedIn', 0, 'sock1')).not.toBeNull();
  });

  it('rejects join after game started', () => {
    const { room } = mgr.createRoom(4);
    room.phase = 'playing';
    expect(mgr.addPlayer(room.code, 'Late', 0, 'sock1')).toBeNull();
  });

  // ─── Reconnect ─────────────────────────────────────────────

  it('reconnects a disconnected player', () => {
    const { room } = mgr.createRoom(4);
    const { playerToken } = mgr.addPlayer(room.code, 'Alice', 0, 'sock1')!;

    mgr.disconnectSocket('sock1');
    const player = room.players.get(playerToken)!;
    expect(player.connected).toBe(false);

    const reconnected = mgr.reconnectPlayer(room.code, playerToken, 'sock2');
    expect(reconnected).not.toBeNull();
    expect(reconnected!.connected).toBe(true);
    expect(reconnected!.socketId).toBe('sock2');
  });

  it('rejects reconnect with invalid token', () => {
    const { room } = mgr.createRoom(4);
    expect(mgr.reconnectPlayer(room.code, 'bogus', 'sock1')).toBeNull();
  });

  // ─── Host auth ─────────────────────────────────────────────

  it('verifies valid host token', () => {
    const { room, hostToken } = mgr.createRoom(4);
    expect(mgr.verifyHost(room.code, hostToken)).toBe(true);
  });

  it('rejects invalid host token', () => {
    const { room } = mgr.createRoom(4);
    const fakeToken = generateToken();
    expect(mgr.verifyHost(room.code, fakeToken)).toBe(false);
  });

  it('rejects host verification for nonexistent room', () => {
    expect(mgr.verifyHost('ZZZZZZ', generateToken())).toBe(false);
  });

  // ─── Snapshot never exposes hostToken ───────────────────────

  it('snapshot does not contain hostToken, does not contain playerToken, and formats players as array', () => {
    const { room } = mgr.createRoom(4);
    const added = mgr.addPlayer(room.code, 'Alice', 0, 'sock1')!;
    const snapshot = mgr.buildSnapshot(room);
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain(room.hostToken);
    expect(json).not.toContain(added.playerToken);
    expect(Array.isArray(snapshot.players)).toBe(true);
    expect(snapshot.players[0].id).toBe(added.playerId);
    expect(snapshot.players[0].nickname).toBe('Alice');
    expect(snapshot.players[0].hasVotedThisRound).toBe(false);
    expect(snapshot.lobbyLocked).toBe(false);
  });

  // ─── Voting ─────────────────────────────────────────────────

  it('adds and retrieves votes', () => {
    const { room } = mgr.createRoom(4);
    mgr.addVote(room.code, 0, {
      playerToken: 'p1',
      optionId: 'a',
      timestamp: Date.now(),
    });
    mgr.addVote(room.code, 0, {
      playerToken: 'p2',
      optionId: 'b',
      timestamp: Date.now(),
    });

    const votes = mgr.getVotes(room.code);
    expect(votes.get(0)).toHaveLength(2);
  });

  it('rejects duplicate vote from same player', () => {
    const { room } = mgr.createRoom(4);
    mgr.addVote(room.code, 0, {
      playerToken: 'p1',
      optionId: 'a',
      timestamp: Date.now(),
    });
    const added = mgr.addVote(room.code, 0, {
      playerToken: 'p1',
      optionId: 'b',
      timestamp: Date.now(),
    });
    expect(added).toBe(false);
  });

  // ─── TTL cleanup ────────────────────────────────────────────

  it('cleans up expired rooms', () => {
    const { room } = mgr.createRoom(4);
    room.lastActivity = Date.now() - GAME_CONSTANTS.ROOM_TTL_MS - 1;
    const expired = mgr.cleanupExpired();
    expect(expired).toContain(room.code);
    expect(mgr.getRoom(room.code)).toBeUndefined();
  });

  it('keeps active rooms', () => {
    const { room } = mgr.createRoom(4);
    const expired = mgr.cleanupExpired();
    expect(expired).not.toContain(room.code);
    expect(mgr.getRoom(room.code)).toBeDefined();
  });

  // ─── Reset ──────────────────────────────────────────────────

  it('resets room to lobby with fresh resources', () => {
    const { room } = mgr.createRoom(4);
    mgr.addPlayer(room.code, 'Alice', 0, 'sock1');
    room.phase = 'finished';
    room.currentRound = 4;
    room.teams[0].resources.food = 50;

    expect(mgr.resetRoom(room.code)).toBe(true);
    expect(room.phase).toBe('lobby');
    expect(room.currentRound).toBe(0);
    expect(room.teams[0].resources.food).toBe(GAME_CONSTANTS.INITIAL_FOOD);
  });

  // ─── Room isolation ─────────────────────────────────────────

  it('isolates rooms from each other', () => {
    const { room: room1 } = mgr.createRoom(4);
    const { room: room2 } = mgr.createRoom(5);

    mgr.addPlayer(room1.code, 'A', 0, 's1');
    mgr.addPlayer(room2.code, 'B', 0, 's2');

    expect(room1.players.size).toBe(1);
    expect(room2.players.size).toBe(1);

    // Vote in room1 doesn't affect room2
    mgr.addVote(room1.code, 0, {
      playerToken: 'p1',
      optionId: 'a',
      timestamp: Date.now(),
    });
    const room2Votes = mgr.getVotes(room2.code);
    expect(room2Votes.get(0) ?? []).toHaveLength(0);
  });
});

describe('RateLimiter', () => {
  it('allows requests within limit', () => {
    const rl = new RateLimiter(3, 10_000);
    expect(rl.check('client1')).toBe(true);
    expect(rl.check('client1')).toBe(true);
    expect(rl.check('client1')).toBe(true);
  });

  it('blocks requests over limit', () => {
    const rl = new RateLimiter(2, 10_000);
    expect(rl.check('client1')).toBe(true);
    expect(rl.check('client1')).toBe(true);
    expect(rl.check('client1')).toBe(false);
  });

  it('resets after window expires', () => {
    const rl = new RateLimiter(1, 100);
    const now = Date.now();
    expect(rl.check('c1', now)).toBe(true);
    expect(rl.check('c1', now + 50)).toBe(false);
    expect(rl.check('c1', now + 150)).toBe(true); // new window
  });

  it('tracks clients independently', () => {
    const rl = new RateLimiter(1, 10_000);
    expect(rl.check('c1')).toBe(true);
    expect(rl.check('c2')).toBe(true);
    expect(rl.check('c1')).toBe(false);
    expect(rl.check('c2')).toBe(false);
  });
});
