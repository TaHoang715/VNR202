import React from 'react';
import { ViewType } from '../components/Navbar';
import { GeometricTimeline } from '../components/GeometricTimeline';
import { HISTORICAL_PHOTOS } from '../data/historicalPhotos';
import {
  Presentation,
  Gamepad2,
  FileCheck,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface LandingViewProps {
  onSelectView: (view: ViewType) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onSelectView }) => {
  return (
    <div className="landing-view max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Editorial Hero Section (Asymmetrical Composition) */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Headline & Editorial Narrative */}
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faebee] border border-[#9d242b]/25 text-[#9d242b] text-xs font-semibold tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>VNR202 • 1946–1950</span>
          </div>

          <h1 className="font-sans font-bold text-3xl sm:text-4xl lg:text-[3.25rem] text-[#171513] tracking-tight leading-[1.15]">
            Đường lối kháng chiến toàn quốc & tổ chức thực hiện
            <span className="block text-[#9d242b] font-serif italic text-2xl sm:text-3xl lg:text-4xl mt-2 font-normal">
              Giai đoạn 1946 – 1950
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#3a3530] leading-relaxed font-sans max-w-2xl">
            Vì sao cuộc kháng chiến phải dựa vào toàn dân, tiến hành trên mọi mặt và chuẩn bị cho lâu dài? Cùng tìm hiểu đường lối kháng chiến và quá trình thực hiện từ 1946 đến 1950.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onSelectView('slides')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#9d242b] text-white text-sm font-semibold shadow-md hover:bg-[#7a171d] hover:shadow-lg transition-all"
            >
              <Presentation className="w-4 h-4" />
              <span>Khám phá bài học</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectView('game')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#193b32] text-white text-sm font-semibold shadow-md hover:bg-[#122b24] hover:shadow-lg transition-all"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Chơi Giải mã kháng chiến</span>
            </button>

            <button
              onClick={() => onSelectView('appendix')}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-white text-[#3a3530] border border-[#dfd6c6] text-xs font-semibold hover:bg-[#ede7dc] transition-all"
            >
              <span>Minh bạch AI & nguồn</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#dfd6c6]/80 text-xs">
            <div>
              <div className="font-serif font-bold text-xl text-[#9d242b]">12 mục</div>
              <div className="text-[#6e6761] mt-0.5">Bài học tư liệu lịch sử</div>
            </div>
            <div>
              <div className="font-serif font-bold text-xl text-[#193b32]">10 câu</div>
              <div className="text-[#6e6761] mt-0.5">Trắc nghiệm cá nhân & tốc độ</div>
            </div>
            <div>
              <div className="font-serif font-bold text-xl text-[#c99738]">Tư liệu</div>
              <div className="text-[#6e6761] mt-0.5">Ảnh tư liệu & nguồn chính thống</div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Archival Image in Passe-partout Frame */}
        <div className="md:col-span-5">
          <div className="editorial-card p-3 sm:p-4 bg-white border border-[#dfd6c6] shadow-xl">
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#0e201b]">
              <img
                src={HISTORICAL_PHOTOS.hanoi1946.src}
                alt="Chiến đấu tại Hà Nội những ngày đầu Toàn quốc kháng chiến"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono font-medium border border-white/20">
                  {HISTORICAL_PHOTOS.hanoi1946.date}
                </span>
              </div>
            </div>

            {/* Honest Caption & Attribution */}
            <div className="mt-3.5 px-1 space-y-1.5 text-xs">
              <p className="font-serif font-semibold text-[#171513] text-sm leading-snug">
                {HISTORICAL_PHOTOS.hanoi1946.caption}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#6e6761] pt-1 border-t border-[#dfd6c6]/60">
                <span>{HISTORICAL_PHOTOS.hanoi1946.credit}</span>
                <a
                  href={HISTORICAL_PHOTOS.hanoi1946.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#9d242b] font-medium hover:underline"
                >
                  <span>Xem nguồn tư liệu</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Pillars Section: Bai hoc & Mo phong */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#dfd6c6] pb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-[#9d242b] uppercase font-mono">
              Cấu trúc nội dung
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#171513] mt-1">
              Hai hoạt động trọng tâm
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Bai hoc */}
          <div className="editorial-card p-6 sm:p-8 flex flex-col justify-between border-t-4 border-t-[#9d242b]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[#faebee] text-[#9d242b] font-mono font-bold text-xs">
                  Phần 1: Bài học
                </span>
                <Presentation className="w-5 h-5 text-[#9d242b]" />
              </div>

              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#171513]">
                Bài học đường lối & sự kiện (12 mục)
              </h3>

              <p className="text-xs sm:text-sm text-[#3a3530] leading-relaxed">
                Hệ thống 12 mục trình bày hoàn cảnh lịch sử tháng 12/1946, 3 văn kiện nền tảng của Đảng,
                4 nội dung cốt lõi (toàn dân, toàn diện, trường kỳ, tự lực cánh sinh), hai chiến dịch lớn
                (Việt Bắc 1947, Biên giới 1950) và bài học thực tiễn về phương châm 4 tại chỗ hôm nay.
              </p>

              <div className="space-y-2 pt-2 text-xs text-[#3a3530]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9d242b]" />
                  <span>Hình ảnh tư liệu lịch sử có chú thích, niên đại và nguồn gốc xác thực.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9d242b]" />
                  <span>Tích hợp ghi chú người nói và xuất bản in PDF.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9d242b]" />

                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#dfd6c6]">
              <button
                onClick={() => onSelectView('slides')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#9d242b] text-white text-xs font-semibold hover:bg-[#7a171d] transition-colors"
              >
                <span>Xem toàn bộ 12 mục bài học</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Mo phong game */}
          <div className="editorial-card p-6 sm:p-8 flex flex-col justify-between border-t-4 border-t-[#193b32]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[#e8f0ec] text-[#193b32] font-mono font-bold text-xs">
                  Phần 2: Thử thách trắc nghiệm
                </span>
                <Gamepad2 className="w-5 h-5 text-[#193b32]" />
              </div>

              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#171513]">
                Đấu trường tri thức: "Đường lối kháng chiến"
              </h3>

              <p className="text-xs sm:text-sm text-[#3a3530] leading-relaxed">
                Trò chơi thi đấu 10 vòng kết hợp trắc nghiệm phản xạ 4 lựa chọn màu sắc và đuổi hình bắt chữ điền từ khóa kèm ảnh tư liệu lịch sử thật (Toàn dân, Toàn diện, Trường kỳ, Tự lực cánh sinh, Biên giới). Điểm tính theo thời gian thực (vòng 60 giây, tối đa ~6.000 điểm/câu), thi đấu trực tuyến cùng cả lớp.
              </p>

              <div className="space-y-2 pt-2 text-xs text-[#3a3530]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#193b32]" />

                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#193b32]" />
                  <span>Màn hình chủ phòng và người chơi kết nối nhanh qua mã QR (đến 200 người).</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#193b32]" />
                  <span>Bảng vàng vinh danh trực tiếp các cá nhân có điểm số và tốc độ xuất sắc nhất.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#dfd6c6]">
              <button
                onClick={() => onSelectView('game')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#193b32] text-white text-xs font-semibold hover:bg-[#122b24] transition-colors"
              >
                <span>Tham gia Giải mã kháng chiến</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Archival Exhibition Gallery (Dark Chapter Block) */}
      <section className="dark-chapter-card p-6 sm:p-10 text-white space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/15 pb-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold tracking-widest uppercase text-[#c99738]">
              Tư liệu lưu trữ
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-white">
              Ảnh tư liệu kháng chiến (1946–1950)
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-2xl font-light">
              Những hình ảnh về Hà Nội những ngày đầu kháng chiến, dân công và Chiến dịch Biên giới năm 1950.
            </p>
          </div>
          <button
            onClick={() => onSelectView('appendix')}
            className="self-start md:self-auto px-4 py-2 rounded-full border border-white/20 hover:border-white/40 text-xs font-medium text-white/90 hover:text-white transition-colors"
          >
            Xem trích dẫn đầy đủ
          </button>
        </div>

        {/* 4-Item Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gallery Item 1 */}
          <div className="group bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-[#c99738]/50 transition-all flex flex-col justify-between">
            <div>
              <div className="rounded-xl overflow-hidden aspect-[4/3] bg-black/40 mb-3 relative">
                <img
                  src={HISTORICAL_PHOTOS.hanoi1946.src}
                  alt={HISTORICAL_PHOTOS.hanoi1946.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white/90">
                  {HISTORICAL_PHOTOS.hanoi1946.date}
                </span>
              </div>
              <h4 className="font-serif font-bold text-sm text-white leading-snug line-clamp-2">
                Chiến đấu tại Hà Nội đầu Toàn quốc kháng chiến
              </h4>
            </div>
            <div className="pt-3 mt-2 border-t border-white/10 text-[10px] text-white/50 flex justify-between items-center">
              <span>{HISTORICAL_PHOTOS.hanoi1946.credit}</span>
            </div>
          </div>

          {/* Gallery Item 2 */}
          <div className="group bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-[#c99738]/50 transition-all flex flex-col justify-between">
            <div>
              <div className="rounded-xl overflow-hidden aspect-[4/3] bg-black/40 mb-3 relative">
                <img
                  src={HISTORICAL_PHOTOS.hochiminh1950.src}
                  alt={HISTORICAL_PHOTOS.hochiminh1950.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white/90">
                  {HISTORICAL_PHOTOS.hochiminh1950.date}
                </span>
              </div>
              <h4 className="font-serif font-bold text-sm text-white leading-snug line-clamp-2">
                Chủ tịch Hồ Chí Minh trên núi Báo Đông
              </h4>
            </div>
            <div className="pt-3 mt-2 border-t border-white/10 text-[10px] text-white/50 flex justify-between items-center">
              <span>{HISTORICAL_PHOTOS.hochiminh1950.credit}</span>
            </div>
          </div>

          {/* Gallery Item 3 */}
          <div className="group bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-[#c99738]/50 transition-all flex flex-col justify-between">
            <div>
              <div className="rounded-xl overflow-hidden aspect-[4/3] bg-black/40 mb-3 relative">
                <img
                  src={HISTORICAL_PHOTOS.porters1950.src}
                  alt={HISTORICAL_PHOTOS.porters1950.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white/90">
                  {HISTORICAL_PHOTOS.porters1950.date}
                </span>
              </div>
              <h4 className="font-serif font-bold text-sm text-white leading-snug line-clamp-2">
                Dân công phục vụ Chiến dịch Biên giới
              </h4>
            </div>
            <div className="pt-3 mt-2 border-t border-white/10 text-[10px] text-white/50 flex justify-between items-center">
              <span>{HISTORICAL_PHOTOS.porters1950.credit}</span>
            </div>
          </div>

          {/* Gallery Item 4 */}
          <div className="group bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-[#c99738]/50 transition-all flex flex-col justify-between">
            <div>
              <div className="rounded-xl overflow-hidden aspect-[4/3] bg-black/40 mb-3 relative">
                <img
                  src={HISTORICAL_PHOTOS.border1950.src}
                  alt={HISTORICAL_PHOTOS.border1950.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white/90">
                  {HISTORICAL_PHOTOS.border1950.date}
                </span>
              </div>
              <h4 className="font-serif font-bold text-sm text-white leading-snug line-clamp-2">
                Bộ đội trong Chiến dịch Biên giới 1950
              </h4>
            </div>
            <div className="pt-3 mt-2 border-t border-white/10 text-[10px] text-white/50 flex justify-between items-center">
              <span>{HISTORICAL_PHOTOS.border1950.credit}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Historical Milestones Timeline Visual */}
      <section className="editorial-card p-6 sm:p-10 space-y-4">
        <GeometricTimeline />
      </section>

      {/* Learning Objectives Section */}
      <section className="editorial-card p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-3 border-b border-[#dfd6c6] pb-4">
          <FileCheck className="w-6 h-6 text-[#9d242b]" />
          <div>
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#171513]">
              Nội dung chính
            </h3>
            <p className="text-xs text-[#6e6761] mt-0.5">
              Từ bối cảnh lịch sử đến đường lối, quá trình thực hiện và liên hệ hôm nay.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-[#3a3530]">
          <div className="p-4 rounded-xl bg-[#fdfcf9] border border-[#dfd6c6] space-y-2">
            <span className="font-mono font-bold text-xs text-[#9d242b] block">01. Nhận thức</span>
            <h4 className="font-serif font-bold text-sm text-[#171513]">Kiến thức lịch sử cốt lõi</h4>
            <p className="leading-relaxed">
              Nắm vững hoàn cảnh tháng 12/1946, 3 văn kiện nền tảng của Đảng và hai chiến dịch bản lề (Việt Bắc 1947, Biên giới 1950).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#fdfcf9] border border-[#dfd6c6] space-y-2">
            <span className="font-mono font-bold text-xs text-[#9d242b] block">02. Tư duy</span>
            <h4 className="font-serif font-bold text-sm text-[#171513]">Phân tích chiến lược</h4>
            <p className="leading-relaxed">
              Làm rõ mối quan hệ giữa toàn dân, toàn diện, trường kỳ và tự lực cánh sinh trong nghệ thuật chuyển hóa lực lượng.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#fdfcf9] border border-[#dfd6c6] space-y-2">
            <span className="font-mono font-bold text-xs text-[#193b32] block">03. Thực hành</span>
            <h4 className="font-serif font-bold text-sm text-[#171513]">Mô phỏng quyết định</h4>
            <p className="leading-relaxed">
              Thử thách kiến thức và tốc độ phản xạ trong trò chơi "Giải mã kháng chiến" cùng tập thể lớp.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#fdfcf9] border border-[#dfd6c6] space-y-2">
            <span className="font-mono font-bold text-xs text-[#c99738] block">04. Vận dụng</span>
            <h4 className="font-serif font-bold text-sm text-[#171513]">Liên hệ quản trị nguồn lực</h4>
            <p className="leading-relaxed">
              Vận dụng bài học chuẩn bị nội lực và phương châm "4 tại chỗ" vào phân tích năng lực ứng phó rủi ro hiện đại (ứng phó thiên tai, bão Yagi 2024).
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="text-center text-xs text-[#6e6761] pt-6 border-t border-[#dfd6c6] space-y-1">
        <p className="font-serif">
          Tài liệu môn Lịch sử Đảng Cộng sản Việt Nam (VNR202) • Giai đoạn kháng chiến 1946–1950.
        </p>
        <p className="text-[11px] text-[#6e6761]/80">
          Nội dung là bản thảo phục vụ học tập, sinh viên đối chiếu giáo trình in và văn kiện Đảng trước khi trình bày.
        </p>
      </footer>
    </div>
  );
};
