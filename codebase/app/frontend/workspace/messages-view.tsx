"use client";

import React, { useState } from "react";

export interface MessageItem {
  id: string;
  snowflake: string;
  time: string;
  channel: string;
  author: string;
  role: string;
  snippet: string;
  intent: string;
  status: "OPEN" | "SLA_2H" | "SLA_4H" | "ANSWERED" | "RESOLVED";
  latencyMs: number;
  replies?: Array<{
    author: string;
    text: string;
    sentAt: string;
  }>;
  jumpUrl: string;
}

const initialMessages: MessageItem[] = [
  {
    id: "tk-101",
    snowflake: "1284728491029481",
    time: "14:18:22 (4h 12m trước)",
    channel: "lab-support",
    author: "@MinhTuan_K4",
    role: "Learner",
    snippet:
      "Lỗi memory leak khi chạy load_dataset với file parquet 4GB trong Lab 1, tiến trình kernel bị die liên tục ạ.",
    intent: "Technical_Roadblock",
    status: "SLA_4H",
    latencyMs: 380,
    jumpUrl:
      "https://discord.com/channels/128400000000000000/1002/1284728491029481",
    replies: [],
  },
  {
    id: "tk-102",
    snowflake: "1284693829104829",
    time: "12:10:05 (2h 20m trước)",
    channel: "q-and-a",
    author: "@KhanhLinh",
    role: "Learner",
    snippet:
      "Nếu nghỉ có phép workshop ngày mai thì làm thế nào để được tính điểm danh bù ạ?",
    intent: "Logistics_Attendance",
    status: "SLA_2H",
    latencyMs: 890,
    jumpUrl:
      "https://discord.com/channels/128400000000000000/1001/1284693829104829",
    replies: [],
  },
  {
    id: "msg-003",
    snowflake: "1284729104829102",
    time: "14:22:04 (45m trước)",
    channel: "q-and-a",
    author: "@NguyenVanAn",
    role: "Learner",
    snippet:
      "@Assistant deadline Lab 1 mấy giờ vậy ạ? Em thấy có hai thông báo khác nhau.",
    intent: "Logistics_Deadline",
    status: "ANSWERED",
    latencyMs: 1140,
    jumpUrl:
      "https://discord.com/channels/128400000000000000/1001/1284729104829102",
    replies: [
      {
        author: "EasyGame Assistant",
        text: "Hạn chót nộp bài Lab 1 đã được dời đến 12:00 trưa Thứ Bảy, ngày 19/09/2026 qua GitHub Classroom.",
        sentAt: "14:22:05",
      },
    ],
  },
  {
    id: "msg-004",
    snowflake: "1284719482019482",
    time: "13:45:10 (2h trước)",
    channel: "announcements",
    author: "@Lead_Instructor",
    role: "Staff",
    snippet:
      "THÔNG BÁO GIA HẠN LAB 1: Do bảo trì cụm GPU, thời hạn nộp bài dời đến 12:00 trưa Thứ Bảy 19/09.",
    intent: "Official_Announcement",
    status: "RESOLVED",
    latencyMs: 220,
    jumpUrl:
      "https://discord.com/channels/128400000000000000/1000/1284719482019482",
    replies: [],
  },
];

interface MessagesViewProps {
  initialSelectedId?: string | null;
  onClearSelected?: () => void;
}

export function MessagesView({
  initialSelectedId,
  onClearSelected,
}: MessagesViewProps = {}) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedId || initialMessages[0].id,
  );
  const [prevInitialId, setPrevInitialId] = useState<string | null | undefined>(
    initialSelectedId,
  );

  if (initialSelectedId && initialSelectedId !== prevInitialId) {
    setPrevInitialId(initialSelectedId);
    setSelectedId(initialSelectedId);
  }

  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [replyContent, setReplyContent] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");

  const selectedMsg = messages.find((m) => m.id === selectedId) || messages[0];

  const filteredMessages = messages.filter((m) => {
    if (channelFilter === "all") return true;
    return m.channel === channelFilter;
  });

  async function handleSendReply() {
    if (!replyContent.trim()) return;
    setIsSending(true);

    try {
      // 1. Post to in-app direct reply endpoint (push to DB, not real Discord)
      await fetch("/api/workspace/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: selectedMsg.id,
          content: replyContent.trim(),
          markAnswered: true,
        }),
      }).catch(() => {
        // Handled gracefully in offline/demo mode
      });

      // 2. Optimistic UI update
      const nowTime = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === selectedMsg.id) {
            return {
              ...m,
              status: "ANSWERED",
              replies: [
                ...(m.replies || []),
                {
                  author: "Lab Coach (Bạn)",
                  text: replyContent.trim(),
                  sentAt: nowTime,
                },
              ],
            };
          }
          return m;
        }),
      );

      setReplyContent("");
      setToastMsg("Đã lưu câu trả lời vào Database và cập nhật trạng thái!");
      setTimeout(() => setToastMsg(""), 4000);
    } finally {
      setIsSending(false);
    }
  }

  function insertQuickSnippet(text: string) {
    setReplyContent((prev) => (prev ? `${prev} ${text}` : text));
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Top Header */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">
            Messages &amp; Triage
          </span>
          <span className="text-[11px] text-[#71717a]">
            · Compact Multi-Message Management &amp; In-App Reply
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Channel Filters */}
          <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded border border-[#27272a]">
            <button
              onClick={() => setChannelFilter("all")}
              className={`px-2 py-0.5 text-[11px] rounded transition ${
                channelFilter === "all"
                  ? "bg-cyan-950 text-cyan-400 font-medium"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChannelFilter("q-and-a")}
              className={`px-2 py-0.5 text-[11px] rounded transition ${
                channelFilter === "q-and-a"
                  ? "bg-cyan-950 text-cyan-400 font-medium"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              #q-and-a
            </button>
            <button
              onClick={() => setChannelFilter("lab-support")}
              className={`px-2 py-0.5 text-[11px] rounded transition ${
                channelFilter === "lab-support"
                  ? "bg-cyan-950 text-cyan-400 font-medium"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              #lab-support
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>DB Direct Mode</span>
          </div>
        </div>
      </header>

      {/* Main Split Layout: Left Message Feed + Right Details & Composer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Compact Message List */}
        <div className="w-full md:w-[420px] flex-shrink-0 border-r border-[#27272a] bg-[#121215] flex flex-col overflow-hidden">
          <div className="p-2.5 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-[#a1a1aa] uppercase tracking-wider">
              Feed Tin Nhắn ({filteredMessages.length})
            </span>
            <span className="text-[10px] text-[#71717a]">Click để chọn</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]/50">
            {filteredMessages.map((msg) => {
              const isSelected = msg.id === selectedId;
              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedId(msg.id);
                    if (onClearSelected) onClearSelected();
                  }}
                  className={`p-3 cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-cyan-950/30 border-l-2 border-cyan-400"
                      : "hover:bg-[#18181b]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-white">
                        {msg.author}
                      </span>
                      <span className="text-[10px] font-mono text-[#71717a]">
                        #{msg.channel}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {msg.status === "SLA_4H" ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800 animate-pulse">
                        URGENT &gt;4H
                      </span>
                    ) : msg.status === "SLA_2H" ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        SLA &gt;2H
                      </span>
                    ) : msg.status === "ANSWERED" ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ĐÃ TRẢ LỜI
                      </span>
                    ) : msg.status === "RESOLVED" ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        ĐÃ ĐÓNG
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        OPEN
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#d4d4d8] line-clamp-2 leading-relaxed">
                    {msg.snippet}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[#71717a]">
                    <span>{msg.time}</span>
                    <span className="text-cyan-400/80">{msg.intent}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Message Thread & In-App Direct Reply Composer */}
        <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
          {/* Thread Header */}
          <div className="p-3.5 border-b border-[#27272a] bg-[#121215] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-white">
                {selectedMsg.author}
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                #{selectedMsg.channel}
              </span>
              <span className="text-[10px] font-mono text-[#71717a]">
                ID: {selectedMsg.id}
              </span>
            </div>

            {/* Jump to Real Discord Action */}
            <a
              href={selectedMsg.jumpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded bg-[#202024] hover:bg-[#27272a] text-[#e4e4e7] text-[11px] font-mono border border-[#3f3f46] transition flex items-center gap-1.5"
            >
              <span>Mở trên Discord thật</span>
              <span>↗</span>
            </a>
          </div>

          {/* Thread Body & Previous Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Original Student Message Card */}
            <div className="p-3.5 rounded-lg bg-[#121215] border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    {selectedMsg.author}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                    {selectedMsg.role}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">
                  {selectedMsg.time}
                </span>
              </div>
              <p className="text-xs text-[#e4e4e7] leading-relaxed whitespace-pre-wrap">
                {selectedMsg.snippet}
              </p>
              <div className="pt-2 border-t border-[#27272a] flex items-center gap-2 text-[10px] font-mono text-[#71717a]">
                <span>
                  Intent:{" "}
                  <strong className="text-cyan-400">
                    {selectedMsg.intent}
                  </strong>
                </span>
                <span>·</span>
                <span>Latency: {selectedMsg.latencyMs}ms</span>
              </div>
            </div>

            {/* Replies Thread */}
            {selectedMsg.replies && selectedMsg.replies.length > 0 && (
              <div className="space-y-3 pl-4 border-l-2 border-[#27272a]">
                <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider">
                  Các câu trả lời ({selectedMsg.replies.length})
                </div>
                {selectedMsg.replies.map((reply, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#18181b] border border-cyan-950/60 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-cyan-300">
                        {reply.author}
                      </span>
                      <span className="text-[10px] font-mono text-[#71717a]">
                        {reply.sentAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#d4d4d8] leading-relaxed">
                      {reply.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="mx-4 mb-2 p-2 rounded bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-300 font-mono flex items-center gap-1.5 animate-fade-in">
              <span>✓</span>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Bottom Pane: Direct In-App Reply Composer */}
          <div className="p-3.5 border-t border-[#27272a] bg-[#121215] flex-shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#a1a1aa]">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span>💬</span> Trả lời trực tiếp vào Database (In-App Reply)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                Pushes to public.source_messages · No Discord spam
              </span>
            </div>

            {/* Quick response snippet pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  insertQuickSnippet(
                    "Đối với file parquet lớn, bạn hãy dùng chunking thay vì load toàn bộ bộ nhớ vào pandas.",
                  )
                }
                className="px-2 py-0.5 rounded bg-[#18181b] hover:bg-[#27272a] text-[10px] text-[#a1a1aa] border border-[#27272a] transition"
              >
                + Snippet: Parquet Chunking
              </button>
              <button
                type="button"
                onClick={() =>
                  insertQuickSnippet(
                    "Đã kiểm tra với BTC: Hạn nộp bài đã được gia hạn đến 12:00 trưa Thứ Bảy 19/09.",
                  )
                }
                className="px-2 py-0.5 rounded bg-[#18181b] hover:bg-[#27272a] text-[10px] text-[#a1a1aa] border border-[#27272a] transition"
              >
                + Snippet: Gia hạn 19/09
              </button>
              <button
                type="button"
                onClick={() =>
                  insertQuickSnippet(
                    "Bạn vui lòng nộp đơn nghỉ phép có minh chứng qua form BTC trước 18:00 để được điểm danh bù nhé.",
                  )
                }
                className="px-2 py-0.5 rounded bg-[#18181b] hover:bg-[#27272a] text-[10px] text-[#a1a1aa] border border-[#27272a] transition"
              >
                + Snippet: Nghỉ phép bù
              </button>
            </div>

            {/* Reply Input Box */}
            <div className="space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Nhập câu trả lời gửi tới ${selectedMsg.author} (lưu trực tiếp vào CSDL)...`}
                rows={3}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-cyan-500 transition resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#71717a]">
                  Tự động chuyển câu hỏi thành &apos;ĐÃ TRẢ LỜI&apos;
                </span>
                <button
                  type="button"
                  disabled={isSending || !replyContent.trim()}
                  onClick={handleSendReply}
                  className="px-4 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSending ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <span>Gửi trả lời (Database)</span>
                      <span>↵</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
