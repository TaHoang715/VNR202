import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { anyApi } from 'convex/server';
import { QUIZ_CONSTANTS } from '../../shared/quizData';

const modules = import.meta.glob('../../convex/**/*.*s');

function make64Hex(char: string = 'a'): string {
  return char.repeat(64);
}

describe('Giải mã kháng chiến — Online Security, Auth, Isolation & Lifecycle Tests', () => {
  // ─── 1. Presence Heartbeat Security & Spoof Prevention ────────────────
  describe('presence:heartbeat security', () => {
    it('refuses nonexistent and closed rooms without inserting presence', async () => {
      const t = convexTest(schema, modules);
      const fakeToken = make64Hex('f');

      // Nonexistent room
      const resNonexistent = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode: 'NOPE99', token: fakeToken },
      });
      expect(resNonexistent.ok).toBe(false);
      expect(resNonexistent.error).toContain('không tồn tại hoặc đã đóng');

      // Closed room
      const hostToken = make64Hex('1');
      const createRes = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken },
      });
      const roomCode = createRes.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:close',
        payload: { roomCode, hostToken },
      });

      const resClosed = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode, token: hostToken },
      });
      expect(resClosed.ok).toBe(false);
      expect(resClosed.error).toContain('không tồn tại hoặc đã đóng');

      // Verify no presence row created for fakeToken
      const fakePresence = await t.run((ctx) =>
        ctx.db.query('quizPresence').withIndex('by_room_token', (q) => q.eq('roomCode', 'NOPE99').eq('token', fakeToken)).first()
      );
      expect(fakePresence).toBeNull();
    });

    it('rejects unregistered 64-hex token and prevents unauthenticated presence insertion or TTL extension', async () => {
      const t = convexTest(schema, modules);
      const hostToken = make64Hex('1');
      const attackerToken = make64Hex('9');

      const createRes = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken },
      });
      const roomCode = createRes.roomCode;

      const resAttacker = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode, token: attackerToken, isHost: true },
      });

      expect(resAttacker.ok).toBe(false);
      expect(resAttacker.error).toContain('Mã xác thực không thuộc về chủ phòng hoặc người chơi');

      // Verify attacker token is NOT in quizPresence
      const attackerPresence = await t.run((ctx) =>
        ctx.db.query('quizPresence').withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', attackerToken)).first()
      );
      expect(attackerPresence).toBeNull();
    });

    it('derives isHost strictly server-side and prevents host spoofing', async () => {
      const t = convexTest(schema, modules);
      const hostToken = make64Hex('1');
      const playerToken = make64Hex('2');

      const createRes = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken },
      });
      const roomCode = createRes.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'Hoc Vien', playerToken },
      });

      // 1. Host sends heartbeat claiming isHost: false -> derived isHost is TRUE
      const hostHb = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode, token: hostToken, isHost: false },
      });
      expect(hostHb.ok).toBe(true);
      expect(hostHb.isHost).toBe(true);

      const hostPres = await t.run((ctx) =>
        ctx.db.query('quizPresence').withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', hostToken)).first()
      );
      expect(hostPres!.isHost).toBe(true);

      // 2. Player sends heartbeat claiming isHost: true (spoof attempt) -> derived isHost is FALSE
      const playerHb = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode, token: playerToken, isHost: true },
      });
      expect(playerHb.ok).toBe(true);
      expect(playerHb.isHost).toBe(false);

      const playerPres = await t.run((ctx) =>
        ctx.db.query('quizPresence').withIndex('by_room_token', (q) => q.eq('roomCode', roomCode).eq('token', playerToken)).first()
      );
      expect(playerPres!.isHost).toBe(false);
    });

    it('rejects cross-room tokens from other rooms', async () => {
      const t = convexTest(schema, modules);
      const hostToken1 = make64Hex('1');
      const hostToken2 = make64Hex('2');
      const playerToken1 = make64Hex('3');

      const r1 = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: hostToken1 },
      });
      const r2 = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: hostToken2 },
      });

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode: r1.roomCode, nickname: 'P1', playerToken: playerToken1 },
      });

      // Host 1 token sent to Room 2 -> rejected
      const resHostCross = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode: r2.roomCode, token: hostToken1 },
      });
      expect(resHostCross.ok).toBe(false);

      // Player 1 token from Room 1 sent to Room 2 -> rejected
      const resPlayerCross = await t.mutation(anyApi.quiz.command, {
        event: 'presence:heartbeat',
        payload: { roomCode: r2.roomCode, token: playerToken1 },
      });
      expect(resPlayerCross.ok).toBe(false);
    });
  });

  // ─── 2. Poll Vote Security & Input Validation ─────────────────────────
  describe('poll:vote validation and membership enforcement', () => {
    it('rejects unregistered token and cross-room player token without writing votes', async () => {
      const t = convexTest(schema, modules);
      const hostToken1 = make64Hex('1');
      const hostToken2 = make64Hex('2');
      const p1 = make64Hex('3');
      const p2 = make64Hex('4');
      const attackerToken = make64Hex('5');

      const r1 = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: hostToken1 },
      });
      const r2 = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: hostToken2 },
      });

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode: r1.roomCode, nickname: 'P1', playerToken: p1 },
      });
      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode: r2.roomCode, nickname: 'P2', playerToken: p2 },
      });

      // Host 1 creates poll in Room 1
      const pollRes = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode: r1.roomCode,
          hostToken: hostToken1,
          question: 'Khảo sát bài học 1?',
          options: ['Lựa chọn A', 'Lựa chọn B'],
        },
      });
      const pollId = pollRes.pollId;

      // 1. Unregistered attacker token tries to vote
      const resAttacker = await t.mutation(anyApi.quiz.command, {
        event: 'poll:vote',
        payload: { roomCode: r1.roomCode, playerToken: attackerToken, pollId, optionIndex: 0 },
      });
      expect(resAttacker.ok).toBe(false);
      expect(resAttacker.error).toContain('chưa tham gia phòng thi đấu');

      // 2. Player 2 (from Room 2) tries to vote in Room 1's poll
      const resCrossRoom = await t.mutation(anyApi.quiz.command, {
        event: 'poll:vote',
        payload: { roomCode: r1.roomCode, playerToken: p2, pollId, optionIndex: 0 },
      });
      expect(resCrossRoom.ok).toBe(false);
      expect(resCrossRoom.error).toContain('chưa tham gia phòng thi đấu');

      // Verify no votes written
      const votesInDb = await t.run((ctx) => ctx.db.query('quizPollVotes').collect());
      expect(votesInDb).toHaveLength(0);
    });

    it('rejects non-integer, NaN, out-of-bounds, and non-numeric optionIndex without writing votes', async () => {
      const t = convexTest(schema, modules);
      const hostToken = make64Hex('1');
      const p1 = make64Hex('2');

      const createRes = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken },
      });
      const roomCode = createRes.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P1', playerToken: p1 },
      });

      const pollRes = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode,
          hostToken,
          question: 'Khảo sát bài học 2?',
          options: ['A', 'B', 'C'],
        },
      });
      const pollId = pollRes.pollId;

      const invalidIndexes = [NaN, 1.5, -1, 3, 999, '0' as any, null as any, undefined as any, Infinity];

      for (const badIdx of invalidIndexes) {
        const res = await t.mutation(anyApi.quiz.command, {
          event: 'poll:vote',
          payload: { roomCode, playerToken: p1, pollId, optionIndex: badIdx },
        });
        expect(res.ok).toBe(false);
        expect(res.error).toContain('Lựa chọn khảo sát không hợp lệ');
      }

      // Verify no votes written
      const votesInDb = await t.run((ctx) => ctx.db.query('quizPollVotes').collect());
      expect(votesInDb).toHaveLength(0);

      // Valid vote works
      const validRes = await t.mutation(anyApi.quiz.command, {
        event: 'poll:vote',
        payload: { roomCode, playerToken: p1, pollId, optionIndex: 2 },
      });
      expect(validRes.ok).toBe(true);

      const votesAfter = await t.run((ctx) => ctx.db.query('quizPollVotes').collect());
      expect(votesAfter).toHaveLength(1);
      expect(votesAfter[0].optionIndex).toBe(2);
    });
  });

  // ─── 3. Poll Close Security & Cross-Room Isolation & Lifecycle ────────
  describe('poll:close security and lifecycle results preservation', () => {
    it('refuses cross-room poll close by a different host', async () => {
      const t = convexTest(schema, modules);
      const host1 = make64Hex('1');
      const host2 = make64Hex('2');

      const r1 = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host1 },
      });
      const r2 = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host2 },
      });

      const pollRes = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode: r1.roomCode,
          hostToken: host1,
          question: 'Khảo sát riêng phòng 1?',
          options: ['1', '2'],
        },
      });
      const pollId = pollRes.pollId;

      // Host 2 tries to close Room 1's poll passing Room 2
      const resBad = await t.mutation(anyApi.quiz.command, {
        event: 'poll:close',
        payload: { roomCode: r2.roomCode, hostToken: host2, pollId },
      });
      expect(resBad.ok).toBe(false);
      expect(resBad.error).toContain('Khảo sát không tồn tại trong phòng thi này');

      // Poll in Room 1 remains active
      const pollDoc = await t.run((ctx) =>
        ctx.db.query('quizPolls').withIndex('by_pollId', (q) => q.eq('pollId', pollId)).first()
      );
      expect(pollDoc!.active).toBe(true);
    });

    it('closes active polls on quiz:start, quiz:replay, and room:close', async () => {
      const t = convexTest(schema, modules);
      const host = make64Hex('1');
      const p1 = make64Hex('2');

      const r = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host },
      });
      const roomCode = r.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P1', playerToken: p1 },
      });

      // 1. Lifecycle: quiz:start closes active poll
      const poll1 = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: { roomCode, hostToken: host, question: 'Khảo sát đầu giờ?', options: ['A', 'B'] },
      });
      expect(poll1.ok).toBe(true);

      await t.mutation(anyApi.quiz.command, {
        event: 'quiz:start',
        payload: { roomCode, hostToken: host },
      });

      const p1Doc = await t.run((ctx) =>
        ctx.db.query('quizPolls').withIndex('by_pollId', (q) => q.eq('pollId', poll1.pollId)).first()
      );
      expect(p1Doc!.active).toBe(false);

      // 2. Lifecycle: quiz:replay closes active poll
      const replayRes = await t.mutation(anyApi.quiz.command, {
        event: 'quiz:replay',
        payload: { roomCode, hostToken: host },
      });
      expect(replayRes.ok).toBe(true);

      const poll2 = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: { roomCode, hostToken: host, question: 'Khảo sát hiệp 2?', options: ['X', 'Y'] },
      });

      await t.mutation(anyApi.quiz.command, {
        event: 'quiz:replay',
        payload: { roomCode, hostToken: host },
      });

      const p2Doc = await t.run((ctx) =>
        ctx.db.query('quizPolls').withIndex('by_pollId', (q) => q.eq('pollId', poll2.pollId)).first()
      );
      expect(p2Doc!.active).toBe(false);

      // 3. Lifecycle: room:close closes active poll
      const poll3 = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: { roomCode, hostToken: host, question: 'Khảo sát cuối?', options: ['1', '2'] },
      });

      await t.mutation(anyApi.quiz.command, {
        event: 'room:close',
        payload: { roomCode, hostToken: host },
      });

      const p3Doc = await t.run((ctx) =>
        ctx.db.query('quizPolls').withIndex('by_pollId', (q) => q.eq('pollId', poll3.pollId)).first()
      );
      expect(p3Doc!.active).toBe(false);
    });

    it('preserves closed poll counts in snapshots for both host and student', async () => {
      const t = convexTest(schema, modules);
      const host = make64Hex('1');
      const p1 = make64Hex('2');
      const p2 = make64Hex('3');

      const r = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host },
      });
      const roomCode = r.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P1', playerToken: p1 },
      });
      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P2', playerToken: p2 },
      });

      const pollRes = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode,
          hostToken: host,
          question: 'Yếu tố quyết định trong kháng chiến?',
          options: ['Sức mạnh toàn dân', 'Kinh tế', 'Ngoại giao'],
        },
      });
      const pollId = pollRes.pollId;

      await t.mutation(anyApi.quiz.command, {
        event: 'poll:vote',
        payload: { roomCode, playerToken: p1, pollId, optionIndex: 0 },
      });
      await t.mutation(anyApi.quiz.command, {
        event: 'poll:vote',
        payload: { roomCode, playerToken: p2, pollId, optionIndex: 0 },
      });

      // Host closes poll
      await t.mutation(anyApi.quiz.command, {
        event: 'poll:close',
        payload: { roomCode, hostToken: host, pollId },
      });

      // Query as Host: snapshot must NOT lose poll results
      const subHost = await t.query(anyApi.quiz.subscribe, {
        roomCode,
        token: host,
        connectionId: 'c_h',
      });
      expect(subHost!.poll).not.toBeNull();
      expect(subHost!.poll!.active).toBe(false);
      expect(subHost!.poll!.totalVotes).toBe(2);
      expect(subHost!.poll!.voteCounts[0]).toBe(2);
      expect(subHost!.poll!.options).toHaveLength(3);

      // Query as Student P1: snapshot must preserve results and own voted index
      const subStudent = await t.query(anyApi.quiz.subscribe, {
        roomCode,
        token: p1,
        connectionId: 'c_s',
      });
      expect(subStudent!.poll).not.toBeNull();
      expect(subStudent!.poll!.active).toBe(false);
      expect(subStudent!.poll!.totalVotes).toBe(2);
      expect(subStudent!.poll!.userVoteIndex).toBe(0);
    });
  });

  // ─── 4. Poll Create Bounded Inputs & Retention with Votes Cleanup ──────
  describe('poll:create bounded inputs and bounded retention', () => {
    it('rejects oversized questions, too few/many options, and oversized option texts', async () => {
      const t = convexTest(schema, modules);
      const host = make64Hex('1');

      const r = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host },
      });
      const roomCode = r.roomCode;

      // Question too short (< 5)
      const resShortQ = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: { roomCode, hostToken: host, question: 'Abc', options: ['A', 'B'] },
      });
      expect(resShortQ.ok).toBe(false);

      // Question too long (> 300)
      const resLongQ = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: { roomCode, hostToken: host, question: 'A'.repeat(301), options: ['A', 'B'] },
      });
      expect(resLongQ.ok).toBe(false);

      // Options too few (< 2)
      const resFewOpt = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: { roomCode, hostToken: host, question: 'Câu hỏi hợp lệ?', options: ['Chỉ một'] },
      });
      expect(resFewOpt.ok).toBe(false);

      // Options too many (> 6)
      const resManyOpt = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode,
          hostToken: host,
          question: 'Câu hỏi hợp lệ?',
          options: ['1', '2', '3', '4', '5', '6', '7'],
        },
      });
      expect(resManyOpt.ok).toBe(false);

      // Option text too long (> 150)
      const resLongOpt = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode,
          hostToken: host,
          question: 'Câu hỏi hợp lệ?',
          options: ['Hợp lệ', 'O'.repeat(151)],
        },
      });
      expect(resLongOpt.ok).toBe(false);
    });

    it('bounds retention to MAX_POLLS_PER_ROOM and cleans up associated votes when pruning', async () => {
      const t = convexTest(schema, modules);
      const host = make64Hex('1');
      const p1 = make64Hex('2');

      const r = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host },
      });
      const roomCode = r.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P1', playerToken: p1 },
      });

      // Create 5 polls (MAX_POLLS_PER_ROOM = 5) and vote on poll 1
      const pollIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const res = await t.mutation(anyApi.quiz.command, {
          event: 'poll:create',
          payload: {
            roomCode,
            hostToken: host,
            question: `Khảo sát số ${i}?`,
            options: ['Đồng ý', 'Không đồng ý'],
          },
        });
        expect(res.ok).toBe(true);
        pollIds.push(res.pollId);

        // Vote on poll 1
        if (i === 1) {
          await t.mutation(anyApi.quiz.command, {
            event: 'poll:vote',
            payload: { roomCode, playerToken: p1, pollId: res.pollId, optionIndex: 0 },
          });
        }
      }

      // 5 polls exist, 1 vote exists for poll 1
      const pollsBefore = await t.run((ctx) => ctx.db.query('quizPolls').collect());
      expect(pollsBefore).toHaveLength(5);
      const votesBefore = await t.run((ctx) => ctx.db.query('quizPollVotes').collect());
      expect(votesBefore).toHaveLength(1);

      // Create 6th poll -> should prune oldest poll (poll 1) and its vote
      const res6 = await t.mutation(anyApi.quiz.command, {
        event: 'poll:create',
        payload: {
          roomCode,
          hostToken: host,
          question: 'Khảo sát số 6 tràn ngưỡng?',
          options: ['A', 'B'],
        },
      });
      expect(res6.ok).toBe(true);

      const pollsAfter = await t.run((ctx) => ctx.db.query('quizPolls').collect());
      expect(pollsAfter).toHaveLength(5); // Retained exactly 5 polls!

      // Verify poll 1 and its vote were deleted
      const poll1Doc = await t.run((ctx) =>
        ctx.db.query('quizPolls').withIndex('by_pollId', (q) => q.eq('pollId', pollIds[0])).first()
      );
      expect(poll1Doc).toBeNull();

      const poll1Votes = await t.run((ctx) =>
        ctx.db.query('quizPollVotes').withIndex('by_poll', (q) => q.eq('pollId', pollIds[0])).collect()
      );
      expect(poll1Votes).toHaveLength(0);
    });
  });

  // ─── 5. Room Creation Cap Across Active Phases & Collision Exhaustion ──
  describe('room:create capacity and uniqueness exhaustion', () => {
    it('counts active rooms across all phases (not just lobby) towards cap', async () => {
      const t = convexTest(schema, modules);

      // Insert mock active rooms across various phases directly in db up to MAX_ROOMS
      await t.run(async (ctx) => {
        const phases = ['lobby', 'question', 'revealing', 'finished'] as const;
        for (let i = 0; i < QUIZ_CONSTANTS.MAX_ROOMS; i++) {
          const phase = phases[i % phases.length];
          await ctx.db.insert('quizRooms', {
            code: `TST${i.toString().padStart(3, '0')}`,
            hostToken: make64Hex('h'),
            hostLastHeartbeat: Date.now(),
            phase,
            classSize: null,
            currentQuestionIndex: phase === 'lobby' ? 0 : 1,
            questionStartedAt: null,
            deadlineMs: null,
            revealDeadlineMs: null,
            epoch: 1,
            generation: 1,
            pulseGeneration: 1,
            createdAt: Date.now(),
            lastActivity: Date.now(),
          });
        }
      });

      // Try creating another room -> should be rejected because active rooms >= MAX_ROOMS
      const resOverCap = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: make64Hex('1') },
      });

      expect(resOverCap.ok).toBe(false);
      expect(resOverCap.error).toContain('Hệ thống đang quá tải phòng thi đấu');
    });
  });

  // ─── 6. Replay Cleans Previous Epoch Answers ──────────────────────────
  describe('quiz:replay cleanup of previous epoch answers', () => {
    it('completely cleans up historical answers when replaying a room', async () => {
      const t = convexTest(schema, modules);
      const host = make64Hex('1');
      const p1 = make64Hex('2');
      const p2 = make64Hex('3');

      const r = await t.mutation(anyApi.quiz.command, {
        event: 'room:create',
        payload: { hostToken: host },
      });
      const roomCode = r.roomCode;

      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P1', playerToken: p1 },
      });
      await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: { roomCode, nickname: 'P2', playerToken: p2 },
      });

      await t.mutation(anyApi.quiz.command, {
        event: 'quiz:start',
        payload: { roomCode, hostToken: host },
      });

      // Both players answer Question 1 in Epoch 1
      await t.mutation(anyApi.quiz.command, {
        event: 'quiz:answer',
        payload: { roomCode, epoch: 1, playerToken: p1, questionIndex: 1, answer: 'b' },
      });
      await t.mutation(anyApi.quiz.command, {
        event: 'quiz:answer',
        payload: { roomCode, epoch: 1, playerToken: p2, questionIndex: 1, answer: 'b' },
      });

      const answersBeforeReplay = await t.run((ctx) =>
        ctx.db.query('quizAnswers').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect()
      );
      expect(answersBeforeReplay).toHaveLength(2);

      // Replay quiz
      const replayRes = await t.mutation(anyApi.quiz.command, {
        event: 'quiz:replay',
        payload: { roomCode, hostToken: host },
      });
      expect(replayRes.ok).toBe(true);
      expect(replayRes.epoch).toBe(2);

      // Verify all previous answers for this room have been cleaned up
      const answersAfterReplay = await t.run((ctx) =>
        ctx.db.query('quizAnswers').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect()
      );
      expect(answersAfterReplay).toHaveLength(0);

      // Players' stats reset to 0
      const playersAfter = await t.run((ctx) =>
        ctx.db.query('quizPlayers').withIndex('by_room', (q) => q.eq('roomCode', roomCode)).collect()
      );
      for (const p of playersAfter) {
        expect(p.totalScore).toBe(0);
        expect(p.correctCount).toBe(0);
        expect(p.totalTimeSpentMs).toBe(0);
      }
    });
  });
});
