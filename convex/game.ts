import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  getDefaultScenarios,
  createInitialTeams,
  generateRoomCode,
  generatePlayerId,
  validateAid,
  applyAid,
  aidKey,
  teamToSnapshot,
} from "./engine";
import { executeRoundResolution } from "./scheduler";
import {
  GAME_CONSTANTS,
  RoomSnapshot,
  PollSnapshot,
  SubscribeEnvelope,
  TeamSnapshot,
  PlayerSnapshot,
  TeamResources,
} from "./types";
import { TeamState } from "../server/src/types";

// ─── Token and ID Validators ────────────────────────────────────────

function is64Hex(str: unknown): str is string {
  return typeof str === "string" && /^[a-f0-9]{64}$/i.test(str.trim());
}

function isValidConnectionId(str: unknown): str is string {
  return typeof str === "string" && str.trim().length > 0;
}

// ─── Snapshot Builder ───────────────────────────────────────────────

function buildRoomSnapshot(
  room: Doc<"rooms">,
  players: Doc<"players">[],
  now: number
): RoomSnapshot {
  const teamMemberCounts = new Map<number, number>();
  for (const p of players) {
    teamMemberCounts.set(p.team, (teamMemberCounts.get(p.team) ?? 0) + 1);
  }

  const teams: TeamSnapshot[] = room.teams.map((t) => {
    const snap = teamToSnapshot(t as TeamState);
    snap.memberCount = teamMemberCounts.get(t.index) ?? 0;
    return snap;
  });

  const playerSnapshots: PlayerSnapshot[] = players.map((p) => ({
    id: p.playerId,
    nickname: p.nickname,
    team: p.team,
    connected: p.connected,
    hasVotedThisRound: p.hasVotedThisRound,
  }));

  let roundTimeRemainingMs: number | null = null;
  if (room.phase === "playing" && room.deadlineMs !== null) {
    roundTimeRemainingMs = Math.max(0, room.deadlineMs - now);
  } else if (room.phase === "paused" && room.pausedRemainingMs !== null) {
    roundTimeRemainingMs = room.pausedRemainingMs;
  }

  let currentScenario = null;
  if (room.currentRound >= 1 && room.currentRound <= GAME_CONSTANTS.TOTAL_ROUNDS) {
    const sc = getDefaultScenarios()[room.currentRound - 1];
    if (sc) {
      currentScenario = {
        title: sc.title,
        description: sc.description,
        options: sc.options,
        defaultOptionIndex: sc.defaultOptionIndex,
      };
    }
  }

  let totalInteracted = 0;
  for (const p of players) {
    if (p.hasInteracted) totalInteracted++;
  }

  return {
    code: room.code,
    phase: room.phase,
    numTeams: room.numTeams,
    teams,
    players: playerSnapshots,
    currentRound: room.currentRound,
    roundTimeRemainingMs,
    roundResults: room.roundResults,
    currentScenario,
    lobbyLocked: room.lobbyLocked,
    stats: {
      totalJoined: players.length,
      totalInteracted,
      classSize: room.classSize,
    },
  };
}

// ─── game.subscribe ─────────────────────────────────────────────────

export const subscribe = query({
  args: {
    roomCode: v.string(),
    token: v.string(),
    connectionId: v.string(),
  },
  handler: async (ctx, args): Promise<SubscribeEnvelope | null> => {
    if (!isValidConnectionId(args.connectionId) || !is64Hex(args.token)) {
      return null;
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room || room.phase === "closed") {
      return null;
    }

    const now = Date.now();
    let isHost = false;
    let isPlayer = false;
    let callerPlayerToken: string | null = null;

    if (room.hostToken === args.token.trim()) {
      if (room.hostConnectionId && room.hostConnectionId !== args.connectionId) {
        return null;
      }
      isHost = true;
    } else {
      const player = await ctx.db
        .query("players")
        .withIndex("by_room_token", (q) =>
          q.eq("roomCode", args.roomCode).eq("playerToken", args.token.trim())
        )
        .first();

      if (!player) {
        return null;
      }

      if (player.connectionId !== args.connectionId) {
        return null;
      }

      isPlayer = true;
      callerPlayerToken = player.playerToken;
    }

    if (!isHost && !isPlayer) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
      .collect();

    const snapshot = buildRoomSnapshot(room, players, now);

    // Fetch most recent poll (preserve closed poll results until next poll or reset)
    const latestPoll = await ctx.db
      .query("polls")
      .withIndex("by_room_created", (q) => q.eq("roomCode", args.roomCode))
      .order("desc")
      .first();

    let pollSnapshot: PollSnapshot | null = null;
    if (latestPoll) {
      const pollVotes = await ctx.db
        .query("pollVotes")
        .withIndex("by_poll", (q) => q.eq("pollId", latestPoll.pollId))
        .collect();

      const voteCounts = new Array(latestPoll.options.length).fill(0);
      let userVoteIndex: number | null = null;

      for (const pv of pollVotes) {
        if (pv.optionIndex >= 0 && pv.optionIndex < voteCounts.length) {
          voteCounts[pv.optionIndex]++;
        }
        if (callerPlayerToken && pv.playerToken === callerPlayerToken) {
          userVoteIndex = pv.optionIndex;
        }
      }

      pollSnapshot = {
        id: latestPoll.pollId,
        question: latestPoll.question,
        options: latestPoll.options,
        voteCounts,
        totalVotes: pollVotes.length,
        active: latestPoll.active,
        userVoteIndex,
      };
    }

    return {
      snapshot,
      poll: pollSnapshot,
      serverNow: now,
      deadlineMs: room.phase === "playing" ? room.deadlineMs : null,
      epoch: room.epoch,
      finished: room.finishedSummary,
    };
  },
});

// ─── game.command ───────────────────────────────────────────────────

export const command = mutation({
  args: {
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const { event, payload } = args;
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "Dữ liệu payload không hợp lệ" };
      }

      const now = Date.now();

      switch (event) {
        // ─── room:create ──────────────────────────────────────────
        case "room:create": {
          const { numTeams, classSize, hostToken, connectionId } = payload;
          if (
            typeof numTeams !== "number" ||
            !Number.isInteger(numTeams) ||
            numTeams < GAME_CONSTANTS.MIN_TEAMS ||
            numTeams > GAME_CONSTANTS.MAX_TEAMS
          ) {
            return {
              ok: false,
              error: `Số lượng đội phải từ ${GAME_CONSTANTS.MIN_TEAMS} đến ${GAME_CONSTANTS.MAX_TEAMS}`,
            };
          }

          if (!is64Hex(hostToken)) {
            return { ok: false, error: "Mã token chủ phòng không hợp lệ (yêu cầu 64 ký tự hex)" };
          }

          if (!isValidConnectionId(connectionId)) {
            return { ok: false, error: "ID kết nối không hợp lệ" };
          }

          const validatedClassSize =
            typeof classSize === "number" &&
            Number.isInteger(classSize) &&
            classSize >= 1 &&
            classSize <= 200
              ? classSize
              : null;

          let activeRoomCount = 0;
          for (const phase of ["lobby", "playing", "paused", "reviewing", "finished"] as const) {
            const activeRooms = await ctx.db.query("rooms")
              .withIndex("by_phase", (q) => q.eq("phase", phase))
              .take(GAME_CONSTANTS.MAX_ROOMS);
            activeRoomCount += activeRooms.length;
            if (activeRoomCount >= GAME_CONSTANTS.MAX_ROOMS) {
              return { ok: false, error: "Máy chủ đã đạt giới hạn phòng tối đa" };
            }
          }

          const token = hostToken.trim();

          let roomCode = generateRoomCode();
          let existing = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          while (existing) {
            roomCode = generateRoomCode();
            existing = await ctx.db
              .query("rooms")
              .withIndex("by_code", (q) => q.eq("code", roomCode))
              .first();
          }

          const initialTeams = createInitialTeams(numTeams);

          const roomId = await ctx.db.insert("rooms", {
            code: roomCode,
            hostToken: token,
            hostConnectionId: connectionId.trim(),
            hostLastHeartbeat: now,
            phase: "lobby",
            numTeams,
            classSize: validatedClassSize,
            lobbyLocked: false,
            currentRound: 0,
            roundStartedAt: null,
            pausedRemainingMs: null,
            deadlineMs: null,
            epoch: 1,
            generation: 1,
            pulseGeneration: 1,
            createdAt: now,
            lastActivity: now,
            teams: initialTeams,
            roundResults: [],
            currentAidRecords: [],
            aidThisRound: [],
            finishedSummary: null,
          });

          // Insert initial host presence record
          await ctx.db.insert("presence", {
            roomCode,
            token,
            connectionId: connectionId.trim(),
            lastHeartbeat: now,
            isHost: true,
          });

          // Schedule persistent room pulse chain
          await ctx.scheduler.runAfter(
            30 * 1000,
            internal.scheduler.roomPulse,
            { roomCode, pulseGeneration: 1 }
          );

          const room = (await ctx.db.get(roomId))!;
          const snapshot = buildRoomSnapshot(room, [], now);

          return {
            ok: true,
            roomCode,
            hostToken: token,
            snapshot,
          };
        }

        // ─── room:join ────────────────────────────────────────────
        case "room:join": {
          const { roomCode, nickname, team, playerToken, connectionId } = payload;
          if (typeof roomCode !== "string" || !/^[A-Z0-9]{6}$/.test(roomCode)) {
            return { ok: false, error: "Mã phòng không hợp lệ" };
          }
          if (typeof nickname !== "string" || nickname.trim().length === 0) {
            return { ok: false, error: "Biệt danh không được để trống" };
          }
          if (!is64Hex(playerToken)) {
            return { ok: false, error: "Mã token người chơi không hợp lệ (yêu cầu 64 ký tự hex)" };
          }
          if (!isValidConnectionId(connectionId)) {
            return { ok: false, error: "ID kết nối không hợp lệ" };
          }

          const cleanNickname = nickname.trim().substring(0, GAME_CONSTANTS.MAX_NICKNAME_LENGTH);
          const token = playerToken.trim();

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: false, error: "Phòng không tồn tại" };
          }
          if (room.lobbyLocked) {
            return { ok: false, error: "Sảnh đã bị khóa bởi người chủ trì" };
          }
          if (room.phase !== "lobby") {
            return { ok: false, error: "Trò chơi đã bắt đầu, không thể tham gia mới" };
          }
          if (
            typeof team !== "number" ||
            !Number.isInteger(team) ||
            team < 0 ||
            team >= room.numTeams
          ) {
            return { ok: false, error: "Đội không hợp lệ" };
          }

          const existingPlayers = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          if (existingPlayers.length >= GAME_CONSTANTS.MAX_PLAYERS) {
            return {
              ok: false,
              error: `Phòng đã đầy (tối đa ${GAME_CONSTANTS.MAX_PLAYERS} người chơi)`,
            };
          }

          // Duplicate token check
          if (existingPlayers.some((p) => p.playerToken === token)) {
            return { ok: false, error: "Token người chơi đã tồn tại trong phòng" };
          }

          // Duplicate nickname check (case-insensitive)
          const lowerNick = cleanNickname.toLowerCase();
          if (existingPlayers.some((p) => p.nickname.toLowerCase() === lowerNick)) {
            return {
              ok: false,
              error: "Không thể vào phòng (trùng tên, phòng đầy, hoặc bạn đã có kết nối trong phòng)",
            };
          }

          // Unique public playerId collision prevention
          let playerId = generatePlayerId();
          let idConflict = existingPlayers.some((p) => p.playerId === playerId);
          while (idConflict) {
            playerId = generatePlayerId();
            idConflict = existingPlayers.some((p) => p.playerId === playerId);
          }

          await ctx.db.insert("players", {
            roomCode,
            playerToken: token,
            playerId,
            nickname: cleanNickname,
            team,
            connected: true,
            connectionId: connectionId.trim(),
            lastHeartbeat: now,
            hasVotedThisRound: false,
            hasInteracted: false,
          });

          // Insert player presence record
          await ctx.db.insert("presence", {
            roomCode,
            token,
            connectionId: connectionId.trim(),
            lastHeartbeat: now,
            isHost: false,
          });

          await ctx.db.patch(room._id, { lastActivity: now });

          const updatedPlayers = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          const snapshot = buildRoomSnapshot(room, updatedPlayers, now);

          return {
            ok: true,
            playerToken: token,
            playerId,
            snapshot,
          };
        }

        // ─── room:reconnect ───────────────────────────────────────
        case "room:reconnect": {
          const { roomCode, playerToken, connectionId } = payload;
          if (typeof roomCode !== "string" || !is64Hex(playerToken)) {
            return { ok: false, error: "Thông tin kết nối lại không hợp lệ" };
          }
          if (!isValidConnectionId(connectionId)) {
            return { ok: false, error: "ID kết nối không hợp lệ" };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: false, error: "Phòng không tồn tại" };
          }

          const player = await ctx.db
            .query("players")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("playerToken", playerToken.trim())
            )
            .first();

          if (!player) {
            return {
              ok: false,
              error: "Kết nối lại thất bại: phòng hoặc mã định danh không tồn tại",
            };
          }

          await ctx.db.patch(player._id, {
            connectionId: connectionId.trim(),
            connected: true,
            lastHeartbeat: now,
          });

          // Update player presence record
          const playerPresence = await ctx.db
            .query("presence")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("token", playerToken.trim())
            )
            .first();

          if (playerPresence) {
            await ctx.db.patch(playerPresence._id, {
              connectionId: connectionId.trim(),
              lastHeartbeat: now,
            });
          } else {
            await ctx.db.insert("presence", {
              roomCode,
              token: playerToken.trim(),
              connectionId: connectionId.trim(),
              lastHeartbeat: now,
              isHost: false,
            });
          }

          await ctx.db.patch(room._id, { lastActivity: now });

          const updatedPlayers = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          const snapshot = buildRoomSnapshot(room, updatedPlayers, now);

          const latestPoll = await ctx.db
            .query("polls")
            .withIndex("by_room_created", (q) => q.eq("roomCode", roomCode))
            .order("desc")
            .first();

          let pollSnapshot: PollSnapshot | null = null;
          if (latestPoll) {
            const pollVotes = await ctx.db
              .query("pollVotes")
              .withIndex("by_poll", (q) => q.eq("pollId", latestPoll.pollId))
              .collect();

            const voteCounts = new Array(latestPoll.options.length).fill(0);
            let userVoteIndex: number | null = null;

            for (const pv of pollVotes) {
              if (pv.optionIndex >= 0 && pv.optionIndex < voteCounts.length) {
                voteCounts[pv.optionIndex]++;
              }
              if (pv.playerToken === playerToken.trim()) {
                userVoteIndex = pv.optionIndex;
              }
            }

            pollSnapshot = {
              id: latestPoll.pollId,
              question: latestPoll.question,
              options: latestPoll.options,
              voteCounts,
              totalVotes: pollVotes.length,
              active: latestPoll.active,
              userVoteIndex,
            };
          }

          return {
            ok: true,
            player: {
              id: player.playerId,
              nickname: player.nickname,
              team: player.team,
              connected: true,
              hasVotedThisRound: player.hasVotedThisRound,
            },
            playerId: player.playerId,
            snapshot,
            poll: pollSnapshot,
          };
        }

        // ─── host:reconnect ───────────────────────────────────────
        case "host:reconnect": {
          const { roomCode, hostToken, connectionId } = payload;
          if (typeof roomCode !== "string" || !is64Hex(hostToken)) {
            return { ok: false, error: "Xác thực chủ phòng thất bại" };
          }
          if (!isValidConnectionId(connectionId)) {
            return { ok: false, error: "ID kết nối không hợp lệ" };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed" || room.hostToken !== hostToken.trim()) {
            return { ok: false, error: "Xác thực chủ phòng thất bại" };
          }

          await ctx.db.patch(room._id, {
            hostConnectionId: connectionId.trim(),
            hostLastHeartbeat: now,
            lastActivity: now,
          });

          // Update host presence record
          const hostPresence = await ctx.db
            .query("presence")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("token", hostToken.trim())
            )
            .first();

          if (hostPresence) {
            await ctx.db.patch(hostPresence._id, {
              connectionId: connectionId.trim(),
              lastHeartbeat: now,
            });
          } else {
            await ctx.db.insert("presence", {
              roomCode,
              token: hostToken.trim(),
              connectionId: connectionId.trim(),
              lastHeartbeat: now,
              isHost: true,
            });
          }

          const players = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          const snapshot = buildRoomSnapshot(room, players, now);

          const latestPoll = await ctx.db
            .query("polls")
            .withIndex("by_room_created", (q) => q.eq("roomCode", roomCode))
            .order("desc")
            .first();

          let pollSnapshot: PollSnapshot | null = null;
          if (latestPoll) {
            const pollVotes = await ctx.db
              .query("pollVotes")
              .withIndex("by_poll", (q) => q.eq("pollId", latestPoll.pollId))
              .collect();

            const voteCounts = new Array(latestPoll.options.length).fill(0);
            for (const pv of pollVotes) {
              if (pv.optionIndex >= 0 && pv.optionIndex < voteCounts.length) {
                voteCounts[pv.optionIndex]++;
              }
            }

            pollSnapshot = {
              id: latestPoll.pollId,
              question: latestPoll.question,
              options: latestPoll.options,
              voteCounts,
              totalVotes: pollVotes.length,
              active: latestPoll.active,
              userVoteIndex: null,
            };
          }

          return {
            ok: true,
            snapshot,
            poll: pollSnapshot,
          };
        }

        // ─── host:start ───────────────────────────────────────────
        case "host:start": {
          const { roomCode, hostToken, connectionId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          if (room.phase !== "lobby" && room.phase !== "reviewing") {
            return {
              ok: false,
              error: "Không thể bắt đầu lượt trong trạng thái hiện tại",
            };
          }

          const nextRound = room.currentRound + 1;
          if (nextRound > GAME_CONSTANTS.TOTAL_ROUNDS) {
            return { ok: false, error: "Đã hoàn tất toàn bộ 4 lượt chơi" };
          }

          // Close active polls
          const activePolls = await ctx.db
            .query("polls")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .filter((q) => q.eq(q.field("active"), true))
            .collect();

          for (const p of activePolls) {
            await ctx.db.patch(p._id, { active: false });
          }

          // Reset player hasVotedThisRound
          const players = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          for (const p of players) {
            if (p.hasVotedThisRound) {
              await ctx.db.patch(p._id, { hasVotedThisRound: false });
            }
          }

          const nextGeneration = room.generation + 1;
          const durationMs = GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000;
          const deadlineMs = now + durationMs;

          await ctx.db.patch(room._id, {
            phase: "playing",
            currentRound: nextRound,
            generation: nextGeneration,
            roundStartedAt: now,
            deadlineMs,
            pausedRemainingMs: null,
            currentAidRecords: [],
            aidThisRound: [],
            lastActivity: now,
          });

          // Schedule round expiration timer
          await ctx.scheduler.runAfter(
            durationMs,
            internal.scheduler.resolveRoundTimer,
            {
              roomCode,
              epoch: room.epoch,
              round: nextRound,
              generation: nextGeneration,
            }
          );

          return { ok: true };
        }

        // ─── host:pause ───────────────────────────────────────────
        case "host:pause": {
          const { roomCode, hostToken, connectionId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          if (room.phase !== "playing") {
            return { ok: false, error: "Phòng hiện không trong lượt chơi" };
          }

          // Check authoritative deadline
          if (room.deadlineMs !== null && now > room.deadlineMs) {
            await executeRoundResolution(ctx, room);
            return { ok: false, error: "Hết thời gian lượt chơi" };
          }

          const totalMs = GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000;
          const elapsed = now - (room.roundStartedAt ?? now);
          const pausedRemainingMs = Math.max(0, totalMs - elapsed);

          await ctx.db.patch(room._id, {
            phase: "paused",
            pausedRemainingMs,
            deadlineMs: null,
            roundStartedAt: null,
            generation: room.generation + 1,
            lastActivity: now,
          });

          return { ok: true };
        }

        // ─── host:resume ──────────────────────────────────────────
        case "host:resume": {
          const { roomCode, hostToken, connectionId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          if (room.phase !== "paused" || room.pausedRemainingMs === null) {
            return { ok: false, error: "Phòng không ở trạng thái tạm dừng" };
          }

          const remaining = room.pausedRemainingMs;
          const nextGeneration = room.generation + 1;
          const deadlineMs = now + remaining;

          await ctx.db.patch(room._id, {
            phase: "playing",
            pausedRemainingMs: null,
            deadlineMs,
            roundStartedAt: now - (GAME_CONSTANTS.ROUND_DURATION_SECONDS * 1000 - remaining),
            generation: nextGeneration,
            lastActivity: now,
          });

          await ctx.scheduler.runAfter(
            remaining,
            internal.scheduler.resolveRoundTimer,
            {
              roomCode,
              epoch: room.epoch,
              round: room.currentRound,
              generation: nextGeneration,
            }
          );

          return { ok: true };
        }

        // ─── host:endRound ────────────────────────────────────────
        case "host:endRound": {
          const { roomCode, hostToken, connectionId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          if (room.phase !== "playing" && room.phase !== "paused") {
            return {
              ok: false,
              error: "Không thể chốt lượt trong trạng thái hiện tại",
            };
          }

          await ctx.db.patch(room._id, {
            generation: room.generation + 1,
          });

          await executeRoundResolution(ctx, room);
          return { ok: true };
        }

        // ─── host:setLobbyLock ────────────────────────────────────
        case "host:setLobbyLock": {
          const { roomCode, hostToken, connectionId, locked } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          if (typeof locked !== "boolean") {
            return { ok: false, error: "Giá trị locked phải là boolean" };
          }

          await ctx.db.patch(room._id, {
            lobbyLocked: locked,
            lastActivity: now,
          });

          return { ok: true };
        }

        // ─── host:close ───────────────────────────────────────────
        case "host:close": {
          const { roomCode, hostToken, connectionId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          const roomPolls = await ctx.db
            .query("polls")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          for (const p of roomPolls) {
            if (p.active) {
              await ctx.db.patch(p._id, { active: false });
            }
          }

          await ctx.db.patch(room._id, {
            phase: "closed",
            generation: room.generation + 1,
            lastActivity: now,
          });

          return { ok: true };
        }

        // ─── host:reset ───────────────────────────────────────────
        case "host:reset": {
          const { roomCode, hostToken, connectionId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          // Keep repeated resets bounded: old epochs no longer need private ballots.
          const previousVotes = await ctx.db.query("votes")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode)).collect();
          for (const vote of previousVotes) await ctx.db.delete(vote._id);

          // Clean up all polls and pollVotes for fresh epoch
          const roomPolls = await ctx.db
            .query("polls")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();
          for (const p of roomPolls) await ctx.db.delete(p._id);

          const roomPollVotes = await ctx.db
            .query("pollVotes")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();
          for (const pv of roomPollVotes) await ctx.db.delete(pv._id);

          const players = await ctx.db
            .query("players")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          for (const p of players) {
            await ctx.db.patch(p._id, {
              hasVotedThisRound: false,
              hasInteracted: false,
            });
          }

          const initialTeams = createInitialTeams(room.numTeams);
          const nextPulseGen = room.pulseGeneration + 1;

          await ctx.db.patch(room._id, {
            phase: "lobby",
            currentRound: 0,
            roundStartedAt: null,
            pausedRemainingMs: null,
            deadlineMs: null,
            epoch: room.epoch + 1,
            generation: room.generation + 1,
            pulseGeneration: nextPulseGen,
            roundResults: [],
            currentAidRecords: [],
            aidThisRound: [],
            teams: initialTeams,
            finishedSummary: null,
            lastActivity: now,
          });

          // Schedule fresh pulse chain for the new epoch
          await ctx.scheduler.runAfter(
            30 * 1000,
            internal.scheduler.roomPulse,
            { roomCode, pulseGeneration: nextPulseGen }
          );

          return { ok: true };
        }

        // ─── player:vote ──────────────────────────────────────────
        case "player:vote": {
          const { roomCode, playerToken, connectionId, optionId } = payload;
          if (
            typeof roomCode !== "string" ||
            !is64Hex(playerToken) ||
            !isValidConnectionId(connectionId) ||
            typeof optionId !== "string"
          ) {
            return { ok: false, error: "Dữ liệu biểu quyết không hợp lệ" };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: false, error: "Phòng không tồn tại" };
          }
          if (room.phase !== "playing") {
            return { ok: false, error: "Lượt bỏ phiếu chưa mở" };
          }

          // Authoritative deadline check
          if (room.deadlineMs !== null && now > room.deadlineMs) {
            await executeRoundResolution(ctx, room);
            return { ok: false, error: "Hết thời gian biểu quyết" };
          }

          const player = await ctx.db
            .query("players")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("playerToken", playerToken.trim())
            )
            .first();

          if (!player) {
            return { ok: false, error: "Không tìm thấy người chơi" };
          }
          if (player.connectionId !== connectionId.trim()) {
            return {
              ok: false,
              error: "Phiên kết nối chưa được xác thực. Vui lòng kết nối lại.",
            };
          }
          if (player.hasVotedThisRound) {
            return { ok: false, error: "Bạn đã biểu quyết trong lượt này" };
          }

          const scenario = getDefaultScenarios()[room.currentRound - 1];
          if (!scenario || !scenario.options.some((o) => o.id === optionId)) {
            return { ok: false, error: "Phương án không hợp lệ" };
          }

          // Insert normalized vote
          await ctx.db.insert("votes", {
            roomCode,
            epoch: room.epoch,
            round: room.currentRound,
            team: player.team,
            playerToken: player.playerToken,
            optionId,
            timestamp: now,
          });

          // Patch player only (no contention on room doc!)
          await ctx.db.patch(player._id, {
            hasVotedThisRound: true,
            hasInteracted: true,
          });

          return { ok: true };
        }

        // ─── player:aid ───────────────────────────────────────────
        case "player:aid": {
          const { roomCode, playerToken, connectionId, toTeam, resource, amount } = payload;
          if (
            typeof roomCode !== "string" ||
            !is64Hex(playerToken) ||
            !isValidConnectionId(connectionId)
          ) {
            return { ok: false, error: "Dữ liệu viện trợ không hợp lệ" };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: false, error: "Phòng không tồn tại" };
          }
          if (room.phase !== "playing") {
            return { ok: false, error: "Viện trợ chỉ khả dụng trong lượt chơi" };
          }

          // Authoritative deadline check
          if (room.deadlineMs !== null && now > room.deadlineMs) {
            await executeRoundResolution(ctx, room);
            return { ok: false, error: "Hết thời gian viện trợ" };
          }

          const player = await ctx.db
            .query("players")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("playerToken", playerToken.trim())
            )
            .first();

          if (!player) {
            return { ok: false, error: "Không tìm thấy người chơi" };
          }
          if (player.connectionId !== connectionId.trim()) {
            return {
              ok: false,
              error: "Phiên kết nối chưa được xác thực. Vui lòng kết nối lại.",
            };
          }

          if (
            typeof toTeam !== "number" ||
            !Number.isInteger(toTeam) ||
            toTeam < 0 ||
            toTeam >= room.numTeams
          ) {
            return { ok: false, error: "Đội nhận không hợp lệ" };
          }

          const validResources: (keyof TeamResources)[] = ["food", "strength", "trust"];
          if (!validResources.includes(resource)) {
            return { ok: false, error: "Loại tài nguyên không hợp lệ" };
          }

          if (
            typeof amount !== "number" ||
            !Number.isInteger(amount) ||
            amount < 1 ||
            amount > GAME_CONSTANTS.MAX_AID_DONATION_PER_ROUND
          ) {
            return {
              ok: false,
              error: `Mức viện trợ phải từ 1 đến ${GAME_CONSTANTS.MAX_AID_DONATION_PER_ROUND} đơn vị`,
            };
          }

          // Aggregate donor team max 20 check across all aid donations this round
          const currentTeamAidTotal = room.currentAidRecords
            .filter((r) => r.fromTeam === player.team)
            .reduce((sum, r) => sum + r.amount, 0);

          if (currentTeamAidTotal + amount > GAME_CONSTANTS.MAX_AID_DONATION_PER_ROUND) {
            return {
              ok: false,
              error: `Vượt quá hạn mức viện trợ tối đa của đội trong lượt (${GAME_CONSTANTS.MAX_AID_DONATION_PER_ROUND} đơn vị)`,
            };
          }

          const fromTeam = room.teams[player.team] as TeamState;
          const targetTeam = room.teams[toTeam] as TeamState;
          if (!fromTeam || !targetTeam) {
            return { ok: false, error: "Đội không hợp lệ" };
          }

          const existingAidKeys = new Set(room.aidThisRound);
          const record = validateAid(
            fromTeam,
            targetTeam,
            resource,
            amount,
            room.currentRound,
            existingAidKeys
          );

          if (!record) {
            return {
              ok: false,
              error:
                "Viện trợ bị từ chối: không đủ tài nguyên, đã viện trợ đội này trong lượt, hoặc tự viện trợ",
            };
          }

          const teamsCopy: TeamState[] = room.teams.map((t) => ({
            index: t.index,
            name: t.name,
            resources: { ...t.resources },
            members: [...t.members],
            contributionScore: t.contributionScore,
          }));

          applyAid(teamsCopy[player.team], teamsCopy[toTeam], record);

          const newAidThisRound = [...room.aidThisRound, aidKey(room.currentRound, player.team, toTeam)];
          const newCurrentAidRecords = [...room.currentAidRecords, record];

          await ctx.db.patch(room._id, {
            teams: teamsCopy,
            aidThisRound: newAidThisRound,
            currentAidRecords: newCurrentAidRecords,
            lastActivity: now,
          });

          await ctx.db.patch(player._id, {
            hasInteracted: true,
          });

          return { ok: true };
        }

        // ─── poll:create ──────────────────────────────────────────
        case "poll:create": {
          const { roomCode, hostToken, connectionId, question, options } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          if (
            typeof question !== "string" ||
            question.trim().length === 0 ||
            question.length > 200
          ) {
            return { ok: false, error: "Câu hỏi phải từ 1-200 ký tự" };
          }

          if (
            !Array.isArray(options) ||
            options.length < 2 ||
            options.length > 6
          ) {
            return { ok: false, error: "Cần từ 2 đến 6 phương án khảo sát" };
          }

          for (const opt of options) {
            if (typeof opt !== "string" || opt.trim().length === 0 || opt.length > 100) {
              return { ok: false, error: "Phương án khảo sát không hợp lệ (yêu cầu chuỗi 1-100 ký tự)" };
            }
          }

          const roomPolls = await ctx.db
            .query("polls")
            .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
            .collect();

          if (roomPolls.length >= GAME_CONSTANTS.MAX_POLLS_PER_ROOM) {
            return {
              ok: false,
              error: "Đã đạt giới hạn số khảo sát cho phòng này",
            };
          }

          // Close prior active polls
          for (const p of roomPolls) {
            if (p.active) {
              await ctx.db.patch(p._id, { active: false });
            }
          }

          const pollId = `poll_${roomCode}_${now}_${Math.random().toString(36).substring(2, 6)}`;
          const cleanOptions = options.map((o) => o.trim());

          await ctx.db.insert("polls", {
            roomCode,
            pollId,
            question: question.trim(),
            options: cleanOptions,
            active: true,
            createdAt: now,
          });

          await ctx.db.patch(room._id, { lastActivity: now });

          return { ok: true, pollId };
        }

        // ─── poll:vote ────────────────────────────────────────────
        case "poll:vote": {
          const { roomCode, playerToken, connectionId, pollId, optionIndex } = payload;
          if (
            typeof roomCode !== "string" ||
            !is64Hex(playerToken) ||
            !isValidConnectionId(connectionId) ||
            typeof pollId !== "string"
          ) {
            return { ok: false, error: "Dữ liệu không hợp lệ" };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: false, error: "Phòng không tồn tại" };
          }

          const player = await ctx.db
            .query("players")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("playerToken", playerToken.trim())
            )
            .first();

          if (!player) {
            return { ok: false, error: "Người chơi không tồn tại" };
          }
          if (player.connectionId !== connectionId.trim()) {
            return {
              ok: false,
              error: "Phiên kết nối chưa được xác thực. Vui lòng kết nối lại.",
            };
          }

          const poll = await ctx.db
            .query("polls")
            .withIndex("by_pollId", (q) => q.eq("pollId", pollId))
            .first();

          if (!poll || poll.roomCode !== roomCode) {
            return { ok: false, error: "Khảo sát không tồn tại" };
          }
          if (!poll.active) {
            return { ok: false, error: "Khảo sát đã đóng" };
          }

          if (
            typeof optionIndex !== "number" ||
            !Number.isInteger(optionIndex) ||
            optionIndex < 0 ||
            optionIndex >= poll.options.length
          ) {
            return { ok: false, error: "Phương án không hợp lệ" };
          }

          const existingVote = await ctx.db
            .query("pollVotes")
            .withIndex("by_poll_player", (q) =>
              q.eq("pollId", pollId).eq("playerToken", player.playerToken)
            )
            .first();

          if (existingVote) {
            await ctx.db.patch(existingVote._id, {
              optionIndex,
              timestamp: now,
            });
          } else {
            await ctx.db.insert("pollVotes", {
              roomCode,
              pollId,
              playerToken: player.playerToken,
              optionIndex,
              timestamp: now,
            });
          }

          await ctx.db.patch(player._id, {
            hasInteracted: true,
          });

          return { ok: true };
        }

        // ─── poll:close ───────────────────────────────────────────
        case "poll:close": {
          const { roomCode, hostToken, connectionId, pollId } = payload;
          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (
            !room ||
            room.phase === "closed" ||
            room.hostToken !== (hostToken && String(hostToken).trim()) ||
            room.hostConnectionId !== (connectionId && String(connectionId).trim())
          ) {
            return { ok: false, error: "Chưa được ủy quyền" };
          }

          const poll = await ctx.db
            .query("polls")
            .withIndex("by_pollId", (q) => q.eq("pollId", pollId))
            .first();

          if (!poll || poll.roomCode !== roomCode) {
            return { ok: false, error: "Khảo sát không tồn tại" };
          }

          await ctx.db.patch(poll._id, { active: false });
          await ctx.db.patch(room._id, { lastActivity: now });

          return { ok: true };
        }

        // ─── session:heartbeat ────────────────────────────────────
        case "session:heartbeat": {
          const { roomCode, token, connectionId } = payload;
          if (
            typeof roomCode !== "string" ||
            !is64Hex(token) ||
            !isValidConnectionId(connectionId)
          ) {
            return { ok: false, error: "Dữ liệu không hợp lệ" };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: false, error: "Phòng không tồn tại" };
          }

          const cleanToken = token.trim();
          const cleanConn = connectionId.trim();

          if (room.hostToken === cleanToken) {
            if (room.hostConnectionId !== cleanConn) {
              return { ok: false, error: "Phiên kết nối của chủ phòng không khớp" };
            }

            // Update ONLY presence record! Do NOT write to rooms doc (preserves reactive query cache)
            const hostPresence = await ctx.db
              .query("presence")
              .withIndex("by_room_token", (q) =>
                q.eq("roomCode", roomCode).eq("token", cleanToken)
              )
              .first();

            if (hostPresence) {
              await ctx.db.patch(hostPresence._id, {
                connectionId: cleanConn,
                lastHeartbeat: now,
              });
            } else {
              await ctx.db.insert("presence", {
                roomCode,
                token: cleanToken,
                connectionId: cleanConn,
                lastHeartbeat: now,
                isHost: true,
              });
            }

            return { ok: true };
          }

          const player = await ctx.db
            .query("players")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("playerToken", cleanToken)
            )
            .first();

          if (player) {
            if (player.connectionId !== cleanConn) {
              return { ok: false, error: "Phiên kết nối của người chơi không khớp" };
            }

            // Update ONLY presence record!
            const playerPresence = await ctx.db
              .query("presence")
              .withIndex("by_room_token", (q) =>
                q.eq("roomCode", roomCode).eq("token", cleanToken)
              )
              .first();

            if (playerPresence) {
              await ctx.db.patch(playerPresence._id, {
                connectionId: cleanConn,
                lastHeartbeat: now,
              });
            } else {
              await ctx.db.insert("presence", {
                roomCode,
                token: cleanToken,
                connectionId: cleanConn,
                lastHeartbeat: now,
                isHost: false,
              });
            }

            // Only patch player doc if state actually changes (was disconnected)
            if (!player.connected) {
              await ctx.db.patch(player._id, {
                connected: true,
              });
            }

            return { ok: true };
          }

          return { ok: false, error: "Mã định danh không hợp lệ" };
        }

        // ─── session:disconnect ───────────────────────────────────
        case "session:disconnect": {
          const { roomCode, token, connectionId } = payload;
          if (
            typeof roomCode !== "string" ||
            !is64Hex(token) ||
            !isValidConnectionId(connectionId)
          ) {
            return { ok: true };
          }

          const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", roomCode))
            .first();

          if (!room || room.phase === "closed") {
            return { ok: true };
          }

          const cleanToken = token.trim();
          const cleanConn = connectionId.trim();

          if (room.hostToken === cleanToken) {
            // Keep hostConnectionId intact so that host:reconnect is required to re-establish.
            return { ok: true };
          }

          const player = await ctx.db
            .query("players")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("playerToken", cleanToken)
            )
            .first();

          if (player && player.connectionId === cleanConn) {
            // Disconnect only own connection; do not kick new reconnect!
            await ctx.db.patch(player._id, { connected: false });

            // Mark player presence stale
            const playerPresence = await ctx.db
              .query("presence")
              .withIndex("by_room_token", (q) =>
                q.eq("roomCode", roomCode).eq("token", cleanToken)
              )
              .first();

            if (playerPresence) {
              await ctx.db.patch(playerPresence._id, { lastHeartbeat: 0 });
            }
          }

          return { ok: true };
        }

        default:
          return { ok: false, error: `Sự kiện không được hỗ trợ: ${event}` };
      }
    } catch (err: any) {
      return {
        ok: false,
        error: typeof err?.message === "string" ? err.message : "Lỗi hệ thống",
      };
    }
  },
});
