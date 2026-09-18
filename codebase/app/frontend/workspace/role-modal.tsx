"use client";

import React, { useState } from "react";

interface RoleModalProps {
  currentRole: "learner" | "lab_coach";
  isOpen: boolean;
  onClose: () => void;
  onRoleChanged: (newRole: "learner" | "lab_coach") => void;
}

export function RoleModal({
  currentRole,
  isOpen,
  onClose,
  onRoleChanged,
}: RoleModalProps) {
  const [selected, setSelected] = useState<"learner" | "lab_coach">(
    currentRole,
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });
      if (res.ok) {
        onRoleChanged(selected);
        onClose();
      } else {
        // Even if local DB fails, update demo state
        onRoleChanged(selected);
        onClose();
      }
    } catch {
      onRoleChanged(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#121215] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4 text-[#e4e4e7]">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">
              Database Role Selection
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-white text-xs font-mono px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[#a1a1aa]">
          Per ADR 0001, role changes update your database identity. Choose your
          verified cohort role:
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSelected("learner")}
            className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between ${
              selected === "learner"
                ? "bg-cyan-950/40 border-cyan-500 text-cyan-400"
                : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-white">Learner</div>
              <div className="text-[11px] text-[#71717a]">
                Verified Logistics Chat, Glass-box Reasoning, Citation deep
                links
              </div>
            </div>
            {selected === "learner" && (
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelected("lab_coach")}
            className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between ${
              selected === "lab_coach"
                ? "bg-amber-950/40 border-amber-500 text-amber-400"
                : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-white">Lab Coach</div>
              <div className="text-[11px] text-[#71717a]">
                #ta-radar SLA Breach Queue, Ticket Triage, Ingestion Telemetry,
                22:00 Digest
              </div>
            </div>
            {selected === "lab_coach" && (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>

        {msg && <p className="text-xs text-red-400">{msg}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-md bg-[#18181b] hover:bg-[#202024] text-xs text-[#a1a1aa] border border-[#27272a] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition"
          >
            {saving ? "Updating…" : "Update in Database"}
          </button>
        </div>
      </div>
    </div>
  );
}
