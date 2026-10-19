import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

function hex64(num: number): string {
  return num.toString(16).padStart(64, '0');
}

describe('Convex Concurrency & Capacity Acceptance', () => {
  it('handles 60 concurrent votes without OCC conflict and allows 61st join up to 200 capacity', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(1000);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Join 60 players (15 per team across 4 teams)
    const players: { token: string; conn: string; team: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const token = hex64(1001 + i);
      const conn = `conn_${i + 1}`;
      const team = i % 4;
      players.push({ token, conn, team });

      const joinRes = await t.mutation(api.game.command, {
        event: 'room:join',
        payload: {
          roomCode,
          nickname: `Student_${i + 1}`,
          team,
          playerToken: token,
          connectionId: conn,
        },
      });
      expect(joinRes.ok).toBe(true);
    }

    // Finding 7 test: 61st player joins successfully during lobby (capacity is 200, not 60)
    const p61Token = hex64(1061);
    const join61 = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: {
        roomCode,
        nickname: 'Student_61',
        team: 0,
        playerToken: p61Token,
        connectionId: 'conn_61',
      },
    });
    expect(join61.ok).toBe(true);

    // Host starts round 1
    const startRes = await t.mutation(api.game.command, {
      event: 'host:start',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });
    expect(startRes.ok).toBe(true);

    // Cast 60 votes CONCURRENTLY via Promise.all
    const votePromises = players.map((p, idx) => {
      // Alternate options: idx % 3 === 0 ? 'r1a' : idx % 3 === 1 ? 'r1b' : 'r1c'
      const optionId = idx % 3 === 0 ? 'r1a' : idx % 3 === 1 ? 'r1b' : 'r1c';
      return t.mutation(api.game.command, {
        event: 'player:vote',
        payload: {
          roomCode,
          playerToken: p.token,
          connectionId: p.conn,
          optionId,
        },
      });
    });

    const voteResults = await Promise.all(votePromises);
    for (const res of voteResults) {
      expect(res.ok).toBe(true);
    }

    // Host ends round and verifies vote counts
    await t.mutation(api.game.command, {
      event: 'host:endRound',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });

    const env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env).not.toBeNull();

    const round1Result = env!.snapshot.roundResults[0];
    let totalVotesTallied = 0;
    for (let tIdx = 0; tIdx < 4; tIdx++) {
      const teamVotes = round1Result.voteSummary[String(tIdx)];
      for (const count of Object.values(teamVotes)) {
        totalVotesTallied += count;
      }
    }
    expect(totalVotesTallied).toBe(60);
  });

  it('strictly caps players at 200 and rejects the 201st join', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(2000);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Directly insert 200 players into the database to test the cap efficiently
    await t.run(async (ctx) => {
      for (let i = 0; i < 200; i++) {
        await ctx.db.insert('players', {
          roomCode,
          playerToken: hex64(3000 + i),
          playerId: `p_${i}`,
          nickname: `N_${i}`,
          team: i % 4,
          connected: true,
          connectionId: `c_${i}`,
          lastHeartbeat: Date.now(),
          hasVotedThisRound: false,
          hasInteracted: false,
        });
      }
    });

    // 201st player attempt should be rejected
    const join201 = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: {
        roomCode,
        nickname: 'Student_201',
        team: 0,
        playerToken: hex64(9999),
        connectionId: 'conn_201',
      },
    });
    expect(join201.ok).toBe(false);
    expect(join201.error).toContain('Phòng đã đầy');
  });
});
