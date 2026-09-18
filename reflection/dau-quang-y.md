# Bài Thu Hoạch Cá Nhân (Individual Reflection) — Hackathon AI Batch 04

- **Họ và Tên:** Đậu Quang Ý  
- **Mã học viên:** 2A202602661  
- **Lớp:** 3B · **Phòng thi:** E402  
- **Nhóm:** EasyGame · **Track:** B — Trợ lý Học viên (Discord)  
- **Vai trò chính:** AI Engineer & Data Specialist  

---

## 1. Vai trò & Phần việc Cụ thể Đảm nhiệm Trong Dự Án

Trong suốt 47.5 giờ của sự kiện AI Product Hackathon, tôi đảm nhận vai trò phụ trách dữ liệu và kiểm thử đánh giá AI của nhóm EasyGame:
1. **Khai phá dữ liệu thực tế (Data Mining):** Trực tiếp viết script phân tích 1.092 tin nhắn thật của khóa 4 trong `k4_messages.csv`, chỉ ra các con số định lượng then chốt: **21.5% (23/107) câu hỏi của học viên bị trôi tin**, độ dài trung bình của bot cũ là 486 ký tự, trích xuất các mã tin nhắn thực tế (`M99769`, `M30246`, `M41569`) làm bằng chứng cho CP1 và khối R1.
2. **Thiết kế khảo sát (Chuẩn A):** Xây dựng 2 bộ câu hỏi khảo sát chuyên sâu dành cho Học viên và Lab Coach tại `eval/survey_forms.md`.
3. **Xây dựng bộ kiểm thử mẫu (Golden Set 20 case):** Tự xây dựng bộ test độc lập `eval/golden_set.json` phủ trọn taxonomy 4 lớp chỗ khó (Nguồn sự thật, Mơ hồ thiếu tin, Ngoài thẩm quyền, Đặc thù domain) và các case thường ngày/biên để phục vụ đo lường tại CP3.
4. **Viết script kiểm thử tự động & Báo cáo đo lường:** Xây dựng `eval/eval_runner.py` và chạy thực nghiệm Lượt 1 (`eval/run_results.md`), ghi nhận tỷ lệ đạt **95.0% (19/20 ca Pass)**, vượt ngưỡng Quality Bar cam kết ($\ge 85\%$).
5. **Đóng góp bản mẫu tương tác CP2 & Slide CP5:** Hỗ trợ xây dựng giao diện web mô phỏng Discord và đồng biên soạn bộ slide thuyết trình 6 trang `demo-slides.pdf`.

---

## 2. Công Cụ AI Đã Hỗ Trợ Tôi Như Thế Nào?

- **Phân tích và trích xuất dữ liệu nhanh chóng:** AI hỗ trợ tôi viết nhanh các hàm đọc CSV, phân loại regex và bóc tách các câu hỏi bị bỏ quên trong hàng ngàn dòng chatlog Discord.
- **Tạo sinh các kịch bản kiểm thử biên (Edge Cases):** AI hỗ trợ tôi giả lập các trường hợp prompt injection (cố tình ép bot đổi deadline) và các biến thể gõ telex sai để kiểm tra độ bền vững của mô hình.
- **Chuẩn hóa tài liệu kỹ thuật:** AI giúp tôi rà soát các tiêu chí nghiệm thu theo đúng chuẩn HAX Toolkit của Microsoft và PAIR Guidebook của Google, đảm bảo từng quyết định kỹ thuật đều có căn cứ rõ ràng.

---

## 3. Một Bài Học Lớn Từ Trường Hợp Thất Bại (Failure Case) Của Nhóm

Trong lượt chạy kiểm thử đầu tiên trên bộ Golden Set, ca **`GS12`** bị đánh giá là **FAIL**:
- **Tình huống:** Học viên hỏi cộc lốc: *"cho mình hỏi một team mấy bạn?"*. Tiêu chí mong đợi là bot trả lời cực kỳ ngắn gọn dưới 2 câu.
- **Thực tế:** Bot đưa ra một câu trả lời quá đầy đủ kèm trích dẫn điều lệ phòng thi và mốc thời gian, khiến độ dài vượt quá mong muốn của người dùng.
- **Bài học rút ra:** 
  > *"Trong thiết kế sản phẩm AI cho trải nghiệm chat, 'nhiều thông tin' không đồng nghĩa với 'hữu ích'. Đôi khi việc trả lời quá kỹ càng lại làm người dùng khó nắm bắt ý chính. AI tốt phải biết trả lời đúng cỡ (conciseness) và biết dừng lại đúng lúc!"*
  Đồng thời, bài học lớn nhất của cả nhóm là việc kiên quyết giữ cơ chế **Grounding** — thà để bot nói *"Chưa có thông tin chính thức và tag TA"* còn hơn là để bot tự tiện suy đoán gây nguy cơ nộp muộn cho học viên.
