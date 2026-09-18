# Use Case Specification: UC-B2-01

## 1. Document Control & Identification

| Field | Content |
|---|---|
| **Use Case ID:** | `UC-B2-01` |
| **Use Case Name:** | Scan and Generate Unanswered Question Radar |
| **Created By:** | Pham Thanh Dat (Lead BA) |
| **Date Created:** | 2026-09-17 |
| **Last Updated By:** | Pham Thanh Dat (Lead BA) |
| **Date Last Updated:** | 2026-09-18 |

---

## 2. Context & Scoping

| Field | Content |
|---|---|
| **Actor:** | **Primary Actor:** On-duty Lab Coach (TA)<br>**Secondary Actors:** Background Message Scanner, Discord Notification Service, LLM Digest Summarizer |
| **Description:** | The system periodically scans active public cohort channels to detect student inquiries that have remained unanswered beyond designated SLA thresholds (2-hour soft warning and 4-hour urgent escalation), and compiles a daily digest card in the private `#ta-radar` channel with direct deep links. This enables teaching assistants to triage dropped inquiries within minutes without manually combing through busy channels. |
| **Preconditions:** | 1. The On-duty Lab Coach has membership and viewing rights in the private `#ta-radar` coordination channel.<br>2. The Background Message Scanner has message read and channel history inspection permissions across public cohort channels.<br>3. The Discord Notification Service webhook is active. |
| **Postconditions:** | 1. Overdue student questions exceeding the 4-hour SLA are flagged with explicit priority tags and direct jump links in `#ta-radar`.<br>2. At shift end (22:00), a consolidated, cleanly formatted daily digest summary is published in `#ta-radar`.<br>3. Zero corrupted token strings (e.g., `"nguồn tham chiếu"`) or truncated summary lines appear in the output. |
| **Priority:** | High |
| **Frequency of Use:** | Periodic background evaluation every 15 minutes; formal daily digest published once per day (22:00). |

---

## 3. Flow of Events

### 3.1. Normal Course of Events (Happy Path)

| Step | Initiator | Action |
|:---:|:---:|---|
| 1 | **Background Message Scanner** | Triggers the scheduled 4-hour SLA audit cycle across all public discussion channels. |
| 2 | **Background Message Scanner** | Discovers recent question candidates and reloads every older inquiry that remains unresolved. |
| 3 | **Background Message Scanner** | Identifies student inquiries where `reply_count == 0` and thread message count has remained inactive for $\ge 4.0$ hours. |
| 4 | **Background Message Scanner** | Extracts the message metadata: sender username, post timestamp, elapsed wait time, excerpt snippet, and message URL. |
| 5 | **LLM Digest Summarizer** | Compiles the overdue question items into a prioritized list, grouping identical inquiries into unified themes. |
| 6 | **Discord Notification Service** | Dispatches an Urgent Escalation Embed Card to the private `#ta-radar` channel, mentioning `@On-duty Lab Coach`. |
| 7 | **On-duty Lab Coach (TA)** | Views the notification in `#ta-radar`, reads the one-line inquiry summary, and clicks the message action button (**"Xem tin nhắn 💬"**). |
| 8 | **Application Shell** | Navigates the On-duty Lab Coach directly to the in-app **Messages** view ([UC-B2-02](UC-B2-02_triage-and-reply-in-messages-view.md)) with the target message focused (no raw JSON displayed), while providing a secondary jump link to real Discord. |
| 9 | **On-duty Lab Coach (TA)** | Posts the authoritative answer directly via the In-App Direct Reply composer (or opens real Discord) and explicitly records resolution after confirming that the roadblock is resolved. |

---

### 3.2. Alternative Courses

#### UC-B2-01.AC.1: Soft Warning Alert Triggered at 2-Hour Threshold
* **Trigger:** At Step 3 of the Normal Course, an inquiry has elapsed $\ge 2.0$ hours but $< 4.0$ hours without a response.
* **Execution Flow:**
  1. The Background Message Scanner classifies the inquiry under the `Soft Warning (Tier 1)` threshold.
  2. The system formats a quiet radar log entry into `#ta-radar` without triggering role pings (`@everyone` or `@TA`).
  3. The entry displays the elapsed duration and the direct deep link for early review.
  4. The flow resumes at Step 7 of the Normal Course if a TA chooses to address the item early.

#### UC-B2-01.AC.2: Proactive Non-intrusive Stuck Student Intervention in Public Thread
* **Trigger:** At Step 3 of the Normal Course, an inquiry is classified as an in-depth lab roadblock (code error or setup blocker) where the student has posted no follow-up for $>1$ hour.
* **Execution Flow:**
  1. The Assistant System formulates a non-intrusive public reply in the student's thread offering 1–2 official guide pointers: *"If you are running into this environment error, check Section 2 of the Lab Setup Guide at [Documentation Link]. I've also alerted our Lab Coaches to assist you here shortly!"*
  2. The Assistant System cross-posts a contextual assistance ticket into `#ta-radar` detailing the student's error log.
  3. Under NO circumstances does the system send private unsolicited Direct Messages (DMs) to the student.
  4. The flow resumes at Step 7 of the Normal Course.

#### UC-B2-01.AC.3: Record Reply Without Premature Resolution
* **Trigger:** While an inquiry is listed in `#ta-radar`, an instructor, peer Learner, or bot assistant posts a response in the thread.
* **Execution Flow:**
  1. The Background Message Scanner detects the incoming reply and updates the inquiry state to `ANSWERED`.
  2. The system continues tracking the inquiry until a Lab Coach explicitly resolves it or the original Learner confirms resolution.
  3. After authorized resolution, the system removes the item from the active queue and records the resolution event in the Daily Digest.

---

### 3.3. Exceptions

#### UC-B2-01.EX.1: Zero Unanswered Questions in Cohort (Clean Queue State)
* **Trigger Condition:** At Step 3 of the Normal Course, the scanner finds that all questions within the SLA window have received verified replies.
* **System Response:**
  1. The system refrains from sending redundant alerts to `#ta-radar`.
  2. In the final 22:00 Daily Digest, the system publishes a celebration banner: *"All cohort questions resolved today! Current backlog: 0 questions."*
* **Final State:** Staff channel remains clean and free of notification fatigue.

#### UC-B2-01.EX.2: Discord API Rate Limiting or Gateway Reconnection
* **Trigger Condition:** At Step 2 of the Normal Course, the Background Scanner encounters Discord HTTP status `429 Too Many Requests`.
* **System Response:**
  1. The scanner pauses execution and parses the `Retry-After` header.
  2. The scanner enters an exponential backoff state with jitter (retry interval: 5s, 15s, 30s).
  3. Once the rate limit clears, the scanner resumes channel ingestion without message loss.
* **Final State:** Scanner operations resume normally without crashes or duplicate notifications.

#### UC-B2-01.EX.3: Corrupted Token String Anomaly Prevention (Legacy Bug Mitigation)
* **Trigger Condition:** At Step 5 of the Normal Course, raw message tokens or regex replacements introduce corrupted artifacts (such as the legacy bug inserting `"nguồn tham chiếu"` inside Vietnamese words).
* **System Response:**
  1. The Sanitization Pipeline runs an automated regex filter validating Vietnamese Unicode syllable boundaries.
  2. Any stray placeholder tokens are stripped, and sentences exceeding token limits are cleanly terminated with standard ellipsis rather than midway through a syllable.
  3. The sanitized text is verified before sending to the Discord webhook.
* **Final State:** Daily digest text is published with 100% natural Vietnamese typography and zero garbled strings.

---

## 4. Supplementary Specifications

| Field | Content |
|---|---|
| **Includes:** | None |
| **Special Requirements:** | 1. **Deep Link Formatting:** All message links must conform strictly to `https://discord.com/channels/{guild_id}/{channel_id}/{message_id}`.<br>2. **Anti-Hallucination Filtering:** Bot messages, system welcome messages, and casual conversational banter (`"hello"`, `"thanks"`) must never be counted as unanswered inquiries.<br>3. **Privacy and Ethics:** Student names and question metrics must remain within `#ta-radar` and must never be exposed publicly as performance rankings. |
| **Assumptions:** | 1. Teaching assistants monitor `#ta-radar` during designated shift hours.<br>2. Public discussion channels maintain standard message retention periods. |
| **Notes and Issues:** | `[TBD-02] | Product Owner | Before live integration | Decide whether to expose a Claimed by Me action.`<br>`[ISSUE-03] | BA | Open | Split scheduled detection, Lab Coach resolution, and daily digest publication into separate user-goal use cases.` |

---

## 5. Quality Validation Checklist (Review Findings)

| # | Item | Status | Verification Note |
|:---:|---|:---:|---|
| **C1** | Name follows "verb + object", active voice | ✅ | *"Scan and Generate Unanswered Question Radar"* uses active verb + object. |
| **C2** | User-goal level (passes coffee-break test) | ❌ | Combines periodic detection, staff triage, resolution, and a later daily digest across multiple sessions. Split is required. |
| **C3** | Unique ID following naming convention | ✅ | `UC-B2-01` follows strict project naming hierarchy. |
| **C4** | Exactly 1 primary actor + 1 clear goal | ❌ | The scheduler initiates scanning while the Lab Coach initiates triage; the document contains multiple goals. |
| **C5** | System boundary clearly delineated | ⚠️ | Scanner, notification delivery, Lab Coach resolution, and digest publication need separate use-case seams. |
| **C6** | Specific actor role, not generic "User" | ✅ | Uses "On-duty Lab Coach (TA)" throughout. |
| **C7** | Description covers Why + What + Outcome | ✅ | Answers why (prevent dropped questions), what (scan & report), and outcome (triage via links). |
| **C8** | Frequency of Use is quantified | ✅ | Quantified: 15-minute periodic scan, daily digest at 22:00. |
| **C9** | Preconditions are verifiable system states | ✅ | Validates channel membership, scanner permissions, and webhook connectivity. |
| **C10** | Postconditions verify success state & changes | ✅ | Validates queue status, digest card generation, and absence of corrupted strings. |
| **C11** | Preconditions distinct from Assumptions | ✅ | Operating prerequisites clearly separated from behavioral assumptions. |
| **C12** | Numbered list, one action per step | ✅ | Strict sequential numbering 1 through 9. |
| **C13** | Alternates Actor / System with clear subjects | ⚠️ | Subjects are explicit, but several internal-system steps describe implementation rather than actor/system interaction. |
| **C14** | NO embedded if/else/loop in Normal Course | ✅ | Happy path is strictly linear; branches reside in ACs and Exceptions. |
| **C15** | Flow runs from trigger to postcondition | ❌ | The Normal Course does not reach the separate 22:00 digest postcondition. |
| **C16** | ACs specify "at step N" + triggering condition | ✅ | AC.1, AC.2, AC.3 explicitly reference step numbers and conditions. |
| **C17** | Exceptions define trigger + response + final state | ✅ | EX.1, EX.2, EX.3 specify condition, recovery logic, and ending state. |
| **C18** | Common failure modes covered | ✅ | Covers rate limits, empty backlog, and string corruption anomalies. |
| **C19** | Includes point to existing valid UCs | ⚠️ | `None` hides reusable alert-delivery and digest goals that should become separate use cases. |
| **C20** | Special Requirements are non-functional | ⚠️ | Privacy is non-functional; inquiry classification and deep-link generation are functional rules. |
