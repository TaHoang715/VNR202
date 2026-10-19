export interface RebuttalPrompt {
  id: string;
  targetGroup: string;
  topic: string;
  question: string;
  counterArgumentKeyPoints: string[];
  referenceCitation: string;
}

export const REBUTTAL_PROMPTS: RebuttalPrompt[] = [
  {
    id: 'g1-q1',
    targetGroup: 'Nhóm phản biện 1 (Chính trị & Ngoại giao)',
    topic: 'Tính chất nhân nhượng trước 19/12/1946',
    question: 'Tại sao Đảng và Chủ tịch Hồ Chí Minh lại ký Hiệp định Sơ bộ (6/3/1946) và Tạm ước (14/9/1946) với Pháp? Việc nhân nhượng này có mâu thuẫn với tinh thần kiên quyết kháng chiến sau đó không?',
    counterArgumentKeyPoints: [
      'Nhân nhượng có nguyên tắc: Giữ vững mục tiêu độc lập tối thượng, chỉ thỏa hiệp về mặt sách lược.',
      'Mục tiêu kép: Đẩy 20 vạn quân Tưởng Giới Thạch về nước, tránh đối đầu cùng lúc với nhiều kẻ thù nguy hiểm.',
      'Tranh thủ thời gian hòa hoãn quý báu (khoảng 9 tháng) để xây dựng chính quyền non trẻ, phát triển lực lượng vũ trang và chuẩn bị lương thảo.',
      'Khẳng định thiện chí hòa bình của dân tộc Việt Nam trước nhân dân tiến bộ Pháp và dư luận thế giới.',
    ],
    referenceCitation: 'Giáo trình Lịch sử ĐCSVN 2021, Chương 2 Mục I.1 & Mục I.2; Lời kêu gọi Toàn quốc kháng chiến (19/12/1946).',
  },
  {
    id: 'g1-q2',
    targetGroup: 'Nhóm phản biện 1 (Chính trị & Ngoại giao)',
    topic: 'Tự lực cánh sinh và Tranh thủ quốc tế',
    question: 'Nếu nhấn mạnh "Tự lực cánh sinh, dựa vào sức mình là chính", thì vai trò của sự giúp đỡ quốc tế (sau chiến dịch Biên Giới 1950) được nhìn nhận như thế nào trong tư duy chiến lược của Đảng?',
    counterArgumentKeyPoints: [
      'Quan hệ biện chứng: Nguồn lực nội tại là nhân tố quyết định trực tiếp, sự giúp đỡ quốc tế là nhân tố hỗ trợ rất quan trọng.',
      'Muốn tranh thủ được sự viện trợ quốc tế, trước hết nội lực phải vững mạnh để tiếp nhận và phát huy hiệu quả viện trợ.',
      'Sau chiến dịch Biên Giới 1950, ta mở thông biên giới với Trung Quốc, Liên Xô và các nước XHCN, phá vỡ hoàn toàn thế bao vây cô lập của đế quốc Pháp - Mỹ.',
    ],
    referenceCitation: 'Tác phẩm "Kháng chiến nhất định thắng lợi" của Trường Chinh; Văn kiện Đảng 1950.',
  },
  {
    id: 'g2-q1',
    targetGroup: 'Nhóm phản biện 2 (Quân sự & Nghệ thuật chiến dịch)',
    topic: 'Phương châm Trường kỳ kháng chiến',
    question: 'Tại sao ta lại chủ trương "đánh lâu dài" (trường kỳ)? Liệu đánh lâu dài có gây kiệt quệ cho một đất nước nghèo nàn, lạc hậu vừa trải qua nạn đói năm 1945 không?',
    counterArgumentKeyPoints: [
      'So sánh tương quan ban đầu: Địch mạnh về hỏa lực, cơ giới, quân số thiện chiến nhưng yếu về chính trị, hậu phương xa xôi và mâu thuẫn nội bộ nước Pháp.',
      'Chiến lược "đánh lâu dài" nhằm khoét sâu vào điểm yếu chí mạng của địch, bẻ gãy chiến lược "đánh nhanh thắng nhanh" của Pháp.',
      'Vừa đánh vừa bồi dưỡng sức dân: Tăng gia sản xuất tại chỗ, thực hiện giảm tô, phát triển kinh tế tự cấp tự túc để nuôi dưỡng sức bền kháng chiến.',
    ],
    referenceCitation: 'Chỉ thị "Toàn dân kháng chiến" (12/12/1946); Nghị quyết Hội nghị quân sự toàn quốc (19/10/1946).',
  },
  {
    id: 'g2-q2',
    targetGroup: 'Nhóm phản biện 2 (Quân sự & Nghệ thuật chiến dịch)',
    topic: 'Bước ngoặt Việt Bắc 1947 và Biên Giới 1950',
    question: 'Sự khác biệt căn bản về tính chất nghệ thuật quân sự giữa Chiến dịch Việt Bắc Thu - Đông 1947 và Chiến dịch Biên Giới Thu - Đông 1950 là gì?',
    counterArgumentKeyPoints: [
      'Việt Bắc 1947 mang tính chất Chiến dịch phản công đánh chặn tự vệ: Bẻ gãy đòn tiến công gọng kìm bất ngờ của Pháp, bảo toàn cơ quan đầu não ATK.',
      'Biên Giới 1950 là Chiến dịch tiến công chủ động quy mô lớn đầu tiên do ta chủ động mở: Đánh điểm diệt viện, tiêu diệt sinh lực địch, làm thay đổi quyền chủ động chiến lược.',
      'Đánh dấu bước trưởng thành vượt bậc từ chiến thuật du kích phân tán sang tác chiến vận động chiến tập trung của Quân đội nhân dân Việt Nam.',
    ],
    referenceCitation: 'Chiến tranh cách mạng Việt Nam 1945–1975: Thắng lợi và bài học (Bộ Chính trị, 2008).',
  },
  {
    id: 'g3-q1',
    targetGroup: 'Nhóm phản biện 3 (Kinh tế & Liên hệ hiện nay)',
    topic: 'Kinh tế căn cứ địa và hậu phương kháng chiến',
    question: 'Trong điều kiện bị địch bao vây tứ phía và kiểm soát các thành phố lớn, căn cứ địa Việt Bắc làm thế nào để bảo đảm nhu yếu phẩm và vũ khí cho quân đội?',
    counterArgumentKeyPoints: [
      'Thực hiện triệt để phong trào tăng gia sản xuất: Bộ đội và cán bộ cũng trực tiếp cuốc đất, trồng ngô khoai xen canh.',
      'Sơ tán hàng trăm xưởng máy, nhà in, kho tàng từ Hà Nội lên rừng núi; tái chế vũ khí địch và chế tạo vũ khí thô sơ (súng ba-đô-ca, mìn, lựu đạn).',
      'Đồng tiền tài chính (tiền Cụ Hồ) được nhân dân tin dùng, tạo lập nền kinh tế độc lập không phụ thuộc vào tiền Đông Dương của Pháp.',
    ],
    referenceCitation: 'Lịch sử biên niên ĐCSVN Tập 3; Giáo trình Lịch sử ĐCSVN 2021 Chương 2.',
  },
  {
    id: 'g3-q2',
    targetGroup: 'Nhóm phản biện 3 (Kinh tế & Liên hệ hiện nay)',
    topic: 'Giới hạn khoa học của phép liên hệ bão Yagi',
    question: 'Nhóm liên hệ bài học tự lực cánh sinh và điều phối nguồn lực thời kỳ 1946–1950 với việc ứng phó bão số 3 (bão Yagi) năm 2024. Phép so sánh này có khập khiễng không khi chiến tranh và thiên tai là hai hiện tượng hoàn toàn khác nhau?',
    counterArgumentKeyPoints: [
      'Nhóm nhận thức rõ và phân định rạch ròi: Chiến tranh là xung đột đối kháng xã hội có ý thức chính trị; thiên tai là hiện tượng tự nhiên cực đoan không có ý thức.',
      'Phép liên hệ không đồng nhất về mặt bản chất hiện tượng, mà học hỏi ở góc độ phương pháp luận quản trị rủi ro và điều phối nguồn lực xã hội.',
      'Phương châm "4 tại chỗ" (chỉ huy, lực lượng, phương tiện, hậu cần tại chỗ) trong ứng phó thiên tai là sự kế thừa trực tiếp bài học "dựa vào sức mình là chính" và tổ chức thế trận cộng đồng.',
      'Tinh thần đùm bọc, tương thân tương ái của đồng bào và sự hiệp đồng giữa quân đội, công an, chính quyền là sự tiếp nối văn hóa đại đoàn kết toàn dân tộc.',
    ],
    referenceCitation: 'Công điện số 86/CĐ-TTg ngày 03/9/2024 của Thủ tướng Chính phủ; Phương pháp luận nghiên cứu Lịch sử Đảng.',
  },
];
