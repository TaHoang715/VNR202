import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

function hex64(num: number): string {
  return num.toString(16).padStart(64, '0');
}

describe('Convex In-talk Polls Acceptance', () => {
  it('validates poll options strictly as nonempty strings', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(400);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Reject empty question
    const emptyQ = await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: { roomCode, hostToken, connectionId: 'hconn', question: '  ', options: ['A', 'B'] },
    });
    expect(emptyQ.ok).toBe(false);

    // Reject < 2 options
    const singleOpt = await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: { roomCode, hostToken, connectionId: 'hconn', question: 'Question?', options: ['A'] },
    });
    expect(singleOpt.ok).toBe(false);

    // Reject > 6 options
    const sevenOpts = await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: {
        roomCode,
        hostToken,
        connectionId: 'hconn',
        question: 'Question?',
        options: ['1', '2', '3', '4', '5', '6', '7'],
      },
    });
    expect(sevenOpts.ok).toBe(false);

    // Reject empty option string (Finding 6)
    const emptyOption = await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: {
        roomCode,
        hostToken,
        connectionId: 'hconn',
        question: 'Question?',
        options: ['Valid', '   '],
      },
    });
    expect(emptyOption.ok).toBe(false);
    expect(emptyOption.error).toContain('Phương án khảo sát không hợp lệ');

    // Reject non-string option (Finding 6)
    const objectOption = await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: {
        roomCode,
        hostToken,
        connectionId: 'hconn',
        question: 'Question?',
        options: ['Valid', { id: 123 } as any],
      },
    });
    expect(objectOption.ok).toBe(false);
    expect(objectOption.error).toContain('Phương án khảo sát không hợp lệ');
  });

  it('allows voting, personalizes userVoteIndex, preserves closed poll results and handles late subscribers', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(410);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    const p1 = hex64(411);
    const p2 = hex64(412);

    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Student_A', team: 0, playerToken: p1, connectionId: 'ca' },
    });
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Student_B', team: 1, playerToken: p2, connectionId: 'cb' },
    });

    // Host creates poll
    const pollRes = await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: {
        roomCode,
        hostToken,
        connectionId: 'hconn',
        question: 'Chiến dịch nào mở màn kháng chiến toàn quốc?',
        options: ['Hà Nội 1946', 'Việt Bắc 1947', 'Biên Giới 1950'],
      },
    });
    expect(pollRes.ok).toBe(true);
    const pollId = pollRes.pollId!;

    // P1 votes option 0
    const vote1 = await t.mutation(api.game.command, {
      event: 'poll:vote',
      payload: { roomCode, playerToken: p1, connectionId: 'ca', pollId, optionIndex: 0 },
    });
    expect(vote1.ok).toBe(true);

    // P2 votes option 0
    const vote2 = await t.mutation(api.game.command, {
      event: 'poll:vote',
      payload: { roomCode, playerToken: p2, connectionId: 'cb', pollId, optionIndex: 0 },
    });
    expect(vote2.ok).toBe(true);

    // Verify subscriber P1 gets personalized userVoteIndex 0
    const envP1 = await t.query(api.game.subscribe, {
      roomCode,
      token: p1,
      connectionId: 'ca',
    });
    expect(envP1!.poll).not.toBeNull();
    expect(envP1!.poll!.userVoteIndex).toBe(0);
    expect(envP1!.poll!.voteCounts[0]).toBe(2);
    expect(envP1!.poll!.totalVotes).toBe(2);
    expect(envP1!.poll!.active).toBe(true);

    // Host subscription has userVoteIndex null
    const envHost = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(envHost!.poll!.userVoteIndex).toBeNull();
    expect(envHost!.poll!.totalVotes).toBe(2);

    // Finding 5 test: Host closes poll -> closed poll results MUST BE PRESERVED!
    const closeRes = await t.mutation(api.game.command, {
      event: 'poll:close',
      payload: { roomCode, hostToken, connectionId: 'hconn', pollId },
    });
    expect(closeRes.ok).toBe(true);

    // Subscribe MUST NOT return null for poll; it should return the closed poll results
    const envClosed = await t.query(api.game.subscribe, {
      roomCode,
      token: p1,
      connectionId: 'ca',
    });
    expect(envClosed!.poll).not.toBeNull();
    expect(envClosed!.poll!.active).toBe(false);
    expect(envClosed!.poll!.totalVotes).toBe(2);
    expect(envClosed!.poll!.voteCounts[0]).toBe(2);
    expect(envClosed!.poll!.userVoteIndex).toBe(0);

    // Late joiner joins after poll is closed
    const p3 = hex64(413);
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Student_C', team: 2, playerToken: p3, connectionId: 'cc' },
    });

    const envLate = await t.query(api.game.subscribe, {
      roomCode,
      token: p3,
      connectionId: 'cc',
    });
    // Late joiner can see the closed poll and its final vote counts
    expect(envLate!.poll).not.toBeNull();
    expect(envLate!.poll!.active).toBe(false);
    expect(envLate!.poll!.totalVotes).toBe(2);
    expect(envLate!.poll!.userVoteIndex).toBeNull();
  });

  it('automatically closes active poll when host starts a round', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64(420);
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hconn' },
    });
    const roomCode = createRes.roomCode;

    // Create poll
    await t.mutation(api.game.command, {
      event: 'poll:create',
      payload: {
        roomCode,
        hostToken,
        connectionId: 'hconn',
        question: 'Khảo sát trước giờ G',
        options: ['Sẵn sàng', 'Chưa sẵn sàng'],
      },
    });

    let env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env!.poll!.active).toBe(true);

    // Host starts round 1
    await t.mutation(api.game.command, {
      event: 'host:start',
      payload: { roomCode, hostToken, connectionId: 'hconn' },
    });

    // Poll should be automatically closed
    env = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'hconn',
    });
    expect(env!.poll!.active).toBe(false);
  });
});
