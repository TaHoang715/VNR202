import React, { useState } from 'react';
import { SoloQuizView } from './SoloQuizView';
import { QuizPlayerView } from './QuizPlayerView';
import { QuizHostView } from './QuizHostView';
import { HISTORICAL_PHOTOS } from '../data/historicalPhotos';
import { Monitor, Smartphone, Zap, Info, ExternalLink } from 'lucide-react';

export const GameView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'solo' | 'player' | 'host'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('quiz')) return 'player';
      if (localStorage.getItem('vnr202_quiz_host_room')) return 'host';
    }
    return 'solo';
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header with Archival Photo Side Thumbnail */}
      <section className="paper-card rounded-2xl p-4 sm:p-6 border border-[#dfd6c6] bg-white shadow-sm grid grid-cols-[minmax(0,1fr)_80px] sm:grid-cols-[minmax(0,1fr)_160px] items-start gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#9d242b] text-white text-[11px] font-mono font-bold uppercase tracking-wider">
              Trắc Nghiệm Cá Nhân • 10 Câu Hỏi
            </span>
            <span className="text-xs text-[#c99738] font-semibold">
              VNR202 (1946–1950)
            </span>
          </div>

          <h1 className="font-sans font-bold text-xl sm:text-3xl text-[#171513] tracking-tight leading-tight">
            Giải mã kháng chiến
          </h1>

          <p className="hidden sm:block text-sm text-[#3a3530] max-w-2xl leading-relaxed">
            Thử thách kiến thức cá nhân qua 10 câu hỏi lịch sử: trắc nghiệm chọn đáp án, tư liệu ảnh thật và sắp xếp mốc thời gian bằng nút bấm.
          </p>

          <div className="text-xs text-[#6e6761] pt-1 flex flex-wrap items-center gap-2 border-t border-[#dfd6c6]/60">
            <span className="hidden sm:inline">
              Ảnh tư liệu: <em>{HISTORICAL_PHOTOS.journey1950.caption}</em> ({HISTORICAL_PHOTOS.journey1950.credit}).
            </span>
            <a
              href={HISTORICAL_PHOTOS.journey1950.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c99738] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Kho lưu trữ</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Archival Side Thumbnail */}
        <div className="w-20 sm:w-40 h-24 sm:h-36 flex-shrink-0 rounded-xl overflow-hidden border border-[#dfd6c6] shadow-inner bg-[#0e201b]">
          <img
            src={HISTORICAL_PHOTOS.journey1950.src}
            alt={HISTORICAL_PHOTOS.journey1950.caption}
            className="w-full h-full object-cover object-top opacity-90"
          />
        </div>
      </section>

      {/* Mode Switcher: 'Chơi thử ngay' / 'Người chơi' / 'Chủ phòng' */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 w-full sm:w-auto p-1 bg-[#ede7dc]/90 rounded-2xl sm:rounded-full border border-[#dfd6c6] shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('solo')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'solo'
                ? 'bg-[#9d242b] text-white shadow-sm'
                : 'text-[#3a3530] hover:text-[#9d242b]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Chơi thử ngay</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'player'
                ? 'bg-[#193b32] text-white shadow-sm'
                : 'text-[#3a3530] hover:text-[#193b32]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Người chơi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('host')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'host'
                ? 'bg-[#c99738] text-[#171513] shadow-sm font-bold'
                : 'text-[#3a3530] hover:text-[#c99738]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Chủ phòng</span>
          </button>
        </div>
      </div>

      {/* Rules Summary Accordion */}
      <details className="paper-card p-4 rounded-xl border border-[#dfd6c6] group bg-white shadow-sm">
        <summary className="font-semibold text-sm text-[#171513] cursor-pointer flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#193b32]" />
            <span>Thể lệ & Luật tính điểm "Giải mã kháng chiến" (10 câu × 25 giây)</span>
          </div>
          <span className="text-xs text-[#6e6761] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="pt-3 space-y-2 border-t border-[#dfd6c6]/60 mt-3 text-sm leading-relaxed text-[#3a3530]">
          <p>
            • <strong>Cơ cấu câu hỏi:</strong> 10 câu hỏi chuẩn xác về Đường lối kháng chiến toàn quốc (1946–1950), gồm trắc nghiệm chọn đáp án, sắp xếp mốc thời gian bằng nút bấm tiếp cận và câu hỏi kèm ảnh tư liệu lịch sử thật.
          </p>
          <p>
            • <strong>Thời gian:</strong> 25 giây trả lời mỗi câu hỏi; 8 giây tự động công bố đáp án và giải thích chuẩn nguồn trước khi chuyển câu tiếp theo (khoảng 5–6 phút cả trận).
          </p>
          <p>
            • <strong>Tính điểm chuẩn xác:</strong> Trả lời đúng nhận 1.000 điểm chuẩn + tối đa 250 điểm thưởng tốc độ theo thời gian còn lại (tối đa 1.250 điểm/câu). Trả lời sai hoặc quá hạn nhận 0 điểm, không bị trừ điểm.
          </p>
          <p>
            • <strong>Thi đấu cá nhân:</strong> Mỗi người chơi tham gia độc lập bằng biệt danh và mã phòng 6 ký tự hoặc mã QR, không chia đội, không cấu hình phức tạp.
          </p>
          <p>
            • <strong>Chơi thử offline:</strong> Thẻ "Chơi thử ngay" hoạt động tức thì trên trình duyệt mà không cần tài khoản hay kết nối máy chủ.
          </p>
        </div>
      </details>

      {/* Active Tab Screen */}
      <div className="pt-1">
        {activeTab === 'solo' && <SoloQuizView />}
        {activeTab === 'player' && <QuizPlayerView />}
        {activeTab === 'host' && <QuizHostView />}
      </div>
    </div>
  );
};
