/**
 * Engine unit tests.
 *
 * Tests: voting resolution, resource effects, aid validation/application,
 * round resolution, survival/victory checks, team creation, snapshots.
 */

import {
  resolveVotes,
  applyEffects,
  clampResource,
  averageResource,
  validateAid,
  applyAid,
  aidKey,
  resolveRound,
  checkSurvival,
  checkVictory,
  createInitialTeams,
  getDefaultScenarios,
  teamToSnapshot,
  roundResultToSnapshot,
} from '../engine';
import {
  Scenario,
  Vote,
  TeamState,
  TeamResources,
  GAME_CONSTANTS,
} from '../types';

// ─── Test scenario ──────────────────────────────────────────────────

const testScenario: Scenario = {
  id: 'test1',
  round: 1,
  title: 'Test',
  description: 'Test scenario',
  options: [
    { id: 'a', label: 'A', effects: { food: -10, trust: 10 }, tradeoffDescription: 'Trade A' },
    { id: 'b', label: 'B', effects: { food: 10, strength: -10 }, tradeoffDescription: 'Trade B' },
    { id: 'c', label: 'C', effects: { food: -5, strength: 5, trust: 5 }, tradeoffDescription: 'Trade C' },
  ],
  defaultOptionIndex: 2, // 'c' is default
};

function makeTeam(overrides: Partial<TeamState> = {}): TeamState {
  return {
    index: 0,
    name: 'Test Team',
    resources: { food: 100, strength: 100, trust: 100 },
    members: [],
    contributionScore: 0,
    ...overrides,
  };
}

// ─── Voting ─────────────────────────────────────────────────────────

describe('resolveVotes', () => {
  it('majority wins', () => {
    const votes: Vote[] = [
      { playerToken: 'p1', optionId: 'a', timestamp: 1 },
      { playerToken: 'p2', optionId: 'a', timestamp: 2 },
      { playerToken: 'p3', optionId: 'b', timestamp: 3 },
    ];
    const result = resolveVotes(votes, testScenario);
    expect(result.chosenOptionId).toBe('a');
    expect(result.voteCounts.get('a')).toBe(2);
    expect(result.voteCounts.get('b')).toBe(1);
  });

  it('tie uses default option', () => {
    const votes: Vote[] = [
      { playerToken: 'p1', optionId: 'a', timestamp: 1 },
      { playerToken: 'p2', optionId: 'b', timestamp: 2 },
    ];
    const result = resolveVotes(votes, testScenario);
    expect(result.chosenOptionId).toBe('c'); // defaultOptionIndex = 2
  });

  it('no votes uses default option', () => {
    const result = resolveVotes([], testScenario);
    expect(result.chosenOptionId).toBe('c');
  });

  it('three-way tie uses default', () => {
    const votes: Vote[] = [
      { playerToken: 'p1', optionId: 'a', timestamp: 1 },
      { playerToken: 'p2', optionId: 'b', timestamp: 2 },
      { playerToken: 'p3', optionId: 'c', timestamp: 3 },
    ];
    const result = resolveVotes(votes, testScenario);
    expect(result.chosenOptionId).toBe('c');
  });

  it('ignores votes for invalid options', () => {
    const votes: Vote[] = [
      { playerToken: 'p1', optionId: 'invalid', timestamp: 1 },
      { playerToken: 'p2', optionId: 'a', timestamp: 2 },
    ];
    const result = resolveVotes(votes, testScenario);
    expect(result.chosenOptionId).toBe('a');
  });
});

// ─── Resource effects ───────────────────────────────────────────────

describe('applyEffects', () => {
  it('applies positive and negative effects', () => {
    const res: TeamResources = { food: 100, strength: 100, trust: 100 };
    const result = applyEffects(res, { food: -10, trust: 15 });
    expect(result.food).toBe(90);
    expect(result.trust).toBe(115);
    expect(result.strength).toBe(100);
  });

  it('clamps at 0', () => {
    const res: TeamResources = { food: 5, strength: 100, trust: 100 };
    const result = applyEffects(res, { food: -20 });
    expect(result.food).toBe(0);
  });

  it('clamps at 200', () => {
    const res: TeamResources = { food: 195, strength: 100, trust: 100 };
    const result = applyEffects(res, { food: 20 });
    expect(result.food).toBe(200);
  });
});

describe('clampResource', () => {
  it('clamps to [0, 200]', () => {
    expect(clampResource(-10)).toBe(0);
    expect(clampResource(250)).toBe(200);
    expect(clampResource(100)).toBe(100);
  });
});

describe('averageResource', () => {
  it('computes average of 3 resources', () => {
    expect(averageResource({ food: 90, strength: 120, trust: 90 })).toBe(100);
  });
});

// ─── Aid ────────────────────────────────────────────────────────────

describe('validateAid', () => {
  it('accepts valid aid', () => {
    const from = makeTeam({ index: 0 });
    const to = makeTeam({ index: 1 });
    const record = validateAid(from, to, 'food', 10, 1, new Set());
    expect(record).not.toBeNull();
    expect(record!.amount).toBe(10);
    expect(record!.fromTeam).toBe(0);
    expect(record!.toTeam).toBe(1);
  });

  it('rejects insufficient resources', () => {
    const from = makeTeam({ index: 0, resources: { food: 5, strength: 100, trust: 100 } });
    const to = makeTeam({ index: 1 });
    expect(validateAid(from, to, 'food', 10, 1, new Set())).toBeNull();
  });

  it('rejects self-aid', () => {
    const team = makeTeam({ index: 0 });
    expect(validateAid(team, team, 'food', 10, 1, new Set())).toBeNull();
  });

  it('rejects duplicate aid per round', () => {
    const from = makeTeam({ index: 0 });
    const to = makeTeam({ index: 1 });
    const existing = new Set([aidKey(1, 0, 1)]);
    expect(validateAid(from, to, 'food', 10, 1, existing)).toBeNull();
  });

  it('rejects amount <= 0', () => {
    const from = makeTeam({ index: 0 });
    const to = makeTeam({ index: 1 });
    expect(validateAid(from, to, 'food', 0, 1, new Set())).toBeNull();
    expect(validateAid(from, to, 'food', -5, 1, new Set())).toBeNull();
  });

  it('rejects amount > 20', () => {
    const from = makeTeam({ index: 0 });
    const to = makeTeam({ index: 1 });
    expect(validateAid(from, to, 'food', 25, 1, new Set())).toBeNull();
  });
});

describe('applyAid', () => {
  it('transfers resources correctly', () => {
    const from = makeTeam({ index: 0, resources: { food: 100, strength: 100, trust: 100 } });
    const to = makeTeam({ index: 1, resources: { food: 50, strength: 100, trust: 100 } });
    applyAid(from, to, { round: 1, fromTeam: 0, toTeam: 1, resource: 'food', amount: 15 });
    expect(from.resources.food).toBe(85);
    expect(to.resources.food).toBe(65);
  });

  it('clamps recipient at 200', () => {
    const from = makeTeam({ index: 0 });
    const to = makeTeam({ index: 1, resources: { food: 195, strength: 100, trust: 100 } });
    applyAid(from, to, { round: 1, fromTeam: 0, toTeam: 1, resource: 'food', amount: 20 });
    expect(to.resources.food).toBe(200);
  });
});

// ─── Round resolution ───────────────────────────────────────────────

describe('resolveRound', () => {
  it('resolves a complete round with votes', () => {
    const teams = createInitialTeams(4);
    const votesByTeam = new Map([
      [0, [{ playerToken: 'p1', optionId: 'r1a', timestamp: 1 }]],
      [1, [{ playerToken: 'p2', optionId: 'r1b', timestamp: 1 }]],
    ]);
    const scenarios = getDefaultScenarios();
    const result = resolveRound(teams, scenarios[0], votesByTeam, []);

    expect(result.round).toBe(1);
    expect(result.teamChoices.get(0)).toBe('r1a');
    expect(result.teamChoices.get(1)).toBe('r1b');
    // Teams 2,3 have no votes -> default option (r1c)
    expect(result.teamChoices.get(2)).toBe('r1c');
    expect(result.teamChoices.get(3)).toBe('r1c');
  });

  it('mutates team resources after resolution', () => {
    const teams = createInitialTeams(4);
    const scenarios = getDefaultScenarios();
    resolveRound(teams, scenarios[0], new Map(), []);
    // Initial: 70. Default option r1c: food -15, strength +5, trust +5
    expect(teams[0].resources.food).toBe(55);
    expect(teams[0].resources.strength).toBe(75);
    expect(teams[0].resources.trust).toBe(75);
  });
});

// ─── Survival / Victory ────────────────────────────────────────────

describe('checkSurvival', () => {
  it('passes when all teams above threshold', () => {
    const teams = createInitialTeams(4);
    expect(checkSurvival(teams)).toBe(true);
  });

  it('fails when any team below threshold', () => {
    const teams = createInitialTeams(4);
    teams[2].resources = { food: 10, strength: 10, trust: 10 };
    expect(checkSurvival(teams)).toBe(false);
  });
});

describe('checkVictory', () => {
  it('true when all survive and average above threshold', () => {
    const teams = createInitialTeams(4);
    expect(checkVictory(teams)).toBe(true); // 100 avg > 50
  });

  it('false when a team fails survival', () => {
    const teams = createInitialTeams(4);
    teams[0].resources = { food: 5, strength: 5, trust: 5 };
    expect(checkVictory(teams)).toBe(false);
  });

  it('false when average below threshold', () => {
    const teams = createInitialTeams(4);
    for (const t of teams) {
      t.resources = { food: 45, strength: 45, trust: 45 };
    }
    expect(checkVictory(teams)).toBe(false);
  });
});

// ─── Team creation ──────────────────────────────────────────────────

describe('createInitialTeams', () => {
  it('creates correct number of teams', () => {
    expect(createInitialTeams(4)).toHaveLength(4);
    expect(createInitialTeams(6)).toHaveLength(6);
  });

  it('initializes resources correctly', () => {
    const teams = createInitialTeams(4);
    for (const t of teams) {
      expect(t.resources.food).toBe(GAME_CONSTANTS.INITIAL_FOOD);
      expect(t.resources.strength).toBe(GAME_CONSTANTS.INITIAL_STRENGTH);
      expect(t.resources.trust).toBe(GAME_CONSTANTS.INITIAL_TRUST);
      expect(t.contributionScore).toBe(0);
      expect(t.members).toEqual([]);
    }
  });

  it('has unique names', () => {
    const teams = createInitialTeams(6);
    const names = teams.map((t) => t.name);
    expect(new Set(names).size).toBe(6);
  });
});

// ─── Snapshots ──────────────────────────────────────────────────────

describe('teamToSnapshot', () => {
  it('converts team to snapshot', () => {
    const team = makeTeam({ members: ['p1', 'p2'] });
    const snap = teamToSnapshot(team);
    expect(snap.memberCount).toBe(2);
    expect(snap.resources).toEqual(team.resources);
    expect(snap).not.toHaveProperty('members');
  });
});

describe('roundResultToSnapshot', () => {
  it('converts Maps to Records', () => {
    const teams = createInitialTeams(4);
    const scenarios = getDefaultScenarios();
    const result = resolveRound(teams, scenarios[0], new Map(), []);
    const snap = roundResultToSnapshot(result);
    expect(snap.round).toBe(1);
    expect(typeof snap.teamChoices).toBe('object');
    expect(snap.teamChoices['0']).toBeDefined();
  });
});

describe('getDefaultScenarios', () => {
  it('returns 4 scenarios', () => {
    const scenarios = getDefaultScenarios();
    expect(scenarios).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(scenarios[i].round).toBe(i + 1);
      expect(scenarios[i].options.length).toBeGreaterThanOrEqual(2);
      expect(scenarios[i].defaultOptionIndex).toBeLessThan(scenarios[i].options.length);
    }
  });
});
