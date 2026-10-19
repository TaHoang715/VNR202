import React from 'react';
import { OrderingQuestion } from './OrderingQuestion';
import { resolveAssetPath } from '../data/historicalPhotos';
import type { ClientQuizQuestion, QuizRevealData, QuizOption } from '../data/quizData';
import { ExternalLink, CheckCircle2, XCircle, Clock, Award } from 'lucide-react';

interface QuizQuestionCardProps {
  question: ClientQuizQuestion;
  selectedChoice: string | null;
  orderSelection: string[];
  onSelectChoice: (choiceId: string) => void;
  onChangeOrder: (newOrder: string[]) => void;
  onSubmitAnswer?: () => void;
  hasSubmitted: boolean;
  isRevealed: boolean;
  revealData: QuizRevealData | null;
  timeRemainingMs: number | null;
  totalTimeMs?: number;
  revealTimeRemainingMs?: number | null;
  totalRevealTimeMs?: number;
  myPointsAwarded?: number;
  isHostView?: boolean;
}

export const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  question,
  selectedChoice,
  orderSelection,
  onSelectChoice,
  onChangeOrder,
  onSubmitAnswer,
  hasSubmitted,
  isRevealed,
  revealData,
  timeRemainingMs,
  totalTimeMs = 25000,
  revealTimeRemainingMs,
  totalRevealTimeMs = 8000,
  myPointsAwarded,
  isHostView = false,
}) => {
  // Timer calculations
  const questionSecondsRemaining =
    timeRemainingMs !== null ? Math.max(0, Math.ceil(timeRemainingMs / 1000)) : null;
  const questionPercent =
    timeRemainingMs !== null ? Math.max(0, Math.min(100, (timeRemainingMs / totalTimeMs) * 100)) : 100;

  const revealSecondsRemaining =
    typeof revealTimeRemainingMs === 'number'
      ? Math.max(0, Math.ceil(revealTimeRemainingMs / 1000))
      : null;

  return (
    <div className="bg-white border border-[#dfd6c6] rounded-2xl p-4 sm:p-7 shadow-sm space-y-5 transition-all">
      {/* Header bar: Question ID badge + Timer */}
      <div className="flex items-center justify-between gap-3 border-b border-[#dfd6c6]/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 rounded-full bg-[#9d242b] text-white font-mono text-xs font-bold uppercase tracking-wide">
            Câu {question.id} / 10
          </span>
          <span className="text-xs text-[#6e6761] font-semibold hidden sm:inline">
            {question.type === 'order'
              ? 'Dạng sắp xếp mốc thời gian'
              : question.type === 'photo'
              ? 'Dạng tư liệu lịch sử'
              : 'Trắc nghiệm lựa chọn'}
          </span>
        </div>

        {/* Timer indicator */}
        {!isRevealed && questionSecondsRemaining !== null && (
          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 ${
                questionSecondsRemaining <= 5 ? 'text-rose-600 animate-pulse' : 'text-[#193b32]'
              }`}
            />
            <span
              className={`font-mono font-bold text-sm sm:text-base ${
                questionSecondsRemaining <= 5 ? 'text-rose-600' : 'text-[#171513]'
              }`}
            >
              {questionSecondsRemaining}s
            </span>
          </div>
        )}

        {isRevealed && revealSecondsRemaining !== null && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-amber-900">
              Chuyển câu sau: {revealSecondsRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* Timer Bar */}
      {!isRevealed && timeRemainingMs !== null && (
        <div className="w-full bg-[#ede7dc] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ease-linear ${
              questionPercent <= 25
                ? 'bg-rose-600'
                : questionPercent <= 50
                ? 'bg-amber-500'
                : 'bg-[#193b32]'
            }`}
            style={{ width: `${questionPercent}%` }}
          />
        </div>
      )}

      {/* Question Prompt */}
      <div className="space-y-2">
        <h2 className="font-serif font-bold text-base sm:text-xl text-[#171513] leading-snug">
          {question.prompt}
        </h2>
      </div>

      {/* Historical Photo Content (if question has photo) */}
      {question.photo && (
        <div className="border border-[#dfd6c6] rounded-xl overflow-hidden bg-[#0e201b] grid grid-cols-1 md:grid-cols-12 gap-0">
          <div className="md:col-span-5 bg-black flex items-center justify-center max-h-64 md:max-h-80 overflow-hidden">
            <img
              src={resolveAssetPath(question.photo.src)}
              alt={question.photo.caption}
              className="w-full h-full object-cover object-center max-h-64 md:max-h-80"
              loading="eager"
            />
          </div>
          <div className="md:col-span-7 p-3.5 sm:p-4 text-xs text-white/90 space-y-2 flex flex-col justify-center bg-[#193b32]">
            <p className="font-semibold text-sm text-[#f6f3ed] leading-snug">
              {question.photo.caption}
            </p>
            <p className="text-white/80 text-[11px] leading-relaxed">
              {question.photo.context}
            </p>
            <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/70">
              <span>Niên đại: {question.photo.date} • {question.photo.credit}</span>
              <a
                href={question.photo.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c99738] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Nguồn lưu trữ</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Question Interaction Area */}
      <div className="pt-2">
        {/* Choice / Photo Type: Multiple Choice Buttons */}
        {question.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((opt: QuizOption) => {
              const isSelected = selectedChoice === opt.id;
              const isCorrect = isRevealed && revealData?.correctOptionId === opt.id;
              const isSelectedWrong = isRevealed && isSelected && !isCorrect;

              let btnClass = 'bg-[#fdfcf9] border-[#dfd6c6] text-[#171513] hover:bg-[#ede7dc]/60';
              if (isSelected && !isRevealed) {
                btnClass = 'bg-[#9d242b] border-[#9d242b] text-white shadow-md scale-[1.01]';
              } else if (isCorrect) {
                btnClass = 'bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-300';
              } else if (isSelectedWrong) {
                btnClass = 'bg-rose-600 border-rose-600 text-white shadow-md';
              } else if (isRevealed) {
                btnClass = 'bg-gray-100 border-gray-200 text-gray-500 opacity-60';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={hasSubmitted || isRevealed || isHostView}
                  onClick={() => onSelectChoice(opt.id)}
                  className={`w-full p-4 rounded-xl border text-left font-sans text-xs sm:text-sm font-medium transition-all duration-150 flex items-start gap-3 min-h-[58px] ${btnClass} ${
                    hasSubmitted || isRevealed || isHostView ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 mt-0.5 ${
                      isSelected && !isRevealed
                        ? 'bg-white text-[#9d242b]'
                        : isCorrect || isSelectedWrong
                        ? 'bg-white text-black'
                        : 'bg-[#ede7dc] text-[#171513]'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Timeline Ordering Type: Accessible Button Reorder */}
        {question.orderItems && (
          <OrderingQuestion
            items={question.orderItems}
            currentOrder={orderSelection}
            onChangeOrder={onChangeOrder}
            disabled={hasSubmitted || isRevealed || isHostView}
            correctOrder={revealData?.correctOrderIds}
            isRevealed={isRevealed}
          />
        )}
      </div>

      {/* Answer Submission Action (Player only) */}
      {!isHostView && !isRevealed && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#dfd6c6]/60">
          <div className="text-xs text-[#6e6761]">
            {hasSubmitted ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã ghi nhận câu trả lời. Đang chờ công bố đáp án...
              </span>
            ) : (
              <span>Chọn hoặc sắp xếp câu trả lời rồi nhấn xác nhận.</span>
            )}
          </div>

          {!hasSubmitted && onSubmitAnswer && (
            <button
              type="button"
              onClick={onSubmitAnswer}
              disabled={question.options ? !selectedChoice : orderSelection.length === 0}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-sm ${
                (question.options ? Boolean(selectedChoice) : orderSelection.length > 0)
                  ? 'bg-[#9d242b] text-white hover:bg-[#7a171d] active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Xác nhận câu trả lời
            </button>
          )}
        </div>
      )}

      {/* Reveal Phase: Sourced Explanation & Points Banner */}
      {isRevealed && revealData && (
        <div className="mt-4 p-4 sm:p-5 rounded-xl border border-emerald-200 bg-emerald-50/80 space-y-3 animate-in fade-in duration-200">
          {/* Points earned banner (if player) */}
          {!isHostView && myPointsAwarded !== undefined && (
            <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-200 text-emerald-950 font-bold text-sm">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>
                {myPointsAwarded > 0
                  ? `Chính xác! Bạn được cộng +${myPointsAwarded} điểm (bao gồm thưởng tốc độ).`
                  : 'Chưa chính xác hoặc chưa kịp nộp câu trả lời (0 điểm).'}
              </span>
            </div>
          )}

          {/* Sourced Historical Explanation */}
          <div className="space-y-1.5 text-xs sm:text-sm text-emerald-950 leading-relaxed">
            <div className="font-bold font-serif text-sm text-[#193b32]">
              Lời giải thích lịch sử & Cơ sở văn kiện:
            </div>
            <p>{revealData.explanation}</p>
          </div>

          <div className="text-[11px] text-emerald-800 font-medium pt-1 border-t border-emerald-200/60">
            <strong>Nguồn đối chiếu: </strong> {revealData.sourceNote}
          </div>
        </div>
      )}
    </div>
  );
};
