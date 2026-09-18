from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ============================================================
# TABLE 0: user_profiles
# ============================================================
class UserProfile(BaseModel):
    id: str = Field(..., description="UUID primary key referencing auth.users")
    email: Optional[str] = None
    role: Literal["learner", "coach"] = Field("learner", description="Application role")
    updated_at: str


# ============================================================
# TABLE 1: discord_messages
# ============================================================
class DiscordMessage(BaseModel):
    id: Optional[int] = None
    msg_id: str = Field(..., description="Unique Discord message ID")
    guild: str = Field("easygame_k4", description="Discord server/guild")
    channel: str = Field("#general", description="Channel name")
    author: str = Field(..., description="Username or Discord handle")
    is_bot: bool = Field(False, description="Whether message was sent by a bot")
    msg_type: Literal["message", "reply"] = Field("message", description="Message type")
    created_at_vn: str = Field(..., description="Timestamp in VN timezone")
    reply_to: Optional[str] = Field(None, description="Referenced msg_id if this is a reply")
    mentions_bot: bool = Field(False, description="Whether message mentions the bot")
    n_attachments: int = Field(0, description="Attachment count")
    n_chars: int = Field(0, description="Character count of content")
    content: Optional[str] = Field(None, description="Message text content")
    intent_label: Optional[str] = None
    is_question: bool = Field(False, description="Whether message contains question mark")
    created_at: Optional[str] = None


# ============================================================
# TABLE 2: official_notices
# ============================================================
class OfficialNotice(BaseModel):
    id: Optional[int] = None
    msg_id: Optional[str] = None
    guild: str = Field("easygame_k4", description="Guild name")
    channel: str = Field("#announcements", description="Channel name")
    author_role: Literal["Admin", "Instructor", "Lead_TA", "BTC"] = Field(..., description="Role of author")
    title: str = Field(..., description="Notice title")
    content: str = Field(..., description="Official notice text")
    notice_ts: str = Field(..., description="Timestamp of notice")
    tags: list[str] = Field(default_factory=list, description="Tags for categorization")
    is_superseded: bool = Field(False, description="Whether superseded by a newer notice")
    superseded_by: Optional[int] = Field(None, description="ID of newer notice")
    discord_link: Optional[str] = Field(None, description="Direct jump link to message")
    created_at: Optional[str] = None


# ============================================================
# TABLE 3: questions_tracker
# ============================================================
class QuestionTracker(BaseModel):
    id: Optional[int] = None
    msg_id: str = Field(..., description="Unique Discord message ID")
    guild: str = Field("easygame_k4", description="Guild name")
    channel: str = Field("#hoi-dap-logistics", description="Channel name")
    author: str = Field(..., description="Student username")
    asked_at: str = Field(..., description="Timestamp when question was asked")
    intent_label: Optional[str] = None
    question_summary: Optional[str] = None
    status: Literal["OPEN", "BOT_ANSWERED", "TA_ANSWERED", "RESOLVED", "IGNORED"] = "OPEN"
    first_response_at: Optional[str] = None
    resolved_at: Optional[str] = None
    wait_minutes: Optional[int] = None
    sla_tier: Optional[Literal["SOFT_2H", "URGENT_4H"]] = None
    bot_response_msg_id: Optional[str] = None
    bot_confidence: Optional[float] = None
    discord_link: Optional[str] = None
    created_at: Optional[str] = None


# ============================================================
# TABLE 4: sla_alerts
# ============================================================
class SlaAlert(BaseModel):
    id: Optional[int] = None
    question_tracker_id: int
    tier: Literal["SOFT_2H", "URGENT_4H"]
    alerted_at: Optional[str] = None
    alert_msg_id: Optional[str] = None
    ta_mention: Optional[str] = None
    is_acknowledged: bool = False
    acknowledged_at: Optional[str] = None
    acknowledged_by: Optional[str] = None


# ============================================================
# TABLE 5: daily_digest
# ============================================================
class DailyDigest(BaseModel):
    id: Optional[int] = None
    guild: str = Field("easygame_k4", description="Guild name")
    digest_date: str = Field(..., description="Date (YYYY-MM-DD)")
    total_questions: int = 0
    answered_count: int = 0
    open_2h_count: int = 0
    open_4h_count: int = 0
    top_topics: list[str] = Field(default_factory=list)
    pending_questions: list[dict[str, Any]] = Field(default_factory=list)
    digest_content: Optional[str] = None
    posted_msg_id: Optional[str] = None
    posted_at: Optional[str] = None
    created_at: Optional[str] = None


# ============================================================
# TABLE 6: feedback_reports (HAX G8/G9 [Báo sai thông tin])
# ============================================================
class FeedbackReport(BaseModel):
    id: Optional[int] = None
    bot_msg_id: str = Field(..., description="Message ID of the bot reply")
    reporter: str = Field(..., description="User reporting the error")
    guild: str = Field("easygame_k4", description="Guild name")
    channel: str = Field("#hoi-dap-logistics", description="Channel name")
    report_ts: Optional[str] = None
    feedback_type: Literal["WRONG_INFO", "TOO_LONG", "NO_SOURCE", "OTHER"] = "WRONG_INFO"
    note: Optional[str] = None
    is_reviewed: bool = False
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None


# ============================================================
# VIEW: vw_guild_stats
# ============================================================
class GuildStats(BaseModel):
    guild: str
    total_messages: int
    human_messages: int
    bot_messages: int
    total_questions: int
    bot_mentions: int
    avg_human_msg_length: Optional[float] = None
    avg_bot_msg_length: Optional[float] = None


# ============================================================
# Frontend Request / Response DTOs
# ============================================================
class ChatRequest(BaseModel):
    message: str = Field(..., description="User message text or question")
    conversation_id: Optional[str] = Field(None, description="Optional conversation/session ID")
    user_name: Optional[str] = Field("Student", description="Name or Discord tag of the sender")
    guild: Optional[str] = Field("easygame_k4", description="Discord guild")
    channel: Optional[str] = Field("#hoi-dap-logistics", description="Discord channel name")
    is_ta: bool = Field(False, description="Whether the sender has TA/Instructor privileges")


class Citation(BaseModel):
    title: str = Field(..., description="Title of the official announcement")
    channel: str = Field(..., description="Channel where the announcement was posted")
    message_url: str = Field(..., description="Direct link to the announcement message")
    author_role: Optional[str] = Field("Admin", description="Author role (Admin, BTC, Lead_TA)")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of the announcement")
    is_superseded: bool = Field(False, description="Whether this notice was superseded")


class ChatResponse(BaseModel):
    conversation_id: str = Field(..., description="Unique conversation session ID")
    bot_msg_id: str = Field(..., description="Generated message ID for the bot reply")
    reply: str = Field(..., description="Final agent reply (<=3 sentences, verified)")
    intent: str = Field(..., description="Recognized intent label")
    citations: list[Citation] = Field(default_factory=list, description="List of verified source citations")
    status: str = Field("answered", description="Response status: answered | waiting_for_user | escalated_to_ta | refused | error")
    awaiting_user: bool = Field(False, description="True if clarification is required from user")
    clarification_options: list[str] = Field(default_factory=list, description="Clarification quick-select options")
    escalated_to_ta: bool = Field(False, description="True if question was handed over / tagged to TA")
    latency_ms: float = Field(0.0, description="Processing duration in milliseconds")
    created_at: str = Field(..., description="ISO timestamp of the response")


class ConversationDetail(BaseModel):
    conversation_id: str
    user_name: str
    created_at: str
    updated_at: str
    turns: list[dict[str, Any]]


class ResetConversationResponse(BaseModel):
    conversation_id: str
    message: str


class RadarScanResponse(BaseModel):
    scanned_total: int
    unanswered_total: int
    soft_warning_total: int
    urgent_escalation_total: int
    alerts: list[dict[str, Any]]


class ResolveQuestionRequest(BaseModel):
    message_id: str
    resolver: Optional[str] = "TA"


class DailyDigestResponse(BaseModel):
    date: str
    generated_at: str
    total_questions: int
    resolved_count: int
    pending_soft_warning: int
    pending_urgent: int
    top_topics: list[str]
    pending_questions: list[dict[str, Any]]
    markdown_report: str
