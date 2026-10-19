import React, { useState, useEffect } from 'react';
import {
  useQuizSubscription,
  joinOnlineQuizRoom,
  submitOnlineQuizAnswer,
  voteOnlineQuizPoll,
  isQuizConvexAvailable,
} from '../quizConvex';
import { generateSecureToken } from '../socket';
import { QuizQuestionCard } from '../components/QuizQuestionCard';
import { QUIZ_CONSTANTS } from '../data/quizData';
import {
  Smartphone,
  Users,
  Trophy,
  Award,
  Vote,
  AlertCircle,
  LogIn,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const QuizPlayerView: React.FC = () => {
  const [roomCodeInput, setRoomCodeInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const code = p.get('room') || p.get('quiz');
      if (code) return code.toUpperCase();
      return localStorage.getItem('vnr202_player_room') || '';
    }
    return '';
  });

  const [nicknameInput, setNicknameInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vnr202_player_nickname') || '';
    }
    return '';
  });

  const [joinedRoomCode, setJoinedRoomCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vnr202_player_room');
    }
    return null;
  });

  const [playerToken, setPlayerToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      let t = localStorage.getItem('vnr202_player_token');
      if (!t || t.length !== 64) {
        try {
          t = generateSecureToken(32);
          localStorage.setItem('vnr202_player_token', t);
        } catch {
          t = null;
        }
      }
      return t;
    }
    return null;
  });

  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Active question choices
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [orderSelection, setOrderSelection] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Poll voting
  const [isVotingPoll, setIsVotingPoll] = useState<boolean>(false);

  // Subscribe to room
  const { data, loading, error: subError } = useQuizSubscription(
    joinedRoomCode,
    playerToken,
    false
  );

  // Reset answer selection when question changes
  useEffect(() => {
    if (!data?.currentQuestion) return;
    if (data.currentQuestion.type === 'order' && data.currentQuestion.orderItems) {
      // Scramble initially if order question
      const scrambled = [...data.currentQuestion.orderItems]
        .sort(() => 0.5 - Math.random())
        .map((it) => it.id);
      setOrderSelection(scrambled);
    } else {
      setOrderSelection([]);
    }
    setSelectedChoice(null);
    setIsSubmitting(false);
  }, [data?.currentQuestion?.id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    const cleanNick = nicknameInput.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setJoinError('Mã phòng phải gồm đúng 6 ký tự');
      return;
    }

    if (!cleanNick || cleanNick.length < 1 || cleanNick.length > QUIZ_CONSTANTS.MAX_NICKNAME_LENGTH) {
      setJoinError(`Biệt danh phải từ 1 đến ${QUIZ_CONSTANTS.MAX_NICKNAME_LENGTH} ký tự`);
      return;
    }

    let token = playerToken;
    if (!token || token.length !== 64) {
      token = generateSecureToken(32);
      setPlayerToken(token);
      localStorage.setItem('vnr202_player_token', token);
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await joinOnlineQuizRoom({
        roomCode: cleanCode,
        nickname: cleanNick,
        playerToken: token,
      });

      if (res.ok) {
        setJoinedRoomCode(cleanCode);
        localStorage.setItem('vnr202_player_room', cleanCode);
        localStorage.setItem('vnr202_player_nickname', cleanNick);
      } else {
        setJoinError(res.error || 'Không thể gia nhập phòng');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedRoomCode(null);
    localStorage.removeItem('vnr202_player_room');
  };

  const handleSubmitAnswer = async () => {
    if (!joinedRoomCode || !playerToken || !data?.currentQuestion || isSubmitting) return;
    if (typeof data?.epoch !== 'number') return;

    const answer =
      data.currentQuestion.type === 'order' ? orderSelection : selectedChoice;
    if (!answer) return;

    setIsSubmitting(true);
    try {
      const res = await submitOnlineQuizAnswer({
        roomCode: joinedRoomCode,
        epoch: data.epoch,
        playerToken,
        questionIndex: data.currentQuestion.id,
        answer,
      });
      if (!res.ok) {
        alert(res.error || 'Không thể nộp câu trả lời');
      }
    } catch (err: any) {
      alert('Lỗi nộp bài: ' + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVotePoll = async (optionIndex: number) => {
    if (!joinedRoomCode || !playerToken || !data?.poll || isVotingPoll) return;
    setIsVotingPoll(true);
    try {
      await voteOnlineQuizPoll({
        roomCode: joinedRoomCode,
        playerToken,
        pollId: data.poll.id,
        optionIndex,
      });
    } catch (err: any) {
      console.warn('Poll vote error:', err);
    } finally {
      setIsVotingPoll(false);
    }
  };

  // Check Convex deployment availability
  if (!isQuizConvexAvailable()) {
    return (
      <div className="max-w-md mx-auto p-6 bg-amber-50 border border-amber-300 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="font-bold text-amber-900">Chưa cấu hình máy chủ đám mây trực tuyến</h3>
        <p className="text-xs text-amber-800 leading-relaxed">
          Biến môi trường <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">VITE_CONVEX_URL</code> chưa được thiết lập.
          Bạn có thể chuyển sang thẻ <strong>Chơi thử ngay</strong> để trải nghiệm toàn bộ 10 câu hỏi độc lập mà không cần kết nối máy chủ.
        </p>
      </div>
    );
  }

  // ─── 1. JOIN SCREEN ───────────────────────────────────────────────────
  if (!joinedRoomCode) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <form
          onSubmit={handleJoin}
          className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-7 shadow-sm space-y-5"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-xl bg-[#9d242b] text-white flex items-center justify-center mx-auto shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-xl text-[#171513]">
              Tham gia Giải mã kháng chiến
            </h2>
            <p className="text-xs text-[#6e6761]">
              Nhập mã phòng 6 ký tự hoặc mở trực tiếp từ mã QR của chủ phòng.
            </p>
          </div>

          {joinError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#171513] uppercase tracking-wide mb-1.5">
                Mã phòng thi (6 ký tự):
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="VD: ABC123"
                maxLength={6}
                required
                className="w-full px-4 py-3 text-lg font-mono font-bold tracking-widest text-center bg-[#fdfcf9] border border-[#dfd6c6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9d242b] uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171513] uppercase tracking-wide mb-1.5">
                Biệt danh của bạn (hiển thị trên bảng điểm):
              </label>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="VD: Minh Hoàng, Hồng Ánh..."
                maxLength={QUIZ_CONSTANTS.MAX_NICKNAME_LENGTH}
                required
                className="w-full px-4 py-3 text-sm bg-[#fdfcf9] border border-[#dfd6c6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9d242b]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-3.5 rounded-full bg-[#9d242b] text-white font-bold text-sm hover:bg-[#7a171d] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isJoining ? 'Đang gia nhập phòng...' : 'Vào phòng thi đấu'}</span>
          </button>
        </form>
      </div>
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-xs text-[#6e6761] space-y-2">
        <div className="w-6 h-6 border-2 border-[#9d242b] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Đang đồng bộ dữ liệu phòng thi đấu...</p>
      </div>
    );
  }

  if (subError || !data) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white border border-[#dfd6c6] rounded-2xl text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <p className="text-xs text-rose-800">{subError || 'Không thể tải phòng thi đấu'}</p>
        <button
          onClick={handleLeaveRoom}
          className="px-5 py-2 text-xs bg-[#ede7dc] rounded-full hover:bg-[#dfd6c6] font-semibold"
        >
          Trở về trang nhập mã
        </button>
      </div>
    );
  }

  const { room, currentQuestion, revealData, myState, leaderboard, poll } = data;

  // ─── 2. LOBBY SCREEN (WAITING FOR HOST) ────────────────────────────────
  if (room.phase === 'lobby') {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <div className="bg-white border border-[#dfd6c6] rounded-2xl p-6 text-center space-y-5 shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-[#9d242b] tracking-wider">
              Phòng chờ thi đấu
            </span>
            <div className="font-mono font-bold text-3xl tracking-widest text-[#171513]">
              {room.code}
            </div>
            <p className="text-xs text-[#6e6761]">
              Xin chào <strong>{nicknameInput}</strong>, bạn đã vào phòng an toàn!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#e8f0ec] border border-[#193b32]/20 flex items-center justify-between text-xs text-[#193b32]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#193b32]" />
              <span>Sĩ số đã tham gia:</span>
            </div>
            <span className="font-mono font-bold text-base">
              {room.totalJoined} {room.classSize ? `/ ${room.classSize}` : 'người'}
            </span>
          </div>

          <div className="p-3 bg-[#fdfcf9] rounded-xl border border-[#dfd6c6] text-xs text-[#6e6761] leading-relaxed">
            Vui lòng nhìn lên màn chiếu của chủ phòng. Trò chơi sẽ tự động bắt đầu ngay khi chủ phòng bấm lệnh xuất phát.
          </div>

          {/* Embedded Lesson Poll (Active or results of closed poll) */}
          {poll && (
            <div className="p-4 rounded-xl border-2 border-[#c99738] bg-[#fdfcf9] text-left space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#c99738]">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4" />
                  <span>
                    {poll.active ? 'Khảo sát ý kiến lớp học (Bắt đầu sớm):' : 'Kết quả khảo sát lớp học (Đã đóng):'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#6e6761]">
                  {poll.totalVotes} phản hồi
                </span>
              </div>
              <p className="text-xs font-semibold text-[#171513]">{poll.question}</p>
              <div className="space-y-1.5">
                {poll.options.map((opt, oIdx) => {
                  const isVoted = poll.userVoteIndex === oIdx;
                  const count = poll.voteCounts[oIdx] || 0;
                  const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleVotePoll(oIdx)}
                      disabled={isVotingPoll || !poll.active}
                      className={`w-full p-2.5 rounded-lg text-xs text-left font-medium border transition-all flex items-center justify-between ${
                        isVoted
                          ? 'bg-[#193b32] text-white border-[#193b32]'
                          : 'bg-white text-[#171513] border-[#dfd6c6] hover:bg-[#ede7dc]'
                      } ${!poll.active ? 'cursor-default' : ''}`}
                    >
                      <span>{opt}</span>
                      <div className="flex items-center gap-2">
                        {!poll.active && (
                          <span className="text-[11px] font-mono font-semibold opacity-80">
                            {count} ({pct}%)
                          </span>
                        )}
                        {isVoted && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleLeaveRoom}
              className="text-xs text-gray-500 hover:text-rose-600 transition-colors"
            >
              Rời khỏi phòng này
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 3. FINISHED SCREEN ───────────────────────────────────────────────
  if (room.phase === 'finished') {
    const myRank = myState?.myRank || 1;
    const myScore = myState?.myScore || 0;

    return (
      <div className="max-w-md mx-auto space-y-5">
        <div className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-7 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#193b32] text-white flex items-center justify-center mx-auto shadow-sm">
            <Trophy className="w-7 h-7 text-[#c99738]" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-[#193b32] tracking-wider">
              Cuộc thi kết thúc
            </span>
            <h2 className="font-serif font-bold text-xl text-[#171513]">
              Bảng điểm cá nhân của bạn
            </h2>
            <p className="text-xs text-[#6e6761]">{nicknameInput}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#faebee] border border-[#9d242b]/20 text-center">
              <span className="text-[10px] font-bold uppercase text-[#9d242b]">Thứ hạng</span>
              <div className="font-mono font-bold text-3xl text-[#9d242b] mt-1">
                #{myRank}
              </div>
              <span className="text-[10px] text-[#6e6761]">Trên {leaderboard.length} người</span>
            </div>

            <div className="p-4 rounded-xl bg-[#e8f0ec] border border-[#193b32]/20 text-center">
              <span className="text-[10px] font-bold uppercase text-[#193b32]">Tổng điểm</span>
              <div className="font-mono font-bold text-3xl text-[#193b32] mt-1">
                {myScore.toLocaleString('vi-VN')}
              </div>
              <span className="text-[10px] text-[#6e6761]">Điểm cá nhân</span>
            </div>
          </div>

          {/* Top 5 Leaderboard Preview */}
          <div className="space-y-2 text-left">
            <div className="text-xs font-bold text-[#171513] uppercase">Top đầu lớp học:</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {leaderboard.slice(0, 5).map((l, idx) => (
                <div
                  key={l.id}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                    l.nickname === nicknameInput
                      ? 'bg-amber-50 border-amber-300 font-bold'
                      : 'bg-[#fdfcf9] border-[#dfd6c6]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#9d242b] w-5">#{idx + 1}</span>
                    <span className="truncate">{l.nickname}</span>
                  </div>
                  <span className="font-mono font-semibold">{l.totalScore.toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="w-full py-2.5 rounded-full bg-[#ede7dc] text-[#171513] text-xs font-bold hover:bg-[#dfd6c6]"
          >
            Thoát phòng thi
          </button>
        </div>
      </div>
    );
  }

  // ─── 4. CLOSED ROOM ───────────────────────────────────────────────────
  if (room.phase === 'closed') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white border border-[#dfd6c6] rounded-2xl text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-[#6e6761] mx-auto" />
        <h3 className="font-bold text-sm text-[#171513]">Phòng thi đã được chủ phòng đóng</h3>
        <p className="text-xs text-[#6e6761]">Cảm ơn bạn đã tham gia thử thách!</p>
        <button
          onClick={handleLeaveRoom}
          className="px-5 py-2 text-xs bg-[#9d242b] text-white rounded-full font-semibold"
        >
          Trở về trang chính
        </button>
      </div>
    );
  }

  // ─── 5. QUESTION / REVEAL SCREEN ──────────────────────────────────────
  if (!currentQuestion) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Player Personal Stat Ribbon */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-xl border border-[#dfd6c6] text-xs">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#c99738]" />
          <span className="text-[#6e6761]">Điểm của bạn:</span>
          <span className="font-mono font-bold text-sm text-[#9d242b]">
            {(myState?.myScore || 0).toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#193b32]" />
          <span className="text-[#6e6761]">Hạng:</span>
          <span className="font-mono font-bold text-sm text-[#193b32]">
            #{myState?.myRank || 1}
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <QuizQuestionCard
        question={currentQuestion}
        selectedChoice={selectedChoice}
        orderSelection={orderSelection}
        onSelectChoice={(id) => setSelectedChoice(id)}
        onChangeOrder={(newOrder) => setOrderSelection(newOrder)}
        onSubmitAnswer={handleSubmitAnswer}
        hasSubmitted={Boolean(myState?.hasAnsweredCurrent)}
        isRevealed={room.phase === 'revealing'}
        revealData={revealData}
        timeRemainingMs={room.questionTimeRemainingMs}
        totalTimeMs={QUIZ_CONSTANTS.QUESTION_DURATION_MS}
        revealTimeRemainingMs={room.revealTimeRemainingMs}
        totalRevealTimeMs={QUIZ_CONSTANTS.REVEAL_DURATION_MS}
        myPointsAwarded={myState?.myPointsAwarded}
      />
    </div>
  );
};
