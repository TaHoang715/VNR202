import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

interface VerificationItem {
  category: string;
  tool: string;
  aiRole: string;
  humanVerification: string;
}

const VERIFICATION_DATA: VerificationItem[] = [
  {
    category: 'Giao diện & Trực quan hóa',
    tool: 'Claude / Codex / Gemini',
    aiRole: 'Hỗ trợ viết mã nguồn giao diện (React, TypeScript, CSS) và bố cục hiển thị bài học.',
    humanVerification: 'Nhóm tùy biến giao diện, kiểm thử trải nghiệm trên các thiết bị và tối ưu khả năng trình chiếu.',
  },
  {
    category: 'Cấu trúc & Dàn trang nội dung',
    tool: 'Trợ lý AI lập trình',
    aiRole: 'Hỗ trợ định dạng 12 mục chuyên đề và sắp xếp thông tin trực quan theo thẻ.',
    humanVerification: 'Nhóm trực tiếp đối chiếu từng mục theo Chương 2 (Mục I.2) Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021).',
  },
  {
    category: 'Tư liệu lịch sử & Văn kiện',
    tool: 'Công cụ đối chiếu',
    aiRole: 'Hỗ trợ tìm kiếm nhanh văn bản mở và liên kết nguồn chính thống trực tuyến.',
    humanVerification: 'Nhóm trực tiếp xác minh nguồn gốc từng bức ảnh tư liệu (Bảo tàng Hồ Chí Minh, Thông tấn xã) và số hiệu văn kiện Đảng.',
  },
];

export const AIUsageRecord: React.FC = () => {
  return (
    <section className="space-y-4 editorial-card p-6 border border-[#dfd6c6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dfd6c6] pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#9d242b]" />
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#171513]">
            Bảng Phân Định Vai Trò AI & Trách Nhiệm Thẩm Định Của Sinh Viên
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#faebee] text-[#9d242b] font-semibold border border-[#9d242b]/20 self-start sm:self-auto">
          Cơ chế Human-in-the-loop
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#dfd6c6] bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f7f4ee] border-b border-[#dfd6c6] font-semibold text-[#171513]">
            <tr>
              <th className="py-3 px-3 sm:px-4">Hạng mục công việc</th>
              <th className="py-3 px-3 sm:px-4">Công cụ AI hỗ trợ</th>
              <th className="py-3 px-3 sm:px-4">Phạm vi hỗ trợ của AI</th>
              <th className="py-3 px-3 sm:px-4 text-[#9d242b]">Thẩm định & Kiểm chứng bởi nhóm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dfd6c6]/60 text-[#3a3530]">
            {VERIFICATION_DATA.map((item, idx) => (
              <tr key={idx} className="hover:bg-[#fdfcf9] transition-colors">
                <td className="py-3.5 px-3 sm:px-4 font-semibold text-[#171513] whitespace-nowrap">
                  {idx + 1}. {item.category}
                </td>
                <td className="py-3.5 px-3 sm:px-4 font-mono text-[11px] text-[#6e6761] whitespace-nowrap">
                  {item.tool}
                </td>
                <td className="py-3.5 px-3 sm:px-4 leading-relaxed">
                  {item.aiRole}
                </td>
                <td className="py-3.5 px-3 sm:px-4 leading-relaxed bg-[#faebee]/25 font-medium text-[#171513]">
                  <span className="inline-flex items-center gap-1.5 text-[#193b32] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#193b32] flex-shrink-0" />
                    <span>{item.humanVerification}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
