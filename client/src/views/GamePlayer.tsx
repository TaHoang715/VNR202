import React, { useState, useEffect } from 'react';
import { getSocket, SessionStorage } from '../socket';
import { RoomSnapshot, PollSnapshot, TeamResources } from '../types';
import {
  Users,
  Wheat,
  Shield,
  Heart,
  CheckCircle,
  Send,
  AlertCircle,
  HelpCircle,
  Share2,
  Clock,
  Vote,
} from 'lucide-react';

export const GamePlayer: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>(() => {
    // Check URL param first
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) return r.toUpperCase();
    }
    return SessionStorage.getPlayerSession().roomCode || '';
  });
  const [nickname, setNickname] = useState<string>(() => SessionStorage.getPlayerSession().nickname || '');
  const [selectedTeam, setSelectedTeam] = useState<number>(() => SessionStorage.getPlayerSession().team ?? 0);
  const [playerToken, setPlayerToken] = useState<string>(() => SessionStorage.getPlayerSession().playerToken || '');
  const [ownPlayerId, setOwnPlayerId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('vnr202_player_id') : null;
  });

  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [activePoll, setActivePoll] = useState<PollSnapshot | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');

  // Aid form state
  const [aidTeam, setAidTeam] = useState<number>(1);
  const [aidResource, setAidResource] = useState<keyof TeamResources>('food');
  const [aidAmount, setAidAmount] = useState<number>(10);
  const [showAidModal, setShowAidModal] = useState<boolean>(false);

  const socket = getSocket();

  // Reconnect on mount AND on socket 'connect'
  useEffect(() => {
    const reconnectPlayer = () => {
      const session = SessionStorage.getPlayerSession();
      const requestedRoom = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
      if (requestedRoom && session.roomCode && requestedRoom !== session.roomCode) {
        SessionStorage.clearPlayerSession();
        localStorage.removeItem('vnr202_player_id');
        setRoomCode(requestedRoom);
        setPlayerToken('');
        setOwnPlayerId(null);
        setSnapshot(null);
        return;
      }
      if (session.roomCode && session.playerToken) {
        socket.emit(
          'room:reconnect',
          { roomCode: session.roomCode, playerToken: session.playerToken },
          (resp: any) => {
            if (resp.ok && resp.snapshot) {
              setRoomCode(session.roomCode!);
              setPlayerToken(session.playerToken!);
              setSnapshot(resp.snapshot);
              if (resp.player) {
                setOwnPlayerId(resp.player.id);
                localStorage.setItem('vnr202_player_id', resp.player.id);
                setSelectedTeam(resp.player.team);
                setNickname(resp.player.nickname);
                if (resp.player.hasVotedThisRound) {
                  setVotedOption('voted');
                }
              }
            } else {
              SessionStorage.clearPlayerSession();
              localStorage.removeItem('vnr202_player_id');
              setPlayerToken('');
              setOwnPlayerId(null);
              setSnapshot(null);
            }
          }
        );
      }
    };

    reconnectPlayer();
    socket.on('connect', reconnectPlayer);

    return () => {
      socket.off('connect', reconnectPlayer);
    };
  }, []);

  // Listen to socket updates
  useEffect(() => {
    const onSnapshot = (snap: RoomSnapshot) => {
      setSnapshot(snap);
      setErrorMsg('');

      if (snap.phase === 'reviewing' || snap.phase === 'finished') {
        setTimerRemaining(null);
      }

      // Check if player has voted this round by public playerId
      if (ownPlayerId) {
        const me = snap.players.find((p) => p.id === ownPlayerId);
        if (me && me.hasVotedThisRound) {
          setVotedOption('voted');
        } else if (snap.phase === 'playing' && me && !me.hasVotedThisRound) {
          setVotedOption(null);
        }
      }
    };

    const onTick = (remMs: number) => {
      setTimerRemaining(remMs);
    };

    const onPollUpdate = (poll: PollSnapshot | null) => {
      setActivePoll(poll);
    };

    const onKicked = (reason: string) => {
      setInfoMsg(`Phòng đã đóng: ${reason}`);
      SessionStorage.clearPlayerSession();
      localStorage.removeItem('vnr202_player_id');
      setPlayerToken('');
      setOwnPlayerId(null);
      setSnapshot(null);
    };

    socket.on('room:snapshot', onSnapshot);
    socket.on('round:tick', onTick);
    socket.on('poll:update', onPollUpdate);
    socket.on('room:kicked', onKicked);

    return () => {
      socket.off('room:snapshot', onSnapshot);
      socket.off('round:tick', onTick);
      socket.off('poll:update', onPollUpdate);
      socket.off('room:kicked', onKicked);
    };
  }, [ownPlayerId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanCode = roomCode.trim().toUpperCase();
    const cleanNick = nickname.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Mã phòng phải gồm đúng 6 ký tự');
      return;
    }
    if (!cleanNick) {
      setErrorMsg('Vui lòng nhập biệt danh của bạn');
      return;
    }

    socket.emit(
      'room:join',
      { roomCode: cleanCode, nickname: cleanNick, team: selectedTeam },
      (resp: any) => {
        if (resp.ok && resp.playerToken) {
          setPlayerToken(resp.playerToken);
          if (resp.playerId) {
            setOwnPlayerId(resp.playerId);
            localStorage.setItem('vnr202_player_id', resp.playerId);
          }
          SessionStorage.savePlayerSession(cleanCode, resp.playerToken, cleanNick, selectedTeam);
          if (resp.snapshot) {
            setSnapshot(resp.snapshot);
          }
        } else {
          setErrorMsg(resp.error || 'Không thể tham gia phòng');
        }
      }
    );
  };

  const handleVote = (optionId: string) => {
    if (!playerToken || !roomCode) return;
    setErrorMsg('');

    socket.emit('player:vote', { roomCode, playerToken, optionId }, (resp: any) => {
      if (resp.ok) {
        setVotedOption(optionId);
        setInfoMsg('Đã ghi nhận biểu quyết kín của bạn!');
      } else {
        setErrorMsg(resp.error || 'Không thể ghi nhận biểu quyết');
      }
    });
  };

  const handleSendAid = () => {
    if (!playerToken || !roomCode) return;
    setErrorMsg('');
    setInfoMsg('');

    socket.emit(
      'player:aid',
      {
        roomCode,
        playerToken,
        toTeam: aidTeam,
        resource: aidResource,
        amount: aidAmount,
      },
      (resp: any) => {
        if (resp.ok) {
          setShowAidModal(false);
          setInfoMsg(`Đã chuyển viện trợ ${aidAmount} đơn vị tới đồng đội!`);
        } else {
          setErrorMsg(resp.error || 'Viện trợ thất bại');
        }
      }
    );
  };

  const handlePollVote = (optionIndex: number) => {
    if (!activePoll || !playerToken || !roomCode) return;
    socket.emit(
      'poll:vote',
      { roomCode, playerToken, pollId: activePoll.id, optionIndex },
      (resp: any) => {
        if (!resp.ok) setErrorMsg(resp.error || 'Lỗi gửi ý kiến khảo sát');
      }
    );
  };

  // If not joined, show Join Screen
  if (!playerToken || !snapshot) {
    return (
      <div className="max-w-md mx-auto paper-card rounded-xl p-6 border-2 border-[#dfd6c6] shadow-md my-4 space-y-5">
        <div className="text-center border-b border-[#dfd6c6] pb-3">
          <span className="text-[11px] font-mono font-semibold uppercase text-[#9d242b] bg-[#faebee] px-2 py-0.5 rounded border border-[#9d242b]/20">
            Người chơi
          </span>
          <h2 className="font-serif font-bold text-2xl text-[#171513] mt-2">
            Vào phòng
          </h2>
          <p className="text-sm text-[#6e6761] mt-1">
            Nhập mã phòng và chọn đội của bạn.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4 text-sm">
          <div>
            <label className="block font-semibold text-[#171513] mb-1">Mã phòng (6 ký tự):</label>
            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="VD: ABC234"
              className="w-full px-3 py-2 text-center text-xl font-mono font-bold tracking-widest uppercase border border-[#dfd6c6] rounded-lg bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#171513] mb-1">Biệt danh của bạn:</label>
            <input
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="VD: Chiến sĩ Nam, Hoa..."
              className="w-full px-3 py-2 border border-[#dfd6c6] rounded-lg bg-white text-sm"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#171513] mb-1">Chọn đội tham gia:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Đội Bắc Sơn',
                'Đội Nam Kỳ',
                'Đội Việt Bắc',
                'Đội Tây Nguyên',
                'Đội Đồng Bằng',
                'Đội Duyên Hải',
              ].map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedTeam(idx)}
                  className={`py-2 px-2 text-center rounded-lg border font-medium text-xs transition-all ${
                    selectedTeam === idx
                      ? 'bg-[#9d242b] text-white border-[#9d242b] shadow-sm'
                      : 'bg-white text-[#3a3530] border-[#dfd6c6] hover:bg-[#ede7dc]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6e6761] mt-1.5 leading-relaxed">
              * Không yêu cầu các đội phải bằng số người; chỉ cần ít nhất 1 người tham gia/đội. Biểu quyết tính theo đa số nội bộ từng đội và các đội đều có tài nguyên khởi đầu bằng nhau (70).
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#9d242b] text-white font-semibold rounded-lg shadow hover:bg-[#7a171d] text-sm mt-2 transition-all"
          >
            Vào Phòng Ngay
          </button>
        </form>
      </div>
    );
  }

  // Active Player HUD
  const myTeam = snapshot.teams[selectedTeam] || snapshot.teams[0];
  const formatSeconds = (ms: number | null) => {
    if (ms === null) return '--:--';
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">
      {/* Player Header Banner: Group phase/round and identity */}
      <div className="paper-card rounded-xl p-3.5 border border-[#dfd6c6] flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-[#6e6761] uppercase tracking-wider font-semibold">
            Chiến sĩ:
          </span>
          <div className="font-bold text-sm text-[#171513]">{nickname}</div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[#6e6761] uppercase tracking-wider font-semibold">
            Căn cứ của bạn:
          </span>
          <div className="font-serif font-bold text-sm text-[#9d242b]">{myTeam.name}</div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          {infoMsg}
        </div>
      )}

      {/* IN-TALK POLL OVERLAY IF ACTIVE */}
      {activePoll && activePoll.active && (
        <div className="paper-card rounded-xl p-4 border-2 border-[#9d242b] bg-white space-y-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#9d242b] border-b pb-2">
            <Vote className="w-4 h-4" />
            <span>Khảo sát nhanh lớp học:</span>
          </div>

          <h4 className="font-serif font-bold text-sm text-[#171513]">
            {activePoll.question}
          </h4>

          <div className="space-y-2">
            {activePoll.options.map((opt, idx) => {
              const hasVotedThis = activePoll.userVoteIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handlePollVote(idx)}
                  className={`w-full p-2.5 rounded-lg text-left text-xs font-medium border transition-all flex items-center justify-between ${
                    hasVotedThis
                      ? 'bg-[#9d242b] text-white border-[#9d242b]'
                      : 'bg-[#f6f3ed] hover:bg-[#ede7dc] text-[#171513] border-[#dfd6c6]'
                  }`}
                >
                  <span>{opt}</span>
                  {hasVotedThis && <CheckCircle className="w-4 h-4" />}
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-[#6e6761] text-right">
            Tổng lượt biểu quyết: {activePoll.totalVotes}
          </div>
        </div>
      )}

      {/* Team Resources HUD with bars, icons, numbers and safe threshold */}
      <div className="paper-card rounded-xl p-3.5 border border-[#dfd6c6] space-y-2.5">
        <div className="text-xs font-bold text-[#6e6761] uppercase tracking-wider flex justify-between items-center">
          <span>Tài nguyên căn cứ đội</span>
          <span className="font-mono text-[#9d242b]">Điểm: {myTeam.contributionScore}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-amber-800 font-medium">
                <Wheat className="w-3.5 h-3.5" /> Lương thực:
              </span>
              <strong className={`font-mono ${myTeam.resources.food < 40 ? 'text-red-600 font-bold' : 'text-[#171513]'}`}>
                {myTeam.resources.food} / 200
              </strong>
            </div>
            <div className="w-full bg-[#dfd6c6] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  myTeam.resources.food < 40 ? 'bg-red-500' : 'bg-amber-600'
                }`}
                style={{ width: `${Math.min(100, (myTeam.resources.food / 200) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-blue-800 font-medium">
                <Shield className="w-3.5 h-3.5" /> Lực lượng:
              </span>
              <strong className={`font-mono ${myTeam.resources.strength < 40 ? 'text-red-600 font-bold' : 'text-[#171513]'}`}>
                {myTeam.resources.strength} / 200
              </strong>
            </div>
            <div className="w-full bg-[#dfd6c6] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  myTeam.resources.strength < 40 ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, (myTeam.resources.strength / 200) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-red-800 font-medium">
                <Heart className="w-3.5 h-3.5" /> Lòng dân:
              </span>
              <strong className={`font-mono ${myTeam.resources.trust < 40 ? 'text-red-600 font-bold' : 'text-[#171513]'}`}>
                {myTeam.resources.trust} / 200
              </strong>
            </div>
            <div className="w-full bg-[#dfd6c6] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  myTeam.resources.trust < 40 ? 'bg-red-500' : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(100, (myTeam.resources.trust / 200) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-[10px] text-[#6e6761] pt-1 border-t border-[#dfd6c6]/60 flex justify-between">
          <span>Ngưỡng sinh tồn an toàn: <strong>≥ 40</strong></span>
          <span>Mục tiêu chung cuộc: <strong>≥ 50</strong></span>
        </div>
      </div>

      {/* LOBBY WAITING SCREEN */}
      {snapshot.phase === 'lobby' && (
        <div className="paper-card rounded-xl p-6 border border-[#dfd6c6] text-center space-y-3">
          <Clock className="w-8 h-8 mx-auto text-[#9d242b] animate-spin" />
          <h3 className="font-serif font-bold text-base text-[#171513]">
            Bạn Đang Ở Sảnh Chờ
          </h3>
          <p className="text-sm text-[#6e6761] leading-relaxed">
            Vui lòng chờ người dẫn mở lượt 1. Hãy bàn luận chiến lược với đồng đội trong nhóm của bạn!
          </p>
        </div>
      )}

      {/* PLAYING ROUND: SCENARIO & VOTING */}
      {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && snapshot.currentScenario && (
        <div className="space-y-4">
          <div className="paper-card rounded-xl p-4 border border-[#dfd6c6] space-y-2">
            <div className="flex justify-between items-center text-xs border-b pb-1.5">
              <span className="font-mono font-bold text-[#9d242b]">
                LƯỢT {snapshot.currentRound} / 4
              </span>
              <span className="font-mono font-bold text-[#9d242b] text-sm">
                {formatSeconds(timerRemaining ?? snapshot.roundTimeRemainingMs)}
              </span>
            </div>

            <h3 className="font-serif font-bold text-base text-[#171513]">
              {snapshot.currentScenario.title}
            </h3>
            <p className="text-xs text-[#3a3530] leading-relaxed">
              {snapshot.currentScenario.description}
            </p>
          </div>

          {/* Voting Options */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-[#171513] flex items-center justify-between">
              <span>Bỏ phiếu phương án cho đội (Đa số thắng):</span>
              {votedOption && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Đã bỏ phiếu
                </span>
              )}
            </div>

            {snapshot.currentScenario.options.map((opt, idx) => (
              <button
                type="button"
                disabled={!!votedOption}
                key={opt.id}
                onClick={() => !votedOption && handleVote(opt.id)}
                className={`w-full text-left paper-card rounded-xl p-3.5 border transition-all text-xs cursor-pointer ${
                  votedOption === opt.id
                    ? 'border-[#9d242b] bg-[#faebee] shadow-sm'
                    : 'border-[#dfd6c6] hover:border-[#9d242b] bg-white'
                } ${votedOption ? 'opacity-85 cursor-default' : ''}`}
              >
                <div className="flex items-center justify-between font-bold text-sm text-[#171513] mb-1">
                  <span>
                    {String.fromCharCode(65 + idx)}. {opt.label}
                    {idx === snapshot.currentScenario!.defaultOptionIndex && (
                      <span className="block text-[11px] text-[#9d242b] font-normal mt-0.5">
                        (Mặc định khi hòa / không có phiếu)
                      </span>
                    )}
                  </span>
                  {votedOption === opt.id && (
                    <span className="text-xs text-[#9d242b] font-semibold">Lựa chọn của bạn</span>
                  )}
                </div>

                <p className="text-[#3a3530] text-xs leading-relaxed mb-2">
                  {opt.tradeoffDescription}
                </p>

                <div className="text-[11px] font-mono text-[#6e6761] border-t pt-1 flex gap-3">
                  <span>Lương thực: <strong className="text-amber-800">{opt.effects.food ?? 0}</strong></span>
                  <span>Lực lượng: <strong className="text-blue-800">{opt.effects.strength ?? 0}</strong></span>
                  <span>Lòng dân: <strong className="text-red-800">{opt.effects.trust ?? 0}</strong></span>
                </div>
              </button>
            ))}
          </div>

          {/* Aid Trigger Button */}
          <button
            onClick={() => setShowAidModal(true)}
            className="w-full py-2.5 bg-white text-[#9d242b] border border-[#9d242b] rounded-lg text-xs font-semibold hover:bg-[#faebee] flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Viện trợ tài nguyên cho đội bạn (Tối đa 20)</span>
          </button>
        </div>
      )}

      {/* REVIEWING ROUND SCREEN */}
      {snapshot.phase === 'reviewing' && (
        <div className="paper-card rounded-xl p-5 border border-[#dfd6c6] text-center space-y-3">
          <CheckCircle className="w-8 h-8 mx-auto text-emerald-600" />
          <h3 className="font-serif font-bold text-base text-[#171513]">
            Đã Hoàn Tất Lượt {snapshot.currentRound}
          </h3>
          <p className="text-sm text-[#3a3530] leading-relaxed">
            Đang tổng hợp kết quả biểu quyết của toàn đội. Người dẫn sẽ mở lượt kế tiếp trong giây lát!
          </p>
        </div>
      )}

      {/* FINISHED SCREEN */}
      {snapshot.phase === 'finished' && (
        <div className="paper-card rounded-xl p-5 border border-[#dfd6c6] text-center space-y-3">
          <CheckCircle className="w-8 h-8 mx-auto text-emerald-600" />
          <h3 className="font-serif font-bold text-base text-[#171513]">
            Trò Chơi Kết Thúc
          </h3>
          <p className="text-sm text-[#3a3530] leading-relaxed">
            Quan sát màn hình chính của người dẫn phòng để theo dõi bảng điểm và tổng kết bài học lịch sử!
          </p>
        </div>
      )}

      {/* AID MODAL */}
      {showAidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#fdfbf7] border-2 border-[#9d242b] rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-serif font-bold text-base text-[#171513]">
              Viện Trợ Căn Cứ Đồng Đội
            </h3>
            <p className="text-xs text-[#6e6761] leading-relaxed">
              Mỗi lượt chỉ được viện trợ 1 lần cho một đội (tối đa 20 đơn vị từ ngân sách đội bạn).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Gửi tới đội:</label>
                <select
                  value={aidTeam}
                  onChange={(e) => setAidTeam(parseInt(e.target.value, 10))}
                  className="w-full p-2 border border-[#dfd6c6] rounded-lg bg-white text-xs"
                >
                  {snapshot.teams
                    .filter((t) => t.index !== selectedTeam)
                    .map((t) => (
                      <option key={t.index} value={t.index}>
                        {t.name} (Lương thực: {t.resources.food}, Lực lượng: {t.resources.strength}, Dân: {t.resources.trust})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Loại tài nguyên:</label>
                <select
                  value={aidResource}
                  onChange={(e) => setAidResource(e.target.value as keyof TeamResources)}
                  className="w-full p-2 border border-[#dfd6c6] rounded-lg bg-white text-xs"
                >
                  <option value="food">Lương thực (Kho hiện có: {myTeam.resources.food})</option>
                  <option value="strength">Lực lượng (Kho hiện có: {myTeam.resources.strength})</option>
                  <option value="trust">Lòng dân (Kho hiện có: {myTeam.resources.trust})</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Số lượng viện trợ (1 – 20):</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={aidAmount}
                  onChange={(e) => setAidAmount(parseInt(e.target.value, 10) || 5)}
                  className="w-full p-2 border border-[#dfd6c6] rounded-lg bg-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dfd6c6]">
              <button
                onClick={() => setShowAidModal(false)}
                className="px-3 py-1.5 text-xs text-[#6e6761] hover:bg-[#ede7dc] rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleSendAid}
                className="px-4 py-1.5 bg-[#9d242b] text-white text-xs font-semibold rounded-lg hover:bg-[#7a171d]"
              >
                Gửi Viện Trợ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
