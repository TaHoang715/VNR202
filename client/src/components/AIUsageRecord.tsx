import React, { useState } from 'react';

const records = [
  { task: 'Nội dung & bài học', tool: 'Codex + OpenCode (Opus 4.6 medium, sau đó Gemini Flash High)', prompt: 'Soạn 12 mục đúng Chương 2 I.2, có nguồn, liên hệ và AI Usage; không bịa số trang hay xác nhận của sinh viên.', result: 'Bản thảo 12 mục cuộn dọc, ghi chú người nói, danh mục nguồn và bản in. Chưa được sinh viên duyệt theo giáo trình.' },
  { task: 'Game & giao diện', tool: 'OpenCode qua 9Router; Codex điều phối và review', prompt: 'Chuyển sang trò chơi cá nhân Giải mã kháng chiến (10 câu trắc nghiệm, solo tức thì và online Convex, tính điểm 1000 + 250 tốc độ, tích hợp khảo sát bài học).', result: 'Website và backend Convex chuyên biệt; thi đấu cá nhân độc lập, câu hỏi tư liệu và sắp xếp mốc thời gian, bảo vệ token và kết nối lại an toàn.' },
  { task: 'Kiểm chứng & kiểm thử', tool: 'Codex, công cụ web/trình duyệt; OpenCode hỗ trợ sửa lỗi', prompt: 'Đối chiếu nguồn chính thống; kiểm tra build, nhiều client, thao tác giao diện, nêu đúng giới hạn tiếp cận tài liệu.', result: 'Đã đọc các trang nguồn trực tuyến và chạy kiểm thử kỹ thuật. Chưa tiếp cận toàn văn giáo trình chính; nhóm phải tự đối chiếu nội dung học thuật.' },
];

export function AIUsageRecord() {
  const [edits, setEdits] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('vnr202_student_edits') || '[]'); return Array.isArray(saved) ? saved.map(value => typeof value === 'string' ? value : '') : []; } catch { return []; }
  });
  function update(index: number, value: string) {
    const next = [...edits]; next[index] = value; setEdits(next);
    localStorage.setItem('vnr202_student_edits', JSON.stringify(next));
  }
  return <section className="space-y-3 text-xs ai-usage-record">
    <h3 className="font-bold text-sm">Kết quả AI và phần sinh viên chỉnh sửa</h3>
    <p>Prompt dưới đây là tóm lược yêu cầu thực tế, không phải bản chép nguyên văn. Phần sinh viên tự nhập được lưu trên trình duyệt này; xuất lại PDF sau khi cập nhật.</p>
    {records.map((record, index) => <article key={record.task} className="border rounded p-3 space-y-2 bg-white">
      <h4 className="font-bold">{index + 1}. {record.task}</h4>
      <p><strong>Công cụ:</strong> {record.tool}</p>
      <p><strong>Yêu cầu chính:</strong> {record.prompt}</p>
      <p><strong>Kết quả AI / điều phối:</strong> {record.result}</p>
      <label className="block no-print" htmlFor={`student-edits-${index}`}>Sinh viên ghi phần đã sửa, nguồn/tập/trang đã đối chiếu và người kiểm tra:</label>
      <textarea id={`student-edits-${index}`} className="no-print w-full border rounded p-2" rows={3} value={edits[index] || ''} onChange={event => update(index, event.target.value)} placeholder="Chưa có ghi nhận sinh viên chỉnh sửa hoặc kiểm chứng." />
      <p className="student-review-print"><strong>Ghi nhận của sinh viên:</strong> {edits[index] || 'Chưa có ghi nhận sinh viên chỉnh sửa hoặc kiểm chứng.'}</p>
    </article>)}
  </section>;
}
