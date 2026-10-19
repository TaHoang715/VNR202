/**
 * Dữ liệu 10 câu hỏi chuẩn xác lịch sử giai đoạn 1946–1950
 * Thuộc học phần Lịch sử ĐCSVN (Chương 2, Mục I.2)
 *
 * Gồm 3 dạng:
 * 1. Choice: Trắc nghiệm lựa chọn đơn
 * 2. Order: Sắp xếp mốc thời gian bằng nút bấm tiếp cận (Accessible button-based)
 * 3. Photo: Trắc nghiệm tư liệu ảnh lịch sử thật (không dùng ảnh AI)
 */

export type QuestionType = 'choice' | 'order' | 'photo';

export interface QuizOption {
  id: string;
  text: string;
}

export interface OrderItem {
  id: string;
  text: string;
  targetPosition: number;
}

export interface HistoricalPhotoRef {
  id: string;
  src: string;
  caption: string;
  date: string;
  credit: string;
  source: string;
  context: string;
}

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  prompt: string;
  options?: QuizOption[];
  orderItems?: OrderItem[];
  correctOptionId?: string;
  correctOrderIds?: string[];
  photo?: HistoricalPhotoRef;
  explanation: string;
  sourceNote: string;
}

export interface ClientQuizQuestion {
  id: number;
  type: QuestionType;
  prompt: string;
  options?: QuizOption[];
  orderItems?: { id: string; text: string }[];
  photo?: HistoricalPhotoRef;
}

export interface QuizRevealData {
  questionId: number;
  correctOptionId?: string;
  correctOrderIds?: string[];
  explanation: string;
  sourceNote: string;
}

export const QUIZ_CONSTANTS = {
  TOTAL_QUESTIONS: 10,
  QUESTION_DURATION_SECONDS: 25,
  QUESTION_DURATION_MS: 25000,
  REVEAL_DURATION_SECONDS: 8,
  REVEAL_DURATION_MS: 8000,
  BASE_SCORE: 1000,
  MAX_SPEED_BONUS: 250,
  ROOM_TTL_MS: 30 * 60 * 1000,
  MAX_PLAYERS: 200,
  MAX_NICKNAME_LENGTH: 24,
  MAX_ROOMS: 50,
  MAX_POLL_QUESTION_LENGTH: 300,
  MAX_POLL_OPTIONS: 6,
  MAX_POLL_OPTION_LENGTH: 150,
  MAX_POLLS_PER_ROOM: 5,
} as const;

export function calculateQuestionScore(
  isCorrect: boolean,
  remainingMs: number,
  timeLimitMs: number = QUIZ_CONSTANTS.QUESTION_DURATION_MS
): { points: number; isCorrect: boolean } {
  if (!isCorrect) {
    return { points: 0, isCorrect: false };
  }
  const clampedRemaining = Math.max(0, Math.min(timeLimitMs, remainingMs));
  const speedBonus = Math.round(QUIZ_CONSTANTS.MAX_SPEED_BONUS * (clampedRemaining / timeLimitMs));
  return {
    points: QUIZ_CONSTANTS.BASE_SCORE + speedBonus,
    isCorrect: true,
  };
}

export function evaluateAnswer(
  question: QuizQuestion,
  answer: unknown
): boolean {
  if (question.type === 'choice' || question.type === 'photo') {
    return typeof answer === 'string' && answer.trim() === question.correctOptionId;
  }
  if (question.type === 'order') {
    if (!Array.isArray(answer) || !question.correctOrderIds) return false;
    if (answer.length !== question.correctOrderIds.length) return false;
    return answer.every((id, idx) => id === question.correctOrderIds![idx]);
  }
  return false;
}

export function sanitizeQuestionForClient(q: QuizQuestion): ClientQuizQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options ? q.options.map((o) => ({ id: o.id, text: o.text })) : undefined,
    orderItems: q.orderItems
      ? q.orderItems.map((item) => ({ id: item.id, text: item.text }))
      : undefined,
    photo: q.photo,
  };
}

export function extractRevealData(q: QuizQuestion): QuizRevealData {
  return {
    questionId: q.id,
    correctOptionId: q.correctOptionId,
    correctOrderIds: q.correctOrderIds,
    explanation: q.explanation,
    sourceNote: q.sourceNote,
  };
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ─── Câu 1: Bối cảnh Toàn quốc kháng chiến (Choice) ──────────────────────
  {
    id: 1,
    type: 'choice',
    prompt:
      'Sau khi thực dân Pháp gửi tối hậu thư ngày 18/12/1946 đòi tước vũ khí của Tự vệ Hà Nội, Hội nghị Ban Thường vụ Trung ương Đảng tại Vạn Phúc đã đưa ra quyết sách lịch sử nào?',
    options: [
      { id: 'a', text: 'Chấp nhận tối hậu thư để kéo dài thời gian thương lượng hòa hoãn' },
      { id: 'b', text: 'Quyết định phát động cuộc kháng chiến toàn quốc trong toàn dân, toàn quân' },
      { id: 'c', text: 'Rút toàn bộ lực lượng về Nam Bộ để củng cố vùng căn cứ Đồng Tháp Mười' },
      { id: 'd', text: 'Tuyên bố đầu hàng có điều kiện và kêu gọi quân Đồng minh can thiệp' },
    ],
    correctOptionId: 'b',
    explanation:
      'Tối ngày 18 và ngày 19/12/1946, tại làng Vạn Phúc (Hà Đông), Hội nghị Ban Thường vụ Trung ương Đảng do Chủ tịch Hồ Chí Minh chủ trì đã nhận định dã tâm xâm lược lần nữa của Pháp và hạ quyết tâm phát động Toàn quốc kháng chiến.',
    sourceNote: 'Văn kiện Đảng Toàn tập & Lời kêu gọi Toàn quốc kháng chiến (19/12/1946)',
  },

  // ─── Câu 2: Trình tự ban hành các văn kiện nền tảng (Order) ─────────────
  {
    id: 2,
    type: 'order',
    prompt:
      'Sắp xếp theo đúng trình tự thời gian ban hành của 3 văn kiện lịch sử đặt nền móng cho Đường lối kháng chiến toàn quốc:',
    orderItems: [
      {
        id: 'vk-1',
        text: 'Chỉ thị "Toàn dân kháng chiến" của Ban Thường vụ Trung ương Đảng (12/12/1946)',
        targetPosition: 1,
      },
      {
        id: 'vk-2',
        text: '"Lời kêu gọi Toàn quốc kháng chiến" của Chủ tịch Hồ Chí Minh (đêm 19/12/1946)',
        targetPosition: 2,
      },
      {
        id: 'vk-3',
        text: 'Tác phẩm "Kháng chiến nhất định thắng lợi" của Tổng Bí thư Trường Chinh (xuất bản tháng 9/1947)',
        targetPosition: 3,
      },
    ],
    correctOrderIds: ['vk-1', 'vk-2', 'vk-3'],
    explanation:
      'Đường lối kháng chiến toàn quốc được hình thành và hoàn chỉnh qua 3 văn kiện nối tiếp: Chỉ thị "Toàn dân kháng chiến" (12/12/1946) -> "Lời kêu gọi Toàn quốc kháng chiến" (19/12/1946) -> Tác phẩm "Kháng chiến nhất định thắng lợi" (xuất bản tháng 9/1947).',
    sourceNote: 'Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021, Chương 2, Mục I.2)',
  },

  // ─── Câu 3: Ảnh tư liệu Hà Nội 1946 (Photo) ──────────────────────────────
  {
    id: 3,
    type: 'photo',
    prompt:
      'Bức ảnh tư liệu ghi lại cảnh chiến đấu tại Thủ đô Hà Nội cuối năm 1946 – đầu năm 1947. Mục tiêu chiến lược then chốt nhất của cuộc chiến đấu 60 ngày đêm giam chân địch trong đô thị là gì?',
    photo: {
      id: 'hanoi1946',
      src: 'images/history/hanoi-1946.jpg',
      caption: 'Chiến đấu tại Hà Nội những ngày đầu Toàn quốc kháng chiến, 1946–1947.',
      date: '1946–1947',
      credit: 'Ảnh tư liệu / Báo Quân đội nhân dân',
      source:
        'https://www.qdnd.vn/quoc-phong-an-ninh/nghe-thuat-quan-su-vn/van-dung-sang-tao-linh-hoat-cac-hinh-thuc-tac-chien-trong-thanh-pho-678828',
      context: 'Bối cảnh Toàn quốc kháng chiến bùng nổ, chiến đấu kiên cường giam chân địch trong đô thị',
    },
    options: [
      { id: 'a', text: 'Tiêu diệt hoàn toàn quân viễn chinh Pháp ngay tại trung tâm Thủ đô' },
      { id: 'b', text: 'Giam chân địch trong thành phố, bảo vệ an toàn cho cơ quan đầu não kháng chiến rút lên chiến khu' },
      { id: 'c', text: 'Cố thủ vĩnh viễn từng căn nhà, góc phố mà không có kế hoạch rút lui' },
      { id: 'd', text: 'Chờ đợi viện trợ vũ khí hạng nặng từ các nước xã hội chủ nghĩa' },
    ],
    correctOptionId: 'b',
    explanation:
      'Cuộc chiến đấu 60 ngày đêm của quân dân Hà Nội ("Quyết tử để Tổ quốc quyết sinh") đã giam chân lực lượng cơ động tinh nhuệ của Pháp, tạo đủ thời gian để các cơ quan lãnh đạo của Đảng, Chính phủ, kho tàng máy móc chuyển lên căn cứ địa an toàn.',
    sourceNote: 'Lịch sử cuộc kháng chiến chống thực dân Pháp 1945–1954 & Báo QĐND',
  },

  // ─── Câu 4: Mặt trận then chốt trong Kháng chiến toàn diện (Choice) ───────
  {
    id: 4,
    type: 'choice',
    prompt:
      'Trong 5 mặt trận của đường lối "Kháng chiến toàn diện" (Quân sự, Chính trị, Kinh tế, Văn hóa, Ngoại giao), mặt trận nào giữ vai trò quyết định then chốt nhất đối với thắng lợi chiến trường?',
    options: [
      { id: 'a', text: 'Mặt trận ngoại giao quốc tế' },
      { id: 'b', text: 'Mặt trận quân sự' },
      { id: 'c', text: 'Mặt trận kinh tế tự cấp tự túc' },
      { id: 'd', text: 'Mặt trận văn hóa xóa mù chữ' },
    ],
    correctOptionId: 'b',
    explanation:
      'Đảng khẳng định kháng chiến toàn diện trên mọi lĩnh vực, nhưng mặt trận quân sự giữ vai trò quyết định then chốt nhằm tiêu hao và tiêu diệt sinh lực địch, làm biến đổi tương quan so sánh lực lượng trên chiến trường.',
    sourceNote: 'Tác phẩm "Kháng chiến nhất định thắng lợi" của đồng chí Trường Chinh (1947)',
  },

  // ─── Câu 5: Diễn biến lịch sử tiêu biểu 1946–1950 (Order) ────────────────
  {
    id: 5,
    type: 'order',
    prompt:
      'Sắp xếp theo đúng tiến trình thời gian của các chiến dịch và sự kiện lịch sử quân sự tiêu biểu giai đoạn 1946 – 1950:',
    orderItems: [
      {
        id: 'sk-1',
        text: 'Cuộc chiến đấu 60 ngày đêm giam chân địch ở Hà Nội mở đầu kháng chiến (12/1946 – 02/1947)',
        targetPosition: 1,
      },
      {
        id: 'sk-2',
        text: 'Chiến dịch phản công Việt Bắc Thu – Đông bẻ gãy gọng kìm của Pháp (1947)',
        targetPosition: 2,
      },
      {
        id: 'sk-3',
        text: 'Chiến dịch tiến công Biên giới Thu – Đông giành quyền chủ động chiến lược (1950)',
        targetPosition: 3,
      },
    ],
    correctOrderIds: ['sk-1', 'sk-2', 'sk-3'],
    explanation:
      'Tháng 12/1946 mở đầu cuộc chiến đấu giam chân địch tại đô thị -> Thu Đông 1947 ta phản công bẻ gãy kế hoạch "đánh nhanh thắng nhanh" tại Việt Bắc -> Thu Đông 1950 ta chủ động mở chiến dịch Biên giới giành quyền chủ động chiến lược.',
    sourceNote: 'Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021, Chương 2, Mục I.2)',
  },

  // ─── Câu 6: Ý nghĩa của phương châm Trường kỳ kháng chiến (Choice) ────────
  {
    id: 6,
    type: 'choice',
    prompt:
      'Vì sao Đảng ta xác định phương châm "Trường kỳ kháng chiến" (đánh lâu dài) là quy luật tất yếu để đi tới thắng lợi?',
    options: [
      { id: 'a', text: 'Để khắc phục thế yếu ban đầu về trang bị vũ khí, từng bước chuyển hóa so sánh lực lượng từ yếu thành mạnh' },
      { id: 'b', text: 'Vì ta không chủ trương giải phóng hoàn toàn lãnh thổ mà chỉ mong chia cắt vùng chiếm đóng' },
      { id: 'c', text: 'Vì quân đội ta muốn chờ các cường quốc phương Tây phân xử tại Liên Hợp Quốc' },
      { id: 'd', text: 'Để kéo dài thời gian nhằm duy trì tình trạng đình chiến tạm thời không đánh lớn' },
    ],
    correctOptionId: 'a',
    explanation:
      'Ban đầu tương quan lực lượng địch mạnh hơn ta về quân sự và kỹ thuật. Đánh lâu dài là nhằm bẻ gãy chiến lược "đánh nhanh thắng nhanh" của Pháp, vừa đánh vừa bồi dưỡng sức dân, tiêu hao sinh lực địch để chuyển hóa tương quan lực lượng từ yếu sang mạnh.',
    sourceNote: 'Chỉ thị Toàn dân kháng chiến & Kháng chiến nhất định thắng lợi',
  },

  // ─── Câu 7: Ảnh tư liệu Dân công phục vụ chiến dịch (Photo) ───────────────
  {
    id: 7,
    type: 'photo',
    prompt:
      'Bức ảnh tư liệu lịch sử ghi lại hình ảnh những đoàn dân công gùi thồ phục vụ chiến dịch. Hình ảnh này phản ánh sinh động nội dung cơ bản nào của đường lối kháng chiến?',
    photo: {
      id: 'dancong1950',
      src: 'images/history/dan-cong-bien-gioi-1950.jpg',
      caption: 'Dân công phục vụ Chiến dịch Biên giới năm 1950.',
      date: '1950',
      credit: 'Ảnh tư liệu / Báo Cao Bằng',
      source:
        'https://baocaobang.vn/Cao-Bang-cung-ca-nuoc-tien-hanh-hai-cuoc-KC-chong-Phap-va-My-xam-luoc-36827.html',
      context: 'Huy động sức người sức của phục vụ mặt trận tiền tuyến; minh chứng tính chất toàn dân',
    },
    options: [
      { id: 'a', text: 'Chỉ huy động lực lượng quân đội nhà nghề chính quy tham gia chiến dịch' },
      { id: 'b', text: 'Kháng chiến toàn dân và dựa vào sức mình là chính, huy động sức mạnh đại đoàn kết' },
      { id: 'c', text: 'Dựa hoàn toàn vào hệ thống vận tải cơ giới hiện đại do nước ngoài viện trợ' },
      { id: 'd', text: 'Tập trung toàn bộ lực lượng về phòng thủ tại các đô thị đồng bằng' },
    ],
    correctOptionId: 'b',
    explanation:
      'Đoàn dân công gùi thồ hàng vạn tấn gạo, đạn qua đèo cao dốc thẳm là minh chứng sống động của phương châm "Toàn dân đánh giặc" và "Lấy dân làm gốc". Nhân dân chính là hậu phương và nguồn sức mạnh vô tận nuôi dưỡng tiền tuyến.',
    sourceNote: 'Ảnh tư liệu Báo Cao Bằng & Bảo tàng Hồ Chí Minh',
  },

  // ─── Câu 8: Ý nghĩa Chiến dịch Việt Bắc Thu – Đông 1947 (Choice) ───────────
  {
    id: 8,
    type: 'choice',
    prompt:
      'Thắng lợi của Chiến dịch phản công Việt Bắc Thu – Đông 1947 đã giáng đòn quyết định làm phá sản chiến lược quân sự nào của thực dân Pháp?',
    options: [
      { id: 'a', text: 'Kế hoạch tấn công sang Thượng Lào và Campuchia' },
      { id: 'b', text: 'Chiến lược "Đánh nhanh thắng nhanh", buộc địch phải chuyển sang đánh lâu dài' },
      { id: 'c', text: 'Kế hoạch khóa chặt hoàn toàn tuyến biên giới Việt - Trung' },
      { id: 'd', text: 'Chiến lược bình định cấp tốc toàn bộ Nam Bộ trong 18 tháng' },
    ],
    correctOptionId: 'b',
    explanation:
      'Thực dân Pháp mở cuộc hành quân quy mô lớn lên Việt Bắc nhằm chụp bắt cơ quan đầu não kháng chiến và tiêu diệt bộ đội chủ lực của ta để kết thúc chiến tranh nhanh chóng. Thất bại thảm hại ở Việt Bắc đã đập tan hoàn toàn chiến lược "đánh nhanh thắng nhanh", đẩy Pháp sa lầy vào thế bị động.',
    sourceNote: 'Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021, Chương 2, Mục I.2)',
  },

  // ─── Câu 9: Ảnh Chủ tịch Hồ Chí Minh tại đài quan sát (Photo) ────────────
  {
    id: 9,
    type: 'photo',
    prompt:
      'Bức ảnh lịch sử Chủ tịch Hồ Chí Minh trên đài quan sát núi Báo Đông trực tiếp theo dõi mặt trận Đông Khê (09/1950). Chiến dịch Biên giới Thu – Đông 1950 đã đánh dấu bước chuyển biến bước ngoặt gì?',
    photo: {
      id: 'hochiminh1950',
      src: 'images/history/ho-chi-minh-dong-khe-1950.jpeg',
      caption: 'Chủ tịch Hồ Chí Minh trên đài quan sát núi Báo Đông trong Chiến dịch Biên giới, tháng 9/1950.',
      date: '09/1950',
      credit: 'Ảnh tư liệu, đăng tại Bảo tàng Hồ Chí Minh',
      source:
        'https://baotanghochiminh.vn/di-tich-nui-bao-dong-noi-chu-tich-ho-chi-minh-quan-sat-tran-danh-don-dong-khe-chien-dich-bien-gioi-1950.htm',
      context: 'Chủ tịch Hồ Chí Minh trực tiếp ra mặt trận chỉ đạo chiến dịch lớn giải phóng vùng biên cương',
    },
    options: [
      { id: 'a', text: 'Quân đội ta chuyển từ thế phòng ngự, giữ gìn lực lượng sang thế chủ động tiến công trên chiến trường chính Bắc Bộ' },
      { id: 'b', text: 'Đánh dấu thời điểm kết thúc hoàn toàn cuộc kháng chiến chống Pháp' },
      { id: 'c', text: 'Quân ta bắt đầu chuyển hoàn toàn sang tác chiến phòng ngự bị động' },
      { id: 'd', text: 'Ký kết hiệp định đình chiến và lập lại hòa bình tại Đông Dương' },
    ],
    correctOptionId: 'a',
    explanation:
      'Chiến dịch Biên giới 1950 là chiến dịch tiến công lớn đầu tiên của quân đội ta. Thắng lợi đã tiêu diệt một bộ phận quan trọng sinh lực tinh nhuệ của Pháp, khai thông tuyến biên giới dài 750km nối với hậu phương quốc tế, giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.',
    sourceNote: 'Bảo tàng Hồ Chí Minh & Giáo trình Lịch sử ĐCSVN',
  },

  // ─── Câu 10: Ba giai đoạn chiến lược của cuộc kháng chiến (Order) ──────────
  {
    id: 10,
    type: 'order',
    prompt:
      'Hãy sắp xếp 3 giai đoạn chuyển biến thế trận chiến lược của cuộc kháng chiến trường kỳ theo đúng tư tưởng chỉ đạo của Đảng:',
    orderItems: [
      {
        id: 'gd-1',
        text: 'Giai đoạn Phòng ngự (chặn bước tiến địch, bảo toàn lực lượng, rút về căn cứ an toàn)',
        targetPosition: 1,
      },
      {
        id: 'gd-2',
        text: 'Giai đoạn Cầm cự (tiêu hao sinh lực địch, tích lũy thế và lực, xây dựng lực lượng lớn mạnh)',
        targetPosition: 2,
      },
      {
        id: 'gd-3',
        text: 'Giai đoạn Tổng phản công (chuyển hẳn sang thế chủ động phản công và tiến công giành thắng lợi quyết định)',
        targetPosition: 3,
      },
    ],
    correctOrderIds: ['gd-1', 'gd-2', 'gd-3'],
    explanation:
      'Trong tác phẩm "Kháng chiến nhất định thắng lợi", Tổng Bí thư Trường Chinh chỉ rõ cuộc kháng chiến toàn diện, trường kỳ tất yếu trải qua ba giai đoạn biện chứng: Phòng ngự -> Cầm cự -> Tổng phản công, phù hợp với quy luật tích lũy lượng đổi dẫn đến chất đổi.',
    sourceNote: 'Tác phẩm "Kháng chiến nhất định thắng lợi" của đồng chí Trường Chinh (1947)',
  },
];
