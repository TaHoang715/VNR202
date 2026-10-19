# Convex Backend Implementation Report

## Worktree & Branch Summary
- **Worktree**: `D:\academy\KY9\VNR202\.agent\worktrees\convex-backend`
- **Branch**: `codex/convex-backend`
- **Baseline Commit**: `64fa568b9be261710b8550fba79dc36202771709`
- **Target Project Identifier**: `grand-peccary-45` (coordinator isolated project)
- **Dependencies Installed**:
  - `convex@1.47.0` (root workspace dependency)
  - `convex-test@0.0.62` (root workspace devDependency)
  - `vitest@1.6.1` (root workspace devDependency)
- **Scope Compliance**: Strictly confined to allowed files (`convex/`, `tests/convex/`, `package.json`, `package-lock.json`, `vitest.config.ts`, `.agent/BACKEND-REPORT.md`). No modifications to `client/` or `server/` logic. No cloud credentials accessed.

---

## Coordinator Review Findings Addressed & Resolved

1. **Strict Credential & Connection Validation (Finding 1)**:
   - `hostToken` and `playerToken` must be non-empty, 64-hex strings (`/^[a-f0-9]{64}$/i`). Absent or malformed tokens are rejected with structured errors; no `Math.random` fallback credentials.
   - Duplicate `playerToken` within the same room is rejected.
   - Random public `playerId` collisions are checked and re-generated.
   - `connectionId` is strictly required (`non-empty string`).
   - All owner mutations (`host:*` and `player:*`) require matching `connectionId`.
   - On `host:reconnect` / `room:reconnect`, valid tokens take over the active `connectionId`. Replaced sessions are denied mutation access and receive `null` from `game.subscribe`.
   - On `session:disconnect` for host, `hostConnectionId` is retained so only `host:reconnect` can switch connections; no arbitrary token takeover.

2. **Aggregate Team Aid Budget (Finding 2)**:
   - `player:aid` checks aggregate donations across all aid records for the donor team in the current round (`currentTeamAidTotal + amount <= 20`).
   - Rejects aid if total exceeds 20 units, and enforces that all team members share the same donor budget.

3. **Persistent Scheduled Room Pulse & Bounded TTL Cleanup (Finding 3)**:
   - A persistent `internal.scheduler.roomPulse` chain is scheduled every 30s per room, tracking `pulseGeneration` to prevent duplicate chains on reset.
   - Presence timeout: any connected player without a heartbeat in the last 60 seconds is marked `connected = false`.
   - Bounded TTL cleanup: inactive rooms (>30 min) or closed rooms (>5 min) have all associated `players`, `votes`, `polls`, `pollVotes`, and `rooms` documents deleted.
   - Hard room capacity cap of 20 active rooms enforced during `room:create`.

4. **Authoritative Deadline Enforcement (Finding 4)**:
   - `player:vote`, `player:aid`, and `host:pause` check `now > room.deadlineMs` to guard against scheduler delivery lag.
   - Late actions are rejected and automatically trigger idempotent round resolution (`executeRoundResolution`).
   - Round resolution checks `room.phase === 'playing' || room.phase === 'paused'` to guarantee exactly-once execution.

5. **Closed Poll Results Preservation (Finding 5)**:
   - `game.subscribe` queries the most recent poll in the room. When a poll is closed, the snapshot returns `active: false` with complete `voteCounts`, `totalVotes`, and the subscriber's personalized `userVoteIndex`.
   - Late joiners receive the closed poll results upon connecting. Polls are cleared only on `host:reset`.

6. **Poll Options Validation & Error Handling (Finding 6)**:
   - `poll:create` strictly validates options array: length 2..6, and every option must be a non-empty string (1..100 characters).
   - All mutation actions in `game.command` are wrapped in structured error handling returning `{ ok: false, error: message }` without leaking internal tokens or stack traces.

7. **Room Capacity Cap at 200 Players (Finding 7)**:
   - `GAME_CONSTANTS.MAX_PLAYERS` updated to 200.
   - Verified with 60 concurrent votes without OCC contention, plus 61st player joining up to 200 capacity.

8. **Pure Engine Reuse (Finding 8)**:
   - Reused pure engine functions (`getDefaultScenarios`, `resolveRound`, `roundResultToSnapshot`, `teamToSnapshot`, `checkSurvival`, `checkVictory`, `validateAid`, `applyAid`, `aidKey`, `createInitialTeams`) directly from `../server/src/engine`.
   - Schema `teams` model aligned with `TeamState` to prevent data drift.

---

## Verification Results

### 1. Existing Server Tests
- Command: `npm test --workspace=server`
- Result: **7 passed, 7 total suites; 97 passed, 97 total tests** (100% preserved).

### 2. Convex Vitest Test Suite (`tests/convex/`)
- Command: `npm run test:convex`
- Result: **6 passed, 6 test files; 19 passed, 19 total tests**
  - `setup.test.ts`: Scaffolding and baseline room creation.
  - `auth_and_contract.test.ts`: Strict 64-hex tokens, duplicate nickname/token rejection, connection takeover, public snapshot redaction.
  - `rules_and_aid.test.ts`: 10 uneven players, majority voting, tie-break and zero-vote default fallback, aggregate 20 aid budget, deadline rejection.
  - `concurrency.test.ts`: 60 concurrent votes via `Promise.all` with zero OCC conflict, 61st player join, 200 player cap rejection.
  - `schedulers_and_lifecycle.test.ts`: Automatic 90s timer resolution, pause/resume duration preservation, exactly-once preemption guard, 4-round victory flow, epoch increment on reset, persistent pulse and TTL cleanup.
  - `polls.test.ts`: Option string validation, personalized `userVoteIndex`, closed poll results preservation for late joiners, auto-close on round start.

### 3. Typecheck
- Command: `npm run typecheck` (`server` + `client` + `convex`)
- Result: **All 3 targets passed with 0 errors**.

### 4. Build
- Command: `npm run build` (`server` + `client`)
- Result: **All builds compiled successfully**.

---

## Limits & Architectural Constraints
- `MAX_ROOMS`: 20
- `MAX_PLAYERS`: 200
- `MAX_POLLS_PER_ROOM`: 10
- `TOTAL_ROUNDS`: 4
- `ROUND_DURATION_SECONDS`: 90
- `INITIAL_RESOURCES`: 70 (Food, Strength, Trust)
- `SURVIVAL_THRESHOLD`: 40
- `VICTORY_THRESHOLD`: 50
- `MAX_AID_DONATION_PER_ROUND`: 20 (team aggregate)
- `ROOM_TTL_MS`: 30 minutes
