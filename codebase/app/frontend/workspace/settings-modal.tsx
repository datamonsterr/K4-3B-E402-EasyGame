"use client";

import { useState } from "react";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: "learner" | "lab_coach";
}

type HealthResult = {
  ok: boolean;
  provider?: "gemini" | "openrouter";
  model?: string;
  latencyMs?: number;
  error?: string;
};

export function SettingsModal({
  isOpen,
  onClose,
  currentRole,
}: SettingsModalProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);
  if (!isOpen) return null;

  async function testConnection() {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch("/api/health/llm", { method: "POST" });
      setResult((await response.json()) as HealthResult);
    } catch {
      setResult({
        ok: false,
        error: "Provider health service is unavailable",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4 text-[#e4e4e7]">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div>
            <h3 className="font-semibold text-sm text-white">
              System configuration
            </h3>
            <p className="text-[11px] text-[#71717a] font-mono">
              Server-managed provider and membership
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#71717a] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-[#71717a]">
            Verified role
          </p>
          <p className="text-sm text-white">
            {currentRole === "lab_coach" ? "Lab Coach" : "Learner"}
          </p>
          <p className="text-[11px] text-[#a1a1aa]">
            Roles are provisioned by trusted operators and cannot be changed
            here.
          </p>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#71717a]">
              AI provider
            </p>
            <p className="text-[11px] text-[#a1a1aa]">
              API keys and model IDs are read from server environment variables.
              They are never accepted from or stored in this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="h-8 px-3 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test server connection"}
          </button>
          {result && (
            <p
              role="status"
              className={`text-xs font-mono ${result.ok ? "text-emerald-400" : "text-red-400"}`}
            >
              {result.ok
                ? `${result.provider} / ${result.model} (${result.latencyMs} ms)`
                : (result.error ?? "Provider probe failed")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
