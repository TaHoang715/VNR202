import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getServerUrl } from '../socket';
import {
  RoomSnapshot,
  RoundResultSnapshot,
  TeamSnapshot,
  ScenarioOption,
} from '../types';
import {
  INITIAL_DEMO_BOT_CONFIGS,
  getBotVoteDecision,
  evaluateVictory,
} from '../demoController';
import {
  Play,
  RotateCcw,
  FastForward,
  X,
  Users,
  Bot,
  Wheat,
  Shield,
  Heart,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Trophy,
  Plus,
  UserMinus,
  Sparkles,
} from 'lucide-react';

interface BotConnection {
  socket: Socket;
  id: string;
  nickname: string;
  team: number;
  playerToken: string;
  playerId: string;
  hasVoted: boolean;
  votedOptionId?: string;
  votedOptionLabel?: string;
}

interface GameDemoProps {
  onClose?: () => void;
}

// Bounded emit helper with promise ack and timeout
async function emitWithTimeout<T = any>(
  socket: Socket,
  event: string,
  data: any,
  timeoutMs: number = 6000
): Promise<T> {
  if (!socket.connected) {
    await new Promise<void>((resolve, reject) => {
      const done = (error?: Error) => {
        clearTimeout(timer);
        socket.off('connect', connected);
        socket.off('connect_error', failed);
        socket.off('disconnect', disconnected);
        error ? reject(error) : resolve();
      };
      const connected = () => done();
      const failed = (error: Error) => done(error);
      const disconnected = () => done(new Error('Kết nối đã đóng.'));
      const timer = setTimeout(() => done(new Error('Không kết nối được máy chủ.')), timeoutMs);
      socket.once('connect', connected);
      socket.once('connect_error', failed);
      socket.once('disconnect', disconnected);
    });
  }
  return new Promise<T>((resolve, reject) => {
    if (!socket.connected) {
      return reject(new Error(`Socket không kết nối khi gửi ${event}`));
    }
    const timer = setTimeout(() => {
      reject(new Error(`Hết thời gian chờ phản hồi từ máy chủ (${event})`));
    }, timeoutMs);

    socket.emit(event, data, (resp: T) => {
      clearTimeout(timer);
      resolve(resp);
    });
  });
}

export const GameDemo: React.FC<GameDemoProps> = ({ onClose }) => {
  // UI State
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isActionBusy, setIsActionBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('Đang khởi tạo phòng mô phỏng với 10 máy...');
  const [isFastForwarding, setIsFastForwarding] = useState<boolean>(false);
  const [activeBots, setActiveBots] = useState<Array<{ id: string; nickname: string; team: number; connected: boolean; hasVoted: boolean; voteLabel?: string }>>([]);
  const [gameFinishedData, setGameFinishedData] = useState<{ victory: boolean; teams: TeamSnapshot[]; roundResults: RoundResultSnapshot[] } | null>(null);

  // Synchronous State References (Guards against stale React closures)
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const hostSocketRef = useRef<Socket | null>(null);
  const hostAuthRef = useRef<{ roomCode: string; hostToken: string } | null>(null);
  const botConnectionsRef = useRef<BotConnection[]>([]);
  const allSocketsRef = useRef<Set<Socket>>(new Set());
  const waitResolversRef = useRef<Set<() => void>>(new Set());
  const autoRunIdRef = useRef(0);
  const nextBotNumberRef = useRef(11);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fastForwardActiveRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const sessionIdRef = useRef<number>(0);

  // Cached Scenarios per Round so options and labels remain available in reviewing/finished phases
  const scenarioCacheRef = useRef<Record<number, { title: string; description: string; options: ScenarioOption[]; defaultOptionIndex: number }>>({});

  // Safe timeout helper tracked for instant cleanup
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const handle = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((h) => h !== handle);
      if (isMountedRef.current) {
        fn();
      }
    }, ms);
    timeoutsRef.current.push(handle);
    return handle;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((h) => clearTimeout(h));
    timeoutsRef.current = [];
    for (const resolve of waitResolversRef.current) resolve();
    waitResolversRef.current.clear();
  }, []);

  // Sync bot state for UI rendering
  const syncBotState = useCallback(() => {
    if (!isMountedRef.current) return;
    setActiveBots(
      botConnectionsRef.current.map((b) => ({
        id: b.id,
        nickname: b.nickname,
        team: b.team,
        connected: b.socket.connected,
        hasVoted: b.hasVoted,
        voteLabel: b.votedOptionLabel,
      }))
    );
  }, []);

  // Close own room and disconnect all sockets cleanly
  const cleanupAllSockets = useCallback(async (closeRoomOnServer: boolean = true) => {
    autoRunIdRef.current++;
    clearAllTimeouts();
    fastForwardActiveRef.current = false;
    if (isMountedRef.current) {
      setIsFastForwarding(false);
      setIsActionBusy(false);
    }

    const currentHost = hostSocketRef.current;
    const currentAuth = hostAuthRef.current;
    hostSocketRef.current = null;
    hostAuthRef.current = null;

    // Disconnect all bot sockets
    for (const b of botConnectionsRef.current) {
      try {
        b.socket.removeAllListeners();
        b.socket.disconnect();
      } catch {}
      allSocketsRef.current.delete(b.socket);
    }
    botConnectionsRef.current = [];

    // Also disconnect any untracked pending sockets
    for (const s of allSocketsRef.current) {
      if (s !== currentHost) {
        try {
          s.removeAllListeners();
          s.disconnect();
        } catch {}
      }
    }
    allSocketsRef.current.clear();

    // Close host room with bounded wait before disconnecting
    if (currentHost) {
      if (closeRoomOnServer && currentAuth && currentHost.connected) {
        try {
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, 800);
            currentHost.emit('host:close', { roomCode: currentAuth.roomCode, hostToken: currentAuth.hostToken }, () => {
              clearTimeout(t);
              resolve();
            });
          });
        } catch {}
      }
      try {
        currentHost.removeAllListeners();
        currentHost.disconnect();
      } catch {}
    }
  }, [clearAllTimeouts]);

  // Session Initializer
  const initializeDemoSession = useCallback(async () => {
    const currentSession = ++sessionIdRef.current;
    await cleanupAllSockets(true);

    if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;

    setIsInitializing(true);
    setIsActionBusy(false);
    setErrorMsg('');
    setStatusMsg('Đang tạo phòng và kết nối 10 máy...');
    setSnapshot(null);
    setRoomCode('');
    setGameFinishedData(null);
    setTimerRemaining(null);
    snapshotRef.current = null;

    const serverUrl = getServerUrl();

    // 1. Dedicated host socket
    const hostSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: false,
      timeout: 6000,
    });
    allSocketsRef.current.add(hostSocket);
    hostSocketRef.current = hostSocket;

    // Synchronous state listeners on host socket
    hostSocket.on('room:snapshot', (snap: RoomSnapshot) => {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
      snapshotRef.current = snap;
      setSnapshot(snap);

      // Cache scenario whenever present
      if (snap.currentScenario && snap.currentRound > 0) {
        scenarioCacheRef.current[snap.currentRound] = snap.currentScenario;
      }

      if (snap.phase === 'reviewing' || snap.phase === 'finished') {
        setTimerRemaining(null);
      }
    });

    hostSocket.on('round:tick', (ms: number) => {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
      setTimerRemaining(ms);
    });

    hostSocket.on('game:finished', (data: { victory: boolean; teams: TeamSnapshot[]; roundResults: RoundResultSnapshot[] }) => {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
      setGameFinishedData(data);
    });

    hostSocket.on('connect_error', (err: Error) => {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
      setErrorMsg(`Lỗi kết nối máy chủ: ${err.message || 'Không thể kết nối'}`);
      setIsInitializing(false);
    });

    // Wait for connect
    try {
      if (!hostSocket.connected) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Hết thời gian chờ kết nối máy chủ')), 5000);
          hostSocket.once('connect', () => {
            clearTimeout(t);
            resolve();
          });
          hostSocket.once('connect_error', (e) => {
            clearTimeout(t);
            reject(e);
          });
        });
      }
    } catch (err: any) {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
      setErrorMsg(err.message || 'Không thể kết nối máy chủ.');
      setIsInitializing(false);
      return;
    }

    if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
      allSocketsRef.current.delete(hostSocket);
      hostSocket.disconnect();
      return;
    }

    // 2. Create room on server
    let createResp: any;
    try {
      createResp = await emitWithTimeout(hostSocket, 'room:create', { numTeams: 4, classSize: null }, 6000);
    } catch (err: any) {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
      setErrorMsg(err.message || 'Lỗi gửi yêu cầu tạo phòng');
      setIsInitializing(false);
      return;
    }

    if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
      // Stale response: close created room on server
      if (createResp?.ok && createResp.roomCode && createResp.hostToken) {
        hostSocket.emit('host:close', { roomCode: createResp.roomCode, hostToken: createResp.hostToken });
      }
      allSocketsRef.current.delete(hostSocket);
      hostSocket.disconnect();
      return;
    }

    if (!createResp.ok || !createResp.roomCode || !createResp.hostToken) {
      setErrorMsg(createResp.error || 'Máy chủ từ chối khởi tạo phòng demo');
      setIsInitializing(false);
      return;
    }

    const newRoomCode = createResp.roomCode;
    const newHostToken = createResp.hostToken;
    hostAuthRef.current = { roomCode: newRoomCode, hostToken: newHostToken };
    setRoomCode(newRoomCode);
    if (createResp.snapshot) {
      snapshotRef.current = createResp.snapshot;
      setSnapshot(createResp.snapshot);
    }

    // 3. Connect 10 bots distributed 1/2/4/3
    setStatusMsg(`Đã tạo phòng ${newRoomCode}. Đang kết nối 10 máy vào 4 đội...`);
    const botConns: BotConnection[] = [];

    for (const cfg of INITIAL_DEMO_BOT_CONFIGS) {
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
        await cleanupAllSockets(true);
        return;
      }

      const bSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: false,
        timeout: 5000,
      });
      allSocketsRef.current.add(bSocket);

      try {
        const joinResp: any = await emitWithTimeout(
          bSocket,
          'room:join',
          { roomCode: newRoomCode, nickname: cfg.nickname, team: cfg.team },
          5000
        );

        if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
          bSocket.disconnect();
          return;
        }
        if (joinResp.ok && joinResp.playerToken && joinResp.playerId) {
          botConns.push({
            socket: bSocket,
            id: cfg.id,
            nickname: cfg.nickname,
            team: cfg.team,
            playerToken: joinResp.playerToken,
            playerId: joinResp.playerId,
            hasVoted: false,
          });
          if (joinResp.snapshot) {
            snapshotRef.current = joinResp.snapshot;
            setSnapshot(joinResp.snapshot);
          }
        }
        else throw new Error(joinResp.error || 'Máy chưa vào được phòng.');
      } catch (err: any) {
        if (!isMountedRef.current || sessionIdRef.current !== currentSession) return;
        await cleanupAllSockets(true);
        setErrorMsg(err.message || 'Không kết nối đủ người chơi máy. Hãy bấm Chơi lại.');
        setIsInitializing(false);
        return;
      }
    }

    if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
      await cleanupAllSockets(true);
      return;
    }

    botConnectionsRef.current = botConns;
    syncBotState();
    setIsInitializing(false);
    setStatusMsg('Sẵn sàng! 10 máy đã phân bổ vào 4 đội (1 / 2 / 4 / 3). Bấm "Bắt đầu lượt" để thử nghiệm.');
  }, [cleanupAllSockets, syncBotState]);

  // Mount/Unmount lifecycle (React StrictMode safe)
  useEffect(() => {
    isMountedRef.current = true;
    initializeDemoSession();

    return () => {
      isMountedRef.current = false;
      cleanupAllSockets(true);
    };
  }, [initializeDemoSession, cleanupAllSockets]);

  // Host Action: Bắt đầu lượt (Promise-based ack)
  const handleStartRound = useCallback(async (): Promise<boolean> => {
    const hostSocket = hostSocketRef.current;
    const hostAuth = hostAuthRef.current;
    if (!hostSocket || !hostAuth) return false;

    setErrorMsg('');
    setIsActionBusy(true);

    // Reset bot voting state for new round
    botConnectionsRef.current.forEach((b) => {
      b.hasVoted = false;
      b.votedOptionId = undefined;
      b.votedOptionLabel = undefined;
    });
    syncBotState();

    try {
      const resp: any = await emitWithTimeout(
        hostSocket,
        'host:start',
        { roomCode: hostAuth.roomCode, hostToken: hostAuth.hostToken },
        5000
      );

      if (!resp.ok) {
        setErrorMsg(resp.error || 'Không thể bắt đầu lượt');
        setIsActionBusy(false);
        return false;
      }
      setStatusMsg('Lượt đang diễn ra. Bấm "Cho máy bỏ phiếu" để các máy gửi biểu quyết.');
      setIsActionBusy(false);
      return true;
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi bắt đầu lượt');
      setIsActionBusy(false);
      return false;
    }
  }, [syncBotState]);

  // Bot Action: Cho máy bỏ phiếu (mỗi máy bỏ phiếu 1 lần qua socket riêng, có ack)
  const handleBotsVote = useCallback(async (): Promise<number> => {
    const snap = snapshotRef.current;
    const hostAuth = hostAuthRef.current;
    if (!snap || !hostAuth) return 0;

    const currentRound = snap.currentRound;
    const scenario = snap.currentScenario || scenarioCacheRef.current[currentRound];
    if (!scenario || !scenario.options) return 0;

    setErrorMsg('');
    setIsActionBusy(true);

    const votePromises: Promise<void>[] = [];
    let count = 0;

    for (const bot of botConnectionsRef.current) {
      if (bot.hasVoted || !bot.socket.connected) continue;

      const decision = getBotVoteDecision(bot.nickname, bot.team, currentRound, scenario.options);
      bot.hasVoted = true; // Mark in-flight immediately to prevent double-clicks
      bot.votedOptionId = decision.optionId;
      bot.votedOptionLabel = decision.optionLabel;
      count++;

      const p = emitWithTimeout(
        bot.socket,
        'player:vote',
        { roomCode: hostAuth.roomCode, playerToken: bot.playerToken, optionId: decision.optionId },
        5000
      )
        .then((resp: any) => {
          if (!resp.ok) {
            bot.hasVoted = false;
          }
        })
        .catch(() => {
          bot.hasVoted = false;
        });

      votePromises.push(p);
    }

    syncBotState();
    await Promise.allSettled(votePromises);
    syncBotState();
    setIsActionBusy(false);
    setStatusMsg(`Đã ghi nhận biểu quyết của ${count} máy. Bấm "Chốt lượt" để công bố kết quả.`);
    return count;
  }, [syncBotState]);

  // Host Action: Chốt lượt (Promise-based ack)
  const handleEndRound = useCallback(async (): Promise<boolean> => {
    const hostSocket = hostSocketRef.current;
    const hostAuth = hostAuthRef.current;
    if (!hostSocket || !hostAuth) return false;

    setErrorMsg('');
    setIsActionBusy(true);

    try {
      const resp: any = await emitWithTimeout(
        hostSocket,
        'host:endRound',
        { roomCode: hostAuth.roomCode, hostToken: hostAuth.hostToken },
        5000
      );

      if (!resp.ok) {
        setErrorMsg(resp.error || 'Không thể chốt lượt');
        setIsActionBusy(false);
        return false;
      }
      setStatusMsg('Đã chốt lượt sớm. Kết quả tài nguyên và phiếu bầu đã cập nhật.');
      setIsActionBusy(false);
      return true;
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi chốt lượt');
      setIsActionBusy(false);
      return false;
    }
  }, []);

  // Automated Fast Forward: "Xem nhanh 4 lượt" with strict ref checks & bounded loop
  const handleFastForward = useCallback(async () => {
    if (isFastForwarding) {
      autoRunIdRef.current++;
      fastForwardActiveRef.current = false;
      setIsFastForwarding(false);
      clearAllTimeouts();
      setStatusMsg('Đã dừng chế độ xem nhanh tự động.');
      return;
    }

    if (!hostSocketRef.current || !hostAuthRef.current) return;

    const autoRunId = ++autoRunIdRef.current;
    fastForwardActiveRef.current = true;
    setIsFastForwarding(true);
    setErrorMsg('');

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const done = () => { waitResolversRef.current.delete(done); resolve(); };
        waitResolversRef.current.add(done);
        safeTimeout(done, ms);
      });

    const getCurrentPhase = () => snapshotRef.current?.phase;
    const currentSession = sessionIdRef.current;
    let iterations = 0;
    const maxIterations = 4;

    while (
      fastForwardActiveRef.current &&
      isMountedRef.current &&
      sessionIdRef.current === currentSession &&
      autoRunIdRef.current === autoRunId &&
      iterations < maxIterations
    ) {
      iterations++;
      if (getCurrentPhase() === 'finished') {
        break;
      }

      // Step 1: Start round if in lobby or reviewing
      if (getCurrentPhase() === 'lobby' || getCurrentPhase() === 'reviewing') {
        const nextRound = (snapshotRef.current?.currentRound || 0) + 1;
        setStatusMsg(`[Tự động] Bắt đầu Lượt ${nextRound}...`);
        const started = await handleStartRound();
        if (!started || !fastForwardActiveRef.current) break;

        // Wait until server updates snapshot to 'playing'
        let waitPlaying = 0;
        while (getCurrentPhase() !== 'playing' && waitPlaying < 10) {
          await wait(200);
          waitPlaying++;
          if (!fastForwardActiveRef.current) break;
        }
        await wait(800);
      }

      if (!fastForwardActiveRef.current || sessionIdRef.current !== currentSession || autoRunIdRef.current !== autoRunId) break;
      if (getCurrentPhase() === 'finished') break;

      // Step 2: Cast votes for all bots
      setStatusMsg(`[Tự động] Cho ${botConnectionsRef.current.length} máy bỏ phiếu lượt ${snapshotRef.current?.currentRound}...`);
      await handleBotsVote();
      await wait(1200);

      if (!fastForwardActiveRef.current || sessionIdRef.current !== currentSession || autoRunIdRef.current !== autoRunId) break;
      if (getCurrentPhase() === 'finished') break;

      // Step 3: End round
      setStatusMsg(`[Tự động] Chốt lượt ${snapshotRef.current?.currentRound}...`);
      const ended = await handleEndRound();
      if (!ended || !fastForwardActiveRef.current) break;

      // Wait until server updates snapshot to reviewing or finished
      let waitReview = 0;
      while (
        getCurrentPhase() !== 'reviewing' &&
        getCurrentPhase() !== 'finished' &&
        waitReview < 10
      ) {
        await wait(200);
        waitReview++;
        if (!fastForwardActiveRef.current) break;
      }

      if (getCurrentPhase() === 'finished') {
        break;
      }

      // Short review delay so user sees round result
      await wait(1500);
    }

    if (autoRunIdRef.current !== autoRunId || sessionIdRef.current !== currentSession) return;
    fastForwardActiveRef.current = false;
    if (isMountedRef.current) {
      setIsFastForwarding(false);
      setStatusMsg(snapshotRef.current?.phase === 'finished' ? 'Đã chạy xong 4 lượt. Xem kết quả phía dưới.' : 'Đã dừng xem nhanh. Bạn có thể tiếp tục từng bước.');
    }
  }, [
    isFastForwarding,
    clearAllTimeouts,
    safeTimeout,
    handleStartRound,
    handleBotsVote,
    handleEndRound,
  ]);

  // Optional dynamic bot controls (only enabled in lobby)
  const handleAddOneBot = useCallback(async (teamIndex: number) => {
    if (!hostAuthRef.current || snapshotRef.current?.phase !== 'lobby') return;
    setIsActionBusy(true);

    const currentNum = nextBotNumberRef.current++;
    const teamNames = ['Bắc Sơn', 'Nam Kỳ', 'Việt Bắc', 'Tây Nguyên'];
    const newNickname = `Máy ${currentNum} (${teamNames[teamIndex] || `Đội ${teamIndex + 1}`})`;
    const serverUrl = getServerUrl();

    const bSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: false,
      timeout: 5000,
    });
    allSocketsRef.current.add(bSocket);

    try {
      const resp: any = await emitWithTimeout(
        bSocket,
        'room:join',
        { roomCode: hostAuthRef.current.roomCode, nickname: newNickname, team: teamIndex },
        5000
      );

      if (resp.ok && resp.playerToken && resp.playerId) {
        botConnectionsRef.current.push({
          socket: bSocket,
          id: `bot-${Date.now()}`,
          nickname: newNickname,
          team: teamIndex,
          playerToken: resp.playerToken,
          playerId: resp.playerId,
          hasVoted: false,
        });
        syncBotState();
        setStatusMsg(`Đã thêm ${newNickname} vào ${teamNames[teamIndex]}!`);
      } else {
        setErrorMsg(resp.error || 'Không thể thêm máy');
        allSocketsRef.current.delete(bSocket);
        bSocket.disconnect();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi thêm máy');
      allSocketsRef.current.delete(bSocket);
      bSocket.disconnect();
    } finally {
      setIsActionBusy(false);
    }
  }, [syncBotState]);

  const handleDisconnectOneBot = useCallback(() => {
    if (botConnectionsRef.current.length === 0 || snapshotRef.current?.phase !== 'lobby') return;
    const removed = botConnectionsRef.current.pop();
    if (removed) {
      try {
        removed.socket.disconnect();
      } catch {}
      allSocketsRef.current.delete(removed.socket);
      syncBotState();
      setStatusMsg(`Đã ngắt kết nối ${removed.nickname}.`);
    }
  }, [syncBotState]);

  // Format seconds mm:ss
  const formatSeconds = (ms: number | null) => {
    if (ms === null) return '--:--';
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Evaluate victory outcome using helper + authoritative backend event
  const outcome = snapshot ? evaluateVictory(snapshot.teams) : null;
  const isFinalVictory = gameFinishedData ? gameFinishedData.victory : outcome?.isVictory ?? false;

  // Active scenario: currentScenario or cached for reviewing/finished phases
  const activeScenario =
    snapshot && snapshot.currentScenario
      ? snapshot.currentScenario
      : snapshot && snapshot.currentRound > 0
      ? scenarioCacheRef.current[snapshot.currentRound]
      : null;

  return (
    <div className="space-y-6">
      {/* DEMO CONTROL PANEL HEADER */}
      <section className="paper-card rounded-xl p-5 border-2 border-[#c99738] bg-white shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd6c6] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#faebee] text-[#9d242b]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-[#171513]">
                  Phòng chơi thử
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#c99738]/20 text-[#855f18] border border-[#c99738]/40">
                  Mô phỏng trực tiếp
                </span>
              </div>
              <p className="text-sm text-[#6e6761] mt-0.5">
                Ban đầu có 10 máy chia vào 4 đội: 1, 2, 4 và 3 người. Bạn có thể thêm hoặc ngắt máy trong sảnh chờ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={initializeDemoSession}
              disabled={isInitializing || isFastForwarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-[#dfd6c6] bg-white hover:bg-[#ede7dc] text-[#3a3530] disabled:opacity-40"
              title="Khởi tạo lại phòng demo mới"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#9d242b]" />
              <span>Chơi lại</span>
            </button>

            {onClose && (
              <button
                onClick={async () => {
                  await cleanupAllSockets(true);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold bg-[#3a3530] text-white hover:bg-black"
                title="Đóng demo và trở về màn hình người chơi"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng demo</span>
              </button>
            )}
          </div>
        </div>

        {/* STATUS & ERROR ALERTS */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && !errorMsg && (
          <div className="p-2.5 bg-[#f6f3ed] border border-[#dfd6c6] text-[#3a3530] text-sm rounded flex items-center gap-2">
            <Info className="w-4 h-4 text-[#c99738] flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* CONTROLS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Start Round */}
            {(!snapshot || snapshot.phase === 'lobby' || snapshot.phase === 'reviewing') && (
              <button
                onClick={handleStartRound}
                disabled={isInitializing || isFastForwarding || isActionBusy || snapshot?.phase === 'finished'}
                className="flex items-center gap-2 px-4 py-2 bg-[#9d242b] text-white text-sm font-semibold rounded shadow hover:bg-[#7a171d] disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
                <span>
                  {snapshot && snapshot.phase === 'reviewing'
                    ? `Lượt tiếp theo (${snapshot.currentRound + 1})`
                    : 'Bắt đầu lượt 1'}
                </span>
              </button>
            )}

            {/* Bots Vote */}
            {snapshot && (snapshot.phase === 'playing' || snapshot.phase === 'paused') && (
              <button
                onClick={handleBotsVote}
                disabled={
                  isFastForwarding ||
                  isActionBusy ||
                  (activeBots.length > 0 && activeBots.every((b) => b.hasVoted))
                }
                className="flex items-center gap-2 px-4 py-2 bg-[#193b32] text-white text-sm font-semibold rounded shadow hover:bg-[#122b24] disabled:opacity-40"
              >
                <Bot className="w-4 h-4" />
                <span>
                  {activeBots.length > 0 && activeBots.every((b) => b.hasVoted)
                    ? `Tất cả ${activeBots.length} máy đã bỏ phiếu`
                    : 'Cho máy bỏ phiếu'}
                </span>
              </button>
            )}

            {/* End Round */}
            {snapshot && (snapshot.phase === 'playing' || snapshot.phase === 'paused') && (
              <button
                onClick={handleEndRound}
                disabled={isFastForwarding || isActionBusy}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#c99738] text-[#171513] text-sm font-bold rounded shadow hover:bg-[#b0842f] disabled:opacity-40"
                title="Chốt lượt sớm"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Chốt lượt</span>
              </button>
            )}

            {/* Fast-Forward 4 Rounds */}
            <button
              onClick={handleFastForward}
              disabled={isInitializing}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all shadow ${
                isFastForwarding
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-[#ede7dc] text-[#171513] border border-[#dfd6c6] hover:bg-[#dfd6c6]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#9d242b]" />
              <span>{isFastForwarding ? 'Dừng xem nhanh' : 'Xem nhanh 4 lượt'}</span>
            </button>
          </div>

          {/* Quick Bot Modifier (Only in Lobby) */}
          <div className="flex items-center gap-1.5 text-sm text-[#6e6761]">
            <span>Mô phỏng sĩ số lệch:</span>
            <button
              onClick={() => handleAddOneBot(2)}
              disabled={isInitializing || isFastForwarding || isActionBusy || snapshot?.phase !== 'lobby'}
              className="p-1 px-2 border border-[#dfd6c6] rounded hover:bg-[#ede7dc] text-[#171513] flex items-center gap-1 disabled:opacity-35"
              title="Thêm 1 máy vào Đội Việt Bắc (Chỉ ở sảnh chờ)"
            >
              <Plus className="w-3 h-3 text-emerald-700" />
              <span>Thêm máy</span>
            </button>
            <button
              onClick={handleDisconnectOneBot}
              disabled={
                isInitializing ||
                isFastForwarding ||
                isActionBusy ||
                snapshot?.phase !== 'lobby' ||
                botConnectionsRef.current.length <= 4
              }
              className="p-1 px-2 border border-[#dfd6c6] rounded hover:bg-[#ede7dc] text-[#171513] flex items-center gap-1 disabled:opacity-35"
              title="Ngắt kết nối 1 máy (Chỉ ở sảnh chờ)"
            >
              <UserMinus className="w-3 h-3 text-red-700" />
              <span>Ngắt 1 máy</span>
            </button>
          </div>
        </div>
      </section>

      {/* DEMO CONTROL HELP BOX */}
      <details className="paper-card p-3.5 rounded-lg border border-[#dfd6c6] text-sm text-[#3a3530]">
        <summary className="font-semibold cursor-pointer text-[#171513] flex items-center gap-2 select-none">
          <Info className="w-4 h-4 text-[#c99738]" />
          <span>Hướng dẫn thao tác mô phỏng</span>
        </summary>
        <div className="pt-2.5 mt-2 border-t border-[#dfd6c6]/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm leading-relaxed text-[#3a3530]">
          <div>
            <strong className="text-[#9d242b]">• Bắt đầu lượt:</strong> Mở vòng chơi 90 giây trên máy chủ, hiển thị tình huống lịch sử và 3 phương án đánh đổi tài nguyên.
          </div>
          <div>
            <strong className="text-[#193b32]">• Cho máy bỏ phiếu:</strong> Các máy gửi phiếu của mình. Phương án có nhiều phiếu nhất trong từng đội được chọn.
          </div>
          <div>
            <strong className="text-[#c99738]">• Chốt lượt:</strong> Bỏ qua thời gian chờ 90s, máy chủ lập tức tổng hợp phiếu, trừ/cộng tài nguyên và lưu kết quả lượt.
          </div>
          <div>
            <strong className="text-[#3a3530]">• Xem nhanh 4 lượt:</strong> Tự động vận hành liên tục 4 lượt với độ trễ trực quan để bạn theo dõi toàn bộ diễn biến và kết quả.
          </div>
        </div>
      </details>

      {/* ACTIVE ROOM HUD: ROOM CODE, PHASE & TIMER */}
      {snapshot && (
        <div className="paper-card rounded-xl p-4 border border-[#dfd6c6] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-[#6e6761] tracking-wider">Mã Phòng Demo</span>
              <div className="text-2xl font-mono font-bold text-[#9d242b] tracking-wider">
                {roomCode}
              </div>
            </div>

            <div className="h-8 w-px bg-[#dfd6c6] hidden sm:block" />

            <div>
              <span className="text-xs uppercase font-bold text-[#6e6761] tracking-wider">Trạng Thái Vòng Chơi</span>
              <div className="text-sm font-semibold text-[#171513]">
                {snapshot.phase === 'lobby' && `Sảnh chờ (${snapshot.players.filter(p => p.connected).length} người)`}
                {snapshot.phase === 'playing' && `Đang diễn ra: Lượt ${snapshot.currentRound} / 4`}
                {snapshot.phase === 'paused' && `Tạm dừng: Lượt ${snapshot.currentRound}`}
                {snapshot.phase === 'reviewing' && `Tổng kết: Lượt ${snapshot.currentRound}`}
                {snapshot.phase === 'finished' && 'Đã hoàn tất trò chơi'}
              </div>
            </div>
          </div>

          {/* Timer Display */}
          {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#9d242b] shadow-sm">
              <Clock className="w-4 h-4 text-[#9d242b]" />
              <span className="text-sm text-[#6e6761]">Đồng hồ đếm ngược:</span>
              <span className="text-2xl font-mono font-bold text-[#9d242b]">
                {formatSeconds(timerRemaining ?? snapshot.roundTimeRemainingMs)}
              </span>
            </div>
          )}

          {/* Join Info with real room code (Lobby only) */}
          {snapshot.phase === 'lobby' && (
            <div className="text-sm text-[#6e6761]">
              <span>Người thật có thể mở tab <strong>Người chơi</strong> và nhập mã </span>
              <code className="font-mono font-bold text-[#9d242b] bg-white px-1.5 py-0.5 rounded border border-[#dfd6c6]">
                {roomCode}
              </code>
              <span> để vào cùng các máy trước khi bắt đầu.</span>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE SCENARIO & OPTIONS DISPLAY */}
      {activeScenario && snapshot && snapshot.phase !== 'lobby' && (
        <div className="paper-card rounded-xl p-5 border-2 border-[#9d242b] bg-[#fdfbf7] space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-[#dfd6c6] pb-2">
            <span className="text-sm font-mono font-bold uppercase text-[#9d242b]">
              Tình Huống Lượt {snapshot.currentRound} / 4
            </span>
            <span className="text-sm text-[#6e6761] italic">
              * Tình huống mô phỏng giáo dục giả định, không thay thế sự kiện lịch sử thật
            </span>
          </div>

          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-[#171513]">
              {activeScenario.title}
            </h3>
            <p className="text-sm text-[#3a3530] mt-1 leading-relaxed">
              {activeScenario.description}
            </p>
          </div>

          {/* All Options Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {activeScenario.options.map((opt, oIdx) => (
              <div key={opt.id} className="p-3 bg-white rounded-lg border border-[#dfd6c6] text-sm space-y-1.5">
                <div className="font-bold text-[#9d242b]">
                  Phương án {String.fromCharCode(65 + oIdx)}: {opt.label}
                  {oIdx === activeScenario.defaultOptionIndex && (
                    <span className="block text-xs text-[#6e6761] font-normal mt-0.5">
                      (Mặc định khi hòa / không có phiếu)
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#3a3530] leading-snug">
                  {opt.tradeoffDescription}
                </div>
                <div className="font-mono text-xs text-[#6e6761] pt-1 border-t border-dashed">
                  Lương thực: <strong className="text-amber-800">{opt.effects.food ?? 0}</strong> |{' '}
                  Lực lượng: <strong className="text-blue-800">{opt.effects.strength ?? 0}</strong> |{' '}
                  Lòng dân: <strong className="text-red-800">{opt.effects.trust ?? 0}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAMS STATUS & BOTS DISTRIBUTION (1/2/4/3) */}
      {snapshot && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#171513] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#193b32]" />
              <span>Các đội & tài nguyên</span>
            </h3>
            <span className="text-sm text-[#6e6761]">
              Tổng số người chơi: <strong>{snapshot.players.filter(p => p.connected).length}</strong> | Ngưỡng an toàn: <strong>≥ 40</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshot.teams.map((team) => {
              const teamPlayers = snapshot.players.filter((p) => p.team === team.index);
              const lastVotes = snapshot.roundResults[snapshot.roundResults.length - 1]?.voteSummary[String(team.index)] || {};
              const votedCount = snapshot.phase === 'playing' || snapshot.phase === 'paused'
                ? teamPlayers.filter(p => p.hasVotedThisRound).length
                : Object.values(lastVotes).reduce((sum, count) => sum + count, 0);
              const teamBots = activeBots.filter((b) => b.team === team.index);

              return (
                <div key={team.index} className="paper-card rounded-xl p-4 border border-[#dfd6c6] space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#dfd6c6]">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#9d242b]">
                        {team.name}
                      </h4>
                      <span className="text-xs text-[#6e6761]">
                        {teamPlayers.filter(p => p.connected).length} đang kết nối · {teamBots.filter(b => b.connected).length} máy
                      </span>
                    </div>
                    <span className="text-sm font-mono font-bold text-[#171513] bg-[#ede7dc] px-2 py-0.5 rounded">
                      {team.contributionScore} đ
                    </span>
                  </div>

                  {/* Resource Gauges */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-amber-800">
                          <Wheat className="w-3.5 h-3.5" /> Lương thực:
                        </span>
                        <strong className={`font-mono ${team.resources.food < 40 ? 'text-red-600 font-bold' : ''}`}>
                          {team.resources.food} / 200
                        </strong>
                      </div>
                      <div className="w-full bg-[#dfd6c6] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            team.resources.food < 40 ? 'bg-red-500' : 'bg-amber-600'
                          }`}
                          style={{ width: `${Math.min(100, (team.resources.food / 200) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-blue-800">
                          <Shield className="w-3.5 h-3.5" /> Lực lượng:
                        </span>
                        <strong className={`font-mono ${team.resources.strength < 40 ? 'text-red-600 font-bold' : ''}`}>
                          {team.resources.strength} / 200
                        </strong>
                      </div>
                      <div className="w-full bg-[#dfd6c6] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            team.resources.strength < 40 ? 'bg-red-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, (team.resources.strength / 200) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-red-800">
                          <Heart className="w-3.5 h-3.5" /> Lòng dân:
                        </span>
                        <strong className={`font-mono ${team.resources.trust < 40 ? 'text-red-600 font-bold' : ''}`}>
                          {team.resources.trust} / 200
                        </strong>
                      </div>
                      <div className="w-full bg-[#dfd6c6] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            team.resources.trust < 40 ? 'bg-red-500' : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(100, (team.resources.trust / 200) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bots Voting List in Team */}
                  <div className="pt-2 border-t border-[#dfd6c6] space-y-1">
                    <div className="flex justify-between text-xs text-[#6e6761] uppercase tracking-wider font-semibold">
                      <span>Máy trong đội:</span>
                      <span className="font-mono font-bold text-[#9d242b]">
                        {votedCount} / {teamPlayers.length} phiếu
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {teamBots.map((b) => (
                        <span
                          key={b.id}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            b.hasVoted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-white text-[#3a3530] border-[#dfd6c6]'
                          }`}
                          title={b.voteLabel ? `Đã chọn: ${b.voteLabel}` : 'Chưa bỏ phiếu'}
                        >
                          {b.nickname} {b.hasVoted && '✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROUND RESULTS VOTE SUMMARIES & READABLE LABELS */}
      {snapshot && snapshot.roundResults.length > 0 && (
        <div className="paper-card rounded-xl p-5 border border-[#dfd6c6] space-y-4">
          <h3 className="font-serif font-bold text-base text-[#171513]">
            Kết quả từng lượt
          </h3>

          <div className="space-y-3">
            {snapshot.roundResults.map((res, rIdx) => {
              const roundScenario = scenarioCacheRef.current[res.round];
              const roundOptions = roundScenario?.options || [];

              return (
                <div key={rIdx} className="p-4 bg-[#fdfbf7] rounded-lg border border-[#dfd6c6] text-sm space-y-2.5">
                  <div className="flex justify-between items-center font-bold text-[#9d242b] border-b pb-1.5">
                    <span>Lượt {res.round}: {res.scenarioTitle}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {snapshot.teams.map((team) => {
                      const chosenOptId = res.teamChoices[String(team.index)];
                      const chosenOption = roundOptions.find((o) => o.id === chosenOptId);
                      const chosenLabel = chosenOption ? chosenOption.label : chosenOptId || 'Mặc định';

                      const teamVotes = res.voteSummary[String(team.index)] || {};
                      const resAfter = res.resourcesAfter[String(team.index)] || team.resources;
                      const resBefore = rIdx > 0 ? snapshot.roundResults[rIdx - 1].resourcesAfter[String(team.index)] : { food: 70, strength: 70, trust: 70 };

                      // Map vote summary keys to friendly labels
                      const voteDetails = Object.entries(teamVotes)
                        .map(([optId, cnt]) => {
                          const optMatch = roundOptions.find((o) => o.id === optId);
                          const lbl = optMatch ? optMatch.label : optId;
                          return `${lbl}: ${cnt} phiếu`;
                        })
                        .join(' | ');

                      return (
                        <div key={team.index} className="bg-white p-3 rounded-lg border border-[#dfd6c6] space-y-1.5">
                          <div className="font-semibold text-sm text-[#171513]">{team.name}</div>
                          <div className="text-sm text-[#9d242b]">
                            Phương án chọn: <strong>{chosenLabel}</strong>
                          </div>
                          <div className="text-xs text-[#6e6761]">
                            {voteDetails || 'Không có phiếu (dùng mặc định)'}
                          </div>
                          <div className="text-xs font-mono text-[#3a3530] pt-1.5 border-t">
                            <div>Lương thực: {resBefore.food} → <strong>{resAfter.food}</strong> ({resAfter.food - resBefore.food > 0 ? '+' : ''}{resAfter.food - resBefore.food})</div>
                            <div>Lực lượng: {resBefore.strength} → <strong>{resAfter.strength}</strong> ({resAfter.strength - resBefore.strength > 0 ? '+' : ''}{resAfter.strength - resBefore.strength})</div>
                            <div>Lòng dân: {resBefore.trust} → <strong>{resAfter.trust}</strong> ({resAfter.trust - resBefore.trust > 0 ? '+' : ''}{resAfter.trust - resBefore.trust})</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FINAL WIN/LOSS FROM BACKEND RULES */}
      {snapshot && snapshot.phase === 'finished' && (
        <div className="paper-card rounded-xl p-6 border-2 border-[#9d242b] bg-white text-center space-y-5 shadow-lg">
          <div className="inline-flex p-3 rounded-full bg-[#faebee] text-[#9d242b]">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="text-sm font-mono font-bold uppercase tracking-wider text-[#9d242b]">
              Kết quả ván chơi
            </span>
            <h3 className="font-serif font-bold text-2xl text-[#171513] mt-1">
              {isFinalVictory ? 'Cả lớp đã giữ vững căn cứ!' : 'Chưa giữ được căn cứ'}
            </h3>
            <p className="text-sm text-[#3a3530] max-w-xl mx-auto mt-2 leading-relaxed">
              {isFinalVictory
                ? `Tất cả 4 căn cứ đều vượt qua 4 lượt với mọi tài nguyên ≥ 40 và mức trung bình toàn quân đạt ${outcome?.globalAverage ?? 50} ≥ 50.`
                : `Một hoặc nhiều căn cứ đã suy giảm tài nguyên xuống dưới ngưỡng 40 hoặc trung bình toàn quân chưa đạt mức 50.`}
            </p>
          </div>

          {/* Detailed debrief cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left text-sm">
            <div className="p-3 bg-[#f6f3ed] rounded-lg border border-[#dfd6c6]">
              <div className="font-bold text-[#171513] mb-1">Quy tắc sinh tồn từng lượt:</div>
              <p className="text-[#6e6761]">
                Mọi tài nguyên của từng đội phải duy trì ≥ 40 sau mỗi lượt.{' '}
                {outcome?.hasSurvived ? (
                  <strong className="text-emerald-700">ĐẠT (Không đội nào cạn kiệt)</strong>
                ) : (
                  <strong className="text-red-700">KHÔNG ĐẠT</strong>
                )}
              </p>
            </div>

            <div className="p-3 bg-[#f6f3ed] rounded-lg border border-[#dfd6c6]">
              <div className="font-bold text-[#171513] mb-1">Mục tiêu trung bình toàn quân:</div>
              <p className="text-[#6e6761]">
                Trung bình chung tất cả các đội phải ≥ 50.{' '}
                <strong className={outcome && outcome.globalAverage >= 50 ? 'text-emerald-700' : 'text-red-700'}>
                  Hiện đạt: {outcome?.globalAverage ?? 0}
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
