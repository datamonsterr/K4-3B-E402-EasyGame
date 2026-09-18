import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#e4e4e7] flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Top Badges */}
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold">
            EasyGame Track B
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/80 font-semibold">
            404 // NOT_FOUND
          </span>
        </div>

        {/* Title & Subtext */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Route Not In Registry
          </h1>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            The requested destination cannot be resolved against registered
            workspace views or verified notice routes.
          </p>
        </div>

        {/* Diagnostic Terminal Card */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 text-left font-mono text-[11px] space-y-1.5 text-[#71717a]">
          <div className="flex items-center justify-between text-[10px] border-b border-[#27272a]/60 pb-1 text-[#a1a1aa]">
            <span className="text-cyan-400">✦ Telemetry Diagnostic</span>
            <span>Invariant: PASS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">code:</span>
            <span className="text-white">ERR_CANONICAL_URI_UNRESOLVED</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">action:</span>
            <span className="text-[#d4d4d8]">redirect_to_active_cohort</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="pt-2 border-t border-[#27272a] flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/workspace"
            className="flex-1 py-2.5 px-4 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-sm active:scale-[0.98] text-center flex items-center justify-center gap-1.5"
          >
            <span>←</span>
            <span>Return to Workspace</span>
          </Link>
          <Link
            href="/sign-in"
            className="py-2.5 px-4 rounded-md bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-medium transition text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
