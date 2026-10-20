/**
 * Dữ liệu 10 câu hỏi chuẩn xác lịch sử giai đoạn 1946–1950
 * Thuộc học phần Lịch sử ĐCSVN (Chương 2, Mục I.2)
 *
 * Gồm 2 dạng chính theo chuẩn trò chơi gốc:
 * 1. Choice: Trắc nghiệm phản xạ 4 lựa chọn màu sắc (A, B, C, D)
 * 2. Catchphrase: Đuổi hình bắt chữ điền từ khóa kèm ảnh tư liệu lịch sử thật
 *    (chấp nhận chuẩn hóa chữ thường, dấu cách và không dấu tiếng Việt)
 */

export type QuestionType = 'choice' | 'catchphrase' | 'photo' | 'order';

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

export interface CatchphraseScheduledLetter {
  index: number;
  wordIndex: number;
  letterIndex: number;
  char: string;
  revealAfterMs: number;
}

export interface CatchphraseLetterHint {
  wordLengths: number[];
  scheduledLetters?: CatchphraseScheduledLetter[];
}

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  title?: string;
  prompt: string;
  options?: QuizOption[];
  orderItems?: OrderItem[];
  correctOptionId?: string;
  correctOrderIds?: string[];
  correctAnswer?: string; // Cho câu hỏi Đuổi hình bắt chữ hoặc đáp án trắc nghiệm chuẩn
  suggestion?: string;
  photo?: HistoricalPhotoRef;
  image?: string | string[];
  letterHint?: CatchphraseLetterHint;
  explanation: string;
  sourceNote: string;
}

export interface ClientQuizQuestion {
  id: number;
  type: QuestionType;
  title?: string;
  prompt: string;
  options?: QuizOption[];
  orderItems?: { id: string; text: string }[];
  suggestion?: string;
  photo?: HistoricalPhotoRef;
  image?: string | string[];
  letterHint?: CatchphraseLetterHint;
}

export interface QuizRevealData {
  questionId: number;
  correctOptionId?: string;
  correctAnswer?: string;
  correctOrderIds?: string[];
  explanation: string;
  sourceNote: string;
}

export const QUIZ_CONSTANTS = {
  TOTAL_QUESTIONS: 10,
  QUESTION_DURATION_SECONDS: 60,
  QUESTION_DURATION_MS: 60000,
  REVEAL_DURATION_SECONDS: 8,
  REVEAL_DURATION_MS: 8000,
  BASE_SCORE: 0,
  MAX_SCORE: 6000,
  ROOM_TTL_MS: 30 * 60 * 1000,
  MAX_PLAYERS: 200,
  MAX_NICKNAME_LENGTH: 24,
  MAX_ROOMS: 50,
  MAX_POLL_QUESTION_LENGTH: 300,
  MAX_POLL_OPTIONS: 6,
  MAX_POLL_OPTION_LENGTH: 150,
  MAX_POLLS_PER_ROOM: 5,
} as const;

/**
 * Chuẩn hóa chuỗi nhập đáp án Đuổi hình bắt chữ:
 * - Chuyển chữ thường, bỏ khoảng trắng thừa
 * - Loại bỏ dấu thanh điệu tiếng Việt (NFD) và chuẩn hóa đ/d
 * - Chấp nhận cả biến thể có dấu và không dấu
 */
export function normalizeCatchphrase(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Tính điểm theo thời gian còn lại của vòng chơi:
 * floor(serverRemainingMs / 10), tối đa 6.000 điểm.
 * Trả lời sai hoặc quá hạn nhận 0 điểm.
 */
export function calculateQuestionScore(
  isCorrect: boolean,
  remainingMs: number,
  timeLimitMs: number = QUIZ_CONSTANTS.QUESTION_DURATION_MS
): { points: number; isCorrect: boolean } {
  if (!isCorrect) {
    return { points: 0, isCorrect: false };
  }
  const clampedRemaining = Math.max(0, Math.min(timeLimitMs, remainingMs));
  const points = Math.min(QUIZ_CONSTANTS.MAX_SCORE, Math.floor(clampedRemaining / 10));
  return {
    points,
    isCorrect: true,
  };
}

export function evaluateAnswer(
  question: QuizQuestion,
  answer: unknown
): boolean {
  if (typeof answer !== 'string' && !Array.isArray(answer)) return false;

  if (question.type === 'choice') {
    if (typeof answer !== 'string') return false;
    const trimmed = answer.trim();
    if (!trimmed) return false;

    const correctId = (question.correctOptionId || question.correctAnswer || '').trim().toLowerCase();
    const matchedOption = question.options?.find(
      (o) => o.id.toLowerCase() === correctId || o.text.trim().toLowerCase().startsWith(correctId + '.')
    );

    // 1. Exact option ID match (case-insensitive, e.g. 'b' or 'B')
    if (trimmed.toLowerCase() === correctId) {
      return true;
    }

    // 2. Full exact option text match (e.g. "B. Quyết định..." or stripped "Quyết định...")
    if (matchedOption) {
      const fullText = matchedOption.text.trim().toLowerCase();
      const strippedText = matchedOption.text.replace(/^[A-Za-z0-9]\.\s*/, '').trim().toLowerCase();
      if (trimmed.toLowerCase() === fullText || trimmed.toLowerCase() === strippedText) {
        return true;
      }
    }

    return false;
  }

  if (question.type === 'catchphrase') {
    if (typeof answer !== 'string') return false;
    const target = question.correctAnswer || '';
    return normalizeCatchphrase(answer) === normalizeCatchphrase(target);
  }

  if (question.type === 'photo') {
    if (typeof answer !== 'string') return false;
    const clean = answer.trim().toLowerCase();
    const correct = (question.correctOptionId || '').trim().toLowerCase();
    return clean === correct;
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
    title: q.title,
    prompt: q.prompt,
    options: q.options ? q.options.map((o) => ({ id: o.id, text: o.text })) : undefined,
    orderItems: q.orderItems
      ? q.orderItems.map((item) => ({ id: item.id, text: item.text }))
      : undefined,
    suggestion: q.suggestion,
    photo: q.photo,
    image: q.image,
    letterHint: q.letterHint,
  };
}

export function extractRevealData(q: QuizQuestion): QuizRevealData {
  return {
    questionId: q.id,
    correctOptionId: q.correctOptionId,
    correctAnswer: q.correctAnswer,
    correctOrderIds: q.correctOrderIds,
    explanation: q.explanation,
    sourceNote: q.sourceNote,
  };
}

// ─── 10 CÂU HỎI LỊCH SỬ CHUẨN XÁC VNR202 (1946–1950) ──────────────────────────
// Đan xen giữa 5 câu Trắc nghiệm chuẩn xác và 5 câu Đuổi hình bắt chữ:
// Toàn dân, Toàn diện, Trường kỳ, Tự lực cánh sinh, Biên giới.
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ─── Câu 1: Trắc nghiệm (Choice) ─────────────────────────────────────────
  {
    id: 1,
    type: 'choice',
    title: 'Câu 1: Quyết sách Toàn quốc kháng chiến',
    prompt:
      'Sau khi thực dân Pháp gửi tối hậu thư ngày 18/12/1946 đòi tước vũ khí của Tự vệ Hà Nội, Hội nghị Ban Thường vụ Trung ương Đảng tại Vạn Phúc (18–19/12/1946) đã đưa ra quyết sách lịch sử nào?',
    options: [
      { id: 'a', text: 'A. Chấp nhận tối hậu thư để kéo dài thời gian hòa hoãn thương lượng' },
      { id: 'b', text: 'B. Quyết định phát động cuộc kháng chiến toàn quốc trong toàn dân, toàn quân' },
      { id: 'c', text: 'C. Rút toàn bộ lực lượng về Nam Bộ để củng cố vùng căn cứ Đồng Tháp Mười' },
      { id: 'd', text: 'D. Tuyên bố đầu hàng có điều kiện và kêu gọi quân Đồng minh can thiệp' },
    ],
    correctOptionId: 'b',
    correctAnswer: 'B',
    suggestion: 'Hạ quyết tâm kháng chiến cứu nước bảo vệ nền độc lập tự do vừa giành được.',
    explanation:
      'Tối ngày 18 và ngày 19/12/1946, tại làng Vạn Phúc (Hà Đông), Hội nghị Ban Thường vụ Trung ương Đảng do Chủ tịch Hồ Chí Minh chủ trì đã nhận định dã tâm xâm lược lần nữa của Pháp và hạ quyết tâm phát động Toàn quốc kháng chiến.',
    sourceNote: 'Văn kiện Đảng Toàn tập & Lời kêu gọi Toàn quốc kháng chiến (19/12/1946)',
  },

  // ─── Câu 2: Đuổi hình bắt chữ 1 (Catchphrase) ─────────────────────────────
  {
    id: 2,
    type: 'catchphrase',
    title: 'Câu 2: Đuổi hình bắt chữ',
    prompt:
      'Khái niệm cốt lõi nào trong đường lối kháng chiến chỉ rõ: Mỗi người dân là một chiến sĩ, mỗi làng xóm là một pháo đài, huy động sức mạnh của toàn thể dân tộc đánh giặc?',
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
    image: 'images/history/dan-cong-bien-gioi-1950.jpg',
    correctAnswer: 'Toàn dân',
    suggestion:
      'Cụm từ gồm 2 từ (T... D...). Bất kỳ đàn ông, đàn bà, người già, người trẻ, hễ là người Việt Nam thì phải đứng lên kháng chiến.',
    letterHint: {
      wordLengths: [4, 3],
      scheduledLetters: [
        { index: 0, wordIndex: 0, letterIndex: 0, char: 'T', revealAfterMs: 15000 },
        { index: 5, wordIndex: 1, letterIndex: 1, char: 'Â', revealAfterMs: 35000 },
      ],
    },
    explanation:
      'Phương châm "Toàn dân kháng chiến" xuất phát từ quan điểm cách mạng là sự nghiệp của quần chúng: toàn dân đánh giặc, lấy lực lượng vũ trang ba thứ quân làm nòng cốt, phát huy tinh thần "Lấy dân làm gốc".',
    sourceNote: 'Lời kêu gọi Toàn quốc kháng chiến & Chỉ thị Toàn dân kháng chiến (12/1946)',
  },

  // ─── Câu 3: Trắc nghiệm (Choice) ─────────────────────────────────────────
  {
    id: 3,
    type: 'choice',
    title: 'Câu 3: Mặt trận then chốt trong Kháng chiến toàn diện',
    prompt:
      'Trong các mặt trận của đường lối Kháng chiến toàn diện (Quân sự, Chính trị, Kinh tế, Văn hóa, Ngoại giao), mặt trận nào giữ vai trò quyết định then chốt nhất đối với thắng lợi trên chiến trường?',
    options: [
      { id: 'A', text: 'A. Mặt trận ngoại giao quốc tế' },
      { id: 'B', text: 'B. Mặt trận quân sự nhằm tiêu hao và tiêu diệt sinh lực địch' },
      { id: 'C', text: 'C. Mặt trận kinh tế tự cấp tự túc' },
      { id: 'D', text: 'D. Mặt trận văn hóa xóa mù chữ' },
    ],
    correctOptionId: 'B',
    correctAnswer: 'B',
    suggestion: 'Mặt trận trực tiếp tiêu hao và tiêu diệt lực lượng vũ trang xâm lược.',
    explanation:
      'Đảng khẳng định kháng chiến toàn diện trên mọi lĩnh vực, nhưng mặt trận quân sự giữ vai trò quyết định then chốt nhằm tiêu hao và tiêu diệt sinh lực địch, làm biến đổi tương quan so sánh lực lượng trên chiến trường.',
    sourceNote: 'Tác phẩm "Kháng chiến nhất định thắng lợi" của đồng chí Trường Chinh (1947)',
  },

  // ─── Câu 4: Đuổi hình bắt chữ 2 (Catchphrase) ─────────────────────────────
  {
    id: 4,
    type: 'catchphrase',
    title: 'Câu 4: Đuổi hình bắt chữ',
    prompt:
      'Đặc trưng phương châm kháng chiến nào của Đảng chủ trương đánh giặc trên tất cả các mặt trận: quân sự, chính trị, kinh tế, văn hóa và ngoại giao?',
    photo: {
      id: 'sanxuathocchu',
      src: 'images/game/san-xuat-hoc-chu.jpg',
      caption: 'Tranh cổ động do Ty Tuyên truyền văn nghệ Thái Nguyên phát hành nhằm cổ động cho phong trào sản xuất và Bình dân học vụ trong kháng chiến chống Pháp.',
      date: 'Kháng chiến chống Pháp (nguồn không nêu năm cụ thể)',
      credit: 'Ảnh tư liệu / Báo Quân đội nhân dân',
      source:
        'https://www.qdnd.vn/phong-su-dieu-tra/dieu-tra/binh-dan-hoc-vu-ky-tich-cua-nganh-giao-duc-viet-nam-478342',
      context: 'Tranh cổ động phong trào sản xuất và văn hóa xóa nạn mù chữ trong kháng chiến toàn diện',
    },
    image: 'images/game/san-xuat-hoc-chu.jpg',
    correctAnswer: 'Toàn diện',
    suggestion:
      'Cụm từ gồm 2 từ (T... D...). Không chỉ đánh giặc bằng vũ khí quân sự mà tiến hành trên mọi lĩnh vực đời sống xã hội.',
    letterHint: {
      wordLengths: [4, 4],
      scheduledLetters: [
        { index: 0, wordIndex: 0, letterIndex: 0, char: 'T', revealAfterMs: 15000 },
        { index: 5, wordIndex: 1, letterIndex: 0, char: 'D', revealAfterMs: 35000 },
      ],
    },
    explanation:
      '"Kháng chiến toàn diện" nhằm huy động mọi tiềm lực của đất nước, vừa kháng chiến vừa kiến quốc, tạo sức mạnh tổng hợp đánh bại kẻ thù trên các mặt trận quân sự, chính trị, kinh tế, văn hóa và ngoại giao.',
    sourceNote: 'Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021) & Báo QĐND',
  },

  // ─── Câu 5: Trắc nghiệm (Choice) ─────────────────────────────────────────
  {
    id: 5,
    type: 'choice',
    title: 'Câu 5: Ý nghĩa phương châm Trường kỳ kháng chiến',
    prompt:
      'Vì sao Đảng ta xác định phương châm "Trường kỳ kháng chiến" (đánh lâu dài) là quy luật tất yếu để đi tới thắng lợi?',
    options: [
      { id: 'A', text: 'A. Để khắc phục thế yếu ban đầu về trang bị vũ khí, từng bước chuyển hóa so sánh lực lượng từ yếu thành mạnh' },
      { id: 'B', text: 'B. Vì ta không chủ trương giải phóng hoàn toàn lãnh thổ mà chỉ mong chia cắt vùng chiếm đóng' },
      { id: 'C', text: 'C. Vì quân đội ta muốn chờ các cường quốc phương Tây phân xử tại Liên Hợp Quốc' },
      { id: 'D', text: 'D. Để kéo dài thời gian nhằm duy trì tình trạng đình chiến tạm thời không đánh lớn' },
    ],
    correctOptionId: 'A',
    correctAnswer: 'A',
    suggestion: 'Khắc phục sự chênh lệch ban đầu về vũ khí và tiềm lực quân sự.',
    explanation:
      'Ban đầu tương quan lực lượng địch mạnh hơn ta về quân sự và kỹ thuật. Đánh lâu dài là nhằm bẻ gãy chiến lược "đánh nhanh thắng nhanh" của Pháp, vừa đánh vừa bồi dưỡng sức dân, tiêu hao sinh lực địch để chuyển hóa tương quan lực lượng từ yếu sang mạnh.',
    sourceNote: 'Chỉ thị Toàn dân kháng chiến & Kháng chiến nhất định thắng lợi',
  },

  // ─── Câu 6: Đuổi hình bắt chữ 3 (Catchphrase) ─────────────────────────────
  {
    id: 6,
    type: 'catchphrase',
    title: 'Câu 6: Đuổi hình bắt chữ',
    prompt:
      'Phương châm tác chiến chiến lược nào nhằm đánh bại âm mưu "đánh nhanh thắng nhanh" của thực dân Pháp, vừa đánh vừa bồi dưỡng lực lượng để chuyển hóa tương quan lực lượng?',
    photo: {
      id: 'journey1950',
      src: 'images/history/hanh-quan-1950.jpeg',
      caption: 'Chủ tịch Hồ Chí Minh trên đường đi Chiến dịch Biên giới năm 1950.',
      date: '1950',
      credit: 'Ảnh tư liệu / Bảo tàng Hồ Chí Minh',
      source:
        'https://baotanghochiminh.vn/di-tich-nui-bao-dong-noi-chu-tich-ho-chi-minh-quan-sat-tran-danh-don-dong-khe-chien-dich-bien-gioi-1950.htm',
      context: 'Hành quân, lãnh đạo kháng chiến gian khổ bền bỉ',
    },
    image: 'images/history/hanh-quan-1950.jpeg',
    correctAnswer: 'Trường kỳ',
    suggestion:
      'Cụm từ gồm 2 từ (T... K...). Đánh lâu dài, kiên trì, không nóng vội chủ quan, bền bỉ qua năm tháng.',
    letterHint: {
      wordLengths: [6, 2],
      scheduledLetters: [
        { index: 0, wordIndex: 0, letterIndex: 0, char: 'T', revealAfterMs: 15000 },
        { index: 7, wordIndex: 1, letterIndex: 0, char: 'K', revealAfterMs: 35000 },
      ],
    },
    explanation:
      '"Trường kỳ kháng chiến" là tư tưởng chiến lược xuyên suốt nhằm bẻ gãy kế hoạch đánh nhanh thắng nhanh của Pháp, đưa cuộc kháng chiến vượt qua muôn vàn gian khổ đi tới thắng lợi vẻ vang.',
    sourceNote: 'Tác phẩm "Kháng chiến nhất định thắng lợi" (Trường Chinh, 1947)',
  },

  // ─── Câu 7: Trắc nghiệm (Choice) ─────────────────────────────────────────
  {
    id: 7,
    type: 'choice',
    title: 'Câu 7: Ý nghĩa Chiến dịch Việt Bắc Thu – Đông 1947',
    prompt:
      'Thắng lợi của Chiến dịch phản công Việt Bắc Thu – Đông 1947 đã giáng đòn quyết định làm phá sản chiến lược quân sự nào của thực dân Pháp?',
    options: [
      { id: 'A', text: 'A. Kế hoạch tấn công sang Thượng Lào và Campuchia' },
      { id: 'B', text: 'B. Chiến lược "Đánh nhanh thắng nhanh", buộc địch phải chuyển sang đánh lâu dài' },
      { id: 'C', text: 'C. Kế hoạch khóa chặt hoàn toàn tuyến biên giới Việt - Trung' },
      { id: 'D', text: 'D. Chiến lược bình định cấp tốc toàn bộ Nam Bộ trong 18 tháng' },
    ],
    correctOptionId: 'B',
    correctAnswer: 'B',
    suggestion: 'Buộc thực dân Pháp phải từ bỏ ảo tưởng giải quyết chiến tranh chớp nhoáng.',
    explanation:
      'Thực dân Pháp mở cuộc hành quân quy mô lớn lên Việt Bắc nhằm chụp bắt cơ quan đầu não kháng chiến và tiêu diệt bộ đội chủ lực của ta để kết thúc chiến tranh nhanh chóng. Thất bại thảm hại ở Việt Bắc đã đập tan hoàn toàn chiến lược "đánh nhanh thắng nhanh", đẩy Pháp sa lầy vào thế bị động.',
    sourceNote: 'Giáo trình Lịch sử ĐCSVN (NXB CTQG 2021, Chương 2, Mục I.2)',
  },

  // ─── Câu 8: Đuổi hình bắt chữ 4 (Catchphrase) ─────────────────────────────
  {
    id: 8,
    type: 'catchphrase',
    title: 'Câu 8: Đuổi hình bắt chữ',
    prompt:
      'Nguyên tắc cốt lõi về nguồn lực nào của đường lối kháng chiến khẳng định: Cuộc kháng chiến của ta phải dựa vào sức mình là chính, không ỷ lại trông chờ vào sự giúp đỡ bên ngoài?',
    photo: {
      id: 'hanoi1946',
      src: 'images/history/hanoi-1946.jpg',
      caption: 'Chiến đấu tại Hà Nội những ngày đầu Toàn quốc kháng chiến, 1946–1947.',
      date: '1946–1947',
      credit: 'Ảnh tư liệu / Báo Quân đội nhân dân',
      source:
        'https://www.qdnd.vn/quoc-phong-an-ninh/nghe-thuat-quan-su-vn/van-dung-sang-tao-linh-hoat-cac-hinh-thuc-tac-chien-trong-thanh-pho-678828',
      context: 'Tự lực tự cường, tự chế tạo vũ khí trang bị chiến đấu trong vòng vây',
    },
    image: 'images/history/hanoi-1946.jpg',
    correctAnswer: 'Tự lực cánh sinh',
    suggestion:
      'Thành ngữ gồm 4 từ (T... L... C... S...). Dựa vào chính đôi tay và sức lực của dân tộc mình, tự chế tạo vũ khí, tự cấp tự túc.',
    letterHint: {
      wordLengths: [2, 3, 4, 4],
      scheduledLetters: [
        { index: 0, wordIndex: 0, letterIndex: 0, char: 'T', revealAfterMs: 15000 },
        { index: 7, wordIndex: 2, letterIndex: 0, char: 'C', revealAfterMs: 35000 },
      ],
    },
    explanation:
      '"Tự lực cánh sinh" và dựa vào sức mình là chính: Sự giúp đỡ quốc tế là quan trọng nhưng nội lực dân tộc ta giữ vai trò quyết định thắng lợi của sự nghiệp giải phóng dân tộc.',
    sourceNote: 'Lời kêu gọi Toàn quốc kháng chiến & Văn kiện Đảng Toàn tập',
  },

  // ─── Câu 9: Trắc nghiệm (Choice) ─────────────────────────────────────────
  {
    id: 9,
    type: 'choice',
    title: 'Câu 9: Bước ngoặt Chiến dịch Biên giới Thu – Đông 1950',
    prompt:
      'Chiến dịch Biên giới Thu – Đông năm 1950 do ta chủ động mở đã đánh dấu bước chuyển biến mang tính bước ngoặt chiến lược gì của cuộc kháng chiến chống Pháp?',
    options: [
      { id: 'A', text: 'A. Quân đội ta giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ, chuyển từ phòng ngự sang tiến công' },
      { id: 'B', text: 'B. Đánh dấu thời điểm kết thúc hoàn toàn cuộc kháng chiến chống thực dân Pháp' },
      { id: 'C', text: 'C. Quân ta bắt đầu chuyển hoàn toàn sang tác chiến phòng ngự bị động trên cả nước' },
      { id: 'D', text: 'D. Ký kết hiệp định đình chiến và lập lại hòa bình tại Đông Dương' },
    ],
    correctOptionId: 'A',
    correctAnswer: 'A',
    suggestion: 'Quân đội ta giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.',
    explanation:
      'Chiến dịch Biên giới 1950 là chiến dịch tiến công lớn đầu tiên của quân đội ta. Thắng lợi đã tiêu diệt một bộ phận quan trọng sinh lực tinh nhuệ của Pháp, khai thông tuyến biên giới dài 750km nối với hậu phương quốc tế, giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.',
    sourceNote: 'Bảo tàng Hồ Chí Minh & Giáo trình Lịch sử ĐCSVN',
  },

  // ─── Câu 10: Đuổi hình bắt chữ 5 (Catchphrase) ────────────────────────────
  {
    id: 10,
    type: 'catchphrase',
    title: 'Câu 10: Đuổi hình bắt chữ',
    prompt:
      'Tên chiến dịch tiến công lớn đầu tiên của Quân đội nhân dân Việt Nam vào Thu – Đông năm 1950, khai thông tuyến đường huyết mạch nối với các nước xã hội chủ nghĩa là gì?',
    photo: {
      id: 'hochiminh1950',
      src: 'images/history/ho-chi-minh-dong-khe-1950.jpeg',
      caption: 'Chủ tịch Hồ Chí Minh trên đài quan sát núi Báo Đông trong Chiến dịch Biên giới, tháng 9/1950.',
      date: '09/1950',
      credit: 'Ảnh tư liệu, đăng tại Bảo tàng Hồ Chí Minh',
      source:
        'https://baotanghochiminh.vn/di-tich-nui-bao-dong-noi-chu-tich-ho-chi-minh-quan-sat-tran-danh-don-dong-khe-chien-dich-bien-gioi-1950.htm',
      context: 'Chủ tịch Hồ Chí Minh trực tiếp ra mặt trận chỉ đạo chiến dịch lớn giải phóng biên cương',
    },
    image: 'images/history/ho-chi-minh-dong-khe-1950.jpeg',
    correctAnswer: 'Biên giới',
    suggestion:
      'Cụm từ gồm 2 từ (B... G...). Vùng địa bàn địa đầu Tổ quốc nối liền căn cứ địa Việt Bắc với nước bạn Trung Hoa và quốc tế.',
    letterHint: {
      wordLengths: [4, 4],
      scheduledLetters: [
        { index: 0, wordIndex: 0, letterIndex: 0, char: 'B', revealAfterMs: 15000 },
        { index: 5, wordIndex: 1, letterIndex: 0, char: 'G', revealAfterMs: 35000 },
      ],
    },
    explanation:
      '"Chiến dịch Biên giới Thu – Đông 1950" (mật danh Chiến dịch Lê Hồng Phong II) mở màn bằng trận đánh đồn Đông Khê, đập tan tuyến phòng thủ đường số 4, giải phóng hoàn toàn dải biên giới trọng yếu.',
    sourceNote: 'Ảnh tư liệu Bảo tàng Hồ Chí Minh & Lịch sử Quân đội nhân dân Việt Nam',
  },
];
