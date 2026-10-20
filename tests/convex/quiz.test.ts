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
  it('correctly calculates score with floor(serverRemainingMs/10) max 6000 and 0 for incorrect', () => {
    // Correct at full remaining time (60000ms): 6000
    const maxScore = calculateQuestionScore(true, 60000, 60000);
    expect(maxScore.isCorrect).toBe(true);
    expect(maxScore.points).toBe(6000);

    // Correct at half remaining time (30000ms): 3000
    const halfScore = calculateQuestionScore(true, 30000, 60000);
    expect(halfScore.isCorrect).toBe(true);
    expect(halfScore.points).toBe(3000);

    // Correct at 0 remaining time: 0
    const minScore = calculateQuestionScore(true, 0, 60000);
    expect(minScore.isCorrect).toBe(true);
    expect(minScore.points).toBe(0);

    // Incorrect answer: 0
    const wrongScore = calculateQuestionScore(false, 50000, 60000);
    expect(wrongScore.isCorrect).toBe(false);
    expect(wrongScore.points).toBe(0);

    // Catchphrase evaluation and normalization
    const catchphraseQ = QUIZ_QUESTIONS.find((q) => q.type === 'catchphrase')!;
    expect(evaluateAnswer(catchphraseQ, 'Toàn dân')).toBe(true);
    expect(evaluateAnswer(catchphraseQ, 'toan dan')).toBe(true);
    expect(evaluateAnswer(catchphraseQ, 'TOÀN DÂN')).toBe(true);
    expect(evaluateAnswer(catchphraseQ, '  toàn   dân  ')).toBe(true);
    expect(evaluateAnswer(catchphraseQ, 'sai đáp án')).toBe(false);
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

    // 1st submission from player A: succeeds with acknowledgment only
    const ans1 = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: playerTokenA,
        questionIndex: 1,
        answer: 'b', // correct answer for Q1
      },
    });
    expect(ans1.ok).toBe(true);
    expect(ans1.acknowledged).toBe(true);
    expect((ans1 as any).isCorrect).toBeUndefined();
    expect((ans1 as any).pointsAwarded).toBeUndefined();

    // 2nd submission from player A for same question: rejected
    const ansDup = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
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
        epoch: 1,
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

    // Join 2 players so Tran Thi B answering keeps room in 'question' phase
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Tran Thi B', playerToken, connectionId: 'c1' },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hoc Vien 2', playerToken: make64Hex('3'), connectionId: 'c_other' },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, epoch: 1, playerToken, questionIndex: 1, answer: 'b' },
    });

    // Reconnect with same playerToken and new connectionId
    const reconnectRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Tran Thi B', playerToken, connectionId: 'c2' },
    });

    expect(reconnectRes.ok).toBe(true);
    expect(reconnectRes.isReconnect).toBe(true);
    expect(reconnectRes.nickname).toBe('Tran Thi B');

    // Query state while still in question phase: answered is restored, score masked
    const subQ = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'c2',
    });

    expect(subQ!.myState!.hasAnsweredCurrent).toBe(true);
    expect(subQ!.myState!.myAnswer).toBe('b');
    expect(subQ!.myState!.myPointsAwarded).toBeUndefined();
    expect(subQ!.myState!.myScore).toBe(0);

    // Resolve question timer into reveal phase
    await t.mutation(anyApi.quizScheduler.resolveQuestionTimer, {
      roomCode,
      epoch: 1,
      questionIndex: 1,
      generation: 2,
    });

    // Query state in reveal phase: points and score are now unmasked
    const subReveal = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'c2',
    });

    expect(subReveal!.room.phase).toBe('revealing');
    expect(subReveal!.myState!.myPointsAwarded).toBeGreaterThanOrEqual(1000);
    expect(subReveal!.myState!.myScore).toBeGreaterThanOrEqual(1000);
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
      payload: { roomCode, epoch: 1, playerToken: p1, questionIndex: 1, answer: 'b' },
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
      payload: { roomCode, epoch: 1, playerToken: pA, questionIndex: 1, answer: 'b' },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, epoch: 1, playerToken: pB, questionIndex: 1, answer: 'b' },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, epoch: 1, playerToken: pC, questionIndex: 1, answer: 'b' },
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
          epoch: 1,
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

  // ─── 11. Stale Replay Epoch Regression ─────────────────────────────────
  it('rejects stale answers from previous replay epoch and missing/invalid epoch', async () => {
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

    // Start quiz in epoch 1
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // Host replays quiz -> epoch increments to 2
    const replayRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:replay',
      payload: { roomCode, hostToken },
    });
    expect(replayRes.ok).toBe(true);
    expect(replayRes.epoch).toBe(2);

    // Host starts quiz in epoch 2 (question 1)
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // 1. Missing epoch -> rejected
    const ansMissingEpoch = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        playerToken: p1,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(ansMissingEpoch.ok).toBe(false);
    expect(ansMissingEpoch.error).toContain('epoch');

    // 2. Invalid epoch (string, NaN, float) -> rejected
    const ansInvalidEpoch = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: '2' as any,
        playerToken: p1,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(ansInvalidEpoch.ok).toBe(false);
    expect(ansInvalidEpoch.error).toContain('epoch');

    // 3. Stale epoch: 1 (from previous replay) -> rejected
    const ansStaleEpoch = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: p1,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(ansStaleEpoch.ok).toBe(false);
    expect(ansStaleEpoch.error).toContain('Phiên thi đấu (epoch) không khớp hoặc đã cũ');

    // Verify NO answers recorded in epoch 2 yet
    const subDuring = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: p1,
      connectionId: 'c1',
    });
    expect(subDuring!.myState!.hasAnsweredCurrent).toBe(false);
    expect(subDuring!.room.answeredCount).toBe(0);

    // 4. Valid matching epoch: 2 -> accepted!
    const ansValid = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 2,
        playerToken: p1,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(ansValid.ok).toBe(true);
    expect(ansValid.acknowledged).toBe(true);
  });

  // ─── 12. Pre-Reveal Security & Leak Prevention ─────────────────────────
  it('strictly prevents pre-reveal leaks in mutation responses and public snapshots', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');
    const pRight = make64Hex('2');
    const pWrong = make64Hex('3');
    const pPending = make64Hex('4');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken },
    });
    const roomCode = createRes.roomCode;

    // Join 3 players: 2 will answer, 1 remains pending so room stays in 'question' phase
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Nguoi Dung', playerToken: pRight },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Nguoi Sai', playerToken: pWrong },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Nguoi Cho', playerToken: pPending },
    });

    // Start Question 1 (epoch 1)
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // 1. Player Right answers correctly
    const resRight = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: pRight,
        questionIndex: 1,
        answer: 'b', // correct
      },
    });
    expect(resRight.ok).toBe(true);
    expect(resRight.acknowledged).toBe(true);
    // CRITICAL: Mutation must NOT return isCorrect or pointsAwarded!
    expect((resRight as any).isCorrect).toBeUndefined();
    expect((resRight as any).pointsAwarded).toBeUndefined();

    // 2. Player Wrong answers incorrectly
    const resWrong = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: pWrong,
        questionIndex: 1,
        answer: 'a', // incorrect
      },
    });
    expect(resWrong.ok).toBe(true);
    expect(resWrong.acknowledged).toBe(true);
    expect((resWrong as any).isCorrect).toBeUndefined();
    expect((resWrong as any).pointsAwarded).toBeUndefined();

    // 3. Inspect public snapshot as Host (on projector) during 'question' phase
    const subHost = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(subHost!.room.phase).toBe('question');
    expect(subHost!.revealData).toBeNull();
    expect(subHost!.currentQuestion).not.toBeNull();
    expect((subHost!.currentQuestion as any).correctOptionId).toBeUndefined();

    // CRITICAL: Public leaderboard must NOT leak points before reveal!
    // Every player must display totalScore 0 and correctCount 0
    for (const entry of subHost!.leaderboard) {
      expect(entry.totalScore).toBe(0);
      expect(entry.correctCount).toBe(0);
      expect(entry.totalTimeSpentMs).toBe(0);
    }

    // 4. Inspect private snapshot as Player Right (who answered correctly)
    const subRight = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: pRight,
      connectionId: 'conn_r',
    });
    expect(subRight!.myState!.hasAnsweredCurrent).toBe(true);
    expect(subRight!.myState!.myAnswer).toBe('b');
    expect(subRight!.myState!.myPointsAwarded).toBeUndefined();
    expect(subRight!.myState!.myScore).toBe(0); // Masked to previous total (0)!
    expect(subRight!.revealData).toBeNull();

    // 5. Inspect private snapshot as Player Wrong (who answered incorrectly)
    const subWrong = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: pWrong,
      connectionId: 'conn_w',
    });
    expect(subWrong!.myState!.hasAnsweredCurrent).toBe(true);
    expect(subWrong!.myState!.myAnswer).toBe('a');
    expect(subWrong!.myState!.myPointsAwarded).toBeUndefined();
    expect(subWrong!.myState!.myScore).toBe(0);
    expect(subWrong!.revealData).toBeNull();

    // 6. Transition to reveal phase (time expires)
    await t.mutation(anyApi.quizScheduler.resolveQuestionTimer, {
      roomCode,
      epoch: 1,
      questionIndex: 1,
      generation: 2,
    });

    // 7. Post-reveal inspection: Scores, ranks, and explanation now unmasked!
    const subHostRevealed = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(subHostRevealed!.room.phase).toBe('revealing');
    expect(subHostRevealed!.revealData).not.toBeNull();
    expect(subHostRevealed!.revealData!.correctOptionId).toBe('b');

    const rightEntry = subHostRevealed!.leaderboard.find((l) => l.nickname === 'Nguoi Dung')!;
    const wrongEntry = subHostRevealed!.leaderboard.find((l) => l.nickname === 'Nguoi Sai')!;

    expect(rightEntry.totalScore).toBeGreaterThanOrEqual(1000);
    expect(rightEntry.correctCount).toBe(1);
    expect(wrongEntry.totalScore).toBe(0);
    expect(wrongEntry.correctCount).toBe(0);

    const subRightRevealed = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: pRight,
      connectionId: 'conn_r',
    });
    expect(subRightRevealed!.myState!.myPointsAwarded).toBeGreaterThanOrEqual(1000);
    expect(subRightRevealed!.myState!.myScore).toBeGreaterThanOrEqual(1000);

    const subWrongRevealed = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: pWrong,
      connectionId: 'conn_w',
    });
    expect(subWrongRevealed!.myState!.myPointsAwarded).toBe(0);
    expect(subWrongRevealed!.myState!.myScore).toBe(0);
  });

  // ─── 13. Disconnected Player & Early Reveal Membership Check Regression ─
  it('does not trigger early reveal when disconnected player answered and connected player remains pending', async () => {
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

    // Join 3 players: A, B, C
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Player A', playerToken: pA },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Player B', playerToken: pB },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Player C', playerToken: pC },
    });

    // Start Question 1 (epoch 1)
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // 1. Player A answers correctly
    const resA = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: pA,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(resA.ok).toBe(true);
    expect(resA.acknowledged).toBe(true);

    // 2. Model Player A disconnecting (controlled DB state)
    await t.run(async (ctx) => {
      const playerA = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room_token", (q) => q.eq("roomCode", roomCode).eq("playerToken", pA))
        .first();
      expect(playerA).not.toBeNull();
      await ctx.db.patch(playerA!._id, { connected: false });
    });

    // 3. Player B answers while Player C is still connected and pending
    const resB = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: pB,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(resB.ok).toBe(true);
    expect(resB.acknowledged).toBe(true);

    // CRITICAL REGRESSION CHECK:
    // Under buggy count comparison: allAnswersCurrent (2) >= connectedPlayers (2, B and C).
    // Under membership check: Player C is connected and has NOT answered yet!
    // The room MUST remain in 'question' phase!
    const subHostDuring = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(subHostDuring!.room.phase).toBe('question');
    expect(subHostDuring!.room.answeredCount).toBe(2);
    expect(subHostDuring!.room.connectedCount).toBe(2);
    expect(subHostDuring!.revealData).toBeNull();

    // Scores MUST stay masked in public snapshots before reveal
    for (const entry of subHostDuring!.leaderboard) {
      expect(entry.totalScore).toBe(0);
      expect(entry.correctCount).toBe(0);
    }

    // Inspect Player B private state: answered, but score masked
    const subB = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: pB,
      connectionId: 'conn_b',
    });
    expect(subB!.myState!.hasAnsweredCurrent).toBe(true);
    expect(subB!.myState!.myScore).toBe(0);
    expect(subB!.myState!.myPointsAwarded).toBeUndefined();

    // Inspect Player C private state: still pending
    const subC = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: pC,
      connectionId: 'conn_c',
    });
    expect(subC!.myState!.hasAnsweredCurrent).toBe(false);

    // 4. Now Player C answers
    const resC = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: pC,
        questionIndex: 1,
        answer: 'b',
      },
    });
    expect(resC.ok).toBe(true);
    expect(resC.acknowledged).toBe(true);

    // Now ALL connected players (B and C) have answered -> reveals once!
    const subHostAfter = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'conn_h',
    });
    expect(subHostAfter!.room.phase).toBe('revealing');
    expect(subHostAfter!.revealData).not.toBeNull();
    expect(subHostAfter!.revealData!.correctOptionId).toBe('b');

    // Scores are now unmasked
    const entryB = subHostAfter!.leaderboard.find((l) => l.nickname === 'Player B')!;
    const entryC = subHostAfter!.leaderboard.find((l) => l.nickname === 'Player C')!;
    expect(entryB.totalScore).toBeGreaterThanOrEqual(1000);
    expect(entryC.totalScore).toBeGreaterThanOrEqual(1000);
  });

  // ─── 14. Catchphrase Flow: Wrong Retry, Accent Normalization, Duplicates, Untrusted Score ──
  it('handles catchphrase wrong retry without locking, accent normalization, duplicate protection, and server-authoritative scoring', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('1');
    const playerToken1 = make64Hex('2');
    const playerToken2 = make64Hex('3');

    const createRes = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken },
    });
    const roomCode = createRes.roomCode;

    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Thi Sinh 1', playerToken: playerToken1 },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Thi Sinh 2', playerToken: playerToken2 },
    });

    // Start quiz (Q1)
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode, hostToken },
    });

    // Both players answer Q1 to trigger reveal
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, epoch: 1, playerToken: playerToken1, questionIndex: 1, answer: 'b' },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: { roomCode, epoch: 1, playerToken: playerToken2, questionIndex: 1, answer: 'b' },
    });

    // Advance to Q2 (Catchphrase: "Toàn dân")
    const advRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:advance',
      payload: { roomCode, hostToken },
    });
    expect(advRes.ok).toBe(true);

    // Pre-reveal check: verify letter hint is provided but raw answer is not leaked!
    const subQ2 = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken1,
      connectionId: 'c1',
    });
    expect(subQ2!.room.phase).toBe('question');
    expect(subQ2!.currentQuestion!.type).toBe('catchphrase');
    expect((subQ2!.currentQuestion as any).correctAnswer).toBeUndefined();
    expect(subQ2!.currentQuestion!.letterHint).toBeDefined();
    expect(subQ2!.currentQuestion!.letterHint!.wordLengths).toEqual([4, 3]);

    // 1. Wrong attempt: returns error with canRetry: true, does NOT record answer
    const wrongRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: playerToken1,
        questionIndex: 2,
        answer: 'Nhân dân', // wrong catchphrase
      },
    });
    expect(wrongRes.ok).toBe(false);
    expect(wrongRes.error).toContain('Đáp án chưa chính xác');
    expect(wrongRes.canRetry).toBe(true);

    // Verify player is NOT marked answered in snapshot
    const subAfterWrong = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken1,
      connectionId: 'c1',
    });
    expect(subAfterWrong!.myState!.hasAnsweredCurrent).toBe(false);
    expect(subAfterWrong!.room.phase).toBe('question');

    // 2. Client attempts to spoof an untrusted score field: server ignores client score and computes floor(remainingMs/10)
    // Accent/casing/whitespace normalization: "  toan   dan  " -> accepted!
    const correctRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: playerToken1,
        questionIndex: 2,
        answer: '   toan   dan  ',
        clientSpoofedScore: 999999,
      },
    });
    expect(correctRes.ok).toBe(true);
    expect(correctRes.acknowledged).toBe(true);

    // Verify player IS now marked answered
    const subAfterCorrect = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: playerToken1,
      connectionId: 'c1',
    });
    expect(subAfterCorrect!.myState!.hasAnsweredCurrent).toBe(true);

    // 3. Duplicate submission after correct: rejected
    const dupRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: playerToken1,
        questionIndex: 2,
        answer: 'Toàn dân',
      },
    });
    expect(dupRes.ok).toBe(false);
    expect(dupRes.error).toContain('đã nộp câu trả lời cho câu hỏi này');

    // 4. Stale epoch rejection
    const staleEpochRes = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 999,
        playerToken: playerToken2,
        questionIndex: 2,
        answer: 'Toàn dân',
      },
    });
    expect(staleEpochRes.ok).toBe(false);
    expect(staleEpochRes.error).toContain('Phiên thi đấu (epoch) không khớp');

    // 5. Player 2 submits uppercase unaccented "TOAN DAN" -> triggers early reveal because all connected answered!
    const p2Res = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:answer',
      payload: {
        roomCode,
        epoch: 1,
        playerToken: playerToken2,
        questionIndex: 2,
        answer: 'TOAN DAN',
      },
    });
    expect(p2Res.ok).toBe(true);

    // Room reveals
    const subRevealed = await t.query(anyApi.quiz.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'ch',
    });
    expect(subRevealed!.room.phase).toBe('revealing');
    expect(subRevealed!.revealData!.correctAnswer).toBe('Toàn dân');

    // Both players earned server-authoritative score <= 6000 per round (total <= 12000 for 2 rounds)
    for (const p of subRevealed!.leaderboard) {
      expect(p.totalScore).toBeGreaterThan(6000);
      expect(p.totalScore).toBeLessThanOrEqual(12000);
    }
  });

  // ─── 15. Security Regressions for hostforce and hostfinish ─────────────
  it('strictly enforces authorization, phase, closed, and cross-room guards on quiz:force and quiz:finish', async () => {
    const t = convexTest(schema, modules);
    const hostTokenA = make64Hex('1');
    const hostTokenB = make64Hex('2');
    const playerToken = make64Hex('3');

    const resA = await t.mutation(anyApi.quiz.command, {
      event: 'room:create',
      payload: { hostToken: hostTokenA },
    });
    const roomCodeA = resA.roomCode;

    // 1. In lobby: quiz:force and quiz:finish MUST be rejected
    const forceInLobby = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:force',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(forceInLobby.ok).toBe(false);
    expect(forceInLobby.error).toContain('trạng thái câu hỏi');

    const finishInLobby = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:finish',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(finishInLobby.ok).toBe(false);
    expect(finishInLobby.error).toContain('đang trong trận thi đấu');

    // Join player & start quiz
    await t.mutation(anyApi.quiz.command, {
      event: 'room:join',
      payload: { roomCode: roomCodeA, nickname: 'Hoc Vien', playerToken },
    });
    await t.mutation(anyApi.quiz.command, {
      event: 'quiz:start',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });

    // 2. Unauthorized / playerToken / cross-room hostToken rejected
    const forcePlayer = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:force',
      payload: { roomCode: roomCodeA, hostToken: playerToken },
    });
    expect(forcePlayer.ok).toBe(false);

    const finishCross = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:finish',
      payload: { roomCode: roomCodeA, hostToken: hostTokenB },
    });
    expect(finishCross.ok).toBe(false);

    // 3. Invalid / non-hex token rejected
    const forceBogus = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:force',
      payload: { roomCode: roomCodeA, hostToken: 'invalid_token' },
    });
    expect(forceBogus.ok).toBe(false);
    expect(forceBogus.error).toContain('không hợp lệ');

    // 4. Legitimate host calls quiz:force -> moves to revealing
    const validForce = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:force',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(validForce.ok).toBe(true);

    let sub = await t.query(anyApi.quiz.subscribe, {
      roomCode: roomCodeA,
      token: hostTokenA,
      connectionId: 'ch',
    });
    expect(sub!.room.phase).toBe('revealing');

    // 5. quiz:force rejected when already in revealing
    const forceInReveal = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:force',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(forceInReveal.ok).toBe(false);

    // 6. Legitimate host calls quiz:finish -> moves to finished
    const validFinish = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:finish',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(validFinish.ok).toBe(true);

    sub = await t.query(anyApi.quiz.subscribe, {
      roomCode: roomCodeA,
      token: hostTokenA,
      connectionId: 'ch',
    });
    expect(sub!.room.phase).toBe('finished');

    // 7. quiz:finish rejected when already finished
    const finishAgain = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:finish',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(finishAgain.ok).toBe(false);

    // 8. Close room -> neither force nor finish can be performed on closed room (cannot revive)
    await t.mutation(anyApi.quiz.command, {
      event: 'room:close',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });

    const forceClosed = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:force',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(forceClosed.ok).toBe(false);
    expect(forceClosed.error).toContain('đã đóng');

    const finishClosed = await t.mutation(anyApi.quiz.command, {
      event: 'quiz:finish',
      payload: { roomCode: roomCodeA, hostToken: hostTokenA },
    });
    expect(finishClosed.ok).toBe(false);
    expect(finishClosed.error).toContain('đã đóng');
  });
  it('keeps results visible until host advances and ignores the previous reveal timer', async () => {
    const t = convexTest(schema, modules);
    const hostToken = make64Hex('a'), playerToken = make64Hex('b');
    const created = await t.mutation(anyApi.quiz.command, { event: 'room:create', payload: { hostToken } });
    const roomCode = created.roomCode;
    await t.mutation(anyApi.quiz.command, { event: 'room:join', payload: { roomCode, playerToken, nickname: 'Timer test' } });
    await t.mutation(anyApi.quiz.command, { event: 'quiz:start', payload: { roomCode, hostToken } });
    await t.mutation(anyApi.quiz.command, { event: 'quiz:answer', payload: { roomCode, playerToken, epoch: 1, questionIndex: 1, answer: QUIZ_QUESTIONS[0].correctOptionId } });
    const room = await t.run(async ctx => ctx.db.query('quizRooms').first());
    expect(room!.phase).toBe('revealing');
    const timer = { roomCode, epoch: room!.epoch, questionIndex: 1, generation: room!.generation };
    await t.mutation(anyApi.quizScheduler.resolveRevealTimer, timer);
    const results = await t.run(async ctx => ctx.db.query('quizRooms').first());
    expect(results!.phase).toBe('revealing');
    expect(results!.currentQuestionIndex).toBe(1);
    expect(results!.revealDeadlineMs).toBeNull();
    await t.mutation(anyApi.quiz.command, { event: 'quiz:advance', payload: { roomCode, hostToken } });
    await t.mutation(anyApi.quizScheduler.resolveRevealTimer, timer);
    const next = await t.run(async ctx => ctx.db.query('quizRooms').first());
    expect(next!.phase).toBe('question');
    expect(next!.currentQuestionIndex).toBe(2);
  });
});
