# User Story US-B4: Onboarding Phân Quyền Vai Trò Khóa Cứng Lần Đầu Đăng Nhập

> **Mã Story:** `US-B4`
> **Thuộc Module:** Track B3 — Onboarding, Identity & Tool Permission Provisioning  
> **Nhóm thực hiện:** EasyGame · Lớp 3B · Phòng E402  
> **Tác giả:** Phạm Thành Đạt (Lead BA)  
> **Người phối hợp:** Nguyễn Tiến Đạt (Frontend / Prototype), Đậu Quang Ý (DB Security)  
> **Phiên bản:** v1.0 · Ngày duyệt: 18/09/2026

---

## 1. Nội Dung User Story

**As a** Thành viên khóa học (Học viên hoặc Trợ giảng) đăng nhập vào EasyGame lần đầu tiên,  
**I want to** được trải nghiệm màn hình Onboarding trực quan (thiết kế chuẩn Stitch MCP Screen `7488d0bd017b434aaf0d0e2ef6f567ea`) để chủ động xác nhận vai trò khóa học (`Learner` hoặc `Lab Coach`) và khóa vĩnh viễn vai trò này vào cơ sở dữ liệu,  
**So that** hệ thống tự động hiệu chuẩn đúng bộ công cụ AI-SDK và giao diện phù hợp với quyền hạn của tôi, đồng thời ngăn chặn tuyệt đối tình trạng học viên tự ý chuyển quyền (self-promotion) hoặc truy cập trái phép dữ liệu điều phối nhạy cảm của Trợ giảng.

---

## 2. Bảng Đánh Giá Tiêu Chuẩn INVEST

| Tiêu chí            | Đánh giá | Diễn giải chi tiết                                                                                                                                                             |
| ------------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I — Independent** |    ✅    | Luồng Onboarding kiểm tra `memberships` và kích hoạt modal độc lập trước khi người dùng truy cập các tính năng sâu của Chat (B1) hay Radar (B2).                               |
| **N — Negotiable**  |    ✅    | Cách thể hiện đồ họa trên màn hình (Stitch theme Technical Cyan Minimal) và định dạng lưu trữ session có thể linh hoạt, nhưng nguyên tắc khóa cứng (immutability) là bất biến. |
| **V — Valuable**    |    ✅    | Bảo đảm tính toàn vẹn của bảo mật phân quyền Role-Based Access Control (RBAC); bảo vệ dữ liệu điểm số, profile và radar nội bộ khỏi nguy cơ rò rỉ.                             |
| **E — Estimable**   |    ✅    | Dễ dàng ước lượng: Component modal Onboarding, API endpoint `/api/auth/role` kiểm tra khóa cứng, và cập nhật session cookie/local state.                                       |
| **S — Small**       |    ✅    | Gói gọn trong 1 màn hình modal và 1 endpoint xử lý logic chốt quyền; hoàn thành trọn vẹn trong 1 checkpoint.                                                                   |
| **T — Testable**    |    ✅    | Kiểm thử bằng unit test chặn cập nhật vai trò lần 2 (403 Forbidden) và E2E test kiểm chứng người dùng mới hoàn tất onboarding vào đúng giao diện.                              |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria - Gherkin Syntax)

### AC1: Chặn tài khoản chưa được operator cấp membership

- **Given** Người dùng đăng nhập thành công qua OAuth hoặc email vào hệ thống EasyGame,
- **And** Tài khoản này chưa từng có bản ghi vai trò trong bảng `public.memberships` của cohort hiện tại,
- **When** Người dùng truy cập trang chủ Workspace (`/workspace`),
- **Then** Hệ thống từ chối truy cập Workspace và không tự tạo membership,
- **And** giao diện hướng dẫn người dùng liên hệ operator đáng tin cậy để được thêm vào cohort,
- **And** không hiển thị lựa chọn tự nhận vai trò `Learner` hoặc `Lab Coach`.

---

### AC2: Membership Learner chỉ do operator đáng tin cậy cấp

- **Given** operator đáng tin cậy đã cấp đúng một membership `learner` cho người dùng,
- **When** người dùng đăng nhập và mở Workspace,
- **Then** server lấy guild và role từ membership đã lưu, không nhận từ request của client,
- **And** giao diện Workspace Học viên chỉ hiển thị Chat, Official Notices và Feedback,
- **And** Nút bấm đổi vai trò (`Database Role Selection`) trên giao diện hoàn toàn bị gỡ bỏ, người dùng chỉ thấy nhãn tĩnh `Role: Learner (Locked)`.

---

### AC3: Membership Lab Coach chỉ do operator đáng tin cậy cấp

- **Given** operator đáng tin cậy đã xác minh và cấp đúng một membership `lab_coach`,
- **When** Lab Coach đăng nhập và mở Workspace,
- **Then** server xác minh membership đã lưu và không cho client tự chọn hoặc đổi role,
- **And** Hệ thống mở khóa toàn bộ các tab nâng cao: `#ta-radar` (Tickets & Radar), `Messages` (Quản lý tin nhắn), `Official Notices`, và `22:00 Daily Digest`.

---

### AC4: Chặn đứng hành vi cố tình đổi vai trò sau khi đã khóa (Security & Immutability Defense)

- **Given** Người dùng đã hoàn tất onboarding và có vai trò `learner` trong cơ sở dữ liệu,
- **When** Kẻ tấn công cố tình can thiệp bằng cách gửi lệnh `POST /api/auth/role` với `{ role: "lab_coach" }`,
- **Then** Hệ thống kiểm tra thấy bản ghi vai trò đã tồn tại cho tài khoản này,
- **And** Hệ thống từ chối cập nhật và phản hồi mã lỗi `403 Forbidden` kèm thông điệp: `{"error": "Role is permanently locked after onboarding and cannot be changed"}`,
- **And** Vai trò trong cơ sở dữ liệu vẫn giữ nguyên là `learner`, không có sự thay đổi nào được thực thi.

---

## 4. Ghi Chú Kỹ Thuật & Giả Định (Notes & Assumptions)

1. **Operator provisioning:** Membership được cấp bằng quy trình vận hành đáng tin cậy; tài khoản web không có quyền tự thêm hoặc tự nâng role.
2. **Session Consistency:** Trạng thái vai trò đồng bộ giữa JWT/cookie phiên làm việc và bảng `public.memberships` có kích hoạt RLS.
3. **Synthetic preview:** Preview chỉ dùng fixture tổng hợp và không được xem là bằng chứng RLS hoặc hosted authentication.
