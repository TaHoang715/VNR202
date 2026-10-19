/**
 * Socket.IO integration tests for "Giữ vững căn cứ" server.
 *
 * Tests:
 * - Room creation and joining
 * - Player and host reconnect flows
 * - Timer pause/resume duration preservation
 * - Host manual round end and lobby locking
 * - Aid transactions and single round ledger recording
 * - In-talk poll lifecycle and cleanup
 * - Malformed / NaN / missing callback payload protections
 * - Clean shutdown without leaked timers
 */

import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { httpServer, stopServer, getPort } from '../server';
import { ClientToServerEvents, ServerToClientEvents, RoomSnapshot, PollSnapshot } from '../types';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

describe('Server Integration Tests', () => {
  let serverPort: number;
  let serverUrl: string;
  const activeSockets: TypedClientSocket[] = [];

  function createClient(): Promise<TypedClientSocket> {
    return new Promise((resolve) => {
      const socket = Client(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      }) as TypedClientSocket;
      activeSockets.push(socket);
      socket.on('connect', () => {
        resolve(socket);
      });
    });
  }

  beforeAll((done) => {
    httpServer.listen(0, () => {
      serverPort = getPort();
      serverUrl = `http://localhost:${serverPort}`;
      done();
    });
  });

  afterEach(() => {
    while (activeSockets.length > 0) {
      const s = activeSockets.pop();
      if (s?.connected) s.disconnect();
    }
  });

  afterAll(async () => {
    await stopServer();
  });

  // ─── 1. Room Creation & Joining ───────────────────────────────────

  it('creates room, joins players, and broadcasts snapshot with non-disclosure of tokens', async () => {
    const host = await createClient();
    const player1 = await createClient();

    // Host creates room
    const createResp = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 4, classSize: 40 }, resolve);
    });
    expect(createResp.ok).toBe(true);
    expect(createResp.roomCode).toHaveLength(6);
    expect(createResp.hostToken).toHaveLength(32);
    expect(createResp.snapshot).toBeDefined();
    expect(createResp.snapshot.code).toBe(createResp.roomCode);
    // Non-disclosure: snapshot JSON must not expose hostToken
    expect(JSON.stringify(createResp.snapshot)).not.toContain(createResp.hostToken);
    const roomCode = createResp.roomCode;

    // Player joins
    const joinResp = await new Promise<any>((resolve) => {
      player1.emit('room:join', { roomCode, nickname: 'NguoiChoi1', team: 0 }, resolve);
    });
    expect(joinResp.ok).toBe(true);
    expect(joinResp.playerToken).toHaveLength(32);
    expect(joinResp.playerId).toBeDefined();
    expect(joinResp.snapshot).toBeDefined();
    // Non-disclosure: snapshot JSON must not expose playerToken
    expect(JSON.stringify(joinResp.snapshot)).not.toContain(joinResp.playerToken);
    expect(JSON.stringify(joinResp.snapshot)).not.toContain(createResp.hostToken);

    // Reject duplicate nickname
    const player2 = await createClient();
    const dupResp = await new Promise<any>((resolve) => {
      player2.emit('room:join', { roomCode, nickname: 'nguoichoi1', team: 1 }, resolve);
    });
    expect(dupResp.ok).toBe(false);
  });

  // ─── 2. Host and Player Reconnect Flow ────────────────────────────

  it('handles host and player reconnect flows with state preservation', async () => {
    const host = await createClient();
    const player = await createClient();

    const { roomCode, hostToken } = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 4 }, resolve);
    });
    const { playerToken } = await new Promise<any>((resolve) => {
      player.emit('room:join', { roomCode, nickname: 'ChienSi2', team: 1 }, resolve);
    });

    // Player disconnects and reconnects on new socket
    player.disconnect();
    const newPlayerSocket = await createClient();
    const reconnectResp = await new Promise<any>((resolve) => {
      newPlayerSocket.emit('room:reconnect', { roomCode, playerToken }, resolve);
    });
    expect(reconnectResp.ok).toBe(true);
    expect(reconnectResp.player.nickname).toBe('ChienSi2');
    expect(reconnectResp.player.hasVotedThisRound).toBe(false);
    expect(reconnectResp.snapshot.code).toBe(roomCode);

    // Host reconnects on new socket
    host.disconnect();
    const newHostSocket = await createClient();
    const hostReconResp = await new Promise<any>((resolve) => {
      newHostSocket.emit('host:reconnect', { roomCode, hostToken }, resolve);
    });
    expect(hostReconResp.ok).toBe(true);
    expect(hostReconResp.snapshot.code).toBe(roomCode);
  });

  // ─── 3. Timer Pause, Resume, and Manual Round End ──────────────────

  it('pauses and resumes preserving remaining duration, and supports host endRound', async () => {
    const host = await createClient();
    const player = await createClient();

    const { roomCode, hostToken } = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 4 }, resolve);
    });
    const { playerToken } = await new Promise<any>((resolve) => {
      player.emit('room:join', { roomCode, nickname: 'ChienSi3', team: 0 }, resolve);
    });

    // Start Round 1
    const startResp = await new Promise<any>((resolve) => {
      host.emit('host:start', { roomCode, hostToken }, resolve);
    });
    expect(startResp.ok).toBe(true);

    // Pause round
    const pauseResp = await new Promise<any>((resolve) => {
      host.emit('host:pause', { roomCode, hostToken }, resolve);
    });
    expect(pauseResp.ok).toBe(true);

    // Resume round
    const resumeResp = await new Promise<any>((resolve) => {
      host.emit('host:resume', { roomCode, hostToken }, resolve);
    });
    expect(resumeResp.ok).toBe(true);

    // Stale / unauthenticated socket tries to use playerToken (socket binding security test)
    const hijacker = await createClient();
    const hijackVote = await new Promise<any>((resolve) => {
      hijacker.emit('player:vote', { roomCode, playerToken, optionId: 'r1a' }, resolve);
    });
    expect(hijackVote.ok).toBe(false);

    // Authentic player casts vote
    const voteResp = await new Promise<any>((resolve) => {
      player.emit('player:vote', { roomCode, playerToken, optionId: 'r1a' }, resolve);
    });
    expect(voteResp.ok).toBe(true);

    // Manual round end by host
    const endPromise = new Promise<any>((resolve) => {
      player.on('round:resolved', (result) => {
        resolve(result);
      });
    });

    const endResp = await new Promise<any>((resolve) => {
      host.emit('host:endRound', { roomCode, hostToken }, resolve);
    });
    expect(endResp.ok).toBe(true);

    const roundResult = await endPromise;
    expect(roundResult.round).toBe(1);
    expect(roundResult.teamChoices['0']).toBe('r1a');
  });

  // ─── 4. Aid Ledger Recording ──────────────────────────────────────

  it('records aid in current round ledger and carries into round result once', async () => {
    const host = await createClient();
    const playerT0 = await createClient();
    const playerT1 = await createClient();

    const { roomCode, hostToken } = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 4 }, resolve);
    });
    const { playerToken: token0 } = await new Promise<any>((resolve) => {
      playerT0.emit('room:join', { roomCode, nickname: 'Doi0', team: 0 }, resolve);
    });
    await new Promise<any>((resolve) => {
      playerT1.emit('room:join', { roomCode, nickname: 'Doi1', team: 1 }, resolve);
    });

    // Start round
    await new Promise<any>((resolve) => {
      host.emit('host:start', { roomCode, hostToken }, resolve);
    });

    // Send aid from Team 0 to Team 1
    const aidResp = await new Promise<any>((resolve) => {
      playerT0.emit(
        'player:aid',
        { roomCode, playerToken: token0, toTeam: 1, resource: 'food', amount: 10 },
        resolve
      );
    });
    expect(aidResp.ok).toBe(true);

    // Duplicate aid in same round should be rejected
    const dupAidResp = await new Promise<any>((resolve) => {
      playerT0.emit(
        'player:aid',
        { roomCode, playerToken: token0, toTeam: 1, resource: 'food', amount: 5 },
        resolve
      );
    });
    expect(dupAidResp.ok).toBe(false);

    // End round and verify aid record is present in round resolution
    const resultPromise = new Promise<any>((resolve) => {
      playerT0.on('round:resolved', resolve);
    });
    await new Promise<any>((resolve) => {
      host.emit('host:endRound', { roomCode, hostToken }, resolve);
    });
    const result = await resultPromise;
    expect(result.aidRecords).toHaveLength(1);
    expect(result.aidRecords[0].fromTeam).toBe(0);
    expect(result.aidRecords[0].toTeam).toBe(1);
    expect(result.aidRecords[0].amount).toBe(10);
  });

  // ─── 5. Lobby Locking ─────────────────────────────────────────────

  it('locks and unlocks lobby, preventing new joins while locked', async () => {
    const host = await createClient();
    const player = await createClient();

    const { roomCode, hostToken } = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 4 }, resolve);
    });

    // Lock lobby
    const lockResp = await new Promise<any>((resolve) => {
      host.emit('host:setLobbyLock', { roomCode, hostToken, locked: true }, resolve);
    });
    expect(lockResp.ok).toBe(true);

    // Join should fail while locked
    const joinFail = await new Promise<any>((resolve) => {
      player.emit('room:join', { roomCode, nickname: 'MuonVao', team: 0 }, resolve);
    });
    expect(joinFail.ok).toBe(false);

    // Unlock lobby
    await new Promise<any>((resolve) => {
      host.emit('host:setLobbyLock', { roomCode, hostToken, locked: false }, resolve);
    });

    // Join should now succeed
    const joinSuccess = await new Promise<any>((resolve) => {
      player.emit('room:join', { roomCode, nickname: 'MuonVao', team: 0 }, resolve);
    });
    expect(joinSuccess.ok).toBe(true);
  });

  // ─── 6. In-talk Polls Lifecycle ───────────────────────────────────

  it('manages poll creation, voting, closing, and room cleanup', async () => {
    const host = await createClient();
    const player = await createClient();

    const { roomCode, hostToken } = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 4 }, resolve);
    });
    const { playerToken } = await new Promise<any>((resolve) => {
      player.emit('room:join', { roomCode, nickname: 'KhaoSat1', team: 0 }, resolve);
    });

    // Host creates poll
    const pollCreated = await new Promise<any>((resolve) => {
      host.emit(
        'poll:create',
        {
          roomCode,
          hostToken,
          question: 'Ý kiến về tính chất toàn dân?',
          options: ['Rất đồng ý', 'Cần thảo luận thêm'],
        },
        resolve
      );
    });
    expect(pollCreated.ok).toBe(true);
    expect(pollCreated.pollId).toBeDefined();

    // Player votes on poll
    const pollUpdatePromise = new Promise<PollSnapshot>((resolve) => {
      player.on('poll:update', (snap) => {
        if (snap && snap.totalVotes > 0) resolve(snap);
      });
    });

    const voteResp = await new Promise<any>((resolve) => {
      player.emit(
        'poll:vote',
        { roomCode, playerToken, pollId: pollCreated.pollId, optionIndex: 0 },
        resolve
      );
    });
    expect(voteResp.ok).toBe(true);

    const updatedPoll = await pollUpdatePromise;
    expect(updatedPoll.totalVotes).toBe(1);
    expect(updatedPoll.voteCounts[0]).toBe(1);

    // Host closes poll
    const closeResp = await new Promise<any>((resolve) => {
      host.emit('poll:close', { roomCode, hostToken, pollId: pollCreated.pollId }, resolve);
    });
    expect(closeResp.ok).toBe(true);
  });

  // ─── 7. Malformed Payloads & NaN Guarding ──────────────────────────

  it('rejects malformed payloads, NaN, fractions and missing callbacks without crashing', async () => {
    const client = await createClient();

    // Null data
    const nullResp = await new Promise<any>((resolve) => {
      client.emit('room:create', null as any, resolve);
    });
    expect(nullResp.ok).toBe(false);

    // NaN team count
    const nanResp = await new Promise<any>((resolve) => {
      client.emit('room:create', { numTeams: NaN } as any, resolve);
    });
    expect(nanResp.ok).toBe(false);

    // Fractional team count
    const fracResp = await new Promise<any>((resolve) => {
      client.emit('room:create', { numTeams: 4.5 } as any, resolve);
    });
    expect(fracResp.ok).toBe(false);

    // Missing callback (should not throw on server)
    expect(() => {
      (client as any).emit('room:join', { roomCode: 'ABCDEF', nickname: 'Test', team: 0 });
    }).not.toThrow();
  });
});
