import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  useQuizSubscription,
  createOnlineQuizRoom,
  startOnlineQuiz,
  advanceOnlineQuiz,
  replayOnlineQuiz,
  closeOnlineQuizRoom,
  isQuizConvexAvailable,
} from '../quizConvex';
import { generateSecureToken, getDefaultJoinBaseUrl, buildRoomJoinUrl } from '../socket';
import { QuizQuestionCard } from '../components/QuizQuestionCard';
import { QUIZ_CONSTANTS } from '../data/quizData';
import {
  Monitor,
  Users,
  Play,
  RotateCcw,
  XSquare,
  Trophy,
  ArrowRight,
  Clock,
  AlertCircle,
  ExternalLink,
  Medal,
  Vote,
} from 'lucide-react';

export const QuizHostView: React.FC = () => {
  const [hostToken, setHostToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      let t = localStorage.getItem('vnr202_quiz_host_token');
      if (!t || t.length !== 64) {
        try {
          t = generateSecureToken(32);
          localStorage.setItem('vnr202_quiz_host_token', t);
        } catch {
          t = null;
        }
      }
      return t;
    }
    return null;
  });

  const [roomCode, setRoomCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vnr202_quiz_host_room');
    }
    return null;
  });

  const [classSizeInput, setClassSizeInput] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const { data, loading, error: subError } = useQuizSubscription(roomCode, hostToken, true);

  // Generate QR code when roomCode is created
  useEffect(() => {
    if (!roomCode) return;
    const joinUrl = buildRoomJoinUrl(getDefaultJoinBaseUrl(), roomCode);
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#9d242b', light: '#f6f3ed' },
    })
      .then(setQrDataUrl)
      .catch((e) => console.warn('QR gen error:', e));
  }, [roomCode]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    let token = hostToken;
    if (!token || token.length !== 64) {
      token = generateSecureToken(32);
      setHostToken(token);
      localStorage.setItem('vnr202_quiz_host_token', token);
    }

    const classSize = classSizeInput ? parseInt(classSizeInput, 10) : null;
    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await createOnlineQuizRoom({
        hostToken: token,
        classSize: classSize && classSize > 0 ? classSize : null,
      });

      if (res.ok && res.roomCode) {
        setRoomCode(res.roomCode);
        localStorage.setItem('vnr202_quiz_host_room', res.roomCode);
      } else {
        setCreateError(res.error || 'Không thể tạo phòng thi');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomCode || !hostToken) return;
    try {
      const res = await startOnlineQuiz({ roomCode, hostToken });
      if (!res.ok) alert(res.error || 'Không thể bắt đầu cuộc thi');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || String(err)));
    }
  };

  const handleAdvance = async () => {
    if (!roomCode || !hostToken) return;
    try {
      await advanceOnlineQuiz({ roomCode, hostToken });
    } catch (err: any) {
      console.warn('Advance error:', err);
    }
  };

  const handleReplay = async () => {
    if (!roomCode || !hostToken) return;
    try {
      await replayOnlineQuiz({ roomCode, hostToken });
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || String(err)));
    }
  };

  const handleClose = async () => {
    if (!roomCode || !hostToken) return;
    if (!confirm('Bạn có chắc muốn đóng phòng thi này không?')) return;
    try {
      await closeOnlineQuizRoom({ roomCode, hostToken });
      setRoomCode(null);
      localStorage.removeItem('vnr202_quiz_host_room');
    } catch (err: any) {
      alert('Lỗi đóng phòng: ' + (err.message || String(err)));
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
          Chức năng tạo phòng trực tuyến yêu cầu backend Convex. Bạn có thể sử dụng chế độ <strong>Chơi thử ngay</strong>.
        </p>
      </div>
    );
  }

  // ─── 1. CREATE ROOM FORM ──────────────────────────────────────────────
  if (!roomCode || (data && data.room.phase === 'closed')) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <form
          onSubmit={handleCreateRoom}
          className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-7 shadow-sm space-y-5"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-xl bg-[#193b32] text-white flex items-center justify-center mx-auto shadow-sm">
              <Monitor className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-xl text-[#171513]">
              Khởi tạo phòng thi trực tuyến
            </h2>
            <p className="text-xs text-[#6e6761]">
              Dành cho giáo viên / nhóm thuyết trình điều phối toàn lớp học (tối đa 200 người).
            </p>
          </div>

          {createError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#171513] uppercase tracking-wide mb-1.5">
              Sĩ số lớp dự kiến (tùy chọn):
            </label>
            <input
              type="number"
              value={classSizeInput}
              onChange={(e) => setClassSizeInput(e.target.value)}
              placeholder="Để trống hoặc nhập từ 10–200"
              min={5}
              max={200}
              className="w-full px-4 py-2.5 text-sm bg-[#fdfcf9] border border-[#dfd6c6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#193b32]"
            />
            <p className="text-[11px] text-[#6e6761] mt-1">
              Hệ thống tự động ghi nhận số người vào phòng thực tế.
            </p>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3.5 rounded-full bg-[#193b32] text-white font-bold text-sm hover:bg-[#0e201b] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Monitor className="w-4 h-4" />
            <span>{isCreating ? 'Đang tạo phòng thi...' : 'Tạo phòng thi trực tuyến'}</span>
          </button>
        </form>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-xs text-[#6e6761] space-y-2">
        <div className="w-6 h-6 border-2 border-[#193b32] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Đang kết nối phòng chủ tọa...</p>
      </div>
    );
  }

  if (subError || !data) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white border border-[#dfd6c6] rounded-2xl text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <p className="text-xs text-rose-800">{subError || 'Không thể tải phòng thi đấu'}</p>
        <button
          onClick={() => {
            setRoomCode(null);
            localStorage.removeItem('vnr202_quiz_host_room');
          }}
          className="px-5 py-2 text-xs bg-[#ede7dc] rounded-full hover:bg-[#dfd6c6] font-semibold"
        >
          Tạo phòng mới
        </button>
      </div>
    );
  }

  const { room, currentQuestion, revealData, leaderboard, poll } = data;
  const joinUrl = buildRoomJoinUrl(getDefaultJoinBaseUrl(), room.code);

  // ─── 2. SẢNH CHỜ CHO MÀN CHIẾU (LOBBY SCREEN) ─────────────────────────
  if (room.phase === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left: Big QR Code */}
          <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3 bg-[#fdfcf9] border border-[#dfd6c6] p-5 rounded-2xl">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Mã QR phòng ${room.code}`}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl shadow-sm border border-[#dfd6c6]"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-100 rounded-xl animate-pulse" />
            )}
            <div className="text-center">
              <span className="text-[11px] font-semibold text-[#6e6761]">
                Quét mã QR bằng điện thoại để tham gia
              </span>
            </div>
          </div>

          {/* Right: Room Code & Controls */}
          <div className="md:col-span-7 space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase text-[#9d242b] tracking-wider">
                Mã phòng thi trắc nghiệm (Dành cho cả lớp)
              </span>
              <div className="font-mono font-bold text-4xl sm:text-6xl tracking-widest text-[#171513]">
                {room.code}
              </div>
              <div className="text-xs text-[#6e6761] pt-1 flex items-center gap-1.5">
                <span>Hoặc mở liên kết: </span>
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9d242b] hover:underline font-mono inline-flex items-center gap-1 font-semibold"
                >
                  <span className="truncate max-w-[200px]">{joinUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>

            {/* Attendance stat */}
            <div className="p-4 rounded-xl bg-[#e8f0ec] border border-[#193b32]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#193b32]" />
                <span className="text-xs sm:text-sm font-semibold text-[#193b32]">
                  Số người đã vào phòng:
                </span>
              </div>
              <span className="font-mono font-bold text-xl sm:text-2xl text-[#193b32]">
                {room.totalJoined} {room.classSize ? `/ ${room.classSize}` : ''}
              </span>
            </div>

            {/* List of joined participants */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#171513] uppercase tracking-wide">
                Danh sách người chơi ({leaderboard.length}):
              </div>
              <div className="p-3 bg-[#fdfcf9] rounded-xl border border-[#dfd6c6] max-h-36 overflow-y-auto flex flex-wrap gap-2 text-xs">
                {leaderboard.length === 0 ? (
                  <span className="text-gray-400 italic">Đang chờ người chơi quét mã...</span>
                ) : (
                  leaderboard.map((l) => (
                    <span
                      key={l.id}
                      className="px-2.5 py-1 rounded-full bg-white border border-[#dfd6c6] text-[#171513] font-medium"
                    >
                      {l.nickname}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Embedded Lesson Poll (Active or results of closed poll) */}
            {poll && (
              <div className="p-4 rounded-xl border border-[#c99738] bg-[#fdfcf9] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#c99738] font-bold">
                  <div className="flex items-center gap-1.5">
                    <Vote className="w-4 h-4" />
                    <span>{poll.active ? 'Khảo sát lớp đang diễn ra:' : 'Kết quả khảo sát lớp (Đã kết thúc):'}</span>
                  </div>
                  <span className="font-mono text-[#6e6761]">{poll.totalVotes} lượt phản hồi</span>
                </div>
                <div className="font-semibold text-[#171513]">{poll.question}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {poll.options.map((opt, i) => {
                    const count = poll.voteCounts[i] || 0;
                    const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                    return (
                      <div key={i} className="p-2 rounded-lg bg-white border border-[#dfd6c6] space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-[#171513]">
                          <span className="truncate">{opt}</span>
                          <span className="font-mono font-bold text-[#193b32] ml-2">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-[#ede7dc] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#193b32] h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Host Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleStartGame}
                disabled={leaderboard.length === 0}
                className="flex-1 px-8 py-3.5 rounded-full bg-[#9d242b] text-white font-bold text-sm sm:text-base hover:bg-[#7a171d] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Bắt đầu cuộc thi ({QUIZ_CONSTANTS.TOTAL_QUESTIONS} câu)</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-3.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                title="Đóng phòng thi"
              >
                <XSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 3. FINISHED SCREEN CHO MÀN CHIẾU (GRAND PODIUM) ───────────────────
  if (room.phase === 'finished') {
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono font-bold uppercase text-[#9d242b] tracking-wider">
              Tổng kết bảng vàng
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-4xl text-[#171513]">
              Vinh danh người chơi xuất sắc nhất!
            </h2>
            <p className="text-xs text-[#6e6761]">
              Hoàn thành 10 câu hỏi lịch sử Đường lối kháng chiến toàn quốc (1946–1950)
            </p>
          </div>

          {/* Top 3 Grand Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 items-end">
              {/* Silver: Rank 2 */}
              {top3[1] && (
                <div className="order-2 sm:order-1 p-5 rounded-2xl bg-[#f0f4f8] border-2 border-slate-300 text-center space-y-2 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-400 text-white flex items-center justify-center mx-auto font-bold text-lg shadow-inner">
                    🥈
                  </div>
                  <div className="font-bold text-base text-[#171513] truncate">
                    {top3[1].nickname}
                  </div>
                  <div className="font-mono font-bold text-xl text-[#193b32]">
                    {top3[1].totalScore.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[11px] text-[#6e6761]">
                    Đúng: {top3[1].correctCount} / 10 câu
                  </div>
                </div>
              )}

              {/* Gold: Rank 1 */}
              {top3[0] && (
                <div className="order-1 sm:order-2 p-6 rounded-2xl bg-amber-50 border-2 border-[#c99738] text-center space-y-2 shadow-md sm:-translate-y-2">
                  <div className="w-16 h-16 rounded-full bg-[#c99738] text-white flex items-center justify-center mx-auto font-bold text-2xl shadow-inner">
                    🥇
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#c99738] px-2.5 py-0.5 rounded-full bg-amber-100">
                    Quán quân
                  </span>
                  <div className="font-bold text-lg sm:text-xl text-[#171513] truncate">
                    {top3[0].nickname}
                  </div>
                  <div className="font-mono font-bold text-2xl sm:text-3xl text-[#9d242b]">
                    {top3[0].totalScore.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#6e6761]">
                    Đúng: {top3[0].correctCount} / 10 câu
                  </div>
                </div>
              )}

              {/* Bronze: Rank 3 */}
              {top3[2] && (
                <div className="order-3 sm:order-3 p-5 rounded-2xl bg-[#faf3ea] border-2 border-amber-600/40 text-center space-y-2 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-amber-700 text-white flex items-center justify-center mx-auto font-bold text-lg shadow-inner">
                    🥉
                  </div>
                  <div className="font-bold text-base text-[#171513] truncate">
                    {top3[2].nickname}
                  </div>
                  <div className="font-mono font-bold text-xl text-[#193b32]">
                    {top3[2].totalScore.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[11px] text-[#6e6761]">
                    Đúng: {top3[2].correctCount} / 10 câu
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Table */}
          {rest.length > 0 && (
            <div className="space-y-2 pt-2 text-left">
              <h3 className="font-bold text-xs uppercase text-[#171513]">
                Các thứ hạng tiếp theo:
              </h3>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {rest.map((r, idx) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-lg border border-[#dfd6c6] bg-[#fdfcf9] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-500 w-6">#{idx + 4}</span>
                      <span className="font-medium text-[#171513]">{r.nickname}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{r.correctCount}/10 đúng</span>
                      <span className="font-mono font-bold text-[#193b32]">
                        {r.totalScore.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replay / Close Action */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[#dfd6c6]">
            <button
              type="button"
              onClick={handleReplay}
              className="px-8 py-3 rounded-full bg-[#193b32] text-white font-bold text-sm hover:bg-[#0e201b] shadow-sm transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại trận mới (Giữ nguyên sảnh)</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 rounded-full bg-[#ede7dc] text-[#171513] font-semibold text-sm hover:bg-[#dfd6c6] transition-all"
            >
              Đóng phòng thi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 4. QUESTION & REVEAL SCREEN CHO MÀN CHIẾU ────────────────────────
  if (!currentQuestion) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Host Monitor Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-xl border border-[#dfd6c6] shadow-sm text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-[#9d242b] text-sm">
            PHÒNG: {room.code}
          </span>
          <span className="text-[#6e6761]">
            Đã nộp: <strong className="text-emerald-700 text-sm font-mono">{room.answeredCount}</strong> /{' '}
            <strong className="text-sm font-mono">{room.connectedCount}</strong> người trực tuyến
          </span>
        </div>

        {/* Advance Question Button for Host */}
        <div className="flex items-center gap-2">
          {room.phase === 'revealing' && (
            <button
              type="button"
              onClick={handleAdvance}
              className="px-4 py-1.5 bg-[#9d242b] text-white rounded-lg text-xs font-bold hover:bg-[#7a171d] shadow-sm transition-all flex items-center gap-1 active:scale-95"
            >
              <span>{room.currentQuestionIndex >= 10 ? 'Xem bảng vàng' : 'Câu tiếp theo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
            title="Đóng phòng"
          >
            <XSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Question Card on Projector */}
      <QuizQuestionCard
        question={currentQuestion}
        selectedChoice={null}
        orderSelection={
          currentQuestion.orderItems ? currentQuestion.orderItems.map((i) => i.id) : []
        }
        onSelectChoice={() => {}}
        onChangeOrder={() => {}}
        hasSubmitted={false}
        isRevealed={room.phase === 'revealing'}
        revealData={revealData}
        timeRemainingMs={room.questionTimeRemainingMs}
        totalTimeMs={QUIZ_CONSTANTS.QUESTION_DURATION_MS}
        revealTimeRemainingMs={room.revealTimeRemainingMs}
        totalRevealTimeMs={QUIZ_CONSTANTS.REVEAL_DURATION_MS}
        isHostView={true}
      />

      {/* Live Top 5 Leaderboard Preview during Question / Reveal */}
      <div className="bg-white border border-[#dfd6c6] rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs border-b border-[#dfd6c6]/80 pb-2">
          <div className="font-bold uppercase text-[#171513] flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#c99738]" />
            <span>Bảng xếp hạng trực tiếp (Top 5):</span>
          </div>
          <span className="text-[#6e6761]">{leaderboard.length} người thi đấu</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
          {leaderboard.slice(0, 5).map((l, idx) => (
            <div
              key={l.id}
              className="p-2 rounded-lg bg-[#fdfcf9] border border-[#dfd6c6] text-center space-y-0.5"
            >
              <div className="font-mono font-bold text-xs text-[#9d242b]">#{idx + 1}</div>
              <div className="font-semibold text-xs text-[#171513] truncate">{l.nickname}</div>
              <div className="font-mono text-xs text-[#193b32]">{l.totalScore.toLocaleString('vi-VN')} đ</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
