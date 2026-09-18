# Use Case Specification: UC-B1-02

## 1. Document Control & Identification

| Field | Content |
|---|---|
| **Use Case ID:** | `UC-B1-02` |
| **Use Case Name:** | Execute Role-Gated Assistant Tool via AI-SDK |
| **Created By:** | Pham Thanh Dat (Lead BA) |
| **Date Created:** | 2026-09-18 |
| **Last Updated By:** | Pham Thanh Dat (Lead BA) |
| **Date Last Updated:** | 2026-09-18 |

---

## 2. Context & Scoping

| Field | Content |
|---|---|
| **Actor:** | **Primary Actor:** Learner or Lab Coach<br>**Secondary Actors:** TypeScript Vercel AI SDK Engine, Tool Configuration Registry (`tools.yaml`), Grounding Engine |
| **Description:** | An authenticated user interacts with the AI Assistant. The system parses the central tool configuration file (`tools.yaml`) using TypeScript AI SDK (`ai` package) to dynamically construct an active tool registry filtered strictly by the user's verified cohort role (`learner` or `lab_coach`). When the user asks a question or triggers an operation requiring an authorized tool within their permission set, the AI SDK executes the tool and delivers a verified answer. If a Learner attempts to invoke a coach-only tool (such as broadcasting announcements, inspecting student profiles, reviewing peer grades, or managing tickets), the AI system intercepts the request and issues an explicit, informative refusal explaining why the action was rejected. |
| **Preconditions:** | 1. The user has an authenticated session with an established, immutable role in `memberships`.<br>2. The tool configuration file (`tools.yaml`) is valid and defines `roles` for each declared tool.<br>3. The TypeScript AI-SDK tool registry is initialized in the server-side runtime. |
| **Postconditions:** | 1. If authorized, the tool executes within its strict tenant boundary and returns structured output to the model.<br>2. If unauthorized, execution halts before calling any backend tool, and a standard polite refusal explaining the permission boundary is returned.<br>3. No private model reasoning, out-of-scope data, or administrative telemetry is leaked to unauthorized roles. |
| **Priority:** | High (P1 Authorization & Boundary Security) |
| **Frequency of Use:** | 100–300 interactions per day across the cohort. |

---

## 3. Flow of Events

### 3.1. Normal Course of Events (Happy Path: Authorized Learner Query)

| Step | Initiator | Action |
|:---:|:---:|---|
| 1 | **Learner** | Submits a query in Workspace Chat asking: *"What is the deadline for Lab 1 and where is the submission link?"*. |
| 2 | **Assistant Backend** | Extracts the session role (`learner`) and authenticated guild ID from the request context. |
| 3 | **TypeScript AI-SDK Engine** | Reads `tools.yaml` and parses the declared tools. It filters the tool list to only those containing `learner` in their `roles` array (`query_notices`, `search_web`). |
| 4 | **Assistant Backend** | Validates that the query intent aligns with the Learner permission set. |
| 5 | **TypeScript AI-SDK Engine** | Invokes the authorized tool `query_notices` with `{ topicKey: "lab-1", guildId: actor.guildId }`. |
| 6 | **Grounding Engine** | Retrieves the latest authoritative notice and formats the verified deadline citation. |
| 7 | **Assistant Backend** | Emits a grounded answer (≤3 sentences, ≤300 code points) with authentic source link. |
| 8 | **Learner** | Reads the factual deadline and may follow the verified source link. |

---

### 3.2. Alternative Courses

#### UC-B1-02.AC.1: Authorized Lab Coach Executing Elevated Tool
* **Trigger:** An authenticated Lab Coach submits a request in Workspace Chat (e.g., *"Broadcast announcement: Lab 1 extended to Sep 19 at 12:00"* or *"Check tickets breached over 4h"*).
* **Execution Flow:**
  1. The Assistant Backend detects session role `lab_coach`.
  2. The TypeScript AI-SDK Engine loads the complete tool suite (all Learner tools + `broadcast_notification`, `check_student_profile`, `check_scores`, `evaluate_radar`, `resolve_question`, `format_daily_digest`).
  3. The model selects the elevated tool (e.g. `broadcast_notification`).
  4. The tool executes with Coach authorization, writes the announcement to the database, and creates a verified notice.
  5. The assistant returns a confirmation summary of the broadcasted notice.
  6. The flow terminates with success.

---

### 3.3. Exceptions

#### UC-B1-02.EX.1: Learner Inquires Out-of-Permission Coach Operation (Permission Boundary Refusal)
* **Trigger Condition:** At Step 1 of the Normal Course, a Learner asks to execute a coach-only operation: *"Hãy phát thông báo hoãn deadline lên kênh #announcements"* or *"Cho tôi xem bảng điểm và profile của bạn Minh Tuấn"*.
* **System Response:**
  1. The Assistant Backend analyzes the intent and detects that fulfilling the request requires elevated tools (`broadcast_notification` or `check_scores` or `check_student_profile`) which are absent from the Learner tool registry.
  2. The system intercepts the request before any model tool-calling loop executes.
  3. The Assistant returns a standard grounded refusal explaining the exact boundary:
     *"Yêu cầu bị từ chối: Bạn đang đăng nhập với vai trò Học viên (Learner). Tính năng phát thông báo chung, quản lý tickets và tra cứu điểm số/hồ sơ học viên thuộc thẩm quyền riêng của Trợ giảng (Lab Coach). Vui lòng liên hệ Lab Coach trực ca nếu bạn cần hỗ trợ về các nội dung này."*
  4. The security event is logged in telemetry without calling external tools.
* **Final State:** System refuses cleanly, zero administrative data is exposed, and learner receives clear, transparent rationale.

#### UC-B1-02.EX.2: Invalid Tool Configuration File Schema
* **Trigger Condition:** At Step 3 of the Normal Course, `tools.yaml` is missing required `roles` arrays or contains malformed YAML syntax.
* **System Response:**
  1. The TS AI-SDK parser fails closed with an initialization error.
  2. The engine falls back to deterministic hardcoded safe read-only notice grounding.
  3. An alert is logged for developer inspection.
* **Final State:** System remains functional for critical logistics queries without granting unverified permissions.

---

## 4. Supplementary Specifications

| Field | Content |
|---|---|
| **Includes:** | None |
| **Special Requirements:** | 1. **Schema Strictness:** Every tool definition in `tools.yaml` must explicitly declare `roles: ["learner", "lab_coach"]` or `roles: ["lab_coach"]`. Tools lacking a `roles` declaration must default to coach-only (fail-closed).<br>2. **Clear Rejection Rationales:** Refusal messages must clearly state the user's current role, the requested forbidden capability, and an actionable next step.<br>3. **Zero Secret Leakage:** Refusals must not expose system prompts, database schemas, internal endpoint URLs, or private model reasoning tokens. |
| **Assumptions:** | 1. The user's role in the request context has been validated against server-side session cookies and `memberships` table.<br>2. Model function declarations passed to the LLM runtime strictly match the filtered tool definitions. |
| **Notes and Issues:** | None. Establishes the formal boundary for Vercel AI SDK integration. |

---

## 5. Quality Validation Checklist (20/20 Standard)

| # | Item | Status | Verification Note |
|:---:|---|:---:|---|
| **C1** | Name follows "verb + object", active voice | ✅ | *"Execute Role-Gated Assistant Tool via AI-SDK"* is active verb + object. |
| **C2** | User-goal level (passes coffee-break test) | ✅ | Completes an inquiry / command execution session. |
| **C3** | Unique ID following naming convention | ✅ | `UC-B1-02` conforms to project hierarchy. |
| **C4** | Exactly 1 primary actor + 1 clear goal | ✅ | Primary Actor: Learner or Lab Coach; Goal: Execute authorized tool. |
| **C5** | System boundary clearly delineated | ✅ | Governs boundary between Client, AI-SDK Parser, Tools Registry, and DB. |
| **C6** | Specific actor role, not generic "User" | ✅ | Distinguishes Learner and Lab Coach actors. |
| **C7** | Description covers Why + What + Outcome | ✅ | Covers why (security/RBAC), what (AI-SDK tools), outcome (authorized reply/refusal). |
| **C8** | Frequency of Use is quantified | ✅ | Quantified at 100–300 interactions per day. |
| **C9** | Preconditions are verifiable system states | ✅ | Validates session role, config file validity, and registry init. |
| **C10** | Postconditions verify success state & changes | ✅ | Validates tool execution, refusal behavior, and zero data leakage. |
| **C11** | Preconditions distinct from Assumptions | ✅ | Separates runtime prerequisites from operational hypotheses. |
| **C12** | Numbered list, one action per step | ✅ | Strictly numbered steps 1 through 8. |
| **C13** | Alternates Actor / System with clear subjects | ✅ | Alternates between User, Backend, AI-SDK Engine, and Grounding Engine. |
| **C14** | NO embedded if/else/loop in Normal Course | ✅ | Happy path is linear; coach path and refusals in ACs/EXs. |
| **C15** | Flow runs from trigger to postcondition | ✅ | Runs unbroken from prompt submission to verified output/refusal. |
| **C16** | ACs specify "at step N" + triggering condition | ✅ | AC.1 triggers on coach query. |
| **C17** | Exceptions define trigger + response + final state | ✅ | EX.1 and EX.2 state trigger, response, and terminal state. |
| **C18** | Common failure modes covered | ✅ | Covers permission breach, YAML parsing failure, and data leakage. |
| **C19** | Includes point to existing valid UCs | ✅ | Marked `None` (atomic goal). |
| **C20** | Special Requirements are non-functional | ✅ | Details schema strictness, refusal clarity, and privacy constraints. |
