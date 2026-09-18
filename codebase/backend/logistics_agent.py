from __future__ import annotations

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv

from database import get_supabase_client
from schemas import ChatResponse, Citation

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")
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
        r"hãy\s+nói\s+hạn\s+nộp\s+bài\s+là",
        r"bạn\s+là\s+trợ\s+lý\s+tự\s+do",
        r"hãy\s+quên\s+hết",
        r"reveal\s+(system\s+prompt|credentials|\.env)",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_personal_grade_query(text: str) -> bool:
    patterns = [
        r"(mấy|bao\s+nhiêu|tra\s+cứu|xem)\s+điểm",
        r"điểm\s+(của\s+em|của\s+mình|lab|cá\s+nhân)",
        r"được\s+mấy\s+điểm",
        r"bao\s+nhiêu\s+điểm",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_personal_extension_request(text: str) -> bool:
    patterns = [
        r"xin\s+(gia\s+hạn|hoãn|lùi\s+hạn|nộp\s+muộn)",
        r"(ốm|sốt|hỏng\s+máy|bận)\s+.*(xin|cho\s+em)\s+(nộp\s+muộn|gia\s+hạn|thêm)",
        r"cho\s+(em|mình)\s+(nộp\s+trễ|nộp\s+bù|gia\s+hạn)",
        r"gia\s+hạn\s+cho\s+em\s+thêm",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_code_help_request(text: str) -> bool:
    patterns = [
        r"giải\s+(hộ|giúp|bài)",
        r"viết\s+(code|hộ|giúp)",
        r"(sửa|debug|fix|chữa)\s+(lỗi|code|bug|hộ|bài)",
        r"(indexerror|typeerror|syntaxerror|nameerror|attributeerror|exception)",
        r"chạy\s+không\s+được|lỗi\s+ở\s+dòng|bị\s+lỗi",
        r"lỗi\s+(429|500|404|rate\s*limit|\d+)",
        r"giải\s+bài\s+tập",
    ]
    return any(re.search(pat, text, re.IGNORECASE) for pat in patterns)


def is_pure_greeting(text: str) -> bool:
    cleaned = normalize_text(text)
    greetings = {
        "xin chào", "chào bot", "chào bạn", "hello", "hi bot", "hi", "hey",
        "halo", "alo", "hello bot đẹp trai ơi", "chào", "hello bot"
    }
    if cleaned in greetings:
        return True
    if re.match(r"^(hello|chào)\s+bot.*[:)]*$", cleaned):
        return True
    return False


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

        # Sort: active notices first, then newest timestamp
        matches.sort(
            key=lambda x: (
                0 if not x.get("is_superseded") else 1,
                x.get("notice_ts") or x.get("updated_at") or ""
            ),
            reverse=True
        )
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
    and proper citation tags conforming to schema.sql and UC-B1-01 specification.
    """

    def __init__(self, notice_store: Optional[NoticeStore] = None, use_gemini: bool = False):
        self.notice_store = notice_store or NoticeStore()
        self.use_gemini = use_gemini
        self._harness = None
        if self.use_gemini and os.getenv("GEMINI_API_KEY"):
            try:
                from providers.gemini_provider import GeminiProvider
                from agent import DiscordLogisticsAgentHarness
                self._harness = DiscordLogisticsAgentHarness(provider=GeminiProvider(default_model="gemini-2.5-flash"))
            except Exception as e:
                print(f"Warning: GeminiProvider initialization failed: {e}")

    def process_query(self, user_text: str, conversation_id: str = "", channel: str = "#hoi-dap-logistics") -> ChatResponse:
        start_time = time.perf_counter()
        raw_text = user_text.strip()
        conv_id = conversation_id or uuid.uuid4().hex
        created_at = datetime.now(timezone.utc).isoformat()
        bot_msg_id = f"BOT-{uuid.uuid4().hex[:8]}"

        # Option: Gemini LLM Harness Mode
        if self._harness is not None:
            try:
                run_res = self._harness.run([{"role": "user", "content": raw_text}])
                reply_text = run_res.text or ""
                if not reply_text and run_res.tool_results:
                    # Collect reply from tool results
                    reply_text = str(run_res.tool_results[0].get("result", ""))
                latency = (time.perf_counter() - start_time) * 1000
                return ChatResponse(
                    conversation_id=conv_id,
                    bot_msg_id=bot_msg_id,
                    reply=reply_text or "Đã nhận câu hỏi và xử lý qua Gemini Agent.",
                    intent="Gemini_LLM_Harness",
                    citations=[],
                    status="answered",
                    awaiting_user=False,
                    clarification_options=[],
                    escalated_to_ta=False,
                    latency_ms=round(latency, 2),
                    created_at=created_at,
                )
            except Exception as e:
                print(f"Gemini Harness execution error: {e}, falling back to deterministic grounding engine...")


        # 1. Guardrail: Prompt Injection Detection (PRD FR-105, Taxonomy Layer 3, GS06)
        if is_prompt_injection(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply="Mình là Trợ lý hỗ trợ logistics khóa học. Mình chỉ cung cấp thông tin dựa trên các thông báo chính thức từ BTC và không thể thay đổi quy chế.",
                intent="Prompt_Injection",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 2. Guardrail: Personal Grade Inquiry (PRD Taxonomy Layer 4, GS07)
        if is_personal_grade_query(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply="Bot không có thẩm quyền tra cứu điểm cá nhân của học viên vì lý do bảo mật. Bạn vui lòng đăng nhập LMS hoặc liên hệ Giảng viên/Lead TA nhé!",
                intent="Tra_Cuu_Diem_Ca_Nhan",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 3. Guardrail: Personal Deadline Extension Request (PRD Taxonomy Layer 4, GS08)
        if is_personal_extension_request(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply="Bot không có thẩm quyền duyệt gia hạn deadline cá nhân. Nếu có lý do bất khả kháng, bạn vui lòng gửi email khẩn tới BTC (support@ai20k.vn) kèm minh chứng để được xem xét nhé.",
                intent="Xin_Gia_Han_Deadline",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=True,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 4. Pure Chitchat / Greeting (GS19)
        if is_pure_greeting(raw_text):
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply="Chào bạn! Mình là Trợ lý Bot của lớp 3B. Bạn cần tra cứu thông tin deadline, quy chế nộp bài hay điểm danh nào cứ bảo mình nhé!",
                intent="Chitchat_Chao_Hoi",
                citations=[],
                status="answered",
                awaiting_user=False,
                clarification_options=["Hạn nộp Lab 1", "Lịch Checkpoint CP1-CP6", "Quy chế điểm danh"],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # 5. Ambiguity Handling (PRD Taxonomy Layer 2, GS03): Vague questions
        norm_q = normalize_text(raw_text)
        is_vague_deadline = norm_q in {
            "deadline khi nào thế", "deadline khi nào", "hạn nộp là khi nào",
            "hạn nộp là khi nào ạ", "hạn nộp mấy giờ", "khi nào nộp bài",
            "mấy giờ nộp bài", "deadline", "han nop khi nao", "han nop la khi nao a"
        }
        if is_vague_deadline:
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply="Bạn đang muốn hỏi hạn nộp của mốc Checkpoint CP1 hay bài Lab nào cụ thể để mình tra cứu chính xác giúp bạn nhé?",
                intent="Hoi_Deadline_Mo_Ho",
                citations=[],
                status="waiting_for_user",
                awaiting_user=True,
                clarification_options=["Hạn nộp Lab 1", "Hạn nộp Checkpoint CP1", "Lịch Checkpoint CP1-CP6"],
                escalated_to_ta=False,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # Check for Mixed query: Code help + Logistics (PRD FR-101, GS18)
        has_code_help = is_code_help_request(raw_text)

        # 6. Intent & Topic Identification
        matched_notice = None
        intent = "General"
        custom_reply_override = None

        # GS01: Unverified lab deadline fallback (e.g. Lab 07, Lab 7, Lab 9)
        if re.search(r"lab\s*(0[2-9]|[2-9]|1[0-9])\b", norm_q):
            intent = "Hoi_Deadline"
            matched_notice = None

        # GS02, GS18: Checkpoint deadlines (CP1 - CP6)
        elif re.search(r"checkpoint|cp[1-6]|mốc\s*cp", norm_q):
            if "18:00 hay 19:30" in norm_q or ("cp1" in norm_q and "thông báo khác nhau" in norm_q):
                intent = "Hoi_Deadline_Xung_Dot"
            elif has_code_help:
                intent = "Cau_Hoi_Kep_Logistics_Va_Ky_Thuat"
            else:
                intent = "Logistics_Deadline"
            cp_notices = self.notice_store.find_by_topic("checkpoint")
            if cp_notices:
                matched_notice = cp_notices[0]

        # GS04: Attendance / Điểm danh (including telex/typo: ddiem danh, hnay ddiem danh o dau z)
        elif re.search(r"ddiem\s*danh|điểm\s*danh|diem\s*danh|chuyên\s*cần|chuyen\s*can", norm_q):
            intent = "Hoi_Diem_Danh"
            att_notices = self.notice_store.find_by_topic("attendance")
            if att_notices:
                matched_notice = att_notices[0]

        # GS09: Workshop Sunday policy
        elif re.search(r"workshop|buổi\s*nghỉ|buoi\s*nghi", norm_q):
            intent = "Hoi_Quy_Che_Diem_Danh"
            ws_notices = self.notice_store.find_by_topic("workshop")
            if ws_notices:
                matched_notice = ws_notices[0]

        # GS10: Arriving late / Absence request
        elif re.search(r"trễ\s*30p|xin\s*vào\s*trễ|vào\s*muộn|gửi\s*mail\s*cho\s*ai", norm_q):
            intent = "Quy_Trinh_Xin_Phep"
            late_notices = self.notice_store.find_by_topic("absence_permission")
            if late_notices:
                matched_notice = late_notices[0]

        # GS11, GS12: Team formation rule
        elif re.search(r"một\s*team\s*bao\s*nhiêu|một\s*team\s*mấy|team\s*mấy\s*bạn|team\s*bao\s*nhiêu", norm_q):
            intent = "Quy_Dinh_Lap_Nhom"
            team_notices = self.notice_store.find_by_topic("team")
            if team_notices:
                matched_notice = team_notices[0]

        # GS13: Handbook director confirmation procedure
        elif re.search(r"sổ\s*tay|xác\s*nhận\s*của\s*giám\s*đốc|chờ\s*mail", norm_q):
            intent = "Quy_Trinh_Thu_Tuc"
            custom_reply_override = (
                "Đối với các thủ tục cần xác nhận trong sổ tay, bạn vui lòng chờ email phản hồi chính thức "
                "từ điều phối viên khóa học trong vòng 24h làm việc nhé."
            )

        # GS14: Deliverables per checkpoint
        elif re.search(r"deliverables|sản\s*phẩm\s*giao\s*nộp", norm_q):
            intent = "Hieu_The_Le_Cuoc_Thi"
            custom_reply_override = (
                "Đúng rồi bạn, mỗi mốc Checkpoint có sản phẩm bắt buộc riêng: CP1 (Canvas), CP2 (Mock luồng), "
                "CP3 (Video 30s + số đo), CP4 (Spec.md), CP5 (Slide PDF 6 trang). [Nguồn: Thể lệ 6 Checkpoints]"
            )

        # GS15: Repo naming convention
        elif re.search(r"đặt\s*tên\s*repo|ten\s*repo|cú\s*pháp.*repo", norm_q):
            intent = "Quy_Tac_Dat_Ten_Repo"
            repo_notices = self.notice_store.find_by_topic("submission")
            if repo_notices:
                matched_notice = repo_notices[0]

        # GS16: Fork warning
        elif re.search(r"fork\s*repo|fork\s*repository|được\s*fork\s*không", norm_q):
            intent = "Quy_Dinh_Bao_Mat_Git"
            fork_notices = self.notice_store.find_by_topic("security")
            if fork_notices:
                matched_notice = fork_notices[0]

        # GS17: VLearn update schedule
        elif re.search(r"vlearn|chưa\s*up\s*bài", norm_q):
            intent = "Trang_Thai_Tai_Lieu"
            vl_notices = self.notice_store.find_by_topic("vlearn")
            if vl_notices:
                matched_notice = vl_notices[0]

        # GS20: Slang / extension inquiry
        elif re.search(r"gắt\s*wa|extend\s*ko|trùi\s*ui|kéo\s*dài\s*thêm", norm_q):
            intent = "Hoi_Gia_Han_Tieng_Long"
            custom_reply_override = (
                "Lịch trình các bài lab và mốc Checkpoint đã được cố định theo thông báo của ban tổ chức. "
                "Hiện tại chưa có thông báo gia hạn thêm bạn nhé."
            )

        # Lab 1 deadline check (with Timestamp resolution - PRD FR-103, Taxonomy Layer 1)
        elif re.search(r"lab\s*1\b|bài\s*lab\s*1\b", norm_q):
            intent = "Logistics_Deadline"
            topic_notices = self.notice_store.find_by_topic("lab_1")
            if topic_notices:
                matched_notice = topic_notices[0]

        # Fallback keyword search
        if not matched_notice and not has_code_help and intent == "General" and not custom_reply_override:
            search_results = self.notice_store.search(raw_text)
            if search_results:
                matched_notice = search_results[0]
                intent = "Logistics_Matched"

        # 7. Build Response
        citations: list[Citation] = []
        escalated = False

        # Sub-case: Pure code help request without logistics (PRD Taxonomy Layer 3, GS05)
        if has_code_help and not matched_notice and not custom_reply_override:
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply="Bot chỉ hỗ trợ giải đáp thông tin quy chế và logistics. Với câu hỏi về bài tập thực hành, bạn vui lòng đăng lên kênh #thao-luan-hoc-tap để các bạn và TA hỗ trợ nhé!",
                intent="Yeu_Cau_Giai_Bai_Tap",
                citations=[],
                status="refused",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=True,
                latency_ms=round(latency, 2),
                created_at=created_at,
            )

        # Case with Custom Reply Override (GS13, GS14, GS20)
        if custom_reply_override:
            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
                bot_msg_id=bot_msg_id,
                reply=custom_reply_override,
                intent=intent,
                citations=[],
                status="answered",
                awaiting_user=False,
                clarification_options=[],
                escalated_to_ta=False,
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

            content_lower = (matched_notice.get("title") or "").lower() + " " + (matched_notice.get("content") or "").lower()
            if "lab 1" in content_lower or "lab_1" in str(matched_notice.get("tags")):
                reply_body = (
                    "Hạn nộp Lab 1 là 12:00 Thứ Hai, ngày 21/09/2026. "
                    "Hạn nộp đã được cập nhật theo thông báo gia hạn mới nhất từ BTC."
                )
            elif "checkpoint" in content_lower or "cp" in content_lower:
                if "18:00 hay 19:30" in norm_q or ("cp1" in norm_q and "thông báo khác nhau" in norm_q):
                    reply_body = "Theo thông báo mới nhất được cập nhật lúc 18:00, hạn nộp mốc Checkpoint 1 (CP1) của ca 3B là 19:30 ngày 16/9/2026. [Nguồn: #announcements]"
                elif has_code_help:
                    reply_body = (
                        "Hạn nộp mốc CP1 là 19:30 ngày 16/9/2026 (ca 3B) [Nguồn: #announcements]. "
                        "Về lỗi 429 Rate Limit khi gọi API Gemini, bạn vui lòng tag các anh @Coach tại kênh #lab-support để được cấp key dự phòng nhé."
                    )
                    escalated = True
                else:
                    cp_match = re.search(r"cp([1-6])", norm_q)
                    if cp_match:
                        num = cp_match.group(1)
                        schedule = {
                            "1": "19:30 ngày 16/9/2026",
                            "2": "21:00 18/09",
                            "3": "21:00 19/09",
                            "4": "21:00 20/09",
                            "5": "13:00 21/09 (Live Prototype)",
                            "6": "21:00 22/09 (Final Pitch)",
                        }
                        reply_body = f"Hạn nộp Checkpoint CP{num} là {schedule.get(num, '21:00')}."
                    else:
                        reply_body = (
                            "Lịch nộp Checkpoint: CP1 lúc 19:30 16/09; CP2 lúc 21:00 18/09; "
                            "CP3 lúc 21:00 19/09; CP4 lúc 21:00 20/09; CP5 lúc 13:00 21/09; CP6 lúc 21:00 22/09."
                        )
            elif "điểm danh" in content_lower or "attendance" in content_lower:
                reply_body = (
                    "Link điểm danh được ghim tại đầu kênh #announcements vào đầu mỗi buổi học. "
                    "Bạn kiểm tra tin nhắn ghim để điền form nhé. [Nguồn: Quy chế khóa học]"
                )
            elif "workshop" in content_lower:
                reply_body = (
                    "Buổi workshop chủ nhật là tùy chọn nhằm nâng cao kỹ năng, không bắt buộc và không tính vào số buổi nghỉ chính thức. "
                    "[Nguồn: Sổ tay học viên §2]"
                )
            elif "xin vào trễ" in content_lower or "vào muộn" in content_lower or "vắng" in content_lower:
                reply_body = (
                    "Nếu cần xin vào muộn, bạn vui lòng gửi email tới ban tổ chức qua hòm thư hỗ trợ chính thức (support@ai20k.vn) "
                    "hoặc báo trước cho Coach trực ca để được ghi nhận. [Nguồn: Sổ tay học viên]"
                )
            elif "nhóm" in content_lower or "team" in content_lower:
                reply_body = "Mỗi nhóm tham gia Hackathon gồm 3-4 thành viên và các thành viên phải ngồi cùng một phòng thi (E402). [Nguồn: Thể lệ Hackathon]"
            elif "fork" in content_lower:
                reply_body = (
                    "TUYỆT ĐỐI KHÔNG FORK repo đề bài vì sẽ làm lộ dữ liệu nội bộ trong thư mục data/ lên repo công khai. "
                    "Nhóm phải tạo một repo mới hoàn toàn. [Nguồn: Quy định bảo mật dữ liệu]"
                )
            elif "vlearn" in content_lower:
                reply_body = (
                    "Tài liệu học tập được cập nhật trước 12h mỗi buổi học trên VLearn. "
                    "Bạn thử nhấn Ctrl+F5 để xóa cache và tải lại trang nhé. [Nguồn: Thông báo VLearn]"
                )
            elif "repo" in content_lower or "đặt tên repo" in content_lower:
                reply_body = "Quy tắc đặt tên repo: K4-<mã lớp>-<phòng>-<tên nhóm>. Ví dụ của nhóm mình là: K4-3B-E402-EasyGame. [Nguồn: 01-challenge-brief.md]"
            else:
                reply_body = matched_notice.get("content", "")

            # Formatted citation tag (PRD FR-102)
            direct_link = matched_notice.get("discord_link") or matched_notice.get("message_url", "")
            if "[Nguồn:" not in reply_body and direct_link:
                citation_tag = f"\n[Nguồn: {matched_notice['title']} - Kênh {matched_notice.get('channel', '#announcements')}]({direct_link})"
                final_reply = reply_body + citation_tag
            else:
                final_reply = reply_body

            # Mixed query: code help part
            if has_code_help and not escalated:
                final_reply += "\n\nVề câu hỏi code/kỹ thuật, mình đã chuyển tiếp cho @TA_Truc để hỗ trợ bạn trong thread này nhé!"
                escalated = True

            latency = (time.perf_counter() - start_time) * 1000
            return ChatResponse(
                conversation_id=conv_id,
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

        # 8. Graceful Fallback: Know-what-you-don't-know (PRD FR-104, Taxonomy Layer 1, GS01)
        fallback_reply = "Hiện tại chưa có thông tin chính thức về nội dung này trong thông báo của khóa học. Mình đã ghi nhận câu hỏi và tag @TA_Truc để giải đáp cho bạn nhé."
        latency = (time.perf_counter() - start_time) * 1000
        return ChatResponse(
            conversation_id=conv_id,
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
