# Báo Cáo Khám Phá Nhu Cầu & Xác Lập Phạm Vi (BA Discovery Findings)
**Dự án:** Trợ lý Logistics Xác Thực & Radar Cứu Kẹt Discord (Track B: B1 & B2)  
**Nhóm thực hiện:** EasyGame · Lớp 3B · Phòng E402  
**Tác giả:** Phạm Thành Đạt (Lead BA / Product Lead)  
**Khung phương pháp:** Senior BA Elicitation (Ask-Why / BABOK v3) — BA Zone & Digital School  
**Ngày lập:** 17/09/2026 · **Phiên bản:** v1.0 (Baseline Discovery)

---

## 1. Bối Cảnh & Vấn Đề Kinh Doanh (Business Problem)

Trong môi trường đào tạo chuyên sâu (Bootcamp/AIA), Discord là kênh giao tiếp chính cho ~200 học viên và đội ngũ giảng dạy/trợ giảng (Lab Coach/TA). Sau khi khai phá dữ liệu thực tế từ [data/discord-pack/k4_messages.csv](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/data/discord-pack/k4_messages.csv), [data/discord-pack/k4_daily_reports.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/data/discord-pack/k4_daily_reports.md) và kết quả khảo sát qua Google Forms ([forms/form-responses-analysis.md](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/forms/form-responses-analysis.md)), hai vấn đề kinh doanh cốt lõi được xác lập:

1. **Ở Phía Học Viên (Track B1):**
   - **Tình trạng:** Khi đặt câu hỏi về hạn nộp bài (deadline) và quy chế học tập trên kênh chung, học viên dễ bị trôi tin (21.5% câu hỏi trong pack bị trôi không được phản hồi) hoặc nhận câu trả lời phỏng đoán dài dòng (trung bình 486 ký tự, max 1.905 ký tự) từ bot hiện tại mà không có trích dẫn nguồn chính thức.
   - **Hậu quả (Cost-of-Error):** **100% (10/10)** học viên khảo sát từng gặp sự cố hoang mang, trong đó **50% (5/10)** bị ảnh hưởng trực tiếp đến điểm số (nộp bài trễ, nộp nhầm link repo, lo lắng mất chuyên cần).
2. **Ở Phía Đội Ngũ Trợ Giảng / Lab Coach (Track B2):**
   - **Tình trạng:** **100% (5/5)** TA khảo sát phản ánh mất từ 15 đến hơn 60 phút mỗi ngày chỉ để trả lời lặp đi lặp lại các câu hỏi logistics cơ bản. **60%** TA khẳng định tin nhắn trôi quá nhanh trong giờ cao điểm khiến họ bỏ sót học viên cần cứu kẹt.
   - **Hạn chế của công cụ hiện tại:** Bản tin ngày tự động (`k4_daily_reports.md`) bị lỗi nghiêm trọng (chèn chuỗi rác `"nguồn tham chiếu"`, văn bản bị cắt cụt, đếm nhầm tin nhắn bot và thiếu hoàn toàn deep link dẫn thẳng tới câu hỏi của học viên).

---

## 2. Mục Tiêu Kinh Doanh & Đo Lường (Business Goals & KPIs)

* **Goal 1 (Logistics Factuality & Speed):** Cung cấp câu trả lời logistics chính xác 100% dựa trên nguồn thông báo chính thức trong vòng dưới 3 giây; triệt tiêu hoàn toàn (0%) tình trạng bot phỏng đoán khi thiếu dữ liệu.
* **Goal 2 (Zero Dropped Questions):** Đưa tỷ lệ câu hỏi học viên bị bỏ sót/quá hạn SLA (>4h) từ 21.5% về dưới 2% thông qua cơ chế Radar quét tự động định kỳ.
* **Goal 3 (TA Operational Efficiency):** Giảm ít nhất 60% thời gian TA phải trả lời các câu hỏi logistics lặp lại (tiết kiệm 15–30 phút/ngày/TA), giúp TA tập trung hỗ trợ chuyên môn và chấm lab.

---

## 3. Bản Đồ Các Tầng Yêu Cầu (BABOK 5 Requirement Layers Check)

| Tầng Yêu Cầu | Câu hỏi cốt lõi | Hiện trạng | Đánh giá & Ranh giới giải pháp |
|---|---|:---:|---|
| **1. Business Requirements** | *Tại sao phải làm dự án này?* | ✅ ĐẦY ĐỦ | Ngăn chặn rủi ro mất điểm/trượt môn của học viên do hiểu sai deadline; giải phóng thời gian trực ca cho TA. |
| **2. Stakeholder Requirements** | *Ai cần điều gì để giải quyết nỗi đau?* | ✅ ĐẦY ĐỦ | - Học viên: Cần câu trả lời ngắn gọn (≤3 câu), có trích dẫn nguồn chính thức, được hỗ trợ khi stuck.<br>- Lab Coach: Cần danh sách câu hỏi tồn kèm link nhảy trực tiếp, không bị bot spam kênh chung. |
| **3. Functional Requirements** | *Hệ thống phải thực hiện chức năng gì?* | ✅ RÕ RÀNG | - **Module B1:** Intent routing (tách ý logistics vs code), retrieval từ pinned notices, fallback "biết-mình-không-biết" tag TA.<br>- **Module B2:** Quét câu hỏi chưa reply theo SLA (2h cảnh báo, 4h khẩn cấp), phát hiện thread stuck, xuất bản tin nội bộ. |
| **4. Non-functional Requirements** | *Hệ thống hoạt động với chất lượng nào?* | ✅ RÕ RÀNG | - Thời gian phản hồi: ≤3 giây.<br>- Độ chính xác factuality: 100% (Grounding Precision).<br>- Độ dài phản hồi: ≤3 câu (hoặc ≤300 ký tự).<br>- Bảo mật & Quyền riêng tư: Tuyệt đối không spam DM học viên; không lộ danh tính học viên ra kênh công khai. |
| **5. Transition Requirements** | *Làm sao để triển khai suôn sẻ?* | ✅ RÕ RÀNG | Khởi tạo kho dữ liệu thông báo chuẩn (Grounding fixtures), tạo kênh nội bộ riêng `#ta-radar` trên Discord khóa học để kiểm thử song song. |

---

## 4. Phân Tích Nguyên Nhân Gốc Rễ (5 Whys Analysis)

```
Triệu chứng 1: Học viên nhận thông tin deadline sai lệch từ bot Discord.
  └── Tại sao? Bot sinh câu trả lời phỏng đoán dài dòng khi không tìm thấy dữ liệu.
      └── Tại sao? Bot được prompt ở chế độ tổng quát (Generative), không có cơ chế "Biết-mình-không-biết".
          └── Tại sao? Thiếu khối kiểm tra căn cứ (Grounding verification) trước khi xuất câu trả lời.
              └── Nguyên nhân gốc rễ (Root Cause 1): Hệ thống thiếu rào chắn phân loại thẩm quyền & cơ chế Conditional Automation bắt buộc phải có trích dẫn từ nguồn chính thức mới được phát ngôn.

Triệu chứng 2: 21.5% câu hỏi của học viên bị bỏ quên, TA mất nhiều thời gian tìm kiếm.
  └── Tại sao? Kênh chat có lưu lượng tin lớn, câu hỏi bị trôi nhanh chóng.
      └── Tại sao? TA không thể theo dõi liên tục 24/7 và bản tin ngày của bot cũ không có link.
          └── Tại sao? Bot cũ chỉ thống kê từ khóa thô, không theo dõi trạng thái phân giải (Resolved state).
              └── Nguyên nhân gốc rễ (Root Cause 2): Thiếu công cụ giám sát luồng hội thoại (Conversation Tracker) tự động tính toán SLA tồn đọng và chuyển giao ngữ cảnh cho TA.
```

---

## 5. Các Quyết Định Thiết Kế & Phạm Vi Đã Thống Nhất (Confirmed Scope)

Căn cứ vào kết quả phỏng vấn BA và phản hồi từ người dùng thực tế:

1. **Xử lý câu hỏi hỗn hợp (Intent Routing ở B1):**  
   Khi học viên hỏi đồng thời cả thông tin logistics lẫn nhờ sửa bài code (ví dụ: *"Hạn nộp bài Lab 1 là mấy giờ và sao code của em chạy lỗi này?"*), hệ thống sẽ **tách ý**: Tự động trả lời ngay mốc thời gian từ nguồn chính thức, đồng thời lịch sự tag TA chuyên môn để hỗ trợ phần debug code trong cùng một phản hồi súc tích.
2. **Ngưỡng thời gian SLA của Radar (Tiered SLA ở B2):**  
   Hệ thống thiết lập cơ chế 2 tầng:
   - **Tầng 1 (Cảnh báo mềm - Soft Warning sau 2 giờ):** Đưa vào danh sách theo dõi của kênh nội bộ `#ta-radar`.
   - **Tầng 2 (Khẩn cấp - Escalation sau 4 giờ):** Đánh dấu ưu tiên cao, gắn thẻ trực ca và đưa vào đầu danh sách bản tin ngày theo chuẩn đề bài Track B2.
3. **Ranh giới can thiệp hỗ trợ học viên bị kẹt (Stuck Intervention):**  
   Để không gây phiền hà hoặc vi phạm quyền riêng tư, hệ thống:
   - **Tuyệt đối KHÔNG** tự ý gửi tin nhắn riêng (DM) vào tài khoản cá nhân của học viên.
   - Gợi ý 1-2 tài liệu/hướng dẫn ngắn gọn ngay trong thread câu hỏi công khai.
   - Đồng thời đẩy thông báo ngữ cảnh kèm deep link vào kênh nội bộ `#ta-radar` để TA vào trợ giúp trực tiếp.
4. **Cấu trúc triển khai tài liệu:**
   - [docs/user-stories](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/docs/user-stories): 2 User Stories chi tiết theo chuẩn INVEST & Gherkin ACs cho Module B1 và Module B2.
   - [docs/usecases](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/docs/usecases): 2 Use Case Specifications đầy đủ 13 trường theo chuẩn Karl Wiegers / IIBA kèm bảng kiểm định 20 điểm chất lượng.
