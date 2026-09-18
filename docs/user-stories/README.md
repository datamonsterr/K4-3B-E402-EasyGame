# Danh Mục User Stories — Track B: Trợ lý Học viên & Radar Cứu Kẹt Discord
**Nhóm thực hiện:** EasyGame (Lớp 3B - Phòng E402)  
**Tiêu chuẩn chất lượng:** Agile User Story chuẩn **INVEST** + Acceptance Criteria chuẩn **Gherkin (Given-When-Then)**  
**Khung phương pháp:** `user-story-ac-writer` · BA Zone & Digital School

---

## 1. Bản Đồ Truy Vết Nhu Cầu (Traceability Matrix)

| User Story ID | Tiêu đề Story | Module tương ứng | Đối tượng thụ hưởng (Persona) | Nỗi đau giải quyết | Bằng chứng thực tế |
|---|---|:---:|---|---|---|
| [**US-B1**](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/docs/user-stories/US-B1-verified-logistics-assistant.md) | Trợ lý Logistics Xác Thực & Phân Luồng Ngữ Nghĩa | Track B1 · Tối ưu Bot Trợ lý | Học viên khóa học trên Discord | Trôi tin nhắn, bot trả lời dài dòng (tb 486 ký tự), hay phỏng đoán gây nộp bài trễ / hoang mang | 90% học viên phàn nàn bot dài dòng/đoán mò; 50% bị trễ hạn; 23/107 câu hỏi bị trôi |
| [**US-B2**](file:///home/dat/dev/vinuni_aia/K4-3B-E402-EasyGame/docs/user-stories/US-B2-unanswered-question-radar.md) | Radar Rà Soát Câu Hỏi Tồn & Bản Tin Ngày Cho TA | Track B2 · Công cụ hỗ trợ TA | Lab Coach / Trợ giảng trực ca | Mất 15–60p/ngày trả lời lặp lại; bỏ sót học viên stuck; bản tin cũ bị lỗi từ và thiếu link | 100% TA tốn 15–60p/ngày; 60% xác nhận trôi tin bỏ sót; 100% TA xác nhận bản tin cũ lỗi |
| [**US-B3**](US-B3-authenticated-tool-using-agent.md) | Authenticated Tool-Using Course Agent | Track B shared orchestration | Learner / Lab Coach with verified membership | Unsafe authority inputs, duplicated provider code, and unobservable or unnecessary tool calls | Five AC suites with at least ten automated scenarios each plus opt-in real-provider/database verification |

---

## 2. Nguyên Tắc Thiết Kế User Story Tại EasyGame

1. **Persona Cụ Thể (No Generic "User"):** Phân định rõ ràng giữa *Học viên đang học trên kênh công khai* và *Lab Coach trực ca trên kênh điều phối nội bộ*.
2. **Tuân Thủ Tuyệt Đối Chuẩn INVEST:**
   - **Independent:** Mỗi story có thể phát triển, kiểm thử và bàn giao độc lập trong sprint.
   - **Negotiable:** Nêu rõ mục tiêu giá trị, không áp đặt cứng nhắc chi tiết mã nguồn / thư viện công nghệ.
   - **Valuable:** Định lượng giá trị kinh doanh đo lường được (giảm thời gian TA, loại bỏ 100% phỏng đoán).
   - **Estimable:** Phạm vi phân tách rõ ràng để dev có thể ước lượng điểm story (Story Points).
   - **Small:** Hoàn thành trọn vẹn trong một phiên bản kiểm thử (CP2–CP4).
   - **Testable:** Mỗi Acceptance Criteria được lượng hóa bằng kịch bản kiểm thử tự động hoặc kiểm thử thủ công.
3. **Acceptance Criteria Chuẩn Gherkin (Given-When-Then):** Đảm bảo bao quát đủ 3 nhánh: **Happy Path** (Đường thuận lợi), **Edge Cases / Routing** (Phân luồng & Ngoại lệ nghiệp vụ), và **Negative Path** (Bảo mật, Prompt Injection & Fallback).
