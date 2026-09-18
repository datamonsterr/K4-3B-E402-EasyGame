"use client";

import React, { useState } from "react";

export function DigestView() {
  const [broadcasted, setBroadcasted] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-[#27272a] bg-[#121215] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-sm">#</span>
          <span className="font-medium text-xs text-white">
            22:00 Clean Daily Digest
          </span>
          <span className="text-[11px] text-[#71717a]">
            · Báo cáo tổng hợp cuối ca trực của Lab Coach (Track B)
          </span>
        </div>

        <button
          onClick={() => setBroadcasted(true)}
          disabled={broadcasted}
          className={`px-3 py-1.5 rounded font-semibold text-xs transition ${
            broadcasted
              ? "bg-emerald-600 text-black cursor-default"
              : "bg-cyan-500 hover:bg-cyan-400 text-black active:scale-[0.98]"
          }`}
        >
          {broadcasted
            ? "✓ Đã phát sóng vào #ta-radar"
            : "Broadcast to #ta-radar"}
        </button>
      </header>

      {/* Main Digest Presentation */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Anomaly Mitigation Banner (UC-B2-01.EX.3) */}
        <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800 text-xs text-emerald-300 space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>🛡️</span>
            <span>
              Bộ lọc Anomalies &amp; Typography Chuẩn (Zero Token Corruption):
            </span>
          </div>
          <p className="text-[11px] text-emerald-400/90 leading-relaxed">
            Hệ thống đã tự động quét và loại bỏ 100% các token rác (như lỗi chèn
            lặp từ &quot;nguồn tham chiếu&quot; trong bản tin cũ). Các câu dài
            được ngắt trọn vẹn theo ranh giới âm tiết tiếng Việt, không bị cắt
            ngang giữa chừng.
          </p>
        </div>

        {/* Shift Report Card */}
        <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Bản Tin Ca Trực AI20K - Khóa 4 (Build Phase)
              </h2>
              <div className="text-[11px] font-mono text-[#71717a]">
                Khu vực: L2–3 &amp; L3–4 · Khung giờ chốt: 22:00 (UTC+07:00)
              </div>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              18/09/2026
            </span>
          </div>

          <div className="text-xs text-[#e4e4e7] leading-relaxed space-y-2">
            <p>
              Hôm nay bot đã theo dõi 4 kênh công khai và thu thập 137 tin nhắn
              thắc mắc. Tổng cộng đã phản hồi và xử lý 28/33 câu hỏi của học
              viên (đạt tỷ lệ 94.2%).
            </p>
            <p>
              Hai câu hỏi quá hạn SLA (&gt;4 giờ) về lỗi OPA Policy bundle và
              memory leak trong Lab 1 đã được gắn thẻ cảnh báo khẩn cấp và
              chuyển đến ca trực Lab Coach tiếp theo.
            </p>
          </div>

          {/* Top Confused Topics */}
          <div className="space-y-2 pt-3 border-t border-[#27272a]">
            <h3 className="text-xs font-mono uppercase text-[#71717a] tracking-wider font-semibold">
              Xếp hạng chủ đề học viên thắc mắc nhiều nhất hôm nay:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1">
                <div className="text-cyan-400 font-mono text-xs font-bold">
                  #1 · 14 câu hỏi
                </div>
                <div className="text-white font-medium text-xs">
                  Gia hạn hạn nộp Lab 1
                </div>
                <p className="text-[11px] text-[#71717a]">
                  Học viên hỏi lại về mốc 12:00 trưa 19/09 so với thông báo cũ
                  17/09.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1">
                <div className="text-cyan-400 font-mono text-xs font-bold">
                  #2 · 9 câu hỏi
                </div>
                <div className="text-white font-medium text-xs">
                  Lỗi cài đặt CVAT 500
                </div>
                <p className="text-[11px] text-[#71717a]">
                  OPA server chưa tải kịp bundle khi khởi động docker lần đầu.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1">
                <div className="text-cyan-400 font-mono text-xs font-bold">
                  #3 · 5 câu hỏi
                </div>
                <div className="text-white font-medium text-xs">
                  Điểm danh &amp; Vắng phép
                </div>
                <p className="text-[11px] text-[#71717a]">
                  Học viên hỏi thủ tục xin vắng workshop và hạn nộp đơn phép
                  trước 12h.
                </p>
              </div>
            </div>
          </div>

          {/* Action Notes for Next Shift */}
          <div className="p-3 rounded-lg bg-[#18181b] border border-cyan-950 text-xs space-y-1">
            <span className="font-mono text-cyan-400 font-semibold text-[11px]">
              Ghi chú bàn giao cho Lab Coach ca sáng:
            </span>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Theo dõi 2 học viên đang chạy debug CVAT trên kênh #lab-support.
              Ghim thông báo gia hạn Lab 1 lên đầu kênh để học viên không hỏi
              trùng lặp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
