import { describe, it, expect, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

function hex64(num: number): string {
  return num.toString(16).padStart(64, '0');
}

describe('Convex Rules, Voting & Aid Acceptance', () => {
  it('handles 10 uneven players, majority votes, ties and zero-vote default fallback', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(100);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Join 10 uneven players across 4 teams:
    // Team 0: 3 players (1..3)
    // Team 1: 2 players (4..5)
    // Team 2: 3 players (6..8)
    // Team 3: 2 players (9..10)
    const teamDistribution = [0, 0, 0, 1, 1, 2, 2, 2, 3, 3];
    const playerTokens: string[] = [];

    for (let i = 0; i < 10; i++) {
      const pToken = hex64(i + 1);
      playerTokens.push(pToken);
      const joinRes = await t.mutation(api.game.command, {
        event: 'room:join',
        payload: {
          roomCode,
          nickname: `Player_${i + 1}`,
          team: teamDistribution[i],
          playerToken: pToken,
          connectionId: `conn_${i + 1}`,
        },
      });
      expect(joinRes.ok).toBe(true);
    }

    // Host starts round 1
    const startRes = await t.mutation(api.game.command, {
      event: 'host:start',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });
    expect(startRes.ok).toBe(true);

    // Round 1 options: r1a (0), r1b (1), r1c (2 - default)
    // Team 0 (3 players): 2 vote r1a, 1 votes r1b -> Majority r1a
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[0], connectionId: 'conn_1', optionId: 'r1a' },
    });
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[1], connectionId: 'conn_2', optionId: 'r1a' },
    });
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[2], connectionId: 'conn_3', optionId: 'r1b' },
    });

    // Reject duplicate vote
    const dupVote = await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[0], connectionId: 'conn_1', optionId: 'r1c' },
    });
    expect(dupVote.ok).toBe(false);
    expect(dupVote.error).toContain('đã biểu quyết');

    // Team 1 (2 players): 1 votes r1a, 1 votes r1b -> Tie -> resolves to default option r1c
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[3], connectionId: 'conn_4', optionId: 'r1a' },
    });
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[4], connectionId: 'conn_5', optionId: 'r1b' },
    });

    // Team 2 (3 players): all 3 vote r1b -> Majority r1b
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[5], connectionId: 'conn_6', optionId: 'r1b' },
    });
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[6], connectionId: 'conn_7', optionId: 'r1b' },
    });
    await t.mutation(api.game.command, {
      event: 'player:vote',
      payload: { roomCode, playerToken: playerTokens[7], connectionId: 'conn_8', optionId: 'r1b' },
    });

    // Team 3 (2 players): 0 votes -> resolves to default option r1c

    // End round
    const endRes = await t.mutation(api.game.command, {
      event: 'host:endRound',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });
    expect(endRes.ok).toBe(true);

    const env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env).not.toBeNull();
    const result = env!.snapshot.roundResults[0];
    expect(result.teamChoices['0']).toBe('r1a'); // Majority
    expect(result.teamChoices['1']).toBe('r1c'); // Tie -> default
    expect(result.teamChoices['2']).toBe('r1b'); // Majority
    expect(result.teamChoices['3']).toBe('r1c'); // No votes -> default
  });

  it('enforces aggregate team donor budget of 20 and validation rules for aid', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(200);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Join 2 players on Team 0 and 1 player on Team 1, 1 player on Team 2
    const p1 = hex64(201); // Team 0
    const p2 = hex64(202); // Team 0
    const p3 = hex64(203); // Team 1
    const p4 = hex64(204); // Team 2

    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'T0_P1', team: 0, playerToken: p1, connectionId: 'c1' },
    });
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'T0_P2', team: 0, playerToken: p2, connectionId: 'c2' },
    });
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'T1_P1', team: 1, playerToken: p3, connectionId: 'c3' },
    });
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'T2_P1', team: 2, playerToken: p4, connectionId: 'c4' },
    });

    await t.mutation(api.game.command, {
      event: 'host:start',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });

    // 1. Self-aid rejected
    const selfAid = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p1, connectionId: 'c1', toTeam: 0, resource: 'food', amount: 5 },
    });
    expect(selfAid.ok).toBe(false);

    // 2. Amount > 20 rejected
    const over20 = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p1, connectionId: 'c1', toTeam: 1, resource: 'food', amount: 25 },
    });
    expect(over20.ok).toBe(false);

    // 3. Valid aid: P1 sends 5 food from Team 0 to Team 1
    const aid1 = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p1, connectionId: 'c1', toTeam: 1, resource: 'food', amount: 5 },
    });
    expect(aid1.ok).toBe(true);

    // 4. Duplicate aid to same recipient in same round rejected
    const dupAid = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p2, connectionId: 'c2', toTeam: 1, resource: 'strength', amount: 5 },
    });
    expect(dupAid.ok).toBe(false);
    expect(dupAid.error).toContain('đã viện trợ đội này trong lượt');

    // 5. Finding 2 test: P2 sends 16 food from Team 0 to Team 2
    // Since Team 0 already sent 5, 5 + 16 = 21 > 20 -> must be rejected!
    const overBudgetAid = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p2, connectionId: 'c2', toTeam: 2, resource: 'food', amount: 16 },
    });
    expect(overBudgetAid.ok).toBe(false);
    expect(overBudgetAid.error).toContain('hạn mức viện trợ tối đa của đội');

    // 6. P2 sends 15 food from Team 0 to Team 2 (5 + 15 = 20 <= 20) -> accepted!
    const maxBudgetAid = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p2, connectionId: 'c2', toTeam: 2, resource: 'food', amount: 15 },
    });
    expect(maxBudgetAid.ok).toBe(true);

    // 7. Team 0 budget is now exhausted (20/20). Even 1 unit to Team 3 is rejected!
    const exhaustedAid = await t.mutation(api.game.command, {
      event: 'player:aid',
      payload: { roomCode, playerToken: p1, connectionId: 'c1', toTeam: 3, resource: 'trust', amount: 1 },
    });
    expect(exhaustedAid.ok).toBe(false);
    expect(exhaustedAid.error).toContain('hạn mức viện trợ tối đa');
  });

  it('rejects votes and aid after authoritative deadline has expired', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const hostToken = hex64(300);
      const createRes = await t.mutation(api.game.command, {
        event: 'room:create',
        payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
      });
      const roomCode = createRes.roomCode;

      const p1 = hex64(301);
      await t.mutation(api.game.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'LatePlayer', team: 0, playerToken: p1, connectionId: 'c1' },
      });

      await t.mutation(api.game.command, {
        event: 'host:start',
        payload: { roomCode, hostToken, connectionId: 'hconn' },
      });

      // Advance time by 91 seconds (past the 90s deadline) without running the scheduled timer yet
      vi.advanceTimersByTime(91 * 1000);

      // Vote should be rejected due to deadline expired and automatically triggers resolution
      const lateVote = await t.mutation(api.game.command, {
        event: 'player:vote',
        payload: { roomCode, playerToken: p1, connectionId: 'c1', optionId: 'r1a' },
      });
      expect(lateVote.ok).toBe(false);
      expect(lateVote.error).toBe('Hết thời gian biểu quyết');

      // Subsequent aid is rejected because round was resolved
      const lateAid = await t.mutation(api.game.command, {
        event: 'player:aid',
        payload: { roomCode, playerToken: p1, connectionId: 'c1', toTeam: 1, resource: 'food', amount: 5 },
      });
      expect(lateAid.ok).toBe(false);
      expect(['Hết thời gian viện trợ', 'Viện trợ chỉ khả dụng trong lượt chơi']).toContain(lateAid.error);
    } finally {
      vi.useRealTimers();
    }
  });
});
