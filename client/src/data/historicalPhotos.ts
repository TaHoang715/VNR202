export interface HistoricalPhoto {
  id: string;
  file: string;
  src: string;
  caption: string;
  date: string;
  credit: string;
  source: string;
  context: string;
}

export interface SlidePhotoBinding {
  slideId: number;
  photo: HistoricalPhoto;
  specificCaption: string;
  specificContext: string;
  note: string;
}

const rawBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
export const resolveAssetPath = (path: string) => `${baseUrl}${path.replace(/^\/+/, '')}`;

export const HISTORICAL_PHOTOS: Record<string, HistoricalPhoto> = {
  hanoi1946: {
    id: 'hanoi1946',
    file: 'hanoi-1946.jpg',
    src: resolveAssetPath('images/history/hanoi-1946.jpg'),
    caption: 'Chiến đấu tại Hà Nội những ngày đầu Toàn quốc kháng chiến, 1946–1947.',
    date: '1946–1947',
    credit: 'Ảnh tư liệu / Báo Quân đội nhân dân',
    source: 'https://www.qdnd.vn/quoc-phong-an-ninh/nghe-thuat-quan-su-vn/van-dung-sang-tao-linh-hoat-cac-hinh-thuc-tac-chien-trong-thanh-pho-678828',
    context: 'Bối cảnh kháng chiến toàn quốc, chiến đấu trong đô thị',
  },
  hochiminh1950: {
    id: 'hochiminh1950',
    file: 'ho-chi-minh-dong-khe-1950.jpeg',
    src: resolveAssetPath('images/history/ho-chi-minh-dong-khe-1950.jpeg'),
    caption: 'Chủ tịch Hồ Chí Minh trên đài quan sát núi Báo Đông trong Chiến dịch Biên giới, tháng 9/1950.',
    date: '09/1950',
    credit: 'Ảnh tư liệu, đăng tại Bảo tàng Hồ Chí Minh',
    source: 'https://baotanghochiminh.vn/di-tich-nui-bao-dong-noi-chu-tich-ho-chi-minh-quan-sat-tran-danh-don-dong-khe-chien-dich-bien-gioi-1950.htm',
    context: 'Chiến dịch Biên giới 1950, lãnh đạo kháng chiến; không dùng làm ảnh minh họa cho sự kiện 1946',
  },
  porters1950: {
    id: 'porters1950',
    file: 'dan-cong-bien-gioi-1950.jpg',
    src: resolveAssetPath('images/history/dan-cong-bien-gioi-1950.jpg'),
    caption: 'Dân công phục vụ Chiến dịch Biên giới năm 1950.',
    date: '1950',
    credit: 'Ảnh tư liệu / Báo Cao Bằng',
    source: 'https://baocaobang.vn/Cao-Bang-cung-ca-nuoc-tien-hanh-hai-cuoc-KC-chong-Phap-va-My-xam-luoc-36827.html',
    context: 'Vai trò hậu cần và huy động nhân dân; ảnh 1950 dùng minh họa nguyên tắc, không khẳng định chụp 1946',
  },
  yagi2024: {
    id: 'yagi2024',
    file: 'cuu-ho-yagi-2024.jpg',
    src: resolveAssetPath('images/history/cuu-ho-yagi-2024.jpg'),
    caption: 'Lực lượng cứu hộ hỗ trợ người dân tại khu vực bị ảnh hưởng bởi bão Yagi, tháng 9/2024.',
    date: '09/2024',
    credit: 'VOV, bài ảnh về ứng phó bão Yagi',
    source: 'https://english.vov.vn/en/multimedia/photos/competent-agencies-lend-a-helping-hand-to-people-in-yagi-hit-localities-post1120333.vov',
    context: 'Liên hệ hiện nay: ứng phó thiên tai, không đồng nhất với chiến tranh',
  },
  semiconductor2024: {
    id: 'semiconductor2024',
    file: 'semiconductor-training.jpg',
    src: resolveAssetPath('images/history/semiconductor-training.jpg'),
    caption: 'Khởi động chương trình đào tạo nhân lực vi mạch bán dẫn tại Đà Nẵng, ngày 26/3/2024.',
    date: '26/03/2024',
    credit: 'Ảnh đăng trên Cổng thông tin điện tử Bộ Khoa học và Công nghệ (bài gốc Mic.gov.vn)',
    source: 'https://mst.gov.vn/da-nang-khoi-dong-chuong-trinh-dao-tao-nhan-luc-vi-mach-ban-dan-197240401103958705.htm',
    context: 'Hoạt động đào tạo nhân lực vi mạch bán dẫn tại Trường Đại học Công nghệ Thông tin và Truyền thông Việt–Hàn, Đại học Đà Nẵng; minh họa thực tế cho nỗ lực chuẩn bị nguồn lực nội sinh, không khẳng định đã đạt mục tiêu 50.000 người.',
  },
  border1950: {
    id: 'border1950',
    file: 'chien-dich-bien-gioi-1950.jpg',
    src: resolveAssetPath('images/history/chien-dich-bien-gioi-1950.jpg'),
    caption: 'Bộ đội trong Chiến dịch Biên giới Thu–Đông năm 1950.',
    date: '1950',
    credit: 'Ảnh tư liệu / Thông tấn xã Việt Nam',
    source: 'https://nvsk.vnanet.vn/photo-chien-dich-bien-gioi-chien-dich-le-hong-phong-ii-16-9-14-10-1950-1-39042.vna',
    context: 'Chiến dịch Biên giới, tổ chức lực lượng; không tự gán vị trí trận đánh ngoài metadata',
  },
  journey1950: {
    id: 'journey1950',
    file: 'hanh-quan-1950.jpeg',
    src: resolveAssetPath('images/history/hanh-quan-1950.jpeg'),
    caption: 'Chủ tịch Hồ Chí Minh trên đường đi Chiến dịch Biên giới năm 1950.',
    date: '1950',
    credit: 'Ảnh tư liệu / Bảo tàng Hồ Chí Minh',
    source: 'https://baotanghochiminh.vn/di-tich-nui-bao-dong-noi-chu-tich-ho-chi-minh-quan-sat-tran-danh-don-dong-khe-chien-dich-bien-gioi-1950.htm',
    context: 'Hành quân, lãnh đạo kháng chiến; không gán thành ảnh 1946',
  },
};

export const SLIDE_PHOTO_BINDINGS: Record<number, SlidePhotoBinding> = {
  1: {
    slideId: 1,
    photo: HISTORICAL_PHOTOS.hanoi1946,
    specificCaption: 'Chiến đấu tại Hà Nội những ngày đầu Toàn quốc kháng chiến, 1946–1947.',
    specificContext: 'Tư liệu mở đầu Toàn quốc kháng chiến: quân và dân Thủ đô quyết tử bảo vệ từng căn nhà, góc phố.',
    note: 'Ảnh tư liệu lịch sử 1946–1947 lưu trữ tại Báo QĐND',
  },
  2: {
    slideId: 2,
    photo: HISTORICAL_PHOTOS.hanoi1946,
    specificCaption: 'Dựng chướng ngại vật, chiến lũy tại Hà Nội trong những ngày đầu kháng chiến (1946–1947).',
    specificContext: 'Hiện thực lịch sử sau Hội nghị Vạn Phúc (18–19/12/1946) và Lời kêu gọi Toàn quốc kháng chiến.',
    note: 'Bối cảnh chiến đấu trong đô thị bảo vệ cơ quan đầu não kháng chiến di chuyển lên chiến khu.',
  },
  3: {
    slideId: 3,
    photo: HISTORICAL_PHOTOS.hanoi1946,
    specificCaption: 'Quân dân Hà Nội giam chân địch trong thành phố cuối năm 1946 – đầu năm 1947.',
    specificContext: 'Giai đoạn ban hành Chỉ thị Toàn dân kháng chiến và Lời kêu gọi Toàn quốc kháng chiến lịch sử.',
    note: 'Minh chứng cho ý chí quật cường của dân tộc khi thực dân Pháp bội ước.',
  },
  4: {
    slideId: 4,
    photo: HISTORICAL_PHOTOS.border1950,
    specificCaption: 'Bộ đội trong Chiến dịch Biên giới Thu–Đông năm 1950.',
    specificContext: 'Lực lượng vũ trang nhân dân chiến đấu vì độc lập dân tộc, tự do và thống nhất đất nước.',
    note: 'Ảnh phản ánh tính chất chính nghĩa và sự lớn mạnh của quân đội cách mạng.',
  },
  5: {
    slideId: 5,
    photo: HISTORICAL_PHOTOS.porters1950,
    specificCaption: 'Dân công phục vụ Chiến dịch Biên giới năm 1950.',
    specificContext: 'Huy động sức người sức của cho tiền tuyến; minh họa nguyên tắc toàn dân kháng chiến.',
    note: 'Ảnh 1950 minh họa cho nguyên tắc huy động nhân dân, không khẳng định chụp năm 1946.',
  },
  6: {
    slideId: 6,
    photo: HISTORICAL_PHOTOS.porters1950,
    specificCaption: 'Đoàn dân công gùi thồ lương thực, đạn dược phục vụ kháng chiến (1950).',
    specificContext: 'Mặt trận hậu cần, kinh tế tự cấp tự túc gắn chặt với mặt trận quân sự trên chiến trường.',
    note: 'Ảnh tư liệu 1950 minh họa tính toàn diện của cuộc kháng chiến nhân dân.',
  },
  7: {
    slideId: 7,
    photo: HISTORICAL_PHOTOS.journey1950,
    specificCaption: 'Chủ tịch Hồ Chí Minh trên đường đi Chiến dịch Biên giới năm 1950.',
    specificContext: 'Hình ảnh Người đồng cam cộng khổ cùng bộ đội và nhân dân trên chiến khu Việt Bắc.',
    note: 'Minh họa tinh thần trường kỳ và tự lực cánh sinh; không gán thành ảnh 1946.',
  },
  8: {
    slideId: 8,
    photo: HISTORICAL_PHOTOS.porters1950,
    specificCaption: 'Huy động nguồn lực nhân dân tiếp tế cho chiến dịch giải phóng biên cương năm 1950.',
    specificContext: 'Tiềm lực vật chất và hậu phương An toàn khu Việt Bắc nuôi dưỡng các chiến dịch lớn.',
    note: 'Vai trò nòng cốt của nhân dân trong xây dựng căn cứ địa và hậu phương vững mạnh.',
  },
  9: {
    slideId: 9,
    photo: HISTORICAL_PHOTOS.border1950,
    specificCaption: 'Bộ đội trong Chiến dịch Biên giới Thu–Đông năm 1950.',
    specificContext: 'Bước chuyển biến chiến lược căn bản: Quân đội ta giành quyền chủ động trên chiến trường chính Bắc Bộ.',
    note: 'Chiến dịch Biên giới 1950: Khai thông biên giới quốc tế, đánh dấu bước ngoặt cuộc kháng chiến.',
  },
  10: {
    slideId: 10,
    photo: HISTORICAL_PHOTOS.hochiminh1950,
    specificCaption: 'Chủ tịch Hồ Chí Minh trên đài quan sát núi Báo Đông trong Chiến dịch Biên giới (09/1950).',
    specificContext: 'Chủ tịch Hồ Chí Minh trực tiếp ra mặt trận chỉ đạo Chiến dịch Biên giới năm 1950.',
    note: 'Ảnh tư liệu lịch sử chụp tháng 9/1950; không dùng làm ảnh minh họa cho sự kiện 1946.',
  },
  11: {
    slideId: 11,
    photo: HISTORICAL_PHOTOS.semiconductor2024,
    specificCaption: 'Khởi động chương trình đào tạo nhân lực vi mạch bán dẫn tại Đà Nẵng, ngày 26/3/2024.',
    specificContext: 'Lễ khởi động chương trình đào tạo nhân lực vi mạch bán dẫn tại Đà Nẵng, trước khi Chương trình quốc gia được phê duyệt tháng 9/2024.',
    note: 'Sự kiện ngày 26/3/2024 tại Trường Đại học Công nghệ Thông tin và Truyền thông Việt–Hàn, Đại học Đà Nẵng; minh chứng thực tế cho nỗ lực đào tạo tại cơ sở đại học.',
  },
  12: {
    slideId: 12,
    photo: HISTORICAL_PHOTOS.hochiminh1950,
    specificCaption: 'Chủ tịch Hồ Chí Minh trên đài quan sát núi Báo Đông trong Chiến dịch Biên giới (tháng 9/1950).',
    specificContext: 'Dấu mốc lịch sử quân và dân ta giành thế chủ động chiến lược trên chiến trường chính Bắc Bộ sau 4 năm kiên cường kháng chiến (1946–1950).',
    note: 'Ảnh tư liệu lịch sử lưu trữ tại Bảo tàng Hồ Chí Minh; di tích lịch sử núi Báo Đông, xã Đức Long, huyện Thạch An, tỉnh Cao Bằng.',
  },
};

export function getPhotoBindingForSlide(slideId: number): SlidePhotoBinding {
  return SLIDE_PHOTO_BINDINGS[slideId] || {
    slideId,
    photo: HISTORICAL_PHOTOS.hanoi1946,
    specificCaption: HISTORICAL_PHOTOS.hanoi1946.caption,
    specificContext: HISTORICAL_PHOTOS.hanoi1946.context,
    note: 'Ảnh tư liệu lịch sử',
  };
}

