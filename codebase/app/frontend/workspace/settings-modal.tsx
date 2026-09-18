"use client";

import { useState } from "react";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: "learner" | "lab_coach";
  onRoleChanged?: (newRole: "learner" | "lab_coach") => void;
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-[#27272a] bg-[#121215] p-5 shadow-2xl text-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div>
            <h2 id="settings-title" className="text-sm font-semibold">
              Workspace Settings
            </h2>
            <p className="text-xs text-[#71717a]">
              Active role:{" "}
              <span className="font-mono text-cyan-400">
                {currentRole === "lab_coach" ? "Lab Coach" : "Learner"}
              </span>{" "}
              (Locked)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#71717a] hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* Active Role notice */}
          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">
                Cohort Role
              </span>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                  currentRole === "lab_coach"
                    ? "bg-amber-950 text-amber-400 border-amber-800"
                    : "bg-cyan-950 text-cyan-400 border-cyan-800"
                }`}
              >
                🔒 Locked
              </span>
            </div>
            <p className="text-[11px] text-[#71717a]">
              Your role was configured during first sign-in onboarding and
              cannot be changed from settings.
            </p>
          </div>

          {/* Provider Health Check */}
          <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Provider Health</span>
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="rounded border border-cyan-800 bg-cyan-950 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-900 disabled:opacity-50"
              >
                {testing ? "Testing…" : "Probe LLM"}
              </button>
            </div>
            {result && (
              <p
                className={`text-xs font-mono ${
                  result.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.ok
                  ? `✓ Connected (${result.latencyMs ?? 0}ms)`
                  : `✗ ${result.error ?? "Failed"}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[#27272a] px-3 py-1.5 text-xs hover:bg-[#3f3f46]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
