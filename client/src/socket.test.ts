import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSecureToken,
  buildRoomJoinUrl,
  ConvexGameConnection,
  SubscribeEnvelope,
  gameCommandRef,
  gameSubscribeRef,
} from './socket';
import type { RoomSnapshot } from './types';

function createDummySnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    code: 'TEST01',
    phase: 'lobby',
    numTeams: 4,
    teams: [
      { index: 0, name: 'Đội Bắc Sơn', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 1, contributionScore: 0 },
      { index: 1, name: 'Đội Nam Kỳ', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 2, contributionScore: 0 },
      { index: 2, name: 'Đội Việt Bắc', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 4, contributionScore: 0 },
      { index: 3, name: 'Đội Tây Nguyên', resources: { food: 70, strength: 70, trust: 70 }, memberCount: 3, contributionScore: 0 },
    ],
    players: [],
    currentRound: 0,
    roundTimeRemainingMs: 90000,
    roundResults: [],
    currentScenario: null,
    lobbyLocked: false,
    stats: {
      totalJoined: 10,
      totalInteracted: 10,
      classSize: null,
    },
    ...overrides,
  };
}

describe('Crypto token and URL helpers', () => {
  it('generates 64-hex cryptographically secure tokens', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).toMatch(/^[0-9a-f]{64}$/);
    expect(token2).toMatch(/^[0-9a-f]{64}$/);
    expect(token1).not.toBe(token2);
  });

  it('fails closed when Web Crypto API is unavailable rather than generating weak credentials', () => {
    const originalCrypto = globalThis.crypto;
    try {
      // Temporarily delete crypto
      // @ts-ignore
      delete globalThis.crypto;
      expect(() => generateSecureToken(32)).toThrow(/Web Crypto API.*không khả dụng/);
    } finally {
      globalThis.crypto = originalCrypto;
    }
  });

  it('builds room join URL handling subpaths, trailing slashes, and ports', () => {
    expect(buildRoomJoinUrl('http://localhost:5173', 'ROOM01')).toBe('http://localhost:5173/?room=ROOM01');
    expect(buildRoomJoinUrl('http://localhost:5173/', 'ROOM01')).toBe('http://localhost:5173/?room=ROOM01');
    expect(buildRoomJoinUrl('https://tahoang715.github.io/VNR202/', 'ROOM01')).toBe(
      'https://tahoang715.github.io/VNR202/?room=ROOM01'
    );
    expect(buildRoomJoinUrl('https://tahoang715.github.io/VNR202', 'ROOM01')).toBe(
      'https://tahoang715.github.io/VNR202?room=ROOM01'
    );
    expect(buildRoomJoinUrl('http://localhost:5173/?view=game', 'ROOM01')).toBe(
      'http://localhost:5173/?view=game&room=ROOM01'
    );
  });
});

describe('ConvexGameConnection adapter with mock SDK', () => {
  let mockConnStateCallback: ((state: any) => void) | null = null;
  let mockOnUpdateCallback: ((val: any) => void) | null = null;
  let mockOnUpdateUnsubscribe: any;
  let mockMutationFn: any;
  let mockCloseFn: any;
  let mockClient: any;

  beforeEach(() => {
    mockConnStateCallback = null;
    mockOnUpdateCallback = null;
    mockOnUpdateUnsubscribe = vi.fn();
    mockMutationFn = vi.fn();
    mockCloseFn = vi.fn().mockResolvedValue(undefined);

    mockClient = {
      connectionState: vi.fn().mockReturnValue({ isWebSocketConnected: false }),
      subscribeToConnectionState: vi.fn((cb) => {
        mockConnStateCallback = cb;
        return vi.fn();
      }),
      onUpdate: vi.fn((_query, _args, cb) => {
        mockOnUpdateCallback = cb;
        return mockOnUpdateUnsubscribe;
      }),
      mutation: mockMutationFn,
      close: mockCloseFn,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks SDK connection state transitions and emits connect / disconnect', () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    expect(conn.connected).toBe(false);

    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    conn.on('connect', onConnect);
    conn.on('disconnect', onDisconnect);

    mockConnStateCallback?.({ isWebSocketConnected: true });
    expect(conn.connected).toBe(true);
    expect(onConnect).toHaveBeenCalledTimes(1);

    mockConnStateCallback?.({ isWebSocketConnected: false });
    expect(conn.connected).toBe(false);
    expect(onDisconnect).toHaveBeenCalledTimes(1);

    conn.disconnect();
  });

  it('allows off(original) to remove listeners registered with once', () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    const listener = vi.fn();

    conn.once('test_event', listener);
    conn.off('test_event', listener);

    (conn as any).emitLocal('test_event', 'payload');
    expect(listener).not.toHaveBeenCalled();

    conn.disconnect();
  });

  it('queues preconnect emit and sends mutation with 64-hex tokens and connectionId', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockMutationFn.mockResolvedValue({
      ok: true,
      roomCode: 'NEW123',
      hostToken: 'custom-or-gen-token',
      snapshot: createDummySnapshot(),
    });

    const ackCb = vi.fn();
    conn.emit('room:create', { numTeams: 4, classSize: null }, ackCb);

    expect(mockMutationFn).not.toHaveBeenCalled();

    mockConnStateCallback?.({ isWebSocketConnected: true });

    await vi.waitFor(() => {
      expect(mockMutationFn).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockMutationFn.mock.calls[0];
    expect(callArgs[0]).toBe(gameCommandRef);
    expect(callArgs[1].event).toBe('room:create');
    expect(callArgs[1].payload.connectionId).toBe(conn.id);
    expect(callArgs[1].payload.hostToken).toHaveLength(64);
    expect(callArgs[1].payload.numTeams).toBe(4);

    expect(ackCb).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, roomCode: 'NEW123' })
    );

    conn.disconnect();
  });

  it('enforces bounded acknowledgement timeout and invokes callback exactly once on timeout', async () => {
    vi.useFakeTimers();
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    // Mutation that never resolves
    mockMutationFn.mockReturnValue(new Promise(() => {}));

    const ackCb = vi.fn();
    conn.emit('room:create', { numTeams: 4 }, ackCb);

    // Advance timers past 8000ms timeout
    vi.advanceTimersByTime(8500);

    expect(ackCb).toHaveBeenCalledTimes(1);
    expect(ackCb).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.stringContaining('Hết thời gian chờ phản hồi từ máy chủ'),
      })
    );

    conn.disconnect();
    vi.useRealTimers();
  });

  it('cleans up late room:create on server after timeout/dispose to prevent orphan rooms', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    let resolveMutation: any;
    mockMutationFn.mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve;
      })
    );

    const ackCb = vi.fn();
    conn.emit('room:create', { numTeams: 4 }, ackCb);

    // Wait until room:create mutation is in flight
    await vi.waitFor(() => {
      expect(mockMutationFn).toHaveBeenCalledTimes(1);
    });

    // Disconnect while mutation is in flight
    conn.disconnect();

    // Now mutation resolves late on the server
    resolveMutation({
      ok: true,
      roomCode: 'ORPHAN01',
      hostToken: 'token-orphan',
      snapshot: createDummySnapshot({ code: 'ORPHAN01' }),
    });

    await vi.waitFor(() => {
      const closeCalls = mockMutationFn.mock.calls.filter(
        (c: any) => c[1]?.event === 'host:close'
      );
      expect(closeCalls.length).toBe(1);
      expect(closeCalls[0][1].payload.roomCode).toBe('ORPHAN01');
    });

    // Callback should not have received the late ok: true
    expect(ackCb).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: expect.stringContaining('Kết nối đã đóng') })
    );
  });

  it('subscribes to game.subscribe upon room creation and maps envelope to events', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    mockMutationFn.mockResolvedValue({
      ok: true,
      roomCode: 'ROOM45',
      hostToken: 'token45',
      snapshot: createDummySnapshot({ code: 'ROOM45' }),
    });

    await new Promise<void>((resolve) => {
      conn.emit('room:create', { numTeams: 4 }, () => resolve());
    });

    expect(mockClient.onUpdate).toHaveBeenCalledWith(
      gameSubscribeRef,
      expect.objectContaining({
        roomCode: 'ROOM45',
        connectionId: conn.id,
      }),
      expect.any(Function),
      expect.any(Function)
    );

    const onSnapshot = vi.fn();
    const onPoll = vi.fn();
    const onFinished = vi.fn();
    const onRoundResolved = vi.fn();
    const onTick = vi.fn();

    conn.on('room:snapshot', onSnapshot);
    conn.on('poll:update', onPoll);
    conn.on('game:finished', onFinished);
    conn.on('round:resolved', onRoundResolved);
    conn.on('round:tick', onTick);

    const roundResult = {
      round: 1,
      scenarioTitle: 'Tình huống 1',
      scenarioDescription: 'Mô tả',
      teamChoices: { '0': 'r1a' },
      voteSummary: { '0': { r1a: 1 } },
      resourcesAfter: { '0': { food: 60, strength: 85, trust: 60 } },
      aidRecords: [],
    };

    const envelope: SubscribeEnvelope = {
      snapshot: createDummySnapshot({
        code: 'ROOM45',
        phase: 'playing',
        currentRound: 1,
        roundResults: [roundResult],
      }),
      poll: {
        id: 'poll-1',
        question: 'Câu hỏi?',
        options: ['A', 'B'],
        voteCounts: [3, 2],
        totalVotes: 5,
        active: true,
      },
      serverNow: Date.now(),
      deadlineMs: Date.now() + 60000,
      epoch: 1,
      finished: {
        victory: true,
        teams: [],
        roundResults: [roundResult],
        stats: { totalJoined: 10, totalInteracted: 10, classSize: null },
      },
    };

    mockOnUpdateCallback!(envelope);

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onRoundResolved).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalled();

    // Deduplication check: repeated same envelope does not duplicate finish / round resolved
    mockOnUpdateCallback!(envelope);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onRoundResolved).toHaveBeenCalledTimes(1);

    conn.disconnect();
  });

  it('guards stale subscription callbacks using subscription generation', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    let firstSubscriptionCallback: any = null;
    let secondSubscriptionCallback: any = null;

    mockClient.onUpdate = vi.fn((_query, args, cb) => {
      if (args.roomCode === 'ROOM01') {
        firstSubscriptionCallback = cb;
      } else if (args.roomCode === 'ROOM02') {
        secondSubscriptionCallback = cb;
      }
      return vi.fn();
    });

    mockMutationFn.mockResolvedValueOnce({
      ok: true,
      roomCode: 'ROOM01',
      hostToken: 'token01',
      snapshot: createDummySnapshot({ code: 'ROOM01' }),
    });

    await new Promise<void>((resolve) => {
      conn.emit('room:create', {}, () => resolve());
    });

    const onSnapshot = vi.fn();
    conn.on('room:snapshot', onSnapshot);

    // Switch to room 2
    mockMutationFn.mockResolvedValueOnce({
      ok: true,
      roomCode: 'ROOM02',
      hostToken: 'token02',
      snapshot: createDummySnapshot({ code: 'ROOM02' }),
    });

    await new Promise<void>((resolve) => {
      conn.emit('host:reconnect', { roomCode: 'ROOM02', hostToken: 'token02' }, () => resolve());
    });

    // Stale update from Room 01 arrives
    firstSubscriptionCallback?.({
      snapshot: createDummySnapshot({ code: 'ROOM01' }),
      poll: null,
      serverNow: Date.now(),
      deadlineMs: null,
      epoch: 0,
      finished: null,
    });

    // Stale update should be ignored (onSnapshot not called with ROOM01)
    expect(onSnapshot).not.toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ROOM01' })
    );

    // Fresh update from Room 02 arrives
    secondSubscriptionCallback?.({
      snapshot: createDummySnapshot({ code: 'ROOM02' }),
      poll: null,
      serverNow: Date.now(),
      deadlineMs: null,
      epoch: 0,
      finished: null,
    });

    expect(onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ROOM02' })
    );

    conn.disconnect();
  });

  it('resets epoch and deduplication state when switching rooms even with equal epoch zero', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    let currentSubCb: any = null;
    mockClient.onUpdate = vi.fn((_q, _a, cb) => {
      currentSubCb = cb;
      return vi.fn();
    });

    // Bind Room A
    mockMutationFn.mockResolvedValueOnce({
      ok: true,
      roomCode: 'ROOMA',
      hostToken: 'tokenA',
      snapshot: createDummySnapshot({ code: 'ROOMA' }),
    });
    await new Promise<void>((resolve) => conn.emit('room:create', {}, () => resolve()));

    const onFinished = vi.fn();
    conn.on('game:finished', onFinished);

    const finishPayloadA = {
      victory: true,
      teams: [],
      roundResults: [],
      stats: { totalJoined: 5, totalInteracted: 5, classSize: null },
    };

    // Emit finished in Room A with epoch 0
    currentSubCb({
      snapshot: createDummySnapshot({ code: 'ROOMA', phase: 'finished' }),
      poll: null,
      serverNow: Date.now(),
      deadlineMs: null,
      epoch: 0,
      finished: finishPayloadA,
    });
    expect(onFinished).toHaveBeenCalledTimes(1);

    // Switch to Room B
    mockMutationFn.mockResolvedValueOnce({
      ok: true,
      roomCode: 'ROOMB',
      hostToken: 'tokenB',
      snapshot: createDummySnapshot({ code: 'ROOMB' }),
    });
    await new Promise<void>((resolve) =>
      conn.emit('host:reconnect', { roomCode: 'ROOMB', hostToken: 'tokenB' }, () => resolve())
    );

    const finishPayloadB = {
      victory: false,
      teams: [],
      roundResults: [],
      stats: { totalJoined: 10, totalInteracted: 10, classSize: null },
    };

    // Emit finished in Room B also with epoch 0
    currentSubCb({
      snapshot: createDummySnapshot({ code: 'ROOMB', phase: 'finished' }),
      poll: null,
      serverNow: Date.now(),
      deadlineMs: null,
      epoch: 0,
      finished: finishPayloadB,
    });

    // Finished should emit again for Room B despite same epoch 0
    expect(onFinished).toHaveBeenCalledTimes(2);
    expect(onFinished).toHaveBeenLastCalledWith(finishPayloadB);

    conn.disconnect();
  });

  it('freezes timer when paused and does not end round on client', () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    const ticks: any[] = [];
    conn.on('round:tick', (ms) => ticks.push(ms));

    const envelope: SubscribeEnvelope = {
      snapshot: createDummySnapshot({
        phase: 'paused',
        roundTimeRemainingMs: 42000,
      }),
      poll: null,
      serverNow: Date.now(),
      deadlineMs: null,
      epoch: 1,
      finished: null,
    };

    (conn as any).handleEnvelopeUpdate(envelope);

    expect(ticks).toContain(42000);

    conn.disconnect();
  });

  it('emits room:kicked and unbinds when subscription receives null', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    mockMutationFn.mockResolvedValue({
      ok: true,
      roomCode: 'KICK12',
      hostToken: 'token12',
      snapshot: createDummySnapshot(),
    });

    await new Promise<void>((resolve) => {
      conn.emit('room:create', {}, () => resolve());
    });

    const onKicked = vi.fn();
    conn.on('room:kicked', onKicked);

    mockOnUpdateCallback!(null);

    expect(onKicked).toHaveBeenCalledTimes(1);
    expect(mockOnUpdateUnsubscribe).toHaveBeenCalled();

    conn.disconnect();
  });

  it('sends bounded session:disconnect on disconnect() and promptly cleans up waits and client', async () => {
    const conn = new ConvexGameConnection(undefined, mockClient);
    mockConnStateCallback?.({ isWebSocketConnected: true });

    mockMutationFn.mockResolvedValue({
      ok: true,
      roomCode: 'DISC99',
      hostToken: 'token99',
      snapshot: createDummySnapshot(),
    });

    await new Promise<void>((resolve) => {
      conn.emit('room:create', {}, () => resolve());
    });

    const onDisconnect = vi.fn();
    conn.on('disconnect', onDisconnect);

    conn.disconnect();

    await vi.waitFor(() => {
      expect(mockCloseFn).toHaveBeenCalledTimes(1);
    });

    const disconnectCalls = mockMutationFn.mock.calls.filter(
      (c: any) => c[1]?.event === 'session:disconnect'
    );
    expect(disconnectCalls.length).toBe(1);
    expect(disconnectCalls[0][1].payload.connectionId).toBe(conn.id);
    expect(disconnectCalls[0][1].payload.roomCode).toBe('DISC99');

    expect(onDisconnect).toHaveBeenCalled();
  });
});
