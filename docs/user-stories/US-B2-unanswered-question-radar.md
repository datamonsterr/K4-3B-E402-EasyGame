# User Story US-B2: Radar Rà Soát Câu Hỏi Tồn & Bản Tin Ngày Cho TA

> **Mã Story:** `US-B2`  
> **Thuộc Module:** Track B2 — Tính năng mới hỗ trợ Đội ngũ Trợ giảng (Lab Coach / TA)  
> **Nhóm thực hiện:** EasyGame · Lớp 3B · Phòng E402  
> **Tác giả:** Phạm Thành Đạt (Lead BA)  
> **Người phối hợp:** Đậu Quang Ý (Data Mining / Baseline Reports), Nguyễn Tiến Đạt (Web / Discord Prototype)  
> **Phiên bản:** v1.0 · Ngày duyệt: 17/09/2026

---

## 1. Nội Dung User Story

**As a** Lab Coach / Trợ giảng trực ca hỗ trợ trên máy chủ Discord khóa học,  
**I want to** hệ thống tự động quét, phát hiện các câu hỏi của học viên chưa được ai phản hồi theo các mốc thời gian quy định (2 giờ và 4 giờ) và nhận một bản tin tổng hợp thông minh cuối ngày kèm đường dẫn trực tiếp (deep link) tới từng câu hỏi,  
**So that** tôi kịp thời cứu kẹt học viên, không để sót bất kỳ thắc mắc nào của lớp học, đồng thời tiết kiệm 15–30 phút mỗi ngày rà soát kênh chat thủ công và nắm bắt được các chủ đề nóng đang gây bối rối cho toàn khóa.

---

## 2. Bảng Đánh Giá Tiêu Chuẩn INVEST

| Tiêu chí | Đánh giá | Diễn giải chi tiết |
|---|:---:|---|
| **I — Independent** | ✅ | Radar B2 hoạt động như một tiến trình ngầm (background job / cron worker) độc lập với tiến trình hội thoại của Bot B1; có thể chạy độc lập trên kênh nội bộ `#ta-radar`. |
| **N — Negotiable** | ✅ | Các mốc thời gian cảnh báo (2h, 4h) và định dạng hiển thị bản tin (Discord Embed Card hoặc Web Dashboard) có thể cấu hình linh hoạt theo thỏa thuận với đội ngũ vận hành. |
| **V — Valuable** | ✅ | Giải quyết trực tiếp thực trạng 21.5% câu hỏi bị bỏ quên (23/107 câu trong `k4_messages.csv`), giúp 100% TA tiết kiệm từ 15 đến hơn 60 phút mỗi ngày và khắc phục triệt để lỗi từ vựng/cắt cụt của bản tin cũ. |
| **E — Estimable** | ✅ | Đội ngũ kỹ thuật có thể ước tính rõ ràng logic: Lọc tin nhắn có dấu `?`, kiểm tra `reply_count` / `thread_messages`, so sánh `timestamp` và sinh văn bản tổng hợp qua LLM. |
| **S — Small** | ✅ | Phạm vi giới hạn ở việc quét kênh chat public của lớp, gom nhóm câu hỏi và đẩy thông báo vào kênh riêng của TA; nghiệm thu gọn gàng trong CP3–CP4. |
| **T — Testable** | ✅ | Dễ dàng kiểm thử bằng cách inject tin nhắn giả lập với timestamp cách đây 2h và 4h trong môi trường test; kiểm chứng độ sạch của văn bản bản tin không còn chứa chuỗi lỗi `"nguồn tham chiếu"`. |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria - Gherkin Syntax)

### AC1: Quét định kỳ & Cảnh báo mềm sau 2 giờ (Tier 1 Soft Warning)
* **Given** Học viên gửi một câu hỏi hợp lệ trên kênh `#thao-luan` lúc 14:00 nhưng chưa có bất kỳ ai (cả bot lẫn học viên khác lẫn TA) phản hồi trong thread hoặc reply,
* **When** Tiến trình Radar chạy tác vụ rà soát định kỳ lúc 16:00 (đúng 2 giờ sau khi câu hỏi được gửi),
* **Then** Hệ thống nhận diện câu hỏi đã vượt ngưỡng cảnh báo mềm (Soft Warning SLA = 2h),
* **And** Hệ thống gửi một thẻ thông báo ngắn vào kênh nội bộ `#ta-radar` với nội dung tóm tắt câu hỏi, người gửi, thời gian chờ (2h00p),
* **And** Thẻ thông báo đính kèm nút hành động (**"Xem tin nhắn 💬"**) cho phép TA click vào là chuyển ngay tới đúng tin nhắn trong tab `Messages` để phản hồi tức thời.

---

### AC2: Leo thang cảnh báo khẩn cấp sau 4 giờ (Tier 2 SLA Escalation)
* **Given** Câu hỏi của học viên đã qua 4 giờ kể từ lúc đăng mà vẫn ở trạng thái chưa được giải quyết (`status = UNRESOLVED`),
* **When** Đến mốc thời gian kiểm tra SLA = 4h (chuẩn đề bài Track B2),
* **Then** Hệ thống nâng mức độ ưu tiên của câu hỏi lên cấp độ `KHẨN CẤP (URGENT)`,
* **And** Hệ thống gửi thông báo nổi bật vào `#ta-radar`, đồng thời mention vai trò `@TA_OnDuty` (Trợ giảng trực ca hiện tại),
* **And** Nút liên kết trên thẻ điều hướng trực tiếp tới tab `Messages` nội bộ để Coach can thiệp trả lời ngay tại ứng dụng (hoặc mở Discord thật nếu cần).

---

### AC3: Xuất bản tin tổng hợp cuối ngày cho TA (Daily Digest Generation)
* **Given** Đã đến thời điểm chốt ca trực cuối ngày (ví dụ: 22:00 hàng ngày),
* **When** Hệ thống tự động kích hoạt tác vụ tổng hợp bản tin ngày `GenerateDailyDigest`,
* **Then** Hệ thống xuất bản một bản tin có cấu trúc chuẩn vào kênh `#ta-radar` gồm 3 phần:
  1. *Thống kê tổng quan:* Tổng số câu hỏi trong ngày, số câu đã giải quyết, số câu còn tồn đọng (>2h và >4h).
  2. *Danh sách câu hỏi cần xử lý gấp:* Liệt kê từng câu hỏi tồn đọng kèm tóm tắt 1 câu, tên học viên và liên kết xem tin nhắn.
  3. *Top 3 chủ đề nóng nhất:* Tổng hợp các vấn đề học viên hỏi nhiều nhất trong ngày để TA cân nhắc đăng thông báo chung.
* **And** Toàn bộ nội dung bản tin **KHÔNG** chứa các chuỗi rác như `"nguồn tham chiếu"`, từ ngữ tiếng Việt chuẩn chỉnh, các câu tóm tắt trọn vẹn không bị cắt cụt lửng lơ,
* **And** Hệ thống không đếm nhầm tin nhắn của bot hoặc các câu chào hỏi/cảm ơn là câu hỏi tồn đọng.

---

### AC4: Hỗ trợ học viên stuck bài một cách phi xâm lấn (Non-intrusive Stuck Support)
* **Given** Học viên đăng một lỗi kỹ thuật/code bài lab trên kênh `#hoi-dap` và sau 1 giờ không có tương tác tiếp theo (dấu hiệu đang bị tắc bài/stuck),
* **When** Hệ thống Radar phát hiện trạng thái này,
* **Then** Hệ thống gửi một phản hồi nhẹ nhàng ngay dưới thread công khai của học viên, gợi ý 1-2 tài liệu/hướng đi ngắn gọn từ kho tài liệu chính thức: *"Nếu bạn đang gặp lỗi này, bạn có thể tham khảo mục Cài đặt môi trường tại [Link tài liệu]. Mình cũng đã báo anh/chị TA hỗ trợ bạn nhé!"*,
* **And** Hệ thống đồng thời đẩy 1 ticket ngữ cảnh vào kênh `#ta-radar` để TA vào trợ giúp,
* **And** Hệ thống **TUYỆT ĐỐI KHÔNG** tự ý gửi tin nhắn riêng tư (Direct Message - DM) làm phiền học viên.

---

### AC5: Tự động đồng bộ và gỡ bỏ trạng thái tồn đọng khi có phản hồi (Thread Auto-Resolution)
* **Given** Một câu hỏi đang nằm trong danh sách cảnh báo tồn đọng của Radar,
* **When** Một trợ giảng (TA) hoặc học viên khác vào gửi tin nhắn trả lời trong thread đó, hoặc học viên thả emoji xác nhận đã hiểu (`:white_check_mark:`),
* **Then** Hệ thống tự động cập nhật trạng thái của câu hỏi sang `RESOLVED`,
* **And** Hệ thống gỡ bỏ câu hỏi đó khỏi danh sách cảnh báo thời gian thực trên `#ta-radar`,
* **And** Câu hỏi đó được tính vào mục "Đã giải quyết thành công" trong bản tin tổng hợp cuối ngày.

---

### AC6: Bộ công cụ siêu trợ lý cho Lab Coach (Lab Coach Super-Agent Tool Suite)
* **Given** Người dùng đăng nhập với vai trò `lab_coach` đã được xác thực,
* **When** Lab Coach tương tác với AI Assistant hoặc ra lệnh trong Workspace,
* **Then** AI Assistant kích hoạt toàn bộ công cụ của học viên (`query_notices`, `search_web`) kết hợp với bộ công cụ quản trị nâng cao:
  1. `broadcast_notification`: Soạn và ban hành thông báo chính thức có hiệu lực tức thì tới toàn khóa.
  2. `evaluate_radar` & `resolve_question`: Quét và đánh dấu giải quyết các ticket quá hạn với khóa lạc quan (optimistic locking).
  3. `check_student_profile`: Tra cứu thông tin đội nhóm, kênh hoạt động và lịch sử câu hỏi của từng học viên.
  4. `check_scores`: Tra cứu điểm số lab/checkpoint và tình trạng nộp bài của học viên phục vụ hỗ trợ giải đáp.
  5. `format_daily_digest`: Xuất bản tin 22:00 sạch lỗi,
* **And** Mọi lời gọi công cụ đều được ghi nhận vào nhật ký kiểm toán (audit log) với danh tính `actor_id` của Coach.

---

## 4. Ghi Chú Kỹ Thuật, Phụ Thuộc & Giả Định (Notes & Assumptions)

1. **Discord Permissions:** Bot cần quyền `Manage Messages` / `Create Public Threads` và quyền truy cập kênh nội bộ của ban trợ giảng `#ta-radar`.
2. **Deep Link Format:** Đường dẫn tin nhắn Discord tuân thủ định dạng chuẩn:  
   `https://discord.com/channels/{guild_id}/{channel_id}/{message_id}`
3. **Privacy & An toàn đạo đức:** Bản tin công khai tuyệt đối không bêu tên hay xếp hạng học viên hỏi nhiều/hỏi ít; danh tính chỉ xuất hiện trong kênh điều phối nội bộ của TA phục vụ việc hỗ trợ học tập.
