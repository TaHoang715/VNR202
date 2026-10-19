import React, { useState } from 'react';
import { GameHost } from './GameHost';
import { GamePlayer } from './GamePlayer';
import { GameDemo } from './GameDemo';
import { HISTORICAL_PHOTOS } from '../data/historicalPhotos';
import { Monitor, Smartphone, Bot, Info, ExternalLink } from 'lucide-react';

export const GameView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'player' | 'host' | 'demo'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo')) return 'demo';
      if (params.get('room')) return 'player';
      if (localStorage.getItem('vnr202_host_room')) return 'host';
    }
    return 'player';
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Compact Header with Archival Photo as Side Thumbnail */}
      <section className="paper-card rounded-2xl p-4 sm:p-6 border border-[#dfd6c6] bg-white shadow-sm grid grid-cols-[minmax(0,1fr)_80px] sm:grid-cols-[minmax(0,1fr)_160px] items-start gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#9d242b] text-white text-[11px] font-mono font-bold uppercase tracking-wider">
              Mô Phỏng Hợp Tác • 10 Phút
            </span>
            <span className="text-xs text-[#c99738] font-semibold">
              VNR202
            </span>
          </div>

          <h1 className="font-sans font-bold text-xl sm:text-3xl text-[#171513] tracking-tight leading-tight">
            Giữ vững căn cứ
          </h1>

          <p className="hidden sm:block text-sm text-[#3a3530] max-w-2xl leading-relaxed">
            Cùng đội ra quyết định, cân bằng lương thực, lực lượng và lòng dân qua 4 lượt.
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

      {/* Prominent Mode Switcher with Exact Labels: 'Người chơi' / 'Chủ phòng' / 'Xem demo' */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 w-full sm:w-auto p-1 bg-[#ede7dc]/90 rounded-2xl sm:rounded-full border border-[#dfd6c6] shadow-sm gap-1">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'player'
                ? 'bg-[#9d242b] text-white shadow-sm'
                : 'text-[#3a3530] hover:text-[#9d242b]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Người chơi</span>
          </button>

          <button
            onClick={() => setActiveTab('host')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'host'
                ? 'bg-[#193b32] text-white shadow-sm'
                : 'text-[#3a3530] hover:text-[#193b32]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Chủ phòng</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'demo'
                ? 'bg-[#c99738] text-[#171513] shadow-sm font-bold'
                : 'text-[#3a3530] hover:text-[#9d242b]'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Xem demo</span>
          </button>
        </div>
      </div>

      {/* Short Clear Playable Rules */}
      <details className="paper-card p-4 rounded-xl border border-[#dfd6c6] group">
        <summary className="font-semibold text-sm text-[#171513] cursor-pointer flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#193b32]" />
            <span>Luật chơi tóm tắt (4 lượt × 90 giây)</span>
          </div>
          <span className="text-xs text-[#6e6761] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="pt-3 space-y-2 border-t border-[#dfd6c6]/60 mt-3 text-sm leading-relaxed text-[#3a3530]">
          <p>
            • <strong>Thời gian:</strong> 4 lượt, mỗi lượt tối đa 90 giây thảo luận và biểu quyết kín.
          </p>
          <p>
            • <strong>Tài nguyên khởi đầu:</strong> Mỗi đội bắt đầu với 70 Lương thực, 70 Lực lượng và 70 Lòng dân. Mọi đội nhận tài nguyên ban đầu bằng nhau (số lượng thành viên đông hay ít không làm tăng tài nguyên của đội).
          </p>
          <p>
            • <strong>Ngưỡng sinh tồn:</strong> Sau mỗi lượt, tất cả tài nguyên của từng đội phải duy trì từ 40 đơn vị trở lên.
          </p>
          <p>
            • <strong>Chiến thắng tập thể:</strong> Toàn bộ các đội cùng vượt qua 4 lượt và mức trung bình toàn bộ nguồn lực đạt từ 50 đơn vị trở lên.
          </p>
          <p>
            • <strong>Chi viện tương trợ:</strong> Mỗi đội có ngân sách viện trợ tối đa 20 đơn vị/lượt tới căn cứ đồng đội gặp khó khăn để cùng nhau sinh tồn.
          </p>
          <p className="text-xs italic text-[#6e6761] pt-1">
            * Chỉ số mang tính chất quy ước mô phỏng giáo dục giúp rèn luyện tư duy phân bổ nguồn lực và hiệp đồng tập thể.
          </p>
        </div>
      </details>

      {/* Active Tab Screen */}
      <div className="pt-1">
        {activeTab === 'host' && <GameHost />}
        {activeTab === 'player' && <GamePlayer />}
        {activeTab === 'demo' && <GameDemo onClose={() => setActiveTab('player')} />}
      </div>
    </div>
  );
};
