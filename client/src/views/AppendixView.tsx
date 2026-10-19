import React from 'react';
import { AIUsageRecord } from '../components/AIUsageRecord';
import { SOURCES } from '../data/sources';
import { HISTORICAL_PHOTOS } from '../data/historicalPhotos';
import {
  FileText,
  ShieldCheck,
  Bot,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Camera,
  Layers,
} from 'lucide-react';

export const AppendixView: React.FC = () => {
  const photoList = Object.values(HISTORICAL_PHOTOS);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Page Title */}
      <div className="text-center space-y-3 border-b border-[#dfd6c6] pb-8">
        <span className="text-xs font-mono font-bold uppercase text-[#9d242b] bg-[#faebee] px-3.5 py-1.5 rounded-full border border-[#9d242b]/20">
          Minh Bạch Học Thuật & Liêm Chính
        </span>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-[#171513]">
          Phụ Lục: Sử Dụng AI, Bản Quyền Hình Ảnh & Nguồn Dẫn
        </h1>
        <p className="text-xs sm:text-sm text-[#6e6761] max-w-2xl mx-auto font-serif italic">
          Báo cáo công khai về công cụ trí tuệ nhân tạo, quy trình thẩm định nội dung,
          danh mục hình ảnh tư liệu lịch sử và các văn kiện chính thống được trích dẫn.
        </p>
      </div>

      {/* AI Usage Statement */}
      <section className="editorial-card p-6 sm:p-8 border border-[#dfd6c6] space-y-6">
        <div className="flex items-center gap-3 border-b border-[#dfd6c6] pb-4">
          <Bot className="w-6 h-6 text-[#9d242b]" />
          <div>
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#171513]">
              Báo Cáo Minh Bạch Về Sử Dụng Trí Tuệ Nhân Tạo (AI Usage)
            </h2>
            <p className="text-xs text-[#6e6761]">
              Tuân thủ chuẩn mực liêm chính học thuật và hướng dẫn sử dụng AI có trách nhiệm
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#3a3530]">
          <div className="space-y-4">
            <div>
              <span className="font-bold text-[#171513] uppercase tracking-wide block mb-1.5">
                1. Công cụ & Mô hình thực tế đã vận hành:
              </span>
              <ul className="space-y-1.5 list-disc list-inside text-[#3a3530]">
                <li>
                  <strong>Hệ thống điều phối:</strong> Codex Coordinator phụ trách kiểm chứng quy trình, rà soát rubric và kiểm soát ranh giới an toàn.
                </li>
                <li>
                  <strong>Công cụ lập trình:</strong> OpenCode CLI sử dụng Claude Opus 4.6 (mức medium ban đầu). Khi Opus trả lỗi HTTP 503 đã chuyển sang mô hình dự phòng <strong>ag/gemini-3.8-flash-high</strong> để tiếp tục triển khai.
                </li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-[#171513] uppercase tracking-wide block mb-1.5">
                2. Mục đích & Phạm vi hỗ trợ của AI:
              </span>
              <p className="leading-relaxed">
                Hỗ trợ viết giao diện (React/TypeScript/Vite/Tailwind), backend Convex cho trò chơi "Giữ vững căn cứ",
                bài học cuộn dọc, bản in và danh mục trích dẫn. Bản Socket.IO được giữ để chạy cục bộ. AI <strong>không</strong> thay thế việc đọc giáo trình của sinh viên.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="font-bold text-[#171513] uppercase tracking-wide block mb-1.5">
                3. Các câu lệnh (Prompts) mẫu chính yếu:
              </span>
              <div className="p-3.5 bg-[#fdfcf9] rounded-xl border border-[#dfd6c6] font-mono text-[11px] space-y-1.5 text-[#6e6761]">
                <div>• "Làm game hợp tác 4 lượt, mỗi lượt 90 giây; chuyển phòng online sang project Convex riêng, giữ nguyên luật chơi."</div>
                <div>• "Trình bày bài học Chương 2 I.2 thành 12 mục cuộn dọc, dùng ảnh tư liệu có nguồn và bản in."</div>
                <div>• "Soạn thảo luận cứ đối chiếu câu hỏi dựa trên văn kiện chính thống 1946–1950..."</div>
              </div>
            </div>

            <div>
              <span className="font-bold text-[#171513] uppercase tracking-wide block mb-1.5">
                4. Trạng thái kiểm chứng của sinh viên:
              </span>
              <div className="p-3.5 bg-[#faebee] border border-[#9d242b]/30 rounded-xl text-[#9d242b] font-medium leading-relaxed">
                Toàn bộ nội dung hiện tại là <strong>Bản thảo sơ bộ (Draft)</strong> do công cụ hỗ trợ tổng hợp.
                Nhóm sinh viên có trách nhiệm trực tiếp đối chiếu từng luận điểm với Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021)
                và chịu trách nhiệm trước giảng viên về tính chính xác học thuật.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Usage Record Component */}
      <AIUsageRecord />

      {/* Draft Academic Integrity Commitment */}
      <section className="editorial-card p-6 sm:p-8 border-2 border-[#c99738] bg-[#fdfcf9] space-y-4">
        <div className="flex items-center gap-3 border-b border-[#dfd6c6] pb-3">
          <ShieldCheck className="w-6 h-6 text-[#c99738]" />
          <h2 className="font-serif font-bold text-xl text-[#171513]">
            Bản Nháp Cam Kết Liêm Chính Học Thuật (Academic Integrity)
          </h2>
        </div>

        <p className="text-xs text-[#3a3530] leading-relaxed italic">
          (Dành cho các thành viên trong nhóm ký duyệt và xác nhận trước khi nộp sản phẩm chính thức cho giảng viên môn học)
        </p>

        <div className="bg-white p-5 rounded-xl border border-[#dfd6c6] text-xs space-y-3 text-[#3a3530]">
          <p>
            1. Chúng em xin cam đoan sản phẩm báo cáo chuyên đề và hoạt động lớp này được xây dựng dựa trên sự trung thực học thuật,
            tuân thủ đúng đề cương và yêu cầu của giảng viên phụ trách học phần VNR202.
          </p>
          <p>
            2. Các công cụ trí tuệ nhân tạo (Codex, OpenCode) chỉ được sử dụng với vai trò trợ lý kỹ thuật lập trình và cấu trúc hóa nội dung.
            Mọi diễn giải lịch sử và số liệu liên hệ đều được các thành viên trong nhóm trực tiếp rà soát, kiểm chứng.
          </p>
          <p>
            3. Tuyệt đối không bịa đặt số trang giáo trình, không làm sai lệch văn kiện của Đảng, không sử dụng hình ảnh phục dựng sai chuẩn mực
            về lãnh tụ, cờ Tổ quốc hay bản đồ địa giới quốc gia.
          </p>

          <div className="pt-4 flex justify-between items-end border-t border-[#dfd6c6] text-xs text-[#6e6761]">
            <div>
              Ngày xác nhận: ........./........./202...
            </div>
            <div className="text-center">
              <div className="font-semibold text-[#171513]">Đại diện nhóm sinh viên</div>
              <div className="italic text-[11px] mt-6">(Ký và ghi rõ họ tên — Không ký thay)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Archival Image Attribution Directory (New Section) */}
      <section className="editorial-card p-6 sm:p-8 border border-[#dfd6c6] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dfd6c6] pb-4">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-[#193b32]" />
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#171513]">
                Danh Mục Bản Quyền & Nguồn Gốc Ảnh Tư Liệu Lịch Sử
              </h2>
              <p className="text-xs text-[#6e6761]">
                Bảo đảm tính xác thực lịch sử, trích nguồn trung thực và ghi nhận công lao các nhà nhiếp ảnh tư liệu
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-[#e8f0ec] text-[#193b32] rounded-full font-bold">
            6 Tư liệu lưu trữ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {photoList.map((photo) => (
            <div
              key={photo.id}
              className="p-4 rounded-xl bg-[#fdfcf9] border border-[#dfd6c6] flex flex-col sm:flex-row gap-4 items-start"
            >
              <div className="w-full sm:w-36 aspect-[4/3] rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                <img
                  src={photo.src}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif font-bold text-[#171513] text-sm leading-snug line-clamp-1">
                    {photo.caption}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#ede7dc] text-[#6e6761] flex-shrink-0">
                    {photo.date}
                  </span>
                </div>

                <p className="text-[11px] text-[#3a3530] leading-relaxed">
                  <strong>Bối cảnh & Giới hạn:</strong> {photo.context}
                </p>

                <p className="text-[11px] text-[#6e6761]">
                  <strong>Đơn vị sở hữu / Đăng tải:</strong> {photo.credit}
                </p>

                <div className="pt-2 border-t border-[#dfd6c6]/60">
                  <a
                    href={photo.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#9d242b] font-medium hover:underline text-[11px]"
                  >
                    <span>Truy cập nguồn lưu trữ gốc</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Official Bibliography & Citations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#dfd6c6] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#9d242b]" />
            <h2 className="font-serif font-bold text-xl text-[#171513]">
              Danh Mục Tài Liệu Tham Khảo Chính Thức
            </h2>
          </div>
          <span className="text-xs text-[#6e6761]">
            Xác minh theo nguồn chính thống của Đảng và Nhà nước
          </span>
        </div>

        <div className="space-y-3">
          {SOURCES.map((source) => (
            <div
              key={source.id}
              className="editorial-card p-4 sm:p-5 border border-[#dfd6c6] space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfd6c6]/60 pb-2">
                <span className="font-bold text-sm font-serif text-[#171513]">
                  {source.title}
                </span>
                <span className="text-[11px] font-semibold text-[#9d242b] bg-[#faebee] px-2.5 py-0.5 rounded-full border border-[#9d242b]/20">
                  {source.category}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#3a3530]">
                <div>
                  <span className="text-[#6e6761]">Tác giả / Cơ quan ban hành: </span>
                  <strong>{source.authorsOrAgency}</strong>
                </div>
                <div>
                  <span className="text-[#6e6761]">Đơn vị xuất bản / Cổng thông tin: </span>
                  <span>{source.publisherOrSite}</span> ({source.yearOrDate})
                </div>
              </div>

              <p className="text-[#3a3530] leading-relaxed pt-1">
                {source.description}
              </p>

              <div className="pt-2 border-t border-[#dfd6c6]/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-[#9d242b] font-medium flex items-center gap-1">
                  <span>Trạng thái: {source.verificationStatus}</span>
                </div>

                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9d242b] underline hover:text-[#7a171d] inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Truy cập văn bản chính thống</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
