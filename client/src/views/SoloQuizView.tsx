import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestionCard } from '../components/QuizQuestionCard';
import {
  QUIZ_QUESTIONS,
  QUIZ_CONSTANTS,
  calculateQuestionScore,
  evaluateAnswer,
  sanitizeQuestionForClient,
  extractRevealData,
  ClientQuizQuestion,
  QuizRevealData,
} from '../data/quizData';
import { Play, RotateCcw, Award, CheckCircle2, Trophy, Clock, ArrowRight } from 'lucide-react';

interface SoloHistoryItem {
  questionId: number;
  prompt: string;
  isCorrect: boolean;
  points: number;
  timeSpentMs: number;
}

export const SoloQuizView: React.FC = () => {
  const [phase, setPhase] = useState<'intro' | 'question' | 'revealing' | 'finished'>('intro');
  const [currentQIndex, setCurrentQIndex] = useState<number>(1);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  // Active question state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [orderSelection, setOrderSelection] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [myPointsAwarded, setMyPointsAwarded] = useState<number>(0);

  // Timers
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(QUIZ_CONSTANTS.QUESTION_DURATION_MS);
  const [revealRemainingMs, setRevealRemainingMs] = useState<number>(QUIZ_CONSTANTS.REVEAL_DURATION_MS);
  const [history, setHistory] = useState<SoloHistoryItem[]>([]);

  // Refs for timer management
  const questionTimerRef = useRef<any>(null);
  const revealTimerRef = useRef<any>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Current question and reveal data
  const rawQuestion = QUIZ_QUESTIONS[currentQIndex - 1];
  const clientQuestion: ClientQuizQuestion | null = rawQuestion
    ? sanitizeQuestionForClient(rawQuestion)
    : null;
  const revealData: QuizRevealData | null =
    phase === 'revealing' || phase === 'finished' && rawQuestion
      ? extractRevealData(rawQuestion)
      : null;

  // Initialize order selection whenever question changes
  useEffect(() => {
    if (rawQuestion && rawQuestion.type === 'order' && rawQuestion.orderItems) {
      // Scramble order initially
      const scrambled = [...rawQuestion.orderItems]
        .sort(() => 0.5 - Math.random())
        .map((it) => it.id);
      setOrderSelection(scrambled);
    } else {
      setOrderSelection([]);
    }
    setSelectedChoice(null);
    setHasSubmitted(false);
    setMyPointsAwarded(0);
    setTimeRemainingMs(QUIZ_CONSTANTS.QUESTION_DURATION_MS);
    setRevealRemainingMs(QUIZ_CONSTANTS.REVEAL_DURATION_MS);
    questionStartTimeRef.current = Date.now();
  }, [currentQIndex, rawQuestion]);

  // 25s Question Countdown Timer
  useEffect(() => {
    if (phase !== 'question' || hasSubmitted) return;

    const interval = 100; // 100ms precision
    questionTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartTimeRef.current;
      const rem = Math.max(0, QUIZ_CONSTANTS.QUESTION_DURATION_MS - elapsed);
      setTimeRemainingMs(rem);

      if (rem <= 0) {
        clearInterval(questionTimerRef.current);
        // Auto submit with current answer (or no answer)
        handleAutoTimeoutSubmit();
      }
    }, interval);

    return () => clearInterval(questionTimerRef.current);
  }, [phase, hasSubmitted, currentQIndex]);

  // 8s Reveal Countdown Timer
  useEffect(() => {
    if (phase !== 'revealing') return;

    const startTime = Date.now();
    revealTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(0, QUIZ_CONSTANTS.REVEAL_DURATION_MS - elapsed);
      setRevealRemainingMs(rem);

      if (rem <= 0) {
        clearInterval(revealTimerRef.current);
        handleAdvanceToNext();
      }
    }, 100);

    return () => clearInterval(revealTimerRef.current);
  }, [phase, currentQIndex]);

  const handleStartSolo = () => {
    setPhase('question');
    setCurrentQIndex(1);
    setTotalScore(0);
    setCorrectCount(0);
    setHistory([]);
  };

  const handleSubmitAnswer = () => {
    if (hasSubmitted || phase !== 'question' || !rawQuestion) return;

    clearInterval(questionTimerRef.current);
    const timeSpentMs = Math.max(0, Date.now() - questionStartTimeRef.current);
    const remMs = Math.max(0, QUIZ_CONSTANTS.QUESTION_DURATION_MS - timeSpentMs);

    const answer = rawQuestion.type === 'order' ? orderSelection : selectedChoice;
    const isCorrect = evaluateAnswer(rawQuestion, answer);
    const scoreResult = calculateQuestionScore(isCorrect, remMs);

    setHasSubmitted(true);
    setMyPointsAwarded(scoreResult.points);
    setTotalScore((prev) => prev + scoreResult.points);
    if (isCorrect) setCorrectCount((prev) => prev + 1);

    setHistory((prev) => [
      ...prev,
      {
        questionId: rawQuestion.id,
        prompt: rawQuestion.prompt,
        isCorrect,
        points: scoreResult.points,
        timeSpentMs,
      },
    ]);

    setPhase('revealing');
  };

  const handleAutoTimeoutSubmit = () => {
    if (hasSubmitted || !rawQuestion) return;

    const answer = rawQuestion.type === 'order' ? orderSelection : selectedChoice;
    const isCorrect = evaluateAnswer(rawQuestion, answer);
    // At timeout, remaining time is 0: score is 1000 if correct, 0 if wrong
    const scoreResult = calculateQuestionScore(isCorrect, 0);

    setHasSubmitted(true);
    setMyPointsAwarded(scoreResult.points);
    setTotalScore((prev) => prev + scoreResult.points);
    if (isCorrect) setCorrectCount((prev) => prev + 1);

    setHistory((prev) => [
      ...prev,
      {
        questionId: rawQuestion.id,
        prompt: rawQuestion.prompt,
        isCorrect,
        points: scoreResult.points,
        timeSpentMs: QUIZ_CONSTANTS.QUESTION_DURATION_MS,
      },
    ]);

    setPhase('revealing');
  };

  const handleAdvanceToNext = () => {
    clearInterval(revealTimerRef.current);
    if (currentQIndex >= QUIZ_CONSTANTS.TOTAL_QUESTIONS) {
      setPhase('finished');
    } else {
      setCurrentQIndex((prev) => prev + 1);
      setPhase('question');
    }
  };

  // ─── 1. INTRO SCREEN ──────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#9d242b] text-white flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase text-[#9d242b] tracking-wider px-3 py-1 rounded-full bg-[#faebee] border border-[#9d242b]/20">
              Chế Độ Chơi Thử Ngay • Không Cần Phòng
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#171513]">
              Giải mã kháng chiến
            </h2>
            <p className="text-xs sm:text-sm text-[#6e6761] max-w-lg mx-auto leading-relaxed">
              Thử thách 10 câu hỏi độc lập về lịch sử Đường lối kháng chiến toàn quốc (1946–1950).
              Hoạt động tức thì trên trình duyệt, không cần kết nối máy chủ hay tạo phòng.
            </p>
          </div>

          {/* Quick Rules */}
          <div className="bg-[#fdfcf9] border border-[#dfd6c6] rounded-xl p-4 text-left text-xs sm:text-sm space-y-2 text-[#3a3530]">
            <div className="font-bold text-[#193b32] pb-1 border-b border-[#dfd6c6]">
              Quy tắc tính điểm chuẩn xác:
            </div>
            <div>• <strong>10 câu hỏi:</strong> Gồm 5 câu trắc nghiệm phản xạ và 5 câu đuổi hình bắt chữ kèm ảnh tư liệu lịch sử thật.</div>
            <div>• <strong>Thời gian:</strong> 60 giây mỗi vòng thi đấu.</div>
            <div>• <strong>Cách tính điểm:</strong> Tính theo mili-giây còn lại: floor(thời gian còn lại / 10), tối đa ~6.000 điểm/câu.</div>
            <div>• <strong>Không phạt:</strong> Trả lời sai nhận 0 điểm, câu đuổi hình bắt chữ được gõ thử lại nhiều lần đến khi hết giờ.</div>
          </div>

          <button
            type="button"
            onClick={handleStartSolo}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#9d242b] text-white font-bold text-sm sm:text-base hover:bg-[#7a171d] shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Bắt đầu thi thử ngay (10 câu)</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── 2. FINISHED SCREEN ───────────────────────────────────────────────
  if (phase === 'finished') {
    const maxPossible = QUIZ_CONSTANTS.TOTAL_QUESTIONS * QUIZ_CONSTANTS.MAX_SCORE;
    const scorePercent = Math.round((totalScore / maxPossible) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border border-[#dfd6c6] rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#193b32] text-white flex items-center justify-center mx-auto shadow-md">
            <Award className="w-8 h-8 text-[#c99738]" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-mono font-bold uppercase text-[#193b32] tracking-wider">
              Kết Quả Cá Nhân Hoàn Tất
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#171513]">
              Chúc mừng bạn đã hoàn thành bài thi!
            </h2>
            <p className="text-xs text-[#6e6761]">
              Học phần Lịch sử ĐCSVN • Đường lối kháng chiến toàn quốc (1946–1950)
            </p>
          </div>

          {/* Big Score Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-[#faebee] border border-[#9d242b]/20 text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9d242b]">
                Tổng điểm đạt được
              </span>
              <div className="font-mono font-bold text-2xl sm:text-4xl text-[#9d242b]">
                {totalScore.toLocaleString('vi-VN')}
              </div>
              <span className="text-[10px] text-[#6e6761]">
                Tối đa {maxPossible.toLocaleString('vi-VN')} điểm ({scorePercent}%)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#e8f0ec] border border-[#193b32]/20 text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#193b32]">
                Số câu trả lời đúng
              </span>
              <div className="font-mono font-bold text-2xl sm:text-4xl text-[#193b32]">
                {correctCount} / 10
              </div>
              <span className="text-[10px] text-[#6e6761]">
                Tỉ lệ chính xác {correctCount * 10}%
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-2 text-left">
            <h3 className="font-bold text-xs uppercase tracking-wide text-[#171513]">
              Chi tiết từng câu hỏi:
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-[#dfd6c6] bg-[#fdfcf9] flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold font-mono text-[#9d242b] w-6 flex-shrink-0">
                      #{h.questionId}
                    </span>
                    <span className="truncate text-[#171513]">{h.prompt}</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span
                      className={`font-semibold font-mono text-xs ${
                        h.isCorrect ? 'text-emerald-700' : 'text-gray-400'
                      }`}
                    >
                      {h.points > 0 ? `+${h.points}` : '0'} đ
                    </span>
                    {h.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[10px]">
                        ✕
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStartSolo}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#9d242b] text-white font-bold text-xs sm:text-sm hover:bg-[#7a171d] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại từ đầu (Luyện tập)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 3. QUESTION & REVEAL SCREEN ──────────────────────────────────────
  if (!clientQuestion) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top Score Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-[#dfd6c6] text-xs">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#c99738]" />
          <span className="text-[#6e6761]">Điểm số hiện tại:</span>
          <span className="font-mono font-bold text-sm text-[#9d242b]">
            {totalScore.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#6e6761]">
            Đúng: <strong className="text-emerald-700">{correctCount}</strong> / 10
          </span>

          {phase === 'revealing' && (
            <button
              type="button"
              onClick={handleAdvanceToNext}
              className="px-3 py-1 bg-[#193b32] text-white rounded-lg text-xs font-semibold hover:bg-[#0e201b] transition-all flex items-center gap-1 active:scale-95"
            >
              <span>{currentQIndex >= 10 ? 'Xem kết quả' : 'Câu tiếp theo'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Question Card */}
      <QuizQuestionCard
        question={clientQuestion}
        selectedChoice={selectedChoice}
        orderSelection={orderSelection}
        onSelectChoice={(id) => setSelectedChoice(id)}
        onChangeOrder={(newOrder) => setOrderSelection(newOrder)}
        onSubmitAnswer={handleSubmitAnswer}
        hasSubmitted={hasSubmitted}
        isRevealed={phase === 'revealing'}
        revealData={revealData}
        timeRemainingMs={timeRemainingMs}
        totalTimeMs={QUIZ_CONSTANTS.QUESTION_DURATION_MS}
        revealTimeRemainingMs={revealRemainingMs}
        totalRevealTimeMs={QUIZ_CONSTANTS.REVEAL_DURATION_MS}
        myPointsAwarded={myPointsAwarded}
      />
    </div>
  );
};
