import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

describe('convex setup', () => {
  it('creates test instance and initializes room', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: {
        numTeams: 4,
        hostToken: 'a'.repeat(64),
        connectionId: 'conn_1',
      },
    });

    expect(res.ok).toBe(true);
    expect(res.roomCode).toBeDefined();
    expect(res.roomCode).toHaveLength(6);
  });
});
