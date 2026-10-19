# VNR202 — Đường lối kháng chiến toàn quốc (1946–1950)

Website bài học môn Lịch sử Đảng Cộng sản Việt Nam, Chương 2, Mục I.2, kèm thử thách trắc nghiệm cá nhân **Giải mã kháng chiến** cho cả lớp.

- Bài học cuộn dọc gồm 12 mục, ảnh tư liệu có nguồn, ghi chú và bản in.
- Hai khảo sát lồng ghép trong bài học kết nối trực tiếp với phòng thi.
- Thử thách "Giải mã kháng chiến": 10 câu hỏi độc lập (25s/câu), tính điểm chuẩn xác 1.000 điểm + tối đa 250 điểm thưởng tốc độ; hỗ trợ chơi thử ngay (solo) không cần backend/tài khoản và thi đấu trực tuyến (online) phòng 6 ký tự / QR đến 200 người.
- Ba dạng câu hỏi chuẩn nguồn 1946–1950: trắc nghiệm chọn đáp án, câu hỏi ảnh tư liệu lịch sử thật và sắp xếp mốc thời gian bằng nút bấm tiếp cận.
- Phụ lục AI Usage và tài liệu tham khảo. Nhóm cần đối chiếu giáo trình bản in trước khi nộp.

## Chạy

```sh
npm ci
npm run dev:client
```

Đặt `VITE_CONVEX_URL` trong `.env.local` để dùng backend Convex. Nếu không đặt, chạy thêm `npm run dev:server` để dùng Socket.IO cục bộ.

## Kiểm tra

```sh
npm run typecheck
npm run build
npm test
```

Backend Convex có bộ kiểm thử riêng bằng convex-test. Xem các script trong `package.json`.

## Triển khai

Giao diện trên GitHub Pages và backend trên project Convex riêng **vnr202-classroom-20261019**. Cấu hình, URL và cách cập nhật nằm trong [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Không dùng hay sửa deployment Convex của các dự án cũ.

Ảnh tư liệu lấy từ Báo Quân đội nhân dân, Bảo tàng Hồ Chí Minh, TTXVN, Báo Cao Bằng và VOV; nguồn được ghi trong website. Không dùng ảnh AI tạo nhân vật lịch sử.
