import React, { useState, useEffect } from 'react';
import { REBUTTAL_PROMPTS, RebuttalPrompt } from '../data/rebuttal';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  ExternalLink,
  BookOpen,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export const RebuttalView: React.FC = () => {
  const [padletUrl, setPadletUrl] = useState<string>(() => {
    return localStorage.getItem('vnr202_padlet_url') || '';
  });
  const [timerSeconds, setTimerSeconds] = useState<number>(20 * 60); // 20 minutes
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('vnr202_padlet_url', padletUrl);
  }, [padletUrl]);

  // Timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(20 * 60);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Header & 20-minute Rebuttal Timer */}
      <div className="paper-card rounded-xl p-6 border border-[#ded4c3] flex flex-wrap items-center justify-between gap-6 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-[#80151b] bg-[#fbebed] px-2.5 py-0.5 rounded border border-[#80151b]/20">
            Học Phần VNR202 — Hoạt Động Phản Biện
          </span>
          <h2 className="font-serif font-bold text-2xl text-[#1a1817] mt-1">
            Màn Hỗ Trợ Phản Biện & Đối Thoại (20 Phút)
          </h2>
          <p className="text-xs text-[#6e6761] mt-0.5">
            Hỗ trợ quy trình: Đặt câu hỏi → Trả lời đối thoại → Phản biện lại dựa trên nguồn xác thực
          </p>
        </div>

        {/* Timer Box */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-[#ded4c3] shadow-inner">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-[#6e6761] tracking-wider block">
              Thời gian phản biện
            </span>
            <span className="text-3xl font-mono font-bold text-[#80151b]">
              {formatTimer(timerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-[#ded4c3] pl-3">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`p-2 rounded text-white text-xs font-semibold flex items-center justify-center transition-all ${
                timerRunning
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#80151b] hover:bg-[#661015]'
              }`}
              title={timerRunning ? 'Tạm dừng' : 'Bắt đầu đếm ngược 20 phút'}
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={handleResetTimer}
              className="p-2 rounded text-[#6e6761] hover:text-[#80151b] hover:bg-[#f4eee1]"
              title="Đặt lại về 20:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Padlet Guidance & Submission Template */}
      <section className="paper-card rounded-lg p-5 border border-[#ded4c3] space-y-4">
        <div className="flex items-center justify-between border-b border-[#ded4c3] pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#80151b]" />
            <h3 className="font-serif font-bold text-base text-[#1a1817]">
              Hướng Dẫn Đặt Câu Hỏi Qua Padlet (Đúng Quy Chuẩn Môn Học)
            </h3>
          </div>
          <span className="text-xs font-mono text-[#80151b] font-semibold">
            Quy định chấm điểm cá nhân
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="font-semibold text-[#1a1817]">Mẫu tiêu đề bài đăng Padlet bắt buộc:</div>
            <div className="p-3 bg-white font-mono text-xs rounded border border-[#80151b] text-[#80151b] font-bold select-all">
              HỌ TÊN SV - ĐẶT CÂU HỎI CHO NHÓM ...
            </div>
            <p className="text-[11px] text-[#6e6761] leading-relaxed">
              * Mỗi sinh viên tự đăng bài dưới tên thật của mình. Hệ thống không thay thế Padlet và không tự chấm điểm hay đăng bài thay.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[#1a1817]">Quy chế phản biện học tập:</div>
            <ul className="space-y-1 text-[#3d3835]">
              <li>• Mỗi nhóm đặt ít nhất 6 câu hỏi qua toàn bộ các đợt phản biện của lớp.</li>
              <li>• Mỗi thành viên phải đặt ít nhất 1 câu hỏi và tham gia phản biện lại.</li>
              <li>• Chỉ đặt câu hỏi mà không phản biện lại: nhận 50% điểm. Điểm tính cho từng cá nhân; không đặt câu hỏi thì không có điểm phản biện.</li>
              <li>• Câu hỏi cần tránh trùng lặp, bám sát giai đoạn 1946–1950.</li>
            </ul>
          </div>
        </div>

        {/* Custom Padlet Link Input */}
        <div className="pt-2 border-t border-[#ded4c3] flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-[#1a1817]">Liên kết Padlet của lớp:</label>
          <input
            type="text"
            value={padletUrl}
            onChange={(e) => setPadletUrl(e.target.value)}
            placeholder="https://padlet.com/..."
            className="flex-1 min-w-[240px] px-3 py-1.5 text-xs bg-white border border-[#ded4c3] rounded font-mono"
          />
          {padletUrl && (
            <a
              href={padletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#80151b] text-white text-xs font-medium rounded hover:bg-[#661015]"
            >
              <span>Mở Padlet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </section>

      {/* Suggested Prompts & Counter-Argument Guide (6 slots for 3 groups) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#80151b]" />
            <h3 className="font-serif font-bold text-lg text-[#1a1817]">
              6 Gợi Ý Câu Hỏi & Luận Cứ Đối Chiếu (Cho 3 Nhóm Phản Biện)
            </h3>
          </div>
          <span className="text-xs text-[#6e6761] italic">
            * Dữ liệu gợi ý luyện tập — Không nhận là câu hỏi SV đã tự đặt
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REBUTTAL_PROMPTS.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => setSelectedPrompt(prompt.id === selectedPrompt ? null : prompt.id)}
              className={`paper-card rounded-lg p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                selectedPrompt === prompt.id
                  ? 'border-[#80151b] bg-white ring-1 ring-[#80151b]'
                  : 'border-[#ded4c3] hover:border-[#80151b]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#ded4c3]">
                  <span className="text-[11px] font-bold text-[#80151b]">
                    {prompt.targetGroup}
                  </span>
                  <span className="text-[10px] bg-[#e8decb] px-1.5 py-0.5 rounded text-[#3d3835]">
                    {prompt.topic}
                  </span>
                </div>

                <h4 className="font-serif font-bold text-sm text-[#1a1817] mt-3 leading-snug">
                  "{prompt.question}"
                </h4>
              </div>

              <div className="mt-4 pt-3 border-t border-[#ded4c3]/60">
                <span className="text-xs font-semibold text-[#80151b] flex items-center gap-1">
                  <span>{selectedPrompt === prompt.id ? 'Thu gọn luận cứ' : 'Xem gợi ý luận cứ trả lời'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Modal/Panel for Selected Prompt */}
        {selectedPrompt && (
          <div className="paper-card-bordered rounded-lg p-6 border-2 border-[#80151b] bg-white space-y-4 animate-in fade-in duration-150">
            {(() => {
              const p = REBUTTAL_PROMPTS.find((item) => item.id === selectedPrompt)!;
              return (
                <>
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <span className="text-xs font-bold text-[#80151b] uppercase tracking-wider">
                        {p.targetGroup} — {p.topic}
                      </span>
                      <h4 className="font-serif font-bold text-base text-[#1a1817] mt-1">
                        "{p.question}"
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedPrompt(null)}
                      className="text-xs text-[#6e6761] hover:text-[#80151b] px-2 py-1"
                    >
                      Đóng (✕)
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-[#1a1817] uppercase tracking-wide">
                      Luận cứ then chốt cần làm rõ:
                    </div>
                    <ul className="space-y-2 text-[#3d3835]">
                      {p.counterArgumentKeyPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-[#fbf9f4] rounded border border-[#ded4c3] text-xs text-[#6e6761]">
                    <strong>Tài liệu đối chiếu:</strong> {p.referenceCitation}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
};
