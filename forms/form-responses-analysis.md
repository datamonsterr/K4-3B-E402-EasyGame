# Kết Quả & Phân Tích Phản Hồi Khảo Sát Thực Tế (Google Forms)
**Track B · Trợ lý Học viên (Discord) — Nhóm EasyGame (Lớp 3B - Phòng E402)**  
*Dữ liệu trích xuất trực tiếp qua MCP Google Forms ngày 17/09/2026*

---

## 1. Tổng Quan Thu Thập Dữ Liệu

| Khảo sát | Form ID | Số phản hồi | Đối tượng tham gia | Tỷ lệ hoàn thành |
|---|---|:---:|---|:---:|
| **Học viên (Students)** | `1axytKPkexBc23YZ614Z3rSHNBEaf3Oljf_iZosF5ed8` | **10** | Học viên khóa 4 đang học trên Discord | 100% |
| **Lab Coach / TA / Mod** | `1xQQhyfZD0TxeXnK1JmnIMeshePTlPhXRD2FpeHWPca8` | **5** | Trợ giảng, Lab Coach trực ca Discord | 100% |

---

## 2. Kết Quả Khảo Sát Học Viên (N = 10)

### 2.1. Hành vi & Nhu cầu tương tác
* **Tần suất đặt câu hỏi / tra cứu:**
  * `Hàng ngày (≥ 1 lần/ngày)`: **40%** (4/10)
  * `Vài lần một tuần (2 - 4 lần/tuần)`: **60%** (6/10)
  * `Hiếm khi`: **0%** (0/10)
* **Chủ đề thường cần hỏi/tra cứu nhất:**
  * `Kiến thức bài học (Debug code, bài tập lab, bài giảng)`: **70%** (7/10)
  * `Logistics & Quy chế (Hạn nộp lab, điểm danh, tạo nhóm, link nộp)`: **30%** (3/10)

### 2.2. Đánh giá chất lượng Bot hiện tại & Hậu quả
* **Đánh giá câu trả lời của Bot hiện tại:**
  * `Đôi khi phỏng đoán hoặc không trích dẫn thông báo chính thức`: **60%** (6/10)
  * `Trả lời quá dài dòng, khó nắm bắt ý chính`: **30%** (3/10)
  * `Tạm ổn, trả lời đúng trọng tâm`: **10%** (1/10)
  * ➡️ **Tổng cộng 90% (9/10)** học viên không hài lòng do bot đoán mò hoặc dài dòng.
* **Hậu quả gặp phải do bot trả lời sai logistics:**
  * `Đã từng và bị ảnh hưởng trực tiếp (Nộp bài trễ, sai link, lo lắng điểm danh)`: **50%** (5/10)
  * `Đã từng nhưng kịp thời hỏi lại TA hoặc bạn bè để kiểm chứng`: **50%** (5/10)
  * `Chưa từng gặp rắc rối nào`: **0%** (0/10)
  * ➡️ **100% (10/10)** từng gặp rắc rối/hoang mang về thông tin sai lệch từ bot.

### 2.3. Kỳ vọng giải pháp AI & Ranh giới can thiệp
* **Mức độ giải quyết bằng AI:**
  * `AI Copilot (Bán tự động - trả lời rõ ràng, câu khó nháp cho TA duyệt)`: **60%** (6/10)
  * `Tra cứu cơ bản (FAQ lookup - chỉ trích xuất từ tài liệu)`: **40%** (4/10)
* **Kỳ vọng mức độ suy luận (Reasoning Complexity):**
  * `Suy luận đa bước (Multi-step - xâu chuỗi lịch nghỉ bù + dời deadline + quy chế)`: **80%** (8/10)
  * `Tra cứu 1 bước (Single-step - trích xuất 1 câu/đoạn)`: **20%** (2/10)
* **Xử lý yêu cầu phức tạp (Intent Routing):**
  * `Tách ý & phân luồng (Trả lời deadline từ thông báo, code chuyển TA)`: **50%** (5/10)
  * `Chuyển toàn bộ cho TA (Tránh sai sót)`: **40%** (4/10)
  * `Cố gắng trả lời toàn bộ trong 1 phản hồi`: **10%** (1/10)
* **Top chủ đề cần AI Agent hỗ trợ nhất (Checkbox):**
  1. `Tra cứu hạn nộp bài tập / Lab và các đợt dời deadline`: **80%** (8/10)
  2. `Hướng dẫn kỹ thuật nộp bài: Link GitHub, tạo repo, phân quyền nhóm`: **70%** (7/10)
  3. `Quy định điểm danh, điều kiện chuyên cần và tiêu chuẩn pass môn`: **60%** (6/10)
  4. `Gợi ý hướng tư duy / giải quyết lỗi code bài lab (không spoil)`: **40%** (4/10)
  5. `Nhắc nhở lịch nộp bài cá nhân trước giờ G`: **40%** (4/10)
* **Ứng xử khi thiếu thông tin ("Biết-mình-không-biết"):**
  * `Trả lời ngắn gọn 'Chưa có thông tin chính thức' và tự động tag TA`: **50%** (5/10)
  * `Cung cấp thông báo cũ gần nhất kèm cảnh báo 'Cần kiểm tra lại với TA'`: **40%** (4/10)
  * `Thử suy đoán hoặc tổng hợp`: **10%** (1/10)
* **Ranh giới can thiệp chủ động khi học viên stuck bài:**
  * `Chỉ thông báo riêng cho TA để TA chủ động hỗ trợ`: **50%** (5/10)
  * `Gợi ý 1-2 tài liệu/hướng đi ngắn gọn ngay trong thread`: **30%** (3/10)
  * `Không cần can thiệp, hãy để học viên tự tag`: **20%** (2/10)
* **Willing Users (Học viên sẵn sàng test prototype CP5):**
  * `@quangy66`, `@Cat123`, `@datpt01`

---

## 3. Kết Quả Khảo Sát Lab Coach / TA (N = 5)

### 3.1. Nỗi đau vận hành & Tốn kém thời gian
* **Khó khăn lớn nhất khi trực hỗ trợ:**
  * `Câu hỏi bị trôi quá nhanh giữa các kênh chat, dễ bỏ sót học viên`: **60%** (3/5)
  * `Phải trả lời lặp đi lặp lại cùng một câu hỏi logistics`: **40%** (2/5)
* **Thời gian tiêu tốn mỗi ngày cho câu hỏi lặp lại:**
  * `15 - 30 phút/ngày`: **80%** (4/5)
  * `Trên 1 giờ/ngày`: **20%** (1/5)
  * ➡️ **100%** TA tốn từ 15 phút đến hơn 1 giờ mỗi ngày để trả lời các câu hỏi trùng lặp.

### 3.2. Bằng chứng lỗi Bản tin ngày hiện tại (`k4_daily_reports.md`)
* **Đánh giá lỗi bản tin bot hiện tại:**
  * `Thiếu link trực tiếp dẫn tới tin nhắn/thread câu hỏi tồn đọng`: **40%** (2/5)
  * `Thống kê chưa chính xác (đếm nhầm tin bot hoặc hỏi lặp lại)`: **40%** (2/5)
  * `Tóm tắt bị cắt cụt, lủng củng, chèn chuỗi lỗi ('nguồn tham chiếu')`: **20%** (1/5)
  * ➡️ **100% (5/5)** xác nhận bản tin hiện tại có lỗi nghiêm trọng cần khắc phục.

### 3.3. Định hình giải pháp AI & Luồng cứu kẹt
* **Cấp độ tự động hóa mong muốn:**
  * `Mức Conditional (Tự trả lời khi có căn cứ, ngoại lệ chuyển TA)`: **80%** (4/5)
  * `Mức Augment (AI đề xuất nháp, TA bấm duyệt)`: **20%** (1/5)
* **External Tools bắt buộc tích hợp:**
  1. `Kênh thông báo chính thức & Pinned messages trên Discord`: **80%** (4/5)
  2. `Hệ thống dữ liệu điểm danh & Bảng theo dõi nộp lab`: **80%** (4/5)
  3. `Công cụ tìm kiếm lịch sử tin nhắn Discord (Search API)`: **80%** (4/5)
  4. `Kho tài liệu học tập (GitHub, LMS, Notion)`: **60%** (3/5)
  5. `Lịch Google Calendar / Thời khóa biểu & Deadline`: **40%** (2/5)
* **Ngưỡng thời gian định nghĩa "Câu hỏi tồn đọng khẩn cấp":**
  * `Sau 1 - 2 giờ`: **60%** (3/5)
  * `Sau 4 giờ (chuẩn đề bài Track B2)`: **40%** (2/5)
* **Tính năng bản tin mang lại giá trị cao nhất:**
  * `Danh sách câu hỏi tồn kèm link nhảy trực tiếp đến Discord message`: **40%** (2/5)
  * `Top các chủ đề thắc mắc nhiều nhất trong ngày để gom thông báo chung`: **40%** (2/5)
  * `Danh sách học viên đang gặp khó khăn (stuck) kèm ngữ cảnh bài lab`: **20%** (1/5)
* **Cơ chế thông báo học viên stuck / câu hỏi bỏ quên:**
  * `Gom danh sách gửi vào kênh nội bộ của TA kèm link để TA nhận xử lý`: **60%** (3/5)
  * `Tag trực tiếp TA đang trực ca vào câu hỏi của học viên`: **40%** (2/5)
  * `Tự ý gửi tin nhắn riêng cho học viên`: **0%** (0/5) — *Tuyệt đối không spam DM*.
* **Qualitative Quotes (Tình huống thực tế gây tốn thời gian):**
  * *"Hỏi câu hỏi trên lớp mà mình không làm lớp đó"* (cần phân quyền/tag đúng người).
  * *"tìm nguồn trả lời uy tín"* (cần grounding chuẩn).
* **Willing Users (Lab Coach sẵn sàng test prototype CP5):**
  * `@_minhhai203`, `Lê Thiên Khang (Thiếu uý khang - lab coach)`, `@quangy66`, `@lucas`

---

## 4. Kết Luận Khảo Sát Làm Tiền Đề Cho User Stories & Use Cases

1. **Về Track B1 (Trợ lý trả lời Logistics):**
   - Phải hoạt động ở cơ chế **Conditional Automation**: Chỉ trả lời khi tìm thấy thông báo chính thức kèm trích dẫn (link / timestamp / channel).
   - Khi không có dữ liệu: Bắt buộc áp dụng nguyên tắc **"Biết-mình-không-biết"** — trả lời ngắn gọn (≤3 câu) thừa nhận chưa có thông báo chính thức và tag/chuyển tiếp TA, không bao giờ phỏng đoán.
   - Khi gặp câu hỏi hỗn hợp (vừa hỏi code vừa hỏi deadline): Phải thực hiện **Intent Routing** — trả lời deadline ngay, phần code phân luồng tag TA.

2. **Về Track B2 (Bản tin Radar & Cứu kẹt):**
   - Khắc phục triệt để 3 lỗi của bản tin cũ: loại bỏ chuỗi rác `"nguồn tham chiếu"`, không cắt cụt văn bản, và không đếm nhầm tin bot.
   - Bắt buộc phải có **Deep link** trỏ trực tiếp đến tin nhắn Discord chưa được phản hồi (>1-4 giờ).
   - Toàn bộ danh sách rà soát câu hỏi tồn và học viên stuck phải gửi vào **kênh nội bộ của TA** (`#ta-internal-radar`), tuyệt đối không tự ý spam tin nhắn riêng (DM) của học viên để đảm bảo an toàn & đạo đức AI.
