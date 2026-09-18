"use client";

import React, { useState } from "react";

interface FeedbackViewProps {
  onBackToChat: () => void;
}

const STUDENT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScfANQUiUfT76tDvtIFgPlmA1vdJwL0aKcs_jEdQ7-UKAD4BA/viewform";
const COACH_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSd8Y3JnTzVonAXKRO8g6XhL9I99VF7mveTIcFrz7xM3gw2b-w/viewform";

export function FeedbackView({ onBackToChat }: FeedbackViewProps) {
  const [activePersona, setActivePersona] = useState<"student" | "coach">(
    "student",
  );
  const [copied, setCopied] = useState(false);

  const currentFormUrl =
    activePersona === "student" ? STUDENT_FORM_URL : COACH_FORM_URL;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(currentFormUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-[#e4e4e7] overflow-y-auto select-none font-sans">
      {/* 1. TOP BAR */}
      <header className="h-12 border-b border-[#27272a] px-4 sm:px-6 flex items-center justify-between bg-[#121215] sticky top-0 z-30 flex-shrink-0">
        {/* Left branding & breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-bold text-sm tracking-tight text-white">
              EasyGame
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Track B
            </span>
          </div>
          <span className="text-[#3f3f46]">/</span>
          <nav className="flex items-center gap-1.5 font-mono text-xs text-[#a1a1aa] truncate">
            <span>Demo Session</span>
            <span className="text-[#52525b]">&gt;</span>
            <span className="text-white font-medium">
              Feedback &amp; Validation
            </span>
          </nav>
        </div>

        {/* Center status badge */}
        <div className="hidden md:flex items-center">
          <div className="font-mono text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Demo Completed // Loop Active</span>
          </div>
        </div>

        {/* Right return action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onBackToChat}
            className="font-mono text-xs border border-[#27272a] text-[#e4e4e7] hover:text-white px-3 py-1.5 rounded-md hover:bg-[#18181b] hover:border-cyan-500/50 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>←</span>
            <span>Return to Chat</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT CANVAS */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between space-y-6">
        <div>
          {/* HERO COMPLETION BANNER */}
          <section className="text-center space-y-2.5 pt-2 pb-2">
            <div>
              <span className="font-mono text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                <span>🎉</span>
                <span className="tracking-wider uppercase font-semibold">
                  Demo Completed
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Help Us Validate EasyGame Track B
            </h1>

            <p className="text-xs text-[#a1a1aa] max-w-xl mx-auto leading-relaxed">
              2-minute survey to evaluate Grounding Accuracy, Multi-step
              Reasoning, and SLA Radar before CP5 prototype release.
            </p>

            {/* Persona Segment Tabs */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePersona("student")}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition flex items-center gap-1.5 border ${
                  activePersona === "student"
                    ? "bg-[#1c1b1f] border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                    : "border-transparent text-[#71717a] hover:text-[#a1a1aa] hover:border-[#27272a]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${activePersona === "student" ? "bg-cyan-400" : "bg-transparent"}`}
                ></span>
                <span>Student Survey</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePersona("coach")}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition flex items-center gap-1.5 border ${
                  activePersona === "coach"
                    ? "bg-[#1c1b1f] border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    : "border-transparent text-[#71717a] hover:text-[#a1a1aa] hover:border-[#27272a]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${activePersona === "coach" ? "bg-amber-400" : "bg-transparent"}`}
                ></span>
                <span>Lab Coach Survey</span>
              </button>
            </div>
          </section>

          {/* TWO-COLUMN EVALUATION CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch mt-4">
            {/* Left Column: Online Google Form */}
            <div className="md:col-span-7 bg-[#121215] border border-[#27272a] rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">
                    Option 01 · Online Response
                  </span>
                  <span className="font-mono text-[10px] text-[#a1a1aa] bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a]">
                    Cohort K4 · Room E402
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-white leading-snug">
                  {activePersona === "student"
                    ? "Phiếu Khảo Sát Trải Nghiệm Bot Trợ Lý Discord (B1 & B2)"
                    : "Phiếu Đánh Giá Tác Vụ Triage & Digest Dành Cho Lab Coach"}
                </h2>

                {/* Quick Rating Preview & Rubric Stats */}
                <div className="rounded-lg bg-[#18181b] border border-[#27272a] p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center text-xs border-b border-[#27272a]/70 pb-2">
                    <span className="text-[#e4e4e7]">
                      Factuality &amp; Grounding
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-cyan-400 font-bold text-xs">
                        5.0 / 5.0
                      </span>
                      <span className="text-amber-400 text-xs tracking-tight">
                        ★★★★★
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-[#27272a]/70 pb-2">
                    <span className="text-[#a1a1aa]">
                      Conciseness (≤300 cp / ≤3 sentences)
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      Excellent (100% Grounded)
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#a1a1aa]">
                      {activePersona === "student"
                        ? "Willing User Opt-in"
                        : "SLA Tier Response"}
                    </span>
                    <span className="font-mono text-xs text-cyan-400">
                      {activePersona === "student"
                        ? "@NguyenVanAn#4812"
                        : "< 120 min Breach Target"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {/* Primary Action Button */}
                <a
                  href={currentFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2.5 px-4 rounded-lg font-mono text-xs w-full text-center block shadow-[0_0_16px_rgba(6,182,212,0.25)] transition active:scale-[0.98]"
                >
                  🔗 Open Google Forms ↗
                </a>

                {/* Copyable Link Box */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider block">
                    Direct Responder Link
                  </label>
                  <div className="bg-[#18181b] border border-[#27272a] p-2 rounded-lg flex items-center justify-between gap-2 font-mono text-[11px] text-[#a1a1aa]">
                    <span className="truncate">{currentFormUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-[11px] font-mono bg-[#222227] hover:bg-[#2b2b32] text-white px-2.5 py-1 rounded transition flex-shrink-0 border border-[#3f3f46] active:scale-95"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Scan Mobile QR Code */}
            <div className="md:col-span-5 bg-[#121215] border border-[#27272a] rounded-xl p-5 flex flex-col items-center text-center space-y-4 shadow-xl">
              <div className="w-full text-center space-y-0.5">
                <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">
                  Option 02
                </span>
                <h2 className="text-base font-semibold text-white">
                  Mobile Direct Scan
                </h2>
                <p className="font-mono text-[11px] text-[#71717a]">
                  Instant form access via smartphone
                </p>
              </div>

              {/* QR Code Box */}
              <div className="border-2 border-cyan-500/40 rounded-2xl p-3 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.8)] flex items-center justify-center relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screen5_qr.svg"
                  alt="EasyGame Cyan QR Code"
                  className="w-44 h-44 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 pointer-events-none"></div>
              </div>

              {/* Caption */}
              <div className="font-mono text-[10px] text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800 flex items-center gap-1.5 shadow-sm">
                <span>📱</span>
                <span>Scan with Camera or Zalo</span>
              </div>

              {/* 3 Quick Steps list */}
              <div className="w-full text-left bg-[#18181b] border border-[#27272a] rounded-lg p-3 space-y-2 text-xs">
                <div className="text-[#a1a1aa] flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-semibold text-[11px]">
                    01.
                  </span>
                  <span>Open phone camera or Zalo app</span>
                </div>
                <div className="text-[#a1a1aa] flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-semibold text-[11px]">
                    02.
                  </span>
                  <span>Tap Google Forms preview link</span>
                </div>
                <div className="text-[#a1a1aa] flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-semibold text-[11px]">
                    03.
                  </span>
                  <span>Submit in under 2 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FOOTER METRICS */}
        <footer className="mt-6 pt-4 border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-[#71717a]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-[#e4e4e7]">
              15+ responses logged from K4 cohort
            </span>
          </div>
          <div className="text-right text-[10px] text-[#52525b]">
            <span>
              EasyGame Team: Pham Thanh Dat · Dau Quang Y · Tran Manh Hung ·
              Nguyen Tien Dat (E402)
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
