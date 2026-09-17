# Mini Hackathon AI — Batch 04 · Lớp 3B (Phòng E402)
## Dự án: EasyGame — Track B: Trợ lý Học viên (Discord)

> **SPEC → Prototype → Demo.** Đây không phải cuộc thi code — đây là cuộc thi **tư duy sản phẩm AI**.
> Mục tiêu cốt lõi của giai đoạn này: **Khám phá sản phẩm (Product Discovery)**, đào sâu nỗi đau người dùng thật, phân tích dữ liệu thực tế từ cộng đồng, và xác định lát cắt giá trị cao nhất.

---

## 👥 Thành viên nhóm & Phân công vai trò

**Lớp:** 3B · **Phòng:** E402 · **Cụm:** ____ · **Tên nhóm:** EasyGame · **Track:** B — Trợ lý Discord

| Họ và Tên | Mã Học Viên | Vai trò chính | Phần việc đảm nhiệm trong dự án |
|---|---|---|---|
| *(Điền tên Đội trưởng)* | *(Mã HV)* | **Product Lead** | Định hình bài toán, JTBD, viết Spec (§1-§4), điều phối các mốc CP1–CP6 |
| *(Thành viên 2)* | *(Mã HV)* | **Data & Evidence Specialist** | Khai thác `discord-pack`, thống kê định lượng, phỏng vấn/khảo sát người dùng, xây dựng Golden Set |
| *(Thành viên 3)* | *(Mã HV)* | **AI & Prompt Engineer** | Thiết kế Prompt/RAG từ nguồn chính thức, xử lý 4 lớp chỗ khó, kiểm thử độ chính xác |
| *(Thành viên 4)* | *(Mã HV)* | **Prototype & Validation Lead** | Dựng luồng mock/prototype (CP2, CP3), quay video thao tác, thực hiện user validation R6 (CP5) |

> ⚠️ **Lưu ý quan trọng:** Cả 5 checkpoint (CP1 → CP5) phải nộp bằng **cùng một mã học viên của đội trưởng**.

---

## 🎯 Định hướng Khám phá Sản phẩm (Track B: Trợ lý Discord)

### 1. Bối cảnh sản phẩm nền
Cộng đồng Discord Khoá 4 hiện đang có 2 tính năng AI vận hành thực tế:
- **Bot "Trợ lý":** Trả lời khi được tag (`[@BOT]`), hỗ trợ giải đáp thắc mắc của học viên.
- **Bản tin ngày tự động:** Bot đọc các kênh thảo luận công khai và đăng tóm tắt "Học viên đang hỏi gì" cho ban quản trị và học viên.

### 2. Hai hướng khai phá bài toán
- **Hướng B1 · Tối ưu trợ lý hiện có:**
  - *Vấn đề thực tế:* Câu hỏi logistics (deadline, điểm danh, nộp bài, phân nhóm) chiếm tỷ trọng lớn trong giai đoạn onboarding. Bot hiện tại phản hồi quá dài dòng, có xu hướng tự phỏng đoán khi thiếu dữ liệu chính thức, và chưa có cơ chế "biết-mình-không-biết" để chuyển tiếp cho TA/Mod.
  - *Cơ hội tối ưu:* Trả lời đúng cỡ, súc tích (≤3 câu), chỉ trả lời từ thông báo chính thức đã xác thực, nếu không có nguồn thì thừa nhận và tag TA phụ trách.
- **Hướng B2 · Tính năng mới cho TA / Học viên (Bản tin thông minh & Radar cứu kẹt):**
  - *Vấn đề thực tế:* Bản tin hiện tại (`data/discord-pack/k4_daily_reports.md`) đang gặp nhiều lỗi (chèn chuỗi lạ `"nguồn tham chiếu"` làm vỡ từ tiếng Việt, tóm tắt bị cắt cụt, phân loại lẫn lộn, không có link trực tiếp đến câu hỏi cho TA).
  - *Cơ hội tính năng:* Bản tin cuối ngày tự động lọc và gom cụm các câu hỏi chưa có lời giải sau 4 giờ kèm link trực tiếp, giúp TA can thiệp ngay lập tức mà không cần lội hàng trăm tin nhắn.

---

## 🔍 Bằng chứng Khám phá Sản phẩm (Evidence Mining Baseline)

Nhóm đã tiến hành phân tích tập dữ liệu thực tế tại [`data/discord-pack/`](data/discord-pack/):

### 1. Phân tích định lượng từ `data/discord-pack/k4_messages.csv`
- **Quy mô dữ liệu:** 1.092 tin nhắn (779 tin nhắn người dùng, 313 tin nhắn bot), bao gồm 202 người dùng đã được ẩn danh.
- **Nhu cầu hỏi - đáp:** Có **107 câu hỏi rõ ràng** từ học viên (chứa dấu `?`).
- **Tỷ lệ trôi tin/chưa phản hồi:** **21.5% (23/107 câu hỏi)** không có phản hồi trực tiếp trong luồng chat hoặc bị trôi tin (ví dụ các tin: `M99769`, `M30246`, `M67317`, `M83398`, `M48859`).
- **Hành vi phản hồi của Bot hiện tại:**
  - Chiều dài phản hồi trung bình: **486 ký tự**, cá biệt có phản hồi lên tới **1.905 ký tự**.
  - Thiếu tính xác thực & phỏng đoán khi không rõ thông tin: Tin nhắn `M41569` là ví dụ điển hình — bot thừa nhận *"mình không có thông tin cụ thể trong dữ liệu..."* nhưng vẫn tiếp tục phỏng đoán kéo dài 714 ký tự, có thể gây rủi ro thông tin sai lệch cho học viên.

### 2. Phát hiện lỗi thực tế từ `data/discord-pack/k4_daily_reports.md`
- **Lỗi chèn chuỗi làm vỡ văn bản:** Chuỗi `"nguồn tham chiếu"` bị chèn ngẫu nhiên vào giữa các từ tiếng Việt (ví dụ: `nguồn tham chiếuhi` thay vì "khi", `nguồn tham chiếuhó` thay vì "khó", `checnguồn tham chiếu` thay vì "check", `nguồn tham chiếuết thúc` thay vì "kết thúc").
- **Lỗi cắt cụt văn bản (Truncation):** Bản tin ngày 2026-09-13 bị cắt lửng ở cuối câu: `"...Một số câu hỏi chưa được giải đá"`.
- **Lẫn lộn danh mục:** Đưa câu hỏi về vị trí thư viện và canteen vào mục "Thảo luận học tập".
- **Thiếu tính hành động (Actionability):** Liệt kê các thắc mắc nhưng không có đường link trực tiếp đến tin nhắn gốc để TA click vào giải quyết ngay.

---

## 📐 Lát cắt Sản phẩm đề xuất (Scaffold 1 câu)

> **"Học viên hỏi về thông tin logistics/hạn nộp trên Discord · AI chỉ trả lời khi đối khớp được thông báo chính thức từ BTC/TA, nếu không đủ căn cứ thì trả lời ngắn gọn 'chưa có thông tin chính thức' và tự động tag TA · học viên không bao giờ nhận thông tin suy đoán sai lệch."**

### Phân loại 4 lớp chỗ khó (Taxonomy):
1. **Nguồn sự thật (Ground Truth):** Deadline, link nộp bài, quy định điểm danh chỉ được trích xuất từ các kênh thông báo chính thức (`#announcements`, pinned messages). Không lấy từ tin nhắn thảo luận của học viên khác.
2. **Mơ hồ / Thiếu thông tin:** Học viên hỏi chung chung ("hạn nộp là khi nào?") mà không nêu rõ bài lab/workshop nào → AI yêu cầu làm rõ ngữ cảnh thay vì đoán bừa.
3. **Ngoài phạm vi / Thẩm quyền:** Học viên yêu cầu kiểm tra dữ liệu cá nhân ("em đã được điểm danh chưa?", "em được bao nhiêu XP?") → AI từ chối và hướng dẫn mở Ticket hỗ trợ hoặc dùng lệnh hệ thống chuyên dụng.
4. **Đặc thù domain:** Cung cấp sai deadline hoặc sai cú pháp đổi tên nhóm dẫn đến việc học viên bị mất điểm hoặc bị phạt → Cost-of-error rất cao, bắt buộc phải dùng cơ chế *Conditional Automation*.

---

## 📅 Lịch trình 6 Checkpoints (Ca 3B · 47,5 giờ)

| Mốc | Nội dung cần hoàn thành | Hạn chót | Tình trạng |
|:---:|---|:---:|:---:|
| **CP1** | Canvas 7 dòng ([`canvas.md`](canvas.md)) + Đội trưởng + Link repo GitHub công khai + Khai báo ≥2 Willing Users | **19:30 · 16/9** | 📝 Đã chuẩn bị Canvas |
| **CP2** | Cho thấy **luồng hoạt động** (Bản mock bấm được / sơ đồ luồng / video quay màn hình) | **21:00 · 16/9** | ⏳ Sắp tới |
| **CP3** | **Video thao tác 30s** có gọi AI thật + **Số đo** (thử bao nhiêu, đúng bao nhiêu trên Golden Set) | **16:00 · 17/9** | ⏳ Sắp tới |
| **CP4** | Chốt [`spec.md`](spec.md) — **khoá chuẩn "đạt" (Quality Bar)** · tự khai phần chưa xong | **21:00 · 17/9** | ⏳ Sắp tới |
| **CP5** | Slide PDF 6 trang + **Video demo dự phòng** + Bảng kết quả dùng thử của 5 người ngoài nhóm (R6) | **13:00 · 18/9** | ⏳ Sắp tới |
| **CP6** | Thuyết trình & Game đầu tư tại phòng E402 (7 phút trình bày + 3 phút hỏi đáp) | **17:30 · 18/9** | ⏳ Sắp tới |

---

## 🗂️ Cấu trúc Kho lưu trữ (Repository Structure)

```text
K4-3B-E402-EasyGame/
├── README.md                      ← Hồ sơ dự án, phân công và nhật ký khám phá sản phẩm
├── canvas.md                      ← Canvas 7 dòng cho Checkpoint 1 (CP1)
├── spec.md                        ← AI Spec hoàn chỉnh theo mẫu chuẩn của Hackathon
├── 01-challenge-brief.md          ← Đề bài tổng quan và 5 tiêu chí nghiệm thu
├── 02-guide.md                    ← Hướng dẫn chi tiết 5 giai đoạn triển khai
├── 04-rubric.md                   ← Thang chấm 100 điểm chi tiết và checklist xác minh
├── .gitignore                     ← Bảo vệ dữ liệu, loại trừ k4_messages.csv khỏi Git công khai
│
├── tracks/
│   ├── track-b-discord-assistant.md ← Chi tiết đề bài Track B
│   └── README.md                  ← Hướng dẫn chọn track
│
├── examples/
│   └── canvas-cp1.md              ← Mẫu Canvas và 3 ví dụ tham khảo đạt chuẩn
│
├── data/
│   └── discord-pack/              ← Dữ liệu thực tế phục vụ khám phá sản phẩm & Golden set
│       ├── README.md              ← Hướng dẫn & quy định bảo mật dữ liệu
│       ├── DATA_DICTIONARY.md     ← Từ điển dữ liệu chi tiết
│       ├── k4_messages.csv        ← 1.092 tin nhắn thực tế (bảo mật qua .gitignore)
│       └── k4_daily_reports.md    ← 4 bản tin bot đang chạy thật kèm lỗi mẫu
│
├── codebase/                      ← Mã nguồn prototype (chạy thật ≥1 lời gọi AI)
├── eval/                          ← Golden set (≥20 case) và bảng đo lường chất lượng
└── validation/                    ← Nhật ký người dùng ngoài nhóm dùng thử (R6 - 8 điểm)
```

---

## 🔒 Quy định Bảo mật & Sử dụng Dữ liệu

1. **Dữ liệu ẩn danh nội bộ:** Toàn bộ tin nhắn trong `data/discord-pack/` là của các bạn học viên Khoá 4. Tuyệt đối không cố gắng truy ngược danh tính hoặc hỏi "tin này của ai".
2. **Không đưa dữ liệu thô lên Git công khai:** File `k4_messages.csv` đã được đưa vào [`.gitignore`](.gitignore). Chỉ trích dẫn tối đa 2 câu minh hoạ kèm `msg_id` trong tài liệu nộp bài.
3. **Phạm vi sử dụng:** Dữ liệu chỉ dùng cho mục đích học tập và làm bài trong khuôn khổ Hackathon.
