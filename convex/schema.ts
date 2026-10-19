import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostToken: v.string(),
    hostConnectionId: v.optional(v.string()),
    hostLastHeartbeat: v.number(),
    phase: v.union(
      v.literal("lobby"),
      v.literal("playing"),
      v.literal("paused"),
      v.literal("reviewing"),
      v.literal("finished"),
      v.literal("closed")
    ),
    numTeams: v.number(),
    classSize: v.union(v.number(), v.null()),
    lobbyLocked: v.boolean(),
    currentRound: v.number(),
    roundStartedAt: v.union(v.number(), v.null()),
    pausedRemainingMs: v.union(v.number(), v.null()),
    deadlineMs: v.union(v.number(), v.null()),
    epoch: v.number(),
    generation: v.number(),
    pulseGeneration: v.number(),
    createdAt: v.number(),
    lastActivity: v.number(),
    teams: v.array(
      v.object({
        index: v.number(),
        name: v.string(),
        resources: v.object({
          food: v.number(),
          strength: v.number(),
          trust: v.number(),
        }),
        members: v.array(v.string()),
        contributionScore: v.number(),
      })
    ),
    roundResults: v.array(
      v.object({
        round: v.number(),
        scenarioTitle: v.string(),
        scenarioDescription: v.string(),
        teamChoices: v.record(v.string(), v.string()),
        voteSummary: v.record(v.string(), v.record(v.string(), v.number())),
        resourcesAfter: v.record(
          v.string(),
          v.object({
            food: v.number(),
            strength: v.number(),
            trust: v.number(),
          })
        ),
        aidRecords: v.array(
          v.object({
            round: v.number(),
            fromTeam: v.number(),
            toTeam: v.number(),
            resource: v.union(
              v.literal("food"),
              v.literal("strength"),
              v.literal("trust")
            ),
            amount: v.number(),
          })
        ),
      })
    ),
    currentAidRecords: v.array(
      v.object({
        round: v.number(),
        fromTeam: v.number(),
        toTeam: v.number(),
        resource: v.union(
          v.literal("food"),
          v.literal("strength"),
          v.literal("trust")
        ),
        amount: v.number(),
      })
    ),
    aidThisRound: v.array(v.string()),
    finishedSummary: v.union(
      v.null(),
      v.object({
        victory: v.boolean(),
        teams: v.array(
          v.object({
            index: v.number(),
            name: v.string(),
            resources: v.object({
              food: v.number(),
              strength: v.number(),
              trust: v.number(),
            }),
            memberCount: v.number(),
            contributionScore: v.number(),
          })
        ),
        roundResults: v.array(v.any()),
        stats: v.object({
          totalJoined: v.number(),
          totalInteracted: v.number(),
          classSize: v.union(v.number(), v.null()),
        }),
      })
    ),
  })
    .index("by_code", ["code"])
    .index("by_phase", ["phase"]),

  players: defineTable({
    roomCode: v.string(),
    playerToken: v.string(),
    playerId: v.string(),
    nickname: v.string(),
    team: v.number(),
    connected: v.boolean(),
    connectionId: v.string(),
    lastHeartbeat: v.number(),
    hasVotedThisRound: v.boolean(),
    hasInteracted: v.boolean(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_token", ["roomCode", "playerToken"])
    .index("by_room_nickname", ["roomCode", "nickname"])
    .index("by_room_playerId", ["roomCode", "playerId"]),

  votes: defineTable({
    roomCode: v.string(),
    epoch: v.number(),
    round: v.number(),
    team: v.number(),
    playerToken: v.string(),
    optionId: v.string(),
    timestamp: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_epoch_round", ["roomCode", "epoch", "round"])
    .index("by_room_epoch_round_player", ["roomCode", "epoch", "round", "playerToken"])
    .index("by_room_epoch_round_team", ["roomCode", "epoch", "round", "team"]),

  polls: defineTable({
    roomCode: v.string(),
    pollId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_created", ["roomCode", "createdAt"])
    .index("by_pollId", ["pollId"]),

  pollVotes: defineTable({
    roomCode: v.string(),
    pollId: v.string(),
    playerToken: v.string(),
    optionIndex: v.number(),
    timestamp: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_poll", ["pollId"])
    .index("by_poll_player", ["pollId", "playerToken"]),

  presence: defineTable({
    roomCode: v.string(),
    token: v.string(),
    connectionId: v.string(),
    lastHeartbeat: v.number(),
    isHost: v.boolean(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_token", ["roomCode", "token"]),

  // ─── ADDITIVE SCHEMA FOR INDIVIDUAL QUIZ ("Giải mã kháng chiến") ────
  quizRooms: defineTable({
    code: v.string(),
    hostToken: v.string(),
    hostConnectionId: v.optional(v.string()),
    hostLastHeartbeat: v.number(),
    phase: v.union(
      v.literal("lobby"),
      v.literal("question"),
      v.literal("revealing"),
      v.literal("finished"),
      v.literal("closed")
    ),
    classSize: v.union(v.number(), v.null()),
    currentQuestionIndex: v.number(), // 0 in lobby; 1..10 in question/revealing; 10 in finished
    questionStartedAt: v.union(v.number(), v.null()),
    deadlineMs: v.union(v.number(), v.null()),
    revealDeadlineMs: v.union(v.number(), v.null()),
    epoch: v.number(),
    generation: v.number(),
    pulseGeneration: v.number(),
    createdAt: v.number(),
    lastActivity: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_phase", ["phase"]),

  quizPlayers: defineTable({
    roomCode: v.string(),
    playerToken: v.string(),
    playerId: v.string(),
    nickname: v.string(),
    connected: v.boolean(),
    connectionId: v.string(),
    lastHeartbeat: v.number(),
    totalScore: v.number(),
    totalTimeSpentMs: v.number(),
    correctCount: v.number(),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_token", ["roomCode", "playerToken"])
    .index("by_room_nickname", ["roomCode", "nickname"])
    .index("by_room_playerId", ["roomCode", "playerId"]),

  quizAnswers: defineTable({
    roomCode: v.string(),
    epoch: v.number(),
    questionIndex: v.number(),
    playerToken: v.string(),
    playerId: v.string(),
    nickname: v.string(),
    rawAnswer: v.any(),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
    submittedAt: v.number(),
    timeTakenMs: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_epoch_q", ["roomCode", "epoch", "questionIndex"])
    .index("by_room_epoch_q_player", ["roomCode", "epoch", "questionIndex", "playerToken"]),

  quizPolls: defineTable({
    roomCode: v.string(),
    pollId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_created", ["roomCode", "createdAt"])
    .index("by_pollId", ["pollId"]),

  quizPollVotes: defineTable({
    roomCode: v.string(),
    pollId: v.string(),
    playerToken: v.string(),
    optionIndex: v.number(),
    timestamp: v.number(),
  })
    .index("by_room", ["roomCode"])
    .index("by_poll", ["pollId"])
    .index("by_poll_player", ["pollId", "playerToken"]),

  quizPresence: defineTable({
    roomCode: v.string(),
    token: v.string(),
    connectionId: v.string(),
    lastHeartbeat: v.number(),
    isHost: v.boolean(),
  })
    .index("by_room", ["roomCode"])
    .index("by_room_token", ["roomCode", "token"]),
});
