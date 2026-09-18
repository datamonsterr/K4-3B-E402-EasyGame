# User Story US-B4: Quản Lý Tin Nhắn & Trả Lời Trực Tiếp Từ Ứng Dụng (Messages View)

> **Mã Story:** `US-B4`  
> **Thuộc Module:** Track B2 / Operations Deck — Công cụ Triage Tin nhắn & Phản hồi Nội bộ cho Lab Coach  
> **Nhóm thực hiện:** EasyGame · Lớp 3B · Phòng E402  
> **Tác giả:** Phạm Thành Đạt (Lead BA)  
> **Người phối hợp:** Nguyễn Tiến Đạt (Frontend / Prototype), Trần Mạnh Hùng (Workflow)  
> **Phiên bản:** v1.0 · Ngày duyệt: 18/09/2026

---

## 1. Nội Dung User Story

**As a** Lab Coach / Trợ giảng trực ca đang rà soát các câu hỏi bị trôi hoặc kẹt trên kênh chat khóa học,  
**I want to** bấm vào liên kết trên thẻ ticket để nhảy trực tiếp tới tin nhắn tương ứng trong tab "Messages" (tiền thân là "Manage Channels"), xem giao diện danh sách tin nhắn tinh gọn (hoàn toàn không hiển thị mã JSON thô), và gõ câu trả lời gửi thẳng vào cơ sở dữ liệu ứng dụng ngay tại chỗ,  
**So that** tôi có thể xử lý cứu kẹt tức thời cho học viên mà không cần phải chuyển sang ứng dụng Discord bên ngoài, không lo bot gửi tin nhắn làm phiền kênh chung, đồng thời vẫn có nút liên kết tới Discord thật khi cần trao đổi chuyên sâu.

---

## 2. Bảng Đánh Giá Tiêu Chuẩn INVEST

| Tiêu chí | Đánh giá | Diễn giải chi tiết |
|---|:---:|---|
| **I — Independent** | ✅ | Giao diện "Messages" và chức năng gửi phản hồi vào database hoạt động độc lập với pipeline tạo câu trả lời tự động của bot B1. |
| **N — Negotiable** | ✅ | Bố cục cột danh sách và khung soạn thảo có thể tùy biến độ rộng, nhưng bắt buộc loại bỏ JSON thô và không được bắn webhook ra Discord thật. |
| **V — Valuable** | ✅ | Rút ngắn thời gian xử lý ticket từ 2-3 phút (mở app Discord, tìm channel, gõ trả lời) xuống dưới 15 giây trực tiếp trên EasyGame. |
| **E — Estimable** | ✅ | Dễ ước lượng: Đổi tên tab, refactor bảng `channels-view.tsx` loại bỏ ô JSON, thêm composer trả lời và endpoint `POST /api/workspace/reply`. |
| **S — Small** | ✅ | Hoàn thành gọn trong 1 view frontend và 1 route API ghi nhận câu trả lời vào bảng `source_messages`. |
| **T — Testable** | ✅ | Kiểm thử bằng luồng click ticket nhảy sang tab Messages, nhập câu trả lời, kiểm tra record mới trong `source_messages` có `message_type='reply'`. |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria - Gherkin Syntax)

### AC1: Điều hướng từ Ticket sang đúng tin nhắn trong tab Messages (Ticket-to-Message Navigation)
* **Given** Lab Coach đang ở tab `Tickets & Radar` và thấy câu hỏi của học viên bị quá hạn (ví dụ: ticket `tk-101` của bạn `@MinhTuan_K4`),
* **When** Coach nhấn nút thao tác trên thẻ ticket (nút **"Xem tin nhắn 💬"**),
* **Then** Hệ thống lập tức chuyển tab đang hoạt động sang tab **"Messages"** (thay vì mở liên kết Discord ngoài),
* **And** Hệ thống tự động cuộn đến và làm nổi bật (highlight) tin nhắn gốc của `@MinhTuan_K4` trong danh sách tin nhắn,
* **And** Khung chi tiết bên phải tải toàn bộ ngữ cảnh trao đổi liên quan đến tin nhắn này.

---

### AC2: Giao diện tinh gọn không hiển thị JSON thô (Compact UI & Zero Raw JSON)
* **Given** Lab Coach truy cập vào tab `Messages`,
* **When** Giao diện tải danh sách tin nhắn từ các kênh công khai,
* **Then** Hệ thống hiển thị danh sách dạng bảng/thẻ gọn gàng gồm các thông tin: Tên kênh (`#lab-support`), Người gửi (`@MinhTuan_K4`), Đoạn trích câu hỏi, Dấu thời gian, Nhãn Intent (`Technical_Roadblock`),
* **And** Khung hiển thị JSON thô (`Raw Discord Gateway Event (JSON)`) trước đây **HOÀN TOÀN BỊ LOẠI BỎ**,
* **And** Thay thế bằng khung đọc tin nhắn trực quan và khu vực soạn câu trả lời (Reply Composer) chuyên nghiệp.

---

### AC3: Trả lời trực tiếp vào cơ sở dữ liệu ứng dụng (In-App Direct DB Reply)
* **Given** Lab Coach đang xem chi tiết một tin nhắn câu hỏi chưa được giải quyết trong tab `Messages`,
* **When** Coach nhập nội dung giải đáp: `"Bạn hãy sử dụng pyarrow chunking để đọc file 4GB từng phần nhé"` vào khung soạn thảo,
* **And** Nhấn nút **"Send Reply (Database)"**,
* **Then** Hệ thống gửi yêu cầu `POST /api/workspace/reply` lưu câu trả lời vào bảng `public.source_messages` với `message_type = 'reply'` và `reply_to_id = tin_nhắn_gốc.id`,
* **And** Trạng thái của ticket tương ứng trong bảng `questions` tự động chuyển sang `answered`,
* **And** Câu trả lời của Coach lập tức xuất hiện ngay dưới tin nhắn của học viên trong khung hội thoại nội bộ,
* **And** Hệ thống **TUYỆT ĐỐI KHÔNG** gọi Discord Webhook hoặc gửi tin nhắn ra bot Discord thật ngoài đời.

---

### AC4: Tùy chọn liên kết nhảy sang Discord thật (Optional Real Discord Deep Link)
* **Given** Lab Coach nhận thấy câu hỏi cần chia sẻ màn hình hoặc hỗ trợ trực tiếp trong phòng thoại trên Discord,
* **When** Coach bấm vào nút phụ **"Mở trên Discord thật ↗"** trên thanh tiêu đề tin nhắn,
* **Then** Trình duyệt mở một tab mới điều hướng tới đúng URL Discord chuẩn: `https://discord.com/channels/{guild_id}/{channel_id}/{message_id}`,
* **And** Không làm gián đoạn hay mất trạng thái làm việc của tab EasyGame hiện tại.

---

## 4. Ghi Chú Kỹ Thuật & Giả Định (Notes & Assumptions)

1. **Database Schema:** Câu trả lời lưu vào bảng `public.source_messages` hiện có, tuân thủ các khóa ngoại `reply_to_id` trỏ về tin nhắn gốc và `guild_id` của cohort.
2. **Tab Naming:** Đổi tên hiển thị từ `"Manage Channels & Ingestion"` thành `"Messages"` trên toàn bộ thanh điều hướng bên trái và thanh tiêu đề.
3. **No External Side-Effects:** Mọi thao tác trả lời trong ứng dụng chỉ tồn tại trong cơ sở dữ liệu nội bộ phục vụ việc hỗ trợ và chấm điểm, không gây rủi ro spam kênh chat thực tế của học viên.
