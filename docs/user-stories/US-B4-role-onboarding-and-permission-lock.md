# User Story US-B3: Onboarding Phân Quyền Vai Trò Khóa Cứng Lần Đầu Đăng Nhập

> **Mã Story:** `US-B3`  
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

| Tiêu chí | Đánh giá | Diễn giải chi tiết |
|---|:---:|---|
| **I — Independent** | ✅ | Luồng Onboarding kiểm tra `memberships` và kích hoạt modal độc lập trước khi người dùng truy cập các tính năng sâu của Chat (B1) hay Radar (B2). |
| **N — Negotiable** | ✅ | Cách thể hiện đồ họa trên màn hình (Stitch theme Technical Cyan Minimal) và định dạng lưu trữ session có thể linh hoạt, nhưng nguyên tắc khóa cứng (immutability) là bất biến. |
| **V — Valuable** | ✅ | Bảo đảm tính toàn vẹn của bảo mật phân quyền Role-Based Access Control (RBAC); bảo vệ dữ liệu điểm số, profile và radar nội bộ khỏi nguy cơ rò rỉ. |
| **E — Estimable** | ✅ | Dễ dàng ước lượng: Component modal Onboarding, API endpoint `/api/auth/role` kiểm tra khóa cứng, và cập nhật session cookie/local state. |
| **S — Small** | ✅ | Gói gọn trong 1 màn hình modal và 1 endpoint xử lý logic chốt quyền; hoàn thành trọn vẹn trong 1 checkpoint. |
| **T — Testable** | ✅ | Kiểm thử bằng unit test chặn cập nhật vai trò lần 2 (403 Forbidden) và E2E test kiểm chứng người dùng mới hoàn tất onboarding vào đúng giao diện. |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria - Gherkin Syntax)

### AC1: Hiển thị màn hình Onboarding cho người dùng mới đăng nhập lần đầu (Happy Path)
* **Given** Người dùng đăng nhập thành công qua OAuth hoặc email vào hệ thống EasyGame,
* **And** Tài khoản này chưa từng có bản ghi vai trò trong bảng `public.memberships` của cohort hiện tại,
* **When** Người dùng truy cập trang chủ Workspace (`/workspace`),
* **Then** Hệ thống tự động kích hoạt màn hình modal Onboarding **"Select Your Cohort Role"** (Screen ID `7488d0bd017b434aaf0d0e2ef6f567ea`),
* **And** Màn hình hiển thị 2 thẻ vai trò nổi bật: `Learner` (viền Cyan, tóm tắt quyền tra cứu hạn nộp) và `Lab Coach` (viền Amber, tóm tắt quyền radar, tickets, profile, broadcast),
* **And** Màn hình hiển thị cảnh báo rõ ràng: *"Permanent Provisioning: Strict Role-Based Access Control (RBAC). Role switching is permanently disabled once selected."*,
* **And** Người dùng không thể tắt modal bằng phím ESC hay click ra ngoài khi chưa chọn vai trò.

---

### AC2: Khóa vĩnh viễn vai trò Học viên (Learner Role Lock)
* **Given** Người dùng đang ở màn hình Onboarding,
* **When** Người dùng chọn thẻ `Learner` và nhấn nút `Continue as Learner →`,
* **Then** Hệ thống gửi yêu cầu `POST /api/auth/role` với `{ role: "learner" }`,
* **And** Cơ sở dữ liệu ghi nhận bản ghi `(guild_id, user_id, 'learner')` vào bảng `memberships`,
* **And** Modal đóng lại, hệ thống điều hướng vào giao diện Workspace Học viên (chỉ hiển thị Chat, Official Notices, Feedback),
* **And** Nút bấm đổi vai trò (`Database Role Selection`) trên giao diện hoàn toàn bị gỡ bỏ, người dùng chỉ thấy nhãn tĩnh `Role: Learner (Locked)`.

---

### AC3: Khóa vĩnh viễn vai trò Trợ giảng (Lab Coach Role Lock)
* **Given** Người dùng là trợ giảng trực ca đang ở màn hình Onboarding,
* **When** Người dùng chọn thẻ `Lab Coach / TA` và nhấn nút `Continue as Lab Coach →`,
* **Then** Hệ thống gửi yêu cầu `POST /api/auth/role` với `{ role: "lab_coach" }`,
* **And** Cơ sở dữ liệu ghi nhận bản ghi `(guild_id, user_id, 'lab_coach')`,
* **And** Hệ thống mở khóa toàn bộ các tab nâng cao: `#ta-radar` (Tickets & Radar), `Messages` (Quản lý tin nhắn), `Official Notices`, và `22:00 Daily Digest`.

---

### AC4: Chặn đứng hành vi cố tình đổi vai trò sau khi đã khóa (Security & Immutability Defense)
* **Given** Người dùng đã hoàn tất onboarding và có vai trò `learner` trong cơ sở dữ liệu,
* **When** Kẻ tấn công cố tình can thiệp bằng cách gửi lệnh `POST /api/auth/role` với `{ role: "lab_coach" }`,
* **Then** Hệ thống kiểm tra thấy bản ghi vai trò đã tồn tại cho tài khoản này,
* **And** Hệ thống từ chối cập nhật và phản hồi mã lỗi `403 Forbidden` kèm thông điệp: `{"error": "Role is permanently locked after onboarding and cannot be changed"}`,
* **And** Vai trò trong cơ sở dữ liệu vẫn giữ nguyên là `learner`, không có sự thay đổi nào được thực thi.

---

## 4. Ghi Chú Kỹ Thuật & Giả Định (Notes & Assumptions)

1. **Stitch Asset Mapping:** Màn hình Onboarding được xây dựng theo file mẫu tại `docs/stitch_assets/screen6_onboarding.html` và thiết kế trên Stitch MCP `7488d0bd017b434aaf0d0e2ef6f567ea`.
2. **Session Consistency:** Trạng thái vai trò đồng bộ giữa JWT/cookie phiên làm việc và bảng `public.memberships` có kích hoạt RLS.
3. **Demo Fallback:** Trong chế độ preview hoặc kiểm thử tự động, thông tin vai trò lưu giữ trong cookie `eg_demo_role` và cấm ghi đè nếu đã tồn tại cờ khóa vai trò `eg_role_locked=true`.
