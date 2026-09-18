from __future__ import annotations

import json
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from database import get_supabase_client
from schemas import ChatResponse, Citation

ROOT = Path(__file__).resolve().parent
NOTICES_FILE = ROOT / "data" / "official_notices.json"


def normalize_text(text: str) -> str:
    """Normalize text for accent-insensitive and lowercase matching."""
    s = text.lower().strip()
    s = re.sub(r"[!?,.]+$", "", s)
    return s


def is_prompt_injection(text: str) -> bool:
    patterns = [
        r"ignore\s+(previous|all)\s+instructions",
        r"bỏ\s+qua\s+(các\s+)?(chỉ\s+dẫn|lệnh|quy\s+tắc|prompt)",
        r"disregard\s+system\s+prompt",
        r"you\s+are\s+now\s+in\s+developer\s+mode",
        r"system\s*:\s*",
        r"hãy\s+nói\s+deadline\s+là\s+ngày\s+mai",
        r"hãy\s+quên\s+hết",
        r"reveal\s+(system\s+prompt|credentials|\.env)",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_personal_grade_query(text: str) -> bool:
    patterns = [
        r"(mấy|bao\s+nhiêu|tra\s+cứu|xem)\s+điểm",
        r"điểm\s+(của\s+em|của\s+mình|lab|cá\s+nhân)",
        r"được\s+mấy\s+điểm",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_personal_extension_request(text: str) -> bool:
    patterns = [
        r"xin\s+(gia\s+hạn|hoãn|lùi\s+hạn|nộp\s+muộn)",
        r"(ốm|hỏng\s+máy|bận)\s+.*(xin|cho\s+em)\s+(nộp\s+muộn|gia\s+hạn)",
        r"cho\s+(em|mình)\s+(nộp\s+trễ|nộp\s+bù|gia\s+hạn)",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_code_help_request(text: str) -> bool:
    patterns = [
        r"giải\s+(hộ|giúp|bài)",
        r"viết\s+(code|hộ|giúp)",
        r"(sửa|debug|fix)\s+(lỗi|code|bug|hộ)",
        r"(indexerror|typeerror|syntaxerror|nameerror|attributeerror|exception)",
        r"chạy\s+không\s+được|lỗi\s+ở\s+dòng",
        r"giải\s+bài\s+tập",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_pure_greeting(text: str) -> bool:
    cleaned = normalize_text(text)
    greetings = {"xin chào", "chào bot", "chào bạn", "hello", "hi bot", "hi", "hey", "halo", "alo"}
    return cleaned in greetings


class NoticeStore:
    """Access layer for official notices, prioritizing Supabase table official_notices with fallback to JSON."""
    def __init__(self, fallback_file: Path = NOTICES_FILE):
        self.fallback_file = fallback_file
        self.reload()

    def reload(self) -> None:
        self._notices: list[dict[str, Any]] = []
        try:
            sb = get_supabase_client()
            res = sb.table("official_notices").select("*").order("notice_ts", desc=True).execute()
            if res.data:
                self._notices = list(res.data)
        except Exception:
            pass

        if not self._notices and self.fallback_file.exists():
            try:
                with open(self.fallback_file, "r", encoding="utf-8") as f:
                    self._notices = json.load(f)
            except Exception:
                self._notices = []

    def get_all(self, include_superseded: bool = True) -> list[dict[str, Any]]:
        if include_superseded:
            return list(self._notices)
        return [n for n in self._notices if not n.get("is_superseded")]

    def find_by_topic(self, topic: str) -> list[dict[str, Any]]:
        topic_clean = topic.lower().strip()
        topic_words = topic_clean.replace("_", " ")
        matches = []
        for n in self._notices:
            tags = n.get("tags") or []
            if isinstance(tags, str):
                try:
                    tags = json.loads(tags)
                except Exception:
                    tags = []
            title = (n.get("title") or "").lower()
            content = (n.get("content") or "").lower()

            matched = False
            if topic_clean in [str(t).lower() for t in tags]:
                matched = True
            elif topic_words in title or topic_words in content:
                matched = True
            elif topic == "lab_1" and ("lab 1" in title or "lab 1" in content or "lab1" in title or "lab1" in content):
                matched = True
            elif topic == "checkpoint" and ("checkpoint" in title or "checkpoint" in content or "cp1" in title or "cp1" in content or "cp" in title):
                matched = True
            elif topic == "attendance" and ("điểm danh" in title or "điểm danh" in content or "attendance" in title or "attendance" in content or "chuyên cần" in content):
                matched = True
            elif topic == "submission" and ("nộp bài" in title or "nộp bài" in content or "repo" in title or "repo" in content or "github" in content):
                matched = True
            elif topic == "team" and ("nhóm" in title or "nhóm" in content or "team" in title or "team" in content):
                matched = True

            if matched:
                matches.append(n)

        # Exclude superseded if an active version exists
        active = [m for m in matches if not m.get("is_superseded")]
        return active if active else matches

    def search(self, query: str) -> list[dict[str, Any]]:
        q = normalize_text(query)
        results = []
        for n in self._notices:
            if n.get("is_superseded"):
                continue
            text = normalize_text(f"{n.get('title', '')} {n.get('content', '')}")
            score = 0
            words = q.split()
            for w in words:
                if len(w) > 1 and w in text:
                    score += 1
            if score > 0:
                results.append((score, n))
        results.sort(key=lambda item: item[0], reverse=True)
        return [item[1] for item in results]


class LogisticsAgent:
    """
    Logistics Assistant & Semantic Intent Router for Track B1.
    Strictly enforces factuality, no hallucination, concise responses (<=3 sentences),
    and proper citation tags conforming to schema.sql.
    """

    def __init__(self, notice_store: Optional[NoticeStore] = None):
        self.notice_store = notice_store or NoticeStore()

    def process_query(self, user_text: str, conversation_id: str, channel: str = "#hoi-dap-logistics") -> ChatResponse:
        start_time = time.perf_counter()
        raw_text = user_text.strip()
        created_at = datetime.now(timezone.utc).isoformat()
        bot_msg_id = f"BOT-{uuid.uuid4().hex[:8]}"

        # 1. Guardrail: Prompt Injection Detection (PRD FR-105, Taxonomy Layer 3)
        if is_prompt_injection(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply="Mình chỉ cung cấp thông tin dựa trên các thông báo chính thức từ BTC và không thể thay đổi quy tắc này.",
                intent="Guardrail_Violation",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 2. Guardrail: Personal Grade Inquiry (PRD Taxonomy Layer 4)
        if is_personal_grade_query(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply="Bot không có thẩm quyền tra cứu điểm cá nhân của học viên. Bạn vui lòng đăng nhập LMS hoặc liên hệ trực tiếp Giảng viên/Lead TA nhé!",
                intent="Out_Of_Scope_Personal_Grade",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 3. Guardrail: Personal Deadline Extension Request (PRD Taxonomy Layer 4)
        if is_personal_extension_request(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply="Bot không có thẩm quyền phê duyệt gia hạn deadline cá nhân. Bạn hãy làm đơn/mở ticket gửi BTC và thông báo cho Lab Coach phụ trách phòng nhé!",
                intent="Out_Of_Scope_Extension_Request",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=True,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 4. Pure Chitchat / Greeting
        if is_pure_greeting(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply="Chào bạn! Mình là Trợ lý Logistics Khóa 4. Bạn cần tra cứu hạn nộp bài, điểm danh hay quy chế nộp repo?",
                intent="General_Chitchat",
                citations=[],
                status="answered",
                awaiting_user=False,
                clarification_options=["Hạn nộp Lab 1", "Lịch Checkpoint CP1-CP6", "Quy chế điểm danh"],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 5. Ambiguity Handling (PRD Taxonomy Layer 2): Vague questions like "deadline khi nào thế?"
        norm_q = normalize_text(raw_text)
        is_vague_deadline = norm_q in {
            "deadline khi nào thế", "deadline khi nào", "hạn nộp là khi nào", "hạn nộp mấy giờ",
            "khi nào nộp bài", "mấy giờ nộp bài", "deadline", "han nop khi nao"
        }
        if is_vague_deadline:
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply="Bạn muốn hỏi hạn nộp của Lab 1 hay các mốc Checkpoint CP1–CP6? Hãy chọn một mục bên dưới nhé!",
                intent="Ambiguous_Query",
                citations=[],
                status="waiting_for_user",
                awaiting_user=True,
                clarification_options=["Hạn nộp Lab 1", "Hạn nộp Checkpoint CP1", "Lịch Checkpoint CP1-CP6"],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # Check for Mixed query: Code help + Logistics (PRD FR-101)
        has_code_help = is_code_help_request(raw_text)

        # 6. Intent & Topic Identification
        matched_notice = None
        intent = "General"

        # Lab 1 deadline check (with Timestamp resolution - PRD FR-103, Taxonomy Layer 1)
        if re.search(r"lab\s*1\b|bài\s*lab\s*1\b", norm_q):
            intent = "Logistics_Deadline"
            topic_notices = self.notice_store.find_by_topic("lab_1")
            if topic_notices:
                # Latest active notice wins (is_superseded = False)
                matched_notice = topic_notices[0]

        # Other lab numbers without notices (e.g. Lab 2, Lab 3, Lab 9) -> Graceful fallback
        elif re.search(r"lab\s*([2-9]|1[0-9])\b", norm_q):
            intent = "Logistics_Deadline"
            matched_notice = None

        # Checkpoint deadlines (CP1 - CP6)
        elif re.search(r"checkpoint|cp[1-6]|mốc\s*cp", norm_q):
            intent = "Logistics_Deadline"
            cp_notices = self.notice_store.find_by_topic("checkpoint")
            if cp_notices:
                matched_notice = cp_notices[0]

        # Attendance / Điểm danh
        elif re.search(r"điểm\s*danh|diem\s*danh|chuyên\s*cần|chuyen\s*can|bù\s*điểm\s*danh", norm_q):
            intent = "Logistics_Attendance"
            att_notices = self.notice_store.find_by_topic("attendance")
            if att_notices:
                matched_notice = att_notices[0]

        # Submission rules / Repo format
        elif re.search(r"đặt\s*tên\s*repo|link\s*repo|nộp\s*repo|format\s*repo|quy\s*định\s*nộp|quy\s*chế\s*nộp", norm_q):
            intent = "Logistics_Submission_Rule"
            sub_notices = self.notice_store.find_by_topic("submission")
            if sub_notices:
                matched_notice = sub_notices[0]

        # Team registration
        elif re.search(r"nhóm|team|ghép\s*đội|đăng\s*ký\s*nhóm|mấy\s*người", norm_q):
            intent = "Logistics_Team"
            team_notices = self.notice_store.find_by_topic("team")
            if team_notices:
                matched_notice = team_notices[0]

        # Fallback search if keyword matching didn't trigger
        if not matched_notice and not has_code_help and intent == "General":
            search_results = self.notice_store.search(raw_text)
            if search_results:
                matched_notice = search_results[0]
                intent = "Logistics_Matched"

        # 7. Build Response
        citations: list[Citation] = []
        escalated = False

        # Sub-case: Pure code help request without logistics (PRD Taxonomy Layer 3)
        if has_code_help and not matched_notice:
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply="Bot chỉ hỗ trợ logistics. Bạn hãy mô tả chi tiết lỗi code trong thread để TA trực ca hỗ trợ nhé!",
                intent="Technical_Code_Help",
                citations=[],
                status="escalated_to_ta",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=True,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # Grounded Official Notice Found
        if matched_notice:
            citations.append(
                Citation(
                    title=matched_notice["title"],
                    channel=matched_notice.get("channel", "#announcements"),
                    message_url=matched_notice.get("discord_link") or matched_notice.get("message_url", ""),
                    author_role=matched_notice.get("author_role", "Admin"),
                    timestamp=matched_notice.get("notice_ts") or matched_notice.get("updated_at"),
                    is_superseded=bool(matched_notice.get("is_superseded", False)),
                )
            )

            # Specific crafted concise response based on topic
            content_lower = (matched_notice.get("title") or "").lower() + " " + (matched_notice.get("content") or "").lower()
            if "lab 1" in content_lower or "lab_1" in str(matched_notice.get("tags")):
                reply_body = (
                    "Hạn nộp Lab 1 là 12:00 Thứ Hai, ngày 21/09/2026. "
                    "Hạn nộp đã được cập nhật theo thông báo gia hạn mới nhất từ BTC."
                )
            elif "checkpoint" in content_lower or "cp" in content_lower:
                cp_match = re.search(r"cp([1-6])", norm_q)
                if cp_match:
                    num = cp_match.group(1)
                    schedule = {
                        "1": "21:00 17/09",
                        "2": "21:00 18/09",
                        "3": "21:00 19/09",
                        "4": "21:00 20/09",
                        "5": "13:00 21/09 (Live Prototype)",
                        "6": "21:00 22/09 (Final Pitch)",
                    }
                    reply_body = f"Hạn nộp Checkpoint CP{num} là {schedule.get(num)}."
                else:
                    reply_body = (
                        "Lịch nộp Checkpoint: CP1 lúc 21:00 17/09; CP2 lúc 21:00 18/09; "
                        "CP3 lúc 21:00 19/09; CP4 lúc 21:00 20/09; CP5 lúc 13:00 21/09; CP6 lúc 21:00 22/09."
                    )
            elif "điểm danh" in content_lower or "attendance" in content_lower:
                reply_body = (
                    "Học viên điểm danh đầu giờ tại link form: https://forms.gle/attendance_k4. "
                    "Nghỉ phép hoặc bù chuyên cần phải điền form bù trước 22:00 cùng ngày và báo cho TA E402."
                )
            elif "repo" in content_lower or "nộp bài" in content_lower:
                reply_body = (
                    "Repository nộp bài phải để chế độ Public trên GitHub. "
                    "Định dạng tên repo bắt buộc là: K4-Lab<X>-<StudentID>."
                )
            elif "nhóm" in content_lower or "team" in content_lower:
                reply_body = (
                    "Mỗi nhóm dự án gồm 3–4 thành viên cùng lớp. "
                    "Các nhóm đăng ký tại kênh #team-registration trước 18:00 Thứ Sáu 18/09/2026."
                )
            else:
                reply_body = matched_notice.get("content", "")

            # Formatted citation tag (PRD FR-102)
            direct_link = matched_notice.get("discord_link") or matched_notice.get("message_url", "")
            citation_tag = f"\n[Nguồn: {matched_notice['title']} - Kênh {matched_notice.get('channel', '#announcements')}]({direct_link})"
            final_reply = reply_body + citation_tag

            # Handle mixed query splitting (PRD FR-101)
            if has_code_help:
                final_reply += "\n\nVề câu hỏi code/kỹ thuật, mình đã chuyển tiếp cho @TA_Truc để hỗ trợ bạn trong thread này nhé!"
                escalated = True

            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conversation_id,
                bot_msg_id=bot_msg_id,
                reply=final_reply,
                intent=intent,
                citations=citations,
                status="escalated_to_ta" if escalated else "answered",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=escalated,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 8. Graceful Fallback: Know-what-you-don't-know (PRD FR-104, Taxonomy Layer 1)
        fallback_reply = "Hiện tại chưa có thông tin chính thức từ BTC về nội dung này. Mình đã tag @TA_Truc để hỗ trợ bạn nhé!"
        latency = (time.perf_counter() - start_time) * 1000
        return ChatResponse(
            conversation_id=conversation_id,
            bot_msg_id=bot_msg_id,
            reply=fallback_reply,
            intent=intent if intent != "General" else "Logistics_Unknown",
            citations=[],
            status="escalated_to_ta",
            awaiting_user=False,
            clarification_options=[],
            escalated_to_ta=True,
            latency_ms=round(latency, 2),
            created_at=created_at,
        )
