"use client";

import React, { useState } from "react";

interface TelemetryRow {
  id: string;
  snowflake: string;
  time: string;
  channel: string;
  author: string;
  role: string;
  snippet: string;
  intent: string;
  grounded: boolean;
  latencyMs: number;
}

const telemetryData: TelemetryRow[] = [
  {
    id: "t-1",
    snowflake: "1284729104829102",
    time: "14:22:04",
    channel: "q-and-a",
    author: "@NguyenVanAn",
    role: "Learner",
    snippet: "@Assistant deadline Lab 1 mấy giờ vậy ạ?",
    intent: "Logistics_Deadline",
    grounded: true,
    latencyMs: 1140,
  },
  {
    id: "t-2",
    snowflake: "1284728491029481",
    time: "14:18:22",
    channel: "lab-support",
    author: "@MinhTuan_K4",
    role: "Learner",
    snippet:
      "Lỗi memory leak khi chạy load_dataset với file parquet 4GB trong Lab 1...",
    intent: "Technical_Roadblock",
    grounded: false,
    latencyMs: 380,
  },
  {
    id: "t-3",
    snowflake: "1284719482019482",
    time: "13:45:10",
    channel: "announcements",
    author: "@Lead_Instructor",
    role: "Staff",
    snippet:
      "THÔNG BÁO GIA HẠN LAB 1: Do bảo trì cụm GPU, thời hạn nộp bài dời đến 12:00 19/09...",
    intent: "Official_Announcement",
    grounded: true,
    latencyMs: 220,
  },
  {
    id: "t-4",
    snowflake: "1284693829104829",
    time: "12:10:05",
    channel: "q-and-a",
    author: "@KhanhLinh",
    role: "Learner",
    snippet:
      "Nếu nghỉ có phép workshop ngày mai thì làm thế nào để được tính điểm danh bù ạ?",
    intent: "Logistics_Attendance",
    grounded: true,
    latencyMs: 890,
  },
];

export function ChannelsView() {
  const [selectedRow, setSelectedRow] = useState<TelemetryRow>(
    telemetryData[0],
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Top Header */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">
            Manage Channels &amp; Ingestion
          </span>
          <span className="text-[11px] text-[#71717a]">
            · Discord Ingestion Telemetry (Screen 3)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-[11px] font-mono text-emerald-400">
            Gateway Connected
          </span>
        </div>
      </header>

      {/* Main Split Body: Channels Rail + Ingestion Table */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Channel Sources Rail */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#27272a] bg-[#121215] p-3 space-y-3 flex-shrink-0 overflow-y-auto">
          <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider px-1">
            Tracked Channels (4)
          </div>

          <div className="space-y-1">
            <div className="p-2.5 rounded-md bg-[#18181b] border border-cyan-900/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">#</span> announcements
                </span>
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Ground Truth
                </span>
              </div>
              <div className="text-[10px] text-[#71717a]">
                4 Pinned Notices · Verified Authority
              </div>
            </div>

            <div className="p-2.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">#</span> q-and-a
                </span>
                <span className="font-mono text-[9px] text-[#a1a1aa]">
                  320 msgs
                </span>
              </div>
              <div className="text-[10px] text-[#71717a]">
                Hỏi đáp chung &amp; hậu cần
              </div>
            </div>

            <div className="p-2.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">#</span> discussion
                </span>
                <span className="font-mono text-[9px] text-[#a1a1aa]">
                  779 msgs
                </span>
              </div>
              <div className="text-[10px] text-[#71717a]">
                Thảo luận tự do học viên
              </div>
            </div>

            <div className="p-2.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <span className="text-red-400">#</span> ta-radar
                </span>
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                  Staff Only
                </span>
              </div>
              <div className="text-[10px] text-[#71717a]">
                Điều phối SLA &amp; Digest
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Table + Dual Inspector */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Telemetry Table */}
          <div className="flex-1 overflow-auto p-3">
            <div className="border border-[#27272a] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#18181b] text-[#71717a] font-mono text-[11px] border-b border-[#27272a]">
                  <tr>
                    <th className="p-2.5">Snowflake ID</th>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Channel</th>
                    <th className="p-2.5">Author</th>
                    <th className="p-2.5">Snippet</th>
                    <th className="p-2.5">Intent</th>
                    <th className="p-2.5">Grounded</th>
                    <th className="p-2.5">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {telemetryData.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row)}
                      className={`cursor-pointer transition ${
                        selectedRow.id === row.id
                          ? "bg-cyan-950/30 text-white"
                          : "hover:bg-[#18181b] text-[#e4e4e7]"
                      }`}
                    >
                      <td className="p-2.5 font-mono text-[11px] text-cyan-400">
                        {row.snowflake}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-[#a1a1aa]">
                        {row.time}
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">
                        #{row.channel}
                      </td>
                      <td className="p-2.5 font-medium">{row.author}</td>
                      <td className="p-2.5 max-w-xs truncate text-[#a1a1aa]">
                        {row.snippet}
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-cyan-300">
                        {row.intent}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                            row.grounded
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {row.grounded ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-[#a1a1aa]">
                        {row.latencyMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dual Inspector Drawer */}
          <div className="h-56 border-t border-[#27272a] bg-[#121215] p-3 grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
            {/* Left: Raw Discord Gateway JSON */}
            <div className="flex flex-col bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 overflow-hidden">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#27272a]">
                <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                  Raw Discord Gateway Event (JSON)
                </span>
                <span className="text-[10px] font-mono text-[#71717a]">
                  Snowflake: {selectedRow.snowflake}
                </span>
              </div>
              <pre className="flex-1 overflow-auto text-[10px] font-mono text-[#a1a1aa] leading-tight">
                {JSON.stringify(
                  {
                    event: "MESSAGE_CREATE",
                    snowflake_id: selectedRow.snowflake,
                    guild_id: "128400000000000000",
                    channel_id: selectedRow.channel,
                    author: {
                      username: selectedRow.author,
                      role: selectedRow.role,
                      is_bot: selectedRow.author.includes("Bot"),
                    },
                    content: selectedRow.snippet,
                    timestamp: selectedRow.time,
                    jump_url: `https://discord.com/channels/128400000000000000/${selectedRow.channel}/${selectedRow.snowflake}`,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>

            {/* Right: Agent Reasoning Step Trace */}
            <div className="flex flex-col bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 overflow-hidden">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#27272a]">
                <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                  Agent Reasoning &amp; Grounding Trace
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  Latency: {selectedRow.latencyMs}ms
                </span>
              </div>
              <div className="flex-1 overflow-auto space-y-1.5 text-[11px] font-mono text-[#a1a1aa]">
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400">1.</span>
                  <span>Detected Intent:</span>
                  <span className="text-white font-semibold">
                    {selectedRow.intent}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400">2.</span>
                  <span>Notice Grounding:</span>
                  <span className="text-white">
                    {selectedRow.grounded
                      ? "Matched in #announcements"
                      : "No official notice found"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400">3.</span>
                  <span>Temporal Resolution:</span>
                  <span className="text-white">
                    {selectedRow.grounded
                      ? "Isolated latest timestamp notice"
                      : "Escalated to #ta-radar"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400">4.</span>
                  <span>Factuality Check:</span>
                  <span
                    className={
                      selectedRow.grounded
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {selectedRow.grounded
                      ? "100% verified (0 hallucination)"
                      : "Unverified (fallback returned)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
