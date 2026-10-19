# VNR202 — Đường Lối Kháng Chiến Toàn Quốc & Quá Trình Tổ Chức Thực Hiện (1946 – 1950)

Website học thuật và hoạt động mô phỏng giáo dục hợp tác phục vụ báo cáo chuyên đề môn **Lịch sử Đảng Cộng sản Việt Nam (VNR202)**, Chương 2, Mục I.2.

---

## 1. Cấu Trúc Trọng Tâm

Hệ thống được thiết kế tối ưu cho buổi học tập và báo cáo chuyên đề trước lớp:
- **Phần 1: Bài Học Lý Luận & Sự Kiện (15 phút, 12 Phần Chuyên Đề cuộn dọc):** Bài viết chuyên đề dạng trang cuộn dọc liên tục (vertical continuous scrolling) tích hợp mục lục ghim màn hình lớn (sticky desktop TOC), chỉ mục nhanh di động, thanh tiến độ đọc (reading progress), scrollspy tự động nhận diện vị trí đọc và cuộn mượt mà hỗ trợ giảm chuyển động. Trình bày hoàn cảnh lịch sử tháng 12/1946, 3 văn kiện đường lối nền tảng của Đảng, 4 nội dung cốt lõi (*Toàn dân, Toàn diện, Trường kỳ, Tự lực cánh sinh*), hai chiến dịch bản lề (*Việt Bắc 1947, Biên Giới 1950*), bài học kinh nghiệm và liên hệ phương pháp luận quản trị nguồn lực "4 tại chỗ" hiện nay (ứng phó bão Yagi 2024). Mỗi phần đều gắn liền với ảnh tư liệu lịch sử có chú thích, niên đại và xuất xứ chính thức, tích hợp 2 câu hỏi thăm dò trực tuyến và chuyển tiếp trực tiếp sang hoạt động Game.
- **Phần 2: Hoạt Động Mô Phỏng Lớp Học: "Giữ Vững Căn Cứ" (10 phút):** 4–6 đội đại diện cho các căn cứ kháng chiến tham gia biểu quyết qua điện thoại thông minh (4 lượt × 90 giây), cân bằng 3 nguồn lực sống còn (*Lương thực, Lực lượng, Lòng dân*) và tương trợ nguồn lực qua cơ chế viện trợ tập thể.

---

## 2. Ngôn Ngữ Thiết Kế: Triển Lãm Số & Báo Chí Lịch Sử (Modern History Editorial)

- **Bảng màu:**
  - Nền giấy ngà ấm (`#f6f3ed`, `#ffffff`, `#ede7dc`).
  - Mực tối chữ đọc rõ nét (`#171513`, `#3a3530`).
  - Màu cờ và nhiệt huyết kháng chiến: Burgundy đỏ trầm (`#9d242b`, hover `#7a171d`).
  - Màu núi rừng chiến khu Việt Bắc: Forest xanh rêu đậm (`#193b32`, dark `#0e201b`).
  - Điểm xuyết sắc vàng lưu trữ (`#c99738`).
- **Kiểu chữ:**
  - Tiêu đề: Font serif lớn có chân hỗ trợ trọn vẹn dấu tiếng Việt (*Newsreader, Lora, Georgia*).
  - Nội dung: Font sans-serif hiện đại, độ tương phản cao, tối ưu hiển thị trên màn hình máy chiếu và thiết bị di động (*Be Vietnam Pro, Plus Jakarta Sans*).
- **Chuẩn mực lịch sử:**
  - 100% hình ảnh là ảnh chụp tư liệu lịch sử thực tế từ Bảo tàng Hồ Chí Minh, Thông tấn xã Việt Nam và Báo Quân đội nhân dân.
  - Tuyệt đối **không** dùng AI tạo ảnh chân dung lãnh tụ hay nhân vật lịch sử; **không** dùng cờ hay bản đồ làm chi tiết trang trí tùy tiện.
  - Mỗi bức ảnh đều có niên đại chính xác, chú thích chi tiết, nguồn lưu trữ và giải thích bối cảnh rõ ràng; không dùng ảnh lịch sử làm hình chụp gameplay giả tưởng.
  - Hỗ trợ đầy đủ tiêu chuẩn trợ năng: giảm chuyển động (`prefers-reduced-motion`) và viền định vị bàn phím (`focus-visible`).

---

## 3. Hoạt Động Mô Phỏng Chiến Lược: "Giữ Vững Căn Cứ"

Hoạt động mô phỏng hợp tác giáo dục giúp sinh viên trực tiếp trải nghiệm bài học lịch sử về đánh đổi nguồn lực:
- **Server-Authoritative:** Máy chủ Node/Socket.IO quản lý trạng thái, thời gian và tính toán kết quả tập trung, bảo đảm tính công bằng và đồng bộ tức thời.
- **Phân đội:** 4 – 6 đội đại diện các căn cứ địa (Bắc Sơn, Nam Kỳ, Việt Bắc, Tây Nguyên, Đồng Bằng, Duyên Hải).
- **Tài nguyên sinh tồn:** Mỗi đội quản lý 3 nguồn lực: **Lương thực (Food)**, **Lực lượng (Strength)**, **Lòng dân (Trust)** (khởi đầu 70 điểm).
- **Biểu quyết đa số:** Mỗi thành viên trong đội bỏ phiếu kín trên điện thoại trong 90 giây/lượt. Phương án đa số sẽ được thực hiện. Khi hòa phiếu hoặc không có người bỏ phiếu, áp dụng phương án mặc định công khai.
- **Viện trợ tập thể:** Các đội có thể tương trợ nhau qua cơ chế viện trợ (tối đa 20 đơn vị/lượt, không sinh điểm thưởng).
- **Điều kiện thắng tập thể:** Cả lớp cùng vượt qua 4 lượt chơi, mọi nguồn lực của từng đội duy trì từ 40 điểm trở lên sau mỗi lượt và điểm trung bình toàn lớp đạt từ 50 trở lên.
- **Bảo mật & Ổn định:** Mã phòng 6 ký tự; mã định danh riêng cho chủ phòng (Host Token) và người chơi (Player Token); hỗ trợ kết nối lại giữ nguyên trạng thái; tự động dọn phòng sau 30 phút (TTL).

---

## 4. Hướng Dẫn Cài Đặt & Chạy Mạng Cục Bộ (Local & LAN)

### Yêu Cầu Môi Trường
- Node.js phiên bản 18 trở lên
- Trình quản lý gói npm

### Khởi Động Dự Án
```bash
# 1. Cài đặt dependencies cho backend và frontend
cd server && npm install
cd ../client && npm install
cd ..

# 2. Chạy máy chủ Socket.IO (Port 3001)
npm run dev:server

# 3. Mở terminal khác, chạy giao diện người dùng Vite (Port 5173)
npm run dev:client
```

### Sử Dụng Trong Lớp Học Qua Mạng LAN
1. Tìm địa chỉ IP LAN của máy tính chủ phòng (trên Windows gõ `ipconfig`, ví dụ: `192.168.1.15`).
2. Mở trình duyệt vào `http://localhost:5173`.
3. Nhấp vào biểu tượng Cài đặt trên thanh điều hướng hoặc vào mục **"Game"** → **"Màn hình máy chiếu (Chủ phòng)"**.
4. Nhập địa chỉ LAN máy chủ: `http://192.168.1.15:3001` (để Socket.IO kết nối đúng) và `http://192.168.1.15:5173` (để mã QR mở trên điện thoại).
5. Sinh viên quét mã QR trên màn hình máy chiếu để vào thẳng phòng game trên điện thoại.

---

## 5. Lệnh Kiểm Thử & Biên Dịch (Build & Test)

Dự án có hệ thống kiểm thử toàn diện từ đơn vị đến tích hợp:
```bash
# Chạy toàn bộ 97 bài kiểm thử tự động máy chủ (Unit, Engine, Room, Coordinator, Static HTTP, Load 60 clients)
npm run test

# Kiểm tra kiểu dữ liệu TypeScript (Server & Client)
npm run typecheck

# Biên dịch sản phẩm production (Server & Client)
npm run build
```

---

## 6. Hướng Dẫn Triển Khai Đám Mây (Cloud Deployment)

Chi tiết các bước triển khai website và máy chủ Game trên nền tảng đám mây Render (gói Free) thông qua tệp cấu hình chuẩn `render.yaml` (Blueprint) được trình bày tại [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

- **Kiến trúc:** Dịch vụ Node.js duy nhất phục vụ đồng thời giao diện React (`client/dist`) và máy chủ WebSocket trên cùng một cổng và tên miền HTTPS.
- **Lưu ý đặc tính gói Free:** Trạng thái phòng lưu trong RAM; máy chủ tự ngủ sau 15 phút không hoạt động và làm mới RAM khi khởi động lại.

---

## 7. Minh Bạch Học Thuật & Danh Mục Nguồn

### Báo Cáo Sử Dụng Trí Tuệ Nhân Tạo (AI Usage)
- **Công cụ:** Codex Coordinator kết hợp OpenCode CLI (mô hình ban đầu Claude Opus 4.6 medium; chuyển sang `ag/gemini-3.8-flash-high` khi Opus trả mã lỗi HTTP 503).
- **Phạm vi:** Viết mã nguồn frontend, backend Socket.IO, dàn trang và kiểm thử kỹ thuật.
- **Trách nhiệm học thuật:** Toàn bộ nội dung sự kiện, văn kiện và diễn giải lịch sử là **Bản thảo (Draft)** do nhóm sinh viên đối chiếu trực tiếp với giáo trình bản in và tự chịu trách nhiệm trước giảng viên.

### Danh Mục Văn Kiện & Nguồn Tham Khảo Chính Thức
1. **Giáo trình cốt lõi:** Bộ Giáo dục và Đào tạo, *Giáo trình Lịch sử Đảng Cộng sản Việt Nam (Dành cho bậc đại học hệ không chuyên lý luận chính trị)*, NXB Chính trị quốc gia Sự thật, Hà Nội, 2021 (Chương 2, Mục I.2).
2. **Văn kiện quân sự:** [Nghị quyết Hội nghị quân sự toàn quốc của Đảng ngày 19-10-1946](https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/hoi-nghi-bch-trung-uong/khoa-i/nghi-quyet-hoi-nghi-quan-su-toan-quoc-cua-dang-ngay-19-10-1946-677) — Cổng Thông tin Tư liệu Văn kiện Đảng.
3. **Biên niên sự kiện:** [Lịch sử biên niên Đảng Cộng sản Việt Nam, Tập 3](https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-3-176) — Học viện Chính trị quốc gia Hồ Chí Minh.
4. **Văn kiện tư tưởng:** [Kháng chiến toàn dân, toàn diện, trường kỳ, dựa vào sức mình là chính](https://hcmcpv.org.vn/tin-tap-chi/thong-tin-tuyen-truyen-12-2016/khang-chien-toan-dan-toan-dien-truong-ky-dua-vao-suc-minh-la-chinh-1486349354) — Trang tin điện tử Đảng bộ TP. Hồ Chí Minh.
5. **Liên hệ thực tiễn:** [Công điện số 86/CĐ-TTg ngày 03/9/2024 của Thủ tướng Chính phủ về ứng phó bão số 3 (bão Yagi)](https://xaydungchinhsach.chinhphu.vn/thu-tuong-chi-dao-khan-truong-ung-pho-bao-so-3-bao-yagi-119240903121402583.htm) — Cổng Thông tin điện tử Chính phủ (Phân định rõ phương pháp luận quản trị nguồn lực "4 tại chỗ", không đồng nhất chiến tranh với thiên tai).

---

## 8. Giấy Phép & Bản Quyền
Dự án được xây dựng phục vụ mục đích học tập phi thương mại trong khuôn khổ học phần VNR202.
