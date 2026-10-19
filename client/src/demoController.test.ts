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

import assert from 'node:assert';
import {
  INITIAL_DEMO_BOT_CONFIGS,
  getBotVoteDecision,
  evaluateVictory,
} from './demoController.js';
import type { ScenarioOption, TeamSnapshot } from './types.js';

console.log('--- RUNNING DEMO CONTROLLER TESTS ---');

// Test 1: 10 bots distributed 1/2/4/3 across 4 teams
{
  assert.strictEqual(INITIAL_DEMO_BOT_CONFIGS.length, 10, 'Must have exactly 10 initial bots');
  const countsPerTeam = [0, 0, 0, 0];
  for (const bot of INITIAL_DEMO_BOT_CONFIGS) {
    countsPerTeam[bot.team]++;
    assert.match(bot.nickname, /^Máy \d+/, 'Bot must be explicitly named Máy ...');
  }
  assert.deepStrictEqual(countsPerTeam, [1, 2, 4, 3], 'Distribution must be 1, 2, 4, 3 across teams 0..3');
  console.log('✓ Test 1: 10 bots distributed 1/2/4/3 passed');
}

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

// Test 2: Intra-team voting and different team choices across rounds
{
  for (const scen of mockScenarios) {
    const votesPerTeam = new Map<number, Map<string, number>>();
    for (let t = 0; t < 4; t++) votesPerTeam.set(t, new Map());

    for (const bot of INITIAL_DEMO_BOT_CONFIGS) {
      const decision = getBotVoteDecision(bot.nickname, bot.team, scen.round, scen.options as ScenarioOption[]);
      assert.ok(decision.optionId, `Bot ${bot.nickname} must produce a valid optionId`);
      const map = votesPerTeam.get(bot.team)!;
      map.set(decision.optionId, (map.get(decision.optionId) || 0) + 1);
    }

    // Check that each team has a resolved majority
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

    // Verify team 2 (4 bots) has internal dissent in at least rounds 1, 2, 3, 4
    const team2Map = votesPerTeam.get(2)!;
    assert.ok(team2Map.size >= 2, `Team 2 should show diverse votes in round ${scen.round}`);

    // Verify chosen options across teams are diverse
    const uniqueOptions = new Set(chosenOptions);
    assert.ok(uniqueOptions.size >= 2, `Round ${scen.round} should show distinct team choices`);
  }
  console.log('✓ Test 2: Intra-team voting and diverse team choices passed');
}

// Test 3: Resource simulation across 4 rounds maintains survival (>= 40) and victory (>= 50)
{
  const teams: TeamSnapshot[] = [
    { index: 0, name: 'Đội Bắc Sơn', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 1, contributionScore: 0 },
    { index: 1, name: 'Đội Nam Kỳ', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 2, contributionScore: 0 },
    { index: 2, name: 'Đội Việt Bắc', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 4, contributionScore: 0 },
    { index: 3, name: 'Đội Tây Nguyên', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 3, contributionScore: 0 },
  ];

  for (const scen of mockScenarios) {
    for (const team of teams) {
      // Find winning option for team
      const teamBots = INITIAL_DEMO_BOT_CONFIGS.filter(b => b.team === team.index);
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
      const opt = scen.options.find(o => o.id === chosenId)!;
      team.resources.food += opt.effects.food || 0;
      team.resources.strength += opt.effects.strength || 0;
      team.resources.trust += opt.effects.trust || 0;

      // Verify survival after each round
      assert.ok(team.resources.food >= 40, `Round ${scen.round} Team ${team.name} food ${team.resources.food} must be >= 40`);
      assert.ok(team.resources.strength >= 40, `Round ${scen.round} Team ${team.name} strength ${team.resources.strength} must be >= 40`);
      assert.ok(team.resources.trust >= 40, `Round ${scen.round} Team ${team.name} trust ${team.resources.trust} must be >= 40`);
    }
  }

  const evalResult = evaluateVictory(teams);
  assert.strictEqual(evalResult.hasSurvived, true, 'All teams should survive 4 rounds');
  assert.strictEqual(evalResult.isVictory, true, 'Should achieve collective victory');
  assert.ok(evalResult.globalAverage >= 50, `Global average ${evalResult.globalAverage} must be >= 50`);
  console.log(`✓ Test 3: 4-round simulation passed (Global Avg: ${evalResult.globalAverage})`);
}

// Test 4: evaluateVictory failure cases
{
  const failedTeams: TeamSnapshot[] = [
    { index: 0, name: 'Đội Bắc Sơn', resources: { food: 35, strength: 70, trust: 70 }, memberCount: 1, contributionScore: 0 },
    { index: 1, name: 'Đội Nam Kỳ', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 2, contributionScore: 0 },
  ];
  const evalFailure = evaluateVictory(failedTeams);
  assert.strictEqual(evalFailure.hasSurvived, false, 'Should fail survival if any resource < 40');
  assert.strictEqual(evalFailure.isVictory, false, 'Should not win if not survived');
  assert.strictEqual(evalFailure.failedTeams.length, 1, 'Should identify the failed team and resource');
  console.log('✓ Test 4: evaluateVictory correctly flags failures');
}

console.log('ALL DEMO CONTROLLER TESTS PASSED SUCCESSFULLY!');
