"use client";

import React, { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to client-side console for diagnostics without leaking private traces
    console.error("[EasyGame Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#e4e4e7] flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Top Badges */}
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/80 font-semibold">
            EasyGame Track B
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/80 font-semibold">
            500 // RUNTIME_ERROR
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Execution Interrupted
          </h1>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            An unexpected error occurred while executing the workspace pipeline.
            The system state has been quarantined to prevent corruption.
          </p>
        </div>

        {/* Diagnostic Stack / Digest Card */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 text-left font-mono text-[11px] space-y-1.5 text-[#71717a]">
          <div className="flex items-center justify-between text-[10px] border-b border-[#27272a]/60 pb-1 text-[#a1a1aa]">
            <span className="text-amber-400">✦ Exception Telemetry</span>
            <span>Isolated State</span>
          </div>
          <div className="text-red-400 break-words line-clamp-3">
            {error.message || "An unknown runtime exception was encountered."}
          </div>
          {error.digest && (
            <div className="flex items-center gap-2 text-[10px] pt-1 text-[#52525b]">
              <span>Digest:</span>
              <span className="text-white font-mono">{error.digest}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#27272a] flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <span>↻</span>
            <span>Retry Execution</span>
          </button>
          <Link
            href="/workspace"
            className="py-2.5 px-4 rounded-md bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-medium transition text-center flex items-center justify-center gap-1.5"
          >
            <span>←</span>
            <span>Return to Workspace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
