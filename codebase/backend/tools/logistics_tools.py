from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from logistics_agent import NoticeStore
from radar_service import RadarService

_notice_store = NoticeStore()
_radar_service = RadarService()


def lookup_official_notices(topic: Optional[str] = None, query: Optional[str] = None) -> dict[str, Any]:
    """
    Search and retrieve official verified announcements.
    Automatically prioritizes active notices with latest timestamps.
    """
    matches = []
    if topic:
        matches = _notice_store.find_by_topic(topic)
    if not matches and query:
        matches = _notice_store.search(query)
    if not matches and not topic and not query:
        matches = _notice_store.get_all(include_superseded=False)

    return {
        "status": "success",
        "count": len(matches),
        "notices": [
            {
                "id": m.get("id"),
                "title": m.get("title"),
                "topic": m.get("topic"),
                "channel": m.get("channel", "#announcements"),
                "author_role": m.get("author_role", "Admin"),
                "notice_ts": m.get("notice_ts") or m.get("created_at"),
                "discord_link": m.get("discord_link") or m.get("message_url"),
                "is_superseded": bool(m.get("is_superseded", False)),
                "content": m.get("content"),
            }
            for m in matches
        ],
    }


def clarify_query(question: str, options: list[str]) -> dict[str, Any]:
    """
    Ask user for clarification when the query is ambiguous or entity-deficient.
    """
    return {
        "status": "waiting_for_user",
        "clarification_needed": True,
        "question": question,
        "options": options,
    }


def escalate_to_ta(
    student_name: str,
    issue_summary: str,
    channel: str = "#hoi-dap-logistics",
    is_urgent: bool = False,
) -> dict[str, Any]:
    """
    Escalate ungrounded or technical debugging inquiries to on-duty Lab Coach / TA.
    """
    return {
        "status": "escalated",
        "assigned_to": "@TA_Truc" if not is_urgent else "@Coach_OnDuty",
        "student": student_name,
        "channel": channel,
        "summary": issue_summary,
        "is_urgent": is_urgent,
        "message": f"Yêu cầu đã được chuyển tới @TA_Truc trên kênh {channel}.",
    }


def scan_unanswered_radar(guild: str = "easygame_k4") -> dict[str, Any]:
    """
    Scan unanswered queries and compute SLA tiers.
    """
    res = _radar_service.scan()
    return {
        "scanned_total": res.scanned_total,
        "unanswered_total": res.unanswered_total,
        "soft_warning_total": res.soft_warning_total,
        "urgent_escalation_total": res.urgent_escalation_total,
        "alerts": res.alerts,
    }


def generate_daily_digest(guild: str = "easygame_k4") -> dict[str, Any]:
    """
    Generate clean daily digest for TAs.
    """
    digest = _radar_service.generate_daily_digest(guild)
    return {
        "date": digest.date,
        "generated_at": digest.generated_at,
        "total_questions": digest.total_questions,
        "resolved_count": digest.resolved_count,
        "pending_soft_warning": digest.pending_soft_warning,
        "pending_urgent": digest.pending_urgent,
        "top_topics": digest.top_topics,
        "markdown_report": digest.markdown_report,
    }


def resolve_question(message_id: str, resolver: str = "TA") -> dict[str, Any]:
    """
    Mark an overdue question as resolved.
    """
    success = _radar_service.resolve_question(message_id, resolver)
    return {
        "message_id": message_id,
        "resolved": success,
        "resolver": resolver,
    }
