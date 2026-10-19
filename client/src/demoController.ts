/**
 * Controller and pure helper logic for the interactive live demo.
 *
 * Requirements:
 * - 4 teams, 10 bots distributed 1/2/4/3 across teams 0..3
 * - Each bot votes once through its own authenticated socket
 * - Different choices across teams to demonstrate tradeoffs
 * - Intra-team voting resolution (majority wins)
 * - Safe cancellation and cleanup
 * - Pure victory/survival evaluation matching server engine rules
 */

import type { ScenarioOption, TeamSnapshot } from './types';

export interface DemoBotState {
  id: string;
  nickname: string;
  team: number;
  hasVoted: boolean;
  lastVotedOptionId?: string;
  lastVotedOptionLabel?: string;
}

export const INITIAL_DEMO_BOT_CONFIGS: Array<{ id: string; nickname: string; team: number }> = [
  // Team 0: 1 bot (Đội Bắc Sơn)
  { id: 'bot-1', nickname: 'Máy 1 (Bắc Sơn)', team: 0 },
  // Team 1: 2 bots (Đội Nam Kỳ)
  { id: 'bot-2', nickname: 'Máy 2 (Nam Kỳ)', team: 1 },
  { id: 'bot-3', nickname: 'Máy 3 (Nam Kỳ)', team: 1 },
  // Team 2: 4 bots (Đội Việt Bắc)
  { id: 'bot-4', nickname: 'Máy 4 (Việt Bắc)', team: 2 },
  { id: 'bot-5', nickname: 'Máy 5 (Việt Bắc)', team: 2 },
  { id: 'bot-6', nickname: 'Máy 6 (Việt Bắc)', team: 2 },
  { id: 'bot-7', nickname: 'Máy 7 (Việt Bắc)', team: 2 },
  // Team 3: 3 bots (Đội Tây Nguyên)
  { id: 'bot-8', nickname: 'Máy 8 (Tây Nguyên)', team: 3 },
  { id: 'bot-9', nickname: 'Máy 9 (Tây Nguyên)', team: 3 },
  { id: 'bot-10', nickname: 'Máy 10 (Tây Nguyên)', team: 3 },
];

/**
 * Return which option each bot votes for in a given round.
 * Designed so that:
 * 1. Different teams choose different options to see resource tradeoffs.
 * 2. Multi-bot teams showcase intra-team majority resolution with real dissent.
 * 3. All teams maintain resources >= 40 and final collective average >= 50.
 */
export function getBotVoteDecision(
  botNickname: string,
  team: number,
  round: number,
  options: ScenarioOption[]
): { optionId: string; optionLabel: string } {
  if (!options || options.length === 0) {
    return { optionId: 'default', optionLabel: 'Mặc định' };
  }

  const optA = options[0];
  const optB = options.length > 1 ? options[1] : options[0];
  const optC = options.length > 2 ? options[2] : optB;

  if (round === 1) {
    // Team 0 (1 bot): picks C (Cân đối)
    if (team === 0) return { optionId: optC.id, optionLabel: optC.label };
    // Team 1 (2 bots): both pick B (Trang bị lực lượng)
    if (team === 1) return { optionId: optB.id, optionLabel: optB.label };
    // Team 2 (4 bots): 3 vote A (Lòng dân), 1 votes B -> majority A wins
    if (team === 2) {
      if (botNickname.includes('Máy 7')) return { optionId: optB.id, optionLabel: optB.label };
      return { optionId: optA.id, optionLabel: optA.label };
    }
    // Team 3 (3 bots): 2 vote C (Cân đối), 1 votes A -> majority C wins
    if (team === 3) {
      if (botNickname.includes('Máy 10')) return { optionId: optA.id, optionLabel: optA.label };
      return { optionId: optC.id, optionLabel: optC.label };
    }
  }

  if (round === 2) {
    // Team 0 (1 bot): picks A (Lương thực)
    if (team === 0) return { optionId: optA.id, optionLabel: optA.label };
    // Team 1 (2 bots): both pick A (Lương thực)
    if (team === 1) return { optionId: optA.id, optionLabel: optA.label };
    // Team 2 (4 bots): 3 vote A (Lương thực), 1 votes C (Toàn dân) -> majority A
    if (team === 2) {
      if (botNickname.includes('Máy 6')) return { optionId: optC.id, optionLabel: optC.label };
      return { optionId: optA.id, optionLabel: optA.label };
    }
    // Team 3 (3 bots): 2 vote C (Toàn dân), 1 votes B (Quân sự) -> majority C
    if (team === 3) {
      if (botNickname.includes('Máy 9')) return { optionId: optB.id, optionLabel: optB.label };
      return { optionId: optC.id, optionLabel: optC.label };
    }
  }

  if (round === 3) {
    // Team 0: picks B (Lùi sâu bảo toàn)
    if (team === 0) return { optionId: optB.id, optionLabel: optB.label };
    // Team 1: picks C (Du kích phân tán)
    if (team === 1) return { optionId: optC.id, optionLabel: optC.label };
    // Team 2: 3 vote B, 1 votes C -> majority B
    if (team === 2) {
      if (botNickname.includes('Máy 5')) return { optionId: optC.id, optionLabel: optC.label };
      return { optionId: optB.id, optionLabel: optB.label };
    }
    // Team 3: 2 vote B, 1 votes A -> majority B
    if (team === 3) {
      if (botNickname.includes('Máy 8')) return { optionId: optA.id, optionLabel: optA.label };
      return { optionId: optB.id, optionLabel: optB.label };
    }
  }

  // Round 4
  // Team 0: picks B (Đột phá then chốt)
  if (team === 0) return { optionId: optB.id, optionLabel: optB.label };
  // Team 1: picks B (Đột phá then chốt)
  if (team === 1) return { optionId: optB.id, optionLabel: optB.label };
  // Team 2: 3 vote B, 1 votes A -> majority B
  if (team === 2) {
    if (botNickname.includes('Máy 4')) return { optionId: optA.id, optionLabel: optA.label };
    return { optionId: optB.id, optionLabel: optB.label };
  }
  // Team 3: 2 vote C (Hậu phương), 1 votes B -> majority C
  if (team === 3) {
    if (botNickname.includes('Máy 9')) return { optionId: optB.id, optionLabel: optB.label };
    return { optionId: optC.id, optionLabel: optC.label };
  }

  // Default fallback
  return { optionId: optA.id, optionLabel: optA.label };
}

/**
 * Evaluate victory and survival from actual team snapshots according to server engine rules:
 * - Each team must have food >= 40, strength >= 40, trust >= 40 after every round.
 * - Final collective victory requires survival + global average >= 50.
 */
export function evaluateVictory(teams: TeamSnapshot[]): {
  isVictory: boolean;
  hasSurvived: boolean;
  failedTeams: Array<{ name: string; resource: string; value: number }>;
  globalAverage: number;
} {
  const failedTeams: Array<{ name: string; resource: string; value: number }> = [];
  let totalSum = 0;

  for (const t of teams) {
    const avg = (t.resources.food + t.resources.strength + t.resources.trust) / 3;
    totalSum += avg;

    if (t.resources.food < 40) {
      failedTeams.push({ name: t.name, resource: 'Lương thực', value: t.resources.food });
    }
    if (t.resources.strength < 40) {
      failedTeams.push({ name: t.name, resource: 'Lực lượng', value: t.resources.strength });
    }
    if (t.resources.trust < 40) {
      failedTeams.push({ name: t.name, resource: 'Lòng dân', value: t.resources.trust });
    }
  }

  const rawAverage = teams.length > 0 ? totalSum / teams.length : 0;
  const globalAverage = Math.round(rawAverage * 10) / 10;
  const hasSurvived = failedTeams.length === 0;
  const isVictory = hasSurvived && rawAverage >= 50;

  return { isVictory, hasSurvived, failedTeams, globalAverage };
}
