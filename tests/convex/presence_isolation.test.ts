import { describe, it, expect, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

function hex64(num: number): string {
  return num.toString(16).padStart(64, '0');
}

describe('Convex Presence Isolation & Reactive Performance Acceptance', () => {
  it('heartbeat writes only presence table leaving rooms and players docs unchanged', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const hostToken = hex64(7000);
      const createRes = await t.mutation(api.game.command, {
        event: 'room:create',
        payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
      });
      const roomCode = createRes.roomCode;

      const pToken = hex64(7001);
      await t.mutation(api.game.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'StableSub', team: 0, playerToken: pToken, connectionId: 'pconn' },
      });

      // Capture room and player documents before heartbeat
      const roomBefore = await t.run(async (ctx) => {
        return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
      });

      const playerBefore = await t.run(async (ctx) => {
        return await ctx.db
          .query('players')
          .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('playerToken', pToken))
          .first();
      });

      const playerPresenceBefore = await t.run(async (ctx) => {
        return await ctx.db
          .query('presence')
          .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', pToken))
          .first();
      });

      // Advance time by 20 seconds
      vi.advanceTimersByTime(20 * 1000);
      const now20 = Date.now();

      // Send player heartbeat
      const hbRes = await t.mutation(api.game.command, {
        event: 'session:heartbeat',
        payload: { roomCode, token: pToken, connectionId: 'pconn' },
      });
      expect(hbRes.ok).toBe(true);

      // Verify room document is COMPLETELY UNTOUCHED
      const roomAfter = await t.run(async (ctx) => {
        return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
      });
      expect(roomAfter!.lastActivity).toBe(roomBefore!.lastActivity);
      expect(roomAfter!.hostLastHeartbeat).toBe(roomBefore!.hostLastHeartbeat);
      expect(roomAfter!._creationTime).toBe(roomBefore!._creationTime);

      // Verify player document is COMPLETELY UNTOUCHED (zero reactive invalidation!)
      const playerAfter = await t.run(async (ctx) => {
        return await ctx.db
          .query('players')
          .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('playerToken', pToken))
          .first();
      });
      expect(playerAfter!.lastHeartbeat).toBe(playerBefore!.lastHeartbeat);
      expect(playerAfter!.connected).toBe(true);

      // Verify presence table record was updated
      const playerPresenceAfter = await t.run(async (ctx) => {
        return await ctx.db
          .query('presence')
          .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', pToken))
          .first();
      });
      expect(playerPresenceAfter!.lastHeartbeat).toBeGreaterThan(playerPresenceBefore!.lastHeartbeat);
      expect(playerPresenceAfter!.lastHeartbeat).toBe(now20);

      // Advance time and send host heartbeat
      vi.advanceTimersByTime(20 * 1000);
      const now40 = Date.now();

      const hostHb = await t.mutation(api.game.command, {
        event: 'session:heartbeat',
        payload: { roomCode, token: hostToken, connectionId: 'hconn' },
      });
      expect(hostHb.ok).toBe(true);

      // Verify room doc still not modified
      const roomAfterHostHb = await t.run(async (ctx) => {
        return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
      });
      expect(roomAfterHostHb!.lastActivity).toBe(roomBefore!.lastActivity);

      // Verify host presence was updated
      const hostPresence = await t.run(async (ctx) => {
        return await ctx.db
          .query('presence')
          .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', hostToken))
          .first();
      });
      expect(hostPresence!.lastHeartbeat).toBe(now40);
    } finally {
      vi.useRealTimers();
    }
  });

  it('TTL pulse preserves room with old lastActivity but fresh active presence', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(7100);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    const pToken = hex64(7101);
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'ActiveSub', team: 0, playerToken: pToken, connectionId: 'pconn' },
    });

    const now = Date.now();

    // Set room lastActivity to 40 minutes ago (far older than 30 min TTL)
    await t.run(async (ctx) => {
      const r = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
      await ctx.db.patch(r!._id, { lastActivity: now - 40 * 60 * 1000 });

      // Keep player presence fresh (e.g. 10 seconds ago)
      const pr = await ctx.db
        .query('presence')
        .withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', pToken))
        .first();
      await ctx.db.patch(pr!._id, { lastHeartbeat: now - 10 * 1000 });
    });

    // Run pulse
    await t.mutation(internal.scheduler.roomPulse, {
      roomCode,
      pulseGeneration: 1,
    });

    // Room MUST STILL EXIST because active presence keeps it alive!
    const roomInDb = await t.run(async (ctx) => {
      return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
    });
    expect(roomInDb).not.toBeNull();
    expect(roomInDb!.code).toBe(roomCode);
  });

  it('room with all presence stale expires and deletes all associated docs', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(7200);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    const pToken = hex64(7201);
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'StalePlayer', team: 0, playerToken: pToken, connectionId: 'pconn' },
    });

    const now = Date.now();

    // Set room lastActivity and all presence to 35 minutes ago
    await t.run(async (ctx) => {
      const r = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
      await ctx.db.patch(r!._id, { lastActivity: now - 35 * 60 * 1000 });

      const presences = await ctx.db.query('presence').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect();
      for (const pr of presences) {
        await ctx.db.patch(pr._id, { lastHeartbeat: now - 35 * 60 * 1000 });
      }
    });

    // Run pulse
    await t.mutation(internal.scheduler.roomPulse, {
      roomCode,
      pulseGeneration: 1,
    });

    // Verify room and all related tables are completely cleaned up
    const roomInDb = await t.run(async (ctx) => {
      return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).first();
    });
    expect(roomInDb).toBeNull();

    const playersInDb = await t.run(async (ctx) => {
      return await ctx.db.query('players').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect();
    });
    expect(playersInDb).toHaveLength(0);

    const presenceInDb = await t.run(async (ctx) => {
      return await ctx.db.query('presence').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect();
    });
    expect(presenceInDb).toHaveLength(0);
  });

  it('rejects heartbeat from replaced connection and prevents refreshing presence', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(7300);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn_1' },
    });
    const roomCode = createRes.roomCode;

    // Host reconnects with hconn_2
    await t.mutation(api.game.command, {
      event: 'host:reconnect',
      payload: { roomCode, hostToken, connectionId: 'hconn_2' },
    });

    // Old connection hconn_1 sends heartbeat -> rejected!
    const oldHb = await t.mutation(api.game.command, {
      event: 'session:heartbeat',
      payload: { roomCode, token: hostToken, connectionId: 'hconn_1' },
    });
    expect(oldHb.ok).toBe(false);
    expect(oldHb.error).toContain('không khớp');
  });
});
