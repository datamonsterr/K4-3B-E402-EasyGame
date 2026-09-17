# EasyGame Assistant & Radar Domain Context

Domain language and boundary definitions for EasyGame Track B: Verified Logistics Assistant (B1) and Unanswered Question Radar (B2) on Discord.

## Roles & Actors

**Learner**:
An enrolled student in the bootcamp cohort authenticated via username/password. Role is fixed per session and displayed under the user's name in the expanded sidebar.
_Avoid_: User, client, customer, switchable role

**Lab Coach**:
A teaching assistant or course moderator authenticated via staff credentials, responsible for cohort support, resolving escalated code blocks, and monitoring overdue questions. Role is fixed and displayed under name in sidebar.
_Avoid_: Admin, teacher, tutor, switchable role

**Official Notice Authority**:
An authorized source of truth (Instructor, Lead TA, or Coordinator) whose pinned messages and announcements define active course policies.
_Avoid_: General chatter, peer advice

## Intelligence & Grounding

**Grounded Response**:
A factual response strictly limited to ≤3 sentences (≤300 characters) citing an authentic pinned announcement with an exact message jump link.
_Avoid_: Speculative answer, hallucination, long explanation

**Timestamp Resolution**:
The deterministic logic prioritizing the latest official notice when multiple announcements modify the same milestone or deadline.
_Avoid_: First match, date averaging

**Graceful Fallback**:
The safe refusal mechanism triggered when confidence is <0.70 or no official record exists, acknowledging lack of official data and tagging a Lab Coach.
_Avoid_: Best guess, polite hallucination, silent failure

**Intent Router**:
The semantic classifier separating logistics queries, code debugging questions, chitchat, and prompt injection attacks into distinct pipelines.
_Avoid_: Monolithic prompt, single-pass classifier

## Radar & Operations

**Unanswered Radar**:
A monitoring engine that detects public student inquiries remaining unaddressed beyond defined SLA thresholds.
_Avoid_: Bot logger, spam filter

**Tiered SLA Alert**:
A two-stage alert system escalating unaddressed student inquiries to `#ta-radar`: a Tier 1 Soft Warning at 2 hours and a Tier 2 Urgent Ping at 4 hours.
_Avoid_: Immediate spam ping, silent queue

**Clean Daily Digest**:
An automated 22:00 report summarizing daily question throughput, unresolved tickets, and top confused topics with zero corrupted tokens.
_Avoid_: Raw log dump, bugged markdown

**Non-Intrusive Escalation**:
The operational policy strictly restricting automated notifications and radar alerts to staff channels (`#ta-radar`) without sending unsolicited Direct Messages (DMs) to students.
_Avoid_: Private DM bot, student pinging

## Inspection & Demo

**Glass-box Agent Inspector**:
An expandable real-time panel displaying internal agent reasoning steps, tool invocation payloads, confidence scores, and latency metrics.
_Avoid_: Black-box AI, hidden prompt

**Post-Demo Feedback Loop**:
A dedicated completion view presenting a Google Form URL and scannable QR code for collecting immediate user satisfaction and willing-user opt-ins.
_Avoid_: External survey redirect, untracked testing
