import { describe, it, expect, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

function hex64(num: number): string {
  return num.toString(16).padStart(64, '0');
}

describe('Convex Schedulers, Timers, Lifecycle & Presence Acceptance', () => {
  it('automatically resolves round on 90s timer expiration', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const hostToken = hex64(500);
      const createRes = await t.mutation(api.game.command, {
        event: 'room:create',
        payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
      });
      const roomCode = createRes.roomCode;

      await t.mutation(api.game.command, {
        event: 'host:start',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });

      // Initially playing
      let env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('playing');
      expect(env!.snapshot.currentRound).toBe(1);

      // Advance fake timers by 90 seconds and finish in-progress scheduled functions
      vi.advanceTimersByTime(90 * 1000);
      await t.finishInProgressScheduledFunctions();

      // Round should now be automatically resolved
      env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('reviewing');
      expect(env!.snapshot.roundResults.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('correctly pauses, freezes timer, and resumes with remaining duration', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const hostToken = hex64(600);
      const createRes = await t.mutation(api.game.command, {
        event: 'room:create',
        payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
      });
      const roomCode = createRes.roomCode;

      await t.mutation(api.game.command, {
        event: 'host:start',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });

      // Elapse 30 seconds
      vi.advanceTimersByTime(30 * 1000);

      // Host pauses
      const pauseRes = await t.mutation(api.game.command, {
        event: 'host:pause',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });
      expect(pauseRes.ok).toBe(true);

      let env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('paused');
      // Paused remaining ms should be around 60s
      expect(env!.snapshot.roundTimeRemainingMs).toBeLessThanOrEqual(60 * 1000);
      expect(env!.snapshot.roundTimeRemainingMs).toBeGreaterThan(50 * 1000);

      // Advance time past the original 90s deadline (e.g. 70 more seconds)
      vi.advanceTimersByTime(70 * 1000);
      await t.finishInProgressScheduledFunctions();

      // Room should STILL be paused, NOT resolved!
      env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('paused');
      expect(env!.snapshot.roundResults.length).toBe(0);

      // Host resumes
      const resumeRes = await t.mutation(api.game.command, {
        event: 'host:resume',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });
      expect(resumeRes.ok).toBe(true);

      env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('playing');

      // Now advance by remaining time and finish in-progress scheduled functions
      vi.advanceTimersByTime(65 * 1000);
      await t.finishInProgressScheduledFunctions();

      // Round should now be resolved!
      env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('reviewing');
      expect(env!.snapshot.roundResults.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('guarantees exactly-once resolution when manual host:endRound preempts scheduled timer', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const hostToken = hex64(700);
      const createRes = await t.mutation(api.game.command, {
        event: 'room:create',
        payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
      });
      const roomCode = createRes.roomCode;

      await t.mutation(api.game.command, {
        event: 'host:start',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });

      // Host manually ends round at 10s
      vi.advanceTimersByTime(10 * 1000);
      const endRes = await t.mutation(api.game.command, {
        event: 'host:endRound',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });
      expect(endRes.ok).toBe(true);

      let env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.phase).toBe('reviewing');
      expect(env!.snapshot.roundResults.length).toBe(1);

      // Now advance timers to drain the old 90s timer job
      vi.advanceTimersByTime(90 * 1000);
      await t.finishInProgressScheduledFunctions();

      // Verify old timer no-ops and did NOT add a duplicate round result
      env = await t.query(api.game.subscribe, {
        roomCode,
        token: hostToken,
        connectionId: 'hconn',
      });
      expect(env!.snapshot.roundResults.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs complete 4 rounds to victory and verifies finishedSummary', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(800);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Join 4 players (1 per team)
    for (let i = 0; i < 4; i++) {
      await t.mutation(api.game.command, {
        event: 'room:join',
        payload: {
          roomCode,
          nickname: `P${i}`,
          team: i,
          playerToken: hex64(801 + i),
          connectionId: `c_${i}`,
        },
      });
    }

    // Play all 4 rounds using default choices (which conserve resources and ensure survival)
    for (let r = 1; r <= 4; r++) {
      await t.mutation(api.game.command, {
        event: 'host:start',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });
      await t.mutation(api.game.command, {
        event: 'host:endRound',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });
    }

    const env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env!.snapshot.phase).toBe('finished');
    expect(env!.snapshot.roundResults.length).toBe(4);
    expect(env!.finished).not.toBeNull();
    expect(env!.finished!.victory).toBe(true);
    expect(env!.finished!.teams.length).toBe(4);
    expect(env!.finished!.stats.totalJoined).toBe(4);
  });

  it('handles room reset (increments epoch) and host:close', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(900);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    await t.mutation(api.game.command, {
      event: 'host:start',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });

    // Reset room
    const resetRes = await t.mutation(api.game.command, {
      event: 'host:reset',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });
    expect(resetRes.ok).toBe(true);

    let env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env!.snapshot.phase).toBe('lobby');
    expect(env!.snapshot.currentRound).toBe(0);
    expect(env!.epoch).toBe(2); // Epoch incremented!

    // Host close
    const closeRes = await t.mutation(api.game.command, {
      event: 'host:close',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });
    expect(closeRes.ok).toBe(true);

    // After close, subscribe returns null
    env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env).toBeNull();
  });

  it('roomPulse updates disconnected presence and cleans up expired rooms', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(950);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    const pToken = hex64(951);
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Absentee', team: 0, playerToken: pToken, connectionId: 'c1' },
    });

    // Set player presence heartbeat to 65s ago
    await t.run(async (ctx) => {
      const pr = await ctx.db
        .query('presence')
        .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', pToken))
        .first();
      if (pr) await ctx.db.patch(pr._id, { lastHeartbeat: Date.now() - 65 * 1000 });
      const p = await ctx.db
        .query('players')
        .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('playerToken', pToken))
        .first();
      if (p) await ctx.db.patch(p._id, { lastHeartbeat: Date.now() - 65 * 1000 });
    });

    // Run roomPulse mutation directly
    await t.mutation(internal.scheduler.roomPulse, {
      roomCode,
      pulseGeneration: 1,
    });

    // Player should now be marked connected: false
    const env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env!.snapshot.players[0].connected).toBe(false);

    // Set room lastActivity AND all presence to 31 min ago (expired TTL)
    await t.run(async (ctx) => {
      const r = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
      await ctx.db.patch(r!._id, { lastActivity: Date.now() - 31 * 60 * 1000 });
      const presences = await ctx.db.query('presence').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect();
      for (const pr of presences) {
        await ctx.db.patch(pr._id, { lastHeartbeat: Date.now() - 31 * 60 * 1000 });
      }
    });

    // Run roomPulse again
    await t.mutation(internal.scheduler.roomPulse, {
      roomCode,
      pulseGeneration: 1,
    });

    // Room should be completely deleted from DB
    const roomInDb = await t.run(async (ctx) => {
      return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
    });
    expect(roomInDb).toBeNull();
  });
});
