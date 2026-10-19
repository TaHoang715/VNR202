import React, { useState, useEffect } from 'react';
import { SLIDES, SlideData } from '../data/slides';
import { SOURCES } from '../data/sources';
import { getSocket } from '../socket';
import { createOnlineQuizPoll, closeOnlineQuizPoll, isQuizConvexAvailable } from '../quizConvex';
import { AIUsageRecord } from '../components/AIUsageRecord';
import { PollSnapshot } from '../types';
import { ViewType } from '../components/Navbar';
import { getPhotoBindingForSlide } from '../data/historicalPhotos';
import {
  BookOpen,
  FileText,
  ExternalLink,
  Vote,
  Sparkles,
  Gamepad2,
  ArrowRight,
  Printer,
  List,
} from 'lucide-react';

const LESSON_TITLES = [
  'Khái quát bài học', 'Bối cảnh & quyết định kháng chiến', 'Ba văn kiện nền tảng',
  'Tính chất & mục tiêu', 'Kháng chiến toàn dân', 'Kháng chiến toàn diện',
  'Trường kỳ & tự lực cánh sinh', 'Căn cứ địa & hậu phương', 'Các chiến dịch 1947–1950',
  'Ý nghĩa & bài học kinh nghiệm', 'Liên hệ thực tiễn hôm nay', 'Kết luận & hoạt động lớp học',
];

interface PresentationViewProps {
  onSelectView?: (view: ViewType) => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ onSelectView }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-1');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [pollMessage, setPollMessage] = useState('');
  const [poll, setPoll] = useState<PollSnapshot | null>(null);

  // Sync with host room poll state
  useEffect(() => {
    const socket = getSocket();
    const sync = () => {
      const roomCode = localStorage.getItem('vnr202_host_room');
      const hostToken = localStorage.getItem('vnr202_host_token');
      if (roomCode && hostToken) {
        socket.emit('host:reconnect', { roomCode, hostToken }, (response: any) => {
          if (response.ok) setPoll(response.poll || null);
        });
      }
    };
    socket.on('poll:update', setPoll);
    socket.on('connect', sync);
    sync();
    return () => {
      socket.off('poll:update', setPoll);
      socket.off('connect', sync);
    };
  }, []);

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

  const handleLaunchPoll = async (slideId: number) => {
    const isSlide7 = slideId === 7;
    const pollName = isSlide7 ? 'Khảo sát 2: Trường kỳ' : 'Khảo sát 1: Toàn dân';
    const question = isSlide7
      ? 'Theo bạn, yếu tố quyết định nhất để thực hiện thắng lợi "Trường kỳ kháng chiến" là gì?'
      : 'Theo bạn, yếu tố nào là cội nguồn sức mạnh lớn nhất trong kháng chiến toàn dân?';
    const options = isSlide7
      ? [
          'Dựa vào sức mình là chính, bồi dưỡng sức dân',
          'Bẻ gãy âm mưu đánh nhanh thắng nhanh của địch',
          'Tích cực củng cố căn cứ địa và hậu phương',
          'Tranh thủ sự ủng hộ của phong trào hòa bình quốc tế',
        ]
      : [
          'Khối đại đoàn kết toàn dân tộc',
          'Nghệ thuật quân sự ba thứ quân',
          'Lòng tin son sắt vào sự lãnh đạo của Đảng',
          'Nền kinh tế tự cấp tự túc tại chỗ',
        ];

    // Priority 1: Check active online quiz room (Giải mã kháng chiến)
    const quizRoomCode = localStorage.getItem('vnr202_quiz_host_room');
    const quizHostToken = localStorage.getItem('vnr202_quiz_host_token');

    if (quizRoomCode && quizHostToken && isQuizConvexAvailable()) {
      try {
        const resp = await createOnlineQuizPoll({
          roomCode: quizRoomCode,
          hostToken: quizHostToken,
          question,
          options,
        });
        if (resp.ok) {
          setPollMessage(`Đã kích hoạt cuộc thăm dò ý kiến (${pollName}) tới toàn bộ người chơi trong phòng ${quizRoomCode}!`);
          return;
        } else {
          setPollMessage('Lỗi kích hoạt khảo sát: ' + (resp.error || 'Vui lòng kiểm tra phòng'));
          return;
        }
      } catch (err: any) {
        setPollMessage('Lỗi kết nối khảo sát: ' + (err.message || String(err)));
        return;
      }
    }

    // Priority 2: Fallback to socket legacy room if present
    const legacyRoomCode = localStorage.getItem('vnr202_host_room');
    const legacyHostToken = localStorage.getItem('vnr202_host_token');

    if (legacyRoomCode && legacyHostToken) {
      const socket = getSocket();
      socket.emit(
        'poll:create',
        {
          roomCode: legacyRoomCode,
          hostToken: legacyHostToken,
          question,
          options,
        },
        (resp: any) => {
          if (resp.ok) {
            setPollMessage(`Đã kích hoạt cuộc thăm dò ý kiến (${pollName}) trên điện thoại của lớp học!`);
          } else {
            setPollMessage('Lỗi kích hoạt khảo sát: ' + (resp.error || 'Vui lòng kiểm tra mã chủ phòng'));
          }
        }
      );
      return;
    }

    setPollMessage('Vui lòng tạo phòng thi trước (tại thẻ Game -> Chủ phòng) để nhận mã phòng trước khi kích hoạt khảo sát lớp học.');
  };

  // Printable whole article output
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
            Học phần Lịch sử Đảng Cộng sản Việt Nam • Toàn văn 12 phần bài học kèm ảnh tư liệu, nguồn dẫn, ghi chú người nói và 2 phụ lục
          </p>
        </div>

        {SLIDES.map((slide, idx) => {
          const binding = getPhotoBindingForSlide(slide.id);
          return (
            <article key={slide.id} className="slide-container p-8 border border-gray-300 rounded-2xl bg-[#fdfcf9] space-y-4">
              <div className="flex justify-between items-center text-xs text-gray-500 border-b border-gray-200 pb-2">
                <span className="font-semibold text-[#9d242b] uppercase font-mono">
                  Phần {idx + 1} / 12 — {slide.section}
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

                  {slide.content.archivalQuote && (
                    <blockquote className="p-3 bg-[#ede7dc]/40 border-l-4 border-[#9d242b] rounded-r text-xs italic">
                      "{slide.content.archivalQuote.text}"
                      <footer className="text-[10px] text-gray-600 mt-1 not-italic font-semibold">
                        — {slide.content.archivalQuote.source}
                      </footer>
                    </blockquote>
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

              <div className="pt-3 border-t border-gray-200 text-[11px] text-gray-700">
                <strong>Ghi chú người nói: </strong> {slide.speakerNotes}
              </div>

              <div className="text-[10px] text-gray-500">
                <strong>Nguồn trích dẫn: </strong>
                {slide.sources.map((s, sIdx) => (
                  <span key={sIdx}>
                    {s.label} ({s.note}){sIdx < slide.sources.length - 1 ? '; ' : ''}
                  </span>
                ))}
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
            <p><strong>1. Công cụ & Mô hình thực tế:</strong> Codex kết hợp OpenCode (Claude Opus 4.6 medium ban đầu; chuyển sang ag/gemini-3.8-flash-high khi Opus trả HTTP 503).</p>
            <p><strong>2. Mục đích:</strong> Hỗ trợ thiết kế mã nguồn website, máy chủ thời gian thực Socket.IO cho trò chơi giáo dục và định dạng dàn trang bài học.</p>
            <p><strong>3. Trách nhiệm học thuật:</strong> Toàn bộ nội dung sự kiện, văn kiện và diễn giải lịch sử là Bản thảo (Draft) cần sinh viên trực tiếp đối chiếu giáo trình bản in (NXB Chính trị quốc gia Sự thật, 2021) trước khi trình bày và nộp cho giảng viên.</p>
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
      {/* Top Reading Progress Indicator */}
      <div className="fixed top-[var(--site-header-height,80px)] left-0 right-0 h-1 bg-[#ede7dc] z-30 pointer-events-none no-print">
        <div
          className="h-full bg-[#9d242b] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

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
                      <button
                        key={slide.id}
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

                  {onSelectView && (
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
              Nội dung gồm bối cảnh lịch sử tháng 12/1946, 3 văn kiện nền tảng định hình đường lối,
              bốn nội dung cốt lõi của chiến tranh nhân dân, hai chiến dịch lớn 1947–1950 và bài học vận dụng hôm nay.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#dfd6c6] text-xs text-[#6e6761]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#171513]">12 mục</span>
                <span>•</span>
                <span>Đọc liền mạch</span>
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

          {pollMessage && <div role="status" className="no-print rounded-2xl border border-[#9d242b]/30 bg-[#faebee] p-4 text-sm text-[#7a171d]">{pollMessage}<button className="ml-3 underline" onClick={() => setPollMessage('')}>Đóng</button></div>}
          {/* ACTIVE IN-TALK POLL FLOATING NOTIFICATION (IF POLL IS ACTIVE) */}
          {poll && poll.active && (
            <div className="sticky top-20 z-20 no-print editorial-card p-4 border-2 border-[#9d242b] bg-[#fdfcf9] shadow-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#9d242b] flex items-center gap-1.5">
                  <Vote className="w-4 h-4" />
                  <span>Khảo sát lớp đang diễn ra: {poll.question}</span>
                </h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#faebee] text-[#9d242b] font-bold">
                  {poll.totalVotes} lượt phản hồi
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {poll.options.map((opt, i) => {
                  const count = poll.voteCounts[i] || 0;
                  const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                  return (
                    <div key={opt} className="p-2 bg-white rounded border border-[#dfd6c6]">
                      <div className="flex justify-between font-medium">
                        <span className="truncate">{opt}</span>
                        <span className="font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-[#9d242b]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-right pt-1">
                <button
                  onClick={async () => {
                    const quizRoomCode = localStorage.getItem('vnr202_quiz_host_room');
                    const quizHostToken = localStorage.getItem('vnr202_quiz_host_token');
                    if (quizRoomCode && quizHostToken && isQuizConvexAvailable()) {
                      await closeOnlineQuizPoll({
                        roomCode: quizRoomCode,
                        hostToken: quizHostToken,
                        pollId: poll.id,
                      });
                    } else {
                      getSocket().emit('poll:close', {
                        roomCode: localStorage.getItem('vnr202_host_room'),
                        hostToken: localStorage.getItem('vnr202_host_token'),
                        pollId: poll.id,
                      }, () => {});
                    }
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#9d242b] text-white hover:bg-[#7a171d]"
                >
                  Đóng cuộc khảo sát
                </button>
              </div>
            </div>
          )}

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
                    <div className="md:col-span-7 space-y-4">
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

                      {/* Interactive Poll Launcher Widget (In Slide 5 & 7) */}
                      {slide.hasInteractivePoll && (
                        <div className="no-print p-4 rounded-2xl bg-[#faebee]/60 border border-[#9d242b]/30 space-y-3 mt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#9d242b]">
                              <Vote className="w-4 h-4" />
                              <span>Khảo Sát Lớp Học Tương Tác</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#9d242b] border border-[#9d242b]/20">
                              Lồng ghép trong bài
                            </span>
                          </div>

                          <p className="text-xs text-[#3a3530]">
                            {slide.id === 7
                              ? 'Câu hỏi khảo sát: Theo bạn, yếu tố quyết định nhất để thực hiện thắng lợi "Trường kỳ kháng chiến" là gì?'
                              : 'Câu hỏi khảo sát: Theo bạn, yếu tố nào là cội nguồn sức mạnh lớn nhất trong kháng chiến toàn dân?'}
                          </p>

                          <button
                            onClick={() => handleLaunchPoll(slide.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9d242b] text-white text-xs font-semibold rounded-full hover:bg-[#7a171d] shadow-sm transition-all"
                          >
                            <Vote className="w-3.5 h-3.5" />
                            <span>Kích hoạt câu hỏi trên điện thoại của lớp</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Archival Photo Card (5 cols) */}
                    <div className="md:col-span-5">
                      <div className="p-3 sm:p-4 rounded-2xl bg-[#fdfcf9] border border-[#dfd6c6] shadow-sm space-y-3">
                        <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#0e201b]">
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

                  {/* Expandable Speaker Notes in Section */}
                  <details className="group rounded-xl border border-[#dfd6c6] bg-[#fdfcf9] overflow-hidden no-print">
                    <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs font-semibold text-[#9d242b] hover:bg-[#ede7dc]/40 select-none">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ghi chú diễn giải của người nói (Phần {slide.id})</span>
                      </span>
                      <span className="text-[10px] text-[#6e6761] group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </summary>
                    <div className="px-4 py-3 border-t border-[#dfd6c6]/60 text-xs text-[#171513] font-serif italic bg-white/60 leading-relaxed">
                      "{slide.speakerNotes}"
                    </div>
                  </details>

                  {/* Section Footnote: Sources & Citations */}
                  <div className="pt-3 border-t border-[#dfd6c6]/60 text-xs text-[#6e6761] flex flex-wrap items-center justify-between gap-2">
                    <div className="space-x-2">
                      <span className="font-semibold text-[#3a3530]">Nguồn dẫn:</span>
                      {slide.sources.map((s, sIdx) => (
                        <span key={sIdx} className="inline-flex items-center gap-1">
                          {s.url ? (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#9d242b] underline hover:text-[#7a171d] inline-flex items-center gap-0.5 font-medium"
                            >
                              {s.label}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span>{s.label}</span>
                          )}
                          <span className="text-[11px] text-[#6e6761]">({s.note})</span>
                          {sIdx < slide.sources.length - 1 ? '; ' : ''}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] italic text-[#9d242b]">
                      * Bản thảo học tập VNR202
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* CALL TO ACTION (CTA): GAME SIMULATION                         */}
          {/* ============================================================ */}
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
                <p>10 câu hỏi độc lập (25s/câu): 1.000 điểm chuẩn + 250 điểm thưởng tốc độ.</p>
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
        </main>
      </div>
    </div>
  );
};
