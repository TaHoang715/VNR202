# Triển khai VNR202

Giao diện chạy trên GitHub Pages; phòng chơi, phiếu bầu, khảo sát và đồng hồ lượt chạy trên Convex. Không dùng Render.

## Tài nguyên riêng

- Repo: https://github.com/TaHoang715/VNR202
- Giao diện: https://tahoang715.github.io/VNR202/
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

Workflow `.github/workflows/pages.yml` build `client/dist` khi push nhánh `main`. Repository variable `VITE_CONVEX_URL` phải là `https://terrific-labrador-176.convex.cloud`; workflow kiểm tra giá trị này. `VITE_BASE_PATH=/VNR202/` giúp ảnh và QR hoạt động ở đường dẫn GitHub Pages.

Workflow không có khóa deploy Convex và không tự thay đổi backend. Sau khi xuất bản, kiểm tra workflow và URL thật.

## Test trước buổi học

- Mở link trên điện thoại, tạo phòng, quét QR và chọn đội.
- Để trống sĩ số khi chưa biết; ứng dụng ghi nhận số người vào thực tế.
- Thử hai khảo sát trong Bài học, mất mạng/vào lại, tạm dừng/tiếp tục và bốn lượt.
- Xem demo dùng người chơi máy có nhãn rõ ràng; không tính máy thành số sinh viên tham gia thật.
- Mỗi trình duyệt giữ mã phiên riêng. Không chia sẻ khóa chủ phòng hoặc thông tin đăng nhập Convex.
