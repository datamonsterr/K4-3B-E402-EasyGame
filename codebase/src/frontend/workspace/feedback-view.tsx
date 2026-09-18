"use client";

import React from "react";

interface FeedbackViewProps {
  onBackToChat: () => void;
}

export function FeedbackView({ onBackToChat }: FeedbackViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">
            Post-Demo Evaluation &amp; Feedback
          </span>
          <span className="text-[11px] text-[#71717a]">
            · Google Forms &amp; Scannable QR Code (Screen 4 &amp; 5)
          </span>
        </div>

        <button
          onClick={onBackToChat}
          className="px-3 py-1.5 rounded bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-xs text-cyan-400 font-medium transition flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Quay lại phòng chat</span>
        </button>
      </header>

      {/* Main Feedback Content */}
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#121215] border border-[#27272a] rounded-xl p-6 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Conversion &amp; Evaluation Loop
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Đánh giá Trải nghiệm EasyGame
            </h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Cảm ơn các Mentor và Ban giám khảo đã theo dõi buổi demo. Xin vui
              lòng dành 1 phút quét mã QR hoặc bấm nút bên dưới để đóng góp phản
              hồi!
            </p>
          </div>

          {/* QR Code Graphic */}
          <div className="flex justify-center p-3 bg-white rounded-xl mx-auto w-fit shadow-lg shadow-cyan-950/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/screen5_qr.svg"
              alt="Scan QR for Feedback"
              className="w-48 h-48 object-contain"
            />
          </div>

          <div className="text-[11px] font-mono text-[#71717a]">
            Quét mã bằng camera điện thoại để mở Google Forms
          </div>

          <div className="pt-2 border-t border-[#27272a] space-y-2">
            <a
              href="https://forms.gle"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-sm active:scale-[0.98]"
            >
              Mở Google Forms Trực Tiếp ↗
            </a>
            <button
              type="button"
              onClick={onBackToChat}
              className="block w-full py-2 rounded-md bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-[#a1a1aa] text-xs transition"
            >
              Tiếp tục thử nghiệm kịch bản chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
