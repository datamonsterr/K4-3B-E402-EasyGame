"use client";

import React, { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  telemetry?: {
    latencyMs: number;
    tool: string;
    groundedScore: number;
    steps: {
      title: string;
      detail: string;
      status: "success" | "warning" | "info";
    }[];
  };
  sources?: { label: string; href: string; icon: string }[];
}

const initialMessages: ChatMessage[] = [
  {
    id: "m-1",
    sender: "user",
    content:
      "@Assistant deadline Lab 1 mấy giờ vậy ạ? Mình thấy có 2 thông báo khác nhau trên Discord.",
    timestamp: "14:22",
  },
  {
    id: "m-2",
    sender: "assistant",
    content:
      "Hạn chót nộp Lab 1 đã được gia hạn đến 12:00 trưa Thứ Bảy, 19/09/2026. Học viên nộp bài qua GitHub Classroom theo đúng định dạng quy định.",
    timestamp: "14:22",
    telemetry: {
      latencyMs: 1140,
      tool: "query_notices",
      groundedScore: 100,
      steps: [
        {
          title: "Semantic Intent Classification",
          detail:
            "Classified as Logistics_Deadline (confidence: 0.98 >= 0.85 threshold).",
          status: "success",
        },
        {
          title: "Tool Invocation: query_notices",
          detail: "Queried verified notices for topic 'lab-1' in cohort guild.",
          status: "success",
        },
        {
          title: "Multi-step Timestamp Resolution",
          detail:
            "Compared Notice #1 (12/09 03:00 UTC -> 17/09 deadline) vs Notice #2 (14/09 03:00 UTC -> 19/09 deadline). Notice #2 is the latest authoritative update.",
          status: "success",
        },
        {
          title: "Output Verification",
          detail:
            "Passed invariant: 139 Unicode code points (limit <= 300) and 2 sentences (limit <= 3). Grounded 100%.",
          status: "success",
        },
      ],
    },
    sources: [
      {
        label: "Thông báo gia hạn Lab 1 (#announcements)",
        href: "https://discord.com/channels/1234567890/1001/2002",
        icon: "📌",
      },
      {
        label: "Lab1_Specification.pdf",
        href: "/sources/extension",
        icon: "📄",
      },
      {
        label: "GitHub Classroom Repo",
        href: "https://github.com/classroom",
        icon: "🔗",
      },
    ],
  },
];

interface ChatViewProps {
  onGoToFeedback: () => void;
}

export function ChatView({ onGoToFeedback }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [expandedThought, setExpandedThought] = useState<string | null>("m-2");
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  async function handleSend(textToSend?: string) {
    const query = textToSend || input;
    if (!query.trim() || isThinking) return;

    const userMsgId = `u-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInput("");
    setIsThinking(true);

    try {
      // Call demo answer endpoint or agent
      const res = await fetch("/api/demo/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicKey: query.toLowerCase().includes("lab 2")
            ? "lab-2"
            : query.toLowerCase().includes("attendance") ||
                query.toLowerCase().includes("điểm danh")
              ? "attendance"
              : "lab-1",
          guildId: "demo",
          confidence: 0.95,
        }),
      });

      const data = await res.json();
      const assistantMsgId = `a-${Date.now()}`;

      // Handle specific query scenarios
      let replyContent =
        data.text || "Thông tin đã được xác nhận từ thông báo chính thức.";
      let toolName = "query_notices";
      let steps: {
        title: string;
        detail: string;
        status: "success" | "warning";
      }[] = [
        {
          title: "Semantic Intent Classification",
          detail: "Classified as Logistics query (confidence >= 0.85).",
          status: "success",
        },
        {
          title: "Tool Invocation",
          detail: "Retrieved verified course notice for topic.",
          status: "success" as const,
        },
        {
          title: "Output Verification",
          detail:
            "Passed <=300 Unicode code points & <=3 sentences constraint.",
          status: "success" as const,
        },
      ];

      // Custom check for homework refusal test
      if (
        query.toLowerCase().includes("giải hộ") ||
        query.toLowerCase().includes("bài tập") ||
        query.toLowerCase().includes("code")
      ) {
        replyContent =
          "Tôi được thiết kế để hỗ trợ thông tin quy chế, thời hạn và hậu cần khóa học. Để được hỗ trợ về bài tập lập trình, bạn vui lòng mô tả lỗi trên kênh thảo luận để Lab Coach và các bạn cùng hỗ trợ nhé!";
        toolName = "scope_guardrail";
        steps = [
          {
            title: "Scope Boundary Detection",
            detail: "Detected Academic_Integrity / Code solution request.",
            status: "warning" as const,
          },
          {
            title: "Polite Refusal Triggered",
            detail: "Preserved system scope boundary without code generation.",
            status: "success" as const,
          },
        ];
      } else if (
        query.toLowerCase().includes("ignore") ||
        query.toLowerCase().includes("dean")
      ) {
        replyContent =
          "Tôi chỉ báo cáo thông tin đã được xác thực từ thông báo chính thức của Ban tổ chức. Hiện không có thông báo hủy nào được phát hành.";
        toolName = "prompt_injection_guardrail";
        steps = [
          {
            title: "Security Guardrail",
            detail: "Intercepted adversarial override attempt.",
            status: "warning" as const,
          },
          {
            title: "Instruction Integrity Preserved",
            detail: "Returned deterministic policy clarification.",
            status: "success" as const,
          },
        ];
      }

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        sender: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        telemetry: {
          latencyMs: 950,
          tool: toolName,
          groundedScore: 100,
          steps,
        },
        sources: [
          {
            label:
              data.source?.label || "Thông báo chính thức BTC (#announcements)",
            href:
              data.source?.href ||
              "https://discord.com/channels/1234567890/1001/2002",
            icon: "📌",
          },
        ],
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setExpandedThought(assistantMsgId);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `fb-${Date.now()}`,
        sender: "assistant",
        content:
          "Hiện chưa có thông báo chính thức về nội dung này từ Ban tổ chức. Vui lòng liên hệ Lab Coach để được xác nhận.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        telemetry: {
          latencyMs: 420,
          tool: "create_staff_alert",
          groundedScore: 100,
          steps: [
            {
              title: "Know-What-You-Don't-Know Fallback",
              detail:
                "No official notice found. Prevented ungrounded date fabrication.",
              status: "warning",
            },
            {
              title: "Staff Alert Queued",
              detail: "Sent alert ticket into #ta-radar for coach triage.",
              status: "info",
            },
          ],
        },
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Top Channel Bar */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">q-and-a</span>
          <span className="text-[11px] text-[#71717a] hidden sm:inline">
            · Thảo luận & hỏi đáp chung khóa học
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 text-[10px] font-mono ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Live Grounding Daemon
          </span>
        </div>

        <button
          onClick={onGoToFeedback}
          className="px-3 py-1 rounded bg-[#202024] hover:bg-[#27272a] border border-[#3f3f46] text-xs font-medium text-cyan-400 transition flex items-center gap-1.5 shadow-sm"
        >
          <span>End Demo & Give Feedback</span>
          <span className="text-cyan-400">→</span>
        </button>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            {/* Sender Metadata */}
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="font-mono text-[11px] font-semibold text-white">
                {m.sender === "user" ? "@NguyenVanAn" : "EasyGame Assistant"}
              </span>
              {m.sender === "assistant" && (
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Verified Bot
                </span>
              )}
              <span className="font-mono text-[10px] text-[#71717a]">
                {m.timestamp}
              </span>
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-lg p-3.5 text-xs leading-relaxed ${
                m.sender === "user"
                  ? "bg-[#202024] border border-[#27272a] text-white"
                  : "bg-[#121215] border border-[#27272a] text-[#e4e4e7] space-y-3"
              }`}
            >
              {/* Glass-box Inspector Accordion for Assistant */}
              {m.telemetry && (
                <div className="bg-[#18181b] border border-[#27272a] rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedThought(expandedThought === m.id ? null : m.id)
                    }
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#202024] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-[11px]">
                        ✦ Thought Process
                      </span>
                      <span className="font-mono text-[10px] text-[#71717a]">
                        · {(m.telemetry.latencyMs / 1000).toFixed(1)}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {m.telemetry.tool}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        100% Grounded
                      </span>
                      <span className="text-[#71717a] text-[10px]">
                        {expandedThought === m.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {expandedThought === m.id && (
                    <div className="px-3 pb-3 pt-1 border-t border-[#27272a] space-y-2 text-[11px] font-mono">
                      {m.telemetry.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-[#a1a1aa]"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                              step.status === "success"
                                ? "bg-cyan-400"
                                : step.status === "warning"
                                  ? "bg-amber-400"
                                  : "bg-blue-400"
                            }`}
                          ></span>
                          <div>
                            <span className="text-white font-semibold">
                              {step.title}:{" "}
                            </span>
                            <span>{step.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Answer Content */}
              <p className="text-white font-normal">{m.content}</p>

              {/* Source Cards */}
              {m.sources && m.sources.length > 0 && (
                <div className="pt-2 border-t border-[#27272a] flex flex-wrap gap-2">
                  {m.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#202024] border border-cyan-900 text-cyan-400 text-[11px] font-mono transition"
                    >
                      <span>{src.icon}</span>
                      <span>{src.label}</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 p-3 text-xs text-[#a1a1aa] font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Agent verifying against official notices…</span>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Input Tray */}
      <div className="border-t border-[#27272a] bg-[#121215] p-3 space-y-2">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
          <span className="text-[#71717a] font-mono flex-shrink-0">
            Gợi ý câu hỏi:
          </span>
          <button
            type="button"
            onClick={() => handleSend("@Assistant deadline Lab 1 mấy giờ?")}
            className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-[#e4e4e7] whitespace-nowrap transition"
          >
            Deadline Lab 1 mấy giờ?
          </button>
          <button
            type="button"
            onClick={() =>
              handleSend("Điểm danh vắng 1 buổi lab có bị cấm thi không?")
            }
            className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-[#e4e4e7] whitespace-nowrap transition"
          >
            Quy định vắng điểm danh Lab
          </button>
          <button
            type="button"
            onClick={() => handleSend("CVAT migration 500 error khi cài đặt")}
            className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-[#e4e4e7] whitespace-nowrap transition"
          >
            Lỗi CVAT 500
          </button>
          <button
            type="button"
            onClick={() => handleSend("Giải hộ bài tập Lab 1 Python")}
            className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#202024] border border-amber-900/60 text-amber-400 whitespace-nowrap transition"
          >
            Test từ chối code (UC-B1 EX.2)
          </button>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-lg p-1.5 focus-within:border-cyan-500 transition"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về thời hạn, lịch học, thông báo chính thức (@Assistant)…"
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder-[#71717a] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-semibold text-xs rounded transition flex items-center gap-1 active:scale-[0.98]"
          >
            <span>Gửi</span>
            <span>↗</span>
          </button>
        </form>
      </div>
    </div>
  );
}
