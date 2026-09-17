# Khảo sát Học viên: Trải nghiệm Bot Trợ lý Discord (Track B)

> **Mục tiêu:** Thu thập dữ liệu thực tế từ học viên khóa học để xác thực bài toán Track B1 (Tối ưu Bot Trợ lý hiện có) và cung cấp số liệu cho Canvas 7 Dòng ([canvas.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/canvas.md)).

## 1. Thông tin biểu mẫu
* **Tiêu đề Form:** `[Track B - EasyGame] Trải nghiệm Bot Trợ lý Discord (Dành cho Học viên)`
* **Mô tả Form:** Khảo sát nhanh 2-3 phút giúp nhóm EasyGame (Lớp 3B - E402) đánh giá năng lực AI Agent, tối ưu hóa Bot Trợ lý trên Discord khóa học (khắc phục lỗi đoán mò, trôi tin và cung cấp deadline chính xác).
* **Form ID:** `1axytKPkexBc23YZ614Z3rSHNBEaf3Oljf_iZosF5ed8`
* **Link điền trực tuyến (Responder URI):** [https://docs.google.com/forms/d/e/1FAIpQLScfANQUiUfT76tDvtIFgPlmA1vdJwL0aKcs_jEdQ7-UKAD4BA/viewform](https://docs.google.com/forms/d/e/1FAIpQLScfANQUiUfT76tDvtIFgPlmA1vdJwL0aKcs_jEdQ7-UKAD4BA/viewform)
* **Đối tượng mục tiêu:** Học viên đang tham gia khóa học trên Discord.

---

## 2. Ánh xạ câu hỏi vào Canvas 7 Dòng

| Câu hỏi | Dòng Canvas | Mục đích dữ liệu |
|---|---|---|
| **Câu 1 & 2** | Dòng 2 (Job Executor) | Thống kê tần suất và nhận diện nhu cầu tra cứu logistics là phổ biến nhất. |
| **Câu 3 & 4** | Dòng 3 (Pain) & Dòng 4 (Bằng chứng) | Đo lường tỷ lệ học viên gặp lỗi bot trả lời dài dòng, đoán mò, và hậu quả nộp trễ/hoang mang. |
| **Câu 5** | Dòng 6 (AI tự làm đến đâu) | Khảo sát mức độ chấp nhận giải pháp AI (Copilot vs Agent tự chủ). |
| **Câu 6 & 7** | Dòng 5 (Lát cắt một câu) | Định hình năng lực suy luận (Reasoning đa bước) và phân luồng yêu cầu phức tạp (Intent Routing). |
| **Câu 8** | Dòng 4 (Bằng chứng) & Spec | Phân bố nhu cầu theo từng chủ đề hỗ trợ (Checkbox chọn nhiều). |
| **Câu 9 & 10** | Dòng 5 & Dòng 6 | Ranh giới hành xử an toàn ("Biết-mình-không-biết", không gây phiền khi can thiệp). |
| **Câu 11** | Dòng 6 (Willing Users) | Thu thập danh sách học viên tình nguyện tham gia test prototype CP5. |

---

## 3. Nội dung chi tiết các câu hỏi

### Câu 1: Tần suất đặt câu hỏi / tra cứu
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `1. Tần suất bạn đặt câu hỏi hoặc tìm kiếm thông tin trên Discord của khóa học là bao nhiêu?`
* **Lựa chọn:**
  - `Hàng ngày (≥ 1 lần/ngày)`
  - `Vài lần một tuần (2 - 4 lần/tuần)`
  - `Hiếm khi (≤ 1 lần/tuần hoặc chỉ khi có sự cố)`

### Câu 2: Chủ đề thường cần tra cứu
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `2. Bạn thường cần hỏi hoặc tra cứu về chủ đề nào nhất hiện tại?`
* **Lựa chọn:**
  - `Logistics & Quy chế (Hạn nộp lab, điểm danh, tạo nhóm, link nộp bài)`
  - `Kiến thức bài học (Debug code, bài tập lab, bài giảng)`
  - `Hoạt động chung & Chitchat (Giao lưu, hỏi kinh nghiệm)`

### Câu 3: Đánh giá chất lượng Bot hiện tại
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `3. Bạn đánh giá thế nào về chất lượng câu trả lời của Bot Trợ lý hiện tại?`
* **Lựa chọn:**
  - `Trả lời quá dài dòng, khó nắm bắt ý chính`
  - `Đôi khi phỏng đoán hoặc không trích dẫn thông báo chính thức`
  - `Tạm ổn, trả lời đúng trọng tâm`

### Câu 4: Hậu quả do bot cung cấp sai thông tin
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `4. Bạn đã từng gặp rắc rối hoặc hoang mang do bot cung cấp thông tin logistics chưa chuẩn xác chưa?`
* **Lựa chọn:**
  - `Đã từng và bị ảnh hưởng trực tiếp (Nộp bài trễ, nộp sai link, lo lắng điểm danh)`
  - `Đã từng nhưng kịp thời hỏi lại TA hoặc bạn bè để kiểm chứng`
  - `Chưa từng gặp rắc rối nào`

### Câu 5: Mức độ giải quyết vấn đề bằng AI
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `5. Bạn nghĩ vấn đề hỗ trợ học viên trên Discord có thể giải quyết ở mức độ nào bằng AI?`
* **Lựa chọn:**
  - `Tra cứu cơ bản (FAQ lookup): Chỉ trích xuất lại câu trả lời từ tài liệu có sẵn`
  - `AI Copilot (Bán tự động): Tự trả lời câu hỏi rõ ràng; câu hỏi khó thì đề xuất câu trả lời nháp cho TA duyệt`
  - `AI Agent tự chủ: Tự tra cứu đa nguồn, tự suy luận hạn nộp và tự động hỗ trợ học viên từ đầu đến cuối`
  - `Hoàn toàn do con người: Vấn đề nhạy cảm liên quan điểm số/quy chế, AI không nên can thiệp`

### Câu 6: Mức độ suy luận (Reasoning Complexity)
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `6. Về mức độ suy luận (Reasoning), bạn kỳ vọng AI Agent xử lý câu hỏi ở mức độ logic nào?`
* **Lựa chọn:**
  - `Tra cứu 1 bước (Single-step): Trích xuất chính xác 1 câu/đoạn từ thông báo`
  - `Suy luận đa bước (Multi-step): Tự xâu chuỗi logic (kết hợp lịch nghỉ bù + dời deadline + quy chế lab để tính hạn nộp cuối cùng)`
  - `Hiểu ngữ cảnh sâu: Đọc hiểu chuỗi thảo luận nhiều người trong thread để giải đáp đúng khúc mắc`

### Câu 7: Xử lý yêu cầu phức tạp (Request Complexity & Routing)
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `7. Khi gặp yêu cầu phức tạp (ví dụ: vừa hỏi bài tập code vừa hỏi deadline, hoặc câu hỏi mơ hồ), bạn muốn AI xử lý thế nào?`
* **Lựa chọn:**
  - `Tách ý & phân luồng (Intent Routing): Trả lời ngay phần deadline từ thông báo, còn phần code thì chuyển tiếp TA`
  - `Chuyển toàn bộ cho TA: Không tự trả lời câu hỏi phức tạp để tránh sai sót`
  - `Cố gắng trả lời toàn bộ trong một phản hồi duy nhất`

### Câu 8: Các chủ đề cần AI Agent hỗ trợ nhất
* **Loại câu hỏi:** Hộp kiểm nhiều lựa chọn (`CHECKBOX`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `8. Các chủ đề nào bạn CẦN NHẤT sự hỗ trợ tự động từ AI Agent? (Có thể chọn nhiều mục)`
* **Lựa chọn:**
  - [ ] `Tra cứu hạn nộp bài tập / Lab và các đợt dời deadline`
  - [ ] `Quy định điểm danh, điều kiện chuyên cần và tiêu chuẩn pass môn`
  - [ ] `Hướng dẫn kỹ thuật nộp bài: Link GitHub, tạo repo, phân quyền nhóm`
  - [ ] `Gợi ý hướng tư duy / giải quyết lỗi code bài lab (không spoil đáp án)`
  - [ ] `Nhắc nhở lịch nộp bài cá nhân trước giờ G`

### Câu 9: Ứng xử khi thiếu thông tin chính thức (Biết-mình-không-biết)
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `9. Khi không tìm thấy thông tin chính thức trong tài liệu/thông báo, bạn muốn bot xử lý thế nào?`
* **Lựa chọn:**
  - `Trả lời ngắn gọn 'Chưa có thông tin chính thức' và tự động tag TA hỗ trợ`
  - `Cung cấp thông báo cũ gần nhất kèm cảnh báo 'Cần kiểm tra lại với TA'`
  - `Thử suy đoán hoặc tổng hợp từ các đoạn chat trước đó`

### Câu 10: Ranh giới can thiệp chủ động khi stuck
* **Loại câu hỏi:** Trắc nghiệm 1 lựa chọn (`RADIO`)
* **Bắt buộc:** Có (`required: true`)
* **Tiêu đề:** `10. Nếu bot phát hiện bạn đang gặp khó khăn (stuck bài/im lặng lâu), bot nên can thiệp thế nào để KHÔNG gây phiền?`
* **Lựa chọn:**
  - `Gợi ý 1-2 tài liệu/hướng đi ngắn gọn ngay trong thread câu hỏi`
  - `Chỉ thông báo riêng cho TA để TA chủ động hỗ trợ bạn`
  - `Không cần can thiệp, hãy để bạn tự chủ động tag khi cần`

### Câu 11: Thông tin người dùng thử nghiệm (Willing Users)
* **Loại câu hỏi:** Tự luận ngắn (`TEXT`)
* **Bắt buộc:** Không (`required: false`)
* **Tiêu đề:** `11. Tên và Discord username của bạn (để nhóm mời trải nghiệm thử bản bot AI Agent cải tiến trong 2-3 phút tại CP5):`
