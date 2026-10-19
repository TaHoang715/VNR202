export {
  getDefaultScenarios,
  clampResource,
  applyEffects,
  averageResource,
  resolveVotes,
  aidKey,
  validateAid,
  applyAid,
  resolveRound,
  checkSurvival,
  checkVictory,
  teamToSnapshot,
  roundResultToSnapshot,
  createInitialTeams,
} from '../server/src/engine';

export { GAME_CONSTANTS } from './types';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 10);
}
