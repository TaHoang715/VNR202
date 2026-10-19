import { io as connect, Socket } from 'socket.io-client';
import { httpServer, getPort, roomManager, stopServer } from '../server';

describe('Coordinator acceptance regressions', () => {
  const sockets: Socket[] = [];
  async function client() {
    const socket = connect(`http://localhost:${getPort()}`, { transports: ['websocket'], forceNew: true });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  }
  function emit(socket: Socket, event: string, data: unknown): Promise<any> {
    return new Promise((resolve, reject) => socket.timeout(3000).emit(event, data, (error: Error | null, response: unknown) => error ? reject(error) : resolve(response)));
  }
  beforeAll(async () => { await new Promise<void>(resolve => httpServer.listen(0, resolve)); });
  afterEach(() => { sockets.splice(0).forEach(socket => socket.disconnect()); });
  afterAll(async () => { await stopServer(); });

  it('preserves elapsed time, rejects unauthorized host actions, and resolves each round once', async () => {
    const host = await client();
    const outsider = await client();
    const { roomCode, hostToken } = await emit(host, 'room:create', { numTeams: 4, classSize: 40 });
    const auth = { roomCode, hostToken };
    expect((await emit(outsider, 'host:start', { roomCode, hostToken: 'invalid' })).ok).toBe(false);
    expect((await emit(host, 'host:start', auth)).ok).toBe(true);
    const room = roomManager.getRoom(roomCode)!;
    room.roundStartedAt = Date.now() - 60_000;
    expect((await emit(host, 'host:pause', auth)).ok).toBe(true);
    expect(room.pausedRemainingMs).toBeGreaterThan(28_000);
    expect(room.pausedRemainingMs).toBeLessThanOrEqual(30_000);
    expect((await emit(host, 'host:resume', auth)).ok).toBe(true);
    const remaining = roomManager.buildSnapshot(room).roundTimeRemainingMs!;
    expect(remaining).toBeGreaterThan(28_000);
    expect(remaining).toBeLessThanOrEqual(30_000);
    expect((await emit(host, 'host:endRound', auth)).ok).toBe(true);
    expect((await emit(host, 'host:endRound', auth)).ok).toBe(false);
    expect(room.roundResults).toHaveLength(1);
    for (let round = 2; round <= 4; round++) {
      expect((await emit(host, 'host:start', auth)).ok).toBe(true);
      expect((await emit(host, 'host:endRound', auth)).ok).toBe(true);
    }
    expect(room.phase).toBe('finished');
    expect(room.roundResults).toHaveLength(4);
    expect((await emit(host, 'host:start', auth)).ok).toBe(false);
  });

  it('restores an already cast vote across reconnect without counting a second vote', async () => {
    const host = await client();
    const player = await client();
    const { roomCode, hostToken } = await emit(host, 'room:create', { numTeams: 4 });
    const { playerToken } = await emit(player, 'room:join', { roomCode, nickname: '__proto__', team: 0 });
    expect(playerToken).toBeTruthy();
    await emit(host, 'host:start', { roomCode, hostToken });
    expect((await emit(player, 'player:vote', { roomCode, playerToken, optionId: 'r1a' })).ok).toBe(true);
    player.disconnect();
    const replacement = await client();
    const restored = await emit(replacement, 'room:reconnect', { roomCode, playerToken });
    expect(restored.ok).toBe(true);
    expect(restored.player.hasVotedThisRound).toBe(true);
    expect(restored.snapshot.players).toHaveLength(1);
    expect((await emit(replacement, 'player:vote', { roomCode, playerToken, optionId: 'r1b' })).ok).toBe(false);
    expect(roomManager.getVotes(roomCode).get(0)).toHaveLength(1);
    await emit(host, 'host:close', { roomCode, hostToken });
  });

  it('synchronizes an active poll for late joins and the returning host, then closes it when game starts', async () => {
    const host = await client();
    const { roomCode, hostToken } = await emit(host, 'room:create', { numTeams: 4 });
    const auth = { roomCode, hostToken };
    const created = await emit(host, 'poll:create', { ...auth, question: 'Hội ý về nguồn lực?', options: ['Chuẩn bị', 'Phối hợp'] });
    expect(created.ok).toBe(true);
    const player = await client();
    const incoming = new Promise<any>(resolve => player.once('poll:update', resolve));
    const joined = await emit(player, 'room:join', { roomCode, nickname: 'QA khảo sát', team: 0 });
    expect(joined.ok).toBe(true);
    expect((await incoming).id).toBe(created.pollId);
    const synced = await emit(host, 'host:reconnect', auth);
    expect(synced.poll.id).toBe(created.pollId);
    const closed = new Promise<any>(resolve => player.once('poll:update', resolve));
    expect((await emit(host, 'host:start', auth)).ok).toBe(true);
    expect((await closed).active).toBe(false);
    const lateVote = await emit(player, 'poll:vote', { roomCode, playerToken: joined.playerToken, pollId: created.pollId, optionIndex: 0 });
    expect(lateVote.ok).toBe(false);
    await emit(host, 'host:close', auth);
  });
});
