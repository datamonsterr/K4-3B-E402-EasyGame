"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatView } from "./chat-view";
import { RadarView } from "./radar-view";
import { MessagesView } from "./messages-view";
import { NoticesView } from "./notices-view";
import { DigestView } from "./digest-view";
import { FeedbackView } from "./feedback-view";
<<<<<<< HEAD
=======
import { OnboardingModal } from "./onboarding-modal";
>>>>>>> 9ff0cf6 (feat(workspace): add first sign-in onboarding role lock and in-app messages triage with direct db reply)
import { SettingsModal } from "./settings-modal";

export type WorkspaceTab =
  | "chat"
  | "radar"
  | "channels"
  | "messages"
  | "notices"
  | "digest"
  | "feedback";

export interface WorkspaceShellProps {
  initialRole?: "learner" | "lab_coach";
  initialUserName?: string;
  initialUser?: string;
}

export function WorkspaceShell({
  initialRole = "learner",
  initialUserName,
  initialUser,
}: WorkspaceShellProps = {}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );

  const defaultUser =
    initialUserName ??
    initialUser ??
    (initialRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn");

<<<<<<< HEAD
  const role = initialRole;
  const userName = defaultUser;
=======
  const [role, setRole] = useState<"learner" | "lab_coach">(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("eg_demo_role") as
        "learner" | "lab_coach" | null;
      if (storedRole) return storedRole;
    }
    return initialRole;
  });
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("eg_demo_name");
      if (storedName) return storedName;
    }
    return defaultUser;
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
>>>>>>> 9ff0cf6 (feat(workspace): add first sign-in onboarding role lock and in-app messages triage with direct db reply)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/sign-in");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#e4e4e7] font-sans text-[13px] select-none">
      {/* 1. LEFT WORKSPACE SIDEBAR */}
      <aside className="w-[240px] flex-shrink-0 h-screen flex flex-col justify-between bg-[#121215] border-r border-[#27272a] z-40 p-3">
        {/* Top Section */}
        <div className="flex flex-col gap-3">
          {/* Brand Header - Strictly NO graphic logo, clean wordmark */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px] tracking-tight text-white">
                  EasyGame
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Track B
                </span>
              </div>
              <span className="text-[10px] text-[#71717a] font-mono">
                Verified Logistics AI
              </span>
            </div>
            <span className="flex h-2 w-2 relative" title="Live Daemon Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
          </div>

          {/* + New Chat CTA */}
          <button
            onClick={() => setActiveTab("chat")}
            className="w-full h-8 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-md flex items-center justify-center gap-1.5 transition shadow-sm active:scale-[0.98]"
          >
            <span className="font-bold text-sm">+</span>
            <span>New Chat</span>
          </button>

          {/* Navigation Tabs */}
          <nav className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[#71717a] uppercase tracking-wider font-semibold">
              <span>Views &amp; Tools</span>
              <span
                className={`font-mono text-[9px] px-1.5 py-0.2 rounded border ${
                  role === "lab_coach"
                    ? "bg-amber-950 text-amber-400 border-amber-800"
                    : "bg-cyan-950 text-cyan-400 border-cyan-800"
                }`}
              >
                {role === "lab_coach" ? "Lab Coach" : "Learner"}
              </span>
            </div>

            {/* Tab 1: Workspace Chat */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left group ${
                activeTab === "chat"
                  ? "bg-[#18181b] text-cyan-400 border-l-2 border-cyan-400"
                  : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">💬</span>
                <span className="text-xs font-medium">Workspace Chat</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
                B1
              </span>
            </button>

            {/* Tab 2: Tickets & SLA Radar */}
            <button
              onClick={() => setActiveTab("radar")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left group ${
                activeTab === "radar"
                  ? "bg-[#18181b] text-cyan-400 border-l-2 border-cyan-400"
                  : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <span className="text-xs font-medium">Tickets &amp; Radar</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                  2
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
                  B2
                </span>
              </div>
            </button>

            {/* Tab 3: Messages */}
            <button
              onClick={() => setActiveTab("messages")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left group ${
                activeTab === "messages" || activeTab === "channels"
                  ? "bg-[#18181b] text-cyan-400 border-l-2 border-cyan-400"
                  : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📨</span>
                <span className="text-xs font-medium">Messages</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]">
                4
              </span>
            </button>

            {/* Tab 4: Official Notices */}
            <button
              onClick={() => setActiveTab("notices")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left group ${
                activeTab === "notices"
                  ? "bg-[#18181b] text-cyan-400 border-l-2 border-cyan-400"
                  : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📢</span>
                <span className="text-xs font-medium">Official Notices</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
                Ground
              </span>
            </button>

            {/* Tab 5: 22:00 Daily Digest */}
            <button
              onClick={() => setActiveTab("digest")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left group ${
                activeTab === "digest"
                  ? "bg-[#18181b] text-cyan-400 border-l-2 border-cyan-400"
                  : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📰</span>
                <span className="text-xs font-medium">22:00 Daily Digest</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Clean
              </span>
            </button>

            {/* Tab 6: Feedback & QR */}
            <button
              onClick={() => setActiveTab("feedback")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left group ${
                activeTab === "feedback"
                  ? "bg-[#18181b] text-cyan-400 border-l-2 border-cyan-400"
                  : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📋</span>
                <span className="text-xs font-medium">Feedback &amp; QR</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
                Forms
              </span>
            </button>
          </nav>

          {/* Recent Topics */}
          <div className="flex flex-col gap-1 pt-2 border-t border-[#27272a]/60">
            <div className="flex items-center justify-between px-2 py-0.5">
              <span className="text-[10px] font-mono text-[#71717a] tracking-wider uppercase font-semibold">
                Recent Topics
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setActiveTab("chat")}
                className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left bg-[#18181b]/60 text-white hover:bg-[#18181b] transition"
              >
                <span className="truncate">Lab 1 Deadline &amp; Repo</span>
                <span className="text-cyan-400 text-[11px]">📌</span>
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left text-[#a1a1aa] hover:bg-[#18181b] hover:text-white transition"
              >
                <span className="truncate">Attendance &amp; Makeup</span>
                <span className="font-mono text-[9px] text-[#71717a]">#qa</span>
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left text-[#a1a1aa] hover:bg-[#18181b] hover:text-white transition"
              >
                <span className="truncate">CVAT OPA Migration 500</span>
                <span className="font-mono text-[9px] text-amber-400">#P1</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section - Clickable profile card & gear icon opens SettingsModal */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#27272a]">
          <div className="p-2 rounded-lg bg-[#18181b] hover:bg-[#202024] border border-[#27272a] hover:border-cyan-500/50 flex items-center justify-between transition group">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
              title="Open System & LLM Settings"
            >
              <div className="w-7 h-7 rounded bg-[#27272a] group-hover:bg-[#2e2e34] border border-[#3f3f46] group-hover:border-cyan-500/60 text-cyan-400 font-mono text-xs font-semibold flex items-center justify-center flex-shrink-0 transition">
                {role === "lab_coach" ? "MH" : "AN"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-white truncate leading-tight group-hover:text-cyan-300 transition">
                  {userName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      role === "lab_coach" ? "bg-amber-400" : "bg-cyan-400"
                    }`}
                  ></span>
                  <span
                    className={`font-mono text-[10px] truncate leading-tight ${
                      role === "lab_coach" ? "text-amber-400" : "text-cyan-400"
                    }`}
                  >
                    Role: {role === "lab_coach" ? "Lab Coach" : "Learner"}{" "}
                    (Locked)
                  </span>
                </div>
              </div>
            </button>

            {/* Profile Settings (Open Settings Modal or Sign Out) */}
            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                title="System & LLM Settings"
                className="text-[#71717a] hover:text-cyan-400 transition p-1 text-xs font-mono"
              >
                ⚙️
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                className="text-[#71717a] hover:text-red-400 transition p-1 text-xs font-mono"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION WORKSPACE CANVAS */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
        {activeTab === "chat" && (
          <ChatView onGoToFeedback={() => setActiveTab("feedback")} />
        )}
        {activeTab === "radar" && (
          <RadarView
            onSelectMessage={(msgId) => {
              setSelectedMessageId(msgId);
              setActiveTab("messages");
            }}
          />
        )}
        {(activeTab === "messages" || activeTab === "channels") && (
          <MessagesView
            initialSelectedId={selectedMessageId}
            onClearSelected={() => setSelectedMessageId(null)}
          />
        )}
        {activeTab === "notices" && <NoticesView />}
        {activeTab === "digest" && <DigestView />}
        {activeTab === "feedback" && (
          <FeedbackView onBackToChat={() => setActiveTab("chat")} />
        )}
      </main>

      {/* System & LLM Provider Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentRole={role}
        onRoleChanged={handleRoleChanged}
      />

      {/* First Sign-in Onboarding Role Selection Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onRoleConfirmed={(confirmedRole) => {
          handleRoleChanged(confirmedRole);
          localStorage.setItem("eg_onboarding_completed", "true");
          setIsOnboardingOpen(false);
        }}
      />
    </div>
  );
}
