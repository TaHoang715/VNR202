/**
 * Focused automated test suite for demoController logic.
 *
 * Verifies:
 * 1. 10 bots distributed exactly 1/2/4/3 across 4 teams.
 * 2. Each bot gets exactly one intended vote per round.
 * 3. Different team choices demonstrate tradeoffs.
 * 4. Intra-team voting resolution (majority wins).
 * 5. Resource simulation ensures survival (>= 40) and victory (>= 50).
 * 6. Edge cases and evaluateVictory function.
 */

import { describe, it, expect } from 'vitest';
import {
  INITIAL_DEMO_BOT_CONFIGS,
  getBotVoteDecision,
  evaluateVictory,
} from './demoController.js';
import type { ScenarioOption, TeamSnapshot } from './types.js';

// Dummy scenarios matching server defaults
const mockScenarios = [
  {
    round: 1,
    options: [
      { id: 'r1a', label: 'Lòng dân', effects: { food: -10, trust: 15, strength: -10 }, tradeoffDescription: '' },
      { id: 'r1b', label: 'Lực lượng', effects: { food: -10, strength: 15, trust: -10 }, tradeoffDescription: '' },
      { id: 'r1c', label: 'Cân đối', effects: { food: -15, strength: 5, trust: 5 }, tradeoffDescription: '' },
    ],
  },
  {
    round: 2,
    options: [
      { id: 'r2a', label: 'Lương thực', effects: { food: 15, strength: -10, trust: 5 }, tradeoffDescription: '' },
      { id: 'r2b', label: 'Quân sự', effects: { food: -10, strength: 15, trust: 5 }, tradeoffDescription: '' },
      { id: 'r2c', label: 'Toàn dân', effects: { food: -5, strength: -5, trust: 20 }, tradeoffDescription: '' },
    ],
  },
  {
    round: 3,
    options: [
      { id: 'r3a', label: 'Bám trụ', effects: { food: -5, strength: -15, trust: 10 }, tradeoffDescription: '' },
      { id: 'r3b', label: 'Lùi sâu', effects: { food: -10, strength: 5, trust: -5 }, tradeoffDescription: '' },
      { id: 'r3c', label: 'Du kích', effects: { food: -10, strength: -5, trust: 5 }, tradeoffDescription: '' },
    ],
  },
  {
    round: 4,
    options: [
      { id: 'r4a', label: 'Tiến công', effects: { food: -15, strength: -15, trust: 20 }, tradeoffDescription: '' },
      { id: 'r4b', label: 'Đột phá', effects: { food: -10, strength: -10, trust: 10 }, tradeoffDescription: '' },
      { id: 'r4c', label: 'Hậu phương', effects: { food: 10, strength: 5, trust: -15 }, tradeoffDescription: '' },
    ],
  },
];

describe('demoController', () => {
  it('distributes 10 bots 1/2/4/3 across 4 teams', () => {
    expect(INITIAL_DEMO_BOT_CONFIGS.length).toBe(10);
    const countsPerTeam = [0, 0, 0, 0];
    for (const bot of INITIAL_DEMO_BOT_CONFIGS) {
      countsPerTeam[bot.team]++;
      expect(bot.nickname).toMatch(/^Máy \d+/);
    }
    expect(countsPerTeam).toEqual([1, 2, 4, 3]);
  });

  it('resolves intra-team voting and produces diverse team choices across rounds', () => {
    for (const scen of mockScenarios) {
      const votesPerTeam = new Map<number, Map<string, number>>();
      for (let t = 0; t < 4; t++) votesPerTeam.set(t, new Map());

      for (const bot of INITIAL_DEMO_BOT_CONFIGS) {
        const decision = getBotVoteDecision(bot.nickname, bot.team, scen.round, scen.options as ScenarioOption[]);
        expect(decision.optionId).toBeTruthy();
        const map = votesPerTeam.get(bot.team)!;
        map.set(decision.optionId, (map.get(decision.optionId) || 0) + 1);
      }

      const chosenOptions: string[] = [];
      for (let t = 0; t < 4; t++) {
        const map = votesPerTeam.get(t)!;
        let maxCount = -1;
        let winner = '';
        for (const [optId, count] of map.entries()) {
          if (count > maxCount) {
            maxCount = count;
            winner = optId;
          }
        }
        chosenOptions.push(winner);
      }

      // Verify team 2 (4 bots) has internal dissent in each round
      const team2Map = votesPerTeam.get(2)!;
      expect(team2Map.size).toBeGreaterThanOrEqual(2);

      // Verify chosen options across teams are diverse
      const uniqueOptions = new Set(chosenOptions);
      expect(uniqueOptions.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('maintains survival (>= 40) and victory (>= 50) across 4 rounds in simulation', () => {
    const teams: TeamSnapshot[] = [
      { index: 0, name: 'Đội Bắc Sơn', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 1, contributionScore: 0 },
      { index: 1, name: 'Đội Nam Kỳ', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 2, contributionScore: 0 },
      { index: 2, name: 'Đội Việt Bắc', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 4, contributionScore: 0 },
      { index: 3, name: 'Đội Tây Nguyên', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 3, contributionScore: 0 },
    ];

    for (const scen of mockScenarios) {
      for (const team of teams) {
        const teamBots = INITIAL_DEMO_BOT_CONFIGS.filter((b) => b.team === team.index);
        const voteTally: Record<string, number> = {};
        for (const b of teamBots) {
          const dec = getBotVoteDecision(b.nickname, b.team, scen.round, scen.options as ScenarioOption[]);
          voteTally[dec.optionId] = (voteTally[dec.optionId] || 0) + 1;
        }
        let chosenId = scen.options[0].id;
        let maxCount = -1;
        for (const [id, count] of Object.entries(voteTally)) {
          if (count > maxCount) {
            maxCount = count;
            chosenId = id;
          }
        }
        const opt = scen.options.find((o) => o.id === chosenId)!;
        team.resources.food += opt.effects.food || 0;
        team.resources.strength += opt.effects.strength || 0;
        team.resources.trust += opt.effects.trust || 0;

        expect(team.resources.food).toBeGreaterThanOrEqual(40);
        expect(team.resources.strength).toBeGreaterThanOrEqual(40);
        expect(team.resources.trust).toBeGreaterThanOrEqual(40);
      }
    }

    const evalResult = evaluateVictory(teams);
    expect(evalResult.hasSurvived).toBe(true);
    expect(evalResult.isVictory).toBe(true);
    expect(evalResult.globalAverage).toBeGreaterThanOrEqual(50);
  });

  it('correctly flags failure if any resource < 40 or overall < 50', () => {
    const failedTeams: TeamSnapshot[] = [
      { index: 0, name: 'Đội Bắc Sơn', resources: { food: 35, strength: 70, trust: 70 }, memberCount: 1, contributionScore: 0 },
      { index: 1, name: 'Đội Nam Kỳ', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 2, contributionScore: 0 },
    ];
    const evalFailure = evaluateVictory(failedTeams);
    expect(evalFailure.hasSurvived).toBe(false);
    expect(evalFailure.isVictory).toBe(false);
    expect(evalFailure.failedTeams.length).toBe(1);
  });
});
