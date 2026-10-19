import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.*s');

function hex64(char = 'a'): string {
  return char.repeat(64);
}

describe('Convex Auth & Contract Acceptance', () => {
  it('strictly validates 64-hex tokens and connection IDs on room create', async () => {
    const t = convexTest(schema, modules);

    // Reject invalid numTeams
    const resBadTeams = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 3, hostToken: hex64('a'), connectionId: 'c1' },
    });
    expect(resBadTeams.ok).toBe(false);

    // Reject non-64 hex hostToken (e.g. invalid chars 'g', 'h')
    const resBadToken = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken: 'h'.repeat(64), connectionId: 'c1' },
    });
    expect(resBadToken.ok).toBe(false);
    expect(resBadToken.error).toContain('64 ký tự hex');

    // Reject empty connectionId
    const resBadConn = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken: hex64('a'), connectionId: '' },
    });
    expect(resBadConn.ok).toBe(false);

    // Valid create
    const resOk = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken: hex64('a'), connectionId: 'c1' },
    });
    expect(resOk.ok).toBe(true);
    expect(resOk.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(resOk.hostToken).toBe(hex64('a'));
    expect(resOk.snapshot.code).toBe(resOk.roomCode);
    expect(resOk.snapshot.phase).toBe('lobby');
  });

  it('validates player join, rejects duplicate tokens and duplicate nicknames', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64('a');
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'host_conn' },
    });
    expect(createRes.ok).toBe(true);
    const roomCode = createRes.roomCode;

    // Reject invalid playerToken (non-hex)
    const resBadToken = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hao', team: 0, playerToken: 'z'.repeat(64), connectionId: 'p1_conn' },
    });
    expect(resBadToken.ok).toBe(false);

    // Join player 1
    const playerToken1 = hex64('1');
    const join1 = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Hao', team: 0, playerToken: playerToken1, connectionId: 'p1_conn' },
    });
    expect(join1.ok).toBe(true);
    expect(join1.playerId).toBeDefined();
    expect(join1.playerId).not.toBe(playerToken1); // public ID is NOT the secret token

    // Reject duplicate nickname
    const joinDupNick = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'hao', team: 1, playerToken: hex64('2'), connectionId: 'p2_conn' },
    });
    expect(joinDupNick.ok).toBe(false);
    expect(joinDupNick.error).toContain('trùng tên');

    // Reject duplicate player token
    const joinDupToken = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Nam', team: 1, playerToken: playerToken1, connectionId: 'p2_conn' },
    });
    expect(joinDupToken.ok).toBe(false);
    expect(joinDupToken.error).toContain('Token người chơi đã tồn tại');
  });

  it('handles connection takeover for host and player and isolates old connections', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64('a');
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'host_conn_1' },
    });
    expect(createRes.ok).toBe(true);
    const roomCode = createRes.roomCode;

    const playerToken = hex64('b');
    const joinRes = await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Minh', team: 0, playerToken, connectionId: 'player_conn_1' },
    });
    expect(joinRes.ok).toBe(true);

    // Both subscribe initially
    const subHost1 = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'host_conn_1',
    });
    expect(subHost1).not.toBeNull();

    const subPlayer1 = await t.query(api.game.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'player_conn_1',
    });
    expect(subPlayer1).not.toBeNull();

    // Host reconnects with new connection ID
    const hostReconn = await t.mutation(api.game.command, {
      event: 'host:reconnect',
      payload: { roomCode, hostToken, connectionId: 'host_conn_2' },
    });
    expect(hostReconn.ok).toBe(true);

    // Old host connection subscribe returns null (replaced session)
    const oldHostSub = await t.query(api.game.subscribe, {
      roomCode,
      token: hostToken,
      connectionId: 'host_conn_1',
    });
    expect(oldHostSub).toBeNull();

    // Old host connection trying to execute host:start fails
    const oldHostStart = await t.mutation(api.game.command, {
      event: 'host:start',
      payload: { roomCode, hostToken, connectionId: 'host_conn_1' },
    });
    expect(oldHostStart.ok).toBe(false);
    expect(oldHostStart.error).toBe('Chưa được ủy quyền');

    // Player reconnects with new connection ID
    const playerReconn = await t.mutation(api.game.command, {
      event: 'room:reconnect',
      payload: { roomCode, playerToken, connectionId: 'player_conn_2' },
    });
    expect(playerReconn.ok).toBe(true);

    // Old player connection subscribe returns null
    const oldPlayerSub = await t.query(api.game.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'player_conn_1',
    });
    expect(oldPlayerSub).toBeNull();

    // Old player disconnect does not disconnect active player
    await t.mutation(api.game.command, {
      event: 'session:disconnect',
      payload: { roomCode, token: playerToken, connectionId: 'player_conn_1' },
    });

    const activePlayerSub = await t.query(api.game.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'player_conn_2',
    });
    expect(activePlayerSub).not.toBeNull();
    expect(activePlayerSub!.snapshot.players[0].connected).toBe(true);
  });

  it('redacts tokens and private fields from public snapshots', async () => {
    const t = convexTest(schema, modules);
    const hostToken = hex64('a');
    const createRes = await t.mutation(api.game.command, {
      event: 'room:create',
      payload: { numTeams: 4, hostToken, connectionId: 'hc' },
    });
    expect(createRes.ok).toBe(true);
    const roomCode = createRes.roomCode;

    const playerToken = hex64('c');
    await t.mutation(api.game.command, {
      event: 'room:join',
      payload: { roomCode, nickname: 'Nghia', team: 1, playerToken, connectionId: 'pc' },
    });

    const env = await t.query(api.game.subscribe, {
      roomCode,
      token: playerToken,
      connectionId: 'pc',
    });

    expect(env).not.toBeNull();
    const snap = env!.snapshot;

    // Verify snapshot structure
    expect((snap as any).hostToken).toBeUndefined();
    expect(snap.players[0].id).toBeDefined();
    expect((snap.players[0] as any).playerToken).toBeUndefined();
    expect((snap.players[0] as any).token).toBeUndefined();

    // Invalid subscription returns null
    const badSub = await t.query(api.game.subscribe, {
      roomCode,
      token: hex64('f'),
      connectionId: 'pc',
    });
    expect(badSub).toBeNull();
  });
});
