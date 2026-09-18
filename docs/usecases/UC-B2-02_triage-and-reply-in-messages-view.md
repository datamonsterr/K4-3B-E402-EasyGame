# Use Case Specification: UC-B2-02

## 1. Document Control & Identification

| Field | Content |
|---|---|
| **Use Case ID:** | `UC-B2-02` |
| **Use Case Name:** | Triage and Reply to Dropped Question in Messages View |
| **Created By:** | Pham Thanh Dat (Lead BA) |
| **Date Created:** | 2026-09-18 |
| **Last Updated By:** | Pham Thanh Dat (Lead BA) |
| **Date Last Updated:** | 2026-09-18 |

---

## 2. Context & Scoping

| Field | Content |
|---|---|
| **Actor:** | **Primary Actor:** On-duty Lab Coach (TA)<br>**Secondary Actors:** Application Messages View, PostgreSQL Database Engine, In-App Reply Endpoint |
| **Description:** | An on-duty Lab Coach reviews escalated question tickets in the `#ta-radar` view. Rather than navigating out to an external Discord URL, clicking the action button on a ticket navigates internally to the application's **"Messages"** view (formerly "Manage Channels") with the specific target message focused. The Messages view presents a compact, human-readable triage interface (omitting raw JSON). The Lab Coach inspects the question context, enters an authoritative answer directly into the application's reply composer, and clicks **"Send Reply (Database)"**. The system writes the reply directly into the application database (`source_messages`), records resolution, and logs an audit event without calling external Discord bots. The coach retains an optional action button to jump to real Discord if live interaction is required. |
| **Preconditions:** | 1. The Lab Coach has an authenticated session with locked `lab_coach` role.<br>2. An overdue or escalated question ticket exists in the radar queue.<br>3. The corresponding source message exists in `public.source_messages`. |
| **Postconditions:** | 1. A new reply record is persisted in `public.source_messages` with `message_type = 'reply'` and `reply_to_id = message.id`.<br>2. The ticket state in `public.questions` transitions to `answered` (or `resolved`).<br>3. No outbound request is dispatched to real Discord webhooks or gateway APIs.<br>4. The question is cleared or updated in the active SLA queue. |
| **Priority:** | High (Core Operational Triage Flow) |
| **Frequency of Use:** | 10–30 times per daily support shift. |

---

## 3. Flow of Events

### 3.1. Normal Course of Events (Happy Path: In-App Direct Database Reply)

| Step | Initiator | Action |
|:---:|:---:|---|
| 1 | **On-duty Lab Coach** | Reviews the `#ta-radar` SLA breach queue and identifies an urgent ticket (e.g. `tk-101` from student `@MinhTuan_K4` in `#lab-support`). |
| 2 | **On-duty Lab Coach** | Clicks the primary message action button (**"Xem tin nhắn 💬"**) on the ticket card. |
| 3 | **Application Shell** | Switches the active workspace view from `Tickets & Radar` to **`Messages`** (formerly Manage Channels) and passes the target message identifier (`tk-101`). |
| 4 | **Messages View** | Highlights the target message in the compact multi-message list and loads its thread context in the detail pane, rendering clean metadata (author, channel, elapsed time, intent) without displaying raw JSON payloads. |
| 5 | **On-duty Lab Coach** | Reviews the student's question and types an authoritative resolution into the **In-App Direct Reply** composer: *"Đối với file parquet 4GB, bạn hãy dùng chunking thay vì load toàn bộ bộ nhớ vào pandas nhé."*. |
| 6 | **On-duty Lab Coach** | Clicks the submission button **"Send Reply (Database)"**. |
| 7 | **In-App Reply Endpoint** | Receives `POST /api/workspace/reply`, validates coach authorization, inserts a reply record into `public.source_messages` with `reply_to_id = message.id`, and updates question status to `answered`. |
| 8 | **PostgreSQL Database Engine** | Commits the transaction and logs a `question_events` audit record (`'replied'`). |
| 9 | **Messages View** | Updates the UI optimistically, rendering the coach's reply in the thread view and updating the ticket badge to `ANSWERED`. |
| 10 | **On-duty Lab Coach** | Confirms the ticket is handled and continues triaging remaining inquiries. |

---

### 3.2. Alternative Courses

#### UC-B2-02.AC.1: Coach Chooses to Jump to Real Discord
* **Trigger:** At Step 5 of the Normal Course, the coach decides that voice assistance or screen-sharing in live Discord is necessary.
* **Execution Flow:**
  1. The coach clicks the secondary action button: **"Mở trên Discord thật ↗"** in the Messages inspector.
  2. The browser opens the authentic Discord deep link (`https://discord.com/channels/{guild}/{channel}/{msg}`) in a new tab.
  3. The coach assists the student directly on Discord.
  4. The coach returns to EasyGame and clicks **"Resolve"** on the ticket.
  5. The system marks the question `RESOLVED` in the database.
  6. The flow resumes at Step 10 of the Normal Course.

---

### 3.3. Exceptions

#### UC-B2-02.EX.1: Target Message Deleted or Missing
* **Trigger Condition:** At Step 3 of the Normal Course, the student message referenced by the ticket no longer exists in `public.source_messages`.
* **System Response:**
  1. The Messages view renders an informational empty state: *"Tin nhắn mục tiêu không còn tồn tại hoặc đã bị xóa."*.
  2. The coach is prompted to close or archive the ticket.
  3. The coach clicks "Archive Ticket", updating status to `resolved` with summary `"Source message not found"`.
* **Final State:** Ticket is closed cleanly without corrupting the radar queue.

#### UC-B2-02.EX.2: Concurrent Resolution by Another Coach
* **Trigger Condition:** At Step 7 of the Normal Course, another coach on duty has already answered or resolved the ticket while the current coach was typing.
* **System Response:**
  1. The database optimistic concurrency check (`expected_version`) detects a version conflict.
  2. The endpoint returns HTTP status `409 Conflict`.
  3. The Messages view displays the incoming concurrent reply with a notification banner: *"Đồng nghiệp @TA_MinhHai đã phản hồi tin nhắn này cách đây 1 phút."*.
  4. The coach's draft text is preserved in the textarea, allowing them to discard or supplement if needed.
* **Final State:** No conflicting state or duplicate closure occurs; concurrency integrity is preserved.

---

## 4. Supplementary Specifications

| Field | Content |
|---|---|
| **Includes:** | None |
| **Special Requirements:** | 1. **No Raw JSON Display:** The Messages view must display cleanly formatted message cards, monospace timestamps, author chips, and intent pills; raw Discord Gateway JSON payloads are removed from view.<br>2. **Database Push Invariant:** Replies must be written strictly to `public.source_messages` within PostgreSQL; the application must never attempt unauthorized Discord bot gateway dispatches.<br>3. **Deep Link Authenticity:** The secondary Discord link must navigate to the exact snowflake URL and must never fabricate links. |
| **Assumptions:** | 1. On-duty Lab Coaches have verified memberships with `role='lab_coach'`.<br>2. Simulated and imported message sets contain valid `source_label` and channel relations. |
| **Notes and Issues:** | Satisfies the requirement to replace raw JSON display with compact multi-message triage and provide seamless ticket-to-message workflow. |

---

## 5. Quality Validation Checklist (20/20 Standard)

| # | Item | Status | Verification Note |
|:---:|---|:---:|---|
| **C1** | Name follows "verb + object", active voice | ✅ | *"Triage and Reply to Dropped Question in Messages View"* is active verb + object. |
| **C2** | User-goal level (passes coffee-break test) | ✅ | Completes an atomic triage and reply task for one dropped inquiry. |
| **C3** | Unique ID following naming convention | ✅ | `UC-B2-02` follows Track B2 naming hierarchy. |
| **C4** | Exactly 1 primary actor + 1 clear goal | ✅ | Primary Actor: On-duty Lab Coach; Goal: Triage and reply to dropped question. |
| **C5** | System boundary clearly delineated | ✅ | Governs boundary between Lab Coach, Messages View, API, and PostgreSQL DB. |
| **C6** | Specific actor role, not generic "User" | ✅ | Uses canonical On-duty Lab Coach role. |
| **C7** | Description covers Why + What + Outcome | ✅ | Covers why (triage overdue questions), what (in-app reply), outcome (saved reply). |
| **C8** | Frequency of Use is quantified | ✅ | Quantified at 10–30 triage actions per shift. |
| **C9** | Preconditions are verifiable system states | ✅ | Validates coach role, ticket existence, and message availability. |
| **C10** | Postconditions verify success state & changes | ✅ | Validates reply persistence, ticket status update, zero external bot calls. |
| **C11** | Preconditions distinct from Assumptions | ✅ | Distinguishes system checks from operational assumptions. |
| **C12** | Numbered list, one action per step | ✅ | Sequentially numbered 1 through 10. |
| **C13** | Alternates Actor / System with clear subjects | ✅ | Cleanly alternates between Coach, App Shell, Messages View, Endpoint, and DB. |
| **C14** | NO embedded if/else/loop in Normal Course | ✅ | Happy path is linear; real Discord link and errors in ACs/EXs. |
| **C15** | Flow runs from trigger to postcondition | ✅ | Runs unbroken from ticket inspection to committed database reply. |
| **C16** | ACs specify "at step N" + triggering condition | ✅ | AC.1 anchors to Step 5. |
| **C17** | Exceptions define trigger + response + final state | ✅ | EX.1 and EX.2 state trigger, system response, and terminal state. |
| **C18** | Common failure modes covered | ✅ | Covers missing source message and concurrent coach collision. |
| **C19** | Includes point to existing valid UCs | ✅ | Marked `None` (atomic sea-level goal). |
| **C20** | Special Requirements are non-functional | ✅ | Details JSON prohibition, database push invariant, and link authenticity. |
