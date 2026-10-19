import React from 'react';

interface TimelineEvent {
  year: string;
  quarterOrMonth: string;
  title: string;
  subtitle: string;
  badge: string;
}

const EVENTS: TimelineEvent[] = [
  {
    year: '1946',
    quarterOrMonth: 'Tháng 12',
    title: 'Phát động Toàn quốc Kháng chiến',
    subtitle: 'Chỉ thị 12/12, Lời kêu gọi 19/12, quân dân Hà Nội mở đầu 60 ngày đêm giam chân địch.',
    badge: 'Khởi đầu chiến lược',
  },
  {
    year: '1947',
    quarterOrMonth: 'Thu – Đông',
    title: 'Chiến dịch Việt Bắc Thu – Đông',
    subtitle: 'Bảo vệ an toàn cơ quan đầu não ATK, bẻ gãy chiến lược "đánh nhanh thắng nhanh" của Pháp.',
    badge: 'Bước ngoặt phòng ngự',
  },
  {
    year: '1948 – 1949',
    quarterOrMonth: 'Hai năm',
    title: 'Phát triển Chiến tranh Du kích & Kinh tế',
    subtitle: 'Củng cố hậu phương, tăng gia sản xuất tự cấp, phát triển lực lượng 3 thứ quân rộng khắp.',
    badge: 'Cầm cự & Tích lũy',
  },
  {
    year: '1950',
    quarterOrMonth: 'Thu – Đông',
    title: 'Chiến dịch Biên Giới Thu – Đông',
    subtitle: 'Khai thông biên giới quốc tế, giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.',
    badge: 'Giành thế chủ động ở Bắc Bộ',
  },
];

export const GeometricTimeline: React.FC = () => {
  return (
    <div className="w-full my-4 py-2">
      <div className="text-center mb-6 space-y-1">
        <span className="text-xs font-mono font-semibold tracking-wider text-[#9d242b] uppercase px-3 py-1 bg-[#faebee] rounded-full border border-[#9d242b]/20">
          Tiến trình lịch sử 1946 – 1950
        </span>
        <h4 className="text-xl sm:text-2xl font-bold font-serif text-[#171513] mt-2">
          Bốn Mốc Chuyển Hóa Thế Trận Căn Bản
        </h4>
        <p className="text-xs text-[#6e6761]">Từ những ngày đầu kháng chiến tại đô thị đến bước ngoặt giành thế chủ động chiến lược</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {EVENTS.map((event, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#fdfcf9] border border-[#dfd6c6] hover:border-[#9d242b] hover:shadow-md transition-all relative flex flex-col justify-between space-y-3"
          >
            {/* Top Node Indicator */}
            <div className="flex items-center justify-between border-b border-[#dfd6c6]/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#9d242b] text-white flex items-center justify-center text-xs font-bold font-mono">
                  {idx + 1}
                </span>
                <span className="font-serif font-bold text-lg text-[#9d242b]">
                  {event.year}
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#6e6761] bg-[#ede7dc] px-2 py-0.5 rounded-full">
                {event.quarterOrMonth}
              </span>
            </div>

            {/* Event Description */}
            <div className="space-y-1.5 flex-1">
              <h5 className="font-serif font-bold text-base text-[#171513] leading-snug">
                {event.title}
              </h5>
              <p className="text-xs text-[#3a3530] leading-relaxed">
                {event.subtitle}
              </p>
            </div>

            {/* Bottom Badge */}
            <div className="pt-2 border-t border-[#dfd6c6]/40">
              <span className="inline-block text-[11px] font-semibold text-[#193b32] bg-[#e8f0ec] px-2.5 py-0.5 rounded-full border border-[#193b32]/20">
                {event.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-4">
        <p className="text-[11px] italic text-[#6e6761]">
          Sơ đồ bốn mốc bản lề phản ánh quy luật phát triển từ du kích chiến lên vận động chiến trong giai đoạn 1946–1950.
        </p>
      </div>
    </div>
  );
};
