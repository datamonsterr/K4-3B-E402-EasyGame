"use client";

import React, { useState } from "react";

export interface RadarTicket {
  id: string;
  author: string;
  channel: string;
  question: string;
  elapsedMinutes: number;
  tier: 1 | 2;
  status: "open" | "claimed" | "answered" | "resolved";
  claimedBy?: string;
  version: number;
}

const initialTickets: RadarTicket[] = [
  {
    id: "tk-101",
    author: "@MinhTuan_K4",
    channel: "lab-support",
    question:
      "Lỗi memory leak khi chạy load_dataset với file parquet 4GB trong Lab 1, nhờ Coach xem giúp với ạ.",
    elapsedMinutes: 258, // > 4h
    tier: 2,
    status: "open",
    version: 0,
  },
  {
    id: "tk-102",
    author: "@ThuHuong_AIA",
    channel: "lab-support",
    question:
      "Server CVAT báo lỗi OPA policy không pull được bundle, đã thử restart 3 lần vẫn lỗi 500.",
    elapsedMinutes: 245, // > 4h
    tier: 2,
    status: "claimed",
    claimedBy: "@TA_MinhHai",
    version: 1,
  },
  {
    id: "tk-103",
    author: "@KhanhLinh",
    channel: "q-and-a",
    question:
      "Nếu nghỉ có phép workshop ngày mai thì làm thế nào để được tính điểm danh bù ạ?",
    elapsedMinutes: 145, // > 2h
    tier: 1,
    status: "open",
    version: 0,
  },
  {
    id: "tk-104",
    author: "@HoangNam_L3",
    channel: "discussion",
    question:
      "Nhóm Phoenix level 3-4 có được đổi tên đề tài sau khi chốt danh sách không?",
    elapsedMinutes: 130, // > 2h
    tier: 1,
    status: "answered",
    version: 1,
  },
];

export interface RadarViewProps {
  onSelectMessage?: (messageId: string) => void;
}

export function RadarView({ onSelectMessage }: RadarViewProps = {}) {
  const [tickets, setTickets] = useState<RadarTicket[]>(initialTickets);
  const [filter, setFilter] = useState<
    "all" | "urgent" | "warning" | "resolved"
  >("all");
  const [broadcasted, setBroadcasted] = useState(false);
  const [actingTicketId, setActingTicketId] = useState<string | null>(null);

  const urgentCount = tickets.filter(
    (t) => t.tier === 2 && t.status !== "resolved",
  ).length;
  const warningCount = tickets.filter(
    (t) => t.tier === 1 && t.status !== "resolved",
  ).length;
  const resolvedCount =
    28 + tickets.filter((t) => t.status === "resolved").length;
  const totalCount = tickets.length + 28;

  async function handleClaim(ticketId: string) {
    setActingTicketId(ticketId);
    try {
      // Update locally and attempt optimistic database update
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: "claimed",
                claimedBy: "@TA_MinhHai",
                version: t.version + 1,
              }
            : t,
        ),
      );
    } finally {
      setActingTicketId(null);
    }
  }

  async function handleResolve(ticketId: string) {
    setActingTicketId(ticketId);
    try {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: "resolved", version: t.version + 1 }
            : t,
        ),
      );
    } finally {
      setActingTicketId(null);
    }
  }

  const filteredTickets = tickets.filter((t) => {
    if (filter === "urgent") return t.tier === 2 && t.status !== "resolved";
    if (filter === "warning") return t.tier === 1 && t.status !== "resolved";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">ta-radar</span>
          <span className="text-[11px] text-[#71717a]">
            · SLA Breach Monitoring & Triage (Track B)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#71717a]">
            SLA Thresholds:
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
            Tier 1: 120m
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
            Tier 2: 240m
          </span>
        </div>
      </header>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#121215] border-b border-[#27272a]">
        <div className="bg-[#18181b] border border-red-900/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-red-400 uppercase tracking-wider">
            Urgent Breaches &gt;4h
          </div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">
            {urgentCount}
          </div>
          <div className="text-[10px] text-[#71717a] mt-0.5">
            Yêu cầu can thiệp ngay
          </div>
        </div>

        <div className="bg-[#18181b] border border-amber-900/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
            Soft Warnings &gt;2h
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {warningCount}
          </div>
          <div className="text-[10px] text-[#71717a] mt-0.5">
            Theo dõi tiền vi phạm
          </div>
        </div>

        <div className="bg-[#18181b] border border-emerald-900/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
            Resolved Today
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {resolvedCount}/{totalCount}
          </div>
          <div className="text-[10px] text-[#71717a] mt-0.5">
            Xác nhận hoàn tất
          </div>
        </div>

        <div className="bg-[#18181b] border border-cyan-900/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
            SLA Compliance
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            94.2%
          </div>
          <div className="text-[10px] text-[#71717a] mt-0.5">
            Mục tiêu ca trực &gt;90%
          </div>
        </div>
      </div>

      {/* Main Content: Split Queue & Daily Digest Pane */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Tickets Queue */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Filters */}
          <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filter === "all"
                    ? "bg-[#202024] text-white border border-[#3f3f46]"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
              >
                Tất cả ({tickets.length})
              </button>
              <button
                onClick={() => setFilter("urgent")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filter === "urgent"
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
              >
                Khẩn cấp &gt;4h ({urgentCount})
              </button>
              <button
                onClick={() => setFilter("warning")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filter === "warning"
                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
              >
                Cảnh báo &gt;2h ({warningCount})
              </button>
              <button
                onClick={() => setFilter("resolved")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filter === "resolved"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "text-[#a1a1aa] hover:text-white"
                }`}
              >
                Đã giải quyết
              </button>
            </div>
            <span className="text-[11px] font-mono text-[#71717a]">
              Tự động cập nhật mỗi 15s
            </span>
          </div>

          {/* Ticket Cards */}
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-[#71717a] font-mono text-xs border border-dashed border-[#27272a] rounded-lg">
              Không có câu hỏi nào trong danh mục này.
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                className={`p-3.5 rounded-lg border text-xs space-y-2.5 transition ${
                  t.status === "resolved"
                    ? "bg-[#121215] border-emerald-900/40 opacity-70"
                    : t.tier === 2
                      ? "bg-[#18181b] border-red-900/80 shadow-sm shadow-red-950/40"
                      : "bg-[#18181b] border-amber-900/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        t.status === "resolved"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : t.tier === 2
                            ? "bg-red-950 text-red-400 border border-red-800 animate-pulse"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {t.status === "resolved"
                        ? "RESOLVED"
                        : t.tier === 2
                          ? "TIER 2 URGENT"
                          : "TIER 1 WARNING"}
                    </span>
                    <span className="font-mono text-xs text-white">
                      {t.author}
                    </span>
                    <span className="text-[#71717a] font-mono">
                      #{t.channel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[#71717a]">Chờ:</span>
                    <span
                      className={`font-bold ${
                        t.tier === 2 ? "text-red-400" : "text-amber-400"
                      }`}
                    >
                      {Math.floor(t.elapsedMinutes / 60)}h{" "}
                      {t.elapsedMinutes % 60}m
                    </span>
                  </div>
                </div>

                <p className="text-[#e4e4e7] leading-relaxed">{t.question}</p>

                <div className="pt-2 border-t border-[#27272a] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#a1a1aa]">
                    {t.claimedBy ? (
                      <span className="text-cyan-400">
                        Đang xử lý: {t.claimedBy}
                      </span>
                    ) : t.status === "answered" ? (
                      <span className="text-amber-400">
                        Đã trả lời (Chưa xác nhận đóng)
                      </span>
                    ) : (
                      <span className="text-red-400">Chưa có người nhận</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectMessage ? (
                      <button
                        type="button"
                        onClick={() => onSelectMessage(t.id)}
                        className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-400 text-[11px] font-mono border border-cyan-800 transition flex items-center gap-1"
                        title="Mở tin nhắn trong giao diện Messages để trả lời trực tiếp vào CSDL"
                      >
                        <span>Xem tin nhắn</span>
                        <span>💬</span>
                      </button>
                    ) : (
                      <a
                        href="https://discord.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-[#202024] hover:bg-[#27272a] text-[#e4e4e7] text-[11px] font-mono border border-[#3f3f46] transition"
                      >
                        Xem tin nhắn 💬
                      </a>
                    )}
                    <a
                      href="https://discord.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-[#202024] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white text-[10px] font-mono border border-[#27272a] transition"
                      title="Mở trên Discord thật trong tab mới"
                    >
                      Discord ↗
                    </a>
                    {t.status !== "resolved" && (
                      <>
                        {!t.claimedBy && (
                          <button
                            type="button"
                            onClick={() => handleClaim(t.id)}
                            disabled={actingTicketId === t.id}
                            className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-[11px] transition"
                          >
                            Claim
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResolve(t.id)}
                          disabled={actingTicketId === t.id}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-[11px] transition"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: 22:00 Clean Daily Digest Drawer */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#27272a] bg-[#121215] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white">
                  22:00 Clean Daily Digest
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Fixed Syllable
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#71717a]">
                Shift End Report
              </span>
            </div>

            {/* Digest Content Card */}
            <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg text-xs space-y-3">
              <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                Cộng đồng K4 · L2-3 · 18/09/2026 (UTC+7)
              </div>
              <p className="text-[#a1a1aa] leading-relaxed text-[11px]">
                Hôm nay hệ thống ghi nhận 137 tin nhắn trên 4 kênh thảo luận. Đã
                giải quyết 28/33 câu hỏi đạt tỷ lệ 94.2%. Hai sự cố hạ tầng CVAT
                OPA 500 đã được Lab Coach hướng dẫn bypass.
              </p>

              {/* Ranked Topics */}
              <div className="space-y-1.5 pt-2 border-t border-[#27272a]">
                <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider">
                  Top 3 Thắc mắc phổ biến nhất
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#202024]">
                    <span className="text-white font-medium">
                      1. Hạn nộp &amp; gia hạn Lab 1
                    </span>
                    <span className="font-mono text-cyan-400">14 câu hỏi</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#202024]">
                    <span className="text-white font-medium">
                      2. Lỗi CVAT OPA migration 500
                    </span>
                    <span className="font-mono text-cyan-400">9 câu hỏi</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#202024]">
                    <span className="text-white font-medium">
                      3. Quy định vắng workshop &amp; bù
                    </span>
                    <span className="font-mono text-cyan-400">5 câu hỏi</span>
                  </div>
                </div>
              </div>

              {/* Anomaly check badge */}
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/60 text-[10px] text-emerald-300 font-mono flex items-center gap-1.5">
                <span>✓</span>
                <span>
                  Đã kiểm tra: 0 ký tự lỗi lặp (&quot;nguồn tham chiếu&quot;).
                  Typography chuẩn Unicode.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => setBroadcasted(true)}
              disabled={broadcasted}
              className={`w-full py-2.5 rounded-md font-semibold text-xs transition shadow-sm ${
                broadcasted
                  ? "bg-emerald-600 text-black cursor-default"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black active:scale-[0.98]"
              }`}
            >
              {broadcasted
                ? "✓ Đã phát sóng tới #ta-radar"
                : "Broadcast to #ta-radar (22:00)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
