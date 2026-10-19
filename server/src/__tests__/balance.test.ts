import { applyEffects, checkSurvival, checkVictory, createInitialTeams, getDefaultScenarios } from '../engine';

describe('Resource survival and policy balance', () => {
  it('cannot replace exhausted food with a surplus of other resources', () => {
    const teams = createInitialTeams(4);
    teams[0].resources = { food: 39, strength: 150, trust: 150 };
    expect(checkSurvival(teams)).toBe(false);
    expect(checkVictory(teams)).toBe(false);
  });
  it('has both viable and failing strategies among all 81 four-round policies', () => {
    let wins = 0;
    let losses = 0;
    for (let policy = 0; policy < 81; policy++) {
      const teams = createInitialTeams(4);
      let choices = policy;
      let alive = true;
      for (const scenario of getDefaultScenarios()) {
        const option = scenario.options[choices % 3];
        choices = Math.floor(choices / 3);
        for (const team of teams) team.resources = applyEffects(team.resources, option.effects);
        if (!checkSurvival(teams)) { alive = false; break; }
      }
      if (alive && checkVictory(teams)) wins++;
      else losses++;
    }
    expect(wins).toBeGreaterThan(10);
    expect(losses).toBeGreaterThan(10);
    expect(wins + losses).toBe(81);
  });
});
