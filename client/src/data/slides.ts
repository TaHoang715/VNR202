export interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  section: string;
  suggestedDurationSeconds: number;
  content: {
    heading?: string;
    points: string[];
    archivalQuote?: {
      text: string;
      source: string;
    };
  };
  sources: {
    label: string;
    url?: string;
    note: string;
  }[];
  speakerNotes: string;
  hasInteractivePoll?: boolean;
}

export const SLIDES: SlideData[] = [
  {
    id: 1,
    title: 'ĐƯỜNG LỐI KHÁNG CHIẾN TOÀN QUỐC & QUÁ TRÌNH TỔ CHỨC THỰC HIỆN',
    subtitle: 'Giai đoạn 1946 – 1950 | Lịch sử Đảng Cộng sản Việt Nam (Chương 2, Mục I.2)',
    section: 'Khái quát & Mở đầu',
    suggestedDurationSeconds: 50,
    content: {
      heading: 'Trọng tâm chuyên đề',
      points: [
        'Bối cảnh lịch sử dẫn đến quyết định phát động Toàn quốc kháng chiến (12/1946).',
        'Nội dung cốt lõi: Toàn dân, Toàn diện, Trường kỳ, Dựa vào sức mình là chính.',
        'Kết quả tổ chức thực hiện và hai chiến dịch tiêu biểu (1947, 1950).',
        'Bài học kinh nghiệm và liên hệ so sánh phương pháp luận tổ chức nguồn lực hiện nay.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử ĐCSVN (Khối không chuyên)',
        url: 'https://www.nxbctqg.org.vn/giao-trinh-lich-su-dang-cong-san-viet-nam-danh-cho-bac-dai-hoc-he-khong-chuyen-ly-luan-chinh-tri-.html',
        note: 'NXB CTQG 2021, Chương 2 Mục I.2 (Bản nháp chờ đối chiếu số trang cụ thể)',
      },
    ],
    speakerNotes:
      'Kính thưa thầy cô và các bạn, bài thuyết trình 15 phút của nhóm tập trung vào Chương 2 Mục I.2. Đây là giai đoạn lịch sử mang tính sinh tử, đặt nền móng cho cuộc kháng chiến trường kỳ thắng lợi của dân tộc ta.',
  },
  {
    id: 2,
    title: 'BỐI CẢNH LỊCH SỬ & QUYẾT ĐỊNH KHÁNG CHIẾN',
    subtitle: 'Sự bội ước của thực dân Pháp và giới hạn của nhân nhượng hòa bình (12/1946)',
    section: 'Bối cảnh lịch sử',
    suggestedDurationSeconds: 70,
    content: {
      heading: 'Từ nhân nhượng hòa bình đến quyết định lịch sử',
      points: [
        'Hiệp định Sơ bộ (6/3) và Tạm ước (14/9/1946) bị Pháp liên tục bội ước (khiêu khích tại Hải Phòng, Lạng Sơn, Hà Nội).',
        'Ngày 18/12/1946, tướng Morlière gửi tối hậu thư đòi tước vũ khí Tự vệ Thủ đô.',
        'Hội nghị Vạn Phúc (18–19/12/1946): Ban Thường vụ TW Đảng quyết định phát động kháng chiến toàn quốc.',
      ],
      archivalQuote: {
        text: 'Chúng ta càng nhân nhượng, thực dân Pháp càng lấn tới... Thà hy sinh tất cả, chứ nhất định không chịu mất nước!',
        source: 'Chủ tịch Hồ Chí Minh — Lời kêu gọi Toàn quốc kháng chiến (19/12/1946)',
      },
    },
    sources: [
      {
        label: 'Lịch sử biên niên Đảng Cộng sản Việt Nam (Tập 3)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176',
        note: 'Biên niên sự kiện ngày 18–19/12/1946',
      },
    ],
    speakerNotes:
      'Chúng ta kiên trì nhân nhượng trong 9 tháng để xây dựng chính quyền non trẻ và củng cố lực lượng. Khi dã tâm xâm lược của thực dân Pháp đe dọa trực tiếp nền độc lập, kháng chiến toàn quốc là con đường cứu nước tất yếu.',
  },
  {
    id: 3,
    title: 'HỆ THỐNG VĂN KIỆN HÌNH THÀNH ĐƯỜNG LỐI',
    subtitle: 'Ba văn kiện nền tảng định hình đường lối chiến lược (1946 – 1947)',
    section: 'Đường lối kháng chiến',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'Tiến trình hoàn thiện đường lối chiến lược',
      points: [
        'Chỉ thị "Toàn dân kháng chiến" (12/12/1946): Vạch rõ mục đích tự vệ, phương châm trường kỳ và tự lực cánh sinh.',
        'Lời kêu gọi Toàn quốc kháng chiến (19/12/1946): Hiệu triệu toàn thể quốc dân đồng bào đứng lên cứu nước.',
        'Tác phẩm "Kháng chiến nhất định thắng lợi" (1947): Luận giải hệ thống lý luận khoa học về chiến tranh nhân dân.',
      ],
    },
    sources: [
      {
        label: 'Nghị quyết Hội nghị quân sự toàn quốc của Đảng (19/10/1946)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/hoi-nghi-bch-trung-uong/khoa-i/nghi-quyet-hoi-nghi-quan-su-toan-quoc-cua-dang-ngay-19-10-1946-677',
        note: 'Tư liệu Đảng: Chuẩn bị về tư tưởng và thế trận quân sự',
      },
    ],
    speakerNotes:
      'Ba văn kiện kết tinh thành một chỉnh thể đường lối kháng chiến toàn diện. Chỉ thị vạch phương châm, Lời kêu gọi hiệu triệu muôn triệu trái tim, và tác phẩm của đồng chí Trường Chinh hoàn bị hệ thống lý luận chiến lược.',
  },
  {
    id: 4,
    title: 'TÍNH CHẤT & MỤC TIÊU CUỘC KHÁNG CHIẾN',
    subtitle: 'Chính nghĩa, tự vệ, giải phóng dân tộc và từng bước thực hiện dân chủ',
    section: 'Đường lối kháng chiến',
    suggestedDurationSeconds: 60,
    content: {
      heading: 'Bản chất cuộc đọ sức lịch sử',
      points: [
        'Tính chất chính nghĩa & tự vệ: Bảo vệ nền độc lập tự do và thành quả của Cách mạng Tháng Tám 1945.',
        'Tính chất dân tộc giải phóng: Đánh đuổi thực dân Pháp, hoàn thành mục tiêu độc lập và thống nhất đất nước.',
        'Tính chất dân chủ mới: Từng bước bồi dưỡng sức dân, thực hiện giảm tô, chia ruộng đất công cho nông dân nghèo.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử ĐCSVN 2021',
        note: 'Chương 2, Mục I.2 (Tính chất và mục tiêu kháng chiến)',
      },
    ],
    speakerNotes:
      'Chính tính chất chính nghĩa và tự vệ đã tạo nên ưu thế chính trị tuyệt đối cho quân và dân ta, biến sức mạnh tinh thần thành sức mạnh vật chất to lớn trong suốt cuộc kháng chiến.',
  },
  {
    id: 5,
    title: 'NỘI DUNG 1: KHÁNG CHIẾN TOÀN DÂN',
    subtitle: 'Động viên toàn dân đánh giặc — "Mỗi người dân là một chiến sĩ"',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 90,
    hasInteractivePoll: true,
    content: {
      heading: 'Sức mạnh đại đoàn kết toàn dân tộc',
      points: [
        'Toàn dân đánh giặc: Không phân biệt tôn giáo, đảng phái, già trẻ, gái trai; lấy liên minh công nông làm nền tảng.',
        'Xây dựng thế trận lòng dân: Mỗi làng xóm là một pháo đài kháng chiến vững chắc.',
        'Tổ chức lực lượng vũ trang 3 thứ quân: Bộ đội chủ lực, Bộ đội địa phương và Dân quân du kích rộng khắp.',
      ],
      archivalQuote: {
        text: 'Bất kỳ đàn ông, đàn bà, bất kỳ người già, người trẻ... ai có súng dùng súng, ai có gươm dùng gươm...',
        source: 'Chủ tịch Hồ Chí Minh (19/12/1946)',
      },
    },
    sources: [
      {
        label: 'Tác phẩm "Kháng chiến nhất định thắng lợi"',
        note: 'Đồng chí Trường Chinh (1947), phần Kháng chiến toàn dân',
      },
    ],
    speakerNotes:
      'Kháng chiến toàn dân là linh hồn của đường lối cách mạng. Không lực lượng ngoại xâm nào có thể khuất phục một dân tộc mà mỗi người dân đều là một chiến sĩ tự vệ tại chỗ.',
  },
  {
    id: 6,
    title: 'NỘI DUNG 2: KHÁNG CHIẾN TOÀN DIỆN',
    subtitle: 'Đánh địch trên mọi mặt trận: Quân sự, Chính trị, Kinh tế, Văn hóa, Ngoại giao',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Năm mặt trận gắn kết hữu cơ',
      points: [
        'Quân sự: Mặt trận quyết định then chốt nhằm tiêu hao sinh lực địch, phát triển từ du kích lên vận động chiến.',
        'Chính trị & Ngoại giao: Củng cố chính quyền dân chủ nhân dân; kiên trì độc lập tự chủ và tranh thủ sự đồng tình quốc tế.',
        'Kinh tế & Văn hóa: Xây dựng kinh tế tự cấp tự túc, tăng gia sản xuất; diệt giặc dốt qua phong trào Bình dân học vụ.',
      ],
    },
    sources: [
      {
        label: 'Kháng chiến toàn dân, toàn diện, trường kỳ, dựa vào sức mình là chính',
        url: 'https://hcmcpv.org.vn/tin-tap-chi/thong-tin-tuyen-truyen-12-2016/khang-chien-toan-dan-toan-dien-truong-ky-dua-vao-suc-minh-la-chinh-1486349354',
        note: 'Trang tin Đảng bộ TP.HCM',
      },
    ],
    speakerNotes:
      'Thực dân Pháp đánh phá ta trên tất cả các mặt từ quân sự, kinh tế đến văn hóa, vì thế cuộc kháng chiến của ta bắt buộc phải tiến hành toàn diện để bẻ gãy mọi âm mưu của địch.',
  },
  {
    id: 7,
    title: 'NỘI DUNG 3: TRƯỜNG KỲ & TỰ LỰC CÁNH SINH',
    subtitle: 'Đánh lâu dài để chuyển hóa lực lượng | Dựa vào sức mình kết hợp quốc tế',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 80,
    hasInteractivePoll: true,
    content: {
      heading: 'Biện chứng của sức bền chiến lược',
      points: [
        'Trường kỳ (đánh lâu dài): Nhằm làm thất bại chiến lược "đánh nhanh thắng nhanh" của Pháp; chuyển hóa từ thế yếu sang thế mạnh.',
        'Dựa vào sức mình là chính: Phát huy cao độ nguồn nhân lực, vật lực tại chỗ của dân tộc để giữ vững quyền tự chủ.',
        'Tranh thủ sự ủng hộ quốc tế: Đặt cuộc kháng chiến trong phong trào hòa bình, dân chủ và giải phóng dân tộc thế giới.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử ĐCSVN',
        note: 'NXB CTQG 2021, Chương 2 Mục I.2',
      },
    ],
    speakerNotes:
      'Đánh lâu dài không phải là thụ động kéo dài thời gian, mà là chiến lược chủ động tích lũy thế và lực để làm cho địch ngày càng suy kiệt và ta ngày càng lớn mạnh.',
  },
  {
    id: 8,
    title: 'TỔ CHỨC THỰC HIỆN: CĂN CỨ ĐỊA & HẬU PHƯƠNG',
    subtitle: 'Xây dựng Thủ đô kháng chiến Việt Bắc và củng cố hậu phương tại chỗ (1947–1950)',
    section: 'Tổ chức thực hiện',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'Tiềm lực vật chất nuôi dưỡng cuộc kháng chiến',
      points: [
        'Di chuyển an toàn các cơ quan Trung ương, xưởng máy, kho tàng lên Chiến khu Việt Bắc (An toàn khu - ATK).',
        'Xây dựng làng chiến đấu và căn cứ địa tại chỗ; thực hiện triệt để phương châm "vườn không nhà trống".',
        'Đẩy mạnh phong trào "Tăng gia sản xuất tự cấp tự túc" và phát hành đồng tiền tài chính độc lập.',
      ],
    },
    sources: [
      {
        label: 'Lịch sử biên niên Đảng Cộng sản Việt Nam (Tập 3)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176',
        note: 'Tổ chức sản xuất và đời sống kháng chiến tại Việt Bắc',
      },
    ],
    speakerNotes:
      'Hậu phương kháng chiến là cội nguồn của mọi thắng lợi tiền tuyến. Việt Bắc không chỉ là trung tâm chỉ huy mà còn là xưởng sản xuất vũ khí, nuôi dưỡng ý chí của toàn dân tộc.',
  },
  {
    id: 9,
    title: 'CÁC MỐC CHIẾN DỊCH TIÊU BIỂU 1947 – 1950',
    subtitle: 'Việt Bắc 1947 (bẻ gãy đánh nhanh thắng nhanh) và Biên Giới 1950 (giành thế chủ động)',
    section: 'Tổ chức thực hiện',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Hai bước chuyển hóa chiến lược trên chiến trường',
      points: [
        'Chiến dịch Việt Bắc Thu – Đông 1947: Đập tan cuộc tiến công gọng kìm quy mô lớn của Pháp; bảo vệ tuyệt đối an toàn cơ quan đầu não kháng chiến.',
        'Giai đoạn 1948 – 1949: Đẩy mạnh chiến tranh du kích trên cả nước, tích lũy lực lượng chuẩn bị chuyển sang vận động chiến.',
        'Chiến dịch Biên Giới Thu – Đông 1950: Khai thông biên giới Việt – Trung, tiêu diệt bộ phận quan trọng sinh lực địch, giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.',
      ],
    },
    sources: [
      {
        label: 'Chiến tranh cách mạng Việt Nam 1945–1975: Thắng lợi và bài học',
        note: 'Ban Chỉ đạo Tổng kết chiến tranh (Bộ Chính trị, 2008)',
      },
    ],
    speakerNotes:
      'Cần lưu ý: Thắng lợi Biên Giới 1950 là bước ngoặt giành thế chủ động chiến lược trên chiến trường chính Bắc Bộ, chưa phải là kết thúc toàn bộ cuộc chiến tranh giải phóng (cuộc kháng chiến tiếp diễn anh dũng đến năm 1954).',
  },
  {
    id: 10,
    title: 'Ý NGHĨA LỊCH SỬ & BÀI HỌC KINH NGHIỆM',
    subtitle: 'Giá trị trường tồn của đường lối kháng chiến giai đoạn 1946 – 1950',
    section: 'Tổng kết & Bài học',
    suggestedDurationSeconds: 70,
    content: {
      heading: 'Bốn bài học kinh nghiệm sâu sắc',
      points: [
        'Bài học 1: Giữ vững và tăng cường vai trò lãnh đạo tuyệt đối, toàn diện của Đảng.',
        'Bài học 2: Dựa vào dân, phát huy sức mạnh khối đại đoàn kết toàn dân tộc.',
        'Bài học 3: Kết hợp kiên định nguyên tắc độc lập với sự linh hoạt, mềm dẻo về sách lược.',
        'Bài học 4: Đề cao tinh thần tự lực cánh sinh, chủ động chuẩn bị nguồn lực nội sinh.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử ĐCSVN 2021',
        note: 'Chương 2 Mục I.2: Đúc kết kinh nghiệm lãnh đạo của Đảng',
      },
    ],
    speakerNotes:
      'Bài học dựa vào dân và phát huy nội lực tự lực cánh sinh không chỉ đưa dân tộc vượt qua giai đoạn hiểm nghèo 1946–1950 mà còn nguyên giá trị định hướng trong sự nghiệp xây dựng đất nước hôm nay.',
  },
  {
    id: 11,
    title: 'LIÊN HỆ HIỆN NAY: NGUYÊN TẮC TỔ CHỨC & CHUẨN BỊ NGUỒN LỰC',
    subtitle: 'So sánh phương pháp luận quản trị rủi ro và điều phối cộng đồng ứng phó thiên tai (Bão Yagi 2024)',
    section: 'Liên hệ thực tiễn',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'So sánh phương pháp luận quản trị nguồn lực',
      points: [
        'Chuẩn bị từ sớm & tại chỗ: Tinh thần chủ động dự phòng thời kỳ kháng chiến tương đồng với phương châm "4 tại chỗ" (chỉ huy, lực lượng, phương tiện, hậu cần tại chỗ).',
        'Hiệp đồng lực lượng: Sự phối hợp giữa chính quyền, lực lượng vũ trang (quân đội, công an) và tinh thần tương thân tương ái của cộng đồng.',
        'Văn bản minh chứng: Công điện số 86/CĐ-TTg ngày 03/9/2024 của Thủ tướng Chính phủ về ứng phó khẩn cấp bão số 3 (Yagi).',
        'Giới hạn so sánh: Chiến tranh là xung đột đối kháng xã hội; thiên tai là hiện tượng tự nhiên. Phép so sánh học tập ở phương pháp luận quản trị rủi ro và huy động sức dân, không đồng nhất hai hiện tượng.',
      ],
    },
    sources: [
      {
        label: 'Thủ tướng chỉ đạo khẩn trương ứng phó bão số 3 (bão Yagi)',
        url: 'https://xaydungchinhsach.chinhphu.vn/thu-tuong-chi-dao-khan-truong-ung-pho-bao-so-3-bao-yagi-119240903121402583.htm',
        note: 'Báo Chính phủ — Công điện 86/CĐ-TTg ngày 03/9/2024',
      },
    ],
    speakerNotes:
      'Nhóm lưu ý rõ: chúng ta không đồng nhất chiến tranh với thiên tai. Điểm cốt lõi là học tập phương pháp luận: chủ động chuẩn bị từ sớm, phân vai rõ ràng và phát huy sức mạnh cộng đồng tại chỗ khi đối diện thử thách lớn.',
  },
  {
    id: 12,
    title: 'KẾT LUẬN & CHUYỂN TIẾP HOẠT ĐỘNG LỚP HỌC',
    subtitle: 'Tóm lược báo cáo, minh bạch AI và giới thiệu thử thách "Giải mã kháng chiến"',
    section: 'Kết luận & Hoạt động',
    suggestedDurationSeconds: 60,
    content: {
      heading: 'Khép lại 15 phút báo cáo & Bước vào thử thách trắc nghiệm',
      points: [
        'Đường lối kháng chiến 1946–1950 khẳng định nghệ thuật chiến tranh nhân dân sáng tạo của Đảng.',
        'Minh bạch học thuật: Nội dung là bản thảo hỗ trợ bởi Codex Coordinator và OpenCode Worker (Gemini fallback), chờ nhóm đối chiếu giáo trình in.',
        'Mời cả lớp tham gia thử thách trắc nghiệm "Giải mã kháng chiến" (10 câu hỏi) trên điện thoại qua mã QR!',
      ],
    },
    sources: [
      {
        label: 'Phụ lục AI & Nguồn tham khảo',
        note: 'Chi tiết tại thẻ "AI & Nguồn" trên thanh điều hướng',
      },
    ],
    speakerNotes:
      'Xin chân thành cảm ơn thầy cô và các bạn đã lắng nghe. Sau đây, nhóm trân trọng mời cả lớp bước vào hoạt động thử thách trắc nghiệm cá nhân 10 câu hỏi để cùng ôn tập và thi đấu tốc độ về Đường lối kháng chiến toàn quốc 1946–1950!',
  },
];
