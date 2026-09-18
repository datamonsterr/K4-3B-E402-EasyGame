"use client";

import React, { useState } from "react";

interface OfficialNotice {
  id: string;
  topicKey: string;
  topicTitle: string;
  publishedAt: string;
  verifiedBy: string;
  answerExcerpt: string;
  discordJumpUrl: string;
  isLatest: boolean;
}

const noticesList: OfficialNotice[] = [
  {
    id: "n-ext",
    topicKey: "lab-1",
    topicTitle: "Lab 1 Submission & Evaluation Extension",
    publishedAt: "2026-09-14 10:00 (UTC+7)",
    verifiedBy: "Lead Instructor (Verified Authority)",
    answerExcerpt:
      "Hạn chót nộp Lab 1 đã được gia hạn đến 12:00 trưa Thứ Bảy, 19/09/2026. Học viên nộp bài qua GitHub Classroom theo đúng định dạng quy định.",
    discordJumpUrl: "https://discord.com/channels/128400000000000000/1001/2002",
    isLatest: true,
  },
  {
    id: "n-orig",
    topicKey: "lab-1",
    topicTitle: "Lab 1 Original Announcement (Superseded)",
    publishedAt: "2026-09-12 10:00 (UTC+7)",
    verifiedBy: "Teaching Coordinator",
    answerExcerpt:
      "Hạn chót nộp Lab 1 là 21:00 ngày 17/09/2026. Bài nộp trễ sẽ bị trừ điểm theo thang quy chế.",
    discordJumpUrl: "https://discord.com/channels/128400000000000000/1001/1002",
    isLatest: false,
  },
  {
    id: "n-att",
    topicKey: "attendance",
    topicTitle: "Attendance & Workshop Makeup Policy",
    publishedAt: "2026-09-10 14:00 (UTC+7)",
    verifiedBy: "Academic Affairs",
    answerExcerpt:
      "Học viên được phép vắng tối đa 1 buổi workshop nếu có lý do chính đáng và gửi đơn phép trước 12 tiếng. Phải làm bài bù để đủ điều kiện xét chứng chỉ.",
    discordJumpUrl: "https://discord.com/channels/128400000000000000/1001/3001",
    isLatest: true,
  },
  {
    id: "n-cvat",
    topicKey: "cvat-setup",
    topicTitle: "CVAT Setup & OPA 500 Migration Notice",
    publishedAt: "2026-09-13 18:00 (UTC+7)",
    verifiedBy: "Lab Systems TA",
    answerExcerpt:
      "Khi gặp lỗi 500 OPA policy bundle khi cài đặt CVAT, vui lòng chờ khoảng 3-5 phút để migration hoàn tất rồi restart docker compose.",
    discordJumpUrl: "https://discord.com/channels/128400000000000000/1001/4001",
    isLatest: true,
  },
];

export function NoticesView() {
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  const filtered = noticesList.filter((n) =>
    selectedTopic === "all" ? true : n.topicKey === selectedTopic,
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">
            Official Notices Ground Truth
          </span>
          <span className="text-[11px] text-[#71717a]">
            · Căn cứ xác thực duy nhất cho Trợ lý AI (Track B)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#71717a]">
            Lọc chủ đề:
          </span>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded px-2 py-1 text-xs text-white focus:outline-none"
          >
            <option value="all">Tất cả thông báo ({noticesList.length})</option>
            <option value="lab-1">
              Lab 1 ({noticesList.filter((n) => n.topicKey === "lab-1").length})
            </option>
            <option value="attendance">Điểm danh &amp; Quy chế</option>
            <option value="cvat-setup">Cài đặt CVAT</option>
          </select>
        </div>
      </header>

      {/* Notices Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.map((notice) => (
          <div
            key={notice.id}
            className={`p-4 rounded-lg border text-xs space-y-2.5 transition ${
              notice.isLatest
                ? "bg-[#121215] border-cyan-900/80 shadow-sm"
                : "bg-[#18181b]/60 border-[#27272a] opacity-75"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                    notice.isLatest
                      ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                      : "bg-[#27272a] text-[#71717a]"
                  }`}
                >
                  {notice.isLatest ? "LATEST AUTHORITATIVE" : "SUPERSEDED"}
                </span>
                <span className="font-semibold text-white text-xs">
                  {notice.topicTitle}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#a1a1aa]">
                {notice.publishedAt}
              </span>
            </div>

            <p className="text-[#e4e4e7] leading-relaxed bg-[#18181b] p-3 rounded border border-[#27272a]/60">
              &ldquo;{notice.answerExcerpt}&rdquo;
            </p>

            <div className="pt-2 border-t border-[#27272a] flex items-center justify-between">
              <div className="text-[11px] font-mono text-[#71717a]">
                Xác thực bởi:{" "}
                <span className="text-white">{notice.verifiedBy}</span>
              </div>
              <a
                href={notice.discordJumpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 font-mono text-[11px] hover:underline"
              >
                <span>Nhảy tới tin nhắn gốc trên Discord</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
