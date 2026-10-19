export interface SourceItem {
  id: string;
  category: 'Chính thống bắt buộc' | 'Tư liệu văn kiện Đảng' | 'Tài liệu bổ trợ' | 'Thực tiễn hiện nay';
  title: string;
  authorsOrAgency: string;
  publisherOrSite: string;
  yearOrDate: string;
  url?: string;
  verificationStatus: string;
  description: string;
}

export const SOURCES: SourceItem[] = [
  {
    id: 'moet-2021',
    category: 'Chính thống bắt buộc',
    title: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam (Dành cho bậc đại học hệ không chuyên lý luận chính trị)',
    authorsOrAgency: 'Bộ Giáo dục và Đào tạo (PGS.TS. Nguyễn Trọng Phúc chủ biên)',
    publisherOrSite: 'Nhà xuất bản Chính trị quốc gia Sự thật, Hà Nội',
    yearOrDate: 'Tháng 6/2021 (440 trang)',
    url: 'https://www.nxbctqg.org.vn/giao-trinh-lich-su-dang-cong-san-viet-nam-danh-cho-bac-dai-hoc-he-khong-chuyen-ly-luan-chinh-tri-.html',
    verificationStatus: 'Bản nháp — Nhóm sinh viên chưa tiếp cận bản số hóa toàn văn, cần đối chiếu trực tiếp trên bản in giáo trình',
    description: 'Nguồn giáo trình cốt lõi quy định thuật ngữ, kết cấu Chương 2, Mục I.2 về Đường lối kháng chiến toàn quốc và quá trình tổ chức thực hiện (1946–1950). Website không bịa đặt số trang khi chưa có bản in đối chiếu.',
  },
  {
    id: 'dang-military-1946',
    category: 'Tư liệu văn kiện Đảng',
    title: 'Nghị quyết Hội nghị quân sự toàn quốc của Đảng (Ngày 19-10-1946)',
    authorsOrAgency: 'Ban Chấp hành Trung ương Đảng (Khóa I)',
    publisherOrSite: 'Hệ thống Tư liệu - Văn kiện Đảng, Báo điện tử Đảng Cộng sản Việt Nam',
    yearOrDate: '19/10/1946 (Truy cập trực tuyến 2026)',
    url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/hoi-nghi-bch-trung-uong/khoa-i/nghi-quyet-hoi-nghi-quan-su-toan-quoc-cua-dang-ngay-19-10-1946-677',
    verificationStatus: 'Đã xác minh trích yếu và trích đoạn trực tuyến; nhóm cần đối chiếu toàn văn trên bản in',
    description: 'Văn kiện quan trọng chuẩn bị về tư tưởng, lực lượng quân sự và thế trận phòng thủ trước khi bước vào Toàn quốc kháng chiến.',
  },
  {
    id: 'dang-chronology-t3',
    category: 'Tư liệu văn kiện Đảng',
    title: 'Lịch sử biên niên Đảng Cộng sản Việt Nam (Tập 3: 1945–1954)',
    authorsOrAgency: 'Viện Lịch sử Đảng — Học viện Chính trị quốc gia Hồ Chí Minh',
    publisherOrSite: 'NXB Chính trị quốc gia Sự thật / Cổng Thông tin Tư liệu Văn kiện Đảng',
    yearOrDate: '2008 / Bản số hóa trực tuyến',
    url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176',
    verificationStatus: 'Đã xác minh biên niên các mốc 12/12/1946, 18-19/12/1946 và chiến dịch Việt Bắc 1947',
    description: 'Cung cấp ngày tháng chính xác và diễn biến các cuộc họp Trung ương, Lời kêu gọi Toàn quốc kháng chiến và các quyết định chiến lược.',
  },
  {
    id: 'hcm-city-propaganda',
    category: 'Tư liệu văn kiện Đảng',
    title: 'Kháng chiến toàn dân, toàn diện, trường kỳ, dựa vào sức mình là chính',
    authorsOrAgency: 'Ban Tuyên giáo Thành ủy Thành phố Hồ Chí Minh',
    publisherOrSite: 'Trang tin điện tử Đảng bộ TP. Hồ Chí Minh',
    yearOrDate: '12/2016',
    url: 'https://hcmcpv.org.vn/tin-tap-chi/thong-tin-tuyen-truyen-12-2016/khang-chien-toan-dan-toan-dien-truong-ky-dua-vao-suc-minh-la-chinh-1486349354',
    verificationStatus: 'Đã xác minh trực tuyến từ nguồn chính thức của cơ quan Đảng địa phương',
    description: 'Tài liệu tuyên truyền chính thống làm sáng tỏ các luận điểm toàn dân, toàn diện, trường kỳ và chiến thắng Việt Bắc Thu - Đông 1947.',
  },
  {
    id: 'war-summary-2008',
    category: 'Tài liệu bổ trợ',
    title: 'Chiến tranh cách mạng Việt Nam 1945–1975: Thắng lợi và bài học',
    authorsOrAgency: 'Ban Chỉ đạo Tổng kết chiến tranh trực thuộc Bộ Chính trị',
    publisherOrSite: 'Nhà xuất bản Chính trị quốc gia, Hà Nội',
    yearOrDate: '2008',
    verificationStatus: 'Tài liệu bổ trợ theo đề cương — Chờ nhóm sinh viên đối chiếu bản in tại thư viện',
    description: 'Tài liệu tổng kết khoa học về nghệ thuật chiến dịch, xây dựng lực lượng vũ trang nhân dân và vai trò của căn cứ địa kháng chiến.',
  },
  {
    id: 'hcm-works',
    category: 'Tài liệu bổ trợ',
    title: 'Hồ Chí Minh: Toàn tập (Tập 4 và Tập 5)',
    authorsOrAgency: 'Viện Hồ Chí Minh và các lãnh tụ của Đảng',
    publisherOrSite: 'Nhà xuất bản Chính trị quốc gia Sự thật, Hà Nội',
    yearOrDate: '2011',
    verificationStatus: 'Bản nháp — Chờ nhóm sinh viên đối chiếu bản in chính thức của Nhà xuất bản',
    description: 'Nguồn tư liệu gốc trích dẫn tư tưởng chỉ đạo của Chủ tịch Hồ Chí Minh trong giai đoạn 1946–1950.',
  },
  {
    id: 'gov-yagi-2024',
    category: 'Thực tiễn hiện nay',
    title: 'Thủ tướng chỉ đạo khẩn trương triển khai ứng phó bão số 3 (bão Yagi) — Công điện số 86/CĐ-TTg',
    authorsOrAgency: 'Thủ tướng Chính phủ (Phạm Minh Chính ký)',
    publisherOrSite: 'Cổng Thông tin điện tử Chính phủ / Báo điện tử Xây dựng Chính sách',
    yearOrDate: 'Ngày 03/9/2024',
    url: 'https://xaydungchinhsach.chinhphu.vn/thu-tuong-chi-dao-khan-truong-ung-pho-bao-so-3-bao-yagi-119240903121402583.htm',
    verificationStatus: 'Đã xác minh đầy đủ toàn văn công điện chính thống trên Cổng thông tin Chính phủ',
    description: 'Minh chứng cho bài học về tinh thần chuẩn bị từ sớm, phương châm "4 tại chỗ", dự phòng nguồn lực và điều phối hiệp đồng liên ngành trong ứng phó thiên tai.',
  },
];
