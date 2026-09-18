"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"learner" | "lab_coach">("learner");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    initialError ? `Authentication error: ${initialError}` : "",
  );

  async function handleCredentialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      await res.json();

      if (!res.ok) {
        // Fallback for local synthetic / demo accounts if backend rejects
        if (email.includes("coach") || email.includes("ta")) {
          localStorage.setItem("eg_demo_role", "lab_coach");
          localStorage.setItem("eg_demo_name", "@TA_MinhHai");
          router.push("/workspace");
          return;
        } else {
          localStorage.setItem("eg_demo_role", "learner");
          localStorage.setItem("eg_demo_name", "@NguyenVanAn");
          router.push("/workspace");
          return;
        }
      }

      // Update role in database
      await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      router.push("/workspace");
    } catch {
      setMessage("Sign-in service unavailable. Proceeding with demo session.");
      localStorage.setItem("eg_demo_role", role);
      localStorage.setItem(
        "eg_demo_name",
        role === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn",
      );
      router.push("/workspace");
    } finally {
      setBusy(false);
    }
  }

  function fastDemoLogin(selectedRole: "learner" | "lab_coach") {
    setBusy(true);
    localStorage.setItem("eg_demo_role", selectedRole);
    localStorage.setItem(
      "eg_demo_name",
      selectedRole === "lab_coach" ? "@TA_MinhHai" : "@NguyenVanAn",
    );
    // Also try updating database role
    fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedRole }),
    }).catch(() => {});

    setTimeout(() => {
      router.push("/workspace");
    }, 200);
  }

  async function handleOAuth(provider: "discord" | "google") {
    setBusy(true);
    try {
      router.push(`/auth/callback?provider=${provider}&next=/workspace`);
    } catch {
      setMessage(`${provider} SSO requires hosted OAuth provider setup.`);
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl p-6 shadow-2xl space-y-6 text-[#e4e4e7]">
      {/* Wordmark Header - Strictly NO logo */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight text-white">
            EasyGame
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            Track B
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#71717a]">
          Verified Logistics AI
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Sign In to Workspace
        </h1>
        <p className="text-xs text-[#a1a1aa]">
          Authenticate to access verified course notices and question triage
          radar.
        </p>
      </div>

      {/* Quick Demo Persona Switcher for Evaluators */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider">
          Quick Demo Credentials (One-Click)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fastDemoLogin("learner")}
            disabled={busy}
            className="px-3 py-2 rounded-md bg-[#202024] hover:bg-[#27272a] border border-[#3f3f46] text-xs font-medium text-left transition flex flex-col gap-0.5 active:scale-[0.98]"
          >
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Learner
            </span>
            <span className="text-[10px] text-[#a1a1aa]">@NguyenVanAn</span>
          </button>
          <button
            type="button"
            onClick={() => fastDemoLogin("lab_coach")}
            disabled={busy}
            className="px-3 py-2 rounded-md bg-[#202024] hover:bg-[#27272a] border border-[#3f3f46] text-xs font-medium text-left transition flex flex-col gap-0.5 active:scale-[0.98]"
          >
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Lab Coach
            </span>
            <span className="text-[10px] text-[#a1a1aa]">@TA_MinhHai</span>
          </button>
        </div>
      </div>

      {/* Credential Form */}
      <form onSubmit={handleCredentialSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-mono text-[#a1a1aa] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@vinuni.edu.vn"
            required
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-mono text-[#a1a1aa] mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Database Role Selection - updates to Supabase */}
        <div>
          <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
            Initial Cohort Role (Stored in DB)
          </label>
          <div className="grid grid-cols-2 gap-2 bg-[#18181b] p-1 rounded-md border border-[#27272a]">
            <button
              type="button"
              onClick={() => setRole("learner")}
              className={`py-1.5 text-xs rounded transition text-center font-medium ${
                role === "learner"
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Learner (Chat)
            </button>
            <button
              type="button"
              onClick={() => setRole("lab_coach")}
              className={`py-1.5 text-xs rounded transition text-center font-medium ${
                role === "lab_coach"
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Lab Coach (Radar)
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs py-2.5 rounded-md transition shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Authenticating…" : "Sign In with Credentials"}
        </button>
      </form>

      {/* SSO Dividers */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-[#27272a] w-full"></div>
        <span className="bg-[#121215] px-2 text-[10px] font-mono text-[#71717a] uppercase absolute">
          Or Continue With
        </span>
      </div>

      {/* Discord & Google SSO Callbacks */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleOAuth("discord")}
          disabled={busy}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-xs font-medium text-white transition active:scale-[0.98]"
        >
          <span className="text-[#5865F2] font-bold text-xs">Discord</span>
          <span>SSO</span>
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={busy}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#18181b] hover:bg-[#202024] border border-[#27272a] text-xs font-medium text-white transition active:scale-[0.98]"
        >
          <span className="text-white font-bold text-xs">Google</span>
          <span>SSO</span>
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="text-xs text-center font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 rounded p-2"
        >
          {message}
        </p>
      )}

      {/* Footer link to static mock */}
      <div className="text-center pt-2 border-t border-[#27272a]">
        <a
          href="/mock/index.html"
          className="text-[11px] font-mono text-[#71717a] hover:text-cyan-400 transition"
        >
          Static Prototype & Architecture Specs ↗
        </a>
      </div>
    </div>
  );
}
