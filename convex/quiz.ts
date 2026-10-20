import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { anyApi } from "convex/server";
import { Doc } from "./_generated/dataModel";
import {
  QUIZ_CONSTANTS,
  QUIZ_QUESTIONS,
  ClientQuizQuestion,
  QuizRevealData,
  calculateQuestionScore,
  evaluateAnswer,
  sanitizeQuestionForClient,
  extractRevealData,
} from "../shared/quizData";

// ─── Token & Room Code Generators ───────────────────────────────────────

function is64Hex(str: unknown): str is string {
  return typeof str === "string" && /^[a-f0-9]{64}$/i.test(str.trim());
}

function isValidConnectionId(str: unknown): str is string {
  return typeof str === "string" && str.trim().length > 0;
}

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let res = "";
  for (let i = 0; i < 6; i++) {
    res += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return res;
}

function generatePlayerId(): string {
  return "p_" + Math.random().toString(36).substring(2, 10);
}

// ─── Types & Envelopes ─────────────────────────────────────────────────

export interface QuizLeaderboardEntry {
  id: string;
  nickname: string;
  totalScore: number;
  totalTimeSpentMs: number;
  correctCount: number;
  rank: number;
  hasSubmittedCurrent?: boolean;
}

export interface QuizSubscribeEnvelope {
  room: {
    code: string;
    phase: "lobby" | "question" | "revealing" | "finished" | "closed";
    classSize: number | null;
    currentQuestionIndex: number;
    totalQuestions: number;
    deadlineMs: number | null;
    revealDeadlineMs: number | null;
    questionTimeRemainingMs: number | null;
    revealTimeRemainingMs: number | null;
    totalJoined: number;
    connectedCount: number;
    answeredCount: number;
  };
  currentQuestion: ClientQuizQuestion | null;
  revealData: QuizRevealData | null;
  myState: {
    isHost: boolean;
    hasAnsweredCurrent: boolean;
    myAnswer?: any;
    myPointsAwarded?: number;
    myScore: number;
    myRank: number;
  } | null;
  leaderboard: QuizLeaderboardEntry[];
  poll: {
    id: string;
    question: string;
    options: string[];
    voteCounts: number[];
    totalVotes: number;
    active: boolean;
    userVoteIndex: number | null;
  } | null;
  serverNow: number;
  epoch: number;
}

// ─── Query: quiz:subscribe ─────────────────────────────────────────────

export const subscribe = query({
  args: {
    roomCode: v.string(),
    token: v.string(),
    connectionId: v.string(),
  },
  handler: async (ctx, args): Promise<QuizSubscribeEnvelope | null> => {
    const roomCode = args.roomCode.trim().toUpperCase();
    const room = await ctx.db
      .query("quizRooms")
      .withIndex("by_code", (q) => q.eq("code", roomCode))
      .first();

    if (!room) return null;

    const now = Date.now();
    const token = args.token.trim();
    const isHost = is64Hex(token) && room.hostToken === token;

    // Fetch players in room
    const players = await ctx.db
      .query("quizPlayers")
      .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
      .collect();

    const callingPlayer = !isHost && is64Hex(token)
      ? players.find((p) => p.playerToken === token)
      : null;

    // Answers for current question in this epoch
    let answeredCount = 0;
    let myAnswerRecord: Doc<"quizAnswers"> | undefined;
    const currentQuestionAnswersByToken = new Map<string, Doc<"quizAnswers">>();

    if (room.currentQuestionIndex >= 1) {
      const answersForQuestion = await ctx.db
        .query("quizAnswers")
        .withIndex("by_room_epoch_q", (q) =>
          q
            .eq("roomCode", roomCode)
            .eq("epoch", room.epoch)
            .eq("questionIndex", room.currentQuestionIndex)
        )
        .collect();

      answeredCount = answersForQuestion.length;
      for (const a of answersForQuestion) {
        currentQuestionAnswersByToken.set(a.playerToken, a);
      }
      if (callingPlayer) {
        myAnswerRecord = currentQuestionAnswersByToken.get(callingPlayer.playerToken);
      }
    }

    // Mask current-question score/correctCount/time contribution in snapshots until revealing/finished
    const isPreReveal = room.phase === "question";

    interface PlayerVisibleStats {
      player: Doc<"quizPlayers">;
      visibleScore: number;
      visibleTimeSpentMs: number;
      visibleCorrectCount: number;
    }

    const playerStats: PlayerVisibleStats[] = players.map((p) => {
      const a = isPreReveal ? currentQuestionAnswersByToken.get(p.playerToken) : undefined;
      return {
        player: p,
        visibleScore: a ? p.totalScore - a.pointsAwarded : p.totalScore,
        visibleTimeSpentMs: a ? p.totalTimeSpentMs - a.timeTakenMs : p.totalTimeSpentMs,
        visibleCorrectCount: a ? p.correctCount - (a.isCorrect ? 1 : 0) : p.correctCount,
      };
    });

    // Build deterministic leaderboard:
    // 1. visibleScore desc
    // 2. visibleTimeSpentMs asc (faster is better)
    // 3. Nickname asc
    const sortedStats = [...playerStats].sort((a, b) => {
      if (b.visibleScore !== a.visibleScore) {
        return b.visibleScore - a.visibleScore;
      }
      if (a.visibleTimeSpentMs !== b.visibleTimeSpentMs) {
        return a.visibleTimeSpentMs - b.visibleTimeSpentMs;
      }
      return a.player.nickname.localeCompare(b.player.nickname);
    });

    const leaderboard: QuizLeaderboardEntry[] = sortedStats.map((st, idx) => ({
      id: st.player.playerId,
      nickname: st.player.nickname,
      totalScore: st.visibleScore,
      totalTimeSpentMs: st.visibleTimeSpentMs,
      correctCount: st.visibleCorrectCount,
      rank: idx + 1,
      hasSubmittedCurrent: currentQuestionAnswersByToken.has(st.player.playerToken),
    }));

    // Question & Reveal data
    let currentQuestion: ClientQuizQuestion | null = null;
    let revealData: QuizRevealData | null = null;

    if (room.currentQuestionIndex >= 1 && room.currentQuestionIndex <= QUIZ_CONSTANTS.TOTAL_QUESTIONS) {
      const q = QUIZ_QUESTIONS[room.currentQuestionIndex - 1];
      if (q) {
        // ALWAYS sanitize question for client (no answer keys!)
        currentQuestion = sanitizeQuestionForClient(q);

        // ONLY reveal correct answer and explanation during 'revealing' or 'finished' phase!
        if (room.phase === "revealing" || room.phase === "finished") {
          revealData = extractRevealData(q);
        }
      }
    }

    // Player personal state
    let myState = null;
    if (isHost) {
      myState = {
        isHost: true,
        hasAnsweredCurrent: false,
        myScore: 0,
        myRank: 0,
      };
    } else if (callingPlayer) {
      const myStat = playerStats.find((st) => st.player.playerId === callingPlayer.playerId);
      const myRank = leaderboard.findIndex((l) => l.id === callingPlayer.playerId) + 1;
      const visibleMyScore = myStat ? myStat.visibleScore : callingPlayer.totalScore;

      myState = {
        isHost: false,
        hasAnsweredCurrent: Boolean(myAnswerRecord),
        myAnswer: myAnswerRecord ? myAnswerRecord.rawAnswer : undefined,
        myPointsAwarded:
          room.phase === "revealing" || room.phase === "finished"
            ? myAnswerRecord?.pointsAwarded
            : undefined,
        myScore: visibleMyScore,
        myRank: myRank > 0 ? myRank : leaderboard.length + 1,
      };
    }

    // Active or last closed poll for room (preserves results after poll is closed)
    const latestPoll = await ctx.db
      .query("quizPolls")
      .withIndex("by_room_created", (q) => q.eq("roomCode", roomCode))
      .order("desc")
      .first();

    let pollSnapshot = null;
    if (latestPoll) {
      const pollVotes = await ctx.db
        .query("quizPollVotes")
        .withIndex("by_poll", (q) => q.eq("pollId", latestPoll.pollId))
        .collect();

      const voteCounts = new Array(latestPoll.options.length).fill(0);
      let userVoteIndex: number | null = null;

      for (const v of pollVotes) {
        if (v.optionIndex >= 0 && v.optionIndex < voteCounts.length) {
          voteCounts[v.optionIndex]++;
        }
        if (callingPlayer && v.playerToken === callingPlayer.playerToken) {
          userVoteIndex = v.optionIndex;
        }
      }

      pollSnapshot = {
        id: latestPoll.pollId,
        question: latestPoll.question,
        options: latestPoll.options,
        voteCounts,
        totalVotes: pollVotes.length,
        active: latestPoll.active,
        userVoteIndex,
      };
    }

    // Remaining times
    let questionTimeRemainingMs: number | null = null;
    if (room.phase === "question" && room.deadlineMs !== null) {
      questionTimeRemainingMs = Math.max(0, room.deadlineMs - now);
    }

    let revealTimeRemainingMs: number | null = null;
    if (room.phase === "revealing" && room.revealDeadlineMs !== null) {
      revealTimeRemainingMs = Math.max(0, room.revealDeadlineMs - now);
    }

    const connectedCount = players.filter((p) => p.connected).length;

    return {
      room: {
        code: room.code,
        phase: room.phase,
        classSize: room.classSize,
        currentQuestionIndex: room.currentQuestionIndex,
        totalQuestions: QUIZ_CONSTANTS.TOTAL_QUESTIONS,
        deadlineMs: room.deadlineMs,
        revealDeadlineMs: room.revealDeadlineMs,
        questionTimeRemainingMs,
        revealTimeRemainingMs,
        totalJoined: players.length,
        connectedCount,
        answeredCount,
      },
      currentQuestion,
      revealData,
      myState,
      leaderboard,
      poll: pollSnapshot,
      serverNow: now,
      epoch: room.epoch,
    };
  },
});

// ─── Dispatcher Mutation: quiz:command ──────────────────────────────────

export const command = mutation({
  args: {
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const { event, payload } = args;
    const now = Date.now();

    // ─── 1. Room Creation ───────────────────────────────────────────────
    if (event === "room:create") {
      const hostToken = payload?.hostToken;
      if (!is64Hex(hostToken)) {
        return { ok: false, error: "hostToken không hợp lệ (phải là chuỗi hex 64 ký tự)" };
      }

      // Check max rooms cap across all active phases
      const lobbyRooms = await ctx.db
        .query("quizRooms")
        .withIndex("by_phase", (q) => q.eq("phase", "lobby"))
        .collect();
      const questionRooms = await ctx.db
        .query("quizRooms")
        .withIndex("by_phase", (q) => q.eq("phase", "question"))
        .collect();
      const revealingRooms = await ctx.db
        .query("quizRooms")
        .withIndex("by_phase", (q) => q.eq("phase", "revealing"))
        .collect();
      const finishedRooms = await ctx.db
        .query("quizRooms")
        .withIndex("by_phase", (q) => q.eq("phase", "finished"))
        .collect();

      const totalActiveRooms =
        lobbyRooms.length + questionRooms.length + revealingRooms.length + finishedRooms.length;

      if (totalActiveRooms >= QUIZ_CONSTANTS.MAX_ROOMS) {
        return { ok: false, error: "Hệ thống đang quá tải phòng thi đấu. Vui lòng thử lại sau." };
      }

      // Generate unique room code with at most 5 attempts
      let roomCode = "";
      let uniqueFound = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateRoomCode();
        const existing = await ctx.db
          .query("quizRooms")
          .withIndex("by_code", (q) => q.eq("code", candidate))
          .first();
        if (!existing) {
          roomCode = candidate;
          uniqueFound = true;
          break;
        }
      }

      if (!uniqueFound) {
        return {
          ok: false,
          error: "Không thể tạo mã phòng duy nhất sau 5 lần thử. Vui lòng thử lại sau.",
        };
      }

      const classSize =
        typeof payload?.classSize === "number" && payload.classSize > 0
          ? Math.min(200, Math.floor(payload.classSize))
          : null;

      const connectionId = isValidConnectionId(payload?.connectionId)
        ? payload.connectionId.trim()
        : "conn_host";

      await ctx.db.insert("quizRooms", {
        code: roomCode,
        hostToken,
        hostConnectionId: connectionId,
        hostLastHeartbeat: now,
        phase: "lobby",
        classSize,
        currentQuestionIndex: 0,
        questionStartedAt: null,
        deadlineMs: null,
        revealDeadlineMs: null,
        epoch: 1,
        generation: 1,
        pulseGeneration: 1,
        createdAt: now,
        lastActivity: now,
      });

      await ctx.db.insert("quizPresence", {
        roomCode,
        token: hostToken,
        connectionId,
        lastHeartbeat: now,
        isHost: true,
      });

      // Start room pulse chain
      await ctx.scheduler.runAfter(
        30 * 1000,
        anyApi.quizScheduler.quizRoomPulse,
        {
          roomCode,
          pulseGeneration: 1,
        }
      );

      return {
        ok: true,
        roomCode,
        hostToken,
      };
    }

    // ─── 2. Join Room ───────────────────────────────────────────────────
    if (event === "room:join") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const nickname = String(payload?.nickname || "").trim();
      const connectionId = isValidConnectionId(payload?.connectionId)
        ? payload.connectionId.trim()
        : "conn_" + Math.random().toString(36).substring(2, 8);
      const playerToken = is64Hex(payload?.playerToken) ? payload.playerToken.trim() : null;

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.phase === "closed") {
        return { ok: false, error: "Phòng không tồn tại hoặc đã đóng" };
      }

      // Check reconnect via playerToken
      if (playerToken) {
        const existingPlayer = await ctx.db
          .query("quizPlayers")
          .withIndex("by_room_token", (q) =>
            q.eq("roomCode", roomCode).eq("playerToken", playerToken)
          )
          .first();

        if (existingPlayer) {
          await ctx.db.patch(existingPlayer._id, {
            connected: true,
            connectionId,
            lastHeartbeat: now,
          });

          const presence = await ctx.db
            .query("quizPresence")
            .withIndex("by_room_token", (q) =>
              q.eq("roomCode", roomCode).eq("token", playerToken)
            )
            .first();

          if (presence) {
            await ctx.db.patch(presence._id, {
              connectionId,
              lastHeartbeat: now,
            });
          } else {
            await ctx.db.insert("quizPresence", {
              roomCode,
              token: playerToken,
              connectionId,
              lastHeartbeat: now,
              isHost: false,
            });
          }

          return {
            ok: true,
            roomCode,
            playerId: existingPlayer.playerId,
            playerToken: existingPlayer.playerToken,
            nickname: existingPlayer.nickname,
            isReconnect: true,
          };
        }
      }

      // Validate nickname
      if (!nickname || nickname.length < 1 || nickname.length > QUIZ_CONSTANTS.MAX_NICKNAME_LENGTH) {
        return {
          ok: false,
          error: `Biệt danh phải từ 1 đến ${QUIZ_CONSTANTS.MAX_NICKNAME_LENGTH} ký tự`,
        };
      }

      // Check room capacity (up to 200 participants)
      const existingPlayers = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .collect();

      if (existingPlayers.length >= QUIZ_CONSTANTS.MAX_PLAYERS) {
        return { ok: false, error: "Phòng đã đạt sức chứa tối đa (200 người chơi)" };
      }

      // Ensure nickname uniqueness within room
      const dup = existingPlayers.find(
        (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
      );
      if (dup) {
        return {
          ok: false,
          error: "Biệt danh này đã có người sử dụng trong phòng. Hãy chọn biệt danh khác.",
        };
      }

      const newPlayerToken = is64Hex(payload?.playerToken)
        ? payload.playerToken.trim()
        : null;

      if (!newPlayerToken) {
        return { ok: false, error: "Yêu cầu mã xác thực an toàn (playerToken)" };
      }

      const playerId = generatePlayerId();

      await ctx.db.insert("quizPlayers", {
        roomCode,
        playerToken: newPlayerToken,
        playerId,
        nickname,
        connected: true,
        connectionId,
        lastHeartbeat: now,
        totalScore: 0,
        totalTimeSpentMs: 0,
        correctCount: 0,
        joinedAt: now,
      });

      await ctx.db.insert("quizPresence", {
        roomCode,
        token: newPlayerToken,
        connectionId,
        lastHeartbeat: now,
        isHost: false,
      });

      await ctx.db.patch(room._id, { lastActivity: now });

      return {
        ok: true,
        roomCode,
        playerId,
        playerToken: newPlayerToken,
        nickname,
        isReconnect: false,
      };
    }

    // ─── 3. Start Quiz ──────────────────────────────────────────────────
    if (event === "quiz:start") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken) {
        return { ok: false, error: "Không được phép hoặc phòng không tồn tại" };
      }

      if (room.phase !== "lobby") {
        return { ok: false, error: "Trò chơi đã bắt đầu hoặc đã kết thúc" };
      }

      // Close any active polls for this room on quiz start
      const activePolls = await ctx.db
        .query("quizPolls")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .collect();
      for (const p of activePolls) {
        if (p.active) await ctx.db.patch(p._id, { active: false });
      }

      const nextGeneration = room.generation + 1;
      const deadlineMs = now + QUIZ_CONSTANTS.QUESTION_DURATION_MS;

      await ctx.db.patch(room._id, {
        phase: "question",
        currentQuestionIndex: 1,
        questionStartedAt: now,
        deadlineMs,
        revealDeadlineMs: null,
        generation: nextGeneration,
        lastActivity: now,
      });

      // Schedule 25s question timer
      await ctx.scheduler.runAfter(
        QUIZ_CONSTANTS.QUESTION_DURATION_MS,
        anyApi.quizScheduler.resolveQuestionTimer,
        {
          roomCode,
          epoch: room.epoch,
          questionIndex: 1,
          generation: nextGeneration,
        }
      );

      return { ok: true };
    }

    // ─── 4. Submit Answer ───────────────────────────────────────────────
    if (event === "quiz:answer") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const playerToken = String(payload?.playerToken || "").trim();
      const questionIndex = Number(payload?.questionIndex);
      const answer = payload?.answer;
      const epoch = payload?.epoch;

      if (typeof epoch !== "number" || !Number.isInteger(epoch) || !Number.isFinite(epoch)) {
        return { ok: false, error: "Yêu cầu mã phiên (epoch) hợp lệ" };
      }

      if (!Number.isInteger(questionIndex) || questionIndex < 1 || questionIndex > QUIZ_CONSTANTS.TOTAL_QUESTIONS) {
        return { ok: false, error: "Chỉ số câu hỏi không hợp lệ" };
      }

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.phase !== "question") {
        return { ok: false, error: "Câu hỏi hiện tại không ở trạng thái nhận câu trả lời" };
      }

      if (room.epoch !== epoch) {
        return { ok: false, error: "Phiên thi đấu (epoch) không khớp hoặc đã cũ" };
      }

      if (room.currentQuestionIndex !== questionIndex) {
        return { ok: false, error: "Câu hỏi đã chuyển qua câu khác" };
      }

      // Server authoritative time check
      if (room.deadlineMs === null || now > room.deadlineMs) {
        return { ok: false, error: "Đã hết thời gian nộp câu trả lời" };
      }

      const player = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room_token", (q) =>
          q.eq("roomCode", roomCode).eq("playerToken", playerToken)
        )
        .first();

      if (!player) {
        return { ok: false, error: "Người chơi không tồn tại trong phòng" };
      }

      // Check duplicate submission
      const existingAnswer = await ctx.db
        .query("quizAnswers")
        .withIndex("by_room_epoch_q_player", (q) =>
          q
            .eq("roomCode", roomCode)
            .eq("epoch", room.epoch)
            .eq("questionIndex", questionIndex)
            .eq("playerToken", playerToken)
        )
        .first();

      if (existingAnswer) {
        return { ok: false, error: "Bạn đã nộp câu trả lời cho câu hỏi này rồi" };
      }

      const targetQuestion = QUIZ_QUESTIONS[questionIndex - 1];
      if (!targetQuestion) {
        return { ok: false, error: "Không tìm thấy dữ liệu câu hỏi" };
      }

      const isCorrect = evaluateAnswer(targetQuestion, answer);

      // Wrong retry allowed for catchphrase questions without marking answered
      if (targetQuestion.type === "catchphrase" && !isCorrect) {
        return {
          ok: false,
          error: "Đáp án chưa chính xác, hãy thử lại!",
          isCorrect: false,
          canRetry: true,
        };
      }

      const remainingMs = Math.max(0, room.deadlineMs - now);
      const scoreResult = calculateQuestionScore(isCorrect, remainingMs);
      const timeTakenMs = Math.max(0, QUIZ_CONSTANTS.QUESTION_DURATION_MS - remainingMs);

      // Record answer
      await ctx.db.insert("quizAnswers", {
        roomCode,
        epoch: room.epoch,
        questionIndex,
        playerToken,
        playerId: player.playerId,
        nickname: player.nickname,
        rawAnswer: answer,
        isCorrect,
        pointsAwarded: scoreResult.points,
        submittedAt: now,
        timeTakenMs,
      });

      // Update player cumulative stats
      await ctx.db.patch(player._id, {
        totalScore: player.totalScore + scoreResult.points,
        totalTimeSpentMs: player.totalTimeSpentMs + timeTakenMs,
        correctCount: player.correctCount + (isCorrect ? 1 : 0),
        lastHeartbeat: now,
        connected: true,
      });

      await ctx.db.patch(room._id, { lastActivity: now });

      // Check if EVERY currently connected player in room has submitted an answer for current epoch & question
      const connectedPlayers = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .filter((q) => q.eq(q.field("connected"), true))
        .collect();

      const allAnswersCurrent = await ctx.db
        .query("quizAnswers")
        .withIndex("by_room_epoch_q", (q) =>
          q.eq("roomCode", roomCode).eq("epoch", room.epoch).eq("questionIndex", questionIndex)
        )
        .collect();

      const answeredPlayerTokens = new Set(allAnswersCurrent.map((a) => a.playerToken));
      const allConnectedHaveAnswered =
        connectedPlayers.length > 0 &&
        connectedPlayers.every((p) => answeredPlayerTokens.has(p.playerToken));

      if (allConnectedHaveAnswered) {
        // Everyone currently connected has answered! Early reveal!
        const nextGeneration = room.generation + 1;
        const revealDeadlineMs = now + QUIZ_CONSTANTS.REVEAL_DURATION_MS;

        await ctx.db.patch(room._id, {
          phase: "revealing",
          revealDeadlineMs,
          generation: nextGeneration,
          lastActivity: now,
        });

        // Schedule 8s reveal timer
        await ctx.scheduler.runAfter(
          QUIZ_CONSTANTS.REVEAL_DURATION_MS,
          anyApi.quizScheduler.resolveRevealTimer,
          {
            roomCode,
            epoch: room.epoch,
            questionIndex: room.currentQuestionIndex,
            generation: nextGeneration,
          }
        );
      }

      return {
        ok: true,
        acknowledged: true,
      };
    }

    // ─── 5. Advance Question (Host skip reveal timer) ───────────────────
    if (event === "quiz:advance") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken) {
        return { ok: false, error: "Không có quyền thực hiện" };
      }

      if (room.phase !== "revealing") {
        return { ok: false, error: "Chỉ có thể chuyển tiếp khi đang ở trạng thái công bố đáp án" };
      }

      const nextGeneration = room.generation + 1;

      if (room.currentQuestionIndex >= QUIZ_CONSTANTS.TOTAL_QUESTIONS) {
        // Finished
        await ctx.db.patch(room._id, {
          phase: "finished",
          deadlineMs: null,
          revealDeadlineMs: null,
          generation: nextGeneration,
          lastActivity: now,
        });
        return { ok: true, finished: true };
      }

      // Advance to next question
      const nextQuestionIndex = room.currentQuestionIndex + 1;
      const deadlineMs = now + QUIZ_CONSTANTS.QUESTION_DURATION_MS;

      await ctx.db.patch(room._id, {
        phase: "question",
        currentQuestionIndex: nextQuestionIndex,
        questionStartedAt: now,
        deadlineMs,
        revealDeadlineMs: null,
        generation: nextGeneration,
        lastActivity: now,
      });

      // Schedule 25s question timer
      await ctx.scheduler.runAfter(
        QUIZ_CONSTANTS.QUESTION_DURATION_MS,
        anyApi.quizScheduler.resolveQuestionTimer,
        {
          roomCode,
          epoch: room.epoch,
          questionIndex: nextQuestionIndex,
          generation: nextGeneration,
        }
      );

      return { ok: true, finished: false, nextQuestionIndex };
    }

    // ─── 5b. Host Force Round (Qua vòng) ──────────────────────────────
    if (event === "quiz:force") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();

      if (!is64Hex(hostToken)) {
        return { ok: false, error: "Mã xác thực hostToken không hợp lệ" };
      }

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken) {
        return { ok: false, error: "Không có quyền thực hiện hoặc phòng không tồn tại" };
      }

      if (room.phase === "closed") {
        return { ok: false, error: "Phòng thi đấu đã đóng" };
      }

      if (now - room.lastActivity > QUIZ_CONSTANTS.ROOM_TTL_MS) {
        return { ok: false, error: "Phòng thi đấu đã hết hạn hoạt động" };
      }

      if (room.phase !== "question") {
        return { ok: false, error: "Chỉ có thể kết thúc sớm vòng khi đang ở trạng thái câu hỏi" };
      }

      const nextGeneration = room.generation + 1;
      const revealDeadlineMs = now + QUIZ_CONSTANTS.REVEAL_DURATION_MS;

      await ctx.db.patch(room._id, {
        phase: "revealing",
        revealDeadlineMs,
        generation: nextGeneration,
        lastActivity: now,
      });

      await ctx.scheduler.runAfter(
        QUIZ_CONSTANTS.REVEAL_DURATION_MS,
        anyApi.quizScheduler.resolveRevealTimer,
        {
          roomCode,
          epoch: room.epoch,
          questionIndex: room.currentQuestionIndex,
          generation: nextGeneration,
        }
      );

      return { ok: true };
    }

    // ─── 5c. Host Finish Game Early (Kết thúc sớm) ───────────────────
    if (event === "quiz:finish") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();

      if (!is64Hex(hostToken)) {
        return { ok: false, error: "Mã xác thực hostToken không hợp lệ" };
      }

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken) {
        return { ok: false, error: "Không có quyền thực hiện hoặc phòng không tồn tại" };
      }

      if (room.phase === "closed") {
        return { ok: false, error: "Phòng thi đấu đã đóng" };
      }

      if (now - room.lastActivity > QUIZ_CONSTANTS.ROOM_TTL_MS) {
        return { ok: false, error: "Phòng thi đấu đã hết hạn hoạt động" };
      }

      if (room.phase !== "question" && room.phase !== "revealing") {
        return { ok: false, error: "Chỉ có thể kết thúc khi đang trong trận thi đấu (question hoặc revealing)" };
      }

      const nextGeneration = room.generation + 1;
      await ctx.db.patch(room._id, {
        phase: "finished",
        deadlineMs: null,
        revealDeadlineMs: null,
        generation: nextGeneration,
        lastActivity: now,
      });

      return { ok: true };
    }

    // ─── 6. Replay Quiz ─────────────────────────────────────────────────
    if (event === "quiz:replay") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken || room.phase === "closed") {
        return { ok: false, error: "Không có quyền thực hiện hoặc phòng đã đóng" };
      }

      const nextEpoch = room.epoch + 1;
      const nextGeneration = room.generation + 1;

      // Clean up previous epoch answers to keep bounded TTL and prevent unbounded storage
      const oldAnswers = await ctx.db
        .query("quizAnswers")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .collect();
      for (const a of oldAnswers) {
        await ctx.db.delete(a._id);
      }

      // Close any active polls on replay
      const activePolls = await ctx.db
        .query("quizPolls")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .collect();
      for (const p of activePolls) {
        if (p.active) await ctx.db.patch(p._id, { active: false });
      }

      await ctx.db.patch(room._id, {
        phase: "lobby",
        currentQuestionIndex: 0,
        questionStartedAt: null,
        deadlineMs: null,
        revealDeadlineMs: null,
        epoch: nextEpoch,
        generation: nextGeneration,
        lastActivity: now,
      });

      // Reset all players stats for new match
      const players = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .collect();

      for (const p of players) {
        await ctx.db.patch(p._id, {
          totalScore: 0,
          totalTimeSpentMs: 0,
          correctCount: 0,
        });
      }

      return { ok: true, epoch: nextEpoch };
    }

    // ─── 7. Close Room ──────────────────────────────────────────────────
    if (event === "room:close") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken) {
        return { ok: false, error: "Không có quyền đóng phòng" };
      }

      // Close any active polls on room close
      const activePolls = await ctx.db
        .query("quizPolls")
        .withIndex("by_room", (q) => q.eq("roomCode", roomCode))
        .collect();
      for (const p of activePolls) {
        if (p.active) await ctx.db.patch(p._id, { active: false });
      }

      await ctx.db.patch(room._id, {
        phase: "closed",
        generation: room.generation + 1,
        lastActivity: now,
      });

      return { ok: true };
    }

    // ─── 8. Presence Heartbeat ──────────────────────────────────────────
    if (event === "presence:heartbeat") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const token = String(payload?.token || "").trim();
      const connectionId = isValidConnectionId(payload?.connectionId)
        ? payload.connectionId.trim()
        : "conn_" + Math.random().toString(36).substring(2, 8);

      if (!is64Hex(token)) {
        return { ok: false, error: "token không hợp lệ" };
      }

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.phase === "closed") {
        return { ok: false, error: "Phòng không tồn tại hoặc đã đóng" };
      }

      // Authenticate token: either room.hostToken or registered playerToken in this room
      const isActualHost = room.hostToken === token;
      let existingPlayer: Doc<"quizPlayers"> | null = null;

      if (!isActualHost) {
        existingPlayer = await ctx.db
          .query("quizPlayers")
          .withIndex("by_room_token", (q) => q.eq("roomCode", roomCode).eq("playerToken", token))
          .first();

        if (!existingPlayer) {
          return {
            ok: false,
            error: "Mã xác thực không thuộc về chủ phòng hoặc người chơi trong phòng này",
          };
        }
      }

      const derivedIsHost = isActualHost;

      const presence = await ctx.db
        .query("quizPresence")
        .withIndex("by_room_token", (q) => q.eq("roomCode", roomCode).eq("token", token))
        .first();

      if (presence) {
        await ctx.db.patch(presence._id, {
          lastHeartbeat: now,
          connectionId,
          isHost: derivedIsHost,
        });
      } else {
        await ctx.db.insert("quizPresence", {
          roomCode,
          token,
          connectionId,
          lastHeartbeat: now,
          isHost: derivedIsHost,
        });
      }

      if (derivedIsHost) {
        await ctx.db.patch(room._id, {
          hostLastHeartbeat: now,
          hostConnectionId: connectionId,
          lastActivity: now,
        });
      } else if (existingPlayer) {
        await ctx.db.patch(existingPlayer._id, {
          connected: true,
          lastHeartbeat: now,
          connectionId,
        });
      }

      return { ok: true, isHost: derivedIsHost };
    }

    // ─── 9. Poll Integration: Create Poll ───────────────────────────────
    if (event === "poll:create") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();
      const question = String(payload?.question || "").trim();
      const options = Array.isArray(payload?.options)
        ? payload.options.map((o: any) => String(o || "").trim())
        : [];

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.phase === "closed") {
        return { ok: false, error: "Phòng không tồn tại hoặc đã đóng" };
      }

      if (room.hostToken !== hostToken) {
        return { ok: false, error: "Không có quyền tạo khảo sát" };
      }

      if (
        !question ||
        question.length < 5 ||
        question.length > QUIZ_CONSTANTS.MAX_POLL_QUESTION_LENGTH ||
        options.length < 2 ||
        options.length > QUIZ_CONSTANTS.MAX_POLL_OPTIONS ||
        options.some(
          (o: string) =>
            !o || o.length < 1 || o.length > QUIZ_CONSTANTS.MAX_POLL_OPTION_LENGTH
        )
      ) {
        return { ok: false, error: "Câu hỏi hoặc các lựa chọn khảo sát không hợp lệ" };
      }

      // Close prior active polls for this room and prune old polls to keep bounded retention
      const existingPolls = await ctx.db
        .query("quizPolls")
        .withIndex("by_room_created", (q) => q.eq("roomCode", roomCode))
        .collect();

      for (const ep of existingPolls) {
        if (ep.active) {
          await ctx.db.patch(ep._id, { active: false });
        }
      }

      if (existingPolls.length >= QUIZ_CONSTANTS.MAX_POLLS_PER_ROOM) {
        const pollsToDelete = existingPolls.slice(
          0,
          existingPolls.length - (QUIZ_CONSTANTS.MAX_POLLS_PER_ROOM - 1)
        );
        for (const oldPoll of pollsToDelete) {
          const votes = await ctx.db
            .query("quizPollVotes")
            .withIndex("by_poll", (q) => q.eq("pollId", oldPoll.pollId))
            .collect();
          for (const v of votes) {
            await ctx.db.delete(v._id);
          }
          await ctx.db.delete(oldPoll._id);
        }
      }

      const pollId = "poll_" + Math.random().toString(36).substring(2, 10);
      await ctx.db.insert("quizPolls", {
        roomCode,
        pollId,
        question,
        options,
        active: true,
        createdAt: now,
      });

      await ctx.db.patch(room._id, { lastActivity: now });

      return { ok: true, pollId };
    }

    // ─── 10. Poll Integration: Vote Poll ────────────────────────────────
    if (event === "poll:vote") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const playerToken = String(payload?.playerToken || "").trim();
      const pollId = String(payload?.pollId || "").trim();
      const rawOptionIndex = payload?.optionIndex;

      if (!is64Hex(playerToken)) {
        return { ok: false, error: "playerToken không hợp lệ" };
      }

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.phase === "closed") {
        return { ok: false, error: "Phòng không tồn tại hoặc đã đóng" };
      }

      const player = await ctx.db
        .query("quizPlayers")
        .withIndex("by_room_token", (q) => q.eq("roomCode", roomCode).eq("playerToken", playerToken))
        .first();

      if (!player) {
        return { ok: false, error: "Người chơi chưa tham gia phòng thi đấu này" };
      }

      const poll = await ctx.db
        .query("quizPolls")
        .withIndex("by_pollId", (q) => q.eq("pollId", pollId))
        .first();

      if (!poll || !poll.active || poll.roomCode !== roomCode) {
        return { ok: false, error: "Khảo sát không tồn tại hoặc đã đóng" };
      }

      if (
        typeof rawOptionIndex !== "number" ||
        !Number.isInteger(rawOptionIndex) ||
        !Number.isFinite(rawOptionIndex) ||
        rawOptionIndex < 0 ||
        rawOptionIndex >= poll.options.length
      ) {
        return { ok: false, error: "Lựa chọn khảo sát không hợp lệ" };
      }

      const optionIndex = rawOptionIndex;

      const existingVote = await ctx.db
        .query("quizPollVotes")
        .withIndex("by_poll_player", (q) =>
          q.eq("pollId", pollId).eq("playerToken", playerToken)
        )
        .first();

      if (existingVote) {
        // Update vote
        await ctx.db.patch(existingVote._id, {
          optionIndex,
          timestamp: now,
        });
      } else {
        await ctx.db.insert("quizPollVotes", {
          roomCode,
          pollId,
          playerToken,
          optionIndex,
          timestamp: now,
        });
      }

      return { ok: true };
    }

    // ─── 11. Poll Integration: Close Poll ───────────────────────────────
    if (event === "poll:close") {
      const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
      const hostToken = String(payload?.hostToken || "").trim();
      const pollId = String(payload?.pollId || "").trim();

      const room = await ctx.db
        .query("quizRooms")
        .withIndex("by_code", (q) => q.eq("code", roomCode))
        .first();

      if (!room || room.hostToken !== hostToken || room.phase === "closed") {
        return { ok: false, error: "Không có quyền đóng khảo sát hoặc phòng đã đóng" };
      }

      const poll = await ctx.db
        .query("quizPolls")
        .withIndex("by_pollId", (q) => q.eq("pollId", pollId))
        .first();

      if (!poll || poll.roomCode !== roomCode) {
        return { ok: false, error: "Khảo sát không tồn tại trong phòng thi này" };
      }

      if (poll.active) {
        await ctx.db.patch(poll._id, { active: false });
      }

      await ctx.db.patch(room._id, { lastActivity: now });

      return { ok: true };
    }

    return { ok: false, error: `Sự kiện không được hỗ trợ: ${event}` };
  },
});
