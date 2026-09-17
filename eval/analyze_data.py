# -*- coding: utf-8 -*-
"""
Script Khai thác Dữ liệu Discord Pack (Khai thác định lượng phục vụ Chuẩn B - Khối R1)
Tác giả: Đậu Quang Ý (AI Engineer & Data Specialist) - Nhóm EasyGame (Lớp 3B - Phòng E402)
"""

import csv
import json
import os
import re

DATA_PATH = os.path.join("data", "discord-pack", "k4_messages.csv")

def analyze():
    if not os.path.exists(DATA_PATH):
        print(f"File {DATA_PATH} khong ton tai o local.")
        return

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        messages = list(reader)

    total = len(messages)
    user_msgs = [m for m in messages if m["is_bot"] == "False"]
    bot_msgs = [m for m in messages if m["is_bot"] == "True"]
    user_authors = set(m["author"] for m in user_msgs)

    # Loc tin nhan chua dau hoi '?'
    question_msgs = [m for m in user_msgs if "?" in m["content"]]

    # Tim cac tin nhan khong co reply hoac troi tin
    replied_msg_ids = set(m["reply_to"] for m in messages if m["reply_to"])
    unreplied_questions = [m for m in question_msgs if m["msg_id"] not in replied_msg_ids]

    # Phan tich chieu dai bot response
    bot_lengths = [int(m["n_chars"]) for m in bot_msgs if m["n_chars"].isdigit()]
    avg_bot_len = sum(bot_lengths) / len(bot_lengths) if bot_lengths else 0
    max_bot_len = max(bot_lengths) if bot_lengths else 0

    print("=== KET QUA PHAN TICH DINH LUONG DISCORD PACK (K4) ===")
    print(f"Tong so tin nhan: {total}")
    print(f"Tin nhan hoc vien: {len(user_msgs)} (tu {len(user_authors)} hoc vien)")
    print(f"Tin nhan bot tro ly: {len(bot_msgs)}")
    print(f"So tin nhan chua cau hoi (?): {len(question_msgs)}")
    print(f"So cau hoi chua co reply truc tiep (troi tin): {len(unreplied_questions)} ({len(unreplied_questions)/len(question_msgs)*100:.1f}%)")
    print(f"Do dai trung binh phan hoi cua Bot: {avg_bot_len:.1f} ky tu (Dai nhat: {max_bot_len} ky tu)")
    print("\n=== TOP 10 CAU HOI HOC VIEN TIEU BIEU TRICH XUAT TU DATA ===")
    for i, q in enumerate(question_msgs[:10], 1):
        content = q["content"].replace("\n", " ").strip()
        print(f"{i}. [{q['msg_id']}] ({q['created_at_vn']}): {content[:100]}")

if __name__ == "__main__":
    analyze()
