/**
 * Game engine: pure logic for "Giữ vững căn cứ".
 *
 * - 4 rounds of cooperative decision-making
 * - Each team votes on scenario options, majority wins
 * - Deterministic tie-breaking: default option (disclosed before play)
 * - No-vote also resolves to default option
 * - Finite aid between teams, once per donor-recipient pair per round
 * - Resources clamp to [0, 200]
 */

import {
  TeamResources,
  TeamState,
  Scenario,
  ScenarioOption,
  Vote,
  AidRecord,
  RoundResult,
  RoundResultSnapshot,
  TeamSnapshot,
  GAME_CONSTANTS,
  TeamIndex,
  PlayerToken,
} from './types';

// ─── Scenarios ──────────────────────────────────────────────────────

/**
 * Built-in scenarios for 4 rounds.
 * Each presents a dilemma with resource tradeoffs.
 * Labels are concise; narrative/history context is frontend's job.
 */
export function getDefaultScenarios(): Scenario[] {
  return [
    {
      id: 'r1',
      round: 1,
      title: 'Vòng 1: Phân bổ nguồn lực ban đầu (Mùa đông 1946)',
      description:
        'Kháng chiến toàn quốc bùng nổ. Nguồn dự trữ có hạn, căn cứ cần quyết định trọng tâm phân bổ ban đầu giữa hậu phương và tiền tuyến.',
      options: [
        {
          id: 'r1a',
          label: 'Ưu tiên củng cố lòng dân',
          effects: { food: -10, trust: 15, strength: -10 },
          tradeoffDescription: 'Chia sẻ lương thực cho dân; lòng dân tăng cao nhưng trang bị bộ đội thiếu hụt.',
        },
        {
          id: 'r1b',
          label: 'Ưu tiên trang bị lực lượng',
          effects: { food: -10, strength: 15, trust: -10 },
          tradeoffDescription: 'Ưu tiên vũ khí, quân nhu cho bộ đội; lực lượng mạnh nhưng gánh nặng dồn lên dân.',
        },
        {
          id: 'r1c',
          label: 'Điều hòa cân đối hậu cần',
          effects: { food: -15, strength: 5, trust: 5 },
          tradeoffDescription: 'Phân phối đồng đều cả quân và dân; bền vững nhưng tiêu hao kho dự trữ nhanh hơn.',
        },
      ],
      defaultOptionIndex: 2,
    },
    {
      id: 'r2',
      round: 2,
      title: 'Vòng 2: Xây dựng căn cứ địa tự cấp (1947–1948)',
      description:
        'Thực hiện chủ trương tự lực cánh sinh. Đội cần chọn hướng trọng tâm để duy trì sức kháng chiến lâu dài.',
      options: [
        {
          id: 'r2a',
          label: 'Tăng gia sản xuất lương thực',
          effects: { food: 15, strength: -10, trust: 5 },
          tradeoffDescription: 'Đẩy mạnh trồng trọt; bảo đảm lương thực dồi dào nhưng giảm giờ huấn luyện chiến đấu.',
        },
        {
          id: 'r2b',
          label: 'Đẩy mạnh huấn luyện quân sự',
          effects: { food: -10, strength: 15, trust: 5 },
          tradeoffDescription: 'Rèn luyện dân quân, du kích; tinh nhuệ hơn nhưng tiêu tốn thêm lương thực.',
        },
        {
          id: 'r2c',
          label: 'Vận động toàn dân kháng chiến',
          effects: { food: -5, strength: -5, trust: 20 },
          tradeoffDescription: 'Tuyên truyền diệt dốt, đoàn kết thôn bản; củng cố niềm tin tuyệt đối dù tốn công sức.',
        },
      ],
      defaultOptionIndex: 0,
    },
    {
      id: 'r3',
      round: 3,
      title: 'Vòng 3: Đối phó càn quét & bảo vệ cơ sở (1948–1949)',
      description:
        'Đối phương tăng cường bao vây, càn quét căn cứ. Đội phải xác định phương thức tác chiến phù hợp với khả năng.',
      options: [
        {
          id: 'r3a',
          label: 'Tác chiến kiên quyết bám trụ',
          effects: { food: -5, strength: -15, trust: 10 },
          tradeoffDescription: 'Bảo vệ dân làng tại chỗ; uy tín cao nhưng lực lượng chịu tổn thất trực tiếp.',
        },
        {
          id: 'r3b',
          label: 'Lùi sâu bảo toàn lực lượng',
          effects: { food: -10, strength: 5, trust: -5 },
          tradeoffDescription: 'Bảo toàn chủ lực và xưởng vũ khí; tránh tổn thất lớn nhưng cơ sở địa phương lo lắng.',
        },
        {
          id: 'r3c',
          label: 'Tác chiến du kích phân tán',
          effects: { food: -10, strength: -5, trust: 5 },
          tradeoffDescription: 'Đánh nhỏ lẻ tiêu hao địch; duy trì thế trận cân bằng nhưng hao tốn vật tư di chuyển.',
        },
      ],
      defaultOptionIndex: 2,
    },
    {
      id: 'r4',
      round: 4,
      title: 'Vòng 4: Chiến dịch Biên Giới & Giành thế chủ động (1950) [Mô phỏng giả định]',
      description:
        'Thời cơ mở thông biên giới và củng cố căn cứ địa Việt Bắc đã đến. Đội lựa chọn phương án đóng góp nguồn lực (Tình huống và chỉ số mang tính chất giả định phục vụ giáo dục, không phải đánh giá lịch sử bất biến).',
      options: [
        {
          id: 'r4a',
          label: 'Tiến công trọng điểm trên tuyến biên giới',
          effects: { food: -15, strength: -15, trust: 20 },
          tradeoffDescription: 'Huy động lớn lực lượng và dân công; mang lại bước chuyển lớn nhưng tiêu hao nặng nề.',
        },
        {
          id: 'r4b',
          label: 'Đột phá chiến thuật & khai thông hành lang',
          effects: { food: -10, strength: -10, trust: 10 },
          tradeoffDescription: 'Tập trung mũi then chốt; cân đối hơn, bảo toàn lực lượng để duy trì thế trận.',
        },
        {
          id: 'r4c',
          label: 'Củng cố vững chắc hậu phương chiều sâu',
          effects: { food: 10, strength: 5, trust: -15 },
          tradeoffDescription: 'Ưu tiên tích trữ kho tàng cho các năm sau; căn cứ an toàn nhưng giảm khí thế phối hợp.',
        },
      ],
      defaultOptionIndex: 1,
    },
  ];
}

// ─── Resource helpers ───────────────────────────────────────────────

export function clampResource(value: number): number {
  return Math.max(0, Math.min(200, value));
}

export function applyEffects(
  resources: TeamResources,
  effects: Partial<TeamResources>
): TeamResources {
  return {
    food: clampResource(resources.food + (effects.food ?? 0)),
    strength: clampResource(resources.strength + (effects.strength ?? 0)),
    trust: clampResource(resources.trust + (effects.trust ?? 0)),
  };
}

export function averageResource(resources: TeamResources): number {
  return (resources.food + resources.strength + resources.trust) / 3;
}

// ─── Voting ─────────────────────────────────────────────────────────

/**
 * Resolve votes for a team to a single option.
 *
 * Rules:
 * - Majority wins
 * - Tie: use scenario's defaultOptionIndex
 * - No votes: use scenario's defaultOptionIndex
 *
 * Returns the chosen option ID.
 */
export function resolveVotes(
  votes: Vote[],
  scenario: Scenario
): { chosenOptionId: string; voteCounts: Map<string, number> } {
  const voteCounts = new Map<string, number>();
  for (const opt of scenario.options) {
    voteCounts.set(opt.id, 0);
  }
  for (const v of votes) {
    const current = voteCounts.get(v.optionId);
    if (current !== undefined) {
      voteCounts.set(v.optionId, current + 1);
    }
  }

  const defaultOption = scenario.options[scenario.defaultOptionIndex];

  if (votes.length === 0) {
    return { chosenOptionId: defaultOption.id, voteCounts };
  }

  // Find max vote count
  let maxCount = 0;
  for (const count of voteCounts.values()) {
    if (count > maxCount) maxCount = count;
  }

  // Collect options with max count
  const topOptions: string[] = [];
  for (const [optId, count] of voteCounts.entries()) {
    if (count === maxCount) topOptions.push(optId);
  }

  if (topOptions.length === 1) {
    return { chosenOptionId: topOptions[0], voteCounts };
  }

  // Tie: use default
  return { chosenOptionId: defaultOption.id, voteCounts };
}

// ─── Aid validation ─────────────────────────────────────────────────

export function aidKey(round: number, from: TeamIndex, to: TeamIndex): string {
  return `${round}-${from}-${to}`;
}

/**
 * Validate and apply aid between teams.
 * Returns null on invalid aid, otherwise the AidRecord.
 */
export function validateAid(
  fromTeam: TeamState,
  toTeam: TeamState,
  resource: keyof TeamResources,
  amount: number,
  round: number,
  existingAidKeys: Set<string>
): AidRecord | null {
  if (amount <= 0 || amount > 20) return null;
  if (fromTeam.index === toTeam.index) return null;
  if (fromTeam.resources[resource] < amount) return null;

  const key = aidKey(round, fromTeam.index, toTeam.index);
  if (existingAidKeys.has(key)) return null; // already aided this round

  return {
    round,
    fromTeam: fromTeam.index,
    toTeam: toTeam.index,
    resource,
    amount,
  };
}

export function applyAid(
  fromTeam: TeamState,
  toTeam: TeamState,
  record: AidRecord
): void {
  fromTeam.resources[record.resource] = clampResource(
    fromTeam.resources[record.resource] - record.amount
  );
  toTeam.resources[record.resource] = clampResource(
    toTeam.resources[record.resource] + record.amount
  );
}

// ─── Round resolution ───────────────────────────────────────────────

/**
 * Resolve a complete round: tally votes per team, apply effects, return result.
 * This is called exactly once when the round timer expires or host closes the round.
 */
export function resolveRound(
  teams: TeamState[],
  scenario: Scenario,
  votesByTeam: Map<TeamIndex, Vote[]>,
  aidRecords: AidRecord[]
): RoundResult {
  const teamChoices = new Map<TeamIndex, string>();
  const voteSummary = new Map<TeamIndex, Map<string, number>>();
  const resourcesAfter = new Map<TeamIndex, TeamResources>();

  for (const team of teams) {
    const teamVotes = votesByTeam.get(team.index) ?? [];
    const { chosenOptionId, voteCounts } = resolveVotes(teamVotes, scenario);
    teamChoices.set(team.index, chosenOptionId);
    voteSummary.set(team.index, voteCounts);

    // Apply chosen option effects
    const option = scenario.options.find((o) => o.id === chosenOptionId);
    if (option) {
      team.resources = applyEffects(team.resources, option.effects);
    }

    // Contribution score: average of remaining resources
    team.contributionScore += Math.round(averageResource(team.resources));

    resourcesAfter.set(team.index, { ...team.resources });
  }

  return {
    round: scenario.round,
    scenario,
    teamChoices,
    voteSummary,
    resourcesAfter,
    aidRecords,
  };
}

// ─── Victory check ──────────────────────────────────────────────────

/**
 * Check if any team fell below survival threshold during a round.
 */
export function checkSurvival(teams: TeamState[]): boolean {
  for (const team of teams) {
    // A surplus of trust cannot replace exhausted food or forces.
    if (Object.values(team.resources).some(value => value < GAME_CONSTANTS.SURVIVAL_THRESHOLD)) return false;
  }
  return true;
}

/**
 * Final victory: all teams survived all rounds AND average across all teams
 * is above VICTORY_THRESHOLD.
 */
export function checkVictory(teams: TeamState[]): boolean {
  if (!checkSurvival(teams)) return false;
  const totalAvg =
    teams.reduce((sum, t) => sum + averageResource(t.resources), 0) /
    teams.length;
  return totalAvg >= GAME_CONSTANTS.VICTORY_THRESHOLD;
}

// ─── Snapshot helpers ───────────────────────────────────────────────

export function teamToSnapshot(team: TeamState): TeamSnapshot {
  return {
    index: team.index,
    name: team.name,
    resources: { ...team.resources },
    memberCount: team.members.length,
    contributionScore: team.contributionScore,
  };
}

export function roundResultToSnapshot(result: RoundResult): RoundResultSnapshot {
  const teamChoices: Record<string, string> = {};
  for (const [k, v] of result.teamChoices) teamChoices[String(k)] = v;

  const voteSummary: Record<string, Record<string, number>> = {};
  for (const [teamIdx, optMap] of result.voteSummary) {
    const inner: Record<string, number> = {};
    for (const [optId, count] of optMap) inner[optId] = count;
    voteSummary[String(teamIdx)] = inner;
  }

  const resourcesAfter: Record<string, TeamResources> = {};
  for (const [teamIdx, res] of result.resourcesAfter) {
    resourcesAfter[String(teamIdx)] = { ...res };
  }

  return {
    round: result.round,
    scenarioTitle: result.scenario.title,
    scenarioDescription: result.scenario.description,
    teamChoices,
    voteSummary,
    resourcesAfter,
    aidRecords: [...result.aidRecords],
  };
}

// ─── Team name generator ────────────────────────────────────────────

const TEAM_NAMES = [
  'Đội Bắc Sơn',
  'Đội Nam Kỳ',
  'Đội Việt Bắc',
  'Đội Tây Nguyên',
  'Đội Đồng Bằng',
  'Đội Duyên Hải',
];

export function createInitialTeams(numTeams: number): TeamState[] {
  const teams: TeamState[] = [];
  for (let i = 0; i < numTeams; i++) {
    teams.push({
      index: i,
      name: TEAM_NAMES[i] ?? `Đội ${i + 1}`,
      resources: {
        food: GAME_CONSTANTS.INITIAL_FOOD,
        strength: GAME_CONSTANTS.INITIAL_STRENGTH,
        trust: GAME_CONSTANTS.INITIAL_TRUST,
      },
      members: [],
      contributionScore: 0,
    });
  }
  return teams;
}
