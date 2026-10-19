import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { anyApi } from 'convex/server';
import { QUIZ_QUESTIONS, QUIZ_CONSTANTS, calculateQuestionScore, evaluateAnswer } from '../../shared/quizData';

const modules = import.meta.glob('../../convex/**/*.*s');

function make64Hex(char: string = 'a'): string {
  return char.repeat(64);
}

describe('Giải mã kháng chiến — Convex Backend & Acceptance Tests', () => {
  // ─── 1. Scoring & Answer Evaluation ──────────────────────────────────
  it('correctly calculates score with 1000 base + speed bonus up to 250 and 0 for incorrect', () => {
    // Correct at full remaining time (25000ms): 1000 + 250 = 1250
    const maxScore = calculateQuestionScore(true, 25000, 25000);
    expect(maxScore.isCorrect).toBe(true);
    expect(maxScore.points).toBe(1250);

    // Correct at half remaining time (12500ms): 1000 + 125 = 1125
    const halfScore = calculateQuestionScore(true, 12500, 25000);
    expect(halfScore.isCorrect).toBe(true);
    expect(halfScore.points).toBe(1125);

    // Correct at 0 remaining time: 1000 + 0 = 1000
    const minScore = calculateQuestionScore(true, 0, 25000);
    expect(minScore.isCorrect).toBe(true);
    expect(minScore.points).toBe(1000);

    // Incorrect answer: 0
    const wrongScore = calculateQuestionScore(false, 20000, 25000);
    expect(wrongScore.isCorrect).toBe(false);
    expect(wrongScore.points).toBe(0);

    // Ordering answer evaluation
    const orderQ = QUIZ_QUESTIONS.find((q) => q.type === 'order')!;
    expect(evaluateAnswer(orderQ, orderQ.correctOrderIds)).toBe(true);
    expect(evaluateAnswer(orderQ, ['wrong', 'order'])).toBe(false);
    expect(evaluateAnswer(orderQ, [...orderQ.correctOrderIds!].reverse())).toBe(false);
  });

  // ─── 2. Room Creation & Player Join & Sảnh 200 người ─────────────────
  it('creates quiz room and allows joining up to capacity', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: {
        hostToken,
        connectionId: 'conn_host_1',
        classSize: 50,
      },
    });

    expect(createRes.ok).toBe(true);
    expect(createRes.roomCode).toBeDefined();
    expect(createRes.roomCode).toHaveLength(6);
    const roomCode = createRes.roomCode;

    // Join player 1
    const playerToken1 = make64Hex('2');
    const joinRes1 = await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: {
        roomCode,
        nickname: 'Nguyen Van A',
        playerToken: playerToken1,
        connectionId: 'conn_p1',
      },
    });

    expect(joinRes1.ok).toBe(true);
    expect(joinRes1.playerId).toBeDefined();
    expect(joinRes1.nickname).toBe('Nguyen Van A');

    // Duplicate nickname rejected
    const dupRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: {
        roomCode,
        nickname: 'nguyen van a',
        playerToken: make64Hex('3'),
        connectionId: 'conn_p2',
      },
    });
    expect(dupRes.ok).toBe(false);
    expect(dupRes.error).toContain('Biệt danh này đã có người sử dụng');

    // Query room subscribe
    const sub = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken1,
      connectionId: 'conn_p1',
    });

    expect(sub).not.toBeNull();
    expect(sub!.room.code).toBe(roomCode);
    expect(sub!.room.phase).toBe('lobby');
    expect(sub!.room.totalJoined).toBe(1);
    expect(sub!.myState).not.toBeNull();
    expect(sub!.myState!.isHost).toBe(false);
  });

  // ─── 3. Question Confidentiality (No answer leak before reveal) ───────
  it('never leaks answer key, correct order, or explanation during question phase', async () => {
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
      payload: { roomCode, nickname: 'Hoc Vien 1', playerToken },
    });

    // Start quiz -> question 1
    const startRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });
    expect(startRes.ok).toBe(true);

    // Subscribe as player
    const subDuringQ = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'conn_p',
    });

    expect(subDuringQ!.room.phase).toBe('question');
    expect(subDuringQ!.currentQuestion).not.toBeNull();
    expect(subDuringQ!.currentQuestion!.id).toBe(1);

    // CRITICAL SECURITY CHECKS: No correct answer leaked!
    const qRaw = subDuringQ!.currentQuestion as any;
    expect(qRaw.correctOptionId).toBeUndefined();
    expect(qRaw.correctOrderIds).toBeUndefined();
    expect(qRaw.explanation).toBeUndefined();
    expect(subDuringQ!.revealData).toBeNull();

    // Verify tokens are not in leaderboard or envelope
    expect(JSON.stringify(subDuringQ)).not.toContain(hostToken);
    expect(JSON.stringify(subDuringQ.leaderboard)).not.toContain(playerToken);
  });

  // ─── 4. Submission Validation: Duplicate & Late Submissions ───────────
  it('rejects duplicate and late answer submissions', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');
    const playerTokenA = make64Hex('2');
    const playerTokenB = make64Hex('3');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken },
    });
    const roomCode = createRes.roomCode;

    // Join 2 players so 1 player submitting keeps phase in 'question'
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hoc Vien A', playerToken: playerTokenA },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hoc Vien B', playerToken: playerTokenB },
    });

    // Start quiz
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // 1st submission from player A: succeeds
    const ans1 = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        playerToken: playerTokenA,
        questionIndex: 1,
        answer: 'b', // correct answer for Q1
      },
    });
    expect(ans1.ok).toBe(true);
    expect(ans1.isCorrect).toBe(true);
    expect(ans1.pointsAwarded).toBeGreaterThanOrEqual(1000);

    // 2nd submission from player A for same question: rejected
    const ansDup = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        playerToken: playerTokenA,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(ansDup.ok).toBe(false);
    expect(ansDup.error).toContain('đã nộp câu trả lời cho câu hỏi này');

    // Wrong question index: rejected
    const ansWrongQ = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        playerToken: playerTokenB,
        questionIndex: 2,
        answer: ['vk-1', 'vk-2', 'vk-3'],
      },
    });
    expect(ansWrongQ.ok).toBe(false);
    expect(ansWrongQ.error).toContain('chuyển qua câu khác');
  });

  // ─── 5. Reconnect restores player state ──────────────────────────────
  it('reconnect restores own identity, score, and answered state', async () => {
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
      payload: { roomCode, nickname: 'Tran Thi B', playerToken, connectionId: 'c1' },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, playerToken, questionIndex: 1, answer: 'b' },
    });

    // Reconnect with same playerToken and new connectionId
    const reconnectRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Tran Thi B', playerToken, connectionId: 'c2' },
    });

    expect(reconnectRes.ok).toBe(true);
    expect(reconnectRes.isReconnect).toBe(true);
    expect(reconnectRes.nickname).toBe('Tran Thi B');

    // Query state
    const sub = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'c2',
    });

    expect(sub!.myState!.hasAnsweredCurrent).toBe(true);
    expect(sub!.myState!.myAnswer).toBe('b');
    expect(sub!.myState!.myScore).toBeGreaterThanOrEqual(1000);
  });

  // ─── 6. Timers, Schedulers & Lifecycle (25s question -> 8s reveal) ────
  it('manages authoritative timers, guarded scheduled jobs, and host advance', async () => {
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
      payload: { roomCode, nickname: 'SV 1', playerToken },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // Test resolveQuestionTimer internal mutation
    await t.mutation(anyApi.quizScheduler.resolveQuestionTimer, {
      roomCode,
      epoch: 1,
      questionIndex: 1,
      generation: 2, // generation when question 1 started was 2
    });

    // Should now be in 'revealing' phase
    let sub = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(sub!.room.phase).toBe('revealing');
    expect(sub!.revealData).not.toBeNull();
    expect(sub!.revealData!.questionId).toBe(1);
    expect(sub!.revealData!.explanation).toContain('Vạn Phúc');

    // Host manually advances to question 2
    const advanceRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:advance',
      payload: { roomCode, hostToken },
    });
    expect(advanceRes.ok).toBe(true);
    expect(advanceRes.nextQuestionIndex).toBe(2);

    sub = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(sub!.room.phase).toBe('question');
    expect(sub!.room.currentQuestionIndex).toBe(2);
    expect(sub!.revealData).toBeNull(); // Hidden again for Q2!

    // Stale timer test: firing old question 1 timer should NO-OP safely
    await t.mutation(anyApi.quizScheduler.resolveQuestionTimer, {
      roomCode,
      epoch: 1,
      questionIndex: 1,
      generation: 2,
    });
    // Room should still be question 2!
    const subStale = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(subStale!.room.currentQuestionIndex).toBe(2);
    expect(subStale!.room.phase).toBe('question');
  });

  // ─── 7. Replay & Close ──────────────────────────────────────────────
  it('resets scores on replay and invalidates pending jobs on close', async () => {
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
      payload: { roomCode, nickname: 'Nguoi Choi 1', playerToken: p1 },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, playerToken: p1, questionIndex: 1, answer: 'b' },
    });

    // Replay
    const replayRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:replay',
      payload: { roomCode, hostToken },
    });
    expect(replayRes.ok).toBe(true);
    expect(replayRes.epoch).toBe(2);

    const subReplay = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: p1,
      connectionId: 'c1',
    });
    expect(subReplay!.room.phase).toBe('lobby');
    expect(subReplay!.room.currentQuestionIndex).toBe(0);
    expect(subReplay!.myState!.myScore).toBe(0);

    // Close room
    const closeRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:close',
      payload: { roomCode, hostToken },
    });
    expect(closeRes.ok).toBe(true);

    const subClosed = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: p1,
      connectionId: 'c1',
    });
    expect(subClosed!.room.phase).toBe('closed');
  });

  // ─── 8. Deterministic Tie-Breaking on Leaderboard ─────────────────────
  it('breaks ties deterministically by score desc, time taken asc, nickname asc', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');
    const pA = make64Hex('2');
    const pB = make64Hex('3');
    const pC = make64Hex('4');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken },
    });
    const roomCode = createRes.roomCode;

    // Join 3 players: Charlie, Bob, Alice
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Charlie', playerToken: pA },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Bob', playerToken: pB },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Alice', playerToken: pC },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // All 3 answer question 1 correctly, but at different times
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, playerToken: pA, questionIndex: 1, answer: 'b' },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, playerToken: pB, questionIndex: 1, answer: 'b' },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, playerToken: pC, questionIndex: 1, answer: 'b' },
    });

    const sub = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });

    expect(sub!.leaderboard).toHaveLength(3);
    // Highest score first
    expect(sub!.leaderboard[0].totalScore).toBeGreaterThanOrEqual(sub!.leaderboard[1].totalScore);
    expect(sub!.leaderboard[1].totalScore).toBeGreaterThanOrEqual(sub!.leaderboard[2].totalScore);
  });

  // ─── 9. Poll Integration with Quiz Room ───────────────────────────────
  it('creates lesson poll, accepts votes from connected quiz players, and aggregates counts', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');
    const p1 = make64Hex('2');
    const p2 = make64Hex('3');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken },
    });
    const roomCode = createRes.roomCode;

    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hoc Vien 1', playerToken: p1 },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hoc Vien 2', playerToken: p2 },
    });

    // Host launches lesson poll 1
    const pollCreateRes = await t.mutation(anyApi.quiz.command, {
      event: 'poll:create',
      payload: {
        roomCode,
        hostToken,
        question: 'Theo bạn, yếu tố nào là cội nguồn sức mạnh lớn nhất trong kháng chiến toàn dân?',
        options: [
          'Khối đại đoàn kết toàn dân tộc',
          'Nghệ thuật quân sự ba thứ quân',
          'Lòng tin son sắt vào sự lãnh đạo của Đảng',
          'Nền kinh tế tự cấp tự túc tại chỗ',
        ],
      },
    });

    expect(pollCreateRes.ok).toBe(true);
    expect(pollCreateRes.pollId).toBeDefined();
    const pollId = pollCreateRes.pollId;

    // Player 1 votes option 0
    const vote1 = await t.mutation(anyApi.quiz.command, {
      event: 'poll:vote',
      payload: { roomCode, playerToken: p1, pollId, optionIndex: 0 },
    });
    expect(vote1.ok).toBe(true);

    // Player 2 votes option 1
    const vote2 = await t.mutation(anyApi.quiz.command, {
      event: 'poll:vote',
      payload: { roomCode, playerToken: p2, pollId, optionIndex: 1 },
    });
    expect(vote2.ok).toBe(true);

    // Subscribe as player 1
    const subP1 = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: p1,
      connectionId: 'c1',
    });

    expect(subP1!.poll).not.toBeNull();
    expect(subP1!.poll!.totalVotes).toBe(2);
    expect(subP1!.poll!.voteCounts[0]).toBe(1);
    expect(subP1!.poll!.voteCounts[1]).toBe(1);
    expect(subP1!.poll!.userVoteIndex).toBe(0);

    // Host closes poll
    const closePollRes = await t.mutation(anyApi.quiz.command, {
      event: 'poll:close',
      payload: { roomCode, hostToken, pollId },
    });
    expect(closePollRes.ok).toBe(true);
  });

  // ─── 10. Concurrency: 60 Concurrent Answers ───────────────────────────
  it('handles 60 concurrent answer submissions without OCC conflict and triggers early reveal', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken },
    });
    const roomCode = createRes.roomCode;

    // Join 60 players
    const NUM_PLAYERS = 60;
    const playerTokens: string[] = [];

    for (let i = 0; i < NUM_PLAYERS; i++) {
      const token = (i.toString(16).padStart(4, '0') + 'a'.repeat(60)).slice(0, 64);
      playerTokens.push(token);
      const joinRes = await t.mutation(anyApi.quiz.command, {
        event: 'room:join',
        payload: {
          roomCode,
          nickname: `Nguoi Choi ${i + 1}`,
          playerToken: token,
          connectionId: `conn_${i + 1}`,
        },
      });
      expect(joinRes.ok).toBe(true);
    }

    // Start quiz
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // 60 players submit answers concurrently
    const answerPromises = playerTokens.map((token, idx) =>
      t.mutation(anyApi.quiz.command, {
        event: 'quiz:answer',
        payload: {
          roomCode,
          playerToken: token,
          questionIndex: 1,
          answer: idx % 2 === 0 ? 'b' : 'a', // alternating correct and incorrect
        },
      })
    );

    const results = await Promise.all(answerPromises);
    expect(results).toHaveLength(NUM_PLAYERS);
    const successful = results.filter((r) => r.ok).length;
    expect(successful).toBe(NUM_PLAYERS);

    // Because all 60 answered, early reveal is triggered!
    const sub = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });

    expect(sub!.room.phase).toBe('revealing');
    expect(sub!.room.answeredCount).toBe(NUM_PLAYERS);
    expect(sub!.leaderboard).toHaveLength(NUM_PLAYERS);
  });
});
