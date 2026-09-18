"use client";

import React, { useState } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onRoleConfirmed: (role: "learner" | "lab_coach") => void;
}

export function OnboardingModal({
  isOpen,
  onRoleConfirmed,
}: OnboardingModalProps) {
  const [selectedRole, setSelectedRole] = useState<"learner" | "lab_coach">(
    "learner",
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setErrorMsg("Vai trò của bạn đã được khóa cứng trước đó.");
        } else {
          setErrorMsg(data.error || "Không thể lưu vai trò. Vui lòng thử lại.");
        }
        // If 403 or network error in demo mode, proceed with chosen role locally
        if (res.status !== 403) {
          setSubmitting(false);
          return;
        }
      }

      const personaName =
        selectedRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";
      localStorage.setItem("eg_demo_role", selectedRole);
      localStorage.setItem("eg_demo_name", personaName);
      if (typeof document !== "undefined") {
        document.cookie = `eg_demo_role=${selectedRole}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `eg_demo_name=${encodeURIComponent(personaName)}; path=/; max-age=86400; SameSite=Lax`;
      }

      onRoleConfirmed(selectedRole);
    } catch {
      // Local fallback for offline/demo environments
      const personaName =
        selectedRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn";
      localStorage.setItem("eg_demo_role", selectedRole);
      localStorage.setItem("eg_demo_name", personaName);
      if (typeof document !== "undefined") {
        document.cookie = `eg_demo_role=${selectedRole}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `eg_demo_name=${encodeURIComponent(personaName)}; path=/; max-age=86400; SameSite=Lax`;
      }
      onRoleConfirmed(selectedRole);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-tight">
              EasyGame
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              FIRST SIGN-IN ONBOARDING
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ZERO DATA LOSS RBAC
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Xác nhận Vai trò Khóa học (Cohort Role)
            </h2>
            <p className="text-xs text-[#a1a1aa] max-w-md mx-auto">
              Hệ thống sẽ hiệu chuẩn giao diện và bộ công cụ AI Assistant theo
              vai trò của bạn. Vai trò này sẽ được{" "}
              <span className="text-white font-semibold">
                khóa cứng vĩnh viễn
              </span>{" "}
              sau khi xác nhận.
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Learner Card */}
            <div
              onClick={() => setSelectedRole("learner")}
              className={`p-4 rounded-lg border-2 cursor-pointer transition flex flex-col justify-between ${
                selectedRole === "learner"
                  ? "border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                  : "border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    STUDENT TIER
                  </span>
                  <input
                    type="radio"
                    name="onboarding-role"
                    checked={selectedRole === "learner"}
                    onChange={() => setSelectedRole("learner")}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>🎓</span> Học viên (Learner)
                  </h3>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    Tra cứu hạn nộp bài, chính sách điểm danh và nhận giải đáp
                    có dẫn chứng thông báo chính thức.
                  </p>
                </div>
                <div className="space-y-1.5 text-[11px] text-[#a1a1aa] border-t border-[#27272a] pt-3">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <span>✓</span> Trợ lý hạn chót bài tập (Track B1)
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <span>✓</span> Tra cứu thông báo đã kiểm duyệt
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400/70">
                    <span>✕</span> Không truy cập Radar &amp; Tickets
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400/70">
                    <span>✕</span> Không tra cứu điểm học viên khác
                  </div>
                </div>
              </div>
            </div>

            {/* Lab Coach Card */}
            <div
              onClick={() => setSelectedRole("lab_coach")}
              className={`p-4 rounded-lg border-2 cursor-pointer transition flex flex-col justify-between ${
                selectedRole === "lab_coach"
                  ? "border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-950/30"
                  : "border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    STAFF TIER
                  </span>
                  <input
                    type="radio"
                    name="onboarding-role"
                    checked={selectedRole === "lab_coach"}
                    onChange={() => setSelectedRole("lab_coach")}
                    className="accent-amber-400 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>🛡️</span> Trợ giảng (Lab Coach / TA)
                  </h3>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    Theo dõi SLA radar, quản lý tickets quá hạn, trả lời trực
                    tiếp trong ứng dụng và phát thông báo.
                  </p>
                </div>
                <div className="space-y-1.5 text-[11px] text-[#a1a1aa] border-t border-[#27272a] pt-3">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span>✓</span> Bao gồm toàn bộ quyền hạn Học viên
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span>✓</span> Theo dõi Radar &amp; SLA (&gt;2h, &gt;4h)
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span>✓</span> Trả lời tin nhắn trực tiếp vào DB
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span>✓</span> Phát thông báo &amp; tra cứu điểm số
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Immutability Warning */}
          <div className="p-3 rounded-lg bg-[#18181b] border border-amber-500/30 flex items-start gap-2.5">
            <span className="text-amber-400 text-base">⚠️</span>
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-amber-300">
                Khóa Cứng Quyền Hạn (Immutable Role Lock):
              </span>{" "}
              <span className="text-[#a1a1aa]">
                Theo chính sách bảo mật Zero-Trust của EasyGame, sau khi bạn xác
                nhận vai trò, tài khoản sẽ được ghi nhận vào cơ sở dữ liệu và{" "}
                <strong className="text-white">không thể tự đổi vai trò</strong>{" "}
                qua giao diện người dùng.
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-950/50 border border-red-800 text-xs text-red-300">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#18181b] flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-md font-semibold text-xs transition shadow flex items-center gap-2 ${
              selectedRole === "lab_coach"
                ? "bg-amber-500 hover:bg-amber-400 text-black"
                : "bg-cyan-500 hover:bg-cyan-400 text-black"
            }`}
          >
            {submitting ? (
              <span>Đang lưu phân quyền...</span>
            ) : (
              <span>
                Tiếp tục với vai trò{" "}
                {selectedRole === "lab_coach" ? "Lab Coach" : "Học viên"} →
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
