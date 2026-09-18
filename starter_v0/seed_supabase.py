from __future__ import annotations

import json
from database import get_supabase_client


def seed() -> None:
    sb = get_supabase_client()
    print("Checking and seeding Supabase tables according to schema.sql...")

    # 1. Upsert all sample and announcement messages into discord_messages
    print("Upserting discord_messages...")
    announcement_messages = [
        {
            "msg_id": "M1001",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author": "BTC_Admin",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-15T09:00:00+07:00",
            "mentions_bot": False,
            "n_chars": 140,
            "content": "Hạn chót nộp bài tập Lab 1 là 23:59 Chủ Nhật, ngày 20/09/2026. Học viên nộp qua link GitHub cá nhân theo định dạng K4-Lab1-<StudentID>.",
            "intent_label": "Logistics_Deadline",
        },
        {
            "msg_id": "M1002",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author": "Lead_TA_Truc",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-16T15:00:00+07:00",
            "mentions_bot": False,
            "n_chars": 160,
            "content": "Do hệ thống LMS bảo trì, BTC gia hạn nộp bài Lab 1 đến 12:00 Thứ Hai, ngày 21/09/2026. Hạn nộp đã được cập nhật theo thông báo gia hạn mới nhất.",
            "intent_label": "Logistics_Deadline",
        },
        {
            "msg_id": "M1003",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author": "BTC_Admin",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-14T08:00:00+07:00",
            "mentions_bot": False,
            "n_chars": 150,
            "content": "Lịch nộp các mốc Checkpoint: CP1 lúc 21:00 17/09; CP2 lúc 21:00 18/09; CP3 lúc 21:00 19/09; CP4 lúc 21:00 20/09; CP5 lúc 13:00 21/09; CP6 lúc 21:00 22/09/2026.",
            "intent_label": "Logistics_Deadline",
        },
        {
            "msg_id": "M1004",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author": "BTC_Admin",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-14T08:30:00+07:00",
            "mentions_bot": False,
            "n_chars": 200,
            "content": "Học viên điểm danh đầu giờ tại link form chính thức: https://forms.gle/attendance_k4. Trường hợp nghỉ có phép hoặc bù điểm danh, cần điền form bù trước 22:00 cùng ngày và báo cho TA trực phòng E402.",
            "intent_label": "Logistics_Attendance",
        },
        {
            "msg_id": "M1005",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author": "Lead_TA_Truc",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-14T09:00:00+07:00",
            "mentions_bot": False,
            "n_chars": 170,
            "content": "Quy định nộp bài: Repository nộp bài phải để chế độ Public trên GitHub. Định dạng tên repo bắt buộc: K4-Lab<X>-<StudentID> (ví dụ: K4-Lab1-2A202602721).",
            "intent_label": "Logistics_Submission_Rule",
        },
        {
            "msg_id": "M1006",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author": "BTC_Admin",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-14T10:00:00+07:00",
            "mentions_bot": False,
            "n_chars": 180,
            "content": "Mỗi nhóm dự án gồm từ 3 đến 4 thành viên thuộc cùng lớp. Các nhóm hoàn thành đăng ký tên nhóm và danh sách thành viên tại kênh #team-registration trước 18:00 Thứ Sáu 18/09/2026.",
            "intent_label": "Logistics_Team",
        },
        {
            "msg_id": "M99769",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-logistics",
            "author": "@quangy66",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-18T05:30:00+07:00",
            "mentions_bot": False,
            "n_chars": 77,
            "content": "Mọi người cho mình hỏi hạn nộp bài Lab 1 có được dời sang thứ Hai không ạ?",
            "intent_label": "Logistics_Deadline",
        },
        {
            "msg_id": "M30246",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-logistics",
            "author": "@datpt01",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-18T07:15:00+07:00",
            "mentions_bot": False,
            "n_chars": 56,
            "content": "Cho em hỏi hạn đổi tên repo GitHub là mấy giờ hôm nay ạ?",
            "intent_label": "Logistics_Submission_Rule",
        },
        {
            "msg_id": "M67317",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-logistics",
            "author": "@Cat123",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-18T09:00:00+07:00",
            "mentions_bot": False,
            "n_chars": 68,
            "content": "Hôm qua mình nghỉ có phép thì bù điểm danh qua form nào vậy TA?",
            "intent_label": "Logistics_Attendance",
        },
        {
            "msg_id": "M10045",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-code",
            "author": "@minh_e402",
            "is_bot": False,
            "msg_type": "message",
            "created_at_vn": "2026-09-18T10:10:00+07:00",
            "mentions_bot": False,
            "n_chars": 71,
            "content": "Em bị lỗi TypeError: unsupported operand type khi chạy script test.",
            "intent_label": "Technical_Code_Help",
        },
    ]
    sb.table("discord_messages").upsert(announcement_messages, on_conflict="msg_id").execute()

    # 2. Seed official_notices
    print("Upserting official_notices...")
    notices = [
        {
            "msg_id": "M1001",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author_role": "Admin",
            "title": "Thông báo Hạn nộp Lab 1 ban đầu",
            "content": "Hạn chót nộp bài tập Lab 1 là 23:59 Chủ Nhật, ngày 20/09/2026. Học viên nộp qua link GitHub cá nhân theo định dạng K4-Lab1-<StudentID>.",
            "notice_ts": "2026-09-15T09:00:00+07:00",
            "tags": ["lab_1", "deadline"],
            "is_superseded": True,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/1001",
        },
        {
            "msg_id": "M1002",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author_role": "Lead_TA",
            "title": "Thông báo Gia hạn nộp Lab 1 (Cập nhật mới nhất)",
            "content": "Do hệ thống LMS bảo trì, BTC gia hạn nộp bài Lab 1 đến 12:00 Thứ Hai, ngày 21/09/2026. Hạn nộp đã được cập nhật theo thông báo gia hạn mới nhất.",
            "notice_ts": "2026-09-16T15:00:00+07:00",
            "tags": ["lab_1", "deadline", "extension"],
            "is_superseded": False,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/1002",
        },
        {
            "msg_id": "M1003",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author_role": "Admin",
            "title": "Lịch nộp các mốc Checkpoint CP1 đến CP6",
            "content": "Lịch nộp các mốc Checkpoint: CP1 lúc 21:00 17/09; CP2 lúc 21:00 18/09; CP3 lúc 21:00 19/09; CP4 lúc 21:00 20/09; CP5 lúc 13:00 21/09; CP6 lúc 21:00 22/09/2026.",
            "notice_ts": "2026-09-14T08:00:00+07:00",
            "tags": ["checkpoint", "schedule"],
            "is_superseded": False,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/1003",
        },
        {
            "msg_id": "M1004",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author_role": "BTC",
            "title": "Quy chế Điểm danh & Bù chuyên cần K4",
            "content": "Học viên điểm danh đầu giờ tại link form chính thức: https://forms.gle/attendance_k4. Trường hợp nghỉ có phép hoặc bù điểm danh, cần điền form bù trước 22:00 cùng ngày và báo cho TA trực phòng E402.",
            "notice_ts": "2026-09-14T08:30:00+07:00",
            "tags": ["attendance", "policy"],
            "is_superseded": False,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/1004",
        },
        {
            "msg_id": "M1005",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author_role": "Lead_TA",
            "title": "Quy định Đặt tên Repo GitHub và Nộp bài",
            "content": "Quy định nộp bài: Repository nộp bài phải để chế độ Public trên GitHub. Định dạng tên repo bắt buộc: K4-Lab<X>-<StudentID> (ví dụ: K4-Lab1-2A202602721).",
            "notice_ts": "2026-09-14T09:00:00+07:00",
            "tags": ["submission", "github"],
            "is_superseded": False,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/1005",
        },
        {
            "msg_id": "M1006",
            "guild": "easygame_k4",
            "channel": "#announcements",
            "author_role": "BTC",
            "title": "Quy định Ghép đội & Đăng ký Team Dự án",
            "content": "Mỗi nhóm dự án gồm từ 3 đến 4 thành viên thuộc cùng lớp. Các nhóm hoàn thành đăng ký tên nhóm và danh sách thành viên tại kênh #team-registration trước 18:00 Thứ Sáu 18/09/2026.",
            "notice_ts": "2026-09-14T10:00:00+07:00",
            "tags": ["team", "registration"],
            "is_superseded": False,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/1006",
        },
    ]

    for n in notices:
        existing = sb.table("official_notices").select("id").eq("msg_id", n["msg_id"]).execute()
        if not existing.data:
            sb.table("official_notices").insert(n).execute()
        else:
            sb.table("official_notices").update(n).eq("msg_id", n["msg_id"]).execute()

    # Link superseded_by between M1001 and M1002
    res1 = sb.table("official_notices").select("id").eq("msg_id", "M1001").execute()
    res2 = sb.table("official_notices").select("id").eq("msg_id", "M1002").execute()
    if res1.data and res2.data:
        id1 = res1.data[0]["id"]
        id2 = res2.data[0]["id"]
        sb.table("official_notices").update({"superseded_by": id2}).eq("id", id1).execute()

    # 3. Seed questions_tracker
    print("Upserting questions_tracker...")
    sample_tracker = [
        {
            "msg_id": "M99769",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-logistics",
            "author": "@quangy66",
            "asked_at": "2026-09-18T05:30:00+07:00",
            "intent_label": "Logistics_Deadline",
            "question_summary": "Hỏi hạn nộp bài Lab 1 dời sang thứ Hai",
            "status": "OPEN",
            "sla_tier": "URGENT_4H",
            "discord_link": "https://discord.com/channels/1234567890/9876543210/99769",
        },
        {
            "msg_id": "M30246",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-logistics",
            "author": "@datpt01",
            "asked_at": "2026-09-18T07:15:00+07:00",
            "intent_label": "Logistics_Submission_Rule",
            "question_summary": "Hỏi hạn đổi tên repo GitHub",
            "status": "OPEN",
            "sla_tier": "SOFT_2H",
            "discord_link": "https://discord.com/channels/1234567890/9876543210/30246",
        },
        {
            "msg_id": "M67317",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-logistics",
            "author": "@Cat123",
            "asked_at": "2026-09-18T09:00:00+07:00",
            "intent_label": "Logistics_Attendance",
            "question_summary": "Hỏi form bù điểm danh",
            "status": "OPEN",
            "sla_tier": None,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/67317",
        },
        {
            "msg_id": "M10045",
            "guild": "easygame_k4",
            "channel": "#hoi-dap-code",
            "author": "@minh_e402",
            "asked_at": "2026-09-18T10:10:00+07:00",
            "intent_label": "Technical_Code_Help",
            "question_summary": "Lỗi TypeError khi chạy script",
            "status": "RESOLVED",
            "sla_tier": None,
            "discord_link": "https://discord.com/channels/1234567890/9876543210/10045",
        },
    ]
    sb.table("questions_tracker").upsert(sample_tracker, on_conflict="msg_id").execute()

    print("Supabase tables checked and seeded successfully!")


if __name__ == "__main__":
    seed()
