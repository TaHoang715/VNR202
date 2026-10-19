export type RoomCode = string;
export type HostToken = string;
export type PlayerToken = string;
export type TeamIndex = number;

export interface TeamResources {
  food: number;
  strength: number;
  trust: number;
}

export interface ScenarioOption {
  id: string;
  label: string;
  effects: Partial<TeamResources>;
  tradeoffDescription: string;
}

export interface Scenario {
  id: string;
  round: number;
  title: string;
  description: string;
  options: ScenarioOption[];
  defaultOptionIndex: number;
}

export interface AidRecord {
  round: number;
  fromTeam: TeamIndex;
  toTeam: TeamIndex;
  resource: 'food' | 'strength' | 'trust';
  amount: number;
}

export interface TeamSnapshot {
  index: number;
  name: string;
  resources: TeamResources;
  memberCount: number;
  contributionScore: number;
}

export interface PlayerSnapshot {
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

export type RoomPhase = 'lobby' | 'playing' | 'paused' | 'reviewing' | 'finished' | 'closed';

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
  stats: {
    totalJoined: number;
    totalInteracted: number;
    classSize: number | null;
  };
}

export interface PollSnapshot {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  active: boolean;
  userVoteIndex?: number | null;
}

export interface SubscribeEnvelope {
  snapshot: RoomSnapshot;
  poll: PollSnapshot | null;
  serverNow: number;
  deadlineMs: number | null;
  epoch: number;
  finished: null | {
    victory: boolean;
    teams: TeamSnapshot[];
    roundResults: RoundResultSnapshot[];
    stats: {
      totalJoined: number;
      totalInteracted: number;
      classSize: number | null;
    };
  };
}

export const GAME_CONSTANTS = {
  MIN_TEAMS: 4,
  MAX_TEAMS: 6,
  TOTAL_ROUNDS: 4,
  ROUND_DURATION_SECONDS: 90,
  ROOM_TTL_MS: 30 * 60 * 1000,
  MAX_PLAYERS: 200,
  MAX_NICKNAME_LENGTH: 20,
  MAX_ROOMS: 20,
  MAX_POLLS_PER_ROOM: 10,
  INITIAL_FOOD: 70,
  INITIAL_STRENGTH: 70,
  INITIAL_TRUST: 70,
  SURVIVAL_THRESHOLD: 40,
  VICTORY_THRESHOLD: 50,
  MAX_AID_DONATION_PER_ROUND: 20,
} as const;
