# Database Reference — EasyGame Discord Assistant

> **Platform:** Supabase (PostgreSQL 15)  
> **Schema file:** [`schema.sql`](./schema.sql)  
> **Source data:** `data/discord-pack/k4_messages.csv` — 1 092 tin nhắn Discord K4 (12–14/09/2026)  
> **Authentication:** Supabase Auth — SSO Google · SSO Discord

---

## Tổng quan

Database vận hành 2 module chính:

- **Track B1 — Logistics Bot:** Trả lời câu hỏi học viên dựa trên thông báo chính thức (RAG)
- **Track B2 — Radar & Daily Digest:** Theo dõi câu hỏi tồn đọng, cảnh báo SLA cho TA, xuất bản tin ngày

```
auth.users (Supabase built-in)
  └── user_profiles            (role: learner | coach)

discord_messages ──┬── official_notices   (nguồn sự thật RAG)
                   └── questions_tracker ──── sla_alerts
                                         └── daily_digest
feedback_reports   (độc lập — phản hồi học viên)
```

---

## Authentication — Supabase Auth

**Provider:** Supabase Auth (built-in) với 2 SSO provider:

| Provider    | Supabase provider key | Ghi chú                                 |
| ----------- | --------------------- | --------------------------------------- |
| **Google**  | `google`              | Đăng nhập bằng Gmail / Google Workspace |
| **Discord** | `discord`             | Đăng nhập bằng tài khoản Discord K4     |

**Luồng hoạt động:**

```
Mở app → initAuth() kiểm tra session
  ├─ Có session → vào app → (role picker nếu chưa chọn role)
  └─ Không có  → Hiện Login Screen
                  ├─ [Google SSO]   → signInWithOAuth('google')
                  ├─ [Discord SSO]  → signInWithOAuth('discord')
                  └─ [Demo Mode]    → bypass auth (dev only)
                       └─ OAuth callback → SIGNED_IN
                            └─ Role Picker: Học viên | Lab Coach
                                 └─ upsert vào user_profiles
```

**Session persistence:** Supabase tự lưu token vào `localStorage`. Reload trang không cần đăng nhập lại.

---

## Bảng `user_profiles`

**Mục đích:** Lưu role ứng dụng của từng user đã đăng nhập — liên kết với `auth.users` của Supabase. Được tạo/cập nhật ngay sau khi user chọn role lần đầu.

| Field        | Type                           | Mô tả                                                                 |
| ------------ | ------------------------------ | --------------------------------------------------------------------- |
| `id`         | `UUID` PK → FK `auth.users.id` | ID user từ Supabase Auth — tự động map với token SSO                  |
| `email`      | `TEXT`                         | Email lấy từ provider (Google/Discord)                                |
| `role`       | `TEXT`                         | Vai trò trong app: `learner` (Học viên) hoặc `coach` (Lab Coach / TA) |
| `updated_at` | `TIMESTAMPTZ`                  | Lần cuối cập nhật role                                                |

**RLS Policy:**

- `user_own_profile` — user chỉ đọc/ghi profile của chính mình (`auth.uid() = id`)
- `service_role_all` — bot backend có full access

---

## Bảng `discord_messages`

**Mục đích:** Lưu toàn bộ tin nhắn thô từ `k4_messages.csv`. Là bảng trung tâm, mọi bảng khác tham chiếu về đây.

| Field           | Type                 | Mô tả                                                                                                          |
| --------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`            | `BIGSERIAL`          | Primary key nội bộ                                                                                             |
| `msg_id`        | `TEXT` UNIQUE        | Mã tin nhắn từ dataset, dạng `M#####` — dùng làm khóa ngoại                                                    |
| `guild`         | `TEXT`               | Server Discord: `K4-L2-3` hoặc `K4-L3-4`                                                                       |
| `channel`       | `TEXT`               | Kênh đã mã hóa: `channel_01` – `channel_12`                                                                    |
| `author`        | `TEXT`               | Người gửi: `D####` (học viên/TA/BTC) hoặc `BOT`                                                                |
| `is_bot`        | `BOOLEAN`            | `TRUE` nếu tin do bot gửi (313/1092 tin)                                                                       |
| `msg_type`      | `TEXT`               | `message` (tin thường) hoặc `reply` (tin trả lời)                                                              |
| `created_at_vn` | `TIMESTAMPTZ`        | Thời điểm gửi theo giờ Việt Nam (UTC+7)                                                                        |
| `reply_to`      | `TEXT` → FK `msg_id` | Tham chiếu tin nhắn gốc nếu là reply; `NULL` nếu không phải                                                    |
| `mentions_bot`  | `BOOLEAN`            | `TRUE` nếu tin có tag bot — dấu hiệu học viên đang hỏi bot                                                     |
| `n_attachments` | `INTEGER`            | Số file đính kèm (nội dung file không có trong dataset)                                                        |
| `n_chars`       | `INTEGER`            | Độ dài nội dung sau khi mask PII                                                                               |
| `content`       | `TEXT`               | Nội dung tin nhắn đã ẩn danh (PII → `[HV]`, `[MSSV]`, v.v.)                                                    |
| `intent_label`  | `TEXT`               | Nhãn phân loại intent do pipeline AI gán (ban đầu `NULL`) — ví dụ: `Logistics_Deadline`, `Technical_Code_Help` |
| `is_question`   | `BOOLEAN` (computed) | Tự động `TRUE` nếu `content` chứa `?` — dùng để lọc câu hỏi nhanh                                              |
| `created_at`    | `TIMESTAMPTZ`        | Thời điểm record được insert vào DB                                                                            |

---

## Bảng `official_notices`

**Mục đích:** Lưu các thông báo chính thức từ BTC/Admin/TA — đây là **nguồn sự thật duy nhất** mà bot RAG được phép trích dẫn khi trả lời học viên (FR-102).

| Field           | Type                                | Mô tả                                                                                                         |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`            | `BIGSERIAL`                         | Primary key                                                                                                   |
| `msg_id`        | `TEXT` → FK `discord_messages`      | Liên kết về tin gốc trong bảng `discord_messages` nếu có                                                      |
| `guild`         | `TEXT`                              | Server chứa thông báo                                                                                         |
| `channel`       | `TEXT`                              | Kênh đăng thông báo (thường là `#announcements`)                                                              |
| `author_role`   | `TEXT`                              | Vai trò người đăng: `Admin`, `Instructor`, `Lead_TA`, `BTC`                                                   |
| `title`         | `TEXT`                              | Tiêu đề thông báo — ví dụ: `"Thông báo hạn nộp Lab 1"`                                                        |
| `content`       | `TEXT`                              | Nội dung đầy đủ của thông báo                                                                                 |
| `notice_ts`     | `TIMESTAMPTZ`                       | Thời điểm đăng thông báo gốc — dùng để ưu tiên thông báo mới nhất khi có nhiều thông báo cùng chủ đề (FR-103) |
| `tags`          | `TEXT[]`                            | Mảng tag phân loại — ví dụ: `['deadline','lab1','checkpoint']` — dùng để tìm kiếm nhanh                       |
| `is_superseded` | `BOOLEAN`                           | `TRUE` nếu thông báo này đã bị thay thế bởi thông báo mới hơn (ví dụ: thông báo gia hạn)                      |
| `superseded_by` | `BIGINT` → FK `official_notices.id` | Trỏ đến thông báo thay thế                                                                                    |
| `discord_link`  | `TEXT`                              | Deep link trực tiếp đến tin nhắn trên Discord: `https://discord.com/channels/{guild}/{channel}/{msg}`         |
| `created_at`    | `TIMESTAMPTZ`                       | Thời điểm insert vào DB                                                                                       |

---

## Bảng `questions_tracker`

**Mục đích:** Theo dõi vòng đời từng câu hỏi của học viên — từ khi hỏi đến khi được giải quyết. Là core của Track B2 Radar (FR-201, FR-205).

| Field                 | Type                                  | Mô tả                                                                                      |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`                  | `BIGSERIAL`                           | Primary key                                                                                |
| `msg_id`              | `TEXT` UNIQUE → FK `discord_messages` | Mã tin nhắn câu hỏi gốc                                                                    |
| `guild`               | `TEXT`                                | Server chứa câu hỏi                                                                        |
| `channel`             | `TEXT`                                | Kênh chứa câu hỏi                                                                          |
| `author`              | `TEXT`                                | `D####` của học viên hỏi                                                                   |
| `asked_at`            | `TIMESTAMPTZ`                         | Thời điểm đặt câu hỏi (= `created_at_vn` của tin gốc)                                      |
| `intent_label`        | `TEXT`                                | Nhãn phân loại: `Logistics_Deadline`, `Technical_Code_Help`, v.v.                          |
| `question_summary`    | `TEXT`                                | Tóm tắt câu hỏi 1 câu do AI sinh ra — hiển thị trong bản tin TA                            |
| `status`              | `TEXT`                                | Trạng thái xử lý: `OPEN` → `BOT_ANSWERED` / `TA_ANSWERED` → `RESOLVED` / `IGNORED`         |
| `first_response_at`   | `TIMESTAMPTZ`                         | Thời điểm nhận phản hồi đầu tiên (bot hoặc người)                                          |
| `resolved_at`         | `TIMESTAMPTZ`                         | Thời điểm câu hỏi được đánh dấu RESOLVED                                                   |
| `wait_minutes`        | `INTEGER` (computed)                  | Số phút chờ từ lúc hỏi đến phản hồi đầu tiên — tự tính từ `first_response_at - asked_at`   |
| `sla_tier`            | `TEXT`                                | Mức cảnh báo: `NULL` (chưa vi phạm), `SOFT_2H` (quá 2h chưa trả lời), `URGENT_4H` (quá 4h) |
| `bot_response_msg_id` | `TEXT`                                | `msg_id` của tin bot đã trả lời câu hỏi này                                                |
| `bot_confidence`      | `NUMERIC(4,3)`                        | Điểm tự tin của bot khi trả lời (0.000–1.000) — dưới 0.70 sẽ fallback sang TA              |
| `discord_link`        | `TEXT`                                | Deep link nhảy thẳng đến câu hỏi gốc                                                       |
| `created_at`          | `TIMESTAMPTZ`                         | Thời điểm insert vào DB                                                                    |

---

## Bảng `sla_alerts`

**Mục đích:** Ghi lại lịch sử từng lần cảnh báo SLA được gửi vào kênh `#ta-radar`. Tránh spam cảnh báo trùng lặp, theo dõi TA nào đã xác nhận xử lý (FR-202).

| Field                 | Type                                 | Mô tả                                                                                        |
| --------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `id`                  | `BIGSERIAL`                          | Primary key                                                                                  |
| `question_tracker_id` | `BIGINT` → FK `questions_tracker.id` | Câu hỏi bị cảnh báo                                                                          |
| `tier`                | `TEXT`                               | Tầng cảnh báo: `SOFT_2H` (cảnh báo mềm) hoặc `URGENT_4H` (báo động đỏ, mention `@TA_OnDuty`) |
| `alerted_at`          | `TIMESTAMPTZ`                        | Thời điểm gửi cảnh báo                                                                       |
| `alert_msg_id`        | `TEXT`                               | `msg_id` của tin cảnh báo trên Discord (để sửa/xóa sau)                                      |
| `ta_mention`          | `TEXT`                               | TA được mention trong cảnh báo `URGENT_4H`                                                   |
| `is_acknowledged`     | `BOOLEAN`                            | `TRUE` khi TA đã xác nhận đang xử lý                                                         |
| `acknowledged_at`     | `TIMESTAMPTZ`                        | Thời điểm TA xác nhận                                                                        |
| `acknowledged_by`     | `TEXT`                               | `D####` của TA xác nhận                                                                      |

---

## Bảng `daily_digest`

**Mục đích:** Lưu bản tin tổng hợp ngày được xuất lúc 22:00 hàng ngày vào `#ta-radar`. Mỗi (guild, ngày) chỉ có 1 bản tin (FR-204).

| Field               | Type          | Mô tả                                                                                                            |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                | `BIGSERIAL`   | Primary key                                                                                                      |
| `guild`             | `TEXT`        | Server nhận bản tin                                                                                              |
| `digest_date`       | `DATE`        | Ngày tổng hợp — `UNIQUE` theo cặp `(guild, digest_date)`                                                         |
| `total_questions`   | `INTEGER`     | Tổng số câu hỏi trong ngày                                                                                       |
| `answered_count`    | `INTEGER`     | Số câu đã được trả lời                                                                                           |
| `open_2h_count`     | `INTEGER`     | Số câu tồn đọng quá 2h                                                                                           |
| `open_4h_count`     | `INTEGER`     | Số câu tồn đọng quá 4h                                                                                           |
| `top_topics`        | `JSONB`       | Top 3 chủ đề được hỏi nhiều nhất — `[{"topic": "deadline", "count": 5}, ...]`                                    |
| `pending_questions` | `JSONB`       | Danh sách câu hỏi tồn chưa giải quyết — mỗi phần tử có `msg_id`, `summary`, `author`, `asked_at`, `discord_link` |
| `digest_content`    | `TEXT`        | Nội dung bản tin đã render hoàn chỉnh dạng Markdown (sẵn sàng gửi Discord)                                       |
| `posted_msg_id`     | `TEXT`        | `msg_id` Discord của bản tin sau khi đã gửi                                                                      |
| `posted_at`         | `TIMESTAMPTZ` | Thời điểm gửi thực tế lên Discord                                                                                |
| `created_at`        | `TIMESTAMPTZ` | Thời điểm tạo record                                                                                             |

---

## Bảng `feedback_reports`

**Mục đích:** Ghi nhận phản hồi từ nút `[Báo sai thông tin]` dưới mỗi câu trả lời của bot — cho phép TA rà soát và cải thiện chất lượng (HAX G8/G9 trong PRD §8).

| Field           | Type          | Mô tả                                                                                                |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `id`            | `BIGSERIAL`   | Primary key                                                                                          |
| `bot_msg_id`    | `TEXT`        | `msg_id` của tin bot bị báo sai                                                                      |
| `reporter`      | `TEXT`        | `D####` học viên báo lỗi                                                                             |
| `guild`         | `TEXT`        | Server nơi xảy ra                                                                                    |
| `channel`       | `TEXT`        | Kênh nơi xảy ra                                                                                      |
| `report_ts`     | `TIMESTAMPTZ` | Thời điểm báo lỗi                                                                                    |
| `feedback_type` | `TEXT`        | Loại lỗi: `WRONG_INFO` (sai thông tin), `TOO_LONG` (quá dài), `NO_SOURCE` (thiếu trích dẫn), `OTHER` |
| `note`          | `TEXT`        | Ghi chú tự do của học viên (optional)                                                                |
| `is_reviewed`   | `BOOLEAN`     | `TRUE` khi TA đã xem xét phản hồi này                                                                |
| `reviewed_by`   | `TEXT`        | `D####` của TA đã review                                                                             |
| `reviewed_at`   | `TIMESTAMPTZ` | Thời điểm TA review                                                                                  |

---

## Views

### `vw_open_questions`

Câu hỏi đang ở trạng thái `OPEN`, join với nội dung gốc từ `discord_messages`, kèm cột `wait_minutes_now` tính thời gian chờ tính đến thời điểm query. Dùng để render danh sách tồn đọng cho Radar.

### `vw_guild_stats`

Thống kê tổng hợp theo guild: tổng tin nhắn, số tin người/bot, số câu hỏi, số lần mention bot, độ dài trung bình tin người/bot.

---

## Functions

### `update_sla_tiers() → INTEGER`

Duyệt toàn bộ câu hỏi `OPEN`, nâng `sla_tier` lên `SOFT_2H` hoặc `URGENT_4H` dựa trên thời gian chờ. Gọi mỗi 15 phút bởi scheduler. Trả về số dòng vừa cập nhật.

### `resolve_question(p_msg_id TEXT, p_resolver TEXT) → VOID`

Đánh dấu câu hỏi có `msg_id = p_msg_id` thành `RESOLVED` và ghi `resolved_at = now()`. Gọi khi học viên thả `:white_check_mark:` hoặc TA xác nhận đã xử lý (FR-205).
