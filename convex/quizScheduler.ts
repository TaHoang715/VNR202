import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { anyApi } from "convex/server";
import { QUIZ_CONSTANTS } from "../shared/quizData";

/**
 * Authoritative 25s question timer resolution:
 * When the answering window elapses, transition to 'revealing' phase.
 * Schedule 8s reveal timer.
 * Guarded by epoch, questionIndex, and generation.
 */
export const resolveQuestionTimer = internalMutation({
  args: {
    roomCode: v.string(),
    epoch: v.number(),
    questionIndex: v.number(),
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("quizRooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) return;
    if (
      room.phase !== "question" ||
      room.epoch !== args.epoch ||
      room.currentQuestionIndex !== args.questionIndex ||
      room.generation !== args.generation
    ) {
      // Stale timer due to early submit/skip/close/reset; safely no-op
      return;
    }

    const now = Date.now();
    const nextGeneration = room.generation + 1;
    const revealDeadlineMs = now + QUIZ_CONSTANTS.REVEAL_DURATION_MS;

    await ctx.db.patch(room._id, {
      phase: "revealing",
      revealDeadlineMs,
      generation: nextGeneration,
      lastActivity: now,
    });

    // Schedule automatic transition after 8 seconds reveal
    await ctx.scheduler.runAfter(
      QUIZ_CONSTANTS.REVEAL_DURATION_MS,
      anyApi.quizScheduler.resolveRevealTimer,
      {
        roomCode: args.roomCode,
        epoch: room.epoch,
        questionIndex: room.currentQuestionIndex,
        generation: nextGeneration,
      }
    );
  },
});

/**
 * Clear the reveal countdown while preserving host-controlled results:
 * The host explicitly advances or finishes the quiz; this timer never changes rounds.
 * Guarded by epoch, questionIndex, and generation.
 */
export const resolveRevealTimer = internalMutation({
  args: {
    roomCode: v.string(),
    epoch: v.number(),
    questionIndex: v.number(),
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("quizRooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) return;
    if (
      room.phase !== "revealing" ||
      room.epoch !== args.epoch ||
      room.currentQuestionIndex !== args.questionIndex ||
      room.generation !== args.generation
    ) {
      // Stale timer due to host advance/close/reset; safely no-op
      return;
    }

    // Keep results visible until the host explicitly advances the round.
    await ctx.db.patch(room._id, { revealDeadlineMs: null });
  },
});

/**
 * Bounded TTL cleanup & presence pulse:
 * Every 30s checks room TTL (30 min or 5 min if closed).
 * Marks inactive players offline if no heartbeat > 60s.
 */
export const quizRoomPulse = internalMutation({
  args: {
    roomCode: v.string(),
    pulseGeneration: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("quizRooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) return;
    if (room.pulseGeneration !== args.pulseGeneration) {
      return; // Stale pulse chain
    }

    const now = Date.now();
    const presenceList = await ctx.db
      .query("quizPresence")
      .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
      .collect();

    let latestActivity = room.lastActivity;
    for (const pr of presenceList) {
      if (pr.lastHeartbeat > latestActivity) {
        latestActivity = pr.lastHeartbeat;
      }
    }

    const isExpired =
      now - latestActivity > QUIZ_CONSTANTS.ROOM_TTL_MS ||
      (room.phase === "closed" && now - latestActivity > 5 * 60 * 1000);

    if (isExpired) {
      // Clean up all related documents
      const players = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const p of players) await ctx.db.delete(p._id);

      const answers = await ctx.db
        .query("quizAnswers")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const a of answers) await ctx.db.delete(a._id);

      const polls = await ctx.db
        .query("quizPolls")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const p of polls) await ctx.db.delete(p._id);

      const pollVotes = await ctx.db
        .query("quizPollVotes")
        .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
        .collect();
      for (const pv of pollVotes) await ctx.db.delete(pv._id);

      for (const pr of presenceList) await ctx.db.delete(pr._id);

      await ctx.db.delete(room._id);
      return; // End of chain
    }

    // Check player connection timeout (60s)
    const players = await ctx.db
      .query("quizPlayers")
      .withIndex("by_room", (q) => q.eq("roomCode", args.roomCode))
      .collect();

    for (const p of players) {
      if (p.connected) {
        const pres = presenceList.find((pr) => !pr.isHost && pr.token === p.playerToken);
        const lastHb = pres?.lastHeartbeat ?? p.lastHeartbeat;
        if (now - lastHb > 60000) {
          await ctx.db.patch(p._id, { connected: false });
        }
      }
    }

    // Continue pulse chain
    await ctx.scheduler.runAfter(
      30 * 1000,
      anyApi.quizScheduler.quizRoomPulse,
      {
        roomCode: args.roomCode,
        pulseGeneration: room.pulseGeneration,
      }
    );
  },
});
