import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { getSocket, SessionStorage } from '../socket';
import { RoomSnapshot, RoundResultSnapshot, TeamSnapshot } from '../types';
import { evaluateVictory } from '../demoController';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Lock,
  Unlock,
  Users,
  ShieldAlert,
  Trophy,
  QrCode,
  Copy,
  Check,
  Wheat,
  Shield,
  Heart,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const GameHost: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>(() => SessionStorage.getHostSession().roomCode || '');
  const [hostToken, setHostToken] = useState<string>(() => SessionStorage.getHostSession().hostToken || '');
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [numTeams, setNumTeams] = useState<number>(4);
  const [classSizeInput, setClassSizeInput] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [publicJoinUrl, setPublicJoinUrl] = useState<string>(() => {
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vnr202_public_join_url') : null;
    if (saved) {
      if (!isLocalhost && (saved.includes('localhost') || saved.includes('127.0.0.1'))) {
        return window.location.origin;
      }
      return saved;
    }
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  });
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<'end' | 'reset' | 'close' | 'startWithEmptyTeams' | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [gameFinishedData, setGameFinishedData] = useState<{ victory: boolean; teams: TeamSnapshot[]; roundResults: RoundResultSnapshot[] } | null>(null);

  const socket = getSocket();

  // Reconnect host session on mount AND on socket 'connect' (e.g. network recovery)
  useEffect(() => {
    const reconnectHost = () => {
      const session = SessionStorage.getHostSession();
      if (session.roomCode && session.hostToken) {
        socket.emit(
          'host:reconnect',
          { roomCode: session.roomCode, hostToken: session.hostToken },
          (resp: any) => {
            if (resp.ok && resp.snapshot) {
              setRoomCode(session.roomCode!);
              setHostToken(session.hostToken!);
              setSnapshot(resp.snapshot);
            } else {
              SessionStorage.clearHostSession();
              setRoomCode('');
              setHostToken('');
              setSnapshot(null);
            }
          }
        );
      }
    };

    reconnectHost();
    socket.on('connect', reconnectHost);

    return () => {
      socket.off('connect', reconnectHost);
    };
  }, []);

  // Listen to socket events
  useEffect(() => {
    const onSnapshot = (snap: RoomSnapshot) => {
      setSnapshot(snap);
      setErrorMsg('');
      if (snap.phase === 'reviewing' || snap.phase === 'finished') {
        setTimerRemaining(null);
      }
    };

    const onTick = (remMs: number) => {
      setTimerRemaining(remMs);
    };

    const onFinished = (data: any) => {
      setGameFinishedData(data);
    };

    socket.on('room:snapshot', onSnapshot);
    socket.on('round:tick', onTick);
    socket.on('game:finished', onFinished);

    return () => {
      socket.off('room:snapshot', onSnapshot);
      socket.off('round:tick', onTick);
      socket.off('game:finished', onFinished);
    };
  }, []);

  // Generate QR code whenever roomCode or publicJoinUrl changes
  useEffect(() => {
    localStorage.setItem('vnr202_public_join_url', publicJoinUrl);
    if (roomCode) {
      const fullUrl = `${publicJoinUrl}?room=${roomCode}`;
      QRCode.toDataURL(fullUrl, { width: 220, margin: 2, color: { dark: '#9d242b', light: '#f6f3ed' } })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [roomCode, publicJoinUrl]);

  // Host Actions
  const handleCreateRoom = () => {
    setErrorMsg('');
    const parsed = classSizeInput.trim() ? parseInt(classSizeInput.trim(), 10) : null;
    const validatedClassSize = parsed && parsed >= 1 && parsed <= 200 ? parsed : null;

    socket.emit('room:create', { numTeams, classSize: validatedClassSize }, (resp: any) => {
      if (resp.ok) {
        setRoomCode(resp.roomCode);
        setHostToken(resp.hostToken);
        SessionStorage.saveHostSession(resp.roomCode, resp.hostToken);
        if (resp.snapshot) {
          setSnapshot(resp.snapshot);
        }
      } else {
        setErrorMsg(resp.error || 'Lỗi tạo phòng');
      }
    });
  };

  const handleStartRound = () => {
    if (!roomCode || !hostToken || !snapshot) return;

    // Check for teams with 0 connected players
    if (snapshot.phase === 'lobby') {
      const emptyTeams = snapshot.teams.filter(
        (t) => snapshot.players.filter((p) => p.team === t.index && p.connected).length === 0
      );
      if (emptyTeams.length > 0) {
        setPendingAction('startWithEmptyTeams');
        return;
      }
    }

    executeStartRound();
  };

  const executeStartRound = () => {
    socket.emit('host:start', { roomCode, hostToken }, (resp: any) => {
      if (!resp.ok) setErrorMsg(resp.error || 'Không thể bắt đầu lượt');
    });
  };

  const handlePause = () => {
    socket.emit('host:pause', { roomCode, hostToken }, (resp: any) => {
      if (!resp.ok) setErrorMsg(resp.error || 'Lỗi tạm dừng');
    });
  };

  const handleResume = () => {
    socket.emit('host:resume', { roomCode, hostToken }, (resp: any) => {
      if (!resp.ok) setErrorMsg(resp.error || 'Lỗi tiếp tục');
    });
  };

  const handleEndRound = () => {
    setPendingAction('end');
  };

  const handleToggleLobbyLock = () => {
    if (!snapshot) return;
    const newLock = !snapshot.lobbyLocked;
    socket.emit('host:setLobbyLock', { roomCode, hostToken, locked: newLock }, (resp: any) => {
      if (!resp.ok) setErrorMsg(resp.error || 'Lỗi khóa sảnh');
    });
  };

  const handleResetGame = () => {
    setPendingAction('reset');
  };

  const confirmAction = () => {
    if (pendingAction === 'startWithEmptyTeams') {
      setPendingAction(null);
      executeStartRound();
      return;
    }

    const event = pendingAction === 'end' ? 'host:endRound' : pendingAction === 'reset' ? 'host:reset' : 'host:close';
    socket.emit(event, { roomCode, hostToken }, (response: any) => {
      if (!response.ok) setErrorMsg(response.error || 'Không thể thực hiện thao tác');
      else if (pendingAction === 'close') {
        SessionStorage.clearHostSession();
        setRoomCode('');
        setHostToken('');
        setSnapshot(null);
        setGameFinishedData(null);
      }
      setPendingAction(null);
    });
  };

  const handleCopyLink = () => {
    const fullUrl = `${publicJoinUrl}?room=${roomCode}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // If no room created yet, show creation form
  if (!roomCode || !snapshot) {
    return (
      <div className="max-w-xl mx-auto paper-card rounded-xl p-6 sm:p-8 border-2 border-[#dfd6c6] shadow-md my-4 space-y-6">
        <div className="text-center border-b border-[#dfd6c6] pb-4">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9d242b] bg-[#faebee] px-2.5 py-0.5 rounded border border-[#9d242b]/20">
            Chủ phòng
          </span>
          <h2 className="font-serif font-bold text-2xl text-[#171513] mt-2">
            Tạo phòng
          </h2>
          <p className="text-sm text-[#6e6761] mt-1">
            Mô phỏng hợp tác 10 phút — 4 lượt quyết định chiến lược
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-5 text-sm">
          <div>
            <label className="block font-semibold text-[#171513] mb-1.5">
              Số lượng đội chơi (4 – 6 đội):
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumTeams(num)}
                  className={`py-2.5 text-center rounded-lg border font-semibold text-sm transition-all ${
                    numTeams === num
                      ? 'bg-[#9d242b] text-white border-[#9d242b]'
                      : 'bg-white text-[#3a3530] border-[#dfd6c6] hover:bg-[#ede7dc]'
                  }`}
                >
                  {num} Đội
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6e6761] mt-1.5 leading-relaxed">
              Các đội đại diện các căn cứ: Bắc Sơn, Nam Kỳ, Việt Bắc, Tây Nguyên, Đồng Bằng, Duyên Hải.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#171513] mb-1.5">
              Sĩ số lớp thực tế (tùy chọn):
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={classSizeInput}
              onChange={(e) => setClassSizeInput(e.target.value)}
              placeholder="Để trống nếu chưa rõ sĩ số"
              className="w-full px-3 py-2 text-sm border border-[#dfd6c6] rounded bg-white font-mono"
            />
            <p className="text-xs text-[#6e6761] mt-1.5 leading-relaxed">
              Chưa biết sĩ số? Cứ để trống. Số người tham gia được cập nhật khi vào phòng.
            </p>
            <p className="text-xs text-[#6e6761] mt-1 leading-relaxed">
              Không yêu cầu số lượng cố định theo đội: các đội có thể có số người không bằng nhau (chỉ cần ít nhất 1 người tham gia/đội). Biểu quyết tính theo đa số nội bộ từng đội và tài nguyên khởi đầu các đội đều bằng nhau (70).
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#171513] mb-1.5">
              Địa chỉ công khai máy chủ / LAN (để QR quét được từ điện thoại):
            </label>
            <input
              type="text"
              value={publicJoinUrl}
              onChange={(e) => setPublicJoinUrl(e.target.value)}
              placeholder="http://192.168.1.X:5173"
              className="w-full px-3 py-2 text-sm border border-[#dfd6c6] rounded bg-white font-mono"
            />
            <p className="text-xs text-[#6e6761] mt-1 leading-relaxed">
              Nếu chiếu trong lớp, thay localhost bằng IP LAN máy tính của bạn để điện thoại sinh viên truy cập được.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateRoom}
          className="w-full py-3 bg-[#9d242b] text-white font-semibold rounded-lg shadow hover:bg-[#7a171d] transition-all text-sm flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          <span>Tạo Phòng & Mở Sảnh Chờ</span>
        </button>
      </div>
    );
  }

  // Active Room Screen
  const formatSeconds = (ms: number | null) => {
    if (ms === null) return '--:--';
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const emptyTeams = snapshot.phase === 'lobby'
    ? snapshot.teams.filter(
        (t) => snapshot.players.filter((p) => p.team === t.index && p.connected).length === 0
      )
    : [];

  const hostOutcome = snapshot ? evaluateVictory(snapshot.teams) : null;
  const isHostVictory = gameFinishedData ? gameFinishedData.victory : hostOutcome?.isVictory ?? false;
  const roundsFinished = snapshot.roundResults.length;

  return (
    <div className="space-y-6">
      {/* Top Host Bar: Group Phase, Round, Timer & Main Actions */}
      <div className="paper-card rounded-xl p-4 border border-[#dfd6c6] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#6e6761] tracking-wider">Mã Phòng</span>
            <div className="text-3xl font-mono font-bold text-[#9d242b] tracking-wider">
              {roomCode}
            </div>
          </div>

          <div className="h-8 w-px bg-[#dfd6c6] hidden sm:block" />

          <div>
            <span className="text-[10px] uppercase font-bold text-[#6e6761] tracking-wider">Trạng Thái</span>
            <div className="text-sm font-semibold text-[#171513]">
              {snapshot.phase === 'lobby' && 'Sảnh Chờ Tham Gia'}
              {snapshot.phase === 'playing' && `Đang Chơi: Lượt ${snapshot.currentRound} / 4`}
              {snapshot.phase === 'paused' && `Tạm Dừng: Lượt ${snapshot.currentRound}`}
              {snapshot.phase === 'reviewing' && `Tổng Kết: Lượt ${snapshot.currentRound}`}
              {snapshot.phase === 'finished' && 'Kết Thúc Trò Chơi'}
            </div>
          </div>
        </div>

        {/* Timer Display */}
        {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#9d242b] shadow-sm">
            <span className="text-xs text-[#6e6761]">Thời gian còn lại:</span>
            <span className="text-2xl font-mono font-bold text-[#9d242b]">
              {formatSeconds(timerRemaining ?? snapshot.roundTimeRemainingMs)}
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {snapshot.phase === 'lobby' && (
            <>
              <button
                onClick={handleToggleLobbyLock}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#dfd6c6] bg-white hover:bg-[#ede7dc]"
              >
                {snapshot.lobbyLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-red-600" />
                    <span>Đang Khóa Sảnh</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sảnh Đang Mở</span>
                  </>
                )}
              </button>

              <button
                onClick={handleStartRound}
                disabled={snapshot.players.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#9d242b] text-white text-xs font-semibold rounded-lg hover:bg-[#7a171d] disabled:opacity-40 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Bắt Đầu Lượt 1</span>
              </button>
            </>
          )}

          {snapshot.phase === 'playing' && (
            <>
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Tạm Dừng</span>
              </button>
              <button
                onClick={handleEndRound}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#9d242b] text-white rounded-lg hover:bg-[#7a171d]"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Chốt Lượt Ngay</span>
              </button>
            </>
          )}

          {snapshot.phase === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tiếp Tục Lượt</span>
              </button>
              <button
                onClick={handleEndRound}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#9d242b] text-white rounded-lg hover:bg-[#7a171d]"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Chốt Lượt</span>
              </button>
            </>
          )}

          {snapshot.phase === 'reviewing' && (
            <button
              onClick={handleStartRound}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#9d242b] text-white text-xs font-semibold rounded-lg hover:bg-[#7a171d] shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Bắt Đầu Lượt {snapshot.currentRound + 1}</span>
            </button>
          )}

          <button
            onClick={handleResetGame}
            className="p-2 text-[#6e6761] hover:text-[#9d242b] rounded-lg hover:bg-[#ede7dc]"
            title="Đặt lại trò chơi về sảnh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            className="text-xs border rounded-lg px-2.5 py-2 text-[#3a3530] hover:bg-red-50 hover:text-red-700"
            onClick={() => setPendingAction('close')}
          >
            Đóng phòng
          </button>
        </div>
      </div>

      {/* Confirmation Alert Dialog */}
      {pendingAction && (
        <div role="alertdialog" aria-label="Xác nhận thao tác phòng" className="border-2 border-[#9d242b] rounded-xl p-5 bg-white space-y-3 shadow-md">
          <div className="font-semibold text-sm text-[#171513]">
            {pendingAction === 'end' && 'Chốt lượt ngay và công bố kết quả?'}
            {pendingAction === 'reset' && 'Đặt lại điểm và kết quả về sảnh chờ?'}
            {pendingAction === 'close' && 'Đóng phòng và đưa mọi người ra khỏi trò chơi?'}
            {pendingAction === 'startWithEmptyTeams' &&
              `Cảnh báo: Có ${emptyTeams.length} đội chưa có người tham gia (${emptyTeams.map((t) => t.name).join(', ')}).`}
          </div>

          {pendingAction === 'startWithEmptyTeams' && (
            <p className="text-xs text-[#6e6761] leading-relaxed">
              Mỗi đội cần ít nhất 1 người tham gia để tự biểu quyết (sĩ số các đội không cần bằng nhau). Nếu vẫn bắt đầu, máy chủ sẽ tự động áp dụng phương án mặc định đã công bố cho các đội không có phiếu (hệ thống không tự tạo phiếu giả). Bạn có chắc chắn muốn bắt đầu lượt 1 ngay không?
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              className="border border-[#dfd6c6] rounded-lg px-3 py-1.5 text-xs text-[#3a3530] hover:bg-[#ede7dc]"
              onClick={() => setPendingAction(null)}
            >
              Hủy
            </button>
            <button
              className="rounded-lg px-4 py-1.5 bg-[#9d242b] text-white text-xs font-semibold hover:bg-[#7a171d]"
              onClick={confirmAction}
            >
              {pendingAction === 'startWithEmptyTeams' ? 'Vẫn bắt đầu' : 'Xác nhận'}
            </button>
          </div>
        </div>
      )}

      {/* LOBBY VIEW: QR CODE, 0-PLAYER WARNING & TEAMS */}
      {snapshot.phase === 'lobby' && (
        <div className="space-y-4">
          {/* Prominent Empty Team Warning if applicable */}
          {emptyTeams.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-sm space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Cảnh báo: Có {emptyTeams.length} đội chưa có người chơi kết nối ({emptyTeams.map((t) => t.name).join(', ')})</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Mỗi đội cần ít nhất 1 người tham gia để tự biểu quyết (sĩ số các đội không cần bằng nhau).
                Hãy nhắc người chơi chọn đội hoặc đổi sang các đội còn trống trước khi bắt đầu.
                Nếu vẫn bắt đầu, máy chủ sẽ tự động áp dụng phương án mặc định đã công bố cho đội không có phiếu (hệ thống không tự tạo phiếu giả).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* QR Code & Join Info */}
            <div className="paper-card rounded-xl p-6 border border-[#dfd6c6] text-center space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#171513]">
                Quét QR Bằng Điện Thoại
              </h3>

              {qrDataUrl && (
                <div className="inline-block p-3 bg-white rounded-lg border-2 border-[#9d242b]/40 shadow-sm">
                  <img src={qrDataUrl} alt="QR Code Join Room" className="w-48 h-48 mx-auto" />
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs text-[#6e6761]">Hoặc truy cập:</span>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border border-[#dfd6c6] font-mono text-[#9d242b]">
                    {publicJoinUrl}?room={roomCode}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="p-1 text-[#6e6761] hover:text-[#9d242b]"
                    title="Sao chép liên kết"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Participation Stats without fake percentage when classSize is null */}
              <div className="pt-2 border-t border-[#dfd6c6] text-xs text-[#6e6761] flex justify-between items-center">
                <span>Đã vào phòng: <strong className="text-sm font-mono text-[#171513]">{snapshot.stats.totalJoined}</strong></span>
                {snapshot.stats.classSize !== null && snapshot.stats.classSize > 0 ? (
                  <span>Sĩ số dự kiến: <strong className="font-mono text-[#171513]">{snapshot.stats.classSize}</strong> ({Math.round((snapshot.stats.totalJoined / snapshot.stats.classSize) * 100)}%)</span>
                ) : (
                  <span className="italic text-[#8c827a]">(Sĩ số tự do)</span>
                )}
              </div>
            </div>

            {/* Teams Roster */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {snapshot.teams.map((team) => {
                const teamMembers = snapshot.players.filter((p) => p.team === team.index);
                const hasNoPlayers = teamMembers.length === 0;

                return (
                  <div
                    key={team.index}
                    className={`paper-card rounded-xl p-4 border transition-all ${
                      hasNoPlayers ? 'border-amber-300 bg-amber-50/30' : 'border-[#dfd6c6]'
                    }`}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-[#dfd6c6]">
                      <h4 className="font-serif font-bold text-sm text-[#9d242b]">
                        {team.name}
                      </h4>
                      <span
                        className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                          hasNoPlayers ? 'bg-amber-100 text-amber-800' : 'bg-[#e8decb] text-[#3a3530]'
                        }`}
                      >
                        {teamMembers.length} thành viên
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {teamMembers.length === 0 ? (
                        <span className="text-xs text-amber-700 italic">Chưa có người chơi...</span>
                      ) : (
                        teamMembers.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className="text-xs bg-white px-2 py-0.5 rounded border border-[#dfd6c6] text-[#171513]"
                          >
                            {m.nickname}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PLAYING / REVIEWING / FINISHED VIEWS */}
      {snapshot.phase !== 'lobby' && (
        <div className="space-y-6">
          {/* Active Scenario Card */}
          {snapshot.currentScenario && (
            <div className="paper-card rounded-xl p-6 border-2 border-[#9d242b] bg-[#fdfbf7] space-y-4">
              <div className="flex justify-between items-center border-b border-[#dfd6c6] pb-2">
                <span className="text-xs font-mono font-bold uppercase text-[#9d242b]">
                  Tình Huống Lượt {snapshot.currentRound} / 4
                </span>
                <span className="text-xs text-[#6e6761] italic">
                  * Tình huống mô phỏng giáo dục giả định, không thay thế sự kiện lịch sử thật
                </span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-xl text-[#171513]">
                  {snapshot.currentScenario.title}
                </h3>
                <p className="text-sm text-[#3a3530] mt-1 leading-relaxed">
                  {snapshot.currentScenario.description}
                </p>
              </div>

              {/* Options Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {snapshot.currentScenario.options.map((opt, oIdx) => (
                  <div key={opt.id} className="p-3 bg-white rounded-lg border border-[#dfd6c6] text-xs space-y-1.5">
                    <div className="font-bold text-[#9d242b]">
                      Phương án {String.fromCharCode(65 + oIdx)}: {opt.label}
                      {oIdx === snapshot.currentScenario!.defaultOptionIndex && (
                        <span className="block text-[10px] text-[#6e6761] font-normal mt-0.5">
                          (Mặc định khi hòa / không có phiếu)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#3a3530] leading-snug">
                      {opt.tradeoffDescription}
                    </div>
                    <div className="font-mono text-[10px] text-[#6e6761] pt-1 border-t">
                      Ảnh hưởng: Lương thực ({opt.effects.food ?? 0}), Lực lượng ({opt.effects.strength ?? 0}), Lòng dân ({opt.effects.trust ?? 0})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams Status & Live Resources Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.teams.map((team) => {
              const members = snapshot.players.filter((p) => p.team === team.index);
              const votedCount = members.filter((m) => m.hasVotedThisRound).length;

              return (
                <div key={team.index} className="paper-card rounded-xl p-4 border border-[#dfd6c6] space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#dfd6c6]">
                    <h4 className="font-serif font-bold text-sm text-[#171513]">
                      {team.name}
                    </h4>
                    <span className="text-xs font-mono text-[#9d242b] font-bold">
                      Điểm đóng góp: {team.contributionScore}
                    </span>
                  </div>

                  {/* Resource Gauges */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
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
                      <div className="flex justify-between text-[11px] mb-1">
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
                      <div className="flex justify-between text-[11px] mb-1">
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

                  {/* Voting Progress */}
                  <div className="pt-2 border-t border-[#dfd6c6] text-xs text-[#6e6761] flex justify-between items-center">
                    <span>Đã biểu quyết:</span>
                    <span className="font-mono font-bold text-[#9d242b]">
                      {votedCount} / {members.length} phiếu
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finished Screen Banner & Educational Debrief (Shows actual status & rounds) */}
          {snapshot.phase === 'finished' && (
            <div className="paper-card rounded-xl p-8 border-2 border-[#9d242b] bg-white text-center space-y-6 shadow-md">
              <div className="inline-flex p-3 rounded-full bg-[#faebee] text-[#9d242b]">
                <Trophy className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-[#171513]">
                  {isHostVictory
                    ? 'Tổng Kết Mô Phỏng: Cả Lớp Hoàn Thành 4 Vòng Kháng Chiến!'
                    : `Tổng Kết Mô Phỏng: Dừng ở Lượt ${roundsFinished} / 4`}
                </h3>
                <p className="text-sm text-[#3a3530] max-w-xl mx-auto mt-2 leading-relaxed">
                  {isHostVictory
                    ? 'Toàn bộ các căn cứ đã phối hợp, duy trì tài nguyên an toàn và đạt chiến thắng tập thể.'
                    : 'Một hoặc nhiều căn cứ đã suy giảm tài nguyên xuống dưới ngưỡng 40 hoặc trung bình toàn quân chưa đạt mức 50.'}
                </p>
              </div>

              {/* Leaderboard */}
              <div className="max-w-md mx-auto bg-[#f6f3ed] p-4 rounded-lg border border-[#dfd6c6] text-xs space-y-2">
                <div className="font-bold text-[#9d242b] uppercase tracking-wider pb-1 border-b">
                  Bảng Điểm Đóng Góp Các Đội
                </div>
                {[...snapshot.teams]
                  .sort((a, b) => b.contributionScore - a.contributionScore)
                  .map((t, idx) => (
                    <div key={t.index} className="flex justify-between items-center py-1">
                      <span className="font-medium text-sm">
                        {idx + 1}. {t.name}
                      </span>
                      <span className="font-mono font-bold text-[#9d242b] text-sm">
                        {t.contributionScore} điểm
                      </span>
                    </div>
                  ))}
              </div>

              {/* Educational Debrief */}
              <div className="max-w-2xl mx-auto text-left bg-[#ede7dc] p-5 rounded-lg border-l-4 border-l-[#9d242b] text-xs space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#171513]">
                  Bài học rút ra gắn với đường lối kháng chiến 1946–1950:
                </h4>
                <p className="text-[#3a3530] leading-relaxed">
                  1. <strong>Tự lực cánh sinh:</strong> Không thể phụ thuộc vào nguồn lực vô hạn bên ngoài; mỗi căn cứ phải tự tổ chức sản xuất lương thực và rèn đúc vũ khí.
                </p>
                <p className="text-[#3a3530] leading-relaxed">
                  2. <strong>Lấy dân làm gốc:</strong> Nếu chỉ chăm chăm tăng trang bị quân sự mà làm suy giảm lòng dân dưới ngưỡng an toàn (dưới 40), căn cứ sẽ tan vỡ từ bên trong.
                </p>
                <p className="text-[#3a3530] leading-relaxed">
                  3. <strong>Hiệp đồng chia sẻ:</strong> Cơ chế viện trợ hữu hạn phản ánh sinh động sự sẻ chia giữa các chiến trường, tiền tuyến và hậu phương Việt Bắc.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
