/**
 * Socket.IO server for "Giữ vững căn cứ" cooperative classroom game.
 *
 * Server-authoritative: all state mutations happen here.
 * Clients receive snapshots; they never modify state directly.
 *
 * Also supports in-talk polls for presentation interaction.
 */

import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GAME_CONSTANTS,
  RoomCode,
  HostToken,
  PlayerToken,
  TeamIndex,
  TeamResources,
  Vote,
  RoomState,
  PollSnapshot,
} from './types';
import { RoomManager, RateLimiter } from './room';
import {
  resolveRound,
  checkSurvival,
  checkVictory,
  teamToSnapshot,
  roundResultToSnapshot,
  validateAid,
  applyAid,
  aidKey,
} from './engine';
import { createStaticRequestHandler } from './static';

// ─── Configuration ──────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const rawPublicUrl =
  process.env.PUBLIC_URL ||
  (process.env.RENDER_EXTERNAL_URL
    ? (process.env.RENDER_EXTERNAL_URL.startsWith('http://') || process.env.RENDER_EXTERNAL_URL.startsWith('https://')
        ? process.env.RENDER_EXTERNAL_URL
        : `https://${process.env.RENDER_EXTERNAL_URL}`)
    : undefined) ||
  `http://localhost:${PORT}`;
const PUBLIC_URL = rawPublicUrl;
const MAX_ROOMS = 20;
const MAX_POLLS_PER_ROOM = 10;

// ─── Poll types ─────────────────────────────────────────────────────

interface Poll {
  id: string;
  roomCode: string;
  question: string;
  options: string[];
  votes: Map<string, number>; // playerToken -> optionIndex
  active: boolean;
}

// ─── State ──────────────────────────────────────────────────────────

const roomManager = new RoomManager();
const rateLimiter = new RateLimiter();
const polls = new Map<string, Poll>(); // pollId -> Poll
let pollCounter = 0;

// ─── HTTP Server ────────────────────────────────────────────────────

const staticHandler = createStaticRequestHandler({
  get isServeClient() {
    return process.env.SERVE_CLIENT === '1';
  },
  get publicUrl() {
    return PUBLIC_URL;
  },
  getRoomCount: () => roomManager.getAllRoomCodes().length,
});

const httpServer = http.createServer((req, res) => {
  staticHandler(req, res);
});

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ─── Helpers ────────────────────────────────────────────────────────

function broadcastSnapshot(room: RoomState): void {
  const snapshot = roomManager.buildSnapshot(room);
  io.to(room.code).emit('room:snapshot', snapshot);
}

function buildPollSnapshot(poll: Poll, playerToken?: string): PollSnapshot {
  const voteCounts = new Array(poll.options.length).fill(0);
  for (const idx of poll.votes.values()) {
    if (idx >= 0 && idx < voteCounts.length) voteCounts[idx]++;
  }
  return {
    id: poll.id,
    question: poll.question,
    options: poll.options,
    voteCounts,
    totalVotes: poll.votes.size,
    active: poll.active,
    userVoteIndex: playerToken !== undefined ? poll.votes.get(playerToken) ?? null : null,
  };
}

function broadcastPoll(poll: Poll): void {
  io.to(poll.roomCode).emit('poll:update', buildPollSnapshot(poll));
}

function cleanRoomPolls(roomCode: RoomCode): void {
  for (const [id, poll] of polls.entries()) {
    if (poll.roomCode === roomCode) {
      polls.delete(id);
    }
  }
}

function clearRoomTimers(room: RoomState): void {
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
}

function startRoundTimer(room: RoomState, durationMs: number = GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000): void {
  clearRoomTimers(room);

  room.roundStartedAt = Date.now() - (GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000 - durationMs);

  // Tick every 1000ms
  room.tickInterval = setInterval(() => {
    if (room.phase !== 'playing' || !room.roundStartedAt) {
      if (room.tickInterval) clearInterval(room.tickInterval);
      room.tickInterval = null;
      return;
    }
    const elapsed = Date.now() - room.roundStartedAt;
    const remaining = Math.max(0, GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000 - elapsed);
    io.to(room.code).emit('round:tick', remaining);
    if (remaining <= 0) {
      if (room.tickInterval) clearInterval(room.tickInterval);
      room.tickInterval = null;
    }
  }, 1000);

  room.roundTimer = setTimeout(() => {
    clearRoomTimers(room);
    resolveCurrentRound(room);
  }, durationMs);
}

function resolveCurrentRound(room: RoomState): void {
  if (room.phase !== 'playing' && room.phase !== 'paused') return;

  clearRoomTimers(room);
  io.to(room.code).emit('round:tick', 0);

  const scenario = room.scenarios[room.currentRound - 1];
  if (!scenario) return;

  const votesByTeam = roomManager.getVotes(room.code);
  const aidRecords = [...room.currentAidRecords];

  const result = resolveRound(room.teams, scenario, votesByTeam, aidRecords);
  room.roundResults.push(result);

  const snapshot = roundResultToSnapshot(result);
  io.to(room.code).emit('round:resolved', snapshot);

  // Reset per-round state
  roomManager.clearRoundVotes(room.code);
  room.aidThisRound = new Set();
  room.currentAidRecords = [];
  for (const [, player] of room.players) {
    player.hasVotedThisRound = false;
  }

  // Check if game is over
  const survived = checkSurvival(room.teams);
  if (!survived || room.currentRound >= GAME_CONSTANTS.TOTAL_ROUNDS) {
    room.phase = 'finished';
    room.roundStartedAt = null;
    room.pausedRemainingMs = null;

    const victory = checkVictory(room.teams);
    let totalJoined = 0;
    let totalInteracted = 0;
    for (const [, p] of room.players) {
      totalJoined++;
      if (p.hasInteracted) totalInteracted++;
    }

    io.to(room.code).emit('game:finished', {
      victory,
      teams: room.teams.map(teamToSnapshot),
      roundResults: room.roundResults.map(roundResultToSnapshot),
      stats: {
        totalJoined,
        totalInteracted,
        classSize: room.classSize,
      },
    });
  } else {
    room.phase = 'reviewing';
    room.roundStartedAt = null;
    room.pausedRemainingMs = null;
  }

  broadcastSnapshot(room);
}

// ─── Input Validation Helpers ───────────────────────────────────────

function validateRoomCode(code: unknown): code is RoomCode {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}

function isSafeInteger(val: unknown, min: number, max: number): val is number {
  return (
    typeof val === 'number' &&
    Number.isFinite(val) &&
    Number.isInteger(val) &&
    val >= min &&
    val <= max
  );
}

function safeCb(cb: unknown): (resp: any) => void {
  return typeof cb === 'function' ? (cb as (resp: any) => void) : () => {};
}

// ─── Socket Event Handlers ──────────────────────────────────────────

io.on('connection', (socket) => {
  const checkRate = (): boolean => {
    if (!rateLimiter.check(socket.id)) {
      socket.emit('room:error', {
        code: 'RATE_LIMITED',
        message: 'Thao tác quá nhanh. Vui lòng thử lại sau vài giây.',
      });
      return false;
    }
    return true;
  };

  // ─── room:create ────────────────────────────────────────────

  socket.on('room:create', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') {
      return cb({ ok: false, error: 'Invalid payload' });
    }

    const { numTeams, classSize } = data;
    if (!isSafeInteger(numTeams, GAME_CONSTANTS.MIN_TEAMS, GAME_CONSTANTS.MAX_TEAMS)) {
      return cb({
        ok: false,
        error: `Số lượng đội phải từ ${GAME_CONSTANTS.MIN_TEAMS} đến ${GAME_CONSTANTS.MAX_TEAMS}`,
      });
    }

    const validatedClassSize =
      classSize !== undefined && classSize !== null
        ? isSafeInteger(classSize, 1, 200)
          ? classSize
          : null
        : null;

    if (roomManager.getAllRoomCodes().length >= MAX_ROOMS) {
      return cb({ ok: false, error: 'Máy chủ đã đạt giới hạn phòng tối đa' });
    }

    try {
      const { room, hostToken } = roomManager.createRoom(numTeams, validatedClassSize);
      roomManager.registerHostSocket(socket.id, room.code);
      socket.join(room.code);
      const snapshot = roomManager.buildSnapshot(room);
      cb({ ok: true, roomCode: room.code, hostToken, snapshot });
    } catch (err: any) {
      cb({ ok: false, error: err?.message ?? 'Không thể tạo phòng' });
    }
  });

  // ─── room:join ──────────────────────────────────────────────

  socket.on('room:join', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') {
      return cb({ ok: false, error: 'Invalid payload' });
    }

    const { roomCode, nickname, team } = data;
    if (!validateRoomCode(roomCode)) {
      return cb({ ok: false, error: 'Mã phòng không hợp lệ' });
    }
    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      return cb({ ok: false, error: 'Biệt danh không được để trống' });
    }
    if (!isSafeInteger(team, 0, GAME_CONSTANTS.MAX_TEAMS - 1)) {
      return cb({ ok: false, error: 'Đội không hợp lệ' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      return cb({ ok: false, error: 'Phòng không tồn tại' });
    }
    if (room.lobbyLocked) {
      return cb({ ok: false, error: 'Sảnh đã bị khóa bởi người chủ trì' });
    }
    if (room.phase !== 'lobby') {
      return cb({ ok: false, error: 'Trò chơi đã bắt đầu, không thể tham gia mới' });
    }

    const result = roomManager.addPlayer(roomCode, nickname, team, socket.id);
    if (!result) {
      return cb({
        ok: false,
        error: 'Không thể vào phòng (trùng tên, phòng đầy, hoặc bạn đã có kết nối trong phòng)',
      });
    }

    socket.join(roomCode);
    broadcastSnapshot(room);
    cb({
      ok: true,
      playerToken: result.playerToken,
      playerId: result.playerId,
      snapshot: roomManager.buildSnapshot(room),
    });
    for (const poll of polls.values()) {
      if (poll.roomCode === roomCode && poll.active) socket.emit('poll:update', buildPollSnapshot(poll, result.playerToken));
    }
  });

  // ─── room:reconnect ────────────────────────────────────────

  socket.on('room:reconnect', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') {
      return cb({ ok: false, error: 'Invalid payload' });
    }

    const { roomCode, playerToken } = data;
    if (!validateRoomCode(roomCode) || typeof playerToken !== 'string') {
      return cb({ ok: false, error: 'Thông tin kết nối lại không hợp lệ' });
    }

    const player = roomManager.reconnectPlayer(roomCode, playerToken, socket.id);
    if (!player) {
      return cb({ ok: false, error: 'Kết nối lại thất bại: phòng hoặc mã định danh không tồn tại' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });

    socket.join(roomCode);
    broadcastSnapshot(room);

    // Send active poll if any
    for (const poll of polls.values()) {
      if (poll.roomCode === roomCode && poll.active) {
        socket.emit('poll:update', buildPollSnapshot(poll, playerToken));
        break;
      }
    }

    cb({
      ok: true,
      player: {
        id: player.id,
        nickname: player.nickname,
        team: player.team,
        connected: player.connected,
        hasVotedThisRound: player.hasVotedThisRound,
      },
      snapshot: roomManager.buildSnapshot(room),
    });
  });

  // ─── host:reconnect ────────────────────────────────────────

  socket.on('host:reconnect', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') {
      return cb({ ok: false, error: 'Invalid payload' });
    }

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Xác thực chủ phòng thất bại' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });

    roomManager.registerHostSocket(socket.id, roomCode);
    socket.join(roomCode);

    const activePoll = [...polls.values()].find(poll => poll.roomCode === roomCode && poll.active);
    cb({ ok: true, snapshot: roomManager.buildSnapshot(room), poll: activePoll ? buildPollSnapshot(activePoll) : null });
  });

  // ─── host:start ─────────────────────────────────────────────

  socket.on('host:start', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });

    if (room.phase !== 'lobby' && room.phase !== 'reviewing') {
      return cb({ ok: false, error: 'Không thể bắt đầu lượt trong trạng thái hiện tại' });
    }

    room.currentRound++;
    if (room.currentRound > GAME_CONSTANTS.TOTAL_ROUNDS) {
      return cb({ ok: false, error: 'Đã hoàn tất toàn bộ 4 lượt chơi' });
    }

    room.phase = 'playing';
    room.lastActivity = Date.now();
    for (const poll of polls.values()) {
      if (poll.roomCode === roomCode && poll.active) { poll.active = false; broadcastPoll(poll); }
    }
    roomManager.clearRoundVotes(roomCode);
    room.aidThisRound = new Set();
    room.currentAidRecords = [];

    for (const [, player] of room.players) {
      player.hasVotedThisRound = false;
    }

    startRoundTimer(room, GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000);
    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── host:pause ─────────────────────────────────────────────

  socket.on('host:pause', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room || room.phase !== 'playing') {
      return cb({ ok: false, error: 'Phòng hiện không trong lượt chơi' });
    }

    const elapsed = Date.now() - (room.roundStartedAt ?? Date.now());
    const totalMs = GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000;
    room.pausedRemainingMs = Math.max(0, totalMs - elapsed);

    clearRoomTimers(room);

    room.roundStartedAt = null;
    room.phase = 'paused';
    room.lastActivity = Date.now();

    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── host:resume ────────────────────────────────────────────

  socket.on('host:resume', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room || room.phase !== 'paused' || room.pausedRemainingMs === null) {
      return cb({ ok: false, error: 'Phòng không ở trạng thái tạm dừng' });
    }

    const remaining = room.pausedRemainingMs;
    room.phase = 'playing';
    room.pausedRemainingMs = null;
    room.lastActivity = Date.now();

    // Preserve the exact remaining duration without rescheduling full 90s!
    startRoundTimer(room, remaining);
    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── host:endRound (manual force resolve) ───────────────────

  socket.on('host:endRound', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room || (room.phase !== 'playing' && room.phase !== 'paused')) {
      return cb({ ok: false, error: 'Không thể chốt lượt trong trạng thái hiện tại' });
    }

    resolveCurrentRound(room);
    cb({ ok: true });
  });

  // ─── host:setLobbyLock ──────────────────────────────────────

  socket.on('host:setLobbyLock', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken, locked } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    if (typeof locked !== 'boolean') {
      return cb({ ok: false, error: 'Giá trị locked phải là boolean' });
    }

    const ok = roomManager.setLobbyLock(roomCode, locked);
    if (!ok) return cb({ ok: false, error: 'Không tìm thấy phòng' });

    const room = roomManager.getRoom(roomCode)!;
    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── host:close ─────────────────────────────────────────────

  socket.on('host:close', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });

    clearRoomTimers(room);
    cleanRoomPolls(roomCode);

    io.to(roomCode).emit('room:kicked', 'Người chủ trì đã đóng phòng');
    roomManager.deleteRoom(roomCode);
    cb({ ok: true });
  });

  // ─── host:reset ─────────────────────────────────────────────

  socket.on('host:reset', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    cleanRoomPolls(roomCode);

    if (!roomManager.resetRoom(roomCode)) {
      return cb({ ok: false, error: 'Đặt lại phòng thất bại' });
    }

    const room = roomManager.getRoom(roomCode);
    if (room) {
      broadcastSnapshot(room);
    }
    cb({ ok: true });
  });

  // ─── player:vote ────────────────────────────────────────────

  socket.on('player:vote', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, playerToken, optionId } = data;
    if (!validateRoomCode(roomCode) || typeof playerToken !== 'string' || typeof optionId !== 'string') {
      return cb({ ok: false, error: 'Dữ liệu biểu quyết không hợp lệ' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });
    if (room.phase !== 'playing') return cb({ ok: false, error: 'Lượt bỏ phiếu chưa mở' });

    const player = room.players.get(playerToken);
    if (!player) return cb({ ok: false, error: 'Không tìm thấy người chơi' });
    if (player.socketId !== socket.id) {
      return cb({ ok: false, error: 'Phiên kết nối chưa được xác thực. Vui lòng kết nối lại.' });
    }
    if (player.hasVotedThisRound) return cb({ ok: false, error: 'Bạn đã biểu quyết trong lượt này' });

    const scenario = room.scenarios[room.currentRound - 1];
    if (!scenario || !scenario.options.some((o) => o.id === optionId)) {
      return cb({ ok: false, error: 'Phương án không hợp lệ' });
    }

    const vote: Vote = {
      playerToken,
      optionId,
      timestamp: Date.now(),
    };

    if (!roomManager.addVote(roomCode, player.team, vote)) {
      return cb({ ok: false, error: 'Biểu quyết trùng lặp hoặc không được chấp thuận' });
    }

    player.hasVotedThisRound = true;
    player.hasInteracted = true;
    room.lastActivity = Date.now();

    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── player:aid ─────────────────────────────────────────────

  socket.on('player:aid', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, playerToken, toTeam, resource, amount } = data;
    if (!validateRoomCode(roomCode) || typeof playerToken !== 'string') {
      return cb({ ok: false, error: 'Dữ liệu viện trợ không hợp lệ' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });
    if (room.phase !== 'playing') return cb({ ok: false, error: 'Viện trợ chỉ khả dụng trong lượt chơi' });

    const player = room.players.get(playerToken);
    if (!player) return cb({ ok: false, error: 'Không tìm thấy người chơi' });
    if (player.socketId !== socket.id) {
      return cb({ ok: false, error: 'Phiên kết nối chưa được xác thực. Vui lòng kết nối lại.' });
    }

    if (!isSafeInteger(toTeam, 0, room.numTeams - 1)) {
      return cb({ ok: false, error: 'Đội nhận không hợp lệ' });
    }

    const validResources: (keyof TeamResources)[] = ['food', 'strength', 'trust'];
    if (!validResources.includes(resource)) {
      return cb({ ok: false, error: 'Loại tài nguyên không hợp lệ' });
    }

    if (!isSafeInteger(amount, 1, 20)) {
      return cb({ ok: false, error: 'Mức viện trợ phải từ 1 đến 20 đơn vị' });
    }

    const fromTeam = room.teams[player.team];
    const targetTeam = room.teams[toTeam];
    if (!fromTeam || !targetTeam) return cb({ ok: false, error: 'Đội không hợp lệ' });

    const record = validateAid(fromTeam, targetTeam, resource, amount, room.currentRound, room.aidThisRound);
    if (!record) {
      return cb({
        ok: false,
        error: 'Viện trợ bị từ chối: không đủ tài nguyên, đã viện trợ đội này trong lượt, hoặc tự viện trợ',
      });
    }

    applyAid(fromTeam, targetTeam, record);
    room.aidThisRound.add(aidKey(room.currentRound, fromTeam.index, toTeam));
    // Store in currentAidRecords so it carries into round result once!
    room.currentAidRecords.push(record);
    player.hasInteracted = true;
    room.lastActivity = Date.now();

    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── poll:create ────────────────────────────────────────────

  socket.on('poll:create', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken, question, options } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }
    if (typeof question !== 'string' || question.trim().length === 0 || question.length > 200) {
      return cb({ ok: false, error: 'Câu hỏi phải từ 1-200 ký tự' });
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return cb({ ok: false, error: 'Cần từ 2 đến 6 phương án khảo sát' });
    }

    // Check poll count cap
    let roomPollCount = 0;
    for (const p of polls.values()) {
      if (p.roomCode === roomCode) roomPollCount++;
    }
    if (roomPollCount >= MAX_POLLS_PER_ROOM) {
      return cb({ ok: false, error: 'Đã đạt giới hạn số khảo sát cho phòng này' });
    }

    pollCounter++;
    const pollId = `poll_${roomCode}_${pollCounter}`;
    const cleanOptions = options.map((o) => String(o).trim().substring(0, 100));

    // Close any prior active poll in this room
    for (const p of polls.values()) {
      if (p.roomCode === roomCode && p.active) {
        p.active = false;
      }
    }

    const poll: Poll = {
      id: pollId,
      roomCode,
      question: question.trim(),
      options: cleanOptions,
      votes: new Map(),
      active: true,
    };

    polls.set(pollId, poll);
    broadcastPoll(poll);
    cb({ ok: true, pollId });
  });

  // ─── poll:vote ──────────────────────────────────────────────

  socket.on('poll:vote', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, playerToken, pollId, optionIndex } = data;
    if (!validateRoomCode(roomCode) || typeof playerToken !== 'string' || typeof pollId !== 'string') {
      return cb({ ok: false, error: 'Dữ liệu không hợp lệ' });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return cb({ ok: false, error: 'Phòng không tồn tại' });

    const player = room.players.get(playerToken);
    if (!player) return cb({ ok: false, error: 'Người chơi không tồn tại' });
    if (player.socketId !== socket.id) {
      return cb({ ok: false, error: 'Phiên kết nối chưa được xác thực. Vui lòng kết nối lại.' });
    }

    const poll = polls.get(pollId);
    if (!poll || poll.roomCode !== roomCode) {
      return cb({ ok: false, error: 'Khảo sát không tồn tại' });
    }
    if (!poll.active) return cb({ ok: false, error: 'Khảo sát đã đóng' });

    if (!isSafeInteger(optionIndex, 0, poll.options.length - 1)) {
      return cb({ ok: false, error: 'Phương án không hợp lệ' });
    }

    poll.votes.set(playerToken, optionIndex);
    player.hasInteracted = true;
    room.lastActivity = Date.now();

    broadcastPoll(poll);
    broadcastSnapshot(room);
    cb({ ok: true });
  });

  // ─── poll:close ─────────────────────────────────────────────

  socket.on('poll:close', (data: any, rawCb: any) => {
    const cb = safeCb(rawCb);
    if (!checkRate()) return cb({ ok: false, error: 'Rate limited' });
    if (!data || typeof data !== 'object') return cb({ ok: false, error: 'Invalid payload' });

    const { roomCode, hostToken, pollId } = data;
    if (!validateRoomCode(roomCode) || !roomManager.verifyHost(roomCode, hostToken)) {
      return cb({ ok: false, error: 'Chưa được ủy quyền' });
    }

    const poll = polls.get(pollId);
    if (!poll || poll.roomCode !== roomCode) {
      return cb({ ok: false, error: 'Khảo sát không tồn tại' });
    }

    poll.active = false;
    broadcastPoll(poll);
    cb({ ok: true });
  });

  // ─── disconnect ─────────────────────────────────────────────

  socket.on('disconnect', () => {
    const info = roomManager.disconnectSocket(socket.id);
    if (info) {
      const room = roomManager.getRoom(info.roomCode);
      if (room) {
        broadcastSnapshot(room);
      }
    }
  });
});

// ─── Shutdown helper for clean tests ────────────────────────────────

export async function stopServer(): Promise<void> {
  roomManager.destroy();
  polls.clear();
  rateLimiter.clear();

  await new Promise<void>((resolve) => {
    io.close(() => {
      httpServer.close(() => {
        resolve();
      });
    });
  });
}

// ─── Start ──────────────────────────────────────────────────────────

if (require.main === module) {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Giữ vững căn cứ — Game Server`);
    console.log(`  Listening on 0.0.0.0:${PORT}`);
    console.log(`  Public URL: ${PUBLIC_URL}`);
    console.log(`  Max rooms: ${MAX_ROOMS}\n`);
  });
}

// ─── Exports ────────────────────────────────────────────────────────

export { httpServer, io, roomManager, rateLimiter, polls, broadcastSnapshot, buildPollSnapshot, staticHandler };
export function getPort(): number {
  const addr = httpServer.address();
  if (addr && typeof addr === 'object') return addr.port;
  return PORT;
}
