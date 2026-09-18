from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database import get_supabase_client
from logistics_agent import LogisticsAgent, NoticeStore
from radar_service import RadarService
from schemas import (
    ChatRequest,
    ChatResponse,
    ConversationDetail,
    DailyDigestResponse,
    FeedbackReport,
    GuildStats,
    OfficialNotice,
    RadarScanResponse,
    ResetConversationResponse,
    ResolveQuestionRequest,
)

app = FastAPI(
    title="EasyGame Discord Assistant API",
    version="1.0.0",
    description="Backend REST API connected to Supabase PostgreSQL for Track B: Trợ lý Logistics Xác thực & Radar Cứu kẹt Discord",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core services
notice_store = NoticeStore()
agent = LogisticsAgent(notice_store)
radar_service = RadarService()

# In-memory conversation state store
conversations: dict[str, dict[str, Any]] = {}


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health", summary="Health check")
@app.get("/api/health", summary="Health check")
def health_check() -> dict[str, Any]:
    db_status = "connected"
    try:
        sb = get_supabase_client()
        sb.table("official_notices").select("id", count="exact").limit(1).execute()
    except Exception as e:
        db_status = f"fallback_local: {e}"

    return {
        "status": "ok",
        "service": "EasyGame Discord Assistant",
        "track": "Track B (B1 & B2)",
        "schema_version": "1.0",
        "database": f"Supabase PostgreSQL ({db_status})",
        "notices_count": len(notice_store.get_all()),
        "active_conversations": len(conversations),
        "timestamp": now_utc_iso(),
    }


# ============================================================
# ENDPOINT: Chat & Agent Processing (FR-101 .. FR-105)
# Stores into discord_messages and questions_tracker
# ============================================================
@app.post("/api/chat", response_model=ChatResponse, summary="Send message to agent")
def chat_endpoint(request: ChatRequest) -> ChatResponse:
    conv_id = request.conversation_id or uuid.uuid4().hex
    guild = request.guild or "easygame_k4"
    channel = request.channel or "#hoi-dap-logistics"
    user_msg_id = f"MSG-{uuid.uuid4().hex[:8]}"

    if conv_id not in conversations:
        conversations[conv_id] = {
            "conversation_id": conv_id,
            "user_name": request.user_name or "Student",
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso(),
            "turns": [],
        }

    conv = conversations[conv_id]

    # Process query through agent logic
    response = agent.process_query(
        user_text=request.message,
        conversation_id=conv_id,
        channel=channel,
    )

    # Persist user message and bot response to Supabase
    try:
        sb = get_supabase_client()
        # 1. Insert user message
        sb.table("discord_messages").insert({
            "msg_id": user_msg_id,
            "guild": guild,
            "channel": channel,
            "author": request.user_name or "Student",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": response.created_at,
            "mentions_bot": True,
            "n_chars": len(request.message),
            "content": request.message,
            "intent_label": response.intent,
        }).execute()

        # 2. Insert bot response
        sb.table("discord_messages").insert({
            "msg_id": response.bot_msg_id,
            "guild": guild,
            "channel": channel,
            "author": "EasyGameBot",
            "is_bot": True,
            "msg_type": "reply",
            "created_at_vn": response.created_at,
            "reply_to": user_msg_id,
            "mentions_bot": False,
            "n_chars": len(response.reply),
            "content": response.reply,
            "intent_label": response.intent,
        }).execute()

        # 3. If user message is a question or escalated, track in questions_tracker
        if "?" in request.message or response.escalated_to_ta:
            status = "BOT_ANSWERED" if not response.escalated_to_ta else "OPEN"
            sb.table("questions_tracker").upsert({
                "msg_id": user_msg_id,
                "guild": guild,
                "channel": channel,
                "author": request.user_name or "Student",
                "asked_at": response.created_at,
                "intent_label": response.intent,
                "question_summary": request.message[:100],
                "status": status,
                "first_response_at": response.created_at,
                "bot_response_msg_id": response.bot_msg_id,
                "bot_confidence": 0.95 if response.status == "answered" else 0.50,
                "discord_link": f"https://discord.com/channels/1234567890/9876543210/{user_msg_id}",
            }, on_conflict="msg_id").execute()
    except Exception:
        pass

    # Save to in-memory session turns
    turn_record = {
        "turn_index": len(conv["turns"]) + 1,
        "user_msg_id": user_msg_id,
        "bot_msg_id": response.bot_msg_id,
        "user_message": request.message,
        "assistant_reply": response.reply,
        "intent": response.intent,
        "status": response.status,
        "citations": [c.model_dump() for c in response.citations],
        "awaiting_user": response.awaiting_user,
        "escalated_to_ta": response.escalated_to_ta,
        "latency_ms": response.latency_ms,
        "timestamp": response.created_at,
    }
    conv["turns"].append(turn_record)
    conv["updated_at"] = response.created_at

    return response


@app.get("/api/conversations/{conversation_id}", response_model=ConversationDetail, summary="Get conversation history")
def get_conversation(conversation_id: str) -> ConversationDetail:
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    data = conversations[conversation_id]
    return ConversationDetail(
        conversation_id=data["conversation_id"],
        user_name=data.get("user_name", "Student"),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
        turns=data["turns"],
    )


@app.post("/api/conversations/reset", response_model=ResetConversationResponse, summary="Reset conversation")
def reset_conversation(conversation_id: str | None = None) -> ResetConversationResponse:
    new_id = conversation_id or uuid.uuid4().hex
    conversations[new_id] = {
        "conversation_id": new_id,
        "user_name": "Student",
        "created_at": now_utc_iso(),
        "updated_at": now_utc_iso(),
        "turns": [],
    }
    return ResetConversationResponse(
        conversation_id=new_id,
        message="Conversation session created/reset successfully.",
    )


# ============================================================
# ENDPOINT: official_notices (Table 2)
# ============================================================
@app.get("/api/notices", response_model=list[OfficialNotice], summary="List verified announcements")
def list_notices() -> list[OfficialNotice]:
    try:
        sb = get_supabase_client()
        res = sb.table("official_notices").select("*").order("notice_ts", desc=True).execute()
        rows = res.data or []
    except Exception:
        rows = notice_store.get_all(include_superseded=True)

    result = []
    for d in rows:
        item = dict(d)
        tags_raw = item.get("tags")
        if tags_raw is None:
            item["tags"] = []
        elif isinstance(tags_raw, str):
            try:
                item["tags"] = json.loads(tags_raw)
            except Exception:
                item["tags"] = []
        elif isinstance(tags_raw, list):
            item["tags"] = tags_raw
        else:
            item["tags"] = []

        item["is_superseded"] = bool(item.get("is_superseded", False))
        result.append(OfficialNotice(**item))
    return result


# ============================================================
# ENDPOINT: feedback_reports (Table 6: HAX G8/G9 [Báo sai thông tin])
# ============================================================
@app.post("/api/feedback", summary="Submit feedback / report wrong info")
def submit_feedback(report: FeedbackReport) -> dict[str, Any]:
    report_id = None
    try:
        sb = get_supabase_client()
        res = sb.table("feedback_reports").insert({
            "bot_msg_id": report.bot_msg_id,
            "reporter": report.reporter,
            "guild": report.guild,
            "channel": report.channel,
            "feedback_type": report.feedback_type,
            "note": report.note,
        }).execute()
        if res.data:
            report_id = res.data[0].get("id")
    except Exception:
        pass
    return {"status": "received", "report_id": report_id, "message": "Cảm ơn bạn đã phản hồi! Đội ngũ TA sẽ rà soát ngay."}


@app.get("/api/feedback", response_model=list[dict[str, Any]], summary="List feedback reports")
def list_feedback() -> list[dict[str, Any]]:
    try:
        sb = get_supabase_client()
        res = sb.table("feedback_reports").select("*").order("report_ts", desc=True).execute()
        return res.data or []
    except Exception:
        return []


# ============================================================
# ENDPOINT: Stats (View: vw_guild_stats)
# ============================================================
@app.get("/api/stats", response_model=list[GuildStats], summary="Get guild statistics")
def get_guild_stats() -> list[GuildStats]:
    try:
        sb = get_supabase_client()
        res = sb.table("vw_guild_stats").select("*").execute()
        return [GuildStats(**r) for r in (res.data or [])]
    except Exception:
        # Fallback default statistics
        return [
            GuildStats(
                guild="K4-L2-3",
                total_messages=1092,
                human_messages=779,
                bot_messages=313,
                total_questions=107,
                bot_mentions=84,
                avg_human_msg_length=52.4,
                avg_bot_msg_length=182.1,
            )
        ]


# ============================================================
# ENDPOINTS: Track B2 Radar, SLA Alerts & Daily Digest
# ============================================================
@app.post("/api/radar/questions", summary="Ingest question into Radar")
def ingest_question(
    msg_id: str,
    author: str,
    content: str,
    channel: str = "#hoi-dap-logistics",
    guild: str = "easygame_k4",
    asked_at: Optional[str] = None,
    intent_label: Optional[str] = None,
) -> dict[str, Any]:
    radar_service.add_or_update_question(
        msg_id=msg_id, author=author, channel=channel, content=content,
        guild=guild, asked_at=asked_at, intent_label=intent_label
    )
    return {"status": "ok", "msg_id": msg_id}


@app.post("/api/radar/scan", response_model=RadarScanResponse, summary="Scan unanswered questions and update SLAs")
@app.get("/api/radar/scan", response_model=RadarScanResponse, summary="Scan unanswered questions and update SLAs")
def scan_radar() -> RadarScanResponse:
    return radar_service.scan()


@app.get("/api/radar/alerts", response_model=list[dict[str, Any]], summary="Get active overdue questions")
def get_radar_alerts() -> list[dict[str, Any]]:
    scan_res = radar_service.scan()
    return scan_res.alerts


@app.post("/api/radar/resolve", summary="Mark question as resolved")
def resolve_question_endpoint(req: ResolveQuestionRequest) -> dict[str, Any]:
    success = radar_service.resolve_question(req.message_id, req.resolver or "TA")
    if not success:
        raise HTTPException(status_code=404, detail="Question message_id not found or already resolved")
    return {"status": "resolved", "message_id": req.message_id}


@app.get("/api/radar/digest", response_model=DailyDigestResponse, summary="Get clean daily digest (FR-204)")
@app.post("/api/radar/digest", response_model=DailyDigestResponse, summary="Generate clean daily digest (FR-204)")
def get_daily_digest(guild: str = "easygame_k4") -> DailyDigestResponse:
    return radar_service.generate_daily_digest(guild)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
