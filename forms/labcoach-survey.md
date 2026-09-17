# Khảo sát Lab Coach: Đánh giá Công cụ Trợ lý & Bản tin Discord (Track B)

> **Mục tiêu:** Thu thập phản hồi và số liệu từ đội ngũ Lab Coach (TA/Mod) để xác thực bài toán Track B2 (Bản tin cuối ngày, rà soát câu hỏi tồn đọng, phát hiện học viên stuck) và hoàn thiện các dòng của Canvas 7 Dòng ([canvas.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/canvas.md)).

## 1. Thông tin biểu mẫu
* **Tiêu đề Form:** `[Track B - EasyGame] Đánh giá Công cụ Trợ lý & Bản tin Discord (Dành cho Lab Coach)`
* **Mô tả Form:** Khảo sát nhanh 2-3 phút dành cho Lab Coach nhằm đánh giá năng lực AI Agent, tối ưu luồng trực hỗ trợ trên Discord, khắc phục lỗi bản tin ngày và xử lý triệt để câu hỏi tồn đọng.
* **Form ID:** `1xQQhyfZD0TxeXnK1JmnIMeshePTlPhXRD2FpeHWPca8`
* **Link điền trực tuyến (Responder URI):** [https://docs.google.com/forms/d/e/1FAIpQLSd8Y3JnTzVonAXKRO8g6XhL9I99VF7mveTIcFrz7xM3gw2b-w/viewform](https://docs.google.com/forms/d/e/1FAIpQLSd8Y3JnTzVonAXKRO8g6XhL9I99VF7mveTIcFrz7xM3gw2b-w/viewform)
* **Đối tượng mục tiêu:** Lab Coach, Trợ giảng (TA), Moderator trực hỗ trợ Discord.

---

## 2. Ánh xạ câu hỏi vào Canvas 7 Dòng

| Câu hỏi | Dòng Canvas | Mục đích dữ liệu |
|---|---|---|
| **Câu 1 & 2** | Dòng 2 & Dòng 3 (Pain TA) | Lượng hóa thời gian thực tế TA mất mỗi ngày cho các câu hỏi logistics lặp lại (đơn vị: phút/giờ). |
| **Câu 3** | Dòng 4 (Bằng chứng Track B2) | Đo lường tỷ lệ TA xác nhận các lỗi nghiêm trọng của baseline `k4_daily_reports.md`. |
| **Câu 4** | Dòng 6 (AI tự làm đến đâu) | Khảo sát quan điểm của TA về cấp độ tự động hóa của AI Agent (Augment vs Conditional). |
| **Câu 5** | Dòng 6 & Kiến trúc AI Agent | Khảo sát nhu cầu tích hợp các External Tools (Pinned Discord, Calendar, GitHub/LMS, Bảng điểm danh). |
| **Câu 6** | Dòng 5 (Lát cắt một câu) | Định hình cơ chế phân luồng yêu cầu phức tạp (Intent Routing) và giảm tải cho TA. |
| **Câu 7 & 8** | Dòng 5 (Lát cắt Track B2) | Xác thực ngưỡng thời gian câu hỏi tồn (>4h) và tính năng giá trị nhất của bản tin cuối ngày. |
| **Câu 9** | Dòng 4 (Bằng chứng) | Khảo sát phân bố các chủ đề TA mong muốn AI Agent gánh vác nhất (Checkbox). |
| **Câu 10** | Dòng 6 (Ranh giới can thiệp) | Xác định cơ chế thông báo học viên stuck mà không gây phiền hoặc vi phạm đạo đức AI. |
| **Câu 11** | Dòng 4 (Bằng chứng trích dẫn) | Thu thập các tình huống thực tế khó khăn (qualitative quote). |
| **Câu 12** | Dòng 6 (Willing Users) | Thu thập danh tính TA sẵn sàng kiểm thử giải pháp tại CP5. |

---

## 3. Nội dung chi tiết các câu hỏi

### Câu 1: Khó khăn lớn nhất khi trực hỗ trợ
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `1. Khó khăn lớn nhất của bạn khi trực hỗ trợ học viên trên Discord hiện nay là gì?`
* **Lựa chọn:**
  - `Câu hỏi bị trôi quá nhanh giữa các kênh chat, dễ bỏ sót học viên`
  - `Phải trả lời lặp đi lặp lại cùng một câu hỏi logistics (deadline, nộp bài, điểm danh)`
  - `Khó phân loại nhanh đâu là câu hỏi khẩn cấp cần TA giải quyết`

### Câu 2: Thời gian xử lý câu hỏi lặp lại mỗi ngày
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `2. Trung bình mỗi ngày, việc trả lời các câu hỏi lặp lại về logistics chiếm bao nhiêu thời gian của bạn?`
* **Lựa chọn:**
  - `Dưới 15 phút/ngày`
  - `15 - 30 phút/ngày`
  - `30 - 60 phút/ngày`
  - `Trên 1 giờ/ngày`

### Câu 3: Đánh giá lỗi của Bản tin ngày hiện tại
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `3. Bạn thấy "Bản tin ngày" tự động hiện tại của bot gặp vấn đề lớn nhất nào?`
* **Lựa chọn:**
  - `Thiếu link trực tiếp dẫn tới tin nhắn/thread câu hỏi tồn đọng`
  - `Tóm tắt bị cắt cụt, lủng củng, chèn chuỗi lỗi ('nguồn tham chiếu')`
  - `Thống kê chưa chính xác (đếm nhầm tin bot hoặc học viên hỏi lặp lại)`
  - `Bản tin hiện tại hoạt động tốt, không có lỗi gì lớn`

### Câu 4: Mức độ giải quyết bằng AI Agent
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `4. Bạn nghĩ vấn đề hỗ trợ học viên & rà soát câu hỏi tồn trên Discord có thể giải quyết ở mức độ nào bằng AI Agent?`
* **Lựa chọn:**
  - `Mức Augment: AI đề xuất câu trả lời nháp và danh sách câu hỏi tồn, TA kiểm tra và bấm duyệt trước khi gửi`
  - `Mức Conditional: AI tự động trả lời 100% câu hỏi có căn cứ chính thức; chỉ chuyển sang TA các ca ngoại lệ/mơ hồ`
  - `Mức Autonomous: AI tự chủ toàn quyền (tự trả lời, tự nhắc nhở học viên stuck, tự xuất bản tin ngày)`
  - `Không nên dùng AI: Nên để TA trực tiếp quản lý thủ công để đảm bảo tính chuẩn xác`

### Câu 5: Công cụ và nguồn dữ liệu bên ngoài cần tích hợp (External Tools)
* **Loại câu hỏi:** Hộp kiểm nhiều lựa chọn (`CHECKBOX`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `5. Để AI Agent trả lời chuẩn xác và không ảo giác, hệ thống cần tích hợp các công cụ/nguồn dữ liệu bên ngoài nào? (Có thể chọn nhiều mục)`
* **Lựa chọn:**
  - [ ] `Kênh thông báo chính thức & Pinned messages trên Discord`
  - [ ] `Lịch Google Calendar / Thời khóa biểu và Deadline môn học`
  - [ ] `Kho tài liệu học tập (GitHub Repo, LMS, Notion)`
  - [ ] `Hệ thống dữ liệu điểm danh & Bảng theo dõi nộp lab của lớp`
  - [ ] `Công cụ tìm kiếm lịch sử tin nhắn Discord (Discord Search API)`

### Câu 6: Xử lý yêu cầu phức tạp để tối ưu cho TA
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `6. Khi gặp yêu cầu phức tạp (hỏi bài code lẫn logistics, hoặc câu hỏi mơ hồ), AI Agent nên xử lý thế nào để tối ưu cho TA?`
* **Lựa chọn:**
  - `Tự trả lời phần logistics có căn cứ, phần code thì phân luồng tag đúng TA chuyên môn kèm tóm tắt`
  - `Chỉ gom link câu hỏi gửi vào kênh riêng cho TA tự vào đọc và trả lời`
  - `Tự động hỏi lại học viên một câu để làm rõ phạm vi trước khi thông báo cho TA`

### Câu 7: Ngưỡng thời gian định nghĩa "Câu hỏi tồn đọng khẩn cấp"
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `7. Một câu hỏi sau bao lâu chưa có ai phản hồi thì bot nên gom vào danh sách "cần xử lý gấp"?`
* **Lựa chọn:**
  - `Sau 1 - 2 giờ`
  - `Sau 4 giờ (chuẩn đề bài Track B2)`
  - `Sau 8 - 12 giờ (cuối buổi/cuối ngày)`

### Câu 8: Tính năng mang lại giá trị nhất trong Bản tin cuối ngày
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `8. Tính năng nào trong bản tin cuối ngày sẽ giúp bạn tiết kiệm thời gian nhất?`
* **Lựa chọn:**
  - `Danh sách câu hỏi tồn (>4h) kèm link nhảy trực tiếp đến Discord message`
  - `Top các chủ đề thắc mắc nhiều nhất trong ngày để gom thông báo chung`
  - `Danh sách học viên đang gặp khó khăn (stuck) kèm ngữ cảnh bài lab`

### Câu 9: Các chủ đề TA muốn AI Agent gánh vác nhất
* **Loại câu hỏi:** Hộp kiểm nhiều lựa chọn (`CHECKBOX`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `9. Các chủ đề nào bạn mong muốn AI Agent gánh vác nhất để giảm tải cho đội ngũ Lab Coach? (Có thể chọn nhiều mục)`
* **Lựa chọn:**
  - [ ] `Giải đáp hạn nộp bài tập / Lab và các đợt dời lịch deadline`
  - [ ] `Giải thích quy chế điểm danh, quy định nộp bài và tiêu chí đánh giá`
  - [ ] `Hướng dẫn kỹ thuật nộp bài: Link GitHub, tạo repo, phân quyền nhóm`
  - [ ] `Rà soát câu hỏi tồn đọng (>4h) và tổng hợp bản tin ngày`
  - [ ] `Tự động phân loại câu hỏi (hỏi bài code vs hỏi hành chính logistics)`

### Câu 10: Cơ chế thông báo học viên stuck / tin bỏ quên
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `10. Khi phát hiện câu hỏi bị bỏ quên hoặc học viên stuck, bot nên thông báo như thế nào?`
* **Lựa chọn:**
  - `Gom danh sách gửi vào kênh nội bộ của TA kèm link để TA chủ động nhận xử lý`
  - `Tag trực tiếp TA đang trực ca vào câu hỏi của học viên`
  - `Bot tự động nhắn tin riêng cho học viên hướng dẫn trước`

### Câu 11: Tình huống / case khó khăn thực tế
* **Loại câu hỏi:** Tự luận ngắn (`TEXT`)
* **Bắt buộc:** Không (`required: false`)
* **Tiêu đề:** `11. Một tình huống hỗ trợ học viên hoặc một lỗi của bot khiến bạn tốn nhiều thời gian xử lý nhất gần đây?`

### Câu 12: Thông tin Lab Coach tham gia thử nghiệm (Willing Users)
* **Loại câu hỏi:** Tự luận ngắn (`TEXT`)
* **Bắt buộc:** Không (`required: false`)
* **Tiêu đề:** `12. Tên hoặc Discord username của bạn (để nhóm trao đổi nhanh 3 phút hoặc demo giải pháp tại CP5):`
