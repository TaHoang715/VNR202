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
  resource: keyof TeamResources;
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

export type RoomPhase = 'lobby' | 'playing' | 'paused' | 'reviewing' | 'finished';

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
