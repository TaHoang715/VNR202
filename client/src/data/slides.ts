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
      heading: 'Bốn nội dung trọng tâm của chuyên đề',
      points: [
        'Phần I — Bối cảnh lịch sử bùng nổ cuộc kháng chiến toàn quốc (12/1946): Âm mưu, hành động bội ước của thực dân Pháp, quyết định lịch sử của Trung ương Đảng tại Vạn Phúc, Lời kêu gọi Toàn quốc kháng chiến và cuộc chiến đấu 60 ngày đêm bảo vệ Hà Nội cùng các đô thị.',
        'Phần II — Đường lối kháng chiến toàn quốc của Đảng: Hệ thống văn kiện cốt lõi, mục tiêu kháng chiến, 4 trụ cột (Toàn dân, Toàn diện, Trường kỳ, Dựa vào sức mình là chính).',
        'Phần III — Quá trình chỉ đạo xây dựng thực lực và các thắng lợi quân sự tạo bước ngoặt (1947–1950): Tổ chức kháng chiến trên 4 mặt (chính quyền & Đảng, quân sự & an ninh, kinh tế & văn hóa - giáo dục, ngoại giao & liên minh Đông Dương) và 2 chiến dịch lớn (Việt Bắc 1947, Biên giới 1950).',
        'Phần IV — Liên hệ thực tiễn, Trách nhiệm thế hệ trẻ & Minh bạch học thuật: Vận dụng bài học "Dựa vào sức mình là chính", Chiến lược phát triển công nghiệp bán dẫn (QĐ 1018/QĐ-TTg), làm chủ khoa học công nghệ, trách nhiệm của thế hệ trẻ và báo cáo minh bạch ứng dụng AI.',
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
    title: 'BỐI CẢNH LỊCH SỬ BÙNG NỔ CUỘC KHÁNG CHIẾN TOÀN QUỐC (12/1946)',
    subtitle: 'Âm mưu bội ước của thực dân Pháp, quyết định lịch sử của Đảng và 60 ngày đêm bảo vệ Thủ đô',
    section: 'Bối cảnh lịch sử',
    suggestedDurationSeconds: 70,
    content: {
      heading: 'Âm mưu và hành động bội ước của thực dân Pháp',
      points: [
        'Thái độ kiên trì hòa bình của Việt Nam: Sau Cách mạng Tháng Tám 1945, Đảng và Chủ tịch Hồ Chí Minh đã hết sức kiên trì thực hiện đường lối hòa hoãn nhằm giữ vững hòa bình, tranh thủ thời gian chuẩn bị thực lực.',
        'Hành động khiêu khích và bộc lộ bản chất xâm lược của Pháp: Cuối tháng 11/1946, Pháp trắng trợn nổ súng đánh chiếm Hải Phòng, Lạng Sơn, chiếm đóng trụ sở Bộ Tài chính và Bộ Giao thông Công chính ở Hà Nội.',
        'Ngày 16 và 17/12/1946, quân Pháp bắn đại bác tàn sát dã man đồng bào ta ở phố Yên Ninh và Hàng Bún (Hà Nội).',
        'Ngày 18/12/1946, Tướng Morlière gửi 3 tối hậu thư đòi giải giáp lực lượng tự vệ Việt Nam, đòi giao quyền kiểm soát an ninh Thủ đô cho quân đội Pháp trong vòng 48 giờ.',
        'Hội nghị Ban Thường vụ Trung ương Đảng tại Vạn Phúc (Hà Đông): Trong hai ngày 18 và 19/12/1946, Ban Thường vụ Trung ương Đảng họp dưới sự chủ trì của Chủ tịch Hồ Chí Minh, nhận định hành động của Pháp đã vượt quá giới hạn chịu đựng, hòa hoãn không còn khả năng tiếp tục. Đảng quyết định chủ động phát động cuộc kháng chiến trên phạm vi cả nước để bảo vệ độc lập, tự do.',
      ],
      groups: [
        {
          title: 'Lời kêu gọi Toàn quốc kháng chiến của Chủ tịch Hồ Chí Minh (Đêm 19/12/1946)',
          points: [
            'Đêm 19/12/1946, Chủ tịch Hồ Chí Minh ra Lời kêu gọi Toàn quốc kháng chiến, khẳng định quyết tâm sắt đá của cả dân tộc: "Chúng ta muốn hòa bình, chúng ta phải nhân nhượng. Nhưng chúng ta càng nhân nhượng, thực dân Pháp càng lấn tới, vì chúng quyết tâm hình thành lại ách thống trị trên đất nước ta một lần nữa! Không! Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ."',
            'Lời kêu gọi xác định phương châm đánh giặc của toàn dân: "Bất kỳ đàn ông, đàn bà, bất kỳ người già, người trẻ, không chia tôn giáo, đảng phái, dân tộc. Hễ là người Việt Nam thì phải đứng lên đánh thực dân Pháp để cứu Tổ quốc."',
          ],
        },
        {
          title: 'Cuộc chiến đấu 60 ngày đêm bảo vệ Thủ đô Hà Nội và các đô thị',
          points: [
            'Bùng nổ chiến sự: Đúng 20 giờ 03 phút ngày 19/12/1946, pháo đài Láng nổ súng phát lệnh, điện toàn thành phố Hà Nội vụt tắt, cuộc kháng chiến toàn quốc bùng nổ.',
            'Diễn biến chiến sự ở Hà Nội và các đô thị bắc vĩ tuyến 16: Quân và dân Hà Nội lập các chướng ngại vật, chiến lũy trên khắp các đường phố, chiến đấu kiên cường với tinh thần "Quyết tử cho Tổ quốc quyết sinh". Trung đoàn Thủ đô được thành lập ngay trong khói lửa chiến đấu, giam chân lực lượng tinh nhuệ của Pháp suốt 60 ngày đêm (từ 19/12/1946 đến 17/2/1947). Đồng thời, quân dân tại các đô thị khác như Huế, Đà Nẵng, Vinh, Nam Định, Bắc Giang... cũng đồng loạt tiến công, vây hãm quân địch.',
            'Ý nghĩa lịch sử của cuộc chiến đấu đô thị: Tiêu hao một bộ phận quan trọng sinh lực địch, giam chân Pháp trong các đô thị; bảo vệ an toàn tuyệt đối cho cơ quan đầu não của Đảng, Chính phủ và Mặt trận rút lên căn cứ địa Việt Bắc an toàn; đánh bại bước đầu âm mưu "đánh nhanh, thắng nhanh" của thực dân Pháp, tạo điều kiện cho cả nước chuyển sang trạng thái chiến tranh lâu dài.',
          ],
        },
      ],
      archivalQuote: {
        text: 'Chúng ta muốn hòa bình, chúng ta phải nhân nhượng. Nhưng chúng ta càng nhân nhượng, thực dân Pháp càng lấn tới, vì chúng quyết tâm cướp nước ta lần nữa! Không! Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ. Hỡi đồng bào! Chúng ta phải đứng lên!',
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
    title: 'CÁC VĂN KIỆN HÌNH THÀNH ĐƯỜNG LỐI KHÁNG CHIẾN',
    subtitle: 'Sự hình thành và phát triển qua hệ thống văn kiện cốt lõi (1945 – 1947)',
    section: 'Đường lối kháng chiến',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'Sự hình thành và phát triển của đường lối',
      points: [
        'Đường lối kháng chiến chống thực dân Pháp của Đảng không phải ra đời ngẫu nhiên mà được hình thành, bổ sung và phát triển qua thực tiễn cách mạng Việt Nam trong giai đoạn 1945 – 1947.',
        'Hệ thống lý luận đường lối được thể hiện tập trung qua các văn kiện quan trọng của Đảng, các Lời kêu gọi, bài viết, bài nói của Chủ tịch Hồ Chí Minh và đồng chí Trường Chinh.',
      ],
      groups: [
        {
          title: 'Các văn kiện cốt lõi hình thành đường lối',
          points: [
            'Chỉ thị Kháng chiến kiến quốc (ngày 25/11/1945): Đề ra hai nhiệm vụ chiến lược song song là kháng chiến và kiến quốc, xác định kẻ thù chính là thực dân Pháp.',
            'Chỉ thị Tình hình và chủ trương (ngày 3/3/1946) & Chỉ thị Hòa để tiến (ngày 9/3/1946): Tạm thời hòa hoãn với Pháp để đuổi quân Tưởng Giới Thạch về nước, tranh thủ thời gian củng cố thực lực.',
            'Chỉ thị Toàn dân kháng chiến của Trung ương Đảng (ngày 12/12/1946): Đề ra những đường lối cơ bản về cuộc kháng chiến toàn dân, toàn diện.',
            'Lời kêu gọi Toàn quốc kháng chiến của Chủ tịch Hồ Chí Minh (ngày 19/12/1946): Khẳng định ý chí sắt đá "thà hy sinh tất cả chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ", lời kêu gọi toàn dân đứng lên đánh giặc.',
            'Tác phẩm Kháng chiến nhất định thắng lợi của đồng chí Trường Chinh (xuất bản tháng 8/1947): Tác phẩm lý luận hoàn chỉnh, giải thích rõ ràng, chi tiết về tính chất, mục tiêu, phương châm và các giai đoạn phát triển của cuộc kháng chiến.',
          ],
        },
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
    ],
    speakerNotes: '',
  },
  {
    id: 4,
    part: 2,
    partTitle: 'Đường lối kháng chiến',
    title: 'MỤC TIÊU CỦA CUỘC KHÁNG CHIẾN',
    subtitle: 'Mục tiêu dân tộc, dân chủ và hòa bình',
    section: 'Mục tiêu kháng chiến',
    suggestedDurationSeconds: 45,
    content: {
      heading: 'Mục tiêu của cuộc kháng chiến',
      points: [
        'Mục tiêu dân tộc: Đánh đổ thực dân Pháp xâm lược, đập tan hoàn toàn ách thống trị thực dân, giành nền độc lập, tự do và thống nhất hoàn toàn cho Tổ quốc.',
        'Mục tiêu dân chủ và hòa bình: Bảo vệ chế độ dân chủ cộng hòa, vì nền tự do dân chủ của nhân dân và góp phần tích cực bảo vệ hòa bình, an ninh thế giới.',
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
    title: '4 TRỤ CỘT ĐƯỜNG LỐI: KHÁNG CHIẾN TOÀN DÂN',
    subtitle: 'Toàn dân đánh giặc — "Mỗi người dân là một chiến sĩ, mỗi làng xã là một pháo đài"',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Kháng chiến Toàn dân (Toàn dân đánh giặc)',
      points: [
        'Bản chất: Đem toàn bộ sức dân, tài dân, lực dân; động viên toàn thể nhân dân tích cực tham gia kháng chiến.',
        'Phương thức thực hiện: Xây dựng sự đồng thuận, nhất trí của cả nước; huy động mọi người dân không phân biệt gái, trai, già, trẻ, tôn giáo, đảng phái.',
        'Phương châm hành động: Thực hiện phương châm "mỗi người dân là một chiến sĩ, mỗi làng xã là một pháo đài, mỗi đường phố là một mặt trận".',
        'Lực lượng nòng cốt: Trong khối đại đoàn kết toàn dân đó, Quân đội nhân dân làm lực lượng nòng cốt cho toàn dân đánh giặc.',
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
    title: '4 TRỤ CỘT ĐƯỜNG LỐI: KHÁNG CHIẾN TOÀN DIỆN',
    subtitle: 'Đánh địch trên mọi mặt trận: Quân sự, Chính trị, Kinh tế, Văn hóa – Tư tưởng, Ngoại giao',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Kháng chiến Toàn diện (Đánh địch trên mọi mặt trận)',
      points: [
        'Bản chất: Đánh địch trên mọi lĩnh vực, mọi mặt trận, không chỉ bằng quân sự mà bao gồm cả chính trị, kinh tế, văn hóa, tư tưởng và ngoại giao.',
        'Mục tiêu: Động viên và phát huy tối đa mọi tiềm năng, sức mạnh của dân tộc, mọi nguồn lực vật chất và tinh thần trong nhân dân phục vụ cho thắng lợi.',
      ],
      groups: [
        {
          title: 'Mối quan hệ giữa các mặt trận',
          points: [
            'Mặt trận Quân sự (đấu tranh vũ trang): Giữ vai trò mũi nhọn, mang tính chất quyết định trực tiếp trên chiến trường.',
            'Mặt trận Chính trị: Động viên tinh thần, củng cố khối đại đoàn kết toàn dân, cô lập kẻ thù.',
            'Mặt trận Kinh tế: Xây dựng nền kinh tế tự cấp tự túc, vừa sản xuất vừa đánh giặc.',
            'Mặt trận Văn hóa - Tư tưởng: Xây dựng nền văn hóa mới (dân tộc, khoa học, đại chúng), động viên tinh thần kháng chiến.',
            'Mặt trận Ngoại giao: Tranh thủ sự ủng hộ quốc tế, làm rõ tính chất chính nghĩa của cuộc kháng chiến.',
          ],
        },
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
    title: '4 TRỤ CỘT: KHÁNG CHIẾN TRƯỜNG KỲ & DỰA VÀO SỨC MÌNH LÀ CHÍNH',
    subtitle: 'Đánh lâu dài để chuyển hóa lực lượng | Phát huy nội lực dân tộc kết hợp tranh thủ ngoại lực',
    section: 'Nội dung cốt lõi',
    suggestedDurationSeconds: 80,
    content: {
      heading: 'Tư tưởng chỉ đạo chiến lược của Đảng',
      points: [
        'Trường kỳ và Dựa vào sức mình là chính là hai trụ cột chiến lược giải quyết bài toán so sánh lực lượng ban đầu giữa ta và thực dân Pháp.',
      ],
      groups: [
        {
          title: 'Kháng chiến Trường kỳ (Đánh lâu dài)',
          points: [
            'Bản chất: Là tư tưởng chỉ đạo chiến lược xuất phát từ sự chênh lệch lực lượng ban đầu (ta yếu hơn địch về trang bị, vật chất).',
            'Cơ chế chuyển hóa lực lượng: Vừa đánh tiêu hao sinh lực địch, vừa bảo toàn, xây dựng và phát triển lực lượng ta. Từng bước làm chuyển biến so sánh lực lượng trên chiến trường theo hướng có lợi cho ta, lấy thời gian làm lực lượng vật chất để chuyển hóa từ yếu thành mạnh.',
            'Biện pháp chỉ đạo: Kháng chiến lâu dài không có nghĩa là kéo dài vô thời hạn thụ động, mà phải luôn chủ động tranh thủ, chớp thời cơ thúc đẩy cuộc kháng chiến có bước nhảy vọt về chất, thắng từng bước để đi đến thắng lợi cuối cùng.',
          ],
        },
        {
          title: 'Kháng chiến Dựa vào sức mình là chính (Tự lực cánh sinh)',
          points: [
            'Bản chất: Kế thừa tư tưởng chiến lược của Chủ tịch Hồ Chí Minh trong sự nghiệp giải phóng dân tộc.',
            'Nguồn lực cốt lõi: Phải lấy nguồn nội lực của dân tộc, phát huy sức mạnh vật chất và tinh thần trong nhân dân ta làm chỗ dựa chủ yếu, nguồn lực chủ yếu của cuộc chiến tranh nhân dân.',
            'Mối quan hệ giữa Nội lực và Ngoại lực: Giữ vững độc lập, tự chủ về đường lối là yếu tố quan trọng hàng đầu. Trên cơ sở tự lực cánh sinh, ta mới chủ động tìm kiếm, phát huy cao độ và có hiệu quả sự ủng hộ, giúp đỡ về tinh thần lẫn vật chất của quốc tế khi có điều kiện.',
          ],
        },
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
    title: 'TỔ CHỨC, CHỈ ĐẠO CUỘC KHÁNG CHIẾN (1947 – 1950)',
    subtitle: 'Xây dựng bộ máy chính quyền, Đảng, lực lượng vũ trang, kinh tế – văn hóa và ngoại giao',
    section: 'Tổ chức thực hiện',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Bốn mặt công tác chỉ đạo xây dựng thực lực kháng chiến',
      points: [
        'Sau ngày toàn quốc kháng chiến, Trung ương Đảng và Chính phủ đã triển khai đồng bộ các mặt công tác nhằm củng cố chính quyền, xây dựng lực lượng vũ trang và tiềm lực hậu phương vững mạnh.',
      ],
      groups: [
        {
          title: 'Củng cố bộ máy chính quyền và Xây dựng tổ chức Đảng',
          points: [
            'Cải tổ hành chính & bộ máy: Trung ương Đảng chia cả nước thành các khu và chiến khu quân sự; thành lập Ủy ban kháng chiến hành chính các cấp; củng cố các tổ chức chính trị – xã hội để mở rộng Mặt trận dân tộc thống nhất.',
            'Xây dựng và phát triển Đảng: Hội nghị cán bộ Trung ương (tháng 4/1947) đề ra chủ trương củng cố chính quyền ở vùng tạm bị chiếm, phát động chiến tranh du kích, đẩy mạnh ngoại giao và mở đợt kết nạp đảng viên mới "Lớp tháng Tám".',
            'Kết quả phát triển Đảng: Cuối năm 1947, tổng số đảng viên đạt hơn 70.000 người. Trong hai năm 1948 – 1949, Đảng kết nạp thêm hơn 50.000 đảng viên mới.',
          ],
        },
        {
          title: 'Xây dựng lực lượng Quân sự và An ninh',
          points: [
            'Xây dựng lực lượng vũ trang 3 thứ quân: Bộ đội chủ lực, bộ đội địa phương và dân quân tự vệ (du kích).',
            'Thống kê phát triển: Cuối năm 1947, bộ đội chính quy có hơn 12 vạn quân (57 trung đoàn, 20 tiểu đoàn độc lập). Tháng 11/1949, Chủ tịch Hồ Chí Minh ban hành Sắc lệnh về Nghĩa vụ quân sự, đưa bộ đội chủ lực lên 23 vạn người và lực lượng dân quân tự vệ, du kích phát triển lên 3 triệu người.',
            'Phong hàm tướng lĩnh: Tháng 1/1948, Chủ tịch Hồ Chí Minh ký Sắc lệnh phong quân hàm Đại tướng cho đồng chí Võ Nguyên Giáp, Trung tướng cho đồng chí Nguyễn Bình cùng 9 Thiếu tướng.',
            'Xây dựng lực lượng Công an nhân dân: Hệ thống Nha Công an được thiết lập thống nhất theo ngành dọc từ cấp Trung ương đến khu, ty, quận, huyện. Chiến công tiêu biểu: Tổ điệp báo A13 đánh đắm Thông báo hạm Amyot D\'Inville của Pháp ngoài khơi Sầm Sơn, Thanh Hóa (tháng 9/1950), đập tan âm mưu thành lập "chiến khu quốc gia" và đánh chiếm vùng tự do Thanh – Nghệ – Tĩnh của Pháp.',
          ],
        },
        {
          title: 'Xây dựng thực lực Kinh tế, Văn hóa – Xã hội',
          points: [
            'Kinh tế: Đẩy mạnh phong trào Tăng gia sản xuất, tự cấp tự túc lương thực, thuốc chữa bệnh, vải vóc, giấy, nông cụ... đảm bảo đời sống cho bộ đội và nhân dân. Phong trào Thi đua ái quốc xuất phát từ Lời kêu gọi Thi đua ái quốc của Chủ tịch Hồ Chí Minh (ngày 11/6/1948) lôi cuốn đông đảo các tầng lớp nhân dân tham gia.',
            'Văn hóa – Giáo dục: Duy trì phong trào Bình dân học vụ, dạy và học ở các trường phổ thông; triển khai cải cách giáo dục quốc gia. Hội nghị Văn hóa toàn quốc (tháng 7/1948) thông qua phương châm xây dựng nền văn hóa mới mang tính chất Dân tộc, Khoa học và Đại chúng, từng bước xóa bỏ tàn dư văn hóa thực dân, phong kiến.',
          ],
        },
        {
          title: 'Mặt trận Ngoại giao và Liên minh chiến đấu Đông Dương',
          points: [
            'Ngoại giao quốc tế: Đầu năm 1950, Chủ tịch Hồ Chí Minh đi thăm Trung Quốc và Liên Xô. Lần lượt các nước công nhận và đặt quan hệ ngoại giao với Việt Nam Dân chủ Cộng hòa: Trung Quốc (ngày 18/1/1950), Liên Xô (ngày 30/1/1950), cùng các nước dân chủ nhân dân Đông Âu và Triều Tiên, phá vỡ thế bị bao vây cô lập.',
            'Thắt chặt Liên minh chiến đấu 3 nước Việt – Miên – Lào: Thực hiện chủ trương "mở rộng mặt trận Lào – Miên", cử cán bộ và chiến sĩ sang giúp lực lượng kháng chiến Lào và Campuchia xây dựng các khu căn cứ.',
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
    title: 'HAI CHIẾN DỊCH QUÂN SỰ TẠO BƯỚC NGOẶT LỊCH SỬ (1947 – 1950)',
    subtitle: 'Đánh bại "Đánh nhanh, thắng nhanh" và "Kết thúc thời kỳ chiến đấu trong vòng vây"',
    section: 'Tổ chức thực hiện',
    suggestedDurationSeconds: 90,
    content: {
      heading: 'Hai chiến dịch quân sự tạo bước ngoặt lịch sử (1947 – 1950)',
      points: [
        'Chiến dịch Việt Bắc Thu – Đông 1947 và Chiến dịch Biên giới Thu – Đông 1950 là hai chiến dịch quân sự lớn mang ý nghĩa bản lề, làm thất bại chiến lược của địch và chuyển hóa căn bản so sánh lực lượng trên chiến trường chính Bắc Bộ.',
      ],
      groups: [
        {
          title: 'Chiến dịch Việt Bắc Thu – Đông 1947: Đánh bại chiến lược "Đánh nhanh, thắng nhanh"',
          points: [
            'Âm mưu của thực dân Pháp: Huy động 15.000 quân mở cuộc tiến công lớn lên căn cứ địa Việt Bắc nhằm bắt gọn cơ quan đầu não kháng chiến và tiêu diệt bộ đội chủ lực của ta.',
            'Chủ trương của Đảng: Ngày 15/10/1947, Ban Thường vụ Trung ương Đảng ra Chỉ thị "Phải phá tan cuộc tấn công mùa đông của giặc Pháp", phát động chiến tranh du kích, chặt đứt giao thông và chặn đánh địch trên tất cả các hướng.',
            'Kết quả & Ý nghĩa: Sau 75 ngày đêm chiến đấu kiên cường (đến 21/12/1947), quân và dân ta bẻ gãy hoàn toàn các mũi tiến công của Pháp, bảo vệ an toàn cơ quan đầu não và căn cứ địa kháng chiến. Làm thất bại hoàn toàn chiến lược "đánh nhanh, thắng nhanh" của Pháp, buộc địch phải chuyển sang đánh lâu dài.',
          ],
        },
        {
          title: 'Chiến dịch Biên giới Thu – Đông 1950: "Kết thúc thời kỳ chiến đấu trong vòng vây"',
          points: [
            'Âm mưu của địch: Pháp thực hiện Kế hoạch Rơve (1949) nhằm mở rộng chiếm đóng đồng bằng Bắc Bộ, khóa chặt biên giới Việt – Trung.',
            'Chủ trương của Đảng: Tháng 6/1950, Ban Thường vụ Trung ương Đảng quyết định mở Chiến dịch Biên giới nhằm tiêu diệt sinh lực địch, giải phóng tuyến biên giới, mở rộng căn cứ địa Việt Bắc và khai thông quan hệ quốc tế. Đây là chiến dịch tiến công quy mô lớn đầu tiên do ta chủ động xướng xuất; Chủ tịch Hồ Chí Minh trực tiếp ra mặt trận thị sát và chỉ đạo.',
            'Kết quả & Ý nghĩa: Sau 30 ngày đêm chiến đấu liên tục (16/9 – 17/10/1950), ta giải phóng tuyến biên giới Việt – Trung. Thắng lợi giúp ta "kết thúc thời kỳ chiến đấu trong vòng vây", mở ra hành lang thông thương với hậu phương quốc tế và đưa cuộc kháng chiến chuyển sang giai đoạn chủ động tiến công.',
          ],
        },
      ],
    },
    sources: [
      {
        label: 'Chiến dịch Biên giới (16/9 – 17/10/1950): Bước ngoặt cuộc kháng chiến',
        url: 'https://www.qdnd.vn/vung-buoc-duoi-quan-ky-quyet-thang/lich-su-quan-doi-nhan-dan-viet-nam/chien-dich-bien-gioi-16-9-14-10-1950-buoc-ngoat-cuoc-khang-chien-796808',
        note: 'Báo Quân đội nhân dân điện tử — 30 ngày đêm chiến đấu kết thúc thời kỳ chiến đấu trong vòng vây',
      },
      {
        label: 'Góp phần đánh bại chiến lược đánh nhanh thắng nhanh của thực dân Pháp',
        url: 'https://www.qdnd.vn/ho-so-su-kien/70-nam-quan-doi-nhan-dan-viet-nam-anh-hung/gop-phan-danh-bai-chien-luoc-danh-nhanh-thang-nhanh-cua-thuc-dan-phap-261478',
        note: 'Báo Quân đội nhân dân điện tử — Chiến dịch phản công Việt Bắc Thu – Đông 1947 kéo dài 75 ngày đêm',
      },
      {
        label: 'Họp mặt kỷ niệm Quốc khánh nước Cộng hòa Nhân dân Trung Hoa',
        url: 'https://baochinhphu.vn/hop-mat-ky-niem-62-nam-quoc-khanh-trung-quoc-10293384.htm',
        note: 'Báo điện tử Chính phủ — Ngày thành lập nước CHND Trung Hoa (1/10/1949)',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 10,
    part: 4,
    partTitle: 'Liên hệ & Vận dụng',
    title: 'VẬN DỤNG THỰC TIỄN & BÀI HỌC THỜI ĐẠI: "DỰA VÀO SỨC MÌNH LÀ CHÍNH"',
    subtitle: 'Chiến lược phát triển công nghiệp bán dẫn (QĐ 1018/QĐ-TTg) và làm chủ khoa học công nghệ',
    section: 'Liên hệ thực tiễn',
    suggestedDurationSeconds: 70,
    content: {
      heading: '1. Vận dụng bài học "Dựa vào sức mình là chính"',
      points: [
        'Quan điểm lịch sử: "Dựa vào sức mình là chính" là một quan điểm chiến lược và nguyên tắc chỉ đạo quan trọng của Đảng Cộng sản Việt Nam và Chủ tịch Hồ Chí Minh.',
        'Trong kháng chiến: Việt Nam phát huy sức mạnh của nhân dân, chủ động vượt qua khó khăn, đồng thời tranh thủ sự ủng hộ và giúp đỡ quốc tế.',
        'Trong bối cảnh hiện nay: Bài học này tiếp tục có ý nghĩa trong việc xây dựng nền kinh tế độc lập, tự chủ, nâng cao năng lực cạnh tranh và giảm sự phụ thuộc vào bên ngoài.',
        'Định hướng vận dụng: Việt Nam cần phát huy nguồn lực trong nước, nâng cao chất lượng nguồn nhân lực và chủ động tiếp thu những thành tựu khoa học, công nghệ của thế giới.',
      ],
      groups: [
        {
          title: 'Minh chứng thực tế: Chiến lược phát triển công nghiệp bán dẫn Việt Nam',
          points: [
            'Việt Nam đã ban hành Chiến lược phát triển công nghiệp bán dẫn đến năm 2030, tầm nhìn đến năm 2050 theo Quyết định 1018/QĐ-TTg ngày 21/9/2024.',
            'Chiến lược đặt mục tiêu phát triển doanh nghiệp thiết kế, năng lực sản xuất, đóng gói và kiểm thử chip bán dẫn trong nước.',
            '=> Điều này thể hiện nỗ lực nâng cao năng lực công nghệ quốc gia, đồng thời kết hợp nguồn lực trong nước với hợp tác quốc tế.',
          ],
        },
        {
          title: '2. Từ thắng lợi lịch sử đến yêu cầu làm chủ khoa học và công nghệ',
          points: [
            'Liên hệ lịch sử: Trong kháng chiến 1945–1950, đường lối kháng chiến toàn dân, toàn diện, trường kỳ, dựa vào sức mình là chính đã định hướng cho toàn dân vượt qua khó khăn. Chiến thắng Việt Bắc Thu – Đông năm 1947 góp phần làm thất bại chiến lược đánh nhanh, thắng nhanh của Pháp; Chiến dịch Biên giới năm 1950 giúp quân ta giành thế chủ động trên chiến trường chính Bắc Bộ.',
            'Bài học rút ra: Những thắng lợi này cho thấy tầm quan trọng của việc chủ động xây dựng lực lượng, phát huy sức mạnh toàn dân và từng bước nâng cao năng lực của bản thân.',
            'Vận dụng hiện nay: Trong thời bình, tinh thần chủ động và tự cường cần được vận dụng vào phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số.',
            'Ví dụ thực tế: Việt Nam thúc đẩy phát triển công nghiệp bán dẫn và chuyển đổi số. Đây là những lĩnh vực đòi hỏi nguồn nhân lực có trình độ, năng lực nghiên cứu và khả năng ứng dụng công nghệ vào thực tế.',
            '=> Từ đó, có thể thấy bài học lịch sử không chỉ có ý nghĩa trong chiến tranh mà còn gợi mở định hướng phát triển đất nước trong thời đại mới. Việt Nam cần nâng cao năng lực công nghệ của mình, đồng thời hợp tác quốc tế để tiếp thu những tiến bộ khoa học tiên tiến.',
          ],
        },
      ],
    },
    sources: [
      {
        label: 'Chiến lược phát triển công nghiệp bán dẫn (Quyết định số 1018/QĐ-TTg)',
        url: 'https://baochinhphu.vn/nganh-giao-duc-khan-truong-phat-trien-nguon-nhan-luc-nganh-cong-nghiep-ban-dan-102241211093806289.htm',
        note: 'Quyết định số 1018/QĐ-TTg ngày 21/9/2024 của Thủ tướng Chính phủ ban hành Chiến lược phát triển công nghiệp bán dẫn Việt Nam đến năm 2030, tầm nhìn 2050',
      },
      {
        label: 'Chương trình phát triển nguồn nhân lực bán dẫn (Quyết định số 1017/QĐ-TTg)',
        url: 'https://baochinhphu.vn/bao-cao-giai-trinh-ve-kinh-te-xa-hoi-do-thu-tuong-pham-minh-chinh-trinh-bay-tai-ky-hop-thu-8-quoc-hoi-khoa-xv-102241112153549565.htm',
        note: 'Báo điện tử Chính phủ — Mục tiêu đào tạo nguồn nhân lực bán dẫn đến năm 2030',
      },
      {
        label: 'Khởi động chương trình đào tạo nhân lực vi mạch bán dẫn tại Đà Nẵng (26/3/2024)',
        url: 'https://mst.gov.vn/da-nang-khoi-dong-chuong-trinh-dao-tao-nhan-luc-vi-mach-ban-dan-197240401103958705.htm',
        note: 'Cổng thông tin điện tử Bộ Khoa học và Công nghệ',
      },
    ],
    speakerNotes: '',
  },
  {
    id: 11,
    part: 4,
    partTitle: 'Liên hệ & Vận dụng',
    title: 'QUAN ĐIỂM CÁ NHÂN VÀ TRÁCH NHIỆM CỦA THẾ HỆ TRẺ',
    subtitle: 'Kế thừa tinh thần tự lực tự cường và phát huy trách nhiệm của thế hệ trẻ hôm nay',
    section: 'Trách nhiệm thế hệ trẻ',
    suggestedDurationSeconds: 60,
    content: {
      heading: '3. Quan điểm cá nhân và trách nhiệm của thế hệ trẻ',
      points: [
        'Trong kháng chiến, tinh thần tự lực, tự cường và đoàn kết đã góp phần tạo nên những thắng lợi quan trọng của dân tộc. Theo em, những giá trị này vẫn có ý nghĩa đối với thế hệ trẻ trong công cuộc xây dựng và bảo vệ đất nước ngày nay.',
        'Bài học từ lịch sử cần được thể hiện qua hành động cụ thể trong cuộc sống. Mỗi sinh viên cần chủ động học tập, rèn luyện và sáng tạo để góp phần nâng cao năng lực của bản thân, đồng thời đóng góp vào sự phát triển của đất nước.',
      ],
      groups: [
        {
          title: 'Bốn trách nhiệm của thế hệ trẻ hôm nay',
          points: [
            'Chủ động học tập: Noi theo tinh thần vượt khó trong kháng chiến, tích cực học hỏi và nâng cao kiến thức để đóng góp cho đất nước.',
            'Nâng cao năng lực bản thân: Rèn luyện ngoại ngữ, kỹ năng số và chuyên môn để đáp ứng yêu cầu của thời đại mới.',
            'Chủ động tiếp cận công nghệ: Biết ứng dụng AI và các công cụ công nghệ vào học tập, đồng thời kiểm chứng thông tin và không phụ thuộc hoàn toàn vào công nghệ.',
            'Phát huy tinh thần đoàn kết: Hợp tác, hỗ trợ lẫn nhau trong học tập và công việc, cùng giải quyết khó khăn và hoàn thành mục tiêu chung.',
          ],
        },
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
  {
    id: 12,
    part: 4,
    partTitle: 'Minh bạch học thuật',
    title: 'BÁO CÁO MINH BẠCH ỨNG DỤNG AI TRONG HỌC TẬP',
    subtitle: 'Công cụ hỗ trợ, mục đích sử dụng và quy trình đối chiếu giáo trình chính thống',
    section: 'Minh bạch AI',
    suggestedDurationSeconds: 45,
    content: {
      heading: 'Báo cáo sử dụng trí tuệ nhân tạo (AI Transparency)',
      points: [
        'Công cụ AI hỗ trợ: Nhóm sử dụng trợ lý AI (Codex, Claude, Gemini) hỗ trợ lập trình giao diện trực quan hóa bài thuyết trình, định dạng cấu trúc nội dung và tạo lập câu hỏi kiểm tra nhanh.',
        'Mục đích sử dụng: Tối ưu hóa trải nghiệm trực quan hóa bài thuyết trình môn học, hỗ trợ thiết kế trang web và tạo tài liệu tham khảo cho tập thể lớp.',
        'Quy trình đối chiếu & Liêm chính học thuật: Toàn bộ sự kiện lịch sử, nhân vật, mốc thời gian và luận điểm lý luận đều được các thành viên trong nhóm trực tiếp đối chiếu, rà soát và kiểm chứng với bản in Giáo trình Lịch sử Đảng Cộng sản Việt Nam (NXB Chính trị quốc gia Sự thật, 2021) cùng hệ thống văn kiện Đảng.',
        'Xem chi tiết toàn văn phụ lục: Nhóm đã công khai toàn bộ bảng kê công cụ, mục đích chi tiết và danh mục nguồn trích dẫn tại mục "Minh bạch AI & Nguồn" trên thanh điều hướng.',
      ],
      groups: [
        {
          title: 'Quy trình 3 bước đảm bảo tính xác thực học thuật của nhóm',
          points: [
            'Bước 1 — Thu thập tài liệu: Sử dụng Giáo trình Lịch sử Đảng Cộng sản Việt Nam (2021) làm tài liệu gốc bắt buộc.',
            'Bước 2 — Ứng dụng AI có kiểm soát: Dùng AI hỗ trợ lập trình giao diện web và dàn trang tài liệu học tập.',
            'Bước 3 — Đối chiếu & Xác thực con người: Các thành viên nhóm trực tiếp rà soát từng dòng, sửa các điểm chưa chính xác và chịu hoàn toàn trách nhiệm học thuật.',
          ],
        },
      ],
    },
    sources: [
      {
        label: 'Phụ lục Minh bạch AI & Danh mục nguồn dẫn',
        url: '/appendix',
        note: 'Xem toàn văn báo cáo minh bạch AI, cam kết liêm chính và danh mục tài liệu tham khảo chính thức',
      },
      {
        label: 'Giáo trình Lịch sử Đảng Cộng sản Việt Nam (Khối không chuyên)',
        url: 'https://www.nxbctqg.org.vn/giao-trinh-lich-su-dang-cong-san-viet-nam-danh-cho-bac-dai-hoc-he-khong-chuyen-ly-luan-chinh-tri-.html',
        note: 'Nhà xuất bản Chính trị quốc gia Sự thật, 2021, Chương 2, Mục I.2',
      },
    ],
    speakerNotes: '',
  },
];
