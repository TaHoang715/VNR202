/**
 * Shared types for "Giữ vững căn cứ" cooperative classroom game.
 *
 * 4 rounds, 90 seconds each, 4-6 teams, food/strength/trust resources.
 * Server-authoritative: clients never modify state directly.
 */

// ─── Tokens & IDs ───────────────────────────────────────────────────

/** Unpredictable room code (6 alphanumeric, no ambiguous chars) */
export type RoomCode = string;

/** Cryptographic token for host identity */
export type HostToken = string;

/** Cryptographic token for player identity (used for reconnect) */
export type PlayerToken = string;

/** Team index 0..5 */
export type TeamIndex = number;

// ─── Game Constants ─────────────────────────────────────────────────

export const GAME_CONSTANTS = {
  MIN_TEAMS: 4,
  MAX_TEAMS: 6,
  TOTAL_ROUNDS: 4,
  ROUND_DURATION_SECONDS: 90,
  /** Room expires after this many ms of inactivity */
  ROOM_TTL_MS: 30 * 60 * 1000, // 30 minutes
  /** Max players per room */
  MAX_PLAYERS: 60,
  /** Max nickname length */
  MAX_NICKNAME_LENGTH: 20,
  /** Rate limit: max events per window */
  RATE_LIMIT_MAX: 30,
  /** Rate limit window in ms */
  RATE_LIMIT_WINDOW_MS: 10_000,
  /** Initial resources per team (calibrated baseline for meaningful tradeoffs) */
  INITIAL_FOOD: 70,
  INITIAL_STRENGTH: 70,
  INITIAL_TRUST: 70,
  /** Collective baseline threshold to survive each round */
  SURVIVAL_THRESHOLD: 40,
  /** Overall victory: average resources across all teams above this */
  VICTORY_THRESHOLD: 50,
  /** Max total aid a team can donate in a round */
  MAX_AID_DONATION_PER_ROUND: 20,
} as const;

// ─── Resources ──────────────────────────────────────────────────────

export interface TeamResources {
  food: number;
  strength: number;
  trust: number;
}

// ─── Scenario & Options ─────────────────────────────────────────────

export interface ScenarioOption {
  id: string;
  label: string;
  /** Resource deltas applied to the choosing team */
  effects: Partial<TeamResources>;
  /** Description of the tradeoff shown to players */
  tradeoffDescription: string;
}

export interface Scenario {
  id: string;
  round: number;
  title: string;
  description: string;
  options: ScenarioOption[];
  /** Index of default option used when no votes or tie */
  defaultOptionIndex: number;
}

// ─── Votes ──────────────────────────────────────────────────────────

export interface Vote {
  playerToken: PlayerToken;
  optionId: string;
  timestamp: number;
}

// ─── Aid ────────────────────────────────────────────────────────────

/** Aid: finite, once per round per donor-recipient pair, no duplicate credit */
export interface AidRecord {
  round: number;
  fromTeam: TeamIndex;
  toTeam: TeamIndex;
  resource: keyof TeamResources;
  amount: number;
}

// ─── Team State ─────────────────────────────────────────────────────

export interface TeamState {
  index: TeamIndex;
  name: string;
  resources: TeamResources;
  /** Player tokens in this team */
  members: PlayerToken[];
  /** Contribution score accumulated over rounds */
  contributionScore: number;
}

// ─── Player ─────────────────────────────────────────────────────────

export interface Player {
  id: string;
  token: PlayerToken;
  nickname: string;
  team: TeamIndex;
  connected: boolean;
  socketId: string | null;
  /** Whether this player has cast a vote this round */
  hasVotedThisRound: boolean;
  /** Whether this player has interacted at all (voted, sent aid, etc.) */
  hasInteracted: boolean;
}

// ─── Room / Game State ──────────────────────────────────────────────

export type RoomPhase =
  | 'lobby'      // waiting for players
  | 'playing'    // round in progress
  | 'paused'     // host paused mid-round
  | 'reviewing'  // between rounds or viewing results
  | 'finished';  // game over

export interface RoundResult {
  round: number;
  scenario: Scenario;
  /** Which option each team resolved to */
  teamChoices: Map<TeamIndex, string>;
  /** Vote counts per team per option */
  voteSummary: Map<TeamIndex, Map<string, number>>;
  /** Resources after resolution */
  resourcesAfter: Map<TeamIndex, TeamResources>;
  /** Aid given during this round */
  aidRecords: AidRecord[];
}

export interface RoomState {
  code: RoomCode;
  hostToken: HostToken;
  phase: RoomPhase;
  /** Number of teams configured */
  numTeams: number;
  teams: TeamState[];
  players: Map<PlayerToken, Player>;
  currentRound: number;
  /** Timestamp when current round started (ms) */
  roundStartedAt: number | null;
  /** Remaining seconds when paused */
  pausedRemainingMs: number | null;
  roundResults: RoundResult[];
  /** Set of "fromTeam-toTeam" keys for current round aid dedup */
  aidThisRound: Set<string>;
  /** Aid records accumulated during current round (carried into result on resolve) */
  currentAidRecords: AidRecord[];
  /** Timer handle for round end */
  roundTimer: ReturnType<typeof setTimeout> | null;
  /** Timer handle for tick interval */
  tickInterval: ReturnType<typeof setInterval> | null;
  /** Last activity timestamp for TTL */
  lastActivity: number;
  /** Scenarios for this game session */
  scenarios: Scenario[];
  /** Optional: actual class size for participation reporting */
  classSize: number | null;
  /** Creation timestamp */
  createdAt: number;
  /** Whether lobby is locked (no new joins) */
  lobbyLocked: boolean;
  /** Set of nicknames in use (lowercase) for duplicate prevention */
  nicknameSet: Set<string>;
}

// ─── Client-facing snapshots (NEVER include hostToken) ──────────────

export interface TeamSnapshot {
  index: number;
  name: string;
  resources: TeamResources;
  memberCount: number;
  contributionScore: number;
}

export interface PlayerSnapshot {
  /** Random public ID, NOT secret bearer token */
  id: string;
  nickname: string;
  team: TeamIndex;
  connected: boolean;
  hasVotedThisRound: boolean;
}

export interface RoundResultSnapshot {
  round: number;
  scenarioTitle: string;
  scenarioDescription: string;
  teamChoices: Record<string, string>;
  voteSummary: Record<string, Record<string, number>>;
  resourcesAfter: Record<string, TeamResources>;
  aidRecords: AidRecord[];
}

export interface RoomSnapshot {
  code: RoomCode;
  phase: RoomPhase;
  numTeams: number;
  teams: TeamSnapshot[];
  players: PlayerSnapshot[];
  currentRound: number;
  roundTimeRemainingMs: number | null;
  roundResults: RoundResultSnapshot[];
  currentScenario: {
    title: string;
    description: string;
    options: ScenarioOption[];
    defaultOptionIndex: number;
  } | null;
  lobbyLocked: boolean;
  /** Participation stats */
  stats: {
    totalJoined: number;
    totalInteracted: number;
    classSize: number | null;
  };
}

// ─── Poll Types ────────────────────────────────────────────────────

export interface PollSnapshot {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  active: boolean;
  userVoteIndex?: number | null;
}

// ─── Socket Events ──────────────────────────────────────────────────

export interface ServerToClientEvents {
  'room:snapshot': (snapshot: RoomSnapshot) => void;
  'room:error': (error: { code: string; message: string }) => void;
  'room:kicked': (reason: string) => void;
  'round:tick': (remainingMs: number) => void;
  'round:resolved': (result: RoundResultSnapshot) => void;
  'game:finished': (summary: {
    victory: boolean;
    teams: TeamSnapshot[];
    roundResults: RoundResultSnapshot[];
    stats: { totalJoined: number; totalInteracted: number; classSize: number | null };
  }) => void;
  'poll:update': (poll: PollSnapshot | null) => void;
}

export interface ClientToServerEvents {
  'room:create': (
    data: { numTeams: number; classSize?: number },
    cb: (resp: { ok: boolean; roomCode?: RoomCode; hostToken?: HostToken; snapshot?: RoomSnapshot; error?: string }) => void
  ) => void;
  'room:join': (
    data: { roomCode: RoomCode; nickname: string; team: TeamIndex },
    cb: (resp: { ok: boolean; playerToken?: PlayerToken; playerId?: string; snapshot?: RoomSnapshot; error?: string }) => void
  ) => void;
  'room:reconnect': (
    data: { roomCode: RoomCode; playerToken: PlayerToken },
    cb: (resp: { ok: boolean; player?: PlayerSnapshot; snapshot?: RoomSnapshot; error?: string }) => void
  ) => void;
  /** Host-only actions */
  'host:reconnect': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; snapshot?: RoomSnapshot; error?: string }) => void
  ) => void;
  'host:start': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'host:pause': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'host:resume': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'host:endRound': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'host:setLobbyLock': (
    data: { roomCode: RoomCode; hostToken: HostToken; locked: boolean },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'host:close': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'host:reset': (
    data: { roomCode: RoomCode; hostToken: HostToken },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  /** Player actions */
  'player:vote': (
    data: { roomCode: RoomCode; playerToken: PlayerToken; optionId: string },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'player:aid': (
    data: {
      roomCode: RoomCode;
      playerToken: PlayerToken;
      toTeam: TeamIndex;
      resource: keyof TeamResources;
      amount: number;
    },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  /** In-talk Poll actions */
  'poll:create': (
    data: { roomCode: RoomCode; hostToken: HostToken; question: string; options: string[] },
    cb: (resp: { ok: boolean; pollId?: string; error?: string }) => void
  ) => void;
  'poll:vote': (
    data: { roomCode: RoomCode; playerToken: PlayerToken; pollId: string; optionIndex: number },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
  'poll:close': (
    data: { roomCode: RoomCode; hostToken: HostToken; pollId: string },
    cb: (resp: { ok: boolean; error?: string }) => void
  ) => void;
}
