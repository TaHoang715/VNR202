import { expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

it('reset removes private ballots from previous epochs while retaining participants', async () => {
  const t = convexTest(schema, modules);
  const hostToken = 'a'.repeat(64), playerToken = 'b'.repeat(64);
  const room = await t.mutation(api.game.command, { event: 'room:create', payload: { numTeams: 4, hostToken, connectionId: 'host' } });
  const roomCode = room.roomCode;
  const host = { roomCode, hostToken, connectionId: 'host' };
  const player = { roomCode, playerToken, connectionId: 'player' };
  await t.mutation(api.game.command, { event: 'room:join', payload: { ...player, nickname: 'Minh', team: 0 } });
  for (let epoch = 1; epoch <= 3; epoch++) {
    await t.mutation(api.game.command, { event: 'host:start', payload: host });
    const vote = await t.mutation(api.game.command, { event: 'player:vote', payload: { ...player, optionId: 'r1a' } });
    expect(vote.ok).toBe(true);
    expect(await t.run(ctx => ctx.db.query('votes').collect())).toHaveLength(1);
    await t.mutation(api.game.command, { event: 'host:reset', payload: host });
    expect(await t.run(ctx => ctx.db.query('votes').collect())).toHaveLength(0);
    const state = await t.query(api.game.subscribe, { roomCode, token: hostToken, connectionId: 'host' });
    expect(state?.epoch).toBe(epoch + 1);
    expect(state?.snapshot.players).toHaveLength(1);
    expect(state?.snapshot.players[0].hasVotedThisRound).toBe(false);
  }
});
