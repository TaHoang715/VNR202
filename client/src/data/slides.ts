export interface SlideGroup {
  title: string;
  points: string[];
}

export interface SlideData {
  id: number;
  part: number;
  partTitle: string;
  title: string;
  subtitle: string;
  section: string;
  suggestedDurationSeconds: number;
  content: {
    heading?: string;
    points: string[];
    groups?: SlideGroup[];
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
    part: 1,
    partTitle: 'Bối cảnh lịch sử',
    title: 'ĐƯỜNG LỐI KHÁNG CHIẾN TOÀN QUỐC & QUÁ TRÌNH TỔ CHỨC THỰC HIỆN',
    subtitle: 'Giai đoạn 1946 – 1950 | Lịch sử Đảng Cộng sản Việt Nam (Chương 2, Mục I.2)',
    section: 'Khái quát & Mở đầu',
    suggestedDurationSeconds: 50,
    content: {
      heading: 'Bốn phần nội dung trọng tâm',
      points: [
        'Phần I — Bối cảnh lịch sử: Sự bội ước của thực dân Pháp và quyết định phát động Toàn quốc kháng chiến (tháng 12/1946).',
        'Phần II — Đường lối kháng chiến: Hệ thống văn kiện nền tảng và 4 nội dung cốt lõi (Toàn dân, Toàn diện, Trường kỳ, Dựa vào sức mình là chính).',
        'Phần III — Quá trình tổ chức thực hiện: Củng cố chính quyền, xây dựng lực lượng vũ trang và hai chiến dịch bước ngoặt (Việt Bắc 1947, Biên giới 1950).',
        'Phần IV — Vận dụng thực tiễn & Ôn tập: Bài học tự lực cánh sinh gắn với hợp tác quốc tế trong phát triển nguồn nhân lực công nghệ hôm nay.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam (Khối không chuyên)',
        url: 'https://www.nxbctqg.org.vn/giao-trinh-lich-su-dang-cong-san-viet-nam-danh-cho-bac-dai-hoc-he-khong-chuyen-ly-luan-chinh-tri-.html',
        note: 'Nhà xuất bản Chính trị quốc gia Sự thật, 2021, Chương 2, Mục I.2',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 2,
    part: 1,
    partTitle: 'Bối cảnh lịch sử',
    title: 'BỐI CẢNH LỊCH SỬ & QUYẾT ĐỊNH KHÁNG CHIẾN',
    subtitle: 'Sự bội ước của thực dân Pháp và quyết định lịch sử đêm 19/12/1946',
    section: 'Bối cảnh lịch sử',
    suggestedDurationSeconds: 70,
    content: {
      heading: 'Từ nhân nhượng hòa bình đến quyết định lịch sử',
      points: [
        'Đảng, Chính phủ và Chủ tịch Hồ Chí Minh kiên trì hòa hoãn, nhân nhượng có nguyên tắc nhằm bảo vệ độc lập, tranh thủ thời gian chuẩn bị lực lượng và tránh chiến tranh nổ ra quá sớm khi tương quan lực lượng còn bất lợi.',
        'Tuy nhiên, thực dân Pháp liên tục bội ước: đẩy mạnh bình định Nam Bộ; cuối tháng 11/1946 nổ súng đánh chiếm Hải Phòng, Lạng Sơn và chiếm đóng trái phép tại Đà Nẵng, Hải Dương.',
        'Tại Hà Nội, giữa tháng 12/1946, quân Pháp ngang nhiên đánh chiếm trụ sở Bộ Tài chính và Bộ Giao thông công chính, bắn đại bác tàn sát đồng bào ở phố Yên Ninh và Hàng Bún (16–17/12). Ngày 18/12/1946, Pháp gửi 3 tối hậu thư đòi tước vũ khí Tự vệ và đòi độc quyền kiểm soát an ninh Thủ đô.',
        'Hội nghị Ban Thường vụ Trung ương Đảng mở rộng họp ngày 18–19/12/1946 tại Vạn Phúc (Hà Đông) quyết định chủ động phát động toàn quốc kháng chiến. Đêm 19/12/1946, Chủ tịch Hồ Chí Minh ra Lời kêu gọi toàn quốc kháng chiến.',
        'Từ 20 giờ ngày 19/12/1946, quân dân Hà Nội và các đô thị từ bắc vĩ tuyến 16 trở ra bắt đầu chiến đấu, mở đầu cuộc kháng chiến toàn quốc. Tại Hà Nội, pháo đài Láng bắn loạt đại bác đầu tiên lúc 20 giờ 03 phút.',
        'Quân dân Hà Nội chiến đấu suốt 60 ngày đêm để giam chân và tiêu hao lực lượng địch, tạo điều kiện di chuyển cơ quan đầu não và chuẩn bị kháng chiến lâu dài. Trung đoàn Thủ đô được thành lập trong thời gian này và chủ động rút ra ngoài thành phố ngày 17/2/1947.',
        'Cùng thời điểm, quân dân các đô thị như Đà Nẵng, Huế, Vinh, Nam Định, Bắc Ninh, Bắc Giang đồng loạt nổ súng kìm giữ chân địch, đánh phá giao thông, bảo vệ việc di chuyển nhân lực, vật lực lên các khu căn cứ và An toàn khu.',
      ],
      archivalQuote: {
        text: 'Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ. Hỡi đồng bào! Chúng ta phải đứng lên!',
        source: 'Chủ tịch Hồ Chí Minh — Lời kêu gọi toàn quốc kháng chiến (19/12/1946)',
      },
    },
    sources: [
      {
        label: 'Lịch sử biên niên Đảng Cộng sản Việt Nam (Tập 3)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176',
        note: 'Biên niên sự kiện ngày 18–19/12/1946 và cuộc chiến đấu 60 ngày đêm bảo vệ Thủ đô Hà Nội',
      },
      {
        label: 'Lời kêu gọi Toàn quốc kháng chiến của Chủ tịch Hồ Chí Minh (19/12/1946)',
        url: 'https://hochiminh.vn/tu-tuong-dao-duc-ho-chi-minh/nghien-cuu-tu-tuong-dao-duc-ho-chi-minh/loi-keu-goi-toan-quoc-khang-chien-cua-chu-tich-ho-chi-minh-y-chi-bao-ve-doc-lap-tu-do-cua-dan-toc-5994',
        note: 'Trang thông tin điện tử Hồ Chí Minh — Bài nghiên cứu về Lời kêu gọi toàn quốc kháng chiến',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 3,
    part: 2,
    partTitle: 'Đường lối kháng chiến',
    title: 'HỆ THỐNG VĂN KIỆN HÌNH THÀNH ĐƯỜNG LỐI',
    subtitle: 'Tiến trình hoàn thiện tư duy chiến lược từ thực tiễn 1945 đến 1947',
    section: 'Đường lối kháng chiến',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'Tiến trình hình thành và ba văn kiện nền tảng',
      points: [
        'Các chỉ thị tiền đề (1945 – đầu 1946): Chỉ thị "Kháng chiến kiến quốc" (25/11/1945), Chỉ thị "Tình hình và chủ trương" (03/3/1946) và Chỉ thị "Hòa để tiến" (09/3/1946) xác định kẻ thù chính, vạch sách lược hòa hoãn mềm dẻo và chuẩn bị thực lực cho kháng chiến lâu dài.',
        'Chỉ thị "Toàn dân kháng chiến" của Ban Thường vụ Trung ương Đảng (12/12/1946): Vạch rõ mục tiêu bảo vệ nền độc lập, xác định phương châm tiến hành kháng chiến tự vệ, tự lực cánh sinh.',
        'Lời kêu gọi toàn quốc kháng chiến của Chủ tịch Hồ Chí Minh (19/12/1946): Khẳng định quyết tâm bảo vệ độc lập, tự do và kêu gọi toàn dân đứng lên kháng chiến.',
        'Tác phẩm "Kháng chiến nhất định thắng lợi" của đồng chí Tổng Bí thư Trường Chinh (1947): Luận giải hệ thống lý luận hoàn chỉnh về chiến tranh nhân dân, phân tích cơ sở thắng lợi của đường lối kháng chiến trường kỳ.',
      ],
    },
    sources: [
      {
        label: 'Lịch sử biên niên Đảng Cộng sản Việt Nam (Tập 3)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176',
        note: 'Hệ thống văn kiện đường lối của Ban Thường vụ Trung ương Đảng 1946–1947',
      },
      {
        label: 'Tác phẩm "Kháng chiến nhất định thắng lợi" (1947)',
        url: 'https://nxblyluanchinhtri.vn/noi-dung-quan-trong-trong-duong-loi-khang-chien-chong-thuc-dan-phap/',
        note: 'Nhà xuất bản Lý luận chính trị — Giá trị lý luận và thực tiễn trong đường lối kháng chiến',
      },
      {
        label: 'Nghị quyết Hội nghị quân sự toàn quốc của Đảng (19/10/1946)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/hoi-nghi-bch-trung-uong/khoa-i/nghi-quyet-hoi-nghi-quan-su-toan-quoc-cua-dang-ngay-19-10-1946-677',
        note: 'Chuẩn bị về tư tưởng, lực lượng quân sự và thế trận phòng thủ',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 4,
    part: 2,
    partTitle: 'Đường lối kháng chiến',
    title: 'TÍNH CHẤT & MỤC TIÊU CUỘC KHÁNG CHIẾN',
    subtitle: 'Chính nghĩa, tự vệ, giải phóng dân tộc và từng bước thực hiện dân chủ',
    section: 'Đường lối kháng chiến',
    suggestedDurationSeconds: 60,
    content: {
      heading: 'Bản chất cuộc đọ sức lịch sử',
      points: [
        'Mục tiêu kháng chiến: Đánh đổ thực dân Pháp xâm lược, giành nền độc lập, tự do và thống nhất hoàn toàn; bảo vệ chế độ dân chủ nhân dân và đóng góp cho hòa bình thế giới.',
        'Tính chất chính nghĩa & tự vệ: Chiến đấu để bảo vệ chủ quyền quốc gia và thành quả của cuộc Cách mạng Tháng Tám năm 1945 trước dã tâm tái lập ách thống trị của thực dân Pháp.',
        'Tính chất dân tộc giải phóng: Tập hợp đại đoàn kết toàn dân tộc nhằm đập tan xiềng xích thực dân, bảo vệ toàn vẹn lãnh thổ Tổ quốc.',
        'Tính chất dân chủ mới: Vừa kháng chiến vừa kiến quốc; từng bước thực hiện chính sách giảm tô, xóa nợ, chia ruộng đất công nhằm bồi dưỡng sức dân cho cuộc chiến đấu lâu dài.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam 2021',
        note: 'Nhà xuất bản Chính trị quốc gia Sự thật, Chương 2, Mục I.2 (Tính chất và mục tiêu kháng chiến)',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 5,
    part: 2,
    partTitle: 'Đường lối kháng chiến',
    title: 'NỘI DUNG 1: KHÁNG CHIẾN TOÀN DÂN',
    subtitle: 'Động viên toàn dân đánh giặc — "Mỗi người dân là một chiến sĩ"',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Sức mạnh đại đoàn kết toàn dân tộc',
      points: [
        'Huy động toàn bộ sức dân, tài dân, lực dân; không phân biệt giai cấp, tôn giáo, đảng phái, lứa tuổi hay giới tính; lấy liên minh công nhân và nông dân làm nền tảng.',
        'Xây dựng thế trận lòng dân rộng khắp: "Mỗi người dân là một chiến sĩ, mỗi làng xã là một pháo đài, mỗi đường phố là một mặt trận", đánh giặc ở mọi nơi, mọi lúc.',
        'Lực lượng vũ trang nhân dân làm nòng cốt cho toàn dân đánh giặc, kết hợp chặt chẽ ba thứ quân: bộ đội chủ lực, bộ đội địa phương và dân quân du kích.',
      ],
      archivalQuote: {
        text: 'Bất kỳ đàn ông, đàn bà, bất kỳ người già, người trẻ, không chia tôn giáo, đảng phái, dân tộc. Hễ là người Việt Nam thì phải đứng lên đánh thực dân Pháp để cứu Tổ quốc.',
        source: 'Chủ tịch Hồ Chí Minh — Lời kêu gọi toàn quốc kháng chiến (19/12/1946)',
      },
    },
    sources: [
      {
        label: 'Tác phẩm "Kháng chiến nhất định thắng lợi"',
        note: 'Đồng chí Trường Chinh (1947), luận điểm Kháng chiến toàn dân',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 6,
    part: 2,
    partTitle: 'Đường lối kháng chiến',
    title: 'NỘI DUNG 2: KHÁNG CHIẾN TOÀN DIỆN',
    subtitle: 'Đánh địch trên mọi mặt trận: Quân sự, Chính trị, Kinh tế, Văn hóa, Ngoại giao',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Năm mặt trận gắn kết hữu cơ',
      points: [
        'Quân sự: Giữ vai trò mũi nhọn, mang tính quyết định nhằm tiêu hao, tiêu diệt sinh lực địch; từng bước chuyển hóa từ chiến tranh du kích lên vận động chiến.',
        'Chính trị: Củng cố khối đại đoàn kết toàn dân tộc, củng cố chính quyền dân chủ nhân dân; kiên quyết làm thất bại âm mưu "lấy chiến tranh nuôi chiến tranh, dùng người Việt đánh người Việt" và lập chính quyền bù nhìn của địch.',
        'Kinh tế: Đẩy mạnh tăng gia sản xuất, tự cấp tự túc lương thực và nhu yếu phẩm; xây dựng nền tài chính độc lập, thực hiện bao vây kinh tế không cho địch cướp bóc.',
        'Văn hóa & Tư tưởng: Xây dựng nền văn hóa mới mang tính chất dân tộc, khoa học, đại chúng; bài trừ văn hóa nô dịch; đẩy mạnh phong trào Bình dân học vụ diệt giặc dốt.',
        'Ngoại giao: Kiên trì nguyên tắc độc lập tự chủ; tranh thủ sự đồng tình, ủng hộ của các lực lượng hòa bình, dân chủ và tiến bộ trên toàn thế giới.',
      ],
    },
    sources: [
      {
        label: 'Kháng chiến toàn dân, toàn diện, trường kỳ, dựa vào sức mình là chính',
        url: 'https://hcmcpv.org.vn/tin-tap-chi/thong-tin-tuyen-truyen-12-2016/khang-chien-toan-dan-toan-dien-truong-ky-dua-vao-suc-minh-la-chinh-1486349354',
        note: 'Trang tin điện tử Đảng bộ Thành phố Hồ Chí Minh',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 7,
    part: 2,
    partTitle: 'Đường lối kháng chiến',
    title: 'NỘI DUNG 3: TRƯỜNG KỲ & DỰA VÀO SỨC MÌNH LÀ CHÍNH',
    subtitle: 'Đánh lâu dài để chuyển hóa lực lượng | Phát huy nội lực kết hợp ngoại lực',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'Đánh lâu dài và dựa vào sức mình là chính',
      points: [
        'Trường kỳ kháng chiến: Vừa đánh tiêu hao sinh lực địch, vừa xây dựng và phát triển lực lượng ta; lấy thời gian để chuyển hóa tương quan so sánh lực lượng từ yếu thành mạnh.',
        'Đánh lâu dài nhưng không kéo dài vô thời hạn: Luôn chủ động chuẩn bị thực lực, đón thời cơ và chớp lấy thời cơ để đưa cuộc kháng chiến tiến lên giành thắng lợi hoàn toàn.',
        'Dựa vào sức mình là chính: Lấy nguồn nội lực dân tộc, sức mạnh vật chất và tinh thần của nhân dân làm chỗ dựa chủ yếu, không trông chờ, ỷ lại vào bên ngoài.',
        'Tự lực kết hợp quốc tế: Giữ vững độc lập, tự chủ về đường lối; trên cơ sở tự lực cánh sinh vững vàng, tìm kiếm và phát huy sự ủng hộ, giúp đỡ của quốc tế khi có điều kiện.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam 2021',
        note: 'Nhà xuất bản Chính trị quốc gia Sự thật, Chương 2, Mục I.2',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 8,
    part: 3,
    partTitle: 'Tổ chức thực hiện',
    title: 'TỔ CHỨC THỰC HIỆN TOÀN DIỆN (1947 – 1950)',
    subtitle: 'Củng cố bộ máy chính quyền, xây dựng lực lượng vũ trang và tiềm lực hậu phương',
    section: 'Tổ chức thực hiện',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Các mặt công tác tổ chức thực hiện',
      points: [
        'Sau ngày toàn quốc kháng chiến, Trung ương Đảng phân chia cả nước thành các khu và chiến khu quân sự, thành lập Ủy ban kháng chiến hành chính các cấp, tập hợp mọi tầng lớp nhân dân tham gia kháng chiến.',
      ],
      groups: [
        {
          title: 'Chính quyền và tổ chức Đảng',
          points: [
            'Thành lập Ủy ban kháng chiến hành chính các cấp; củng cố các đoàn thể chính trị – xã hội để mở rộng Mặt trận dân tộc thống nhất.',
            'Hội nghị cán bộ Trung ương (tháng 4/1947) đề ra chủ trương củng cố chính quyền vùng địch tạm chiếm, đẩy mạnh chiến tranh du kích và công tác ngoại giao.',
            'Mở đợt kết nạp đảng viên mới "Lớp tháng Tám" (chỉ thị ngày 28/7/1947). Đến cuối năm 1947, toàn Đảng có hơn 70.000 đảng viên; trong hai năm 1948–1949 kết nạp thêm hơn 50.000 đảng viên mới.',
          ],
        },
        {
          title: 'Quân sự và an ninh',
          points: [
            'Xây dựng lực lượng vũ trang ba thứ quân; cuối năm 1947 bộ đội chính quy có hơn 12 vạn quân (57 trung đoàn, 20 tiểu đoàn độc lập), dân quân tự vệ hơn 1 triệu người.',
            'Tháng 1/1948, phong quân hàm Đại tướng cho đồng chí Võ Nguyên Giáp, Trung tướng cho đồng chí Nguyễn Bình cùng 9 Thiếu tướng; tháng 11/1949 ban hành Sắc lệnh về nghĩa vụ quân sự. Trong giai đoạn 1949–1950, quân số bộ đội đạt khoảng 23 vạn người, dân quân du kích phát triển lên 3 triệu người.',
            'Nha Công an Việt Nam được kiện toàn theo ngành dọc; Tổ điệp báo A13 đánh đắm Thông báo hạm Amyot d\'Inville của Pháp tại vùng biển Sầm Sơn, Thanh Hóa (tháng 9/1950).',
          ],
        },
        {
          title: 'Kinh tế, văn hóa và giáo dục',
          points: [
            'Đẩy mạnh phong trào tăng gia sản xuất, tự cấp tự túc lương thực, vải, giấy, nông cụ, thuốc men; bảo đảm đời sống bộ đội và nhân dân.',
            'Phong trào Thi đua ái quốc theo Lời kêu gọi ngày 11/6/1948 của Chủ tịch Hồ Chí Minh động viên các tầng lớp nhân dân tích cực đóng góp sức người, sức của.',
            'Hội nghị Văn hóa toàn quốc (tháng 7/1948) tiếp tục khẳng định phương châm xây dựng nền văn hóa mới mang tính dân tộc, khoa học, đại chúng; duy trì phong trào Bình dân học vụ và cải cách giáo dục.',
          ],
        },
        {
          title: 'Ngoại giao và liên minh Đông Dương',
          points: [
            'Đầu năm 1950, Chủ tịch Hồ Chí Minh đi thăm Trung Quốc và Liên Xô.',
            'Nhà nước Việt Nam Dân chủ Cộng hòa được các nước công nhận và đặt quan hệ ngoại giao: Trung Quốc (ngày 18/1/1950), Liên Xô (ngày 30/1/1950), tiếp đó là các nước dân chủ nhân dân Đông Âu và Triều Tiên (tháng 2/1950).',
            'Thực hiện chủ trương mở rộng mặt trận Lào - Miên, cử cán bộ, chiến sĩ sang giúp bạn xây dựng căn cứ kháng chiến tại Lào và Campuchia.',
          ],
        },
      ],
    },
    sources: [
      {
        label: 'Lịch sử biên niên Đảng Cộng sản Việt Nam (Tập 3)',
        url: 'https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176',
        note: 'Biên niên sự kiện tổ chức chính quyền, lực lượng vũ trang và xây dựng Đảng 1947–1950',
      },
      {
        label: 'Lời kêu gọi Thi đua ái quốc ngày 11/6/1948',
        url: 'https://baochinhphu.vn/ky-niem-63-nam-ngay-bac-ho-ra-loi-keu-goi-thi-dua-ai-quoc-11-6-1948-11-6-2011-10282458.htm',
        note: 'Báo điện tử Chính phủ — Phong trào thi đua tăng gia sản xuất và giết giặc lập công',
      },
      {
        label: 'Chiến công Tổ điệp báo A13 đánh đắm tàu Amyot d\'Inville',
        url: 'https://conganthanhhoa.gov.vn/tin-tuc-su-kien/su-kien-so-6-amodanhvin.html',
        note: 'Cổng thông tin điện tử Công an tỉnh Thanh Hóa (tháng 9/1950)',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 9,
    part: 3,
    partTitle: 'Tổ chức thực hiện',
    title: 'HAI CHIẾN DỊCH BƯỚC NGOẶT (1947 & 1950)',
    subtitle: 'Bẻ gãy "đánh nhanh, thắng nhanh" và giành quyền chủ động chiến lược',
    section: 'Tổ chức thực hiện',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Hai bước chuyển chiến lược trên chiến trường',
      points: [
        'Thực hiện đường lối toàn diện và trường kỳ, quân dân ta liên tiếp đánh bại cuộc tiến công lên căn cứ địa Việt Bắc năm 1947 và chủ động mở Chiến dịch Biên giới năm 1950 làm thay đổi cục diện chiến tranh.',
      ],
      groups: [
        {
          title: 'Chiến dịch Việt Bắc Thu – Đông 1947',
          points: [
            'Âm mưu của Pháp: Huy động khoảng 15.000 quân với 3 mũi tiến công (nhảy dù Bắc Kạn, đường số 4, sông Hồng - sông Lô) nhằm bắt cơ quan đầu não và tiêu diệt bộ đội chủ lực của ta.',
            'Chủ trương của Đảng: Ngày 15/10/1947, Ban Thường vụ Trung ương Đảng ra Chỉ thị "Phải phá tan cuộc tấn công mùa đông của giặc Pháp", phát động chiến tranh nhân dân chặn đánh địch trên các hướng.',
            'Kết quả: Sau 75 ngày đêm chiến đấu, quân dân ta bẻ gãy các mũi tiến công của Pháp, bảo vệ an toàn cơ quan đầu não và căn cứ địa kháng chiến; đánh bại chiến lược "đánh nhanh, thắng nhanh" của địch.',
          ],
        },
        {
          title: 'Chiến dịch Biên giới Thu – Đông 1950',
          points: [
            'Bối cảnh: Từ giữa năm 1949, Pháp triển khai Kế hoạch Rơve nhằm mở rộng chiếm đóng ở Bắc Bộ và khóa chặt biên giới Việt – Trung. Ngày 1/10/1949, nước Cộng hòa Nhân dân Trung Hoa ra đời; cùng với việc thiết lập quan hệ ngoại giao đầu năm 1950, tình hình quốc tế tạo thêm điều kiện thuận lợi cho cuộc kháng chiến của Việt Nam.',
            'Chủ trương của Đảng: Tháng 6/1950, Ban Thường vụ Trung ương Đảng quyết định mở Chiến dịch Biên giới nhằm tiêu diệt một bộ phận sinh lực địch, giải phóng dải biên giới, mở rộng căn cứ địa Việt Bắc và khai thông đường liên lạc quốc tế; Chủ tịch Hồ Chí Minh trực tiếp ra mặt trận chỉ đạo.',
            'Kết quả: Sau 29 ngày đêm chiến đấu (16/9 – 14/10/1950), ta giải phóng tuyến biên giới từ Cao Bằng đến Đình Lập, khai thông đường liên lạc với các nước xã hội chủ nghĩa; giành thế chủ động chiến lược trên chiến trường chính Bắc Bộ.',
          ],
        },
        {
          title: 'Chiến tranh du kích Nam Bộ và đấu tranh đô thị',
          points: [
            'Tại Nam Bộ, Xứ ủy chỉ đạo phát triển chiến tranh du kích, khắc phục khó khăn trước hệ thống đồn bốt và tháp canh của địch; tổ chức phục kích tiêu hao sinh lực địch, tiêu biểu là trận La Ngà (tháng 3/1948).',
            'Đấu tranh chính trị tại đô thị: Ngày 9/1/1950, học sinh, sinh viên Sài Gòn – Chợ Lớn biểu tình và bị đàn áp; học sinh Trần Văn Ơn hy sinh. Đây là một sự kiện tiêu biểu của phong trào đấu tranh đô thị, phối hợp với cuộc kháng chiến trên cả nước.',
          ],
        },
      ],
    },
    sources: [
      {
        label: 'Chiến dịch Biên giới (16/9 – 14/10/1950): Bước ngoặt cuộc kháng chiến',
        url: 'https://www.qdnd.vn/vung-buoc-duoi-quan-ky-quyet-thang/lich-su-quan-doi-nhan-dan-viet-nam/chien-dich-bien-gioi-16-9-14-10-1950-buoc-ngoat-cuoc-khang-chien-796808',
        note: 'Báo Quân đội nhân dân điện tử — 29 ngày đêm chiến đấu giành thế chủ động chiến lược trên chiến trường chính Bắc Bộ',
      },
      {
        label: 'Bước trưởng thành vượt bậc của Quân đội nhân dân Việt Nam',
        url: 'https://www.qdnd.vn/quoc-phong-an-ninh/xay-dung-quan-doi/buoc-truong-thanh-vuot-bac-cua-quan-doi-nhan-dan-viet-nam-636630',
        note: 'Báo Quân đội nhân dân điện tử — Đánh dấu bước nhảy vọt về tổ chức chỉ huy và tác chiến tập trung',
      },
      {
        label: 'Họp mặt kỷ niệm Quốc khánh nước Cộng hòa Nhân dân Trung Hoa',
        url: 'https://baochinhphu.vn/hop-mat-ky-niem-62-nam-quoc-khanh-trung-quoc-10293384.htm',
        note: 'Báo điện tử Chính phủ — Đối chiếu ngày thành lập nước Cộng hòa Nhân dân Trung Hoa (1/10/1949)',
      },
      {
        label: 'Phong trào biểu tình ngày 09/01/1950 tại Sài Gòn – Chợ Lớn và ngọn lửa Trần Văn Ơn',
        url: 'https://www.qdnd.vn/van-hoa/doi-song/xuc-dong-y-nghia-chuong-trinh-sang-mai-ngon-lua-tran-van-on-810762',
        note: 'Báo Quân đội nhân dân điện tử — Phong trào đấu tranh chính trị tại đô thị miền Nam',
      },
      {
        label: 'Góp phần đánh bại chiến lược đánh nhanh thắng nhanh của thực dân Pháp',
        url: 'https://www.qdnd.vn/ho-so-su-kien/70-nam-quan-doi-nhan-dan-viet-nam-anh-hung/gop-phan-danh-bai-chien-luoc-danh-nhanh-thang-nhanh-cua-thuc-dan-phap-261478',
        note: 'Báo Quân đội nhân dân điện tử — Chiến dịch phản công Việt Bắc Thu – Đông 1947 kéo dài 75 ngày đêm',
      },
      {
        label: 'Chiến tranh cách mạng Việt Nam 1945–1975: Thắng lợi và bài học',
        note: 'Ban Chỉ đạo Tổng kết chiến tranh trực thuộc Bộ Chính trị (Nhà xuất bản Chính trị quốc gia, 2008)',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 10,
    part: 3,
    partTitle: 'Tổ chức thực hiện',
    title: 'KẾT QUẢ, HẠN CHẾ VÀ BÀI HỌC KINH NGHIỆM',
    subtitle: 'Tổng kết giai đoạn kháng chiến 1946 – 1950',
    section: 'Tổng kết & Bài học',
    suggestedDurationSeconds: 70,
    content: {
      heading: 'Kết quả, hạn chế và bài học kinh nghiệm',
      points: [
        'Kết quả lịch sử: Đường lối kháng chiến đúng đắn đã động viên được sức mạnh toàn dân tộc, đưa cuộc kháng chiến từ thế phòng ngự ban đầu sang thế chủ động tiến công trên chiến trường chính Bắc Bộ.',
        'Hạn chế và việc khắc phục: Cuối năm 1950, Đảng quyết định tạm ngừng phát triển Đảng để củng cố tổ chức, do việc kết nạp ở nhiều nơi quá nóng và chưa bảo đảm tiêu chuẩn. Trung ương đồng thời uốn nắn tư tưởng chủ quan, nóng vội muốn chuyển nhanh sang tổng phản công khi chưa đủ điều kiện và việc huy động sức người, sức của vượt quá sức dân.',
        'Bài học kinh nghiệm: (1) Giữ vững và tăng cường sự lãnh đạo của Đảng; (2) Dựa vào dân, phát huy khối đại đoàn kết toàn dân tộc; (3) Kết hợp kiên định nguyên tắc độc lập với mềm dẻo về sách lược; (4) Tự lực cánh sinh, chủ động chuẩn bị nội lực.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam 2021',
        note: 'Nhà xuất bản Chính trị quốc gia Sự thật, Chương 2, Mục I.2: Đúc kết kinh nghiệm lãnh đạo và công tác uốn nắn của Đảng',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 11,
    part: 4,
    partTitle: 'Liên hệ & Ôn tập',
    title: 'VẬN DỤNG THỰC TIỄN: BÀI HỌC TỰ LỰC CÁNH SINH',
    subtitle: 'Phát triển nguồn nhân lực ngành bán dẫn và xây dựng năng lực công nghệ',
    section: 'Liên hệ thực tiễn',
    suggestedDurationSeconds: 70,
    content: {
      heading: 'Vận dụng bài học chuẩn bị nội lực trong bối cảnh phát triển công nghệ',
      points: [
        'Bài học liên hệ: Trong kháng chiến, xây dựng lực lượng và chuẩn bị nguồn lực giúp ta từng bước giành thế chủ động. Trong bối cảnh phát triển đất nước hiện nay, có thể vận dụng tinh thần chủ động ấy vào đào tạo con người, nghiên cứu và nâng cao năng lực sản xuất trong nước, đồng thời hợp tác quốc tế.',
        'Ví dụ ngành bán dẫn: Ngày 21/9/2024, Thủ tướng Chính phủ ban hành Quyết định số 1017/QĐ-TTg về chương trình phát triển nguồn nhân lực ngành công nghiệp bán dẫn, đặt mục tiêu đến năm 2030 đào tạo ít nhất 50.000 người có trình độ đại học trở lên.',
        'Cùng ngày, Quyết định số 1018/QĐ-TTg ban hành chiến lược phát triển công nghiệp bán dẫn Việt Nam. Hai văn bản có phạm vi khác nhau: một chương trình tập trung vào nhân lực, một chiến lược định hướng phát triển ngành.',
        'Với sinh viên: Học vững chuyên môn, rèn ngoại ngữ và kỹ năng số; tham gia dự án, thực tập để tích lũy kinh nghiệm. Khi dùng công nghệ để học tập, cần kiểm chứng thông tin và tự chịu trách nhiệm về kết quả.',
      ],
    },
    sources: [
      {
        label: 'Phát triển nguồn nhân lực ngành công nghiệp bán dẫn (Quyết định 1017 & 1018)',
        url: 'https://baochinhphu.vn/nganh-giao-duc-khan-truong-phat-trien-nguon-nhan-luc-nganh-cong-nghiep-ban-dan-102241211093806289.htm',
        note: 'Báo điện tử Chính phủ — Chương trình nhân lực theo Quyết định số 1017/QĐ-TTg và chiến lược ngành theo Quyết định số 1018/QĐ-TTg',
      },
      {
        label: 'Báo cáo giải trình về kinh tế - xã hội (Chương trình nhân lực bán dẫn)',
        url: 'https://baochinhphu.vn/bao-cao-giai-trinh-ve-kinh-te-xa-hoi-do-thu-tuong-pham-minh-chinh-trinh-bay-tai-ky-hop-thu-8-quoc-hoi-khoa-xv-102241112153549565.htm',
        note: 'Báo điện tử Chính phủ — Mục tiêu đào tạo nhân lực đến năm 2030 theo Quyết định số 1017/QĐ-TTg',
      },
      {
        label: 'Khởi động chương trình đào tạo nhân lực vi mạch bán dẫn tại Đà Nẵng (26/3/2024)',
        url: 'https://mst.gov.vn/da-nang-khoi-dong-chuong-trinh-dao-tao-nhan-luc-vi-mach-ban-dan-197240401103958705.htm',
        note: 'Cổng thông tin điện tử Bộ Khoa học và Công nghệ (bài gốc Mic.gov.vn)',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 12,
    part: 4,
    partTitle: 'Liên hệ & Ôn tập',
    title: 'KẾT LUẬN VÀ ÔN TẬP',
    subtitle: 'Toàn dân, toàn diện, trường kỳ, dựa vào sức mình là chính',
    section: 'Kết luận & Hoạt động',
    suggestedDurationSeconds: 60,
    content: {
      heading: 'Nhìn lại giai đoạn 1946–1950',
      points: [
        'Kháng chiến toàn dân, toàn diện, trường kỳ và dựa vào sức mình là chính là những nội dung cốt lõi của đường lối kháng chiến.',
        'Từ cuộc chiến đấu ở các đô thị đến Chiến dịch Việt Bắc năm 1947 và Chiến dịch Biên giới năm 1950, lực lượng kháng chiến từng bước lớn mạnh, giành quyền chủ động trên chiến trường chính Bắc Bộ.',
        'Giai đoạn này để lại bài học sâu sắc về đoàn kết toàn dân, xây dựng hậu phương và tinh thần tự lực cánh sinh.',
        'Cùng ôn lại bài qua 10 câu trắc nghiệm và đuổi hình bắt chữ. Mở mục Game trên thanh điều hướng, chọn Người chơi rồi nhập mã phòng hoặc quét mã QR trên màn hình.',
      ],
    },
    sources: [
      {
        label: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam',
        note: 'Nhà xuất bản Chính trị quốc gia Sự thật, 2021, Chương 2, Mục I.2',
      },
    ],
    speakerNotes: '',
  },
];
