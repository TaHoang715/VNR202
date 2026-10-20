# Triển khai VNR202

Giao diện chạy trên Vercel; phòng chơi, phiếu bầu, khảo sát và đồng hồ lượt chạy trên Convex. Không dùng Render.

## Tài nguyên riêng

- Repo: https://github.com/TaHoang715/VNR202
- Giao diện: https://vnr202-quiz-20261020.vercel.app/
- Project Convex: taminhhoang-nk/vnr202-classroom-20261019
- Development: grand-peccary-45 — https://grand-peccary-45.convex.cloud
- Production: terrific-labrador-176 — https://terrific-labrador-176.convex.cloud

Các project và deployment Convex khác không thuộc phạm vi của VNR202.

## Chạy cục bộ

Cài bằng `npm ci`, tạo `.env.local` theo `.env.example`, rồi chạy `npm run dev:client`. Có `VITE_CONVEX_URL` thì giao diện dùng Convex. Không đặt biến này thì có thể chạy backend Socket.IO cục bộ bằng `npm run dev:server` ở terminal thứ hai. Không đưa khóa deploy hay token tài khoản vào biến `VITE_*`.

## Cập nhật backend

Kiểm tra `.env.local` chọn đúng `dev:grand-peccary-45` trước mọi lệnh Convex. Đối chiếu project đích trên CLI.

```sh
npx convex dev --once
npx convex deploy
```

Lệnh đầu cập nhật môi trường thử VNR202. Lệnh sau cập nhật production mặc định của cùng project. Không lấy khóa hoặc cấu hình từ project cũ.

## Cập nhật giao diện

Project Vercel `vnr202-quiz-20261020` thuộc scope `ta-hoang715-s-projects`, kết nối repo GitHub. Push nhánh `main` tự triển khai production. `vercel.json` cài dependency tại root, build workspace client và xuất `client/dist`.

- Production: `VITE_CONVEX_URL=https://terrific-labrador-176.convex.cloud`.
- Preview/Development: `VITE_CONVEX_URL=https://grand-peccary-45.convex.cloud`.
- Mọi môi trường: `VITE_BASE_PATH=/`.

Vercel chỉ build frontend, không tự deploy Convex. `.vercel/` và `.env*` không được upload. Workflow GitHub Pages chỉ còn chạy thủ công để dự phòng, dùng base `/VNR202/`.

## Test trước buổi học

- Mở link trên điện thoại hoặc máy chiếu, tạo phòng trong "Chủ phòng", quét QR hoặc nhập mã 6 ký tự tại "Người chơi".
- Để trống sĩ số khi chưa biết; ứng dụng ghi nhận số người vào thực tế (sức chứa đến 200 người).
- Thử hai khảo sát trong Bài học, chuyển tiếp câu hỏi 10 câu, tính điểm chuẩn xác 1000 + tốc độ 250, kiểm tra mất mạng / vào lại khôi phục trạng thái.
- Thử chế độ "Chơi thử ngay" độc lập không cần backend.
- Mỗi trình duyệt giữ mã phiên riêng. Không chia sẻ khóa chủ phòng hoặc thông tin đăng nhập Convex.
