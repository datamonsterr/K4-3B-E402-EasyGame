# Thư mục Biểu mẫu Khảo sát (Forms) — Track B: Trợ lý Học viên (Discord)

Thư mục này chứa tài liệu đặc tả toàn bộ các biểu mẫu khảo sát trực tuyến phục vụ việc xác thực bài toán và thu thập bằng chứng thực tế cho nhóm **EasyGame (Lớp 3B - E402)** theo yêu cầu của [tracks/track-b-discord-assistant.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/tracks/track-b-discord-assistant.md) và [canvas.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/canvas.md).

---

## 1. Danh sách biểu mẫu trực tuyến (Google Forms)

| STT | Tên biểu mẫu | Đối tượng | Số câu | Form ID | Link khảo sát trực tiếp | Tài liệu đặc tả |
|---|---|---|:---:|---|---|---|
| 1 | **Trải nghiệm Bot Trợ lý Discord** | Học viên (Students) | 11 câu | `1axytKPkexBc23YZ614Z3rSHNBEaf3Oljf_iZosF5ed8` | [Mở Form Học viên](https://docs.google.com/forms/d/e/1FAIpQLScfANQUiUfT76tDvtIFgPlmA1vdJwL0aKcs_jEdQ7-UKAD4BA/viewform) | [student-survey.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/forms/student-survey.md) |
| 2 | **Đánh giá Công cụ Trợ lý & Bản tin Discord** | Lab Coach / TA / Mod | 12 câu | `1xQQhyfZD0TxeXnK1JmnIMeshePTlPhXRD2FpeHWPca8` | [Mở Form Lab Coach](https://docs.google.com/forms/d/e/1FAIpQLSd8Y3JnTzVonAXKRO8g6XhL9I99VF7mveTIcFrz7xM3gw2b-w/viewform) | [labcoach-survey.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/forms/labcoach-survey.md) |

---

## 2. Chiến lược thiết kế khảo sát & AI Agent

Cả hai biểu mẫu được thiết kế dựa trên các nguyên tắc:
1. **Nhanh gọn & Thực tế:** Thời gian hoàn thành chỉ 2–3 phút, ưu tiên trắc nghiệm 2–4 phương án loại trừ rõ ràng.
2. **Chuẩn hóa đơn vị đo lường:** Toàn bộ câu hỏi về thời gian và tần suất được quy chuẩn thành phút/giờ (`Dưới 15 phút/ngày`, `15-30 phút/ngày`, `30-60 phút/ngày`, `Trên 1 giờ/ngày`) và mốc SLA chuẩn (`Sau 4 giờ` theo Track B2).
3. **Đánh giá khía cạnh AI Agent:**
   - **Mức độ tự động hóa (Degree of AI):** FAQ vs Copilot (bán tự động) vs Autonomous Agent vs Con người.
   - **Mức độ suy luận (Reasoning Complexity):** Tra cứu 1 bước vs suy luận đa bước xâu chuỗi nhiều thông báo/quy chế.
   - **Công cụ bên ngoài (External Tools):** Nhu cầu gọi các tool như Pinned Discord, Calendar, GitHub/LMS, Bảng điểm danh.
   - **Xử lý yêu cầu phức tạp (Request Complexity & Intent Routing):** Phân luồng câu hỏi hỏi bài code lẫn logistics, bảo vệ dữ liệu nhạy cảm.
   - **Hộp kiểm nhiều lựa chọn (Checkbox):** Thống kê chính xác các chủ đề cần sự trợ giúp nhất.
4. **Thu thập Willing Users:** Mục cuối cùng của cả hai form thu thập tên và Discord username của người tham gia đồng ý thử nghiệm prototype tại CP5 (đáp ứng tiêu chí dòng 6 của Canvas).

---

## 3. Hướng dẫn trích xuất kết quả

Khi các phản hồi khảo sát đã được gửi về, có thể trích xuất trực tiếp dữ liệu qua MCP tool `google-forms`:

```json
// Lấy kết quả khảo sát của Học viên:
{
  "ServerName": "google-forms",
  "ToolName": "get_form_responses",
  "Arguments": {
    "formId": "1axytKPkexBc23YZ614Z3rSHNBEaf3Oljf_iZosF5ed8"
  }
}

// Lấy kết quả khảo sát của Lab Coach:
{
  "ServerName": "google-forms",
  "ToolName": "get_form_responses",
  "Arguments": {
    "formId": "1xQQhyfZD0TxeXnK1JmnIMeshePTlPhXRD2FpeHWPca8"
  }
}
```
Dữ liệu trích xuất sẽ được tính toán % và điền trực tiếp vào **Dòng 4 (Bằng chứng đầu tiên)** và danh sách người dùng vào **Dòng 6 (Willing users)** của [canvas.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/canvas.md).
