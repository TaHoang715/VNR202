import { internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  getDefaultScenarios,
  resolveRound,
  roundResultToSnapshot,
  teamToSnapshot,
  checkSurvival,
  checkVictory,
} from "./engine";
import { GAME_CONSTANTS } from "./types";
import { TeamState, Vote } from "../server/src/types";

export async function executeRoundResolution(
  ctx: MutationCtx,
  room: Doc<"rooms">
) {
  // Exactly-once guard: only resolve if room is currently playing or paused
  if (room.phase !== "playing" && room.phase !== "paused") {
    return;
  }

  const scenario = getDefaultScenarios()[room.currentRound - 1];
  if (!scenario) return;

  const votes = await ctx.db
    .query("votes")
    .withIndex("by_room_epoch_round", (q) =>
      q.eq("roomCode", room.code).eq("epoch", room.epoch).eq("round", room.currentRound)
    )
    .collect();

  const votesByTeam = new Map<number, Vote[]>();
  for (const v of votes) {
    const list = votesByTeam.get(v.team) ?? [];
    list.push({
      playerToken: v.playerToken,
      optionId: v.optionId,
      timestamp: v.timestamp,
    });
    votesByTeam.set(v.team, list);
  }

  const teamsCopy: TeamState[] = room.teams.map((t) => ({
    index: t.index,
    name: t.name,
    resources: { ...t.resources },
    members: [...t.members],
    contributionScore: t.contributionScore,
  }));

  const roundResult = resolveRound(
    teamsCopy,
    scenario,
    votesByTeam,
    room.currentAidRecords
  );

  const snapshotResult = roundResultToSnapshot(roundResult);
  const newRoundResults = [...room.roundResults, snapshotResult];

  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomCode", room.code))
    .collect();

  for (const player of players) {
    if (player.hasVotedThisRound) {
      await ctx.db.patch(player._id, { hasVotedThisRound: false });
    }
  }

  const survived = checkSurvival(teamsCopy);
  const isFinished = !survived || room.currentRound >= GAME_CONSTANTS.TOTAL_ROUNDS;

  let finishedSummary = null;
  let newPhase: "reviewing" | "finished" = "reviewing";

  if (isFinished) {
    newPhase = "finished";
    const victory = checkVictory(teamsCopy);
    const totalJoined = players.length;
    let totalInteracted = 0;
    for (const p of players) {
      if (p.hasInteracted) totalInteracted++;
    }

    const teamSnapshots = teamsCopy.map((t) => {
      const snap = teamToSnapshot(t);
      snap.memberCount = players.filter((p) => p.team === t.index).length;
      return snap;
    });

    finishedSummary = {
      victory,
      teams: teamSnapshots,
      roundResults: newRoundResults,
      stats: {
        totalJoined,
        totalInteracted,
        classSize: room.classSize,
      },
    };
  }

  await ctx.db.patch(room._id, {
    phase: newPhase,
    teams: teamsCopy,
    roundResults: newRoundResults,
    currentAidRecords: [],
    aidThisRound: [],
    roundStartedAt: null,
    pausedRemainingMs: null,
    deadlineMs: null,
    finishedSummary,
    lastActivity: Date.now(),
  });
}

export const resolveRoundTimer = internalMutation({
  args: {
    roomCode: v.string(),
    epoch: v.number(),
    round: v.number(),
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) return;
    if (
      room.phase !== "playing" ||
      room.epoch !== args.epoch ||
      room.currentRound !== args.round ||
      room.generation !== args.generation
    ) {
      // Stale timer due to pause/reset/force end; safely no-op
      return;
    }

    await executeRoundResolution(ctx, room);
  },
});

export const roomPulse = internalMutation({
  args: {
    roomCode: v.string(),
    pulseGeneration: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) return;
    if (room.pulseGeneration !== args.pulseGeneration) {
      // Stale pulse job from prior generation; stop chain
      return;
    }

    const now = Date.now();
    const isExpired =
      now - room.lastActivity > GAME_CONSTANTS.ROOM_TTL_MS ||
      (room.phase === "closed" && now - room.lastActivity > 5 * 60 * 1000);

    if (isExpired) {
      // Bounded cleanup: delete associated documents and room doc
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const p of players) await ctx.db.delete(p._id);

      const votes = await ctx.db
        .query("votes")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const v of votes) await ctx.db.delete(v._id);

      const polls = await ctx.db
        .query("polls")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const p of polls) await ctx.db.delete(p._id);

      const pollVotes = await ctx.db
        .query("pollVotes")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const pv of pollVotes) await ctx.db.delete(pv._id);

      await ctx.db.delete(room._id);
      return; // chain ends
    }

    // Presence timeout: ~60s
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
      .collect();

    for (const player of players) {
      if (player.connected && now - player.lastHeartbeat > 60_000) {
        await ctx.db.patch(player._id, { connected: false });
      }
    }

    // Re-schedule next pulse in persistent chain
    await ctx.scheduler.runAfter(
      30 * 1000,
      internal.scheduler.roomPulse,
      {
        roomCode: args.roomCode,
        pulseGeneration: room.pulseGeneration,
      }
    );
  },
});
