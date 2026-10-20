# VNR202 — Đường lối kháng chiến toàn quốc (1946–1950)

Website bài học môn Lịch sử Đảng Cộng sản Việt Nam, Chương 2, Mục I.2, kèm thử thách trắc nghiệm cá nhân **Giải mã kháng chiến** cho cả lớp.

- Bài học cuộn dọc gồm 12 mục, ảnh tư liệu có nguồn và bản in.
- Thử thách Đấu trường tri thức "Đường lối kháng chiến": 10 vòng thi đấu (60s/vòng), tính điểm thời gian thực mili-giây floor(thời gian còn lại / 10) tối đa ~6.000 điểm/vòng; thi đấu trực tuyến phòng 6 ký tự / QR đến 200 người.
- Hai thể thức chuẩn xác 1946–1950: 5 câu trắc nghiệm phản xạ 4 lựa chọn màu sắc và 5 câu đuổi hình bắt chữ điền từ khóa kèm ảnh tư liệu lịch sử thật, cho phép thử lại khi trả lời sai mà không bị khóa.
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

Giao diện trên Vercel tại https://vnr202-quiz-20261020.vercel.app và backend trên project Convex riêng **vnr202-classroom-20261019**. Cấu hình, URL và cách cập nhật nằm trong [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Không dùng hay sửa deployment Convex của các dự án cũ.

Ảnh tư liệu lấy từ Báo Quân đội nhân dân, Bảo tàng Hồ Chí Minh, TTXVN, Báo Cao Bằng và VOV; nguồn được ghi trong website. Không dùng ảnh AI tạo nhân vật lịch sử.
