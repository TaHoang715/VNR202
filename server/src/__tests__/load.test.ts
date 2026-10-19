/**
 * Simulated 60-client load test for "Giữ vững căn cứ" game server.
 *
 * PLAN requirement:
 * - 1 room with 6 teams
 * - 60 clients (10 per team)
 * - Start game, all 60 vote in Round 1
 * - Verify all votes counted, round resolved, snapshots delivered
 * - Measure timing without arbitrary artificial failures
 */

import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { httpServer, stopServer, getPort } from '../server';
import { ClientToServerEvents, ServerToClientEvents, RoundResultSnapshot } from '../types';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

describe('60-Client Classroom Load Test', () => {
  let serverUrl: string;
  const clients: TypedClientSocket[] = [];

  beforeAll((done) => {
    httpServer.listen(0, () => {
      const port = getPort();
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll(async () => {
    for (const c of clients) {
      if (c.connected) c.disconnect();
    }
    await stopServer();
  });

  it('connects 60 clients, distributes across 6 teams, and resolves full round voting', async () => {
    const startTime = Date.now();

    // 1. Host creates room with 6 teams
    const host = Client(serverUrl, { transports: ['websocket'], forceNew: true }) as TypedClientSocket;
    clients.push(host);
    await new Promise<void>((resolve) => host.on('connect', resolve));

    const { roomCode, hostToken } = await new Promise<any>((resolve) => {
      host.emit('room:create', { numTeams: 6, classSize: 60 }, resolve);
    });
    expect(roomCode).toHaveLength(6);

    // 2. Connect 60 clients in batches of 15
    const numClients = 60;
    const playerTokens: string[] = [];

    const connectPlayer = async (index: number): Promise<void> => {
      const socket = Client(serverUrl, { transports: ['websocket'], forceNew: true }) as TypedClientSocket;
      clients.push(socket);
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const team = index % 6;
      const nickname = `SV_${String(index + 1).padStart(2, '0')}`;

      const joinResp = await new Promise<any>((resolve) => {
        socket.emit('room:join', { roomCode, nickname, team }, resolve);
      });

      expect(joinResp.ok).toBe(true);
      playerTokens[index] = joinResp.playerToken;
    };

    // Run in chunks of 15 to stay within rate limiter
    for (let chunk = 0; chunk < 4; chunk++) {
      const promises: Promise<void>[] = [];
      for (let i = chunk * 15; i < (chunk + 1) * 15; i++) {
        promises.push(connectPlayer(i));
      }
      await Promise.all(promises);
    }

    const joinDuration = Date.now() - startTime;
    console.log(`[Load Test] 60 clients joined in ${joinDuration}ms`);
    expect(playerTokens.filter(Boolean)).toHaveLength(60);

    // 3. Host starts Round 1
    const startResp = await new Promise<any>((resolve) => {
      host.emit('host:start', { roomCode, hostToken }, resolve);
    });
    expect(startResp.ok).toBe(true);

    // 4. All 60 clients vote concurrently
    const voteStart = Date.now();
    const options = ['r1a', 'r1b', 'r1c'];

    const votePromises = clients.slice(1).map((socket, idx) => {
      const optionId = options[idx % options.length];
      return new Promise<any>((resolve) => {
        socket.emit('player:vote', { roomCode, playerToken: playerTokens[idx], optionId }, resolve);
      });
    });

    const voteResponses = await Promise.all(votePromises);
    const successfulVotes = voteResponses.filter((r) => r.ok).length;
    const voteDuration = Date.now() - voteStart;
    console.log(`[Load Test] 60 votes cast in ${voteDuration}ms (Successful: ${successfulVotes}/60)`);
    expect(successfulVotes).toBe(60);

    // 5. Host ends round and verifies resolution
    const roundResolvedPromise = new Promise<RoundResultSnapshot>((resolve) => {
      host.on('round:resolved', resolve);
    });

    await new Promise<any>((resolve) => {
      host.emit('host:endRound', { roomCode, hostToken }, resolve);
    });

    const resolution = await roundResolvedPromise;
    expect(resolution.round).toBe(1);

    // Check all 6 teams have resolved choices
    for (let t = 0; t < 6; t++) {
      expect(resolution.teamChoices[String(t)]).toBeDefined();
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[Load Test] Complete 60-client cycle completed in ${totalDuration}ms`);
  }, 35000);
});
