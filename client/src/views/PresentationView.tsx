import React, { useState, useEffect } from 'react';
import { SLIDES, SlideData } from '../data/slides';
import { SOURCES } from '../data/sources';
import { AIUsageRecord } from '../components/AIUsageRecord';
import { ViewType } from '../components/Navbar';
import { getPhotoBindingForSlide } from '../data/historicalPhotos';
import { GAME_ENABLED } from '../config/features';
import {
  BookOpen,
  FileText,
  ExternalLink,
  Sparkles,
  Gamepad2,
  ArrowRight,
  Printer,
  List,
} from 'lucide-react';

const LESSON_TITLES = [
  'Khái quát bài học',
  'Bối cảnh lịch sử bùng nổ (12/1946)',
  'Hệ thống văn kiện hình thành đường lối',
  'Mục tiêu của cuộc kháng chiến',
  'Kháng chiến toàn dân (Trụ cột 1)',
  'Kháng chiến toàn diện (Trụ cột 2)',
  'Trường kỳ & dựa vào sức mình (Trụ cột 3 & 4)',
  'Tổ chức, chỉ đạo kháng chiến (1947–1950)',
  'Hai chiến dịch bước ngoặt lịch sử',
  'Vận dụng bài học: Tự lực cánh sinh & Bán dẫn',
  'Quan điểm cá nhân & trách nhiệm thế hệ trẻ',
  'Báo cáo minh bạch ứng dụng AI & nguồn dẫn',
];

const LESSON_PARTS = [
  { id: 1, title: 'Bối cảnh lịch sử', range: 'Mục 1 – 2', startSec: 'sec-1' },
  { id: 2, title: 'Đường lối kháng chiến', range: 'Mục 3 – 7', startSec: 'sec-3' },
  { id: 3, title: 'Tổ chức thực hiện', range: 'Mục 8 – 9', startSec: 'sec-8' },
  { id: 4, title: 'Vận dụng & Minh bạch', range: 'Mục 10 – 12', startSec: 'sec-10' },
];

interface PresentationViewProps {
  onSelectView?: (view: ViewType) => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ onSelectView }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-1');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => document.documentElement.style.setProperty('--site-header-height', `${header.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return () => observer.disconnect();
  }, []);

  // Track Reading Scroll Progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for Scrollspy active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px' }
    );

    SLIDES.forEach((slide) => {
      const el = document.getElementById(`sec-${slide.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Smooth Anchor Scrolling with Reduced Motion Support
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const offset = (document.querySelector('header')?.getBoundingClientRect().height || 80) + (window.innerWidth < 1024 ? 80 : 24);
      const targetY = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top: targetY,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  };

  const handlePrintExport = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  if (isPrintMode) {
    return (
      <div className="bg-white p-8 space-y-10 text-[#171513]">
        <div className="text-center pb-6 border-b border-gray-300 space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-[#9d242b] tracking-wider">
            Tài liệu học tập VNR202
          </span>
          <h1 className="text-3xl font-bold font-serif text-[#171513]">
            Đường lối kháng chiến toàn quốc & quá trình tổ chức thực hiện (1946 – 1950)
          </h1>
          <p className="text-xs text-gray-600">
            Học phần Lịch sử Đảng Cộng sản Việt Nam • Toàn văn 12 phần bài học kèm ảnh tư liệu, nguồn dẫn và 2 phụ lục
          </p>
        </div>

        {SLIDES.map((slide, idx) => {
          const binding = getPhotoBindingForSlide(slide.id);
          return (
            <article key={slide.id} className="slide-container p-8 border border-gray-300 rounded-2xl bg-[#fdfcf9] space-y-4">
              <div className="flex justify-between items-center text-xs text-gray-500 border-b border-gray-200 pb-2">
                <span className="font-semibold text-[#9d242b] uppercase font-mono">
                  Mục {idx + 1} / 12 — {slide.section} (Phần {slide.part}: {slide.partTitle})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8 space-y-3">
                  <h2 className="text-xl font-bold font-serif text-[#171513] leading-snug">
                    {LESSON_TITLES[slide.id - 1]}
                  </h2>
                  <h3 className="text-xs font-serif italic text-gray-700">
                    {slide.subtitle}
                  </h3>

                  <div className="space-y-1.5 py-2">
                    {slide.content.points.map((pt, pIdx) => (
                      <div key={pIdx} className="text-xs flex gap-2">
                        <span className="text-[#9d242b] font-bold">•</span>
                        <span className="text-gray-800 leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>

                  {slide.content.groups && slide.content.groups.length > 0 && (
                    <div className="space-y-2 py-1">
                      {slide.content.groups.map((grp, gIdx) => (
                        <div key={gIdx} className="p-2.5 rounded border border-gray-200 bg-white space-y-1 text-xs">
                          <h4 className="font-bold text-[#9d242b]">{grp.title}</h4>
                          <div className="space-y-1 pl-2.5 border-l-2 border-gray-200">
                            {grp.points.map((pt, ptIdx) => (
                              <div key={ptIdx} className="text-[11px] text-gray-800 leading-relaxed">
                                • {pt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {slide.content.archivalQuote && (
                    <blockquote className="p-3 bg-[#ede7dc]/40 border-l-4 border-[#9d242b] rounded-r text-xs italic">
                      "{slide.content.archivalQuote.text}"
                      <footer className="text-[10px] text-gray-600 mt-1 not-italic font-semibold">
                        — {slide.content.archivalQuote.source}
                      </footer>
                    </blockquote>
                  )}

                  {slide.content.videoEmbed && (
                    <div className="p-2.5 rounded border border-gray-200 bg-gray-50 text-[11px] space-y-0.5">
                      <div className="font-semibold text-[#9d242b]">▶ Video tư liệu: {slide.content.videoEmbed.title}</div>
                      <div className="text-gray-600 italic">{slide.content.videoEmbed.caption}</div>
                      <div className="text-[10px] text-gray-500 font-mono">https://www.youtube.com/watch?v={slide.content.videoEmbed.youtubeId}</div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-4 p-3 bg-white border border-gray-300 rounded-xl space-y-2">
                  <img
                    src={binding.photo.src}
                    alt={binding.specificCaption}
                    className="w-full aspect-[4/3] object-cover rounded"
                  />
                  <div className="text-[10px] space-y-1">
                    <p className="font-semibold text-gray-800">{binding.specificCaption}</p>
                    <p className="text-gray-600 italic">{binding.specificContext}</p>
                    <p className="text-gray-500">Niên đại: {binding.photo.date} • {binding.photo.credit}</p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {/* Print Appendix 1: AI Usage */}
        <div className="slide-container p-8 border border-gray-300 rounded-2xl bg-[#fdfcf9] space-y-4">
          <div className="text-xs text-gray-500 border-b pb-2 font-semibold text-[#9d242b] uppercase font-mono">
            Phụ Lục 1 — Báo Cáo Minh Bạch Sử Dụng AI & Cam Kết Liêm Chính
          </div>
          <h2 className="text-xl font-bold font-serif text-[#171513]">Báo Cáo Sử Dụng Trí Tuệ Nhân Tạo (AI Usage)</h2>
          <div className="space-y-2 text-xs text-gray-800 leading-relaxed">
            <p><strong>1. Công cụ AI hỗ trợ:</strong> Các mô hình trí tuệ nhân tạo (Claude, Codex, Gemini) làm trợ lý kỹ thuật hỗ trợ lập trình giao diện và tối ưu hóa hiển thị.</p>
            <p><strong>2. Mục đích:</strong> Trực quan hóa nội dung bài thuyết trình môn học, dàn trang 12 mục chuyên đề và tài liệu học tập.</p>
            <p><strong>3. Trách nhiệm học thuật:</strong> Toàn bộ sự kiện lịch sử, mốc thời gian, nhân vật và trích dẫn văn kiện đều được các thành viên trong nhóm trực tiếp đối chiếu, rà soát với bản in Giáo trình Lịch sử Đảng Cộng sản Việt Nam (NXB Chính trị quốc gia Sự thật, 2021) trước khi báo cáo và nộp cho giảng viên.</p>
          </div>
          <AIUsageRecord />
        </div>

        {/* Print Appendix 2: Sources */}
        <div className="slide-container p-8 border border-gray-300 rounded-2xl bg-[#fdfcf9] space-y-4">
          <div className="text-xs text-gray-500 border-b pb-2 font-semibold text-[#9d242b] uppercase font-mono">
            Phụ Lục 2 — Danh Mục Tài Liệu Tham Khảo Chính Thức
          </div>
          <h2 className="text-xl font-bold font-serif text-[#171513]">Danh Mục Văn Kiện & Nguồn Dẫn</h2>
          <div className="space-y-3 text-xs">
            {SOURCES.map((s, idx) => (
              <div key={idx} className="p-3 bg-white rounded border space-y-1">
                <div className="flex justify-between font-bold text-[#9d242b]">
                  <span>{idx + 1}. {s.title}</span>
                  <span className="text-[10px] text-gray-500">[{s.category}]</span>
                </div>
                <div className="text-gray-700">Tác giả/Cơ quan: {s.authorsOrAgency} • {s.publisherOrSite} ({s.yearOrDate})</div>
                <div className="text-[11px] text-gray-600">{s.description}</div>
                <div className="text-[10px] text-[#9d242b] italic">Trạng thái: {s.verificationStatus}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f6f3ed] text-[#171513]">
      {/* Mobile Anchor Quick Index Bar */}
      <div className="sticky top-[var(--site-header-height,80px)] z-20 lg:hidden bg-[#f6f3ed]/95 backdrop-blur-md border-b border-[#dfd6c6] py-2 px-3 no-print">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {SLIDES.map((slide) => {
            const isActive = activeSectionId === `sec-${slide.id}`;
            return (
              <button
                key={slide.id}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => scrollToSection(`sec-${slide.id}`)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#9d242b] text-white shadow-sm'
                    : 'bg-[#ede7dc]/80 text-[#3a3530] hover:bg-[#ede7dc]'
                }`}
              >
                <span className="font-mono text-[11px]">{slide.id < 10 ? `0${slide.id}` : slide.id}</span>
                <span className="truncate max-w-[120px]">{LESSON_TITLES[slide.id - 1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container: Sticky Desktop TOC + Continuous Vertical Content Stream */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        {/* ============================================================ */}
        {/* DESKTOP STICKY TABLE OF CONTENTS (TOC)                        */}
        {/* ============================================================ */}
        <aside
          className={`hidden lg:block flex-shrink-0 sticky top-[calc(var(--site-header-height,80px)+24px)] z-10 transition-all duration-300 no-print ${
            sidebarOpen ? 'w-80' : 'w-16'
          }`}
        >
          <div className="bg-white rounded-3xl border border-[#dfd6c6] shadow-sm overflow-hidden p-4 space-y-4 max-h-[calc(100vh-8rem)] flex flex-col justify-between">
            {sidebarOpen ? (
              <>
                {/* TOC Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#dfd6c6]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#9d242b]" />
                    <div>
                      <h3 className="font-serif font-bold text-sm text-[#171513]">Mục lục bài học</h3>
                      <p className="text-[11px] text-[#6e6761]">12 phần nội dung</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-[#ede7dc] text-[#6e6761] text-xs font-bold transition-colors"
                    title="Thu gọn mục lục"
                  >
                    ◀
                  </button>
                </div>

                {/* Progress bar in TOC */}
                <div className="px-1 space-y-1">
                  <div className="flex justify-between text-[11px] text-[#6e6761] font-mono">
                    <span>Tiến độ đọc</span>
                    <span>{Math.round(scrollProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#ede7dc] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9d242b] transition-all duration-200"
                      style={{ width: `${scrollProgress}%` }}
                    />
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1 overflow-y-auto pr-1 flex-1 text-xs scrollbar-thin">
                  {SLIDES.map((slide) => {
                    const isActive = activeSectionId === `sec-${slide.id}`;
                    return (
                      <React.Fragment key={slide.id}>
                        {slide.id === 1 && (
                          <div className="pt-1 pb-0.5 px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9d242b]">
                            Phần I • Bối cảnh lịch sử
                          </div>
                        )}
                        {slide.id === 3 && (
                          <div className="pt-2 pb-0.5 px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9d242b]">
                            Phần II • Đường lối kháng chiến
                          </div>
                        )}
                        {slide.id === 8 && (
                          <div className="pt-2 pb-0.5 px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9d242b]">
                            Phần III • Tổ chức thực hiện
                          </div>
                        )}
                        {slide.id === 10 && (
                          <div className="pt-2 pb-0.5 px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9d242b]">
                            Phần IV • Vận dụng & Minh bạch
                          </div>
                        )}
                        <button
                          aria-current={isActive ? 'location' : undefined}
                          onClick={() => scrollToSection(`sec-${slide.id}`)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                            isActive
                              ? 'bg-[#9d242b] text-white font-semibold shadow-sm'
                              : 'text-[#3a3530] hover:bg-[#ede7dc]/70 hover:text-[#9d242b]'
                          }`}
                        >
                          <span
                            className={`font-mono text-[10px] w-5 text-center px-1 rounded ${
                              isActive ? 'bg-white/20 text-white' : 'text-[#6e6761] bg-[#ede7dc]'
                            }`}
                          >
                            {slide.id < 10 ? `0${slide.id}` : slide.id}
                          </span>
                          <span className="truncate text-[11px] leading-tight">
                            {LESSON_TITLES[slide.id - 1]}
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </nav>

                {/* Bottom Quick Tools */}
                <div className="pt-3 border-t border-[#dfd6c6] space-y-2">
                  <button
                    onClick={handlePrintExport}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border border-[#dfd6c6] text-xs font-semibold text-[#3a3530] hover:bg-[#ede7dc] transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Xuất PDF Bản In</span>
                  </button>

                  {GAME_ENABLED && onSelectView && (
                    <button
                      onClick={() => onSelectView('game')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-[#193b32] text-white text-xs font-semibold hover:bg-[#122b24] transition-colors shadow-sm"
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Thử thách Giải mã kháng chiến</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Collapsed Sidebar */
              <div className="flex flex-col items-center py-2 space-y-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-xl hover:bg-[#ede7dc] text-[#9d242b] transition-colors"
                  title="Mở rộng mục lục"
                >
                  <List className="w-5 h-5" />
                </button>

                <div className="space-y-1.5">
                  {SLIDES.map((slide) => {
                    const isActive = activeSectionId === `sec-${slide.id}`;
                    return (
                      <button
                        key={slide.id}
                        aria-current={isActive ? 'location' : undefined}
                onClick={() => scrollToSection(`sec-${slide.id}`)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#9d242b] text-white shadow-sm'
                            : 'text-[#6e6761] hover:bg-[#ede7dc]'
                        }`}
                        title={`Phần ${slide.id}: ${LESSON_TITLES[slide.id - 1]}`}
                      >
                        {slide.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ============================================================ */}
        {/* MAIN ARTICLE STREAM: ALL 12 SECTIONS IN ONE ARTICLE           */}
        {/* ============================================================ */}
        <main className="flex-1 min-w-0 space-y-14">
          {/* Article Hero Banner */}
          <header className="editorial-card p-6 sm:p-10 lg:p-12 bg-white border border-[#dfd6c6] shadow-md space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faebee] border border-[#9d242b]/25 text-[#9d242b] text-xs font-semibold tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>VNR202 • 1946–1950</span>
            </div>

            <h1 className="font-sans font-bold text-3xl sm:text-4xl lg:text-5xl text-[#171513] tracking-tight leading-tight">
              Đường lối kháng chiến toàn quốc & quá trình tổ chức thực hiện
              <span className="block text-[#9d242b] font-serif italic text-2xl sm:text-3xl mt-2 font-normal">
                Giai đoạn 1946 – 1950
              </span>
            </h1>

            <p className="text-base text-[#3a3530] leading-relaxed max-w-3xl">
              Nội dung chuyên đề gồm bối cảnh lịch sử tháng 12/1946, hệ thống văn kiện & 4 trụ cột đường lối kháng chiến của Đảng,
              quá trình chỉ đạo xây dựng thực lực & 2 chiến dịch bước ngoặt (1947–1950), cùng bài học vận dụng tự lực cánh sinh vào công nghệ bán dẫn (QĐ 1018/QĐ-TTg), trách nhiệm thế hệ trẻ và báo cáo minh bạch ứng dụng AI.
            </p>

            {/* 4-Part Quick Anchor Navigation */}
            <div className="pt-4 border-t border-[#dfd6c6] space-y-2.5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#9d242b]">
                Cấu trúc 4 phần bài học:
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {LESSON_PARTS.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => scrollToSection(part.startSec)}
                    className="p-3 rounded-2xl bg-[#fdfcf9] border border-[#dfd6c6] hover:border-[#9d242b] hover:bg-[#faebee]/40 transition-all text-left group shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#9d242b]">
                      <span>Phần {part.id}</span>
                      <span className="text-[#6e6761] font-normal text-[10px]">{part.range}</span>
                    </div>
                    <div className="font-serif font-bold text-xs sm:text-sm text-[#171513] group-hover:text-[#9d242b] transition-colors mt-0.5">
                      {part.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#dfd6c6] text-xs text-[#6e6761]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#171513]">12 mục bài học</span>
              </div>

              <button
                onClick={handlePrintExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fdfcf9] border border-[#dfd6c6] text-[#3a3530] font-semibold hover:bg-[#ede7dc] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In toàn bộ bài học (PDF)</span>
              </button>
            </div>
          </header>

          {/* ============================================================ */}
          {/* THE 12 CONTINUOUS SECTIONS (VARIED EDITORIAL COMPOSITIONS)    */}
          {/* ============================================================ */}
          <div className="space-y-16">
            {SLIDES.map((slide, idx) => {
              const photoBinding = getPhotoBindingForSlide(slide.id);
              const isEven = idx % 2 === 0;

              return (
                <section
                  key={slide.id}
                  id={`sec-${slide.id}`}
                  className="lesson-section scroll-mt-28 py-8 sm:py-12 border-t border-[#dfd6c6] space-y-6"
                >
                  {/* Section Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfd6c6]/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-[#9d242b] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
                        {slide.id < 10 ? `0${slide.id}` : slide.id}
                      </span>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#9d242b] bg-[#faebee] px-2.5 py-0.5 rounded-full border border-[#9d242b]/20">
                        {slide.section}
                      </span>
                      <span className="text-xs font-serif italic text-[#6e6761] hidden sm:inline">
                        • Phần {slide.part}: {slide.partTitle}
                      </span>
                    </div>
                  </div>

                  {/* Section Title & Subtitle */}
                  <div className="space-y-1">
                    <h2 className="font-sans font-bold text-2xl sm:text-3xl text-[#171513] leading-snug">
                      {LESSON_TITLES[slide.id - 1]}
                    </h2>
                    <p className="font-serif italic text-sm text-[#6e6761]">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* Dynamic Varied Editorial Layout */}
                  <div className={`grid grid-cols-1 md:grid-cols-12 gap-8 items-start ${isEven ? '' : ''}`}>
                    {/* Content Column (7 cols) */}
                    <div className={`${slide.content.groups ? 'md:col-span-12' : 'md:col-span-7'} space-y-4`}>
                      {slide.content.heading && (
                        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#9d242b]">
                          {slide.content.heading}:
                        </h4>
                      )}

                      <div className="space-y-3">
                        {slide.content.points.map((pt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#9d242b] flex-shrink-0 mt-2" />
                            <p className="text-sm sm:text-base text-[#171513] leading-relaxed">
                              {pt}
                            </p>
                          </div>
                        ))}
                      </div>

                      {slide.id === 12 && onSelectView && (
                        <div className="pt-2">
                          <button
                            onClick={() => onSelectView('appendix')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#9d242b] text-white text-xs font-semibold hover:bg-[#7a171d] shadow-sm transition-all"
                          >
                            <span>Xem toàn văn Phụ lục Minh bạch AI & Nguồn dẫn</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Archival Quote (if present) */}
                      {slide.content.archivalQuote && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede7dc]/40 border-l-4 border-l-[#9d242b] shadow-inner mt-4">
                          <p className="font-serif italic text-sm sm:text-base text-[#171513] leading-relaxed">
                            "{slide.content.archivalQuote.text}"
                          </p>
                          <p className="text-xs font-semibold text-[#9d242b] text-right mt-2 not-italic">
                            — {slide.content.archivalQuote.source}
                          </p>
                        </div>
                      )}

                      {/* Video Embed (if present) */}
                      {slide.content.videoEmbed && (
                        <div className="rounded-2xl border border-[#dfd6c6] bg-[#fdfcf9] overflow-hidden shadow-sm mt-5">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#f7f4ee] border-b border-[#dfd6c6]">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#9d242b] animate-pulse" />
                              <span className="font-serif font-bold text-xs sm:text-sm text-[#171513]">
                                {slide.content.videoEmbed.title}
                              </span>
                            </div>
                            <a
                              href={`https://www.youtube.com/watch?v=${slide.content.videoEmbed.youtubeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9d242b] hover:text-[#7a171d] hover:underline"
                            >
                              <span>Mở trên YouTube</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <div className="relative aspect-video w-full bg-black">
                            <iframe
                              className="w-full h-full"
                              src={`https://www.youtube-nocookie.com/embed/${slide.content.videoEmbed.youtubeId}?rel=0`}
                              title={slide.content.videoEmbed.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>

                          <div className="p-3.5 text-xs text-[#6e6761] italic flex flex-wrap items-center justify-between gap-2 bg-white border-t border-[#dfd6c6]/60">
                            <span className="text-[#3a3530] font-sans not-italic text-xs">
                              {slide.content.videoEmbed.caption}
                            </span>
                            <span className="font-mono text-[10px] text-[#9d242b] bg-[#faebee] px-2.5 py-0.5 rounded-full border border-[#9d242b]/20 not-italic font-bold">
                              Tư liệu lịch sử 19/12/1946
                            </span>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Archival Photo Card (5 cols) */}
                    <div className={slide.content.groups ? 'md:col-span-12' : 'md:col-span-5'}>
                      <div className={`p-3 sm:p-4 rounded-2xl bg-[#fdfcf9] border border-[#dfd6c6] shadow-sm ${slide.content.groups ? 'flex flex-col sm:flex-row gap-4 sm:items-center' : 'space-y-3'}`}>
                        <div className={`relative rounded-xl overflow-hidden aspect-[4/3] bg-[#0e201b] ${slide.content.groups ? 'w-full sm:w-48 shrink-0' : ''}`}>
                          <img
                            src={photoBinding.photo.src}
                            alt={photoBinding.specificCaption}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute top-2.5 left-2.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono font-medium border border-white/20">
                              {photoBinding.photo.date}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs px-1">
                          <h5 className="font-serif font-bold text-[#171513] text-sm leading-snug">
                            {photoBinding.specificCaption}
                          </h5>

                          <p className="text-[11px] text-[#3a3530] leading-relaxed">
                            {photoBinding.specificContext}
                          </p>

                          <div className="pt-2 border-t border-[#dfd6c6]/60 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#6e6761]">
                            <span>{photoBinding.photo.credit}</span>
                            <a
                              href={photoBinding.photo.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#9d242b] font-medium hover:underline"
                            >
                              <span>Kho lưu trữ gốc</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Structured Groups rendered full-width below the intro/photo grid */}
                  {slide.content.groups && slide.content.groups.length > 0 && (
                    <div className={`pt-2 ${slide.id === 8 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                      {slide.content.groups.map((grp, gIdx) => (
                        <div
                          key={gIdx}
                          className="p-4 sm:p-5 rounded-2xl bg-[#fdfcf9] border border-[#dfd6c6] shadow-xs space-y-2.5"
                        >
                          <h5 className="font-serif font-bold text-sm sm:text-base text-[#9d242b] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9d242b]" />
                            <span>{grp.title}</span>
                          </h5>
                          <div className="space-y-2 pl-3.5 border-l-2 border-[#dfd6c6]">
                            {grp.points.map((pt, ptIdx) => (
                              <p key={ptIdx} className="text-xs sm:text-sm text-[#3a3530] leading-relaxed">
                                {pt}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </section>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* CALL TO ACTION (CTA): GAME SIMULATION                         */}
          {/* ============================================================ */}
          {GAME_ENABLED ? (
            <section className="editorial-card p-8 sm:p-12 bg-gradient-to-br from-[#193b32] to-[#0e201b] text-white rounded-3xl shadow-xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#c99738] text-xs font-mono font-semibold uppercase tracking-wider border border-white/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hoạt động tiếp theo</span>
              </div>

              <div className="space-y-2">
                <h3 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-white">
                  Thử thách trắc nghiệm: Giải mã kháng chiến
                </h3>
                <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
                  Cùng tham gia thử thách 10 câu hỏi độc lập về lịch sử Đường lối kháng chiến toàn quốc (1946–1950), so tài kiến thức và tốc độ phản xạ trên điện thoại hoặc màn chiếu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-white/90">
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                  <span className="font-mono font-bold text-[#c99738]">01. Tham gia</span>
                  <p>Nhập mã phòng 6 ký tự hoặc quét mã QR bằng điện thoại để vào phòng thi đấu.</p>
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                  <span className="font-mono font-bold text-[#c99738]">02. Đua tốc độ</span>
                  <p>10 vòng thi đấu (60s/vòng): trắc nghiệm 4 màu và đuổi hình bắt chữ, tối đa ~6.000 điểm/vòng.</p>
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
                  <span className="font-mono font-bold text-[#c99738]">03. Vinh danh</span>
                  <p>Bảng vàng trực tiếp vinh danh các cá nhân có điểm số và tốc độ xuất sắc nhất.</p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4 border-t border-white/20">
                {onSelectView && (
                  <button
                    onClick={() => onSelectView('game')}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#9d242b] text-white text-sm font-semibold hover:bg-[#7a171d] shadow-lg transition-all"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Tham gia Giải mã kháng chiến</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => scrollToSection('sec-1')}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all border border-white/20"
                >
                  <span>Trở lại đầu bài học</span>
                  <span>↑</span>
                </button>
              </div>
            </section>
          ) : (
            <section className="editorial-card p-6 sm:p-8 bg-white border border-[#dfd6c6] rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-serif font-bold text-lg text-[#171513]">
                  Ôn lại bài học
                </h3>
                <p className="text-xs text-[#6e6761]">
                  Ôn lại các phần kiến thức hoặc xuất bản in PDF để theo dõi tài liệu.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintExport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#dfd6c6] text-xs font-semibold text-[#3a3530] hover:bg-[#ede7dc] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Xuất PDF Bản In</span>
                </button>
                <button
                  onClick={() => scrollToSection('sec-1')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#9d242b] text-white text-xs font-semibold hover:bg-[#7a171d] shadow-sm transition-colors"
                >
                  <span>Trở lại đầu bài học ↑</span>
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
