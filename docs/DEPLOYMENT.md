# Hướng dẫn Triển khai Web & Game VNR202 (Render Blueprint)

Tài liệu hướng dẫn quy trình đưa website học tập và trò chơi hợp tác trực tuyến **"Giữ vững căn cứ"** lên dịch vụ hosting đám mây Render thông qua Blueprint (`render.yaml`).

---

## 1. Kiến trúc dịch vụ đơn (Single Node Process)

- **Mô hình cùng nguồn (Same Origin):** Một tiến trình Node.js duy nhất phục vụ đồng thời giao diện người dùng tĩnh đã biên dịch (`client/dist`) và máy chủ thời gian thực Socket.IO trên cùng một cổng (`PORT`).
- **Không phụ thuộc dịch vụ ngoài:** Toàn bộ logic trò chơi, sảnh chờ, và khảo sát trực tiếp hoạt động độc lập; không sử dụng Convex, Firebase hay cơ sở dữ liệu bên ngoài.
- **Tối ưu mạng lớp học:** Không phát sinh lỗi CORS liên miền; mã QR tự động lấy tên miền triển khai công khai giúp người chơi truy cập thẳng.

---

## 2. Các bước triển khai với Render Blueprint

1. **Chuẩn bị kho lưu trữ:**
   - Mã nguồn được đẩy lên GitHub tại repository: `https://github.com/TaHoang715/VNR202` (nhánh `main`).
   - Cấu hình Blueprint đã được định nghĩa sẵn trong tệp `render.yaml` ở thư mục gốc.

2. **Khởi tạo Blueprint trên Render:**
   - Truy cập bảng điều khiển [Render Dashboard](https://dashboard.render.com).
   - Chọn **New +** $\rightarrow$ **Blueprint**.
   - Kết nối với kho lưu trữ GitHub `TaHoang715/VNR202`.

3. **Cấu hình tự động theo `render.yaml`:**
   - **Tên dịch vụ:** `vnr202` (Web Service, Runtime: Node).
   - **Gói cước:** `free` (Miễn phí).
   - **Khu vực máy chủ:** `singapore` (Độ trễ thấp tối ưu cho người dùng tại Việt Nam).
   - **Lệnh biên dịch (Build Command):**
     ```bash
     npm ci --prefix server --include=dev && npm ci --prefix client --include=dev && npm run build
     ```
     *(Sử dụng trực tiếp `package-lock.json` của từng workspace, đảm bảo phiên bản gói nhất quán tuyệt đối).*
   - **Lệnh khởi chạy (Start Command):** `npm start`
   - **Đường dẫn kiểm tra sức khỏe (Health Check Path):** `/health`
   - **Biến môi trường định sẵn:**
     - `NODE_ENV=production`
     - `SERVE_CLIENT=1` *(Kích hoạt bộ định tuyến HTTP phục vụ frontend tĩnh và SPA fallback).*
     - `NODE_VERSION=22.16.0`

4. **Kích hoạt triển khai:**
   - Nhấn **Apply**. Render sẽ tự động cài đặt dependency, biên dịch TypeScript/Vite và khởi động máy chủ.
   - Khi hoàn tất, hệ thống sẽ cấp một URL dạng: `https://vnr202.onrender.com`.

---

## 3. Đặc tính thực tế của gói Render Free (RAM State & Sleep)

- **Trạng thái phòng lưu trong RAM:**
  - Danh sách phòng chơi, điểm số tài nguyên, và khảo sát đều được quản lý hoàn toàn trong bộ nhớ RAM của tiến trình máy chủ.
  - Không có database trung gian để tránh rò rỉ dữ liệu hoặc cấu hình phức tạp.
- **Cơ chế ngủ khi không hoạt động (Inactivity Sleep):**
  - Gói Free của Render sẽ tự động đưa tiến trình vào trạng thái tạm nghỉ (spin-down) sau khoảng 15 phút không có truy cập HTTP.
  - Lần truy cập đầu tiên sau khi máy chủ ngủ sẽ mất khoảng 30–50 giây để khởi động lại (cold start).
- **Mất phòng khi khởi động lại:**
  - Bất kỳ thao tác khởi động lại (restart) máy chủ hoặc triển khai bản cập nhật mới nào cũng sẽ xóa sạch các phòng chơi đang diễn ra trong RAM.
  - **Khuyến nghị cho buổi thuyết trình thực tế:**
    1. Truy cập vào trang web khoảng 5–10 phút trước giờ báo cáo để máy chủ thức dậy sẵn sàng.
    2. Tạo phòng và kiểm tra trước một ván thử nghiệm ngắn.
    3. Tránh kích hoạt deploy lại trên Render trong lúc lớp học đang tham gia trò chơi.

---

## 4. Kiểm thử kết nối phòng học (HTTPS & WebSocket)

- **Chứng chỉ bảo mật HTTPS & WSS:**
  - Render tự động cấp chứng chỉ SSL miễn phí. Mọi kết nối Socket.IO sẽ tự động chuyển sang kênh mã hóa an toàn `wss://` (WebSocket Secure).
- **Mã QR trực tiếp:**
  - Trên màn hình Chủ trì (Host), địa chỉ tham gia mặc định sẽ tự động nhận diện tên miền triển khai HTTPS (ví dụ `https://vnr202.onrender.com/?room=XXXXXX`).
  - Sinh viên chỉ cần quét mã QR bằng camera điện thoại thông minh để vào thẳng phòng, không cần gõ địa chỉ IP thủ công.
- **Kiểm tra mạng Wi-Fi trường học:**
  - Một số mạng Wi-Fi trường học có thiết lập tường lửa hạn chế cổng WebSocket hoặc cô lập thiết bị.
  - Khuyến nghị thử nghiệm quét QR trên cả mạng Wi-Fi của lớp và mạng dữ liệu di động (4G/5G) để đảm bảo kết nối thông suốt trước giờ trình bày.
